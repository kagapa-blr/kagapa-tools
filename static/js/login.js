import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js"; // centralized endpoints

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorBox = document.getElementById("login-error");

    if (!form) return;

    // -----------------------------
    // Check if already logged in
    // -----------------------------
    const token = localStorage.getItem("access_token");
    if (token) {
        showError("You are already logged in. Please logout first to login again.");
    }

    // -----------------------------
    // Form submit handler
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

        try {
            const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { username, password });

            if (res.success && res.access_token) {
                // Store JWT in localStorage
                localStorage.setItem("access_token", res.access_token);

                // Redirect to homepage or API-provided path
                window.location.href = res.redirect || "/";
            } else {
                showError(res.message || "Login failed.");
            }
        } catch (err) {
            if (err.data?.message) {
                showError(err.data.message);
            } else if (err.message) {
                showError(err.message);
            } else {
                showError("Login failed due to unknown error.");
            }
        }
    });

    // -----------------------------
    // Error UI helpers
    // -----------------------------
    function showError(msg) {
        if (!errorBox) return;
        errorBox.textContent = msg;
        errorBox.classList.remove("d-none");
    }

    function hideError() {
        if (!errorBox) return;
        errorBox.textContent = "";
        errorBox.classList.add("d-none");
    }
});
