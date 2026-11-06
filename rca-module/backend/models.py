from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Index, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# ── Investigation lifecycle stages ────────────────────────────────────────────
LIFECYCLE_STAGES = [
    "Incident Received",
    "AI Extraction",
    "Information Review",
    "Evidence Collection",
    "RCA Analysis",
    "QA Approval",
    "CAPA Implementation",
    "Effectiveness Verification",
    "Closed",
]


class Investigation(Base):
    __tablename__ = "investigations"

    id    = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Investigation")

    # Lifecycle (replaces simple Draft/Saved with a 9-stage workflow)
    lifecycle_stage = Column(String(80), nullable=False, default="Incident Received")
    status          = Column(String(50), nullable=False, default="Draft")  # Draft / Saved / Closed

    # Raw source document text
    source_text = Column(Text, nullable=True)

    # ── AI-extracted + user-edited form fields ─────────────────────────────
    # Stored as a single JSON blob; keys match FORM_FIELD_KEYS in schemas.py
    form_data = Column(JSON, nullable=True)

    # ── AI investigation results (user-editable JSON arrays) ───────────────
    five_whys        = Column(JSON, nullable=True)
    fishbone         = Column(JSON, nullable=True)
    root_causes      = Column(JSON, nullable=True)   # see RootCause shape below
    missing_evidence = Column(JSON, nullable=True)
    capa             = Column(JSON, nullable=True)   # see CAPAAction shape below

    # ── QA Review ──────────────────────────────────────────────────────────
    reviewer_name    = Column(String(255), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    qa_approved      = Column(String(10), nullable=True)   # "yes" | "no" | None
    qa_approved_at   = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    evidence_items = relationship(
        "EvidenceItem",
        back_populates="investigation",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "ConversationMessage",
        back_populates="investigation",
        cascade="all, delete-orphan",
    )


# ── RootCause JSON shape (for documentation) ─────────────────────────────────
# {
#   "id":                   "RC-1",
#   "cause":                "...",
#   "type":                 "root" | "contributing",
#   "confidence":           "High" | "Medium" | "Low",
#   "evidence":             "...",   # supporting
#   "contradicting_evidence": "...",
#   "missing_evidence":     "...",
#   "review_status":        "Pending" | "Confirmed" | "Rejected",
#   "reviewer_comments":    "...",
#   "confirmed":            false,
#   "status":               "AI suggestion. Not confirmed...",
# }

# ── CAPAAction JSON shape (for documentation) ─────────────────────────────────
# {
#   "id":                   "CAPA-1",
#   "type":                 "corrective" | "preventive",
#   "action":               "...",
#   "reason":               "...",
#   "linked_cause":         "...",
#   "priority":             "High" | "Medium" | "Low",
#   "owner_role":           "...",
#   "department":           "...",
#   "due_date":             "YYYY-MM-DD",
#   "status":               "Open" | "In Progress" | "Completed" | "Overdue",
#   "completion_evidence":  "...",
#   "effectiveness_criteria": "...",
#   "effectiveness_result": "...",
#   "qa_approved":          false,
# }


class EvidenceItem(Base):
    """One row = one discrete piece of evidence linked to an investigation."""
    __tablename__ = "evidence_items"

    id               = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_id      = Column(String(50),  nullable=True)   # e.g. "EV-001"
    evidence_type    = Column(String(100), nullable=True)   # Batch Record, HPLC, Calibration, …
    description      = Column(Text,        nullable=True)
    source_document  = Column(String(500), nullable=True)
    page_reference   = Column(String(100), nullable=True)
    observation      = Column(Text,        nullable=True)
    expected_value   = Column(String(255), nullable=True)
    evidence_status  = Column(String(50),  nullable=True)   # Supporting | Contradicting | Missing | Pending
    reviewer         = Column(String(255), nullable=True)
    ai_generated     = Column(String(5),   nullable=False, default="no")  # "yes" | "no"
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    investigation = relationship("Investigation", back_populates="evidence_items")


class ConversationMessage(Base):
    """One row = one chat turn (user or assistant) within an investigation thread."""
    __tablename__ = "conversations"

    id               = Column(Integer, primary_key=True, index=True)
    thread_id        = Column(String(128), nullable=False, index=True)
    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    role        = Column(String(20), nullable=False)   # "user" | "assistant"
    content     = Column(Text, nullable=False)
    rca_updates = Column(JSON, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)

    investigation = relationship("Investigation", back_populates="messages")

    __table_args__ = (
        Index("ix_conv_thread_created", "thread_id", "created_at"),
    )
