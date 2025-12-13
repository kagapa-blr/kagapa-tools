// Base URL for all API calls
export const BASE_URL = "http://127.0.0.1:5000";

// -----------------------------
// API Endpoints
// -----------------------------
const API_ENDPOINTS = {
    AUTH: {
        LOGIN: `${BASE_URL}/auth/login`,
        LOGOUT: `${BASE_URL}/auth/logout`,
    },

    USERS: {
        SIGNUP: `${BASE_URL}/manage_users/signup`,
        LIST: `${BASE_URL}/manage_users/`,
        GET: (userId) => `${BASE_URL}/manage_users/${userId}`,
        UPDATE: (userId) => `${BASE_URL}/manage_users/${userId}`,
        DEACTIVATE: (userId) => `${BASE_URL}/manage_users/${userId}/deactivate`,
        ACTIVATE: (userId) => `${BASE_URL}/manage_users/${userId}/activate`,
    },

    SORT_DOC: {
        SORT_DOC: `${BASE_URL}/sort-doc`,
        UPLOAD_FILE: `${BASE_URL}/sort-doc/api/upload`,
    },

    // Add more modules/endpoints here as needed
};

export default API_ENDPOINTS;
