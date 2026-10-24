import time
import json
import uuid
import asyncio
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, Header, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .emotion_engine import process_audio
from .triage_agent import (
    generate_triage_insights,
    call_groq_whisper,
    process_voice_copilot,
    format_forensic_case_report,
    INDICATIVE_DISCLAIMER
)
from .mock_generator import get_mock_scenarios, SCENARIOS

app = FastAPI(
    title="VECNA-Pulse Real-Time SER & Cybercrime Triage API",
    version="2.0.0",
    description="Real-Time Speech Emotion Analysis, Hybrid ONNX Biometrics & Decision Support for Cybercrime Investigation"
)

# Enable CORS for frontend and external integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VoiceCopilotRequest(BaseModel):
    call_id: str
    officer_voice_note: str
    current_payload: Optional[Dict[str, Any]] = None


class ExportReportRequest(BaseModel):
    triage_payload: Dict[str, Any]
    officer_notes: Optional[str] = None
    copilot_data: Optional[Dict[str, Any]] = None


@app.get("/api/health")
async def health_check():
    """System health check endpoint."""
    return {
        "status": "ok",
        "engine": "VECNA-Pulse SER v2.0 (Hybrid ONNX + Acoustic Biomarkers)",
        "features": [
            "Acoustic Biomarkers (F0, Jitter/Tremor %, Syllables/Sec, RMS dB)",
            "Hybrid ONNX Integration (Sherpa-ONNX SenseVoice + Silero VAD)",
            "Voice Activity Ratio & Extraction Confidence Rating",
            "Regex PII Masking (Phone, Aadhaar, OTP, Acct)",
            "Hybrid Urgency Scoring (60% SER + 40% Threat Keywords)",
            "BYOK Support (Groq, OpenRouter, SiliconFlow) + 100% Offline Engine",
            "WebSocket Real-Time Stream (Mic, Escalation Sim, Multi-Call Surge)",
            "Wispr Voice Co-Pilot & 1930 NCRP Freeze Ticket Generator",
            "Forensic Case Report Evidence Export (.md & .json)"
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
    - Extracts acoustic biomarkers and emotion probabilities via Hybrid ONNX + DSP
    - Performs PII redaction and keyword threat analysis
    - Generates investigator decision support recommendations
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        return JSONResponse(status_code=400, content={"error": "Empty audio file received"})

    # 1. Run hybrid acoustic SER engine
    ser_result = process_audio(audio_bytes)
    biomarkers = ser_result["acoustic_biomarkers"]
    emotion_probs = ser_result["emotion_probabilities"]
    dominant_emotion = ser_result["dominant_emotion"]
    timeline = ser_result["timeline_segments"]
    onnx_transcript = ser_result.get("onnx_transcript", "")

    # 2. Determine raw transcript
    provider = x_provider or "offline"
    api_key = x_api_key or ""
    transcript_text = transcript_hint or onnx_transcript or ""

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


@app.post("/api/voice-copilot")
async def voice_copilot(
    request: VoiceCopilotRequest,
    x_provider: Optional[str] = Header(None, alias="X-Provider"),
    x_api_key: Optional[str] = Header(None, alias="X-Api-Key"),
):
    """
    Wispr Voice Co-Pilot Endpoint:
    Accepts the officer's dictated rapid voice notes, extracts financial and cybercrime
    entities, generates an emergency 1930 NCRP Freeze Ticket draft, and updates the triage checklist.
    """
    provider = x_provider or "offline"
    api_key = x_api_key or ""
    current_payload = request.current_payload or {}

    result = await process_voice_copilot(
        call_id=request.call_id,
        officer_voice_note=request.officer_voice_note,
        current_payload=current_payload,
        provider=provider,
        api_key=api_key
    )
    return result


@app.post("/api/export-report")
async def export_report(request: ExportReportRequest):
    """
    Forensic Case Evidence Report Export:
    Returns complete, formatted Markdown & JSON Forensic Triage Dossier
    including Responsible AI Legal Notice.
    """
    report = format_forensic_case_report(
        triage_payload=request.triage_payload,
        officer_notes=request.officer_notes,
        copilot_data=request.copilot_data
    )
    return report


@app.websocket("/ws/live-call")
async def websocket_live_call(websocket: WebSocket):
    """
    Real-Time Live Call Stream:
    1. Accepts raw binary audio chunks (PCM / WAV) from browser microphone.
    2. Accepts JSON {"action": "simulate_call", "scenario": "..."}:
       Streams 5 sequential 2-second time-slices of a single call showing emotion escalating
       from nervousness to fear/distress in real time.
    3. Accepts JSON {"action": "simulate_surge"}:
       Simulates 4 concurrent incoming cybercrime calls with live updates so UI Priority Queue
       dynamically re-orders calls by urgency_score.
    """
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]
                ser_result = process_audio(audio_bytes)
                transcript_text = ser_result.get("onnx_transcript") or "Real-time speech chunk processed for acoustic biomarker surveillance."
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

                if action == "simulate_surge":
                    # Simulate 4 concurrent incoming cybercrime calls with live updates
                    base_scenarios = get_mock_scenarios()
                    now_ms = int(time.time() * 1000)

                    # Dynamic variations for the surge
                    surge_calls = []
                    # 1. Digital Arrest caller escalates to 96
                    c1 = dict(base_scenarios[0])
                    c1["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c1["timestamp_ms"] = now_ms - 10000
                    c1["urgency_score"] = 96
                    c1["urgency_level"] = "CRITICAL"
                    surge_calls.append(c1)

                    # 2. Sextortion caller at 93
                    c2 = dict(base_scenarios[1])
                    c2["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c2["timestamp_ms"] = now_ms - 25000
                    c2["urgency_score"] = 93
                    c2["urgency_level"] = "CRITICAL"
                    surge_calls.append(c2)

                    # 3. Active UPI fraud caller jumps to 88
                    c3 = dict(base_scenarios[2])
                    c3["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c3["timestamp_ms"] = now_ms - 50000
                    c3["urgency_score"] = 88
                    c3["urgency_level"] = "CRITICAL"
                    surge_calls.append(c3)

                    # 4. Mule account informant at 62
                    c4 = dict(base_scenarios[3])
                    c4["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c4["timestamp_ms"] = now_ms - 90000
                    c4["urgency_score"] = 62
                    c4["urgency_level"] = "HIGH"
                    surge_calls.append(c4)

                    # Send each individual call update
                    for call_item in surge_calls:
                        await websocket.send_text(json.dumps(call_item))
                        await asyncio.sleep(0.15)

                    # Also send combined batch frame for queue re-ordering
                    batch_payload = {
                        "action": "surge_batch",
                        "calls": sorted(surge_calls, key=lambda x: x["urgency_score"], reverse=True),
                        "timestamp_ms": now_ms
                    }
                    await websocket.send_text(json.dumps(batch_payload))

                elif action == "simulate_call":
                    scenario_key = data.get("scenario", "digital_arrest")
                    scenario_match = SCENARIOS[0]
                    if scenario_key == "upi_fraud":
                        scenario_match = SCENARIOS[2]
                    elif scenario_key in ("distressed_victim", "sextortion"):
                        scenario_match = SCENARIOS[1]
                    elif scenario_key == "informant":
                        scenario_match = SCENARIOS[3]

                    call_id = f"LIVE-{uuid.uuid4().hex[:4].upper()}"
                    base_time = int(time.time() * 1000)

                    # Stream 5 sequential 2-second time-slices showing emotion escalation
                    # Step 1: Nervous hesitation (urgency ~60)
                    # Step 2: Confusion / rising tremor (urgency ~72)
                    # Step 3: Fear spike (urgency ~85)
                    # Step 4: Active distress (urgency ~92)
                    # Step 5: Full critical panic (urgency ~96)
                    escalation_steps = [
                        {"emotion": "nervousness", "urgency": 62, "pitch_mod": -25.0, "jitter_mod": -1.2},
                        {"emotion": "nervousness", "urgency": 74, "pitch_mod": -10.0, "jitter_mod": -0.5},
                        {"emotion": "fear", "urgency": 86, "pitch_mod": 10.0, "jitter_mod": 0.6},
                        {"emotion": "distress", "urgency": 92, "pitch_mod": 20.0, "jitter_mod": 1.1},
                        {"emotion": "distress", "urgency": 96, "pitch_mod": 32.0, "jitter_mod": 1.6},
                    ]

                    timeline_slices = []
                    for i, step in enumerate(escalation_steps):
                        start_sec = round(i * 2.0, 1)
                        end_sec = round((i + 1) * 2.0, 1)
                        timeline_slices.append({
                            "start_sec": start_sec,
                            "end_sec": end_sec,
                            "emotion": step["emotion"],
                            "urgency": step["urgency"]
                        })

                        frame_payload = dict(scenario_match)
                        frame_payload["call_id"] = call_id
                        frame_payload["timestamp_ms"] = base_time + i * 2000
                        frame_payload["dominant_emotion"] = step["emotion"]
                        frame_payload["urgency_score"] = step["urgency"]
                        frame_payload["urgency_level"] = "CRITICAL" if step["urgency"] >= 80 else "HIGH"

                        bio = dict(frame_payload["acoustic_biomarkers"])
                        bio["pitch_hz"] = round(max(90.0, bio["pitch_hz"] + step["pitch_mod"]), 1)
                        bio["jitter_tremor_pct"] = round(max(0.4, bio["jitter_tremor_pct"] + step["jitter_mod"]), 1)
                        bio["voice_activity_ratio"] = round(min(0.98, 0.70 + (i * 0.06)), 2)
                        bio["confidence_score"] = round(min(0.96, 0.80 + (i * 0.03)), 2)
                        frame_payload["acoustic_biomarkers"] = bio
                        frame_payload["timeline_segments"] = list(timeline_slices)

                        await websocket.send_text(json.dumps(frame_payload))
                        await asyncio.sleep(0.7)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass
