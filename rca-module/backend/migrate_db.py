"""Run this once after updating models.py to apply schema migrations.
   python migrate_db.py
"""
import sys
sys.path.insert(0, '.')

from database import engine, Base
from sqlalchemy import text, inspect
import models  # registers all models with Base

insp = inspect(engine)
existing_tables = insp.get_table_names()
print("Existing tables:", existing_tables)

# ── Create new tables (evidence_items) if they don't exist ───────────────────
Base.metadata.create_all(bind=engine)
print("create_all: OK")

# ── ALTER TABLE: add new columns to investigations if missing ─────────────────
inv_cols = {c['name'] for c in insp.get_columns('investigations')}
print("Current investigations columns:", sorted(inv_cols))

alter_statements = {
    "lifecycle_stage":    "ALTER TABLE investigations ADD COLUMN lifecycle_stage VARCHAR(80) NOT NULL DEFAULT 'Incident Received'",
    "reviewer_name":      "ALTER TABLE investigations ADD COLUMN reviewer_name VARCHAR(255) NULL",
    "reviewer_comments":  "ALTER TABLE investigations ADD COLUMN reviewer_comments TEXT NULL",
    "qa_approved":        "ALTER TABLE investigations ADD COLUMN qa_approved VARCHAR(10) NULL",
    "qa_approved_at":     "ALTER TABLE investigations ADD COLUMN qa_approved_at DATETIME NULL",
}

with engine.connect() as conn:
    for col, sql in alter_statements.items():
        if col in inv_cols:
            print(f"  SKIP (exists): {col}")
            continue
        try:
            conn.execute(text(sql))
            conn.commit()
            print(f"  ADDED: {col}")
        except Exception as e:
            print(f"  ERROR adding {col}: {e}")

# ── Verify ─────────────────────────────────────────────────────────────────────
insp2 = inspect(engine)
final_cols = [c['name'] for c in insp2.get_columns('investigations')]
final_tables = insp2.get_table_names()
ev_cols = [c['name'] for c in insp2.get_columns('evidence_items')]

print("\n=== Final State ===")
print("Tables:", final_tables)
print("investigations columns:", final_cols)
print("evidence_items columns:", ev_cols)

required = {'lifecycle_stage', 'reviewer_name', 'reviewer_comments', 'qa_approved', 'qa_approved_at'}
missing = required - set(final_cols)
if missing:
    print(f"\nWARNING: Still missing columns: {missing}")
else:
    print("\nAll required columns present. Migration complete.")
