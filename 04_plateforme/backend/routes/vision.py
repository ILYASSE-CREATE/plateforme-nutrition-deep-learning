import os
import uuid
import requests
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from PIL import Image

vision_bp = Blueprint("vision", __name__)

_model = None

GDRIVE_FILE_ID = "1p7YTn4Boj2zEfZL3kOLAmOY8Rg68KyCm"


def download_model_from_gdrive(dest_path):
    url = f"https://drive.google.com/uc?export=download&id={GDRIVE_FILE_ID}"
    session = requests.Session()
    response = session.get(url, stream=True)
    token = None
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            token = value
    if token:
        response = session.get(url, params={"confirm": token}, stream=True)
    with open(dest_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=32768):
            if chunk:
                f.write(chunk)


def get_model():
    global _model
    if _model is not None:
        return _model
    model_path = current_app.config["YOLO_MODEL_PATH"]
    if not os.path.exists(model_path):
        try:
            download_model_from_gdrive(model_path)
        except Exception as e:
            current_app.logger.error(f"Échec téléchargement modèle: {e}")
            return None
    try:
        from ultralytics import YOLO
        _model = YOLO(model_path)
        return _model
    except Exception as e:
        current_app.logger.warning(f"Could not load YOLO model: {e}")
        return None


MOCK_FOODS = [
    {"classe": "pizza", "confiance": 0.91, "bbox": [50, 60, 300, 280], "nutriments_100g": {"calories": 266, "proteines_g": 11, "glucides_g": 33, "lipides_g": 10, "sucre_g": 3.6, "sel_g": 1.5, "fibres_g": 2.3}},
    {"classe": "salade", "confiance": 0.78, "bbox": [310, 60, 480, 200], "nutriments_100g": {"calories": 17, "proteines_g": 1.2, "glucides_g": 2.9, "lipides_g": 0.2, "sucre_g": 1.8, "sel_g": 0.1, "fibres_g": 1.5}},
]

NUTRIMENTS_TABLE = {
    "apple": {"calories": 52, "proteines_g": 0.3, "glucides_g": 14, "lipides_g": 0.2, "sucre_g": 10, "sel_g": 0, "fibres_g": 2.4},
    "asparagus": {"calories": 20, "proteines_g": 2.2, "glucides_g": 3.9, "lipides_g": 0.1, "sucre_g": 1.9, "sel_g": 0, "fibres_g": 2.1},
    "avocado": {"calories": 160, "proteines_g": 2, "glucides_g": 9, "lipides_g": 15, "sucre_g": 0.7, "sel_g": 0, "fibres_g": 7},
    "banana": {"calories": 89, "proteines_g": 1.1, "glucides_g": 23, "lipides_g": 0.3, "sucre_g": 12, "sel_g": 0, "fibres_g": 2.6},
    "beans": {"calories": 347, "proteines_g": 21, "glucides_g": 63, "lipides_g": 1.2, "sucre_g": 2.1, "sel_g": 0, "fibres_g": 15},
    "biscuit": {"calories": 488, "proteines_g": 6.2, "glucides_g": 65, "lipides_g": 23, "sucre_g": 32, "sel_g": 0.6, "fibres_g": 2.5},
    "blueberry": {"calories": 57, "proteines_g": 0.7, "glucides_g": 14, "lipides_g": 0.3, "sucre_g": 10, "sel_g": 0, "fibres_g": 2.4},
    "bread": {"calories": 265, "proteines_g": 9, "glucides_g": 49, "lipides_g": 3.2, "sucre_g": 5, "sel_g": 1.2, "fibres_g": 2.7},
    "broccoli": {"calories": 34, "proteines_g": 2.8, "glucides_g": 7, "lipides_g": 0.4, "sucre_g": 1.7, "sel_g": 0, "fibres_g": 2.6},
    "cabbage": {"calories": 25, "proteines_g": 1.3, "glucides_g": 5.8, "lipides_g": 0.1, "sucre_g": 3.2, "sel_g": 0, "fibres_g": 2.5},
    "carrot": {"calories": 41, "proteines_g": 0.9, "glucides_g": 10, "lipides_g": 0.2, "sucre_g": 4.7, "sel_g": 0.1, "fibres_g": 2.8},
    "cauliflower": {"calories": 25, "proteines_g": 1.9, "glucides_g": 5, "lipides_g": 0.3, "sucre_g": 1.9, "sel_g": 0, "fibres_g": 2},
    "celery stick": {"calories": 16, "proteines_g": 0.7, "glucides_g": 3, "lipides_g": 0.2, "sucre_g": 1.3, "sel_g": 0.1, "fibres_g": 1.6},
    "cheese butter": {"calories": 402, "proteines_g": 25, "glucides_g": 1.3, "lipides_g": 33, "sucre_g": 0.5, "sel_g": 1.7, "fibres_g": 0},
    "cherry": {"calories": 50, "proteines_g": 1, "glucides_g": 12, "lipides_g": 0.3, "sucre_g": 8, "sel_g": 0, "fibres_g": 1.6},
    "chicken duck": {"calories": 165, "proteines_g": 31, "glucides_g": 0, "lipides_g": 3.6, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "chocolate": {"calories": 546, "proteines_g": 5, "glucides_g": 60, "lipides_g": 31, "sucre_g": 48, "sel_g": 0.1, "fibres_g": 7},
    "cilantro mint": {"calories": 23, "proteines_g": 2.1, "glucides_g": 3.7, "lipides_g": 0.5, "sucre_g": 0.9, "sel_g": 0, "fibres_g": 2.8},
    "corn": {"calories": 86, "proteines_g": 3.2, "glucides_g": 19, "lipides_g": 1.2, "sucre_g": 3.2, "sel_g": 0, "fibres_g": 2.7},
    "cucumber": {"calories": 16, "proteines_g": 0.7, "glucides_g": 3.6, "lipides_g": 0.1, "sucre_g": 1.7, "sel_g": 0, "fibres_g": 0.5},
    "egg": {"calories": 155, "proteines_g": 13, "glucides_g": 1.1, "lipides_g": 11, "sucre_g": 1.1, "sel_g": 0.4, "fibres_g": 0},
    "fish": {"calories": 136, "proteines_g": 20, "glucides_g": 0, "lipides_g": 6, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "french fries": {"calories": 312, "proteines_g": 3.4, "glucides_g": 41, "lipides_g": 15, "sucre_g": 0.3, "sel_g": 0.5, "fibres_g": 3.8},
    "garlic": {"calories": 149, "proteines_g": 6.4, "glucides_g": 33, "lipides_g": 0.5, "sucre_g": 1, "sel_g": 0, "fibres_g": 2.1},
    "grape": {"calories": 69, "proteines_g": 0.7, "glucides_g": 18, "lipides_g": 0.2, "sucre_g": 15, "sel_g": 0, "fibres_g": 0.9},
    "green_onion": {"calories": 32, "proteines_g": 1.8, "glucides_g": 7.3, "lipides_g": 0.2, "sucre_g": 2.3, "sel_g": 0, "fibres_g": 2.6},
    "hot_drink": {"calories": 5, "proteines_g": 0.3, "glucides_g": 0.7, "lipides_g": 0.1, "sucre_g": 0, "sel_g": 0, "fibres_g": 0},
    "ice cream": {"calories": 207, "proteines_g": 3.5, "glucides_g": 24, "lipides_g": 11, "sucre_g": 21, "sel_g": 0.1, "fibres_g": 0.7},
    "juice": {"calories": 45, "proteines_g": 0.7, "glucides_g": 10, "lipides_g": 0.2, "sucre_g": 8.4, "sel_g": 0, "fibres_g": 0.2},
    "kiwi": {"calories": 61, "proteines_g": 1.1, "glucides_g": 15, "lipides_g": 0.5, "sucre_g": 9, "sel_g": 0, "fibres_g": 3},
    "lemon": {"calories": 29, "proteines_g": 1.1, "glucides_g": 9.3, "lipides_g": 0.3, "sucre_g": 2.5, "sel_g": 0, "fibres_g": 2.8},
    "lettuce": {"calories": 15, "proteines_g": 1.4, "glucides_g": 2.9, "lipides_g": 0.2, "sucre_g": 1.2, "sel_g": 0, "fibres_g": 1.3},
    "mango": {"calories": 60, "proteines_g": 0.8, "glucides_g": 15, "lipides_g": 0.4, "sucre_g": 14, "sel_g": 0, "fibres_g": 1.6},
    "meat": {"calories": 250, "proteines_g": 26, "glucides_g": 0, "lipides_g": 15, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "milk": {"calories": 61, "proteines_g": 3.2, "glucides_g": 4.8, "lipides_g": 3.3, "sucre_g": 5.1, "sel_g": 0.1, "fibres_g": 0},
    "milkshake": {"calories": 112, "proteines_g": 3.8, "glucides_g": 18, "lipides_g": 3, "sucre_g": 15, "sel_g": 0.1, "fibres_g": 0},
    "mushroom": {"calories": 22, "proteines_g": 3.1, "glucides_g": 3.3, "lipides_g": 0.3, "sucre_g": 2, "sel_g": 0, "fibres_g": 1},
    "noodles_pasta": {"calories": 131, "proteines_g": 5, "glucides_g": 25, "lipides_g": 1.1, "sucre_g": 0.6, "sel_g": 0, "fibres_g": 1.8},
    "nuts": {"calories": 607, "proteines_g": 20, "glucides_g": 21, "lipides_g": 54, "sucre_g": 4.2, "sel_g": 0, "fibres_g": 8},
    "olives": {"calories": 115, "proteines_g": 0.8, "glucides_g": 6.3, "lipides_g": 11, "sucre_g": 0, "sel_g": 1.6, "fibres_g": 3.2},
    "orange": {"calories": 47, "proteines_g": 0.9, "glucides_g": 12, "lipides_g": 0.1, "sucre_g": 9.4, "sel_g": 0, "fibres_g": 2.4},
    "other ingredients": {"calories": 50, "proteines_g": 1, "glucides_g": 8, "lipides_g": 1.5, "sucre_g": 2, "sel_g": 0.3, "fibres_g": 1},
    "pastry": {"calories": 347, "proteines_g": 5, "glucides_g": 53, "lipides_g": 13, "sucre_g": 36, "sel_g": 0.4, "fibres_g": 1.2},
    "peach": {"calories": 39, "proteines_g": 0.9, "glucides_g": 10, "lipides_g": 0.3, "sucre_g": 8.4, "sel_g": 0, "fibres_g": 1.5},
    "pear": {"calories": 57, "proteines_g": 0.4, "glucides_g": 15, "lipides_g": 0.1, "sucre_g": 10, "sel_g": 0, "fibres_g": 3.1},
    "pepper": {"calories": 31, "proteines_g": 1, "glucides_g": 6, "lipides_g": 0.3, "sucre_g": 4.2, "sel_g": 0, "fibres_g": 2.1},
    "pineapple": {"calories": 50, "proteines_g": 0.5, "glucides_g": 13, "lipides_g": 0.1, "sucre_g": 10, "sel_g": 0, "fibres_g": 1.4},
    "pizza": {"calories": 266, "proteines_g": 11, "glucides_g": 33, "lipides_g": 10, "sucre_g": 3.6, "sel_g": 1.5, "fibres_g": 2.3},
    "potato": {"calories": 77, "proteines_g": 2, "glucides_g": 17, "lipides_g": 0.1, "sucre_g": 0.8, "sel_g": 0, "fibres_g": 2.2},
    "pumpkin": {"calories": 26, "proteines_g": 1, "glucides_g": 6.5, "lipides_g": 0.1, "sucre_g": 2.8, "sel_g": 0, "fibres_g": 0.5},
    "rape": {"calories": 27, "proteines_g": 2.9, "glucides_g": 5.7, "lipides_g": 0.1, "sucre_g": 1.3, "sel_g": 0, "fibres_g": 3.8},
    "raspberry": {"calories": 52, "proteines_g": 1.2, "glucides_g": 12, "lipides_g": 0.7, "sucre_g": 4.4, "sel_g": 0, "fibres_g": 6.5},
    "rice": {"calories": 130, "proteines_g": 2.7, "glucides_g": 28, "lipides_g": 0.3, "sucre_g": 0, "sel_g": 0, "fibres_g": 0.4},
    "sauce": {"calories": 80, "proteines_g": 1.5, "glucides_g": 15, "lipides_g": 2, "sucre_g": 8, "sel_g": 1.2, "fibres_g": 0.5},
    "seafood": {"calories": 99, "proteines_g": 20, "glucides_g": 1, "lipides_g": 1.5, "sucre_g": 0, "sel_g": 0.5, "fibres_g": 0},
    "soup": {"calories": 50, "proteines_g": 2.5, "glucides_g": 7, "lipides_g": 1.5, "sucre_g": 2, "sel_g": 0.8, "fibres_g": 1},
    "soy": {"calories": 173, "proteines_g": 17, "glucides_g": 10, "lipides_g": 9, "sucre_g": 3, "sel_g": 0, "fibres_g": 6},
    "strawberry": {"calories": 32, "proteines_g": 0.7, "glucides_g": 7.7, "lipides_g": 0.3, "sucre_g": 4.9, "sel_g": 0, "fibres_g": 2},
    "tofu": {"calories": 76, "proteines_g": 8, "glucides_g": 1.9, "lipides_g": 4.8, "sucre_g": 0.6, "sel_g": 0.1, "fibres_g": 0.3},
    "tomato": {"calories": 18, "proteines_g": 0.9, "glucides_g": 3.9, "lipides_g": 0.2, "sucre_g": 2.6, "sel_g": 0, "fibres_g": 1.2},
    "white radish": {"calories": 18, "proteines_g": 0.6, "glucides_g": 4.1, "lipides_g": 0.1, "sucre_g": 2.5, "sel_g": 0, "fibres_g": 1.6},
    "wine": {"calories": 83, "proteines_g": 0.1, "glucides_g": 2.7, "lipides_g": 0, "sucre_g": 0.6, "sel_g": 0, "fibres_g": 0},
    "default": {"calories": 150, "proteines_g": 5, "glucides_g": 20, "lipides_g": 5, "sucre_g": 3, "sel_g": 0.5, "fibres_g": 2},
}


@vision_bp.route("/api/analyse", methods=["POST"])
@jwt_required()
def analyse():
    if "image" not in request.files:
        return jsonify({"error": "Aucune image fournie"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Nom de fichier vide"}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_folder, filename)
    file.save(filepath)

    model = get_model()

    if model is None:
        aliments = MOCK_FOODS
        source = "mock"
    else:
        try:
            results = model(filepath)
            aliments = []
            for result in results:
                for i, box in enumerate(result.boxes):
                    cls_id = int(box.cls[0])
                    classe = model.names[cls_id]
                    confiance = float(box.conf[0])
                    bbox = [round(float(x)) for x in box.xyxy[0].tolist()]
                    nutriments = NUTRIMENTS_TABLE.get(classe.lower(), NUTRIMENTS_TABLE["default"])
                    aliment = {
                        "classe": classe,
                        "confiance": round(confiance, 3),
                        "bbox": bbox,
                        "nutriments_100g": nutriments,
                    }
                    if result.masks is not None and i < len(result.masks):
                        mask_xy = result.masks[i].xy
                        if len(mask_xy) > 0:
                            aliment["masque"] = [[round(float(p[0])), round(float(p[1]))] for p in mask_xy[0]]
                    aliments.append(aliment)
            source = "yolo"
        except Exception as e:
            current_app.logger.error(f"YOLO inference error: {e}")
            aliments = MOCK_FOODS
            source = "mock_fallback"

    return jsonify({
        "aliments": aliments,
        "image_path": filepath,
        "source": source,
    }), 200