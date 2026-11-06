import json
import uuid as _uuid
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from graph import MAX_CHARS, parse_json
from llm import get_llm

FISHBONE_CATEGORIES = ["Man", "Machine", "Material", "Method", "Measurement", "Environment"]
CONFIRM_NOTE = "AI suggestion — not confirmed. A qualified QA person must review before acceptance."
CAPA_STATUSES  = ("Open", "In Progress", "Completed", "Overdue")
RC_REVIEW_STATUSES = ("Pending", "Confirmed", "Rejected")


class AnalysisState(TypedDict, total=False):
    source_text: str
    form_data: dict
    five_whys: list
    fishbone: dict
    root_causes: list
    missing_evidence: list
    capa: list


# ----------------------------------------------------------------- helpers
def _context(state: AnalysisState, extra: str = "") -> str:
    form = {k: v for k, v in (state.get("form_data") or {}).items() if v}
    text = (state.get("source_text") or "")[:MAX_CHARS]
    parts = [
        "INVESTIGATION FORM (may have been edited by the user):\n"
        + json.dumps(form, indent=1, ensure_ascii=False),
        'SOURCE DOCUMENT:\n"""\n' + text + '\n"""',
    ]
    if extra:
        parts.append(extra)
    return "\n\n".join(parts)


def _ask(system: str, user: str) -> dict:
    """Call the LLM and parse JSON. Retries once if the JSON is broken."""
    llm = get_llm(json_mode=True)
    last_error = None
    for _ in range(2):
        response = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
        try:
            return parse_json(response.content)
        except Exception as exc:  # bad JSON -> try again once
            last_error = exc
    raise ValueError(f"The AI returned unreadable output: {last_error}")


def _s(value) -> str:
    return str(value).strip() if value is not None else ""


# ------------------------------------------------------------- normalizers
def normalize_five_whys(raw) -> list:
    out = []
    for item in (raw if isinstance(raw, list) else [])[:5]:
        if not isinstance(item, dict) or not _s(item.get("answer")):
            continue
        basis = _s(item.get("basis")).title()
        out.append({
            "why": len(out) + 1,
            "question": _s(item.get("question")) or f"Why {len(out) + 1}?",
            "answer": _s(item.get("answer")),
            "basis": basis if basis in ("Documented", "Inferred") else "Inferred",
        })
    return out


def normalize_fishbone(raw) -> dict:
    raw = raw if isinstance(raw, dict) else {}
    lowered = {str(k).strip().lower(): v for k, v in raw.items()}
    result = {}
    for cat in FISHBONE_CATEGORIES:
        value = lowered.get(cat.lower(), [])
        if isinstance(value, str):
            value = [value]
        result[cat] = [_s(v) for v in (value if isinstance(value, list) else []) if _s(v)]
    return result


def normalize_root_causes(raw) -> list:
    out = []
    for idx, item in enumerate((raw if isinstance(raw, list) else [])[:6]):
        if not isinstance(item, dict) or not _s(item.get("cause")):
            continue
        kind = _s(item.get("type")).lower()
        confidence = _s(item.get("confidence")).title()
        evidence = _s(item.get("evidence"))
        contradicting = _s(item.get("contradicting_evidence"))
        missing_ev = _s(item.get("missing_evidence"))
        reviewer_comments = _s(item.get("reviewer_comments"))

        if confidence not in ("High", "Medium", "Low"):
            confidence = "Low"
        # Safety rule: no cited evidence -> cannot be high/medium confidence
        if not evidence or evidence.lower().startswith(("none", "no ")):
            evidence = evidence or "No direct evidence in the document."
            confidence = "Low"
        out.append({
            "id":                     f"RC-{idx + 1}",
            "cause":                  _s(item.get("cause")),
            "type":                   kind if kind in ("root", "contributing") else "contributing",
            "confidence":             confidence,
            "evidence":               evidence,
            "contradicting_evidence": contradicting or "",
            "missing_evidence":       missing_ev or "",
            "review_status":          "Pending",
            "reviewer_comments":      reviewer_comments or "",
            "status":                 CONFIRM_NOTE,
            "confirmed":              False,
        })
    return out


def normalize_missing_evidence(raw) -> list:
    out = []
    for item in (raw if isinstance(raw, list) else [])[:10]:
        if isinstance(item, dict):
            name, why = _s(item.get("item")), _s(item.get("why_needed"))
        else:
            name, why = _s(item), ""
        if name:
            out.append({"item": name, "why_needed": why})
    return out


def normalize_capa(raw) -> list:
    out = []
    for idx, item in enumerate((raw if isinstance(raw, list) else [])[:10]):
        if not isinstance(item, dict) or not _s(item.get("action")):
            continue
        kind = _s(item.get("type")).lower()
        priority = _s(item.get("priority")).title()
        out.append({
            "id":                    f"CAPA-{idx + 1}",
            "type":                  kind if kind in ("corrective", "preventive") else "corrective",
            "action":                _s(item.get("action")),
            "reason":                _s(item.get("reason")),
            "linked_cause":          _s(item.get("linked_cause")),
            "priority":              priority if priority in ("High", "Medium", "Low") else "Medium",
            "owner_role":            _s(item.get("owner_role")),
            "department":            _s(item.get("department")),
            "due_date":              _s(item.get("due_date")),
            "status":                "Open",
            "completion_evidence":   "",
            "effectiveness_criteria": _s(item.get("effectiveness_criteria")),
            "effectiveness_result":  "",
            "qa_approved":           False,
        })
    return out


# ------------------------------------------------------------------- nodes
INVESTIGATE_SYSTEM = """You are a senior pharmaceutical QA investigator at an API \
(Active Pharmaceutical Ingredient) plant, following GMP / ICH Q7 / ICH Q10 practice.
You are given a deviation document. Build a 5 Whys chain and a fishbone (Ishikawa) analysis.

STRICT RULES:
1. Base everything on the document. Do NOT invent facts, readings, names or dates.
2. 5 Whys: 3 to 5 steps. Each answer must follow logically from the previous answer. \
Mark each step "basis": "Documented" if the document states it, or "Inferred" if it is \
your reasoning. STOP early if the document gives no basis for going deeper. Do not \
pad the chain just to reach 5.
3. Fishbone categories are exactly: Man, Machine, Material, Method, Measurement, \
Environment. Each is a list of short factors (max 12 words each) that the document \
supports or reasonably points to. Use an empty list if nothing applies.
4. Do not state anything as a confirmed cause. These are hypotheses for investigation.
5. Return ONLY JSON in this shape:
{"five_whys":[{"why":1,"question":"...","answer":"...","basis":"Documented|Inferred"}],
 "fishbone":{"Man":[],"Machine":[],"Material":[],"Method":[],"Measurement":[],"Environment":[]}}"""

CONCLUDE_SYSTEM = """You are a senior pharmaceutical QA investigator. You are given an \
incident document plus a draft 5 Whys and fishbone. Identify potential root causes and \
contributing factors, and list evidence still missing.

STRICT RULES:
1. Give 1 to 3 items with "type": "root" and 0 to 3 with "type": "contributing".
2. "evidence" must point to specific text or data in the document that supports the cause.
   If no direct support exists, write "None in document" and set confidence to "Low".
3. "contradicting_evidence": any evidence in the document that argues AGAINST this cause.
   Write "None identified" if there is none.
4. "missing_evidence": specific records/data still needed TO CONFIRM OR RULE OUT this cause.
5. "confidence": "High" ONLY when the document directly proves the cause. "Medium" when
   strongly suggested. Otherwise "Low".
6. Never present a cause as confirmed. A human must confirm it.
7. "missing_evidence" (global list): 4 to 8 specific records still needed
   (equipment calibration/maintenance log, BMR page, training record, SOP version,
   environmental monitoring, similar past incidents, material CoA, audit trail).
   Each has "item" and "why_needed" (one sentence).
8. Return ONLY JSON:
{"root_causes":[{
  "cause":"...",
  "type":"root|contributing",
  "confidence":"High|Medium|Low",
  "evidence":"...",
  "contradicting_evidence":"...",
  "missing_evidence":"..."
}],
 "missing_evidence":[{"item":"...","why_needed":"..."}]}"""

CAPA_SYSTEM = """You are a senior pharmaceutical QA professional writing CAPA recommendations \
for an API plant, in line with GMP / ICH Q10 expectations.

STRICT RULES:
1. Give 2–4 corrective actions (fix this event / contain impact) and 2–4 preventive actions
   (stop recurrence). Be specific and practical.
2. Each action must have ALL of these fields:
   - "type" (corrective|preventive)
   - "action" — specific action description
   - "reason" — 1–2 sentences: why this action and what it addresses
   - "linked_cause" — copy the cause text it addresses
   - "priority" (High|Medium|Low)
   - "owner_role" — a role like "QA", "Production", "Engineering", "QC" (NEVER a person's name)
   - "department" — department responsible (e.g. "Quality Assurance", "Production", "Engineering")
   - "effectiveness_criteria" — how effectiveness will be measured (e.g. "Zero recurrence in 6 months")
3. If a cause is Low confidence, add a verification action first and word others conditionally.
4. Do NOT invent dates, deadlines, document numbers or SOP numbers.
5. Return ONLY JSON:
{"capa":[{
  "type":"...",
  "action":"...",
  "reason":"...",
  "linked_cause":"...",
  "priority":"...",
  "owner_role":"...",
  "department":"...",
  "effectiveness_criteria":"..."
}]}"""


def investigate_node(state: AnalysisState) -> dict:
    data = _ask(INVESTIGATE_SYSTEM, _context(state) + "\n\nReturn the JSON now.")
    return {
        "five_whys": normalize_five_whys(data.get("five_whys")),
        "fishbone": normalize_fishbone(data.get("fishbone")),
    }


def conclude_node(state: AnalysisState) -> dict:
    draft = json.dumps(
        {"five_whys": state.get("five_whys"), "fishbone": state.get("fishbone")},
        ensure_ascii=False,
    )
    data = _ask(CONCLUDE_SYSTEM, _context(state, "DRAFT ANALYSIS:\n" + draft) + "\n\nReturn the JSON now.")
    return {
        "root_causes": normalize_root_causes(data.get("root_causes")),
        "missing_evidence": normalize_missing_evidence(data.get("missing_evidence")),
    }


def capa_node(state: AnalysisState) -> dict:
    causes = json.dumps(state.get("root_causes"), ensure_ascii=False)
    data = _ask(CAPA_SYSTEM, _context(state, "IDENTIFIED CAUSES:\n" + causes) + "\n\nReturn the JSON now.")
    return {"capa": normalize_capa(data.get("capa"))}


def build_analysis_graph():
    builder = StateGraph(AnalysisState)
    builder.add_node("investigate", investigate_node)
    builder.add_node("conclude", conclude_node)
    builder.add_node("capa", capa_node)
    builder.add_edge(START, "investigate")
    builder.add_edge("investigate", "conclude")
    builder.add_edge("conclude", "capa")
    builder.add_edge("capa", END)
    return builder.compile()


analysis_graph = build_analysis_graph()
