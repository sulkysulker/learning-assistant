import React, { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { chatWithDocument, getDocumentById, getDocumentFileUrl } from '../../services/documentService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'

const TABS = ['Content', 'Chat', 'AI Actions', 'Flashcards', 'Quizzes']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const DocumentDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: documentId } = useParams()

  const [activeTab, setActiveTab] = useState('Content')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [document, setDocument] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [jumpPageInput, setJumpPageInput] = useState('1')
  const [zoomPercent, setZoomPercent] = useState(100)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  useEffect(() => {
    let mounted = true

    const loadDocument = async () => {
      if (!documentId) {
        setLoading(false)
        setError('Invalid document id.')
        return
      }

      setLoading(true)
      setError('')

      try {
        const payload = await getDocumentById(documentId)

        if (!mounted) {
          return
        }

        const totalPages = Math.max(1, Number(payload.page_count || 1))
        setDocument(payload)
        setCurrentPage(1)
        setJumpPageInput('1')
        if (totalPages === 1) {
          setZoomPercent(100)
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load this document right now.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDocument()

    return () => {
      mounted = false
    }
  }, [documentId])

  const totalPages = Math.max(1, Number(document?.page_count || 1))

  const fileUrl = useMemo(() => {
    if (!documentId) {
      return ''
    }
    return getDocumentFileUrl(documentId)
  }, [documentId])

  const viewerUrl = useMemo(() => {
    if (!fileUrl) {
      return ''
    }
    return `${fileUrl}#page=${currentPage}&zoom=${zoomPercent}`
  }, [fileUrl, currentPage, zoomPercent])

  const goToPage = (pageNumber) => {
    const nextPage = clamp(pageNumber, 1, totalPages)
    setCurrentPage(nextPage)
    setJumpPageInput(String(nextPage))
  }

  const handleBack = () => {
    const scrollY = Number(location.state?.scrollY || 0)
    navigate('/documents', { state: { restoreScrollY: scrollY } })
  }

  const documentTitle = document?.filename || location.state?.documentName || 'Document'

  const handleSendMessage = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || !documentId || chatLoading) {
      return
    }

    const userMessage = { role: 'user', content: trimmed }
    const nextMessages = [...chatMessages, userMessage]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)
    setChatError('')

    try {
      const response = await chatWithDocument(documentId, {
        message: trimmed,
        history: nextMessages.map((item) => ({ role: item.role, content: item.content })),
      })

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response.response || 'No response.' }])
    } catch (err) {
      setChatError(getApiErrorMessage(err, 'Failed to get an AI response.'))
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong while answering.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleChatKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await handleSendMessage()
    }
  }

  const handleClearChat = () => {
    setChatMessages([])
    setChatError('')
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
      >
        <span aria-hidden="true">&larr;</span>
        <span>Back to Documents</span>
      </button>

      <h1 className="text-2xl font-bold text-gray-900">{documentTitle}</h1>

      <div className="mt-5 border-b border-gray-200">
        <nav className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-lg border border-b-0 px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                  : 'border-transparent bg-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <section className="rounded-b-xl rounded-tr-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? <p className="text-sm text-gray-500">Loading document...</p> : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {!loading && !error && activeTab === 'Chat' ? (
          <div className="flex min-h-[65vh] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Document Chat</p>
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
              >
                Clear chat
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {chatMessages.length === 0 ? (
                <p className="text-center text-sm text-gray-500">Ask anything about this document.</p>
              ) : null}

              {chatMessages.map((msg, index) => (
                <div key={`${msg.role}-${index}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-orange-500 text-white'
                        : 'border border-gray-200 bg-white text-gray-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
                    Thinking...
                  </div>
                </div>
              ) : null}
            </div>

            {chatError ? (
              <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{chatError}</div>
            ) : null}

            <div className="border-t border-gray-200 bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Ask a question about this document..."
                  rows={2}
                  className="max-h-40 min-h-12 flex-1 resize-y rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && !error && !['Content', 'Chat'].includes(activeTab) ? (
          <div className="min-h-[65vh] rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="text-base font-semibold text-gray-800">{activeTab}</p>
            <p className="mt-2 text-sm text-gray-600">Coming soon</p>
          </div>
        ) : null}

        {!loading && !error && activeTab === 'Content' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomPercent((prev) => clamp(prev - 10, 50, 200))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zoom Out
                </button>

                <span className="min-w-16 text-center text-sm font-semibold text-gray-700">{zoomPercent}%</span>

                <button
                  type="button"
                  onClick={() => setZoomPercent((prev) => clamp(prev + 10, 50, 200))}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Zoom In
                </button>
              </div>

              <button
                type="button"
                onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Open in new tab
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>

              <label className="ml-1 text-sm text-gray-600" htmlFor="jump-page-input">
                Page
              </label>
              <input
                id="jump-page-input"
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(event) => setJumpPageInput(event.target.value)}
                className="w-20 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={() => goToPage(Number(jumpPageInput || 1))}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Go
              </button>

              <p className="ml-auto text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <iframe
                key={`${documentId}-${currentPage}-${zoomPercent}`}
                src={viewerUrl}
                title={documentTitle}
                className="h-[70vh] w-full"
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default DocumentDetailPage