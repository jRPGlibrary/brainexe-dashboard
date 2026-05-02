# 🏗️ Architecture Complète - Brainee Smart Home Dashboard

## 🎯 Vision Globale

Dashboard intelligent unifié qui fusionne :
- 🏠 **Home Assistant** - Contrôle maison intelligente
- 🎤 **Voice Processing** - Commandes vocales naturelles
- 🧠 **Brainexe** - Intelligence artificielle (existant)
- 💬 **Discord** - Intégration messaging (existant)

```
┌─────────────────────────────────────────────────────────────────┐
│                   BRAINEE SMART HOME DASHBOARD                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐      ┌──────────────────┐                  │
│  │  VOICE CONTROL  │      │  DEVICE MANAGEMENT                  │
│  │  🎤 Micro       │      │  💡 Lights / 🔌 Switches           │
│  │  Speech → Text  │      │  🌡️ Thermostat / 🪟 Covers        │
│  │  ↓              │      │  🔐 Locks / 🌬️ Fans               │
│  │  NLU (Claude)   │      │  Real-time Status                  │
│  │  ↓              │      │  Control Sliders                   │
│  │  Action Exec    │      │  Auto-refresh                      │
│  └────────┬────────┘      └──────────────────┘                  │
│           │                                                       │
│           └──────────────┬──────────────────┘                    │
│                          │                                        │
├──────────────────────────┴──────────────────────────────────────┤
│                      FRONTEND (React)                            │
│  • HomeAssistantDashboard (Main Container)                      │
│  • VoiceControl + DeviceList Components                         │
│  • useVoice Hook (Audio Capture & Processing)                   │
└────────────┬──────────────────────────────┬──────────────────────┘
             │                              │
   ┌─────────▼─────────┐          ┌────────▼─────────┐
   │  VOICE PROCESSOR  │          │  HOME ASSISTANT  │
   │  Service (3002)   │          │  Service (3001)  │
   │                   │          │                  │
   │ • Speech-to-Text  │          │ • Device API     │
   │   (Whisper)       │          │ • Toggle/Control │
   │                   │          │ • State Mgmt     │
   │ • NLU             │          │ • Brightness     │
   │   (Claude LLM)    │          │ • Color          │
   │                   │          │                  │
   │ • Orchestrator    │          │ Talks to HA:     │
   │   (Route cmds)    │          │ http://localhost │
   │                   │          │ :8123            │
   └──────────┬────────┘          └─────────────────┘
              │
    ┌─────────▼──────────┐
    │  HOME ASSISTANT    │
    │ (User's Instance)  │
    │  :8123             │
    │                    │
    │ • Lights           │
    │ • Switches         │
    │ • Climate          │
    │ • Covers           │
    │ • Locks            │
    │ • Real Hardware!   │
    └────────────────────┘
```

---

## 📁 Structure Fichiers

```
brainexe-dashboard/
│
├── 🎨 Frontend (React)
├── src/
│   ├── components/
│   │   └── HomeAssistant/           ← NEW: Home Assistant UI
│   │       ├── HomeAssistantDashboard.jsx   (Main container)
│   │       ├── VoiceControl.jsx             (Mic + processing)
│   │       ├── DeviceList.jsx               (Device listing)
│   │       ├── DeviceCard.jsx               (Individual device)
│   │       ├── *.css                        (Styling)
│   │       └── index.js
│   ├── hooks/
│   │   └── useVoice.js              ← NEW: Voice hook
│   ├── services/
│   │   └── homeAssistant/           ← NEW: API calls
│   │       └── deviceService.js
│   └── App.jsx
│
├── 🛠️ Backend Services
├── services/
│   ├── voice-processor/             ← NEW: Voice service
│   │   ├── src/
│   │   │   ├── app.js               (Express server)
│   │   │   ├── speechService.js     (STT: Whisper/Google)
│   │   │   ├── nlmService.js        (NLU: Claude LLM)
│   │   │   ├── voiceOrchestrator.js (Orchestration)
│   │   │   └── integrations.js      (Future)
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── README.md
│   │
│   └── config/
│       └── services.config.js       ← NEW: Central config
│
├── home-assistant/                  ← EXISTING: HA API
│   ├── src/
│   │   ├── app.js
│   │   └── homeAssistant.js
│   ├── package.json
│   └── README.md
│
├── 📚 Documentation
├── ARCHITECTURE.md                  ← NEW: This file
├── README.md                        (Updated)
└── BIBLE_BRAINEXE.md               (Existing)
```

---

## 🔄 Flux Complets

### 1️⃣ Voice Command Flow

```
┌──────────────────────────────────────────────────────────────┐
│ USER SPEAKS: "Brainee éteind la chambre"                     │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND: useVoice Hook                                      │
│ • Captures audio via Web Audio API                           │
│ • Creates AudioBlob (WAV)                                    │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Voice Processor Service (port 3002)                          │
│ POST /api/voice/process                                      │
│                                                              │
│ STEP 1: Speech-to-Text                                       │
│   audioBlob → Whisper API → "Brainee éteind la chambre"     │
│                                                              │
│ STEP 2: Natural Language Understanding                       │
│   Text → Claude LLM →                                        │
│   {                                                          │
│     "action": "turn_off",                                    │
│     "target": "light.chambre",                               │
│     "confidence": 0.95                                       │
│   }                                                          │
│                                                              │
│ STEP 3: Intelligent Routing                                  │
│   Command → Which service? HOME_ASSISTANT                    │
│                                                              │
│ STEP 4: Execution                                            │
│   Calls Home Assistant API                                   │
│                                                              │
│ STEP 5: Feedback Generation                                  │
│   "Chambre a été éteinte."                                   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Home Assistant Service (port 3001)                           │
│ POST /api/devices/light.chambre/toggle                       │
│                                                              │
│ Authenticates with actual Home Assistant instance            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Actual Home Assistant (:8123)                                │
│ Sends command to physical device                             │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ PHYSICAL DEVICE                                              │
│ 💡 Light turns OFF                                           │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND: Receives Response                                  │
│ Displays feedback + updates device state                     │
│ ✅ "Chambre a été éteinte"                                   │
└──────────────────────────────────────────────────────────────┘
```

### 2️⃣ Device Management Flow

```
USER CLICKS DEVICE BUTTON
          ↓
FRONTEND: DeviceCard.jsx
  - Calls handleToggle()
          ↓
Home Assistant Service (3001)
  - POST /api/devices/:entityId/toggle
          ↓
Actual Home Assistant (:8123)
  - Executes device command
          ↓
PHYSICAL DEVICE Changes State
          ↓
Home Assistant updates state
          ↓
Service returns updated state
          ↓
FRONTEND: Refreshes device status
  - Shows live feedback
```

---

## 🔌 Services & Ports

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| **Frontend** | 3000 | React Dashboard | http://localhost:3000 |
| **Home Assistant API** | 3001 | Device Control | http://localhost:3001 |
| **Voice Processor** | 3002 | Speech + NLU | http://localhost:3002 |
| **Actual Home Assistant** | 8123 | Real Hardware | http://localhost:8123 |

---

## 🔐 API Endpoints

### Voice Processor (Port 3002)

```javascript
// Process voice command (audio → action)
POST /api/voice/process
Headers: Content-Type: multipart/form-data
Body:
  - audio: AudioFile (WAV/MP3)
  - language: "fr" (optionnel)
Response:
  {
    success: true,
    transcribed: "...",
    parsed: { action, target, confidence },
    executed: { service, status },
    feedback: "..."
  }

// Parse text only (skip STT)
POST /api/voice/parse-text
Body: { text, language }

// Get available devices
GET /api/devices
Response: { count, data: [...] }

// Health check
GET /health
```

### Home Assistant Service (Port 3001)

```javascript
// Get all devices
GET /api/devices
Response: [{ entityId, friendlyName, state, domain }]

// Get device state
GET /api/devices/:entityId

// Toggle device
POST /api/devices/:entityId/toggle

// Set brightness
POST /api/devices/:entityId/brightness
Body: { brightness: 0-255 }

// Set color
POST /api/devices/:entityId/color
Body: { rgb: [R,G,B] }

// Health check
GET /health
```

---

## ⚙️ Configuration

### Voice Processor (.env)

```env
# Server
VOICE_PORT=3002

# Home Assistant Connection
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=eyJhbGc...

# Speech-to-Text (Whisper)
OPENAI_API_KEY=sk-...
SPEECH_PROVIDER=whisper

# LLM (Claude)
ANTHROPIC_API_KEY=sk-ant-...
```

### Home Assistant Service (.env)

```env
# Home Assistant
HOME_ASSISTANT_URL=http://localhost:8123
HOME_ASSISTANT_TOKEN=eyJhbGc...
PORT=3001
```

### Frontend (.env.local)

```env
REACT_APP_VOICE_PROCESSOR_URL=http://localhost:3002
REACT_APP_HOME_ASSISTANT_URL=http://localhost:3001
```

---

## 🔄 Data Flow Example

**User Command:** "Brainee augmente la luminosité du salon"

```
1. Audio Capture
   └─ MediaRecorder captures 2-3 seconds of voice

2. Speech-to-Text
   Whisper API: audio → "Brainee augmente la luminosité du salon"

3. NLU Parsing
   Claude LLM analyzes:
   ├─ Intent: "set_brightness"
   ├─ Entity: "light.salon"
   ├─ Value: "high/80%" (extracted from context)
   └─ Confidence: 0.94

4. Routing
   Service = "home_assistant"
   Action = "set_brightness"
   Target = "light.salon"

5. Execution
   POST /api/devices/light.salon/brightness
   Body: { brightness: 200 }

6. Home Assistant API Call
   → Finds light entity in Home Assistant
   → Calls service: light.turn_on with brightness=200
   → Returns success

7. Frontend Update
   ├─ Updates device card brightness slider
   ├─ Changes state indicator
   └─ Displays: "✅ Salon luminosité augmentée"

8. Real Device
   └─ 💡 Light physically changes brightness
```

---

## 🚀 Déploiement

### Development

```bash
# Terminal 1: Home Assistant Service
cd home-assistant
npm install
npm run dev

# Terminal 2: Voice Processor Service
cd services/voice-processor
npm install
npm run dev

# Terminal 3: Frontend
npm install
npm run start
```

### Production (Railway)

```
1. Home Assistant Service
   - PORT: 3001
   - Environment: Production

2. Voice Processor Service
   - PORT: 3002
   - Environment: Production

3. Frontend
   - PORT: 3000
   - Build: npm run build
```

---

## 📊 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + Hooks | UI Components |
| **State** | useState/Context | Local state |
| **Styling** | CSS3 | Modern design |
| **Backend** | Express.js | REST APIs |
| **Speech** | Whisper API | Speech-to-Text |
| **NLU** | Claude LLM | Language Understanding |
| **Smart Home** | Home Assistant | Device Control |
| **Database** | - | None (stateless APIs) |

---

## 🔮 Future Enhancements (Roadmap)

### v0.2
- [ ] Streaming voice recognition (real-time)
- [ ] Device grouping by rooms
- [ ] Scene support (multiple devices)
- [ ] User voice profiles

### v0.3
- [ ] Brainexe command integration
- [ ] Discord command routing
- [ ] History/audit logs
- [ ] Usage statistics

### v0.4
- [ ] Voice wake word detection
- [ ] Custom voice triggers
- [ ] Machine learning for preferences
- [ ] Multi-user support

### v0.5
- [ ] Mobile app (React Native)
- [ ] Cloud sync
- [ ] Advanced automations
- [ ] Widget integration

---

## 🛡️ Security

### Authentication
- Home Assistant token (long-lived)
- API key rotation every 90 days
- Environment variables (never in code)

### Privacy
- Voice data processed locally when possible
- Transcriptions encrypted in transit
- No voice recordings stored

### Validation
- Input sanitization on all endpoints
- Rate limiting on services
- CORS configured per service

---

## 📝 Notes Importantes

1. **Home Assistant Instance Required**
   - User must have Home Assistant running and configured
   - Devices must be added to Home Assistant first

2. **Token Management**
   - Create long-lived token in HA (Profile → Create Token)
   - Never commit tokens to git
   - Use environment variables

3. **Service Dependencies**
   - Voice Processor needs: OpenAI API + Anthropic API keys
   - All services must be running for full functionality
   - Frontend only works with both backend services

4. **Performance**
   - Voice processing: 2-5 seconds (network dependent)
   - Device updates: Real-time via HTTP
   - Recommendation: 3-second refresh interval

---

## 🎓 Learning Resources

- [Home Assistant API Docs](https://developers.home-assistant.io/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Claude API Guide](https://console.anthropic.com/)
- [Express.js Documentation](https://expressjs.com/)
- [React Hooks](https://react.dev/reference/react/hooks)

---

**Last Updated:** 2025-05-02
**Version:** 1.0 Complete Architecture
