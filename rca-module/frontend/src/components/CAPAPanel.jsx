import { useSelector, useDispatch } from 'react-redux'
import { setCapa } from '../store/rcaSlice'
import { ShieldCheck, Wrench, CheckCircle } from 'lucide-react'

const PRIORITY_COLORS = {
  High:   'bg-red-100   text-red-700   border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100  text-green-700  border-green-200',
}

const CAPA_STATUS_OPTS        = ['Open', 'In Progress', 'Completed', 'Overdue', 'Cancelled']
const EFFECTIVENESS_STATUS_OPTS = ['Pending Review', 'Effective', 'Not Effective', 'Partially Effective']
const PRIORITY_OPTS    = ['High', 'Medium', 'Low']

export default function CAPAPanel() {
  const dispatch = useDispatch()
  const capa = useSelector((s) => s.rca.capa)

  const updateField = (idx, field, value) => {
    const updated = capa.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    dispatch(setCapa(updated))
  }

  const toggleQAApproval = (idx) => {
    updateField(idx, 'qa_approved', !capa[idx].qa_approved)
  }

  if (!capa.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Run the AI Investigation to generate CAPA recommendations.
      </div>
    )
  }

  const corrective = capa.map((c, i) => ({ ...c, _idx: i })).filter((c) => c.type === 'corrective')
  const preventive = capa.map((c, i) => ({ ...c, _idx: i })).filter((c) => c.type === 'preventive')

  const renderItems = (items) =>
    items.map((item) => {
      const idx = item._idx
      return (
        <div key={idx} className="card p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-gray-500">{item.id || `CAPA-${idx + 1}`}</span>
            <span className={`badge ${item.type === 'corrective' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {item.type === 'corrective' ? 'Corrective' : 'Preventive'}
            </span>
            <span className={`badge border ${PRIORITY_COLORS[item.priority] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {item.priority || 'Medium'} priority
            </span>
            <select
              className="ml-auto text-xs border border-gray-300 rounded px-2 py-0.5 bg-white"
              value={item.status || 'Open'}
              onChange={(e) => updateField(idx, 'status', e.target.value)}
            >
              {CAPA_STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Action + Reason */}
          <div>
            <label className="form-label">Action Description</label>
            <textarea rows={2} className="form-textarea"
              value={item.action}
              onChange={(e) => updateField(idx, 'action', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Rationale / Reason</label>
            <textarea rows={2} className="form-textarea text-xs"
              value={item.reason}
              onChange={(e) => updateField(idx, 'reason', e.target.value)} />
          </div>

          {/* Linked cause */}
          {item.linked_cause && (
            <div>
              <label className="form-label">Addresses Root Cause</label>
              <p className="text-xs text-gray-600 italic bg-gray-50 border border-gray-200 rounded p-2">
                {item.linked_cause}
              </p>
            </div>
          )}

          {/* Owner / Dept / Due */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="form-label">Owner Role</label>
              <input className="form-input text-xs"
                value={item.owner_role || ''}
                onChange={(e) => updateField(idx, 'owner_role', e.target.value)}
                placeholder="e.g. QA" />
            </div>
            <div>
              <label className="form-label">Department</label>
              <input className="form-input text-xs"
                value={item.department || ''}
                onChange={(e) => updateField(idx, 'department', e.target.value)}
                placeholder="e.g. Quality Assurance" />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input text-xs"
                value={item.due_date || ''}
                onChange={(e) => updateField(idx, 'due_date', e.target.value)} />
            </div>
          </div>

          {/* Effectiveness */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Effectiveness Criteria</label>
              <textarea rows={2} className="form-textarea text-xs"
                value={item.effectiveness_criteria || ''}
                onChange={(e) => updateField(idx, 'effectiveness_criteria', e.target.value)}
                placeholder="How will effectiveness be measured?" />
            </div>
            <div>
              <label className="form-label">Effectiveness Result</label>
              <textarea rows={2} className="form-textarea text-xs"
                value={item.effectiveness_result || ''}
                onChange={(e) => updateField(idx, 'effectiveness_result', e.target.value)}
                placeholder="Fill in when effectiveness check is done…" />
            </div>
          </div>

          {/* Completion evidence */}
          <div>
            <label className="form-label">Completion Evidence</label>
            <textarea rows={2} className="form-textarea text-xs"
              value={item.completion_evidence || ''}
              onChange={(e) => updateField(idx, 'completion_evidence', e.target.value)}
              placeholder="Document reference, attachment, or record confirming completion…" />
          </div>

          {/* QA Approval */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => toggleQAApproval(idx)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                item.qa_approved
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-green-400'
              }`}
            >
              <CheckCircle size={12} />
              {item.qa_approved ? 'QA Approved' : 'Mark QA Approved'}
            </button>
            <span className="text-xs text-gray-400">Save investigation to persist approval</span>
          </div>
        </div>
      )
    })

  return (
    <div className="space-y-6">
      {corrective.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wrench size={15} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-700">Corrective Actions</h3>
            <span className="text-xs text-gray-400">— address this specific incident</span>
          </div>
          {renderItems(corrective)}
        </section>
      )}
      {preventive.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-gray-700">Preventive Actions</h3>
            <span className="text-xs text-gray-400">— stop recurrence</span>
          </div>
          {renderItems(preventive)}
        </section>
      )}
    </div>
  )
}
