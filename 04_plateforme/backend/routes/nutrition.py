import sys
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User

nutrition_bp = Blueprint("nutrition", __name__)

LOGIC_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "03_logique_nutritionnelle"))
if LOGIC_PATH not in sys.path:
    sys.path.insert(0, LOGIC_PATH)

from besoins_mifflin import besoins_journaliers
from moteur_regles import evaluer


def _aggregate_nutriments(aliments):
    total = {"calories": 0, "proteines_g": 0, "glucides_g": 0, "lipides_g": 0,
             "sucre_g": 0, "sel_g": 0, "fibres_g": 0, "index_glycemique": 0}
    count = 0
    for aliment in aliments:
        nutriments = aliment.get("nutriments_100g", {})
        portion_factor = 1.5
        for key in total:
            if key in nutriments:
                total[key] += nutriments[key] * portion_factor
        if "index_glycemique" in nutriments:
            count += 1
    if count > 0:
        total["index_glycemique"] = total["index_glycemique"] / count
    return {k: round(v, 1) for k, v in total.items()}


@nutrition_bp.route("/api/recommandation", methods=["POST"])
@jwt_required()
def recommandation():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({"error": "Données manquantes"}), 400

    aliments = data.get("aliments", [])
    profil_data = data.get("profil")

    if not profil_data:
        user = User.query.get(int(user_id))
        if user and user.profil:
            profil_data = user.profil.to_dict()

    if not profil_data:
        return jsonify({"error": "Profil médical manquant"}), 400

    conditions = profil_data.get("conditions", [])
    pathologie = conditions[0] if conditions else None

    besoins = besoins_journaliers(
        sexe=profil_data["sexe"],
        poids_kg=profil_data["poids_kg"],
        taille_cm=profil_data["taille_cm"],
        age=profil_data["age"],
        activite=profil_data.get("activite", "modere"),
        pathologie=pathologie,
    )

    nutriments_repas = _aggregate_nutriments(aliments)

    alertes_par_aliment = []
    for aliment in aliments:
        n = aliment.get("nutriments_100g", {})
        eval_result = evaluer(n, pathologie) if pathologie else {"ok": True, "alertes": [], "pathologie": "aucune"}
        alertes_par_aliment.append({
            "aliment": aliment.get("classe", "inconnu"),
            "ok": eval_result["ok"],
            "alertes": eval_result["alertes"],
        })

    couverture = {}
    if besoins.get("calories", 0) > 0:
        couverture["calories"] = round(nutriments_repas["calories"] / besoins["calories"] * 100, 1)
    if besoins.get("proteines_g", 0) > 0:
        couverture["proteines"] = round(nutriments_repas["proteines_g"] / besoins["proteines_g"] * 100, 1)
    if besoins.get("glucides_g", 0) > 0:
        couverture["glucides"] = round(nutriments_repas["glucides_g"] / besoins["glucides_g"] * 100, 1)
    if besoins.get("lipides_g", 0) > 0:
        couverture["lipides"] = round(nutriments_repas["lipides_g"] / besoins["lipides_g"] * 100, 1)

    conseils = []
    if pathologie == "diabete":
        conseils.append("Privilégiez les aliments à faible index glycémique (IG < 55).")
        conseils.append("Consommez des fibres à chaque repas pour ralentir l'absorption du glucose.")
    elif pathologie == "hypertension":
        conseils.append("Limitez votre consommation de sel à moins de 6g par jour.")
        conseils.append("Augmentez votre apport en potassium (légumes, fruits).")
    elif pathologie == "obesite":
        conseils.append("Visez un déficit calorique de 20% pour une perte de poids progressive.")
        conseils.append("Préférez les protéines maigres pour maintenir la masse musculaire.")
    elif pathologie == "insuffisance_renale":
        conseils.append("Limitez votre apport en protéines et en potassium.")
        conseils.append("Consultez un néphrologue pour adapter votre alimentation.")

    if couverture.get("calories", 0) > 40:
        conseils.append(f"Ce repas couvre {couverture.get('calories', 0)}% de vos besoins caloriques journaliers.")

    aliments_problematiques = [a["aliment"] for a in alertes_par_aliment if not a["ok"]]
    if aliments_problematiques:
        conseils.append(f"Attention : {', '.join(aliments_problematiques)} ne sont pas adaptés à votre profil.")

    return jsonify({
        "besoins_journaliers": besoins,
        "nutriments_repas": nutriments_repas,
        "couverture_pct": couverture,
        "evaluation_aliments": alertes_par_aliment,
        "conseils": conseils,
        "pathologie": pathologie or "aucune",
    }), 200
