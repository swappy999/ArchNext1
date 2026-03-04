from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from app.services.voice_service import transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/transcribe", summary="Transcribe audio to text via Google Cloud STT")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accepts an uploaded audio file (typically webm from frontend MediaRecorder)
    and returns transcribed text.
    """
    if not audio:
        raise ValidationError(detail="No audio file provided")

    try:
        audio_bytes = await audio.read()
        logger.info(f"Received audio file for transcription: {len(audio_bytes)} bytes")
        
        transcript = await transcribe_audio(audio_bytes)
        
        return {"text": transcript}

    except ValueError as ve:
        # Credentials missing or similar config error
        logger.error(f"Voice Transcription Config Error: {str(ve)}")
        raise HTTPException(status_code=500, detail="Transcription service is not properly configured on the server.")
    except Exception as e:
        logger.error(f"Voice Transcription Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process voice transcription.")
