# 🧠 BrainEXE Dashboard `v2.2.3`

> **Brainee** — Bot Discord IA pour le serveur BrainEXE. Gaming, neurodivergence, communauté.

---

## 📦 Stack

| Outil | Rôle |
|---|---|
| Node.js + Discord.js v14 | Bot Discord |
| Express + WebSocket | Dashboard temps réel |
| Anthropic API (Claude) | Génération de contenu IA |
| YouTube Data API v3 | Recherche vidéos sur @mention |
| GNews API | Actualités gaming réelles |
| MongoDB Atlas | Persistance (profils, mémoire, bonds, états) |
| node-cron | Planification des tâches |
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
| `PORT` | ⭕ | Port dashboard (défaut : 3000) |

---

## 🚀 Démarrage

```bash
npm install
npm start
# Dashboard → http://localhost:3000
```

---

## 🎨 Dashboard

Interface moderne avec **3 thèmes** (light / dark / sombre) et navigation par sections :

| Section | Description |
|---|---|
| 📊 Vue d'ensemble | Stats globales, slot actuel, humeur, logs récents, actions rapides |
| 🎛️ Admin live | Contrôle manuel du slot, de l'humeur, du TikTok et de l'état du bot |
| ❤️ Santé système | Statut Discord / Mongo / Claude en temps réel (ping, latence, mémoire, uptime) |
| 📜 Logs | Stream temps réel avec barre de filtre (source + niveau) |
| 💬 Salons | Arborescence catégories/salons, création / édition / suppression |
| 🎭 Rôles | Liste triée, création avec couleur, suppression avec confirmation |
| 👥 Membres | Liste avec recherche et 4 modes de tri (nom, rôles, arrivée, récence) |
| ⚡ Automatisations | Contrôles anecdotes, actus, conversations, greetings, TikTok, drift |
| 📝 Posts manuels | Envoi de messages texte ou embed avec aperçu temps réel |
| 💗 Émotions | État émotionnel live du bot (humeur, énergie, états internes) |
| 💞 Relations | Liens affectifs membres (attachement, confiance, évolution) |
| 🗓️ Planning | Grille 24h × 3 types de jours, slot courant surligné |
| 💾 Backups | Liste, téléchargement, suppression et restauration de config |
| 📖 Historique | Journal d'audit de toutes les actions dashboard (500 entrées max) |
| ⚙️ Paramètres | Sync, auto-rôle, welcome, thème |
| 💰 Soutien | Données de financement et historique mensuel |

Architecture : `public/index.html` + `public/app.css` + `public/app.js` — sans framework.

---

## 📡 Sidebar Discord

Stats live affichées dans la barre latérale Discord (mise à jour toutes les 10 min) :

```
📊 SYSTÈME BRAINEXE
  🔊 👥┃Membres : 156
  🔊 🧠┃État : 🎮 Gaming
  🔊 ⚡┃Humeur : Chill
  🔊 🔥┃Activité : Énergique
  🔊 📱┃TikTok : Offline
```

5 salons vocaux verrouillés (ViewChannel ✅ / Connect ❌) dans une catégorie dédiée.

---

## 🗂️ Architecture

```
brainexe-dashboard/
├── server.js                    # Entry point
├── src/
│   ├── config.js                # Variables d'environnement
│   ├── shared.js                # État partagé global
│   ├── logger.js                # Logs + broadcast WebSocket
│   ├── audit.js                 # Ring buffer audit 500 entrées
│   ├── crons.js                 # Orchestration cron jobs
│   ├── botConfig.js             # Config bot persistée
│   ├── utils.js                 # Helpers
│   ├── ai/
│   │   ├── claude.js            # Client Anthropic (instrumentation santé)
│   │   └── youtube.js           # Recherche YouTube
│   ├── api/
│   │   └── routes.js            # Tous les endpoints HTTP
│   ├── bot/
│   │   ├── persona.js           # System prompts (âme de Brainee)
│   │   ├── emotions.js          # Core émotionnel 4 couches
│   │   ├── humanize.js          # Filtre humanisation
│   │   ├── mood.js              # Humeur du jour
│   │   ├── scheduling.js        # Slots journaliers
│   │   ├── adaptiveSchedule.js  # Vibes + horaires flottants
│   │   ├── channelIntel.js      # Intelligence par salon
│   │   ├── messaging.js         # Envoi humanisé (typing, mentions normalisées)
│   │   ├── reactions.js         # Réactions emojis
│   │   └── keywords.js          # Détection mots-clés
│   ├── config/
│   │   ├── channelManager.js    # Persistance des IDs de salons importants
│   │   └── channels.json        # IDs persistés (salon soutien, etc.)
│   ├── db/
│   │   ├── index.js             # Connexion MongoDB
│   │   ├── members.js           # Profils membres + détection préférences
│   │   ├── memberBonds.js       # Liens affectifs
│   │   ├── narrativeMemory.js   # Arcs narratifs serveur (30j)
│   │   ├── topicFatigue.js      # Tracker fatigue sujets
│   │   ├── channelMem.js        # Mémoire par salon
│   │   ├── channelDir.js        # Directory des salons
│   │   ├── dmHistory.js         # Historique DM
│   │   └── botState.js          # État persistant bot
│   ├── discord/
│   │   ├── events.js            # Gestion events Discord
│   │   └── sync.js              # Sync Discord ↔ fichier template
│   └── features/
│       ├── anecdotes.js         # Anecdote quotidienne
│       ├── actus.js             # News gaming bi-mensuelles
│       ├── conversations.js     # Conversations ambiantes
│       ├── decisionLogic.js     # Logique d'autonomie (refus, fatigue)
│       ├── greetings.js         # Morning / goodnight / nightwakeup
│       ├── drift.js             # Détection conversations mortes
│       ├── tiktok.js            # TikTok Live watcher
│       ├── welcome.js           # Message de bienvenue
│       ├── sidebar.js           # Sidebar Discord stats
│       ├── supportChannel.js    # Salon soutien Brainee (anti-doublon)
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

Tous les endpoints sont accessibles sur `http://localhost:3000/api/*` :

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/state` | GET | État complet du serveur (roles, channels, structure) |
| `/api/logs` | GET | Historique des logs |
| `/api/config` | GET / POST | Configuration du bot |
| `/api/slot` | GET | Slot actuel + humeur |
| `/api/sync/discord-to-file` | POST | Force sync Discord → fichier |
| `/api/sync/file-to-discord` | POST | Force sync fichier → Discord |
| `/api/channels` | POST | Créer un salon |
| `/api/channels/:id` | PATCH / DELETE | Modifier / supprimer un salon |
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
| `/api/backups/:name/download` | GET | Télécharger un backup |
| `/api/backups/:name` | DELETE | Supprimer un backup |
| `/api/backups/:name/restore-config` | POST | Restaurer la config depuis un backup |
| `/api/emotions/state\|bonds` | GET | État émotionnel du bot |
| `/api/health` | GET | Santé Discord / Mongo / Claude |
| `/api/schedule` | GET | Grille hebdomadaire des slots |
| `/api/audit` | GET | Journal d'audit (`?limit`) |
| `/api/project/funding/history` | GET | Historique agrégé des dons par mois |

---

## 📡 WebSocket

Le dashboard écoute en temps réel via `ws://localhost:3000` :

| Event | Description |
|---|---|
| `state` | État serveur complet |
| `logs` | Historique des logs |
| `stats` | Stats de sync `{d2f, f2d, startTime}` |
| `configUpdate` | Mise à jour config `{section, data}` |
| `tiktokLive` | Events TikTok `{status, title, viewers}` |
| `logUpdate` | Nouveau log temps réel |
| `auditUpdate` | Nouvelle action auditée |

---

## 📝 Changelog

### `v2.2.3` — 🔧 Fix doublons salons + tags normalisés

**Problèmes résolus**
- **Salon soutien recréé à chaque déploiement** : La recherche par nom exact (`c.name === CHANNEL_NAME`) échouait à cause des emojis normalisés différemment par Discord au chargement du cache. L'ID est maintenant persisté dans `src/config/channels.json` et prioritaire à chaque démarrage.
- **Tags `@pseudo` non fonctionnels** avec emojis ou points dans les pseudos (ex: `john.doe`, `❤️pseudo`).
- **Tags `#salon` non fonctionnels** quand le nom du salon contient un emoji.
- **Doublons de catégories/salons** lors de la sync `sync.js` si les noms contiennent des emojis.

**Changements**
- `src/config/channelManager.js` — Nouveau module : persistance des IDs de salons importants
- `src/config/channels.json` — Stockage de l'ID du salon soutien
- `src/features/supportChannel.js` — Recherche par ID en priorité, fallback normalisation
- `src/bot/messaging.js` — `normalizeName()` préserve désormais les points ; `resolveMentionsInText()` robustifié pour membres et salons
- `src/discord/sync.js` — Utilise `normalizeName()` pour toutes les recherches de catégories/salons
- `src/api/routes.js` — Normalisation sur la recherche de catégorie par nom

---

### `v2.2.2` — 🧠 5 Autonomy Features

**Nouveautés**
- **📖 Narrative Memory** : Arcs narratifs serveur sur 30 jours — cron quotidien analyse 50 messages via Claude, injecte 3-4 arcs dans tous les prompts
- **💗 Persistent Emotions** : Décroissance ralentie (18-24h), résidus émotionnels (15-20%) qui persistent après estompement
- **👥 Learned Preferences** : Détection auto des intérêts membres (`tech_lover`, `anime_fan`, `gaming_lover`…) — adapte les sujets de conversation
- **📊 Topic Fatigue** : Évite les sujets redondants (5+ mentions/semaine sur 8 catégories : gaming, anime, tech, débat, musique, crypto, politique, sport)
- **🤔 Decision Logic** : Brainee peut refuser de répondre (`mentalLoad > 80` + vibe introvert/lazy, ou redondance de sujet)

**Technique**
- Nouvelles collections MongoDB : `narrativeMemory`, `topicFatigue`
- Nouveaux fichiers : `src/db/narrativeMemory.js`, `src/db/topicFatigue.js`, `src/features/decisionLogic.js`
- Modifications : `emotions.js`, `members.js`, `crons.js` (cron narratif @ 02:00), `events.js`, `conversations.js`

---

### `v2.2.1` — 🛠️ Dashboard — refonte sections + corrections

**Corrections**
- Synchronisation de version (décalage accidentel vers 2.3.0)
- "Invalid Date" dans les logs : epoch `ts` + ISO `time` désormais stockés
- Logs live absents : alignement `'log'` → `'logUpdate'` entre backend et frontend
- Couleurs des logs cassées : ajout de `type: dir` dans chaque entrée

**Nouvelles sections dashboard**
- ❤️ Santé système — indicateurs Discord, MongoDB, Claude, mémoire, uptime
- 💗 Émotions — cœur émotionnel live
- 💞 Relations — liens affectifs par membre
- 🗓️ Planning — grille visuelle 24h
- 📖 Historique — journal d'audit (ring buffer 500 entrées)

**Améliorations**
- Pill WebSocket 3 états avec chrono
- Confirmation modale sur les actions destructives
- Barre de filtre des logs (source + niveau)
- Membres : recherche + 4 modes de tri
- Posts manuels : aperçu embed en temps réel
- Backups : téléchargement direct, suppression, restauration

---

### `v2.2.0` — 🎥 Embeds TikTok riches + fils auto-invités + no-insist

**Corrections**
- TikTok offline au démarrage : uniquement loggé, plus publié (spam supprimé)

**Nouveautés**
- Embeds TikTok enrichis (thumbnail, avatar, bouton live, viewers)
- Fils Discord auto-intro avec invitation chaleureuse et tag des participants
- No-insist : pas de relance si Brainee a déjà posté sans réponse depuis < 4h
- Biais topics profonds sur les salons thématiques

---

### `v2.1.0` — 🎨 Refonte dashboard + Sidebar Discord

- Sidebar Discord : 5 salons vocaux stats (membres, état, humeur, activité, TikTok)
- Dashboard moderne 3 thèmes, navigation par sections
- Thème persisté en `localStorage`, toast notifications
- Architecture en 3 fichiers (`index.html` / `app.css` / `app.js`)

---

### `v2.0.0` → `v2.0.9` — 💗 Âme de Brainee

- **Émotions** : 4 couches (tempérament, états internes, émotions vives, liens membres)
- **Member bonds** : attachement, confiance, confort social, trajectoire par membre
- **Humanize filter** : accent drops, slang, relax selon énergie/charge/lien
- **Adaptive scheduling** : vibes journalières, horaires flottants, détection urgence
- **Features de base** : anecdotes, actus gaming, greetings, drift check, TikTok Live, reaction roles, welcome, backups

---

## 📄 Licence

Privé — usage interne au serveur BrainEXE.
