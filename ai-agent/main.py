from fastapi import FastAPI, HTTPException
from models import (
    EvaluateReactRequest, EvaluateReactResponse,      # Import NEW models
    FormulateQuestionRequest, FormulateQuestionResponse # Import NEW models
)
from services import (
    evaluate_and_react, formulate_question           # Import NEW services
)

app = FastAPI(
    title="DigiAssistant AI Agent (Stateless)",
    description="A pure AI service that generates questions and evaluations for the diagnostic using OpenAI GPT-4o.",
    version="2.0.0"
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
        print(f"Error in /evaluate_react endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"AI Agent Error during evaluation: {e}")

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
        print(f"Error in /formulate_question endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"AI Agent Error during formulation: {e}")

@app.get("/")
def read_root():
    return {"Welcome": "DigiAssistant AI Agent (Tool-Based - OpenAI GPT-4o) is running!"} # Updated welcome

