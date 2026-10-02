from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_real_ip(request: Request) -> str:
    """Extract the real client IP from behind Traefik/Nginx proxy.
    Falls back to direct connection IP if no forwarded header is present."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        # The first one is the real client IP.
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


# NOTE: Using in-memory storage. For production with high traffic,
# switch to Redis: storage_uri="redis://localhost:6379"
# The fixed-window strategy has better cleanup behavior for in-memory storage.
limiter = Limiter(
    key_func=get_real_ip,
    default_limits=["60/minute"],
    strategy="fixed-window"
)
