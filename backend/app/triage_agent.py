import re
import time
import json
import uuid
import logging
import httpx
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

INDICATIVE_DISCLAIMER = (
    "INDICATIVE TRIAGE SIGNAL ONLY: Vocal emotion and urgency metrics assist call "
    "prioritization and are NOT definitive evidence of caller intent, honesty, or guilt."
)

THREAT_KEYWORDS = {
    "suicide": 98,
    "kill myself": 98,
    "digital arrest": 92,
    "arrest warrant": 90,
    "cbi": 85,
    "police": 75,
    "customs": 80,
    "narcotics": 82,
    "video call": 70,
    "otp": 88,
    "transfer": 78,
    "money deducted": 85,
    "upi": 80,
    "anydesk": 88,
    "teamviewer": 85,
    "rustdesk": 85,
    "quicksupport": 85,
    "screen share": 80,
    "blackmail": 90,
    "extortion": 90,
    "webcam": 85,
    "leak video": 92,
    "hacked": 80,
    "compromised": 75,
    "apk": 80,
    "unauthorized": 75,
    "mule account": 65,
    "freeze account": 80,
}


def redact_pii(text: str) -> Tuple[str, int]:
    """
    Redact PII from transcript:
    - 10-digit Indian phone numbers -> [REDACTED-PHONE]
    - 12-digit Aadhaar numbers -> [REDACTED-Aadhaar]
    - 4-6 digit OTPs (near 'otp', 'code', 'pin') -> [REDACTED-OTP]
    - 9-18 digit bank account numbers -> [REDACTED-ACCT]
    Returns (redacted_text, count_masked).
    """
    if not text:
        return text, 0

    count = 0
    masked_text = text

    # 1. Aadhaar (12 digits with optional spaces or dashes)
    aadhaar_pattern = r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"
    aadhaar_matches = list(re.finditer(aadhaar_pattern, masked_text))
    if aadhaar_matches:
        count += len(aadhaar_matches)
        masked_text = re.sub(aadhaar_pattern, "[REDACTED-Aadhaar]", masked_text)

    # 2. Phone numbers (10 digits starting with 6-9, optional +91 prefix)
    phone_pattern = r"\b(?:\+91[-\s]?)?[6-9]\d{9}\b"
    phone_matches = list(re.finditer(phone_pattern, masked_text))
    if phone_matches:
        count += len(phone_matches)
        masked_text = re.sub(phone_pattern, "[REDACTED-PHONE]", masked_text)

    # 3. OTP codes (4-6 digits near keywords like otp, code, pin)
    otp_pattern = r"(?i)\b(otp|code|pin|verification\s*code)\s*(?:is|:)?\s*(\d{4,6})\b"
    def otp_repl(m):
        nonlocal count
        count += 1
        return f"{m.group(1)} [REDACTED-OTP]"
    masked_text = re.sub(otp_pattern, otp_repl, masked_text)

    # Standalone 4-6 digit OTP if preceded by 'ending' or followed by 'right now'
    otp_standalone = r"(?i)\bOTP\s+(\d{4,6})\b"
    otp_std_matches = list(re.finditer(otp_standalone, masked_text))
    if otp_std_matches:
        count += len(otp_std_matches)
        masked_text = re.sub(otp_standalone, "OTP [REDACTED-OTP]", masked_text)

    # 4. Bank account numbers (9 to 18 digits or account ending XXXXX)
    acct_pattern = r"(?i)\b(?:account|acct|a/c)\s*(?:ending|no\.?|number)?\s*[:#-]?\s*(\d{4,18})\b"
    def acct_repl(m):
        nonlocal count
        count += 1
        return f"account ending [REDACTED-ACCT]"
    masked_text = re.sub(acct_pattern, acct_repl, masked_text)

    # Long continuous digit sequences (11-18 digits)
    long_digits = r"\b\d{11,18}\b"
    long_matches = list(re.finditer(long_digits, masked_text))
    if long_matches:
        count += len(long_matches)
        masked_text = re.sub(long_digits, "[REDACTED-ACCT]", masked_text)

    return masked_text, count


def detect_threat_keywords(text: str) -> List[str]:
    """Find cybercrime keywords present in the transcript."""
    if not text:
        return []

    lower_text = text.lower()
    detected = []
    for kw in THREAT_KEYWORDS:
        if kw in lower_text:
            detected.append(kw)

    return detected


def classify_crime_category(text: str, keywords: List[str]) -> str:
    """Classify the crime category from detected threat keywords and context."""
    kw_set = set(k.lower() for k in keywords)

    if any(k in kw_set for k in ["digital arrest", "arrest warrant", "cbi", "police", "customs", "narcotics"]):
        return "Digital Arrest Extortion / Impersonation of Law Enforcement"
    elif any(k in kw_set for k in ["blackmail", "extortion", "webcam", "leak video", "suicide", "kill myself"]):
        return "Sextortion / Cyber Blackmail & Intimidation"
    elif any(k in kw_set for k in ["anydesk", "teamviewer", "rustdesk", "quicksupport", "screen share"]):
        return "Remote Access Fraud / Device Takeover (AnyDesk/TeamViewer)"
    elif any(k in kw_set for k in ["otp", "transfer", "money deducted", "upi", "unauthorized"]):
        return "Active UPI Fraud / Unauthorized Financial Drain"
    elif "mule account" in kw_set:
        return "Cybercrime Syndicate / Money Mule Account Ring"
    else:
        return "General Cyber Incident / Financial Fraud Suspicion"


def calculate_urgency(emotion_probs: Dict[str, float], keywords: List[str]) -> Tuple[int, str]:
    """
    Calculate composite urgency score (0-100) combining:
    - Acoustic fear/distress/nervousness (60% weight)
    - Cybercrime threat keywords (40% weight)
    """
    fear = emotion_probs.get("fear", 0.0)
    distress = emotion_probs.get("distress", 0.0)
    nervousness = emotion_probs.get("nervousness", 0.0)
    anger = emotion_probs.get("anger", 0.0)
    neutral = emotion_probs.get("neutral", 0.0)

    # Acoustic component (0 - 100)
    acoustic_score = (
        fear * 100.0 * 1.0 +
        distress * 100.0 * 0.95 +
        nervousness * 100.0 * 0.70 +
        anger * 100.0 * 0.60 +
        neutral * 100.0 * 0.15
    )

    # Keyword component (0 - 100)
    if keywords:
        kw_scores = [THREAT_KEYWORDS.get(kw.lower(), 40) for kw in keywords]
        keyword_score = max(kw_scores)
        if len(keywords) > 2:
            keyword_score = min(100, keyword_score + 8)
    else:
        keyword_score = 25.0

    composite = int(round(0.60 * acoustic_score + 0.40 * keyword_score))
    urgency_score = max(5, min(100, composite))

    if urgency_score >= 80:
        urgency_level = "CRITICAL"
    elif urgency_score >= 60:
        urgency_level = "HIGH"
    elif urgency_score >= 40:
        urgency_level = "MEDIUM"
    else:
        urgency_level = "LOW"

    return urgency_score, urgency_level


def get_offline_playbook(
    crime_category: str,
    urgency_score: int,
    biomarkers: Dict[str, Any],
    keywords: List[str]
) -> Dict[str, Any]:
    """Deterministic rule-based cybercrime triage playbook and explainability generator."""
    pitch = biomarkers.get("pitch_hz", 180.0)
    jitter = biomarkers.get("jitter_tremor_pct", 1.5)
    sps = biomarkers.get("speech_rate_sps", 4.0)

    if "Digital Arrest" in crime_category:
        actions = [
            "1. Instruct caller immediately to DISCONNECT the scammer's video call and NOT share any OTP or screen share.",
            "2. Reassure the victim that Indian Law Enforcement (CBI/ED/State Police) never conduct arrests or interrogations over Skype/WhatsApp video.",
            "3. Collect fraudulent bank accounts / UPI handles and log immediate 1930 NCRP financial freeze request.",
            "4. Verify caller physical safety and advise filing an official complaint on cybercrime.gov.in."
        ]
        explain = (
            f"Urgency {urgency_score}/100 triggered by elevated vocal tremor ({jitter}% jitter), "
            f"speech rate ({sps} syl/sec), and active digital arrest impersonation threats."
        )
    elif "Sextortion" in crime_category:
        actions = [
            "1. Advise caller to halt all communication and strictly DO NOT transfer any money or compromise payments.",
            "2. Direct victim to preserve all chat screenshots, suspect phone numbers, and social media profile URLs as evidence.",
            "3. Guide caller to report and block suspect profiles on social media and flag revenge porn to TakeItDown / cyber cell.",
            "4. Activate psychological support protocol and assure caller of complete investigative confidentiality."
        ]
        explain = (
            f"Urgency {urgency_score}/100 triggered by high acoustic distress and cyber blackmail keywords."
        )
    elif "Remote Access" in crime_category or "AnyDesk" in crime_category:
        actions = [
            "1. Order victim to immediately turn on Airplane Mode or disconnect Wi-Fi/Mobile Data on the compromised device.",
            "2. Uninstall remote access applications (AnyDesk, TeamViewer, RustDesk, QuickSupport) and inspect accessibility permissions.",
            "3. Contact bank helpline to block net banking credentials, UPI access, and ATM cards immediately.",
            "4. Capture router IP logs and device transaction history for cyber forensics inspection."
        ]
        explain = (
            f"Urgency {urgency_score}/100 triggered by remote access takeover indicators and heightened vocal agitation."
        )
    elif "Active UPI" in crime_category:
        actions = [
            "1. Instruct caller to open their banking application and freeze UPI transactions / block debit cards immediately.",
            "2. Collect transaction UTR (Unique Transaction Reference) numbers and beneficiary UPI handles for golden-hour freeze.",
            "3. Initiate emergency 1930 NCRP cyber fraud ticket to freeze beneficiary bank accounts within the Golden Hour window.",
            "4. Advise caller to change UPI PINs and never authorize reverse-charge collect requests."
        ]
        explain = (
            f"Urgency {urgency_score}/100 driven by active unauthorized financial drain keywords ({', '.join(keywords[:3])}) "
            f"and elevated vocal pitch ({pitch} Hz)."
        )
    else:
        actions = [
            "1. Log caller statements and cross-reference suspect phone numbers and bank accounts against the NCRP mule database.",
            "2. Verify whether any financial loss has taken place or if this is a preventive cyber intel tip.",
            "3. Issue cyber advisories for caller and schedule follow-up verification with jurisdictional cyber unit."
        ]
        explain = (
            f"Urgency {urgency_score}/100 reflects baseline caller concern with stable vocal biomarkers ({pitch} Hz, {jitter}% jitter)."
        )

    return {
        "crime_category": crime_category,
        "recommended_actions": actions,
        "explainability_summary": explain,
        "indicative_disclaimer": INDICATIVE_DISCLAIMER,
    }


async def call_byok_llm(
    provider: str,
    api_key: str,
    transcript: str,
    crime_category: str,
    urgency_score: int,
    biomarkers: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Call Groq, OpenRouter, or SiliconFlow with user's BYOK free key."""
    if not api_key or provider.lower() in ("offline", "local", ""):
        return None

    prompt = f"""You are an elite cybercrime investigator AI triage assistant.
Caller Transcript: "{transcript}"
Detected Crime Category: {crime_category}
Urgency Score: {urgency_score}/100
Acoustic Biomarkers: Pitch={biomarkers.get('pitch_hz')}Hz, Jitter={biomarkers.get('jitter_tremor_pct')}%, Speech Rate={biomarkers.get('speech_rate_sps')} sps

Provide structured JSON with:
1. "crime_category": Concise category title
2. "recommended_actions": List of 3-4 specific, prioritized, tactical steps for the 1930 / cyber police investigator.
3. "explainability_summary": 1-2 sentence concise explanation justifying why this call was scored at this urgency based on acoustic markers and threat keywords.

Respond ONLY with valid JSON in this exact shape:
{{
  "crime_category": "...",
  "recommended_actions": ["1. ...", "2. ...", "3. ..."],
  "explainability_summary": "..."
}}
"""

    headers = {"Content-Type": "application/json"}
    payload = {}

    try:
        if provider.lower() == "groq":
            endpoint = "https://api.groq.com/openai/v1/chat/completions"
            headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }
        elif provider.lower() == "openrouter":
            endpoint = "https://openrouter.ai/api/v1/chat/completions"
            headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": "meta-llama/llama-3.3-70b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
        elif provider.lower() == "siliconflow":
            endpoint = "https://api.siliconflow.cn/v1/chat/completions"
            headers["Authorization"] = f"Bearer {api_key}"
            payload = {
                "model": "Qwen/Qwen2.5-7B-Instruct",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
            }
        else:
            return None

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(endpoint, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                if "recommended_actions" in parsed and "explainability_summary" in parsed:
                    parsed["indicative_disclaimer"] = INDICATIVE_DISCLAIMER
                    return parsed
    except Exception as e:
        logger.warning(f"BYOK LLM call to {provider} failed: {e}. Falling back to offline playbook.")

    return None


async def call_groq_whisper(api_key: str, audio_bytes: bytes) -> Optional[str]:
    """Call Groq Whisper Large v3 Turbo if user provided Groq key."""
    if not api_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            files = {"file": ("audio.wav", audio_bytes, "audio/wav")}
            data = {"model": "whisper-large-v3-turbo"}
            headers = {"Authorization": f"Bearer {api_key}"}
            resp = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers=headers,
                files=files,
                data=data
            )
            if resp.status_code == 200:
                return resp.json().get("text")
    except Exception as e:
        logger.warning(f"Groq Whisper transcription failed: {e}")

    return None


async def generate_triage_insights(
    raw_transcript: str,
    emotion_probs: Dict[str, float],
    biomarkers: Dict[str, Any],
    provider: str = "offline",
    api_key: str = ""
) -> Tuple[Dict[str, Any], Dict[str, Any], int, str]:
    """
    Main triage coordinator:
    1. Redacts PII
    2. Detects threat keywords
    3. Calculates urgency
    4. Generates decision support insights via BYOK or offline playbook
    """
    redacted_text, pii_count = redact_pii(raw_transcript)
    keywords = detect_threat_keywords(raw_transcript)
    crime_category = classify_crime_category(raw_transcript, keywords)
    urgency_score, urgency_level = calculate_urgency(emotion_probs, keywords)

    insights = await call_byok_llm(
        provider=provider,
        api_key=api_key,
        transcript=redacted_text,
        crime_category=crime_category,
        urgency_score=urgency_score,
        biomarkers=biomarkers
    )

    if not insights:
        insights = get_offline_playbook(
            crime_category=crime_category,
            urgency_score=urgency_score,
            biomarkers=biomarkers,
            keywords=keywords
        )

    transcript_info = {
        "raw_redacted": redacted_text,
        "pii_masked_count": pii_count,
        "detected_keywords": keywords,
    }

    return transcript_info, insights, urgency_score, urgency_level


async def process_voice_copilot(
    call_id: str,
    officer_voice_note: str,
    current_payload: Dict[str, Any],
    provider: str = "offline",
    api_key: str = ""
) -> Dict[str, Any]:
    """
    Wispr Voice Co-Pilot Engine:
    Takes the officer's dictated rapid note, extracts key incident parameters
    (e.g., amount, payment channel, freeze commands), generates an emergency 1930
    NCRP ticket draft, and updates investigator actionable checklist.
    """
    note = officer_voice_note or ""
    redacted_note, _ = redact_pii(note)

    # Deterministic entity extraction:
    # 1. Amount detection (e.g. ₹45,000, 45,000, 45000, 1.5 lakh)
    amount_match = re.search(r"(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?|\d+)\s*(?:lakh|thousand|rupees|rs)?", note, re.I)
    amount_str = "₹45,000"
    if amount_match and len(amount_match.group(1)) > 1:
        val = amount_match.group(0).strip()
        if not val.startswith("₹") and not val.lower().startswith("rs"):
            val = f"₹{val}"
        amount_str = val

    # 2. Payment Channel detection
    channel = "UPI / Immediate Payment Service"
    lower_note = note.lower()
    if "phonepe" in lower_note:
        channel = "PhonePe (UPI)"
    elif "gpay" in lower_note or "google pay" in lower_note:
        channel = "Google Pay (UPI)"
    elif "paytm" in lower_note:
        channel = "Paytm Payments Bank / Wallet"
    elif "sbi" in lower_note:
        channel = "State Bank of India NetBanking"
    elif "hdfc" in lower_note:
        channel = "HDFC Bank Gateway"
    elif "icici" in lower_note:
        channel = "ICICI Bank Gateway"

    # 3. Target priority
    priority = "CRITICAL_GOLDEN_HOUR_FREEZE"
    if "urgent" in lower_note or "freeze" in lower_note or "immediately" in lower_note:
        priority = "EMERGENCY_STAGE_1_FREEZE"

    ticket_id = f"1930-NCRP-{uuid.uuid4().hex[:6].upper()}"
    ncrp_draft = {
        "ticket_id": ticket_id,
        "call_id": call_id,
        "incident_category": current_payload.get("triage_insights", {}).get("crime_category", "Cyber Financial Fraud"),
        "amount_involved": amount_str,
        "payment_channel": channel,
        "priority": priority,
        "freeze_target": "Beneficiary Bank / Gateway Account Node",
        "officer_dispatch_directive": redacted_note,
        "status": "DRAFT_PENDING_SUBMISSION",
        "created_at_ms": int(time.time() * 1000),
        "golden_hour_window_remaining": "48 mins (High Recovery Probability)"
    }

    # Generate updated actions tailored to officer directive
    category = current_payload.get("triage_insights", {}).get("crime_category", "Cyber Fraud")
    updated_actions = [
        f"1. [GOLDEN HOUR ACTION]: Submit 1930 NCRP Freeze Ticket #{ticket_id} to block {amount_str} at {channel}.",
        f"2. [OFFICER DIRECTIVE]: {redacted_note[:120]}...",
        "3. [TRANSACTION LOG]: Request UTR reference from complainant banking statement for police diary.",
        "4. [EVIDENCE SECURED]: Snapshot fraudulent video call/SMS headers and archive device MAC address."
    ]

    fir_summary_note = (
        f"Officer Diary Entry ({time.strftime('%Y-%m-%d %H:%M:%S')}): "
        f"Complainant on call {call_id} confirmed incident regarding {category}. "
        f"Dictated order: '{redacted_note}'. Initiated NCRP Draft {ticket_id} for {amount_str} via {channel}."
    )

    return {
        "call_id": call_id,
        "updated_actions": updated_actions,
        "ncrp_1930_ticket_draft": ncrp_draft,
        "fir_summary_note": fir_summary_note,
    }


def format_forensic_case_report(
    triage_payload: Dict[str, Any],
    officer_notes: Optional[str] = None,
    copilot_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Export comprehensive Forensic Case Report in Markdown and JSON formats.
    Complies strictly with Responsible AI legal notice mandate.
    """
    call_id = triage_payload.get("call_id", f"CALL-{uuid.uuid4().hex[:4].upper()}")
    timestamp_ms = triage_payload.get("timestamp_ms", int(time.time() * 1000))
    time_str = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(timestamp_ms / 1000))

    urgency_score = triage_payload.get("urgency_score", 85)
    urgency_level = triage_payload.get("urgency_level", "CRITICAL")
    dominant_emotion = triage_payload.get("dominant_emotion", "fear")
    caller_tag = triage_payload.get("caller_tag", "Distressed Complainant")

    biomarkers = triage_payload.get("acoustic_biomarkers", {})
    pitch = biomarkers.get("pitch_hz", 0)
    jitter = biomarkers.get("jitter_tremor_pct", 0)
    sps = biomarkers.get("speech_rate_sps", 0)
    energy = biomarkers.get("rms_energy_db", 0)
    anomaly = biomarkers.get("vocal_anomaly", "Normal")
    vad_ratio = biomarkers.get("voice_activity_ratio", 0.85)
    conf = biomarkers.get("confidence_score", 0.92)

    probs = triage_payload.get("emotion_probabilities", {})
    transcript = triage_payload.get("transcript", {})
    redacted_text = transcript.get("raw_redacted", "N/A")
    pii_count = transcript.get("pii_masked_count", 0)
    keywords = transcript.get("detected_keywords", [])

    insights = triage_payload.get("triage_insights", {})
    category = insights.get("crime_category", "Cybercrime Incident")
    actions = insights.get("recommended_actions", [])
    explainability = insights.get("explainability_summary", "Acoustic and keyword metrics combined.")
    disclaimer = insights.get("indicative_disclaimer", INDICATIVE_DISCLAIMER)

    timeline = triage_payload.get("timeline_segments", [])

    md_report = f"""# VECNA-Pulse Forensic Case Dossier & Triage Report
**Case Reference ID:** `{call_id}`  
**Incident Logged:** {time_str}  
**Classification:** `{urgency_level}` (Urgency Score: {urgency_score}/100)  
**Dominant Acoustic Emotion:** `{dominant_emotion.upper()}`  
**Caller Tag:** {caller_tag}  

---

## 1. Executive Summary & Crime Vector
- **Classified Vector:** {category}
- **Explainability Justification:** {explainability}
- **Detected Cyber Threat Keywords:** {", ".join([f"`{kw}`" for kw in keywords]) if keywords else "None"}

---

## 2. Acoustic SER Biomarkers & Forensic Telemetry
Extracted via DSP Acoustic Engine & ONNX Neural Biomarker Classifier:

| Biomarker | Metric | Clinical / Forensic Interpretation |
| :--- | :--- | :--- |
| **Fundamental Frequency (F0)** | `{pitch} Hz` | {"Acute pitch elevation" if pitch > 230 else "Baseline vocal frequency"} |
| **Vocal Jitter (Micro-Tremor)** | `{jitter}%` | {"High cycle-to-cycle tremor (vocal shaking)" if jitter > 3.0 else "Normal vocal stability"} |
| **Speech Cadence Rate** | `{sps} syl/sec` | {"Rapid pace / hyperventilation indicators" if sps > 5.5 else "Standard speech tempo"} |
| **Acoustic Loudness (RMS)** | `{energy} dB` | Energy envelope intensity |
| **Voice Activity Ratio** | `{vad_ratio * 100:.1f}%` | Active voiced speech frames |
| **Extraction Confidence** | `{conf * 100:.1f}%` | Forensic acoustic signal-to-noise rating |

**Acoustic Diagnostic Tag:** `{anomaly}`

### Emotion Class Probability Distribution
- **Fear:** `{probs.get('fear', 0.0) * 100:.1f}%`
- **Distress:** `{probs.get('distress', 0.0) * 100:.1f}%`
- **Nervousness:** `{probs.get('nervousness', 0.0) * 100:.1f}%`
- **Anger:** `{probs.get('anger', 0.0) * 100:.1f}%`
- **Neutral:** `{probs.get('neutral', 0.0) * 100:.1f}%`

---

## 3. Temporal Emotion Timeline (2.5-Second Slices)
| Window Interval | Dominant Segment Emotion | Urgency Metric |
| :--- | :--- | :--- |
"""

    for seg in timeline:
        md_report += f"| {seg.get('start_sec')}s – {seg.get('end_sec')}s | `{seg.get('emotion')}` | {seg.get('urgency')}/100 |\n"

    md_report += f"""
---

## 4. Redacted Transcript & PII Masking Audit
*(Automatically masked by Regex Security Filter. PII Tokens Masked: {pii_count})*

> "{redacted_text}"

---

## 5. Investigator Recommended Action Checklist
"""
    for act in actions:
        md_report += f"- [ ] {act}\n"

    if copilot_data and "ncrp_1930_ticket_draft" in copilot_data:
        ticket = copilot_data["ncrp_1930_ticket_draft"]
        md_report += f"""
---

## 6. NCRP 1930 Emergency Freeze Ticket Draft (Wispr Voice Co-Pilot)
- **Ticket ID:** `{ticket.get('ticket_id')}`
- **Amount Involved:** `{ticket.get('amount_involved')}`
- **Payment Channel:** `{ticket.get('payment_channel')}`
- **Freeze Priority:** `{ticket.get('priority')}`
- **Golden Hour Hold Window:** `{ticket.get('golden_hour_window_remaining', 'Active')}`
- **Officer Voice Directive:** *"{ticket.get('officer_dispatch_directive', 'N/A')}"*
"""

    if officer_notes:
        md_report += f"""
---

## 7. Officer Incident Dispatch Notes
> {officer_notes}
"""

    md_report += f"""
---

## 8. Responsible AI Mandate & Evidentiary Disclaimer
> **LEGAL NOTICE & STATUTORY GUARDRAIL:**  
> **{disclaimer}**  
> All acoustic speech biomarkers, vocal jitter measurements, and emotion affinity scores are designed strictly for investigative triage prioritization. They do not constitute judicial proof of honesty, deception, criminal intent, or guilt under the Indian Evidence Act / BNSS.

---
*Report auto-generated by VECNA-Pulse SER Cybercrime Triage System v1.0 on {time_str}*
"""

    json_packet = {
        "report_id": f"REP-{call_id}",
        "generated_at_utc": time_str,
        "triage_payload": triage_payload,
        "officer_notes": officer_notes,
        "copilot_data": copilot_data,
        "disclaimer": disclaimer,
    }

    return {
        "filename_base": f"VECNA-CASE-REPORT-{call_id}",
        "markdown_report": md_report.strip(),
        "json_packet": json_packet,
    }
