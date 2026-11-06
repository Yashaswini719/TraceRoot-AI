import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../api/client'

// ── Thunk: send a chat message ────────────────────────────────────────────────
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/api/chat', payload)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// ── Thunk: load history from DB (after page refresh / investigation reload) ───
export const loadHistory = createAsyncThunk(
  'chat/loadHistory',
  async (threadId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/api/chat/${threadId}/history`)
      return data
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// ── Thunk: clear conversation ─────────────────────────────────────────────────
export const clearHistory = createAsyncThunk(
  'chat/clearHistory',
  async (threadId, { rejectWithValue }) => {
    try {
      await api.delete(`/api/chat/${threadId}/history`)
      return threadId
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || err.message)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────────────────────
const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    threadId: null,          // UUID — unique per investigation
    messages: [],            // [{role, content, rca_updates, ts}]
    sending: false,
    error: null,
  },
  reducers: {
    // Generate a new thread (called when a new investigation starts)
    newThread(state) {
      state.threadId = crypto.randomUUID()
      state.messages = []
      state.error = null
    },
    // Set thread to a specific ID (when loading a saved investigation)
    setThreadId(state, action) {
      state.threadId = action.payload
    },
    clearMessages(state) {
      state.messages = []
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // sendMessage
    builder
      .addCase(sendMessage.pending, (state, action) => {
        state.sending = true
        state.error = null
        // Optimistically add the user message immediately
        state.messages.push({
          role: 'user',
          content: action.meta.arg.message,
          ts: new Date().toISOString(),
        })
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false
        state.threadId = action.payload.thread_id
        state.messages.push({
          role: 'assistant',
          content: action.payload.reply,
          rca_updates: action.payload.rca_updates || null,
          ts: new Date().toISOString(),
        })
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false
        state.error = action.payload
        state.messages.push({
          role: 'error',
          content: action.payload || 'Something went wrong.',
          ts: new Date().toISOString(),
        })
      })

    // loadHistory
    builder
      .addCase(loadHistory.fulfilled, (state, action) => {
        state.messages = action.payload.map((row) => ({
          role: row.role,
          content: row.content,
          rca_updates: row.rca_updates || null,
          ts: row.created_at,
        }))
      })

    // clearHistory
    builder
      .addCase(clearHistory.fulfilled, (state) => {
        state.messages = []
        state.error = null
        // Generate new thread ID so next message starts fresh
        state.threadId = crypto.randomUUID()
      })
  },
})

export const { newThread, setThreadId, clearMessages } = chatSlice.actions
export default chatSlice.reducer
