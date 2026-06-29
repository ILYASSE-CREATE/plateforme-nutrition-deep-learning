"""
Backend Flask — Plateforme Nutrition Deep Learning
===================================================
API REST avec :
  - Authentification JWT
  - Analyse d'image YOLOv8-seg + estimation des portions
  - Calcul nutritionnel (Mifflin-St Jeor)
  - Moteur de règles médicales
  - Historique des repas (PostgreSQL via SQLAlchemy)
  - Scan de code-barres (Open Food Facts)
"""

import os
import sys
import io
import base64
import logging
import hashlib
import time
from datetime import datetime, timedelta
from functools import wraps

import requests
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from PIL import Image

from besoins_mifflin import besoins_journaliers
from moteur_regles import evaluer, REGLES
# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"])

_db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/nutrition_db"
)
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = _db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-prod")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ─────────────────────────────────────────────
# Chargement YOLOv8 (une seule fois au démarrage)
# ─────────────────────────────────────────────
MODEL = None
MODEL_PATH = os.path.join(os.path.dirname(__file__), "food_yolov8_best.pt")
def load_model():
    global MODEL
    if MODEL is not None:
        return MODEL
    try:
        import torch
        from ultralytics import YOLO
        from ultralytics.nn.tasks import SegmentationModel
        torch.serialization.add_safe_globals([SegmentationModel])
        if os.path.exists(MODEL_PATH):
            MODEL = YOLO(MODEL_PATH)
            logger.info("Modèle YOLOv8 chargé : %s", MODEL_PATH)
        else:
            logger.warning("Modèle non trouvé : %s — mode démo activé", MODEL_PATH)
    except ImportError:
        logger.warning("ultralytics non installé — mode démo activé")
    except Exception as e:
        logger.error("Erreur chargement modele: %s", e)
    return MODEL

# ─────────────────────────────────────────────
# Table nutritionnelle (valeurs pour 100 g)
# ─────────────────────────────────────────────
NUTRIMENTS = {
    "apple":             {"calories": 52,  "proteines_g": 0.3,  "glucides_g": 14.0, "lipides_g": 0.2,  "fibres_g": 2.4,  "sucre_g": 10.0, "sel_g": 0.0,  "potassium_mg": 107, "index_glycemique": 38},
    "asparagus":         {"calories": 20,  "proteines_g": 2.2,  "glucides_g": 3.9,  "lipides_g": 0.1,  "fibres_g": 2.1,  "sucre_g": 1.9,  "sel_g": 0.0,  "potassium_mg": 202, "index_glycemique": 15},
    "avocado":           {"calories": 160, "proteines_g": 2.0,  "glucides_g": 9.0,  "lipides_g": 15.0, "fibres_g": 6.7,  "sucre_g": 0.7,  "sel_g": 0.0,  "potassium_mg": 485, "index_glycemique": 10},
    "banana":            {"calories": 89,  "proteines_g": 1.1,  "glucides_g": 23.0, "lipides_g": 0.3,  "fibres_g": 2.6,  "sucre_g": 12.0, "sel_g": 0.0,  "potassium_mg": 358, "index_glycemique": 51},
    "beans":             {"calories": 31,  "proteines_g": 1.8,  "glucides_g": 7.0,  "lipides_g": 0.1,  "fibres_g": 2.7,  "sucre_g": 3.3,  "sel_g": 0.0,  "potassium_mg": 211, "index_glycemique": 30},
    "biscuit":           {"calories": 480, "proteines_g": 6.0,  "glucides_g": 65.0, "lipides_g": 22.0, "fibres_g": 2.0,  "sucre_g": 25.0, "sel_g": 0.6,  "potassium_mg": 90,  "index_glycemique": 70},
    "blueberry":         {"calories": 57,  "proteines_g": 0.7,  "glucides_g": 14.0, "lipides_g": 0.3,  "fibres_g": 2.4,  "sucre_g": 10.0, "sel_g": 0.0,  "potassium_mg": 77,  "index_glycemique": 53},
    "bread":             {"calories": 265, "proteines_g": 9.0,  "glucides_g": 49.0, "lipides_g": 3.2,  "fibres_g": 2.7,  "sucre_g": 5.0,  "sel_g": 1.2,  "potassium_mg": 115, "index_glycemique": 70},
    "broccoli":          {"calories": 34,  "proteines_g": 2.8,  "glucides_g": 6.6,  "lipides_g": 0.4,  "fibres_g": 2.6,  "sucre_g": 1.7,  "sel_g": 0.0,  "potassium_mg": 316, "index_glycemique": 10},
    "cabbage":           {"calories": 25,  "proteines_g": 1.3,  "glucides_g": 5.8,  "lipides_g": 0.1,  "fibres_g": 2.5,  "sucre_g": 3.2,  "sel_g": 0.0,  "potassium_mg": 170, "index_glycemique": 10},
    "carrot":            {"calories": 41,  "proteines_g": 0.9,  "glucides_g": 10.0, "lipides_g": 0.2,  "fibres_g": 2.8,  "sucre_g": 4.7,  "sel_g": 0.1,  "potassium_mg": 320, "index_glycemique": 35},
    "cauliflower":       {"calories": 25,  "proteines_g": 1.9,  "glucides_g": 5.0,  "lipides_g": 0.3,  "fibres_g": 2.0,  "sucre_g": 1.9,  "sel_g": 0.0,  "potassium_mg": 299, "index_glycemique": 15},
    "celery_stick":      {"calories": 16,  "proteines_g": 0.7,  "glucides_g": 3.0,  "lipides_g": 0.2,  "fibres_g": 1.6,  "sucre_g": 1.3,  "sel_g": 0.08, "potassium_mg": 260, "index_glycemique": 15},
    "cheese_butter":     {"calories": 402, "proteines_g": 25.0, "glucides_g": 1.3,  "lipides_g": 33.0, "fibres_g": 0.0,  "sucre_g": 0.5,  "sel_g": 1.7,  "potassium_mg": 98,  "index_glycemique": 0},
    "cherry":            {"calories": 63,  "proteines_g": 1.1,  "glucides_g": 16.0, "lipides_g": 0.2,  "fibres_g": 2.1,  "sucre_g": 13.0, "sel_g": 0.0,  "potassium_mg": 222, "index_glycemique": 22},
    "chicken_duck":      {"calories": 165, "proteines_g": 31.0, "glucides_g": 0.0,  "lipides_g": 3.6,  "fibres_g": 0.0,  "sucre_g": 0.0,  "sel_g": 0.3,  "potassium_mg": 256, "index_glycemique": 0},
    "chocolate":         {"calories": 546, "proteines_g": 5.0,  "glucides_g": 60.0, "lipides_g": 31.0, "fibres_g": 7.0,  "sucre_g": 48.0, "sel_g": 0.1,  "potassium_mg": 559, "index_glycemique": 40},
    "cilantro_mint":     {"calories": 23,  "proteines_g": 2.1,  "glucides_g": 3.7,  "lipides_g": 0.5,  "fibres_g": 2.8,  "sucre_g": 0.9,  "sel_g": 0.05, "potassium_mg": 521, "index_glycemique": 5},
    "corn":              {"calories": 86,  "proteines_g": 3.3,  "glucides_g": 19.0, "lipides_g": 1.4,  "fibres_g": 2.7,  "sucre_g": 3.2,  "sel_g": 0.0,  "potassium_mg": 270, "index_glycemique": 52},
    "cucumber":          {"calories": 15,  "proteines_g": 0.7,  "glucides_g": 3.6,  "lipides_g": 0.1,  "fibres_g": 0.5,  "sucre_g": 1.7,  "sel_g": 0.0,  "potassium_mg": 147, "index_glycemique": 15},
    "egg":               {"calories": 155, "proteines_g": 13.0, "glucides_g": 1.1,  "lipides_g": 11.0, "fibres_g": 0.0,  "sucre_g": 1.1,  "sel_g": 0.4,  "potassium_mg": 138, "index_glycemique": 0},
    "fish":              {"calories": 120, "proteines_g": 20.0, "glucides_g": 0.0,  "lipides_g": 4.0,  "fibres_g": 0.0,  "sucre_g": 0.0,  "sel_g": 0.4,  "potassium_mg": 400, "index_glycemique": 0},
    "french_fries":      {"calories": 312, "proteines_g": 3.4,  "glucides_g": 41.0, "lipides_g": 15.0, "fibres_g": 3.8,  "sucre_g": 0.3,  "sel_g": 0.5,  "potassium_mg": 579, "index_glycemique": 75},
    "garlic":            {"calories": 149, "proteines_g": 6.4,  "glucides_g": 33.0, "lipides_g": 0.5,  "fibres_g": 2.1,  "sucre_g": 1.0,  "sel_g": 0.0,  "potassium_mg": 401, "index_glycemique": 30},
    "grape":             {"calories": 67,  "proteines_g": 0.6,  "glucides_g": 17.0, "lipides_g": 0.4,  "fibres_g": 0.9,  "sucre_g": 16.0, "sel_g": 0.0,  "potassium_mg": 191, "index_glycemique": 45},
    "green_onion":       {"calories": 32,  "proteines_g": 1.8,  "glucides_g": 7.3,  "lipides_g": 0.2,  "fibres_g": 2.6,  "sucre_g": 2.3,  "sel_g": 0.0,  "potassium_mg": 276, "index_glycemique": 15},
    "hot_drink":         {"calories": 1,   "proteines_g": 0.1,  "glucides_g": 0.0,  "lipides_g": 0.0,  "fibres_g": 0.0,  "sucre_g": 0.0,  "sel_g": 0.0,  "potassium_mg": 49,  "index_glycemique": 0},
    "ice_cream":         {"calories": 207, "proteines_g": 3.5,  "glucides_g": 24.0, "lipides_g": 11.0, "fibres_g": 0.7,  "sucre_g": 21.0, "sel_g": 0.2,  "potassium_mg": 164, "index_glycemique": 61},
    "juice":             {"calories": 45,  "proteines_g": 0.5,  "glucides_g": 11.0, "lipides_g": 0.1,  "fibres_g": 0.2,  "sucre_g": 9.0,  "sel_g": 0.0,  "potassium_mg": 150, "index_glycemique": 50},
    "kiwi":              {"calories": 61,  "proteines_g": 1.1,  "glucides_g": 15.0, "lipides_g": 0.5,  "fibres_g": 3.0,  "sucre_g": 9.0,  "sel_g": 0.0,  "potassium_mg": 312, "index_glycemique": 50},
    "lemon":             {"calories": 29,  "proteines_g": 1.1,  "glucides_g": 9.3,  "lipides_g": 0.3,  "fibres_g": 2.8,  "sucre_g": 2.5,  "sel_g": 0.0,  "potassium_mg": 138, "index_glycemique": 20},
    "lettuce":           {"calories": 15,  "proteines_g": 1.4,  "glucides_g": 2.9,  "lipides_g": 0.2,  "fibres_g": 1.3,  "sucre_g": 0.8,  "sel_g": 0.0,  "potassium_mg": 194, "index_glycemique": 15},
    "mango":             {"calories": 60,  "proteines_g": 0.8,  "glucides_g": 15.0, "lipides_g": 0.4,  "fibres_g": 1.6,  "sucre_g": 14.0, "sel_g": 0.0,  "potassium_mg": 168, "index_glycemique": 51},
    "meat":              {"calories": 250, "proteines_g": 26.0, "glucides_g": 0.0,  "lipides_g": 17.0, "fibres_g": 0.0,  "sucre_g": 0.0,  "sel_g": 0.5,  "potassium_mg": 318, "index_glycemique": 0},
    "milk":              {"calories": 42,  "proteines_g": 3.4,  "glucides_g": 5.0,  "lipides_g": 1.0,  "fibres_g": 0.0,  "sucre_g": 5.0,  "sel_g": 0.1,  "potassium_mg": 132, "index_glycemique": 27},
    "milkshake":         {"calories": 112, "proteines_g": 3.4,  "glucides_g": 18.0, "lipides_g": 3.0,  "fibres_g": 0.2,  "sucre_g": 16.0, "sel_g": 0.1,  "potassium_mg": 183, "index_glycemique": 55},
    "mushroom":          {"calories": 22,  "proteines_g": 3.1,  "glucides_g": 3.3,  "lipides_g": 0.3,  "fibres_g": 1.0,  "sucre_g": 2.0,  "sel_g": 0.0,  "potassium_mg": 318, "index_glycemique": 10},
    "noodles_pasta":     {"calories": 131, "proteines_g": 5.0,  "glucides_g": 25.0, "lipides_g": 1.1,  "fibres_g": 1.8,  "sucre_g": 0.6,  "sel_g": 0.0,  "potassium_mg": 44,  "index_glycemique": 55},
    "nuts":              {"calories": 607, "proteines_g": 20.0, "glucides_g": 21.0, "lipides_g": 54.0, "fibres_g": 7.0,  "sucre_g": 4.0,  "sel_g": 0.0,  "potassium_mg": 680, "index_glycemique": 15},
    "olives":            {"calories": 115, "proteines_g": 0.8,  "glucides_g": 6.0,  "lipides_g": 11.0, "fibres_g": 3.2,  "sucre_g": 0.0,  "sel_g": 1.6,  "potassium_mg": 8,   "index_glycemique": 15},
    "orange":            {"calories": 47,  "proteines_g": 0.9,  "glucides_g": 12.0, "lipides_g": 0.1,  "fibres_g": 2.4,  "sucre_g": 9.4,  "sel_g": 0.0,  "potassium_mg": 181, "index_glycemique": 42},
    "other_ingredients": {"calories": 100, "proteines_g": 5.0,  "glucides_g": 15.0, "lipides_g": 3.0,  "fibres_g": 1.5,  "sucre_g": 3.0,  "sel_g": 0.3,  "potassium_mg": 150, "index_glycemique": 40},
    "pastry":            {"calories": 350, "proteines_g": 5.0,  "glucides_g": 55.0, "lipides_g": 13.0, "fibres_g": 1.0,  "sucre_g": 35.0, "sel_g": 0.5,  "potassium_mg": 80,  "index_glycemique": 77},
    "peach":             {"calories": 39,  "proteines_g": 0.9,  "glucides_g": 9.5,  "lipides_g": 0.3,  "fibres_g": 1.5,  "sucre_g": 8.4,  "sel_g": 0.0,  "potassium_mg": 190, "index_glycemique": 42},
    "pear":              {"calories": 57,  "proteines_g": 0.4,  "glucides_g": 15.0, "lipides_g": 0.1,  "fibres_g": 3.1,  "sucre_g": 10.0, "sel_g": 0.0,  "potassium_mg": 116, "index_glycemique": 38},
    "pepper":            {"calories": 31,  "proteines_g": 1.0,  "glucides_g": 6.0,  "lipides_g": 0.3,  "fibres_g": 2.1,  "sucre_g": 4.2,  "sel_g": 0.0,  "potassium_mg": 211, "index_glycemique": 15},
    "pineapple":         {"calories": 50,  "proteines_g": 0.5,  "glucides_g": 13.0, "lipides_g": 0.1,  "fibres_g": 1.4,  "sucre_g": 10.0, "sel_g": 0.0,  "potassium_mg": 109, "index_glycemique": 59},
    "pizza":             {"calories": 266, "proteines_g": 11.0, "glucides_g": 33.0, "lipides_g": 10.0, "fibres_g": 2.3,  "sucre_g": 3.6,  "sel_g": 1.5,  "potassium_mg": 172, "index_glycemique": 60},
    "potato":            {"calories": 77,  "proteines_g": 2.0,  "glucides_g": 17.0, "lipides_g": 0.1,  "fibres_g": 2.2,  "sucre_g": 0.8,  "sel_g": 0.0,  "potassium_mg": 421, "index_glycemique": 65},
    "pumpkin":           {"calories": 26,  "proteines_g": 1.0,  "glucides_g": 6.5,  "lipides_g": 0.1,  "fibres_g": 0.5,  "sucre_g": 2.8,  "sel_g": 0.0,  "potassium_mg": 340, "index_glycemique": 75},
    "rape":              {"calories": 25,  "proteines_g": 2.5,  "glucides_g": 4.0,  "lipides_g": 0.3,  "fibres_g": 2.0,  "sucre_g": 1.0,  "sel_g": 0.03, "potassium_mg": 230, "index_glycemique": 15},
    "raspberry":         {"calories": 52,  "proteines_g": 1.2,  "glucides_g": 12.0, "lipides_g": 0.7,  "fibres_g": 6.5,  "sucre_g": 4.4,  "sel_g": 0.0,  "potassium_mg": 151, "index_glycemique": 32},
    "rice":              {"calories": 130, "proteines_g": 2.7,  "glucides_g": 28.0, "lipides_g": 0.3,  "fibres_g": 0.4,  "sucre_g": 0.0,  "sel_g": 0.0,  "potassium_mg": 35,  "index_glycemique": 73},
    "sauce":             {"calories": 100, "proteines_g": 1.5,  "glucides_g": 12.0, "lipides_g": 5.0,  "fibres_g": 0.8,  "sucre_g": 6.0,  "sel_g": 1.2,  "potassium_mg": 130, "index_glycemique": 45},
    "seafood":           {"calories": 99,  "proteines_g": 18.0, "glucides_g": 1.0,  "lipides_g": 1.5,  "fibres_g": 0.0,  "sucre_g": 0.0,  "sel_g": 0.9,  "potassium_mg": 260, "index_glycemique": 0},
    "soup":              {"calories": 50,  "proteines_g": 2.5,  "glucides_g": 7.0,  "lipides_g": 1.5,  "fibres_g": 1.5,  "sucre_g": 2.0,  "sel_g": 0.8,  "potassium_mg": 200, "index_glycemique": 30},
    "soy":               {"calories": 173, "proteines_g": 16.6, "glucides_g": 9.9,  "lipides_g": 9.0,  "fibres_g": 6.0,  "sucre_g": 3.0,  "sel_g": 0.0,  "potassium_mg": 515, "index_glycemique": 18},
    "strawberry":        {"calories": 32,  "proteines_g": 0.7,  "glucides_g": 7.7,  "lipides_g": 0.3,  "fibres_g": 2.0,  "sucre_g": 4.9,  "sel_g": 0.0,  "potassium_mg": 153, "index_glycemique": 40},
    "tofu":              {"calories": 76,  "proteines_g": 8.0,  "glucides_g": 1.9,  "lipides_g": 4.8,  "fibres_g": 0.3,  "sucre_g": 0.6,  "sel_g": 0.0,  "potassium_mg": 121, "index_glycemique": 15},
    "tomato":            {"calories": 18,  "proteines_g": 0.9,  "glucides_g": 3.9,  "lipides_g": 0.2,  "fibres_g": 1.2,  "sucre_g": 2.6,  "sel_g": 0.0,  "potassium_mg": 237, "index_glycemique": 15},
    "white_radish":      {"calories": 18,  "proteines_g": 0.6,  "glucides_g": 4.1,  "lipides_g": 0.1,  "fibres_g": 1.6,  "sucre_g": 2.5,  "sel_g": 0.04, "potassium_mg": 227, "index_glycemique": 15},
    "wine":              {"calories": 83,  "proteines_g": 0.1,  "glucides_g": 2.6,  "lipides_g": 0.0,  "fibres_g": 0.0,  "sucre_g": 0.6,  "sel_g": 0.0,  "potassium_mg": 104, "index_glycemique": 0},
    "aliment_inconnu":   {"calories": 100, "proteines_g": 5.0,  "glucides_g": 15.0, "lipides_g": 3.0,  "fibres_g": 1.5,  "sucre_g": 3.0,  "sel_g": 0.3,  "potassium_mg": 150, "index_glycemique": 40},
}

DENSITE = {
    "apple": 0.75, "asparagus": 0.4, "avocado": 0.9, "banana": 0.65, "beans": 0.6,
    "biscuit": 0.5, "blueberry": 0.7, "bread": 0.3, "broccoli": 0.4, "cabbage": 0.4,
    "carrot": 0.75, "cauliflower": 0.4, "celery_stick": 0.5, "cheese_butter": 1.1,
    "cherry": 0.8, "chicken_duck": 1.05, "chocolate": 1.3, "cilantro_mint": 0.2,
    "corn": 0.7, "cucumber": 0.95, "egg": 1.1, "fish": 1.0, "french_fries": 0.5,
    "garlic": 0.6, "grape": 0.9, "green_onion": 0.3, "hot_drink": 1.0, "ice_cream": 0.6,
    "juice": 1.0, "kiwi": 0.9, "lemon": 0.9, "lettuce": 0.2, "mango": 0.9, "meat": 1.05,
    "milk": 1.03, "milkshake": 1.0, "mushroom": 0.5, "noodles_pasta": 0.8, "nuts": 0.6,
    "olives": 0.9, "orange": 0.85, "other_ingredients": 0.7, "pastry": 0.4, "peach": 0.9,
    "pear": 0.8, "pepper": 0.7, "pineapple": 0.9, "pizza": 0.6, "potato": 0.8,
    "pumpkin": 0.7, "rape": 0.4, "raspberry": 0.7, "rice": 0.8, "sauce": 1.1,
    "seafood": 1.0, "soup": 1.0, "soy": 0.7, "strawberry": 0.7, "tofu": 1.0,
    "tomato": 0.95, "white_radish": 0.8, "wine": 1.0,
}

PORTION_TYPIQUE = {
    "apple": 180, "asparagus": 100, "avocado": 150, "banana": 120, "beans": 150,
    "biscuit": 30, "blueberry": 80, "bread": 80, "broccoli": 150, "cabbage": 120,
    "carrot": 100, "cauliflower": 150, "celery_stick": 60, "cheese_butter": 40,
    "cherry": 100, "chicken_duck": 150, "chocolate": 50, "cilantro_mint": 15,
    "corn": 150, "cucumber": 120, "egg": 60, "fish": 150, "french_fries": 130,
    "garlic": 10, "grape": 100, "green_onion": 30, "hot_drink": 250, "ice_cream": 100,
    "juice": 250, "kiwi": 90, "lemon": 60, "lettuce": 80, "mango": 150, "meat": 180,
    "milk": 250, "milkshake": 250, "mushroom": 80, "noodles_pasta": 200, "nuts": 30,
    "olives": 30, "orange": 150, "other_ingredients": 100, "pastry": 100, "peach": 150,
    "pear": 170, "pepper": 120, "pineapple": 150, "pizza": 250, "potato": 180,
    "pumpkin": 150, "rape": 100, "raspberry": 80, "rice": 200, "sauce": 50,
    "seafood": 120, "soup": 300, "soy": 100, "strawberry": 100, "tofu": 100,
    "tomato": 120, "white_radish": 100, "wine": 150,
    "aliment_inconnu": 100,
}

# ─────────────────────────────────────────────
# Modèles de base de données
# ─────────────────────────────────────────────
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profil = db.relationship("Profil", backref="user", uselist=False, cascade="all, delete-orphan")
    repas = db.relationship("Repas", backref="user", cascade="all, delete-orphan")


class Profil(db.Model):
    __tablename__ = "profils"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    nom = db.Column(db.String(100), nullable=True)
    sexe = db.Column(db.String(1), default="M")
    age = db.Column(db.Integer, default=25)
    poids_kg = db.Column(db.Float, default=70.0)
    taille_cm = db.Column(db.Float, default=170.0)
    activite = db.Column(db.String(20), default="modere")
    pathologie = db.Column(db.String(50), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Repas(db.Model):
    __tablename__ = "repas"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    aliments = db.Column(db.JSON, nullable=False)
    calories_total = db.Column(db.Float, default=0.0)
    proteines_g = db.Column(db.Float, default=0.0)
    glucides_g = db.Column(db.Float, default=0.0)
    lipides_g = db.Column(db.Float, default=0.0)
    source = db.Column(db.String(20), default="analyse")


# ─────────────────────────────────────────────
# Utilitaires
# ─────────────────────────────────────────────
def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()


def estimer_poids_portion(classe: str, aire_pixels: int, image_w: int, image_h: int) -> float:
    if aire_pixels <= 0 or image_w <= 0 or image_h <= 0:
        return PORTION_TYPIQUE.get(classe, 100)
    ratio_surface = aire_pixels / (image_w * image_h)
    surface_assiette_cm2 = 500.0
    surface_aliment_cm2 = ratio_surface * surface_assiette_cm2
    hauteur_cm = 2.0
    volume_cm3 = surface_aliment_cm2 * hauteur_cm
    densite = DENSITE.get(classe, 0.7)
    poids = volume_cm3 * densite
    return round(max(10.0, min(600.0, poids)), 1)


def calculer_nutriments(classe: str, poids_g: float) -> dict:
    ref = NUTRIMENTS.get(classe, NUTRIMENTS["aliment_inconnu"])
    facteur = poids_g / 100.0
    return {
        "nom": classe.replace("_", " ").title(),
        "poids_g": poids_g,
        "calories": round(ref["calories"] * facteur, 1),
        "proteines_g": round(ref["proteines_g"] * facteur, 1),
        "glucides_g": round(ref["glucides_g"] * facteur, 1),
        "lipides_g": round(ref["lipides_g"] * facteur, 1),
        "fibres_g": round(ref["fibres_g"] * facteur, 1),
        "sucre_g": round(ref["sucre_g"] * facteur, 1),
        "sel_g": round(ref["sel_g"] * facteur, 1),
        "potassium_mg": round(ref["potassium_mg"] * facteur, 1),
        "index_glycemique": ref["index_glycemique"],
    }


def nutriscore(calories, sucre_g, sel_g, fibres_g, proteines_g, lipides_g=0) -> str:
    def _pts(val, thresholds):
        return sum(1 for t in thresholds if val > t)
    pts_negatifs = (
        _pts(calories, [80, 160, 240, 320, 400, 480, 560, 640, 720, 800]) +
        _pts(sucre_g,  [3.4, 6.8, 10, 14, 17, 20, 24, 27, 31, 34]) +
        _pts(sel_g,    [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7, 3.0]) +
        _pts(lipides_g,[3, 6, 9, 12, 15, 18, 21, 24, 27, 30])
    )
    pts_positifs = (
        _pts(fibres_g,    [0.9, 1.9, 2.8, 3.7, 4.7]) +
        _pts(proteines_g, [1.6, 3.2, 4.8, 6.4, 8.0])
    )
    score = pts_negatifs - pts_positifs
    if score <= 2:  return "A"
    if score <= 6:  return "B"
    if score <= 11: return "C"
    if score <= 18: return "D"
    return "E"


def analyser_image_yolo(image_bytes: bytes) -> list:
    model = load_model()
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_w, img_h = img.size

    if model is None:
        return _demo_detections(img_w, img_h)

    results = model(img, conf=0.55, iou=0.45, verbose=False)
    detections = []
    classes_vues = {}

    for r in results:
        if r.boxes is None:
            continue
        boxes = r.boxes
        masks = r.masks

        for i, box in enumerate(boxes):
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            classe = model.names.get(cls_id, "aliment_inconnu").lower().replace(" ", "_")

            if masks is not None and i < len(masks.data):
                masque = masks.data[i].cpu().numpy()
                aire = int(masque.sum())
            else:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                aire = int((x2 - x1) * (y2 - y1))

            poids = estimer_poids_portion(classe, aire, img_w, img_h)

            if classe in classes_vues:
                classes_vues[classe]["poids_g"] += poids
                classes_vues[classe]["aire_pixels"] += aire
                classes_vues[classe]["confiance"] = max(classes_vues[classe]["confiance"], conf)
            else:
                classes_vues[classe] = {
                    "classe": classe,
                    "confiance": round(conf, 3),
                    "aire_pixels": aire,
                    "poids_g": poids,
                }

    for classe, det in classes_vues.items():
        poids = min(det["poids_g"], 400.0)
        det["poids_g"] = round(poids, 1)
        det["nutriments"] = calculer_nutriments(classe, poids)
        detections.append(det)

    return detections


def _demo_detections(img_w: int, img_h: int) -> list:
    aliments_demo = [
        ("chicken_duck", 0.92, int(img_w * img_h * 0.30)),
        ("rice",         0.87, int(img_w * img_h * 0.20)),
        ("lettuce",      0.73, int(img_w * img_h * 0.10)),
    ]
    detections = []
    for classe, conf, aire in aliments_demo:
        poids = estimer_poids_portion(classe, aire, img_w, img_h)
        det = {
            "classe": classe,
            "confiance": conf,
            "aire_pixels": aire,
            "poids_g": poids,
            "nutriments": calculer_nutriments(classe, poids),
        }
        detections.append(det)
    return detections


# ─────────────────────────────────────────────
# Routes : Authentification
# ─────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email et mot de passe requis"}), 400
    if len(password) < 6:
        return jsonify({"error": "Mot de passe trop court (minimum 6 caractères)"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Cet email est déjà utilisé"}), 409

    user = User(email=email, password_hash=hash_password(password))
    db.session.add(user)
    db.session.flush()

    profil = Profil(user_id=user.id)
    db.session.add(profil)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "email": email}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(
        email=email, password_hash=hash_password(password)
    ).first()
    if not user:
        return jsonify({"error": "Email ou mot de passe incorrect"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "email": user.email}), 200


# ─────────────────────────────────────────────
# Routes : Profil
# ─────────────────────────────────────────────
@app.route("/api/profil", methods=["GET"])
@jwt_required()
def get_profil():
    user_id = int(get_jwt_identity())
    profil = Profil.query.filter_by(user_id=user_id).first()
    if not profil:
        return jsonify({"error": "Profil introuvable"}), 404
    return jsonify({
        "profil": {
            "nom": profil.nom or "",
            "sexe": profil.sexe,
            "age": profil.age,
            "poids_kg": profil.poids_kg,
            "taille_cm": profil.taille_cm,
            "activite": profil.activite,
            "pathologie": profil.pathologie,
        }
    })


@app.route("/api/profil", methods=["PUT"])
@jwt_required()
def update_profil():
    user_id = int(get_jwt_identity())
    profil = Profil.query.filter_by(user_id=user_id).first()
    if not profil:
        profil = Profil(user_id=user_id)
        db.session.add(profil)

    data = request.get_json()
    if "nom" in data:       profil.nom = data["nom"]
    if "sexe" in data:      profil.sexe = data["sexe"]
    if "age" in data:       profil.age = int(data["age"])
    if "poids_kg" in data:  profil.poids_kg = float(data["poids_kg"])
    if "taille_cm" in data: profil.taille_cm = float(data["taille_cm"])
    if "activite" in data:  profil.activite = data["activite"]
    if "pathologie" in data:
        pathologie = data["pathologie"]
        profil.pathologie = pathologie if pathologie else None
    db.session.commit()

    try:
        besoins = besoins_journaliers(
            profil.sexe, profil.poids_kg, profil.taille_cm,
            profil.age, profil.activite, profil.pathologie
        )
    except Exception:
        besoins = {}

    return jsonify({"message": "Profil mis à jour", "besoins": besoins})


@app.route("/api/besoins", methods=["GET"])
@jwt_required()
def get_besoins():
    user_id = int(get_jwt_identity())
    profil = Profil.query.filter_by(user_id=user_id).first()
    if not profil:
        return jsonify({"error": "Profil non configuré"}), 404
    try:
        besoins = besoins_journaliers(
            profil.sexe, profil.poids_kg, profil.taille_cm,
            profil.age, profil.activite, profil.pathologie
        )
        return jsonify(besoins)
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ─────────────────────────────────────────────
# Routes : Analyse d'image (YOLOv8)
# ─────────────────────────────────────────────
@app.route("/api/analyse", methods=["POST"])
@jwt_required()
def analyse():
    user_id = int(get_jwt_identity())

    if "image" not in request.files:
        return jsonify({"error": "Aucune image fournie"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Fichier vide"}), 400

    image_bytes = file.read()

    try:
        detections = analyser_image_yolo(image_bytes)
    except Exception as e:
        logger.error("Erreur inférence : %s", e)
        return jsonify({"error": f"Erreur d'analyse : {str(e)}"}), 500

    if not detections:
        return jsonify({"aliments": [], "totaux": {}, "alertes": [], "nutriscore": "N/A"})

    totaux = {k: 0.0 for k in ["calories", "proteines_g", "glucides_g", "lipides_g",
                                 "fibres_g", "sucre_g", "sel_g", "potassium_mg"]}
    for det in detections:
        for k in totaux:
            totaux[k] += det["nutriments"].get(k, 0)
    totaux = {k: round(v, 1) for k, v in totaux.items()}

    ns = nutriscore(
        totaux["calories"], totaux["sucre_g"],
        totaux["sel_g"], totaux["fibres_g"], totaux["proteines_g"],
        totaux.get("lipides_g", 0)
    )

    profil = Profil.query.filter_by(user_id=user_id).first()
    pathologie = profil.pathologie if profil else None
    alertes = []
    if pathologie:
        eval_repas = evaluer(totaux, pathologie)
        alertes = eval_repas.get("alertes", [])

    aliments_json = [
        {"nom": d["nutriments"]["nom"], "poids_g": d["poids_g"],
         "confiance": d["confiance"], **{k: d["nutriments"][k]
         for k in ["calories", "proteines_g", "glucides_g", "lipides_g"]}}
        for d in detections
    ]
    repas = Repas(
        user_id=user_id,
        aliments=aliments_json,
        calories_total=totaux["calories"],
        proteines_g=totaux["proteines_g"],
        glucides_g=totaux["glucides_g"],
        lipides_g=totaux["lipides_g"],
        source="analyse"
    )
    db.session.add(repas)
    db.session.commit()

    return jsonify({
        "aliments": detections,
        "totaux": totaux,
        "alertes": alertes,
        "pathologie": pathologie,
        "nutriscore": ns,
        "repas_id": repas.id,
    })


# ─────────────────────────────────────────────
# Routes : Code-barres (Open Food Facts)
# ─────────────────────────────────────────────
@app.route("/api/barcode/<code>", methods=["GET"])
@jwt_required()
def barcode(code):
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{code}.json"
        resp = requests.get(url, timeout=10, headers={"User-Agent": "NutritionApp/1.0"})
        data = resp.json()
    except Exception as e:
        return jsonify({"error": f"Erreur Open Food Facts : {str(e)}"}), 502

    if data.get("status") != 1:
        return jsonify({"error": "Produit non trouvé"}), 404

    prod = data["product"]
    nutriments = prod.get("nutriments", {})

    return jsonify({
        "nom": prod.get("product_name", "Inconnu"),
        "marque": prod.get("brands", ""),
        "image": prod.get("image_url", ""),
        "nutriscore": prod.get("nutriscore_grade", "N/A").upper(),
        "quantite": prod.get("quantity", ""),
        "categories": prod.get("categories", ""),
        "nutriments": {
            "calories":    round(nutriments.get("energy-kcal_100g", 0), 1),
            "proteines_g": round(nutriments.get("proteins_100g", 0), 1),
            "glucides_g":  round(nutriments.get("carbohydrates_100g", 0), 1),
            "lipides_g":   round(nutriments.get("fat_100g", 0), 1),
            "fibres_g":    round(nutriments.get("fiber_100g", 0), 1),
            "sucre_g":     round(nutriments.get("sugars_100g", 0), 1),
            "sel_g":       round(nutriments.get("salt_100g", 0), 1),
        }
    })


# ─────────────────────────────────────────────
# Routes : Historique
# ─────────────────────────────────────────────
@app.route("/api/historique", methods=["GET"])
@jwt_required()
def historique():
    user_id = int(get_jwt_identity())
    limit = min(int(request.args.get("limit", 20)), 100)
    repas_list = (
        Repas.query
        .filter_by(user_id=user_id)
        .order_by(Repas.date.desc())
        .limit(limit)
        .all()
    )
    return jsonify({"historique": [{
        "id": r.id,
        "timestamp": r.date.isoformat(),
        "aliments": r.aliments or [],
        "aliments_detectes": r.aliments or [],
        "nutriments_total": {
            "calories":    r.calories_total or 0,
            "proteines_g": r.proteines_g or 0,
            "glucides_g":  r.glucides_g or 0,
            "lipides_g":   r.lipides_g or 0,
            "fibres_g": 0,
            "sucre_g": 0,
            "sel_g": 0,
        },
        "nutriscore": nutriscore(
            r.calories_total or 0, 0, 0, 0,
            r.proteines_g or 0, r.lipides_g or 0
        ),
        "source": r.source,
    } for r in repas_list]})


@app.route("/api/historique/stats", methods=["GET"])
@jwt_required()
def historique_stats():
    user_id = int(get_jwt_identity())
    depuis = datetime.utcnow() - timedelta(days=7)
    repas_list = Repas.query.filter(
        Repas.user_id == user_id,
        Repas.date >= depuis
    ).all()

    par_jour = {}
    for r in repas_list:
        jour = r.date.strftime("%Y-%m-%d")
        if jour not in par_jour:
            par_jour[jour] = {"calories": 0, "proteines_g": 0, "glucides_g": 0, "lipides_g": 0}
        par_jour[jour]["calories"] += r.calories_total
        par_jour[jour]["proteines_g"] += r.proteines_g
        par_jour[jour]["glucides_g"] += r.glucides_g
        par_jour[jour]["lipides_g"] += r.lipides_g

    return jsonify({"par_jour": par_jour})


@app.route("/api/historique/<int:repas_id>", methods=["DELETE"])
@jwt_required()
def supprimer_repas(repas_id):
    user_id = int(get_jwt_identity())
    repas = Repas.query.filter_by(id=repas_id, user_id=user_id).first()
    if not repas:
        return jsonify({"error": "Repas introuvable"}), 404
    db.session.delete(repas)
    db.session.commit()
    return jsonify({"message": "Repas supprimé"})

# ─────────────────────────────────────────────
# Routes : Recommandations
# ─────────────────────────────────────────────
@app.route("/api/recommandations", methods=["GET"])
@jwt_required()
def recommandations():
    user_id = int(get_jwt_identity())
    profil = Profil.query.filter_by(user_id=user_id).first()
    if not profil:
        return jsonify({"error": "Profil non configuré"}), 404

    try:
        besoins = besoins_journaliers(
            profil.sexe, profil.poids_kg, profil.taille_cm,
            profil.age, profil.activite, profil.pathologie
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    aujourd_hui = datetime.utcnow().date()
    repas_jour = Repas.query.filter(
        Repas.user_id == user_id,
        db.func.date(Repas.date) == aujourd_hui
    ).all()

    consomme = {"calories": 0, "proteines_g": 0, "glucides_g": 0, "lipides_g": 0}
    for r in repas_jour:
        consomme["calories"] += r.calories_total
        consomme["proteines_g"] += r.proteines_g
        consomme["glucides_g"] += r.glucides_g
        consomme["lipides_g"] += r.lipides_g

    restant = {
        k: round(besoins.get(k, 0) - consomme.get(k, 0), 1)
        for k in consomme
    }

    conseils = []
    alertes = []

    if profil.pathologie == "diabete":
        conseils.append("Privilégiez les aliments à index glycémique bas (< 55)")
        conseils.append("Consommez des fibres à chaque repas pour stabiliser la glycémie")
        alertes.append("Évitez les sucres ajoutés et les boissons sucrées")

    if profil.pathologie == "hypertension":
        conseils.append("Limitez votre consommation de sel à 2 g/repas maximum")
        conseils.append("Consommez des aliments riches en potassium (banane, épinards)")
        alertes.append("Évitez les plats préparés et charcuteries riches en sodium")

    if profil.pathologie == "obesite":
        conseils.append("Visez des repas inférieurs à 600 kcal")
        conseils.append("Augmentez les protéines pour favoriser la satiété")
        alertes.append("Évitez les aliments à haute densité calorique")

    if profil.pathologie == "insuffisance_renale":
        conseils.append("Limitez les protéines à 15 g par repas")
        conseils.append("Surveillez votre consommation de potassium")
        alertes.append("Évitez les aliments riches en potassium (banane, pomme de terre)")

    if profil.pathologie == "cholesterol":
        conseils.append("Évitez les graisses saturées et les fritures")
        conseils.append("Consommez des oméga-3 (saumon, noix, huile d'olive)")
        alertes.append("Limitez les produits laitiers entiers et la viande rouge")

    if profil.pathologie == "anemie":
        conseils.append("Consommez des aliments riches en fer (viande rouge, épinards, lentilles)")
        conseils.append("Associez le fer à la vitamine C pour améliorer l'absorption")
        alertes.append("Évitez le thé et le café pendant les repas (bloquent l'absorption du fer)")

    if not conseils:
        conseils = [
            "Mangez varié et équilibré en suivant vos besoins journaliers",
            "Consommez au moins 5 portions de fruits et légumes par jour",
            "Restez bien hydraté (1,5 à 2 litres d'eau par jour)",
        ]

    if restant["calories"] < 200:
        alertes.append("Vous avez presque atteint votre quota calorique journalier")

    return jsonify({
        "besoins": besoins,
        "consomme": {k: round(v, 1) for k, v in consomme.items()},
        "restant": restant,
        "conseils": conseils,
        "alertes": alertes,
        "pathologie": profil.pathologie,
    })


# ─────────────────────────────────────────────
# Routes : Recettes
# ─────────────────────────────────────────────
@app.route("/api/recettes", methods=["GET"])
@jwt_required()
def recettes():
    user_id = int(get_jwt_identity())
    profil = Profil.query.filter_by(user_id=user_id).first()
    pathologie = profil.pathologie if profil else None

    recettes_data = [
        {
            "id": 1, "categorie": "Marocain",
            "nom": "Tajine de poulet aux olives",
            "calories": 420, "proteines_g": 38, "glucides_g": 18, "lipides_g": 20,
            "fibres_g": 3.5, "sucre_g": 4, "sel_g": 1.4,
            "nutriscore": nutriscore(420, 4, 1.4, 3.5, 38, 20),
            "temps": "60 min",
            "description": "Tajine traditionnel mijoté avec olives vertes et citron confit.",
            "ingredients": ["poulet fermier", "olives vertes", "citron confit", "gingembre", "safran", "oignon", "huile d'olive", "coriandre"],
        },
        {
            "id": 2, "categorie": "Marocain",
            "nom": "Harira",
            "calories": 310, "proteines_g": 18, "glucides_g": 38, "lipides_g": 7,
            "fibres_g": 8, "sucre_g": 5, "sel_g": 1.1,
            "nutriscore": nutriscore(310, 5, 1.1, 8, 18, 7),
            "temps": "45 min",
            "description": "Soupe marocaine aux lentilles, pois chiches et tomates.",
            "ingredients": ["lentilles", "pois chiches", "tomates", "vermicelles", "coriandre", "céleri", "citron", "œuf"],
        },
        {
            "id": 3, "categorie": "Marocain",
            "nom": "Couscous aux légumes",
            "calories": 380, "proteines_g": 12, "glucides_g": 62, "lipides_g": 8,
            "fibres_g": 7, "sucre_g": 6, "sel_g": 0.9,
            "nutriscore": nutriscore(380, 6, 0.9, 7, 12, 8),
            "temps": "50 min",
            "description": "Couscous traditionnel avec navets, courgettes et pois chiches.",
            "ingredients": ["semoule de blé", "courgette", "carotte", "navet", "pois chiches", "oignon", "ras el hanout", "beurre"],
        },
        {
            "id": 4, "categorie": "Marocain",
            "nom": "Pastilla au poulet",
            "calories": 490, "proteines_g": 32, "glucides_g": 38, "lipides_g": 22,
            "fibres_g": 2, "sucre_g": 8, "sel_g": 1.2,
            "nutriscore": nutriscore(490, 8, 1.2, 2, 32, 22),
            "temps": "90 min",
            "description": "Feuilleté croustillant sucré-salé au poulet, amandes et cannelle.",
            "ingredients": ["poulet", "feuilles de brick", "amandes", "oignons", "œufs", "cannelle", "sucre glace", "gingembre"],
        },
        {
            "id": 5, "categorie": "Marocain",
            "nom": "Méchoui d'agneau",
            "calories": 460, "proteines_g": 42, "glucides_g": 0, "lipides_g": 32,
            "fibres_g": 0, "sucre_g": 0, "sel_g": 1.6,
            "nutriscore": nutriscore(460, 0, 1.6, 0, 42, 32),
            "temps": "180 min",
            "description": "Agneau rôti lentement aux herbes et épices marocaines.",
            "ingredients": ["épaule d'agneau", "cumin", "paprika", "ail", "beurre", "sel", "coriandre"],
        },
        {
            "id": 6, "categorie": "Marocain",
            "nom": "Briouats à la viande",
            "calories": 340, "proteines_g": 18, "glucides_g": 28, "lipides_g": 16,
            "fibres_g": 1.5, "sucre_g": 2, "sel_g": 1.0,
            "nutriscore": nutriscore(340, 2, 1.0, 1.5, 18, 16),
            "temps": "40 min",
            "description": "Triangles croustillants farcis à la viande hachée épicée.",
            "ingredients": ["bœuf haché", "feuilles de brick", "oignon", "persil", "cannelle", "cumin", "huile de friture"],
        },
        {
            "id": 7, "categorie": "Marocain",
            "nom": "Zaalouk (caviar d'aubergines)",
            "calories": 180, "proteines_g": 4, "glucides_g": 16, "lipides_g": 11,
            "fibres_g": 5, "sucre_g": 7, "sel_g": 0.8,
            "nutriscore": nutriscore(180, 7, 0.8, 5, 4, 11),
            "temps": "30 min",
            "description": "Salade cuite d'aubergines et tomates parfumée au cumin.",
            "ingredients": ["aubergines", "tomates", "ail", "cumin", "paprika", "huile d'olive", "persil"],
        },
        {
            "id": 8, "categorie": "Marocain",
            "nom": "Kefta aux épices",
            "calories": 390, "proteines_g": 28, "glucides_g": 10, "lipides_g": 26,
            "fibres_g": 1.5, "sucre_g": 3, "sel_g": 1.3,
            "nutriscore": nutriscore(390, 3, 1.3, 1.5, 28, 26),
            "temps": "25 min",
            "description": "Brochettes de viande hachée épicées grillées au barbecue.",
            "ingredients": ["viande hachée mixte", "oignon", "persil", "coriandre", "cumin", "paprika", "cannelle"],
        },
        {
            "id": 9, "categorie": "Marocain",
            "nom": "Taktouka (poivrons tomates)",
            "calories": 150, "proteines_g": 4, "glucides_g": 18, "lipides_g": 7,
            "fibres_g": 4, "sucre_g": 9, "sel_g": 0.6,
            "nutriscore": nutriscore(150, 9, 0.6, 4, 4, 7),
            "temps": "25 min",
            "description": "Salade cuite de poivrons et tomates confits à l'huile d'olive.",
            "ingredients": ["poivrons verts", "tomates", "ail", "huile d'olive", "cumin", "paprika", "persil"],
        },
        {
            "id": 10, "categorie": "Marocain",
            "nom": "Msemen (crêpes feuilletées)",
            "calories": 310, "proteines_g": 8, "glucides_g": 50, "lipides_g": 9,
            "fibres_g": 2, "sucre_g": 1, "sel_g": 0.5,
            "nutriscore": nutriscore(310, 1, 0.5, 2, 8, 9),
            "temps": "35 min",
            "description": "Crêpes feuilletées marocaines à la farine de blé, servies avec miel.",
            "ingredients": ["farine de blé", "semoule fine", "beurre", "huile", "sel", "eau"],
        },
        {
            "id": 11, "categorie": "Marocain",
            "nom": "Tajine de kefta aux œufs",
            "calories": 430, "proteines_g": 32, "glucides_g": 8, "lipides_g": 28,
            "fibres_g": 2, "sucre_g": 4, "sel_g": 1.4,
            "nutriscore": nutriscore(430, 4, 1.4, 2, 32, 28),
            "temps": "35 min",
            "description": "Boulettes de viande épicées en sauce tomate, œufs pochés dessus.",
            "ingredients": ["viande hachée", "tomates", "œufs", "poivron", "cumin", "paprika", "persil"],
        },
        {
            "id": 12, "categorie": "Marocain",
            "nom": "Soupe bissara (fèves)",
            "calories": 230, "proteines_g": 14, "glucides_g": 32, "lipides_g": 5,
            "fibres_g": 9, "sucre_g": 2, "sel_g": 0.7,
            "nutriscore": nutriscore(230, 2, 0.7, 9, 14, 5),
            "temps": "40 min",
            "description": "Soupe de fèves sèches à l'huile d'olive et cumin, typique du petit-déjeuner.",
            "ingredients": ["fèves sèches", "ail", "huile d'olive", "cumin", "paprika", "sel", "citron"],
        },
        {
            "id": 13, "categorie": "Marocain",
            "nom": "Chebakia (miel amandes)",
            "calories": 520, "proteines_g": 8, "glucides_g": 62, "lipides_g": 28,
            "fibres_g": 2.5, "sucre_g": 38, "sel_g": 0.3,
            "nutriscore": nutriscore(520, 38, 0.3, 2.5, 8, 28),
            "temps": "60 min",
            "description": "Pâtisserie marocaine frite enrobée de miel et sésame.",
            "ingredients": ["farine", "amandes", "sésame", "miel", "eau de fleur d'oranger", "anis", "safran"],
        },
        {
            "id": 14, "categorie": "Méditerranéen",
            "nom": "Salade de poulet grillé",
            "calories": 320, "proteines_g": 35, "glucides_g": 12, "lipides_g": 8,
            "fibres_g": 3, "sucre_g": 4, "sel_g": 0.8,
            "nutriscore": nutriscore(320, 4, 0.8, 3, 35, 8),
            "temps": "15 min",
            "description": "Salade fraîche riche en protéines avec vinaigrette citron-herbes.",
            "ingredients": ["poulet grillé", "laitue", "tomate", "concombre", "olives", "feta"],
        },
        {
            "id": 15, "categorie": "Méditerranéen",
            "nom": "Saumon aux légumes vapeur",
            "calories": 380, "proteines_g": 38, "glucides_g": 10, "lipides_g": 18,
            "fibres_g": 4, "sucre_g": 3, "sel_g": 0.7,
            "nutriscore": nutriscore(380, 3, 0.7, 4, 38, 18),
            "temps": "20 min",
            "description": "Saumon riche en oméga-3 avec légumes cuits à la vapeur.",
            "ingredients": ["saumon", "brocoli", "carotte", "citron", "aneth", "huile d'olive"],
        },
        {
            "id": 16, "categorie": "Méditerranéen",
            "nom": "Bol de riz complet au tofu",
            "calories": 420, "proteines_g": 20, "glucides_g": 55, "lipides_g": 12,
            "fibres_g": 5, "sucre_g": 3, "sel_g": 0.9,
            "nutriscore": nutriscore(420, 3, 0.9, 5, 20, 12),
            "temps": "25 min",
            "description": "Bol végétarien équilibré avec tofu doré et épinards.",
            "ingredients": ["riz complet", "tofu", "épinards", "sauce soja", "sésame", "gingembre"],
        },
        {
            "id": 17, "categorie": "Méditerranéen",
            "nom": "Soupe de lentilles",
            "calories": 280, "proteines_g": 18, "glucides_g": 35, "lipides_g": 5,
            "fibres_g": 8, "sucre_g": 5, "sel_g": 0.8,
            "nutriscore": nutriscore(280, 5, 0.8, 8, 18, 5),
            "temps": "30 min",
            "description": "Soupe légumineuse riche en fibres et protéines végétales.",
            "ingredients": ["lentilles vertes", "tomate", "oignon", "cumin", "citron", "huile d'olive"],
        },
        {
            "id": 18, "categorie": "Méditerranéen",
            "nom": "Omelette aux champignons",
            "calories": 250, "proteines_g": 22, "glucides_g": 5, "lipides_g": 16,
            "fibres_g": 1.5, "sucre_g": 2, "sel_g": 0.6,
            "nutriscore": nutriscore(250, 2, 0.6, 1.5, 22, 16),
            "temps": "10 min",
            "description": "Omelette moelleuse aux champignons et herbes fraîches.",
            "ingredients": ["œufs", "champignons", "persil", "thym", "huile d'olive", "sel"],
        },
        {
            "id": 19, "categorie": "Méditerranéen",
            "nom": "Wrap au thon avocat",
            "calories": 450, "proteines_g": 30, "glucides_g": 40, "lipides_g": 18,
            "fibres_g": 5, "sucre_g": 3, "sel_g": 1.0,
            "nutriscore": nutriscore(450, 3, 1.0, 5, 30, 18),
            "temps": "10 min",
            "description": "Wrap rapide et nutritif avec thon, avocat et légumes croquants.",
            "ingredients": ["tortilla", "thon", "avocat", "tomate", "laitue", "citron"],
        },
        {
            "id": 20, "categorie": "Méditerranéen",
            "nom": "Shakshuka",
            "calories": 290, "proteines_g": 18, "glucides_g": 22, "lipides_g": 14,
            "fibres_g": 4, "sucre_g": 10, "sel_g": 1.1,
            "nutriscore": nutriscore(290, 10, 1.1, 4, 18, 14),
            "temps": "25 min",
            "description": "Œufs pochés dans une sauce tomate épicée aux poivrons.",
            "ingredients": ["œufs", "tomates", "poivrons", "oignon", "ail", "cumin", "paprika", "feta"],
        },
        {
            "id": 21, "categorie": "Méditerranéen",
            "nom": "Taboulé maison",
            "calories": 220, "proteines_g": 6, "glucides_g": 32, "lipides_g": 8,
            "fibres_g": 4, "sucre_g": 3, "sel_g": 0.5,
            "nutriscore": nutriscore(220, 3, 0.5, 4, 6, 8),
            "temps": "20 min",
            "description": "Salade fraîche de boulgour, persil, tomate et menthe.",
            "ingredients": ["boulgour fin", "persil", "menthe", "tomate", "oignon", "citron", "huile d'olive"],
        },
        {
            "id": 22, "categorie": "Méditerranéen",
            "nom": "Houmous maison",
            "calories": 180, "proteines_g": 8, "glucides_g": 20, "lipides_g": 8,
            "fibres_g": 5, "sucre_g": 2, "sel_g": 0.6,
            "nutriscore": nutriscore(180, 2, 0.6, 5, 8, 8),
            "temps": "15 min",
            "description": "Purée de pois chiches crémeuse avec tahini et citron.",
            "ingredients": ["pois chiches", "tahini", "citron", "ail", "huile d'olive", "cumin", "paprika"],
        },
    ]

    if pathologie == "diabete":
        recettes_data = [r for r in recettes_data if r["glucides_g"] < 35]
    elif pathologie == "obesite":
        recettes_data = [r for r in recettes_data if r["calories"] < 400]
    elif pathologie == "hypertension":
        recettes_data = [r for r in recettes_data if r["sel_g"] < 1.0]

    return jsonify(recettes_data)


# ─────────────────────────────────────────────
# Santé
# ─────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    model = load_model()
    return jsonify({
        "status": "ok",
        "modele_charge": model is not None,
        "timestamp": datetime.utcnow().isoformat(),
    })


# ─────────────────────────────────────────────
# Initialisation
# ─────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        logger.info("Tables créées")
    load_model()
    app.run(debug=True, host="0.0.0.0", port=5000)