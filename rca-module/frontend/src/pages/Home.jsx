import { useNavigate } from 'react-router-dom'
import { PlusCircle, FolderOpen, Wand2, GitBranch, ShieldCheck, FlaskConical } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-4 bg-blue-100 rounded-2xl">
            <FlaskConical size={40} className="text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          AI-Powered Root Cause Analysis Investigation
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          AI-assisted GMP incident investigation for API manufacturing.
          Upload a document, let AI extract key information, then run a full
          investigation with 5 Whys, fishbone analysis, evidence review, and
          CAPA recommendations — with full lifecycle tracking and QA approval.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button onClick={() => navigate('/new')} className="btn-primary text-base px-6 py-2.5">
            <PlusCircle size={18} /> Start New Investigation
          </button>
          <button onClick={() => navigate('/investigations')} className="btn-secondary text-base px-6 py-2.5">
            <FolderOpen size={18} /> View Saved Investigations
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            Icon: Wand2,
            color: 'text-blue-600 bg-blue-100',
            title: 'AI Form Extraction',
            desc: 'Upload a PDF, email, or paste text. AI reads the document and fills in the deviation form automatically.',
          },
          {
            Icon: GitBranch,
            color: 'text-purple-600 bg-purple-100',
            title: '5 Whys & Fishbone',
            desc: 'AI generates a 5 Whys chain and Ishikawa fishbone diagram, marking each step as documented or inferred.',
          },
          {
            Icon: ShieldCheck,
            color: 'text-emerald-600 bg-emerald-100',
            title: 'CAPA Recommendations',
            desc: 'Receive corrective and preventive action recommendations linked to identified root causes.',
          },
        ].map(({ Icon, color, title, desc }) => (
          <div key={title} className="card p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </div>

      {/* Workflow steps */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">How It Works</h2>
        <ol className="space-y-3">
          {[
            'Upload a deviation document (PDF / .eml / .txt) or paste text into the AI panel.',
            'Click "Extract Form Fields" — AI populates the RCA form. Review and edit as needed.',
            'Click "Run AI Investigation" — AI generates 5 Whys, fishbone, root causes, missing evidence, and CAPA.',
            'Review every AI-generated suggestion. Confirm root causes only when supported by evidence.',
            'Save the investigation to the database for review, audit, and tracking.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-gray-600 pt-0.5">{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
