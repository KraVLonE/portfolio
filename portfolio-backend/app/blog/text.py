"""Pure text helpers for the blog: slugs, Markdown rendering, excerpts, reading time."""
import math
import re
import unicodedata
from html import unescape
from typing import Optional

from markdown_it import MarkdownIt

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
WORDS_PER_MINUTE = 200
EXCERPT_LEN = 160

# CommonMark + GFM tables/strikethrough. html=False: raw HTML is escaped, never rendered (BLG-22).
# markdown-it's validateLink already rejects javascript:/vbscript:/file:/data: (non-image) URLs.
# breaks=True: single newline = <br>; lheading off: `---` under text is a rule, not a heading.
# Must match the SPA renderer (shared/markdown/MarkdownRenderer.tsx).
_md = (
    MarkdownIt("commonmark", {"html": False, "linkify": False, "breaks": True})
    .enable(["table", "strikethrough"])
    .disable("lheading")
)

_PRE_RE = re.compile(r"<pre>.*?</pre>", re.S)
_BLOCK_TAG_RE = re.compile(r"</?(?:p|h[1-6]|li|ul|ol|blockquote|pre|tr|td|th|table|hr|br|div)\b[^>]*>", re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def slugify(text: str, max_len: int = 80) -> str:
    ascii_text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug[:max_len].rstrip("-")


_BOX = re.compile(r"[\u2500-\u257F]")
_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")


def fence_text_trees(md: str) -> str:
    """Mirror of fenceTextTrees() in shared/markdown/plugins.ts: wrap unfenced text trees in a code fence."""
    out: list[str] = []
    para: list[str] = []
    fence: Optional[str] = None

    def flush():
        if sum(1 for line in para if _BOX.search(line)) >= 2:
            out.extend(["```text", *para, "```"])
        else:
            out.extend(para)
        para.clear()

    for line in (md or "").split("\n"):
        m = _FENCE.match(line)
        if fence:
            out.append(line)
            if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence):
                fence = None
        elif m:
            flush()
            fence = m.group(1)
            out.append(line)
        elif not line.strip():
            flush()
            out.append(line)
        else:
            para.append(line)
    flush()
    return "\n".join(out)


def render_markdown(md: str) -> str:
    """Safe HTML for SEO/RSS. The SPA renders Markdown itself with the same rules."""
    return _md.render(fence_text_trees(md or ""))


def plain_text(md: str, include_code: bool = True) -> str:
    html = render_markdown(md)
    if not include_code:
        html = _PRE_RE.sub(" ", html)
    # Block tags separate words; inline tags (<strong>, <a>, <code>) must not add spaces before punctuation.
    text = _TAG_RE.sub("", _BLOCK_TAG_RE.sub(" ", html))
    return _WS_RE.sub(" ", unescape(text)).strip()


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
