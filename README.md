# 🧠 BrainEXE Dashboard `v2.0.3`

> **v2.0.3 — Channel Memory + Drift** — Brainee connaît maintenant ses salons et les garde dans le bon axe. Mémoire vivante par salon en MongoDB, détection de dérive thématique avec 4 niveaux de réponse, et injection de la mémoire salon dans tous ses prompts.

Bot Discord autonome avec dashboard de controle en temps reel, automatisations IA et gestion complete du serveur depuis une interface web.
Concu pour le serveur **Neurodivergent Creator Hub** — propulse par **Brainee**.

---

## 📦 Stack technique

| Outil | Role |
|---|---|
| **Node.js** | Runtime backend |
| **Discord.js v14** | Bot Discord |
| **Express** | Serveur HTTP + API REST |
| **WebSocket (ws)** | Sync temps reel dashboard |
| **node-cron** | Planification automatisations |
| **chokidar** | Watcher fichier JSON |
| **Anthropic API** | Generation contenu IA (Claude) |
| **YouTube Data API v3** | Recherche videos sur @mention |
| **tiktok-live-connector** | Detection live TikTok en temps reel |
| **MongoDB Atlas** | Profils membres + etat bot + memoire salons |
| **Railway** | Hebergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js               # Bot + API + WebSocket (tout le backend)
├── public/index.html       # Dashboard frontend (single-file)
├── discord-template.json   # Template structure serveur (sync bidirectionnel)
├── brainexe-config.json    # Config persistante (automatisations, reaction roles...)
├── backup_*.json           # Snapshots auto de la structure Discord
└── README.md
```

---

## ⚙️ Variables d'environnement Railway

| Variable | Description | Requis |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ |
| `GUILD_ID` | ID du serveur Discord | ✅ |
| `ANTHROPIC_API_KEY` | Cle API Anthropic (Claude) | ✅ Pour les IA |
| `YOUTUBE_API_KEY` | Cle API YouTube Data v3 | ✅ Pour les recherches @mention |
| `TIKTOK_USERNAME` | Pseudo TikTok a surveiller | ✅ Pour les notifs live |
| `MONGODB_URI` | URI MongoDB Atlas | ✅ Profils + botState + channelMemory |
| `PORT` | Port serveur (auto Railway) | Auto |

---

## 🚀 Deploiement

```bash
npm install
git add .
git commit -m "feat: v2.0.3"
git push
```

Railway rebuild et redemarre le bot automatiquement.

---

## 🏗️ Architecture

### Sync bidirectionnel Discord ↔ JSON

```
Discord ──────► discord-template.json   (D→F, debounce 2s)
              ◄─────── discord-template.json   (F→D, debounce 2s)
```

### MongoDB Atlas — Trois collections

| Collection | Contenu |
|---|---|
| `memberProfiles` | userId, username, toneScore, topics, interactionCount, lastSeen |
| `botState` | anecdoteLastPostedDate, actusLastPostedSlots, convDailyCount, convLastPostDate |
| `channelMemory` | toneProfile, frequentThemes, insideJokes, heatLevel, offTopicTolerance, lastSummary |

---

## 🤖 Fonctionnalites bot — Vue complete

### 1. Auto-Role a l'arrivee
Chaque nouveau membre recoit automatiquement le role configure (defaut : `👁️ Lurker`).

---

### 2. Reaction Roles natif BrainEXE

| Emoji | Role |
|---|---|
| 📱 | 📱 TikToker |
| 🧠 | 🧠 TDAH |
| 💜 | 💜 Borderline |
| 💻 | 💻 Web Dev |
| ⚔️ | ⚔️ RPG Addict |
| 🕹️ | 🕹️ Retro Gamer |
| 🌿 | 🌿 Indie Explorer |
| 🚀 | 🚀 Next-Gen Player |
| 🔔 | 🔔 Notif Lives |
| 👁️ | 👁️ Lurker |

---

### 3. Message de bienvenue automatique
Phrase tiree au sort dans `welcome.messages`. Embed violet BrainEXE avec avatar du membre.

---

### 4. Anecdote Gaming Quotidienne

Routing intelligent — 7 salons thematiques. Declenchee a 10h (Paris) + delai aleatoire 0-30 min.
Anti-doublon via MongoDB. Rattrapage automatique au boot Railway.
Fil Discord cree automatiquement avec nom genere par Claude.

---

### 5. TikTok Live → Discord

Detection toutes les 2 minutes via `tiktok-live-connector`.
Embed demarrage : hook genere par Claude, viewers, lien direct, ping `🔔 Notif Lives`.
Embed fin : duree totale, pic viewers, likes, gifts.

---

### 6. Actus Bi-Mensuelles

Le 1er et le 15 de chaque mois a 10h. 9 salons configurables.
Posts etales sur 12h. Anti-doublon par slot MongoDB.

---

### 7. Lance-Conversations + Reponses Auto v2.0.0

**Planning horaire complet** — Brainee suit un emploi du temps reel :

| Tranche | Statut | Conv max | Intervalle |
|---|---|---|---|
| 01h – 09h | 💤 Dort | 0 | — |
| 09h – 10h | ☕ Reveil mou | 1 | — |
| 10h – 12h30 | 🧠 Active | 3 | 35 min |
| 12h30 – 14h | 🍕 Pause dej | 0 | @mention 2-8 min |
| 14h – 17h | ⚡ Productive | 4 | 25 min |
| 17h – 18h | 🚶 Transition | 1 | — |
| 18h – 23h30 | 🎮 Gaming | 6 | 18 min |
| 23h30 – 01h | 🌙 Hyperfocus | 1 | — |

Weekend : quotas augmentes, samedi soirée jusqu'a 1h du mat (8 conv max), dimanche mode chill/nostalgie.

**Comportements speciaux** :
- `postMorningGreeting()` — check morning 09h (lun-ven), 09h30 (sam), 10h (dim)
- `postLunchBack()` — retour pause 14h, 33% de chance
- `postGoodnight()` — bonne nuit 23h, 33% de chance
- `postNightWakeup()` — réveil nocturne 03h30, 10% de chance

**4 modes** : `debat` / `chaos` / `deep` / `simple` avec priorites selon le slot.

---

### 8. @Brainee Mention Directe v2.0.2

1. Typage indicator actif avant la reponse
2. Delai simule selon la tranche horaire
3. Pendant le sommeil : reponse differee au reveil (ignoree si message > 2h)
4. Fetch 100 messages de contexte avec identification precise des replies
5. Profil membre injecte (toneScore, topics, complicite)
6. Memoire salon injectee (v2.0.3)
7. Membres taggues dans le message -> inclus naturellement dans la reponse
8. Detection mot-cle YouTube → `extractYoutubeQuery()` via Claude → recherche propre
9. 10% de chance : reaction emoji seule, pas de texte
10. 25% de chance : reaction emoji + texte
11. 20% de chance : message fragmente en 2 parties avec pause

---

### 9. Persona Brainee v2.0.2 — Culture complete

**Profil** : Fille de 24 ans, internet native, gaming hardcore.

**Culture gaming** :
- JRPG : Final Fantasy (toute la serie), Persona, Dragon Quest, Tales of, Xenoblade, Fire Emblem, Star Ocean, Chrono Trigger
- Metroidvania : Castlevania (toute la serie, SOTN, Rondo, Aria...), Metroid (Super, Zero Mission, Fusion, Dread, Prime), Mega Man (Classic, X, Zero, ZX, Legends), Hollow Knight, Blasphemous, Dead Cells, Ori, Bloodstained, Salt & Sanctuary, Shovel Knight
- Soulslike : Elden Ring, Dark Souls, Sekiro, Bloodborne
- Indie : Hades, Stardew, Celeste, Disco Elysium, Undertale
- Retro gaming, next-gen, hidden gems

**Culture films** : sci-fi (Blade Runner, Matrix, Alien, Dune, Ex Machina, Ghost in the Shell), thriller (Se7en, Memento, Parasite), horreur (Hereditary, The Thing, It Follows, Midsommar).

**Culture musique** : annees 2000, K-pop, metal, dubstep, electro, lo-fi. Vraie passion OST gaming (Uematsu, Mitsuda, Yamane, Koji Kondo).

**Culture manga/anime** : Naruto, Fairy Tail, Black Clover, Shaman King, Attack on Titan. OAV gaming (FF7 Advent Children, Tales of Zestiria, Star Ocean EX).

**Culture bouffe** : tacos, kebab, burger, pizza assumes. Cuisine indienne et asiatique adoree. Peut donner des recettes.

**Daily mood** : tire chaque matin — `energique` / `chill` / `hyperfocus` / `zombie`. Influence le ton de toutes les interactions.

---

### 10. Profils Membres MongoDB v1.8.0

| Champ | Description |
|---|---|
| `toneScore` | Score complicite 1-10 (evolue auto) |
| `topics` | Sujets gaming mentionnes (max 15) |
| `interactionCount` | Nombre total d'interactions avec Brainee |
| `lastSeen` | Derniere interaction |

Evolution toneScore : +0.15 emoji rire, +0.10 message long, -0.05 message tres court.
Niveaux : 1-3 chaleureux uniquement / 4-6 ironie legere / 7-10 piques assumees.
Regle non negociable : sujet sensible → ton doux TOUJOURS.

---

### 11. Channel Memory v2.0.3 — Memoire vivante par salon

Chaque salon a son propre profil stocker dans MongoDB.

| Champ | Description |
|---|---|
| `toneProfile` | Description du ton habituel du salon |
| `frequentThemes` | Sujets recurrents detectes |
| `insideJokes` | References internes detectees |
| `heatLevel` | Niveau d'activite 1-10 |
| `offTopicTolerance` | Tolerance hors-sujet 1-10 |
| `lastSummary` | Resume des sujets recents |

`enrichChannelMemory()` tourne en background toutes les 6h par salon.
La memoire est injectee dans tous les prompts de conversation et @mention.

---

### 12. Detection de Derive Thematique v2.0.3

Brainee analyse les 30 derniers messages d'un salon et score la derive.

**Les 4 niveaux de comportement** :

| Niveau | Ce que fait Brainee |
|---|---|
| **Observe** | Elle lit, score les themes, n'intervient pas encore |
| **Suggest** | Elle propose doucement un meilleur endroit (70% des cas) |
| **Redirect** | Elle cree un thread ou poste dans le bon salon + message de pont (20%) |
| **Moderate** | Elle intervient plus fermement si spam/conflit/derapage (10%) |

Exemple de message Brainee en mode redirect :
*"ok on a officiellement transforme le general en refuge JRPG, je vous ouvre un coin dans #jrpg-corner"*

Drift check cron : toutes les 3h, sur les 5 salons les plus actifs.
Route manuelle : `POST /api/drift/check`.

---

## 🌐 API Routes

### Sync

| Methode | Route | Description |
|---|---|---|
| GET | `/api/state` | Etat complet Discord |
| POST | `/api/sync/discord-to-file` | Force D→F |
| POST | `/api/sync/file-to-discord` | Force F→D |

### Config

| Methode | Route | Description |
|---|---|---|
| GET | `/api/config` | Lire toute la config |
| POST | `/api/config` | Sauvegarder une section |

### Automatisations

| Methode | Route | Description |
|---|---|---|
| POST | `/api/anecdote` | Forcer une anecdote |
| POST | `/api/actus` | Forcer les actus |
| POST | `/api/conversation` | Forcer un lance-conv |
| POST | `/api/conversation/reply` | Forcer une reponse spontanee |
| POST | `/api/morning` | Forcer le morning greeting |
| POST | `/api/goodnight` | Forcer le goodnight |
| POST | `/api/nightwakeup` | Forcer le night wakeup |
| POST | `/api/tiktok/test` | Tester la connexion live TikTok |
| POST | `/api/welcome/test` | Tester le message de bienvenue |
| POST | `/api/post` | Post manuel dans un salon |

### Bot v2.0.3

| Methode | Route | Description |
|---|---|---|
| GET | `/api/slot` | Tranche horaire active + humeur du jour |
| POST | `/api/drift/check` | Declencher le check de derive manuellement |
| GET | `/api/channel-memory` | Toutes les memoires salons |
| GET | `/api/channel-memory/:id` | Memoire d'un salon specifique |

### Membres

| Methode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste des membres |
| GET | `/api/members/profiles` | Profils MongoDB (top 50) |
| PATCH | `/api/members/:id/roles` | Modifier les roles |
| POST | `/api/members/:id/mute` | Timeout |
| POST | `/api/members/:id/kick` | Expulser |
| POST | `/api/members/:id/ban` | Bannir |

---

## 📋 IDs importants

| Element | ID |
|---|---|
| Serveur (Guild) | `1481022956816830669` |
| Bot (App) | `1481022516783747242` |
| Message reaction roles | `1481033797800693790` |
| Salon `#choix-des-roles` | `1481028181485027471` |
| Salon `#presentations` | `1481028178389635292` |
| Salon `#alertes-live` | `1481028204897501273` |
| Salon `#general` | `1481028189680570421` |

---

## 🔧 Depannage

**MongoDB non connecte**
→ `MONGODB_URI` dans Railway ?
→ Boot log : `✅ MongoDB Atlas connecte — memberProfiles + botState + channelMemory`

**Drift check ne se declenche pas**
→ Check cron toutes les 3h seulement pendant les tranches actives (pas pendant le sommeil)
→ Forcer via `POST /api/drift/check`
→ Verifier que `ANTHROPIC_API_KEY` est defini

**Memoire salon vide**
→ Normal au premier boot — `enrichChannelMemory()` se declenche en background apres la premiere conv active
→ Verifier via `GET /api/channel-memory`

**YouTube retourne des resultats hors-sujet**
→ v2.0.2 : fix integre — `extractYoutubeQuery()` via Claude extrait la vraie requete
→ Si toujours probleme : verifier quota YouTube (10 000 unites/jour)

**Brainee repond trop vite / ne simule pas le typing**
→ `simulateTyping()` utilise `channel.sendTyping()` — verifier permission `Send Messages` du bot
→ Le typing dure max 10s cote Discord, Brainee attend min(duree, 8s)

**Bot ne detecte pas le live TikTok**
→ `tiktok-live-connector` installe ? `npm install`
→ `TIKTOK_USERNAME` dans Railway ?
→ Tester via `POST /api/tiktok/test`

**Quota conversations repart de zero apres redeploy**
→ Verifie que `MONGODB_URI` est defini — la persistance passe par `botState`

---

## 🔄 Changelog complet

---

### ⭐ `v2.0.3` — Channel Memory + Drift *(actuelle)*

- **`channelMemory`** : nouvelle collection MongoDB — mémoire vivante par salon
- **`enrichChannelMemory()`** : analyse Claude en background toutes les 6h (toneProfile, frequentThemes, insideJokes, heatLevel, offTopicTolerance, lastSummary)
- **`detectThematicDrift()`** : Claude analyse les 30 derniers messages, score de dérive 1-10
- **`handleDrift()`** : 4 niveaux observe/suggest/redirect/moderate
- Style 70% suggestion / 20% redirection / 10% ferme
- Message de pont dans le salon d'origine + mini résumé dans le salon cible
- Thread auto si jeu précis détecté lors d'une dérive
- `driftCron` toutes les 3h sur les 5 salons les plus actifs
- Mémoire salon injectée dans tous les prompts conversation et @mention
- Routes `/api/drift/check`, `/api/channel-memory`, `/api/channel-memory/:id`
- Index MongoDB `channelId` créé au boot

---

### `v2.0.2` — Full Human Update

- Persona étendue : films (sci-fi/thriller/horreur), musique (K-pop/metal/dubstep/OST), manga (bases + OAV gaming), bouffe (tacos/kebab/curry/ramen)
- `simulateTyping()` avant chaque réponse — Discord affiche "Brainee est en train d'écrire..."
- `sendHuman()` : 20% de chance de fragmenter en 2 messages avec pause 1-3s
- Réactions emoji autonomes : 10% réaction seule / 25% réaction + texte
- `getRandomReaction()` : pool gaming-aware selon le contenu
- `refreshDailyMood()` : humeur tirée chaque matin (energique/chill/hyperfocus/zombie)
- `getMoodInjection()` : injection de l'humeur dans tous les prompts
- 5% de chance d'ignorer une reply spontanée
- Fix YouTube : `extractYoutubeQuery()` via Claude avant l'appel API
- Injection des membres tagués dans `handleMentionReply()`
- Route `/api/slot` enrichie avec le mood

---

### `v2.0.1` — Threads automatiques

- `shouldCreateThread()` + `THREAD_TRIGGERS` : 50+ jeux détectés
- Thread auto sur anecdotes (nom généré par Claude)
- Thread auto sur lance-convs si jeu précis détecté
- `formatContext()` enrichi : `[↩ répond à X: "preview du message..."]` au lieu de `[↩ reply]`

---

### `v2.0.0` — Human Planning

- `WEEKDAY_SLOTS` / `SATURDAY_SLOTS` / `SUNDAY_SLOTS` : 3 grilles horaires
- `getCurrentSlot()`, `getRandomMode()`, `getMentionDelayMs()`, `getSlotIntervalMs()`
- `handleMentionReply()` : délai simulé par slot + sleep guard (message > 2h ignoré)
- `postMorningGreeting()` : 09h semaine / 09h30 samedi / 10h dimanche
- `postLunchBack()` : 14h, 33% de chance, délai 0-15 min
- `postGoodnight()` : 23h, 33% de chance, délai 0-30 min
- `postNightWakeup()` : 03h30, 10% de chance
- maxPerDay 5 → 16 / MIN_GAP 30 → 15 min
- Routes `/api/morning`, `/api/goodnight`, `/api/nightwakeup`

---

### `v1.9.0` — MongoDB State Migration

- `getBotState()` / `setBotState()` : état bot persistant entre redeploys Railway
- `checkAnecdoteMissed()` async : vérifie MongoDB avant rattrapage
- `checkActusMissed()` async : vérifie les slots MongoDB
- `resetDailyCountIfNeeded()` async : quota conversations persistant
- `updateConvStats()` async : statistiques inter-redeploys
- Boot non bloquant avec délai 25s
- Fix `replyToConversations()` : 1 seul fetch 100 messages

---

### `v1.8.0` — Brainee LevelUP

- MongoDB Atlas : profils membres persistants
- `toneScore` 1-10 évolutif, `topics` gaming, `interactionCount`, `lastSeen`
- 3 niveaux de ton selon le score de complicité
- Garde-fou sujets sensibles : ton doux forcé
- `BOT_PERSONA_CONVERSATION` : persona dédiée aux interactions directes
- Route `/api/members/profiles`

---

### `v1.7.0` — Special Optimisation

- Anecdotes multi-salon (7 salons routing thématique)
- TikTok Live → Discord (embeds démarrage + fin + stats)
- @Brainee mention directe avec YouTube Data API v3
- Renommage Brainy.exe → Brainee

---

### `v1.6.0` — Modes par catégorie

- `CATEGORY_MODES` : 11 catégories d'injection (general, tdah, humour, rpg, jrpg, retro, gaming, indie, creative, focus, dev)
- Fix apostrophes françaises dans les prompts JS

---

### `v1.5.0` — Reaction Roles natif

- Carl-bot retraité — Reaction Roles géré nativement
- `GuildMessageReactions` + `Partials` (détection sur messages existants)
- Config persistée dans `brainexe-config.json`
- Toggle ON/OFF + Message ID éditable depuis le dashboard

---

### `v1.4.0` — Persona Brainee

- Personnage Brainee : fille 24 ans, internet native, gaming hardcore
- `BOT_PERSONA` injectée dans tous les prompts
- `CONV_MODES` : 4 modes — débat / chaos / deep / simple

---

### `v1.3.0` — Automatisations avancées

- Actus bi-mensuelles : 1er et 15 du mois, étalées sur 12h
- `lastPostedSlots[]` — anti-doublon robuste
- Conversations : plage horaire, salon le plus calme en priorité
- Rate limit global + rattrapage au boot

---

### `v1.2.0` — Dashboard multi-pages

- Pages complètes : Members, Channels, Roles, Welcome, Logs, Backups, Settings
- Gestion membres : rôles, timeout, kick, ban
- Posts manuels avec raccourcis par catégorie

---

### `v1.1.0` — Sync bidirectionnel

- Sync Discord ↔ JSON en temps réel (debounce 2s)
- Watcher chokidar
- Dashboard WebSocket en temps réel

---

### `v1.0.0` — Base

- Bot Discord connecté + Express + WebSocket
- Sync initiale Discord → JSON au démarrage
- Dashboard basique single-file HTML

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
