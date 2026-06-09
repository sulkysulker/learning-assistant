import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import FlashcardViewer from '../../components/flashcards/FlashcardViewer'
import { deleteFlashcardSet, getFlashcardSet, getUserFlashcardSets } from '../../services/flashcardService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'


const formatRelativeTime = (value) => {
  const time = new Date(value).getTime()
  if (!time) {
    return 'just now'
  }

  const diffSeconds = Math.round((time - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absSeconds < 60) return formatter.format(diffSeconds, 'second')

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, 'day')

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) return formatter.format(diffMonths, 'month')

  const diffYears = Math.round(diffDays / 365)
  return formatter.format(diffYears, 'year')
}


const FlashcardsListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSetId = searchParams.get('setId') || ''

  const [flashcardSets, setFlashcardSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSet, setSelectedSet] = useState(null)
  const [selectedSetLoading, setSelectedSetLoading] = useState(false)
  const [selectedSetError, setSelectedSetError] = useState('')


  useEffect(() => {
    let mounted = true

    const loadFlashcardSets = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await getUserFlashcardSets()
        if (mounted) {
          setFlashcardSets(Array.isArray(response.flashcard_sets) ? response.flashcard_sets : [])
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load your flashcard sets right now.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadFlashcardSets()

    return () => {
      mounted = false
    }
  }, [])


  useEffect(() => {
    let mounted = true

    const loadSetDetail = async () => {
      if (!selectedSetId) {
        setSelectedSet(null)
        setSelectedSetError('')
        return
      }

      setSelectedSetLoading(true)
      setSelectedSetError('')

      try {
        const response = await getFlashcardSet(selectedSetId)
        if (!mounted) {
          return
        }

        setSelectedSet(response)
      } catch (err) {
        if (mounted) {
          setSelectedSet(null)
          setSelectedSetError(getApiErrorMessage(err, 'Unable to load this flashcard set.'))
        }
      } finally {
        if (mounted) {
          setSelectedSetLoading(false)
        }
      }
    }

    loadSetDetail()

    return () => {
      mounted = false
    }
  }, [selectedSetId])


  const sortedFlashcardSets = useMemo(
    () => [...flashcardSets].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()),
    [flashcardSets]
  )


  const openSet = (flashcardSet) => {
    setSearchParams({ setId: flashcardSet.id })
  }


  const handleBackToSets = () => {
    setSearchParams({})
  }


  const handleDeleteSet = async (setId) => {
    setError('')
    setSelectedSetError('')

    try {
      await deleteFlashcardSet(setId)
      setFlashcardSets((prevSets) => prevSets.filter((item) => item.id !== setId))

      if (selectedSetId === setId) {
        handleBackToSets()
        setSelectedSet(null)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete this flashcard set right now.'))
    }
  }


  const handleReviewedCard = (response) => {
    if (!response?.set_id) {
      return
    }

    setFlashcardSets((prevSets) =>
      prevSets.map((item) =>
        item.id === response.set_id
          ? {
              ...item,
              reviewed_cards_count: Number(response.reviewed_cards_count || 0),
              cards_count: Number(response.cards_count || item.cards_count || 0),
            }
          : item
      )
    )
  }


  const progressPercent = (flashcardSet) => {
    const totalCards = Number(flashcardSet.cards_count || 0)
    if (!totalCards) {
      return 0
    }

    return Math.min(100, Math.round((Number(flashcardSet.reviewed_cards_count || 0) / totalCards) * 100))
  }


  const viewer = selectedSetLoading ? (
    <p className="text-sm text-gray-500">Loading flashcard set...</p>
  ) : selectedSetError ? (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex items-center justify-between gap-3">
        <span>{selectedSetError}</span>
        <button type="button" onClick={handleBackToSets} className="font-semibold text-red-700 underline-offset-2 hover:underline">
          Back to all sets
        </button>
      </div>
    </div>
  ) : selectedSet ? (
    <FlashcardViewer
      flashcardSet={selectedSet}
      onBack={handleBackToSets}
      backLabel="Back to all sets"
      onDeleteSet={handleDeleteSet}
      onReviewed={handleReviewedCard}
    />
  ) : null


  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-24">
      <div className="rounded-[2rem] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Flashcards</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">All flashcard sets</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          Browse every flashcard set you have created, check review progress, and open any set in the shared study viewer.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            Browse Documents
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {selectedSetId ? <div>{viewer}</div> : null}

      {!selectedSetId && loading ? <p className="text-sm text-gray-500">Loading flashcard sets...</p> : null}

      {!selectedSetId && !loading && !error && sortedFlashcardSets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">No flashcard sets yet</p>
          <p className="mt-2 text-sm text-gray-600">Generate a set from a document and it will appear here.</p>
        </div>
      ) : null}

      {!selectedSetId && !loading && sortedFlashcardSets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedFlashcardSets.map((flashcardSet) => {
            const reviewedCount = Number(flashcardSet.reviewed_cards_count || 0)
            const totalCount = Number(flashcardSet.cards_count || 0)
            const percent = progressPercent(flashcardSet)

            return (
              <article
                key={flashcardSet.id}
                className="group flex h-full flex-col rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                    {flashcardSet.document_name || 'Document'}
                  </p>
                  <h2 className="mt-3 line-clamp-2 text-2xl font-bold leading-tight text-orange-700 group-hover:text-orange-800">
                    {flashcardSet.name}
                  </h2>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-600">
                  <span>Created {formatRelativeTime(flashcardSet.created_at)}</span>
                  <span>{totalCount} cards</span>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    <span>Review progress</span>
                    <span>
                      {reviewedCount}/{totalCount}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openSet(flashcardSet)}
                  className="mt-5 inline-flex items-center justify-center rounded-2xl border border-transparent bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
                >
                  Study Now
                </button>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default FlashcardsListPage