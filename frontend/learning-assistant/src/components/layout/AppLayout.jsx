import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Documents', to: '/documents' },
  { label: 'Flashcards', to: '/flashcards' },
  { label: 'Profile', to: '/profile' },
]

const AppLayout = ({ children }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-200 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Learning Assistant</p>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-20 border-b border-gray-200 bg-white md:left-60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">LA</span>
            <p className="text-base font-semibold text-gray-900">Learning Assistant</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
            </button>

            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{user?.username || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.email || 'No email available'}</p>
            </div>
          </div>
        </div>

        <nav className="border-t border-gray-200 px-4 py-2 md:hidden">
          <ul className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => (
              <li key={`mobile-${item.to}`}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            type="button"
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="pt-32 md:ml-60 md:pt-16">
        <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4 md:h-[calc(100vh-4rem)] md:p-6">{children}</div>
      </main>
    </div>
  )
}

export default AppLayout