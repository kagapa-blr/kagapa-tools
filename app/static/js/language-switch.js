/**
 * Kagapa Tools – Language Switcher
 * --------------------------------
 * Default Language: Kannada (kn)
 */
import { showLoader, hideLoader } from "./loader.js";
import { BASE_URL } from './apiEndpoints.js';

(function () {
    const DEFAULT_LANG = 'kn';   // ✅ Default language
    const STORAGE_KEY = 'kagapa_language';
    const LANG_PATH = `${BASE_URL}/static/language-switch/`;

    const langButtons = document.querySelectorAll('[data-lang-btn]');
    const translatableNodes = document.querySelectorAll('[data-i18n]');

    // Load language JSON and apply translations
    async function loadLanguage(lang) {
        showLoader();

        try {
            const response = await fetch(`${LANG_PATH}${lang}.json`, { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Language file not found: ${lang}`);
            }

            const translations = await response.json();

            applyTranslations(translations);
            updateUIState(lang);

            document.documentElement.setAttribute('lang', lang);
            localStorage.setItem(STORAGE_KEY, lang);

        } catch (error) {
            console.error('[Language Switch]', error);

            // Fallback to default language
            if (lang !== DEFAULT_LANG) {
                await loadLanguage(DEFAULT_LANG);
            }
        } finally {
            hideLoader();
        }
    }

    // Apply translation text to all nodes
    function applyTranslations(translations) {
        translatableNodes.forEach(node => {
            const key = node.getAttribute('data-i18n');
            const text = resolveKey(translations, key);
            if (text) node.textContent = text;
        });
    }

    // Resolve nested JSON keys like 'hero.title'
    function resolveKey(obj, path) {
        return path
            .split('.')
            .reduce((acc, key) => (acc && acc[key] ? acc[key] : null), obj);
    }

    // Update active state on language buttons
    function updateUIState(lang) {
        langButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.langBtn === lang);
        });
    }

    // Initialize language switcher
    function init() {
        const savedLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
        loadLanguage(savedLang);

        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.langBtn;
                if (lang !== document.documentElement.lang) {
                    loadLanguage(lang);
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
