import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

const VARIANTS = {
  success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', Icon: CheckCircle },
  warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', Icon: AlertTriangle },
  error:   { bg: 'bg-red-50 border-red-200',       text: 'text-red-800',   Icon: XCircle },
  info:    { bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-800',  Icon: Info },
}

export default function AlertBanner({ variant = 'info', children }) {
  const { bg, text, Icon } = VARIANTS[variant] || VARIANTS.info
  return (
    <div className={`flex gap-3 items-start p-3 rounded-lg border ${bg} ${text} text-sm`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  )
}
