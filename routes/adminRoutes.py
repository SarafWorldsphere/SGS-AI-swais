from fastapi import APIRouter, Depends
from controllers.admin_controller import (
    translate_admin_text, 
    format_voice_transcription,
    TranslateRequest,
    VoiceFormatRequest
)
from config.db import get_connection  # Ensure this uses open_school_session() from the tenant kit

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin AI"]
)

@router.post("/translate")
async def translate_route(
    payload: TranslateRequest, 
    db_connection = Depends(get_connection) # ✅ Injects the active school's connection
):
    # Passes the active connection explicitly to the controller for logging
    return await translate_admin_text(payload, db_connection=db_connection)

@router.post("/format-voice")
async def format_voice_route(
    payload: VoiceFormatRequest, 
    db_connection = Depends(get_connection) # ✅ Injects the active school's connection
):
    # Passes the active connection explicitly to the controller for logging
    return await format_voice_transcription(payload, db_connection=db_connection)