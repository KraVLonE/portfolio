from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import timedelta

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.config import settings
from app.models.domain import AdminUser, Profile, Experience, Project, Skill
from app.schemas import ProfileUpdate, ExperienceCreate, ExperienceUpdate, ProjectCreate, ProjectUpdate, SkillCreate, SkillUpdate

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    # TODO: proper token verification
    return {"user": "admin"}

@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Add admin endpoints for CRUD operations here
@router.put("/admin/profile")
async def update_profile(profile_in: ProfileUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Profile).where(Profile.id == 1))
    profile = result.scalars().first()
    if not profile:
        profile = Profile(id=1, **profile_in.model_dump())
        db.add(profile)
    else:
        for var, value in profile_in.model_dump().items():
            setattr(profile, var, value)
    await db.commit()
# --- Experience Endpoints ---
@router.post("/admin/experience")
async def create_experience(exp_in: ExperienceCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    exp = Experience(**exp_in.model_dump())
    db.add(exp)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.put("/admin/experience/{exp_id}")
async def update_experience(exp_id: int, exp_in: ExperienceUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Experience).where(Experience.id == exp_id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    for var, value in exp_in.model_dump(exclude_unset=True).items():
        setattr(exp, var, value)
    await db.commit()
    await db.refresh(exp)
    return exp

@router.delete("/admin/experience/{exp_id}")
async def delete_experience(exp_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Experience).where(Experience.id == exp_id))
    exp = result.scalars().first()
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    await db.delete(exp)
    await db.commit()
    return {"status": "success"}

# --- Project Endpoints ---
@router.post("/admin/projects")
async def create_project(proj_in: ProjectCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    proj = Project(**proj_in.model_dump())
    db.add(proj)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.put("/admin/projects/{proj_id}")
async def update_project(proj_id: int, proj_in: ProjectUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    for var, value in proj_in.model_dump(exclude_unset=True).items():
        setattr(proj, var, value)
    await db.commit()
    await db.refresh(proj)
    return proj

@router.delete("/admin/projects/{proj_id}")
async def delete_project(proj_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == proj_id))
    proj = result.scalars().first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(proj)
    await db.commit()
    return {"status": "success"}

# --- Skill Endpoints ---
@router.post("/admin/skills")
async def create_skill(skill_in: SkillCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    skill = Skill(**skill_in.model_dump())
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill

@router.put("/admin/skills/{skill_id}")
async def update_skill(skill_id: int, skill_in: SkillUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for var, value in skill_in.model_dump(exclude_unset=True).items():
        setattr(skill, var, value)
    await db.commit()
    await db.refresh(skill)
    return skill

@router.delete("/admin/skills/{skill_id}")
async def delete_skill(skill_id: int, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalars().first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    await db.delete(skill)
    await db.commit()
    return {"status": "success"}

