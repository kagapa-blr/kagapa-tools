import os
import urllib.parse
from flask import Blueprint, request, jsonify, send_file, abort
from app.services.sortwords.sort_doc_service import allowed_file, process_uploaded_file, BASE_RESULT_FOLDER
from app.utils.logger import setup_logger

sort_doc_bp = Blueprint("sort_doc", __name__)
logger = setup_logger('sort-doc-routes')


@sort_doc_bp.route("/upload", methods=["POST"])
def sort_doc_api_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename

    if not filename or not allowed_file(filename):
        return jsonify({"error": "Only .docx and .txt files are allowed"}), 400

    result = process_uploaded_file(file, filename)
    return jsonify(result)


@sort_doc_bp.route("/download/<date>/<path:filename>", methods=["GET"])
def download_result(date, filename):
    filename = urllib.parse.unquote(filename)

    base_dir = os.path.abspath(BASE_RESULT_FOLDER)
    file_path = os.path.abspath(
        os.path.join(BASE_RESULT_FOLDER, date, filename)
    )
    logger.info(f"Download resolved path: {file_path}")
    logger.info(f"Exists: {os.path.exists(file_path)}")

    if os.path.commonpath([base_dir, file_path]) != base_dir:
        abort(403, description="Forbidden")

    if not os.path.isfile(file_path):
        abort(404, description=f"File not found: {file_path}")

    return send_file(file_path, as_attachment=True)
