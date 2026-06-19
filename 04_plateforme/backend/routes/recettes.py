from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

recettes_bp = Blueprint("recettes", __name__)

RECETTES = [
    {
        "id": 1,
        "nom": "Salade de légumes grillés",
        "image": "🥗",
        "temps": "20 min",
        "calories": 180,
        "proteines_g": 5,
        "glucides_g": 22,
        "lipides_g": 8,
        "sucre_g": 8,
        "sel_g": 0.3,
        "fibres_g": 6,
        "ingredients": ["Courgette", "Poivron", "Tomate", "Oignon", "Huile d'olive", "Herbes"],
        "pathologies_ok": ["diabete", "hypertension", "obesite", "insuffisance_renale"],
        "description": "Une salade légère et nutritive, idéale pour tous les profils.",
    },
    {
        "id": 2,
        "nom": "Poulet grillé aux herbes",
        "image": "🍗",
        "temps": "30 min",
        "calories": 220,
        "proteines_g": 35,
        "glucides_g": 2,
        "lipides_g": 8,
        "sucre_g": 0,
        "sel_g": 0.4,
        "fibres_g": 0,
        "ingredients": ["Blanc de poulet", "Citron", "Ail", "Herbes de Provence", "Huile d'olive"],
        "pathologies_ok": ["diabete", "hypertension", "obesite"],
        "description": "Riche en protéines, pauvre en glucides. Parfait pour les diabétiques.",
    },
    {
        "id": 3,
        "nom": "Soupe de lentilles",
        "image": "🍲",
        "temps": "40 min",
        "calories": 230,
        "proteines_g": 14,
        "glucides_g": 38,
        "lipides_g": 3,
        "sucre_g": 4,
        "sel_g": 0.5,
        "fibres_g": 10,
        "ingredients": ["Lentilles", "Carottes", "Oignon", "Tomate", "Cumin", "Curcuma"],
        "pathologies_ok": ["diabete", "hypertension", "obesite"],
        "description": "Riche en fibres, aide à stabiliser la glycémie.",
    },
    {
        "id": 4,
        "nom": "Riz aux légumes vapeur",
        "image": "🍚",
        "temps": "25 min",
        "calories": 280,
        "proteines_g": 6,
        "glucides_g": 55,
        "lipides_g": 3,
        "sucre_g": 3,
        "sel_g": 0.2,
        "fibres_g": 4,
        "ingredients": ["Riz complet", "Brocoli", "Carotte", "Petit pois", "Huile d'olive"],
        "pathologies_ok": ["hypertension", "obesite", "insuffisance_renale"],
        "description": "Faible en sel, idéal pour l'hypertension.",
    },
    {
        "id": 5,
        "nom": "Omelette aux épinards",
        "image": "🍳",
        "temps": "15 min",
        "calories": 190,
        "proteines_g": 16,
        "glucides_g": 3,
        "lipides_g": 13,
        "sucre_g": 1,
        "sel_g": 0.4,
        "fibres_g": 2,
        "ingredients": ["Oeufs", "Épinards", "Oignon", "Huile d'olive", "Poivre"],
        "pathologies_ok": ["diabete", "hypertension", "obesite"],
        "description": "Pauvre en glucides, riche en protéines et fer.",
    },
    {
        "id": 6,
        "nom": "Tajine de légumes",
        "image": "🫕",
        "temps": "45 min",
        "calories": 210,
        "proteines_g": 6,
        "glucides_g": 35,
        "lipides_g": 7,
        "sucre_g": 10,
        "sel_g": 0.6,
        "fibres_g": 8,
        "ingredients": ["Pomme de terre", "Carotte", "Courgette", "Oignon", "Tomate", "Épices"],
        "pathologies_ok": ["diabete", "hypertension", "obesite", "insuffisance_renale"],
        "description": "Plat traditionnel marocain équilibré et savoureux.",
    },
    {
        "id": 7,
        "nom": "Salade de fruits frais",
        "image": "🍓",
        "temps": "10 min",
        "calories": 120,
        "proteines_g": 2,
        "glucides_g": 28,
        "lipides_g": 0.5,
        "sucre_g": 22,
        "sel_g": 0,
        "fibres_g": 4,
        "ingredients": ["Fraises", "Banane", "Orange", "Pomme", "Menthe"],
        "pathologies_ok": ["hypertension", "obesite"],
        "description": "Riche en vitamines et antioxydants.",
    },
    {
        "id": 8,
        "nom": "Poisson vapeur au citron",
        "image": "🐟",
        "temps": "20 min",
        "calories": 160,
        "proteines_g": 28,
        "glucides_g": 0,
        "lipides_g": 5,
        "sucre_g": 0,
        "sel_g": 0.3,
        "fibres_g": 0,
        "ingredients": ["Filet de poisson", "Citron", "Ail", "Persil", "Huile d'olive"],
        "pathologies_ok": ["diabete", "hypertension", "obesite", "insuffisance_renale"],
        "description": "Très faible en sel et en graisses, idéal pour tous.",
    },
]


@recettes_bp.route("/api/recettes", methods=["GET"])
@jwt_required()
def get_recettes():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    conditions = []
    if user and user.profil:
        conditions = user.profil.conditions or []

    recettes_filtrees = []
    for recette in RECETTES:
        if not conditions:
            recettes_filtrees.append({**recette, "compatible": True})
        else:
            compatible = all(c in recette["pathologies_ok"] for c in conditions)
            recettes_filtrees.append({**recette, "compatible": compatible})

    recettes_filtrees.sort(key=lambda r: r["compatible"], reverse=True)

    return jsonify({"recettes": recettes_filtrees}), 200
