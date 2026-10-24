import time
import json
import uuid
import asyncio
import os
import platform
import ctypes
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, Form, Header, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from .emotion_engine import process_audio, _find_model_paths
from .triage_agent import (
    generate_triage_insights,
    call_groq_whisper,
    call_siliconflow_stt,
    process_voice_copilot,
    format_forensic_case_report,
    INDICATIVE_DISCLAIMER
)
from .mock_generator import get_mock_scenarios, SCENARIOS

app = FastAPI(
    title="VECNA-Pulse Real-Time SER & Cybercrime Triage API",
    version="3.0.0",
    description="Real-Time Speech Emotion Analysis, Hardware-Adaptive Engine & Cybercrime Investigation Console"
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
        "engine": "VECNA-Pulse SER v3.0 (Hardware-Adaptive + Hybrid ONNX)",
        "features": [
            "Hardware Auto-Detector & Adaptive Model Tiering",
            "Acoustic Biomarkers (F0, Jitter/Tremor %, Syllables/Sec, RMS dB)",
            "Hybrid ONNX Integration (Sherpa-ONNX SenseVoice + Silero VAD)",
            "Voice Activity Ratio & Extraction Confidence Rating",
            "Regex PII Masking (Phone, Aadhaar, OTP, Acct)",
            "Hybrid Urgency Scoring (60% SER + 40% Threat Keywords)",
            "SiliconFlow, Groq & OpenRouter First-Class STT/LLM BYOK Connectors",
            "WebSocket Real-Time Stream (Mic, Escalation Sim, Multi-Call Surge)",
            "Wispr Voice Co-Pilot & 1930 NCRP Freeze Ticket Generator",
            "Forensic Case Report Evidence Export (.md & .json)"
        ],
        "disclaimer": INDICATIVE_DISCLAIMER
    }


@app.get("/api/hardware-info")
async def hardware_info():
    """
    Host Hardware Profiler:
    Detects CPU cores, total system memory, GPU acceleration, and local ONNX model availability.
    """
    cores = os.cpu_count() or 4
    total_ram_gb = 8.0

    try:
        if platform.system() == "Windows":
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            total_ram_gb = round(stat.ullTotalPhys / (1024 ** 3), 1)
        else:
            total_ram_gb = round(os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES') / (1024 ** 3), 1)
    except Exception:
        total_ram_gb = 8.0

    gpu_desc = "Standard Host Compute"
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        if "CUDAExecutionProvider" in providers:
            gpu_desc = "NVIDIA CUDA (ONNX Runtime)"
        elif "DmlExecutionProvider" in providers:
            gpu_desc = "DirectML GPU (ONNX Runtime)"
        elif "CoreMLExecutionProvider" in providers:
            gpu_desc = "Apple Silicon Neural Engine"
    except Exception:
        pass

    sv_model, _, vad_model = _find_model_paths()

    rec_tier = "MID_RANGE"
    if cores >= 8 and total_ram_gb >= 12:
        rec_tier = "HIGH_END"
    elif cores <= 4 or total_ram_gb <= 4:
        rec_tier = "LOW_END"

    return {
        "status": "online",
        "host_os": f"{platform.system()} {platform.release()}",
        "cpu_arch": platform.machine(),
        "cpu_cores": cores,
        "cpu_processor": platform.processor() or "Multi-Core Host CPU",
        "ram_total_gb": total_ram_gb,
        "gpu_accelerator": gpu_desc,
        "models_detected": {
            "sense_voice_onnx": bool(sv_model),
            "silero_vad_onnx": bool(vad_model)
        },
        "recommended_tier": rec_tier
    }


@app.get("/api/mock-scenarios")
async def mock_scenarios():
    """Return pre-computed cybercrime scenarios sorted descending by urgency_score."""
    return get_mock_scenarios()


@app.get("/api/sample-audio/{scenario}")
async def get_sample_audio(scenario: str):
    """
    Serve synthesized sample WAV audio for playable interactive scenarios.
    """
    samples_dir = os.path.join(os.path.dirname(__file__), "..", "samples")
    scenario_clean = scenario.lower().replace("-", "_")

    file_mapping = {
        "digital_arrest": "panic_victim.wav",
        "panic_victim": "panic_victim.wav",
        "call_2026_0891": "panic_victim.wav",
        "upi_fraud": "nervous_caller.wav",
        "nervous_caller": "nervous_caller.wav",
        "call_2026_0892": "nervous_caller.wav",
        "distressed_victim": "angry_caller.wav",
        "sextortion": "angry_caller.wav",
        "angry_caller": "angry_caller.wav",
        "call_2026_0893": "angry_caller.wav",
        "informant": "nervous_caller.wav",
        "call_2026_0894": "nervous_caller.wav",
    }

    target_file = file_mapping.get(scenario_clean, "panic_victim.wav")
    file_path = os.path.join(samples_dir, target_file)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Audio sample '{scenario}' not found")

    return FileResponse(file_path, media_type="audio/wav", filename=target_file)


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

    # Call BYOK STT if provided and no transcript hint
    if not transcript_text and api_key:
        if provider.lower() == "siliconflow":
            sf_text = await call_siliconflow_stt(api_key, audio_bytes)
            if sf_text:
                transcript_text = sf_text
        elif provider.lower() == "groq":
            whisper_text = await call_groq_whisper(api_key, audio_bytes)
            if whisper_text:
                transcript_text = whisper_text

    # If no transcript is provided and neither SenseVoice nor Whisper recognized speech,
    # inform the investigator clearly that no speech was detected
    if not transcript_text:
        transcript_text = "[No speech detected in audio recording. Please verify audio clarity.]"

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
                    base_scenarios = get_mock_scenarios()
                    now_ms = int(time.time() * 1000)

                    surge_calls = []
                    c1 = dict(base_scenarios[0])
                    c1["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c1["timestamp_ms"] = now_ms - 10000
                    c1["urgency_score"] = 96
                    c1["urgency_level"] = "CRITICAL"
                    surge_calls.append(c1)

                    c2 = dict(base_scenarios[1])
                    c2["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c2["timestamp_ms"] = now_ms - 25000
                    c2["urgency_score"] = 93
                    c2["urgency_level"] = "CRITICAL"
                    surge_calls.append(c2)

                    c3 = dict(base_scenarios[2])
                    c3["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c3["timestamp_ms"] = now_ms - 50000
                    c3["urgency_score"] = 88
                    c3["urgency_level"] = "CRITICAL"
                    surge_calls.append(c3)

                    c4 = dict(base_scenarios[3])
                    c4["call_id"] = f"SURGE-{uuid.uuid4().hex[:4].upper()}"
                    c4["timestamp_ms"] = now_ms - 90000
                    c4["urgency_score"] = 62
                    c4["urgency_level"] = "HIGH"
                    surge_calls.append(c4)

                    for call_item in surge_calls:
                        await websocket.send_text(json.dumps(call_item))
                        await asyncio.sleep(0.15)

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
