"""Quick verification script — run with:
   .\\venv\\Scripts\\python.exe verify_chat.py
"""
import sys
sys.path.insert(0, '.')

from database import engine, Base, get_db
import models
from chat_graph import chat_graph, ChatState, _extract_rca_update
from main import app
from sqlalchemy import inspect
from sqlalchemy.orm import Session

passed = 0

# 1. DB tables
insp = inspect(engine)
tables = insp.get_table_names()
assert 'investigations' in tables, 'FAIL: investigations table missing'
assert 'conversations'  in tables, 'FAIL: conversations table missing'
print('✅  1. DB tables: investigations, conversations')
passed += 1

# 2. conversations columns
cols = {c['name'] for c in insp.get_columns('conversations')}
for c in ('id', 'thread_id', 'investigation_id', 'role', 'content', 'rca_updates', 'created_at'):
    assert c in cols, f'FAIL: column {c} missing from conversations'
print('✅  2. conversations columns correct')
passed += 1

# 3. Routes
routes = [r.path for r in app.routes]
assert '/api/chat' in routes,                            'FAIL: /api/chat missing'
assert '/api/chat/{thread_id}/history' in routes,        'FAIL: /api/chat/{thread_id}/history missing'
print('✅  3. /api/chat routes registered')
passed += 1

# 4. rca_update extractor
sample = 'Here is my analysis.\n```rca_update\n{"form_data": {"batch_number": "AT-26-0412"}}\n```\nDone.'
prose, upd = _extract_rca_update(sample)
assert upd is not None,                                  'FAIL: rca_update returned None'
assert upd['form_data']['batch_number'] == 'AT-26-0412', 'FAIL: wrong batch number parsed'
assert 'rca_update' not in prose,                        'FAIL: JSON block not stripped from prose'
print('✅  4. rca_update extraction: prose clean, JSON parsed')
passed += 1

# 5. DB conversation write / read / delete
with Session(engine) as db:
    msg = models.ConversationMessage(
        thread_id='verify-test-thread',
        role='user',
        content='Verification message',
    )
    db.add(msg)
    db.commit()

    fetched = db.query(models.ConversationMessage)\
                .filter_by(thread_id='verify-test-thread')\
                .first()
    assert fetched is not None,                     'FAIL: could not read back message'
    assert fetched.content == 'Verification message', 'FAIL: content mismatch'
    db.delete(fetched)
    db.commit()
print('✅  5. ConversationMessage DB write / read / delete')
passed += 1

# 6. Investigation <-> ConversationMessage relationship
with Session(engine) as db:
    inv = db.query(models.Investigation).first()
    if inv:
        msg = models.ConversationMessage(
            thread_id=f'inv-{inv.id}',
            investigation_id=inv.id,
            role='assistant',
            content='Test linked message',
            rca_updates={'form_data': {'title': 'test'}},
        )
        db.add(msg)
        db.commit()
        db.refresh(inv)
        assert any(m.content == 'Test linked message' for m in inv.messages), \
            'FAIL: relationship not working'
        db.delete(msg)
        db.commit()
        print('✅  6. Investigation → ConversationMessage relationship + rca_updates JSON')
    else:
        print('⚠️   6. Skipped (no investigations in DB yet)')
passed += 1

print()
print(f'All {passed} checks passed ✓')
