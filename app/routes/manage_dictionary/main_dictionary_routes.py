from flask import Blueprint, request, jsonify, render_template

from app.services.dictionary_manager.main_dictionary_service import MainDictionaryService
from app.utils.logger import setup_logger

logger = setup_logger(name="MainDictionaryRoutes")

main_dictionary_bp = Blueprint(
    "main_dictionary",
    __name__
)



@main_dictionary_bp.route("/dashboard", methods=["GET"])
def main_dictionary_dashboard():
    return render_template("dictionary/main_dictionary.html")


# -------------------------------------------------
# ADD WORD(S) – single or bulk
# -------------------------------------------------
@main_dictionary_bp.route("/add", methods=["POST"])
def add_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")
    added_by = data.get("added_by")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    result = MainDictionaryService.create(words, added_by)
    return jsonify(result), 201


# -------------------------------------------------
# GET SINGLE WORD
# -------------------------------------------------
@main_dictionary_bp.route("/get/<string:word>", methods=["GET"])
def get_word(word):
    entry = MainDictionaryService.get_word(word)
    if not entry:
        return jsonify({"error": "Word not found"}), 404

    return jsonify({
        "word": entry.word,
        "frequency": entry.frequency,
        "verified": entry.verified,
        "added_by": entry.added_by
    })


# -------------------------------------------------
# LIST WORDS
# -------------------------------------------------
# -------------------------------------------------
# LIST WORDS (DataTables Server-Side)
# -------------------------------------------------
@main_dictionary_bp.route("/list", methods=["GET"])
def list_words():
    draw = int(request.args.get("draw", 1))
    limit = int(request.args.get("length", 25))
    offset = int(request.args.get("start", 0))
    search_value = request.args.get("search[value]", "")

    # Get search from mainTableSearchInput (custom param)
    search = request.args.get("search", search_value)

    result = MainDictionaryService.get_all(
        limit=limit,
        offset=offset,
        search=search
    )

    return jsonify({
        "draw": draw,
        "recordsTotal": result["total"],
        "recordsFiltered": result["filtered"],
        "data": [
            {
                "word": w.word,
                "frequency": w.frequency,
                "added_by": w.added_by or "system",
                "added": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else "N/A"
            }
            for w in result["data"]
        ]
    })


# -------------------------------------------------
# INCREMENT FREQUENCY
# -------------------------------------------------
@main_dictionary_bp.route("/increment/<string:word>", methods=["POST"])
def increment_frequency(word):
    if not MainDictionaryService.increment_frequency(word):
        return jsonify({"error": "Word not found"}), 404

    return jsonify({"message": "Frequency incremented"})


# -------------------------------------------------
# DELETE WORD(S) – single or bulk
# -------------------------------------------------
@main_dictionary_bp.route("/delete", methods=["DELETE"])
def delete_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")

    if not words:
        return jsonify({"error": "word or words is required"}), 400

    result = MainDictionaryService.delete(words)
    return jsonify(result)
