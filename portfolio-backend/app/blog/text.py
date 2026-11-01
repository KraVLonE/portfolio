"""Pure text helpers for the blog: slugs, Markdown rendering, excerpts, reading time."""
import math
import re
import unicodedata
from html import unescape

from markdown_it import MarkdownIt

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
WORDS_PER_MINUTE = 200
EXCERPT_LEN = 160

# CommonMark + GFM tables/strikethrough. html=False: raw HTML is escaped, never rendered (BLG-22).
# markdown-it's validateLink already rejects javascript:/vbscript:/file:/data: (non-image) URLs.
_md = MarkdownIt("commonmark", {"html": False, "linkify": False}).enable(["table", "strikethrough"])

_PRE_RE = re.compile(r"<pre>.*?</pre>", re.S)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def slugify(text: str, max_len: int = 80) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:max_len].rstrip("-")


def render_markdown(md: str) -> str:
    """Safe HTML for SEO/RSS. The SPA renders Markdown itself with the same rules."""
    return _md.render(md or "")


def plain_text(md: str, include_code: bool = True) -> str:
    html = render_markdown(md)
    if not include_code:
        html = _PRE_RE.sub(" ", html)
    return _WS_RE.sub(" ", unescape(_TAG_RE.sub(" ", html))).strip()


def make_excerpt(md: str, limit: int = EXCERPT_LEN) -> str:
    text = plain_text(md, include_code=False)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut.rstrip(" ,.;:-") + "…"


def reading_time_min(md: str) -> int:
    words = len(re.findall(r"\w+", plain_text(md)))
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


def count_links(text: str) -> int:
    return len(re.findall(r"https?://|www\.", text, re.I))
