import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db
from routes.auth import auth_bp
from routes.vision import vision_bp
from routes.nutrition import nutrition_bp
from routes.profil import profil_bp
from routes.historique import historique_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(vision_bp)
    app.register_blueprint(nutrition_bp)
    app.register_blueprint(profil_bp)
    app.register_blueprint(historique_bp)

    with app.app_context():
        db.create_all()

    @app.route("/api/health")
    def health():
        return {"status": "ok", "service": "nutrition-platform"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
