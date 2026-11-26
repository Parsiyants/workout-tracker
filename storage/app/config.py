from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class StorageSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    storage_dir: Path = Path("/data/uploads")
    public_base_url: str = ""
    jwt_secret: str = "dev-secret-change-me"
    max_file_mb: int = 200
    allowed_origins: str = "http://localhost:5173"


settings = StorageSettings()
