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
		DELETE: (documentId) => `/documents/${documentId}`,
	},
}
