<div align="center">

# 🧠 BrainEXE Dashboard

**Brainee** — un bot Discord IA qui *vit* sur ton serveur, et son cockpit web temps réel.

Pensé pour la communauté gaming neurodivergente du serveur **BrainEXE**.

[![Tests](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml/badge.svg)](https://github.com/jRPGlibrary/brainexe-dashboard/actions/workflows/tests.yml)
![Version](https://img.shields.io/badge/version-0.10.1-7c5cbf?style=flat-square)
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

> 📖 **Historique complet, propre, dans [CHANGELOG.md](./CHANGELOG.md)** — toutes les versions de **v0.2.5 → v0.9.17** y sont documentées avec leurs commits.

### Dernière release — `v0.10.1` — 📊 Verbosité par salon active
- Fix : `recordBotMessage` enfin enregistré → le système apprend vraiment ce que chaque salon aime
- Fix : `replyToConversations` capture le message envoyé pour le tracking d'engagement
- Les salons qui aiment les longs messages le montreront progressivement

### Quelques jalons marquants
| Version | Sujet |
|---|---|
| `v0.9.16` | 🛡️ Sécurité protobufjs (CVE GHSA-xq3m-2v4x-88gg) |
| `v0.9.15` | 💰 Token Optimization (Haiku, max_tokens réduits, −65 %) |
| `v0.9.13` | 🕐 Time awareness + GNews stable |
| `v0.9.11` | 📊 Token Usage Tracking par membre |
| `v0.9.6` | 🛡️ Sécurité avancée (2FA, sessions) + nouveau dashboard |
| `v0.8.6` | 💬 DM Outreach (Brainee initie & rejoint des DMs) |
| `v0.8.1` | ⚡ Initiative & émotions complexes |
| `v0.8.0` | 💗 Humanisation (mémoire narrative, VIP, taste) |
| `v0.7.7` | 🤖 CI GitHub Actions |
| `v0.7.6` | ✅ 87 tests unitaires |
| `v0.7.5` | 🧱 Frontend éclaté en 21 modules |
| `v0.7.4` | 🧱 API éclatée en 6 fichiers thématiques |
| `v0.7.1` | 🚦 Rate limiting Express (4 niveaux) |
| `v0.6.0` | 🧠 5 features d'autonomie Brainee |
| `v0.5.2` | 📱 Mobile responsive complet |
| `v0.4.1` | 📚 Création de la BIBLE_BRAINEXE.md |
| `v0.3.0` | 🎛️ Live Admin Panel + refonte dashboard |
| `v0.2.5` | 🌱 Toute première mouture (point de départ) |

> La **v1.0.0** est réservée pour la future release stable finale figée.

---

## 📄 Licence

Privé — usage interne au serveur **BrainEXE**.
