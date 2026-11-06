"""Full integration verification — run with: .\\venv\\Scripts\\python.exe verify_full.py"""
import sys, json
sys.path.insert(0, '.')

from database import engine, Base
import models
from sqlalchemy import inspect
from sqlalchemy.orm import Session

passed = 0
failed = 0

def ok(msg):
    global passed; passed += 1; print(f'✅  {msg}')

def fail(msg):
    global failed; failed += 1; print(f'❌  {msg}')

# ── 1. Schema compilation ────────────────────────────────────────────────────
try:
    from schemas import FORM_FIELD_KEYS, RCAFormFields
    assert len(FORM_FIELD_KEYS) == 26, f"Expected 26 keys, got {len(FORM_FIELD_KEYS)}"
    f = RCAFormFields(incident_classification='major', severity='HIGH')
    assert f.incident_classification == 'Major', "classification normalisation failed"
    assert f.severity == 'High', "severity normalisation failed"
    ok(f"schemas.py — {len(FORM_FIELD_KEYS)} form fields, validation OK")
except Exception as e:
    fail(f"schemas.py: {e}")

# ── 2. DB tables & columns ───────────────────────────────────────────────────
try:
    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    tables = insp.get_table_names()
    for t in ('investigations', 'evidence_items', 'conversations'):
        assert t in tables, f"Missing table: {t}"
    inv_cols = {c['name'] for c in insp.get_columns('investigations')}
    for col in ('lifecycle_stage', 'qa_approved', 'qa_approved_at', 'reviewer_name', 'reviewer_comments'):
        assert col in inv_cols, f"Missing column: {col}"
    ev_cols = {c['name'] for c in insp.get_columns('evidence_items')}
    for col in ('evidence_id', 'evidence_type', 'evidence_status', 'observation', 'expected_value'):
        assert col in ev_cols, f"Missing evidence column: {col}"
    ok("DB tables + columns: investigations, evidence_items, conversations all correct")
except Exception as e:
    fail(f"DB schema: {e}")

# ── 3. Analysis normalizers ──────────────────────────────────────────────────
try:
    from analysis import normalize_root_causes, normalize_capa, normalize_five_whys
    rc = normalize_root_causes([{
        'cause': 'Sensor drift', 'type': 'root', 'confidence': 'High',
        'evidence': 'Calibration log shows drift', 'contradicting_evidence': 'None',
        'missing_evidence': 'PM records needed', 'reviewer_comments': ''
    }])
    assert rc[0]['id'] == 'RC-1', "root cause ID missing"
    assert 'contradicting_evidence' in rc[0], "contradicting_evidence missing"
    assert 'missing_evidence' in rc[0], "per-cause missing_evidence missing"
    assert 'review_status' in rc[0], "review_status missing"
    assert rc[0]['review_status'] == 'Pending', "default review_status should be Pending"

    capa = normalize_capa([{
        'type': 'corrective', 'action': 'Fix sensor', 'reason': 'Cause confirmed',
        'linked_cause': 'Sensor drift', 'priority': 'high', 'owner_role': 'Engineering',
        'department': 'Maintenance', 'effectiveness_criteria': 'Zero drift for 6 months'
    }])
    assert capa[0]['id'] == 'CAPA-1', "CAPA ID missing"
    assert capa[0]['department'] == 'Maintenance', "department missing"
    assert 'due_date' in capa[0], "due_date missing"
    assert 'status' in capa[0], "status missing"
    assert 'qa_approved' in capa[0], "qa_approved missing"
    assert capa[0]['status'] == 'Open', "default status should be Open"
    ok("analysis.py normalizers — root cause + CAPA all new fields present")
except Exception as e:
    fail(f"analysis normalizers: {e}")

# ── 4. Evidence CRUD ─────────────────────────────────────────────────────────
try:
    with Session(engine) as db:
        # Create a test investigation
        inv = models.Investigation(title='Test RCA', lifecycle_stage='Evidence Collection')
        db.add(inv); db.commit(); db.refresh(inv)

        # Add evidence
        ev = models.EvidenceItem(
            investigation_id=inv.id,
            evidence_id='EV-001',
            evidence_type='Calibration Record',
            description='Temp sensor TT-204 calibration log',
            evidence_status='Supporting',
            ai_generated='no',
        )
        db.add(ev); db.commit(); db.refresh(ev)

        # Read back via relationship
        db.refresh(inv)
        assert len(inv.evidence_items) == 1, "evidence relationship broken"
        assert inv.evidence_items[0].evidence_id == 'EV-001', "wrong evidence item"

        # Update lifecycle
        inv.lifecycle_stage = 'RCA Analysis'
        db.commit(); db.refresh(inv)
        assert inv.lifecycle_stage == 'RCA Analysis', "lifecycle update failed"

        # QA Approval
        from datetime import datetime
        inv.qa_approved = 'yes'
        inv.reviewer_name = 'Dr. QA'
        inv.qa_approved_at = datetime.utcnow()
        db.commit(); db.refresh(inv)
        assert inv.qa_approved == 'yes', "qa_approved not saved"

        # Cleanup
        db.delete(inv); db.commit()

    ok("Evidence CRUD + lifecycle + QA approval — DB operations all work")
except Exception as e:
    fail(f"Evidence/lifecycle DB: {e}")

# ── 5. API routes ────────────────────────────────────────────────────────────
try:
    from main import app
    route_paths = [r.path for r in app.routes]
    required_routes = [
        '/api/chat',
        '/api/chat/{thread_id}/history',
        '/api/investigations/{investigation_id}/evidence',
        '/api/investigations/{investigation_id}/lifecycle',
        '/api/investigations/{investigation_id}/qa-approval',
    ]
    for r in required_routes:
        assert r in route_paths, f"Missing route: {r}"
    ok(f"API routes — all {len(required_routes)} new routes registered")
except Exception as e:
    fail(f"API routes: {e}")

# ── 6. Lifecycle stages list ─────────────────────────────────────────────────
try:
    from models import LIFECYCLE_STAGES
    assert len(LIFECYCLE_STAGES) == 9, f"Expected 9 stages, got {len(LIFECYCLE_STAGES)}"
    assert 'Incident Received' in LIFECYCLE_STAGES
    assert 'QA Approval' in LIFECYCLE_STAGES
    assert 'Closed' in LIFECYCLE_STAGES
    ok(f"LIFECYCLE_STAGES — {len(LIFECYCLE_STAGES)} stages defined correctly")
except Exception as e:
    fail(f"Lifecycle stages: {e}")

# ── 7. chat_graph uses MAX_CHARS 20000 ───────────────────────────────────────
try:
    import inspect as py_inspect, chat_graph as cg
    src = py_inspect.getsource(cg._build_context_section)
    assert '20000' in src, "chat context should use 20000 chars not 6000"
    ok("chat_graph.py — source document context window = 20000 chars")
except Exception as e:
    fail(f"chat_graph context window: {e}")

# Summary
print()
print(f"{'='*50}")
print(f"Results: {passed} passed, {failed} failed")
if failed == 0:
    print("All checks passed ✓")
else:
    print("Some checks failed — see above.")
