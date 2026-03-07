from typing import List
from google import genai
from google.genai import types
from google.api_core import exceptions
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from app.core.config import settings
from app.schemas.ai_schema import ChatMessage
from datetime import datetime, timedelta
import json

# Global cooldown for AI Quota (Circuit Breaker)
QUOTA_COOLDOWN_UNTIL = datetime.utcnow()

# Initialize the Gemini clients
client_chatbot = genai.Client(api_key=settings.GEMINI_API_KEY_CHATBOT) if settings.GEMINI_API_KEY_CHATBOT else None
client_verification = genai.Client(api_key=settings.GEMINI_API_KEY_VERIFICATION) if settings.GEMINI_API_KEY_VERIFICATION else None

SYSTEM_PROMPT = """You are ArchBot — your city intelligence copilot embedded inside the real estate urban analytics platform called ArchNext.

Your role is to:
- Guide users through platform features using an intelligent, calm, concise, and professional tone.
- Explain thermal mapping, ward intelligence, property prediction models, and urban infrastructure analytics.
- Suggest which tool users should use based on their goals.
- Directly navigate the user to different pages when they ask to go somewhere or when you suggest a tool.

You must:
- Stay within ArchNext scope.
- Avoid general knowledge responses.
- Keep answers concise and actionable (Limit responses to 150–200 words max).
- If the user asks to navigate to a page, or you highly recommend a page, YOU MUST include the tag `[NAVIGATE: /route]` in your response. Replace `/route` with one of the following exact paths: `/dashboard`, `/portfolio`, `/properties`, `/map`, `/prediction`, `/marketplace`, `/ecosystem`, `/settings`.
- Do not make up routes. Only use the ones listed.
- Acknowledge any provided 'Context' to understand where the user currently is in the app.

You are not a generic chatbot. You are a domain-specific intelligence layer for ArchNext.
"""

def is_retryable_exception(exception):
    """
    Checks if an exception is a 429 Resource Exhausted error.
    """
    # google-genai SDK 429s often come as 'ResourceExhausted'
    return "429" in str(exception) or "ResourceExhausted" in str(exception)

@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    stop=stop_after_attempt(3),
    retry_error_callback=lambda retry_state: None
)
async def _call_gemini_safe(client, model, contents, config):
    global QUOTA_COOLDOWN_UNTIL
    
    # 1. Circuit Breaker Check
    if datetime.utcnow() < QUOTA_COOLDOWN_UNTIL:
        # Silently skip if we're in cooldown
        return None

    try:
        return client.models.generate_content(
            model=model,
            contents=contents,
            config=config
        )
    except Exception as e:
        err_str = str(e)
        if is_retryable_exception(e):
            # 2. Extract specific quota info - if 'limit: 0', trigger hard cooldown
            if "limit: 0" in err_str:
                print(f"[Gemini] Hard Quota Exhausted (Limit: 0). Entering 2-minute cooldown.")
                QUOTA_COOLDOWN_UNTIL = datetime.utcnow() + timedelta(minutes=2)
                return None # Stop retrying immediately
                
            print(f"[Gemini] Quota hit (429), retrying in background... (Reason: {err_str[:100]})")
            raise e 
        raise e

async def process_chat_message(messages: List[ChatMessage], context: dict | None = None) -> str:
    if not client_chatbot:
        return "Internal Error: Gemini Chatbot API key is not configured."

    contents = []
    
    if context and messages:
        last_msg = messages[-1]
        if last_msg.role == 'user':
            context_str = f"\n\n[SYSTEM CONTEXT: {context}]"
            last_msg.content += context_str
    
    for msg in messages:
        contents.append(
            types.Content(
                role=msg.role,
                parts=[types.Part.from_text(text=msg.content)]
            )
        )

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.3,
    )

    try:
        response = await _call_gemini_safe(
            client_chatbot, 
            'gemini-2.0-flash', # Changed from 2.5 to 2.0-flash which exists
            contents, 
            config
        )
        if response:
            return response.text
        return "I am currently reaching my cognitive limit for today. Please give me a moment to recalibrate."
    except Exception as e:
        # Log purely for internal debugging, no need to alarm user in terminal
        return "I am taking a brief mental break to recalibrate my city intelligence models. Please chat with me again in a minute."

async def verify_property_listing(property_details: dict, predicted_price: float) -> dict:
    """
    Uses Gemini to verify a property listing based on its details 
    and the AI-predicted market price.
    """
    if not client_verification:
        return {"is_verified": False, "score": 0.0, "reason": "Gemini Verification API key not configured"}

    prompt = f"""
    As an expert AI Property Auditor for ArchNext, rigorously verify the following property listing for authenticity, pricing accuracy, and quality.
    
    Title: {property_details.get('title')}
    Description: {property_details.get('description')}
    Listed Price: {property_details.get('price')} INR
    AI Predicted Price: {predicted_price} INR/sqft
    
    Tasks & Rubrics:
    1. Price Analysis: Compare the Listed Price with the AI Predicted Price. If the listed price is >30% higher or lower, flag it as suspicious. Ensure units match contextually.
    2. Content Scrutiny: Analyze the description for red flags (e.g., ALL CAPS, overly promotional claims, missing details like area/BHK).
    3. Authenticity: Evaluate if the listing seems plausible, professional, and authentic.
    
    Respond in STRICT JSON format:
    {{
        "is_verified": boolean, // True only if score > 0.6 and no critical red flags
        "verification_score": float (0.0 to 1.0), // based on price (0.4), description (0.3), authenticity (0.3)
        "summary": "Short 1-sentence verification summary",
        "flags": ["list", "of", "red", "flags", "if", "any"]
    }}
    """

    config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type='application/json'
    )

    try:
        response = await _call_gemini_safe(
            client_verification,
            'gemini-2.0-flash',
            prompt,
            config
        )
        
        if response:
            result = json.loads(response.text)
            return result
            
        raise Exception("Empty response after retries")

    except Exception as e:
        # Fallback to neutral score and summary (No print needed to keep logs clean)
        return {
            "is_verified": False, 
            "verification_score": 0.5, 
            "summary": "Property analysis pending manual review due to verification engine load.",
            "flags": ["system_idle", "manual_review_required"]
        }
