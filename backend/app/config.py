"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    environment: str = "development"
    debug: bool = True

    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # CORS
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Simulation
    random_seed: int = 42
    num_initial_runs: int = 50

    # Model
    model_dir: str = "./saved_models"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
