import time
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)

_start = time.time()


@bp.get("/health")
def health():
    return jsonify({"status": "ok", "uptime": round(time.time() - _start, 2)}), 200


@bp.get("/ready")
def ready():
    # Extend to check DB / cache connectivity in production
    return jsonify({"ready": True}), 200


@bp.get("/metrics")
def metrics():
    from ..models.store import _transactions
    total = len(_transactions)
    completed = sum(1 for t in _transactions if t["status"] == "completed")
    failed = sum(1 for t in _transactions if t["status"] == "failed")
    volume = sum(t["amount"] for t in _transactions if t["status"] == "completed")
    rate = round(completed / total, 4) if total else 0

    body = f"""# HELP payday_transactions_total Total transactions
# TYPE payday_transactions_total counter
payday_transactions_total {total}

# HELP payday_transactions_completed_total Completed transactions
# TYPE payday_transactions_completed_total counter
payday_transactions_completed_total {completed}

# HELP payday_transactions_failed_total Failed transactions
# TYPE payday_transactions_failed_total counter
payday_transactions_failed_total {failed}

# HELP payday_payment_volume_usd Total payment volume USD
# TYPE payday_payment_volume_usd counter
payday_payment_volume_usd {volume:.2f}

# HELP payday_success_rate Transaction success rate
# TYPE payday_success_rate gauge
payday_success_rate {rate}
"""
    return body, 200, {"Content-Type": "text/plain; version=0.0.4"}
