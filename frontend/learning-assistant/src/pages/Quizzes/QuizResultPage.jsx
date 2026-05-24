import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { getQuizResult } from '../../services/quizService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'


const formatPercent = (value) => `${Number(value || 0)}%`


const QuizResultPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { quizId } = useParams()

  const [result, setResult] = useState(location.state?.result || null)
  const [loading, setLoading] = useState(!location.state?.result)
  const [error, setError] = useState('')


  useEffect(() => {
    let mounted = true

    const loadResult = async () => {
      if (!quizId) {
        setLoading(false)
        setError('Invalid quiz id.')
        return
      }

      if (location.state?.result) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await getQuizResult(quizId)
        if (mounted) {
          setResult(response)
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load quiz results.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadResult()

    return () => {
      mounted = false
    }
  }, [quizId, location.state?.result])


  const handleBackToQuizzes = () => {
    if (!result?.document_id) {
      navigate('/documents')
      return
    }

    navigate(`/documents/${result.document_id}`, { state: { activeTab: 'Quizzes' } })
  }


  if (loading) {
    return <div className="mx-auto max-w-5xl py-10 text-sm text-gray-500">Loading results...</div>
  }


  if (error) {
    return (
      <div className="mx-auto max-w-5xl py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    )
  }


  if (!result) {
    return (
      <div className="mx-auto max-w-5xl py-10">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">No quiz result was found.</div>
      </div>
    )
  }


  return (
    <div className="mx-auto max-w-5xl pb-10">
      <button
        type="button"
        onClick={handleBackToQuizzes}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
      >
        <span aria-hidden="true">&larr;</span>
        <span>Back to Quizzes</span>
      </button>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Quiz Results</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{result.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Attempted on {new Intl.DateTimeFormat('en', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(new Date(result.attempted_at))}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Score</p>
              <p className="mt-1 text-lg font-bold text-emerald-800">
                {result.score} / {result.num_questions} ({formatPercent(result.percentage)})
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Correct</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{result.correct_count}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">Incorrect</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{result.incorrect_count}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {result.questions.map((question, index) => {
            const correct = Boolean(question.is_correct)
            return (
              <article
                key={question.id}
                className={`rounded-3xl border p-5 shadow-sm ${correct ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">Question {index + 1}</p>
                    <h2 className="mt-2 text-lg font-bold text-gray-900">{question.question}</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${correct ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className={`rounded-xl border px-4 py-3 ${correct ? 'border-emerald-200 bg-white text-emerald-800' : 'border-rose-200 bg-white text-rose-800'}`}>
                    <span className="font-semibold">Your answer: </span>
                    <span>{question.user_answer || 'Not answered'}</span>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-emerald-800">
                    <span className="font-semibold">Correct answer: </span>
                    <span>{question.correct_answer}</span>
                  </div>
                </div>

                {!correct ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-100 px-4 py-3 text-sm text-rose-800">
                    <span className="font-semibold">Explanation: </span>
                    <span>{question.explanation}</span>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}


export default QuizResultPage