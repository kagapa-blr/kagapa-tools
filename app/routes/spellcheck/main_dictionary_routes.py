from flask import Blueprint, request, jsonify

from app.services.spellcheck.main_dictionary_service import MainDictionaryService
from app.security.jwt_decorators import login_required
from app.utils.logger import setup_logger
from app.utils.utils import MainDictionaryBloom

logger = setup_logger(name="MainDictionaryRoutes")

main_dictionary_bp = Blueprint(
    "main_dictionary",
    __name__
)


# -------------------------------------------------
# ADD WORD(S) – single or bulk
# -------------------------------------------------
@main_dictionary_bp.route("/add", methods=["POST"])
@login_required
def add_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")

    if not words:
        logger.warning("Add words failed: no word(s) provided")
        return jsonify({"error": "word or words is required"}), 400

    added_by = request.user.get("username")

    logger.info(
        "Adding word(s) to main dictionary | added_by=%s | words=%s",
        added_by, words
    )

    result = MainDictionaryService.create(words, added_by)

    logger.info(
        "Add words result | added_by=%s | created=%s | skipped=%s",
        added_by,
        result.get("created"),
        result.get("skipped")
    )

    return jsonify(result), 201


# -------------------------------------------------
# GET SINGLE WORD
# -------------------------------------------------
@main_dictionary_bp.route("/get/<string:word>", methods=["GET"])
@login_required
def get_word(word):
    logger.info("Fetching word from main dictionary | word=%s", word)

    entry = MainDictionaryService.get_word(word)
    if not entry:
        logger.warning("Word not found | word=%s", word)
        return jsonify({"error": "Word not found"}), 404

    return jsonify({
        "word": entry.word,
        "frequency": entry.frequency,
        "verified": entry.verified,
        "added_by": entry.added_by
    })


# -------------------------------------------------
# LIST WORDS (DataTables Server-Side)
# -------------------------------------------------
@main_dictionary_bp.route("/list", methods=["GET"])
@login_required
def list_words():
    draw = int(request.args.get("draw", 1))
    limit = int(request.args.get("length", 25))
    offset = int(request.args.get("start", 0))
    search_value = request.args.get("search[value]", "")
    search = request.args.get("search", search_value)

    logger.info(
        "Listing main dictionary words | limit=%s offset=%s search='%s'",
        limit, offset, search
    )

    result = MainDictionaryService.get_all(
        limit=limit,
        offset=offset,
        search=search
    )

    logger.info(
        "List words result | total=%s filtered=%s returned=%s",
        result["total"],
        result["filtered"],
        len(result["data"])
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
@login_required
def increment_frequency(word):
    logger.info(
        "Increment frequency requested | word=%s | requested_by=%s",
        word, request.user.get("username")
    )

    success = MainDictionaryService.increment_frequency(word)
    if not success:
        logger.warning("Increment failed: word not found | word=%s", word)
        return jsonify({"error": "Word not found"}), 404

    logger.info("Frequency incremented | word=%s", word)
    return jsonify({"message": "Frequency incremented"})


# -------------------------------------------------
# DELETE WORD(S) – single or bulk
# -------------------------------------------------
@main_dictionary_bp.route("/delete", methods=["DELETE"])
@login_required
def delete_words():
    data = request.get_json() or {}
    words = data.get("words") or data.get("word")

    if not words:
        logger.warning("Delete failed: no word(s) provided")
        return jsonify({"error": "word or words is required"}), 400

    logger.info(
        "Delete words requested | requested_by=%s | words=%s",
        request.user.get("username"),
        words
    )

    result = MainDictionaryService.delete(words)

    logger.info(
        "Delete words result | deleted=%s | not_found=%s",
        result.get("deleted"),
        result.get("not_found")
    )

    return jsonify(result)


# -------------------------------------------------
# CHECK WORD (Bloom + DB)
# -------------------------------------------------
@main_dictionary_bp.route("/check/<string:word>", methods=["GET"])
@login_required
def check_word(word):
    exists = MainDictionaryService.exists_fast(word)

    logger.info(
        "Word check | word=%s | exists=%s",
        word, exists
    )

    return jsonify({
        "word": word,
        "exists": exists
    })


# -------------------------------------------------
# INIT / RELOAD BLOOM FILTER
# -------------------------------------------------
@main_dictionary_bp.route("/bloom/reload", methods=["POST"])
@login_required
def reload_bloom():
    logger.warning(
        "Bloom filter reload triggered | requested_by=%s",
        request.user.get("username")
    )

    MainDictionaryBloom.reload_from_db()

    logger.info("MainDictionary Bloom filter successfully reloaded")

    return jsonify({
        "status": "success",
        "message": "Bloom filter reloaded"
    })


# -------------------------------------------------
# BLOOM FILTER STATS
# -------------------------------------------------
@main_dictionary_bp.route("/bloom/stats", methods=["GET"])
@login_required
def bloom_stats():
    stats = MainDictionaryBloom.stats()

    logger.info(
        "Bloom filter stats requested | requested_by=%s",
        request.user.get("username")
    )

    return jsonify(stats)
