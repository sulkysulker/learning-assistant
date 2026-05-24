import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { deleteQuiz, generateDocumentQuiz, getDocumentQuizzes } from '../../services/quizService'
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


const formatScore = (score, totalQuestions) => {
  if (score === null || score === undefined) {
    return '—'
  }

  const safeTotal = Number(totalQuestions || 0)
  const safeScore = Number(score || 0)
  const percentage = safeTotal > 0 ? Math.round((safeScore / safeTotal) * 100) : 0
  return `${safeScore} / ${safeTotal} (${percentage}%)`
}


const DocumentQuizzesPanel = ({ documentId, documentTitle }) => {
  const navigate = useNavigate()

  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [actionError, setActionError] = useState('')


  useEffect(() => {
    let mounted = true

    const loadQuizzes = async () => {
      if (!documentId) {
        setLoading(false)
        setError('Invalid document id.')
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await getDocumentQuizzes(documentId)
        if (!mounted) {
          return
        }

        setQuizzes(Array.isArray(response.quizzes) ? response.quizzes : [])
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load quizzes.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadQuizzes()

    return () => {
      mounted = false
    }
  }, [documentId])


  const handleGenerate = async () => {
    if (!documentId || generating) {
      return
    }

    const rawCount = window.prompt('How many questions should this quiz have?', '10')
    if (rawCount === null) {
      return
    }

    const parsedCount = Number.parseInt(rawCount, 10)
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 20) {
      setActionError('Please enter a number between 1 and 20.')
      return
    }

    const confirmed = window.confirm(`Generate a quiz with ${parsedCount} questions?`)
    if (!confirmed) {
      return
    }

    setGenerating(true)
    setActionError('')

    try {
      const response = await generateDocumentQuiz(documentId, parsedCount)
      const newQuiz = {
        id: response.id,
        name: response.name,
        created_at: response.created_at,
        num_questions: Number(response.num_questions || 0),
        score: null,
        attempted_at: null,
      }

      setQuizzes((prevQuizzes) => [newQuiz, ...prevQuizzes])
      navigate(`/quizzes/${response.id}`, { state: { documentId, documentTitle } })
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to generate quiz.'))
    } finally {
      setGenerating(false)
    }
  }


  const handleOpenQuiz = (quiz) => {
    if (!quiz) {
      return
    }

    const targetPath = quiz.attempted_at ? `/quizzes/${quiz.id}/results` : `/quizzes/${quiz.id}`
    navigate(targetPath, { state: { documentId, documentTitle } })
  }


  const handleDeleteQuiz = async (quizId) => {
    const confirmed = window.confirm('Delete this quiz? This cannot be undone.')
    if (!confirmed) {
      return
    }

    setActionError('')

    try {
      await deleteQuiz(quizId)
      setQuizzes((prevQuizzes) => prevQuizzes.filter((quiz) => quiz.id !== quizId))
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Failed to delete quiz.'))
    }
  }


  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Quizzes</h2>
          <p className="mt-1 text-sm text-gray-600">Generate a multiple-choice quiz from this document and reopen the latest result later.</p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? 'Generating...' : 'Generate Quiz'}
        </button>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      ) : null}

      {loading ? <p className="text-sm text-gray-500">Loading quizzes...</p> : null}

      {!loading && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {!loading && !error && quizzes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
          <p className="text-base font-semibold text-gray-800">No quizzes yet</p>
          <p className="mt-2 text-sm text-gray-600">Generate your first quiz to test your understanding of this document.</p>
        </div>
      ) : null}

      {!loading && !error && quizzes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => {
            const attempted = Boolean(quiz.attempted_at)
            return (
              <article
                key={quiz.id}
                className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 group-hover:text-orange-700">{quiz.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">Created {formatDate(quiz.created_at)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDeleteQuiz(quiz.id)
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Questions</span>
                    <span className="font-semibold text-gray-900">{quiz.num_questions}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Score</span>
                    <span className="font-semibold text-gray-900">{formatScore(quiz.score, quiz.num_questions)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenQuiz(quiz)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                >
                  <span>{attempted ? 'View Results' : 'Start Quiz'}</span>
                  <span className="font-semibold">{attempted ? 'Open result' : 'Begin now'}</span>
                </button>
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}


export default DocumentQuizzesPanel
