/**
 * Kagapa Tools – Language Switcher
 * --------------------------------
 * Default Language: Kannada (kn)
 */

(function () {
    const DEFAULT_LANG = 'kn';   // ✅ Kannada default
    const STORAGE_KEY = 'kagapa_language';
    const LANG_PATH = '/static/language-switch/';

    const langButtons = document.querySelectorAll('[data-lang-btn]');
    const translatableNodes = document.querySelectorAll('[data-i18n]');

    async function loadLanguage(lang) {
        try {
            const response = await fetch(`${LANG_PATH}${lang}.json`, {
                cache: 'no-store'
            });

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

            if (lang !== DEFAULT_LANG) {
                loadLanguage(DEFAULT_LANG);
            }
        }
    }

    function applyTranslations(translations) {
        translatableNodes.forEach(node => {
            const key = node.getAttribute('data-i18n');
            const text = resolveKey(translations, key);

            if (text) {
                node.textContent = text;
            }
        });
    }

    function resolveKey(obj, path) {
        return path.split('.').reduce((acc, key) => {
            return acc && acc[key] ? acc[key] : null;
        }, obj);
    }

    function updateUIState(lang) {
        langButtons.forEach(btn => {
            btn.classList.toggle(
                'active',
                btn.getAttribute('data-lang-btn') === lang
            );
        });
    }

    function init() {
        // ✅ Kannada first, then saved preference
        const savedLang = localStorage.getItem(STORAGE_KEY);
        const initialLang = savedLang || DEFAULT_LANG;

        loadLanguage(initialLang);

        langButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang-btn');
                loadLanguage(lang);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
