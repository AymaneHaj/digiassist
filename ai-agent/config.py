from pydantic_settings import BaseSettings, SettingsConfigDict
import sys
import os
from dotenv import load_dotenv
load_dotenv()

class Settings(BaseSettings):
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL")  # Default OpenAI URL
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL")  # Default model
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()