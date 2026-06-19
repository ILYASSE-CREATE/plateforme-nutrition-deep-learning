from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, RepasHistorique
import urllib.request
import json

barcode_bp = Blueprint("barcode", __name__)


@barcode_bp.route("/api/barcode/<code>", methods=["GET"])
@jwt_required()
def scan_barcode(code):
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{code}.json"
        req = urllib.request.Request(url, headers={"User-Agent": "NutriAI/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())

        if data.get("status") != 1:
            return jsonify({"error": "Produit non trouvé"}), 404

        product = data.get("product", {})
        nutriments = product.get("nutriments", {})
        nom = product.get("product_name", "Produit inconnu")
        image = product.get("image_url", "")

        nutriments_100g = {
            "calories": round(nutriments.get("energy-kcal_100g", 0), 1),
            "proteines_g": round(nutriments.get("proteins_100g", 0), 1),
            "glucides_g": round(nutriments.get("carbohydrates_100g", 0), 1),
            "lipides_g": round(nutriments.get("fat_100g", 0), 1),
            "sucre_g": round(nutriments.get("sugars_100g", 0), 1),
            "sel_g": round(nutriments.get("salt_100g", 0), 1),
            "fibres_g": round(nutriments.get("fiber_100g", 0), 1),
        }

        return jsonify({
            "nom": nom,
            "code": code,
            "image": image,
            "nutriments_100g": nutriments_100g,
            "marque": product.get("brands", ""),
            "quantite": product.get("quantity", ""),
        }), 200

    except Exception as e:
        return jsonify({"error": f"Erreur lors de la recherche: {str(e)}"}), 500
