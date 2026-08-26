import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import FlashcardViewer from '../../components/flashcards/FlashcardViewer'
import {
  deleteFlashcardSet,
  generateDocumentFlashcards,
  getDocumentFlashcardSets,
  getFlashcardSet,
} from '../../services/flashcardService'
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


const FlashcardPage = ({ documentId: documentIdProp, documentTitle: documentTitleProp, embedded = false }) => {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const documentId = documentIdProp || params.id
  const documentTitle = documentTitleProp || 'Document'
  const selectedSetId = searchParams.get('setId') || ''

  const [sets, setSets] = useState([])
  const [loadingSets, setLoadingSets] = useState(true)
  const [setsError, setSetsError] = useState('')
  const [selectedSet, setSelectedSet] = useState(null)
  const [selectedSetLoading, setSelectedSetLoading] = useState(false)
  const [selectedSetError, setSelectedSetError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [actionError, setActionError] = useState('')
  const isViewingSet = Boolean(selectedSetId || selectedSet || selectedSetLoading || selectedSetError)


  useEffect(() => {
    let mounted = true

    const loadSets = async () => {
      if (!documentId) {
        setLoadingSets(false)
        setSetsError('Invalid document id.')
        return
      }

      setLoadingSets(true)
      setSetsError('')

      try {
        const response = await getDocumentFlashcardSets(documentId)
        if (!mounted) {
          return
        }

        setSets(Array.isArray(response.flashcard_sets) ? response.flashcard_sets : [])
      } catch (err) {
        if (mounted) {
          setSetsError(getApiErrorMessage(err, 'Unable to load flashcard sets.'))
        }
      } finally {
        if (mounted) {
          setLoadingSets(false)
        }
      }
    }

    loadSets()

    return () => {
      mounted = false
    }
  }, [documentId])


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


  const handleSelectSet = (setId) => {
    setSearchParams({ setId })
  }


  const handleBackToSets = () => {
    setSearchParams({})
  }


  const handleGenerate = async () => {
    if (!documentId || generating) {
      return
    }

    setGenerating(true)
    setActionError('')

    try {
      const response = await generateDocumentFlashcards(documentId, 10)
      const newSetSummary = {
        id: response.id,
        name: response.name,
        created_at: response.created_at,
        cards_count: Array.isArray(response.cards) ? response.cards.length : 0,
        reviewed_cards_count: 0,
      }

      setSets((prevSets) => [newSetSummary, ...prevSets])
      setSearchParams({ setId: response.id })
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to generate flashcards.'))
    } finally {
      setGenerating(false)
    }
  }


  const handleDeleteSet = async (setId) => {
    setActionError('')

    try {
      await deleteFlashcardSet(setId)
      setSets((prevSets) => prevSets.filter((item) => item.id !== setId))

      if (selectedSetId === setId) {
        handleBackToSets()
      }
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to delete flashcard set.'))
    }
  }


  const handleReviewedCard = (response) => {
    if (!response?.set_id) {
      return
    }

    setSelectedSet((prevSet) => {
      if (!prevSet || prevSet.id !== response.set_id) {
        return prevSet
      }

      return {
        ...prevSet,
        reviewed_cards_count: Number(response.reviewed_cards_count || 0),
        reviewed_card_ids: Array.from(new Set([...(prevSet.reviewed_card_ids || []), response.flashcard_id])),
      }
    })

    setSets((prevSets) =>
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


  const setListView = (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Flashcard Sets</h2>
          <p className="mt-1 text-sm text-gray-600">Generate study cards from this document and reopen any saved set later.</p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? 'Generating...' : 'Generate New Flashcard Set'}
        </button>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      ) : null}

      {loadingSets ? <p className="text-sm text-gray-500">Loading flashcard sets...</p> : null}

      {!loadingSets && setsError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{setsError}</div>
      ) : null}

      {!loadingSets && !setsError && sets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-base font-semibold text-gray-800">No flashcard sets yet</p>
          <p className="mt-2 text-sm text-gray-600">Generate your first set to turn this document into study cards.</p>
        </div>
      ) : null}

      {!loadingSets && !setsError && sets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sets.map((setItem) => (
            <article
              key={setItem.id}
              className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-700">{setItem.name}</h3>
                  <p className="mt-1 text-xs text-gray-500">Created {formatDate(setItem.created_at)}</p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    const confirmed = window.confirm('Delete this flashcard set? This cannot be undone.')
                    if (confirmed) {
                      handleDeleteSet(setItem.id)
                    }
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  Delete
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSelectSet(setItem.id)}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              >
                <span>{setItem.cards_count} cards</span>
                <span className="font-semibold">Open set</span>
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )


  if (!documentId) {
    return <p className="text-sm text-red-700">Invalid document id.</p>
  }

  const viewer = selectedSetLoading ? (
    <p className="text-sm text-gray-500">Loading flashcards...</p>
  ) : selectedSetError ? (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{selectedSetError}</div>
  ) : selectedSet ? (
    <FlashcardViewer
      flashcardSet={selectedSet}
      onBack={handleBackToSets}
      backLabel="Back to document sets"
      onDeleteSet={handleDeleteSet}
      onReviewed={handleReviewedCard}
    />
  ) : null

  if (embedded) {
    return (
      <div className="space-y-6">
        {isViewingSet ? viewer : setListView}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Flashcards</p>
        <h1 className="text-3xl font-bold text-gray-900">{documentTitle}</h1>
        <p className="text-sm text-gray-600">Generate flashcard sets from this document and review them with flip-to-reveal study cards.</p>
      </div>

      {isViewingSet ? viewer : setListView}
    </div>
  )
}

export default FlashcardPage