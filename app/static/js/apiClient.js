const apiClient = {
    request: async ({
        method,
        endpoint,
        body = null,
        params = {},
        headers = {}
    }) => {
        const url = new URL(endpoint, window.location.origin);

        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) {
                url.searchParams.append(k, v);
            }
        });

        const isFormData = body instanceof FormData;

        const finalHeaders = {
            ...(isFormData ? {} : {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }),
            ...headers
        };

        const options = {
            method: method.toUpperCase(),
            credentials: "same-origin",
            headers: finalHeaders
        };

        if (body && options.method !== "GET") {
            options.body = isFormData ? body : JSON.stringify(body);
        }

        const response = await fetch(url.toString(), options);

        let data;
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json().catch(() => null);
        } else {
            data = await response.text().catch(() => null);
        }

        if (!response.ok) {
            const error = new Error(
                data?.error || data?.message || `HTTP ${response.status}`
            );
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    get(endpoint, params = {}, headers = {}) {
        return this.request({ method: "GET", endpoint, params, headers });
    },

    post(endpoint, body = null, headers = {}) {
        return this.request({ method: "POST", endpoint, body, headers });
    },

    put(endpoint, body = null, headers = {}) {
        return this.request({ method: "PUT", endpoint, body, headers });
    },

    patch(endpoint, body = null, headers = {}) {
        return this.request({ method: "PATCH", endpoint, body, headers });
    },

    delete(endpoint, body = null, headers = {}) {
        return this.request({ method: "DELETE", endpoint, body, headers });
    }
};

export default apiClient;
