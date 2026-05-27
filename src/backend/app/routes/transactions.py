from flask import Blueprint, request, g
from ..models.db import db, Transaction
from ..services import require_api_key, api_response, api_error, dispatch_webhook

bp = Blueprint("transactions", __name__)

VALID_METHODS = {"card", "transfer", "wallet"}
VALID_CURRENCIES = {"USD", "EUR", "GBP"}


@bp.get("/transactions")
@require_api_key
def list_transactions():
    page = int(request.args.get("page", 1))
    limit = min(int(request.args.get("limit", 20)), 100)
    query = Transaction.query.filter_by(merchant_id=g.merchant.id)

    if status := request.args.get("status"):
        query = query.filter_by(status=status)
    if method := request.args.get("method"):
        query = query.filter_by(method=method)

    query = query.order_by(Transaction.created_at.desc())
    paginated = query.paginate(page=page, per_page=limit, error_out=False)

    return api_response({
        "data": [t.to_dict() for t in paginated.items],
        "page": page,
        "limit": limit,
        "total": paginated.total,
        "pages": paginated.pages,
    })


@bp.get("/transactions/<txn_id>")
@require_api_key
def get_txn(txn_id):
    txn = Transaction.query.filter_by(id=txn_id, merchant_id=g.merchant.id).first()
    if not txn:
        return api_error("Transaction not found", 404, "NOT_FOUND")
    return api_response({"transaction": txn.to_dict()})


@bp.post("/transactions")
@require_api_key
def create_txn():
    body = request.get_json(silent=True) or {}
    amount = body.get("amount")
    method = body.get("method")
    currency = body.get("currency", "USD")

    if not isinstance(amount, (int, float)) or amount <= 0:
        return api_error("amount must be a positive number")
    if method not in VALID_METHODS:
        return api_error(f"method must be one of: {', '.join(VALID_METHODS)}")
    if currency not in VALID_CURRENCIES:
        return api_error(f"Unsupported currency. Use: {', '.join(VALID_CURRENCIES)}")

    txn = Transaction(
        merchant_id=g.merchant.id,
        amount=round(float(amount), 2),
        currency=currency,
        status="pending",
        method=method,
        description=body.get("description", "")[:256],
    )
    db.session.add(txn)
    db.session.commit()
    return api_response({"transaction": txn.to_dict()}, 201)


@bp.post("/transactions/<txn_id>/refund")
@require_api_key
def refund_txn(txn_id):
    txn = Transaction.query.filter_by(id=txn_id, merchant_id=g.merchant.id).first()
    if not txn:
        return api_error("Transaction not found", 404, "NOT_FOUND")
    if txn.status != "completed":
        return api_error("Only completed transactions can be refunded", 409, "CONFLICT")

    txn.status = "refunded"
    db.session.commit()
    dispatch_webhook(g.merchant.id, "payment.refunded", txn.to_dict())
    return api_response({"transaction": txn.to_dict()})


@bp.post("/transactions/<txn_id>/capture")
@require_api_key
def capture_txn(txn_id):
    txn = Transaction.query.filter_by(id=txn_id, merchant_id=g.merchant.id).first()
    if not txn:
        return api_error("Transaction not found", 404, "NOT_FOUND")
    if txn.status != "pending":
        return api_error("Only pending transactions can be captured", 409, "CONFLICT")

    txn.status = "completed"
    db.session.commit()
    dispatch_webhook(g.merchant.id, "payment.completed", txn.to_dict())
    return api_response({"transaction": txn.to_dict()})
