from pydantic_settings import BaseSettings, SettingsConfigDict
import sys
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: Optional[str] = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")  # Default OpenAI URL
    OPENAI_MODEL: Optional[str] = os.getenv("OPENAI_MODEL", "gpt-4o")  # Default model
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8', extra='ignore')

settings = Settings()