import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'

export const registerUser = async (payload) => {
	const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, payload)
	return response.data
}

export const loginUser = async ({ username, password }) => {
	const formData = new URLSearchParams()
	formData.append('username', username)
	formData.append('password', password)

	const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, formData, {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})
	return response.data
}

export const getMyProfile = async () => {
	const response = await axiosInstance.get(API_PATHS.AUTH.ME)
	return response.data
}
