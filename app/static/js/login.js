import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------------- UTILS ----------------
function getTokenFromCookie() {
    const match = document.cookie.match(new RegExp('(^| )access_token=([^;]+)'));
    return match ? match[2] : null;
}

document.addEventListener("DOMContentLoaded", () => {

    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const signupForm = document.getElementById("signup-form");
    const signupError = document.getElementById("signup-error");
    const signupSuccess = document.getElementById("signup-success");

    const urlParams = new URLSearchParams(window.location.search);
    let nextUrl = urlParams.get("next") || "/";

    if (nextUrl.startsWith("/api") || nextUrl.includes("/login") || nextUrl.includes("undefined")) {
        nextUrl = "/";
    }

    // ---------------- CHECK LOGGED IN ----------------
    const token = localStorage.getItem("access_token") || getTokenFromCookie();
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

    // ---------------- LOGIN ----------------
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideLoginError();

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value.trim();

            if (!username || !password) return showLoginError("Enter username & password.");

            showLoader();

            try {
                const res = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, { username, password, next: nextUrl });

                if (res?.success) {
                    if (res.access_token) localStorage.setItem("access_token", res.access_token);
                    window.location.replace(res.redirect_to || nextUrl);
                } else {
                    showLoginError(res?.message || "Login failed.");
                }
            } catch (err) {
                showLoginError(err?.data?.message || err.message || "Login failed.");
            } finally {
                hideLoader();
            }
        });
    }

    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove("d-none");
    }

    function hideLoginError() {
        loginError.textContent = "";
        loginError.classList.add("d-none");
    }

    // ---------------- SIGNUP ----------------
    if (!signupForm) return;

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideSignupMessages();

        const payload = {
            username: document.getElementById("su-username").value.trim(),
            password: document.getElementById("su-password").value.trim(),
            email: document.getElementById("su-email").value.trim(),
            phone: document.getElementById("su-phone").value.trim()
        };

        if (!payload.username || !payload.password) return showSignupError("Username and password are required.");

        showLoader();

        try {
            const res = await apiClient.post(API_ENDPOINTS.AUTH.SIGNUP, payload);

            if (res?.success) {
                signupSuccess.textContent = "Account created successfully. Please login.";
                signupSuccess.classList.remove("d-none");
                signupForm.reset();

                // auto-close modal
                setTimeout(() => {
                    const modalEl = document.getElementById("signupModal");
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal?.hide();
                }, 1200);

            } else {
                showSignupError(res?.message || "Signup failed.");
            }
        } catch (err) {
            showSignupError(err?.data?.message || err.message || "Signup failed.");
        } finally {
            hideLoader();
        }
    });

    function showSignupError(msg) {
        signupError.textContent = msg;
        signupError.classList.remove("d-none");
    }

    function hideSignupMessages() {
        signupError.classList.add("d-none");
        signupSuccess.classList.add("d-none");
        signupError.textContent = "";
        signupSuccess.textContent = "";
    }

});
