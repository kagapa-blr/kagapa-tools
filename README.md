# Kagapa Tools

**Kagapa Tools** is a utility web application built with **Flask**, **SQLAlchemy**, **Alembic**, and **MySQL**, providing document sorting, word utilities, and database management features.

---

## **Features**

- Sort words from documents  
- Upload and manage files  
- Manage and query MySQL database  
- Automatic database creation if not exists  
- Alembic migrations for database schema  
- Interactive DB management (reset database or specific tables)  
- Logging with automatic archival of old logs  

---

## **Tech Stack**

- Python 3.x  
- Flask  
- Flask-SQLAlchemy  
- PyMySQL  
- Alembic  
- Pandas  
- python-docx  
- dotenv  

---

## **Setup Instructions**

1. Clone the repository:

```bash
git clone <repo-url>
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

## **Run the Application**

```bash
python app.py
```

- App runs at `http://localhost:5000/`  
- Upload folder: `uploads/`  
- Templates folder: `templates/`  
- Logs folder: `logs/` (archived automatically after 10 days)

---

## **Database Management**

### Initialize / Create Database

- Automatically handled during app startup via `init_db(app)`  
- Database created if it does not exist

### Interactive Database Manager

```bash
python dbmanage.py
```

Options:

1. Reset entire database  
2. Reset specific tables  

- Confirms before performing destructive operations  

---

## **Alembic Migrations**

### Initialize Alembic (if not already done)

```bash
alembic init alembic
```

### Generate Migration

```bash
alembic revision --autogenerate -m "migration_name"
```

- Example:

```bash
alembic revision --autogenerate -m "initial tables"
```

### Apply Migration

```bash
alembic upgrade head
```

### Rollback Migration

```bash
alembic downgrade -1
```

### View Migration History

```bash
alembic history
```

### Mark Database as Up-to-Date (without running migrations)

```bash
alembic stamp head
```

---

## **Logging**

- Logs are stored in `logs/YYYY-MM-DD/kagapa-tools.log`  
- Older logs (>10 days) are archived automatically into `logs/archivedlogs`  
- Rotating file handler keeps log file size under 5 MB  

---

## **Project Structure**

```
kagapa-tools/
├─ alembic/                 # Alembic migrations
├─ config/
│  └─ database.py           # Database init & helpers
├─ routes/                  # Flask blueprints
│  └─ sortwords/
├─ utils/
│  └─ logger.py             # Logging setup
├─ uploads/                 # Uploaded files
├─ templates/               # HTML templates
├─ static/                  # Static files
├─ app.py                   # Flask application
├─ dbmanage.py              # Interactive DB manager
├─ requirements.txt
└─ .env                     # Environment variables
```

---

## **Notes**

- Ensure `.env` contains correct database credentials before running migrations or DB manager  
- Use Alembic for schema changes instead of manual SQL  
- Always backup your database before performing destructive oper