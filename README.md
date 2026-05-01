<div align="center">

# 🧠 BrainEXE Dashboard

**Brainee** — un bot Discord IA qui *vit* sur ton serveur, et son cockpit web temps réel.

Pensé pour la communauté gaming neurodivergente du serveur **BrainEXE**.

[![Tests](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml/badge.svg)](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml)
![Version](https://img.shields.io/badge/version-2.5.1-7c5cbf?style=flat-square)
![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=node.js&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)
![Claude](https://img.shields.io/badge/Anthropic-Claude-D97757?style=flat-square)
![Tests](https://img.shields.io/badge/tests-133_passing-22c55e?style=flat-square)

</div>

---

## ✨ Le pitch

Brainee n'est **pas un bot à commandes**. Elle a un tempérament, une humeur du jour, des vibes qui flottent (chatty, lazy, focus, grumpy…), des liens affectifs avec chaque membre et une mémoire à long terme. Elle parle quand c'est pertinent, ignore quand elle est fatiguée, relance quand un salon meurt, et signale par un emoji quand elle répond avec délai.

À côté, un **dashboard web temps réel** te laisse voir et piloter tout ça : émotions, plannings, automatisations, sanctions, backups, soutien financier du projet.

> 📖 **Pour comprendre le projet en profondeur, lire [BIBLE_BRAINEXE.md](./BIBLE_BRAINEXE.md).**

---

## 🚀 Démarrage rapide

```bash
git clone https://github.com/jRPGlibrary/brainexe-dashboard.git
cd brainexe-dashboard
npm install
# créer .env (voir tableau ci-dessous)
npm start
# → Dashboard sur http://localhost:3000
```

### `.env`

| Variable | Requis | Rôle |
|---|:---:|---|
| `DISCORD_TOKEN` | ✅ | Token du bot Discord |
| `GUILD_ID` | ✅ | ID du serveur cible |
| `ANTHROPIC_API_KEY` | ✅ | Clé API Claude |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data v3 (recherche vidéos sur mention) |
| `GNEWS_API_KEY` | ✅ | GNews (actus gaming bi-mensuelles) |
| `MONGODB_URI` | ✅ | URI MongoDB Atlas |
| `PORT` | ⭕ | Port HTTP (défaut `3000`) |

---

## 🧩 Stack

| Couche | Outils |
|---|---|
| Bot | **Node.js 18+** · **discord.js v14** · node-cron · ws |
| IA | **Claude (Anthropic)** · YouTube Data v3 · GNews |
| Persistance | **MongoDB Atlas** |
| Web | Express 4 · WebSocket · vanilla JS modulaire (21 fichiers) |
| Sécurité | express-rate-limit (4 niveaux) · audit ring buffer 500 |
| Tests / CI | **Jest 30** (133 tests · 7 suites) · **GitHub Actions** |
| Hosting | Railway |

---

## 🎨 Le dashboard

**17 sections**, 3 thèmes (light / dark / sombre), responsive mobile avec tiroir de navigation.

| Live | Serveur | Bot | Système |
|---|---|---|---|
| 📊 Vue d'ensemble | 💬 Salons | ⚡ Automatisations | 💾 Backups |
| 🎛️ Admin live | 🎭 Rôles | 📝 Posts manuels | 📖 Historique |
| ❤️ Santé | 👥 Membres | 💗 Émotions | ⚙️ Paramètres |
| 📜 Logs | | 💞 Relations | 💰 Soutien |
| | | 🗓️ Planning | |
| | | 📊 Tokens | |

> Architecture frontend : `public/index.html` + `public/app.css` + `public/mobile.css` + **38 modules** dans `public/js/` — pas de bundler, scope global maîtrisé.

---

## 🏛️ Architecture

```
brainexe-dashboard/
├── server.js                       Entry point minimal (~150 lignes)
├── src/
│   ├── ai/         claude · youtube
│   ├── api/
│   │   ├── rateLimits.js           4 niveaux (claude/discord/backup/general)
│   │   └── routes/                 index · discord · bot · members
│   │                               admin · data · backups
│   ├── bot/        persona · emotions · emotionCombos · mood · scheduling
│   │                adaptiveSchedule · channelIntel · messaging · humanize
│   │                reactions · keywords · hyperFocus · vulnerability
│   ├── config/     channelManager · channels.json
│   ├── db/         index · members · memberBonds · memberStories · narrativeMemory
│   │                tasteProfile · topicFatigue · vipSystem · tokenUsage
│   │                channelMem · channelDir · dmHistory · botState · intelligentMemory
│   ├── discord/    events · sync
│   ├── features/   anecdotes · actus · conversations · decisionLogic · greetings
│   │                drift · tiktok · welcome · sidebar · supportChannel
│   │                proactiveOutreach · hyperFocusRevisit · extendedPermissions
│   │                context · convStats · delayedReply
│   ├── project/    funding                ← coûts, dons, statut Discord
│   ├── audit · botConfig · config · crons · logger · shared · utils
├── public/         index.html · app.css · mobile.css · js/ (21 modules)
├── tests/          7 suites Jest, 133 tests
├── .github/workflows/tests.yml     CI sur chaque push
└── discord-template.json
```

---

## 🔌 API HTTP

Toutes les routes sont sous `http://localhost:3000/api/*`, éclatées par thème dans `src/api/routes/` et **rate-limitées** :

| Limiteur | Quota | Routes |
|---|---|---|
| `claudeLimiter` | 5/min | `/anecdote` `/actus` `/conversation` `/morning` `/goodnight` `/nightwakeup` |
| `discordActionLimiter` | 10/min | `/members/:id/(mute\|kick\|ban)` `/members/:id/roles` `/channels/:id` `/roles/:id` |
| `backupLimiter` | 3 / 10 min | `/backup` |
| `generalLimiter` | 60/min | tout le reste de `/api/*` |

### Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/state` | État serveur complet |
| `GET` | `/api/health` | Discord / Mongo / Claude (ping, latence, erreurs, mémoire, uptime) |
| `GET` | `/api/logs` · `/api/audit` | Logs live + audit trail (ring buffer 500) |
| `GET` `POST` | `/api/config` | Config bot persistée |
| `GET` | `/api/slot` · `/api/schedule` | Slot courant + grille hebdomadaire |
| `GET` | `/api/emotions/state` · `/emotions/bonds[/:id]` | État émotionnel + liens membres |
| `GET` | `/api/channel-memory[/:id]` · `/dm-history/:userId` | Mémoires conversationnelles |
| `GET` | `/api/members/token-stats/leaderboard` | Leaderboard tokens (top 50) |
| `GET` | `/api/members/:id/token-stats` | Stats tokens d'un membre |
| `GET` | `/api/members/:id/token-stats/daily` | Évolution journalière (30 j) |
| `GET` | `/api/members/:id/token-stats/context` | Répartition par contexte |
| `POST` | `/api/admin/(mood\|slot\|state\|tiktok\|sidebar/refresh)` | Override live |
| `POST` | `/api/post` | Post manuel (texte ou embed) |
| `POST` `GET` `DELETE` | `/api/backups…` | Cycle de vie des backups |
| `GET` `POST` | `/api/project/funding` · `/donation` · `/funding/history` | Soutien Brainee |
| `POST` | `/api/sync/(discord-to-file\|file-to-discord)` | Force sync template |

### WebSocket — `ws://localhost:3000`

| Event | Description |
|---|---|
| `state` `logs` `stats` | Hydratation initiale |
| `logUpdate` `auditUpdate` | Stream temps réel |
| `configUpdate` `adminUpdate` | Mises à jour panneau de contrôle |
| `tiktokLive` `fundingUpdate` | Live & dons |

---

## ✅ Tests & CI

```bash
npm test
```

| Suite | Couvre |
|---|---|
| `audit.test.js` | Ring buffer, troncature, ordre |
| `emotions.test.js` | Décroissance, résidus, stack émotions |
| `funding.test.js` | Calcul coûts, dons, statut Discord |
| `humanize-v234.test.js` | Mémoire narrative, VIP, taste profile (v2.3.4) |
| `humanize-v235.test.js` | Outreach, hyperFocus, combos, vulnerability (v2.3.5) |
| `mood.test.js` | Sélection humeur, refresh, reroll |
| `scheduling.test.js` | Slots semaine/we, forced slot, fuseau Paris |

→ **133 tests verts** rejoués par GitHub Actions sur chaque push & PR.

---

## 📝 Changelog (extrait)

### `v2.5.1` — 🕐 Conscience temporelle & GNews stable

- **Time awareness** : Brainee sait maintenant quelle heure et quel jour on est — chaque message dans le contexte affiche son horodatage relatif (`aujourd'hui 08:42`, `hier 14:30`...) et tous les prompts reçoivent la date/heure courante (timezone Paris)
- **GNews stabilisé** : format de date ISO datetime complet (`YYYY-MM-DDTHH:MM:SSZ`), timeout 8 s, validation des articles, `max=25`, paramètre `to` ajouté, tri explicite par date de publication
- **GNews sanitize** : les topics avec virgules ou points-virgules ne provoquent plus de `400 Bad Request`
- **Robustesse cache actus** : `Array.isArray()` sur `postedNewsUrls`, gestion d'erreur non-bloquante sur `setBotState`

### `v2.5.0` — 📊 Token Usage Tracking
- **Suivi des tokens par membre** : chaque message privé, mention ou réponse différée enregistre les tokens consommés en base MongoDB
- **API de stats** : 4 endpoints (leaderboard · stats individuelles · évolution journalière · répartition par contexte)
- **Dashboard section "Tokens"** : vue d'ensemble globale, leaderboard top-50, recherche par membre, graphique d'évolution sur 30 j
- **`callClaude` retourne maintenant `{ text, usage }`** au lieu d'une chaîne brute — tous les appelants ont été mis à jour
- **Correction critique** : 14 fichiers qui utilisaient `callClaude` comme une chaîne ont été corrigés (youtube · steam · crons · greetings · anecdotes · actus · drift · tiktok · dmOutreach · conversations · hyperFocusRevisit · intelligentMemory · channelMem · channelDir)

### `v2.3.5` — ⚡ Initiative & émotions complexes
- **Proactive outreach** : pensées spontanées, observations, callbacks VIP, défis créatifs
- **HyperFocus triggers** : Brainee détecte une obsession et revient dessus 2-14 h plus tard
- **Emotion combos** : états combinés (`fatiguée+loyale`, `nostalgique+énergique`, etc.)
- **Vulnerability windows** : Brainee s'autorise à montrer fatigue ou surcharge → boost de bond si soutien
- **Extended permissions** : pins intelligents + mini-sondages avec quotas stricts

### `v2.3.4` — 💗 Humanisation Brainee
- **Mémoire narrative par membre** (`memberStories`) : Brainee se souvient des sujets, blagues, et moments importants pour chaque personne
- **VIP system** (4 tiers basés sur le bond) : Superfan, Fidèle, Actif, Standard
- **Taste profile** (`tasteProfile`) : goûts, genres, vibes et évitements détectés automatiquement

### `v2.3.3` — 🤖 CI GitHub Actions
Workflow `tests.yml` : `npm ci` + `npm test` sur Node 18 à chaque push / PR.

### `v2.3.2` — ✅ 87 tests unitaires
Jest 30, 5 suites couvrant les modules critiques.

### `v2.3.1` — 🧱 Frontend modulaire
`public/app.js` (1 771 lignes) éclaté en **21 modules** dans `public/js/`.

### `v2.3.0` — 🧱 API modulaire
`src/api/routes.js` (430 lignes) éclaté en 6 fichiers thématiques.

### `v2.2.9` — 🛡️ TikTok watcher robuste
Timeout 15 s, nettoyage écouteurs, garde-fou `liveActive` 12 h.

### `v2.2.8` — 🔒 Vulnérabilités npm
12/14 corrigées, 2 résiduelles documentées.

### `v2.2.7` — 🚦 Rate limiting Express
4 niveaux (claude / discord / backup / general).

### `v2.2.6` — 📣 Logs explicites
Tous les `.catch(() => {})` critiques remplacés par `pushLog('ERR', …)`.

### `v2.2.5` — 🌅 Présence active + signalement émotionnel
Morning varié (30 msg de contexte), `reactionScanCron` 20 min, `replyCron` 2 h → 45 min, emoji contextuel sur réponse différée.

### `v2.2.4` — 💰 Salon soutien anti-redéploiement
Scan des 50 derniers messages pour retrouver l'embed, ID persisté.

### `v2.2.3` — 🧩 Fix doublons salons + tags normalisés
`channelManager` + persistance d'ID, normalisation emoji-safe.

### `v2.2.0–2.2.2` — 🧠 5 features d'autonomie
Narrative memory (30 j), persistent emotions, learned preferences, topic fatigue, decision logic.

### `v2.0.0–2.1.x` — 💗 Âme de Brainee + dashboard moderne
Émotions 4 couches, member bonds, humanize, adaptive scheduling, sidebar Discord, refonte 3 thèmes.

---

## 📄 Licence

Privé — usage interne au serveur **BrainEXE**.
