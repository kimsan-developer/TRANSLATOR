# VIDEO TRANSLATOR AI PRO (Enterprise SaaS)

**VIDEO TRANSLATOR AI PRO** is an enterprise-grade, full-stack audiovisual dubbing and video translation web application. It empowers users to upload videos, transcribe multi-speaker audio with timestamps, translate subtitles with context awareness, generate multilingual neural AI voices, synchronize dubbing timelines with audio ducking, and render production-ready videos with hardcoded subtitles.

---

## 1. System Architecture & Features

```
┌────────────────────────────────────────────────────────────────────────┐
│                   VIDEO TRANSLATOR AI PRO FRONTEND                    │
│      React 18 + Vite + TypeScript + Tailwind CSS (Dark Blue SaaS)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ REST API + Socket.IO (Real-Time)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       EXPRESS NODE.JS BACKEND                          │
│     JWT Auth • Background Queue • AES-256 Crypto • Multer Storage     │
├───────────────┬───────────────────┬───────────────────┬────────────────┤
│ Media Engine  │ Speech Transcribe │   AI Translation  │   Voice Engine │
│ FFmpeg/Probe  │ Faster-Whisper    │ Gemini 1.5 Flash  │ Edge-TTS       │
│ Audio Ducking │ OpenAI Whisper    │ OpenAI GPT-4o     │ OpenAI TTS     │
│ Video Burn-in │ Python Fast Engine│ Local Adapter     │ ElevenLabs     │
└───────┬───────┴─────────┬─────────┴─────────┬─────────┴────────┬───────┘
        │                 │                   │                  │
┌───────▼─────────────────▼───────────────────▼──────────────────▼───────┐
│                          MONGODB DATABASE                              │
│   Users • Projects • Videos • Audios • Subtitles • AIProviders • Jobs  │
│   (Automatic Zero-Setup Embedded Fallback included for instant runs)   │
└────────────────────────────────────────────────────────────────────────┘
```

### Complete Feature List
1. **Dashboard**: Metrics for projects, videos processed, translation statistics, audio generations, storage usage, and active background job monitors.
2. **My Projects**: Project grid/table with thumbnail previews, duration indicators, search & filter, and project management.
3. **Video Translator Studio**: Step-by-step wizard covering upload, speech-to-text, subtitle translation, neural dubbing, and video rendering.
4. **Speech to Text**: Faster-Whisper offline transcription and OpenAI Whisper with automatic language detection, Khmer recognition, timestamp segmentation, and SRT/VTT/TXT export.
5. **AI Translation**: Google Gemini 1.5 Flash, OpenAI GPT-4o-mini, and Local adapters with formal/casual styles and timing preservation.
6. **Subtitle Editor**: Interactive editor supporting split, merge, timestamp adjustments, add/delete, and bulk search & replace.
7. **AI Voice Generator**: Real multilingual neural voice synthesis powered by Edge-TTS (zero-key required), OpenAI, and ElevenLabs with pitch and rate controls.
8. **Voice Cloning**: Consent-verified voice sample cloning with authorization enforcement.
9. **Audio Synchronization & Mixer**: Video timeline, audio waveforms, original volume ducking (5-15%), and background audio mixing.
10. **Video Preview**: Live synchronized subtitle overlays and dual audio track playback.
11. **Video Export**: FFmpeg encoding to MP4, MKV, or MOV with selectable resolution presets (720p, 1080p, 4K, original).
12. **AI Provider Manager**: Centralized interface to configure, enable/disable, and live test AI providers.
13. **API Settings**: AES-256 rest encryption for API keys with strict zero-leak client masking.
14. **Usage History**: Analytics on processing duration, character counts, and cost estimates.
15. **User Profile**: User details, credentials, and language preferences.
16. **Admin Panel**: Role management (Superadmin, Admin, User), background jobs monitor, storage disk statistics, and system settings.

---

## 2. Supported Languages

| Language | Code | Faster-Whisper STT | Edge-TTS Neural Voices | AI Translation |
|---|---|---|---|---|
| **Khmer** | `km` | ✅ Supported | `km-KH-PisethNeural` (M), `km-KH-SreymomNeural` (F) | ✅ Full |
| **English** | `en` | ✅ Supported | `en-US-ChristopherNeural` (M), `en-US-JennyNeural` (F) | ✅ Full |
| **Thai** | `th` | ✅ Supported | `th-TH-NiwatNeural` (M), `th-TH-PremwadeeNeural` (F) | ✅ Full |
| **Vietnamese** | `vi` | ✅ Supported | `vi-VN-NamMinhNeural` (M), `vi-VN-HoaiMyNeural` (F) | ✅ Full |
| **Chinese (Mandarin)**| `zh` | ✅ Supported | `zh-CN-YunxiNeural` (M), `zh-CN-XiaoxiaoNeural` (F) | ✅ Full |
| **Japanese** | `ja` | ✅ Supported | `ja-JP-KeitaNeural` (M), `ja-JP-NanamiNeural` (F) | ✅ Full |
| **French** | `fr` | ✅ Supported | `fr-FR-HenriNeural` (M), `fr-FR-DeniseNeural` (F) | ✅ Full |
| **Spanish** | `es` | ✅ Supported | `es-ES-AlvaroNeural` (M), `es-ES-ElviraNeural` (F) | ✅ Full |
| **German** | `de` | ✅ Supported | `de-DE-ConradNeural` (M), `de-DE-KatjaNeural` (F) | ✅ Full |
| **Korean** | `ko` | ✅ Supported | `ko-KR-InJoonNeural` (M), `ko-KR-SunHiNeural` (F) | ✅ Full |

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router 6, Zustand, TanStack React Query, Socket.IO Client.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.IO, Multer, Fluent-FFmpeg, JSONWebToken, BCrypt, Axios.
- **Database**: MongoDB (Supports standalone `mongodb://` as well as automatic embedded `mongodb-memory-server` fallback).
- **Processing**: FFmpeg & FFprobe, Faster-Whisper, Edge-TTS, OpenAI API, Google Gemini API, ElevenLabs API.

---

## 4. Quick Start & Local Execution

### Prerequisites
- Node.js >= 18
- Python >= 3.10
- FFmpeg installed and accessible in PATH

### 1. Backend Setup
```bash
cd backend
npm install
npm run build
npm start
```
*Note: If local MongoDB is not running, the backend automatically starts an embedded in-memory MongoDB server for zero-setup execution.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Default Admin Credentials
- **Email**: `admin@videotranslator.ai`
- **Password**: `Admin@123456`

---

## 5. Automated Test Suite

Run the end-to-end unit, crypto, parser, and media processing tests:
```bash
node --test tests/crypto.test.mjs tests/srtParser.test.mjs tests/ffmpeg.test.mjs tests/edgeTts.test.mjs
```

---

## 6. Docker Deployment

Deploy the entire microservice stack using Docker Compose:
```bash
docker-compose up --build -d
```
Access the application at `http://localhost:5173`.
