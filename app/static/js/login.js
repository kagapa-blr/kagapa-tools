import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorBox = document.getElementById("login-error");

    if (!form) return;

    // -----------------------------
    // Resolve safe redirect URL
    // -----------------------------
    const urlParams = new URLSearchParams(window.location.search);
    let nextUrl = urlParams.get("next") || "/";

    // Prevent redirect loops or unsafe URLs
    if (nextUrl.startsWith("/api") || nextUrl.includes("/login") || nextUrl.includes("undefined")) {
        nextUrl = "/";
    }

    console.log("[LOGIN] nextUrl resolved to:", nextUrl);

    // -----------------------------
    // Token exists → verify
    // -----------------------------
    const token = localStorage.getItem("access_token");
    if (token) {
        apiClient.get(API_ENDPOINTS.AUTH.ME)
            .then(() => {
                console.log("[LOGIN] Token valid, redirecting to:", nextUrl);
                window.location.replace(nextUrl);
            })
            .catch(() => {
                console.warn("[LOGIN] Token invalid, clearing");
                localStorage.removeItem("access_token");
            });
        return;
    }

    // -----------------------------
    // Login submit handler
    // -----------------------------
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();

        const username = form.username.value.trim();
        const password = form.password.value.trim();

        if (!username || !password) {
            showError("Please enter both username and password.");
            return;
        }

        // Include next URL in POST body
        const body = { username, password, next: nextUrl };

        try {
            const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, body);

            console.log("[LOGIN] API response:", res);

            if (res?.success) {
                if (res.access_token) localStorage.setItem("access_token", res.access_token);

                // Use backend-provided redirect_to or fallback
                window.location.replace(res.redirect_to || nextUrl);
            } else {
                showError(res?.message || "Login failed.");
            }
        } catch (err) {
            console.error("[LOGIN] Login error:", err);
            showError(err?.data?.message || err.message || "Login failed.");
        }
    });

    // -----------------------------
    // UI helpers
    // -----------------------------
    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("d-none");
    }

    function hideError() {
        errorBox.textContent = "";
        errorBox.classList.add("d-none");
    }
});
