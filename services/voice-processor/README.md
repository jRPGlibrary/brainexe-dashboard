# Voice Processor Service

**Transforme ta voix en actions intelligentes** 🎤→🏠

Service backend pour traiter les commandes vocales et les convertir en actions (Home Assistant, Brainexe, Discord).

## 🎤 Flux Complet

```
┌─────────────────────────────────────────────────────────┐
│ 1. SPEECH-TO-TEXT                                       │
│    Micro Audio → Whisper/Google Speech API → Texte      │
│    "Brainee éteind chambre parentale"                    │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 2. NATURAL LANGUAGE UNDERSTANDING (NLM)                 │
│    Texte → Claude LLM → Commande structurée             │
│    {                                                     │
│      action: "turn_off",                                │
│      target: "light.chambre_parentale",                 │
│      confidence: 0.95                                   │
│    }                                                     │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 3. INTELLIGENT ROUTING                                  │
│    Commande → Service approprié (HA/Brainexe/Discord)  │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 4. EXECUTION                                            │
│    Service exécute l'action                             │
│    Home Assistant → Lumière éteinte ✓                   │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Installation

```bash
cd services/voice-processor
npm install
```

## ⚙️ Configuration

1. Copier `.env.example` en `.env`
2. Configurer les variables :

```env
# Home Assistant
HOME_ASSISTANT_URL=http://192.168.1.100:8123
HOME_ASSISTANT_TOKEN=eyJhbGciOi...

# Speech-to-Text (Whisper recommandé)
OPENAI_API_KEY=sk-...

# LLM (Claude recommandé)
ANTHROPIC_API_KEY=sk-ant-...
```

## 🎯 Démarrage

```bash
npm start          # Production
npm run dev        # Développement
```

Service démarre sur **port 3002** par défaut.

## 📡 API Endpoints

### 🎤 Traiter l'audio
```
POST /api/voice/process

Body (form-data):
- audio: [fichier WAV/MP3]
- language: "fr" (optionnel)
- debug: true (optionnel, affiche les étapes)

Response:
{
  success: true,
  transcribed: "Brainee éteind chambre parentale",
  parsed: {
    action: "turn_off",
    target: "light.chambre_parentale",
    confidence: 0.95,
    explanation: "Commande pour éteindre une lumière"
  },
  feedback: "Chambre parentale a été éteint."
}
```

### 📝 Parser du texte (sans STT)
```
POST /api/voice/parse-text

Body:
{
  "text": "Brainee éteind chambre parentale",
  "language": "fr"
}

Response:
{
  success: true,
  parsed: { /* commande structurée */ },
  routed: { /* endpoint à appeler */ }
}
```

### 📋 Récupérer les appareils
```
GET /api/devices

Response:
{
  success: true,
  count: 8,
  data: [
    {
      entityId: "light.salon",
      friendlyName: "Lumière Salon",
      state: "on",
      domain: "light"
    },
    ...
  ]
}
```

### ⚡ Exécuter une commande (test)
```
POST /api/command/execute

Body:
{
  "action": "turn_off",
  "target": "light.chambre_parentale",
  "service": "home_assistant"
}
```

### ✅ Health Check
```
GET /health

Response:
{
  status: "ok",
  service: "voice-processor",
  dependencies: {
    homeAssistant: true,
    openai: true,
    anthropic: true
  }
}
```

## 🧠 Compréhension Vocale (NLM)

Le service utilise **Claude (Anthropic)** pour interpréter les commandes en français.

### Exemples de commandes comprises

```
"Brainee éteind la chambre"
→ turn_off light.chambre

"Augmente la luminosité du salon à 80%"
→ set_brightness light.salon 200

"Ouvre les volets du salon"
→ turn_on cover.volets_salon

"Dis à Brainee de descendre la température"
→ set_temperature climate.thermostat 19
```

## 🔗 Intégration au Dashboard

Le dashboard React appelle ce service :

```javascript
// Envoyer l'audio
const processVoiceCommand = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', 'fr');

  const response = await fetch('http://localhost:3002/api/voice/process', {
    method: 'POST',
    body: formData
  });

  return response.json();
};
```

## 🔮 Roadmap

- [x] Speech-to-Text (Whisper)
- [x] NLU avec Claude
- [x] Routage intelligent
- [x] Home Assistant execution
- [ ] Streaming audio en temps réel
- [ ] Localisation d'appareils (par pièce)
- [ ] Scénarios multi-commandes
- [ ] Support Brainexe commands
- [ ] Support Discord commands
- [ ] Cache des intentions
- [ ] Apprentissage des préférences utilisateur

## 🛠️ Architecture Modules

```
services/voice-processor/
├── src/
│   ├── app.js                 ← Express server
│   ├── speechService.js       ← STT (Whisper/Google)
│   ├── nlmService.js         ← NLU (Claude)
│   ├── voiceOrchestrator.js  ← Orchestration
│   └── integrations.js       ← (Future) Brainexe/Discord
├── tests/
├── package.json
├── .env.example
└── README.md
```

## 📊 Fréquences Supportées

- WAV: 16kHz, 48kHz
- MP3: Tous
- OGG: Tous
- Language: `fr`, `en`, etc.

## 🚨 Troubleshooting

### "HOME_ASSISTANT_TOKEN not set"
→ Vérifier le fichier `.env`, créer un token long terme dans HA

### "Failed to transcribe"
→ Vérifier `OPENAI_API_KEY`, vérifier l'audio (format WAV/MP3)

### "NLM parsing failed"
→ Vérifier `ANTHROPIC_API_KEY`, les appareils doivent être dans Home Assistant

## 📚 Resources

- [Home Assistant API](https://developers.home-assistant.io/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Claude API](https://console.anthropic.com/)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-python)
