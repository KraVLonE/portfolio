from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.services.email import send_notification_email
from app.models.domain import Profile, Experience, Project, Skill, GithubStatsCache, ContactSubmission, Achievement
from app.schemas import (
    Profile as ProfileSchema,
    Experience as ExperienceSchema,
    Project as ProjectSchema,
    Skill as SkillSchema,
    GithubStatsCache as GithubStatsCacheSchema,
    ContactSubmissionCreate,
    Achievement as AchievementSchema
)

router = APIRouter()

@router.get("/profile", response_model=ProfileSchema)
async def get_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.id == 1))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@router.get("/experience", response_model=List[ExperienceSchema])
async def get_experience(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Experience).order_by(Experience.order.asc(), Experience.start_date.desc()))
    return result.scalars().all()

@router.get("/projects", response_model=List[ProjectSchema])
async def get_projects(featured: bool = False, db: AsyncSession = Depends(get_db)):
    query = select(Project).order_by(Project.order.asc())
    if featured:
        query = query.where(Project.featured == True)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/skills", response_model=List[SkillSchema])
async def get_skills(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Skill).order_by(Skill.category, Skill.order.asc()))
    return result.scalars().all()

@router.get("/github-stats", response_model=GithubStatsCacheSchema)
async def get_github_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GithubStatsCache).where(GithubStatsCache.id == 1))
    stats = result.scalars().first()
    if not stats:
        raise HTTPException(status_code=404, detail="Github stats not found")
    return stats

@router.post("/contact", response_model=dict)
async def submit_contact(
    contact: ContactSubmissionCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Add rate limiting and honeypot validation
    new_submission = ContactSubmission(**contact.model_dump())
    db.add(new_submission)
    await db.commit()
    
    background_tasks.add_task(
        send_notification_email, 
        contact.name, 
        contact.email, 
        contact.message
    )
    
    return {"status": "success", "message": "Message received"}

from pydantic import BaseModel

from fastapi import Request
from app.core.rate_limit import limiter
from app.chat.agent import agent
from app.models.domain import ChatLog

from typing import List, Dict, Optional

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

@router.post("/chat", response_model=dict)
@limiter.limit("5/minute")
async def chat_with_agent(request: Request, body: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await agent.ainvoke({"input": body.message, "db": db, "history": body.history or []})
        reply = result.get("final_response", "I encountered an error connecting to my memory banks.")
        
        # Save log
        try:
            log_entry = ChatLog(
                user_query=body.message,
                bot_response=reply,
                intent=result.get("intent", "unknown"),
                latency_ms=result.get("latency_ms", 0),
                total_tokens=result.get("total_tokens", 0),
                retries=result.get("retries", 0),
                api_key_used=result.get("api_key_used", "none")
            )
            db.add(log_entry)
            await db.commit()
        except Exception as log_err:
            print(f"Failed to save chat log: {log_err}")
            
        return {"reply": reply}
    except Exception as e:
        return {"reply": f"Sorry, I encountered an error: {str(e)}"}



@router.get("/achievements", response_model=List[AchievementSchema])
async def get_achievements(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Achievement).order_by(Achievement.order))
    return result.scalars().all()
