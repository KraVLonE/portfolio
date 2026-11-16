import asyncio
import logging
import time
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

API_URL = "https://api.deepseek.com/chat/completions"
MAX_OUTPUT_TOKENS = 350  # hard cap: keeps replies short and makes the bot useless as a free general LLM
RETRYABLE = {429, 500, 503, 504}

_client: Optional[httpx.AsyncClient] = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=5.0))
    return _client


async def complete(messages: list) -> dict:
    """Single DeepSeek chat completion. Returns content plus logging metadata; never raises."""
    start = time.time()

    def result(content: str = "", tokens: int = 0, retries: int = 0, error: bool = False) -> dict:
        return {
            "content": content,
            "total_tokens": tokens,
            "latency_ms": int((time.time() - start) * 1000),
            "retries": retries,
            "error": error,
        }

    if not settings.DEEPSEEK_API_KEY:
        logger.error("DEEPSEEK_API_KEY is not set")
        return result(error=True)

    payload = {
        "model": settings.CHAT_MODEL,
        "messages": messages,
        "thinking": {"type": "disabled"},  # thinking is on by default and bills as output
        "temperature": 0.3,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"}

    for attempt in range(2):
        try:
            resp = await _get_client().post(API_URL, json=payload, headers=headers)
            if resp.status_code in RETRYABLE and attempt == 0:
                logger.warning("DeepSeek returned %s, retrying once", resp.status_code)
                await asyncio.sleep(1)
                continue
            if resp.status_code != 200:
                # 402 = balance exhausted, 401 = bad key
                logger.error("DeepSeek error %s: %s", resp.status_code, resp.text[:300])
                return result(retries=attempt, error=True)
            data = resp.json()
            content = (data["choices"][0]["message"].get("content") or "").strip()
            tokens = (data.get("usage") or {}).get("total_tokens", 0)
            return result(content, tokens, attempt, error=not content)
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            logger.error("DeepSeek request failed: %r", e)
            if attempt == 0 and isinstance(e, httpx.TransportError):
                continue
            return result(retries=attempt, error=True)

    return result(retries=1, error=True)
