// Base URL for all API calls
export const BASE_URL = "http://127.0.0.1:5000";

// -----------------------------
// API Endpoints
// -----------------------------
const API_ENDPOINTS = {

    // -----------------------------
    // Authentication
    // -----------------------------
    AUTH: {
        LOGIN: `${BASE_URL}/api/auth/login`,
        LOGOUT: `${BASE_URL}/api/auth/logout`,
    },

    // -----------------------------
    // User Management
    // -----------------------------
    USERS: {
        SIGNUP: `${BASE_URL}/users/signup`,
        LIST: `${BASE_URL}/users/`,
        GET: (userId) => `${BASE_URL}/users/${userId}`,
        UPDATE: (userId) => `${BASE_URL}/users/${userId}`,
        DEACTIVATE: (userId) => `${BASE_URL}/users/${userId}/deactivate`,
        ACTIVATE: (userId) => `${BASE_URL}/users/${userId}/activate`,
    },

    // -----------------------------
    // Document Sorting
    // -----------------------------
    SORT_DOC: {
        SORT_DOC: `${BASE_URL}/sort-doc`,
        UPLOAD_FILE: `${BASE_URL}/sort-doc/api/upload`,
    },

    // -----------------------------
    // 📚 Dictionary – MAIN
    // -----------------------------
    MAIN_DICTIONARY: {
        ADD: `${BASE_URL}/api/v1/dictionary/main/add`,
        LIST: `${BASE_URL}/api/v1/dictionary/main/list`,
        GET: (word) =>
            `${BASE_URL}/api/v1/dictionary/main/get/${encodeURIComponent(word)}`,
        DELETE: `${BASE_URL}/api/v1/dictionary/main/delete`,
        INCREMENT: (word) =>
            `${BASE_URL}/api/v1/dictionary/main/increment/${encodeURIComponent(word)}`,
    },

    // -----------------------------
    // 🧑‍💻 Dictionary – USER (Pending / Review)
    // -----------------------------
    USER_DICTIONARY: {
        ADD: `${BASE_URL}/api/v1/dictionary/user/add`,
        LIST_PENDING: `${BASE_URL}/api/v1/dictionary/user/pending`,
        APPROVE: `${BASE_URL}/api/v1/dictionary/user/approve`,
        DELETE: `${BASE_URL}/api/v1/dictionary/user/delete`,
    },

    // -----------------------------
    // Add more modules/endpoints here
    // -----------------------------
};

export default API_ENDPOINTS;
