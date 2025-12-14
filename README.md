# Kagapa Tools

**Kagapa Tools** is a utility web application built with **Flask**, **SQLAlchemy**, **Alembic**, and **MySQL**, providing document sorting, word utilities, and database management features.

---

## Features

- Sort words from documents
- Upload and manage files
- Manage and query MySQL database
- Automatic database creation if not exists
- Alembic migrations for database schema
- Interactive database management (reset database or specific tables)
- Logging with automatic archival of old logs

---

## Tech Stack

- Python 3.x
- Flask
- Flask-SQLAlchemy
- PyMySQL
- Alembic
- Pandas
- python-docx
- dotenv

---

## Setup Instructions

1. Clone the repository:

```bash
git clone https://github.com/kagapa-blr/kagapa-tools.git
cd kagapa-tools
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / Mac
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the project root:

```env
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kagapa_tools
SECRET_KEY=your_secret_key
```

---

## Running the Application

```bash
python run.py
```

- App runs at `http://localhost:5000/`
- Upload folder: `user_uploaded/`
- Templates folder: `app/templates/`
- Static folder: `app/static/`
- Logs folder: `logs/` (archived automatically after 10 days)

---

## Database Management

### Initialize / Create Database

- Automatically handled during app startup via `init_db(app)`
- Database is created if it does not exist

### Interactive Database Manager

```bash
python dbmanage.py
```

Options:

1. Reset entire database  
2. Reset specific tables  

- Confirms before performing destructive operations

---

## Alembic Workflow

```bash
# Initialize Alembic, create migrations, and apply them in one place
alembic init alembic         # Initialize Alembic folder and config
alembic revision --autogenerate -m "descriptive_message"  # Generate migration from models
alembic upgrade head         # Apply all pending migrations
alembic history --verbose    # Show migration history
alembic current              # Show current revision
alembic stamp head           # Synchronize Alembic version without applying changes
alembic revision -m "manual changes"  # Create empty migration for manual edits
```

**Tips:**

- Always review migration files before applying
- Test migrations in a development database first
- Keep `target_metadata = db.Model.metadata` updated in `alembic/env.py`
- Alembic dynamically imports all models from `app.models`

---

## Logging

- Logs stored in `logs/YYYY-MM-DD/kagapa-tools.log`
- Older logs (>10 days) archived automatically into `logs/archivedlogs`
- Rotating file handler keeps log file size under 5 MB

---

## Project Structure

```
kagapa-tools/
├─ alembic/                  # Alembic migrations
│  └─ versions/              # Migration scripts
├─ app/
│  ├─ config/
│  │  └─ database.py         # Database initialization & helpers
│  ├─ routes/                # Flask blueprints
│  │  └─ sortwords/
│  ├─ models/                # SQLAlchemy models
│  ├─ utils/
│  │  └─ logger.py           # Logging setup
│  ├─ templates/             # HTML templates
│  ├─ static/                # Static files
│  └─ __init__.py
├─ user_uploaded/            # Uploaded files
├─ logs/                     # Log files and archives
├─ run.py                    # Flask application runner
├─ dbmanage.py               # Interactive database manager
├─ requirements.txt
└─ .env                      # Environment variables
```

---

## Notes

- Ensure `.env` contains correct database credentials before running migrations or DB manager
- Use Alembic for schema changes instead of manual SQL
- Always backup your database before performing destructive operations
- For production, make sure `alembic upgrade head` is run before starting the Flask app

