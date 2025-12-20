from datetime import datetime
import pytz
from sqlalchemy import Column, Integer, String, DateTime, Boolean, text
from app.config.database import kagapa_tools_db as db

# IST timezone
IST = pytz.timezone("Asia/Kolkata")


def ist_now():
    return datetime.now(IST)


class MainDictionary(db.Model):
    __tablename__ = "main_dictionary"
    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(255), nullable=False, unique=True, index=True)
    frequency = Column(
        Integer,
        nullable=False,
        default=1,
        server_default=text("1")
    )
    added_by = Column(String(100), nullable=True)

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


class UserAddedWord(db.Model):
    __tablename__ = "user_added_words"

    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(255), nullable=False, unique=True)
    frequency = Column(Integer, default=1, nullable=False)
    added_by = Column(String(100), nullable=True)  # username or user_id
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST),
                        onupdate=lambda: datetime.now(IST))

    def __repr__(self):
        return f"<UserAddedWord(word='{self.word}', frequency={self.frequency})>"
