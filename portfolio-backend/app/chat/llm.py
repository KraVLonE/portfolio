import time
import logging
from langchain_google_genai import ChatGoogleGenerativeAI
from app.chat.key_rotation import key_pool

logger = logging.getLogger(__name__)

# Cache LLM clients per (api_key, temperature) to avoid creating new HTTP clients per request.
# The cache is bounded by the number of keys in the pool (small and fixed).
_llm_cache: dict[str, ChatGoogleGenerativeAI] = {}

def _get_llm(api_key: str, temperature: float = 0.0) -> ChatGoogleGenerativeAI:
    cache_key = f"{api_key}:{temperature}"
    if cache_key not in _llm_cache:
        _llm_cache[cache_key] = ChatGoogleGenerativeAI(
            model="gemini-3.8-flash",
            google_api_key=api_key,
            temperature=temperature,
            max_retries=0
        )
    return _llm_cache[cache_key]

def invoke_llm(messages: list, temperature: float = 0.0) -> dict:
    """
    Invokes Gemini with key rotation on 429 errors.
    Returns a dictionary with content and metadata (latency, tokens, etc).
    """
    if not key_pool.keys:
        return {
            "content": "I'm sorry, my AI backend is not configured correctly (no API keys).",
            "api_key_used": "none",
            "total_tokens": 0,
            "latency_ms": 0,
            "retries": 0
        }

    max_attempts = len(key_pool.keys)
    start_time = time.time()

    for attempt in range(max_attempts):
        api_key = key_pool.get_key()

        try:
            llm = _get_llm(api_key, temperature)
            response = llm.invoke(messages)

            latency = int((time.time() - start_time) * 1000)
            tokens = 0

            # Safely extract tokens depending on response shape
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                tokens = response.usage_metadata.get("total_tokens", 0)
            elif hasattr(response, "response_metadata") and response.response_metadata:
                usage_metadata = response.response_metadata.get("token_usage", {})
                if hasattr(usage_metadata, "total_token_count"):
                    tokens = usage_metadata.total_token_count
                elif isinstance(usage_metadata, dict):
                    tokens = usage_metadata.get("total_token_count") or usage_metadata.get("totalTokens", 0)

            text_content = ""
            if isinstance(response.content, str):
                text_content = response.content
            elif isinstance(response.content, list):
                for block in response.content:
                    if isinstance(block, dict) and "text" in block:
                        text_content += block["text"]
                    elif isinstance(block, str):
                        text_content += block
            if not text_content:
                text_content = str(response.content)

            return {
                "content": text_content,
                "api_key_used": api_key[:8] + "...",
                "total_tokens": tokens,
                "latency_ms": latency,
                "retries": attempt
            }

        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "quota" in error_str or "exhausted" in error_str or "too many requests" in error_str or "503" in error_str:
                logger.warning(f"Retryable error (429/503) hit on key {api_key[:5]}... trying next key (Attempt {attempt+1}/{max_attempts})")
                time.sleep(1) # Small delay for 503s
                continue

            logger.error(f"LLM Error: {e}")
            return {
                "content": f"I encountered an error while thinking: {str(e)}",
                "api_key_used": api_key[:8] + "...",
                "total_tokens": 0,
                "latency_ms": int((time.time() - start_time) * 1000),
                "retries": attempt
            }

    return {
        "content": "I'm getting a lot of questions right now — all my API keys are exhausted! Please try the contact form.",
        "api_key_used": "exhausted",
        "total_tokens": 0,
        "latency_ms": int((time.time() - start_time) * 1000),
        "retries": max_attempts
    }
