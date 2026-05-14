# CLAUDE.md — BrainEXE / Brainee Bot

> Lis ce fichier EN ENTIER avant toute action. Il remplace le scan du projet.

---

## ⚡ RÈGLES ABSOLUES

1. **NE JAMAIS modifier du code existant qui fonctionne** pour ajouter une feature
2. **NE JAMAIS utiliser `discord.once('clientReady')`** → l'event correct est `'ready'`
3. **`brainexe-config.json` est éphémère sur Railway** → ne jamais en dépendre pour la persistance critique
4. **Ne pas bloquer le boot** → toute opération async au démarrage doit être non-bloquante (Railway envoie SIGTERM si le event loop se fige)
5. **Livrer toujours le fichier complet** — jamais de patch partiel
6. **Tester avec `npm test` après chaque changement** → 133 tests Jest doivent rester verts

---

## 📐 STYLE DE RÉPONSE

- Max 25 mots entre deux appels d'outils
- Max 100 mots pour les réponses finales
- Code only quand c'est du code — pas de blabla autour
- Avant toute modification importante → `/compact`

---

## 🏗️ STACK

| Couche | Techno |
|---|---|
| Runtime | Node.js 18+ |
| Bot | discord.js **v14** |
| IA | Anthropic Claude (`claude-sonnet-4-6`) |
| DB | MongoDB Atlas |
| Hosting | Railway (auto-deploy GitHub) |
| Repo | `github.com/jRPGlibrary/brainexe-dashboard` |
| Dashboard | Express 4 + WebSocket + vanilla JS (38 modules, no bundler) |
| Tests | Jest 30 — 7 suites, 133 tests |

---

## 🗂️ CARTE DU PROJET (ne pas scanner — utiliser cette carte)

```
server.js                    ← Entry point (~150 lignes) — NE PAS TOUCHER sauf boot
src/
  config.js                  ← Variables d'env (.env)
  shared.js                  ← État partagé mémoire (discord, mongo, botConfig…)
  logger.js                  ← pushLog + broadcast WebSocket
  audit.js                   ← Ring buffer 500 entrées
  crons.js                   ← Tous les jobs planifiés (node-cron)
  botConfig.js               ← Lecture/écriture brainexe-config.json
  utils.js                   ← Helpers (fuseau Paris, formatage…)
  ai/
    claude.js                ← Client Anthropic instrumenté — callClaude()
    youtube.js               ← YouTube Data v3
  api/
    rateLimits.js            ← 4 niveaux (claude/discord/backup/general)
    routes/
      index.js               ← Chef d'orchestre routes
      discord.js             ← Canaux, rôles, sync, post
      bot.js                 ← anecdote, actus, conv, greetings, drift
      members.js             ← mute, kick, ban, rôles
      admin.js               ← mood, slot, state, tiktok overrides
      data.js                ← health, slot, schedule, emotions, bonds, audit
      backups.js             ← CRUD backups
  bot/
    persona.js               ← Personnalité Brainee (NE PAS MODIFIER le caractère)
    emotions.js              ← Stack émotionnel (décroissance, résidus)
    emotionCombos.js         ← Combinaisons d'émotions
    mood.js                  ← Humeur du jour (energique/chill/hyperfocus/zombie)
    scheduling.js            ← Slots horaires (weekday/Saturday/Sunday)
    adaptiveSchedule.js      ← Adaptation dynamique des slots
    channelIntel.js          ← Vibe + discipline salon
    messaging.js             ← Envoi messages Discord
    humanize.js              ← Post-processing humain (mémoire narrative, VIP…)
    reactions.js             ← Emojis autonomes (10% emoji-only path)
    keywords.js              ← Détection mots-clés
    hyperFocus.js            ← Détection hyperfocus
    vulnerability.js         ← Détection vulnérabilité membre
  config/
    channelManager.js        ← Gestion des salons
    channels.json            ← Config salons statique
  db/
    index.js                 ← Connexion MongoDB Atlas
    members.js               ← Profils membres (toneScore, topics, interactionCount…)
    memberBonds.js           ← Liens affectifs membres
    memberStories.js         ← Histoires membres
    narrativeMemory.js       ← Mémoire narrative serveur (30j)
    tasteProfile.js          ← Goûts/préférences membres
    topicFatigue.js          ← Fatigue sujets sur-vus
    vipSystem.js             ← Système VIP
    tokenUsage.js            ← Tracking tokens Anthropic
    channelMem.js            ← Mémoire conversationnelle par salon
    channelDir.js            ← Channel directory (16 types, getChannelIntentBlock)
    dmHistory.js             ← Historique DMs (collection dmHistory)
    botState.js              ← État persisté bot
    intelligentMemory.js     ← Compaction mémoire (compactMemory, formatSmartMemory)
  discord/
    events.js                ← Intercepte messageCreate + décision pipeline
    sync.js                  ← Sync template Discord ↔ fichier
  features/
    anecdotes.js             ← Anecdotes gaming autonomes
    actus.js                 ← Actus gaming (GNews + fallback Claude)
    conversations.js         ← Logique conversation enrichie
    decisionLogic.js         ← Décision centrale : répondre ou ignorer
    greetings.js             ← Morning, lunch, goodnight, night wakeup
    drift.js                 ← Détection dérive thématique (4 niveaux)
    tiktok.js                ← TikTok Live Connector
    welcome.js               ← Accueil nouveaux membres
    sidebar.js               ← Sidebar Discord
    supportChannel.js        ← Salon soutien anti-doublon
    proactiveOutreach.js     ← Pensées spontanées + callbacks VIP
    hyperFocusRevisit.js     ← Retours différés 2-14h sur obsessions
    extendedPermissions.js   ← Pins intelligents + mini-sondages
    context.js               ← Contexte conversationnel
    convStats.js             ← Stats quotidiennes conversations
    delayedReply.js          ← File d'attente réponses différées
  project/
    funding.js               ← Coûts mensuels, dons, statut Discord
public/
  index.html                 ← Structure dashboard
  app.css                    ← Styles + 3 thèmes
  mobile.css                 ← Responsive + tiroir
  js/ (38 modules)           ← Frontend scope global, pas de bundler
tests/                       ← 7 suites Jest (133 tests)
.github/workflows/tests.yml  ← CI Node 18
```

---

## 🤖 BRAINEE — PERSONNALITÉ (ne jamais altérer)

- **Qui** : IA féminine 24 ans, version féminine de Matthieu (fondateur BrainEXE)
- **Traits** : internet-native, passionnée gaming, énergie hyperfocus/chaotique, loyalty forte, honnête, présente quand ça compte, ghosts ses propres débats
- **INTERDIT** : adoucir le caractère, ajouter des questions forcées, changer le ton de base
- **Humeurs** : `energique` / `chill` / `hyperfocus` / `zombie`

---

## 🗄️ MONGODB — COLLECTIONS CLÉS

| Collection | Contenu |
|---|---|
| `members` | Profils (toneScore 1-10, topics, interactionCount, lastSeen, receptiveToBanter) |
| `memberBonds` | Liens affectifs |
| `dmHistory` | Historique DMs (variant persona intime) |
| `channelMemory` | Mémoire conversationnelle par salon |
| `channelDirectory` | 16 types de salons + contraintes écriture |

---

## ⚠️ BUG HISTORIQUE CRITIQUE

```
// ❌ FAUX — n'existe pas en discord.js v14
client.once('clientReady', ...)

// ✅ CORRECT
client.once('ready', ...)
```

---

## 🚀 DÉPLOIEMENT

```bash
git add .
git commit -m "feat: description"
git push
# → Railway auto-deploy depuis GitHub main
```

---

## 🔑 VARIABLES D'ENV REQUISES

```
DISCORD_TOKEN
GUILD_ID=1481022956816830669
ANTHROPIC_API_KEY
YOUTUBE_API_KEY
GNEWS_API_KEY
MONGODB_URI
PORT (défaut 3000)
```

---

## 📋 AVANT DE CODER — CHECKLIST

- [ ] `/compact` si session longue
- [ ] Lire UNIQUEMENT le(s) fichier(s) concerné(s) — pas tout le projet
- [ ] Vérifier que la feature ne casse rien d'existant
- [ ] `npm test` → 133 tests verts
- [ ] Livrer le fichier complet (jamais de patch)
