from sqlalchemy import Column, Integer, String, Text, Date, Boolean, JSON, TIMESTAMP, SmallInteger, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from datetime import date, datetime
from typing import Any, Dict, List, Optional

class Profile(Base):
    __tablename__ = "profiles"
    
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)
    name: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    tagline: Mapped[str] = mapped_column(String, nullable=False)
    bio_short: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    resume_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    github_url: Mapped[str] = mapped_column(String, nullable=False)
    linkedin_url: Mapped[str] = mapped_column(String, nullable=False)
    twitter_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    codeforces_card_url: Mapped[str] = mapped_column(String, nullable=False)
    leetcode_card_url: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class Experience(Base):
    __tablename__ = "experiences"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    company: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pointers: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    tech_stack: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    order: Mapped[int] = mapped_column(Integer, default=0)

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    one_liner: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    pointers: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    role: Mapped[str] = mapped_column(String, nullable=False)
    tech_stack: Mapped[List[str]] = mapped_column(JSON, nullable=False, default=list)
    links: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    outcome: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

class Skill(Base):
    __tablename__ = "skills"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0)

class GithubStatsCache(Base):
    __tablename__ = "github_stats_cache"
    
    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1)
    total_commits: Mapped[int] = mapped_column(Integer, default=0)
    total_prs: Mapped[int] = mapped_column(Integer, default=0)
    total_repos: Mapped[int] = mapped_column(Integer, default=0)
    contribution_calendar: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    top_languages: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    last_synced_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

class ContactSubmission(Base):
    __tablename__ = "contact_submissions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())
    status: Mapped[str] = mapped_column(String, default="new") # new / read / replied

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

class ChatLog(Base):
    __tablename__ = "chat_logs"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_query: Mapped[str] = mapped_column(Text, nullable=False)
    bot_response: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[str] = mapped_column(String, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    retries: Mapped[int] = mapped_column(Integer, nullable=False)
    api_key_used: Mapped[str] = mapped_column(String, nullable=False) # e.g. "AIzaSy...abcd"
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now())

class Achievement(Base):
    __tablename__ = "achievements"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
