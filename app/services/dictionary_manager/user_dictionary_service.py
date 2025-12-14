import io
import re
from collections import Counter

from docx import Document  # python-docx
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config.database import kagapa_tools_db as db
from app.models.spellcheck import UserAddedWord
from app.services.dictionary_manager.main_dictionary_service import MainDictionaryService
from app.utils.logger import setup_logger
from app.utils.utils import normalize_word

logger = setup_logger(name="UserDictionaryService")


class UserDictionaryService:
    # -------------------------------------------------
    # ADD (single OR bulk)
    # -------------------------------------------------
    @staticmethod
    def add(words, added_by: str | None = None) -> dict:
        """Add user words with atomic updates and frequency tracking."""
        if isinstance(words, str):
            words = [words]

        result = {
            "added": {},
            "updated": {},
            "skipped": []
        }

        for raw_word in words:
            word = normalize_word(raw_word)
            if not word:
                result["skipped"].append(raw_word)
                continue

            # Check existing record FIRST to determine add/update
            existing = (
                db.session.execute(
                    select(UserAddedWord).where(UserAddedWord.word == word)
                )
                .scalars()
                .first()
            )

            try:
                if existing:
                    # Update existing
                    old_freq = existing.frequency or 0
                    existing.frequency = old_freq + 1
                    if added_by and not existing.added_by:
                        existing.added_by = added_by
                    db.session.commit()
                    result["updated"][word] = existing.frequency
                    logger.info(
                        f"[UserDictionaryService] User word frequency incremented: {word} -> {existing.frequency}")
                else:
                    # Add new
                    entry = UserAddedWord(
                        word=word,
                        added_by=added_by,
                        frequency=1,
                        verified=False
                    )
                    db.session.add(entry)
                    db.session.commit()
                    result["added"][word] = 1
                    logger.info(f"[UserDictionaryService] User word added: {word}")

            except IntegrityError:
                db.session.rollback()
                existing = (
                    db.session.execute(
                        select(UserAddedWord).where(UserAddedWord.word == word)
                    )
                    .scalars()
                    .first()
                )
                if existing:
                    old_freq = existing.frequency or 0
                    existing.frequency = old_freq + 1
                    db.session.commit()
                    result["updated"][word] = existing.frequency
                    logger.info(
                        f"[UserDictionaryService] User word frequency incremented after race: {word} -> {existing.frequency}")
                else:
                    result["skipped"].append(word)
                    logger.warning(f"[UserDictionaryService] Failed to add/update: {word}")

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


# =====================================================================
# 📄 BULK UPLOAD SERVICE – .txt / .docx → WORDS + FREQUENCY → USER TABLE
# =====================================================================

ALLOWED_UPLOAD_EXTENSIONS = (".txt", ".docx")


class UserDictionaryBulkUploadService:
    """
    Service to process uploaded documents (.txt, .docx),
    extract words, compute frequencies, and update UserAddedWord table.
    """

    WORD_RE = re.compile(r"\w+", re.UNICODE)

    # -------------------------------------------------
    # TEXT EXTRACTORS
    # -------------------------------------------------
    @staticmethod
    def _extract_text_from_txt(file_obj: io.IOBase) -> str:
        """
        file_obj can be a Werkzeug FileStorage or file-like object.
        Reads from the beginning and decodes as UTF-8 if bytes.
        """
        try:
            file_obj.seek(0)
        except Exception:
            pass

        stream = getattr(file_obj, "stream", file_obj)
        data = stream.read()

        if isinstance(data, bytes):
            data = data.decode("utf-8", errors="ignore")

        return data

    @staticmethod
    def _extract_text_from_docx(file_obj: io.IOBase) -> str:
        """
        file_obj can be a Werkzeug FileStorage, file-like in binary mode,
        or anything python-docx accepts as a file-like.
        """
        if hasattr(file_obj, "stream"):
            stream = file_obj.stream
        else:
            stream = file_obj

        try:
            stream.seek(0)
        except Exception:
            pass

        document = Document(stream)
        paragraphs = [p.text for p in document.paragraphs]
        return "\n".join(paragraphs)

    # -------------------------------------------------
    # TOKENIZE + NORMALIZE
    # -------------------------------------------------
    @classmethod
    def _tokenize_and_normalize(cls, text: str) -> list[str]:
        """
        Extract word-like tokens with regex, then normalize via normalize_word.
        """
        raw_tokens = cls.WORD_RE.findall(text)
        tokens: list[str] = []

        for t in raw_tokens:
            norm = normalize_word(t)
            if norm:
                tokens.append(norm)

        return tokens

    # -------------------------------------------------
    # PUBLIC API
    # -------------------------------------------------
    @classmethod
    def process_file(
            cls,
            file_obj,
            filename: str,
            added_by: str | None = None,
    ) -> dict:
        """
        Decide reader based on filename extension, extract text, compute
        frequencies, and upsert into UserAddedWord.
        """
        filename_lower = (filename or "").lower()
        logger.info(f"Processing uploaded file: {filename_lower!r}")

        if not filename_lower.endswith(ALLOWED_UPLOAD_EXTENSIONS):
            raise ValueError(
                f"Unsupported file type: {filename!r}. Only .txt and .docx are allowed."
            )

        if filename_lower.endswith(".txt"):
            text = cls._extract_text_from_txt(file_obj)
        else:
            text = cls._extract_text_from_docx(file_obj)

        tokens = cls._tokenize_and_normalize(text)
        freq_map = Counter(tokens)

        result = {
            "file": filename,
            "total_tokens": len(tokens),
            "unique_words": len(freq_map),
            "inserted": [],
            "updated": [],
            "skipped": [],
            "errors": [],
        }

        for word, count in freq_map.items():
            try:
                existing: UserAddedWord | None = (
                    UserAddedWord.query.filter_by(word=word).first()
                )

                if existing:
                    existing.frequency = (existing.frequency or 0) + count
                    db.session.add(existing)
                    result["updated"].append(word)
                else:
                    new_entry = UserAddedWord(
                        word=word,
                        added_by=added_by,
                        verified=False,
                        frequency=count,
                    )
                    db.session.add(new_entry)
                    result["inserted"].append(word)

                db.session.commit()

            except IntegrityError as e:
                db.session.rollback()
                logger.warning(f"IntegrityError for word '{word}': {e}")
                result["skipped"].append(word)

            except Exception as e:
                db.session.rollback()
                logger.error(f"Failed to upsert word '{word}': {e}")
                result["errors"].append({"word": word, "error": str(e)})

        logger.info(
            f"Processed uploaded file '{filename}' -> "
            f"{result['total_tokens']} tokens, "
            f"{result['unique_words']} unique, "
            f"{len(result['inserted'])} inserted, "
            f"{len(result['updated'])} updated, "
            f"{len(result['errors'])} errors."
        )

        return result
