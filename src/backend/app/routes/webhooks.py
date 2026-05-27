import re
from flask import Blueprint, request, g
from ..models.db import db, Webhook
from ..services import require_api_key, api_response, api_error

bp = Blueprint("webhooks", __name__)

VALID_EVENTS = {"payment.completed", "payment.failed", "payment.refunded"}


@bp.post("/webhooks")
@require_api_key
def register_webhook():
    body = request.get_json(silent=True) or {}
    url = body.get("url", "")
    events = body.get("events", list(VALID_EVENTS))

    if not url or not re.match(r"^https?://", url):
        return api_error("A valid webhook URL is required")
    invalid = [e for e in events if e not in VALID_EVENTS]
    if invalid:
        return api_error(f"Unknown events: {', '.join(invalid)}")

    hook = Webhook(merchant_id=g.merchant.id, url=url, events=events)
    db.session.add(hook)
    db.session.commit()
    return api_response({"webhook": hook.to_dict(include_secret=True)}, 201)


@bp.get("/webhooks")
@require_api_key
def list_webhooks():
    hooks = Webhook.query.filter_by(merchant_id=g.merchant.id).all()
    return api_response({"webhooks": [h.to_dict() for h in hooks]})
