import uuid
import secrets
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Merchant(db.Model):
    id = db.Column(db.String(32), primary_key=True, default=lambda: new_id("mer"))
    name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(256))
    api_key_hash = db.Column(db.String(64), unique=True, nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))


class Transaction(db.Model):
    id = db.Column(db.String(32), primary_key=True, default=lambda: new_id("txn"))
    merchant_id = db.Column(db.String(32), db.ForeignKey("merchant.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(3), default="USD")
    status = db.Column(db.String(16), default="pending")
    method = db.Column(db.String(16), nullable=False)
    description = db.Column(db.String(256), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            "id": self.id, "merchant_id": self.merchant_id,
            "amount": float(self.amount), "currency": self.currency,
            "status": self.status, "method": self.method,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class Webhook(db.Model):
    id = db.Column(db.String(32), primary_key=True, default=lambda: new_id("wh"))
    merchant_id = db.Column(db.String(32), db.ForeignKey("merchant.id"), nullable=False)
    url = db.Column(db.String(512), nullable=False)
    events = db.Column(db.JSON, default=list)
    secret = db.Column(db.String(64), default=lambda: secrets.token_hex(24))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self, include_secret=False):
        d = {
            "id": self.id, "merchant_id": self.merchant_id,
            "url": self.url, "events": self.events,
            "active": self.active, "created_at": self.created_at.isoformat(),
        }
        if include_secret:
            d["secret"] = self.secret
        return d


def get_merchant_by_key(raw_key: str):
    import hashlib
    hashed = hashlib.sha256(raw_key.encode()).hexdigest()
    return Merchant.query.filter_by(api_key_hash=hashed, active=True).first()
