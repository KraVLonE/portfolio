"""Minimal valid payloads for existing resources (shape the admin UI sends)."""
from datetime import date

PROFILE = {
    "name": "Test User", "title": "Engineer", "tagline": "Builds things", "bio_short": "Bio",
    "email": "t@example.com", "location": "Earth", "resume_url": None,
    "github_url": "https://github.com/x", "linkedin_url": "https://linkedin.com/in/x",
    "twitter_url": None, "codeforces_card_url": "https://cf/x", "leetcode_card_url": "https://lc/x",
}


def experience(**kw):
    return {"company": "Acme", "role": "Dev", "start_date": "2024-01-01", "pointers": ["did x"],
            "tech_stack": ["py"], "order": 0, **kw}


def project(**kw):
    return {"title": "Proj", "one_liner": "one", "role": "Lead", "pointers": [], "tech_stack": [],
            "links": {}, "featured": False, "order": 0, **kw}


def skill(**kw):
    return {"name": "Python", "category": "Languages", "order": 0, **kw}


def achievement(**kw):
    return {"title": "Won", "description": "A thing", "date": str(date(2025, 1, 1)), "order": 0, **kw}
