from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.rate_limit import limiter
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


@router.post("/admin/login")
@limiter.limit("3/minute")
async def admin_login(request: Request, body: dict):
    from app.core.config import settings
    if body.get("key") == settings.ADMIN_SECRET_KEY:
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid secret key")

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
@limiter.limit("3/minute")
async def submit_contact(
    request: Request,
    contact: ContactSubmissionCreate, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
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

from app.chat.agent import agent
from app.models.domain import ChatLog

from typing import Dict, Optional

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

from app.api.auth import verify_admin_token
from app.schemas import (
    ExperienceCreate, ExperienceUpdate, 
    ProjectCreate, ProjectUpdate, 
    SkillCreate, SkillUpdate,
    AchievementCreate, AchievementUpdate
)

@router.put("/profile", response_model=ProfileSchema)
async def update_profile(profile_in: ProfileSchema, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Profile).where(Profile.id == 1))
    profile = result.scalars().first()
    if not profile:
        profile = Profile(id=1)
        db.add(profile)
    for key, value in profile_in.model_dump().items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile

# Experience
@router.post("/experience", response_model=ExperienceSchema)
async def create_experience(exp_in: ExperienceCreate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    new_exp = Experience(**exp_in.model_dump())
    db.add(new_exp)
    await db.commit()
    await db.refresh(new_exp)
    return new_exp

@router.put("/experience/{exp_id}", response_model=ExperienceSchema)
async def update_experience(exp_id: int, exp_in: ExperienceUpdate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Experience).where(Experience.id == exp_id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    for key, value in exp_in.model_dump(exclude_unset=True).items():
        setattr(exp, key, value)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.delete("/experience/{exp_id}")
async def delete_experience(exp_id: int, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Experience).where(Experience.id == exp_id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    await db.delete(exp)
    await db.commit()
    return {"status": "deleted"}

# Projects
@router.post("/projects", response_model=ProjectSchema)
async def create_project(proj_in: ProjectCreate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    new_proj = Project(**proj_in.model_dump())
    db.add(new_proj)
    await db.commit()
    await db.refresh(new_proj)
    return new_proj

@router.put("/projects/{proj_id}", response_model=ProjectSchema)
async def update_project(proj_id: int, proj_in: ProjectUpdate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    for key, value in proj_in.model_dump(exclude_unset=True).items():
        setattr(proj, key, value)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.delete("/projects/{proj_id}")
async def delete_project(proj_id: int, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(proj)
    await db.commit()
    return {"status": "deleted"}

# Skills
@router.post("/skills", response_model=SkillSchema)
async def create_skill(skill_in: SkillCreate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    new_skill = Skill(**skill_in.model_dump())
    db.add(new_skill)
    await db.commit()
    await db.refresh(new_skill)
    return new_skill

@router.put("/skills/{skill_id}", response_model=SkillSchema)
async def update_skill(skill_id: int, skill_in: SkillUpdate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for key, value in skill_in.model_dump(exclude_unset=True).items():
        setattr(skill, key, value)
    await db.commit()
    await db.refresh(skill)
    return skill

@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.delete(skill)
    await db.commit()
    return {"status": "deleted"}

# Achievements
@router.post("/achievements", response_model=AchievementSchema)
async def create_achievement(ach_in: AchievementCreate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    new_ach = Achievement(**ach_in.model_dump())
    db.add(new_ach)
    await db.commit()
    await db.refresh(new_ach)
    return new_ach

@router.put("/achievements/{ach_id}", response_model=AchievementSchema)
async def update_achievement(ach_id: int, ach_in: AchievementUpdate, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Achievement).where(Achievement.id == ach_id))
    ach = result.scalars().first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")
    for key, value in ach_in.model_dump(exclude_unset=True).items():
        setattr(ach, key, value)
    await db.commit()
    await db.refresh(ach)
    return ach

@router.delete("/achievements/{ach_id}")
async def delete_achievement(ach_id: int, db: AsyncSession = Depends(get_db), token: str = Depends(verify_admin_token)):
    result = await db.execute(select(Achievement).where(Achievement.id == ach_id))
    ach = result.scalars().first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await db.delete(ach)
    await db.commit()
    return {"status": "deleted"}
