import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

logger = setup_logger('dbinit')

# Flask-SQLAlchemy instance (renamed to avoid conflicts)
kagapa_tools_db = SQLAlchemy()

# Environment variables
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

# MySQL URLs
MYSQL_SERVER_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}"
MYSQL_DB_URL = f"{MYSQL_SERVER_URL}/{DB_NAME}?charset=utf8mb4"


def create_database_if_not_exists():
    """
    Create MySQL database if it does not exist.
    Called during app startup.
    """
    try:
        engine = create_engine(MYSQL_SERVER_URL, echo=False)
        with engine.connect() as conn:
            result = conn.execute(text("SHOW DATABASES LIKE :db_name"), {"db_name": DB_NAME})
            if not result.scalar():
                logger.info(f"Creating database '{DB_NAME}'...")
                conn.execute(
                    text(
                        f"CREATE DATABASE `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                    )
                )
                logger.info("Database created successfully.")
            else:
                logger.info("Database already exists.")

    except OperationalError as e:
        logger.error("MySQL connection failed", exc_info=e)
        raise
    except SQLAlchemyError as e:
        logger.error("Database creation failed", exc_info=e)
        raise


def init_db(app):
    """
    Initialize SQLAlchemy with Flask app.
    """
    create_database_if_not_exists()

    app.config["SQLALCHEMY_DATABASE_URI"] = MYSQL_DB_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    kagapa_tools_db.init_app(app)

    logger.info("Database initialized with PyMySQL")
