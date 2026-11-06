import { useDispatch, useSelector } from 'react-redux'
import { setFormField } from '../store/rcaSlice'
import { ClipboardList, AlertTriangle } from 'lucide-react'

// "Not provided" sentinel — never stored in DB, forces reviewer to pick a value
const NOT_PROVIDED = '__not_provided__'

const CLASSIFICATION_OPTS = ['', 'Minor', 'Major', 'Critical']
// Severity: leading option forces explicit reviewer selection when AI could not find it
const SEVERITY_OPTS = [
  { value: '',             label: '— select —' },
  { value: NOT_PROVIDED,   label: '⚠ Not provided — select to verify' },
  { value: 'Low',          label: 'Low' },
  { value: 'Medium',       label: 'Medium' },
  { value: 'High',         label: 'High' },
  { value: 'Critical',     label: 'Critical' },
]

// Classification / severity consistency rules
// Returns a warning string if the combination is suspicious, or null if OK.
function getConsistencyWarning(classification, severity) {
  if (!classification || !severity || severity === NOT_PROVIDED) return null
  // Major or Critical classification should not have Low severity
  if (
    (classification === 'Major' || classification === 'Critical') &&
    severity === 'Low'
  ) {
    return `Classification is "${classification}" but severity is "${severity}". Please review — this combination is inconsistent for a GMP investigation.`
  }
  // Critical classification should not have Medium severity either
  if (classification === 'Critical' && severity === 'Medium') {
    return `Classification is "Critical" but severity is "Medium". Please confirm this is correct before saving.`
  }
  return null
}

function Field({ label, name, type = 'text', options, rows, required, missing, aiPopulated }) {
  const dispatch = useDispatch()
  const value = useSelector((s) => s.rca.formData[name] ?? '')
  const isMissing = missing?.includes(name)
  const isAiPop   = aiPopulated?.includes(name)

  // Severity field: if value is empty and field is missing → use NOT_PROVIDED sentinel so
  // the select shows "Not provided" and keeps the yellow warning border
  const displayValue = (name === 'severity' && isMissing && value === '') ? NOT_PROVIDED : value

  const borderCls = isMissing
    ? 'border-yellow-400 bg-yellow-50'
    : isAiPop
    ? 'border-blue-400 bg-blue-50'
    : 'border-gray-300 bg-white'

  const onChange = (e) => {
    const v = e.target.value
    // Don't store the sentinel — store empty string so backend gets null
    dispatch(setFormField({ field: name, value: v === NOT_PROVIDED ? '' : v }))
  }

  return (
    <div>
      <label className="form-label flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {isMissing && (
          <span className="badge bg-yellow-100 text-yellow-700 normal-case font-normal tracking-normal text-xs">
            not found
          </span>
        )}
        {isAiPop && !isMissing && (
          <span className="badge bg-blue-100 text-blue-700 normal-case font-normal tracking-normal text-xs">
            AI
          </span>
        )}
      </label>

      {/* Severity uses a special options array with NOT_PROVIDED option */}
      {name === 'severity' ? (
        <select className={`form-input ${borderCls}`} value={displayValue} onChange={onChange}>
          {SEVERITY_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : options ? (
        <select className={`form-input ${borderCls}`} value={value} onChange={onChange}>
          {options.map((o) => <option key={o} value={o}>{o || '— select —'}</option>)}
        </select>
      ) : rows ? (
        <textarea
          rows={rows}
          className={`form-textarea ${borderCls}`}
          value={value}
          onChange={onChange}
          placeholder={isMissing ? 'Not found in document — enter manually' : ''}
        />
      ) : (
        <input
          type={type}
          className={`form-input ${borderCls}`}
          value={value}
          onChange={onChange}
          placeholder={isMissing ? 'Not found in document' : ''}
        />
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 pb-1 border-b border-gray-100">
        {title}
      </p>
      {children}
    </section>
  )
}

export default function RCAForm() {
  const missingFields = useSelector((s) => s.rca.missingFields)
  const aiPopFields   = useSelector((s) => s.rca.aiPopulatedFields || [])
  const extractStatus = useSelector((s) => s.rca.extractStatus)
  const classification = useSelector((s) => s.rca.formData.incident_classification ?? '')
  const severity       = useSelector((s) => s.rca.formData.severity ?? '')

  const fp = { missing: missingFields, aiPopulated: aiPopFields }

  const consistencyWarning = getConsistencyWarning(classification, severity)

  return (
    <div className="card p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <ClipboardList size={15} className="text-blue-600" />
        <h2 className="font-semibold text-sm text-gray-800">RCA Investigation Form</h2>
        {extractStatus === 'succeeded' && (
          <span className="badge bg-blue-100 text-blue-700 ml-auto">
            AI-populated — review and verify before saving
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-200 border border-blue-400 inline-block" /> AI-extracted
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-400 inline-block" /> Not found in document
        </span>
      </div>

      {/* Classification / Severity consistency warning */}
      {consistencyWarning && (
        <div className="flex gap-2 items-start p-3 bg-orange-50 border border-orange-300 rounded-lg">
          <AlertTriangle size={14} className="text-orange-600 mt-0.5 shrink-0" />
          <div className="text-xs text-orange-800">
            <strong>Review required:</strong> {consistencyWarning}
          </div>
        </div>
      )}

      {/* ── Section 1: Identification ── */}
      <Section title="Identification">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Investigation ID"        name="investigation_id"        required {...fp} />
          <Field label="Title"                   name="title"                   required {...fp} />
          <Field label="Incident Classification" name="incident_classification" options={CLASSIFICATION_OPTS} {...fp} />
          <Field label="Severity"                name="severity"                {...fp} />
          <Field label="Product Name"            name="product_name"            {...fp} />
          <Field label="Batch Number"            name="batch_number"            {...fp} />
          <Field label="Manufacturing Stage"     name="manufacturing_stage"     {...fp} />
          <Field label="Equipment ID"            name="equipment_id"            {...fp} />
          <Field label="Equipment Status"        name="equipment_status"        {...fp} />
          <Field label="Area / Location"         name="area_location"           {...fp} />
          <Field label="Department"              name="department"              {...fp} />
        </div>
      </Section>

      {/* ── Section 2: Detection ── */}
      <Section title="Dates & Detection">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Incident Date"    name="incident_date"    {...fp} />
          <Field label="Date Detected"    name="date_detected"    {...fp} />
          <Field label="Detected By"      name="detected_by"      {...fp} />
          <Field label="Detection Method" name="detection_method" {...fp} />
        </div>
      </Section>

      {/* ── Section 3: Incident Narrative ── */}
      <Section title="Incident Narrative">
        <div className="space-y-4">
          <Field label="Incident Description"    name="incident_description"   rows={4} required {...fp} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expected Specification" name="expected_specification" rows={2} {...fp} />
            <Field label="Actual Observation"     name="actual_observation"     rows={2} {...fp} />
          </div>
          <Field label="Containment Action Taken" name="containment_action"    rows={3} {...fp} />
        </div>
      </Section>

      {/* ── Section 4: Impact ── */}
      <Section title="Impact Assessment">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product Impact"        name="product_impact"        rows={3} {...fp} />
          <Field label="Patient Safety Impact" name="patient_safety_impact" rows={3} {...fp} />
        </div>
      </Section>

      {/* ── Section 5: Additional Context ── */}
      <Section title="Additional Context">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Raw Material Information" name="raw_material_info"   rows={2} {...fp} />
            <Field label="Process Parameters"       name="process_parameters"  rows={2} {...fp} />
            <Field label="Operator / Shift Info"    name="operator_shift_info" rows={2} {...fp} />
          </div>
          <Field label="Available Evidence (summary)" name="available_evidence" rows={2} {...fp} />
          <Field label="Previous Similar Incidents"   name="previous_incidents" rows={2} {...fp} />
        </div>
      </Section>
    </div>
  )
}
