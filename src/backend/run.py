# run.py
import os
from app import create_app
from app.config import Config, TestConfig

config_map = {
    "testing": TestConfig,
    "production": Config,
}

config = config_map.get(os.environ.get("FLASK_ENV", "production"), Config)
app = create_app(config)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=app.config.get("DEBUG", False))
