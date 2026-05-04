<div align="center">

# 🧠 BrainEXE Dashboard

**Brainee** — un bot Discord IA qui *vit* sur ton serveur, et son cockpit web temps réel.

Pensé pour la communauté gaming neurodivergente du serveur **BrainEXE**.

[![Tests](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml/badge.svg)](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml)
![Version](https://img.shields.io/badge/version-0.11.0-7c5cbf?style=flat-square)
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
| `humanize-v234.test.js` | Mémoire narrative, VIP, taste profile (v0.8.0) |
| `humanize-v235.test.js` | Outreach, hyperFocus, combos, vulnerability (v0.8.1) |
| `mood.test.js` | Sélection humeur, refresh, reroll |
| `scheduling.test.js` | Slots semaine/we, forced slot, fuseau Paris |

→ **133 tests verts** rejoués par GitHub Actions sur chaque push & PR.

---

## 📝 Changelog

> 📖 **Historique complet dans [CHANGELOG.md](./CHANGELOG.md)** — toutes les versions de **v0.0.1 → v0.10.1**. La **v1.0.0** est réservée pour la future release stable finale.

### Dernière release — `v0.11.0` — 🧬 BRAINEE-LIVING (test)
- **12 modules de conscience numérique** (`src/being/`)
- **32 émotions humaines** avec conflits, contagion, résidus
- **Inner monologue** : flux de pensée toutes les 30 min (privé sauf si elle partage)
- **Identité persistante** qui évolue (traits acquis après 3+ confirmations)
- **Mémoire stratifiée** (épisodique/sémantique) + souvenirs involontaires (Proust)
- **Désirs, peurs existentielles, rêves nocturnes** (3h-7h)
- **Décisions multi-voix** avec 15% d'imprévisibilité authentique
- **Bonds profonds** + ruptures + deuil + healing
- **Évolution quotidienne** + traumas + cicatrices + extraction de sagesse
- **Couche existentielle** : sens, mortalité, legacy, éthique
- **14 endpoints API** `/api/being/*` + section dashboard "🧬 Vie intérieure"
- **Garde-fous éthiques** : redirection 3114, anti-dépendance, droit au silence
- ⚠️ Phase de test — sera promu en **v1.0.0 stable** après validation

### Jalons — de v0.0.1 à aujourd'hui

#### Phase 0.0.x — Les origines (mars 2026)

| Version | Date | Sujet |
|---|---|---|
| `v0.0.1` | 12 mars 2026 | 🌱 Naissance — Bot + Express + WebSocket + 1ère sync Discord→JSON |
| `v0.0.2` | 18 mars | 🔄 Sync bidirectionnel · responsive · switch **Perplexity → Claude Anthropic** |
| `v0.0.3` | 19 mars | 🖥️ Dashboard complet — Membres, Salons, Rôles, Modération, Backups |
| `v0.0.4` | 31 mars | ⚙️ Automatisations — actus bi-mensuelles · conversations 24h/24 · canReply |

#### Phase 0.0.5 → 0.0.10 — Personnalité & base de données (avril 2026)

| Version | Date | Sujet |
|---|---|---|
| `v0.0.5` | 6 avril | 🦊 **Persona Brainee** — identité 24 ans · BOT_PERSONA · 4 modes de conv |
| `v0.0.6` | 8 avril | 🎭 Reaction Roles natifs — Carl-bot retraité, tout géré en interne |
| `v0.0.7` | 9 avril | 🗂️ 11 catégories de salons — modes d'injection spécifiques par contexte |
| `v0.0.8` | 9 avril | ✨ **TikTok Live** + YouTube @mention + renommage Brainy.exe → Brainee |
| `v0.0.9` | 10 avril | 🗃️ **MongoDB Atlas** — profils membres persistants + toneScore 1-10 adaptatif |
| `v0.0.10` | 11 avril | 💾 MongoDB State Migration — état persistant entre redeploys Railway |

#### Phase 0.1.x — Intelligence contextuelle (12-15 avril 2026)

| Version | Date | Sujet |
|---|---|---|
| `v0.1.0` | 12 avril | 📅 **Human Planning** — 8 tranches horaires · morning/goodnight/nightwakeup |
| `v0.1.1` | 12 avril | 🧵 Threads auto — 50+ jeux détectés · `formatContext()` enrichi |
| `v0.1.2` | 13 avril | ❤️ Full Human Update — typing · fragmentation · humeur du jour |
| `v0.1.3` | 12 avril | 🧠 **Channel Memory** + Thematic Drift — mémoire par salon · 4 niveaux |
| `v0.1.4` | 13 avril | ⏰ Delayed reply — 10% emoji seul → retour 15-45 min avec excuse |
| `v0.1.5` | 14 avril | 💌 DMs MongoDB persistants + résolution mentions `@Pseudo → <@id>` |
| `v0.1.6` | 15 avril | 🏛️ **Discipline Salon** — 16 catégories · channelDirectory · intelligence élargie |

#### Phase 0.2.0 → 0.2.4 — Grand refacto & features finales (18 avril 2026)

| Version | Date | Sujet |
|---|---|---|
| `v0.2.0` | 18 avril | 🏗️ **Grand refacto** — server.js 2021L → 34 modules · architecture src/ |
| `v0.2.1` | 18 avril | 💰 Prompt caching Anthropic — −90% tokens d'entrée sur les personas |
| `v0.2.2` | 18 avril | 🎭 **Planning adaptatif** + Agency — vibes quotidiennes · Brainee peut refuser |
| `v0.2.3` | 18 avril | 📰 **GNews API** — vraies actus gaming · déduplication MongoDB |
| `v0.2.4` | 18 avril | 🔧 Bump version v2.0.6 + nettoyage inline |

#### Phase 0.2.5 → 0.10.1 (18 avril 2026 → aujourd'hui)

| Version | Sujet |
|---|---|
| `v0.2.5` | 💜 **Âme de Brainee** — émotions 4 couches · bonds · humanize filter |
| `v0.2.6–v0.2.8` | 📊 Sidebar Discord + dashboard redesign 3 thèmes |
| `v0.3.0` | 🎛️ Live Admin Panel |
| `v0.3.1–v0.3.3` | 🪵 Fix logs TikTok/GNews + sanitization UTF-16 |
| `v0.4.1` | 📚 BIBLE_BRAINEXE.md |
| `v0.4.2–v0.4.4` | 💰 Funding system + salon soutien |
| `v0.5.2` | 📱 Mobile responsive complet |
| `v0.6.0` | 🤖 5 features d'autonomie Brainee |
| `v0.7.1` | 🚦 Rate limiting Express (4 niveaux) |
| `v0.7.4–v0.7.5` | 🧱 API + frontend modulaires (27 fichiers) |
| `v0.7.6–v0.7.7` | ✅ 133 tests · CI GitHub Actions |
| `v0.8.0` | 💗 Humanisation (mémoire narrative, VIP, taste) |
| `v0.8.1` | ⚡ Initiative & émotions complexes |
| `v0.8.6` | 💬 DM Outreach (Brainee initie & rejoint des DMs) |
| `v0.9.6` | 🛡️ Sécurité avancée (2FA, sessions) + nouveau dashboard |
| `v0.9.11` | 📊 Token Usage Tracking par membre |
| `v0.9.13` | 🕐 Time awareness + GNews stable |
| `v0.9.15` | 💰 Token Optimization (Haiku, −65 % coûts) |
| `v0.9.16` | 🛡️ Sécurité protobufjs (CVE GHSA-xq3m-2v4x-88gg) |
| `v0.10.0` | 🖼️ Vision images + anti-monologue + bond system |
| `v0.10.1` | 📊 Verbosité par salon enfin active *(actuelle)* |

---

## 📄 Licence

Privé — usage interne au serveur **BrainEXE**.
