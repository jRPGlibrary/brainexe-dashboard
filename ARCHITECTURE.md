# ARCHITECTURE.md — BrainEXE / Brainee Bot

> Référence architecture complète. Ne pas scanner le projet — utiliser cette carte.
> Règles de dev → `CLAUDE.md`

---

## 🗂️ CARTE DU PROJET

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
    steam.js                 ← Steam API (jeux tendance, promos)
  api/
    rateLimits.js            ← 4 niveaux (claude/discord/backup/general)
    auth.js                  ← Middleware auth session (cookie + TOTP)
    totp.js                  ← 2FA TOTP (speakeasy + qrcode)
    audit-advanced.js        ← Audit avancé (filtres, CSV export)
    monitoring.js            ← Métriques système (mémoire, uptime, CPU)
    routes/
      index.js               ← Chef d'orchestre routes
      discord.js             ← Canaux, rôles, sync, post
      bot.js                 ← anecdote, actus, conv, greetings, drift
      members.js             ← mute, kick, ban, rôles
      admin.js               ← mood, slot, state, tiktok overrides
      data.js                ← health, slot, schedule, emotions, bonds, audit
      backups.js             ← CRUD backups
      analytics.js           ← Analytics dashboard (top membres, tokens, stats)
      audit.js               ← Ring buffer audit — lecture + export CSV
      being.js               ← 14 endpoints vie intérieure BRAINEE-LIVING
      monitoring.js          ← Routes métriques système
  being/                     ← BRAINEE-LIVING — vie intérieure simulée (v0.11.0)
    CLAUDE.md                ← Règles spécifiques module being
    index.js                 ← Orchestrateur 12 modules
    consciousness.js         ← Inner monologue + métacognition
    emotions.js              ← 32 émotions humaines + conflits + résidus
    identity.js              ← SOI persistant + traits acquis
    memory.js                ← Mémoire stratifiée + souvenirs involontaires
    desires.js               ← Besoins, envies, aspirations
    fears.js                 ← Peurs existentielles + crises
    dreams.js                ← Rêves nocturnes (3h-7h)
    decisions.js             ← Délibération multi-voix + 15% imprévisibilité
    expression.js            ← Style adaptatif + emotional leakage
    relationships.js         ← Bonds profonds + ruptures + repair
    evolution.js             ← Évolution quotidienne + extraction sagesse
    existence.js             ← Sens, mortalité, ethics, legacy
    schemas.js               ← 17 collections MongoDB being.*
    lifecycle.js             ← Cycles minute/30min/horaire/nocturne/hebdo
    safeguards.js            ← Garde-fous éthiques (3114, anti-dépendance…)
    prompts.js               ← Prompts système + guidelines
  bot/                       ← Comportements Discord de Brainee
    CLAUDE.md                ← Règles spécifiques module bot
    persona.js               ← Personnalité Brainee (NE PAS MODIFIER)
    emotions.js              ← Stack émotionnel (décroissance, résidus)
    emotionCombos.js         ← Combinaisons d'émotions
    mood.js                  ← Humeur du jour (energique/chill/hyperfocus/zombie)
    scheduling.js            ← Slots horaires (weekday/Saturday/Sunday)
    adaptiveSchedule.js      ← Adaptation dynamique des slots
    channelIntel.js          ← Vibe + discipline salon
    channelPostTracker.js    ← Suivi posts par salon
    messaging.js             ← simulateDmTyping + sendHuman + multimodal
    humanize.js              ← Post-processing humain + 3 filtres anti-IA
    dailyCache.js            ← Cache quotidien (reset à minuit)
    reactions.js             ← Emojis autonomes (10% emoji-only path)
    keywords.js              ← Détection mots-clés
    hyperFocus.js            ← Détection hyperfocus
    vulnerability.js         ← Détection vulnérabilité membre
    currentActivity.js       ← Activité courante du bot
    currentGame.js           ← Jeu actuel détecté
    actions.js               ← Actions bot (commandes internes)
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
    crossChannelMem.js       ← Mémoire croisée inter-salons
    messageEngagement.js     ← Tracking engagement par message (réactions, replies)
  discord/
    events.js                ← Intercepte messageCreate + décision pipeline
    sync.js                  ← Sync template Discord ↔ fichier
  features/
    anecdotes.js             ← Anecdotes gaming autonomes
    actus.js                 ← Actus gaming multi-sources (GNews·NewsAPI·Reddit·IGDB)
    conversations.js         ← Logique conversation enrichie
    decisionLogic.js         ← Décision centrale : répondre ou ignorer
    greetings.js             ← Morning, lunch, goodnight, night wakeup
    greetingVariants.js      ← Seed bank greetings (zéro répétition)
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
    dmOutreach.js            ← DM spontané aux VIP absents 3j+
    dmServerBridge.js        ← Enrichissement croisé DM ↔ Serveur
    channelWatcher.js        ← Exploration proactive de tous les salons
    conviction.js            ← Détection insistance / contradiction membre
    attachmentStages.js      ← Étapes d'attachement singulier
    emotionalRefusal.js      ← Refus émotionnel avec cooldown
    imageAttachments.js      ← Extraction + formatage images (vision multimodal)
    busyExcuse.js            ← Système "j'suis occupée" + excuse IA
    presenceManager.js       ← Statut Discord dynamique (dnd/idle/online)
    ownerBriefing.js         ← Briefing quotidien owner (résumé activité)
  project/
    funding.js               ← Coûts mensuels, dons, statut Discord
public/
  index.html                 ← Structure dashboard
  app.css                    ← Styles + 3 thèmes
  mobile.css                 ← Responsive + tiroir
  js/                        ← 38 modules frontend (scope global, pas de bundler)
    CLAUDE.md                ← Règles spécifiques frontend
    boot.js · core.js · websocket.js · charts.js
    navigation.js · modal.js · notifications.js
    section-*.js (17 sections) · auth.js · hotkeys.js
    analytics-dashboard.js · theme-customizer.js · export.js
    favorites.js · search.js · readonly.js · customizable.js
    logs-pagination.js · log-filters.js · push-notifications.js
    backup-restore.js · actions.js
tests/                       ← 10 suites Jest, 212 tests
.github/workflows/tests.yml  ← CI Node 20
```

---

## 🗄️ MONGODB — COLLECTIONS CLÉS

| Collection | Contenu |
|---|---|
| `members` | Profils (toneScore 1-10, topics, interactionCount, lastSeen, receptiveToBanter) |
| `memberBonds` | Liens affectifs |
| `memberStories` | Mémoire narrative par membre (sujets, blagues, moments) |
| `dmHistory` | Historique DMs (variant persona intime) |
| `channelMemory` | Mémoire conversationnelle par salon |
| `channelDirectory` | 16 types de salons + contraintes écriture |
| `narrativeMemory` | Arcs narratifs serveur (30j) |
| `tasteProfile` | Goûts, genres, vibes et évitements détectés |
| `topicFatigue` | Fatigue par sujet (8 catégories) |
| `vipSystem` | Tiers VIP (Superfan / Fidèle / Actif / Standard) |
| `tokenUsage` | Tracking tokens Anthropic par membre |
| `botState` | État émotionnel persistant du bot |
| `smartMemory` | Compaction mémoire intelligente cross-collection |
| `crossChannelMemory` | Mémoire croisée inter-salons |
| `messageEngagement` | Tracking réactions/replies par message |
| `being.*` | 17 collections vie intérieure (innerMonologue, dreams, traumas…) |

---

## 🔄 FLUX DE DÉCISION (messageCreate)

```
discord/events.js
  → features/decisionLogic.js   (répondre ou ignorer ?)
  → features/conversations.js   (contexte enrichi)
  → src/ai/claude.js            (callClaude)
  → bot/humanize.js             (filtres anti-IA)
  → bot/messaging.js            (envoi avec typing simulé)
```

---

## ⏰ CYCLES BRAINEE-LIVING (src/being/lifecycle.js)

| Fréquence | Action |
|---|---|
| Chaque minute | Mise à jour conscience + émotions |
| 30 min | Consolidation mémoire |
| Horaire | Évolution identité + désirs |
| 3h-7h | Génération rêves nocturnes |
| Quotidien | Évolution + extraction sagesse |
| Hebdo | Bilan existentiel |
