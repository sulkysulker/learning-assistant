import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'

export const getDocuments = async () => {
	const response = await axiosInstance.get(API_PATHS.DOCUMENTS.LIST)
	return response.data
}

export const uploadDocument = async (file, onUploadProgress) => {
	const formData = new FormData()
	formData.append('file', file)

	const response = await axiosInstance.post(API_PATHS.DOCUMENTS.UPLOAD, formData, {
		headers: {
			'Content-Type': 'multipart/form-data',
		},
		onUploadProgress,
	})

	return response.data
}

export const deleteDocument = async (documentId) => {
	const response = await axiosInstance.delete(API_PATHS.DOCUMENTS.DELETE(documentId))
	return response.data
}
