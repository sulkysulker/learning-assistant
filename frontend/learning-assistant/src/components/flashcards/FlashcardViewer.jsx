import React, { useEffect, useState } from 'react'

import { markFlashcardReviewed, toggleFlashcardStar } from '../../services/flashcardService'
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


const FlashcardViewer = ({ flashcardSet, onBack, onDeleteSet, backLabel = 'Back to all sets', onReviewed }) => {
	const [cards, setCards] = useState(() => (Array.isArray(flashcardSet?.cards) ? flashcardSet.cards : []))
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isFlipped, setIsFlipped] = useState(false)
	const [autoAdvance, setAutoAdvance] = useState(true)
	const [starLoadingCardId, setStarLoadingCardId] = useState('')
	const [reviewingCardId, setReviewingCardId] = useState('')
	const [reviewError, setReviewError] = useState('')
	const [actionError, setActionError] = useState('')
	const [reviewedCardIds, setReviewedCardIds] = useState(() => Array.isArray(flashcardSet?.reviewed_card_ids) ? flashcardSet.reviewed_card_ids : [])
	const [reviewAttemptedCardIds, setReviewAttemptedCardIds] = useState(() => Array.isArray(flashcardSet?.reviewed_card_ids) ? flashcardSet.reviewed_card_ids : [])

	const currentCard = cards[currentIndex] || null
	const totalCards = cards.length
	const isCurrentCardReviewed = currentCard ? reviewedCardIds.includes(currentCard.id) : false
	const setCreatedAt = flashcardSet?.created_at ? formatDate(flashcardSet.created_at) : 'Just now'

	useEffect(() => {
		setCurrentIndex(0)
		setIsFlipped(false)
		setAutoAdvance(true)
		setStarLoadingCardId('')
		setReviewingCardId('')
		setReviewError('')
		setActionError('')
		setCards(Array.isArray(flashcardSet?.cards) ? flashcardSet.cards : [])
		setReviewedCardIds(Array.isArray(flashcardSet?.reviewed_card_ids) ? flashcardSet.reviewed_card_ids : [])
		setReviewAttemptedCardIds(Array.isArray(flashcardSet?.reviewed_card_ids) ? flashcardSet.reviewed_card_ids : [])
	}, [flashcardSet?.id])

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

	useEffect(() => {
		if (
			!isFlipped ||
			!currentCard ||
			isCurrentCardReviewed ||
			reviewAttemptedCardIds.includes(currentCard.id) ||
			reviewingCardId === currentCard.id
		) {
			return undefined
		}

		let mounted = true
		setReviewingCardId(currentCard.id)
		setReviewError('')

		const recordReview = async () => {
			try {
				const response = await markFlashcardReviewed(currentCard.id)
				if (!mounted) {
					return
				}

				setReviewedCardIds((prevIds) => (prevIds.includes(currentCard.id) ? prevIds : [...prevIds, currentCard.id]))
				setReviewAttemptedCardIds((prevIds) => (prevIds.includes(currentCard.id) ? prevIds : [...prevIds, currentCard.id]))
				onReviewed?.(response)
			} catch (err) {
				if (mounted) {
					setReviewError(getApiErrorMessage(err, 'Unable to save this review right now.'))
					setReviewAttemptedCardIds((prevIds) => (prevIds.includes(currentCard.id) ? prevIds : [...prevIds, currentCard.id]))
				}
			} finally {
				if (mounted) {
					setReviewingCardId('')
				}
			}
		}

		recordReview()

		return () => {
			mounted = false
		}
	}, [currentCard, isFlipped, isCurrentCardReviewed, onReviewed, reviewingCardId])

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

	const handleToggleStar = async () => {
		if (!flashcardSet || !currentCard || starLoadingCardId === currentCard.id) {
			return
		}

		setStarLoadingCardId(currentCard.id)
		setActionError('')

		try {
			const response = await toggleFlashcardStar(flashcardSet.id, currentCard.id)
			setCards((prevCards) => prevCards.map((item) =>
				item.id === currentCard.id ? { ...item, is_starred: response.is_starred } : item
			))
		} catch (err) {
			setActionError(getApiErrorMessage(err, 'Failed to update star status.'))
		} finally {
			setStarLoadingCardId('')
		}
	}

	const handleDeleteSet = async () => {
		if (!flashcardSet || !onDeleteSet) {
			return
		}

		const confirmed = window.confirm('Delete this flashcard set? This cannot be undone.')
		if (!confirmed) {
			return
		}

		await onDeleteSet(flashcardSet.id)
	}

	if (!flashcardSet) {
		return null
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<button
					type="button"
					onClick={onBack}
					className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
				>
					<span aria-hidden="true">&larr;</span>
					<span>{backLabel}</span>
				</button>

				<button
					type="button"
					onClick={handleDeleteSet}
					className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
				>
					Delete Set
				</button>
			</div>

			<div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">Flashcard Study</p>
						<h2 className="mt-2 text-2xl font-bold text-gray-900">{flashcardSet.name}</h2>
						<p className="mt-2 text-sm text-gray-600">
							Created {setCreatedAt}
							{flashcardSet.document_name ? ` • Source: ${flashcardSet.document_name}` : ''}
						</p>
					</div>

					<div className="text-right text-sm text-gray-600">
						<p>{totalCards} total cards</p>
						<p>{reviewedCardIds.length} reviewed</p>
					</div>
				</div>

				{actionError ? (
					<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
				) : null}
				{reviewError ? (
					<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{reviewError}</div>
				) : null}

				{totalCards > 0 && currentCard ? (
					<div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
						<div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
							<div className="mb-4 flex items-center justify-between gap-3">
								<div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[currentCard.difficulty || 'medium'] || DIFFICULTY_STYLES.medium}`}>
									{formatDifficulty(currentCard.difficulty)}
								</div>

								<button
									type="button"
									onClick={handleToggleStar}
									disabled={starLoadingCardId === currentCard.id}
									className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 transition hover:border-orange-200 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
									aria-label={currentCard.is_starred ? 'Remove bookmark' : 'Bookmark card'}
								>
									<span className="text-lg leading-none">{currentCard.is_starred ? '★' : '☆'}</span>
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
					<div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
						<p className="text-sm text-gray-600">This set does not have any cards.</p>
					</div>
				)}
			</div>
		</div>
	)
}


export default FlashcardViewer