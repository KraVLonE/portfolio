import asyncio
from datetime import date
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select, delete
from app.core.config import settings
from app.models.domain import Profile, Experience, Project, Skill, GithubStatsCache, Achievement

async def seed_data():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as session:
        # 1. Profile
        profile_query = await session.execute(select(Profile).where(Profile.id == 1))
        profile = profile_query.scalars().first()
        if not profile:
            profile = Profile(id=1)
            session.add(profile)

        profile.name = "B Sai Sannidh Rayalu"
        profile.title = "Software Engineer"
        profile.tagline = "Building production AI applications using Python, FastAPI, React and PostgreSQL."
        profile.bio_short = "Software Engineer who builds production AI applications using Python, FastAPI, React and PostgreSQL. Developed an ERP Copilot using RAG and LLM's to convert natural language question into SQL and retrieve business data. Experienced across backend development, Docker, AWS, and CI/CD, with a focus on building and deploying practical, production-ready systems."
        profile.email = "b.sai.sannidh@gmail.com"
        profile.location = "Durg, Chhattisgarh"
        profile.github_url = "https://github.com/KraVLonE"
        profile.linkedin_url = "https://linkedin.com/in/b-sai-sannidh/"
        profile.resume_url = "https://drive.google.com/file/d/1RKA4K1VTu2cdwxMJx6DByn-yS_GhV9O5/view?usp=sharing"
        profile.codeforces_card_url = "https://codeforces-stat-card.vercel.app/api/KraVLonE?theme=cyberpunk&ext=contest&border=0&subtext=ffffff"
        profile.leetcode_card_url = "https://leetcard.jacoblin.cool/KraVLonE?theme=radical&font=Anek%20Tamil&ext=contest&border=0"

        # 2. Experience
        # Clear existing
        await session.execute(delete(Experience))
        await session.execute(delete(Project))
        await session.execute(delete(Skill))
        # Adding Arpa Global Infotech
        exp1 = Experience(
            company="Arpa Global Infotech Pvt Ltd",
            location="Durg, Chhattisgarh",
            role="Junior Software Developer",
            start_date=date(2025, 8, 1),
            pointers=[
                "Owned the end-to-end architecture, development, and deployment of an AI ERP Copilot that helps management and CXOs reduce reporting time and enables purchasing teams to make data-driven decisions, serving 60+ users across 2 enterprise clients.",
                "Built hybrid dense+sparse RAG over 1,000+ tables and 30K+ columns using metadata-rich schema chunks, enabling relevant table retrieval for natural-language-to-SQL generation.",
                "Reduced ERP Copilot prompt size from 150K+ to ~2K tokens on average by optimizing schema retrieval and context construction, cutting LLM context usage by ~98%.",
                "Built multi-layer AI guardrails and a 100+ query evaluation suite covering NLI, SQL safety, RBAC, precision, recall, F1, false positives, and false negatives.",
                "Deployed React and .NET applications to 3 enterprise clients and built CI/CD with Jenkins, GitHub Actions, Docker, Nginx, and AWS EC2, reducing manual deployment time by 90%.",
                "Executed SQL Server -> PostgreSQL migration for 82 tables and ~900 columns using TDS_FDW and SQL, achieving 95% verified data fidelity through automated validation scripts."
            ],
            tech_stack=["Python", "FastAPI", "React", "PostgreSQL", "LangChain", "RAG", "Docker", "AWS", "Jenkins", "GitHub Actions"],
            order=1
        )
        session.add(exp1)

        # 3. Projects
        proj1 = Project(
            title="StockCraft",
            location="Durg, Chhattisgarh",
            date=date(2024, 5, 1),
            one_liner="A full-stack paper trading platform supporting virtual trading and portfolio analytics.",
            pointers=[
                "Built a full-stack paper trading platform using React, FastAPI, PostgreSQL, and Docker, supporting virtual trading and portfolio analytics.",
                "Integrated the Upstox API for live market data and implemented event-driven workflows with RabbitMQ for asynchronous stock price alerts and notifications.",
                "Engineered a modular backend following Clean Architecture, with RESTful APIs, PostgreSQL, JWT authentication, Docker, and asynchronous event-driven communication."
            ],
            role="Developer",
            tech_stack=["React", "FastAPI", "Docker", "PostgreSQL", "RabbitMQ", "JWT"],
            links={"repo": "https://github.com/KraVLonE/StockCraft", "live_demo": ""},
            featured=True,
            order=1
        )
        proj2 = Project(
            title="Geoguide",
            location="Durg, Chhattisgarh",
            date=date(2024, 2, 1),
            one_liner="An autonomous robotic system combining Computer Vision, graph-based path planning, and embedded control.",
            pointers=[
                "Developed an autonomous robotic system combining Computer Vision, graph-based path planning (Dijkstra's Algorithm), and embedded control for intelligent navigation in a dynamic arena.",
                "Built a Computer Vision pipeline using PyTorch and OpenCV to detect disaster events from arena images, enabling autonomous event identification and prioritization.",
                "Implemented ArUco marker-based localization to map the arena, estimate robot position and orientation, and dynamically reconstruct the navigation graph in real time."
            ],
            role="Developer",
            tech_stack=["Python", "C++", "Arduino", "Pytorch", "OpenCV", "Sockets"],
            links={"repo": "https://github.com/KraVLonE/Geoguide", "live_demo": "https://www.youtube.com/watch?v=jPzFFzKt_RI"},
            featured=True,
            order=2
        )

        proj3 = Project(
          title= "AI Traffic Optimization",
            location="Durg, Chhattisgarh",
            date=date(2023, 11, 1),
          one_liner = "A reinforcement learning-based intelligent traffic signal optimization system for reducing congestion and improving traffic flow.",
          pointers = [
            "Developed a Reinforcement Learning-based traffic signal optimization system that dynamically adapts signal timings based on real-time traffic conditions.",
            "Designed a traffic simulation environment with vehicle flow, queue lengths, waiting times, and signal states as the basis for learning an optimal control policy.",
            "Implemented and evaluated an RL agent for intelligent signal control, optimizing traffic flow while minimizing vehicle waiting time and congestion."
          ],
          role = "Developer",
          tech_stack = [
            "Python",
            "Reinforcement Learning",
            "PyTorch",
            "OpenCV",
            "NumPy",
            "SUMO"
          ],
          links = {
            "repo": "https://github.com/KraVLonE/Traffic-Control-Optimization",
            "live_demo": "https://traffic-control-optimization.onrender.com/"
          },
          featured = True,
          order = 3
        )

        proj4 = Project(
            title="Ambulance Management System",
            location="Durg, Chhattisgarh",
            date=date(2023, 9, 1),
            one_liner="A real-time full-stack ambulance dispatch and routing system for intelligent emergency response.",
            pointers=[
                "Developed a full-stack ambulance dispatching system that identifies the nearest available ambulance based on hospital availability and user location.",
                "Implemented real-world road-network routing using OSRM and integrated Leaflet to visualize ambulance routes, hospital locations, and real-time dispatch operations.",
                "Built a real-time multi-dispatch architecture using Socket.io, supporting concurrent ambulance requests with independent route animations and live availability updates."
            ],
            role="Developer",
            tech_stack=["React", "Node.js", "Express", "Socket.io", "Leaflet", "Tailwind CSS", "SQLite", "OSRM"],
            links={
                "repo": "https://github.com/KraVLonE/Ambulance-Management-System",
                "live_demo": "https://kravlone.github.io/Ambulance-Management-System"
            },
            featured=True,
            order=4
        )

        proj5 = Project(
            title="ClipIn",
            location="Durg, Chhattisgarh",
            date=date(2025, 6, 1),
            one_liner="A browser extension that saves LinkedIn profiles directly to a Notion referral tracking database.",
            pointers=[
                "Developed a Chrome/Firefox browser extension that captures LinkedIn profile information and saves it directly to a Notion database in one click.",
                "Implemented robust, layout-agnostic company detection to handle LinkedIn UI variations and automatically extract profile details including name, company, and LinkedIn URL.",
                "Integrated the Notion API with configurable contact status and notes, enabling a streamlined workflow for tracking professional networking and referrals."
            ],
            role="Developer",
            tech_stack=["JavaScript", "Chrome Extensions", "Firefox Extensions", "Notion API", "HTML", "CSS"],
            links={"repo": "https://github.com/KraVLonE/ClipIn"},
            featured=False,
            order=5
        )

        proj6 = Project(
            title="Telegram Notion Bot",
            location="Durg, Chhattisgarh",
            date=date(2025, 4, 1),
            one_liner="An Telegram bot for managing Notion tasks through natural language.",
            pointers=[
                "Developed a Telegram-based task management system that enables users to create, read, update, and delete Notion tasks using natural-language commands.",
                "Integrated Google Gemini to parse natural-language instructions and extract structured task attributes including title, priority, due date, and status.",
                "Built an interactive Telegram interface with quick-action buttons and containerized the application using Docker Compose for streamlined deployment."
            ],
            role="Developer",
            tech_stack=["Python", "Google Gemini", "Telegram Bot API", "Notion API", "Docker", "Docker Compose"],
            links={"repo": "https://github.com/KraVLonE/Telegram_Bot_For_Notion_Task_Management"},
            featured=False,
            order=6
        )

        session.add_all([proj1, proj2, proj3, proj4, proj5, proj6])

        # 4. Skills
        categories = {
            "Languages": ["Python", "C/C++", "JavaScript", "TypeScript", "Bash", "SQL", "HTML/CSS"],
            "AI/ML": ["LangChain", "LangGraph", "MCP", "RAG", "ChromaDB", "OpenAI LLMs", "OpenCV", "Computer Vision"],
            "Software Engineering": ["FastAPI", "Node.js", "React", "REST APIs", "JWT", "PostgreSQL", "MySQL", "Redis", "RabbitMQ", "SQLAlchemy"],
            "DevOps & Cloud": ["Docker", "Git", "GitHub Actions", "Jenkins", "Linux", "AWS EC2", "Nginx", "CI/CD"]
        }

        skill_objects = []
        cat_order = 1
        for cat, skills in categories.items():
            skill_order = 1
            for skill in skills:
                skill_objects.append(Skill(name=skill, category=cat, order=skill_order))
                skill_order += 1
            cat_order += 1

        session.add_all(skill_objects)

        # 5. Achievements
        ach1 = Achievement(
            title="TCS CodeVita",
            description="Achieved Global Rank 1844 among 537,000+ participants.",
            order=1
        )
        ach2 = Achievement(
            title="Smart India Hackathon 2024 Finalist",
            description="Developed a sustainable Ganga River Water Quality Forecast model.",
            order=2
        )
        ach3 = Achievement(
            title="E-Yantra Robotics Competition 2023–24 Finalist",
            description="Ranked top 30 among 4,000+ teams in an IIT Bombay challenge.",
            order=3
        )
        session.add_all([ach1, ach2, ach3])

        # 6. GithubStatsCache default
        github_query = await session.execute(select(GithubStatsCache).where(GithubStatsCache.id == 1))
        github_cache = github_query.scalars().first()
        if not github_cache:
            github_cache = GithubStatsCache(id=1, total_commits=0, total_prs=0, total_repos=0, contribution_calendar={}, top_languages=[])
            session.add(github_cache)

        await session.commit()
        print("Successfully seeded the database!")

if __name__ == "__main__":
    asyncio.run(seed_data())
