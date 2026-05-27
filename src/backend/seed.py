import hashlib
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.models.db import db, Merchant

app = create_app()

with app.app_context():
    db.create_all()

    merchants = [
        {"id": "mer_001", "name": "Brew & Co.",  "email": "ops@brewco.com",        "raw_key": "brk_live_abc123"},
        {"id": "mer_002", "name": "Pixel Labs",  "email": "billing@pixellabs.io",   "raw_key": "brk_live_def456"},
        {"id": "mer_003", "name": "Salt & Vine", "email": "hello@saltandvine.com",  "raw_key": "brk_live_ghi789"},
    ]

    for m in merchants:
        existing = Merchant.query.filter_by(id=m["id"]).first()
        if not existing:
            merchant = Merchant(
                id=m["id"],
                name=m["name"],
                email=m["email"],
                api_key_hash=hashlib.sha256(m["raw_key"].encode()).hexdigest(),
                active=True,
            )
            db.session.add(merchant)
            print(f"Created merchant: {m['name']} — key: {m['raw_key']}")
        else:
            print(f"Already exists: {m['name']}")

    db.session.commit()
    print("Done.")
