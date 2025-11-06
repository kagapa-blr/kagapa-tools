// static/js/apiClient.js

export const BASE_URL = "http://127.0.0.1:5000";

const defaultHeaders = {
    "Content-Type": "application/json"
};

// Build full URL with optional query params
const buildUrl = (endpoint, params = {}) => {
    const url = new URL(endpoint, BASE_URL);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
};

// Main fetch request
const apiClient = {
    request: async ({ method, endpoint, body = null, params = {}, headers = {} }) => {
        const url = buildUrl(endpoint, params);
        const options = {
            method: method.toUpperCase(),
            headers: { ...defaultHeaders, ...headers }
        };

        // Handle body
        if (body && method.toUpperCase() !== "GET") {
            if (body instanceof FormData) {
                options.body = body;
                delete options.headers["Content-Type"]; // browser handles it
            } else {
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(url, options);

        // Always parse JSON if possible
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Throw error for non-2xx status
        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    get: (endpoint, params = {}, headers = {}) =>
        apiClient.request({ method: "GET", endpoint, params, headers }),

    post: (endpoint, body = {}, headers = {}) =>
        apiClient.request({ method: "POST", endpoint, body, headers }),

    put: (endpoint, body = {}, headers = {}) =>
        apiClient.request({ method: "PUT", endpoint, body, headers }),

    patch: (endpoint, body = {}, headers = {}) =>
        apiClient.request({ method: "PATCH", endpoint, body, headers }),

    delete: (endpoint, body = {}, headers = {}) =>
        apiClient.request({ method: "DELETE", endpoint, body, headers }),
};

export default apiClient;