import os
import sys
import json
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def test_vecna_pulse_phase2():
    client = TestClient(app)

    # 1. Test GET /api/health
    print("[1/7] Testing GET /api/health...")
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200, f"Health check failed: {health_resp.text}"
    health_data = health_resp.json()
    assert health_data.get("status") == "ok"
    assert "disclaimer" in health_data
    print(" -> Health check PASSED:", health_data["status"], health_data["engine"])

    # 2. Test GET /api/hardware-info (Hardware Auto-Detector)
    print("[2/7] Testing GET /api/hardware-info...")
    hw_resp = client.get("/api/hardware-info")
    assert hw_resp.status_code == 200, f"Hardware info failed: {hw_resp.text}"
    hw_data = hw_resp.json()
    assert "cpu_cores" in hw_data and hw_data["cpu_cores"] > 0
    assert "ram_total_gb" in hw_data
    assert "gpu_accelerator" in hw_data
    assert "recommended_tier" in hw_data
    print(f" -> Hardware info PASSED: {hw_data['cpu_cores']} Cores | {hw_data['ram_total_gb']}GB RAM | Tier={hw_data['recommended_tier']}")

    # 3. Test GET /api/sample-audio/panic_victim
    print("[3/7] Testing GET /api/sample-audio/panic_victim...")
    audio_resp = client.get("/api/sample-audio/panic_victim")
    assert audio_resp.status_code == 200, f"Sample audio failed: {audio_resp.status_code}"
    assert len(audio_resp.content) > 10000, "Sample audio payload too small"
    print(f" -> Sample audio PASSED: received {len(audio_resp.content)} bytes audio/wav")

    # 2. Test GET /api/mock-scenarios
    print("[2/6] Testing GET /api/mock-scenarios...")
    mock_resp = client.get("/api/mock-scenarios")
    assert mock_resp.status_code == 200
    mock_scenarios = mock_resp.json()
    assert len(mock_scenarios) >= 4
    
    # Assert schema matches TriagePayload specification + new biomarkers
    first_scen = mock_scenarios[0]
    required_keys = [
        "call_id", "timestamp_ms", "caller_tag", "urgency_score", "urgency_level",
        "dominant_emotion", "emotion_probabilities", "acoustic_biomarkers",
        "transcript", "triage_insights", "timeline_segments"
    ]
    for key in required_keys:
        assert key in first_scen, f"Missing key '{key}' in mock scenario"
    
    assert "voice_activity_ratio" in first_scen["acoustic_biomarkers"]
    assert "confidence_score" in first_scen["acoustic_biomarkers"]
    print(f" -> Mock scenarios PASSED with 4 scenarios. Biomarkers verified.")

    # 3. Test POST /api/analyze-audio with sample WAVs
    print("[3/6] Testing POST /api/analyze-audio with panic_victim.wav...")
    sample_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "panic_victim.wav")
    assert os.path.exists(sample_path)

    with open(sample_path, "rb") as f:
        audio_bytes = f.read()

    files = {"file": ("panic_victim.wav", audio_bytes, "audio/wav")}
    data = {"transcript_hint": "Someone claiming to be CBI put me under digital arrest and asking for OTP 4819 from phone 9876543210!"}
    headers = {"X-Provider": "offline"}

    analyze_resp = client.post("/api/analyze-audio", files=files, data=data, headers=headers)
    assert analyze_resp.status_code == 200, f"Analyze audio failed: {analyze_resp.text}"
    triage_payload = analyze_resp.json()

    for key in required_keys:
        assert key in triage_payload, f"Missing key '{key}' in analyze-audio response"

    biomarkers = triage_payload["acoustic_biomarkers"]
    assert "voice_activity_ratio" in biomarkers, "Missing voice_activity_ratio"
    assert "confidence_score" in biomarkers, "Missing confidence_score"
    print(f" -> Analyze audio PASSED: Pitch={biomarkers['pitch_hz']}Hz, VAD={biomarkers['voice_activity_ratio']}, Conf={biomarkers['confidence_score']}")

    # 4. Test POST /api/voice-copilot (Wispr Voice Co-Pilot)
    print("[4/6] Testing POST /api/voice-copilot...")
    copilot_req = {
        "call_id": triage_payload["call_id"],
        "officer_voice_note": "Caller confirmed ₹45,000 sent via PhonePe, immediately freeze account and log FIR draft",
        "current_payload": triage_payload
    }
    copilot_resp = client.post("/api/voice-copilot", json=copilot_req)
    assert copilot_resp.status_code == 200, f"Voice copilot failed: {copilot_resp.text}"
    copilot_data = copilot_resp.json()
    assert "updated_actions" in copilot_data, "Missing updated_actions"
    assert "ncrp_1930_ticket_draft" in copilot_data, "Missing ncrp_1930_ticket_draft"
    assert "fir_summary_note" in copilot_data, "Missing fir_summary_note"

    ticket = copilot_data["ncrp_1930_ticket_draft"]
    assert "45,000" in ticket["amount_involved"] or "45000" in ticket["amount_involved"]
    assert "PhonePe" in ticket["payment_channel"]
    assert "ticket_id" in ticket
    safe_amount = ticket['amount_involved'].replace('\u20b9', 'Rs.')
    print(f" -> Voice Co-Pilot PASSED: Generated Ticket {ticket['ticket_id']} for {safe_amount} ({ticket['payment_channel']})")

    # 5. Test POST /api/export-report (Forensic Evidence Report)
    print("[5/6] Testing POST /api/export-report...")
    report_req = {
        "triage_payload": triage_payload,
        "officer_notes": "Officer dispatched immediate NCRP hold order to cyber crime cell.",
        "copilot_data": copilot_data
    }
    report_resp = client.post("/api/export-report", json=report_req)
    assert report_resp.status_code == 200, f"Export report failed: {report_resp.text}"
    report_data = report_resp.json()
    assert "markdown_report" in report_data
    assert "json_packet" in report_data
    assert "filename_base" in report_data
    assert "# VECNA-Pulse Forensic Case Dossier" in report_data["markdown_report"]
    assert "LEGAL NOTICE & STATUTORY GUARDRAIL" in report_data["markdown_report"]
    print(f" -> Export Report PASSED: Generated {report_data['filename_base']} ({len(report_data['markdown_report'])} bytes)")

    # 6. Test WebSocket live streaming (simulate_call & simulate_surge)
    print("[6/6] Testing WebSocket live streaming (simulate_call & simulate_surge)...")
    with client.websocket_connect("/ws/live-call") as ws:
        # Test simulate_call
        ws.send_text(json.dumps({"action": "simulate_call", "scenario": "digital_arrest"}))
        frame1 = json.loads(ws.receive_text())
        assert "call_id" in frame1
        assert "urgency_score" in frame1
        assert "voice_activity_ratio" in frame1["acoustic_biomarkers"]
        print(f" -> WS simulate_call PASSED: Frame 1 Urgency={frame1['urgency_score']} ({frame1['dominant_emotion']})")

        # Test simulate_surge
        ws.send_text(json.dumps({"action": "simulate_surge"}))
        surge_frame = json.loads(ws.receive_text())
        assert "call_id" in surge_frame or "calls" in surge_frame
        print(f" -> WS simulate_surge PASSED: Received surge stream update successfully.")

    print("\nALL PHASE 2 BACKEND SMOKE TESTS PASSED CLEANLY! [OK]")

if __name__ == "__main__":
    test_vecna_pulse_phase2()
