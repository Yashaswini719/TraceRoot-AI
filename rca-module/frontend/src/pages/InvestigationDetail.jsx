import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft } from 'lucide-react'
import { fetchInvestigation } from '../store/investigationsSlice'
import { loadSavedInvestigation } from '../store/rcaSlice'
import { setThreadId, loadHistory } from '../store/chatSlice'
import Spinner from '../components/Spinner'
import AlertBanner from '../components/AlertBanner'
import NewInvestigation from './NewInvestigation'

export default function InvestigationDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { status, error } = useSelector((s) => s.investigations)

  useEffect(() => {
    dispatch(fetchInvestigation(Number(id))).then((action) => {
      if (action.payload) {
        dispatch(loadSavedInvestigation(action.payload))

        // Restore chat thread — use investigation id as stable thread prefix
        const threadId = `inv-${id}`
        dispatch(setThreadId(threadId))
        dispatch(loadHistory(threadId))
      }
    })
  }, [dispatch, id])

  if (status === 'loading') return <Spinner label="Loading investigation…" />
  if (status === 'failed') return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <button onClick={() => navigate('/investigations')} className="btn-secondary">
        <ArrowLeft size={14} /> Back
      </button>
      <AlertBanner variant="error">{error}</AlertBanner>
    </div>
  )

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate('/investigations')}
          className="btn-secondary text-xs mb-2"
        >
          <ArrowLeft size={13} /> All Investigations
        </button>
      </div>
      <NewInvestigation />
    </div>
  )
}
