from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Portfolio API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/portfolio"

    # Security
    SECRET_KEY: str = "supersecretkey"  # change in production
    ADMIN_SECRET_KEY: str = "admin123"  # change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # SEO: built SPA shell served by the frontend container
    SPA_TEMPLATE_URL: str = "http://frontend/index.html"

    # Github stats cache time
    GITHUB_TOKEN: Optional[str] = None

    # Chatbot keys
    GEMINI_TOKENS: str = ""

    # Email Settings
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    NOTIFICATION_EMAIL: Optional[str] = None

    # Blog (docs/blog-requirements.md)
    BLOG_MEDIA_DIR: str = "/app/media"  # docker volume, also mounted read-only into blog nginx
    BLOG_MEDIA_BASE_URL: str = "https://blog.kravlone.xyz/media"  # absolute so admin preview + RSS work
    BLOG_MAX_IMAGE_BYTES: int = 5 * 1024 * 1024

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
