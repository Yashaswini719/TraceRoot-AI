import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/client'

export const fetchEvidence = createAsyncThunk(
  'evidence/fetchAll',
  async (investigationId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/investigations/${investigationId}/evidence`)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const addEvidence = createAsyncThunk(
  'evidence/add',
  async ({ investigationId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/api/investigations/${investigationId}/evidence`, payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const updateEvidence = createAsyncThunk(
  'evidence/update',
  async ({ investigationId, evidenceDbId, payload }, { rejectWithValue }) => {
    try {
      const { data } = await api.put(
        `/api/investigations/${investigationId}/evidence/${evidenceDbId}`,
        payload
      )
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const deleteEvidence = createAsyncThunk(
  'evidence/delete',
  async ({ investigationId, evidenceDbId }, { rejectWithValue }) => {
    try {
      await api.delete(`/api/investigations/${investigationId}/evidence/${evidenceDbId}`)
      return evidenceDbId
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

const evidenceSlice = createSlice({
  name: 'evidence',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    clearEvidence(state) {
      state.items = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvidence.pending, (s) => { s.status = 'loading' })
      .addCase(fetchEvidence.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload })
      .addCase(fetchEvidence.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload })
      .addCase(addEvidence.fulfilled, (s, a) => { s.items.push(a.payload) })
      .addCase(updateEvidence.fulfilled, (s, a) => {
        const idx = s.items.findIndex((i) => i.id === a.payload.id)
        if (idx !== -1) s.items[idx] = a.payload
      })
      .addCase(deleteEvidence.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload)
      })
  },
})

export const { clearEvidence } = evidenceSlice.actions
export default evidenceSlice.reducer
