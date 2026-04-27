# 🧠 BIBLE BRAINEXE — Guide COMPLET du Projet

**Version** : `2.3.3`
**Dernière mise à jour** : Avril 2026
**Pour qui ?** : Comprendre TOUT ce que fait Brainee, son dashboard, et comment le code est organisé.

---

## 📋 TABLE DES MATIÈRES

1. [C'est quoi BrainEXE ?](#1-cest-quoi-brainexe-)
2. [Les 3 piliers du projet](#2-les-3-piliers-du-projet)
3. [L'équipe technique (humains, services, fichiers)](#3-léquipe-technique)
4. [Le workflow complet (de bout en bout)](#4-le-workflow-complet)
5. [Les fonctionnalités principales](#5-les-fonctionnalités-principales)
6. [Comment ça marche techniquement](#6-comment-ça-marche-techniquement)
7. [La vie émotionnelle de Brainee](#7-la-vie-émotionnelle-de-brainee)
8. [Sécurité, robustesse & rate limiting](#8-sécurité-robustesse--rate-limiting)
9. [Le dashboard web (16 sections)](#9-le-dashboard-web)
10. [API HTTP & WebSocket (référence)](#10-api-http--websocket)
11. [Tests & CI](#11-tests--ci)
12. [Les fichiers et leur rôle](#12-les-fichiers-et-leur-rôle)
13. [Lancer le projet](#13-lancer-le-projet)
14. [Erreurs fréquentes & solutions](#14-erreurs-fréquentes--solutions)
15. [Ressources & FAQ](#15-ressources--faq)

---

## 1. C'est quoi BrainEXE ?

**Le pitch simple.**
Un bot Discord intelligent qui anime un serveur de gaming pour une communauté neurodivergente.
Le bot s'appelle **Brainee**. Elle a une vraie personnalité, des émotions persistantes, et elle se souvient de chaque personne.

**Ce qu'elle fait, en vrai :**
- 💬 Elle parle naturellement dans les salons (sans qu'on lui demande)
- 🎮 Elle partage des actualités gaming et des anecdotes
- 📱 Elle regarde les lives TikTok et annonce quand quelqu'un est en ligne
- 🧠 Elle comprend l'ambiance et adapte son ton
- 📊 Elle expose son état dans un dashboard web temps réel
- 🔐 Elle gère rôles, salons, sanctions, backups
- 💗 Elle développe des **liens affectifs** avec les membres
- 💰 Elle communique sur le coût du projet et le soutien financier

**Ce qu'elle N'EST PAS :**
- Pas un bot à commandes (`!play`, `!ban`, …)
- Pas une IA générique branchée à Discord
- C'est un **membre du serveur** à part entière, avec un caractère

---

## 2. Les 3 piliers du projet

```
┌──────────────────────────────────┐
│  🤖 BOT DISCORD (Brainee)        │  Parle, écoute, réagit, ressent
│  discord.js v14 + Claude         │
└────────────┬─────────────────────┘
             │
             ├────────────────────────────────────┐
             │                                    │
┌────────────▼──────────────────┐  ┌──────────────▼──────────────┐
│  💾 PERSISTANCE (MongoDB)     │  │  🖥️  DASHBOARD WEB           │
│  - Profils membres            │  │  - 16 sections, 3 thèmes     │
│  - Bonds (attachement, etc.)  │  │  - Temps réel (WebSocket)    │
│  - Mémoire conversationnelle  │  │  - Mobile-friendly           │
│  - Arcs narratifs (30j)       │  │  - Audit trail (500 entrées) │
│  - Topic fatigue              │  │  - Rate-limited              │
│  - État émotionnel persistant │  │  - Soutien financier         │
└───────────────────────────────┘  └──────────────────────────────┘
```

### 1️⃣ Le bot Discord — Brainee
Utilise **Claude (Anthropic)** comme cerveau. À chaque message reçu :
- elle regarde **qui** parle (et son bond avec elle),
- elle regarde **où** ça se passe (channel intel, vibe),
- elle regarde **dans quoi** ça s'inscrit (mémoire, arcs narratifs, topic fatigue),
- puis elle décide si elle répond, comment, avec quel ton, et avec quel délai.

### 2️⃣ La persistance — MongoDB Atlas
Sans elle, Brainee oublie tout au redémarrage.
Collections principales :
- `memberProfiles` — qui es-tu, quand t'es arrivé, quels rôles
- `memberBonds` — attachement / confiance / confort social / trajectoire
- `channelMemory` — résumé tournant par salon
- `channelDirectory` — catalogue des salons
- `dmHistory` — fil DM
- `narrativeMemory` — arcs narratifs serveur sur 30 j
- `topicFatigue` — sujets surexposés à éviter
- `botState` — état persistant émotionnel
- `projectFunding` — coûts & dons par mois

### 3️⃣ Le dashboard — `localhost:3000`
Une SPA vanilla (pas de framework, pas de bundler) avec **WebSocket** pour le temps réel.
On peut tout y faire : voir, configurer, sanctionner, sauvegarder, restaurer, et même *pousser* l'humeur de Brainee à la main.

---

## 3. L'équipe technique

### Services externes

| Service | Rôle | Où on le branche |
|---|---|---|
| **Discord** | Plateforme du serveur | `DISCORD_TOKEN` + `GUILD_ID` |
| **Claude (Anthropic)** | Cerveau IA — génère les réponses | `ANTHROPIC_API_KEY` |
| **YouTube Data v3** | Recherche vidéos sur mention | `YOUTUBE_API_KEY` |
| **GNews** | Actualités gaming réelles | `GNEWS_API_KEY` |
| **MongoDB Atlas** | Mémoire long terme | `MONGODB_URI` |
| **Railway** | Hébergement 24/7 | Variables d'env du dashboard Railway |
| **GitHub Actions** | CI sur chaque push/PR | `.github/workflows/tests.yml` |

### Fichiers-clés (qui fait quoi en un mot)

| Fichier | Job |
|---|---|
| `server.js` | Démarrage minimal — branche Discord + Express + WS |
| `src/config.js` | Lit le `.env` |
| `src/shared.js` | État partagé en mémoire entre bot et dashboard |
| `src/logger.js` | Logs console + broadcast WebSocket |
| `src/audit.js` | Journal d'audit (ring buffer 500) |
| `src/crons.js` | Orchestration des jobs planifiés |
| `src/botConfig.js` | Lecture/écriture de `brainexe-config.json` |
| `src/ai/claude.js` | Client Anthropic (instrumenté pour la santé) |
| `src/ai/youtube.js` | Recherche vidéos |
| `src/api/rateLimits.js` | 4 niveaux de limitation |
| `src/api/routes/*` | Endpoints HTTP éclatés par thème |
| `src/bot/*` | Personnalité, émotions, mood, scheduling, humanize, messaging |
| `src/db/*` | Couche MongoDB |
| `src/discord/*` | Events Discord + sync template ↔ Discord |
| `src/features/*` | Anecdotes, actus, conversations, drift, TikTok, sidebar, soutien… |
| `src/project/funding.js` | Coûts, dons, statut Discord |
| `public/js/*` | Frontend modulaire (21 fichiers) |
| `tests/*` | 87 tests Jest |
| `.github/workflows/tests.yml` | CI |

→ On rentre dans le détail au [chapitre 12](#12-les-fichiers-et-leur-rôle).

---

## 4. Le workflow complet

### A. Quand quelqu'un envoie un message dans Discord

```
1. Discord pousse l'event messageCreate
   ↓
2. src/discord/events.js intercepte
   ↓
3. Brainee rassemble le contexte :
   - Profil membre + bond (memberBonds)
   - Vibe du salon (channelIntel)
   - Mémoire récente (channelMemory)
   - Arcs narratifs serveur (narrativeMemory, 30j)
   - Topic fatigue (le sujet est-il sur-vu ?)
   - Sa propre humeur du jour + vibe + état interne
   ↓
4. decisionLogic.js décide :
   - répondre tout de suite
   - répondre avec délai (3-15 min)
   - repousser au lendemain (hors slot sommeil)
   - skip silencieux ⛔ (interdit sur les @mention depuis v2.2.5)
   ↓
5. persona.js + emotions.js construisent le system prompt
   ↓
6. ai/claude.js appelle Claude (avec tracking santé)
   ↓
7. humanize.js filtre la réponse (slang, accents lâchés, abréviations)
   ↓
8. messaging.js l'envoie :
   - typing animation
   - délai dactylographique (0.5–2 s)
   - mentions résolues (resolveMentionsInText)
   ↓
9. reactions.js peut ajouter un emoji contextuel
   ↓
✅ Message posté
```

### B. Quand on clique dans le dashboard

```
1. public/js/actions.js capte le clic
   ↓
2. fetch() vers /api/...  (générique : src/api/routes/index.js)
   ↓
3. Le rate limiter vérifie le quota
   ↓
4. La route effectue l'action (Discord, Mongo, fichier…)
   ↓
5. audit.js enregistre l'action
   ↓
6. logger.js broadcast un event WebSocket
   ↓
7. public/js/websocket.js reçoit et rafraîchit la section
   ↓
✅ UI à jour, toast affiché
```

### C. Au démarrage (`npm start`)

```
1. dotenv → variables d'env
2. Express + WebSocket + discord.js client
3. shared.botConfig = loadConfig()
4. registerRoutes(app) — monte tous les sous-routeurs API
5. discord.login(TOKEN)
6. Sur 'ready' :
   - refreshDailyMood + getDailyVibe
   - registerDiscordEvents + registerMessageHandlers
   - startFileWatcher (chokidar sur discord-template.json)
   - startAnecdoteCron / startActusCron / startConvCron
   - startTikTokLiveWatcher
   - startSidebarCron
   - startBackupInterval
   - connectMongoDB
   - +5s : init soutien Brainee (statut + ensureSupportChannel)
   - +25s : checkAnecdoteMissed + checkActusMissed (rattrapage)
   - +30s : initChannelDirectory
   - syncDiscordToFile('Démarrage v2.x.x')
✅ Bot prêt
```

### D. Une journée type (cron)

```
07:30  🌅  Morning greeting (varié, contexte 30 derniers messages)
09:30  📖  Anecdote du jour
toutes les 45 min  💬  replyCron — répond aux conversations en cours
toutes les 20 min  ✨  reactionScanCron — réactions emoji passives
toutes les 30-120 min  💭  Conversations ambiantes
toutes les 60 min  🚧  Drift check — relance les salons morts
toutes les 2 min   📱  TikTok Live check (timeout 15s)
toutes les 10 min  📊  Sidebar update (5 salons vocaux verrouillés)
12:00  🍱  Greeting midi
19:00  🌆  Greeting soir
03:00  🌙  Nightwakeup (rare, vibes-dépendant)
1er & 15  📰  Actualités gaming via GNews
chaque jour 02:00  📚  Cron narratif (analyse 50 messages → 3-4 arcs)
```

---

## 5. Les fonctionnalités principales

### 5.1 💬 Conversations ambiantes
**Fichiers :** `features/conversations.js` · `bot/channelIntel.js` · `crons.js`

Brainee parle d'elle-même, sans qu'on lui demande. Elle choisit le salon le plus calme, demande à Claude un sujet pertinent au vibe du salon, et poste. Si quelqu'un répond, elle continue (replyCron toutes les 45 min depuis v2.2.5).

### 5.2 📖 Anecdote quotidienne
**Fichiers :** `features/anecdotes.js` · `crons.js` · `ai/claude.js`

Cron à 9h30. Si l'anecdote a été manquée (bot offline), `checkAnecdoteMissed()` rattrape au boot.

### 5.3 📰 Actualités gaming bi-mensuelles
**Fichiers :** `features/actus.js`

1er et 15 du mois. Appel GNews → Claude filtre les 5 meilleures news → embed Discord.

### 5.4 📱 TikTok Live Watcher
**Fichiers :** `features/tiktok.js` · `crons.js`

Check toutes les 2 min. Depuis **v2.2.9** :
- timeout 15 s sur `connect()` via `Promise.race`
- nettoyage des écouteurs (`removeAllListeners()` + `disconnect()`) sur fail
- garde-fou : si `liveActive` est true depuis > 12 h, reset forcé
- `resetLiveState()` centralise la réinitialisation (anti-duplication)

Quand un live démarre → embed riche (thumbnail, viewers, bouton). Quand il s'arrête → message d'au revoir.

### 5.5 🌅 Greetings (matin / midi / soir / nuit)
**Fichiers :** `features/greetings.js` · `bot/adaptiveSchedule.js`

Depuis **v2.2.5** : matin **varié** (pas que café/somnolent), demande aux gens leurs plans du jour, charge les 30 derniers messages pour capter l'ambiance.

### 5.6 🚧 Drift detection
**Fichiers :** `features/drift.js` · `bot/channelIntel.js`

Si un salon n'a pas eu de message depuis 4 h, Brainee tente une relance contextuelle au sujet du salon (JRPG → JRPG, code → code, …).

### 5.7 💗 Bonds émotionnels par membre
**Fichiers :** `db/memberBonds.js` · `bot/emotions.js`

Chaque interaction met à jour : `attachment`, `trust`, `social_comfort`, `emotional_trajectory`. Plus tu parles avec elle, plus elle est familière (ou réservée si tu as été tendu).

### 5.8 🧠 Émotions persistantes (4 couches)
**Fichiers :** `bot/emotions.js` · `bot/mood.js` · `db/botState.js`

Détaillé au [chapitre 7](#7-la-vie-émotionnelle-de-brainee).

### 5.9 🎭 Humanize filter
**Fichiers :** `bot/humanize.js` · `bot/messaging.js`

Ajoute slang, drop d'accents, abrège, ajuste le ton selon `energy` / `mentalLoad` / `bond`. C'est ce qui fait que Brainee ne sonne pas robotique.

### 5.10 📊 Sidebar Discord (5 salons vocaux stats)
**Fichiers :** `features/sidebar.js` · `crons.js`

Toutes les 10 min, renomme 5 salons vocaux verrouillés (ViewChannel ✅ / Connect ❌) :

```
📊 SYSTÈME BRAINEXE
  🔊 👥┃Membres : 156
  🔊 🧠┃État : 🎮 Gaming
  🔊 ⚡┃Humeur : Chill
  🔊 🔥┃Activité : Énergique
  🔊 📱┃TikTok : Offline
```

### 5.11 📚 Narrative memory (30 jours)
**Fichiers :** `db/narrativeMemory.js` · `crons.js`

Cron quotidien à 02:00 — Claude analyse les 50 derniers messages serveur et en extrait 3-4 arcs narratifs injectés dans tous les prompts pendant 30 jours.

### 5.12 📊 Topic fatigue
**Fichiers :** `db/topicFatigue.js`

8 catégories trackées (gaming, anime, tech, débat, musique, crypto, politique, sport). Si un sujet a été mentionné > 5 fois cette semaine → Brainee l'évite.

### 5.13 🤔 Decision logic (autonomie de refus)
**Fichiers :** `features/decisionLogic.js`

Brainee peut refuser de répondre si `mentalLoad > 80` + vibe `introvert`/`lazy`, ou si redondance de sujet. ⚠️ Depuis **v2.2.5**, **jamais en silence sur les @mentions** : elle répond avec délai et signale par un emoji contextuel (😒/😴/👀/🔕/💤).

### 5.14 ✨ Reaction scan passif
**Fichiers :** `crons.js` (reactionScanCron) · `bot/reactions.js`

Toutes les 20 min, scan des messages < 25 min et ajout d'emojis de réaction. Présence visible sans spam, fréquence modulée par la `chattiness` de la vibe.

### 5.15 👋 Welcome
**Fichiers :** `features/welcome.js`

Embed personnalisé à l'arrivée + auto-rôle configurable depuis le dashboard.

### 5.16 💰 Soutien Brainee
**Fichiers :** `features/supportChannel.js` · `project/funding.js` · `config/channelManager.js`

- Embed unique dans un salon dédié, avec coûts du mois (serveur ~4.6€, Claude ~22€).
- ID de l'embed persisté dans `src/config/channels.json` + scan des 50 derniers messages au boot pour ne **jamais** dupliquer après un déploiement.
- Statut Discord du bot mis à jour : `💰 4.5€/26.6€`.
- Section dédiée du dashboard avec historique sur 12 mois.

### 5.17 🎬 Réponses différées
**Fichiers :** `features/delayedReply.js` · `crons.js`

File d'attente de réponses programmées au lendemain (vibe `defer_tomorrow`). `postRelanceMention` charge les 30 derniers messages avant de répondre — Brainee ne perd plus le fil.

---

## 6. Comment ça marche techniquement

### Les 3 technologies cœur

#### 6.1 Discord.js v14
La télécommande pour Discord. Intents activés dans `server.js` :
`Guilds`, `GuildMembers`, `GuildMessages`, `MessageContent`, `GuildMessageReactions`, `DirectMessages`.

```js
const channel = await discord.channels.fetch(id);
await channel.send('Coucou!');

discord.on(Events.MessageCreate, msg => { /* … */ });
```

#### 6.2 Claude (Anthropic API)
Appelé exclusivement via `src/ai/claude.js`. Le client est **instrumenté pour la santé** :

```js
shared.claudeHealth = {
  totalCalls, totalErrors, consecutiveErrors,
  lastCall, lastSuccess, lastError, lastErrorMsg, lastLatencyMs
}
```

Modèle par défaut : `claude-opus-4-7`.

#### 6.3 MongoDB
Connexion async dans `src/db/index.js`, exposée via `shared.mongoDb`. Toutes les routes vérifient `if (!shared.mongoDb)` avant de requêter — pas de crash si la DB est down, juste un fallback gracieux.

### Le flux d'une réponse à @mention (v2.2.5+)

```
MESSAGE: "@Brainee t'en penses quoi de Zelda ?"
   ↓
1. CONTEXTE
   - profil + bond (memberBonds)
   - vibe canal (channelIntel)
   - 5 derniers messages (channelMemory)
   - arcs narratifs serveur (narrativeMemory)
   - topic fatigue check
   ↓
2. DÉCISION (decisionLogic)
   - vibe lazy + mentalLoad élevé → 'delay 3-15 min' (plus jamais 'skip')
   - vibe focus / hors slot sommeil → 'delay 10-30 min'
   ↓
3. SIGNALEMENT ÉMOTIONNEL (si délai)
   - emoji contextuel sur le message original :
     😒 grumpy · 😴 lazy · 👀 introvert · 🔕 focus · 💤 sommeil
   ↓
4. PROMPT
   - persona.js (qui je suis)
   - emotions.js (mon état actuel)
   - bond avec ce membre
   - arcs narratifs + contexte canal
   ↓
5. CLAUDE → réponse brute
   ↓
6. HUMANIZE → slang, drops, abréviations
   ↓
7. MESSAGING → typing + délai dactylographique + mentions résolues
   ↓
✅ POSTÉ
```

### Le flux d'un changement dashboard

```
Click "Mute 1h"
   ↓
fetch POST /api/members/:id/mute  (discordActionLimiter, 10/min)
   ↓
guild.members.fetch + member.timeout(...)
   ↓
auditLog('member.mute', { id, username, duration })
   ↓
broadcast WebSocket → toutes les sessions reçoivent l'update
   ↓
✅ Toast + UI à jour partout
```

---

## 7. La vie émotionnelle de Brainee

### Les 4 couches

```
COUCHE 1 — TEMPÉRAMENT          (rare, base)
  → "Plutôt extrovertie, curieuse, attentionnée"
  → ne change quasiment jamais

COUCHE 2 — ÉTATS INTERNES       (sliders persistants)
  → energy, socialNeed, calmNeed, stimulation,
    mentalLoad, recognitionNeed     (0-100, modifiables depuis l'admin live)
  → décroissance lente : ~18-24h depuis v2.2.2
  → résidus 15-20% : une émotion vive ne disparaît jamais à 100%

COUCHE 3 — ÉMOTIONS VIVES       (au moment, contextuelles)
  → empilées dans emotionStack
  → pic à la mention d'un sujet préféré, baisse en cas de tension

COUCHE 4 — BONDS PAR MEMBRE     (relationship)
  → attachment · trust · social_comfort · emotional_trajectory
  → stockés dans memberBonds
```

### Les vibes journalières

Chaque jour, `bot/adaptiveSchedule.js` choisit une vibe qui module presque tout :

| Vibe | Effet |
|---|---|
| `chatty` | Brainee parle plus, anecdotes + actus + reactions ↑ |
| `introvert` | Conversations rares, +18% de délai sur les @mentions |
| `lazy` | Délai sur tout, anecdote possiblement skippée |
| `grumpy` | Ton plus sec, emoji 😒 sur les délais |
| `focus` | Concentrée, peu de bavardage, emoji 🔕 sur les délais |
| `impulsive` | Réactions plus rapides, plus d'emojis |
| `nostalgic` | Sujets rétro privilégiés |

### Les 6 sliders (admin live)

Modifiables en direct depuis le dashboard (`POST /api/admin/state`) :

| Slider | Effet |
|---|---|
| `energy` | Vitesse + verbosité |
| `socialNeed` | Initie plus de conversations |
| `calmNeed` | Évite les sujets clivants |
| `stimulation` | Cherche le débat / les sujets nouveaux |
| `mentalLoad` | > 80 → peut refuser de répondre |
| `recognitionNeed` | Plus sensible aux compliments / ignorements |

### Une journée racontée

```
07:30  ⏰  Réveil → vibe="chatty" + mood="energetic" + arcs narratifs chargés
09:30  📖  Anecdote ("Saviez-vous que dans FFVII…")
10-19  💬  Conversations + reply 45min + reactions 20min
12:00  🍱  Greeting midi
15:00  🚧  Drift check → relance #jrpg
19:00  🌆  Greeting soir
22:00  📊  Sidebar update
23:59  💾  Sauvegarde émotions vers MongoDB
03:00  🌙  Nightwakeup (rare, vibes-dépendant)
```

---

## 8. Sécurité, robustesse & rate limiting

### 4 niveaux de rate limiting (`src/api/rateLimits.js`)

| Limiteur | Quota | Routes |
|---|---|---|
| `claudeLimiter` | **5/min** | `/anecdote`, `/actus`, `/conversation`, `/morning`, `/goodnight`, `/nightwakeup` |
| `discordActionLimiter` | **10/min** | mute, kick, ban, gestion des rôles, suppression de salons/rôles |
| `backupLimiter` | **3 / 10 min** | `/api/backup` |
| `generalLimiter` | **60/min** | tout `/api/*` (filet de sécurité) |

Sans ça, n'importe qui connaissant le port pouvait déclencher des appels Claude payants en boucle.

### Logs explicites (v2.2.6)
Tous les `.catch(() => {})` critiques (persistance émotions, sidebar, funding, mémoire canal) → `pushLog('ERR', message, 'error')`. Plus aucun échec silencieux.

### TikTok robustness (v2.2.9)
- **timeout 15s** sur `connect()` via `Promise.race`
- **nettoyage écouteurs** (`removeAllListeners` + `disconnect`) sur connexion ratée
- **garde-fou liveActive** : reset forcé après 12 h coincé en `true`
- **resetLiveState()** centralisé pour éviter la duplication

### Audit trail (`src/audit.js`)
Ring buffer 500 entrées, exposé via `GET /api/audit` et stream `auditUpdate` en WebSocket. Toutes les actions destructives (channel.delete, role.delete, member.ban/kick/mute, backup.delete, config.update, …) y sont enregistrées.

### Backups sécurisés
`safeBackupName()` rejette tout nom n'ayant pas le préfixe `backup_` + extension `.json`, ou contenant `..`, `/`, `\` — pas de path traversal possible.

### Vulnérabilités npm (v2.2.8)
12/14 corrigées. Les 2 résiduelles concernent la chaîne TikTok upstream et sont documentées.

---

## 9. Le dashboard web

URL : `http://localhost:3000` — frontend vanilla, pas de bundler.

### Architecture frontend (depuis v2.3.1)

```
public/
├── index.html       structure + balises <section>
├── app.css          styles + 3 thèmes (light / dark / sombre)
├── mobile.css       responsive + tiroir de navigation
└── js/              21 modules
    ├── core.js              state, theme, toast, api, liveSave, utils
    ├── websocket.js         connectWS, handleWS, updateWsPill, refreshTopbar
    ├── navigation.js        navigate, renderCurrentSection, sidebar mobile
    ├── modal.js             confirmAction, openModal, openCreate*
    ├── actions.js           action(), deleteChannel(), deleteRole()
    ├── section-overview.js
    ├── section-admin.js
    ├── section-health.js
    ├── section-logs.js
    ├── section-discord.js   (salons + rôles)
    ├── section-members.js
    ├── section-automations.js
    ├── section-posts.js
    ├── section-emotions.js
    ├── section-bonds.js
    ├── section-schedule.js
    ├── section-backups.js
    ├── section-audit.js
    ├── section-settings.js
    ├── section-funding.js
    └── boot.js              init, listeners, chargement initial
```

> Le scope global est volontairement utilisé — chaque module attache ses fonctions à `window`. Pas de bundler, pas de transpilation.

### Les 16 sections

| Groupe | Section | Rôle |
|---|---|---|
| **Live** | 📊 Vue d'ensemble | Stats globales, slot, humeur, logs récents, actions rapides |
| | 🎛️ Admin live | Override slot, mood, sliders émotionnels, TikTok, sidebar refresh |
| | ❤️ Santé système | Discord/Mongo/Claude — ping, latence, mémoire, uptime |
| | 📜 Logs | Stream WS + filtre source/niveau |
| **Serveur** | 💬 Salons | Arborescence catégories/salons, CRUD |
| | 🎭 Rôles | Liste triée, création colorée, suppression confirmée |
| | 👥 Membres | Liste + recherche + 4 tris + sanctions + rôles |
| **Bot** | ⚡ Automatisations | Anecdotes, actus, conversations, greetings, TikTok, drift |
| | 📝 Posts manuels | Texte ou embed avec aperçu live |
| | 💗 Émotions | Coeur émotionnel : sliders + temperament + emotion stack |
| | 💞 Relations | Bonds par membre (top 50 par attachement) |
| | 🗓️ Planning | Grille 24h × 3 types de jours, slot courant surligné |
| **Système** | 💾 Backups | Liste, download, suppression, restauration de config |
| | 📖 Historique | Audit log (ring buffer 500) |
| | ⚙️ Paramètres | Sync, auto-rôle, welcome, thème |
| | 💰 Soutien | Coûts mensuels, dons, historique 12 mois |

### UX

- **3 thèmes** (light / dark / sombre) persistés en `localStorage`
- **Pill WebSocket** 3 états (connecté / reconnexion / hors-ligne) avec chrono
- **Toasts** non bloquants pour chaque action
- **Confirmations modales** sur toute action destructive
- **Mobile** : tiroir overlay + bouton hamburger dans la topbar
- **Topbar pills** : membres, slot, humeur, soutien, état WS

---

## 10. API HTTP & WebSocket

### Convention

- Toutes les routes sont sous `/api/*`
- Réponse standard : `{ ok: true, ... }` ou `{ ok: false, error: "..." }`
- Toutes les routes passent par `generalLimiter` (60/min)
- Les routes "lourdes" ont un limiteur plus strict (voir [§8](#8-sécurité-robustesse--rate-limiting))

### Endpoints — par sous-routeur

#### `routes/index.js` — racine

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/state` | État serveur (rôles, salons, structure, membres) |
| GET | `/api/logs` | Historique des logs |
| GET | `/api/config` | Config bot |
| POST | `/api/config` | Mise à jour `{ section, data }` |

#### `routes/discord.js` — Discord (canaux, rôles, sync, posts)

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/sync/discord-to-file` | Force sync Discord → fichier |
| POST | `/api/sync/file-to-discord` | Force sync fichier → Discord |
| POST | `/api/categories` | Créer une catégorie |
| POST | `/api/channels` | Créer un salon |
| PATCH/DELETE | `/api/channels/:id` | Modifier / supprimer (DELETE = `discordActionLimiter`) |
| POST | `/api/roles` | Créer un rôle |
| DELETE | `/api/roles/:id` | Supprimer (`discordActionLimiter`) |
| GET/POST | `/api/autorole` | Lire / définir le nom de l'auto-rôle |
| POST | `/api/welcome/test` | Tester l'embed de bienvenue |
| POST | `/api/tiktok/test` | Forcer la connexion TikTok |
| POST | `/api/post` | Post manuel (texte ou embed) |

#### `routes/bot.js` — actions IA (toutes `claudeLimiter`)

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/anecdote` | Poster une anecdote |
| POST | `/api/actus` | Poster les actus (`?force=true`) |
| POST | `/api/conversation` | Lancer une conversation aléatoire |
| POST | `/api/conversation/reply` | Répondre aux conversations en cours |
| POST | `/api/morning` · `/goodnight` · `/nightwakeup` | Tester un greeting |
| POST | `/api/drift/check` | Forcer un drift check (sans limiter) |

#### `routes/members.js`

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/members` | Liste + bonds joints |
| GET | `/api/members/profiles` | Top 50 profils par interactions |
| POST | `/api/members/:id/mute` | Timeout (durée en min) |
| POST | `/api/members/:id/kick` |  |
| POST | `/api/members/:id/ban` |  |
| PATCH | `/api/members/:id/roles` | `{ addRoles, removeRoles }` |

#### `routes/admin.js` — pilotage live

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/status` | État complet pour le panneau admin |
| POST | `/api/admin/mood` | Forcer une humeur |
| POST | `/api/admin/mood/reroll` | Re-tirer l'humeur du jour |
| POST | `/api/admin/slot` | Forcer un statut de slot |
| POST | `/api/admin/state` | Slider `{ key, value 0-100 }` |
| POST | `/api/admin/tiktok` | Override état TikTok |
| POST | `/api/admin/sidebar/refresh` | Refresh manuel de la sidebar |

#### `routes/data.js` — lecture seule

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Discord / Mongo / Claude (mémoire, uptime, erreurs) |
| GET | `/api/slot` · `/api/schedule` | Slot courant + grille hebdomadaire |
| GET | `/api/channel-memory[/:id]` | Mémoire canal (résumé) |
| GET | `/api/dm-history/:userId` | Historique DM |
| GET | `/api/channel-directory` | Catalogue des salons |
| GET | `/api/emotions/state` | Tempérament + states + emotion stack |
| GET | `/api/emotions/bonds` | Top 50 bonds |
| GET | `/api/emotions/bonds/:userId` | Bond d'un membre |
| GET | `/api/audit` | Audit trail (`?limit` ≤ 500) |
| GET | `/api/project/funding` | Coûts + total dons + reste à financer |
| POST | `/api/project/donation` | `{ amount }` → met à jour le statut Discord |
| GET | `/api/project/funding/history` | Historique 12 mois |

#### `routes/backups.js`

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/backup` | Créer un backup (`backupLimiter`) |
| GET | `/api/backups` | Lister |
| GET | `/api/backups/:name/download` | Télécharger |
| DELETE | `/api/backups/:name` | Supprimer |
| POST | `/api/backups/:name/restore-config` | Restaurer la config |

### WebSocket — `ws://localhost:3000`

À la connexion, le serveur envoie `state`, `logs`, `stats`. Ensuite il pousse :

| Event | Payload | Quand |
|---|---|---|
| `state` | guildState complet | Connexion |
| `logs` | array | Connexion |
| `stats` | `{ d2f, f2d, startTime }` | Connexion |
| `logUpdate` | log entry | Nouveau log |
| `auditUpdate` | audit entry | Nouvelle action |
| `configUpdate` | `{ section, data }` | Config modifiée |
| `adminUpdate` | `{ type, value, ... }` | Mood / slot / state / tiktok forcés |
| `tiktokLive` | `{ status, title, viewers }` | Live démarre/s'arrête |
| `fundingUpdate` | `{ totalDonated, totalCosts, remaining }` | Don enregistré |

---

## 11. Tests & CI

### Suite Jest (`tests/`)

| Fichier | Lignes | Couvre |
|---|---:|---|
| `audit.test.js` | 123 | ring buffer, troncature, ordre |
| `emotions.test.js` | 229 | décroissance, résidus, stack |
| `funding.test.js` | 69 | calcul coûts, dons, statut Discord |
| `mood.test.js` | 102 | sélection, refresh, reroll |
| `scheduling.test.js` | 188 | slots semaine/we, forced slot, fuseau Paris |

→ **87 tests** au total, exécutables via :

```bash
npm test
```

### CI GitHub Actions (`v2.3.3`)

`.github/workflows/tests.yml` — déclenchée sur :
- chaque `push` (toutes branches)
- chaque `pull_request` vers `main` ou `master`

Étapes :
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 18, cache npm)
3. `npm ci`
4. `npm test`

Le badge en tête du README reflète l'état du dernier run.

---

## 12. Les fichiers et leur rôle

### Arborescence complète

```
brainexe-dashboard/
│
├── server.js                       ⭐ Entry point (~150 lignes)
│   └─ Lance Discord client + Express + WebSocket
│      Sur 'ready' : enregistre events, démarre les crons,
│                    rattrape anecdote/actus, init soutien
│
├── src/
│   ├── config.js                   🔑 Lit le .env (TOKEN, PORT, GUILD_ID, …)
│   ├── shared.js                   📌 État partagé en mémoire
│   │                                  (discord, mongoDb, botConfig, claudeHealth,
│   │                                   syncStats, changeLog, auditLog, wss, app, …)
│   ├── logger.js                   📝 pushLog + broadcast WebSocket
│   ├── audit.js                    📖 Ring buffer 500 entrées
│   ├── crons.js                    ⏰ Orchestre tous les jobs planifiés
│   ├── botConfig.js                ⚙️ Charge/sauve brainexe-config.json
│   ├── utils.js                    🧰 Helpers (formatage, fuseau Paris, …)
│   │
│   ├── ai/
│   │   ├── claude.js               🤖 Client Anthropic + santé instrumentée
│   │   └── youtube.js              📺 Recherche YouTube Data v3
│   │
│   ├── api/
│   │   ├── rateLimits.js           🚦 4 niveaux (claude/discord/backup/general)
│   │   └── routes/
│   │       ├── index.js            🎯 Chef d'orchestre + montage des sous-routeurs
│   │       ├── discord.js          💬 Canaux, rôles, sync, post, welcome, tiktok test
│   │       ├── bot.js              🤖 anecdote, actus, conv, greetings, drift
│   │       ├── members.js          👥 mute, kick, ban, gestion des rôles
│   │       ├── admin.js            🎛️ slot, mood, sliders, tiktok, sidebar
│   │       ├── data.js             📊 health, planning, mémoires, émotions, audit, funding
│   │       └── backups.js          💾 create / list / download / delete / restore
│   │
│   ├── bot/
│   │   ├── persona.js              🎭 System prompts (l'âme de Brainee)
│   │   ├── emotions.js             💗 Système émotionnel 4 couches + persistance
│   │   ├── mood.js                 😊 Humeur du jour
│   │   ├── scheduling.js           🗓️ Slots fixes (weekday / saturday / sunday)
│   │   ├── adaptiveSchedule.js     🌗 Vibes journalières + horaires flottants
│   │   ├── channelIntel.js         📡 Compréhension par salon (topic, vibe, history)
│   │   ├── messaging.js            ✉️ Envoi humanisé + normalizeName + resolveMentions
│   │   ├── humanize.js             🎨 Slang, drops d'accents, abréviations
│   │   ├── reactions.js            ✨ Choix d'emoji contextuel
│   │   └── keywords.js             🔍 Détection mots-clés
│   │
│   ├── config/
│   │   ├── channelManager.js       🗂️ Persistance des IDs de salons importants
│   │   └── channels.json           📋 IDs persistés (salon soutien, embed soutien, …)
│   │
│   ├── db/
│   │   ├── index.js                🔌 Connexion MongoDB
│   │   ├── members.js              👤 Profils + détection préférences (tech_lover, …)
│   │   ├── memberBonds.js          💞 Liens affectifs par membre
│   │   ├── narrativeMemory.js      📚 Arcs narratifs serveur (30j)
│   │   ├── topicFatigue.js         📉 Tracker fatigue (8 catégories)
│   │   ├── channelMem.js           🧠 Mémoire par salon (résumé tournant)
│   │   ├── channelDir.js           📑 Directory des salons
│   │   ├── dmHistory.js            ✉️ Historique DM
│   │   └── botState.js             💾 État émotionnel persistant
│   │
│   ├── discord/
│   │   ├── events.js               🎮 messageCreate, memberJoin, reactionAdd, …
│   │   └── sync.js                 🔄 Discord ↔ discord-template.json + chokidar
│   │
│   ├── features/
│   │   ├── anecdotes.js            📖 Anecdote 9h30 + checkAnecdoteMissed
│   │   ├── actus.js                📰 Actus GNews 1er & 15
│   │   ├── conversations.js        💬 Conversations ambiantes + replyCron
│   │   ├── decisionLogic.js        🤔 Refus, fatigue, signalement émotionnel
│   │   ├── greetings.js            🌅 Morning / midi / soir / nightwakeup
│   │   ├── drift.js                🚧 Détecte les salons morts (4h+)
│   │   ├── tiktok.js               📱 TikTok Live Watcher (timeout, garde-fou)
│   │   ├── welcome.js              👋 Embed de bienvenue + auto-rôle
│   │   ├── sidebar.js              📊 Stats dans 5 salons vocaux
│   │   ├── supportChannel.js       💰 Salon soutien anti-doublon (scan + ID)
│   │   ├── context.js              🧵 Contexte conversationnel
│   │   ├── convStats.js            📈 Stats quotidiennes des conversations
│   │   └── delayedReply.js         ⏳ File d'attente de réponses différées
│   │
│   └── project/
│       └── funding.js              💰 Coûts mensuels, dons, statut Discord
│
├── public/
│   ├── index.html                  🖼️ Structure du dashboard
│   ├── app.css                     🎨 Styles + 3 thèmes
│   ├── mobile.css                  📱 Responsive + tiroir
│   └── js/                         🧱 Frontend en 21 modules (cf §9)
│
├── tests/                          ✅ 5 suites Jest, 87 tests
│   ├── audit.test.js
│   ├── emotions.test.js
│   ├── funding.test.js
│   ├── mood.test.js
│   └── scheduling.test.js
│
├── .github/
│   └── workflows/
│       └── tests.yml               🤖 CI Node 18 — npm ci + npm test
│
├── discord-template.json           📋 Template de structure du serveur
├── brainexe-config.json            ⚙️ Config bot persistée (créée au boot)
├── package.json                    📦 Dépendances + scripts
└── package-lock.json
```

### Lecture conseillée pour comprendre le code

1. `server.js` — voir le boot complet
2. `src/api/routes/index.js` — comprendre le routage
3. `src/discord/events.js` — voir comment Brainee reçoit un message
4. `src/features/decisionLogic.js` — voir comment elle décide
5. `src/bot/emotions.js` — voir comment elle ressent
6. `src/bot/messaging.js` + `src/bot/humanize.js` — voir comment elle envoie

---

## 13. Lancer le projet

### Prérequis

1. **Node.js 18+** (`node --version`)
2. **npm** (livré avec Node)
3. **Un serveur Discord** + droits admin du bot
4. **Un token Discord** — Discord Developer Portal
5. **Une clé Anthropic** — console.anthropic.com
6. **Une clé YouTube Data v3** — console.cloud.google.com
7. **Une clé GNews** — gnews.io
8. **Une URI MongoDB Atlas** — cloud.mongodb.com (free tier OK)

### Installation

```bash
git clone https://github.com/jRPGlibrary/brainexe-dashboard.git
cd brainexe-dashboard
npm install
```

### Fichier `.env`

```env
DISCORD_TOKEN=xxxx.yyy.zzz
GUILD_ID=1234567890

ANTHROPIC_API_KEY=sk-ant-...
YOUTUBE_API_KEY=AIza...
GNEWS_API_KEY=...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/brainexe?retryWrites=true

PORT=3000
```

### Démarrer

```bash
npm start
```

Sortie attendue :

```
🔍 DISCORD_TOKEN: true | MONGODB_URI: true
🌐 Port 3000
✅ Login OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🧠 BRAINEXE — Brainee v2.3.3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅ Bot : Brainee#1234
 ⏰ Slot : 🎮 Gaming | 🎭 Humeur : Chill | 🎨 Vibe : chatty
 🌐 Dashboard : http://localhost:3000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Tests

```bash
npm test
```

→ 87 tests verts.

### Hosting Railway

- Variables d'env à renseigner dans le projet Railway
- `npm start` est la commande par défaut
- `discord-template.json` est versionné, `brainexe-config.json` est généré au premier boot
- Penser au volume persistant pour les backups si on les veut entre deux déploiements

---

## 14. Erreurs fréquentes & solutions

### ❌ "Bot logged in but isn't responding"
**Cause :** intents manquants ou bot pas invité au bon serveur.
**Fix :** vérifier que `MessageContent` est activé dans Discord Developer Portal + que `GUILD_ID` matche.

### ❌ `Cannot find module 'discord.js'`
**Fix :** `npm install`.

### ❌ `MONGODB_URI not found` ou timeout MongoDB
- Le `.env` n'est pas à la racine
- L'URI ne contient pas le bon mot de passe
- L'IP du serveur n'est pas whitelistée dans MongoDB Atlas (`0.0.0.0/0` pour tester)

### ❌ Dashboard "Connecting…" infini
- Le serveur n'écoute pas → `npm start`
- Mauvais port → vérifier `.env` et la console
- Bloqué par un firewall — ouvrir 3000

### ❌ `Claude API error: 401 Unauthorized`
**Fix :** régénérer la clé Anthropic.

### ❌ "Trop de requêtes — max 5 appels Claude par minute"
Le `claudeLimiter` te bloque. Attends 1 min ou fais moins d'actions IA.

### ❌ Salon soutien re-créé à chaque déploiement
Résolu en **v2.2.4** : `channels.json` versionné + scan des 50 derniers messages au boot. Si ça se reproduit, supprimer `supportEmbedMessageId` dans `src/config/channels.json` et laisser Brainee re-scanner.

### ❌ TikTok Live coincé en `online`
Résolu en **v2.2.9** : garde-fou 12 h. Sinon `POST /api/admin/tiktok { live: false }`.

### ❌ Ma vibe est nulle aujourd'hui
`POST /api/admin/mood/reroll` ou bouton "Re-tirer" dans la section 🎛️ Admin live.

---

## 15. Ressources & FAQ

### Liens utiles

- **Discord Developer Portal** — https://discord.com/developers/applications
- **MongoDB Atlas** — https://www.mongodb.com/cloud/atlas
- **Anthropic Console** — https://console.anthropic.com
- **GNews** — https://gnews.io
- **Google Cloud (YouTube)** — https://console.cloud.google.com

### FAQ

**Q. Comment ajouter une nouvelle fonctionnalité ?**
1. Créer le fichier dans `src/features/`
2. Si elle est planifiée → l'ajouter dans `src/crons.js`
3. Si elle a une route → créer/étendre un fichier dans `src/api/routes/`
4. Côté frontend → créer ou compléter une `section-*.js` dans `public/js/`
5. Écrire un test dans `tests/` si la logique le mérite

**Q. Comment changer le modèle Claude ?**
Édit `src/ai/claude.js` — variable `MODEL`. Aujourd'hui : `claude-opus-4-7`.

**Q. Comment forcer une humeur en prod ?**
Section "🎛️ Admin live" du dashboard ou `POST /api/admin/mood { mood: "chill" }`.

**Q. Les émotions sont-elles du machine learning ?**
Non — heuristiques + état persistant + injection dans le prompt. Mais le résultat se ressent comme une vraie personnalité.

**Q. Pourquoi pas un framework frontend ?**
Volonté assumée : pas de bundler, pas de build, ouvre `index.html` et ça marche. Les 21 modules tiennent ensemble par le scope global.

**Q. Pourquoi des routes éclatées ?**
Avant v2.3.0, `routes.js` faisait 430 lignes. Naviguer/modifier devenait pénible. Découpé par thème pour qu'on trouve sans fouiller.

**Q. Combien ça coûte par mois ?**
Affiché dans la section 💰 Soutien : ~4.6€ serveur + ~22€ Claude (peut varier).

**Q. Plusieurs bots possible sur le même serveur ?**
Oui techniquement, mais ils partageraient `botConfig` et MongoDB — à adapter.

---

## ✨ Fin

Tu as la **BIBLE COMPLÈTE** du projet à la version **2.3.3**.
Tu sais :
- ce que Brainee fait, et pourquoi elle le fait comme ça
- comment les pièces s'assemblent (Discord, Claude, Mongo, dashboard)
- où vit chaque morceau de code
- comment lancer, tester, déployer
- comment diagnostiquer les pannes courantes

**Bienvenue dans BrainEXE** 🧠✨

