export default function Spinner({ label = 'Loading…', size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-4'
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`${s} rounded-full border-blue-500 border-t-transparent animate-spin`} />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}
