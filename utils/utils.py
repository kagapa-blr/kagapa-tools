# services/dictionary_manager/utils.py
import unicodedata

def normalize_word(word: str) -> str:
    """
    Unicode normalization for Kannada & mixed-language words
    """
    return unicodedata.normalize("NFC", word.strip())
