import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import FlashcardViewer from '../../components/flashcards/FlashcardViewer'
import {
  deleteFlashcardSet,
  generateDocumentFlashcards,
  getDocumentFlashcardSets,
  getFlashcardSet,
  toggleFlashcardStar,
} from '../../services/flashcardService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'


const DIFFICULTY_STYLES = {
  easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  hard: 'bg-rose-100 text-rose-700 border-rose-200',
}


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


const formatDifficulty = (value) => {
  if (!value) {
    return 'Medium'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)
  const [starLoadingCardId, setStarLoadingCardId] = useState('')


  const selectedCards = selectedSet?.cards || []
  const currentCard = selectedCards[currentIndex] || null
  const totalCards = selectedCards.length
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
        setCurrentIndex(0)
        setIsFlipped(false)
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


  useEffect(() => {
    setCurrentIndex(0)
    setIsFlipped(false)
  }, [selectedSetId, selectedSet?.cards?.length])


  useEffect(() => {
    if (!autoAdvance || !isFlipped || totalCards < 2) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % totalCards)
      setIsFlipped(false)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [autoAdvance, isFlipped, totalCards, currentIndex])


  const goToPreviousCard = () => {
    if (!totalCards) {
      return
    }

    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalCards) % totalCards)
    setIsFlipped(false)
  }


  const goToNextCard = () => {
    if (!totalCards) {
      return
    }

    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalCards)
    setIsFlipped(false)
  }


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


  const handleToggleStar = async (card) => {
    if (!selectedSet || !card || starLoadingCardId) {
      return
    }

    setStarLoadingCardId(card.id)
    setActionError('')

    try {
      const response = await toggleFlashcardStar(selectedSet.id, card.id)
      setSelectedSet((prevSet) => {
        if (!prevSet) {
          return prevSet
        }

        return {
          ...prevSet,
          cards: prevSet.cards.map((item) =>
            item.id === card.id ? { ...item, is_starred: response.is_starred } : item
          ),
        }
      })
      setSets((prevSets) =>
        prevSets.map((item) =>
          item.id === selectedSet.id
            ? {
                ...item,
                cards_count: selectedSet.cards.length,
              }
            : item
        )
      )
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to update star status.'))
    } finally {
      setStarLoadingCardId('')
    }
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


  const viewerContent = selectedSet ? (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBackToSets}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to sets</span>
        </button>

        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{selectedSet.name}</p>
          <p className="text-xs text-gray-500">Created {formatDate(selectedSet.created_at)}</p>
        </div>
      </div>

      {selectedSetError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{selectedSetError}</div>
      ) : null}

      {selectedSetLoading ? (
        <p className="text-sm text-gray-500">Loading flashcards...</p>
      ) : totalCards > 0 ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[currentCard?.difficulty || 'medium'] || DIFFICULTY_STYLES.medium}`}>
                {formatDifficulty(currentCard?.difficulty)}
              </div>

              <button
                type="button"
                onClick={() => handleToggleStar(currentCard)}
                disabled={!currentCard || starLoadingCardId === currentCard.id}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={currentCard?.is_starred ? 'Remove bookmark' : 'Bookmark card'}
              >
                <span className="text-lg leading-none">{currentCard?.is_starred ? '★' : '☆'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFlipped((prev) => !prev)}
              className="group relative min-h-[22rem] w-full rounded-3xl border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-0 text-left shadow-inner"
            >
              <div className={`flashcard-stage ${isFlipped ? 'is-flipped' : ''}`}>
                <div className="flashcard-face flashcard-front">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Question</p>
                  <p className="mt-4 text-2xl font-bold leading-tight text-gray-900">{currentCard.question}</p>
                  <p className="mt-6 text-sm text-gray-500">Click the card to reveal the answer.</p>
                </div>

                <div className="flashcard-face flashcard-back">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Answer</p>
                  <p className="mt-4 text-xl leading-relaxed text-gray-900 whitespace-pre-wrap">{currentCard.answer}</p>
                </div>
              </div>
            </button>

            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-600">
              <button
                type="button"
                onClick={goToPreviousCard}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Previous
              </button>

              <span className="min-w-24 text-center font-semibold text-gray-800">
                {currentIndex + 1}/{totalCards}
              </span>

              <button
                type="button"
                onClick={goToNextCard}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Study Options</h3>
              <label className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(event) => setAutoAdvance(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                Auto-advance after reveal
              </label>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Current Card</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{currentCard.question}</p>
              <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                {isFlipped ? currentCard.answer : 'Answer hidden until you flip the card.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-sm text-gray-600">This set does not have any cards.</p>
        </div>
      )}
    </div>
  ) : null


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