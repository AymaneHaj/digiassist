import google.generativeai as genai
from app.core.config import settings
import asyncio

async def list_my_models():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    
    print("Listing available models for your API key:")
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f" - {m.name}")

if __name__ == "__main__":
    asyncio.run(list_my_models())