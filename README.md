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
python app.py
```

- App runs at `http://localhost:5000/`
- Upload folder: `uploads/`
- Templates folder: `templates/`
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

## Alembic Workflow Steps

### 1. Make Changes

- Add new models or modify existing models in the `models/` folder.
- Update fields, add/remove columns, tables, or indexes.

### 2. Generate Migration

```bash
alembic revision --autogenerate -m "descriptive_message"
```
- Use descriptive messages such as `add_user_table` or `update_users_email_index`.
- Review the generated migration file in `alembic/versions/` before applying.

### 3. Apply Migration

```bash
alembic upgrade head
```
- Applies all pending migrations to update the database schema.

### 4. Verify

```bash
alembic current   # Check current revision
alembic history   # Review applied migrations
```
- Ensure the database schema matches your models.

### 5. Optional: Synchronize Alembic Version

```bash
alembic stamp head
```
- Use if the database was manually changed or restored from backup.
- Marks the database as up-to-date without modifying any tables.

**Tips:**
- Always review migration files before applying.
- Test migrations in a development database first.
- Keep `target_metadata = db.Model.metadata` updated in `alembic/env.py`.

---

## Logging

- Logs stored in `logs/YYYY-MM-DD/kagapa-tools.log`
- Older logs (>10 days) archived automatically into `logs/archivedlogs`
- Rotating file handler keeps log file size under 5 MB

---

## Project Structure

```
kagapa-tools/
├─ alembic/                 # Alembic migrations
├─ config/
│  └─ database.py           # Database initialization & helpers
├─ routes/                  # Flask blueprints
│  └─ sortwords/
├─ utils/
│  └─ logger.py             # Logging setup
├─ uploads/                 # Uploaded files
├─ templates/               # HTML templates
├─ static/                  # Static files
├─ app.py                   # Flask application
├─ dbmanage.py              # Interactive database manager
├─ requirements.txt
└─ .env                     # Environment variables
```

---

## Notes

- Ensure `.env` contains correct database credentials before running migrations or DB manager.
- Use Alembic for schema changes instead of manual SQL.
- Always backup your database before performing destructive operations.
