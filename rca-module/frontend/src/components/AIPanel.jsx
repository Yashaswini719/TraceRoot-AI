import { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Upload, Clipboard, Sparkles, Wand2,
  Send, Trash2, Bot, User, AlertCircle,
  ChevronDown, ChevronUp, FileText, Loader2,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { submitIntake } from '../store/intakeSlice'
import { extractForm, runInvestigation, applyRcaUpdates } from '../store/rcaSlice'
import { sendMessage, clearHistory, newThread, loadHistory } from '../store/chatSlice'
import Spinner from './Spinner'
import AlertBanner from './AlertBanner'

// ── helpers ───────────────────────────────────────────────────────────────────
const SOURCE_ICON = { pdf: '📄', email: '📧', text: '📝', pasted_text: '📋' }

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

// Render a human-readable summary of rca_updates without exposing raw JSON
function RcaUpdateSummary({ updates }) {
  if (!updates) return null
  const lines = []
  if (updates.form_data) {
    const filled = Object.entries(updates.form_data).filter(([, v]) => v).length
    if (filled) lines.push(`📋 ${filled} form field${filled !== 1 ? 's' : ''} updated`)
  }
  if (updates.five_whys?.length)
    lines.push(`🔗 5 Whys — ${updates.five_whys.length} step${updates.five_whys.length !== 1 ? 's' : ''} generated`)
  if (updates.root_causes?.length)
    lines.push(`🎯 ${updates.root_causes.length} root cause${updates.root_causes.length !== 1 ? 's' : ''} identified`)
  if (updates.capa?.length)
    lines.push(`🛡 ${updates.capa.length} CAPA action${updates.capa.length !== 1 ? 's' : ''} recommended`)
  if (updates.missing_evidence?.length)
    lines.push(`⚠ ${updates.missing_evidence.length} missing evidence item${updates.missing_evidence.length !== 1 ? 's' : ''} flagged`)
  if (!lines.length) return null
  return (
    <div className="mt-1 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-0.5">
      <p className="font-semibold">✨ Form tabs updated:</p>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </div>
  )
}

// Tailwind prose classes for ReactMarkdown elements
const MD_COMPONENTS = {
  h1: ({ children }) => <h1 className="text-sm font-bold text-gray-900 mt-2 mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-gray-800 mt-2 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xs font-bold text-gray-700 mt-1.5 mb-0.5">{children}</h3>,
  p:  ({ children }) => <p className="text-sm leading-relaxed text-gray-800 mb-1">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 mb-1 text-sm text-gray-800">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 mb-1 text-sm text-gray-800">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-gray-800 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em:     ({ children }) => <em className="italic text-gray-700">{children}</em>,
  code:   ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-700">{children}</code>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-blue-300 pl-2 text-gray-600 italic text-sm mb-1">{children}</blockquote>
  ),
  hr: () => <hr className="border-gray-200 my-2" />,
  a:  ({ href, children }) => (
    <a href={href} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
}

function MessageBubble({ msg }) {
  const isUser      = msg.role === 'user'
  const isError     = msg.role === 'error'

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 items-end">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
          {msg.content}
        </div>
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <User size={12} className="text-blue-600" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex gap-2 items-start">
        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle size={12} className="text-red-600" />
        </div>
        <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm px-3 py-2 text-sm">
          {msg.content}
        </div>
      </div>
    )
  }

  // Assistant — render Markdown, show rca_updates summary (not raw JSON)
  return (
    <div className="flex gap-2 items-start">
      <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={12} className="text-white" />
      </div>
      <div className="max-w-[85%] space-y-1">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {msg.content}
          </ReactMarkdown>
        </div>
        <RcaUpdateSummary updates={msg.rca_updates} />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIPanel() {
  const dispatch = useDispatch()
  const intake = useSelector((s) => s.intake)
  const rca    = useSelector((s) => s.rca)
  const chat   = useSelector((s) => s.chat)

  // Panel sections collapse state
  const [uploadOpen,  setUploadOpen]  = useState(true)
  const [stepsOpen,   setStepsOpen]   = useState(true)
  const [chatOpen,    setChatOpen]    = useState(true)

  // Upload / paste state
  const [mode,       setMode]       = useState('upload')
  const [pastedText, setPastedText] = useState('')
  const [dragOver,   setDragOver]   = useState(false)
  const fileRef = useRef()

  // Chat state
  const [input, setInput] = useState('')
  const messagesEndRef    = useRef(null)
  const inputRef          = useRef(null)

  // ── Initialise thread on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!chat.threadId) dispatch(newThread())
  }, []) // eslint-disable-line

  // ── Scroll to bottom when new messages arrive ───────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages, chat.sending])

  // ── Apply RCA updates from AI to Redux form ─────────────────────────────────
  useEffect(() => {
    const lastMsg = chat.messages[chat.messages.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg?.rca_updates) {
      dispatch(applyRcaUpdates(lastMsg.rca_updates))
    }
  }, [chat.messages]) // eslint-disable-line

  // ── Upload helpers ──────────────────────────────────────────────────────────
  const handleFile = (file) => {
    if (!file) return
    dispatch(submitIntake({ file }))
  }

  const handlePaste = () => {
    if (!pastedText.trim()) return
    dispatch(submitIntake({ text: pastedText }))
    setPastedText('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  // ── AI step buttons ─────────────────────────────────────────────────────────
  const handleExtract = () => dispatch(extractForm(intake.sourceText))
  const handleInvestigate = () =>
    dispatch(runInvestigation({ sourceText: intake.sourceText, formData: rca.formData }))

  // ── Chat send ───────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim()
    if (!text || chat.sending) return
    setInput('')

    dispatch(sendMessage({
      thread_id:        chat.threadId,
      message:          text,
      investigation_id: rca.currentId || null,
      source_text:      intake.sourceText || null,
      form_data:        rca.formData,
      five_whys:        rca.fiveWhys,
      fishbone:         rca.fishbone,
      root_causes:      rca.rootCauses,
      missing_evidence: rca.missingEvidence,
      capa:             rca.capa,
    }))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClear = () => {
    if (chat.threadId) dispatch(clearHistory(chat.threadId))
  }

  // Quick-prompt buttons
  const QUICK = [
    'Analyze this incident and identify potential root causes.',
    'Why could the first root cause happen?',
    'What evidence is missing?',
    'Generate preventive CAPA recommendations.',
    'What batch number were we investigating?',
  ]

  const canExtract    = intake.status === 'succeeded' && intake.sourceText
  const canInvestigate = rca.extractStatus === 'succeeded'

  return (
    <div className="card flex flex-col" style={{ maxHeight: 'calc(100vh - 80px)' }}>

      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <Sparkles size={15} className="text-blue-600" />
        <span className="font-semibold text-sm text-gray-800">AI Copilot</span>
        {intake.status === 'succeeded' && (
          <span className="badge bg-blue-100 text-blue-700 text-xs ml-1 truncate max-w-[100px]">
            {SOURCE_ICON[intake.sourceType] || '📄'} {intake.sourceName}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── SECTION: Upload ───────────────────────────────────────────── */}
        <div className="border-b border-gray-100">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
            onClick={() => setUploadOpen(!uploadOpen)}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              1 — Provide Document
            </span>
            {uploadOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
          </button>

          {uploadOpen && (
            <div className="px-4 pb-4 space-y-2">
              {/* Mode toggle */}
              <div className="flex gap-1.5">
                {['upload', 'paste'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      mode === m
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {m === 'upload' ? <Upload size={11} /> : <Clipboard size={11} />}
                    {m === 'upload' ? 'Upload File' : 'Paste Text'}
                  </button>
                ))}
              </div>

              {mode === 'upload' ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-1.5 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <Upload size={18} className="text-gray-400" />
                  <p className="text-xs text-gray-600 font-medium text-center">
                    Drop file or click to browse
                  </p>
                  <p className="text-xs text-gray-400">PDF · .eml · .txt</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.eml,.txt,.md,.text"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <textarea
                    rows={4}
                    className="form-textarea text-xs"
                    placeholder="Paste deviation report, email, or incident text…"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                  />
                  <button
                    onClick={handlePaste}
                    disabled={!pastedText.trim() || intake.status === 'loading'}
                    className="btn-primary w-full justify-center text-xs py-1.5"
                  >
                    <Clipboard size={12} /> Submit Text
                  </button>
                </div>
              )}

              {intake.status === 'loading' && <Spinner label="Reading…" size="sm" />}
              {intake.status === 'failed'  && <AlertBanner variant="error">{intake.error}</AlertBanner>}
              {intake.status === 'succeeded' && (
                <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex gap-2">
                  <FileText size={12} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>{intake.sourceName}</strong> — {intake.charCount.toLocaleString()} chars
                    {intake.warning && <p className="text-yellow-700 mt-0.5">⚠️ {intake.warning}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── SECTION: AI Steps ─────────────────────────────────────────── */}
        <div className="border-b border-gray-100">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50"
            onClick={() => setStepsOpen(!stepsOpen)}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              2 — AI Analysis Steps
            </span>
            {stepsOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
          </button>

          {stepsOpen && (
            <div className="px-4 pb-4 space-y-3">
              {/* Extract */}
              <div className={!canExtract ? 'opacity-40 pointer-events-none' : ''}>
                <button
                  onClick={handleExtract}
                  disabled={!canExtract || rca.extractStatus === 'loading'}
                  className="btn-primary w-full justify-center text-xs py-1.5"
                >
                  <Wand2 size={12} />
                  {rca.extractStatus === 'loading' ? 'Extracting…' : 'Extract Form Fields'}
                </button>
                {rca.extractStatus === 'loading'   && <Spinner label="Reading document…" size="sm" />}
                {rca.extractStatus === 'failed'    && <AlertBanner variant="error">{rca.extractError}</AlertBanner>}
                {rca.extractStatus === 'succeeded' && (
                  <p className="text-xs text-green-700 mt-1">
                    ✅ Form populated{rca.missingFields.length > 0 ? ` · ${rca.missingFields.length} fields missing` : ''}
                  </p>
                )}
              </div>

              {/* Investigate */}
              <div className={!canInvestigate ? 'opacity-40 pointer-events-none' : ''}>
                <button
                  onClick={handleInvestigate}
                  disabled={!canInvestigate || rca.investigateStatus === 'loading'}
                  className="btn-primary w-full justify-center text-xs py-1.5 bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles size={12} />
                  {rca.investigateStatus === 'loading' ? 'Investigating…' : 'Run AI Investigation'}
                </button>
                {rca.investigateStatus === 'loading'   && <Spinner label="AI investigating (30–60s)…" size="sm" />}
                {rca.investigateStatus === 'failed'    && <AlertBanner variant="error">{rca.investigateError}</AlertBanner>}
                {rca.investigateStatus === 'succeeded' && (
                  <p className="text-xs text-green-700 mt-1">✅ Investigation complete — see tabs</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION: Chat ─────────────────────────────────────────────── */}
        <div className="flex flex-col">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Bot size={12} /> 3 — AI Copilot Chat
              {chat.messages.length > 0 && (
                <span className="badge bg-blue-100 text-blue-700">{chat.messages.length}</span>
              )}
            </span>
            {chatOpen ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
          </button>

          {chatOpen && (
            <>
              {/* Message list */}
              <div className="px-3 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: '340px', minHeight: '120px' }}>
                {chat.messages.length === 0 && (
                  <div className="text-center text-xs text-gray-400 py-4">
                    <Bot size={20} className="mx-auto mb-1 text-gray-300" />
                    Ask me anything about the investigation.<br />
                    I remember the full conversation.
                  </div>
                )}

                {chat.messages.map((msg, i) => (
                  <MessageBubble key={i} msg={msg} />
                ))}

                {/* AI typing indicator */}
                {chat.sending && (
                  <div className="flex gap-2 items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts */}
              {chat.messages.length === 0 && (
                <div className="px-3 pb-2 space-y-1">
                  <p className="text-xs text-gray-400 mb-1">Quick prompts:</p>
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Input area */}
              <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    className="flex-1 form-textarea text-xs resize-none py-2"
                    placeholder="Ask about the investigation… (Enter to send, Shift+Enter for newline)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={chat.sending}
                  />
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || chat.sending}
                      className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      title="Send (Enter)"
                    >
                      {chat.sending
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Send size={14} />}
                    </button>
                    {chat.messages.length > 0 && (
                      <button
                        onClick={handleClear}
                        disabled={chat.sending}
                        className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-lg hover:bg-red-100 hover:text-red-600 disabled:opacity-40 transition-colors"
                        title="Clear conversation"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
