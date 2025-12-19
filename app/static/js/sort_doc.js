import apiClient from "./apiClient.js";
import API_ENDPOINTS from "./apiEndpoints.js";

// -----------------------------
// DOM Elements
// -----------------------------
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileNameBox = document.getElementById("fileName");
const startBtn = document.getElementById("startBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const results = document.getElementById("results");

let selectedFile = null;
let progressTimer = null;

// -----------------------------
// UI Helpers
// -----------------------------
function toggleStartButton() {
  const enabled = Boolean(selectedFile);
  startBtn.disabled = !enabled;
  startBtn.setAttribute("aria-disabled", !enabled);
}

function showMessage(msg, isError = false) {
  results.style.color = isError ? "#cc2b2b" : "#2b3755";
  results.textContent = msg;
}

function resetProgress() {
  progressBar.style.width = "0%";
  progressWrap.classList.add("d-none");
  clearInterval(progressTimer);
}

function updateProgress(percent) {
  progressBar.style.width = `${percent}%`;
}

function showProgress() {
  progressWrap.classList.remove("d-none");
  updateProgress(0);
}

function showLoading() {
  results.style.color = "#2b3755";
  results.innerHTML = `
    <div class="d-flex align-items-center justify-content-center">
      <div class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></div>
      ಪ್ರಕ್ರಿಯೆ ನಡೆಯುತ್ತಿದೆ...
    </div>`;
}

function simulateProgress() {
  let progress = 0;
  progressTimer = setInterval(() => {
    if (progress >= 95) return;
    progress += Math.random() * 10;
    updateProgress(Math.min(progress, 95));
  }, 200);
}

// -----------------------------
// File Handling
// -----------------------------
function handleFile(file) {
  if (!file) return;

  const name = file.name.toLowerCase();
  if (!(name.endsWith(".docx") || name.endsWith(".txt"))) {
    alert("'.docx' ಮತ್ತು '.txt' ಮಾತ್ರ ಅನುಮತಿಸಲಾಗಿದೆ");
    resetFileSelection();
    return;
  }

  selectedFile = file;
  fileNameBox.textContent = `📄 ${file.name}`;
  fileNameBox.classList.remove("d-none");
  showMessage("ಫೈಲ್ ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ");
  toggleStartButton();
}

function resetFileSelection() {
  selectedFile = null;
  fileNameBox.textContent = "";
  fileNameBox.classList.add("d-none");
  toggleStartButton();
}

// -----------------------------
// Drag & Drop / File Input Events
// -----------------------------
function initFileEvents() {
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keypress", (e) => {
    if ([" ", "Enter"].includes(e.key)) {
      e.preventDefault();
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
}

// -----------------------------
// Display Results
// -----------------------------
function displayResults(data) {
  results.style.transition = "opacity 0.4s ease";
  results.style.opacity = 0;

  setTimeout(() => {
    results.style.color = "#41332e";
    results.innerHTML = `
      <div><b>ಒಟ್ಟು ಪದಗಳು:</b> ${data.total_word_count}</div>
      <div><b>ಅದೇ ರೀತಿಯ ಪದಗಳು:</b> ${data.unique_word_count}</div>
      <div><b>ಅತ್ಯಂತ ಚಿಕ್ಕ ಪದದ ಗಾತ್ರ:</b> ${data.min_word_length}</div>
      <div><b>ಅತ್ಯಂತ ದೊಡ್ಡ ಪದದ ಗಾತ್ರ:</b> ${data.max_word_length}</div>
      <div class="mt-3 d-grid gap-2">
        <a class="btn btn-outline-kn w-100" href="${data.download_lowest_url}" target="_blank" rel="noopener noreferrer">
          📥 ಚಿಕ್ಕ ಪದಗಳ CSV
        </a>
        <a class="btn btn-outline-kn w-100" href="${data.download_highest_url}" target="_blank" rel="noopener noreferrer">
          📥 ದೊಡ್ಡ ಪದಗಳ CSV
        </a>
      </div>`;
    results.style.opacity = 1;
  }, 400);
}


// -----------------------------
// Upload & Process File
// -----------------------------
async function uploadFile() {
  if (!selectedFile) {
    alert("ಮೊದಲು ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ");
    return;
  }

  startBtn.disabled = true;
  showProgress();
  showLoading();

  const formData = new FormData();
  formData.append("file", selectedFile); // 👈 KEY

  try {
    simulateProgress();

    const data = await apiClient.post(
      API_ENDPOINTS.SORT_DOC.UPLOAD_FILE,
      formData
    );

    clearInterval(progressTimer);
    updateProgress(100);
    displayResults(data);

  } catch (error) {
    console.error("Upload error:", error);
    showMessage(
      error.data?.error || "ಅಪ್‌ಲೋಡ್ ದೋಷ! ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
      true
    );
  } finally {
    startBtn.disabled = false;
    setTimeout(resetProgress, 500);
  }
}




// -----------------------------
// Initialize
// -----------------------------
function init() {
  initFileEvents();
  startBtn.addEventListener("click", uploadFile);
  toggleStartButton();
}

// Run initialization on DOM ready
document.addEventListener("DOMContentLoaded", init);
