import { useDispatch, useSelector } from 'react-redux'
import { advanceLifecycle } from '../store/rcaSlice'
import { ChevronRight, Check } from 'lucide-react'

const STAGES = [
  'Incident Received',
  'AI Extraction',
  'Information Review',
  'Evidence Collection',
  'RCA Analysis',
  'QA Approval',
  'CAPA Implementation',
  'Effectiveness Verification',
  'Closed',
]

export default function LifecycleBar() {
  const dispatch    = useDispatch()
  const currentId   = useSelector((s) => s.rca.currentId)
  const currentStage = useSelector((s) => s.rca.lifecycleStage || 'Incident Received')

  const currentIdx = STAGES.indexOf(currentStage)

  const advance = () => {
    if (!currentId) return
    const nextIdx = currentIdx + 1
    if (nextIdx >= STAGES.length) return
    dispatch(advanceLifecycle({ id: currentId, lifecycle_stage: STAGES[nextIdx] }))
  }

  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-1 overflow-x-auto">
        {STAGES.map((stage, idx) => {
          const done    = idx < currentIdx
          const active  = idx === currentIdx
          return (
            <div key={stage} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                done   ? 'bg-green-100 text-green-700'
                : active ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-400'
              }`}>
                {done && <Check size={10} />}
                {stage}
              </div>
              {idx < STAGES.length - 1 && (
                <ChevronRight size={12} className="text-gray-300 shrink-0" />
              )}
            </div>
          )
        })}
        {currentId && currentIdx < STAGES.length - 1 && (
          <button
            onClick={advance}
            className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap shrink-0 border border-blue-300 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
          >
            Advance →
          </button>
        )}
      </div>
    </div>
  )
}
