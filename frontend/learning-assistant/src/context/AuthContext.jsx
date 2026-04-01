import React, { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
	const [token, setToken] = useState(() => localStorage.getItem('token'))
	const [loading] = useState(false)

	const login = (nextToken) => {
		localStorage.setItem('token', nextToken)
		setToken(nextToken)
	}

	const logout = () => {
		localStorage.removeItem('token')
		setToken(null)
	}

	const value = useMemo(
		() => ({
			token,
			isAuthenticated: Boolean(token),
			loading,
			login,
			logout,
		}),
		[token, loading]
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error('useAuth must be used within an AuthProvider')
	}

	return context
}
