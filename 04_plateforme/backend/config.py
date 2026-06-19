import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-prod")
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/nutrition_db")
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-secret-key-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "/tmp/nutrition_uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH", "food_yolov8_best.pt")
