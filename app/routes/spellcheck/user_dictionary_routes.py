from flask import Blueprint, request, jsonify, render_template
from sqlalchemy import or_
from werkzeug.utils import secure_filename

from app.models.spellcheck import UserAddedWord
from app.security.jwt_decorators import login_required
from app.services.spellcheck.user_dictionary_service import (
    UserDictionaryService,
    UserDictionaryBulkUploadService,
    ALLOWED_UPLOAD_EXTENSIONS,
)
from app.utils.logger import setup_logger

logger = setup_logger(name="UserDictionaryRoutes")

user_dictionary_bp = Blueprint(
    "user_dictionary",
    __name__,
    url_prefix="/api/v1/dictionary/user",  # adjust if needed
)


def _get_ext(filename: str) -> str:
    """
    Return allowed extension ('.txt' / '.docx') or ''.
    """
    filename = (filename or "").lower()
    for ext in ALLOWED_UPLOAD_EXTENSIONS:
        if filename.endswith(ext):
            return ext
    return ""


@user_dictionary_bp.route("/dashboard", methods=["GET"])
def user_dictionary_dashboard():
    return render_template("dictionary/user_dictionary.html")


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

@user_dictionary_bp.route("/pending", methods=["GET"])
@login_required
def list_pending_words():
    """
    Server-side pagination + search for DataTables.

    Query params:
      - limit: page size
      - offset: start index
      - search: optional search term (applied to word and added_by)
    """
    try:
        limit = int(request.args.get("limit", 10))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        limit = 10
        offset = 0

    search_term = (request.args.get("search") or "").strip()

    base_q = UserAddedWord.query.filter_by(verified=False)

    if search_term:
        like_term = f"%{search_term}%"
        base_q = base_q.filter(
            or_(
                UserAddedWord.word.ilike(like_term),
                UserAddedWord.added_by.ilike(like_term),
            )
        )

    total_pending = UserAddedWord.query.filter_by(verified=False).count()
    filtered_count = base_q.count()

    words = (
        base_q
        .order_by(UserAddedWord.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    data = [
        {
            "word": w.word,
            "added_by": w.added_by,
            "frequency": w.frequency,
            "created_at": w.created_at.isoformat()
        } for w in words
    ]

    return jsonify({
        "data": data,
        "recordsTotal": total_pending,
        "recordsFiltered": filtered_count,
    })

# -------------------------------------------------
# DELETE USER WORD(S)
# -------------------------------------------------
@user_dictionary_bp.route("/delete", methods=["DELETE"])
@login_required
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
@login_required
def approve_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    # 🔐 Take admin name from authenticated JWT
    admin_name = request.user.get("username")

    result = UserDictionaryService.approve_and_move_to_main(
        words,
        admin_name
    )
    return jsonify(result)


# -------------------------------------------------
# 📄 FILE UPLOAD → EXTRACT WORDS & UPDATE FREQUENCY
# -------------------------------------------------
@user_dictionary_bp.route("/upload-file", methods=["POST"])
@login_required
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

    original_name = file.filename
    original_lower = (original_name or "").lower()

    # Use original filename for extension detection (Unicode safe)
    ext = ""
    for allowed in ALLOWED_UPLOAD_EXTENSIONS:
        if original_lower.endswith(allowed):
            ext = allowed
            break

    if not ext:
        return jsonify({"error": "only .txt and .docx files are allowed"}), 400

    # Build a safe basename but KEEP the real extension (with dot)
    if "." in original_name:
        base_part = original_name.rsplit(".", 1)[0]
    else:
        base_part = original_name

    safe_base = secure_filename(base_part) or "upload"
    safe_name = f"{safe_base}{ext}"

    logger.info(
        f"Received upload: original={original_name!r}, "
        f"ext={ext!r}, safe={safe_name!r}"
    )

    added_by = request.form.get("added_by")

    try:
        result = UserDictionaryBulkUploadService.process_file(
            file_obj=file,
            filename=safe_name,  # now e.g. "upload.docx"
            added_by=added_by,
        )
    except ValueError as e:
        logger.error(f"Upload validation error: {e}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.exception(f"Unexpected error while processing upload: {e}")
        return jsonify({"error": "Internal server error"}), 500

    return jsonify(result), 200
