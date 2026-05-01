"""
Celery tasks — all DB writes and LLM post-processing happen here,
off the critical path so the webhook responds immediately.
"""
import json
import logging
from datetime import datetime

from workers.celery_app import celery_app
from db.database import SessionLocal
from models.messages import Message
from models.leads import Lead
from models.lead_conversation import LeadConversation
from models.conversation import Conversation
import services.context_manager as ctx_mgr
import services.groq_client as groq

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Task 1: Persist a message pair to the DB
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def persist_messages(self, conversation_id: int, user_content: str, agent_content: str):
    db = SessionLocal()
    try:
        db.add(Message(conversation_id=conversation_id, sender_type="client", content=user_content))
        db.add(Message(conversation_id=conversation_id, sender_type="user",   content=agent_content))
        db.commit()
    except Exception as exc:
        db.rollback()
        log.error("persist_messages failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Task 2: Summarize + extract lead data (runs every N messages)
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def process_conversation(
    self,
    conversation_id: int,
    user_id: int,
    client_id: int,
    context_json: str,
    agent_system_prompt: str,
):
    """
    1. Summarize the conversation so far, store in Redis + Conversation table.
    2. Extract structured lead fields.
    3. Find or create the correct Lead row (respecting multi-lead / multi-conv
       relationships) and link it to this conversation via lead_conversations.
    4. Write active_lead_id back into the Redis context for future tasks.
    """
    try:
        ctx: dict          = json.loads(context_json)
        messages: list     = ctx.get("messages", [])
        existing_summary   = ctx.get("summary", "")
        active_lead_id     = ctx.get("active_lead_id")   # may be None on first run

        if not messages:
            return

        # ── 1. Summarize ───────────────────────────────────────────────────
        summary_prompt = [
            {
                "role": "system",
                "content": (
                    "You are a summarization assistant. Summarize the following WhatsApp "
                    "conversation between a lead qualification agent and a potential client. "
                    "Focus on: what the client is looking for, key details shared (budget, "
                    "timeline, location, requirements, contact info), their intent level, "
                    "and any objections or concerns raised. "
                    "Write in third person about the client. Maximum 200 words."
                ),
            }
        ]
        if existing_summary:
            summary_prompt.append({"role": "system", "content": f"[PREVIOUS SUMMARY]\n{existing_summary}"})
        summary_prompt.append({
            "role": "user",
            "content": "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages),
        })

        new_summary = groq.chat(summary_prompt, temperature=0.2, max_tokens=300)

        ctx_mgr.update_summary(conversation_id, new_summary)

        db = SessionLocal()
        try:
            conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if conv:
                conv.conversation_summary = new_summary
                conv.updated_at = datetime.utcnow()
                db.commit()
        finally:
            db.close()

        # ── 2. Extract structured lead data ────────────────────────────────
        extract_prompt = [
            {
                "role": "system",
                "content": (
                    "Extract lead qualification data from this conversation. "
                    "Return ONLY a valid JSON object with these exact keys "
                    "(use null for anything not mentioned):\n"
                    '{"name": string|null, "email": string|null, "phone_number": string|null, '
                    '"requirement": string|null, "budget": string|null, '
                    '"timeline": string|null, "location": string|null, '
                    '"tag": "hot"|"warm"|"cold"|null, "score": integer_0_to_100|null, '
                    '"separate_opportunities": [string]}\n\n'
                    "CRITICAL RULES FOR requirement AND separate_opportunities:\n"
                    "requirement: Write ONE comprehensive sentence describing everything the "
                    "client wants, including all features, capabilities, and constraints they "
                    "mentioned. Do NOT leave features out — consolidate them all into this "
                    "single field. Example: 'Digital billing software with sales records, "
                    "product catalogue, and store analytics for a 100-seat restaurant.'\n\n"
                    "separate_opportunities: ONLY use this for clients who are clearly asking "
                    "about MULTIPLE COMPLETELY SEPARATE purchase decisions that would result "
                    "in separate transactions (e.g. a real estate client who wants both a "
                    "family home AND an investment studio — two separate purchases). "
                    "Features, modules, or capabilities of a single product/service are NOT "
                    "separate opportunities — they belong in `requirement`. "
                    "Leave this as an empty list [] in almost all cases. "
                    "Only populate it when you are certain the client has two or more "
                    "genuinely independent purchase intents.\n\n"
                    "Scoring guide: 0-30 cold, 31-65 warm, 66-100 hot."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"[SUMMARY]\n{new_summary}\n\n[MESSAGES]\n"
                    + "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
                ),
            },
        ]

        extracted: dict = groq.chat_json(extract_prompt, temperature=0.1)
        if not extracted:
            return

        raw_input = "\n".join(m["content"] for m in messages if m["role"] == "user")
        separate_opportunities: list[str] = extracted.pop("separate_opportunities", [])

        # ── 3. Update qualification state in Redis ─────────────────────────
        # Mark any pending required fields as answered based on what was extracted.
        # This is what allows the agent to detect [QUALIFICATION COMPLETE] in real time.
        _update_q_state_from_extraction(conversation_id, extracted)

        # ── 4. Resolve lead(s) and link to this conversation ───────────────
        db = SessionLocal()
        try:
            if len(separate_opportunities) > 1:
                # Genuinely separate purchase intents — one lead per opportunity.
                _upsert_multi_leads(
                    db, user_id, client_id, conversation_id,
                    active_lead_id, extracted, new_summary, raw_input,
                    separate_opportunities,
                )
                lead = _find_active_lead(db, user_id, client_id, active_lead_id)
            else:
                # Single opportunity (the default for almost every conversation).
                lead = _resolve_lead(
                    db, user_id, client_id, conversation_id,
                    active_lead_id, extracted, new_summary, raw_input,
                )

            db.commit()

            if lead:
                ctx_mgr.update_active_lead(conversation_id, lead.id)

        finally:
            db.close()

    except Exception as exc:
        log.error("process_conversation failed for conv=%s: %s", conversation_id, exc)
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _update_q_state_from_extraction(conversation_id: int, extracted: dict) -> None:
    """
    After each extraction run, move pending fields that now have values into
    the answered dict so the agent can detect [QUALIFICATION COMPLETE].
    """
    ctx = ctx_mgr.get_context(conversation_id)
    if not ctx:
        return
    q_state = ctx.get("q_state", {})
    pending: list[str] = q_state.get("pending_fields", [])
    if not pending:
        return

    newly_answered: dict = {}
    still_pending: list[str] = []
    for field in pending:
        val = extracted.get(field)
        if val:
            newly_answered[field] = val
        else:
            still_pending.append(field)

    if newly_answered:
        ctx_mgr.update_q_state(conversation_id, newly_answered, still_pending)
        log.info(
            "conv=%s qualification progress: answered=%s still_pending=%s",
            conversation_id, list(newly_answered.keys()), still_pending,
        )


def _ensure_link(db, lead_id: int, conversation_id: int) -> None:
    """Create the LeadConversation row if it doesn't exist yet."""
    exists = (
        db.query(LeadConversation)
        .filter(
            LeadConversation.lead_id == lead_id,
            LeadConversation.conversation_id == conversation_id,
        )
        .first()
    )
    if not exists:
        db.add(LeadConversation(lead_id=lead_id, conversation_id=conversation_id))


def _find_active_lead(db, user_id: int, client_id: int, active_lead_id: int | None) -> Lead | None:
    """
    Priority order:
      1. Lead whose id matches active_lead_id from Redis context.
      2. Most recent non-closed lead for this (user_id, client_id).
    """
    if active_lead_id:
        lead = db.query(Lead).filter(Lead.id == active_lead_id).first()
        if lead:
            return lead

    return (
        db.query(Lead)
        .filter(Lead.user_id == user_id, Lead.client_id == client_id, Lead.status != "closed")
        .order_by(Lead.created_at.desc())
        .first()
    )


def _apply_extracted(lead: Lead, extracted: dict, summary: str, raw_input: str) -> None:
    """Merge newly extracted data into a Lead without overwriting existing values."""
    for field in ("name", "email", "phone_number", "requirement", "budget", "timeline", "location", "tag"):
        val = extracted.get(field)
        if val and not getattr(lead, field):
            setattr(lead, field, val)
    if extracted.get("score") is not None:
        lead.score = extracted["score"]
    lead.summary   = summary
    lead.raw_input = raw_input
    lead.updated_at = datetime.utcnow()


def _resolve_lead(
    db,
    user_id: int,
    client_id: int,
    conversation_id: int,
    active_lead_id: int | None,
    extracted: dict,
    summary: str,
    raw_input: str,
) -> Lead:
    """
    Single-interest path.

    - Returning client (new conversation, same ongoing requirement):
        → finds the existing open lead and links the new conversation to it.
    - Fresh client or closed lead:
        → creates a new Lead row.
    - Always ensures the LeadConversation link exists.
    """
    lead = _find_active_lead(db, user_id, client_id, active_lead_id)

    if not lead:
        lead = Lead(
            client_id=client_id,
            user_id=user_id,
            status="new",
            source="whatsapp",
        )
        db.add(lead)
        db.flush()  # get lead.id

    _apply_extracted(lead, extracted, summary, raw_input)
    _ensure_link(db, lead.id, conversation_id)
    return lead


def _upsert_multi_leads(
    db,
    user_id: int,
    client_id: int,
    conversation_id: int,
    active_lead_id: int | None,
    base_extracted: dict,
    summary: str,
    raw_input: str,
    separate_opportunities: list[str],
) -> None:
    """
    Multi-opportunity path — one Lead row per genuinely separate purchase intent.

    Only called when the LLM identifies truly independent transactions (e.g. a
    client who wants both a family home and an investment property). Existing
    open leads are matched by requirement text to avoid duplicates on re-runs.
    """
    existing_leads = (
        db.query(Lead)
        .filter(Lead.user_id == user_id, Lead.client_id == client_id, Lead.status != "closed")
        .all()
    )
    existing_reqs = {(l.requirement or "").lower(): l for l in existing_leads}

    for opportunity in separate_opportunities:
        match = existing_reqs.get(opportunity.lower())
        if match:
            lead = match
        else:
            lead = Lead(
                client_id=client_id,
                user_id=user_id,
                status="new",
                source="whatsapp",
                requirement=opportunity,
            )
            db.add(lead)
            db.flush()

        # Merge shared fields (budget, timeline, etc.) without overwriting requirement
        merged = {**base_extracted, "requirement": lead.requirement or opportunity}
        _apply_extracted(lead, merged, summary, raw_input)
        _ensure_link(db, lead.id, conversation_id)
