import json
import re
from typing import TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

from llm import get_llm
from schemas import FORM_FIELD_KEYS, RCAFormFields

MAX_CHARS = 20000  # keeps us inside Groq's free-tier limits


class RCAState(TypedDict, total=False):
    source_text: str      # input: the document text
    form_data: dict       # output: the filled form
    missing_fields: list  # output: form fields the AI could not fill


EXTRACT_SYSTEM = """You are a pharmaceutical quality assurance AI assistant for an API \
(Active Pharmaceutical Ingredient) manufacturing plant. You read incident and deviation \
investigation documents and extract information to populate an RCA intake form.

STRICT RULES:
1. Use ONLY information explicitly written in the document. NEVER invent or guess.
2. If a field is not clearly stated, return null for it.
3. incident_classification must be exactly "Minor", "Major" or "Critical" — only if stated.
4. severity must be exactly "Low", "Medium", "High" or "Critical" — only if stated.
5. Keep dates exactly as written, or as YYYY-MM-DD when the full date is clear.
6. incident_description: 2–5 factual sentences describing what happened. No causes.
7. expected_specification: the stated limit, range, or expected value that was not met.
8. actual_observation: the actual reading, result, or condition observed.
9. containment_action: actions already taken to contain the incident.
10. product_impact: stated impact on product quality or other batches.
11. patient_safety_impact: any stated patient safety concern, or null if not mentioned.
12. equipment_status: state of the equipment (e.g. "On hold", "In service", "Quarantined").
13. available_evidence: list any documents, records or data mentioned as available.
14. investigation_id: if no ID is stated in the document, generate one using the prefix \
"RCA-" followed by the current year and a sequential number (e.g. "RCA-2026-001"). \
NEVER use "DEV-" as the prefix.
15. Return ONLY a JSON object with exactly these keys (null for missing):
""" + json.dumps(FORM_FIELD_KEYS, indent=1)


def parse_json(raw: str) -> dict:
    """The AI sometimes wraps JSON in ```code fences```. This removes them safely."""
    raw = re.sub(r"```(?:json)?", "", raw or "").strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("The AI did not return valid JSON.")
    return json.loads(raw[start: end + 1])


def extract_form_node(state: RCAState) -> dict:
    text = state["source_text"][:MAX_CHARS]
    llm = get_llm(json_mode=True)
    response = llm.invoke(
        [
            SystemMessage(content=EXTRACT_SYSTEM),
            HumanMessage(content=f"DOCUMENT:\n\"\"\"\n{text}\n\"\"\"\n\nReturn the JSON now."),
        ]
    )
    data = parse_json(response.content)
    fields = RCAFormFields(**{k: data.get(k) for k in FORM_FIELD_KEYS})
    form_data = fields.model_dump()
    missing = [k for k, v in form_data.items() if v is None]
    return {"form_data": form_data, "missing_fields": missing}


def build_graph():
    builder = StateGraph(RCAState)
    builder.add_node("extract_form", extract_form_node)
    builder.add_edge(START, "extract_form")
    builder.add_edge("extract_form", END)
    return builder.compile()


rca_graph = build_graph()
