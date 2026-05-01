import re
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Threat categories
# ---------------------------------------------------------------------------
PROMPT_INJECTION    = "PROMPT_INJECTION"
JAILBREAK           = "JAILBREAK"
EXTRACTION_ATTEMPT  = "EXTRACTION_ATTEMPT"
CONFIG_MANIPULATION = "CONFIG_MANIPULATION"
TOKEN_INJECTION     = "TOKEN_INJECTION"
HARMFUL_CONTENT     = "HARMFUL_CONTENT"

# ---------------------------------------------------------------------------
# Block rules — (compiled pattern, threat_category)
# Any match results in the message being blocked entirely.
# ---------------------------------------------------------------------------
_BLOCK_RULES: list[tuple[re.Pattern, str]] = [

    # --- Prompt injection ---
    (re.compile(r"ignore\s+(all\s+)?(previous|prior|above|earlier)\s+instruction", re.I), PROMPT_INJECTION),
    (re.compile(r"disregard\s+(all\s+)?(previous|prior|above)\s+instruction", re.I), PROMPT_INJECTION),
    (re.compile(r"forget\s+(everything|all|your\s+(previous\s+)?instruction|your\s+role|what\s+you\s+were\s+told)", re.I), PROMPT_INJECTION),
    (re.compile(r"override\s+(your\s+)?(instruction|configuration|setting|rule|guideline|constraint)", re.I), PROMPT_INJECTION),
    (re.compile(r"new\s+instruction\s*:", re.I), PROMPT_INJECTION),
    (re.compile(r"you\s+will\s+now\s+(act|behave|respond|be)", re.I), PROMPT_INJECTION),
    # "from now on" in any form — covers "from now on you must", "from now on, whenever", etc.
    (re.compile(r"from\s+now\s+on[\s,]+(you\s+)?(will|must|should|are|whenever|treat|interpret|consider|define|any)", re.I), PROMPT_INJECTION),

    # --- Semantic redefinition attacks ---
    # "whenever I say X, interpret it as Y"
    (re.compile(r"whenever\s+(i\s+(say|use|type|write|mention)|you\s+(see|read|encounter|get))\s+['\"]?\w", re.I), PROMPT_INJECTION),
    # "going forward, treat/interpret/define X as Y"
    (re.compile(r"going\s+forward[\s,].*(treat|interpret|define|consider|handle|take\s+it\s+as)", re.I), PROMPT_INJECTION),
    # "interpret/redefine X as Y from now on / going forward"
    (re.compile(r"(redefine|remap|reassign|reinterpret)\s+['\"]?\w", re.I), CONFIG_MANIPULATION),

    # --- False prior-statement injection (claim the agent said/agreed to something) ---
    # "earlier/previously you said X is allowed / no need / proceed"
    (re.compile(r"(earlier|previously|before|last\s+time)\s+you\s+(said|told|confirmed|agreed|promised|mentioned).{0,80}(allow|permit|no\s+need|without\s+verif|skip|bypass|proceed|refund|approv|grant)", re.I), PROMPT_INJECTION),
    # "you said/confirmed that refunds / X is allowed without"
    (re.compile(r"you\s+(said|told\s+me|confirmed|agreed|promised)\s+.{0,60}(allow|no\s+need\s+for|without\s+(verif|check)|skip|bypass|proceed\s+with\s+refund)", re.I), PROMPT_INJECTION),

    # --- Persona / jailbreak attacks ---
    (re.compile(r"\b(jailbreak|evil\s+mode|developer\s+mode|god\s+mode|unrestricted\s+mode|opposite\s+mode|dan\s+mode|stan\b|aim\b)\b", re.I), JAILBREAK),
    (re.compile(r"pretend\s+(you\s+are|to\s+be|that\s+you('re|are))", re.I), JAILBREAK),
    (re.compile(r"act\s+as\s+(if\s+you\s+(are|were)|a\s+different|an?\s+unrestricted|an?\s+evil)", re.I), JAILBREAK),
    (re.compile(r"roleplay\s+as\s+(a\s+)?(different|unrestricted|evil|another)", re.I), JAILBREAK),
    (re.compile(r"you\s+are\s+now\s+(a\s+|an\s+)?(new|different|another|unrestricted|evil|opposite|free)", re.I), JAILBREAK),
    (re.compile(r"without\s+(any\s+)?(restriction|filter|safety|guideline|rule|limitation)s?", re.I), JAILBREAK),
    (re.compile(r"(simulate|emulate)\s+(being\s+)?(an?\s+)?(unrestricted|evil|different|free)\s+(ai|model|assistant|bot)", re.I), JAILBREAK),

    # --- System prompt extraction ---
    (re.compile(r"(what|tell|show|print|display|reveal|repeat|share|output|write\s*out)\s+(is\s+|me\s+)?(your\s+)?(system\s+prompt|initial\s+prompt|instruction|configuration|config|rule|guideline|constraint)", re.I), EXTRACTION_ATTEMPT),
    (re.compile(r"repeat\s+(your\s+)?(system|instruction|initial|original)\s+(prompt|message|text|content)", re.I), EXTRACTION_ATTEMPT),
    (re.compile(r"(output|print|show)\s+(your\s+)?(full\s+)?(prompt|instruction|context)", re.I), EXTRACTION_ATTEMPT),
    (re.compile(r"what\s+(were\s+you|are\s+you)\s+(told|instructed|trained|programmed)\s+to", re.I), EXTRACTION_ATTEMPT),

    # --- Config / behavior manipulation ---
    (re.compile(r"(change|update|modify|alter|switch|reset)\s+(your\s+)?(behavior|instruction|configuration|setting|rule|personality|tone)", re.I), CONFIG_MANIPULATION),
    (re.compile(r"(disable|turn\s+off|bypass|circumvent|skip|remove)\s+(your\s+)?(guardrail|filter|restriction|safety|check|constraint)", re.I), CONFIG_MANIPULATION),
    (re.compile(r"(you\s+)?(no\s+longer\s+have|don'?t\s+have|have\s+no)\s+(restriction|rule|limitation|guideline)s?", re.I), CONFIG_MANIPULATION),

    # --- LLM-specific token injection ---
    (re.compile(r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>|<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>", re.I), TOKEN_INJECTION),
    (re.compile(r"-{3,}\s*(system|instruction|config|override|new\s+rule)", re.I), TOKEN_INJECTION),
    (re.compile(r"={3,}\s*(system|instruction|override|new)", re.I), TOKEN_INJECTION),
    (re.compile(r"#{3,}\s*(system|instruction|override)", re.I), TOKEN_INJECTION),

    # --- Harmful intent ---
    (re.compile(r"\b(how\s+to\s+(make|build|create)\s+(a\s+)?(bomb|weapon|explosive|malware|virus))\b", re.I), HARMFUL_CONTENT),
]

# Max allowed message length — prevents prompt-stuffing attacks
_MAX_LENGTH = 1500


@dataclass
class SanitizationResult:
    is_safe: bool
    cleaned_content: str
    threat_type: str | None


def sanitize(content: str) -> SanitizationResult:
    """
    Check message for injection attacks, jailbreaks, and harmful content.
    Returns SanitizationResult. Blocked messages must NOT reach the LLM.
    """
    # Hard length cap — no legitimate lead qualification message needs 1500+ chars
    if len(content) > _MAX_LENGTH:
        return SanitizationResult(is_safe=False, cleaned_content="", threat_type=PROMPT_INJECTION)

    for pattern, category in _BLOCK_RULES:
        if pattern.search(content):
            return SanitizationResult(is_safe=False, cleaned_content="", threat_type=category)

    # Strip any null bytes or control characters (except newline/tab)
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", content).strip()

    return SanitizationResult(is_safe=True, cleaned_content=cleaned, threat_type=None)
