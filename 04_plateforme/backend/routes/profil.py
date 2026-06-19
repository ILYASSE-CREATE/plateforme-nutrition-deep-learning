from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, ProfilMedical

profil_bp = Blueprint("profil", __name__)

VALID_CONDITIONS = {"diabete", "hypertension", "obesite", "insuffisance_renale"}
VALID_ACTIVITES = {"sedentaire", "leger", "modere", "actif", "tres_actif"}


@profil_bp.route("/api/profil", methods=["GET"])
@jwt_required()
def get_profil():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404
    if not user.profil:
        return jsonify({"profil": None}), 200
    return jsonify({"profil": user.profil.to_dict()}), 200


@profil_bp.route("/api/profil", methods=["PUT"])
@jwt_required()
def update_profil():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Données manquantes"}), 400

    required = ["age", "sexe", "poids_kg", "taille_cm"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Champ requis manquant: {field}"}), 400

    if data["sexe"].upper() not in ("M", "F"):
        return jsonify({"error": "sexe doit être 'M' ou 'F'"}), 400

    activite = data.get("activite", "modere")
    if activite not in VALID_ACTIVITES:
        return jsonify({"error": f"activite invalide. Valeurs: {list(VALID_ACTIVITES)}"}), 400

    conditions = data.get("conditions", [])
    invalid_conditions = [c for c in conditions if c not in VALID_CONDITIONS]
    if invalid_conditions:
        return jsonify({"error": f"Conditions invalides: {invalid_conditions}"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Utilisateur introuvable"}), 404

    if user.profil:
        profil = user.profil
    else:
        profil = ProfilMedical(user_id=user_id)
        db.session.add(profil)

    profil.age = int(data["age"])
    profil.sexe = data["sexe"].upper()
    profil.poids_kg = float(data["poids_kg"])
    profil.taille_cm = float(data["taille_cm"])
    profil.activite = activite
    profil.conditions = conditions

    db.session.commit()
    return jsonify({"profil": profil.to_dict()}), 200
