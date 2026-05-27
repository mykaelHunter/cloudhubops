from flask import Blueprint, g
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from ..models.db import db, Transaction
from ..services import require_api_key, api_response

bp = Blueprint("analytics", __name__)


@bp.get("/analytics/summary")
@require_api_key
def summary():
    base = Transaction.query.filter_by(merchant_id=g.merchant.id)

    total = base.count()
    completed = base.filter_by(status="completed").count()
    failed = base.filter_by(status="failed").count()
    volume = db.session.query(
        func.coalesce(func.sum(Transaction.amount), 0)
    ).filter_by(merchant_id=g.merchant.id, status="completed").scalar()

    by_method = {
        m: base.filter_by(method=m).count()
        for m in ("card", "transfer", "wallet")
    }

    return api_response({
        "summary": {
            "total_transactions": total,
            "completed": completed,
            "failed": failed,
            "success_rate": round(completed / total, 4) if total else 0,
            "total_volume_usd": float(volume),
            "by_method": by_method,
        }
    })


@bp.get("/analytics/timeseries")
@require_api_key
def timeseries():
    now = datetime.now(timezone.utc)
    days = []

    for i in range(29, -1, -1):
        day = (now - timedelta(days=i)).date()
        day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        base = Transaction.query.filter(
            Transaction.merchant_id == g.merchant.id,
            Transaction.created_at >= day_start,
            Transaction.created_at < day_end,
        )
        volume = db.session.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.merchant_id == g.merchant.id,
            Transaction.status == "completed",
            Transaction.created_at >= day_start,
            Transaction.created_at < day_end,
        ).scalar()

        days.append({
            "date": day.isoformat(),
            "count": base.count(),
            "volume": float(volume),
        })

    return api_response({"timeseries": days})
