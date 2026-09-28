import threading
from typing import List
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class KeyPool:
    def __init__(self, keys_str: str):
        self.keys = [k.strip() for k in keys_str.split(",") if k.strip()]
        self.index = 0
        self.lock = threading.Lock()
        
    def get_key(self) -> str:
        with self.lock:
            if not self.keys:
                return ""
            key = self.keys[self.index]
            self.index = (self.index + 1) % len(self.keys)
            return key

# Global key pool instance
key_pool = KeyPool(settings.GEMINI_TOKENS)
