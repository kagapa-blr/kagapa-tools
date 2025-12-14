import os
import uuid
from datetime import datetime
import pandas as pd
from app.utils.word_sort_tools import extract_words_from_file, sort_lowest_highest_words

BASE_RESULT_FOLDER = os.path.join("user_uploaded", "sorted_results")
os.makedirs(BASE_RESULT_FOLDER, exist_ok=True)


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
                print(f"Failed to delete {folder_path}: {e}")


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

    base_name = os.path.splitext(original_filename)[0][:10]  # first 10 chars
    ext = original_filename.split(".")[-1]
    saved_filename = f"{base_name}_{uuid.uuid4().hex}.{ext}"
    saved_file_path = os.path.join(today_folder, saved_filename)
    file.save(saved_file_path)

    # Extract & sort words
    words_unique, total_count = extract_words_from_file(saved_file_path)
    lowest, highest, min_len, max_len = sort_lowest_highest_words(words_unique)

    # Save CSVs
    lowest_file, _ = create_csv(lowest, f"{base_name}_lowest", folder=today_folder)
    highest_file, _ = create_csv(highest, f"{base_name}_highest", folder=today_folder)

    today_str = datetime.now().strftime('%Y-%m-%d')

    return {
        "original_file": f"/sort-doc/download/{today_str}/{saved_filename}",
        "total_word_count": total_count,
        "unique_word_count": len(words_unique),
        "min_word_length": min_len,
        "max_word_length": max_len,
        "download_lowest_url": f"/sort-doc/download/{today_str}/{lowest_file}",
        "download_highest_url": f"/sort-doc/download/{today_str}/{highest_file}"
    }
