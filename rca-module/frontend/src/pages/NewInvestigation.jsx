import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Save, RotateCcw, CheckSquare } from 'lucide-react'
import AIPanel        from '../components/AIPanel'
import RCAForm        from '../components/RCAForm'
import FiveWhysPanel  from '../components/FiveWhysPanel'
import FishbonePanel  from '../components/FishbonePanel'
import RootCausesPanel from '../components/RootCausesPanel'
import CAPAPanel      from '../components/CAPAPanel'
import EvidencePanel  from '../components/EvidencePanel'
import LifecycleBar   from '../components/LifecycleBar'
import QAApprovalPanel from '../components/QAApprovalPanel'
import AlertBanner    from '../components/AlertBanner'
import Spinner        from '../components/Spinner'
import {
  saveInvestigation,
  updateInvestigation,
  resetInvestigation,
} from '../store/rcaSlice'
import { newThread } from '../store/chatSlice'
import { clearEvidence } from '../store/evidenceSlice'

const TABS = [
  { id: 'form',      label: 'Incident Form' },
  { id: 'evidence',  label: 'Evidence' },
  { id: 'fivewhys',  label: '5 Whys' },
  { id: 'fishbone',  label: 'Fishbone' },
  { id: 'causes',    label: 'Root Causes' },
  { id: 'capa',      label: 'CAPA' },
  { id: 'qa',        label: 'QA Approval' },
]

export default function NewInvestigation() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const [activeTab, setActiveTab] = useState('form')

  const rca    = useSelector((s) => s.rca)
  const intake = useSelector((s) => s.intake)
  const evidence = useSelector((s) => s.evidence)

  const isSaving = rca.saveStatus === 'loading'
  const savedOk  = rca.saveStatus === 'succeeded'

  const buildPayload = (status = 'Saved') => ({
    title: rca.formData.title || rca.formData.investigation_id || 'Untitled Investigation',
    status,
    lifecycle_stage: rca.lifecycleStage || 'Incident Received',
    source_text: intake.sourceText || null,
    form_data: rca.formData,
    five_whys: rca.fiveWhys,
    fishbone: rca.fishbone,
    root_causes: rca.rootCauses,
    missing_evidence: rca.missingEvidence,
    capa: rca.capa,
    reviewer_name: rca.reviewerName || null,
    reviewer_comments: rca.reviewerComments || null,
  })

  const handleSave = async () => {
    if (rca.currentId) {
      await dispatch(updateInvestigation({ id: rca.currentId, payload: buildPayload() }))
    } else {
      const result = await dispatch(saveInvestigation(buildPayload()))
      // After first save, if on Evidence tab reload evidence
      if (result.payload?.id) {
        // evidence panel watches currentId automatically
      }
    }
  }

  const handleSaveDraft = async () => {
    if (rca.currentId) {
      await dispatch(updateInvestigation({ id: rca.currentId, payload: buildPayload('Draft') }))
    } else {
      await dispatch(saveInvestigation(buildPayload('Draft')))
    }
  }

  const handleReset = () => {
    if (window.confirm('Start a new investigation? Unsaved changes will be lost.')) {
      dispatch(resetInvestigation())
      dispatch(newThread())
      dispatch(clearEvidence())
      setActiveTab('form')
    }
  }

  // Tab badge counts
  const tabBadge = {
    evidence:  evidence.items.length,
    fivewhys:  rca.fiveWhys.length,
    fishbone:  Object.values(rca.fishbone).flat().length,
    causes:    rca.rootCauses.length,
    capa:      rca.capa.length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {rca.currentId ? 'Edit Investigation' : 'New RCA Investigation'}
          </h1>
          {rca.formData.investigation_id && (
            <p className="text-sm text-gray-500 mt-0.5">{rca.formData.investigation_id}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReset} className="btn-secondary">
            <RotateCcw size={14} /> New
          </button>
          <button onClick={handleSaveDraft} disabled={isSaving} className="btn-secondary">
            <Save size={14} /> Save Draft
          </button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary">
            <CheckSquare size={14} />
            {isSaving ? 'Saving…' : rca.currentId ? 'Update' : 'Save Investigation'}
          </button>
        </div>
      </div>

      {/* Lifecycle bar */}
      <LifecycleBar />

      {/* Save feedback */}
      {savedOk && (
        <AlertBanner variant="success">
          Investigation saved.{' '}
          <button className="underline font-medium" onClick={() => navigate('/investigations')}>
            View all →
          </button>
        </AlertBanner>
      )}
      {rca.saveStatus === 'failed' && (
        <AlertBanner variant="error">{rca.saveError}</AlertBanner>
      )}

      <div className="flex gap-4 items-start">
        {/* AI Panel — sticky left sidebar */}
        <div className="w-72 shrink-0 sticky top-4">
          <AIPanel />
        </div>

        {/* Tabbed content */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex gap-0.5 border-b border-gray-200 mb-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tabBadge[tab.id] > 0 && (
                  <span className="badge bg-blue-100 text-blue-700 text-xs">{tabBadge[tab.id]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'form'     && <RCAForm />}
            {activeTab === 'evidence' && <div className="card p-5"><EvidencePanel /></div>}
            {activeTab === 'fivewhys' && <div className="card p-5"><FiveWhysPanel /></div>}
            {activeTab === 'fishbone' && <div className="card p-5"><FishbonePanel /></div>}
            {activeTab === 'causes'   && <div className="card p-5"><RootCausesPanel /></div>}
            {activeTab === 'capa'     && <div className="card p-5"><CAPAPanel /></div>}
            {activeTab === 'qa'       && <QAApprovalPanel />}
          </div>
        </div>
      </div>

      {isSaving && <Spinner label="Saving…" />}
    </div>
  )
}
