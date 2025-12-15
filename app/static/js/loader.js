export function showLoader() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) {
        loader.classList.remove("d-none");
        loader.classList.add("d-flex");
    }
}

export function hideLoader() {
    const loader = document.getElementById("loadingOverlay");
    if (loader) {
        loader.classList.add("d-none");
        loader.classList.remove("d-flex");
    }
}
