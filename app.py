import os
import logging
from flask import Flask
from dotenv import load_dotenv
from routes.sortwords.sort_doc_routes import sort_doc_bp

# Load environment variables
load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Register Blueprint
app.register_blueprint(sort_doc_bp)
logger.info("Blueprint registered: sort_doc_bp")

if __name__ == "__main__":
    logger.info("Starting Utility Tools Web App")
    app.run(host="0.0.0.0", port=5000)
