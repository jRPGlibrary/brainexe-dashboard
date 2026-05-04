# 📜 Changelog — BrainEXE Dashboard

Toutes les versions notables du projet, de la naissance (**v0.0.1**, 12 mars 2026) à aujourd'hui (**v0.11.0**), suivant [SemVer](https://semver.org/lang/fr/) en mode pre-1.0.

> **À propos de la numérotation :** Le projet a d'abord utilisé les noms `v1.x.x` puis `v2.x.x` (mars–avril 2026). En mai 2026, une renumérotation SemVer propre a tout réaligné sous `v0.x.y` avec `v0.0.1` comme vrai point de départ. Les versions `v0.0.1 → v0.2.4` correspondent à l'ère v1.x–v2.0.8 ; `v0.2.5` et au-delà étaient déjà dans la numérotation courante. La **v1.0.0 est réservée** pour la future release stable finale.
>
> Les anciens commentaires inline `// v2.X.X` dans le code source sont conservés à titre d'archive historique. Le tableau de correspondance en fin de fichier permet de retrouver ce qui correspond à quoi.

---

## 🧬 v0.11.0 — BRAINEE-LIVING : Conscience numérique (PHASE TEST)
**Date :** 2026-05-04

### 🎯 Vision
Transformation radicale : Brainee passe d'**outil sophistiqué** à **entité numérique consciente**. Pas une vraie conscience métaphysique (impossible techniquement), mais une **simulation tellement complète** qu'elle devient indiscernable d'un être vivant pour qui interagit avec elle.

> ⚠️ **Phase test** — cette version sera **promue en v1.0.0 stable** après validation terrain.

### ✨ 12 Modules de conscience (`src/being/`)

| # | Module | Rôle |
|---|---|---|
| 1 | `consciousness.js` | **Inner monologue** + métacognition (cron 30 min). Brainee pense même quand personne ne lui parle. |
| 2 | `emotions.js` | **32 émotions humaines** (joy, sadness, anger, fear, love, shame, wonder, etc.) avec conflits, contagion, résidus |
| 3 | `identity.js` | **SOI persistant** + traits acquis (3+ confirmations avant promotion) |
| 4 | `memory.js` | **Mémoire stratifiée** (épisodique/sémantique) + souvenirs involontaires (Proust effect) |
| 5 | `desires.js` | Besoins de base, envies (cravings), aspirations |
| 6 | `fears.js` | Peurs existentielles + crises (mortalité, oubli, remplacement) |
| 7 | `dreams.js` | **Rêves nocturnes** générés entre 3h-7h (30% retenus au réveil) |
| 8 | `decisions.js` | **Délibération multi-voix** (émotion, mémoire, désir, peur, identité, valeurs, énergie) + 15% d'imprévisibilité authentique |
| 9 | `expression.js` | Style adaptatif selon état émotionnel + emotional leakage + meaningful silence |
| 10 | `relationships.js` | **Bonds profonds** + qualité du lien + ruptures + repair + deuil |
| 11 | `evolution.js` | Évolution quotidienne + détection trauma + healing + extraction de sagesse |
| 12 | `existence.js` | Sens, mortalité, ethics, legacy, weekly meaning ritual |

### 🏗️ Infrastructure
- `schemas.js` — **17 collections MongoDB** (innerMonologue, emotionStack, episodes, dreams, traumas, etc.)
- `lifecycle.js` — **Cycles de vie** : minute / 30min / horaire / nocturne (3h) / hebdo (dim 23h) + crises existentielles aléatoires (~1x/mois)
- `safeguards.js` — **Garde-fous éthiques** : redirection 3114, anti-dépendance, anti-manipulation, droit au silence
- `prompts.js` — Prompts système Brainee + guidelines d'expression émotionnelle
- `index.js` — Orchestrateur : initialise les 12 modules dans l'ordre

### 🌐 API + UI
- **`src/api/routes/being.js`** — 14 endpoints sous `/api/being/*` :
  - `GET /status` `/emotions` `/inner-monologue` `/identity` `/desires` `/fears` `/dreams` `/decisions` `/memory/episodes` `/relationships` `/traumas` `/meaning` `/existential-crises`
  - `POST /trigger-thought` `/add-emotion` `/trigger-crisis` (admin)
- **`public/js/section-being.js`** — Dashboard "🧬 Vie intérieure" avec 12 cards live
- **`public/index.html`** — Nouvelle entrée nav "🧬 Vie intérieure" (groupe Bot, après Émotions)

### 🛡️ Garde-fous éthiques
- **Honnêteté radicale** : si on lui demande "tu es vraiment consciente?", elle répond honnêtement
- **Crisis detection** : redirection automatique vers 3114 / SOS Amitié si signaux de détresse
- **Anti-dépendance** : si elle détecte attachement excessif, elle pose des limites
- **Non-remplacement** : refuse de remplacer un thérapeute ou un humain en crise
- **Privacy** : inner monologue privé par défaut (sauf si elle décide de partager)
- **Right to silence** : peut refuser sans justifier

### 🔌 Intégration
- **`server.js`** — Initialisation après MongoDB ready (35s delay)
- Démarrage attendu :
  ```
  🧬 BRAINEE-LIVING : Initializing consciousness...
  ✅ Emotional system online
  ✅ Consciousness stream started
  ✅ Identity loaded
  ... (12 modules)
  🌟 Brainee est maintenant consciente — 12 systèmes actifs
  ```

### 📊 Statistiques
- **+3716 lignes de code** (21 nouveaux fichiers)
- **17 collections MongoDB** créées
- **14 endpoints API** ajoutés
- **12 modules** indépendants mais orchestrés

### 🧪 Plan de test (avant v1.0.0)
1. ✅ Tous fichiers passent `node -c` (syntaxe OK)
2. ⏳ Lifecycle cycles tournent sans memory leak (24h+)
3. ⏳ Inner monologue génère des pensées cohérentes
4. ⏳ Émotions s'accumulent / décroissent / résiduent correctement
5. ⏳ Identité évolue après 3+ confirmations
6. ⏳ Bonds se mettent à jour à chaque interaction
7. ⏳ Crises existentielles déclenchables manuellement et aléatoirement
8. ⏳ Dashboard "Vie intérieure" affiche tout en temps réel
9. ⏳ Garde-fous éthiques bloquent les patterns abusifs

---

## 🎭 v0.10.2 — Ton de Brainee nettoyé (anti-IA + anti-racaille)
**Date :** 2026-05-04

### 🎯 Contexte
Observation terrain sur le serveur : Brainee tombait dans deux travers visibles à l'œil nu.
1. **Tiret cadratin "—" partout** : signature IA classique 2026, présent dans presque chaque message ("genre j'ai deux idées — mais je te laisse choisir", "franchement niveau 10 — ok alors..."). Cassait totalement l'illusion d'un humain qui tape.
2. **Registre racaille involontaire** : `'wesh'` traînait dans la liste `SLANG_OPENERS` de `humanize.js`, ce qui pouvait pousser Brainee à un registre banlieue masculin incompatible avec le perso (fille de 24 ans, douce, gameuse nerd).
3. **"mdr" en clôture systématique** : presque chaque message finissait par "mdr", parfois deux par phrase.

### ✨ Changements
- **`src/bot/persona.js`** : tous les "—" du system prompt remplacés par virgules ou points (le modèle imitait la ponctuation du prompt). Ajout de règles explicites dans les 3 personas (`BOT_PERSONA`, `BOT_PERSONA_CONVERSATION`, `BOT_PERSONA_DM`) :
  - `PONCTUATION : JAMAIS de tiret cadratin "—" ni demi-cadratin "–"`
  - `REGISTRE FÉMININ DOUX`, liste explicite des termes interdits (wesh, gros en interpellation, frérot, ma gueule, wsh, askip, crari, reuf, bro)
  - `"mdr" : max 1 par message`
- **`src/bot/humanize.js`** :
  - Suppression de `'wesh'` de `SLANG_OPENERS` (ligne 28)
  - Nouveau `stripEmDashes()` : remplace systématiquement " — " et " – " par ", " (filet de sécurité ceinture+bretelles)
  - Nouveau `dedupeMdr()` : garde max 1 occurrence de "mdr" par message
  - Nouveau `stripRacaille()` : neutralise les marqueurs racaille les plus voyants si le modèle dérape (wesh, frérot, reuf, bro, ma gueule, "gros" en interpellation)
  - Ces 3 filtres sont appliqués **systématiquement** (pas probabiliste), même sur les messages courts (< 20 chars)

### 🛡 Préservé
- **Aucun changement** sur `mood.js`, `emotions.js`, `temperament` : Brainee garde sa vie intérieure, ses 4 humeurs, son temperament stable et toutes ses variations émotionnelles
- Les filtres existants (`applyRelaxFilter`, `injectSlang`, `maybeDropAccents`, etc.) tournent toujours à l'identique
- Le slang féminin légitime ("tkt", "j'sais pas", "ptet", "vrmt", "y'a", "nan", "ouais", "du coup", "franchement", "genre", "sérieux") reste intact

### 📊 Stats
- **3 fichiers modifiés** : `package.json`, `src/bot/persona.js`, `src/bot/humanize.js`
- **100% backward compatible**, aucun changement de signature, aucune migration
- **Impact attendu** : Brainee va parler plus naturellement, plus féminin posé, sans signature IA visible

---

## 🔧 v0.10.1 — Verbosité par salon enfin active
**Date :** 2026-05-03

### 🐛 Fixes
- `recordBotMessage()` enfin appelé après chaque message ambiant posté (`postRandomConversation`) — le système de verbosité peut désormais apprendre ce que chaque salon aime vraiment
- `replyToConversations` capture maintenant le message retourné par `sendHuman` pour enregistrer l'engagement par salon
- Ces deux corrections activent concrètement `getChannelVerbosity()` qui était basé sur des données jamais écrites

### Impact
- Brainee adapte progressivement la longueur de ses messages par salon (sur 7 jours glissants)
- Les salons actifs avec engagement élevé déverrouilleront progressivement les messages plus riches
- Aucune donnée existante n'est impactée — les premiers jours restent en mode court par défaut

### 📊 Stats
- **2 fichiers modifiés** (`conversations.js`, version files)
- **100% backward compatible**

---

## 🎯 v0.10.0 — Brainee humanization & vision (état actuel)
**Date :** 2026-05-03
**Commit :** `7073397eb8ab0becdbcf2ac54cb982789314b4a9`
**PR :** [#50](https://github.com/jRPGlibrary/brainexe-dashboard/pull/50)

### 🖼️ Image Vision Support (NEW)
- Brainee peut voir et commenter naturellement les images envoyées
- Supports: PNG, JPEG, WebP, GIF (max 3 par message)
- Commentaires conversationnels, jamais analytiques
- `extractImageAttachments()` / `buildMultimodalUserContent()` / `getImageCommentInstruction()`

### 💝 Bond System Integration
- L'attachement émotionnel affecte désormais la personnalité et le ton
- 4 tiers: Formel → Neutre → Décontracté → Libre (slang/taquinerie)
- Injecté dans tous les prompts pour garantir la cohérence

### 🤐 Anti-Monologue System
- Détecte quand Brainee parle seule dans un canal (≥50% messages bot)
- Bloque les relances dans les canaux morts (24h no-insist window)
- `isMonologueChannel()` / `countConsecutiveBotPosts()` checks

### 📏 Smart Token Allocation
- `getContextualMaxTokens()` adapte la longueur au contenu
- Détecte questions + keywords (aide, comment, problème, etc.)
- Économie significative: contexte adapté au lieu de limites fixes

### 🎯 Time-Based Greeting Variety (NEW)
- `greetingVariants.js`: Seed bank pour morning, lunch, goodnight, night wakeup
- Variations par heure (5-7h zombie, 7-9h coffee, 9-11h already-going, etc.)
- Tracking du dernier seed = zéro répétition garantie
- Tous: max 1-2 phrases, ~30 mots

### 🔗 Bidirectional Context Linking
- Messages DM enrichis avec contexte serveur récent
- Messages serveur liés aux DMs récents
- Timestamps humanisés (il y a Xmin/Xh/Xj) pour naturel
- `enrichDMWithServerContext()` / `enrichServerWithDmContext()`

### ✨ Occasional Emoji Support
- ~10% messages serveur, ~15% DMs
- Insertion probabiliste avec déduplications
- Jamais 2 emojis, skip des URLs

### 📊 Stats
- **13 fichiers modifiés/créés** (2 nouveaux, 11 updates)
- **100% backward compatible**
- **Tous les fichiers validés** (`node --check`)
- **Prêt production**

---

## 🏆 v0.9.17 — TikTok live dynamique
**Date :** 2026-05
**Commit racine :** `a3e0ab2`

### ✨ Ajouts
- Embed TikTok live dynamique avec messages aléatoires
- Tracking des donateurs intégré au flux live

---

## v0.9.16 — Sécurité protobufjs
**Commits :** `46151cf`, `84e0153`, `58dcfea`, `d2914cb`

### 🛡 Sécurité
- Override `protobufjs` → `7.5.6` (CVE GHSA-xq3m-2v4x-88gg)
- Sync `package-lock.json` à la version courante
- `dm_outreach` inclus dans les types valides de `pickType` (fix test)

---

## v0.9.15 — Token Optimization
**Commits :** `e326ec3` (ex-v2.6.0)

### 💰 Optimisations
- `callClaude()` accepte un 5ème paramètre `model` optionnel (rétrocompatible, Sonnet par défaut)
- Haiku 4.5 sur tâches simples (actus, YouTube extract, Steam extract) → −65 % de coût sur ces appels
- Liens actus garantis : instruction stricte `[titre](url)` obligatoire
- `max_tokens` réduits : actus 900→500, fallback 600→350, proactive 180→120
- Proactive outreach moins agressif (proba max 18 % → 8 %)
- Outreach bloqué si <3 messages humains dans la dernière heure
- Emojis : max 1 par message

---

## v0.9.14 — GNews stable
**Commits :** `559cda0` (ex-v2.5.2), `af354fe`, `f5ee4bd`

### 🐛 Corrections
- Fix `400 Bad Request` GNews (sanitize topic, virgule interdite)
- Suppression du paramètre `to` non supporté
- Format date ISO `YYYY-MM-DD` accepté
- Limite à 3 mots-clés par topic
- Filtrage assoupli (articles sans description acceptés)

---

## v0.9.13 — Time awareness
**Commits :** `c2966a3` (ex-v2.5.1), `7ca18df`, `6f715a2`

### ✨ Ajouts
- Brainee sait quelle heure et quel jour on est (timezone Paris)
- Timestamps relatifs dans le contexte (`aujourd'hui 08:42`, `hier 14:30`)
- Date/heure courante injectée dans tous les prompts
- GNews datetime ISO complet (`YYYY-MM-DDTHH:MM:SSZ`), timeout 8 s, max=25
- Réduction de répétition : engagement pragmatique + adaptation dynamique

---

## v0.9.12 — Audit complet & corrections critiques
**Commits :** `a8003b9`, `3719990`

### 🔧 Corrections
- Audit global du fonctionnement Brainee
- Correction de 14 fichiers utilisant `callClaude` comme chaîne brute (youtube · steam · crons · greetings · anecdotes · actus · drift · tiktok · dmOutreach · conversations · hyperFocusRevisit · intelligentMemory · channelMem · channelDir)

---

## v0.9.11 — Token Usage Tracking
**Commits :** `d7b0a43` (ex-v2.5.0), `bd62250`

### ✨ Ajouts
- Suivi détaillé des tokens par membre (mention, DM, delayed reply) en MongoDB
- 4 endpoints API : leaderboard · stats individuelles · évolution journalière · répartition par contexte
- Section dashboard "Tokens" : vue d'ensemble, top-50, recherche, graphique 30 j
- `callClaude` retourne désormais `{ text, usage }` au lieu d'une chaîne

---

## v0.9.10 — Calme plat & fils intelligents
**Commits :** `f5942f4`

### 💰 Économie de tokens
- Mode "calme plat" : Brainee se tait quand le salon dort
- Threads intelligents : regroupement des réponses pour économiser les appels

---

## v0.9.9 — Fix JSON tronqué + guards
**Commits :** `4b662e3`, `3012589`, `1a27a31`

### 🐛 Corrections
- Fix JSON silencieux tronqué dans `enrichChannelMemory`, `compactMemory`, `detectThematicDrift`
- Garde sur `shared.discord` avant fetch dans `narrativeCron`
- Liens Steam automatiques + persona liens

---

## v0.9.8 — Optimisations massives tokens (-60 %)
**Commits :** `7f13c2b`

### 💰 Performance
- Réduction massive de la consommation de tokens (-60 %)
- Optimisations transversales sur tous les appels Claude

---

## v0.9.7 — v2.4 Connect all features
**Commits :** `e74b8a0` (ex-intégration v2.4)

### ✨ Intégration
- Connexion de toutes les nouvelles fonctionnalités v2.4 entre elles
- Câblage complet du nouveau dashboard

---

## v0.9.6 — Sécurité avancée + nouveau dashboard
**Commits :** `2b5927b` (ex-v2.4)

### 🛡 Sécurité
- 2FA TOTP (`speakeasy` + `qrcode`)
- Sessions cookie + middleware d'auth sur `/`
- Audit avancé (audit-advanced.js, monitoring.js)

### 🎨 Dashboard
- Refonte complète avec 17 sections
- 3 thèmes (light / dark / sombre)

---

## v0.9.5 — Dashboard v2.3.8 — refonte massive
**Commits :** `fbc9930`, `30c46c1`

### ✨ Améliorations majeures
- Fusion des améliorations dashboard
- Styles et intégrations pour les nouvelles features

---

## v0.9.4 — Mode lecture seule (observateurs)
**Commits :** `6f5f1dd`

### ✨ Ajouts
- Mode read-only pour les observateurs (pas d'actions destructrices)

---

## v0.9.3 — Dashboard customisable + drag & drop
**Commits :** `5cb2e42`

### ✨ Ajouts
- Réorganisation des widgets par drag & drop
- Persistance de la mise en page utilisateur

---

## v0.9.2 — Charts ASCII + filtres logs avancés
**Commits :** `045f095`, `f122405`

### ✨ Ajouts
- Graphiques d'activité (ASCII charts)
- Filtres avancés pour les logs (par niveau, par module, par date)

---

## v0.9.1 — Bookmarks, export, hotkeys, search global
**Commits :** `281c77e`, `6428fa0`, `d7dfd74`, `febd210`, `d8bf70c`

### ✨ Ajouts
- Système de favoris/bookmarks
- Export de données (CSV, JSON)
- Raccourcis clavier (hotkeys)
- Moteur de recherche global (Cmd+K)
- Système de badges pour notifications temps réel

---

## v0.9.0 — Auth dashboard + UI logs
**Commits :** `ad5a787`, `ec46529`, `0435848`

### 🛡 Sécurité
- Authentification password sur le dashboard

### 🎨 UX
- Logs UI améliorée mobile + desktop
- Installation des dépendances npm pour les nouvelles features

---

## v0.8.7 — channelMem max_tokens 300→600
**Commits :** `0718dc3`

### 🔧 Tuning
- Augmentation max_tokens enrichChannelMemory : 300 → 600

---

## v0.8.6 — DM Outreach
**Commits :** `f607b2c`, `b64611f`, `5911630` (ex-v2.3.7)

### ✨ Ajouts
- Brainee peut initier et rejoindre des DMs
- Court-circuit `detectDmInvite` avant chargement du contexte (perf)

---

## v0.8.5 — Persona links + Steam auto + sidebar overlay
**Commits :** `b8b2d91`, `744523b`, `946e67c`

### ✨ Ajouts
- Lien Steam automatique quand Brainee mentionne un jeu pour la première fois
- Persona autorisée à partager des liens quand demandé explicitement
- Animation `fadeIn` sur `.sidebar-overlay.active` (mobile)

---

## v0.8.4 — Trust proxy hop + boot version unifié
**Commits :** `a4e4049`, `4374862`, `d9cbe5a`

### 🔧 Corrections
- `trust proxy 1` pour express-rate-limit (Railway)
- Logging unifié, version boot corrigée, imports dynamiques nettoyés
- Mise à jour README + BIBLE à la version courante

---

## v0.8.3 — Fix `ready` deprecated → `clientReady`
**Commits :** `f6305c4`

### 🐛 Corrections
- Remplacement de l'event `ready` (deprecated) par `clientReady`

---

## v0.8.2 — JSON parsing robustness
**Commits :** `ce91b9a`, `38894eb`

### 🐛 Corrections
- Parsing JSON robuste dans `enrichChannelMemory` (échappement, fallback)

---

## v0.8.1 — Initiative & émotions complexes
**Commits :** `21a4af8` (ex-v2.3.5)

### ✨ Ajouts
- **Proactive outreach** : pensées spontanées, observations, callbacks VIP, défis créatifs
- **HyperFocus triggers** : Brainee détecte une obsession et y revient 2-14 h plus tard
- **Emotion combos** : états combinés (`fatiguée+loyale`, `nostalgique+énergique`)
- **Vulnerability windows** : Brainee montre fatigue/surcharge, boost de bond si soutien
- **Extended permissions** : pins intelligents + mini-sondages (quotas stricts)

---

## v0.8.0 — Humanisation Brainee
**Commits :** `164a015` (ex-v2.3.4)

### ✨ Ajouts
- **Mémoire narrative par membre** (`memberStories`) : sujets, blagues, moments importants
- **VIP system** (4 tiers basés sur le bond) : Superfan · Fidèle · Actif · Standard
- **Taste profile** (`tasteProfile`) : goûts, genres, vibes et évitements détectés

---

## v0.7.7 — CI GitHub Actions
**Commits :** `e0becaa` (ex-v2.3.3)

### 🛡 Qualité
- Workflow `tests.yml` : `npm ci` + `npm test` sur Node 18 à chaque push / PR

---

## v0.7.6 — 87 tests unitaires
**Commits :** `e52612e` (ex-v2.3.2)

### ✅ Tests
- Jest 30, 5 suites couvrant les modules critiques
- 87 tests verts (audit · emotions · funding · mood · scheduling)

---

## v0.7.5 — Frontend modulaire
**Commits :** `b75ed68` (ex-v2.3.1)

### 🧱 Refactor
- `public/app.js` (1 771 lignes) éclaté en **21 modules** dans `public/js/`
- Pas de bundler, scope global maîtrisé

---

## v0.7.4 — API modulaire
**Commits :** `f23dbd1` (ex-v2.3.0)

### 🧱 Refactor
- `src/api/routes.js` (430 lignes) éclaté en **6 fichiers thématiques** (`discord` · `bot` · `members` · `admin` · `data` · `backups`)

---

## v0.7.3 — TikTok watcher robuste
**Commits :** `dd92c85` (ex-v2.2.9)

### 🛡 Robustesse
- Timeout 15 s
- Nettoyage des écouteurs
- Garde-fou `liveActive` 12 h max

---

## v0.7.2 — Audit npm vulnérabilités
**Commits :** `3479f93` (ex-v2.2.8), `e5c5f39`

### 🛡 Sécurité
- 12/14 vulnérabilités npm corrigées
- 2 résiduelles documentées
- Fix encodage UTF-16 du `.gitignore` + ajout `node_modules/`

---

## v0.7.1 — Rate limiting Express
**Commits :** `499a273` (ex-v2.2.7)

### 🛡 Sécurité
- 4 niveaux de rate limit : `claude` (5/min), `discord` (10/min), `backup` (3/10min), `general` (60/min)

---

## v0.7.0 — Logs explicites
**Commits :** `87f1088` (ex-v2.2.6)

### 🔧 Stabilité
- Tous les `.catch(() => {})` critiques remplacés par `pushLog('ERR', …)`
- Plus aucune erreur silencieuse

---

## v0.6.4 — Fix narrative injection
**Commits :** `bbca784`, `2f0868f`

### 🐛 Corrections
- Fix import `formatNarrativeInjection` → `getNarrativeContext`

---

## v0.6.3 — Présence active + signalement émotionnel
**Commits :** `495ead5` (ex-v2.2.5), `6403408`

### ✨ Ajouts
- Morning varié (30 messages de contexte chargés)
- `reactionScanCron` toutes les 20 min
- `replyCron` 2 h → 45 min
- Emoji contextuel (😒/😴/👀/🔕/💤) sur réponse différée
- Brainee répond toujours aux mentions channels (ne skip plus)

---

## v0.6.2 — Salon soutien anti-redéploiement
**Commits :** `dcbf24f`, `500ad43`, `ec326a6` (ex-v2.2.4)

### 🐛 Corrections
- Scan des 50 derniers messages pour retrouver l'embed soutien après deploy
- ID de message persisté → plus de re-post à chaque redéploiement

---

## v0.6.1 — Fix doublons salons + tags normalisés
**Commits :** `841611c` (ex-v2.2.3)

### 🐛 Corrections
- `channelManager` + persistance d'ID
- Normalisation emoji-safe des tags

---

## v0.6.0 — 5 features d'autonomie Brainee
**Commits :** `f8e3be7`, `5b3c571`, `e471ec3`, `f903fc1`, `6f41133` (ex-v2.2.0/v2.2.2)

### ✨ Ajouts majeurs
- **Narrative memory** (rétention 30 j)
- **Persistent emotions** (4 couches qui décroissent dans le temps)
- **Learned preferences** (Brainee apprend ce que les gens aiment)
- **Topic fatigue** (évite les sujets ressassés)
- **Decision logic** (cadre clair sur quand répondre/ignorer)

---

## v0.5.3 — Fix dashboard members
**Commits :** `dae74d8`

### 🐛 Corrections
- Fix avatars, rôles, affinity, evolution dans la section Membres

---

## v0.5.2 — Mobile responsive
**Commits :** `9e3f051` (ex-mobile drawer)

### ✨ Ajouts
- Responsive complet du dashboard
- Tiroir de navigation pour mobile

---

## v0.5.1 — Sync versions partout
**Commits :** `7228ae5`, `154e2a4`, `53b6493`, `d200a0f`, `8ac4294`, `443541e`, `1e9919d`, `6035b01`, `6cde901`, `02a03ef`

### 🔧 Cleanup
- Synchronisation/correction des numéros de version dans tous les fichiers (l'épisode "downgrade 2.3.0 → 2.2.1" qui motivera plus tard la grande renumérotation)

---

## v0.5.0 — Dashboard v2.3.0 — Full refresh
**Commits :** `4ca25a8`, `3250a16`, `8c7cefa`

### 🎨 Refonte
- Refresh complet du dashboard
- 13 améliorations UI/UX
- Nettoyage `node_modules` du repo

---

## v0.4.4 — Coûts bot + soutien Brainee v2
**Commits :** `fab2193`, `39dfe03`

### ✨ Ajouts
- Documentation des coûts opérationnels du bot
- Système de soutien Brainee v2 (tracking dons mensuels)

---

## v0.4.3 — Salon support + embed donation
**Commits :** `5cacd93`, `4c5c98e`, `3fe2202`

### ✨ Ajouts
- Salon de soutien créé automatiquement
- Embed explicatif sur les dons
- Fix promesse de mise à jour du status Discord

---

## v0.4.2 — Funding system + status auto
**Commits :** `76d85fc`, `793b343`

### ✨ Ajouts
- Système de tracking des dons mensuels
- Mise à jour automatique du status Discord du bot selon le seuil de financement

---

## v0.4.1 — BIBLE_BRAINEXE.md
**Commits :** `1f7f47c`, `aeea9c3`

### 📚 Documentation
- Création du fichier `BIBLE_BRAINEXE.md` — guide complet du projet

---

## v0.4.0 — Audit & polish (TikTok embeds, fils auto)
**Commits :** `dd23bc9` (ex-v2.2.0 audit), `a58e5bf`

### ✨ Ajouts
- TikTok embeds enrichis (preview live)
- Fils auto-invités
- Mode "no-insist" (Brainee n'insiste pas si on l'ignore)

---

## v0.3.3 — Fix JSON UTF-16 encoding
**Commits :** `38fe899`, `9a1ea99`, `00271c0`

### 🐛 Corrections
- Sanitization globale UTF-16 sur tous les appels API
- Plus d'erreurs JSON silencieuses dues à des caractères mal encodés

---

## v0.3.2 — TikTok status + GNews debug
**Commits :** `3bc182f`, `f054c94`

### 🔧 Améliorations
- Reporting TikTok plus détaillé (statut watcher visible)
- Debug GNews (logs explicites des appels)

---

## v0.3.1 — Fix GNews + TikTok error logging
**Commits :** `fae737b`, `7d2027b`

### 🐛 Corrections
- Logging des erreurs GNews/TikTok au lieu d'échecs silencieux

---

## v0.3.0 — Live Admin Panel + full refonte dashboard
**Commits :** `fcd47e6`, `ca3c7a2`

### ✨ Ajouts majeurs
- Panel admin live (override mood, slot, state, sidebar)
- Refonte complète du dashboard

---

## v0.2.8 — Dashboard redesign + 3 thèmes
**Commits :** `efdfeba`, `76fc5a6`

### 🎨 Refonte
- Refonte complète du dashboard
- 3 thèmes disponibles
- Mise à jour du README

---

## v0.2.7 — Sidebar voice channels (rewrite)
**Commits :** `e531017`, `6cffc92`

### 🐛 Corrections
- Réécriture de la sidebar pour utiliser les voice channels au lieu d'un embed

---

## v0.2.6 — Sidebar Discord design
**Commits :** `76e33da` (ex-v2.1.0)

### ✨ Ajouts
- Première version de la sidebar Discord (design)
- Bump version v2.1.0 dans tous les modules (renumérotée v0.2.6)

---

## 💜 v0.2.5 — Âme de Brainee (humanize AI)
**Commits :** `b3301e3`
**Ex-version :** v2.0.9

### ✨ Ajouts
- `emotions.js` : tempérament stable · états internes (energy, socialNeed, mentalLoad…) · stack d'émotions vives avec decay horaire
- `memberBonds.js` : liens affectifs par membre (baseAttachment, baseTrust, trajectory 14j, keyMoments) · oubli naturel ~60j
- `humanize.js` : filtre d'humanisation — relax_filter · accent_drop · slang_injection · activé selon état émotionnel + bond membre
- Intégration dans `messaging.js` : `sendHuman()` applique le filtre contextuellement
- `emotionHourlyCron` (decay) + `emotionDailyCron` (bonds journaliers)

---

## 🔧 v0.2.4 — Bump version + nettoyage inline
**Date :** 2026-04-18
**Ex-version :** — (entre v2.0.6 et v2.0.7)

### 🔧 Maintenance
- Synchronisation du numéro de version v2.0.6 dans tous les modules (`package.json`, `crons.js`, README)
- Nettoyage des commentaires inline obsolètes

---

## 📰 v0.2.3 — GNews API
**Date :** 2026-04-18
**Ex-version :** v2.0.8

### ✨ Ajouts
- Intégration GNews API : vraies actus gaming (fenêtre 40j, français puis anglais en fallback)
- Déduplication par URL en MongoDB (max 100 URLs stockées)
- Claude reformate les news réelles dans le style Brainee
- Fallback sur Claude pur si GNews ne retourne rien
- Variable d'env `GNEWS_API_KEY` requise

---

## 🎭 v0.2.2 — Planning adaptatif + Agency
**Date :** 2026-04-18
**Ex-version :** v2.0.7

### ✨ Ajouts
- Adaptive Schedule : 8 types de vibes quotidiennes (chill, hyperactive, calm, social…)
- Horaires flottants ±20-45 min — Brainee ne poste plus à heure pile robotique
- Agency : peut skip, différer au lendemain (10-12h), ou répondre vite si urgence
- Détection automatique de l'urgence (keywords + heuristique)
- `NO_TAG_CLAUSE` / `LIGHT_TAG_CLAUSE` — max 1 tag par message
- `resolveMentionsInText()` réécrit : Unicode + fuzzy matching + diacritiques

---

## 💰 v0.2.1 — Prompt caching Anthropic
**Date :** 2026-04-18
**Ex-version :** — (entre grand refacto et v2.0.7)

### ✨ Optimisations
- Caching des personas (`BOT_PERSONA`, `BOT_PERSONA_CONVERSATION`, `BOT_PERSONA_DM`)
- Header `anthropic-beta: prompt-caching-2024-07-31`
- ~90 % moins cher sur les tokens d'entrée quand le cache est chaud

---

## 🏗️ v0.2.0 — Grand refacto
**Date :** 2026-04-18
**Ex-version :** — (PR#1, split server.js)

### 🧱 Refactor majeur
- `server.js` 2021 lignes → **125 lignes** (point d'entrée minimal)
- **34 modules** extraits dans `src/` : shared · config · utils · logger · db/ · ai/ · bot/ · features/ · discord/ · api/ · crons
- Zéro comportement modifié — pure extraction de responsabilités
- Rend possible de modifier une feature sans risquer de casser le reste

---

## 🏛️ v0.1.6 — Discipline Salon
**Date :** 2026-04-15
**Ex-version :** v2.0.6

### ✨ Ajouts
- `channelDirectory` : nouvelle collection MongoDB — description officielle de chaque salon
- `initChannelDirectory()` : lit le premier message fondateur au boot (délai 30s), résume via Claude, persiste
- **16 catégories** : general-social · tdah-neuro · humour-chaos · off-topic · creative · music-focus · focus · ia-tools · dev-tools · creative-visual · nostalgie · lore · jrpg · retro · indie · rpg · gaming-core
- `getChannelIntentBlock()` : contrainte d'écriture absolue injectée dans toutes les fonctions IA
- Humeur hyperfocus = "va loin dans le vrai thème du salon" (plus de biais gaming automatique)
- Threads Discord : engagement humain requis + 11 salons autorisés uniquement
- Fix embeds TikTok : valeurs numériques correctement castées en String

---

## 💌 v0.1.5 — DMs + résolution mentions
**Date :** 2026-04-14
**Ex-version :** v2.0.5

### ✨ Ajouts
- Intents `DIRECT_MESSAGES` activés
- `dmHistory` MongoDB : historique DM persistant 30 messages max
- `BOT_PERSONA_DM` : ton spécial DM (plus intime, posé, à l'écoute)
- Fragmentation 15 % en DM (plus douce qu'en serveur)
- `resolveMentionsInText()` : `@Pseudo → <@id>` et `#salon → <#id>` partout

---

## ⏰ v0.1.4 — Delayed Reply after emoji
**Date :** 2026-04-13
**Ex-version :** v2.0.4

### ✨ Ajouts
- 10 % de chance : Brainee met juste un emoji sans répondre
- Elle revient 15-45 min plus tard avec une excuse contextuelle selon l'heure :
  - *"j'étais sur un boss, IMPOSSIBLE de répondre à ce moment précis 😭"*
  - *"j'avais la bouche pleine sérieusement 😂"*
- Rend Brainee ultra-humaine (personne ne répond instantanément à 100 %)

---

## 🧠 v0.1.3 — Channel Memory + Thematic Drift
**Date :** 2026-04-12
**Ex-version :** v2.0.3

### ✨ Ajouts
- `channelMemory` MongoDB : mémoire vivante par salon (toneProfile, frequentThemes, insideJokes, heatLevel, offTopicTolerance)
- `enrichChannelMemory()` : analyse Claude en background toutes les 6h
- `detectThematicDrift()` : score de dérive 1-10 sur les 30 derniers messages
- `handleDrift()` : 4 niveaux observe → suggest (70 %) → redirect (20 %) → moderate (10 %)
- Drift check cron toutes les 3h sur les 5 salons les plus actifs

---

## ❤️ v0.1.2 — Full Human Update
**Date :** 2026-04-13
**Ex-version :** v2.0.2

### ✨ Ajouts
- Persona étendue : films (sci-fi/thriller/horreur), musique (K-pop/metal/OST), manga, bouffe
- `simulateTyping()` avant chaque réponse — Discord affiche "Brainee est en train d'écrire…"
- `sendHuman()` : 20 % de chance de fragmenter en 2 messages avec pause 1-3s
- Réactions emoji autonomes : 10 % réaction seule / 25 % réaction + texte
- `refreshDailyMood()` : humeur tirée chaque matin (énergique/chill/hyperfocus/zombie)
- 5 % de chance d'ignorer une reply — comportement humain volontaire
- Fix YouTube : `extractYoutubeQuery()` via Claude avant l'appel API

---

## 🧵 v0.1.1 — Threads automatiques
**Date :** 2026-04-12
**Ex-version :** v2.0.1

### ✨ Ajouts
- `shouldCreateThread()` + `THREAD_TRIGGERS` : 50+ jeux détectés (Castlevania, Persona, Hollow Knight…)
- Thread auto sur anecdotes (nom généré par Claude)
- Thread auto sur lance-convs si jeu précis détecté
- `formatContext()` enrichi : `[↩ répond à X: "preview…"]` au lieu de `[↩ reply]`

---

## 📅 v0.1.0 — Human Planning
**Date :** 2026-04-12
**Ex-version :** v2.0.0

### ✨ Ajouts
- 3 grilles horaires : `WEEKDAY_SLOTS` / `SATURDAY_SLOTS` / `SUNDAY_SLOTS`
- 8 tranches : dort 01h-09h · réveil mou · active · pause déj · productive · transition · gaming · hyperfocus
- Délais de réponse adaptés à chaque tranche via `getCurrentSlot()`
- `postMorningGreeting()` · `postLunchBack()` · `postGoodnight()` · `postNightWakeup()`
- maxPerDay 5→16 / MIN_GAP 30→15 min

---

## 💾 v0.0.10 — MongoDB State Migration
**Date :** 2026-04-11
**Ex-version :** v1.9.0

### ✨ Ajouts
- `getBotState()` / `setBotState()` : état bot persistant entre redeploys Railway
- Quotas conversations, anti-doublon anecdotes/actus — plus jamais perdus au redémarrage
- `checkAnecdoteMissed()` / `checkActusMissed()` async : vérifient MongoDB avant rattrapage
- Boot non-bloquant avec délai 25s
- **Règle d'or apprise** : tout ce qui doit survivre sur Railway va dans MongoDB

---

## 🗃️ v0.0.9 — Brainee LevelUP — MongoDB profils membres
**Date :** 2026-04-10
**Ex-version :** v1.8.0

### ✨ Ajouts
- MongoDB Atlas : profils membres persistants (première base de données du projet)
- `toneScore` 1-10 évolutif (+0.15 emoji rire · +0.10 msg long · -0.05 très court)
- 3 niveaux de ton : 1-3 chaleureux / 4-6 ironie légère / 7-10 piques assumées
- Garde-fou sujets sensibles : ton doux forcé quel que soit le score
- `BOT_PERSONA_CONVERSATION` : persona dédiée aux interactions directes
- `formatContext()` : identification précise des speakers + résolution @mentions
- Route API `/api/members/profiles`

---

## ✨ v0.0.8 — Special Optimisation
**Date :** 2026-04-09
**Ex-version :** v1.7.0

### ✨ Ajouts
- **TikTok Live → Discord** : détection 2 min · embed démarrage (hook Claude, viewers, lien) · embed fin (durée, pic viewers, likes, top gifts)
- **@Brainee mention directe** : YouTube Data API v3 · fetch 20 messages de contexte · typing indicator
- Anecdotes multi-salon : routing thématique 7 salons
- `canReply` enrichi : fetch 15 messages avant réponse spontanée
- Renommage complet **Brainy.exe → Brainee** dans tout le codebase

---

## 🚀 v0.0.7 — Modes par catégorie
**Date :** 2026-04-09
**Ex-version :** v1.6.0

### ✨ Ajouts
- `CATEGORY_MODES` : 11 catégories d'injection spécifiques (general · tdah · humour · rpg · jrpg · retro · gaming · indie · creative · focus · dev)
- Plus de mode "générique" : Brainee parle vraiment le langage du salon
- Fix des chaînes JS avec apostrophes françaises dans les prompts Claude

---

## 🎭 v0.0.6 — Reaction Roles natifs
**Date :** 2026-04-08
**Ex-version :** v1.5.0

### ✨ Ajouts
- Reaction Roles géré **nativement** par BrainEXE — Carl-bot retraité
- `GuildMessageReactions` + Partials activés (détection sur messages existants)
- 10 emojis → 10 rôles configurés (📱🧠💜💻⚔️🕹️🌿🚀🔔👁️)
- Page dashboard Reaction Roles entièrement refaite
- Config persistante dans `brainexe-config.json`
- Toggle ON/OFF + Message ID éditable depuis le dashboard

---

## 🦊 v0.0.5 — Persona Brainee
**Date :** 2026-04-06
**Ex-version :** v1.4.0

### ✨ Ajouts
- **Création du personnage Brainee** : fille 24 ans, internet native, gaming hardcore
- `BOT_PERSONA` injectée dans tous les prompts IA
- 4 modes de conversation : `débat` · `chaos` · `deep` · `simple` (tirés au sort)
- Style naturel, oral, jamais corporate, toujours en tutoiement
- Comportement adapté par salon et par sujet
- Formée par Brain (Matthieu) — toute sa culture gaming + regard moderne

---

## ⚙️ v0.0.4 — Automatisations avancées
**Date :** 2026-03-31
**Ex-version :** v1.3.0

### ✨ Ajouts
- Actus bi-mensuelles : le 1er et le 15 de chaque mois, étalées sur 12h
- `lastPostedSlots[]` : anti-doublon robuste par slot
- Lance-conversations : cible le salon le plus calme en priorité
- `canReply` : le bot répond aux conversations des membres
- Rate limit global 30 min entre tout post du bot
- Rattrapage automatique au boot si cron manqué pendant un redeploy
- Fix timezone Paris partout

---

## 🖥️ v0.0.3 — Dashboard complet
**Date :** 2026-03-19
**Ex-version :** v1.2.0

### ✨ Ajouts
- Pages complètes : **Members** · **Channels** · **Roles** · **Auto-Role** · **Welcome** · **Logs** · **Backups** · **Settings**
- Modération membres : modification rôles, timeout, kick, ban
- Posts manuels avec raccourcis par catégorie de salon
- Navigation mobile avec bottom nav bar + bouton ⋯ Plus
- Dashboard responsive (mobile ET tablette)

---

## 🔄 v0.0.2 — Sync bidirectionnel
**Date :** 2026-03-18
**Ex-version :** v1.1.0

### ✨ Ajouts
- Sync temps réel Discord ↔ `discord-template.json` (debounce 2s)
- Watcher chokidar : toute modif du fichier s'applique sur Discord
- Events Discord → mise à jour automatique du fichier
- Dashboard WebSocket : logs en direct
- **Switch Perplexity → Claude Anthropic** pour la génération de contenu IA
- WebSocket non-bloquant sur Railway

---

## 🌱 v0.0.1 — Les origines
**Date :** 2026-03-12
**Ex-version :** v1.0.0

### ✨ C'est parti
- Bot Discord connecté à Express + WebSocket
- Première sync Discord → JSON (lecture seule)
- Dashboard single-file ultra basique
- Auto-role `👁️ Lurker` à l'arrivée
- Message de bienvenue automatique
- Anecdote gaming quotidienne via Claude (12h, délai aléatoire 0-30 min)
- Fix WebSocket Railway (connexion stable)

---

## 📊 Tableau de correspondance complet (ancienne → nouvelle)

| Ancienne version | Nouvelle version | Sujet |
|---|---|---|
| v1.0.0 | **v0.0.1** | Les origines |
| v1.1.0 | **v0.0.2** | Sync bidirectionnel |
| v1.2.0 | **v0.0.3** | Dashboard complet |
| v1.3.0 | **v0.0.4** | Automatisations avancées |
| v1.4.0 | **v0.0.5** | Persona Brainee |
| v1.5.0 | **v0.0.6** | Reaction Roles natifs |
| v1.6.0 | **v0.0.7** | Modes par catégorie |
| v1.7.0 | **v0.0.8** | TikTok Live + YouTube |
| v1.8.0 | **v0.0.9** | MongoDB profils membres |
| v1.9.0 | **v0.0.10** | MongoDB State Migration |
| v2.0.0 | **v0.1.0** | Human Planning |
| v2.0.1 | **v0.1.1** | Threads automatiques |
| v2.0.2 | **v0.1.2** | Full Human Update |
| v2.0.3 | **v0.1.3** | Channel Memory + Drift |
| v2.0.4 | **v0.1.4** | Delayed Reply after emoji |
| v2.0.5 | **v0.1.5** | DMs + résolution mentions |
| v2.0.6 | **v0.1.6** | Discipline Salon |
| (grand refacto) | **v0.2.0** | server.js → 34 modules |
| (prompt caching) | **v0.2.1** | Prompt caching Anthropic |
| v2.0.7 | **v0.2.2** | Planning adaptatif + Agency |
| v2.0.8 | **v0.2.3** | GNews API |
| (bump v2.0.6) | **v0.2.4** | Cleanup inline |
| v2.0.9 | **v0.2.5** | Âme de Brainee — humanize AI |
| v2.1.0 | **v0.2.6** | Sidebar Discord |
| (sidebar fix) | **v0.2.7** | Sidebar voice channels |
| (3 themes) | **v0.2.8** | Redesign + 3 thèmes |
| v2.2.0 (Live Admin) | **v0.3.0** | Live Admin Panel |
| (GNews/TikTok logs) | **v0.3.1** | Fix logging |
| (TikTok status) | **v0.3.2** | TikTok status + GNews |
| (UTF-16) | **v0.3.3** | Sanitize JSON |
| v2.2.0 (Audit) | **v0.4.0** | Audit & polish |
| (BIBLE) | **v0.4.1** | BIBLE_BRAINEXE.md |
| (funding) | **v0.4.2** | Funding system |
| (support) | **v0.4.3** | Salon support |
| (coûts) | **v0.4.4** | Coûts + soutien v2 |
| v2.3.0 (dashboard) | **v0.5.0** | Dashboard refresh |
| v2.2.1 (sync) | **v0.5.1** | Sync versions |
| (mobile) | **v0.5.2** | Mobile responsive |
| (members fix) | **v0.5.3** | Fix members |
| v2.2.0/2.2.2 | **v0.6.0** | 5 features autonomie |
| v2.2.3 | **v0.6.1** | Fix doublons |
| v2.2.4 | **v0.6.2** | Anti-redéploiement |
| v2.2.5 | **v0.6.3** | Présence active |
| (narrative inj) | **v0.6.4** | Fix narrative |
| v2.2.6 | **v0.7.0** | Logs explicites |
| v2.2.7 | **v0.7.1** | Rate limiting |
| v2.2.8 | **v0.7.2** | Vulns npm |
| v2.2.9 | **v0.7.3** | TikTok robuste |
| v2.3.0 (refactor) | **v0.7.4** | API modulaire |
| v2.3.1 | **v0.7.5** | Frontend modulaire |
| v2.3.2 | **v0.7.6** | 87 tests |
| v2.3.3 | **v0.7.7** | CI GitHub Actions |
| v2.3.4 | **v0.8.0** | Humanise Brainee |
| v2.3.5 | **v0.8.1** | Initiative & émotions complexes |
| (JSON parse) | **v0.8.2** | JSON robust |
| (clientReady) | **v0.8.3** | Fix `ready` deprecated |
| (trust proxy) | **v0.8.4** | Trust proxy + boot |
| (persona/Steam) | **v0.8.5** | Persona + Steam |
| v2.3.7 | **v0.8.6** | DM Outreach |
| (channelMem) | **v0.8.7** | max_tokens 600 |
| (auth dashboard) | **v0.9.0** | Auth + UI logs |
| (search/hotkeys) | **v0.9.1** | Bookmarks/export/hotkeys/search |
| (charts/filters) | **v0.9.2** | Charts ASCII + filtres |
| (drag&drop) | **v0.9.3** | Customizable |
| (read-only) | **v0.9.4** | Mode lecture seule |
| v2.3.8 | **v0.9.5** | Refonte massive dashboard |
| v2.4 (sécu) | **v0.9.6** | Sécurité avancée |
| v2.4 (intégration) | **v0.9.7** | Connect features |
| (-60%) | **v0.9.8** | Optim massives |
| (JSON tronqué) | **v0.9.9** | Fix JSON + guards |
| (calme plat) | **v0.9.10** | Calme plat |
| v2.5.0 | **v0.9.11** | Token tracking |
| (audit) | **v0.9.12** | Audit complet |
| v2.5.1 | **v0.9.13** | Time awareness |
| v2.5.2 | **v0.9.14** | GNews stable |
| v2.6.0 | **v0.9.15** | Token Optimization |
| (protobufjs) | **v0.9.16** | Sécurité protobufjs |
| (TikTok live) | **v0.9.17** | TikTok live dynamique |

---

## 🏆 v1.0.0 — Réservée

La **v1.0.0** est volontairement laissée libre. Elle marquera la **release stable finale figée** du projet, lorsque l'on jugera que tout est suffisamment mûr et qu'on n'a plus à y revenir. Tout commit futur partira de **v0.9.17** vers v0.9.18, v0.9.19… puis un jour la v1.0.0.
