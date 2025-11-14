from openai import AsyncOpenAI
import json
from typing import Dict, Any
from config import settings 
from prompts import SYSTEM_PROMPT_EVALUATE_REACT, SYSTEM_PROMPT_FORMULATE_QUESTION

# Initialize client lazily to avoid startup errors
client = None

def get_client():
    """Get or create the OpenAI client instance."""
    global client
    if client is None:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        if not settings.OPENAI_BASE_URL:
            raise ValueError("OPENAI_BASE_URL environment variable is not set")
        if not settings.OPENAI_MODEL:
            raise ValueError("OPENAI_MODEL environment variable is not set")
        
        client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL
        )
        print(f"API Configured Successfully. Base URL: {settings.OPENAI_BASE_URL}, Model: {settings.OPENAI_MODEL}")
    return client
    

async def evaluate_and_react(user_answer: str, current_criterion: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates user answer and provides a reaction using OpenAI."""

    options_str = "\n".join([f"- Score {opt['score']}: {opt['text']}" for opt in current_criterion.get("options", [])])
    current_id = current_criterion.get("id", "N/A")

    user_prompt = f"""
    User's Answer: "{user_answer}"
    ---
    Criterion Options (to score the answer):
    - ID: {current_id}
    - Options:
    {options_str}
    ---
    **IMPORTANT EVALUATION INSTRUCTIONS:**
    1.  First, check if the answer is meaningful and relevant.
    2.  If the answer is nonsensical, random text, gibberish (like "hhshjsa", "abcde"), unrelated, or shows no understanding, you **MUST assign score 0**.
    3.  Only assign scores 1, 2, or 3 if the answer is relevant and demonstrates a genuine attempt to answer the question.
    4.  Be strict and conservative. When in doubt, choose the lower score.
    
    Now, perform the evaluation and reaction tasks based on these strict rules and return ONLY the JSON object.
    """

    api_client = get_client()
    response = await api_client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_EVALUATE_REACT},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.2 
    )
    
    result_text = response.choices[0].message.content
    result = json.loads(result_text)

    if "evaluation" not in result or "ai_reaction" not in result:
        print(f"OpenAI returned JSON but missing keys: {result}")
        raise ValueError("OpenAI JSON response is missing required keys.") 
        
    return result


async def formulate_question(criterion_text: str, is_first_question: bool = False) -> str:
    """Generates a conversational question using OpenAI."""

    if is_first_question:
        # For the first question, include a welcome message
        user_prompt = f"""This is the FIRST question in a digital maturity diagnostic conversation.
        
First, write a warm welcome message in FRENCH (Français) that:
- Welcomes the user to DigiAssistant
- Explains that you're their intelligent assistant for digital maturity assessment
- Mentions you'll help them through interactive questions
- Encourages them to start their digital transformation journey
- Use friendly emojis (👋, 🚀)

Then, after the welcome, formulate a friendly and concise conversational question in FRENCH based on this criterion:
Criterion Text: '{criterion_text}'

Format: [Welcome message in French]\n\n[Question in French]"""
    else:
        # For subsequent questions, return ONLY the question (no welcome, no greeting, no extra text)
        user_prompt = f"""This is NOT the first question. The user has already been welcomed.
        
Criterion Text: '{criterion_text}'

Return ONLY the question in FRENCH (Français). 
- NO welcome message
- NO greeting
- NO "Merci pour votre réponse" or similar
- NO extra text
- Just the question itself, friendly and concise."""

    api_client = get_client()
    response = await api_client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_FORMULATE_QUESTION},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7 # Keep 0.7 for creative question formulation
    )
    return response.choices[0].message.content.strip()