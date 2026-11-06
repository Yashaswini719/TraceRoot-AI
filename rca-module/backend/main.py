
from typing import Optional

from fastapi import FastAPI, Depends, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, get_db
import models  # noqa: F401  (importing registers the table with Base)
from analysis import analysis_graph
from graph import rca_graph
from chat_graph import chat_graph
from llm import LLMConfigError
from extractor import (
    ExtractionError,
    MIN_USEFUL_CHARS,
    clean_text,
    extract_from_upload,
)

# Create the tables in MySQL if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI RCA Module")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}


# ------------------------------------------------------------ reading input
async def read_source(text: Optional[str], file: Optional[UploadFile]) -> dict:
    """Shared helper: read an uploaded file OR pasted text into clean plain text."""
    if file is not None and file.filename:
        data = await file.read()
        try:
            source_type, source_text = extract_from_upload(file.filename, data)
        except ExtractionError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        source_name = file.filename
    elif text and text.strip():
        source_type, source_text = "pasted_text", clean_text(text)
        source_name = "Pasted text"
    else:
        raise HTTPException(
            status_code=400, detail="Please upload a file or paste some text."
        )

    warning = None
    if len(source_text) < MIN_USEFUL_CHARS:
        warning = (
            "Very little text was found. If this is a scanned PDF (an image), "
            "please paste the text instead."
        )

    return {
        "source_type": source_type,
        "source_name": source_name,
        "source_text": source_text,
        "char_count": len(source_text),
        "warning": warning,
    }


@app.post("/api/intake")
async def intake(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Step 2: accept a PDF / .eml / .txt file OR pasted text."""
    return await read_source(text, file)


# --------------------------------------------------------------- AI helpers
def run_ai(graph, payload: dict) -> dict:
    """Run a LangGraph workflow and turn AI failures into clear HTTP errors."""
    try:
        return graph.invoke(payload)
    except LLMConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        message = str(exc)
        if "model_not_found" in message or "does not exist" in message:
            raise HTTPException(
                status_code=502,
                detail="Groq model not available. Change GROQ_MODEL in .env "
                "(see check_models.py) and restart the server.",
            )
        if "429" in message or "rate" in message.lower():
            raise HTTPException(
                status_code=429,
                detail="Groq free-tier limit reached. Wait about a minute and try again.",
            )
        raise HTTPException(status_code=502, detail=f"AI step failed: {message}")


def run_extraction(source_text: str) -> dict:
    if len(source_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Not enough text to analyse.")
    result = run_ai(rca_graph, {"source_text": source_text})
    return {
        "form_data": result["form_data"],
        "missing_fields": result["missing_fields"],
    }


def run_investigation(source_text: str, form_data: dict) -> dict:
    if len(source_text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Not enough text to analyse.")
    result = run_ai(
        analysis_graph, {"source_text": source_text, "form_data": form_data or {}}
    )
    return {
        "five_whys": result.get("five_whys", []),
        "fishbone": result.get("fishbone", {}),
        "root_causes": result.get("root_causes", []),
        "missing_evidence": result.get("missing_evidence", []),
        "capa": result.get("capa", []),
    }


# ----------------------------------------------------------- analyze routes
class ExtractRequest(BaseModel):
    source_text: str


class InvestigateRequest(BaseModel):
    source_text: str
    form_data: Optional[dict] = None


@app.post("/api/analyze/extract")
def analyze_extract(req: ExtractRequest):
    """Step 3 (JSON): document text in, filled RCA form out."""
    return run_extraction(req.source_text)


@app.post("/api/analyze/from-source")
async def analyze_from_source(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Step 3 (file/text): upload or paste, get the filled form.
    The React AI panel calls this first."""
    source = await read_source(text, file)
    result = run_extraction(source["source_text"])
    return {**source, **result}


@app.post("/api/analyze/investigate")
def analyze_investigate(req: InvestigateRequest):
    """Step 4: the form (possibly edited by the user) + source text in;
    5 Whys, fishbone, root causes, missing evidence and CAPA out.
    The React 'Run AI investigation' button calls this."""
    return run_investigation(req.source_text, req.form_data or {})


@app.post("/api/analyze/full")
async def analyze_full(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Testing shortcut for Swagger: upload a file and run BOTH steps in one call."""
    source = await read_source(text, file)
    extracted = run_extraction(source["source_text"])
    investigation = run_investigation(source["source_text"], extracted["form_data"])
    return {**source, **extracted, **investigation}


# ------------------------------------------------------ saving investigations
class InvestigationIn(BaseModel):
    title: Optional[str] = None
    status: str = "Saved"
    lifecycle_stage: Optional[str] = None
    source_text: Optional[str] = None
    form_data: Optional[dict] = None
    five_whys: Optional[list] = None
    fishbone: Optional[dict] = None
    root_causes: Optional[list] = None
    missing_evidence: Optional[list] = None
    capa: Optional[list] = None
    reviewer_name: Optional[str] = None
    reviewer_comments: Optional[str] = None
    qa_approved: Optional[str] = None


def to_dict(row: models.Investigation) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "status": row.status,
        "lifecycle_stage": row.lifecycle_stage,
        "source_text": row.source_text,
        "form_data": row.form_data,
        "five_whys": row.five_whys,
        "fishbone": row.fishbone,
        "root_causes": row.root_causes,
        "missing_evidence": row.missing_evidence,
        "capa": row.capa,
        "reviewer_name": row.reviewer_name,
        "reviewer_comments": row.reviewer_comments,
        "qa_approved": row.qa_approved,
        "qa_approved_at": row.qa_approved_at,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def pick_title(body: InvestigationIn) -> str:
    form = body.form_data or {}
    return (
        (body.title or "").strip()
        or form.get("title")
        or form.get("investigation_id")   # e.g. RCA-2026-001
        or "Untitled Investigation"
    )[:255]


def get_or_404(db: Session, investigation_id: int) -> models.Investigation:
    row = db.get(models.Investigation, investigation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Investigation not found.")
    return row


@app.post("/api/investigations")
def create_investigation(body: InvestigationIn, db: Session = Depends(get_db)):
    row = models.Investigation(
        title=pick_title(body),
        status=body.status,
        lifecycle_stage=body.lifecycle_stage or "Incident Received",
        source_text=body.source_text,
        form_data=body.form_data,
        five_whys=body.five_whys,
        fishbone=body.fishbone,
        root_causes=body.root_causes,
        missing_evidence=body.missing_evidence,
        capa=body.capa,
        reviewer_name=body.reviewer_name,
        reviewer_comments=body.reviewer_comments,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return to_dict(row)


@app.get("/api/investigations")
def list_investigations(db: Session = Depends(get_db)):
    rows = (
        db.query(models.Investigation)
        .order_by(models.Investigation.updated_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "status": r.status,
            "lifecycle_stage": r.lifecycle_stage,
            "investigation_id": (r.form_data or {}).get("investigation_id"),
            "severity": (r.form_data or {}).get("severity"),
            "incident_classification": (r.form_data or {}).get("incident_classification"),
            "product_name": (r.form_data or {}).get("product_name"),
            "updated_at": r.updated_at,
        }
        for r in rows
    ]


@app.get("/api/investigations/{investigation_id}")
def read_investigation(investigation_id: int, db: Session = Depends(get_db)):
    return to_dict(get_or_404(db, investigation_id))


@app.put("/api/investigations/{investigation_id}")
def update_investigation(
    investigation_id: int, body: InvestigationIn, db: Session = Depends(get_db)
):
    row = get_or_404(db, investigation_id)
    row.title = pick_title(body)
    row.status = body.status
    row.source_text = body.source_text
    row.form_data = body.form_data
    row.five_whys = body.five_whys
    row.fishbone = body.fishbone
    row.root_causes = body.root_causes
    row.missing_evidence = body.missing_evidence
    row.capa = body.capa
    db.commit()
    db.refresh(row)
    return to_dict(row)


@app.delete("/api/investigations/{investigation_id}")
def delete_investigation(investigation_id: int, db: Session = Depends(get_db)):
    row = get_or_404(db, investigation_id)
    db.delete(row)
    db.commit()
    return {"deleted": investigation_id}


# ──────────────────────────────── Lifecycle & QA Approval ────────────────────
from models import LIFECYCLE_STAGES  # noqa: E402

class LifecycleUpdate(BaseModel):
    lifecycle_stage: str

class QAApprovalIn(BaseModel):
    qa_approved: str          # "yes" | "no"
    reviewer_name: str
    reviewer_comments: Optional[str] = None

@app.patch("/api/investigations/{investigation_id}/lifecycle")
def update_lifecycle(investigation_id: int, body: LifecycleUpdate,
                     db: Session = Depends(get_db)):
    if body.lifecycle_stage not in LIFECYCLE_STAGES:
        raise HTTPException(status_code=400,
            detail=f"Invalid stage. Valid: {LIFECYCLE_STAGES}")
    row = get_or_404(db, investigation_id)
    row.lifecycle_stage = body.lifecycle_stage
    if body.lifecycle_stage == "Closed":
        row.status = "Closed"
    db.commit()
    db.refresh(row)
    return {"id": row.id, "lifecycle_stage": row.lifecycle_stage, "status": row.status}


@app.post("/api/investigations/{investigation_id}/qa-approval")
def qa_approval(investigation_id: int, body: QAApprovalIn,
                db: Session = Depends(get_db)):
    from datetime import datetime as _dt
    if body.qa_approved not in ("yes", "no"):
        raise HTTPException(status_code=400, detail="qa_approved must be 'yes' or 'no'.")
    row = get_or_404(db, investigation_id)
    row.qa_approved = body.qa_approved
    row.reviewer_name = body.reviewer_name
    row.reviewer_comments = body.reviewer_comments
    row.qa_approved_at = _dt.utcnow()
    if body.qa_approved == "yes":
        row.lifecycle_stage = "CAPA Implementation"
    db.commit()
    db.refresh(row)
    return to_dict(row)


# ──────────────────────────────── Evidence CRUD ───────────────────────────────
class EvidenceIn(BaseModel):
    evidence_id:     Optional[str] = None
    evidence_type:   Optional[str] = None
    description:     Optional[str] = None
    source_document: Optional[str] = None
    page_reference:  Optional[str] = None
    observation:     Optional[str] = None
    expected_value:  Optional[str] = None
    evidence_status: Optional[str] = None
    reviewer:        Optional[str] = None
    ai_generated:    str = "no"


def ev_to_dict(e: models.EvidenceItem) -> dict:
    return {
        "id": e.id, "investigation_id": e.investigation_id,
        "evidence_id": e.evidence_id, "evidence_type": e.evidence_type,
        "description": e.description, "source_document": e.source_document,
        "page_reference": e.page_reference, "observation": e.observation,
        "expected_value": e.expected_value, "evidence_status": e.evidence_status,
        "reviewer": e.reviewer, "ai_generated": e.ai_generated,
        "created_at": e.created_at, "updated_at": e.updated_at,
    }


@app.get("/api/investigations/{investigation_id}/evidence")
def list_evidence(investigation_id: int, db: Session = Depends(get_db)):
    get_or_404(db, investigation_id)
    rows = db.query(models.EvidenceItem)\
             .filter_by(investigation_id=investigation_id)\
             .order_by(models.EvidenceItem.id).all()
    return [ev_to_dict(e) for e in rows]


@app.post("/api/investigations/{investigation_id}/evidence")
def add_evidence(investigation_id: int, body: EvidenceIn,
                 db: Session = Depends(get_db)):
    get_or_404(db, investigation_id)
    # Auto-generate evidence_id if not provided
    count = db.query(models.EvidenceItem)\
              .filter_by(investigation_id=investigation_id).count()
    ev_id = body.evidence_id or f"EV-{count + 1:03d}"
    e = models.EvidenceItem(
        investigation_id=investigation_id,
        evidence_id=ev_id,
        evidence_type=body.evidence_type,
        description=body.description,
        source_document=body.source_document,
        page_reference=body.page_reference,
        observation=body.observation,
        expected_value=body.expected_value,
        evidence_status=body.evidence_status or "Pending",
        reviewer=body.reviewer,
        ai_generated=body.ai_generated,
    )
    db.add(e); db.commit(); db.refresh(e)
    return ev_to_dict(e)


@app.put("/api/investigations/{investigation_id}/evidence/{evidence_db_id}")
def update_evidence(investigation_id: int, evidence_db_id: int,
                    body: EvidenceIn, db: Session = Depends(get_db)):
    get_or_404(db, investigation_id)
    e = db.get(models.EvidenceItem, evidence_db_id)
    if e is None or e.investigation_id != investigation_id:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
    for field in ("evidence_id", "evidence_type", "description", "source_document",
                  "page_reference", "observation", "expected_value",
                  "evidence_status", "reviewer", "ai_generated"):
        val = getattr(body, field)
        if val is not None:
            setattr(e, field, val)
    db.commit(); db.refresh(e)
    return ev_to_dict(e)


@app.delete("/api/investigations/{investigation_id}/evidence/{evidence_db_id}")
def delete_evidence(investigation_id: int, evidence_db_id: int,
                    db: Session = Depends(get_db)):
    get_or_404(db, investigation_id)
    e = db.get(models.EvidenceItem, evidence_db_id)
    if e is None or e.investigation_id != investigation_id:
        raise HTTPException(status_code=404, detail="Evidence item not found.")
    db.delete(e); db.commit()
    return {"deleted": evidence_db_id}


# ================================================================ CHAT API
import uuid as _uuid

class ChatRequest(BaseModel):
    thread_id: Optional[str] = None          # client provides on follow-ups; omit to start new
    message: str
    investigation_id: Optional[int] = None   # link messages to a saved investigation
    # Optional investigation context — sent when no saved investigation exists yet
    source_text: Optional[str] = None
    form_data: Optional[dict] = None
    five_whys: Optional[list] = None
    fishbone: Optional[dict] = None
    root_causes: Optional[list] = None
    missing_evidence: Optional[list] = None
    capa: Optional[list] = None


class ChatResponse(BaseModel):
    thread_id: str
    reply: str
    rca_updates: Optional[dict] = None
    investigation_id: Optional[int] = None


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """ChatGPT-style conversational endpoint with MySQL-persisted memory.

    Flow:
    1. Resolve or create thread_id.
    2. Load full conversation history from DB for this thread.
    3. Build investigation context (from request payload or saved investigation).
    4. Run chat_graph (LangGraph).
    5. Persist user message + AI reply to DB.
    6. Return reply + optional RCA structured updates.
    """
    # ── 1. Thread ID ──────────────────────────────────────────────────────────
    thread_id = req.thread_id or str(_uuid.uuid4())

    # ── 2. Load conversation history from DB ──────────────────────────────────
    history_rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.thread_id == thread_id)
        .order_by(models.ConversationMessage.created_at.asc())
        .all()
    )
    history = [{"role": row.role, "content": row.content} for row in history_rows]

    # ── 3. Build investigation context ────────────────────────────────────────
    # Priority: saved investigation in DB > payload context
    inv_id = req.investigation_id
    source_text   = req.source_text   or ""
    form_data     = req.form_data     or {}
    five_whys     = req.five_whys     or []
    fishbone      = req.fishbone      or {}
    root_causes   = req.root_causes   or []
    missing_evidence = req.missing_evidence or []
    capa          = req.capa          or []

    if inv_id:
        inv = db.get(models.Investigation, inv_id)
        if inv:
            source_text      = inv.source_text      or source_text
            form_data        = inv.form_data        or form_data
            five_whys        = inv.five_whys        or five_whys
            fishbone         = inv.fishbone         or fishbone
            root_causes      = inv.root_causes      or root_causes
            missing_evidence = inv.missing_evidence or missing_evidence
            capa             = inv.capa             or capa

    # ── 4. Run LangGraph chat ─────────────────────────────────────────────────
    try:
        result = chat_graph.invoke({
            "source_text":       source_text,
            "form_data":         form_data,
            "five_whys":         five_whys,
            "fishbone":          fishbone,
            "root_causes":       root_causes,
            "missing_evidence":  missing_evidence,
            "capa":              capa,
            "history":           history,
            "user_message":      req.message,
        })
    except LLMConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        msg = str(exc)
        if "429" in msg or "rate" in msg.lower():
            raise HTTPException(status_code=429,
                detail="Groq rate limit reached. Wait a moment and try again.")
        raise HTTPException(status_code=502, detail=f"AI chat failed: {msg}")

    ai_reply    = result.get("ai_reply", "")
    rca_updates = result.get("rca_updates")

    # ── 5. Persist messages to DB ─────────────────────────────────────────────
    db.add(models.ConversationMessage(
        thread_id=thread_id,
        investigation_id=inv_id,
        role="user",
        content=req.message,
    ))
    db.add(models.ConversationMessage(
        thread_id=thread_id,
        investigation_id=inv_id,
        role="assistant",
        content=ai_reply,
        rca_updates=rca_updates,
    ))
    db.commit()

    # ── 6. Optionally apply RCA updates to saved investigation ────────────────
    if rca_updates and inv_id:
        inv = db.get(models.Investigation, inv_id)
        if inv:
            if "form_data" in rca_updates and rca_updates["form_data"]:
                existing = inv.form_data or {}
                existing.update(rca_updates["form_data"])
                inv.form_data = existing
            for field in ("five_whys", "fishbone", "root_causes", "missing_evidence", "capa"):
                if field in rca_updates and rca_updates[field]:
                    setattr(inv, field, rca_updates[field])
            db.commit()

    return ChatResponse(
        thread_id=thread_id,
        reply=ai_reply,
        rca_updates=rca_updates,
        investigation_id=inv_id,
    )


@app.get("/api/chat/{thread_id}/history")
def get_chat_history(thread_id: str, db: Session = Depends(get_db)):
    """Return full conversation history for a thread (for recovery after restart)."""
    rows = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.thread_id == thread_id)
        .order_by(models.ConversationMessage.created_at.asc())
        .all()
    )
    return [
        {
            "id":         r.id,
            "role":       r.role,
            "content":    r.content,
            "rca_updates": r.rca_updates,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@app.delete("/api/chat/{thread_id}/history")
def clear_chat_history(thread_id: str, db: Session = Depends(get_db)):
    """Delete all messages for a thread (clear conversation)."""
    deleted = (
        db.query(models.ConversationMessage)
        .filter(models.ConversationMessage.thread_id == thread_id)
        .delete()
    )
    db.commit()
    return {"deleted": deleted, "thread_id": thread_id}
