from sqlalchemy.exc import IntegrityError
from app.config.database import kagapa_tools_db as db
from app.models.spellcheck import MainDictionary
from app.utils.logger import setup_logger
from app.utils.utils import normalize_word, MainDictionaryBloom

logger = setup_logger(name="MainDictionaryService")


class MainDictionaryService:

    # -------------------------------------------------
    # CREATE (DB ONLY)
    # -------------------------------------------------
    @staticmethod
    def create(words, added_by: str | None = None) -> dict:
        if isinstance(words, str):
            words = [words]

        result = {
            "created": [],
            "skipped": []
        }

        for raw_word in words:
            word = normalize_word(raw_word)

            entry = MainDictionary(
                word=word,
                added_by=added_by,
                verified=True
            )

            try:
                db.session.add(entry)
                db.session.commit()
                logger.info(f"Main dictionary word added: {word}")
                result["created"].append(word)

            except IntegrityError:
                db.session.rollback()
                logger.warning(f"Duplicate main dictionary word: {word}")
                result["skipped"].append(word)

        return result

    # -------------------------------------------------
    # FAST EXISTENCE CHECK
    # -------------------------------------------------
    @staticmethod
    def exists_fast(word: str) -> bool:
        if not MainDictionaryBloom.might_exist(word):
            return False
        return MainDictionaryService.get_word(word) is not None

    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    @staticmethod
    def get_word(word: str) -> MainDictionary | None:
        return MainDictionary.query.filter_by(
            word=normalize_word(word)
        ).first()

    @staticmethod
    def get_all(
            limit: int = 100,
            offset: int = 0,
            search: str | None = None
    ):
        base_query = MainDictionary.query

        total_records = base_query.count()

        if search:
            base_query = base_query.filter(
                MainDictionary.word.ilike(f"%{search}%")
            )

        filtered_records = base_query.count()

        data = (
            base_query
            .order_by(MainDictionary.frequency.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return {
            "total": total_records,
            "filtered": filtered_records,
            "data": data
        }

    # -------------------------------------------------
    # UPDATE
    # -------------------------------------------------
    @staticmethod
    def increment_frequency(word: str) -> bool:
        entry = MainDictionaryService.get_word(word)
        if not entry:
            return False

        entry.frequency += 1
        db.session.commit()
        return True

    # -------------------------------------------------
    # DELETE (DB ONLY)
    # -------------------------------------------------
    @staticmethod
    def delete(words) -> dict:
        if isinstance(words, str):
            words = [words]

        result = {
            "deleted": [],
            "not_found": []
        }

        for raw_word in words:
            word = normalize_word(raw_word)
            entry = MainDictionaryService.get_word(word)

            if not entry:
                result["not_found"].append(word)
                continue

            db.session.delete(entry)
            db.session.commit()
            logger.info(f"Main dictionary word deleted: {word}")
            result["deleted"].append(word)

        return result
