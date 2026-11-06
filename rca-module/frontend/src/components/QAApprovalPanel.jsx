import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { submitQAApproval, setReviewerInfo } from '../store/rcaSlice'
import { ShieldCheck, ShieldX, User } from 'lucide-react'

export default function QAApprovalPanel() {
  const dispatch    = useDispatch()
  const currentId   = useSelector((s) => s.rca.currentId)
  const qaApproved  = useSelector((s) => s.rca.qaApproved)
  const reviewerName = useSelector((s) => s.rca.reviewerName)
  const reviewerComments = useSelector((s) => s.rca.reviewerComments)

  const [submitting, setSubmitting] = useState(false)

  const handleApproval = async (decision) => {
    if (!currentId) return
    if (!reviewerName.trim()) {
      alert('Please enter the reviewer name before approving.')
      return
    }
    setSubmitting(true)
    await dispatch(submitQAApproval({
      id: currentId,
      qa_approved: decision,
      reviewer_name: reviewerName,
      reviewer_comments: reviewerComments,
    }))
    setSubmitting(false)
  }

  if (!currentId) {
    return (
      <div className="card p-4 text-xs text-gray-400">
        Save the investigation first to enable QA approval.
      </div>
    )
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
        <ShieldCheck size={15} className="text-blue-600" />
        <h2 className="font-semibold text-sm text-gray-800">QA Review &amp; Approval</h2>
      </div>

      {qaApproved && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          qaApproved === 'yes'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        } text-sm`}>
          {qaApproved === 'yes'
            ? <><ShieldCheck size={15} /> <strong>Approved</strong> by {reviewerName}</>
            : <><ShieldX size={15} />    <strong>Rejected</strong> by {reviewerName}</>}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="form-label flex items-center gap-1">
            <User size={11} /> Reviewer Name <span className="text-red-500">*</span>
          </label>
          <input
            className="form-input"
            value={reviewerName}
            onChange={(e) => dispatch(setReviewerInfo({ reviewerName: e.target.value }))}
            placeholder="Full name of QA reviewer"
          />
        </div>
        <div>
          <label className="form-label">Reviewer Comments</label>
          <textarea
            rows={3}
            className="form-textarea"
            value={reviewerComments}
            onChange={(e) => dispatch(setReviewerInfo({ reviewerComments: e.target.value }))}
            placeholder="Comments, conditions, or rationale for approval / rejection…"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleApproval('yes')}
          disabled={submitting || !reviewerName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <ShieldCheck size={15} />
          {submitting ? 'Submitting…' : 'Approve Investigation'}
        </button>
        <button
          onClick={() => handleApproval('no')}
          disabled={submitting || !reviewerName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <ShieldX size={15} />
          Reject / Request Revision
        </button>
      </div>
    </div>
  )
}
