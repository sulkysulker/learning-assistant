const formatFieldName = (value) => {
  if (typeof value !== 'string' || !value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export const getApiErrorMessage = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail

  if (typeof detail === 'string' && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const firstIssue = detail[0]

    if (typeof firstIssue === 'string' && firstIssue.trim()) {
      return firstIssue
    }

    if (firstIssue && typeof firstIssue === 'object') {
      const field = Array.isArray(firstIssue.loc)
        ? firstIssue.loc[firstIssue.loc.length - 1]
        : ''
      const message = firstIssue.msg

      if (typeof message === 'string' && message.trim()) {
        const fieldLabel = formatFieldName(field)
        return fieldLabel ? `${fieldLabel}: ${message}` : message
      }
    }
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}
