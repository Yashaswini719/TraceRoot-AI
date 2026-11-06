import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/client'

// Thunk: send file or pasted text to /api/intake
export const submitIntake = createAsyncThunk(
  'intake/submit',
  async ({ text, file }, { rejectWithValue }) => {
    try {
      const form = new FormData()
      if (file) form.append('file', file)
      if (text) form.append('text', text)
      const { data } = await api.post('/api/intake', form)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

const intakeSlice = createSlice({
  name: 'intake',
  initialState: {
    sourceText: '',
    sourceName: '',
    sourceType: '',
    charCount: 0,
    warning: null,
    status: 'idle', // idle | loading | succeeded | failed
    error: null,
  },
  reducers: {
    clearIntake(state) {
      state.sourceText = ''
      state.sourceName = ''
      state.sourceType = ''
      state.charCount = 0
      state.warning = null
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitIntake.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(submitIntake.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.sourceText = action.payload.source_text
        state.sourceName = action.payload.source_name
        state.sourceType = action.payload.source_type
        state.charCount = action.payload.char_count
        state.warning = action.payload.warning
      })
      .addCase(submitIntake.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
  },
})

export const { clearIntake } = intakeSlice.actions
export default intakeSlice.reducer
