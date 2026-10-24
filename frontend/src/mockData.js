export const INDICATIVE_DISCLAIMER =
  "INDICATIVE TRIAGE SIGNAL ONLY: Vocal emotion and urgency metrics assist call prioritization and are NOT definitive evidence of caller intent, honesty, or guilt.";

export const FALLBACK_SCENARIOS = [
  {
    call_id: "CALL-2026-0891",
    timestamp_ms: 1761286800000,
    caller_tag: "Distressed Victim / Active Digital Arrest Extortion",
    urgency_score: 94,
    urgency_level: "CRITICAL",
    dominant_emotion: "fear",
    emotion_probabilities: {
      fear: 0.52,
      distress: 0.28,
      nervousness: 0.12,
      anger: 0.05,
      neutral: 0.03,
    },
    acoustic_biomarkers: {
      pitch_hz: 284.5,
      jitter_tremor_pct: 4.2,
      speech_rate_sps: 6.4,
      rms_energy_db: -10.8,
      vocal_anomaly: "High micro-tremor + acute vocal tension detected",
    },
    transcript: {
      raw_redacted:
        "Sir please help! Someone on video call said they are from CBI Mumbai and I am under digital arrest for a FedEx parcel containing narcotics! They made me transfer ₹1,50,000 from account ending [REDACTED-ACCT] and now demanding OTP [REDACTED-OTP] from my phone [REDACTED-PHONE] right now!",
      pii_masked_count: 3,
      detected_keywords: ["digital arrest", "cbi", "video call", "transfer", "otp"],
    },
    triage_insights: {
      crime_category: "Digital Arrest Extortion / Impersonation of Law Enforcement",
      recommended_actions: [
        "1. Instruct caller immediately to DISCONNECT the scammer's video call and NOT share any OTP.",
        "2. Reassure caller that Indian police, CBI, ED, and customs NEVER conduct arrests over video calls.",
        "3. Collect victim transaction UTR and initiate immediate 1930 NCRP financial freeze request.",
        "4. Confirm caller is in a safe location and log complaint on cybercrime.gov.in."
      ],
      explainability_summary:
        "Urgency 94/100 triggered by severe vocal pitch tremor (4.2% jitter), rapid speech rate (6.4 syl/sec), and acute Digital Arrest / OTP extortion keywords.",
      indicative_disclaimer: INDICATIVE_DISCLAIMER,
    },
    timeline_segments: [
      { start_sec: 0.0, end_sec: 2.5, emotion: "nervousness", urgency: 72 },
      { start_sec: 2.5, end_sec: 5.0, emotion: "fear", urgency: 91 },
      { start_sec: 5.0, end_sec: 7.5, emotion: "fear", urgency: 96 },
      { start_sec: 7.5, end_sec: 10.0, emotion: "distress", urgency: 94 },
    ],
  },
  {
    call_id: "CALL-2026-0893",
    timestamp_ms: 1761286920000,
    caller_tag: "Distressed Sextortion Victim / Acute Intimidation Crisis",
    urgency_score: 91,
    urgency_level: "CRITICAL",
    dominant_emotion: "distress",
    emotion_probabilities: {
      fear: 0.35,
      distress: 0.46,
      nervousness: 0.14,
      anger: 0.03,
      neutral: 0.02,
    },
    acoustic_biomarkers: {
      pitch_hz: 260.2,
      jitter_tremor_pct: 3.9,
      speech_rate_sps: 3.4,
      rms_energy_db: -18.2,
      vocal_anomaly: "Elevated pitch instability / vocal tremor detected",
    },
    transcript: {
      raw_redacted:
        "I received an unknown video call on WhatsApp. They recorded my webcam and created a morphed naked video. Now they are blackmailing me and threatening to leak video to my family if I don't pay ₹80,000 extortion money. I am terrified, I don't know what to do, I might kill myself...",
      pii_masked_count: 0,
      detected_keywords: ["video call", "webcam", "blackmail", "leak video", "extortion", "kill myself"],
    },
    triage_insights: {
      crime_category: "Sextortion / Cyber Blackmail & Intimidation",
      recommended_actions: [
        "1. Calm caller down, activate emotional crisis counseling protocol, and ensure caller safety immediately.",
        "2. Strictly instruct caller NOT to transfer any money to the extortionists.",
        "3. Guide caller to preserve all chat screenshots, suspect phone numbers, and profile links as evidence.",
        "4. Assist caller in submitting removal request via TakeItDown and registering NCRP complaint."
      ],
      explainability_summary:
        "Urgency 91/100 driven by extreme psychological distress acoustic markers and critical self-harm / cyber blackmail threats.",
      indicative_disclaimer: INDICATIVE_DISCLAIMER,
    },
    timeline_segments: [
      { start_sec: 0.0, end_sec: 2.5, emotion: "distress", urgency: 86 },
      { start_sec: 2.5, end_sec: 5.0, emotion: "distress", urgency: 94 },
      { start_sec: 5.0, end_sec: 7.5, emotion: "fear", urgency: 92 },
    ],
  },
  {
    call_id: "CALL-2026-0892",
    timestamp_ms: 1761286860000,
    caller_tag: "Active Financial Drain Victim / Remote APK Takeover",
    urgency_score: 83,
    urgency_level: "CRITICAL",
    dominant_emotion: "distress",
    emotion_probabilities: {
      fear: 0.22,
      distress: 0.44,
      nervousness: 0.24,
      anger: 0.07,
      neutral: 0.03,
    },
    acoustic_biomarkers: {
      pitch_hz: 232.0,
      jitter_tremor_pct: 3.4,
      speech_rate_sps: 5.8,
      rms_energy_db: -13.5,
      vocal_anomaly: "Rapid speech rate with breath shortness detected",
    },
    transcript: {
      raw_redacted:
        "I got an SMS saying electricity bill unpaid. Caller asked me to install AnyDesk QuickSupport APK. As soon as I installed it, ₹45,000 money deducted from my SBI account ending [REDACTED-ACCT] via UPI! Can you freeze the transaction right now?",
      pii_masked_count: 1,
      detected_keywords: ["anydesk", "quicksupport", "money deducted", "upi", "apk"],
    },
    triage_insights: {
      crime_category: "Remote Access Fraud / Device Takeover (AnyDesk/TeamViewer)",
      recommended_actions: [
        "1. Instruct victim to immediately put phone on Airplane Mode and disconnect Wi-Fi to stop remote screen session.",
        "2. Obtain beneficiary UPI handle and 12-digit transaction UTR to initiate golden-hour freeze on 1930 NCRP.",
        "3. Call bank helpline directly to freeze net banking and hotlist all cards linked to account.",
        "4. Uninstall AnyDesk/QuickSupport and wipe malicious APK downloads."
      ],
      explainability_summary:
        "Urgency 83/100 triggered by active financial drain keywords (AnyDesk, UPI, money deducted) and elevated vocal cadence.",
      indicative_disclaimer: INDICATIVE_DISCLAIMER,
    },
    timeline_segments: [
      { start_sec: 0.0, end_sec: 2.5, emotion: "nervousness", urgency: 74 },
      { start_sec: 2.5, end_sec: 5.0, emotion: "distress", urgency: 85 },
      { start_sec: 5.0, end_sec: 7.5, emotion: "distress", urgency: 88 },
    ],
  },
  {
    call_id: "CALL-2026-0894",
    timestamp_ms: 1761286980000,
    caller_tag: "Anonymous Cyber Informant / Mule Account Ring",
    urgency_score: 54,
    urgency_level: "MEDIUM",
    dominant_emotion: "nervousness",
    emotion_probabilities: {
      fear: 0.12,
      distress: 0.16,
      nervousness: 0.48,
      anger: 0.08,
      neutral: 0.16,
    },
    acoustic_biomarkers: {
      pitch_hz: 182.4,
      jitter_tremor_pct: 2.1,
      speech_rate_sps: 4.1,
      rms_energy_db: -22.1,
      vocal_anomaly: "Depressed pitch contour with hesitation pauses",
    },
    transcript: {
      raw_redacted:
        "I want to report anonymously. My roommate opened 4 bank accounts at local private branches and is renting them out as mule account handlers for telegram job task scams. The primary phone number he uses for coordinator calls is [REDACTED-PHONE].",
      pii_masked_count: 1,
      detected_keywords: ["mule account", "transfer"],
    },
    triage_insights: {
      crime_category: "Cybercrime Syndicate / Money Mule Account Ring",
      recommended_actions: [
        "1. Cross-reference suspect phone number and account references against the national NCRP mule registry.",
        "2. Protect informant identity and assign confidential intelligence log ID.",
        "3. Flag bank branch IFSC and account cluster to cyber cell financial intelligence unit."
      ],
      explainability_summary:
        "Urgency 54/100 indicates medium priority intel tip with moderate vocal hesitation and no ongoing active financial drain.",
      indicative_disclaimer: INDICATIVE_DISCLAIMER,
    },
    timeline_segments: [
      { start_sec: 0.0, end_sec: 2.5, emotion: "neutral", urgency: 45 },
      { start_sec: 2.5, end_sec: 5.0, emotion: "nervousness", urgency: 56 },
      { start_sec: 5.0, end_sec: 7.5, emotion: "nervousness", urgency: 58 },
    ],
  },
];
