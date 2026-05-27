from flask import Blueprint, g
from ..services import require_api_key, api_response

bp = Blueprint("merchant", __name__)


@bp.get("/merchant/me")
@require_api_key
def get_me():
    return api_response({
        "merchant": {
            "id":         g.merchant.id,
            "name":       g.merchant.name,
            "email":      g.merchant.email,
            "active":     g.merchant.active,
            "created_at": g.merchant.created_at.isoformat(),
        }
    })
