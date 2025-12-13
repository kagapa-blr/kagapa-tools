// -----------------------------
// Token helpers
// -----------------------------
const getAccessToken = () => localStorage.getItem("access_token");
const clearAccessToken = () => localStorage.removeItem("access_token");

// Default headers
const defaultHeaders = {
    "Content-Type": "application/json"
};

// -----------------------------
// Main fetch wrapper
// -----------------------------
const apiClient = {
    request: async ({ method, endpoint, body = null, params = {}, headers = {} }) => {
        // Build URL with query params
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        // Merge headers
        const options = {
            method: method.toUpperCase(),
            headers: { ...defaultHeaders, ...headers }
        };

        // -----------------------------
        // Attach JWT via Authorization header
        // -----------------------------
        const token = getAccessToken();
        if (token && !options.headers["Authorization"]) {
            options.headers["Authorization"] = `Bearer ${token}`;
        }

        // -----------------------------
        // Request body
        // -----------------------------
        if (body && method.toUpperCase() !== "GET") {
            if (body instanceof FormData) {
                options.body = body;
                delete options.headers["Content-Type"]; // let browser handle multipart
            } else {
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(url.toString(), options);

        // -----------------------------
        // Parse response
        // -----------------------------
        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // -----------------------------
        // Handle auth failures
        // -----------------------------
        if (response.status === 401) {
            clearAccessToken(); // clear token if invalid/expired
            // Optional: redirect to login
            // window.location.href = "/login";
        }

        // -----------------------------
        // Throw for non-2xx
        // -----------------------------
        if (!response.ok) {
            const error = new Error(data?.message || `HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    // -----------------------------
    // HTTP helpers
    // -----------------------------
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
