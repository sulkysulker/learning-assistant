import React, { useState } from 'react'

import { changePassword } from '../../services/authService'
import { useAuth } from '../../context/useAuth'
import { getApiErrorMessage } from '../../utils/getApiErrorMessage'

const ProfilePage = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (formData.new_password.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    if (formData.new_password !== formData.confirm_password) {
      setError('New password and confirmation do not match.')
      return
    }

    setSubmitting(true)

    try {
      await changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
      })
      setFormData({ current_password: '', new_password: '', confirm_password: '' })
      setSuccess('Password updated successfully')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update your password.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account details and password.</p>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Account information</h2>
        </div>
        <dl className="grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Username</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.username || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{user?.email || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Change password</h2>
        </div>

        <form className="space-y-4 p-5" onSubmit={handleSubmit}>
          {[
            ['current_password', 'Current Password', 'current-password'],
            ['new_password', 'New Password', 'new-password'],
            ['confirm_password', 'Confirm New Password', 'new-password'],
          ].map(([name, label, autoComplete]) => (
            <div key={name}>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={name}>
                {label}
              </label>
              <input
                id={name}
                name={name}
                type="password"
                autoComplete={autoComplete}
                value={formData[name]}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                required
              />
            </div>
          ))}

          {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
          {success ? <p className="text-sm text-green-700" role="status">{success}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-orange-500 px-4 py-2.5 font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default ProfilePage