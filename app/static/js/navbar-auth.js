import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";

/**
 * Navbar authentication state handler
 * - Shows Login / User dropdown
 * - Loads username & avatar
 * - Fetches profile data on-demand for modal
 */

document.addEventListener("DOMContentLoaded", async () => {
    const loginBtn = document.getElementById("loginBtn");
    const userDropdown = document.getElementById("userDropdown");
    const usernameLabel = document.getElementById("usernameLabel");
    const userAvatar = document.getElementById("userAvatar");

    try {
        const data = await apiClient.get(API_ENDPOINTS.AUTH.ME);

        if (data?.success && data.user) {
            const user = data.user;

            // Toggle navbar state
            loginBtn?.classList.add("d-none");
            userDropdown?.classList.remove("d-none");

            const username = user.username || "User";
            usernameLabel.textContent = username;
            userAvatar.textContent = username.charAt(0).toUpperCase();
        }
    } catch (err) {
        // Not logged in / session expired
        loginBtn?.classList.remove("d-none");
        userDropdown?.classList.add("d-none");
    }
});

/**
 * Opens profile modal and fetches user data from API
 * Called from navbar button: onclick="openProfileModal()"
 */
async function openProfileModal() {
    try {
        const data = await apiClient.get(API_ENDPOINTS.AUTH.ME);

        if (!data?.success || !data.user) return;

        const user = data.user;

        document.getElementById("profileUsername").textContent =
            user.username || "-";

        document.getElementById("profileRole").textContent =
            user.role || "User";

        const statusEl = document.getElementById("profileStatus");
        if (user.is_active) {
            statusEl.textContent = "Active";
            statusEl.className = "badge bg-success";
        } else {
            statusEl.textContent = "Inactive";
            statusEl.className = "badge bg-secondary";
        }

        const modal = new bootstrap.Modal(
            document.getElementById("profileModal")
        );
        modal.show();

    } catch (err) {
        console.error("Failed to load profile", err);
    }
}

// Expose function globally for inline HTML usage
window.openProfileModal = openProfileModal;
