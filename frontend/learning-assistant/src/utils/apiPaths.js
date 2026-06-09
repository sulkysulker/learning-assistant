export const API_PATHS = {
	AUTH: {
		REGISTER: '/auth/register',
		LOGIN: '/auth/login',
		ME: '/auth/me',
	},
	DASHBOARD: {
		STATS: '/dashboard/stats',
		ACTIVITIES: '/dashboard/activities',
	},
	DOCUMENTS: {
		LIST: '/documents',
		UPLOAD: '/documents/upload',
		DETAIL: (documentId) => `/documents/${documentId}`,
		FILE: (documentId) => `/documents/${documentId}/file`,
		CHAT: (documentId) => `/documents/${documentId}/chat`,
		SUMMARIZE: (documentId) => `/documents/${documentId}/summarize`,
		EXPLAIN_CONCEPT: (documentId) => `/documents/${documentId}/explain-concept`,
		FLASHCARDS: (documentId) => `/documents/${documentId}/flashcards`,
		FLASHCARDS_GENERATE: (documentId) => `/documents/${documentId}/flashcards/generate`,
		QUIZZES: (documentId) => `/documents/${documentId}/quizzes`,
		QUIZZES_GENERATE: (documentId) => `/documents/${documentId}/quizzes/generate`,
		DELETE: (documentId) => `/documents/${documentId}`,
	},
	FLASHCARDS: {
		LIST: '/flashcards',
		REVIEWED: (cardId) => `/flashcards/${cardId}/reviewed`,
		DETAIL: (setId) => `/flashcard-sets/${setId}`,
		DELETE: (setId) => `/flashcard-sets/${setId}`,
		TOGGLE_STAR: (setId, cardId) => `/flashcard-sets/${setId}/cards/${cardId}/star`,
	},
	QUIZZES: {
		DETAIL: (quizId) => `/quizzes/${quizId}`,
		SUBMIT: (quizId) => `/quizzes/${quizId}/submit`,
		RESULT: (quizId) => `/quizzes/${quizId}/result`,
		DELETE: (quizId) => `/quizzes/${quizId}`,
	},
}
