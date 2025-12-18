from flask import Blueprint, render_template

from app.security.jwt_decorators import login_required
from app.utils.logger import setup_logger

logger = setup_logger(name="template_routes")
template_routes_bp = Blueprint("template_routes", __name__)


# ==================================HOME PAGE===========================================
@template_routes_bp.route("/")
def home_page():
    return render_template("index.html")


# ==============================================HOME PAGE ===========================================


# ==================================================spellcheck admin dictionary routes=========================
@template_routes_bp.route("/spellcheck/main/dictionary", methods=["GET"])
@login_required
def spellcheck_admin_dictionary():
    return render_template("dictionary/main_dictionary.html")


@template_routes_bp.route("/spellcheck/user/dictionary", methods=["GET"])
@login_required
def spellcheck_user_dictionary():
    return render_template("dictionary/user_dictionary.html")


# ===============================================spellcheck end===============================================


# ==================================================sortwords routes===========================================
@template_routes_bp.route("/sort_doc_ui", methods=["GET"])
def sort_doc_ui():
    return render_template("sortwords/upload_sort.html")

# ================================================sortwords end===============================================
