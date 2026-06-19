from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    profil = db.relationship("ProfilMedical", back_populates="user", uselist=False, cascade="all, delete-orphan")
    historique = db.relationship("RepasHistorique", back_populates="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }


class ProfilMedical(db.Model):
    __tablename__ = "profils_medicaux"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    age = db.Column(db.Integer, nullable=False)
    sexe = db.Column(db.String(1), nullable=False)
    poids_kg = db.Column(db.Float, nullable=False)
    taille_cm = db.Column(db.Float, nullable=False)
    activite = db.Column(db.String(20), nullable=False, default="modere")
    conditions = db.Column(db.JSON, default=list)

    user = db.relationship("User", back_populates="profil")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "age": self.age,
            "sexe": self.sexe,
            "poids_kg": self.poids_kg,
            "taille_cm": self.taille_cm,
            "activite": self.activite,
            "conditions": self.conditions or [],
        }


class RepasHistorique(db.Model):
    __tablename__ = "repas_historique"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    image_path = db.Column(db.String(500))
    aliments_detectes = db.Column(db.JSON, default=list)
    nutriments_total = db.Column(db.JSON, default=dict)
    recommandation = db.Column(db.JSON, default=dict)

    user = db.relationship("User", back_populates="historique")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat(),
            "image_path": self.image_path,
            "aliments_detectes": self.aliments_detectes or [],
            "nutriments_total": self.nutriments_total or {},
            "recommandation": self.recommandation or {},
        }
