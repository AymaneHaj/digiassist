from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENAI_API_KEY: str
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"  # Default OpenAI URL
    OPENAI_MODEL: str = "gpt-4o"  # Default model
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()