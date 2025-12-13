from flask import Blueprint, request, jsonify
from services.dictionary_manager.main_dictionary_service import MainDictionaryService
from utils.logger import setup_logger

logger = setup_logger(name="MainDictionaryRoutes")

main_dictionary_bp = Blueprint(
    "main_dictionary",
    __name__
)


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
@main_dictionary_bp.route("/list", methods=["GET"])
def list_words():
    limit = int(request.args.get("limit", 100))
    offset = int(request.args.get("offset", 0))

    words = MainDictionaryService.get_all(limit, offset)
    return jsonify([
        {
            "word": w.word,
            "frequency": w.frequency
        } for w in words
    ])


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
