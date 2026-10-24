import os
import sys
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def test_vecna_pulse_endpoints():
    client = TestClient(app)

    # 1. Test GET /api/health
    print("[1/4] Testing GET /api/health...")
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200, f"Health check failed with {health_resp.status_code}: {health_resp.text}"
    health_data = health_resp.json()
    assert health_data.get("status") == "ok", f"Expected status 'ok', got {health_data}"
    assert "disclaimer" in health_data, "Missing indicative disclaimer in health response"
    print(" -> Health check PASSED:", health_data["status"])

    # 2. Test GET /api/mock-scenarios
    print("[2/4] Testing GET /api/mock-scenarios...")
    mock_resp = client.get("/api/mock-scenarios")
    assert mock_resp.status_code == 200, f"Mock scenarios failed with {mock_resp.status_code}: {mock_resp.text}"
    mock_scenarios = mock_resp.json()
    assert isinstance(mock_scenarios, list) and len(mock_scenarios) >= 4, "Expected at least 4 scenarios"
    
    # Assert schema matches TriagePayload specification
    first_scen = mock_scenarios[0]
    required_keys = [
        "call_id", "timestamp_ms", "caller_tag", "urgency_score", "urgency_level",
        "dominant_emotion", "emotion_probabilities", "acoustic_biomarkers",
        "transcript", "triage_insights", "timeline_segments"
    ]
    for key in required_keys:
        assert key in first_scen, f"Missing key '{key}' in mock scenario"
    
    # Verify descending urgency score ordering
    urgencies = [s["urgency_score"] for s in mock_scenarios]
    assert urgencies == sorted(urgencies, reverse=True), f"Scenarios not sorted descending: {urgencies}"
    print(f" -> Mock scenarios PASSED: {len(mock_scenarios)} scenarios sorted descending: {urgencies}")

    # 3. Test POST /api/analyze-audio with each sample WAV
    samples = ["panic_victim.wav", "nervous_caller.wav", "angry_caller.wav"]
    for sample_name in samples:
        sample_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", sample_name)
        assert os.path.exists(sample_path), f"Sample file not found at {sample_path}"
        print(f"[3/4] Testing POST /api/analyze-audio with {sample_name}...")

        with open(sample_path, "rb") as f:
            audio_bytes = f.read()

        files = {"file": (sample_name, audio_bytes, "audio/wav")}
        data = {"transcript_hint": f"Emergency test caller from phone +91 9876543210 regarding Aadhaar 1234 5678 9012 and OTP 4819 for {sample_name}"}
        headers = {"X-Provider": "offline"}

        analyze_resp = client.post("/api/analyze-audio", files=files, data=data, headers=headers)
        assert analyze_resp.status_code == 200, f"Analyze audio failed for {sample_name}: {analyze_resp.status_code}: {analyze_resp.text}"
        payload = analyze_resp.json()

        for key in required_keys:
            assert key in payload, f"Missing key '{key}' in analyze-audio response"

        # Verify acoustic biomarkers are populated
        biomarkers = payload["acoustic_biomarkers"]
        assert "pitch_hz" in biomarkers and biomarkers["pitch_hz"] > 0
        assert "jitter_tremor_pct" in biomarkers
        assert "speech_rate_sps" in biomarkers
        assert "rms_energy_db" in biomarkers
        assert "vocal_anomaly" in biomarkers

        # Verify PII was redacted
        transcript_obj = payload["transcript"]
        assert "[REDACTED-" in transcript_obj["raw_redacted"], "PII was not redacted from transcript"
        assert transcript_obj["pii_masked_count"] >= 1, "Expected at least 1 redacted PII match"

        # Verify mandatory indicative disclaimer
        insights = payload["triage_insights"]
        assert "indicative_disclaimer" in insights
        assert "INDICATIVE TRIAGE SIGNAL ONLY" in insights["indicative_disclaimer"]

        # Verify emotion probabilities sum to ~1.0
        probs = payload["emotion_probabilities"]
        prob_sum = round(sum(probs.values()), 2)
        assert 0.99 <= prob_sum <= 1.01, f"Probabilities do not sum to 1.0: {prob_sum}"

        print(f" -> {sample_name} PASSED:")
        print(f"    Dominant Emotion: {payload['dominant_emotion']} ({payload['emotion_probabilities']})")
        print(f"    Urgency: {payload['urgency_score']} ({payload['urgency_level']})")
        print(f"    Pitch: {biomarkers['pitch_hz']} Hz | Jitter: {biomarkers['jitter_tremor_pct']}% | Rate: {biomarkers['speech_rate_sps']} sps")
        print(f"    Redacted Transcript: {transcript_obj['raw_redacted']}")
        print(f"    Masked PII count: {transcript_obj['pii_masked_count']}")

    # 4. Test WebSocket live simulation
    print("[4/4] Testing WebSocket live call simulation...")
    with client.websocket_connect("/ws/live-call") as ws:
        ws.send_text('{"action": "simulate_call", "scenario": "digital_arrest"}')
        frame_text = ws.receive_text()
        frame = client.app # verify json parse
        import json
        frame_json = json.loads(frame_text)
        assert "call_id" in frame_json
        assert "urgency_score" in frame_json
        print(f" -> WebSocket stream PASSED: received live frame for {frame_json['call_id']}")

    print("\nALL BACKEND SMOKE TESTS PASSED CLEANLY! [OK]")

if __name__ == "__main__":
    test_vecna_pulse_endpoints()
