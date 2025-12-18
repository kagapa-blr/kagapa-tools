import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";
document.addEventListener("DOMContentLoaded", async () => {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdown = document.getElementById("userDropdown");
    const usernameLabel = document.getElementById("usernameLabel");
    const userAvatar = document.getElementById("userAvatar");
    const logoutBtn = document.getElementById("logoutBtn");

    try {
        const data = await apiClient.get(API_ENDPOINTS.AUTH.ME);

        // Show user info if logged in
        if (data.success && data.user) {
            loginBtn?.classList.add("d-none");
            userDropdown?.classList.remove("d-none");

            const username = data.user.username || "User";
            usernameLabel.textContent = username;
            userAvatar.textContent = username[0].toUpperCase();
        }

    } catch (err) {
        // Do nothing — apiClient already redirected on 401/403
    }
});
