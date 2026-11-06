import { Link, useLocation } from 'react-router-dom'
import { FlaskConical, FolderOpen, PlusCircle } from 'lucide-react'

export default function Navbar() {
  const { pathname } = useLocation()

  const link = (to, label, Icon) => (
    <Link
      to={to}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        pathname === to || (to !== '/' && pathname.startsWith(to))
          ? 'bg-blue-700 text-white'
          : 'text-blue-100 hover:bg-blue-700 hover:text-white'
      }`}
    >
      <Icon size={16} />
      {label}
    </Link>
  )

  return (
    <header className="bg-blue-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg tracking-tight">
          <FlaskConical size={22} className="text-blue-300" />
          <span>AI RCA Module</span>
          <span className="text-blue-400 font-light text-xs ml-1">API Manufacturing</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {link('/new', 'New Investigation', PlusCircle)}
          {link('/investigations', 'Saved Investigations', FolderOpen)}
        </nav>
      </div>
    </header>
  )
}
