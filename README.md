# 🧠 BrainEXE Dashboard `v2.2.0`

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

| Variable | Requis | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Token du bot Discord |
| `GUILD_ID` | ✅ | ID du serveur Discord |
| `ANTHROPIC_API_KEY` | ✅ | Clé API Claude |
| `YOUTUBE_API_KEY` | ✅ | Clé API YouTube Data v3 |
| `GNEWS_API_KEY` | ✅ | Clé API GNews |
| `MONGODB_URI` | ✅ | URI MongoDB Atlas |
| `PORT` | ⭕ | Port dashboard (défaut: 3000) |

---

## 🚀 Démarrage

```bash
# Installation
npm install

# Démarrage
npm start

# Dashboard accessible sur
http://localhost:3000
```

---

## 🎨 Dashboard — v2.1.0

Dashboard moderne avec **3 thèmes** (light / dark / sombre) et navigation par sections :

- **📊 Vue d'ensemble** — Stats globales, slot actuel, humeur, logs récents, actions rapides
- **📜 Logs** — Stream temps réel coloré par type (SYS/ERR/D2F/F2D/API/JOIN)
- **💬 Salons** — Arborescence catégories/salons, création/édition/suppression
- **🎭 Rôles** — Liste triée, création avec couleur, suppression
- **👥 Membres** — Liste des membres avec rôles et date d'arrivée
- **⚡ Automatisations** — Contrôles (anecdotes, actus, conversations, greetings, TikTok, drift)
- **📝 Posts manuels** — Envoi de messages texte ou embed dans un salon
- **💾 Backups** — Gestion des snapshots de configuration
- **⚙️ Paramètres** — Sync, auto-rôle, welcome, thème

Architecture : `public/index.html` (structure) + `public/app.css` (thèmes) + `public/app.js` (logique) — pas de framework, juste du HTML/CSS/JS moderne.

---

## 📊 Sidebar Discord — Nouveau en v2.1.0

Stats live affichées directement dans la barre latérale Discord, comme les bots statbot/MEE6 :

```
📊 SYSTÈME BRAINEXE
  🔊 👥┃Membres : 156
  🔊 🧠┃État : 🎮 Gaming
  🔊 ⚡┃Humeur : Chill
  🔊 🔥┃Activité : Énergique
  🔊 📱┃TikTok : Offline
```

- **5 salons vocaux verrouillés** (ViewChannel ✅ / Connect ❌) dans une catégorie dédiée
- **Update automatique** toutes les 10 minutes (rate limit Discord)
- **Données live** : `memberCount`, slot actuel, mood du jour, énergie interne, statut TikTok

---

## 📝 Changelog

### `v2.2.0` — 🔴 Audit & polish (embeds TikTok, fils auto-invités, no-insist)

**🐛 Corrections**
- **TikTok offline** : le statut "HORS LIGNE" au démarrage est désormais **uniquement loggé** et n'est plus publié dans le salon `🔴・alertes-live` (spam supprimé)
- Statut `online` redondant retiré au profit du seul `sendLiveStartEmbed`

**🆕 Features**
- **Embeds TikTok enrichis** :
  - `sendLiveStartEmbed` : lien direct sur le titre, thumbnail + image de couverture du live (depuis `roomInfo.cover`), avatar TikTok (depuis `roomInfo.owner`), bouton texte "▶ Rejoindre le live", ligne `Viewers` claire et mise en forme avec \`code\`
  - `sendLiveEndEmbed` : Top gifts en liste, rappel du rôle notification, lien vers la chaîne
- **Fils Discord auto-intro** : quand Brainee ouvre un fil (dérive, conv ambiante, reply), elle poste un **premier message dans le fil** avec un titre en gras + invitation chaleureuse. Les participants récents sont tagués dans le fil de dérive (jusqu'à 5) pour les inviter à migrer
- **No-insist** : si Brainee a posté dans un salon et que personne n'a répondu depuis (moins de 4h), elle ne repose plus dessus — elle part sur un autre sujet
- **Biais topics profonds** : les salons thématiques (JRPG, RPG, retro, indie, next-gen, hidden-gems, lore, pixel-art, code-talk, ia-tools, tips-focus, cerveau-en-feu, etc.) sont boostés dans le choix du salon le plus silencieux + un bloc d'instructions "angle fouillé" est injecté dans le prompt pour éviter les questions génériques

**🔧 Améliorations**
- `package.json` : plages `^` permettant les MAJ patch/minor automatiques (sécurité)
- Version bumpée partout (2.1.0 → 2.2.0)

**⚠️ Dépendances majeures disponibles (non upgradées — breaking changes)**
- `discord.js` 14.16 → 14.26 (safe)
- `express` 4 → 5 (breaking)
- `mongodb` 6 → 7 (breaking)
- `node-cron` 3 → 4 (breaking)
- `chokidar` 3 → 5 (breaking)
- `dotenv` 16 → 17 (breaking)

À planifier en v2.3 avec tests dédiés.

---

### `v2.1.0` — 🎨 Refonte dashboard + Sidebar Discord

**🆕 Features**
- **Sidebar Discord** : 5 salons vocaux stats auto-update (membres, état, humeur, activité, TikTok)
- **Refonte complète du dashboard** : design moderne, 3 thèmes (light/dark/sombre), navigation par sections
- **Theme persistant** : le thème choisi est sauvegardé en `localStorage`
- **Toast notifications** : feedback visuel pour chaque action

**🔧 Améliorations**
- Flag `shared.tiktokLiveActive` pour tracker l'état du live
- Architecture dashboard en 3 fichiers (`index.html` / `app.css` / `app.js`) au lieu d'un monolithe
- Version bumpée partout (emotions, humanize, persona, adaptiveSchedule, memberBonds, crons, events, routes)

**🐛 Corrections**
- Correction initiale du bug `channel.send is not a function` → salons vocaux au lieu d'embed
- Respect des rate limits Discord (2 renames max par 10min par canal)

---

### `v2.0.0` → `v2.0.9` — 💗 Âme de Brainee

**🧠 v2.0.9 — Émotions + Bonds + Humanisation**
- **Émotions** : 4 couches (tempérament, états internes, émotions vives, liens membres)
- **Member bonds** : attachement, confiance, confort social, trajectoire émotionnelle par membre
- **Humanize filter** : accent drops, slang, relax (basés sur énergie, charge mentale, lien)
- Injection émotionnelle dans le system prompt → influence ton, longueur, initiative

**⚡ v2.0.8 — Humanize core**
- Filtre de micro-transformations contextuel (pas aléatoire)
- Règles strictes : pas de première phrase, pas de ponctuation structurante, max 2 filtres/message

**🎭 v2.0.7 — Adaptive scheduling**
- Vibes journalières (chatty / introvert / impulsive / lazy...)
- Horaires flottants (morning ±25min, lunch, goodnight)
- Détection d'urgence pour réponses rapides ou relances

**💬 v2.0.x — Conversations + features de base**
- Anecdotes quotidiennes
- Actus gaming bi-mensuelles (GNews)
- Greetings (morning/lunch/goodnight/nightwakeup)
- Drift check (détection de conversations mortes)
- TikTok Live watcher + annonces automatiques
- Reaction roles, Auto-role
- Welcome messages customs
- Backups serveur

---

## 🗂️ Architecture

```
brainexe-dashboard/
├── server.js                    # Entry point minimal
├── src/
│   ├── config.js                # Variables d'environnement
│   ├── shared.js                # État partagé
│   ├── logger.js                # Logs + broadcast WS
│   ├── crons.js                 # Orchestration cron jobs
│   ├── botConfig.js             # Config bot persistée
│   ├── utils.js                 # Helpers
│   ├── ai/
│   │   ├── claude.js            # Client Anthropic
│   │   └── youtube.js           # Recherche YouTube
│   ├── api/
│   │   └── routes.js            # Tous les endpoints HTTP
│   ├── bot/
│   │   ├── persona.js           # System prompts (âme de Brainee)
│   │   ├── emotions.js          # Core émotionnel 4 couches
│   │   ├── humanize.js          # Filtre humanisation
│   │   ├── mood.js              # Humeur du jour
│   │   ├── scheduling.js        # Slots journaliers (par jour)
│   │   ├── adaptiveSchedule.js  # Vibes + horaires flottants
│   │   ├── channelIntel.js      # Intelligence par salon
│   │   ├── messaging.js         # Envoi humanisé (typing, mentions)
│   │   ├── reactions.js         # Réactions emojis
│   │   └── keywords.js          # Détection mots-clés
│   ├── db/
│   │   ├── index.js             # Connexion MongoDB
│   │   ├── members.js           # Profils membres
│   │   ├── memberBonds.js       # Liens affectifs
│   │   ├── channelMem.js        # Mémoire par salon
│   │   ├── channelDir.js        # Directory des salons
│   │   ├── dmHistory.js         # Historique DM
│   │   └── botState.js          # État persistant bot
│   ├── discord/
│   │   ├── events.js            # Gestion events Discord
│   │   └── sync.js              # Sync Discord ↔ fichier
│   └── features/
│       ├── anecdotes.js         # Anecdote quotidienne
│       ├── actus.js             # News gaming
│       ├── conversations.js     # Conversations ambiantes
│       ├── greetings.js         # Morning/goodnight
│       ├── drift.js             # Détection drift
│       ├── tiktok.js            # TikTok Live watcher
│       ├── welcome.js           # Message de bienvenue
│       ├── sidebar.js           # 🆕 Sidebar Discord (v2.1.0)
│       ├── context.js           # Contexte conversationnel
│       ├── convStats.js         # Stats quotidiennes conversations
│       └── delayedReply.js      # Réponses différées
├── public/
│   ├── index.html               # Structure dashboard
│   ├── app.css                  # Styles + 3 thèmes
│   └── app.js                   # Logique client
├── discord-template.json        # Template de structure serveur
├── brainexe-config.json         # Config bot persistée
└── package.json
```

---

## 🔌 API

Le dashboard et le bot exposent une API HTTP complète sur `http://localhost:3000/api/*` :

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/state` | GET | État complet du serveur (roles, channels, structure) |
| `/api/logs` | GET | Historique des logs |
| `/api/config` | GET/POST | Configuration du bot |
| `/api/slot` | GET | Slot actuel + humeur |
| `/api/sync/discord-to-file` | POST | Force sync Discord → fichier |
| `/api/sync/file-to-discord` | POST | Force sync fichier → Discord |
| `/api/channels` | POST | Créer un salon |
| `/api/channels/:id` | PATCH/DELETE | Modifier/supprimer un salon |
| `/api/categories` | POST | Créer une catégorie |
| `/api/roles` | POST | Créer un rôle |
| `/api/roles/:id` | DELETE | Supprimer un rôle |
| `/api/members` | GET | Liste des membres |
| `/api/members/:id/mute\|kick\|ban` | POST | Sanctions |
| `/api/anecdote` | POST | Poster une anecdote manuelle |
| `/api/actus` | POST | Poster les actus manuelles |
| `/api/conversation` | POST | Lancer une conversation |
| `/api/morning\|goodnight\|nightwakeup` | POST | Tester les greetings |
| `/api/tiktok/test` | POST | Forcer connexion TikTok |
| `/api/post` | POST | Poster un message manuel |
| `/api/backup` | POST | Créer un backup |
| `/api/backups` | GET | Lister les backups |
| `/api/emotions/state\|bonds` | GET | État émotionnel du bot |

---

## 📡 WebSocket

Le dashboard écoute en temps réel via WebSocket (`ws://localhost:3000`) :

| Event | Payload | Description |
|---|---|---|
| `state` | Guild complete | État serveur complet |
| `logs` | Array | Historique des logs |
| `stats` | `{d2f, f2d, startTime}` | Stats de sync |
| `configUpdate` | `{section, data}` | Mise à jour config |
| `tiktokLive` | `{status, title, viewers}` | Events TikTok |
| `logUpdate` | Log entry | Nouveau log |

---

## 🤝 Contribution

Le projet est développé en TDD pragmatique avec Claude Code. Pour contribuer :

1. Créer une branche feature : `git checkout -b claude/ma-feature`
2. Commit atomiques avec messages descriptifs
3. Push + ouvrir une PR

---

## 📄 Licence

Privé — usage interne au serveur BrainEXE.
