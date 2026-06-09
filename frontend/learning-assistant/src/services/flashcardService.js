import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'


export const getDocumentFlashcardSets = async (documentId) => {
	const response = await axiosInstance.get(API_PATHS.DOCUMENTS.FLASHCARDS(documentId))
	return response.data
}


export const getUserFlashcardSets = async () => {
	const response = await axiosInstance.get(API_PATHS.FLASHCARDS.LIST)
	return response.data
}


export const markFlashcardReviewed = async (cardId) => {
	const response = await axiosInstance.patch(API_PATHS.FLASHCARDS.REVIEWED(cardId))
	return response.data
}


export const generateDocumentFlashcards = async (documentId, count = 10) => {
	const response = await axiosInstance.post(API_PATHS.DOCUMENTS.FLASHCARDS_GENERATE(documentId), { count })
	return response.data
}


export const getFlashcardSet = async (setId) => {
	const response = await axiosInstance.get(API_PATHS.FLASHCARDS.DETAIL(setId))
	return response.data
}


export const deleteFlashcardSet = async (setId) => {
	const response = await axiosInstance.delete(API_PATHS.FLASHCARDS.DELETE(setId))
	return response.data
}


export const toggleFlashcardStar = async (setId, cardId) => {
	const response = await axiosInstance.patch(API_PATHS.FLASHCARDS.TOGGLE_STAR(setId, cardId))
	return response.data
}
