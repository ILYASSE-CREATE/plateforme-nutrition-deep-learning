from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email et mot de passe requis"}), 400

    email = data["email"].lower().strip()
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email déjà utilisé"}), 409

    user = User(email=email)
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "Email et mot de passe requis"}), 400

    email = data["email"].lower().strip()
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Identifiants invalides"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200
