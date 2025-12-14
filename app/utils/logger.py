import logging
import os
import shutil
import zipfile
from datetime import datetime
from logging.handlers import RotatingFileHandler

from dotenv import load_dotenv

# Constants
LOG_RETENTION_DAYS = int(os.getenv('LOG_RETENTION_DAYS', 10))
ARCHIVE_RETENTION_DAYS = int(os.getenv('ARCHIVE_RETENTION_DAYS', 10))

# Load environment variables
load_dotenv()


def setup_logger(name: str = None) -> logging.Logger:
    """
    Creates and returns a configured logger.
    - Default name: __name__
    - Creates dated log folders
    - Archives logs older than LOG_RETENTION_DAYS
    - Keeps last ARCHIVE_RETENTION_DAYS archives
    """
    logger_name = name or __name__
    logger = logging.getLogger(logger_name)

    if logger.handlers:
        return logger  # Avoid duplicate handlers

    logger.setLevel(logging.DEBUG)

    base_dir = os.getcwd()
    logs_dir = os.path.join(base_dir, "logs")
    archive_dir = os.path.join(logs_dir, "archivedlogs")

    os.makedirs(logs_dir, exist_ok=True)
    os.makedirs(archive_dir, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    today_log_dir = os.path.join(logs_dir, today)
    os.makedirs(today_log_dir, exist_ok=True)

    log_file_path = os.path.join(today_log_dir, "kagapa-tools.log")

    # File handler with rotation by size (5MB)
    file_handler = RotatingFileHandler(log_file_path,
                                       maxBytes=5 * 1024 * 1024,
                                       backupCount=5,
                                       encoding="utf-8"
                                       )

    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
    file_handler.setFormatter(formatter)

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    # Archive old logs and clean up old archives
    _archive_old_logs(logs_dir, archive_dir)

    return logger


def _archive_old_logs(logs_dir: str, archive_dir: str):
    """
    Archives log folders older than LOG_RETENTION_DAYS
    and removes archived zip files older than ARCHIVE_RETENTION_DAYS
    """
    today = datetime.now()

    # ---- Archive old log folders ----
    for folder_name in os.listdir(logs_dir):
        folder_path = os.path.join(logs_dir, folder_name)

        if folder_name == "archivedlogs":
            continue
        if not os.path.isdir(folder_path):
            continue

        try:
            folder_date = datetime.strptime(folder_name, "%Y-%m-%d")
        except ValueError:
            continue  # Skip non-date folders

        if (today - folder_date).days > LOG_RETENTION_DAYS:
            zip_path = os.path.join(archive_dir, f"{folder_name}.zip")
            if not os.path.exists(zip_path):
                _zip_folder(folder_path, zip_path)
            shutil.rmtree(folder_path)

    # ---- Cleanup old archives ----
    _cleanup_old_archives(archive_dir)


def _cleanup_old_archives(archive_dir: str):
    """
    Deletes archived zip files older than ARCHIVE_RETENTION_DAYS
    """
    today = datetime.now()

    for file_name in os.listdir(archive_dir):
        if not file_name.endswith(".zip"):
            continue

        zip_path = os.path.join(archive_dir, file_name)
        try:
            archive_date = datetime.strptime(file_name.replace(".zip", ""), "%Y-%m-%d")
        except ValueError:
            continue  # Skip unexpected files

        if (today - archive_date).days > ARCHIVE_RETENTION_DAYS:
            os.remove(zip_path)


def _zip_folder(source_folder: str, zip_path: str):
    """
    Zips a folder into the archive directory
    """
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(source_folder):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_folder)
                zipf.write(file_path, arcname)
