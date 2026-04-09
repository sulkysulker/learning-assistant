import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { deleteDocument, getDocuments, uploadDocument } from '../../services/documentService'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 10 ? 1 : 2
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

const formatRelativeDate = (isoDate) => {
  const time = new Date(isoDate).getTime()
  if (!time) {
    return 'just now'
  }

  const diffSeconds = Math.round((time - Date.now()) / 1000)
  const abs = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (abs < 60) return rtf.format(diffSeconds, 'second')

  const minutes = Math.round(diffSeconds / 60)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')

  const days = Math.round(hours / 24)
  if (Math.abs(days) < 30) return rtf.format(days, 'day')

  const months = Math.round(days / 30)
  if (Math.abs(months) < 12) return rtf.format(months, 'month')

  const years = Math.round(days / 365)
  return rtf.format(years, 'year')
}

const DocumentListPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    let mounted = true

    const loadDocuments = async () => {
      setLoading(true)
      setError('')

      try {
        const payload = await getDocuments()
        if (mounted) {
          setDocuments(Array.isArray(payload.documents) ? payload.documents : [])
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Unable to load your documents right now.'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDocuments()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const restoreScrollY = location.state?.restoreScrollY
    if (typeof restoreScrollY === 'number') {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: restoreScrollY, behavior: 'auto' })
      })
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
  }, [documents])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setUploadError('')

    const isPdfMime = file.type === 'application/pdf'
    const isPdfName = file.name.toLowerCase().endsWith('.pdf')
    if (!isPdfMime && !isPdfName) {
      setUploadError('Only PDF files can be uploaded.')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const newDocument = await uploadDocument(file, (progressEvent) => {
        const total = progressEvent.total || file.size || 1
        const percent = Math.min(100, Math.round((progressEvent.loaded / total) * 100))
        setUploadProgress(percent)
      })

      setDocuments((prev) => [newDocument, ...prev])
      setUploadProgress(100)
    } catch (err) {
      setUploadError(getApiErrorMessage(err, 'Document upload failed. Please try again.'))
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 500)
    }
  }

  const handleDelete = async (documentId, filename) => {
    const confirmed = window.confirm(`Delete "${filename}"? This also removes related flashcards and quizzes.`)
    if (!confirmed) {
      return
    }

    setDeletingId(documentId)
    setError('')

    try {
      await deleteDocument(documentId)
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete this document right now.'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your uploaded PDFs and generated study material.</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {uploadError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{uploadError}</div>
      ) : null}

      {uploading || uploadProgress > 0 ? (
        <div className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between text-sm font-medium text-orange-800">
            <span>Uploading PDF...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-orange-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-gray-500">Loading documents...</p> : null}

      {!loading && sortedDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-gray-800">No documents yet</p>
          <p className="mt-2 text-sm text-gray-600">Upload your first PDF to get started</p>
        </div>
      ) : null}

      {!loading && sortedDocuments.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedDocuments.map((doc) => (
            <article
              key={doc.id}
              onClick={() =>
                navigate(`/documents/${doc.id}`, {
                  state: {
                    fromDocuments: true,
                    scrollY: window.scrollY,
                    documentName: doc.filename,
                  },
                })
              }
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="line-clamp-2 text-left text-base font-semibold text-gray-900 hover:text-orange-700">{doc.filename}</h2>
                  <p className="mt-1 text-xs text-gray-500">Uploaded {formatRelativeDate(doc.uploaded_at)}</p>
                </div>

                <button
                  type="button"
                  disabled={deletingId === doc.id}
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDelete(doc.id, doc.filename)
                  }}
                  className="inline-flex items-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">File Size</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{formatFileSize(Number(doc.file_size_bytes || 0))}</dd>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Flashcard Sets</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{Number(doc.flashcard_sets_count || 0)}</dd>
                </div>

                <div className="rounded-lg bg-gray-50 p-3">
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Quizzes</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">{Number(doc.quizzes_count || 0)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={openFilePicker}
        className="fixed bottom-8 right-8 z-10 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {uploading ? 'Uploading...' : '+ Upload Document'}
      </button>
    </div>
  )
}

export default DocumentListPage