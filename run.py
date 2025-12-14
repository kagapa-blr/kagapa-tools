import os
from dotenv import load_dotenv
from flask import Flask, render_template

from app.config.database import init_db, create_tables
from app.routes.manage_dictionary.main_dictionary_routes import main_dictionary_bp
from app.routes.manage_dictionary.user_dictionary_routes import user_dictionary_bp
from app.routes.manage_users.manage_users import manage_users_bp
from app.routes.manage_users.user_login import user_login_bp
from app.routes.sortwords.sort_doc_routes import sort_doc_bp
from app.utils.logger import setup_logger

# --------------------------------------------------
# Load Environment Variables
# --------------------------------------------------
load_dotenv()

# --------------------------------------------------
# Logger
# --------------------------------------------------
logger = setup_logger("app")

# --------------------------------------------------
# Base Paths
# --------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(BASE_DIR, "app")

TEMPLATE_DIR = os.path.join(APP_DIR, "templates")
STATIC_DIR = os.path.join(APP_DIR, "static")
UPLOAD_DIR = os.path.join(BASE_DIR, "user_uploaded")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# --------------------------------------------------
# Flask App (ENTRY POINT)
# --------------------------------------------------
app = Flask(
    __name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR
)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "utility-tools-key")
app.config["UPLOAD_FOLDER"] = UPLOAD_DIR

logger.info(f"TEMPLATE_DIR = {TEMPLATE_DIR}")
logger.info(f"STATIC_DIR   = {STATIC_DIR}")
logger.info(f"UPLOAD_DIR   = {UPLOAD_DIR}")

# --------------------------------------------------
# Initialize Database
# --------------------------------------------------
init_db(app)
logger.info("Database initialized successfully")

# ⚠️ Use only for DEV (disable in prod)
create_tables(app)
logger.info("Database tables verified/created")

# --------------------------------------------------
# Register Blueprints
# --------------------------------------------------
# UI / Web
app.register_blueprint(sort_doc_bp, url_prefix="/sort-doc")
app.register_blueprint(manage_users_bp, url_prefix="/users")

# Auth / APIs
app.register_blueprint(user_login_bp, url_prefix="/api/auth")
app.register_blueprint(main_dictionary_bp, url_prefix="/api/v1/dictionary/main")
app.register_blueprint(user_dictionary_bp, url_prefix="/api/v1/dictionary/user")

logger.info("All blueprints registered successfully")

# --------------------------------------------------
# Routes
# --------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")

# --------------------------------------------------
# App Runner
# --------------------------------------------------
if __name__ == "__main__":
    logger.info("Starting Kagapa Utility Tools Web App")
    app.run(host="0.0.0.0",port=5000,debug=False)
