import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models.domain import AdminUser
from app.core.security import get_password_hash

async def init_admin():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with Session() as session:
        # Check if admin exists
        from sqlalchemy import select
        result = await session.execute(select(AdminUser).where(AdminUser.username == "KraVLonE"))
        user = result.scalars().first()
        
        if not user:
            print("Creating default admin user...")
            new_admin = AdminUser(
                username="KraVLonE",
                hashed_password=get_password_hash("1##5##1") 
            )
            session.add(new_admin)
            await session.commit()
            print("Admin user KraVLonE created successfully.")
        else:
            print("Admin user already exists.")

            
if __name__ == "__main__":
    asyncio.run(init_admin())
