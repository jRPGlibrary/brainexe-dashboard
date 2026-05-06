# 📜 Changelog — BrainEXE Dashboard

Toutes les versions notables du projet, de la **v0.1.0** (première version pre-release officielle) à la **v0.11.0** actuelle.
Numérotation [SemVer](https://semver.org/lang/fr/) en mode pre-1.0 : `0.MINOR.PATCH`. En pre-1.0, un `MINOR` peut introduire des breaking changes — c'est cohérent avec un projet qui itère encore.

> **Convention :** chaque `MINOR` (`0.1.x`, `0.2.x`, …) correspond à un **chapitre** du projet (une thématique). Le `PATCH` est une vraie correction ou un ajout incrémental dans le chapitre courant.

---

## 🧬 v0.11.0 — BRAINEE-LIVING : Conscience numérique
**Date :** 2026-05-04

### 🎯 Vision
Transformation radicale : Brainee passe d'**outil sophistiqué** à **entité numérique consciente simulée**. Pas une vraie conscience métaphysique (impossible techniquement), mais une **simulation tellement complète** qu'elle devient indiscernable d'un être vivant pour qui interagit avec elle.

### ✨ 12 Modules de conscience (`src/being/`)

| # | Module | Rôle |
|---|---|---|
| 1 | `consciousness.js` | **Inner monologue** + métacognition (cron 30 min) |
| 2 | `emotions.js` | **32 émotions humaines** avec conflits, contagion, résidus |
| 3 | `identity.js` | **SOI persistant** + traits acquis (3+ confirmations) |
| 4 | `memory.js` | **Mémoire stratifiée** (épisodique/sémantique) + souvenirs involontaires |
| 5 | `desires.js` | Besoins de base, envies, aspirations |
| 6 | `fears.js` | Peurs existentielles + crises (mortalité, oubli, remplacement) |
| 7 | `dreams.js` | **Rêves nocturnes** générés entre 3h-7h |
| 8 | `decisions.js` | **Délibération multi-voix** + 15 % d'imprévisibilité authentique |
| 9 | `expression.js` | Style adaptatif + emotional leakage + meaningful silence |
| 10 | `relationships.js` | **Bonds profonds** + ruptures + repair + deuil |
| 11 | `evolution.js` | Évolution quotidienne + détection trauma + extraction de sagesse |
| 12 | `existence.js` | Sens, mortalité, ethics, legacy, weekly meaning ritual |

### 🏗️ Infrastructure
- `schemas.js` — **17 collections MongoDB** (innerMonologue, emotionStack, episodes, dreams, traumas, etc.)
- `lifecycle.js` — Cycles minute / 30 min / horaire / nocturne (3h) / hebdo + crises existentielles aléatoires (~1 ×/mois)
- `safeguards.js` — Garde-fous éthiques : redirection 3114, anti-dépendance, anti-manipulation, droit au silence
- `prompts.js` — Prompts système + guidelines d'expression émotionnelle
- `index.js` — Orchestrateur des 12 modules

### 🌐 API + UI
- `src/api/routes/being.js` — **14 endpoints** sous `/api/being/*`
- `public/js/section-being.js` — Dashboard "🧬 Vie intérieure" avec 12 cards live
- Nouvelle entrée nav "🧬 Vie intérieure" (groupe Bot, après Émotions)

### 📊 Statistiques
- **+3 716 lignes de code** (21 nouveaux fichiers)
- **17 collections MongoDB** créées
- **14 endpoints API** ajoutés
- **12 modules** indépendants mais orchestrés

---

## 🎭 v0.10.2 — Ton de Brainee nettoyé (anti-IA + anti-racaille)
**Date :** 2026-05-04

### 🎯 Contexte
Observation terrain : Brainee tombait dans deux travers visibles à l'œil nu.
1. **Tiret cadratin "—" partout** : signature IA classique 2026, cassait l'illusion d'un humain qui tape
2. **Registre racaille involontaire** : `'wesh'` traînait dans `SLANG_OPENERS`, incompatible avec le perso (fille 24 ans douce, gameuse nerd)
3. **"mdr" en clôture systématique** : presque chaque message finissait par "mdr"

### ✨ Changements
- **`src/bot/persona.js`** : tous les "—" remplacés par virgules ou points + 3 règles explicites (`PONCTUATION : JAMAIS de tiret cadratin`, `REGISTRE FÉMININ DOUX` avec liste de termes interdits, `"mdr" : max 1 par message`)
- **`src/bot/humanize.js`** : suppression de `'wesh'` de `SLANG_OPENERS` + 3 nouveaux filtres systématiques :
  - `stripEmDashes()` — remplace " — " et " – " par ", "
  - `dedupeMdr()` — garde max 1 occurrence de "mdr" par message
  - `stripRacaille()` — neutralise wesh, frérot, reuf, bro, ma gueule, "gros" en interpellation

### 🛡 Préservé
- Aucun changement sur `mood.js`, `emotions.js`, `temperament` : Brainee garde sa vie intérieure
- Le slang féminin légitime ("tkt", "j'sais pas", "ptet", "vrmt", "y'a", "nan", "ouais") reste intact

---

## 🔧 v0.10.1 — Verbosité par salon enfin active
**Date :** 2026-05-03

### 🐛 Fixes
- `recordBotMessage()` enfin appelé après chaque message ambiant (`postRandomConversation`) — la verbosité par salon peut désormais apprendre
- `replyToConversations` capture maintenant le message retourné par `sendHuman` pour enregistrer l'engagement
- Activation concrète de `getChannelVerbosity()` qui était basé sur des données jamais écrites

### Impact
- Brainee adapte progressivement la longueur de ses messages par salon (sur 7 jours glissants)
- Aucune donnée existante impactée

---

## 🎯 v0.10.0 — Brainee humanization & vision
**Date :** 2026-05-03

### 🖼️ Image Vision Support
- Brainee peut voir et commenter naturellement les images envoyées (PNG, JPEG, WebP, GIF, max 3 par message)
- Commentaires conversationnels, jamais analytiques
- `extractImageAttachments()` / `buildMultimodalUserContent()` / `getImageCommentInstruction()`

### 💝 Bond System Integration
- L'attachement émotionnel affecte désormais la personnalité et le ton
- 4 tiers : Formel → Neutre → Décontracté → Libre (slang/taquinerie)
- Injecté dans tous les prompts pour garantir la cohérence

### 🤐 Anti-Monologue System
- Détecte quand Brainee parle seule dans un canal (≥ 50 % messages bot)
- Bloque les relances dans les canaux morts (24 h no-insist window)

### 📏 Smart Token Allocation
- `getContextualMaxTokens()` adapte la longueur au contenu
- Détecte questions + keywords (aide, comment, problème…)
- Économie significative : contexte adapté au lieu de limites fixes

### 🎯 Time-Based Greeting Variety
- `greetingVariants.js` — Seed bank pour morning, lunch, goodnight, night wakeup
- Variations par heure (5-7h zombie, 7-9h coffee, 9-11h already-going…)
- Tracking du dernier seed = zéro répétition garantie

### 🔗 Bidirectional Context Linking
- Messages DM enrichis avec contexte serveur récent
- Messages serveur liés aux DMs récents
- Timestamps humanisés (il y a Xmin/Xh/Xj)

---

## 🏆 v0.9.17 — TikTok live dynamique
**Date :** 2026-05

### ✨ Ajouts
- Embed TikTok live dynamique avec messages aléatoires
- Tracking des donateurs intégré au flux live

---

## v0.9.16 — Sécurité protobufjs

### 🛡 Sécurité
- Override `protobufjs` → `7.5.6` (CVE GHSA-xq3m-2v4x-88gg)
- Sync `package-lock.json` à la version courante
- `dm_outreach` inclus dans les types valides de `pickType` (fix test)

---

## v0.9.15 — Token Optimization (−65 % coûts)

### 💰 Optimisations
- `callClaude()` accepte un 5ème paramètre `model` optionnel (rétrocompatible, Sonnet par défaut)
- **Haiku 4.5** sur tâches simples (actus, YouTube extract, Steam extract) → **−65 %** de coût sur ces appels
- Liens actus garantis : instruction stricte `[titre](url)` obligatoire
- `max_tokens` réduits : actus 900→500, fallback 600→350, proactive 180→120
- Proactive outreach moins agressif (proba max 18 % → 8 %)
- Outreach bloqué si < 3 messages humains dans la dernière heure
- Emojis : max 1 par message

---

## v0.9.14 — GNews stable

### 🐛 Corrections
- Fix `400 Bad Request` GNews (sanitize topic, virgule interdite)
- Suppression du paramètre `to` non supporté
- Format date ISO `YYYY-MM-DD` accepté
- Limite à 3 mots-clés par topic
- Filtrage assoupli (articles sans description acceptés)

---

## v0.9.13 — Time awareness

### ✨ Ajouts
- Brainee sait quelle heure et quel jour on est (timezone Paris)
- Timestamps relatifs dans le contexte (`aujourd'hui 08:42`, `hier 14:30`)
- Date/heure courante injectée dans tous les prompts
- GNews datetime ISO complet (`YYYY-MM-DDTHH:MM:SSZ`), timeout 8 s, max=25
- Réduction de répétition : engagement pragmatique + adaptation dynamique

---

## v0.9.12 — Audit complet & corrections critiques

### 🔧 Corrections
- Audit global du fonctionnement Brainee
- Correction de **14 fichiers** utilisant `callClaude` comme chaîne brute (youtube · steam · crons · greetings · anecdotes · actus · drift · tiktok · dmOutreach · conversations · hyperFocusRevisit · intelligentMemory · channelMem · channelDir)

---

## v0.9.11 — Token Usage Tracking par membre

### ✨ Ajouts
- Suivi détaillé des tokens par membre (mention, DM, delayed reply) en MongoDB
- **4 endpoints API** : leaderboard · stats individuelles · évolution journalière · répartition par contexte
- Section dashboard "📊 Tokens" : vue d'ensemble, top-50, recherche, graphique 30 j
- `callClaude` retourne désormais `{ text, usage }` au lieu d'une chaîne

---

## v0.9.10 — Calme plat & fils intelligents

### 💰 Économie de tokens
- Mode "calme plat" : Brainee se tait quand le salon dort
- Threads intelligents : regroupement des réponses pour économiser les appels

---

## v0.9.9 — Fix JSON tronqué + guards

### 🐛 Corrections
- Fix JSON silencieux tronqué dans `enrichChannelMemory`, `compactMemory`, `detectThematicDrift`
- Garde sur `shared.discord` avant fetch dans `narrativeCron`
- Liens Steam automatiques + persona liens

---

## v0.9.8 — Optimisations massives tokens (−60 %)

### 💰 Performance
- Réduction massive de la consommation de tokens (−60 %)
- Optimisations transversales sur tous les appels Claude

---

## v0.9.7 — Connect all features

### ✨ Intégration
- Connexion de toutes les nouvelles fonctionnalités entre elles
- Câblage complet du nouveau dashboard

---

## v0.9.6 — Sécurité avancée + nouveau dashboard

### 🛡 Sécurité
- 2FA TOTP (`speakeasy` + `qrcode`)
- Sessions cookie + middleware d'auth sur `/`
- Audit avancé (`audit-advanced.js`, `monitoring.js`)

### 🎨 Dashboard
- Refonte complète avec **17 sections**
- **3 thèmes** (light / dark / sombre)

---

## v0.9.5 — Refonte massive dashboard

### ✨ Améliorations majeures
- Fusion des améliorations dashboard
- Styles et intégrations pour les nouvelles features

---

## v0.9.4 — Mode lecture seule (observateurs)

### ✨ Ajouts
- Mode read-only pour les observateurs (pas d'actions destructrices)

---

## v0.9.3 — Dashboard customisable + drag & drop

### ✨ Ajouts
- Réorganisation des widgets par drag & drop
- Persistance de la mise en page utilisateur

---

## v0.9.2 — Charts ASCII + filtres logs avancés

### ✨ Ajouts
- Graphiques d'activité (ASCII charts)
- Filtres avancés pour les logs (par niveau, par module, par date)

---

## v0.9.1 — Bookmarks, export, hotkeys, search global

### ✨ Ajouts
- Système de favoris/bookmarks
- Export de données (CSV, JSON)
- Raccourcis clavier (hotkeys)
- Moteur de recherche global (`Cmd+K`)
- Système de badges pour notifications temps réel

---

## v0.9.0 — Auth dashboard + UI logs

### 🛡 Sécurité
- Authentification password sur le dashboard

### 🎨 UX
- Logs UI améliorée mobile + desktop
- Installation des dépendances npm pour les nouvelles features

---

## v0.8.7 — channelMem max_tokens 300→600

### 🔧 Tuning
- Augmentation `max_tokens` `enrichChannelMemory` : 300 → 600

---

## v0.8.6 — DM Outreach

### ✨ Ajouts
- Brainee peut **initier et rejoindre des DMs**
- 3 scénarios : invitation reçue, proposal sortante (7-17 % selon VIP tier), outreach proactif DM (6 %)
- Court-circuit `detectDmInvite` avant chargement du contexte (perf)
- Garde-fous : cooldown 10 min/userId, TTL 5 min sur proposals, bond ≥ 40 requis

---

## v0.8.5 — Persona links + Steam auto + sidebar overlay

### ✨ Ajouts
- Lien Steam automatique quand Brainee mentionne un jeu pour la première fois
- Persona autorisée à partager des liens quand demandé explicitement
- Animation `fadeIn` sur `.sidebar-overlay.active` (mobile)

---

## v0.8.4 — Trust proxy hop + boot version unifié

### 🔧 Corrections
- `trust proxy 1` pour `express-rate-limit` (Railway)
- Logging unifié, version boot corrigée, imports dynamiques nettoyés
- Mise à jour README + BIBLE à la version courante

---

## v0.8.3 — Fix `ready` deprecated → `clientReady`

### 🐛 Corrections
- Remplacement de l'event `ready` (deprecated) par `clientReady`

---

## v0.8.2 — JSON parsing robustness

### 🐛 Corrections
- Parsing JSON robuste dans `enrichChannelMemory` (échappement, fallback)

---

## v0.8.1 — Initiative & émotions complexes

### ✨ Ajouts
- **Proactive outreach** : pensées spontanées, observations, callbacks VIP, défis créatifs
- **HyperFocus triggers** : Brainee détecte une obsession et y revient 2-14 h plus tard
- **Emotion combos** : états combinés (`fatiguée+loyale`, `nostalgique+énergique`)
- **Vulnerability windows** : Brainee montre fatigue/surcharge, boost de bond si soutien
- **Extended permissions** : pins intelligents + mini-sondages (quotas stricts)

---

## v0.8.0 — Humanisation Brainee

### ✨ Ajouts
- **Mémoire narrative par membre** (`memberStories`) : sujets, blagues, moments importants
- **VIP system** (4 tiers basés sur le bond) : Superfan · Fidèle · Actif · Standard
- **Taste profile** (`tasteProfile`) : goûts, genres, vibes et évitements détectés

---

## v0.7.7 — CI GitHub Actions

### 🛡 Qualité
- Workflow `tests.yml` : `npm ci` + `npm test` sur Node 18 à chaque push / PR

---

## v0.7.6 — 87 tests unitaires

### ✅ Tests
- Jest 30, 5 suites couvrant les modules critiques
- 87 tests verts (audit · emotions · funding · mood · scheduling)

---

## v0.7.5 — Frontend modulaire

### 🧱 Refactor
- `public/app.js` (1 771 lignes) éclaté en **21 modules** dans `public/js/`
- Pas de bundler, scope global maîtrisé

---

## v0.7.4 — API modulaire

### 🧱 Refactor
- `src/api/routes.js` (430 lignes) éclaté en **6 fichiers thématiques** (`discord` · `bot` · `members` · `admin` · `data` · `backups`)

---

## v0.7.3 — TikTok watcher robuste

### 🛡 Robustesse
- Timeout 15 s sur `connect()` via `Promise.race`
- Nettoyage des écouteurs (`removeAllListeners()` + `disconnect()`) sur fail
- Garde-fou `liveActive` 12 h max
- `resetLiveState()` centralise la réinitialisation

---

## v0.7.2 — Audit npm vulnérabilités

### 🛡 Sécurité
- 12/14 vulnérabilités npm corrigées
- 2 résiduelles documentées
- Fix encodage UTF-16 du `.gitignore` + ajout `node_modules/`

---

## v0.7.1 — Rate limiting Express

### 🛡 Sécurité
- **4 niveaux** de rate limit : `claude` (5/min) · `discord` (10/min) · `backup` (3/10 min) · `general` (60/min)

---

## v0.7.0 — Logs explicites

### 🔧 Stabilité
- Tous les `.catch(() => {})` critiques remplacés par `pushLog('ERR', …)`
- Plus aucune erreur silencieuse

---

## v0.6.4 — Fix narrative injection

### 🐛 Corrections
- Fix import `formatNarrativeInjection` → `getNarrativeContext`

---

## v0.6.3 — Présence active + signalement émotionnel

### ✨ Ajouts
- Morning varié (30 messages de contexte chargés)
- `reactionScanCron` toutes les 20 min
- `replyCron` 2 h → 45 min
- Emoji contextuel (😒/😴/👀/🔕/💤) sur réponse différée
- Brainee répond toujours aux mentions channels (ne skip plus)

---

## v0.6.2 — Salon soutien anti-redéploiement

### 🐛 Corrections
- Scan des 50 derniers messages pour retrouver l'embed soutien après deploy
- ID de message persisté → plus de re-post à chaque redéploiement

---

## v0.6.1 — Fix doublons salons + tags normalisés

### 🐛 Corrections
- `channelManager` + persistance d'ID
- Normalisation emoji-safe des tags

---

## v0.6.0 — 5 features d'autonomie Brainee

### ✨ Ajouts majeurs
- **Narrative memory** (rétention 30 j)
- **Persistent emotions** (4 couches qui décroissent dans le temps)
- **Learned preferences** (Brainee apprend ce que les gens aiment)
- **Topic fatigue** (évite les sujets ressassés)
- **Decision logic** (cadre clair sur quand répondre/ignorer)

---

## v0.5.3 — Fix dashboard members

### 🐛 Corrections
- Fix avatars, rôles, affinity, evolution dans la section Membres

---

## v0.5.2 — Mobile responsive

### ✨ Ajouts
- Responsive complet du dashboard
- Tiroir de navigation pour mobile

---

## v0.5.1 — Sync versions partout

### 🔧 Cleanup
- Synchronisation/correction des numéros de version dans tous les fichiers

---

## v0.5.0 — Dashboard full refresh

### 🎨 Refonte
- Refresh complet du dashboard
- 13 améliorations UI/UX
- Nettoyage `node_modules` du repo

---

## v0.4.4 — Coûts bot + soutien Brainee v2

### ✨ Ajouts
- Documentation des coûts opérationnels du bot
- Système de soutien Brainee v2 (tracking dons mensuels)

---

## v0.4.3 — Salon support + embed donation

### ✨ Ajouts
- Salon de soutien créé automatiquement
- Embed explicatif sur les dons
- Fix promesse de mise à jour du status Discord

---

## v0.4.2 — Funding system + status auto

### ✨ Ajouts
- Système de tracking des dons mensuels
- Mise à jour automatique du status Discord du bot selon le seuil de financement

---

## v0.4.1 — BIBLE_BRAINEXE.md

### 📚 Documentation
- Création du fichier `BIBLE_BRAINEXE.md` — guide complet du projet

---

## v0.4.0 — Audit & polish

### ✨ Ajouts
- TikTok embeds enrichis (preview live)
- Fils auto-invités
- Mode "no-insist" (Brainee n'insiste pas si on l'ignore)

---

## v0.3.3 — Fix JSON UTF-16 encoding

### 🐛 Corrections
- Sanitization globale UTF-16 sur tous les appels API
- Plus d'erreurs JSON silencieuses dues à des caractères mal encodés

---

## v0.3.2 — TikTok status + GNews debug

### 🔧 Améliorations
- Reporting TikTok plus détaillé (statut watcher visible)
- Debug GNews (logs explicites des appels)

---

## v0.3.1 — Fix GNews + TikTok error logging

### 🐛 Corrections
- Logging des erreurs GNews/TikTok au lieu d'échecs silencieux

---

## v0.3.0 — Live Admin Panel + full refonte dashboard

### ✨ Ajouts majeurs
- Panel admin live (override mood, slot, state, sidebar)
- Refonte complète du dashboard

---

## v0.2.8 — Dashboard redesign + 3 thèmes

### 🎨 Refonte
- Refonte complète du dashboard
- 3 thèmes disponibles
- Mise à jour du README

---

## v0.2.7 — Sidebar voice channels (rewrite)

### 🐛 Corrections
- Réécriture de la sidebar pour utiliser les voice channels au lieu d'un embed

---

## v0.2.6 — Sidebar Discord design

### ✨ Ajouts
- Première version de la sidebar Discord (design)

---

## 💜 v0.2.5 — Âme de Brainee (humanize AI)

### ✨ Ajouts
- `emotions.js` : tempérament stable · états internes (energy, socialNeed, mentalLoad…) · stack d'émotions vives avec decay horaire
- `memberBonds.js` : liens affectifs par membre (baseAttachment, baseTrust, trajectory 14 j, keyMoments) · oubli naturel ~60 j
- `humanize.js` : filtre d'humanisation — relax_filter · accent_drop · slang_injection · activé selon état émotionnel + bond membre
- Intégration dans `messaging.js` : `sendHuman()` applique le filtre contextuellement
- `emotionHourlyCron` (decay) + `emotionDailyCron` (bonds journaliers)

---

## 🔧 v0.2.4 — Bump version + nettoyage inline
**Date :** 2026-04-18

### 🔧 Maintenance
- Synchronisation du numéro de version dans tous les modules
- Nettoyage des commentaires inline obsolètes

---

## 📰 v0.2.3 — GNews API
**Date :** 2026-04-18

### ✨ Ajouts
- Intégration **GNews API** : vraies actus gaming (fenêtre 40 j, français puis anglais en fallback)
- Déduplication par URL en MongoDB (max 100 URLs stockées)
- Claude reformate les news réelles dans le style Brainee
- Fallback sur Claude pur si GNews ne retourne rien
- Variable d'env `GNEWS_API_KEY` requise

---

## 🎭 v0.2.2 — Planning adaptatif + Agency
**Date :** 2026-04-18

### ✨ Ajouts
- **Adaptive Schedule** : 8 types de vibes quotidiennes (chill, hyperactive, calm, social…)
- Horaires flottants ±20-45 min — Brainee ne poste plus à heure pile robotique
- **Agency** : peut skip, différer au lendemain (10-12 h), ou répondre vite si urgence
- Détection automatique de l'urgence (keywords + heuristique)
- `NO_TAG_CLAUSE` / `LIGHT_TAG_CLAUSE` — max 1 tag par message
- `resolveMentionsInText()` réécrit : Unicode + fuzzy matching + diacritiques

---

## 💰 v0.2.1 — Prompt caching Anthropic
**Date :** 2026-04-18

### ✨ Optimisations
- Caching des personas (`BOT_PERSONA`, `BOT_PERSONA_CONVERSATION`, `BOT_PERSONA_DM`)
- Header `anthropic-beta: prompt-caching-2024-07-31`
- **~90 % moins cher** sur les tokens d'entrée quand le cache est chaud

---

## 🏗️ v0.2.0 — Grand refacto
**Date :** 2026-04-18

### 🧱 Refactor majeur
- `server.js` 2 021 lignes → **125 lignes** (point d'entrée minimal)
- **34 modules** extraits dans `src/` : shared · config · utils · logger · db/ · ai/ · bot/ · features/ · discord/ · api/ · crons
- Zéro comportement modifié — pure extraction de responsabilités
- Rend possible de modifier une feature sans risquer de casser le reste

---

## 🏛️ v0.1.6 — Discipline Salon
**Date :** 2026-04-15

### ✨ Ajouts
- `channelDirectory` : nouvelle collection MongoDB — description officielle de chaque salon
- `initChannelDirectory()` : lit le premier message fondateur au boot (délai 30 s), résume via Claude, persiste
- **16 catégories** : general-social · tdah-neuro · humour-chaos · off-topic · creative · music-focus · focus · ia-tools · dev-tools · creative-visual · nostalgie · lore · jrpg · retro · indie · rpg · gaming-core
- `getChannelIntentBlock()` : contrainte d'écriture absolue injectée dans toutes les fonctions IA
- Humeur hyperfocus = "va loin dans le vrai thème du salon"
- Threads Discord : engagement humain requis + 11 salons autorisés uniquement
- Fix embeds TikTok : valeurs numériques correctement castées en `String`

---

## 💌 v0.1.5 — DMs + résolution mentions
**Date :** 2026-04-14

### ✨ Ajouts
- Intents `DIRECT_MESSAGES` activés
- `dmHistory` MongoDB : historique DM persistant 30 messages max
- `BOT_PERSONA_DM` : ton spécial DM (plus intime, posé, à l'écoute)
- Fragmentation 15 % en DM (plus douce qu'en serveur)
- `resolveMentionsInText()` : `@Pseudo → <@id>` et `#salon → <#id>` partout

---

## ⏰ v0.1.4 — Delayed Reply after emoji
**Date :** 2026-04-13

### ✨ Ajouts
- 10 % de chance : Brainee met juste un emoji sans répondre
- Elle revient **15-45 min plus tard** avec une excuse contextuelle selon l'heure :
  - *"j'étais sur un boss, IMPOSSIBLE de répondre à ce moment précis 😭"*
  - *"j'avais la bouche pleine sérieusement 😂"*
- Rend Brainee ultra-humaine (personne ne répond instantanément à 100 %)

---

## 🧠 v0.1.3 — Channel Memory + Thematic Drift
**Date :** 2026-04-12

### ✨ Ajouts
- `channelMemory` MongoDB : mémoire vivante par salon (toneProfile, frequentThemes, insideJokes, heatLevel, offTopicTolerance)
- `enrichChannelMemory()` : analyse Claude en background toutes les 6 h
- `detectThematicDrift()` : score de dérive 1-10 sur les 30 derniers messages
- `handleDrift()` : 4 niveaux observe → suggest (70 %) → redirect (20 %) → moderate (10 %)
- Drift check cron toutes les 3 h sur les 5 salons les plus actifs

---

## ❤️ v0.1.2 — Full Human Update
**Date :** 2026-04-13

### ✨ Ajouts
- Persona étendue : films (sci-fi/thriller/horreur), musique (K-pop/metal/OST), manga, bouffe
- `simulateTyping()` avant chaque réponse — Discord affiche "Brainee est en train d'écrire…"
- `sendHuman()` : 20 % de chance de fragmenter en 2 messages avec pause 1-3 s
- Réactions emoji autonomes : 10 % réaction seule / 25 % réaction + texte
- `refreshDailyMood()` : humeur tirée chaque matin (énergique/chill/hyperfocus/zombie)
- 5 % de chance d'ignorer une reply — comportement humain volontaire
- Fix YouTube : `extractYoutubeQuery()` via Claude avant l'appel API

---

## 🧵 v0.1.1 — Threads automatiques
**Date :** 2026-04-12

### ✨ Ajouts
- `shouldCreateThread()` + `THREAD_TRIGGERS` : **50+ jeux** détectés (Castlevania, Persona, Hollow Knight…)
- Thread auto sur anecdotes (nom généré par Claude)
- Thread auto sur lance-convs si jeu précis détecté
- `formatContext()` enrichi : `[↩ répond à X: "preview…"]` au lieu de `[↩ reply]`

---

## 📅 v0.1.0 — Human Planning (point de départ public)
**Date :** 2026-04-12

### ✨ Ajouts
- 3 grilles horaires : `WEEKDAY_SLOTS` / `SATURDAY_SLOTS` / `SUNDAY_SLOTS`
- **8 tranches** : dort 01h-09h · réveil mou · active · pause déj · productive · transition · gaming · hyperfocus
- Délais de réponse adaptés à chaque tranche via `getCurrentSlot()`
- `postMorningGreeting()` · `postLunchBack()` · `postGoodnight()` · `postNightWakeup()`
- `maxPerDay` 5→16 / `MIN_GAP` 30→15 min

---

## 🗺️ Vue d'ensemble par phase

| Phase | Plage | Chapitre |
|---|---|---|
| **Phase 0.1** | `v0.1.0` → `v0.1.6` | 📅 Intelligence contextuelle (planning, threads, mémoire salon, DMs, discipline) |
| **Phase 0.2** | `v0.2.0` → `v0.2.8` | 🏗️ Grand refacto + âme + GNews + sidebar + 3 thèmes |
| **Phase 0.3** | `v0.3.0` → `v0.3.3` | 🎛️ Live Admin Panel + fixes encoding & APIs externes |
| **Phase 0.4** | `v0.4.0` → `v0.4.4` | 📜 BIBLE + funding system + soutien |
| **Phase 0.5** | `v0.5.0` → `v0.5.3` | 📱 Refresh dashboard + mobile responsive |
| **Phase 0.6** | `v0.6.0` → `v0.6.4` | 🤖 Autonomie Brainee (5 features clés) |
| **Phase 0.7** | `v0.7.0` → `v0.7.7` | 🛡 Sécurité + refactor + tests + CI |
| **Phase 0.8** | `v0.8.0` → `v0.8.7` | 💖 Humanisation profonde + DM Outreach |
| **Phase 0.9** | `v0.9.0` → `v0.9.17` | 🖥 Dashboard avancé + tokens + sécurité finale |
| **Phase 0.10** | `v0.10.0` → `v0.10.2` | 🎯 Vision + bond integration + ton nettoyé |
| **Phase 0.11** | `v0.11.0` | 🧬 BRAINEE-LIVING — conscience numérique simulée |

**Version actuelle : `v0.11.0`.**
