import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../../utils/getApiErrorMessage'
import { getDashboardActivities, getDashboardStats } from '../../services/dashboardService'

const ACTIVITY_META = {
  'uploaded document': {
    icon: 'up',
    fallbackLabel: 'Uploaded document',
  },
  'attempted quiz': {
    icon: 'quiz',
    fallbackLabel: 'Attempted quiz',
  },
  'created flashcard set': {
    icon: 'flashcards',
    fallbackLabel: 'Created flashcard set',
  },
  'accessed document': {
    icon: 'accessed',
    fallbackLabel: 'Accessed document',
  },
}

const formatRelativeDate = (value) => {
  const now = Date.now()
  const target = new Date(value).getTime()
  const diffSeconds = Math.round((target - now) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day')
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month')
  }

  const diffYears = Math.round(diffDays / 365)
  return rtf.format(diffYears, 'year')
}

const ActivityIcon = ({ type }) => {
  if (type === 'quiz') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M9 9a3 3 0 1 1 6 0c0 2-3 2-3 4" />
        <path d="M12 17h.01" />
        <path d="M12 3a9 9 0 1 0 9 9" />
      </svg>
    )
  }

  if (type === 'flashcards') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    )
  }

  if (type === 'accessed') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M6 2h8l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

const getViewPath = (activity) => {
  if (activity.related_type === 'quiz') {
    return `/quizzes/${activity.related_id}`
  }

  if (activity.related_type === 'flashcard_set') {
    return `/documents/${activity.related_id}/flashcards`
  }

  return `/documents/${activity.related_id}`
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total_docs: 0,
    total_flashcard_sets: 0,
    total_quizzes_attempted: 0,
  })
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadDashboard = async () => {
      setLoading(true)
      setError('')

      try {
        const [statsData, activitiesData] = await Promise.all([
          getDashboardStats(),
          getDashboardActivities(),
        ])

        if (!isMounted) {
          return
        }

        setStats({
          total_docs: Number(statsData.total_docs || 0),
          total_flashcard_sets: Number(statsData.total_flashcard_sets || 0),
          total_quizzes_attempted: Number(statsData.total_quizzes_attempted || 0),
        })
        setActivities(Array.isArray(activitiesData.activities) ? activitiesData.activities : [])
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, 'Unable to load dashboard data right now.'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isMounted = false
    }
  }, [])

  const statsCards = useMemo(
    () => [
      { label: 'Total Documents', value: stats.total_docs },
      { label: 'Flashcard Sets', value: stats.total_flashcard_sets },
      { label: 'Quizzes Attempted', value: stats.total_quizzes_attempted },
    ],
    [stats]
  )

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Track your learning progress and recent activity.</p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {statsCards.map((card) => (
          <article key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{loading ? '-' : card.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>

        <div className="p-5">
          {loading ? <p className="text-sm text-gray-500">Loading activity...</p> : null}

          {!loading && activities.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet - upload a document to get started.</p>
          ) : null}

          {!loading && activities.length > 0 ? (
            <ul className="space-y-3">
              {activities.map((activity) => {
                const meta = ACTIVITY_META[activity.activity_type] || {
                  icon: 'up',
                  fallbackLabel: activity.activity_type,
                }

                return (
                  <li
                    key={activity.id}
                    className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                        <ActivityIcon type={meta.icon} />
                      </span>

                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {meta.fallbackLabel}: {activity.label}
                        </p>
                        <p className="text-xs text-gray-500">{formatRelativeDate(activity.created_at)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(getViewPath(activity))}
                      className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      View
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default DashboardPage