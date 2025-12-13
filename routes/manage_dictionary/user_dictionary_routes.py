from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from services.dictionary_manager.user_dictionary_service import UserDictionaryService

from utils.logger import setup_logger

logger = setup_logger(name="UserDictionaryRoutes")

user_dictionary_bp = Blueprint(
    "user_dictionary",
    __name__
)

ALLOWED_EXTENSIONS = {".txt", ".docx"}


def _get_ext(filename: str) -> str:
    filename = filename.lower()
    for ext in ALLOWED_EXTENSIONS:
        if filename.endswith(ext):
            return ext
    return ""


# -------------------------------------------------
# ADD USER WORD(S)
# -------------------------------------------------
@user_dictionary_bp.route("/add", methods=["POST"])
def add_user_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")
    added_by = data.get("added_by")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    result = UserDictionaryService.add(words, added_by)
    return jsonify(result), 201


# -------------------------------------------------
# LIST PENDING WORDS
# -------------------------------------------------
@user_dictionary_bp.route("/pending", methods=["GET"])
def list_pending_words():
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    words = UserDictionaryService.list_pending(limit, offset)
    return jsonify([
        {
            "word": w.word,
            "added_by": w.added_by,
            "frequency": w.frequency,
            "created_at": w.created_at.isoformat()
        } for w in words
    ])


# -------------------------------------------------
# DELETE USER WORD(S)
# -------------------------------------------------
@user_dictionary_bp.route("/delete", methods=["DELETE"])
def delete_user_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    result = UserDictionaryService.delete(words)
    return jsonify(result)


# -------------------------------------------------
# 🔥 ADMIN APPROVAL – MOVE TO MAIN DICTIONARY (bulk)
# -------------------------------------------------
@user_dictionary_bp.route("/approve", methods=["POST"])
def approve_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")
    admin_name = data.get("admin_name")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    result = UserDictionaryService.approve_and_move_to_main(
        words,
        admin_name
    )
    return jsonify(result)


# -------------------------------------------------
# 📄 FILE UPLOAD → EXTRACT WORDS & UPDATE FREQUENCY
# -------------------------------------------------
@user_dictionary_bp.route("/upload-file", methods=["POST"])
def upload_user_dictionary_file():
    """
    Accepts a .txt or .docx file, extracts text, cleans words,
    computes frequencies, and upserts into UserAddedWord.
    """
    if "file" not in request.files:
        return jsonify({"error": "file field is required"}), 400

    file = request.files["file"]

    if not file or file.filename == "":
        return jsonify({"error": "no file selected"}), 400

    ext = _get_ext(file.filename)
    if not ext:
        return jsonify({"error": "only .txt and .docx files are allowed"}), 400

    safe_name = secure_filename(file.filename)

    # If you have auth, replace this with the actual user name/id
    added_by = request.form.get("added_by")

    result = UserDictionaryBulkUploadService.process_file(
        file_obj=file,
        filename=safe_name,
        added_by=added_by,
    )

    return jsonify(result), 200
