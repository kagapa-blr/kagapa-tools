// -----------------------------
// Token helpers
// -----------------------------
const ACCESS_TOKEN_KEY = "access_token";

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

const setAccessToken = (token) => {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

const clearAccessToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
};

// -----------------------------
// Default headers
// -----------------------------
const defaultHeaders = {
    "Content-Type": "application/json",
    "Accept": "application/json"
};

// -----------------------------
// JWT helpers (client-side decode only, NOT validation)
// -----------------------------
const base64UrlDecode = (str) => {
    try {
        str = str.replace(/-/g, "+").replace(/_/g, "/");
        const pad = str.length % 4;
        if (pad) str += "=".repeat(4 - pad);
        return atob(str);
    } catch {
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
    } catch {
        return null;
    }
};

// -----------------------------
// Main fetch wrapper
// -----------------------------
const apiClient = {
    request: async ({
        method,
        endpoint,
        body = null,
        params = {},
        headers = {}
    }) => {
        // -----------------------------
        // Build URL
        // -----------------------------
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        // -----------------------------
        // Merge headers
        // -----------------------------
        const finalHeaders = { ...defaultHeaders, ...headers };

        // -----------------------------
        // Attach JWT if present
        // -----------------------------
        const token = getAccessToken();
        if (token && !finalHeaders.Authorization) {
            finalHeaders.Authorization = `Bearer ${token}`;
        }

        const options = {
            method: method.toUpperCase(),
            headers: finalHeaders,
            credentials: "same-origin" // important for CSRF / cookies if needed later
        };

        // -----------------------------
        // Request body
        // -----------------------------
        if (body && options.method !== "GET") {
            if (body instanceof FormData) {
                options.body = body;
                delete options.headers["Content-Type"];
            } else {
                options.body = JSON.stringify(body);
            }
        }

        // -----------------------------
        // Fetch
        // -----------------------------
        const response = await fetch(url.toString(), options);

        // -----------------------------
        // Parse response safely
        // -----------------------------
        let data = null;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json().catch(() => null);
        } else {
            data = await response.text().catch(() => null);
        }

        // -----------------------------
        // Auth handling
        // -----------------------------
        if (response.status === 401) {
            // Do NOT redirect here — let caller decide
            clearAccessToken();
        }

        // -----------------------------
        // Error handling
        // -----------------------------
        if (!response.ok) {
            const error = new Error(
                data?.message || `HTTP ${response.status} ${response.statusText}`
            );
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    // -----------------------------
    // HTTP helpers
    // -----------------------------
    get(endpoint, params = {}, headers = {}) {
        return this.request({ method: "GET", endpoint, params, headers });
    },

    post(endpoint, body = {}, headers = {}) {
        return this.request({ method: "POST", endpoint, body, headers });
    },

    put(endpoint, body = {}, headers = {}) {
        return this.request({ method: "PUT", endpoint, body, headers });
    },

    patch(endpoint, body = {}, headers = {}) {
        return this.request({ method: "PATCH", endpoint, body, headers });
    },

    delete(endpoint, body = null, headers = {}) {
        return this.request({ method: "DELETE", endpoint, body, headers });
    }
};

export default apiClient;
export {
    getJwtPayload,
    getAccessToken,
    setAccessToken,
    clearAccessToken
};
