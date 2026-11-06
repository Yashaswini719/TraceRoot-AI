import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/client'

// Thunk: extract RCA form fields from source text
export const extractForm = createAsyncThunk(
  'rca/extractForm',
  async (sourceText, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/analyze/extract', { source_text: sourceText })
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// Thunk: run full investigation (5 Whys, fishbone, CAPA)
export const runInvestigation = createAsyncThunk(
  'rca/runInvestigation',
  async ({ sourceText, formData }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/analyze/investigate', {
        source_text: sourceText,
        form_data: formData,
      })
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// Thunk: save investigation to DB
export const saveInvestigation = createAsyncThunk(
  'rca/saveInvestigation',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/investigations', payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// Thunk: update existing investigation
export const updateInvestigation = createAsyncThunk(
  'rca/updateInvestigation',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(`/api/investigations/${id}`, payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// Thunk: advance lifecycle stage
export const advanceLifecycle = createAsyncThunk(
  'rca/advanceLifecycle',
  async ({ id, lifecycle_stage }, { rejectWithValue }) => {
    try {
      const { data } = await api.patch(`/api/investigations/${id}/lifecycle`, { lifecycle_stage })
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// Thunk: QA approval
export const submitQAApproval = createAsyncThunk(
  'rca/submitQAApproval',
  async ({ id, qa_approved, reviewer_name, reviewer_comments }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/api/investigations/${id}/qa-approval`, {
        qa_approved, reviewer_name, reviewer_comments,
      })
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

const EMPTY_FORM = {
  // Identification
  investigation_id: '',
  title: '',
  incident_classification: '',
  severity: '',
  product_name: '',
  batch_number: '',
  manufacturing_stage: '',
  equipment_id: '',
  equipment_status: '',
  area_location: '',
  department: '',
  // Dates & detection
  incident_date: '',
  date_detected: '',
  detected_by: '',
  detection_method: '',
  // Incident narrative
  incident_description: '',
  expected_specification: '',
  actual_observation: '',
  containment_action: '',
  // Impact
  product_impact: '',
  patient_safety_impact: '',
  // Additional context
  raw_material_info: '',
  process_parameters: '',
  operator_shift_info: '',
  available_evidence: '',
  previous_incidents: '',
}

const rcaSlice = createSlice({
  name: 'rca',
  initialState: {
    // Loaded investigation id (when editing a saved one)
    currentId: null,
    lifecycleStage: 'Incident Received',
    qaApproved: null,
    reviewerName: '',
    reviewerComments: '',

    // Form
    formData: { ...EMPTY_FORM },
    missingFields: [],

    // Investigation results
    fiveWhys: [],
    fishbone: {},
    rootCauses: [],
    missingEvidence: [],
    capa: [],

    // UI state
    extractStatus: 'idle',   // idle | loading | succeeded | failed
    extractError: null,
    investigateStatus: 'idle',
    investigateError: null,
    saveStatus: 'idle',
    saveError: null,
    aiPopulatedFields: [],   // fields last populated by AI chat
  },
  reducers: {
    setFormField(state, action) {
      const { field, value } = action.payload
      state.formData[field] = value
    },
    setFormData(state, action) {
      state.formData = { ...state.formData, ...action.payload }
    },
    setFiveWhys(state, action) {
      state.fiveWhys = action.payload
    },
    setFishbone(state, action) {
      state.fishbone = action.payload
    },
    setRootCauses(state, action) {
      state.rootCauses = action.payload
    },
    confirmRootCause(state, action) {
      const idx = action.payload
      if (state.rootCauses[idx]) {
        state.rootCauses[idx] = {
          ...state.rootCauses[idx],
          confirmed: true,
          status: 'Confirmed by reviewer',
        }
      }
    },
    setCapa(state, action) {
      state.capa = action.payload
    },
    // Apply structured RCA updates coming from the AI chat response
    applyRcaUpdates(state, action) {
      const updates = action.payload || {}
      if (updates.form_data) {
        // Only overwrite fields that are currently empty (preserve manual edits)
        for (const [key, val] of Object.entries(updates.form_data)) {
          if (!state.formData[key] && val) {
            state.formData[key] = val
          }
        }
        // Mark any newly populated fields (for UI highlighting)
        state.aiPopulatedFields = Object.keys(updates.form_data).filter(
          (k) => updates.form_data[k]
        )
      }
      if (updates.five_whys?.length)       state.fiveWhys        = updates.five_whys
      if (updates.fishbone &&
          Object.keys(updates.fishbone).length) state.fishbone    = updates.fishbone
      if (updates.root_causes?.length)     state.rootCauses       = updates.root_causes
      if (updates.missing_evidence?.length) state.missingEvidence = updates.missing_evidence
      if (updates.capa?.length)            state.capa             = updates.capa
      // Mark investigation results as available
      if (updates.five_whys?.length || updates.root_causes?.length) {
        state.investigateStatus = 'succeeded'
      }
      if (updates.form_data) {
        state.extractStatus = 'succeeded'
      }
    },
    resetInvestigation(state) {
      state.currentId = null
      state.lifecycleStage = 'Incident Received'
      state.qaApproved = null
      state.reviewerName = ''
      state.reviewerComments = ''
      state.formData = { ...EMPTY_FORM }
      state.missingFields = []
      state.fiveWhys = []
      state.fishbone = {}
      state.rootCauses = []
      state.missingEvidence = []
      state.capa = []
      state.extractStatus = 'idle'
      state.extractError = null
      state.investigateStatus = 'idle'
      state.investigateError = null
      state.saveStatus = 'idle'
      state.saveError = null
      state.aiPopulatedFields = []
    },
    loadSavedInvestigation(state, action) {
      const inv = action.payload
      state.currentId = inv.id
      state.lifecycleStage = inv.lifecycle_stage || 'Incident Received'
      state.qaApproved = inv.qa_approved || null
      state.reviewerName = inv.reviewer_name || ''
      state.reviewerComments = inv.reviewer_comments || ''
      state.formData = inv.form_data || { ...EMPTY_FORM }
      state.fiveWhys = inv.five_whys || []
      state.fishbone = inv.fishbone || {}
      state.rootCauses = inv.root_causes || []
      state.missingEvidence = inv.missing_evidence || []
      state.capa = inv.capa || []
      state.extractStatus = inv.form_data ? 'succeeded' : 'idle'
      state.investigateStatus = inv.five_whys?.length ? 'succeeded' : 'idle'
    },
    setLifecycleStage(state, action) {
      state.lifecycleStage = action.payload
    },
    setReviewerInfo(state, action) {
      const { reviewerName, reviewerComments } = action.payload
      if (reviewerName !== undefined) state.reviewerName = reviewerName
      if (reviewerComments !== undefined) state.reviewerComments = reviewerComments
    },
  },
  extraReducers: (builder) => {
    // Extract form
    builder
      .addCase(extractForm.pending, (state) => {
        state.extractStatus = 'loading'
        state.extractError = null
      })
      .addCase(extractForm.fulfilled, (state, action) => {
        state.extractStatus = 'succeeded'
        const raw = action.payload.form_data || {}
        // Merge: replace null/undefined with empty string for controlled inputs
        const merged = { ...EMPTY_FORM }
        for (const key of Object.keys(EMPTY_FORM)) {
          merged[key] = raw[key] ?? ''
        }
        state.formData = merged
        state.missingFields = action.payload.missing_fields || []
      })
      .addCase(extractForm.rejected, (state, action) => {
        state.extractStatus = 'failed'
        state.extractError = action.payload
      })

    // Run investigation
    builder
      .addCase(runInvestigation.pending, (state) => {
        state.investigateStatus = 'loading'
        state.investigateError = null
      })
      .addCase(runInvestigation.fulfilled, (state, action) => {
        state.investigateStatus = 'succeeded'
        state.fiveWhys = action.payload.five_whys || []
        state.fishbone = action.payload.fishbone || {}
        state.rootCauses = action.payload.root_causes || []
        state.missingEvidence = action.payload.missing_evidence || []
        state.capa = action.payload.capa || []
      })
      .addCase(runInvestigation.rejected, (state, action) => {
        state.investigateStatus = 'failed'
        state.investigateError = action.payload
      })

    // Save
    builder
      .addCase(saveInvestigation.pending, (state) => {
        state.saveStatus = 'loading'
        state.saveError = null
      })
      .addCase(saveInvestigation.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded'
        state.currentId = action.payload.id
      })
      .addCase(saveInvestigation.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload
      })

    // Update
    builder
      .addCase(updateInvestigation.pending, (state) => {
        state.saveStatus = 'loading'
        state.saveError = null
      })
      .addCase(updateInvestigation.fulfilled, (state, action) => {
        state.saveStatus = 'succeeded'
        state.currentId = action.payload.id
      })
      .addCase(updateInvestigation.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload
      })

    // Lifecycle advance
    builder
      .addCase(advanceLifecycle.fulfilled, (state, action) => {
        state.lifecycleStage = action.payload.lifecycle_stage
      })

    // QA approval
    builder
      .addCase(submitQAApproval.fulfilled, (state, action) => {
        state.qaApproved = action.payload.qa_approved
        state.lifecycleStage = action.payload.lifecycle_stage
        state.reviewerName = action.payload.reviewer_name || ''
        state.reviewerComments = action.payload.reviewer_comments || ''
        state.saveStatus = 'succeeded'
      })
  },
})

export const {
  setFormField,
  setFormData,
  setFiveWhys,
  setFishbone,
  setRootCauses,
  confirmRootCause,
  setCapa,
  resetInvestigation,
  loadSavedInvestigation,
  applyRcaUpdates,
  setLifecycleStage,
  setReviewerInfo,
} = rcaSlice.actions

export default rcaSlice.reducer
