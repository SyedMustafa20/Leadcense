# Leadcense — WhatsApp Lead Qualifier

An AI-powered platform that qualifies inbound WhatsApp leads on behalf of businesses. A conversational agent handles every incoming message, gathers qualification data through natural dialogue, scores the lead, and creates a structured record — all without any human involvement in the conversation itself.

---

## The Problem

Sales teams waste time on unqualified enquiries. Most businesses using WhatsApp for customer contact have no automated way to triage interest, collect contact details, or book follow-up meetings before a human even reads the message. Leads go cold, qualify unevenly, and require manual CRM entry.

## The Solution

Leadcense gives every business a configurable AI agent that lives on their WhatsApp Business webhook. When a potential client sends a message, the agent:

- Understands what they want
- Asks targeted qualification questions (budget, timeline, location, contact info)
- Scores their intent (hot / warm / cold, 0–100)
- Confirms a meeting or handoff
- Creates a structured lead record automatically

The sales team only sees the finished, qualified lead — with a summary, score, and all collected fields — ready to act on.

---

## Agent Workflow

This is the end-to-end path every inbound WhatsApp message travels through.

### Phase 1 — Inbound Receive & Guard

```
Client sends WhatsApp message
          │
          ▼
POST /webhook/{user_id}
          │
    ┌─────▼──────┐
    │ Rate Limiter│  ← Redis sliding window
    │ (per client │    Client: 10/min, 100/hr
    │  per biz)   │    Business: 300/min, 5000/hr
    └─────┬───────┘
          │ Allowed
    ┌─────▼──────────┐
    │   Sanitizer    │  ← Regex-based attack detection
    │                │    Blocks: prompt injection, jailbreaks,
    │                │    token injection, extraction attempts,
    │                │    semantic redefinition attacks, harmful content
    └─────┬──────────┘
          │ Safe
    ┌─────▼──────────┐
    │   Guardrails   │  ← Behavioural checks
    │                │    - Repetition loop detection
    │                │    - Topic scope enforcement (strict mode)
    │                │    - Minimum content validation
    └─────┬──────────┘
          │ Passed
```

**Sanitizer** operates at the regex level before the message ever reaches the LLM. It blocks 40+ attack patterns across 6 threat categories: prompt injection, jailbreaks, persona hijacking, system prompt extraction, config manipulation, and LLM token injection. Messages longer than 1500 characters are also rejected outright.

**Guardrails** apply business-logic checks after sanitization. In strict mode the agent is confined to topics matching the business's configured intent keywords — any off-topic message longer than 5 words receives the configured out-of-scope response without touching the LLM.

---

### Phase 2 — Context & Session Resolution

```
    ┌─────────────────────────────────┐
    │   Session lookup (Redis)        │
    │                                 │
    │  Key: conv_map:{uid}:{phone}    │
    │  ├─ Cache hit + active?  ──────►│ Reuse conversation
    │  ├─ Cache hit + expired? ──────►│ New conversation, same client
    │  └─ Cache miss           ──────►│ New client + new conversation
    └──────────────────┬──────────────┘
                       │
    ┌──────────────────▼──────────────┐
    │  Load conversation context      │
    │  from Redis (ctx:{conv_id})     │
    │                                 │
    │  Context holds:                 │
    │  • messages[]  (sliding window) │
    │  • summary     (compressed)     │
    │  • q_state     (qualification)  │
    │  • meeting_confirmed flag       │
    │  • active_lead_id               │
    └──────────────────┬──────────────┘
```

Sessions are identified by `(user_id, client_phone)`. A configurable inactivity timeout (default 24 hours) automatically opens a new conversation when the gap between messages exceeds it. This means a client who returns days later starts a fresh qualification without any code changes.

The conversation context is stored entirely in Redis for sub-millisecond access on every message. The sliding window keeps the 10 most recent messages in memory; older turns are compressed into a rolling summary.

---

### Phase 3 — LLM Prompt Construction

The system prompt is assembled in layers, in order. Position matters — later layers carry higher recency weight with the model.

```
┌────────────────────────────────────────────────────────────────┐
│ LAYER 1 — Immutable Constraint Block                           │
│   12 locked rules appended to every prompt:                    │
│   identity lock, instruction immunity, semantic lock,          │
│   claim verification, prompt confidentiality, scope            │
│   enforcement, reference resolution, lead objective,           │
│   response length (2–4 sentences max), one-question-per-turn,  │
│   conversation closure discipline, override immunity           │
├────────────────────────────────────────────────────────────────┤
│ LAYER 2 — Company Identity Block                               │
│   Name, services, description, website, location, industry     │
│   (loaded from Redis cache → PostgreSQL fallback)              │
├────────────────────────────────────────────────────────────────┤
│ LAYER 3 — Agent System Prompt                                  │
│   Fully customizable per business: persona, tone, greeting,    │
│   escalation behaviour, fallback messages                      │
├────────────────────────────────────────────────────────────────┤
│ LAYER 4 — Dynamic Context (injected when present)              │
│   • Rolling summary of the conversation so far                 │
│   • Qualification progress: fields answered vs. still pending  │
│   • First-message marker (triggers greeting)                   │
├────────────────────────────────────────────────────────────────┤
│ LAYER 5 — Conversation History                                 │
│   Last 10 messages from the sliding window                     │
├────────────────────────────────────────────────────────────────┤
│ LAYER 6 — Late Directive (highest recency weight)              │
│   Switches based on conversation phase:                        │
│   • Normal   → qualification flow, one question at a time      │
│   • Complete → "CONFIRM MEETING NOW" directive                  │
│   • Closed   → "FAREWELL ONLY" directive, no new questions     │
├────────────────────────────────────────────────────────────────┤
│ LAYER 7 — Current User Message                                 │
└────────────────────────────────────────────────────────────────┘
```

The constraint block cannot be removed or modified by user input — it is injected at the code level, not configurable through the dashboard. This is the final line of defence against prompt injection that slips past the sanitizer.

---

### Phase 4 — LLM Call & Meeting Detection

```
          │
    ┌─────▼──────────────────────┐
    │  Groq API                  │
    │  Model: llama-3.3-70b      │
    │  Temperature: configurable │
    │  Max tokens: 500           │
    └─────┬──────────────────────┘
          │ reply text
    ┌─────▼──────────────────────┐
    │  Meeting confirmation      │
    │  detection                 │
    │                            │
    │  Two triggers (either OR): │
    │  1. q_state pending_fields │
    │     is empty (all required │
    │     fields collected)      │
    │  2. Reply text contains a  │
    │     closing signal keyword │
    │     (calendly, cal.com,    │
    │     "calendar link", etc.) │
    └─────┬──────────────────────┘
          │
    Redis context updated (messages, meeting_confirmed flag)
          │
    Reply returned to caller → webhook response → WhatsApp
```

Meeting detection is intentionally dual-path: the q_state check catches clean flows where every required field was collected; the keyword scan catches real-world cases where the agent adapts and confirms a meeting mid-conversation before all fields are technically filled.

---

### Phase 5 — Background Processing (Celery Workers)

The webhook responds immediately after the LLM call. All database writes and LLM post-processing run asynchronously via Celery + Redis.

```
    Two tasks dispatched after every agent reply
                   │
       ┌───────────┴────────────┐
       │                        │
 persist_messages           process_conversation
 (every message)            (every 6 messages OR
       │                    on meeting confirmed)
       │                        │
  Write user +             ┌────▼─────────────────┐
  agent message            │ 1. Summarize          │
  pair to                  │    conversation so far │
  PostgreSQL               │    (LLM call)          │
                           │                       │
                           │ 2. Extract lead data  │
                           │    (LLM JSON call)    │
                           │    name, email, phone,│
                           │    requirement,budget,│
                           │    timeline, location,│
                           │    tag, score (0-100) │
                           │                       │
                           │ 3. Update q_state in  │
                           │    Redis (move newly  │
                           │    answered fields    │
                           │    from pending →     │
                           │    answered)          │
                           │                       │
                           │ 4. IF is_final=True   │
                           │    Create/update Lead │
                           │    row in PostgreSQL  │
                           └───────────────────────┘
```

**`process_conversation` with `is_final=False`** (periodic, every 6 messages): updates the rolling summary and qualification state in Redis. No lead record is written — this just keeps the agent's context accurate between summarization cycles.

**`process_conversation` with `is_final=True`** (on meeting confirmed): runs the full pipeline. Extracts structured data, then decides how to create leads:

- **Single opportunity**: one Lead row, only created when both `requirement` and contact info (`email` or `phone`) are present
- **Multiple opportunities**: if the LLM identifies genuinely separate purchase intents (e.g. a client who wants both a home purchase and an investment property), one Lead row is created per distinct intent, matched against existing open leads to avoid duplicates

---

### Complete Data Flow Diagram

```
WhatsApp Client
      │  message
      ▼
Webhook /webhook/{user_id}
      │
      ├── Rate Limiter (Redis)
      ├── Sanitizer (regex, 40+ patterns)
      ├── Session resolve (Redis → PostgreSQL)
      ├── Context load (Redis)
      ├── Guardrails (repetition, scope, content)
      ├── Prompt build (7 layers)
      ├── Groq LLM (llama-3.3-70b)
      ├── Meeting detection
      ├── Redis context update
      │
      ├──[async]── persist_messages ──► PostgreSQL
      └──[async]── process_conversation
                        │
                        ├── Groq LLM (summarize)
                        ├── Groq LLM (extract JSON)
                        ├── Redis q_state update
                        └── PostgreSQL Lead upsert
      │
      ▼
reply text → webhook response → WhatsApp
```

---

## Key Design Decisions

**Redis as the primary conversation store.** Every message round-trip reads and writes only Redis. PostgreSQL is written to asynchronously. This means webhook latency is decoupled from database performance.

**Sliding window + rolling summary.** Rather than sending the full conversation history to the LLM each time (expensive, eventually exceeds context limits), the agent keeps only the last 10 messages in Redis. Every 6 turns a background task compresses history into a summary that is prepended to subsequent prompts.

**Three-layer security model.** Regex sanitizer blocks attacks before they reach the LLM. The guardrails layer enforces behavioural rules. The immutable constraint block within the system prompt defends against any injection that reaches the model. Each layer handles what it is best suited for.

**Multi-tenant by design.** Each business (`user_id`) has its own agent config, company info, and qualification questions stored in PostgreSQL and cached in Redis. One deployment serves any number of businesses; each business's agent is fully isolated.

**Qualification state tracking.** The `q_state` structure (`answered` dict + `pending_fields` list) is maintained in Redis and updated by the background worker after each extraction run. The agent reads this state when building the next prompt so it knows exactly what has been collected and what remains — without re-reading the full conversation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7 |
| Auth | Firebase Authentication |
| Backend API | FastAPI (Python 3.11), Uvicorn |
| LLM | Groq API — llama-3.3-70b-versatile |
| Task Queue | Celery 5 + Redis (broker + result backend) |
| Context Store | Redis |
| Database | PostgreSQL 16 (SQLAlchemy ORM) |
| Cloud Storage | Google Cloud Storage |
| Realtime DB | Cloud Firestore |
| Containerisation | Docker, Docker Compose |
| CI/CD | GitHub Actions → GitHub Container Registry |

---

## Running Locally

**Prerequisites:** Docker Desktop

```bash
# 1. Clone and configure environment
git clone <repo-url>
cd whatsapp-lead-qualifier
cp .env.example backend/.env
# Edit backend/.env with your API keys (Groq, Firebase, etc.)

# 2. Start all services (PostgreSQL, Redis, backend, Celery worker, frontend)
docker compose up --build

# 3. Initialise the database (first run only)
docker compose exec backend python create_db.py
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

See [docker-compose.yml](docker-compose.yml) for all services and [.env.example](.env.example) for required environment variables.

---

## Deployment

Images are built and pushed automatically by GitHub Actions on every push to `main`. Add the required secrets (Firebase config, Groq API key, etc.) to your repository's *Settings → Secrets* and the workflow in [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) handles the rest.

To deploy on any server with Docker:

```bash
REGISTRY=ghcr.io/your-username \
IMAGE_TAG=main \
POSTGRES_PASSWORD=your-secret \
ALLOWED_ORIGINS=https://your-domain.com \
docker compose -f docker-compose.prod.yml up -d
```
