import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Trash2, Edit2, Check, X, FileCheck, AlertTriangle, HelpCircle, Clock } from 'lucide-react'
import { fetchEvidence, addEvidence, updateEvidence, deleteEvidence } from '../store/evidenceSlice'

const EVIDENCE_TYPES = [
  'Batch Manufacturing Record', 'HPLC Report', 'Raw Material Certificate (CoA)',
  'Calibration Record', 'Equipment Maintenance Log', 'Cleaning Record',
  'Environmental Monitoring Record', 'Process Log / Trend Data',
  'Operator Training Record', 'SOP / Work Instruction',
  'Previous Investigation Report', 'Other',
]

const STATUS_OPTS   = ['Pending', 'Supporting', 'Contradicting', 'Missing', 'Not Applicable']

const STATUS_STYLES = {
  Supporting:      { cls: 'bg-green-100 text-green-700 border-green-200', Icon: FileCheck },
  Contradicting:   { cls: 'bg-red-100   text-red-700   border-red-200',   Icon: AlertTriangle },
  Missing:         { cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', Icon: HelpCircle },
  Pending:         { cls: 'bg-gray-100  text-gray-600  border-gray-200',  Icon: Clock },
  'Not Applicable':{ cls: 'bg-gray-50   text-gray-400  border-gray-100',  Icon: X },
}

const EMPTY = {
  evidence_type: '', description: '', source_document: '',
  page_reference: '', observation: '', expected_value: '',
  evidence_status: 'Pending', reviewer: '',
}

function EvidenceCard({ item, investigationId, onEdit }) {
  const dispatch = useDispatch()
  const style = STATUS_STYLES[item.evidence_status] || STATUS_STYLES.Pending
  const { Icon } = style

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-blue-700">{item.evidence_id}</span>
          <span className="badge bg-blue-50 text-blue-700 border border-blue-200 text-xs">
            {item.evidence_type || 'Unknown type'}
          </span>
          <span className={`badge border ${style.cls} text-xs flex items-center gap-1`}>
            <Icon size={10} /> {item.evidence_status}
          </span>
          {item.ai_generated === 'yes' && (
            <span className="badge bg-purple-100 text-purple-700 text-xs">AI</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="p-1 text-gray-400 hover:text-blue-600 rounded"
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => {
              if (window.confirm('Delete this evidence item?'))
                dispatch(deleteEvidence({ investigationId, evidenceDbId: item.id }))
            }}
            className="p-1 text-gray-400 hover:text-red-600 rounded"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {item.description && (
        <p className="text-sm text-gray-700">{item.description}</p>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
        {item.source_document && <span><strong>Source:</strong> {item.source_document}</span>}
        {item.page_reference  && <span><strong>Ref:</strong> {item.page_reference}</span>}
        {item.expected_value  && <span><strong>Expected:</strong> {item.expected_value}</span>}
        {item.reviewer        && <span><strong>Reviewer:</strong> {item.reviewer}</span>}
      </div>

      {item.observation && (
        <div className="text-xs bg-gray-50 border border-gray-200 rounded p-2">
          <strong>Observation:</strong> {item.observation}
        </div>
      )}
    </div>
  )
}

function EvidenceForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { ...EMPTY })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="card p-4 space-y-3 border-2 border-blue-200 bg-blue-50/30">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
        {initial?.id ? 'Edit Evidence Item' : 'Add Evidence Item'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Evidence Type</label>
          <select className="form-input text-xs" value={form.evidence_type}
            onChange={(e) => set('evidence_type', e.target.value)}>
            <option value="">— select —</option>
            {EVIDENCE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Status</label>
          <select className="form-input text-xs" value={form.evidence_status}
            onChange={(e) => set('evidence_status', e.target.value)}>
            {STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Description</label>
        <textarea rows={2} className="form-textarea text-xs"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What this evidence is or shows…" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Source Document</label>
          <input className="form-input text-xs" value={form.source_document}
            onChange={(e) => set('source_document', e.target.value)}
            placeholder="e.g. BMR, batch record" />
        </div>
        <div>
          <label className="form-label">Page / Reference</label>
          <input className="form-input text-xs" value={form.page_reference}
            onChange={(e) => set('page_reference', e.target.value)}
            placeholder="Page 12, Section 3.2…" />
        </div>
        <div>
          <label className="form-label">Expected Value / Range</label>
          <input className="form-input text-xs" value={form.expected_value}
            onChange={(e) => set('expected_value', e.target.value)}
            placeholder="e.g. 60°C ± 5°C" />
        </div>
        <div>
          <label className="form-label">Reviewer</label>
          <input className="form-input text-xs" value={form.reviewer}
            onChange={(e) => set('reviewer', e.target.value)}
            placeholder="Reviewer name / role" />
        </div>
      </div>

      <div>
        <label className="form-label">Observation</label>
        <textarea rows={2} className="form-textarea text-xs"
          value={form.observation}
          onChange={(e) => set('observation', e.target.value)}
          placeholder="What was actually observed…" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => onSave(form)} className="btn-primary text-xs py-1.5">
          <Check size={12} /> Save
        </button>
        <button onClick={onCancel} className="btn-secondary text-xs py-1.5">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function EvidencePanel() {
  const dispatch       = useDispatch()
  const investigationId = useSelector((s) => s.rca.currentId)
  const { items, status, error } = useSelector((s) => s.evidence)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  useEffect(() => {
    if (investigationId) dispatch(fetchEvidence(investigationId))
  }, [investigationId, dispatch])

  const handleSave = (form) => {
    if (editing) {
      dispatch(updateEvidence({ investigationId, evidenceDbId: editing.id, payload: form }))
      setEditing(null)
    } else {
      dispatch(addEvidence({ investigationId, payload: form }))
      setShowForm(false)
    }
  }

  const grouped = {
    Supporting:    items.filter((i) => i.evidence_status === 'Supporting'),
    Contradicting: items.filter((i) => i.evidence_status === 'Contradicting'),
    Missing:       items.filter((i) => i.evidence_status === 'Missing'),
    Pending:       items.filter((i) => !['Supporting','Contradicting','Missing'].includes(i.evidence_status)),
  }

  if (!investigationId) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Save the investigation first to manage evidence items.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Record and classify all evidence for this investigation.
            AI-generated items are marked — verify each one independently.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null) }}
          className="btn-primary text-xs py-1.5"
        >
          <Plus size={13} /> Add Evidence
        </button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_STYLES).map(([s, { cls, Icon: I }]) => {
          const count = items.filter((i) => i.evidence_status === s).length
          if (!count) return null
          return (
            <span key={s} className={`badge border ${cls} text-xs flex items-center gap-1`}>
              <I size={10} /> {count} {s}
            </span>
          )
        })}
        {!items.length && <span className="text-xs text-gray-400">No evidence items yet</span>}
      </div>

      {/* Add form */}
      {showForm && (
        <EvidenceForm onSave={handleSave} onCancel={() => setShowForm(false)} />
      )}

      {/* Evidence items */}
      {status === 'loading' && <p className="text-xs text-gray-400">Loading evidence…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {Object.entries(grouped).map(([group, groupItems]) => {
        if (!groupItems.length) return null
        const style = STATUS_STYLES[group] || STATUS_STYLES.Pending
        const { Icon: GIcon } = style
        return (
          <div key={group} className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1 ${style.cls.split(' ')[1]}`}>
              <GIcon size={12} /> {group} ({groupItems.length})
            </p>
            {groupItems.map((item) =>
              editing?.id === item.id ? (
                <EvidenceForm key={item.id} initial={editing}
                  onSave={handleSave} onCancel={() => setEditing(null)} />
              ) : (
                <EvidenceCard key={item.id} item={item}
                  investigationId={investigationId} onEdit={setEditing} />
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
