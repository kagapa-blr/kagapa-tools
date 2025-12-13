import os
from dotenv import load_dotenv
from flask import Flask, render_template
from config.database import init_db, create_tables
from routes.manage_users.manage_users import manage_users_bp
from routes.manage_users.user_login import user_login_bp
from routes.sortwords.sort_doc_routes import sort_doc_bp
from utils.logger import setup_logger

# Load environment variables
load_dotenv()

# Logger
logger = setup_logger('app')

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Flask app
app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "utility-tools-key")
app.config["UPLOAD_FOLDER"] = UPLOAD_DIR

# -------------------------
# Initialize Database
# -------------------------
init_db(app)
logger.info("Database initialized successfully")
# Create tables if they don't exist (for dev only)
create_tables(app)
# -------------------------
# Register Blueprints
# -------------------------
app.register_blueprint(sort_doc_bp, url_prefix="/sort-doc")
app.register_blueprint(manage_users_bp, url_prefix="/users")
app.register_blueprint(user_login_bp, url_prefix="/api/auth")
logger.info("Blueprint registered: sort_doc_bp")


@app.route("/")
def home():
    return render_template("index.html")


# -------------------------
# Run App
# -------------------------
if __name__ == "__main__":
    logger.info("Starting Utility Tools Web App")
    app.run(host="0.0.0.0", port=5000, debug=False)
