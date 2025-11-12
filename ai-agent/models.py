# ai-agent/models.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

# --- Endpoint 1: /evaluate_react ---
class EvaluateReactRequest(BaseModel):
    user_answer: str
    current_criterion: Dict[str, Any] 

class EvaluateReactResponse(BaseModel):
    evaluation: Dict[str, Any]
    ai_reaction: str

# --- Endpoint 2: /formulate_question ---
class FormulateQuestionRequest(BaseModel):
    criterion_text: str
    is_first_question: bool = False  # Flag to indicate if this is the first question

class FormulateQuestionResponse(BaseModel):
    formulated_question: str

