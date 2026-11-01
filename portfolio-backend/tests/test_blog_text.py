import pytest

from app.blog.text import count_links, fence_text_trees, make_excerpt, plain_text, reading_time_min, render_markdown, slugify


@pytest.mark.parametrize("title,slug", [
    ("Hello World", "hello-world"),
    ("  RAG -- with LangGraph!! ", "rag-with-langgraph"),
    ("Café déjà vu", "cafe-deja-vu"),
    ("C++ & Rust: 2026", "c-rust-2026"),
    ("日本語", ""),
])
def test_slugify(title, slug):
    assert slugify(title) == slug


def test_slugify_truncates_without_trailing_dash():
    s = slugify("word " * 40, max_len=12)
    assert len(s) <= 12 and not s.endswith("-")


@pytest.mark.parametrize("md,forbidden", [
    ("<script>alert(1)</script>", "<script"),
    ('<img src=x onerror="alert(1)">', "<img"),
    ("[click](javascript:alert(1))", 'href="javascript'),
    ("[x](JaVaScRiPt:alert(1))", 'href="javascript'),
    ("![x](data:text/html;base64,PHNjcmlwdD4=)", 'src="data:'),
])
def test_render_markdown_blocks_xss(md, forbidden):
    assert forbidden.lower() not in render_markdown(md).lower()


def test_render_markdown_gfm():
    html = render_markdown("| a | b |\n|---|---|\n| 1 | 2 |\n\n~~old~~\n\n```py\nx = 1\n```")
    assert "<table>" in html and "<s>old</s>" in html and 'class="language-py"' in html


def test_excerpt_skips_code_and_cuts_on_word():
    md = "# Title\n\n```py\nsecret_code()\n```\n\n" + "alpha beta gamma " * 20
    ex = make_excerpt(md, limit=30)
    assert "secret_code" not in ex and ex.endswith("…") and len(ex) <= 31
    assert ex.startswith("Title alpha")


def test_excerpt_short_text_unchanged():
    assert make_excerpt("Just **one** line.") == "Just one line."


@pytest.mark.parametrize("words,minutes", [(0, 1), (10, 1), (200, 1), (201, 2), (1000, 5)])
def test_blg02_reading_time(words, minutes):
    assert reading_time_min("word " * words) == minutes


def test_plain_text_unescapes_entities():
    assert plain_text("Tom & Jerry <b>") == "Tom & Jerry <b>"


def test_count_links():
    assert count_links("see https://a.com and http://b.com, www.c.com") == 3
    assert count_links("no links here") == 0


def test_plain_text_inline_markup_adds_no_spaces():
    md = "I wired **retrieval**, *routing* and `tools`. See [docs](https://x).\n\n## Next\n\nMore"
    assert plain_text(md) == "I wired retrieval, routing and tools. See docs. Next More"


def test_server_render_matches_spa_rules():
    """SEO/RSS HTML must follow the same rules as the SPA renderer."""
    assert "<h2>" not in render_markdown("Some intro\n---\n\nmore")
    assert "<hr />" in render_markdown("Some intro\n---\n\nmore")
    assert "line one<br />\nline two" in render_markdown("line one\nline two")
    assert plain_text("line one\nline two") == "line one line two"


def test_unfenced_tree_is_fenced_and_kept_out_of_excerpt():
    tree = "notes/\n├── daily/\n│   └── a.md\n└── ref/\n    └── b.md"
    html = render_markdown(f"Intro.\n\n{tree}\n\nAfter.")
    assert '<pre><code class="language-text">' in html and "    └── b.md" in html
    assert make_excerpt(f"Intro.\n\n{tree}\n\nAfter.") == "Intro. After."
    assert fence_text_trees("one ─ line") == "one ─ line"
    assert fence_text_trees("```\n├ a\n└ b\n```") == "```\n├ a\n└ b\n```"
