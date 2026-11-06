import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/client'

export const fetchInvestigations = createAsyncThunk(
  'investigations/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/api/investigations')
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const fetchInvestigation = createAsyncThunk(
  'investigations/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/investigations/${id}`)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

export const deleteInvestigation = createAsyncThunk(
  'investigations/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/investigations/${id}`)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

const investigationsSlice = createSlice({
  name: 'investigations',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvestigations.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchInvestigations.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.list = action.payload
      })
      .addCase(fetchInvestigations.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(deleteInvestigation.fulfilled, (state, action) => {
        state.list = state.list.filter((i) => i.id !== action.payload)
      })
  },
})

export default investigationsSlice.reducer
