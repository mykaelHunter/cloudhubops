from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from .models.db import db
from .config import Config


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    # Only build the URL from parts if the config didn't already provide one
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        app.config["SQLALCHEMY_DATABASE_URI"] = Config.get_sqlalchemy_url()

    db.init_app(app)
    Migrate(app, db)
    CORS(app, origins=app.config["ALLOWED_ORIGINS"])

    PrometheusMetrics(app)

    from .routes.transactions import bp as transactions_bp
    from .routes.analytics import bp as analytics_bp
    from .routes.webhooks import bp as webhooks_bp
    from .routes.health import bp as health_bp
    from .routes.merchant import bp as merchant_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(transactions_bp, url_prefix="/api/v1")
    app.register_blueprint(analytics_bp, url_prefix="/api/v1")
    app.register_blueprint(webhooks_bp, url_prefix="/api/v1")
    app.register_blueprint(merchant_bp, url_prefix="/api/v1")

    return app
