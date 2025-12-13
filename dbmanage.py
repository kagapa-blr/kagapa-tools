import os
from dotenv import load_dotenv
from config.database import db, create_database_if_not_exists, MYSQL_DB_URL, MYSQL_SERVER_URL
from sqlalchemy import create_engine, inspect, MetaData, Table
from sqlalchemy.exc import SQLAlchemyError
from utils.logger import setup_logger
from sqlalchemy import text
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
        # Drop database
        engine = create_engine(MYSQL_SERVER_URL)
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text(f"DROP DATABASE IF EXISTS `{os.getenv('DB_NAME')}`"))
            logger.info(f"Database {os.getenv('DB_NAME')} dropped.")

        # Recreate database
        create_database_if_not_exists()
        logger.info(f"Database {os.getenv('DB_NAME')} recreated successfully.")

    except SQLAlchemyError as e:
        logger.error("Error resetting database", exc_info=e)


def reset_tables():
    """Reset specific tables."""
    engine = create_engine(MYSQL_DB_URL)
    metadata = MetaData()
    metadata.reflect(bind=engine)
    table_names = list(metadata.tables.keys())

    if not table_names:
        print("No tables found in database.")
        return

    # Show tables
    print("\nTables in the database:")
    for i, t in enumerate(table_names, start=1):
        print(f"{i}. {t}")

    # Get user selection
    selection = input("\nEnter table numbers to reset (comma-separated, e.g., 1,3,5): ")
    try:
        indices = [int(x.strip()) - 1 for x in selection.split(",")]
        tables_to_reset = [table_names[i] for i in indices if 0 <= i < len(table_names)]
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
        with engine.connect() as conn:
            for table_name in tables_to_reset:
                conn.execute(f"DROP TABLE IF EXISTS `{table_name}`")
                logger.info(f"Table {table_name} dropped.")

        # Recreate tables using SQLAlchemy metadata
        # Only recreate selected tables
        metadata = MetaData()
        metadata.reflect(bind=engine, only=tables_to_reset)
        db.metadata.create_all(bind=engine, tables=[Table(t, db.metadata) for t in tables_to_reset])
        logger.info(f"Selected tables recreated successfully.")

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
