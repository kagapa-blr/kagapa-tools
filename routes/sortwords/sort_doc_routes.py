import os
import uuid

from flask import Blueprint, request, jsonify, render_template, send_file

from security.jwt_decorators import login_required
from utils.word_sort_tools import extract_words_from_file, sort_lowest_highest_words, create_csv

sort_doc_bp = Blueprint("sort_doc", __name__)

RESULT_FOLDER = "sorted_results"
os.makedirs(RESULT_FOLDER, exist_ok=True)


@sort_doc_bp.route("/", methods=["GET"])
@login_required
def sort_doc_ui():
    return render_template("sortwords/upload_sort.html")


def allowed_file(filename):
    return filename.lower().endswith(('.docx', '.txt'))


@sort_doc_bp.route("/api/upload", methods=["POST"])
def sort_doc_api_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    filename = file.filename.lower()

    if not allowed_file(filename):
        return jsonify({"error": "Only .docx and .txt files are allowed"}), 400

    ext = filename.split(".")[-1]
    temp_name = f"temp_{uuid.uuid4()}.{ext}"
    temp_path = os.path.join(RESULT_FOLDER, temp_name)
    file.save(temp_path)

    # Extract & sort
    words_unique, total_count = extract_words_from_file(temp_path)
    lowest, highest, min_len, max_len = sort_lowest_highest_words(words_unique)

    # Create CSVs
    lowest_file = create_csv(lowest, "lowest")
    highest_file = create_csv(highest, "highest")

    # Cleanup
    if os.path.exists(temp_path):
        os.remove(temp_path)
    return jsonify({
        "total_word_count": total_count,
        "unique_word_count": len(words_unique),
        "min_word_length": min_len,
        "max_word_length": max_len,
        "download_lowest_url": f"/sort-doc/download/{lowest_file}",
        "download_highest_url": f"/sort-doc/download/{highest_file}"
    })


@sort_doc_bp.route("/download/<filename>", methods=["GET"])
def download_result(filename):
    file_path = os.path.join(RESULT_FOLDER, filename)
    if not os.path.exists(file_path):
        return "File not found", 404
    return send_file(file_path, as_attachment=True)
