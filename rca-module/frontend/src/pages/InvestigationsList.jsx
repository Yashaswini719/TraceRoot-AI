import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, Trash2, ExternalLink, Clock, FlaskConical } from 'lucide-react'
import { fetchInvestigations, deleteInvestigation } from '../store/investigationsSlice'
import Spinner from '../components/Spinner'
import AlertBanner from '../components/AlertBanner'

const STATUS_COLORS = {
  Saved:  'bg-green-100  text-green-700',
  Draft:  'bg-yellow-100 text-yellow-700',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function InvestigationsList() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, status, error } = useSelector((s) => s.investigations)

  useEffect(() => {
    dispatch(fetchInvestigations())
  }, [dispatch])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    dispatch(deleteInvestigation(id))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Saved Investigations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {list.length} investigation{list.length !== 1 ? 's' : ''} on record
          </p>
        </div>
        <button onClick={() => navigate('/new')} className="btn-primary">
          <PlusCircle size={15} /> New Investigation
        </button>
      </div>

      {/* States */}
      {status === 'loading' && <Spinner label="Loading investigations…" />}
      {status === 'failed'  && <AlertBanner variant="error">{error}</AlertBanner>}

      {status === 'succeeded' && list.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <FlaskConical size={40} className="text-gray-300 mx-auto" />
          <p className="text-gray-500">No investigations yet.</p>
          <button onClick={() => navigate('/new')} className="btn-primary mx-auto">
            <PlusCircle size={14} /> Start your first investigation
          </button>
        </div>
      )}

      {status === 'succeeded' && list.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Classification</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Severity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Stage</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Last Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/investigations/${inv.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{inv.title || 'Untitled'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{inv.investigation_id || '—'}</td>
                  <td className="px-4 py-3">
                    {inv.incident_classification ? (
                      <span className={`badge ${
                        inv.incident_classification === 'Critical' ? 'bg-red-100 text-red-700'
                        : inv.incident_classification === 'Major'  ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>{inv.incident_classification}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.severity ? (
                      <span className={`badge ${
                        inv.severity === 'Critical' ? 'bg-red-100 text-red-700'
                        : inv.severity === 'High'  ? 'bg-orange-100 text-orange-700'
                        : inv.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                      }`}>{inv.severity}</span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-blue-100 text-blue-700 text-xs">
                      {inv.lifecycle_stage || 'Incident Received'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs flex items-center gap-1">
                    <Clock size={11} />{formatDate(inv.updated_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/investigations/${inv.id}`)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Open">
                        <ExternalLink size={14} />
                      </button>
                      <button onClick={() => handleDelete(inv.id, inv.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
