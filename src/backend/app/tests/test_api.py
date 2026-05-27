import hashlib
import pytest
from app import create_app
from app.config import TestConfig
from app.models.db import db as _db, Merchant

API_KEY = "brk_live_abc123"
AUTH = {"Authorization": f"Bearer {API_KEY}"}


@pytest.fixture
def client():
    app = create_app(TestConfig)
    app.config["TESTING"] = True

    with app.app_context():
        _db.create_all()

        # Seed a merchant whose hashed key matches API_KEY
        merchant = Merchant(
            name="Test Merchant",
            email="test@example.com",
            api_key_hash=hashlib.sha256(API_KEY.encode()).hexdigest(),
            active=True,
        )
        _db.session.add(merchant)
        _db.session.commit()

        with app.test_client() as c:
            yield c

        _db.drop_all()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json["status"] == "ok"


def test_ready(client):
    r = client.get("/ready")
    assert r.status_code == 200
    assert r.json["ready"] is True


def test_no_auth(client):
    r = client.get("/api/v1/transactions")
    assert r.status_code == 401


def test_list_transactions(client):
    r = client.get("/api/v1/transactions", headers=AUTH)
    assert r.status_code == 200
    assert "data" in r.json


def test_create_transaction(client):
    payload = {"amount": 99.99, "method": "card", "currency": "USD"}
    r = client.post("/api/v1/transactions", json=payload, headers=AUTH)
    assert r.status_code == 201
    assert r.json["transaction"]["status"] == "pending"
    assert r.json["transaction"]["amount"] == 99.99


def test_create_transaction_invalid(client):
    r = client.post("/api/v1/transactions", json={"amount": -5, "method": "card"}, headers=AUTH)
    assert r.status_code == 400


def test_get_transaction(client):
    payload = {"amount": 50.0, "method": "transfer", "currency": "USD"}
    created = client.post("/api/v1/transactions", json=payload, headers=AUTH).json
    txn_id = created["transaction"]["id"]

    r = client.get(f"/api/v1/transactions/{txn_id}", headers=AUTH)
    assert r.status_code == 200
    assert r.json["transaction"]["id"] == txn_id


def test_analytics_summary(client):
    r = client.get("/api/v1/analytics/summary", headers=AUTH)
    assert r.status_code == 200
    assert "summary" in r.json


def test_analytics_timeseries(client):
    r = client.get("/api/v1/analytics/timeseries", headers=AUTH)
    assert r.status_code == 200
    assert len(r.json["timeseries"]) == 30
