import axiosInstance from '../utils/axiosInstance'
import { API_PATHS } from '../utils/apiPaths'


export const getDocumentQuizzes = async (documentId) => {
	const response = await axiosInstance.get(API_PATHS.DOCUMENTS.QUIZZES(documentId))
	return response.data
}


export const generateDocumentQuiz = async (documentId, numQuestions = 10) => {
	const response = await axiosInstance.post(API_PATHS.DOCUMENTS.QUIZZES_GENERATE(documentId), {
		num_questions: numQuestions,
	})
	return response.data
}


export const getQuiz = async (quizId) => {
	const response = await axiosInstance.get(API_PATHS.QUIZZES.DETAIL(quizId))
	return response.data
}


export const submitQuiz = async (quizId, answers) => {
	const response = await axiosInstance.post(API_PATHS.QUIZZES.SUBMIT(quizId), { answers })
	return response.data
}


export const getQuizResult = async (quizId) => {
	const response = await axiosInstance.get(API_PATHS.QUIZZES.RESULT(quizId))
	return response.data
}


export const deleteQuiz = async (quizId) => {
	const response = await axiosInstance.delete(API_PATHS.QUIZZES.DELETE(quizId))
	return response.data
}
