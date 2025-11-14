import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

# Add current directory to path to ensure imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from models import (
        EvaluateReactRequest, EvaluateReactResponse,      # Import NEW models
        FormulateQuestionRequest, FormulateQuestionResponse # Import NEW models
    )
    from services import (
        evaluate_and_react, formulate_question           # Import NEW services
    )
except ImportError as e:
    print(f"❌ FATAL: Failed to import modules: {e}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Python path: {sys.path}")
    raise

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    try:
        from config import settings
        print(f"✅ App starting up...")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Model: {settings.OPENAI_MODEL}")
        print(f"   Base URL: {settings.OPENAI_BASE_URL}")
        print(f"   API Key configured: {'Yes' if settings.OPENAI_API_KEY else 'No'}")
        print(f"   Port: {os.getenv('PORT', 'Not set')}")
    except Exception as e:
        print(f"❌ Startup error: {e}")
        import traceback
        traceback.print_exc()
    yield
    # Shutdown (if needed)
    print("🛑 App shutting down...")

app = FastAPI(
    title="DigiAssistant AI Agent (Stateless)",
    description="A pure AI service that generates questions and evaluations for the diagnostic using OpenAI GPT-4o.",
    version="2.0.0",
    lifespan=lifespan
)

# --- Endpoint 1: Evaluate & React ---
@app.post("/api/v1/evaluate_react", response_model=EvaluateReactResponse) # Use NEW endpoint path and model
async def handle_evaluate_react(request: EvaluateReactRequest): # Use NEW request model
    """
    Evaluates the user's answer for a criterion and provides a reaction using OpenAI GPT-4o.
    """
    try:
        # Call the NEW service function
        result = await evaluate_and_react(request.user_answer, request.current_criterion)
        return EvaluateReactResponse(**result) # Return NEW response model
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error in /evaluate_react endpoint: {error_str}")
        
        # Provide more helpful error messages
        if "Unauthorized" in error_str or "api_key" in error_str.lower():
            status_code = 401
            detail = "API key is invalid or not configured. Check OPENAI_API_KEY environment variable."
        elif "rate limit" in error_str.lower():
            status_code = 429
            detail = "Rate limit exceeded. Please try again later."
        elif "model" in error_str.lower():
            status_code = 400
            detail = f"Model not found or not available. Check OPENAI_MODEL setting."
        else:
            status_code = 500
            detail = f"AI Agent Error during evaluation: {e}"
        
        raise HTTPException(status_code=status_code, detail=detail)

# --- Endpoint 2: Formulate Question ---
@app.post("/api/v1/formulate_question", response_model=FormulateQuestionResponse) # Use NEW endpoint path and model
async def handle_formulate_question(request: FormulateQuestionRequest): # Use NEW request model
    """
    Formulates a conversational question based on criterion text using OpenAI GPT-4o.
    """
    try:
        # Call the NEW service function with is_first_question flag
        formulated_q = await formulate_question(request.criterion_text, request.is_first_question)
        return FormulateQuestionResponse(formulated_question=formulated_q) # Return NEW response model
    except Exception as e:
        error_str = str(e)
        print(f"❌ Error in /formulate_question endpoint: {error_str}")
        
        # Provide more helpful error messages
        if "Unauthorized" in error_str or "api_key" in error_str.lower():
            status_code = 401
            detail = "API key is invalid or not configured. Check OPENAI_API_KEY environment variable."
        elif "rate limit" in error_str.lower():
            status_code = 429
            detail = "Rate limit exceeded. Please try again later."
        elif "model" in error_str.lower():
            status_code = 400
            detail = f"Model not found or not available. Check OPENAI_MODEL setting."
        else:
            status_code = 500
            detail = f"AI Agent Error during formulation: {e}"
        
        raise HTTPException(status_code=status_code, detail=detail)

@app.get("/")
def read_root():
    return {"Welcome": "DigiAssistant AI Agent (Tool-Based - OpenAI GPT-4o) is running!"} # Updated welcome

@app.get("/health")
def health_check():
    """Health check endpoint for Railway"""
    try:
        from config import settings
        return {
            "status": "healthy",
            "service": "DigiAssistant AI Agent",
            "model": settings.OPENAI_MODEL or "Not configured",
            "base_url": settings.OPENAI_BASE_URL or "Not configured",
            "api_key_configured": "Yes" if settings.OPENAI_API_KEY else "No",
            "port": os.getenv("PORT", "Not set")
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

