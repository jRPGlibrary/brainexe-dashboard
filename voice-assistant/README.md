# NEX — Assistant Personnel Vocal

> Assistant de type Alexa avec personnalité authentique, système émotionnel 4 couches et mémoire relationnelle.  
> Inspiré de l'architecture **BrainEXE Dashboard** (Brainee le bot Discord).

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| **Personnalité** | 24 ans, gamer, tech, direct, pas corporate — style oral naturel |
| **Émotions** | 4 couches (tempérament, états internes, émotions vives, résiduels) |
| **Mémoire** | Historique de conversation + profil utilisateur persistant |
| **Lien** | Trust/warmth qui évolue avec les interactions, préférences détectées |
| **Mode texte** | Fonctionne immédiatement avec readline |
| **Mode vocal** | Wake word "Hey Nex" + STT (Whisper API ou CLI) + TTS (espeak-ng) |
| **Prompt caching** | Cache Anthropic sur le persona pour réduire les coûts |

---

## Installation

```bash
cd voice-assistant
npm install
cp .env.example .env
# Remplis ANTHROPIC_API_KEY dans .env
```

### Prérequis système (mode vocal uniquement)

```bash
# Linux
sudo apt install espeak-ng          # TTS voix
sudo apt install alsa-utils         # arecord (microphone)
pip install openai-whisper          # CLI whisper (optionnel)
```

---

## Utilisation

### Mode texte (par défaut)

```bash
npm start
# ou
node index.js --text
```

### Mode vocal

```bash
node index.js --voice
```

Le wake word est **"Nex"** ou **"Hey Nex"**.

---

## Commandes internes

| Commande | Action |
|---|---|
| `/aide` | Liste les commandes |
| `/nom Prénom` | Mémorise ton prénom |
| `/etat` | Affiche l'état interne de NEX (émotions, lien, stats) |
| `/mute` | Active/désactive la voix TTS |
| `/reset` | Efface la mémoire complète |
| `exit` | Quitte proprement |

---

## Configuration `.env`

```env
ANTHROPIC_API_KEY=sk-ant-...        # Obligatoire
OPENAI_API_KEY=                     # Optionnel — pour Whisper API
CLAUDE_MODEL=claude-sonnet-4-6      # Modèle Claude
NEX_MODE=text                       # Mode par défaut
VOICE_LANG=fr+m3                    # Langue espeak-ng
USER_NAME=                          # Prénom mémorisé
```

---

## Architecture

```
voice-assistant/
├── index.js              ← Boucle principale, modes texte/vocal
├── core/
│   ├── persona.js        ← Personnalité NEX + construction prompts
│   ├── emotions.js       ← Système 4 couches (tempérament → vives → résiduels)
│   ├── brain.js          ← Claude API avec prompt caching
│   ├── voice.js          ← TTS (espeak-ng / festival / say)
│   ├── ear.js            ← STT (Whisper API / CLI / arecord)
│   └── memory.js         ← Historique + lien utilisateur (trust/warmth/prefs)
└── .nex_memory.json      ← Persistance locale (auto-créé)
```

---

## Inspirations BrainEXE

- `emotions.js` → `src/bot/emotions.js` (système 4 couches)
- `memory.js` → `src/db/memberBonds.js` + `channelMemory.js`
- `persona.js` → `src/bot/persona.js` (BOT_PERSONA + cache prefix)
- `brain.js` → `src/ai/claude.js` (prompt caching, retry, health)
- `voice.js` → `src/bot/humanize.js` (paramètres dynamiques selon humeur)
