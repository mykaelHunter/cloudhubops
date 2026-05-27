from functools import wraps
from datetime import datetime, timezone
from flask import request, jsonify, g
from ..models.db import get_merchant_by_key


def api_response(data: dict, status: int = 200):
    return jsonify(
        {"success": True, **data, "timestamp": datetime.now(timezone.utc).isoformat()}
    ), status


def api_error(message: str, status: int = 400, code: str = "BAD_REQUEST"):
    return jsonify(
        {"success": False, "error": {"code": code, "message": message},
         "timestamp": datetime.now(timezone.utc).isoformat()}
    ), status


def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        key = auth.removeprefix("Bearer ").strip()
        if not key:
            return api_error("Missing API key", 401, "UNAUTHORIZED")
        merchant = get_merchant_by_key(key)
        if not merchant:
            return api_error("Invalid or inactive API key", 401, "UNAUTHORIZED")
        g.merchant = merchant
        return f(*args, **kwargs)
    return decorated
