from docx import Document
import pandas as pd
import re
import os
import unicodedata
from datetime import datetime

RESULT_FOLDER = "sorted_results"
os.makedirs(RESULT_FOLDER, exist_ok=True)

# Match English + Kannada scripts
_WORD_RE = re.compile(r"[A-Za-z\u0C80-\u0CFF]+")

KANNADA_HALANT = "\u0CCD"  # Kannada Virama (Halant)

def count_kannada_aksharas(word):
    count = 0
    i = 0
    length = len(word)

    while i < length:
        ch = word[i]

        # Skip vowel marks / diacritics
        if unicodedata.category(ch) in ("Mn", "Mc"):
            i += 1
            continue

        # Base consonant / independent vowel increases akshara count
        count += 1
        i += 1

        # If next is halant + consonant chain, skip them
        while i < length - 1 and word[i] == KANNADA_HALANT and unicodedata.category(word[i + 1]).startswith("L"):
            # Skip halant + next consonant (conjunct cluster)
            i += 2

            # Skip following diacritics
            while i < length and unicodedata.category(word[i]) in ("Mn", "Mc"):
                i += 1

    return count

def extract_words_from_file(file_path):
    ext = file_path.lower().split(".")[-1]

    if ext == "docx":
        doc = Document(file_path)
        text = " ".join(p.text for p in doc.paragraphs)

    elif ext == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()

    else:
        return [], 0

    raw_words = _WORD_RE.findall(text)
    total_count = len(raw_words)

    normalized = [w.lower().strip() for w in raw_words if w.strip()]
    unique_words = list(dict.fromkeys(normalized))

    return unique_words, total_count


def sort_lowest_highest_words(words):
    if not words:
        return [], [], 0, 0

    # Use Kannada-aware akshara counter
    word_data = [(w, count_kannada_aksharas(w)) for w in words]

    sorted_lowest = sorted(word_data, key=lambda x: (x[1], x[0]))
    sorted_highest = sorted(word_data, key=lambda x: (-x[1], x[0]))

    min_len = sorted_lowest[0][1]
    max_len = sorted_highest[0][1]

    lowest_words = [w for w, _ in sorted_lowest]
    highest_words = [w for w, _ in sorted_highest]

    return lowest_words, highest_words, min_len, max_len


def create_csv(words, prefix):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{prefix}_length_{timestamp}.csv"
    path = os.path.join(RESULT_FOLDER, filename)

    df = pd.DataFrame([(w, count_kannada_aksharas(w)) for w in words], columns=["word", "length"])

    # UTF-8-SIG prevents Kannada text from breaking in Excel
    df.to_csv(path, index=False, encoding="utf-8-sig")

    return filename
