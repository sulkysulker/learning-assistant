import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { getQuiz, submitQuiz } from '../../services/quizService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'


const QuizTakePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { quizId } = useParams()

  const [quiz, setQuiz] = useState(location.state?.quiz || null)
  const [loading, setLoading] = useState(!location.state?.quiz)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [submitWarning, setSubmitWarning] = useState(null)
  const [submitting, setSubmitting] = useState(false)


  useEffect(() => {
    let mounted = true

    const loadQuiz = async () => {
      if (!quizId) {
        setError('Invalid quiz id.')
        setLoading(false)
        return
      }

      if (location.state?.quiz) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await getQuiz(quizId)
        if (!mounted) {
          return
        }

        setQuiz(response)
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load this quiz.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadQuiz()

    return () => {
      mounted = false
    }
  }, [quizId, location.state?.quiz])


  useEffect(() => {
    const questionCount = quiz?.questions?.length || 0
    setAnswers(Array.from({ length: questionCount }, () => null))
    setCurrentIndex(0)
    setSubmitWarning(null)
  }, [quiz?.id, quiz?.questions?.length])


  const questions = quiz?.questions || []
  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex] || null
  const answeredCount = useMemo(() => answers.filter((answer) => answer !== null && answer !== undefined).length, [answers])
  const unansweredIndices = useMemo(
    () => answers.reduce((result, answer, index) => {
      if (answer === null || answer === undefined) {
        result.push(index)
      }
      return result
    }, []),
    [answers]
  )


  const handleBackToQuizzes = () => {
    if (!quiz?.document_id) {
      navigate('/documents')
      return
    }

    navigate(`/documents/${quiz.document_id}`, { state: { activeTab: 'Quizzes' } })
  }


  const handleSelectOption = (optionIndex) => {
    setAnswers((prevAnswers) => prevAnswers.map((answer, index) => (index === currentIndex ? optionIndex : answer)))
    setSubmitWarning(null)
  }


  const handlePrevious = () => {
    setCurrentIndex((prevIndex) => Math.max(0, prevIndex - 1))
  }


  const handleNext = () => {
    setCurrentIndex((prevIndex) => Math.min(totalQuestions - 1, prevIndex + 1))
  }


  const finishSubmission = async () => {
    if (!quizId || submitting) {
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await submitQuiz(quizId, answers)
      navigate(`/quizzes/${quizId}/results`, { replace: true, state: { result: response } })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit quiz.'))
    } finally {
      setSubmitting(false)
    }
  }


  const handleSubmit = async (force = false) => {
    if (submitting) {
      return
    }

    if (!force && unansweredIndices.length > 0) {
      setSubmitWarning({ count: unansweredIndices.length, firstIndex: unansweredIndices[0] })
      return
    }

    await finishSubmission()
  }


  if (loading) {
    return <div className="mx-auto max-w-4xl py-10 text-sm text-gray-500">Loading quiz...</div>
  }


  if (error) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      </div>
    )
  }


  if (!quiz || !currentQuestion) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">Quiz not found.</div>
      </div>
    )
  }


  return (
    <div className="mx-auto max-w-4xl pb-10">
      <button
        type="button"
        onClick={handleBackToQuizzes}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
      >
        <span aria-hidden="true">&larr;</span>
        <span>Back to Quizzes</span>
      </button>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">Quiz Attempt</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{quiz.name}</h1>
            <p className="mt-1 text-sm text-gray-600">Answer one question at a time and submit when you are finished.</p>
          </div>

          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Progress</p>
            <p className="text-lg font-bold text-gray-900">Question {currentIndex + 1} of {totalQuestions}</p>
            <p className="text-xs text-gray-500">Answered {answeredCount} of {totalQuestions}</p>
          </div>
        </div>

        {submitWarning ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p>You still have {submitWarning.count} unanswered question{submitWarning.count === 1 ? '' : 's'}.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex(submitWarning.firstIndex)}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Review unanswered
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Submit anyway
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <div className="rounded-3xl border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <p className="mt-4 text-xl font-bold leading-tight text-gray-900">{currentQuestion.question}</p>

            <div className="mt-5 grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const selected = answers[currentIndex] === optionIndex
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelectOption(optionIndex)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                      selected
                        ? 'border-orange-300 bg-orange-50 text-orange-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0 || submitting}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit(Boolean(submitWarning))}
                  disabled={submitting}
                  className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : submitWarning ? 'Submit anyway' : 'Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default QuizTakePage