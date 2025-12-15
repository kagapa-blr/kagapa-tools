import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";
import { showLoader, hideLoader } from "./loader.js";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorBox = document.getElementById("login-error");

    if (!form) return;

    const urlParams = new URLSearchParams(window.location.search);
    let nextUrl = urlParams.get("next") || "/";
    if (
        nextUrl.startsWith("/api") ||
        nextUrl.includes("/login") ||
        nextUrl.includes("undefined")
    ) {
        nextUrl = "/";
    }

    // 🔐 Already logged in
    const token = localStorage.getItem("access_token");
    if (token) {
        showLoader();
        apiClient.get(API_ENDPOINTS.AUTH.ME)
            .then(() => window.location.replace(nextUrl))
            .catch(() => {
                localStorage.removeItem("access_token");
                hideLoader();
            });
        return;
    }

    // 📝 Login submit
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideError();

        const username = form.username.value.trim();
        const password = form.password.value.trim();

        if (!username || !password) {
            return showError("Please enter both username and password.");
        }

        showLoader();

        try {
            const res = await apiClient.post(
                API_ENDPOINTS.AUTH.LOGIN,
                { username, password, next: nextUrl }
            );

            if (res?.success) {
                if (res.access_token) {
                    localStorage.setItem("access_token", res.access_token);
                }
                window.location.replace(res.redirect_to || nextUrl);
            } else {
                showError(res?.message || "Login failed.");
                hideLoader();
            }
        } catch (err) {
            showError(err?.data?.message || err.message || "Login failed.");
            hideLoader();
        }
    });

    function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.remove("d-none");
    }

    function hideError() {
        errorBox.textContent = "";
        errorBox.classList.add("d-none");
    }
});
