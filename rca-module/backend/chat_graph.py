import json
import re
from typing import TypedDict, Optional

from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import END, START, StateGraph

from llm import get_llm
from graph import parse_json  # reuses existing helper


# ── State ─────────────────────────────────────────────────────────────────────
class ChatState(TypedDict, total=False):
    # Investigation context (injected per request)
    source_text:    str
    form_data:      dict
    five_whys:      list
    fishbone:       dict
    root_causes:    list
    missing_evidence: list
    capa:           list

    # Conversation
    history:        list   # [{"role": "user"|"assistant", "content": "..."}]
    user_message:   str

    # Outputs
    ai_reply:       str
    rca_updates:    Optional[dict]   # structured patches the AI wants to apply


# ── System prompt ─────────────────────────────────────────────────────────────
_CONTEXT_HEADER = """\
You are an expert pharmaceutical QA AI Copilot for an API (Active Pharmaceutical \
Ingredient) manufacturing plant. You help quality professionals investigate deviations \
and incidents following GMP / ICH Q7 / ICH Q10 practices.

STRICT RULES:
1. Base every statement on the incident document and the investigation data provided below.
2. Never invent batch numbers, dates, names, measurements or SOPs that are not in the context.
3. If you are uncertain, say so explicitly and ask for more information.
4. AI-generated causes are ALWAYS hypotheses. State that a qualified QA person must confirm them.
5. When asked to generate or update RCA findings (5 Whys, root causes, CAPA, missing evidence),
   return a structured JSON block after your prose reply, wrapped exactly like this:
   ```rca_update
   { "form_data": {...}, "five_whys": [...], "root_causes": [...],
     "missing_evidence": [...], "capa": [...], "fishbone": {...} }
   ```
   Include ONLY the keys you are updating. Omit keys you are not changing.
   Outside that JSON block, write your normal conversational reply.
6. Keep replies concise and professional. Use numbered lists where appropriate.
7. You remember the full conversation — answer follow-up questions using previous context.
"""


def _build_context_section(state: ChatState) -> str:
    parts = []

    # Source document
    src = (state.get("source_text") or "").strip()
    if src:
        parts.append(f'INCIDENT DOCUMENT (first 20000 chars):\n"""\n{src[:20000]}\n"""')

    # Form data
    form = {k: v for k, v in (state.get("form_data") or {}).items() if v}
    if form:
        parts.append("EXTRACTED RCA FORM:\n" + json.dumps(form, indent=1, ensure_ascii=False))

    # Investigation results
    fw = state.get("five_whys")
    if fw:
        parts.append("5 WHYS CHAIN:\n" + json.dumps(fw, indent=1, ensure_ascii=False))

    fb = state.get("fishbone")
    if fb:
        non_empty = {k: v for k, v in fb.items() if v}
        if non_empty:
            parts.append("FISHBONE:\n" + json.dumps(non_empty, indent=1, ensure_ascii=False))

    rc = state.get("root_causes")
    if rc:
        parts.append("ROOT CAUSES (AI suggestions, unconfirmed):\n" +
                     json.dumps(rc, indent=1, ensure_ascii=False))

    me = state.get("missing_evidence")
    if me:
        parts.append("MISSING EVIDENCE:\n" + json.dumps(me, indent=1, ensure_ascii=False))

    capa = state.get("capa")
    if capa:
        parts.append("CAPA RECOMMENDATIONS:\n" + json.dumps(capa, indent=1, ensure_ascii=False))

    return "\n\n".join(parts)


def _extract_rca_update(text: str) -> tuple[str, Optional[dict]]:
    """Split AI reply into (prose, rca_updates_dict | None)."""
    pattern = r"```rca_update\s*([\s\S]*?)\s*```"
    match = re.search(pattern, text)
    if not match:
        return text, None
    json_str = match.group(1).strip()
    prose = text[:match.start()].strip() + "\n" + text[match.end():].strip()
    prose = prose.strip()
    try:
        updates = json.loads(json_str)
        return prose, updates
    except Exception:
        return text, None


# ── Node ──────────────────────────────────────────────────────────────────────
def chat_node(state: ChatState) -> dict:
    context_section = _build_context_section(state)

    system_content = _CONTEXT_HEADER
    if context_section:
        system_content += "\n\n" + "=" * 60 + "\nCURRENT INVESTIGATION CONTEXT\n" + "=" * 60 + "\n"
        system_content += context_section
    else:
        system_content += "\n\nNo investigation document has been loaded yet. " \
                          "Ask the user to upload a document or paste incident text."

    messages = [SystemMessage(content=system_content)]

    # Inject conversation history
    for turn in (state.get("history") or []):
        role = turn.get("role", "user")
        content = turn.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    # Current user message
    messages.append(HumanMessage(content=state.get("user_message", "")))

    llm = get_llm(json_mode=False)   # prose replies, not forced JSON
    response = llm.invoke(messages)
    raw_reply = response.content or ""

    prose, rca_updates = _extract_rca_update(raw_reply)

    return {
        "ai_reply": prose,
        "rca_updates": rca_updates,
    }


# ── Graph ─────────────────────────────────────────────────────────────────────
def build_chat_graph():
    builder = StateGraph(ChatState)
    builder.add_node("chat", chat_node)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


chat_graph = build_chat_graph()
