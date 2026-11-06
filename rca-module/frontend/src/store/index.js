import { configureStore } from '@reduxjs/toolkit'
import intakeReducer from './intakeSlice'
import rcaReducer from './rcaSlice'
import investigationsReducer from './investigationsSlice'
import chatReducer from './chatSlice'
import evidenceReducer from './evidenceSlice'

export const store = configureStore({
  reducer: {
    intake: intakeReducer,
    rca: rcaReducer,
    investigations: investigationsReducer,
    chat: chatReducer,
    evidence: evidenceReducer,
  },
})
