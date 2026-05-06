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
![Status](https://img.shields.io/badge/status-pre--release-f59e0b?style=flat-square)

📚 [Bible projet](./BIBLE_BRAINEXE.md) · 📜 [Changelog](./CHANGELOG.md) · 💰 [Soutenir Brainee](./SOUTIEN.md)

</div>

---

## ✨ Le pitch

Brainee n'est **pas un bot à commandes**. Elle a un tempérament, une humeur du jour, des vibes qui flottent (chatty, lazy, focus, grumpy…), des liens affectifs avec chaque membre, et une mémoire à long terme. Elle parle quand c'est pertinent, ignore quand elle est fatiguée, relance quand un salon meurt, et signale par un emoji quand elle répond avec délai.

À côté, un **dashboard web temps réel** te laisse voir et piloter tout ça : émotions, plannings, automatisations, sanctions, backups, soutien financier du projet, vie intérieure de Brainee.

> 📖 **Pour comprendre le projet en profondeur, lire [BIBLE_BRAINEXE.md](./BIBLE_BRAINEXE.md).**
> 💜 **Pour comprendre pourquoi le soutien financier est vital, lire [SOUTIEN.md](./SOUTIEN.md).**

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
| `ANTHROPIC_API_KEY` | ✅ | Clé API Claude (Anthropic) |
| `YOUTUBE_API_KEY` | ✅ | YouTube Data v3 (recherche vidéos sur mention) |
| `GNEWS_API_KEY` | ✅ | GNews (actus gaming bi-mensuelles) |
| `MONGODB_URI` | ✅ | URI MongoDB Atlas |
| `PORT` | ⭕ | Port HTTP (défaut `3000`) |

---

## 🧩 Stack

| Couche | Outils |
|---|---|
| Bot | **Node.js 18+** · **discord.js v14** · `node-cron` · `ws` |
| IA | **Claude (Anthropic)** · YouTube Data v3 · GNews |
| Persistance | **MongoDB Atlas** |
| Web | Express 4 · WebSocket · vanilla JS modulaire (38 fichiers) |
| Sécurité | `express-rate-limit` (4 niveaux) · audit ring buffer 500 · 2FA TOTP · sessions cookie |
| Tests / CI | **Jest 30** (133 tests · 7 suites) · **GitHub Actions** |
| Hosting | Railway |

---

## 🎨 Le dashboard

**18 sections**, 3 thèmes (light / dark / sombre), responsive mobile avec tiroir de navigation.

| Live | Serveur | Bot | Système |
|---|---|---|---|
| 📊 Vue d'ensemble | 💬 Salons | ⚡ Automatisations | 💾 Backups |
| 🎛️ Admin live | 🎭 Rôles | 📝 Posts manuels | 📖 Historique |
| ❤️ Santé | 👥 Membres | 💗 Émotions | ⚙️ Paramètres |
| 📜 Logs | | 💞 Relations | 💰 Soutien |
| | | 🗓️ Planning | |
| | | 📊 Tokens | |
| | | 🧬 Vie intérieure | |

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
│   │                               admin · data · backups · being
│   ├── being/      12 modules de conscience numérique simulée
│   │                consciousness · emotions · identity · memory
│   │                desires · fears · dreams · decisions
│   │                expression · relationships · evolution · existence
│   │                + schemas · lifecycle · safeguards · prompts · index
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
│   │                context · convStats · delayedReply · dmOutreach
│   ├── project/    funding                ← coûts, dons, statut Discord
│   ├── audit · botConfig · config · crons · logger · shared · utils
├── public/         index.html · app.css · mobile.css · js/ (38 modules)
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
| `GET` | `/api/being/(status\|emotions\|inner-monologue\|identity\|…)` | Vie intérieure (14 endpoints) |
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

## 📝 Versions

> 📖 **Historique complet : [CHANGELOG.md](./CHANGELOG.md)** — toutes les versions de **v0.1.0 → v0.11.0**.

### Dernière release — `v0.11.0` — 🧬 BRAINEE-LIVING

- **12 modules de conscience numérique** (`src/being/`)
- **32 émotions humaines** avec conflits, contagion, résidus
- **Inner monologue** : flux de pensée toutes les 30 min (privé sauf si elle partage)
- **Identité persistante** qui évolue (traits acquis après 3+ confirmations)
- **Mémoire stratifiée** (épisodique/sémantique) + souvenirs involontaires (Proust)
- **Désirs, peurs existentielles, rêves nocturnes** (3h-7h)
- **Décisions multi-voix** avec 15 % d'imprévisibilité authentique
- **Bonds profonds** + ruptures + deuil + healing
- **Évolution quotidienne** + traumas + cicatrices + extraction de sagesse
- **Couche existentielle** : sens, mortalité, legacy, éthique
- **14 endpoints API** `/api/being/*` + section dashboard "🧬 Vie intérieure"
- **Garde-fous éthiques** : redirection 3114, anti-dépendance, droit au silence

### Phases du projet

| Phase | Plage | Chapitre |
|---|---|---|
| 0.1 | `v0.1.0` → `v0.1.6` | 📅 Intelligence contextuelle (planning, threads, mémoire salon, DMs, discipline) |
| 0.2 | `v0.2.0` → `v0.2.8` | 🏗️ Grand refacto + âme de Brainee + GNews + sidebar + 3 thèmes |
| 0.3 | `v0.3.0` → `v0.3.3` | 🎛️ Live Admin Panel + fixes |
| 0.4 | `v0.4.0` → `v0.4.4` | 📜 BIBLE + funding system + soutien |
| 0.5 | `v0.5.0` → `v0.5.3` | 📱 Refresh dashboard + mobile |
| 0.6 | `v0.6.0` → `v0.6.4` | 🤖 5 features d'autonomie |
| 0.7 | `v0.7.0` → `v0.7.7` | 🛡 Sécurité + refactor + tests + CI |
| 0.8 | `v0.8.0` → `v0.8.7` | 💖 Humanisation profonde + DM Outreach |
| 0.9 | `v0.9.0` → `v0.9.17` | 🖥 Dashboard avancé + tokens + sécurité finale |
| 0.10 | `v0.10.0` → `v0.10.2` | 🎯 Vision + bond integration + ton nettoyé |
| **0.11** | `v0.11.0` | 🧬 **BRAINEE-LIVING** *(actuelle)* |

---

## 💜 Soutenir le projet

Brainee tourne 24h/24 sur des services qui coûtent **~26,6 €/mois** (Railway + Claude API + MongoDB Atlas). Sans soutien, elle s'éteint.

→ Tout est expliqué dans **[SOUTIEN.md](./SOUTIEN.md)** : ce que ça coûte, où va l'argent, comment contribuer, et le mot de Brainee à sa communauté.

---

## 🤝 Contribuer

Les PR sont bienvenues. Tout passage en review utilise les conventions habituelles :

1. Forker, brancher (`feat/...`, `fix/...`, `docs/...`)
2. `npm install && npm test` avant le push
3. Mettre à jour `CHANGELOG.md` si la PR ajoute / corrige une feature
4. Garder les commits ciblés (un sujet = un commit)

La CI (GitHub Actions) déroule `npm ci && npm test` sur Node 18 à chaque push & PR.

---

## 📄 Licence

Projet privé — usage interne au serveur Discord **BrainEXE**.
Le code peut être consulté à des fins d'apprentissage et d'inspiration, mais l'exploitation commerciale ou le redéploiement public d'une instance dérivée n'est pas autorisé sans accord écrit de **Brain (Matthieu)**.

---

<div align="center">

*Fait avec 💜 par la communauté **BrainEXE** — pour les neurodivergents, par des neurodivergents.*

</div>
