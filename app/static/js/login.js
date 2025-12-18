import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";
import { showLoader, hideLoader } from "./loader.js";

// ---------------- UTILS ----------------
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[0-9]{7,15}$/;
    return re.test(phone);
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginError = document.getElementById("login-error");
    const signupForm = document.getElementById("signup-form");
    const signupError = document.getElementById("signup-error");
    const signupSuccess = document.getElementById("signup-success");

    let urlParams = new URLSearchParams(window.location.search);
    let nextUrl = urlParams.get("next") || "/";

    if (
        nextUrl.startsWith("/api") ||
        nextUrl.includes("/login") ||
        nextUrl.includes("undefined")
    ) {
        nextUrl = "/";
    }

    // ---------------- CHECK LOGGED IN ----------------
    showLoader();
    apiClient
        .get(API_ENDPOINTS.AUTH.ME)
        .then(() => window.location.replace(nextUrl))
        .catch(() => hideLoader());

    // ---------------- LOGIN ----------------
    if (loginForm) {
        const loginButton = loginForm.querySelector('button[type="submit"]');

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideLoginError();
            loginButton.disabled = true;

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value.trim();

            if (!username || !password) {
                showLoginError("Enter username & password.");
                loginButton.disabled = false;
                return;
            }

            showLoader();
            try {
                const res = await apiClient.post(
                    API_ENDPOINTS.AUTH.LOGIN,
                    { username, password, next: nextUrl }
                );

                if (res?.success) {
                    window.location.replace(res.redirect_to || nextUrl);
                } else {
                    showLoginError(res?.message || "Login failed.");
                }
            } catch (err) {
                showLoginError(err?.data?.message || err.message || "Login failed.");
            } finally {
                hideLoader();
                loginButton.disabled = false;
            }
        });
    }

    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove("d-none");
        loginError.setAttribute("role", "alert");
    }

    function hideLoginError() {
        loginError.textContent = "";
        loginError.classList.add("d-none");
        loginError.removeAttribute("role");
    }

    // ---------------- SIGNUP ----------------
    if (signupForm) {
        const signupButton = signupForm.querySelector('button[type="submit"]');

        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            hideSignupMessages();
            signupButton.disabled = true;

            const payload = {
                username: document.getElementById("su-username").value.trim(),
                password: document.getElementById("su-password").value.trim(),
                email: document.getElementById("su-email").value.trim(),
                phone: document.getElementById("su-phone").value.trim()
            };

            if (!payload.username || !payload.password) {
                showSignupError("Username and password are required.");
                signupButton.disabled = false;
                return;
            }

            if (payload.email && !isValidEmail(payload.email)) {
                showSignupError("Enter a valid email address.");
                signupButton.disabled = false;
                return;
            }

            if (payload.phone && !isValidPhone(payload.phone)) {
                showSignupError("Enter a valid phone number.");
                signupButton.disabled = false;
                return;
            }

            showLoader();
            try {
                const res = await apiClient.post(
                    API_ENDPOINTS.AUTH.SIGNUP,
                    payload
                );

                if (res?.success) {
                    signupSuccess.textContent =
                        "Account created successfully. Please login.";
                    signupSuccess.classList.remove("d-none");
                    signupSuccess.setAttribute("role", "alert");
                    signupForm.reset();

                    setTimeout(() => {
                        const modalEl = document.getElementById("signupModal");
                        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
                    }, 1200);
                } else {
                    showSignupError(res?.message || "Signup failed.");
                }
            } catch (err) {
                showSignupError(err?.data?.message || err.message || "Signup failed.");
            } finally {
                hideLoader();
                signupButton.disabled = false;
            }
        });
    }

    function showSignupError(msg) {
        signupError.textContent = msg;
        signupError.classList.remove("d-none");
        signupError.setAttribute("role", "alert");
    }

    function hideSignupMessages() {
        signupError.classList.add("d-none");
        signupSuccess.classList.add("d-none");
        signupError.textContent = "";
        signupSuccess.textContent = "";
        signupError.removeAttribute("role");
        signupSuccess.removeAttribute("role");
    }
});
