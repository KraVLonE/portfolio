from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.domain import Profile, Experience, Project, Skill, Achievement

async def retrieve_data(db: AsyncSession, intent: str, keyword: str = ""):
    context_chunks = []
    
    if intent in ["availability", "contact_info"]:
        result = await db.execute(select(Profile).limit(1))
        profile = result.scalars().first()
        if profile:
            context_chunks.append(f"Profile: {profile.name}, {profile.title}. {profile.tagline}. Bio: {profile.bio_short}. Location: {profile.location}. Email: {profile.email}")
            
    elif intent == "experience":
        query = select(Experience).order_by(Experience.start_date.desc())
        if keyword:
            query = query.filter(or_(
                Experience.company.ilike(f"%{keyword}%"),
                Experience.role.ilike(f"%{keyword}%")
            ))
        result = await db.execute(query)
        experiences = result.scalars().all()
        for e in experiences:
            end = e.end_date if e.end_date else "Present"
            pointers_text = "; ".join(e.pointers) if e.pointers else ""
            loc = e.location if e.location else "Unknown Location"
            context_chunks.append(f"Experience: {e.role} at {e.company} ({loc}). {e.start_date} to {end}. Details: {pointers_text}")
            
    elif intent == "projects":
        query = select(Project)
        if keyword:
            query = query.filter(or_(
                Project.title.ilike(f"%{keyword}%"),
                Project.tech_stack.cast(str).ilike(f"%{keyword}%")
            ))
        result = await db.execute(query)
        projects = result.scalars().all()
        for p in projects:
            loc = p.location if p.location else "Unknown"
            date_val = p.date if p.date else "Unknown"
            context_chunks.append(f"Project: {p.title}. {p.one_liner}. Date: {date_val}, Location: {loc}. Role: {p.role}. Tech Stack: {', '.join(p.tech_stack)}")
            
    elif intent == "skills":
        query = select(Skill)
        if keyword:
            query = query.filter(or_(
                Skill.name.ilike(f"%{keyword}%"),
                Skill.category.ilike(f"%{keyword}%")
            ))
        result = await db.execute(query)
        skills = result.scalars().all()
        for s in skills:
            context_chunks.append(f"Skill: {s.name} ({s.category})")
            
    elif intent == "achievements":
        query = select(Achievement)
        if keyword:
            query = query.filter(or_(
                Achievement.title.ilike(f"%{keyword}%"),
                Achievement.description.ilike(f"%{keyword}%")
            ))
        result = await db.execute(query)
        achievements = result.scalars().all()
        for a in achievements:
            context_chunks.append(f"Achievement: {a.title}. Description: {a.description}")
            
    return "\n".join(context_chunks)
