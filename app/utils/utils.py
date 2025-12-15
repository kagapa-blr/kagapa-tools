# services/spellcheck/utils.py
from datetime import datetime
from threading import Lock

import unicodedata
from rbloom import Bloom

from app.config.database import kagapa_tools_db as db
from app.models.spellcheck import MainDictionary
from app.utils.logger import setup_logger

logger = setup_logger("MainDictionaryBloom")


def normalize_word(word: str) -> str:
    """
    Unicode normalization for Kannada & mixed-language words
    """
    return unicodedata.normalize("NFC", word.strip())

class MainDictionaryBloom:
    _bloom: Bloom | None = None
    _lock = Lock()
    _count: int = 0
    _capacity: int = 0
    _error_rate: float = 0.0
    _last_reload: datetime | None = None

    DEFAULT_CAPACITY = 1_000_000
    DEFAULT_ERROR_RATE = 0.001

    # -------------------------------------------------
    # LOAD / RELOAD FROM DB
    # -------------------------------------------------
    @classmethod
    def reload_from_db(
        cls,
        capacity: int = DEFAULT_CAPACITY,
        error_rate: float = DEFAULT_ERROR_RATE
    ):
        with cls._lock:
            logger.info("Rebuilding MainDictionary Bloom Filter...")

            bloom = Bloom(capacity, error_rate)

            query = db.session.query(MainDictionary.word).yield_per(10_000)

            count = 0
            for (word,) in query:
                bloom.add(normalize_word(word))
                count += 1

            cls._bloom = bloom
            cls._count = count
            cls._capacity = capacity
            cls._error_rate = error_rate
            cls._last_reload = datetime.utcnow()

            logger.info(f"Bloom rebuild completed ({count} words loaded)")

    # -------------------------------------------------
    # LOOKUP
    # -------------------------------------------------
    @classmethod
    def might_exist(cls, word: str) -> bool:
        if not cls._bloom:
            # fail-open if not loaded yet
            return True
        return normalize_word(word) in cls._bloom

    # -------------------------------------------------
    # STATS / HEALTH
    # -------------------------------------------------
    @classmethod
    def stats(cls) -> dict:
        if not cls._bloom:
            return {"loaded": False}

        # Approximate memory usage in MB
        import math
        bits = -(cls._capacity * math.log(cls._error_rate)) / (math.log(2) ** 2)
        memory_mb = bits / 8 / 1024 / 1024

        return {
            "loaded": True,
            "capacity": cls._capacity,
            "error_rate": cls._error_rate,
            "words_loaded": cls._count,
            "memory_estimate_mb": round(memory_mb, 2),
            "last_reload_utc": cls._last_reload.isoformat() if cls._last_reload else None
        }
