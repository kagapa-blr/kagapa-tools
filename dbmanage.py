import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, MetaData, Table, inspect
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.config.database import create_database_if_not_exists, MYSQL_DB_URL, MYSQL_SERVER_URL
from app.config.database import kagapa_tools_db as db
from app.utils.logger import setup_logger

# Load env vars
load_dotenv()
logger = setup_logger('dbmanage')


def confirm_action(message: str) -> bool:
    """Ask user to confirm an action."""
    ans = input(f"{message} (yes/no): ").strip().lower()
    return ans in ["yes", "y"]


def reset_database():
    """Drop and recreate the whole database."""
    if not confirm_action(f"Are you sure you want to RESET the entire database '{os.getenv('DB_NAME')}'?"):
        print("Action cancelled.")
        return

    try:
        engine = create_engine(MYSQL_SERVER_URL)
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text(f"DROP DATABASE IF EXISTS `{os.getenv('DB_NAME')}`"))
            logger.info(f"Database {os.getenv('DB_NAME')} dropped.")

        create_database_if_not_exists()
        logger.info(f"Database {os.getenv('DB_NAME')} recreated successfully.")

    except SQLAlchemyError as e:
        logger.error("Error resetting database", exc_info=e)


def reset_tables():
    """Reset specific tables automatically from models."""
    engine = create_engine(MYSQL_DB_URL)

    # Get current tables in DB
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if not existing_tables:
        print("No tables found in database.")
        return

    # Show tables
    print("\nTables in the database:")
    for i, t in enumerate(existing_tables, start=1):
        print(f"{i}. {t}")

    # Get user selection
    selection = input("\nEnter table numbers to reset (comma-separated, e.g., 1,3,5): ")
    try:
        indices = [int(x.strip()) - 1 for x in selection.split(",")]
        tables_to_reset = [existing_tables[i] for i in indices if 0 <= i < len(existing_tables)]
    except (ValueError, IndexError):
        print("Invalid selection.")
        return

    if not tables_to_reset:
        print("No valid tables selected.")
        return

    # Confirm
    print(f"You selected tables: {tables_to_reset}")
    if not confirm_action("Are you sure you want to drop and recreate these tables?"):
        print("Action cancelled.")
        return

    try:
        # Drop selected tables
        with engine.connect() as conn:
            for table_name in tables_to_reset:
                conn.execute(text(f"DROP TABLE IF EXISTS `{table_name}`"))
                logger.info(f"Table {table_name} dropped.")

        # Recreate tables automatically using model metadata
        tables_to_create = [t for t in db.metadata.sorted_tables if t.name in tables_to_reset]

        if tables_to_create:
            db.metadata.create_all(bind=engine, tables=tables_to_create)
            logger.info(f"Selected tables recreated successfully.")
        else:
            logger.warning("No tables found in metadata to recreate.")

    except SQLAlchemyError as e:
        logger.error("Error resetting tables", exc_info=e)


def main():
    print("\n=== Kagapa Tools Database Manager ===")
    print("1. Reset entire database")
    print("2. Reset specific tables")
    choice = input("Select an option (1/2): ").strip()

    if choice == "1":
        reset_database()
    elif choice == "2":
        reset_tables()
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    main()
