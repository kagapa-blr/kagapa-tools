import os
import uuid
from datetime import datetime
import pandas as pd
from werkzeug.utils import secure_filename
from app.utils.logger import setup_logger
from app.utils.word_sort_tools import extract_words_from_file, sort_lowest_highest_words

# Base folder for all results
BASE_RESULT_FOLDER = os.path.join("user_uploaded", "sorted_results")
os.makedirs(BASE_RESULT_FOLDER, exist_ok=True)

logger = setup_logger(name='sort-doc')

def get_today_folder():
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_folder = os.path.join(BASE_RESULT_FOLDER, today_str)
    os.makedirs(today_folder, exist_ok=True)
    return today_folder


def cleanup_old_folders():
    today_str = datetime.now().strftime("%Y-%m-%d")
    for folder in os.listdir(BASE_RESULT_FOLDER):
        folder_path = os.path.join(BASE_RESULT_FOLDER, folder)
        if folder != today_str and os.path.isdir(folder_path):
            try:
                for f in os.listdir(folder_path):
                    os.remove(os.path.join(folder_path, f))
                os.rmdir(folder_path)
            except Exception as e:
                logger.warning(f"Failed to delete {folder_path}: {e}")


def allowed_file(filename):
    return filename.lower().endswith(('.docx', '.txt'))


def create_csv(words_list, prefix, folder="."):
    os.makedirs(folder, exist_ok=True)
    filename = f"{prefix}_{uuid.uuid4().hex}.csv"
    filepath = os.path.join(folder, filename)
    df = pd.DataFrame(words_list, columns=["word"])
    df.to_csv(filepath, index=False, encoding="utf-8")
    return filename, filepath


def process_uploaded_file(file, original_filename):
    cleanup_old_folders()

    today_folder = get_today_folder()
    today_str = os.path.basename(today_folder)

    raw_name, ext = os.path.splitext(original_filename)
    safe_name = secure_filename(raw_name) or "file"
    base_name = safe_name[:10]
    ext = ext.lstrip(".") or "docx"

    saved_filename = f"{base_name}_{uuid.uuid4().hex}.{ext}"
    saved_file_path = os.path.join(today_folder, saved_filename)
    file.save(saved_file_path)
    logger.info(f"Uploaded file saved: {saved_file_path}")

    words_unique, total_count = extract_words_from_file(saved_file_path)
    lowest, highest, min_len, max_len = sort_lowest_highest_words(words_unique)

    lowest_file, lowest_path = create_csv(lowest, f"{base_name}_lowest", folder=today_folder)
    highest_file, highest_path = create_csv(highest, f"{base_name}_highest", folder=today_folder)

    logger.info(f"Lowest words CSV: {lowest_path}")
    logger.info(f"Highest words CSV: {highest_path}")

    return {
        "original_file": f"/api/v1/sort-doc/download/{today_str}/{os.path.basename(saved_filename)}",
        "total_word_count": total_count,
        "unique_word_count": len(words_unique),
        "min_word_length": min_len,
        "max_word_length": max_len,
        "download_lowest_url": f"/api/v1/sort-doc/download/{today_str}/{os.path.basename(lowest_file)}",
        "download_highest_url": f"/api/v1/sort-doc/download/{today_str}/{os.path.basename(highest_file)}",
    }
