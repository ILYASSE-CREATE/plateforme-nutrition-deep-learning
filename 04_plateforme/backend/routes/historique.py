from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, RepasHistorique

historique_bp = Blueprint("historique", __name__)


@historique_bp.route("/api/historique", methods=["GET"])
@jwt_required()
def get_historique():
    user_id = int(get_jwt_identity())
    limit = request.args.get("limit", 50, type=int)
    repas = (
        RepasHistorique.query
        .filter_by(user_id=user_id)
        .order_by(RepasHistorique.timestamp.desc())
        .limit(limit)
        .all()
    )
    return jsonify({"historique": [r.to_dict() for r in repas]}), 200


@historique_bp.route("/api/historique", methods=["POST"])
@jwt_required()
def add_historique():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Données manquantes"}), 400

    repas = RepasHistorique(
        user_id=user_id,
        image_path=data.get("image_path"),
        aliments_detectes=data.get("aliments_detectes", []),
        nutriments_total=data.get("nutriments_total", {}),
        recommandation=data.get("recommandation", {}),
    )
    db.session.add(repas)
    db.session.commit()
    return jsonify({"repas": repas.to_dict()}), 201
