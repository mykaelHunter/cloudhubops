import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone
from ..models.db import Webhook

logger = logging.getLogger(__name__)


def get_active_webhooks(merchant_id: str, event: str):
    hooks = Webhook.query.filter_by(merchant_id=merchant_id, active=True).all()
    return [
        {"url": h.url, "secret": h.secret}
        for h in hooks
        if event in (h.events or [])
    ]


def dispatch_webhook(merchant_id: str, event: str, payload: dict):
    """
    Sign and dispatch webhook events to registered endpoints.
    In production: push to a job queue (Celery / Redis) with retry logic.
    """
    hooks = get_active_webhooks(merchant_id, event)
    body = json.dumps({
        "event": event,
        "data": payload,
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })

    for hook in hooks:
        sig = hmac.new(hook["secret"].encode(), body.encode(), hashlib.sha256).hexdigest()
        logger.info(f"[WEBHOOK] event={event} url={hook['url']} sig=sha256={sig[:16]}…")
        # TODO: use requests + retry in production
        # requests.post(hook["url"], data=body,
        #     headers={"X-Payday-Signature": f"sha256={sig}"}, timeout=5)
