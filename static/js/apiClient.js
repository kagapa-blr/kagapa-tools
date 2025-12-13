// -----------------------------
// Token helpers
// -----------------------------
const getAccessToken = () => localStorage.getItem("access_token");
const clearAccessToken = () => localStorage.removeItem("access_token");

// -----------------------------
// Default headers
// -----------------------------
const defaultHeaders = {
    "Content-Type": "application/json"
};



const base64UrlDecode = (str) => {
    try {
        // base64url -> base64
        str = str.replace(/-/g, "+").replace(/_/g, "/");
        // pad with '='
        const pad = str.length % 4;
        if (pad) str += "=".repeat(4 - pad);
        return atob(str);
    } catch (e) {
        return null;
    }
};

const getJwtPayload = () => {
    const token = getAccessToken();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    try {
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
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
        // Attach JWT via Authorization header if available
        // -----------------------------
        const token = getAccessToken();
        if (token && !options.headers["Authorization"]) {
            options.headers["Authorization"] = `Bearer ${token}`;

        }

        // -----------------------------
        // Handle request body
        // -----------------------------
        if (body && method.toUpperCase() !== "GET") {
            if (body instanceof FormData) {
                options.body = body;
                delete options.headers["Content-Type"]; // browser sets correct multipart type
            } else {
                options.body = JSON.stringify(body);
            }
        }

        // -----------------------------
        // Fetch request
        // -----------------------------
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
        // Handle unauthorized
        // -----------------------------
        if (response.status === 401) {
            clearAccessToken(); // clear token if invalid/expired
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
export { getJwtPayload, getAccessToken, clearAccessToken };

