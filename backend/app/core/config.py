from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = "development"

    DATABASE_URL: Optional[str] = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "plated_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    JWT_SECRET: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7  # 7 days

    CLIENT_URL: str = "http://localhost:5173"
    CORS_ORIGINS: str = ""
    UPLOAD_DIR: str = "uploads"

    @property
    def database_url(self) -> str:
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            if url.startswith("postgres://"):
                url = "postgresql+psycopg2://" + url[len("postgres://"):]
            elif url.startswith("postgresql://"):
                url = "postgresql+psycopg2://" + url[len("postgresql://"):]
            return url

        # A DB_HOST starting with "/" is a Unix socket directory (used for local
        # peer-authenticated Postgres, e.g. when no TCP password is configured).
        if self.DB_HOST.startswith("/"):
            return f"postgresql+psycopg2://{self.DB_USER}@/{self.DB_NAME}?host={self.DB_HOST}"
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def allowed_origins(self) -> list[str]:
        origins = {
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost",
            "https://localhost",
            "capacitor://localhost",
        }
        for raw in (self.CLIENT_URL, self.CORS_ORIGINS):
            if raw:
                for item in raw.split(","):
                    cleaned = item.strip().rstrip("/")
                    if cleaned:
                        origins.add(cleaned)
        return sorted(origins)

    class Config:
        env_file = ".env"


settings = Settings()
