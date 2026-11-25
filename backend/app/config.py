from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://tracker:tracker@localhost:5434/tracker"
    jwt_secret: str = "dev-secret-change-me"
    jwt_expires_min: int = 60 * 24 * 7
    admin_email: str = "admin@example.com"
    admin_password: str = "admin12345"
    storage_url: str = "http://localhost:8010"


settings = Settings()
