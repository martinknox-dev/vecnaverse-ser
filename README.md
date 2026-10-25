# VECNA-Pulse

> **Real-Time Speech Emotion Recognition (SER) & Cybercrime Call Triage Workstation**  
> Built for the VECNAVERSE Hackathon by **VoidRiders**.

---

## ⚡ What is VECNA-Pulse?

VECNA-Pulse is an investigative workstation designed to assist 1930 / cybercrime call center operators in prioritizing emergency cyber fraud calls in real time. It analyzes vocal biomarkers (fundamental frequency F0, micro-tremor jitter, speech cadence, and loudness) to calculate distress urgency scores and assist officers in issuing golden-hour account freeze directives.

---

## 🚀 Live Demo Guide

To test the system during your review:

1. **Enable Demo Mode**:  
   Click the **Demo Mode** toggle in the top bar (`Demo Mode ON`).  
   *Because public, unredacted cybercrime audio datasets are legally restricted under privacy laws, Demo Mode provides pre-recorded, realistic scenarios demonstrating active extortion calls.*
2. **Select a Scenario**:
   - **Digital Arrest Extortion** (Critical urgency, severe vocal pitch tremor)
   - **Active UPI Fraud & Remote APK Drain** (High urgency, rapid cadence)
   - **Sextortion & Cyber Blackmail** (Critical distress indicators)
   - **Mule Account Informant Tip** (Moderate vocal tension)
3. **Play Synchronized Audio**:  
   Click the **Play** button in the center panel to hear the caller's spoken transcript with real-time synchronized timeline cursor and biomarker tracking.
4. **Wispr Voice Co-Pilot & 1930 Freeze Ticket**:  
   In the right panel, dictate or type dispatch notes (e.g. *"Caller confirmed transfer of 45,000 via PhonePe, issue freeze"*) and click **Apply note** (or press `Ctrl + Enter`) to auto-generate an emergency **1930 NCRP Freeze Ticket Draft**.
5. **Export Case Dossier**:  
   Click **Export** to download the complete case record in Markdown (`.md`) and JSON telemetry formats.

---

## 💡 Ultra-Lightweight & Hardware-Adaptive

Unlike traditional voice AI pipelines that require high-power server GPUs (like A100/H100 clusters):
- **Minimal CPU Footprint, No GPU Required**: VECNA-Pulse runs directly on standard consumer hardware using pure client-side Web Audio API DSP and quantized on-device models.
- **Runs 100% On-Device**: Can be deployed to static hosting (Vercel, Netlify) with **0 MB model download** overhead in lightweight mode.
- **Zero-Cost BYOK**: Supports free API keys for **SiliconFlow** (`SenseVoiceSmall` + `Qwen 2.5`), **Groq**, and **OpenRouter**, or runs completely offline.

---

## ⚠️ Early Version Notice (Hackathon Prototype)

- **Experimental Features**: This is an active early prototype. Some advanced features—such as multi-speaker diarization in noisy environments or complex dialect translation—may not behave as expected under all conditions and will be refined in subsequent releases.
- **Statutory Guardrail**: Automated vocal emotion metrics are **indicative triage signals only** to assist queue prioritization. They do not constitute judicial evidence of guilt, innocence, or intent.

---

## 💻 Local Development

### Backend (FastAPI + ONNX)
```bash
cd backend
uv run uvicorn app.main:app --port 8000 --reload
```

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```

### Static Hosting (Vercel)
Set root directory to `frontend` and deploy. No environment variables required.
