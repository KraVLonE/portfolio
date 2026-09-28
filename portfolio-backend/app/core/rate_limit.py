from slowapi import Limiter
from slowapi.util import get_remote_address

# NOTE: Using in-memory storage. For production with high traffic,
# switch to Redis: storage_uri="redis://localhost:6379"
# The fixed-window strategy has better cleanup behavior for in-memory storage.
limiter = Limiter(
    key_func=get_remote_address,
    strategy="fixed-window"
)
