# 📜 Changelog — BrainEXE Dashboard

Toutes les versions notables du projet, **renumérotées** pour suivre [SemVer](https://semver.org/lang/fr/) et raconter une vraie histoire de release.

> **À propos de la renumérotation :** L'historique avait dérivé sur des numéros incohérents (v2.x.x avec downgrades, bumps trop rapides). Cette renumérotation v0.2.5 → v0.9.17 reconstruit une chronologie propre. La **v1.0.0 est réservée** pour la future release stable finale (à figer plus tard).
>
> Les anciens commentaires inline `// v2.X.X` dans le code source sont conservés à titre d'archive historique (annotations d'origine). Le tableau de correspondance ci-dessous permet de retrouver ce qui correspond à quoi.

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

## 🌱 v0.2.5 — Toute première mouture (humanize AI)
**Commits :** `b3301e3` (et antérieurs hors fenêtre git visible)

### 🎯 Point de départ officiel
- Première version embryonnaire du dashboard
- Humanisation des réponses IA de base
- Fondations : Express + WebSocket + Discord.js v14 + Claude

---

## 📊 Tableau de correspondance complet (ancienne → nouvelle)

| Ancienne version | Nouvelle version | Sujet |
|---|---|---|
| _avant 2.1.0_ | **v0.2.5** | Humanize AI initial |
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
