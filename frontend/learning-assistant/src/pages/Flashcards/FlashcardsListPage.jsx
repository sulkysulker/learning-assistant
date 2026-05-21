import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getUserFlashcardSets } from '../../services/flashcardService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'


const formatDate = (value) => {
  if (!value) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}


const FlashcardsListPage = () => {
  const navigate = useNavigate()
  const [flashcardSets, setFlashcardSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')


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


  const openSet = (flashcardSet) => {
    navigate(`/documents/${flashcardSet.document_id}/flashcards?setId=${flashcardSet.id}`)
  }


  const handleDeleteSet = async (flashcardSet) => {
    const confirmed = window.confirm(`Delete "${flashcardSet.name}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingId(flashcardSet.id)
    setError('')

    try {
      const { deleteFlashcardSet } = await import('../../services/flashcardService')
      await deleteFlashcardSet(flashcardSet.id)
      setFlashcardSets((prevSets) => prevSets.filter((item) => item.id !== flashcardSet.id))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete this flashcard set right now.'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Flashcards</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">All flashcard sets</h1>
        <p className="mt-2 text-sm text-gray-600">
          Browse every flashcard set you have created and jump straight into the viewer.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6">
        <p className="text-sm font-semibold text-gray-800">Need a starting point?</p>
        <p className="mt-1 text-sm text-gray-600">Open any PDF in Documents to generate a new flashcard set.</p>
        <button
          type="button"
          onClick={() => navigate('/documents')}
          className="mt-4 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Browse Documents
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? <p className="text-sm text-gray-500">Loading flashcard sets...</p> : null}

      {!loading && !error && flashcardSets.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-base font-semibold text-gray-800">No flashcard sets yet</p>
          <p className="mt-2 text-sm text-gray-600">Generate a set from a document and it will appear here.</p>
        </div>
      ) : null}

      {!loading && flashcardSets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flashcardSets.map((flashcardSet) => (
            <article
              key={flashcardSet.id}
              className="group flex h-full flex-col rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                    {flashcardSet.document_name || 'Document'}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight text-orange-700 group-hover:text-orange-800">
                    {flashcardSet.name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDeleteSet(flashcardSet)
                  }}
                  disabled={deletingId === flashcardSet.id}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === flashcardSet.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>

              <p className="text-sm text-gray-600">Created {formatDate(flashcardSet.created_at)}</p>

              <button
                type="button"
                onClick={() => openSet(flashcardSet)}
                className="mt-5 flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              >
                <span>{flashcardSet.cards_count} cards</span>
                <span className="font-semibold text-slate-700">Open set</span>
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default FlashcardsListPage