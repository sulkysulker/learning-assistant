import React, { useMemo, useState } from 'react'
import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { getDocumentById, getDocumentFileUrl } from '../../services/documentService'
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

        {!loading && !error && activeTab !== 'Content' ? (
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