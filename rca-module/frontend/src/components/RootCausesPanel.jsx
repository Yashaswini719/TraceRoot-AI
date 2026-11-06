import { useDispatch, useSelector } from 'react-redux'
import { confirmRootCause, setRootCauses, updateInvestigation } from '../store/rcaSlice'
import { CheckCircle, XCircle, AlertTriangle, ShieldAlert, MessageSquare, FileText } from 'lucide-react'

const CONFIDENCE_COLORS = {
  High:   'bg-green-100  text-green-700  border-green-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-red-100    text-red-700    border-red-200',
}
const TYPE_COLORS = {
  root:         'bg-red-600    text-white',
  contributing: 'bg-orange-500 text-white',
}
const REVIEW_COLORS = {
  Pending:   'bg-gray-100  text-gray-600',
  Confirmed: 'bg-green-100 text-green-700',
  Rejected:  'bg-red-100   text-red-700',
}

function AlertBanner({ children }) {
  return (
    <div className="flex gap-2 items-start p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {children}
    </div>
  )
}

export default function RootCausesPanel() {
  const dispatch = useDispatch()
  const rootCauses     = useSelector((s) => s.rca.rootCauses)
  const missingEvidence = useSelector((s) => s.rca.missingEvidence)
  const currentId      = useSelector((s) => s.rca.currentId)
  // Snapshot of the full investigation needed for the auto-save payload
  const rca   = useSelector((s) => s.rca)
  const intake = useSelector((s) => s.intake)

  const updateField = (idx, field, value) => {
    const updated = rootCauses.map((rc, i) => i === idx ? { ...rc, [field]: value } : rc)
    dispatch(setRootCauses(updated))
  }

  // Update review status locally AND persist to DB immediately if already saved
  const setReviewStatus = (idx, status) => {
    const updated = rootCauses.map((rc, i) =>
      i === idx
        ? {
            ...rc,
            review_status:   status,
            confirmed:       status === 'Confirmed',
            status:          status === 'Confirmed' ? 'Confirmed by reviewer'
                           : status === 'Rejected'  ? 'Rejected by reviewer'
                           : rc.status,
          }
        : rc
    )
    dispatch(setRootCauses(updated))

    // Auto-persist if investigation is already in DB
    if (currentId) {
      dispatch(updateInvestigation({
        id: currentId,
        payload: {
          title:            rca.formData.title || rca.formData.investigation_id || 'Untitled Investigation',
          status:           rca.status || 'Saved',
          lifecycle_stage:  rca.lifecycleStage || 'RCA Analysis',
          source_text:      intake.sourceText || null,
          form_data:        rca.formData,
          five_whys:        rca.fiveWhys,
          fishbone:         rca.fishbone,
          root_causes:      updated,       // use the just-updated array
          missing_evidence: rca.missingEvidence,
          capa:             rca.capa,
          reviewer_name:    rca.reviewerName || null,
          reviewer_comments: rca.reviewerComments || null,
        },
      }))
    }
  }

  if (!rootCauses.length && !missingEvidence.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Run the AI Investigation to identify potential root causes.
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Root Causes */}
      {rootCauses.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-red-600" />
            <h3 className="text-sm font-semibold text-gray-700">Potential Root &amp; Contributing Causes</h3>
          </div>
          <AlertBanner>
            All causes are AI suggestions. A qualified QA person must review and confirm each one
            before it can be treated as a confirmed root cause. Evidence must be cited.
          </AlertBanner>

          {rootCauses.map((rc, idx) => (
            <div key={idx} className="card p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-gray-500">{rc.id || `RC-${idx + 1}`}</span>
                <span className={`badge ${TYPE_COLORS[rc.type] || 'bg-gray-200 text-gray-700'}`}>
                  {rc.type === 'root' ? 'Root Cause' : 'Contributing Factor'}
                </span>
                <span className={`badge border ${CONFIDENCE_COLORS[rc.confidence] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {rc.confidence} confidence
                </span>
                <span className={`badge ${REVIEW_COLORS[rc.review_status] || REVIEW_COLORS.Pending} ml-auto`}>
                  {rc.review_status || 'Pending'}
                </span>
              </div>

              {/* Cause explanation */}
              <div>
                <label className="form-label">Cause Explanation</label>
                <textarea rows={2} className="form-textarea"
                  value={rc.cause}
                  onChange={(e) => updateField(idx, 'cause', e.target.value)} />
              </div>

              {/* Evidence grid */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="form-label text-green-700">Supporting Evidence</label>
                  <textarea rows={2} className="form-textarea text-xs border-green-300 bg-green-50"
                    value={rc.evidence || ''}
                    onChange={(e) => updateField(idx, 'evidence', e.target.value)}
                    placeholder="Cite specific document text or data that supports this cause…" />
                </div>
                <div>
                  <label className="form-label text-red-700">Contradicting Evidence</label>
                  <textarea rows={2} className="form-textarea text-xs border-red-200 bg-red-50"
                    value={rc.contradicting_evidence || ''}
                    onChange={(e) => updateField(idx, 'contradicting_evidence', e.target.value)}
                    placeholder="Any evidence that argues against this cause…" />
                </div>
                <div>
                  <label className="form-label text-yellow-700">Missing Evidence (for this cause)</label>
                  <textarea rows={2} className="form-textarea text-xs border-yellow-300 bg-yellow-50"
                    value={rc.missing_evidence || ''}
                    onChange={(e) => updateField(idx, 'missing_evidence', e.target.value)}
                    placeholder="What records or data are still needed to confirm or rule out this cause…" />
                </div>
              </div>

              {/* Reviewer comments */}
              <div>
                <label className="form-label flex items-center gap-1">
                  <MessageSquare size={11} /> Reviewer Comments
                </label>
                <textarea rows={2} className="form-textarea text-xs"
                  value={rc.reviewer_comments || ''}
                  onChange={(e) => updateField(idx, 'reviewer_comments', e.target.value)}
                  placeholder="QA reviewer notes, rationale for confirmation or rejection…" />
              </div>

              {/* Review actions */}
              {rc.review_status !== 'Confirmed' && rc.review_status !== 'Rejected' ? (
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setReviewStatus(idx, 'Confirmed')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle size={12} /> Confirm
                  </button>
                  <button
                    onClick={() => setReviewStatus(idx, 'Rejected')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={12} /> Reject
                  </button>
                  <span className="text-xs text-gray-400">
                    {currentId ? 'Saved automatically on review' : 'Save investigation to persist review status'}
                  </span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                  rc.review_status === 'Confirmed'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {rc.review_status === 'Confirmed'
                    ? <><CheckCircle size={12} /> Confirmed by reviewer{currentId ? ' — persisted to DB' : ' — save to persist'}</>
                    : <><XCircle size={12} /> Rejected by reviewer{currentId ? ' — persisted to DB' : ' — save to persist'}</>}
                  <button
                    onClick={() => setReviewStatus(idx, 'Pending')}
                    className="ml-auto underline text-xs"
                  >
                    Undo
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Global Missing Evidence */}
      {missingEvidence.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-yellow-600" />
            <h3 className="text-sm font-semibold text-gray-700">Global Missing Evidence / Information Gaps</h3>
          </div>
          <p className="text-xs text-gray-500">
            These records or data points were not found in the document. Gather them to confirm or rule out causes.
          </p>
          <div className="space-y-2">
            {missingEvidence.map((item, idx) => (
              <div key={idx} className="flex gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{item.item}</p>
                  {item.why_needed && <p className="text-xs text-yellow-700 mt-0.5">{item.why_needed}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
