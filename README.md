# 🧠 BrainEXE Dashboard `v2.0.8`

> **v2.0.8 — GNews API + Actualités réelles** — Les actualités gaming ne sont plus inventées au hasard. Brainee récupère les vraies news récentes via GNews API, les déduplique, et les résume en style Brainee avec les liens. Plus crédible, plus utile, plus à jour.

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
| **tiktok-live-connector** | Detection live TikTok |
| **MongoDB Atlas** | Profils membres + etat bot + memoire salons + historique DM + annuaire salons |
| **Railway** | Hebergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js               # Bot + API + WebSocket
├── public/index.html       # Dashboard frontend
├── discord-template.json   # Template structure serveur
├── brainexe-config.json    # Config persistante
├── backup_*.json           # Snapshots auto
└── README.md
```

---

## ⚙️ Variables d'environnement Railway

| Variable | Description | Requis |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ |
| `GUILD_ID` | ID du serveur | ✅ |
| `ANTHROPIC_API_KEY` | Claude API | ✅ |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | ✅ |
| `GNEWS_API_KEY` | GNews API pour actualités gaming | ✅ |
| `TIKTOK_USERNAME` | Pseudo TikTok | ✅ |
| `MONGODB_URI` | Atlas URI | ✅ |
| `PORT` | Auto Railway | Auto |

---

## 🚀 Déploiement

```bash
git add .
git commit -m "feat: v2.0.6"
git push
```

### Ce que tu dois vérifier une seule fois

**Discord Developer Portal** — Privileged Gateway Intents :
- Message Content Intent ✅
- Server Members Intent ✅

**Premier démarrage** — Brainee lit les premiers messages de chaque salon 30 secondes après le boot. C'est automatique. Elle ne le refait pas aux redémarrages suivants.

**Vérifier que ça a marché** après le premier boot :
```
GET /api/channel-directory
```
Tu verras un objet par salon avec la description officielle et le résumé du but.

---

## 🏗️ Architecture

### MongoDB Atlas — Cinq collections

| Collection | Contenu |
|---|---|
| `memberProfiles` | toneScore, topics, interactionCount, lastSeen |
| `botState` | état bot persistant entre redeploys |
| `channelMemory` | toneProfile, frequentThemes, insideJokes, heatLevel |
| `dmHistory` | historique privé des DMs par utilisateur |
| `channelDirectory` | description officielle + but résumé de chaque salon |

---

## 🤖 Fonctionnalités bot — Vue complète v2.0.8

### 1. Auto-Role + Reaction Roles
Auto-role `👁️ Lurker` à l'arrivée. 10 reaction roles gérés nativement.

---

### 2. Message de bienvenue
Phrase aléatoire, embed violet BrainEXE avec avatar du membre.

---

### 3. Anecdote Gaming Quotidienne
10h (Paris) + délai aléatoire 0-30 min. Routing 7 salons thématiques.
Fil Discord créé automatiquement avec nom généré par Claude.

---

### 4. TikTok Live → Discord
Detection 2 min. Embed démarrage avec hook Claude, viewers, lien cliquable.
Embed fin avec durée, pic viewers, likes, top gifts. Fix v2.0.6 : valeurs correctement castées en string.

---

### 5. Actus Bi-Mensuelles v2.0.8
1er et 15 du mois à 10h. 9 salons sur 12h.

**GNews API integration v2.0.8** :
- Récupère vraies actualités gaming récentes (40 jours) via GNews
- Filtrage multi-langue : français d'abord, fallback anglais si insuffisant
- Déduplication par URLs stockées en MongoDB (max 100)
- Claude résume et formate avec les liens en style Brainee
- Fallback Claude pur si GNews ne retourne rien

---

### 6. Planning horaire complet v2.0.0

| Tranche | Statut | Conv max | Intervalle |
|---|---|---|---|
| 01h – 09h | 💤 Dort | 0 | — |
| 09h – 10h | ☕ Réveil mou | 1 | — |
| 10h – 12h30 | 🧠 Active | 3 | 35 min |
| 12h30 – 14h | 🍕 Pause déj | 0 | @mention 2-8 min |
| 14h – 17h | ⚡ Productive | 4 | 25 min |
| 17h – 18h | 🚶 Transition | 1 | — |
| 18h – 23h30 | 🎮 Gaming | 6 | 18 min |
| 23h30 – 01h | 🌙 Hyperfocus | 1 | — |

Weekend : quotas augmentés. Samedi soirée jusqu'à 1h (8 conv max, 15 min).
Dimanche : mode chill/nostalgie.

**Comportements spéciaux** : morning greeting 09h/09h30/10h (85%), lunch back 14h (33%), goodnight 23h (33%), night wakeup 03h30 (10%).

---

### 7. Discipline Salon v2.0.6 — Le cœur de la mise à jour

Brainee lit la description officielle de chaque salon (premier message fondateur) et l'utilise comme contrainte absolue.

**16 catégories de salons**, chacune avec ses propres règles :

| Catégorie | Comportement |
|---|---|
| `general-social` | QG du serveur — tout est possible, journées/humeurs/actus. Pas de gaming par défaut. |
| `tdah-neuro` | Pensées TDAH, hyperfocus sur N'IMPORTE QUEL sujet. Pas de gaming sauf si un membre l'amène. |
| `humour-chaos` | 4 registres égaux : memes, humour neuro, gaming ABSURDE, chaos. Pas d'automatisme gaming. |
| `off-topic` | Fourre-tout : films, séries, musique, vie. Pas gaming par défaut. |
| `creative` | Encouragement créatif, réaction sur la DA. Pas de débats gaming. |
| `music-focus` | Musique, OST, playlists, concentration. |
| `focus` | Productivité, méthodes, fatigue cognitive. |
| `ia-tools` | Outils IA, workflows, usages concrets. |
| `dev-tools` | Code, langages, bugs, scripts. |
| `creative-visual` | DA, palettes, style visuel. |
| `nostalgie` | Souvenirs gaming, époque, mémoire affective. |
| `lore` | Théories, détails cachés, narration. |
| `jrpg` | JRPG complet à fond. |
| `retro` | Retro gaming à fond. |
| `indie` | Indé à fond. |
| `rpg` | RPG à fond. |
| `gaming-core` | Gaming naturel, non robotisé. |

---

### 8. Intelligence élargie v2.0.6

**Système d'outils intégré dans la persona** — quand des infos web sont disponibles dans le contexte, Brainee les utilise naturellement :
> *"ah ouais ils ont annoncé ça ? j'avais pas vu 👀"*

Elle ne mentionne jamais les outils ou API. Elle reformule toujours.

**Humeur du jour corrigée** — plus de "hyperfocus gaming" générique. L'humeur hyperfocus signifie maintenant "va loin dans le vrai thème du salon".

**Modes de conversation corrigés** — les 4 modes (débat, chaos, deep, simple) s'adaptent au salon. Plus de gaming par défaut dans tous les modes.

---

### 9. @Brainee Mention Directe v2.0.5+

1. Délai simulé selon la tranche horaire
2. Contexte 100 messages avec identification précise des replies
3. Profil membre + toneScore + humeur du jour
4. Mémoire salon + description officielle (v2.0.6)
5. Membres tagués injectés dans le prompt
6. Recherche YouTube propre via extraction Claude
7. 10% réaction emoji seule → retour 15-45 min avec excuse contextuelle
8. 25% réaction emoji + texte
9. Résolution mentions `@Pseudo → <@id>` et `#salon → <#id>` partout

---

### 10. Persona Brainee v2.0.6

**Culture gaming** (dans les bons salons) : JRPG complet, Castlevania toute la série, Metroid toute la série, Mega Man Classic/X/Zero, soulslike, indie, retro, next-gen, pixel art, lore, OST (Uematsu, Mitsuda, Yamane).

**Culture large** (tous salons) : films (Blade Runner, Matrix, Alien, Dune, Hereditary, Se7en...), musique (K-pop, metal, dubstep, lo-fi, OST), manga (Naruto, AoT, Fairy Tail, Shaman King + OAV gaming), bouffe (tacos, kebab, curry, ramen).

**Daily mood** : energique / chill / hyperfocus / zombie — corrigé, plus de biais gaming.

---

### 11. DMs v2.0.5

Historique privé persistant MongoDB (`dmHistory`, 30 messages max).
Ton plus intime — posé, à l'écoute, peut creuser les sujets.
Fragmentation 15% en DM (plus douce qu'en serveur).

---

### 12. Retour tardif après emoji v2.0.4

Quand elle tire le 10% emoji-seul, retour 15-45 min avec excuse contextuelle selon l'heure :
> *"j'étais sur un boss, IMPOSSIBLE de répondre à ce moment précis 😭"*
> *"j'avais la bouche pleine sérieusement 😂"*

---

### 13. Mémoire par salon v2.0.3

`channelMemory` MongoDB — toneProfile, frequentThemes, insideJokes, heatLevel, offTopicTolerance. Enrichi toutes les 6h en background.

---

### 14. Détection de dérive thématique v2.0.3

Score de dérive 1-10 sur les 30 derniers messages.
4 niveaux : observe → suggest (70%) → redirect (20%) → moderate (10%).

---

### 15. Threads automatiques v2.0.6

Créés uniquement si :
- Engagement humain détecté (réaction ou reply sur le message)
- Salon autorisé (11 salons gaming/lore uniquement)
- Contenu assez long (>100 caractères)
- Jeu précis détecté (50+ triggers)

**Salons autorisés** : retro-général, jrpg-corner, rpg-général, indie-général, next-gen-général, hidden-gems, lore-et-théories, pixel-art-love, nostalgie, game-of-the-moment, open-world-rpg.

---

### 16. Profils membres v1.8.0

toneScore 1-10 : +0.15 emoji rire, +0.10 message long, -0.05 très court.
Niveaux : 1-3 chaleureux / 4-6 ironie légère / 7-10 piques assumées.
Sujet sensible → ton doux TOUJOURS.

---

## 🌐 API Routes complètes

### Sync
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | État Discord complet |
| POST | `/api/sync/discord-to-file` | Force D→F |
| POST | `/api/sync/file-to-discord` | Force F→D |

### Config
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/config` | Lire la config |
| POST | `/api/config` | Sauvegarder une section |

### Automatisations
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/anecdote` | Forcer une anecdote |
| POST | `/api/actus` | Forcer les actus |
| POST | `/api/conversation` | Forcer un lance-conv |
| POST | `/api/conversation/reply` | Forcer une réponse |
| POST | `/api/morning` | Forcer morning greeting |
| POST | `/api/goodnight` | Forcer goodnight |
| POST | `/api/nightwakeup` | Forcer night wakeup |
| POST | `/api/tiktok/test` | Tester TikTok |
| POST | `/api/welcome/test` | Tester welcome |
| POST | `/api/post` | Post manuel |

### Bot v2.0.6
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/slot` | Tranche active + humeur |
| POST | `/api/drift/check` | Check dérive manuel |
| GET | `/api/channel-memory` | Mémoires salons |
| GET | `/api/channel-memory/:id` | Mémoire d'un salon |
| GET | `/api/channel-directory` | Annuaire officiel des salons |
| GET | `/api/dm-history/:userId` | Historique DM d'un user |

### Membres
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste membres |
| GET | `/api/members/profiles` | Profils MongoDB |
| PATCH | `/api/members/:id/roles` | Modifier rôles |
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
| Salon `#général` | `1481028189680570421` |

---

## 🔧 Dépannage

**channelDirectory vide après le boot**
→ Attendre 35-40s après le démarrage
→ Vérifier via `GET /api/channel-directory`
→ Si vide : vérifier que `ANTHROPIC_API_KEY` et `MONGODB_URI` sont définis

**Brainee parle encore de gaming hors-sujet**
→ Le channelDirectory n'est pas encore initialisé — attendre le premier boot complet
→ Vérifier la description officielle du salon via `/api/channel-directory`

**Threads créés sans engagement**
→ Normal avant v2.0.6 — désormais `hasEngagement` requis + salon de la liste autorisée

**Embeds TikTok cassés (valeurs manquantes)**
→ Fix intégré en v2.0.6 — toutes les valeurs numériques castées en String

**Actus gaming obsolètes ou invoquées au hasard**
→ Fix v2.0.8 : GNews API récupère vraies news récentes, déduplication MongoDB, Claude résume uniquement

**YouTube retourne des résultats hors-sujet**
→ Fix v2.0.2 : `extractYoutubeQuery()` via Claude avant l'appel API

**DMs non reçus**
→ Vérifier Message Content Intent dans Discord Developer Portal

---

## 🔄 Changelog complet

---

### ⭐ `v2.0.8` — GNews API + Actualités réelles *(actuelle)*

- **`fetchGamingNews(topic, postedUrls)`** : requête GNews API (FR + EN fallback)
- **Déduplication par MongoDB** : `botState.postedNewsUrls` (max 100 URLs)
- **Actualités vraies + récentes** : 40 jours retour avec filtrage par topic
- **Claude résume + style Brainee** : inclut les liens Markdown dans le résumé
- **Fallback Claude pur** : si GNews ne retourne rien
- Ajout `GNEWS_API_KEY` dans config.js et env Railway

---

### `v2.0.7` — Préparation GNews

- Structure actus refactorisée pour intégration API

---

### `v2.0.6` — Discipline Salon + Intelligence élargie

- **`channelDirectory`** : nouvelle collection MongoDB — description officielle de chaque salon
- **`initChannelDirectory()`** : lit le premier message fondateur au boot (30s de délai), résume le but via Claude, persiste en MongoDB
- **`normalizeLoose()`** + **`getChannelCategory()`** : catégorise chaque salon (16 types)
- **`getChannelIntentBlock()`** : contrainte d'écriture absolue injectée dans les 5 fonctions IA
- **`getModeInjectionForChannel()`** : modes adaptes à chaque catégorie de salon
- **`BOT_PERSONA_CONVERSATION`** remplacée : discipline salon absolue + système d'outils web + illusion humaine + interdits explicites
- **`getMoodInjection()`** corrigé : hyperfocus sur le vrai thème du salon, pas forcément gaming
- **`CONV_MODES`** corrigés : plus de gaming hardcodé dans les 4 modes
- **`shouldCreateThread()`** : engagement humain requis + `THREAD_ALLOWED_CHANNELS` (11 salons)
- **`sendHuman()`** : `resolveMentionsInText` intégré directement
- Fix embeds TikTok : `String(viewerCount ?? 0)`, lien cliquable propre
- Route `/api/channel-directory`

---

### `v2.0.5` — DMs + Résolution mentions

- `INTENTS_DIRECT_MESSAGES` · `dmHistory` MongoDB · `BOT_PERSONA_DM`
- DM handler avec historique 30 msgs · fragmentation 15%
- `resolveMentionsInText()` partout (mentions + salons)

---

### `v2.0.4` — Delayed Reply After Emoji

- `getEmojiExcuse()` · `scheduleDelayedReplyAfterEmoji()` · `scheduleDelayedSpontaneousReply()`

---

### `v2.0.3` — Channel Memory + Thematic Drift

- `channelMemory` MongoDB · `detectThematicDrift()` · `handleDrift()` 4 niveaux · drift cron 3h

---

### `v2.0.2` — Full Human Update

- Persona étendue · typing · fragmentation · emoji · mood · YouTube fix

---

### `v2.0.1` — Threads auto · formatContext() précis

---

### `v2.0.0` — Human Planning

- Grilles horaires semaine/samedi/dimanche · comportements spéciaux · maxPerDay 16

---

### `v1.9.0` — MongoDB State Migration

- `getBotState/setBotState` · persistance inter-redeploys Railway

---

### `v1.8.0` → `v1.0.0`

Voir historique complet dans le changelog Discord (message Brainee.exe).

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
