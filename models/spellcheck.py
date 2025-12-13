from datetime import datetime
import pytz
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from config.database import kagapa_tools_db as db  # Explicit Flask-SQLAlchemy instance

# IST timezone
IST = pytz.timezone("Asia/Kolkata")


class MainDictionary(db.Model):
    __tablename__ = "main_dictionary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(255), nullable=False, unique=True)
    frequency = Column(Integer, default=1, nullable=False)
    added_by = Column(String(100), nullable=True)  # Optional: who added the word
    verified = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(IST),
                        onupdate=lambda: datetime.now(IST))

    def __repr__(self):
        return f"<MainDictionary(word='{self.word}', frequency={self.frequency})>"


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
