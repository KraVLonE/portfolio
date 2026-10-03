from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import date as dt_date, datetime as dt_datetime

class ProfileBase(BaseModel):
    name: str
    title: str
    tagline: str
    bio_short: str
    email: str
    location: str
    resume_url: Optional[str] = None
    github_url: str
    linkedin_url: str
    twitter_url: Optional[str] = None
    codeforces_card_url: str
    leetcode_card_url: str

class ProfileCreate(ProfileBase):
    pass

class ProfileUpdate(ProfileBase):
    pass

class Profile(ProfileBase):
    id: int
    updated_at: dt_datetime
    class Config:
        from_attributes = True

class ExperienceBase(BaseModel):
    company: str
    location: Optional[str] = None
    role: str
    start_date: dt_date
    end_date: Optional[dt_date] = None
    pointers: List[str] = []
    tech_stack: List[str] = []
    order: int = 0

class ExperienceCreate(ExperienceBase):
    pass

class ExperienceUpdate(ExperienceBase):
    pass

class Experience(ExperienceBase):
    id: int
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str
    one_liner: str
    location: Optional[str] = None
    date: Optional[dt_date] = None
    pointers: List[str] = []
    role: str
    tech_stack: List[str] = []
    links: Dict[str, Any] = {}
    outcome: Optional[str] = None
    featured: bool = False
    order: int = 0

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    class Config:
        from_attributes = True

class SkillBase(BaseModel):
    name: str
    category: str
    order: int = 0

class SkillCreate(SkillBase):
    pass

class SkillUpdate(SkillBase):
    pass

class Skill(SkillBase):
    id: int
    class Config:
        from_attributes = True

class GithubStatsCacheBase(BaseModel):
    total_commits: int = 0
    total_prs: int = 0
    total_repos: int = 0
    contribution_calendar: Dict[str, Any] = {}
    top_languages: List[Dict[str, Any]] = []

class GithubStatsCache(GithubStatsCacheBase):
    id: int
    last_synced_at: dt_datetime
    class Config:
        from_attributes = True

class ContactSubmissionBase(BaseModel):
    name: str
    email: str
    message: str

class ContactSubmissionCreate(ContactSubmissionBase):
    pass

class ContactSubmission(ContactSubmissionBase):
    id: int
    created_at: dt_datetime
    status: str
    class Config:
        from_attributes = True

class AchievementBase(BaseModel):
    title: str
    description: str
    date: Optional[dt_date] = None
    order: int = 0

class AchievementCreate(AchievementBase):
    pass

class AchievementUpdate(AchievementBase):
    pass

class Achievement(AchievementBase):
    id: int
    class Config:
        from_attributes = True

class ChatLogBase(BaseModel):
    user_query: str
    bot_response: str
    intent: str
    latency_ms: int
    total_tokens: int
    retries: int
    api_key_used: str

class ChatLog(ChatLogBase):
    id: int
    created_at: dt_datetime
    class Config:
        from_attributes = True
