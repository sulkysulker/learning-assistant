import React, { useEffect, useMemo, useState } from 'react'
import { getMyProfile, loginUser, registerUser } from '../services/authService'
import { AuthContext } from './authContextValue'

export const AuthProvider = ({ children }) => {
	const [token, setToken] = useState(() => localStorage.getItem('token'))
	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const initializeAuth = async () => {
			if (!token) {
				setLoading(false)
				return
			}

			try {
				const profile = await getMyProfile()
				setUser(profile)
			} catch {
				localStorage.removeItem('token')
				setToken(null)
				setUser(null)
			} finally {
				setLoading(false)
			}
		}

		initializeAuth()
	}, [token])

	const login = async (credentials) => {
		const data = await loginUser(credentials)
		localStorage.setItem('token', data.access_token)
		setToken(data.access_token)
		setUser(data.user)
		return data
	}

	const register = async (payload) => {
		const data = await registerUser(payload)
		localStorage.setItem('token', data.access_token)
		setToken(data.access_token)
		setUser(data.user)
		return data
	}

	const logout = () => {
		localStorage.removeItem('token')
		setToken(null)
		setUser(null)
	}

	const value = useMemo(
		() => ({
			token,
			user,
			isAuthenticated: Boolean(token),
			loading,
			login,
			register,
			logout,
		}),
		[token, user, loading]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
