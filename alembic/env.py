import os
import pkgutil
import importlib
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
from dotenv import load_dotenv
from app.config.database import kagapa_tools_db as db
from app.utils.logger import setup_logger

# -----------------------------
# Load environment variables
# -----------------------------
load_dotenv()
logger = setup_logger('alembic_migrations')

# -----------------------------
# Alembic Config object
# -----------------------------
config = context.config

# Configure logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# -----------------------------
# Database URL
# -----------------------------
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")

if not all([DB_USER, DB_PASSWORD, DB_NAME]):
    logger.error("Database credentials not set in environment variables")
    raise RuntimeError("Database credentials not set in environment variables")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
config.set_main_option("sqlalchemy.url", DATABASE_URL)
logger.info(f"Using database URL: {DATABASE_URL}")

# -----------------------------
# Dynamically import all models
# -----------------------------
package = importlib.import_module("app.models")
for loader, module_name, is_pkg in pkgutil.iter_modules(package.__path__):
    importlib.import_module(f"app.models.{module_name}")
logger.info("All models imported dynamically")

# -----------------------------
# Target metadata for Alembic
# -----------------------------
target_metadata = db.Model.metadata

# -----------------------------
# Offline migration
# -----------------------------
def run_migrations_offline():
    logger.info("Starting offline migration...")
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()
    logger.info("Offline migration completed successfully.")

# -----------------------------
# Online migration
# -----------------------------
def run_migrations_online():
    logger.info("Starting online migration...")
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,      # Detect column type changes
            render_as_batch=True,   # Safe for MySQL ALTER TABLE
        )
        with context.begin_transaction():
            context.run_migrations()
    logger.info("Online migration completed successfully.")

# -----------------------------
# Run migrations based on mode
# -----------------------------
if context.is_offline_mode():
    logger.info("Alembic running in OFFLINE mode")
    run_migrations_offline()
else:
    logger.info("Alembic running in ONLINE mode")
    run_migrations_online()
