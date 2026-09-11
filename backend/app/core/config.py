from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PORT: int = 8000
    ENV: str = "development"

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "plated_db"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"

    JWT_SECRET: str = "change_this_secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7  # 7 days

    CLIENT_URL: str = "http://localhost:5173"
    UPLOAD_DIR: str = "uploads"

    @property
    def database_url(self) -> str:
        # A DB_HOST starting with "/" is a Unix socket directory (used for local
        # peer-authenticated Postgres, e.g. when no TCP password is configured).
        if self.DB_HOST.startswith("/"):
            return f"postgresql+psycopg2://{self.DB_USER}@/{self.DB_NAME}?host={self.DB_HOST}"
        return (
            f"postgresql+psycopg2://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env"


settings = Settings()
