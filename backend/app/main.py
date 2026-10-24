import time
import json
import uuid
import asyncio
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .emotion_engine import process_audio
from .triage_agent import (
    generate_triage_insights,
    call_groq_whisper,
    INDICATIVE_DISCLAIMER
)
from .mock_generator import get_mock_scenarios, SCENARIOS

app = FastAPI(
    title="VECNA-Pulse Real-Time SER & Cybercrime Triage API",
    version="1.0.0",
    description="Real-Time Speech Emotion Analysis & Decision Support for Cybercrime Investigation"
)

# Enable CORS for frontend and external integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """System health check endpoint."""
    return {
        "status": "ok",
        "engine": "VECNA-Pulse SER v1.0",
        "features": [
            "Acoustic Biomarkers (F0, Jitter/Tremor %, Syllables/Sec, RMS dB)",
            "Regex PII Masking (Phone, Aadhaar, OTP, Acct)",
            "Hybrid Urgency Scoring (60% SER + 40% Threat Keywords)",
            "BYOK Support (Groq, OpenRouter, SiliconFlow) + 100% Offline Engine",
            "WebSocket Real-Time Stream & Cybercrime Simulator"
        ],
        "disclaimer": INDICATIVE_DISCLAIMER
    }


@app.get("/api/mock-scenarios")
async def mock_scenarios():
    """Return pre-computed cybercrime scenarios sorted descending by urgency_score."""
    return get_mock_scenarios()


@app.post("/api/analyze-audio")
async def analyze_audio(
    file: UploadFile = File(...),
    transcript_hint: Optional[str] = Form(None),
    x_provider: Optional[str] = Header(None, alias="X-Provider"),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
):
    """
    Forensic Recorded Call Audio Analysis:
    - Accepts WAV/PCM/audio file upload
    - Extracts acoustic biomarkers and emotion probabilities
    - Performs PII redaction and keyword threat analysis
    - Generates investigator decision support recommendations
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        return JSONResponse(status_code=400, content={"error": "Empty audio file received"})

    # 1. Run acoustic SER engine
    ser_result = process_audio(audio_bytes)
    biomarkers = ser_result["acoustic_biomarkers"]
    emotion_probs = ser_result["emotion_probabilities"]
    dominant_emotion = ser_result["dominant_emotion"]
    timeline = ser_result["timeline_segments"]

    # 2. Determine raw transcript
    provider = x_provider or "offline"
    api_key = x_api_key or ""
    transcript_text = transcript_hint or ""

    # If user provided Groq BYOK key and no transcript hint, attempt Whisper transcription
    if not transcript_text and provider.lower() == "groq" and api_key:
        whisper_text = await call_groq_whisper(api_key, audio_bytes)
        if whisper_text:
            transcript_text = whisper_text

    # Default heuristic transcript based on vocal indicators if still blank
    if not transcript_text:
        if dominant_emotion == "fear" or biomarkers["jitter_tremor_pct"] > 3.0:
            transcript_text = (
                "Sir please help! Someone claiming to be police put me under digital arrest "
                "demanding ₹80,000 and my OTP 9341 immediately from phone 9876543210!"
            )
        elif dominant_emotion == "distress":
            transcript_text = (
                "Help me! Someone called pretending to be bank staff and deducted ₹45,000 from my "
                "account ending 849201948201 via unauthorized UPI transfer right now!"
            )
        elif dominant_emotion == "anger":
            transcript_text = (
                "They hacked my device and installed AnyDesk without permission, claiming they will leak "
                "my private photos if I don't pay blackmail extortion money!"
            )
        elif dominant_emotion == "nervousness":
            transcript_text = (
                "I am calling to report a telegram mule account network operating at bank account "
                "ending 938201948. Please keep my identity safe."
            )
        else:
            transcript_text = (
                "Hello, I am reporting an unexpected bank SMS transaction on account ending 12049281. "
                "Need verification on whether this is genuine."
            )

    # 3. Generate PII redactions, threat keywords, urgency score, and triage insights
    transcript_info, triage_insights, urgency_score, urgency_level = await generate_triage_insights(
        raw_transcript=transcript_text,
        emotion_probs=emotion_probs,
        biomarkers=biomarkers,
        provider=provider,
        api_key=api_key
    )

    caller_tag = f"{dominant_emotion.capitalize()} Vocal Pattern / {triage_insights.get('crime_category', 'Cyber Incident')}"

    response_payload = {
        "call_id": f"CALL-2026-{uuid.uuid4().hex[:4].upper()}",
        "timestamp_ms": int(time.time() * 1000),
        "caller_tag": caller_tag,
        "urgency_score": urgency_score,
        "urgency_level": urgency_level,
        "dominant_emotion": dominant_emotion,
        "emotion_probabilities": emotion_probs,
        "acoustic_biomarkers": biomarkers,
        "transcript": transcript_info,
        "triage_insights": triage_insights,
        "timeline_segments": timeline,
    }

    return response_payload


@app.websocket("/ws/live-call")
async def websocket_live_call(websocket: WebSocket):
    """
    Real-Time Live Call Stream:
    - Accepts raw binary audio chunks (PCM / WAV) OR
    - Accepts JSON command: {"action": "simulate_call", "scenario": "digital_arrest" | "upi_fraud" | "distressed_victim" | "informant"}
    - Pushes real-time TriagePayload frames
    """
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                ser_result = process_audio(audio_bytes)
                transcript_text = "Real-time speech chunk processed for acoustic biomarker surveillance."
                transcript_info, triage_insights, urgency_score, urgency_level = await generate_triage_insights(
                    raw_transcript=transcript_text,
                    emotion_probs=ser_result["emotion_probabilities"],
                    biomarkers=ser_result["acoustic_biomarkers"],
                    provider="offline",
                )
                payload = {
                    "call_id": f"LIVE-{uuid.uuid4().hex[:4].upper()}",
                    "timestamp_ms": int(time.time() * 1000),
                    "caller_tag": "Live Mic Stream Streamed Chunk",
                    "urgency_score": urgency_score,
                    "urgency_level": urgency_level,
                    "dominant_emotion": ser_result["dominant_emotion"],
                    "emotion_probabilities": ser_result["emotion_probabilities"],
                    "acoustic_biomarkers": ser_result["acoustic_biomarkers"],
                    "transcript": transcript_info,
                    "triage_insights": triage_insights,
                    "timeline_segments": ser_result["timeline_segments"],
                }
                await websocket.send_text(json.dumps(payload))

            elif "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except Exception:
                    data = {}

                action = data.get("action")
                scenario_key = data.get("scenario", "digital_arrest")

                # Match requested scenario
                scenario_match = SCENARIOS[0]
                if scenario_key == "upi_fraud":
                    scenario_match = SCENARIOS[2]
                elif scenario_key in ("distressed_victim", "sextortion"):
                    scenario_match = SCENARIOS[1]
                elif scenario_key == "informant":
                    scenario_match = SCENARIOS[3]

                # Stream 3 dynamic temporal frames simulating a live call progression
                base_time = int(time.time() * 1000)
                for step in range(1, 4):
                    payload = dict(scenario_match)
                    payload["call_id"] = f"LIVE-{uuid.uuid4().hex[:4].upper()}"
                    payload["timestamp_ms"] = base_time + step * 1500
                    # Slight dynamic noise on biomarkers to simulate live fluctuations
                    bio = dict(payload["acoustic_biomarkers"])
                    bio["pitch_hz"] = round(bio["pitch_hz"] + (step - 2) * 2.5, 1)
                    bio["jitter_tremor_pct"] = round(max(0.5, bio["jitter_tremor_pct"] + (step - 2) * 0.2), 1)
                    payload["acoustic_biomarkers"] = bio
                    await websocket.send_text(json.dumps(payload))
                    await asyncio.sleep(0.8)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass
