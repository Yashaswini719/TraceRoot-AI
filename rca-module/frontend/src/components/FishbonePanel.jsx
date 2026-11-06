import { useDispatch, useSelector } from 'react-redux'
import { setFishbone } from '../store/rcaSlice'
import { Plus, X } from 'lucide-react'

const CATEGORIES = ['Man', 'Machine', 'Material', 'Method', 'Measurement', 'Environment']

const CAT_COLORS = {
  Man:         'bg-blue-50   border-blue-200   text-blue-800',
  Machine:     'bg-orange-50 border-orange-200 text-orange-800',
  Material:    'bg-green-50  border-green-200  text-green-800',
  Method:      'bg-purple-50 border-purple-200 text-purple-800',
  Measurement: 'bg-red-50    border-red-200    text-red-800',
  Environment: 'bg-teal-50   border-teal-200   text-teal-800',
}

const CAT_HEADER_COLORS = {
  Man:         'bg-blue-600',
  Machine:     'bg-orange-500',
  Material:    'bg-green-600',
  Method:      'bg-purple-600',
  Measurement: 'bg-red-600',
  Environment: 'bg-teal-600',
}

export default function FishbonePanel() {
  const dispatch = useDispatch()
  const fishbone = useSelector((s) => s.rca.fishbone)

  const updateCategory = (cat, items) => {
    dispatch(setFishbone({ ...fishbone, [cat]: items }))
  }

  const addItem = (cat) => {
    const items = [...(fishbone[cat] || []), '']
    updateCategory(cat, items)
  }

  const updateItem = (cat, idx, value) => {
    const items = (fishbone[cat] || []).map((v, i) => (i === idx ? value : v))
    updateCategory(cat, items)
  }

  const removeItem = (cat, idx) => {
    const items = (fishbone[cat] || []).filter((_, i) => i !== idx)
    updateCategory(cat, items)
  }

  const hasAnyData = CATEGORIES.some((c) => (fishbone[c] || []).length > 0)

  if (!hasAnyData && Object.keys(fishbone).length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        Run the AI Investigation to generate fishbone (Ishikawa) analysis.
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-4">
        Ishikawa (Fishbone) diagram — causes grouped by category. Edit, add, or remove factors.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const items = fishbone[cat] || []
          return (
            <div key={cat} className={`rounded-xl border ${CAT_COLORS[cat]} overflow-hidden`}>
              <div className={`${CAT_HEADER_COLORS[cat]} px-3 py-2 flex items-center justify-between`}>
                <span className="text-white text-xs font-bold uppercase tracking-wide">{cat}</span>
                <button
                  onClick={() => addItem(cat)}
                  className="text-white/80 hover:text-white"
                  title="Add factor"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="p-3 space-y-2 min-h-[60px]">
                {items.length === 0 && (
                  <p className="text-xs text-gray-400 italic">No factors identified</p>
                )}
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 text-xs border border-white/60 rounded bg-white/70 focus:outline-none focus:ring-1 focus:ring-current"
                      value={item}
                      onChange={(e) => updateItem(cat, idx, e.target.value)}
                    />
                    <button
                      onClick={() => removeItem(cat, idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
