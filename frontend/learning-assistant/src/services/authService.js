import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'

export const registerUser = async (payload) => {
	const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, payload)
	return response.data
}

export const loginUser = async (payload) => {
	const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, payload)
	return response.data
}

export const getMyProfile = async () => {
	const response = await axiosInstance.get(API_PATHS.AUTH.ME)
	return response.data
}
