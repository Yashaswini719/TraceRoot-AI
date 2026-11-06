import { useDispatch, useSelector } from 'react-redux'
import { setFiveWhys } from '../store/rcaSlice'
import { GitBranch } from 'lucide-react'

export default function FiveWhysPanel() {
  const dispatch = useDispatch()
  const fiveWhys = useSelector((s) => s.rca.fiveWhys)

  const updateStep = (idx, field, value) => {
    const updated = fiveWhys.map((step, i) =>
      i === idx ? { ...step, [field]: value } : step
    )
    dispatch(setFiveWhys(updated))
  }

  if (!fiveWhys.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Run the AI Investigation to generate 5 Whys analysis.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={15} className="text-purple-600" />
        <p className="text-xs text-gray-500">
          AI-generated chain. Each answer must logically follow the previous. Edit as needed.
        </p>
      </div>

      {fiveWhys.map((step, idx) => (
        <div key={idx} className="relative pl-6">
          {/* Connector line */}
          {idx < fiveWhys.length - 1 && (
            <div className="absolute left-2.5 top-8 bottom-0 w-0.5 bg-purple-200" />
          )}
          {/* Step circle */}
          <div className="absolute left-0 top-2 flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-bold">
            {step.why}
          </div>

          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">Why {step.why}</span>
              <span
                className={`badge text-xs ${
                  step.basis === 'Documented'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {step.basis}
              </span>
            </div>

            <div>
              <label className="form-label">Question</label>
              <input
                type="text"
                className="form-input"
                value={step.question}
                onChange={(e) => updateStep(idx, 'question', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Answer</label>
              <textarea
                rows={2}
                className="form-textarea"
                value={step.answer}
                onChange={(e) => updateStep(idx, 'answer', e.target.value)}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
