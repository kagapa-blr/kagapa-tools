from datetime import datetime
import pytz
from sqlalchemy import Column, Integer, String, DateTime, Boolean, text
from app.config.database import kagapa_tools_db as db

# IST timezone
IST = pytz.timezone("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


# ======================================================
# Main Dictionary (Standard / Verified)
# ======================================================
class MainDictionary(db.Model):
    __tablename__ = "main_dictionary"
    __table_args__ = {
        "mysql_engine": "InnoDB",
        "mysql_charset": "utf8mb4",
        "mysql_collate": "utf8mb4_unicode_ci"
    }

    id = Column(Integer, primary_key=True, autoincrement=True)

    word = Column(
        String(255, collation="utf8mb4_unicode_ci"),
        nullable=False,
        unique=True,
        index=True
    )

    frequency = Column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1")
    )

    added_by = Column(
        String(100, collation="utf8mb4_unicode_ci"),
        nullable=True
    )

    verified = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true")
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ist_now,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ist_now,
        onupdate=ist_now,
        server_default=text("CURRENT_TIMESTAMP")
    )

    def __repr__(self):
        return f"<MainDictionary word='{self.word}' frequency={self.frequency}>"


# ======================================================
# User Added Words (Unverified / User Dictionary)
# ======================================================
class UserAddedWord(db.Model):
    __tablename__ = "user_added_words"
    __table_args__ = {
        "mysql_engine": "InnoDB",
        "mysql_charset": "utf8mb4",
        "mysql_collate": "utf8mb4_unicode_ci"
    }

    id = Column(Integer, primary_key=True, autoincrement=True)

    word = Column(
        String(255, collation="utf8mb4_unicode_ci"),
        nullable=False,
        unique=True,
        index=True
    )

    frequency = Column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1")
    )

    added_by = Column(
        String(100, collation="utf8mb4_unicode_ci"),
        nullable=True
    )

    verified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false")
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ist_now,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=ist_now,
        onupdate=ist_now,
        server_default=text("CURRENT_TIMESTAMP")
    )

    def __repr__(self):
        return f"<UserAddedWord word='{self.word}' frequency={self.frequency}>"
