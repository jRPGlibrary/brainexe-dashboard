# 🧠 BrainEXE Dashboard `v2.0.9`

> **Brainee** — Bot Discord pour le serveur BrainEXE. Gaming, neurodivergence, communauté.

---

## 📦 Stack

| Outil | Rôle |
|---|---|
| Node.js + Discord.js v14 | Bot Discord |
| Express + WebSocket | Dashboard temps réel |
| Anthropic API (Claude) | Génération contenu IA |
| YouTube Data API v3 | Recherche vidéos sur @mention |
| GNews API | Actualités gaming réelles |
| MongoDB Atlas | Persistance (profils, mémoire, bonds, états) |
| node-cron | Planification |
| Railway | Hébergement |

---

## ⚙️ Variables d'environnement

| Variable | Requis |
|---|---|
| `DISCORD_TOKEN` | ✅ |
| `GUILD_ID` | ✅ |
| `ANTHROPIC_API_KEY` | ✅ |
| `YOUTUBE_API_KEY` | ✅ |
| `GNEWS_API_KEY` | ✅ |
| `TIKTOK_USERNAME` | ✅ |
| `MONGODB_URI` | ✅ |
| `PORT` | Auto Railway |

---

## 🗂️ Structure

```
src/
├── ai/           claude.js (timeout + retry), youtube.js
├── api/          routes.js
├── bot/          emotions.js, humanize.js, mood.js, persona.js,
│                 messaging.js, scheduling.js, adaptiveSchedule.js, ...
├── db/           members.js, memberBonds.js, channelMem.js, dmHistory.js, ...
├── discord/      events.js, sync.js
└── features/     conversations.js, greetings.js, actus.js, drift.js, ...
```

---

## 🤖 Fonctionnalités clés

### ★ Âme de Brainee `v2.0.9`

Système émotionnel à 4 couches :

| Couche | Rôle |
|---|---|
| **Tempérament** | Quasi-stable : humour 85, loyauté 95, curiosité 80... |
| **États internes** | energy, socialNeed, mentalLoad — évoluent avec le slot horaire |
| **Émotions vives** | Stack 12 max, decay horaire (curiosity, warmth, annoyance...) |
| **Liens membres** | baseAttachment, baseTrust, trajectory 14j, keyMoments |

**Humanisation contextuelle** (`humanize.js`) :
- `relax_filter` : "je ne sais pas" → "j'sais pas", "t'inquiète" → "tkt"
- `accent_drop` : fautes légères sur longs textes selon énergie
- `slang_injection` : "franchement", "nan mais", "du coup" selon lien membre

**Crons émotionnels** :
- Toutes les heures : decay émotions + update états internes
- 00h05 : évolution journalière bonds + drift

---

### Planning adaptatif `v2.0.7`

**Vibe quotidienne** (8 vibes) : chatty, introvert, impulsive, lazy, focus, excited, grumpy, balanced.
Chaque vibe module chattiness, impulse, skip rates, tag penalty.

**Horaires flottants** : morning ±25 min, lunch ±25 min, goodnight ±45 min, nightWakeup ±60 min.

**Agency** : Brainee peut refuser (@mention skip), reporter au lendemain (relance 10-12h), ou poster en impulsion.

---

### GNews API `v2.0.8`

Actualités gaming réelles (40j retour), filtrage FR/EN, déduplication MongoDB, fallback Claude pur.

---

### Autres

- **Discipline salon** : 16 catégories, description officielle = loi absolue
- **DMs** : historique persistant 30 messages, ton intime
- **@mention** : urgence détectée, délai simulé, contexte 100 msgs, YouTube intégré
- **Threads auto** : uniquement si engagement humain + salon gaming autorisé
- **Dérive thématique** : score 1-10, 4 niveaux de réaction

---

## 🌐 API Routes

```
GET  /api/state                    État Discord complet
GET  /api/config                   Config bot
POST /api/config                   Sauvegarder config
GET  /api/slot                     Slot actif + humeur + vibe
GET  /api/emotions/state           État interne + émotions + tempérament
GET  /api/emotions/bonds           Liens membres (tri attachement)
GET  /api/emotions/bonds/:userId   Lien d'un membre
GET  /api/channel-memory           Mémoires salons
GET  /api/channel-directory        Annuaire salons
GET  /api/dm-history/:userId       Historique DM
POST /api/conversation             Forcer lance-conv
POST /api/morning                  Forcer morning
POST /api/anecdote                 Forcer anecdote
POST /api/actus                    Forcer actus
POST /api/drift/check              Check dérive
```

---

## 🔄 Changelog

### `v2.0.9` — Âme de Brainee
- `emotions.js` : tempérament + états internes + stack émotions + decay
- `memberBonds.js` : liens affectifs persistants par membre
- `humanize.js` : filtre humanisation contextuel (slang, fautes, relâchement)
- Crons émotionnels horaires + journaliers
- `adjustMaxTokens()` : tokens réduits si zombie/surchargée
- API routes `/api/emotions/...`

### `v2.0.8` — GNews API
- Actualités gaming réelles via GNews + déduplication MongoDB

### `v2.0.7` — Planning Adaptatif
- Vibes quotidiennes, horaires flottants, agency (@mention defer/skip), relances

### Antérieur
- v2.0.6 : discipline salon + threads engagement
- v2.0.5 : DMs + résolution mentions
- v2.0.4 : delayed reply après emoji
- v2.0.3 : channel memory + drift detection
- v2.0.0 : planning horaire semaine/WE
- v1.9.0 : MongoDB state migration

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
