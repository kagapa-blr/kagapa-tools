from sqlalchemy.exc import IntegrityError
from config.database import kagapa_tools_db as db
from models.spellcheck import UserAddedWord
from services.dictionary_manager.main_dictionary_service import MainDictionaryService
from utils.logger import setup_logger
from utils.utils import normalize_word

logger = setup_logger(name="UserDictionaryService")


class UserDictionaryService:

    # -------------------------------------------------
    # ADD (single OR bulk)
    # -------------------------------------------------
    @staticmethod
    def add(words, added_by: str | None = None) -> dict:
        if isinstance(words, str):
            words = [words]

        result = {
            "added": [],
            "skipped": []
        }

        for raw_word in words:
            word = normalize_word(raw_word)

            entry = UserAddedWord(
                word=word,
                added_by=added_by,
                verified=False
            )

            try:
                db.session.add(entry)
                db.session.commit()
                logger.info(f"User word submitted: {word}")
                result["added"].append(word)
            except IntegrityError:
                db.session.rollback()
                logger.warning(f"Duplicate user submission: {word}")
                result["skipped"].append(word)

        return result

    # -------------------------------------------------
    # READ
    # -------------------------------------------------
    @staticmethod
    def get_word(word: str) -> UserAddedWord | None:
        return UserAddedWord.query.filter_by(
            word=normalize_word(word)
        ).first()

    @staticmethod
    def list_pending(limit: int = 100, offset: int = 0):
        return (
            UserAddedWord.query
            .filter_by(verified=False)
            .order_by(UserAddedWord.created_at.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    # -------------------------------------------------
    # DELETE (single OR bulk)
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
            entry = UserDictionaryService.get_word(word)

            if not entry:
                result["not_found"].append(word)
                continue

            db.session.delete(entry)
            db.session.commit()
            logger.info(f"User word deleted: {word}")
            result["deleted"].append(word)

        return result

    # -------------------------------------------------
    # 🔥 BULK ADMIN APPROVAL → MOVE TO MAIN DICTIONARY
    # -------------------------------------------------
    @classmethod
    def approve_and_move_to_main(cls, words, admin_name: str | None = None) -> dict:
        if isinstance(words, str):
            words = [words]

        result = {
            "moved": [],
            "already_exists": [],
            "not_found": [],
            "failed": []
        }

        for raw_word in words:
            word = normalize_word(raw_word)
            user_entry = cls.get_word(word)

            if not user_entry:
                result["not_found"].append(word)
                continue

            try:
                create_result = MainDictionaryService.create(
                    word,
                    added_by=admin_name or user_entry.added_by
                )

                if word in create_result["skipped"]:
                    result["already_exists"].append(word)
                    continue

                # Preserve frequency from user dictionary
                main_entry = MainDictionaryService.get_word(word)
                main_entry.frequency = user_entry.frequency

                db.session.delete(user_entry)
                db.session.commit()

                logger.info(f"Word moved to main dictionary: {word}")
                result["moved"].append(word)

            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to move word '{word}': {e}")
                result["failed"].append(word)

        return result
