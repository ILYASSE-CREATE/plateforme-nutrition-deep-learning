import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from PIL import Image

vision_bp = Blueprint("vision", __name__)

_model = None


def get_model():
    global _model
    if _model is not None:
        return _model
    model_path = current_app.config["YOLO_MODEL_PATH"]
    if not os.path.exists(model_path):
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
    "bread": {"calories": 265, "proteines_g": 9, "glucides_g": 49, "lipides_g": 3.2, "sucre_g": 5, "sel_g": 1.2, "fibres_g": 2.7},
    "egg": {"calories": 155, "proteines_g": 13, "glucides_g": 1.1, "lipides_g": 11, "sucre_g": 1.1, "sel_g": 0.4, "fibres_g": 0},
    "rice": {"calories": 130, "proteines_g": 2.7, "glucides_g": 28, "lipides_g": 0.3, "sucre_g": 0, "sel_g": 0, "fibres_g": 0.4},
    "noodle": {"calories": 138, "proteines_g": 4.5, "glucides_g": 25, "lipides_g": 2.1, "sucre_g": 0.5, "sel_g": 0.2, "fibres_g": 1.8},
    "pasta": {"calories": 131, "proteines_g": 5, "glucides_g": 25, "lipides_g": 1.1, "sucre_g": 0.6, "sel_g": 0, "fibres_g": 1.8},
    "pizza": {"calories": 266, "proteines_g": 11, "glucides_g": 33, "lipides_g": 10, "sucre_g": 3.6, "sel_g": 1.5, "fibres_g": 2.3},
    "hamburger": {"calories": 295, "proteines_g": 17, "glucides_g": 24, "lipides_g": 14, "sucre_g": 5, "sel_g": 1.9, "fibres_g": 1.3},
    "hamburg": {"calories": 295, "proteines_g": 17, "glucides_g": 24, "lipides_g": 14, "sucre_g": 5, "sel_g": 1.9, "fibres_g": 1.3},
    "french fries": {"calories": 312, "proteines_g": 3.4, "glucides_g": 41, "lipides_g": 15, "sucre_g": 0.3, "sel_g": 0.5, "fibres_g": 3.8},
    "sushi": {"calories": 150, "proteines_g": 6, "glucides_g": 27, "lipides_g": 2, "sucre_g": 4, "sel_g": 0.7, "fibres_g": 0.5},
    "salad": {"calories": 17, "proteines_g": 1.2, "glucides_g": 2.9, "lipides_g": 0.2, "sucre_g": 1.8, "sel_g": 0.1, "fibres_g": 1.5},
    "salade": {"calories": 17, "proteines_g": 1.2, "glucides_g": 2.9, "lipides_g": 0.2, "sucre_g": 1.8, "sel_g": 0.1, "fibres_g": 1.5},
    "chicken": {"calories": 165, "proteines_g": 31, "glucides_g": 0, "lipides_g": 3.6, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "beef": {"calories": 250, "proteines_g": 26, "glucides_g": 0, "lipides_g": 15, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "pork": {"calories": 242, "proteines_g": 27, "glucides_g": 0, "lipides_g": 14, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "fish": {"calories": 136, "proteines_g": 20, "glucides_g": 0, "lipides_g": 6, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "shrimp": {"calories": 99, "proteines_g": 24, "glucides_g": 0.2, "lipides_g": 0.3, "sucre_g": 0, "sel_g": 0.6, "fibres_g": 0},
    "tofu": {"calories": 76, "proteines_g": 8, "glucides_g": 1.9, "lipides_g": 4.8, "sucre_g": 0.6, "sel_g": 0.1, "fibres_g": 0.3},
    "potato": {"calories": 77, "proteines_g": 2, "glucides_g": 17, "lipides_g": 0.1, "sucre_g": 0.8, "sel_g": 0, "fibres_g": 2.2},
    "carrot": {"calories": 41, "proteines_g": 0.9, "glucides_g": 10, "lipides_g": 0.2, "sucre_g": 4.7, "sel_g": 0.1, "fibres_g": 2.8},
    "broccoli": {"calories": 34, "proteines_g": 2.8, "glucides_g": 7, "lipides_g": 0.4, "sucre_g": 1.7, "sel_g": 0, "fibres_g": 2.6},
    "corn": {"calories": 86, "proteines_g": 3.2, "glucides_g": 19, "lipides_g": 1.2, "sucre_g": 3.2, "sel_g": 0, "fibres_g": 2.7},
    "tomato": {"calories": 18, "proteines_g": 0.9, "glucides_g": 3.9, "lipides_g": 0.2, "sucre_g": 2.6, "sel_g": 0, "fibres_g": 1.2},
    "onion": {"calories": 40, "proteines_g": 1.1, "glucides_g": 9.3, "lipides_g": 0.1, "sucre_g": 4.2, "sel_g": 0, "fibres_g": 1.7},
    "mushroom": {"calories": 22, "proteines_g": 3.1, "glucides_g": 3.3, "lipides_g": 0.3, "sucre_g": 2, "sel_g": 0, "fibres_g": 1},
    "cabbage": {"calories": 25, "proteines_g": 1.3, "glucides_g": 5.8, "lipides_g": 0.1, "sucre_g": 3.2, "sel_g": 0, "fibres_g": 2.5},
    "spinach": {"calories": 23, "proteines_g": 2.9, "glucides_g": 3.6, "lipides_g": 0.4, "sucre_g": 0.4, "sel_g": 0.1, "fibres_g": 2.2},
    "apple": {"calories": 52, "proteines_g": 0.3, "glucides_g": 14, "lipides_g": 0.2, "sucre_g": 10, "sel_g": 0, "fibres_g": 2.4},
    "banana": {"calories": 89, "proteines_g": 1.1, "glucides_g": 23, "lipides_g": 0.3, "sucre_g": 12, "sel_g": 0, "fibres_g": 2.6},
    "strawberry": {"calories": 32, "proteines_g": 0.7, "glucides_g": 7.7, "lipides_g": 0.3, "sucre_g": 4.9, "sel_g": 0, "fibres_g": 2},
    "blueberry": {"calories": 57, "proteines_g": 0.7, "glucides_g": 14, "lipides_g": 0.3, "sucre_g": 10, "sel_g": 0, "fibres_g": 2.4},
    "grape": {"calories": 69, "proteines_g": 0.7, "glucides_g": 18, "lipides_g": 0.2, "sucre_g": 15, "sel_g": 0, "fibres_g": 0.9},
    "orange": {"calories": 47, "proteines_g": 0.9, "glucides_g": 12, "lipides_g": 0.1, "sucre_g": 9.4, "sel_g": 0, "fibres_g": 2.4},
    "milk": {"calories": 61, "proteines_g": 3.2, "glucides_g": 4.8, "lipides_g": 3.3, "sucre_g": 5.1, "sel_g": 0.1, "fibres_g": 0},
    "cheese": {"calories": 402, "proteines_g": 25, "glucides_g": 1.3, "lipides_g": 33, "sucre_g": 0.5, "sel_g": 1.7, "fibres_g": 0},
    "butter": {"calories": 717, "proteines_g": 0.9, "glucides_g": 0.1, "lipides_g": 81, "sucre_g": 0.1, "sel_g": 0.6, "fibres_g": 0},
    "cream": {"calories": 340, "proteines_g": 2.8, "glucides_g": 2.8, "lipides_g": 36, "sucre_g": 2.8, "sel_g": 0, "fibres_g": 0},
    "ice cream": {"calories": 207, "proteines_g": 3.5, "glucides_g": 24, "lipides_g": 11, "sucre_g": 21, "sel_g": 0.1, "fibres_g": 0.7},
    "cake": {"calories": 347, "proteines_g": 5, "glucides_g": 53, "lipides_g": 13, "sucre_g": 36, "sel_g": 0.4, "fibres_g": 1.2},
    "cookie": {"calories": 488, "proteines_g": 6.2, "glucides_g": 65, "lipides_g": 23, "sucre_g": 32, "sel_g": 0.6, "fibres_g": 2.5},
    "chocolate": {"calories": 546, "proteines_g": 5, "glucides_g": 60, "lipides_g": 31, "sucre_g": 48, "sel_g": 0.1, "fibres_g": 7},
    "soup": {"calories": 50, "proteines_g": 2.5, "glucides_g": 7, "lipides_g": 1.5, "sucre_g": 2, "sel_g": 0.8, "fibres_g": 1},
    "steak": {"calories": 271, "proteines_g": 26, "glucides_g": 0, "lipides_g": 18, "sucre_g": 0, "sel_g": 0.3, "fibres_g": 0},
    "hot dog": {"calories": 290, "proteines_g": 11, "glucides_g": 24, "lipides_g": 17, "sucre_g": 5, "sel_g": 1.8, "fibres_g": 1},
    "sandwich": {"calories": 250, "proteines_g": 12, "glucides_g": 30, "lipides_g": 9, "sucre_g": 4, "sel_g": 1.2, "fibres_g": 2},
    "taco": {"calories": 226, "proteines_g": 11, "glucides_g": 20, "lipides_g": 11, "sucre_g": 1.5, "sel_g": 0.8, "fibres_g": 3},
    "burrito": {"calories": 206, "proteines_g": 9, "glucides_g": 27, "lipides_g": 7, "sucre_g": 1, "sel_g": 0.9, "fibres_g": 3},
    "dumpling": {"calories": 190, "proteines_g": 8, "glucides_g": 28, "lipides_g": 5, "sucre_g": 1.5, "sel_g": 0.7, "fibres_g": 1},
    "spring roll": {"calories": 153, "proteines_g": 4, "glucides_g": 18, "lipides_g": 7, "sucre_g": 1, "sel_g": 0.5, "fibres_g": 1.5},
    "fried rice": {"calories": 163, "proteines_g": 4, "glucides_g": 28, "lipides_g": 4, "sucre_g": 0.5, "sel_g": 0.9, "fibres_g": 1},
    "curry": {"calories": 120, "proteines_g": 8, "glucides_g": 12, "lipides_g": 4, "sucre_g": 3, "sel_g": 0.8, "fibres_g": 2},
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
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    classe = model.names[cls_id]
                    confiance = float(box.conf[0])
                    bbox = [float(x) for x in box.xyxy[0].tolist()]
                    nutriments = NUTRIMENTS_TABLE.get(classe.lower(), NUTRIMENTS_TABLE["default"])
                    aliments.append({
                        "classe": classe,
                        "confiance": round(confiance, 3),
                        "bbox": [round(x) for x in bbox],
                        "nutriments_100g": nutriments,
                    })
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
