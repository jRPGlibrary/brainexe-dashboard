# 🧠 BrainEXE Dashboard `v2.0.9`

> **v2.0.9 — Âme de Brainee** — Brainee a maintenant une vraie vie intérieure. Un système d'émotions à 4 couches (tempérament, états internes, émotions vives, liens membres), une évolution affective par membre persistée en MongoDB, et un filtre d'humanisation contextuel qui lui donne le feel d'une personne qui tape vite — fautes d'accents, "tkt", "y'a", "ptet", relâchement naturel selon son état du moment.

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
| **MongoDB Atlas** | Profils membres + état bot + mémoire salons + historique DM + annuaire salons + liens affectifs membres |
| **Railway** | Hebergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js                    # Bot + API + WebSocket
├── public/index.html            # Dashboard frontend
├── discord-template.json        # Template structure serveur
├── src/
│   ├── ai/
│   │   ├── claude.js            # Appels Anthropic (prompt caching)
│   │   └── youtube.js           # Recherche YouTube
│   ├── api/
│   │   └── routes.js            # Routes Express
│   ├── bot/
│   │   ├── channelIntel.js      # Catégorisation + discipline salon
│   │   ├── emotions.js          # ★ NOUVEAU — Système émotionnel 4 couches
│   │   ├── humanize.js          # ★ NOUVEAU — Filtre humanisation (fautes, slang)
│   │   ├── keywords.js          # Mots-clés gaming + YouTube
│   │   ├── messaging.js         # sendHuman, typing, mentions
│   │   ├── mood.js              # Humeur du jour (+ seed états internes)
│   │   ├── persona.js           # Personnalité Brainee (3 variantes)
│   │   ├── reactions.js         # Emojis + threads
│   │   └── scheduling.js        # Grilles horaires semaine/WE
│   ├── db/
│   │   ├── botState.js          # État persistant bot
│   │   ├── channelDir.js        # Annuaire officiel des salons
│   │   ├── channelMem.js        # Mémoire par salon
│   │   ├── dmHistory.js         # Historique DMs
│   │   ├── index.js             # Connexion MongoDB + indexes
│   │   ├── memberBonds.js       # ★ NOUVEAU — Liens affectifs par membre
│   │   └── members.js           # Profils membres (toneScore, topics)
│   ├── discord/
│   │   ├── events.js            # Handlers Discord (DM, mention, réactions)
│   │   └── sync.js              # Sync Discord ↔ fichier
│   └── features/
│       ├── actus.js             # Actus bi-mensuelles
│       ├── anecdotes.js         # Anecdote gaming quotidienne
│       ├── context.js           # Formatage contexte 100 msgs
│       ├── convStats.js         # Stats conversations
│       ├── conversations.js     # Lance-conv + reply spontané
│       ├── delayedReply.js      # Retour tardif après emoji
│       ├── drift.js             # Détection dérive thématique
│       ├── greetings.js         # Morning/goodnight/lunchback
│       ├── tiktok.js            # TikTok Live → Discord
│       └── welcome.js           # Message de bienvenue
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
| `TIKTOK_USERNAME` | Pseudo TikTok | ✅ |
| `MONGODB_URI` | Atlas URI | ✅ |
| `PORT` | Auto Railway | Auto |

---

## 🚀 Déploiement

```bash
git add .
git commit -m "feat: v2.0.9"
git push
```

### Ce que tu dois vérifier une seule fois

**Discord Developer Portal** — Privileged Gateway Intents :
- Message Content Intent ✅
- Server Members Intent ✅

---

## 🏗️ Architecture

### MongoDB Atlas — Six collections

| Collection | Contenu |
|---|---|
| `memberProfiles` | toneScore, topics, interactionCount, lastSeen |
| `botState` | état bot persistant + état émotionnel global |
| `channelMemory` | toneProfile, frequentThemes, insideJokes, heatLevel |
| `dmHistory` | historique privé des DMs par utilisateur |
| `channelDirectory` | description officielle + but résumé de chaque salon |
| `memberBonds` | ★ liens affectifs par membre (attachment, trust, trajectory, keyMoments) |

---

## 🤖 Fonctionnalités bot — Vue complète v2.0.9

### ★ 1. Système émotionnel 4 couches `v2.0.9`

L'âme de Brainee est maintenant structurée en 4 couches :

| Couche | Fichier | Rôle |
|---|---|---|
| **Tempérament** | `emotions.js` | Quasi-stable : humour 85, sarcasme 55, loyauté 95, curiosité 80... |
| **États internes** | `emotions.js` | Energy, socialNeed, calmNeed, stimulation, mentalLoad — évoluent sur la journée |
| **Émotions vives** | `emotions.js` | Stack de 12 max, decay horaire : curiosity, amusement, annoyance, warmth... |
| **Liens membres** | `memberBonds.js` | baseAttachment, baseTrust, trajectory 14j, keyMoments avec decay |

**Les états internes** changent selon le slot horaire (gaming → +énergie+social, latenight → -énergie, lunch → -charge) et dérivent naturellement vers 50 chaque jour.

**Les émotions vives** sont détectées depuis les messages (😂 → amusement, "merci" → warmth+pride, "stress" → tenderness+protectiveness) et s'estompent en quelques heures.

**L'état émotionnel influence** :
- le ton généré (injection dans le system prompt)
- le nombre de tokens (zombie/surchargée → -35%, énergique → +15%)
- la probabilité d'humanisation
- les bonds membres

---

### ★ 2. Liens affectifs par membre `v2.0.9`

Pour chaque membre, Brainee accumule un lien persistant :

```
baseAttachment (0-100)     : affection de fond (évolue en semaines)
baseTrust      (0-100)     : confiance accumulée
baseComfort    (0-100)     : confort social
currentMood                : état du moment avec cette personne
emotionalTrajectory        : résumés journaliers (14 derniers jours)
keyMoments                 : moments marquants avec decay (impact diminue sur ~60j)
interactionStreak          : jours consécutifs d'échange
```

**Évolution** :
- Chaque interaction met à jour le `currentMood` (openness, curiosity, warmth, patience, teasing)
- En fin de journée : decay des keyMoments, dérive du currentMood vers baseline, archive dans trajectory
- Si le membre est absent >3 jours : baseAttachment décroît doucement
- Si échanges positifs répétés : baseAttachment monte lentement

**Effet visible** :
- Avec un membre à fort attachement → Brainee est plus relâchée, plus taquine, plus susceptible d'utiliser du slang
- Avec un membre à faible attachement → ton plus neutre, moins de relâchement
- La description du lien est injectée dans chaque prompt : "Tu es très attachée à cette personne (attachement 78/100). T'as eu des échanges positifs récents."

---

### ★ 3. Filtre d'humanisation contextuel `v2.0.9`

Brainee écrit maintenant comme quelqu'un qui tape vite. Le filtre est **contextuel, pas aléatoire** — il s'active selon l'état du moment.

**Trois niveaux :**

| Filtre | Condition | Exemples |
|---|---|---|
| `relax_filter` | energy<60 OU attachment>65 OU mood=chill | "je ne sais pas" → "j'sais pas", "t'inquiète pas" → "tkt", "peut-être" → "ptet" |
| `accent_drop` | texte >120 car OU energy>75 OU slot=latenight | "réfléchi" → "reflechi", "déjà" → "deja" (max 2-3 par message) |
| `slang_injection` | attachment>65 ET mood=energique/chill | ajoute "franchement", "nan mais", "du coup", "genre", "en vrai" |

**Règles de sécurité :**
- Jamais de faute en début de première phrase
- Jamais sur les mots critiques (être, très, où, après, père, mère...)
- Jamais à l'intérieur des mentions `<@id>`, `<#id>`, emojis `:nom:`
- Max 2 filtres par message
- Plus l'attachement est fort + l'énergie basse → plus de relâchement

**Exemples selon état :**

```
État: zombie (energy=28) + forte attachement
Avant : "Je ne sais pas trop ce qu'il faut faire là."
Après : "j'sais pas trop ce qu'il faut faire la"

État: énergique + attachement neutre
Avant : "C'est vraiment une bonne idée ce truc."
Après : "franchement, c'est vraiment une bonne idée ce truc"

État: chill + faible attachement
Avant : "Tu peux regarder ce point aussi."
Après : "Tu peux regarder ce point aussi"  (peu de changement)
```

---

### 4. Crons émotionnels `v2.0.9`

| Cron | Heure | Action |
|---|---|---|
| `emotionHourlyCron` | toutes les heures à :30 | updateInternalStates selon slot + decay émotions + save |
| `emotionDailyCron` | 00h05 | applyDailyDrift + runDailyBondEvolution + save |
| `moodResetCron` | 00h01 | Reset humeur du jour + seed états internes |

---

### 5. Planning horaire complet v2.0.0

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

---

### 6. Discipline Salon v2.0.6

Brainee lit la description officielle de chaque salon et l'utilise comme contrainte absolue.
16 catégories : general-social, tdah-neuro, humour-chaos, off-topic, creative, music-focus, focus, ia-tools, dev-tools, creative-visual, nostalgie, lore, jrpg, retro, indie, rpg, gaming-core.

---

### 7. Persona Brainee v2.0.9

**Tempérament stable** : humour 85, sarcasme léger 55, loyauté 95, curiosité 80, empathie 75, goût du débat 70, tolérance au chaos 65.

**Culture gaming** (dans les bons salons) : JRPG complet, Castlevania toute la série, Metroid, Mega Man, soulslike, indie, retro, next-gen, pixel art, lore, OST (Uematsu, Mitsuda, Yamane).

**Culture large** (tous salons) : films SF/thriller/horreur, musique OST et lo-fi, manga, bouffe comfort food.

**Daily mood** : energique / chill / hyperfocus / zombie — chaque mood seed les états internes au démarrage de la journée.

---

### 8. DMs v2.0.5+

Historique privé persistant MongoDB (`dmHistory`, 30 messages max).
Ton plus intime — posé, à l'écoute.
Humanisation active en DM aussi (bonds + emotional signal).

---

### 9. Retour tardif après emoji v2.0.4

Quand elle tire le 10% emoji-seul, retour 15-45 min avec excuse contextuelle selon l'heure.

---

### 10. Mémoire par salon v2.0.3

`channelMemory` MongoDB — toneProfile, frequentThemes, insideJokes, heatLevel. Enrichi toutes les 6h.

---

### 11. Détection de dérive thématique v2.0.3

Score de dérive 1-10 sur les 30 derniers messages. 4 niveaux : observe → suggest → redirect → moderate.

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

### Bot actions
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

### Bot état
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/slot` | Tranche active + humeur |
| POST | `/api/drift/check` | Check dérive manuel |
| GET | `/api/channel-memory` | Mémoires salons |
| GET | `/api/channel-memory/:id` | Mémoire d'un salon |
| GET | `/api/channel-directory` | Annuaire officiel des salons |
| GET | `/api/dm-history/:userId` | Historique DM d'un user |

### ★ Émotions v2.0.9
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/emotions/state` | État interne + tempérament + stack émotions |
| GET | `/api/emotions/bonds` | Tous les liens membres (tri par attachement) |
| GET | `/api/emotions/bonds/:userId` | Lien détaillé d'un membre |

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

**Brainee ne se relâche pas / toujours très formelle**
→ Vérifier via `GET /api/emotions/state` — si energy > 70 et mentalLoad < 30, le filtre devrait s'activer
→ Le lien avec le membre influence aussi : si baseAttachment < 40, peu de slang

**Liens membres vides**
→ Normal au premier boot — les bonds se construisent à chaque interaction
→ Vérifier via `GET /api/emotions/bonds`

**channelDirectory vide après le boot**
→ Attendre 35-40s après le démarrage
→ Si vide : vérifier `ANTHROPIC_API_KEY` et `MONGODB_URI`

**Embeds TikTok cassés**
→ Fix intégré en v2.0.6 — toutes les valeurs numériques castées en String

---

## 🔄 Changelog complet

---

### ⭐ `v2.0.9` — Âme de Brainee *(actuelle)*

- **`emotions.js`** : système émotionnel 4 couches — tempérament stable, états internes (energy/socialNeed/mentalLoad...), stack d'émotions vives avec decay horaire, détection depuis messages
- **`memberBonds.js`** : liens affectifs par membre — baseAttachment, baseTrust, baseComfort, currentMood, trajectory 14j, keyMoments avec decay journalier
- **`humanize.js`** : filtre d'humanisation contextuel — relax_filter (tkt, j'sais pas, ptet...), accent_drop (fautes légères sur longs textes), slang_injection (franchement, nan mais, du coup...)
- **`mood.js`** : chaque humeur du jour seed maintenant les états internes (`energique` → energy=78, `zombie` → energy=28, mentalLoad=65...)
- **`messaging.js`** : `sendHuman()` applique le filtre `humanize()` contextuellement selon état émotionnel + bond du membre
- **`emotions.js`** : `getEmotionalInjection()` + `getTemperamentInjection()` injectés dans tous les prompts
- **`events.js`** + **`conversations.js`** : wire complet — bonds chargés, émotions détectées, injection dans prompts, `adjustMaxTokens()` actif
- **`crons.js`** : `emotionHourlyCron` (decay + update états) + `emotionDailyCron` (bonds + drift journalier)
- **`db/index.js`** : collection `memberBonds` + `loadEmotionalState()` au boot
- **`api/routes.js`** : 3 nouvelles routes `/api/emotions/...`
- **`persona.js`** : section ÂME v2.0.9 — instructions d'humanisation intégrées dans `BOT_PERSONA_CONVERSATION` et `BOT_PERSONA_DM`

---

### `v2.0.6` — Discipline Salon + Intelligence élargie

- `channelDirectory` MongoDB · `initChannelDirectory()` · 16 catégories · `BOT_PERSONA_CONVERSATION` discipline salon absolue

---

### `v2.0.5` — DMs + Résolution mentions

- `INTENTS_DIRECT_MESSAGES` · `dmHistory` MongoDB · `resolveMentionsInText()` partout

---

### `v2.0.4` — Delayed Reply After Emoji

- `getEmojiExcuse()` · `scheduleDelayedReplyAfterEmoji()` · `scheduleDelayedSpontaneousReply()`

---

### `v2.0.3` — Channel Memory + Thematic Drift

- `channelMemory` MongoDB · `detectThematicDrift()` · 4 niveaux · drift cron 3h

---

### `v2.0.2` — Full Human Update

- Persona étendue · typing · fragmentation · emoji · mood · YouTube fix

---

### `v2.0.0` — Human Planning

- Grilles horaires semaine/samedi/dimanche · comportements spéciaux · maxPerDay 16

---

### `v1.9.0` — MongoDB State Migration

- `getBotState/setBotState` · persistance inter-redeploys Railway

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
