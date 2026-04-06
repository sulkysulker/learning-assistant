import React from 'react'
import { useAuth } from '../../context/useAuth'

const DashboardPage = () => {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Signed in as {user?.username || user?.email || 'User'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage