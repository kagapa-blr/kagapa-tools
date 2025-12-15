const ACCESS_TOKEN_KEY = "access_token";

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const setAccessToken = (token) => token && localStorage.setItem(ACCESS_TOKEN_KEY, token);
export const clearAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

const defaultHeaders = { "Content-Type": "application/json", "Accept": "application/json" };

const apiClient = {
    request: async ({ method, endpoint, body = null, params = {}, headers = {} }) => {
        const url = new URL(endpoint, window.location.origin);
        Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.append(k, v));

        const finalHeaders = { ...defaultHeaders, ...headers };
        const token = getAccessToken();
        if (token && !finalHeaders.Authorization) finalHeaders.Authorization = `Bearer ${token}`;

        const options = { method: method.toUpperCase(), headers: finalHeaders, credentials: "same-origin" };
        if (body && options.method !== "GET") options.body = body instanceof FormData ? body : JSON.stringify(body);

        const response = await fetch(url.toString(), options);
        let data = null;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) data = await response.json().catch(() => null);
        else data = await response.text().catch(() => null);
        if (response.status === 401) clearAccessToken();
        if (!response.ok) { const error = new Error(data?.message || `HTTP ${response.status}`); error.status = response.status; error.data = data; throw error; }
        return data;
    },
    get(endpoint, params = {}, headers = {}) { return this.request({ method: "GET", endpoint, params, headers }); },
    post(endpoint, body = {}, headers = {}) { return this.request({ method: "POST", endpoint, body, headers }); },
    put(endpoint, body = {}, headers = {}) { return this.request({ method: "PUT", endpoint, body, headers }); },
    patch(endpoint, body = {}, headers = {}) { return this.request({ method: "PATCH", endpoint, body, headers }); },
    delete(endpoint, body = null, headers = {}) { return this.request({ method: "DELETE", endpoint, body, headers }); }
};

export default apiClient;
