import os
from flask import Blueprint, request, jsonify, render_template, send_file

from app.services.sortwords.sort_doc_service import allowed_file, process_uploaded_file, BASE_RESULT_FOLDER

sort_doc_bp = Blueprint("sort_doc", __name__)


@sort_doc_bp.route("/", methods=["GET"])
def sort_doc_ui():
    return render_template("sortwords/upload_sort.html")


@sort_doc_bp.route("/api/upload", methods=["POST"])
def sort_doc_api_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename.lower()

    if not allowed_file(filename):
        return jsonify({"error": "Only .docx and .txt files are allowed"}), 400

    result = process_uploaded_file(file, filename)
    return jsonify(result)


@sort_doc_bp.route("/download/<date>/<filename>", methods=["GET"])
def download_result(date, filename):
    file_path = os.path.join(BASE_RESULT_FOLDER, date, filename)
    if not os.path.exists(file_path):
        return "File not found", 404
    return send_file(file_path, as_attachment=True)
