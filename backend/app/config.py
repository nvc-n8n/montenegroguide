from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/montenegro_guide"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/montenegro_guide"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True

    # Storage
    storage_backend: str = "local"
    media_root: str = "./media"
    media_url: str = "/media"

    # S3
    s3_bucket: str = ""
    s3_region: str = ""
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_endpoint_url: str = ""

    # Image processing
    thumbnail_width: int = 400
    thumbnail_height: int = 300
    image_max_width: int = 1920
    image_max_height: int = 1080

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def media_path(self) -> Path:
        return Path(self.media_root)


settings = Settings()
