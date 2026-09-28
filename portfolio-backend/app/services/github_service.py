import httpx
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.domain import GithubStatsCache
from app.core.database import AsyncSessionLocal

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
GITHUB_REST_URL = "https://api.github.com"

async def fetch_github_stats():
    if not settings.GITHUB_TOKEN:
        print("GITHUB_TOKEN not set. Skipping github stats sync.")
        return

    headers = {
        "Authorization": f"bearer {settings.GITHUB_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # 1. Fetch user data (commits, PRs, contribution calendar, repositories)
    query = """
    query {
      viewer {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          totalCount
          nodes {
            name
            primaryLanguage {
              name
            }
          }
        }
        pullRequests {
          totalCount
        }
        contributionsCollection {
          totalCommitContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
    """
    
    async with httpx.AsyncClient() as client:
        response = await client.post(GITHUB_GRAPHQL_URL, json={"query": query}, headers=headers)
        if response.status_code != 200:
            print(f"Failed to fetch github stats: {response.text}")
            return
            
        data = response.json().get("data", {}).get("viewer", {})
        
        # Calculate Top Languages
        repos = data.get("repositories", {}).get("nodes", [])
        language_counts = {}
        total_repos_with_lang = 0
        
        for repo in repos:
            lang = repo.get("primaryLanguage")
            if lang and lang.get("name"):
                name = lang["name"]
                language_counts[name] = language_counts.get(name, 0) + 1
                total_repos_with_lang += 1
                
        top_languages = []
        if total_repos_with_lang > 0:
            # Sort by count desc
            sorted_langs = sorted(language_counts.items(), key=lambda x: x[1], reverse=True)
            for lang, count in sorted_langs[:5]: # Top 5
                top_languages.append({
                    "name": lang,
                    "pct": round((count / total_repos_with_lang) * 100, 1)
                })
        
        # Format calendar
        calendar = data.get("contributionsCollection", {}).get("contributionCalendar", {})
        total_commits = data.get("contributionsCollection", {}).get("totalCommitContributions", 0)
        total_prs = data.get("pullRequests", {}).get("totalCount", 0)
        total_repos = data.get("repositories", {}).get("totalCount", 0)

        # Update Database
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(GithubStatsCache).where(GithubStatsCache.id == 1))
            cache = result.scalars().first()
            
            if not cache:
                cache = GithubStatsCache(id=1)
                db.add(cache)
                
            cache.total_commits = total_commits
            cache.total_prs = total_prs
            cache.total_repos = total_repos
            cache.contribution_calendar = calendar
            cache.top_languages = top_languages
            cache.last_synced_at = datetime.utcnow()
            
            await db.commit()
            print("Successfully updated GitHub stats cache.")

