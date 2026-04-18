# 🧠 BrainEXE Dashboard `v2.0.8`

> **v2.0.8 — GNews API + Actualités réelles + Planning Adaptatif** — Brainee est maintenant plus humaine. Elle génère chaque jour une "vibe" (chatty, introvert, impulsive...) qui influence son comportement. Les horaires ne sont plus fixes (9h pile) mais flottants ±20-30 min. Elle peut refuser de répondre, repousser à demain, ou être hyperactive selon son humeur. Moins de tags, moins de structure rigide, plus d'âme.

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
| **GNews API** | Vraies actualites gaming recentes (bi-mensuel) |
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
git commit -m "feat: v2.0.8"
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

### 5. Actus Bi-Mensuelles
1er et 15 du mois à 10h. 9 salons sur 12h.

**GNews API integration v2.0.8** :
- Récupère vraies actualités gaming récentes (40 jours) via GNews
- Filtrage multi-langue : français d'abord, fallback anglais si insuffisant
- Déduplication par URLs stockées en MongoDB (max 100)
- Claude résume et formate avec les liens en style Brainee
- Fallback Claude pur si GNews ne retourne rien


---

### 6. Planning horaire adaptatif v2.0.8 — NOUVEAU

**Concept clé** : chaque jour, Brainee génère une "vibe" quotidienne qui influence toute son activité :

#### Vibes disponibles (tirées au hasard chaque matin)
- **chatty** : elle relance facilement, chattiness 95%
- **introvert** : peu sociable, chattiness 35%
- **impulsive** : décisions last-minute, impulse 60%
- **lazy** : fainéante, chattiness 40%
- **focus** : concentrée, chattiness 50%
- **excited** : hypée, chattiness 90%
- **grumpy** : de mauvais poil, chattiness 55%
- **balanced** : équilibrée, chattiness 70% (par défaut)

#### Horaires flottants (±jitter aléatoire chaque jour)
Au lieu de dire bonjour à 9h00 pile, Brainee choisit aléatoirement entre 8h30 et 9h25. Même logique pour :
- **Lunch back** : 14h ± 25 min
- **Goodnight** : 23h ± 45 min  
- **Night wakeup** : 3h-4h ± 60 min (rare, 10%)

#### Comportement par slot horaire (inchangé en base, modulé par vibe)

| Tranche | Statut | Conv max | Intervalle | Vibe-modulé |
|---|---|---|---|---|
| 01h – 09h | 💤 Dort | 0 | — | Skip possible si vibe lazy |
| 09h – 10h | ☕ Réveil | 1 | — | 60-95% post (selon chattiness) |
| 10h – 12h30 | 🧠 Active | 3 | 35 min | Accéléré si excited, ralenti si introvert |
| 12h30 – 14h | 🍕 Pause | 0 | @mention 2-8 min | Skip si très lazy |
| 14h – 17h | ⚡ Productive | 4 | 25 min | Normal |
| 17h – 18h | 🚶 Transition | 1 | — | Skip possible si introvert |
| 18h – 23h30 | 🎮 Gaming | 6 | 18 min | Accéléré si excited/impulsive |
| 23h30 – 01h | 🌙 Hyperfocus | 1 | — | Skip si lazy |

Weekend : quotas augmentés. Samedi soirée jusqu'à 1h (8 conv max, 15 min).
Dimanche : mode chill/nostalgie.

---

### 7. Agency — Brainee peut refuser ou différer (v2.0.8)

#### Sur @mention (mention directe)
- **Urgent** (détecté par keywords ou question directe) → réponse rapide (1-5 min)
- **Normal** → délai selon slot (0-8 min)
- **Non-urgent + vibe lazy/introvert** → report au lendemain à 10-12h avec relance @mention
- **Skip aléatoire** → ignore complètement (5-40% selon chattiness de la vibe)

#### Sur conv ambiante (lancée de elle-même)
- **Skip par vibe** : si chattiness basse, chance de skip le cron de conv (jusqu'à 75%)
- **Impulsion spontanée** : chaque minute, petite chance de post impulsif hors-cron si excited (5-60% selon vibe.impulse)

---

### 8. Discipline Salon v2.0.6+ — Toujours actif

Brainee lit la description officielle de chaque salon (premier message) et l'utilise comme contrainte absolue.

**16 catégories de salons**, chacune avec ses propres règles.

---

### 9. Intelligence élargie v2.0.6

Système d'outils intégré dans la persona — quand des infos web sont disponibles, elle les utilise naturellement sans mentionner les outils.

---

### 10. @Brainee Mention Directe v2.0.8+

1. **Détection urgence** — heuristique sur keywords + structure du message
2. **Délai simulé** selon la tranche horaire ET la vibe du jour
3. **Contexte 100 messages** avec identification précise des replies
4. **Profil membre** + toneScore + humeur du jour + vibe du jour
5. **Mémoire salon** + description officielle
6. **Membres tagués** — injectés mais pas re-tagged (reply notify = assez)
7. **Recherche YouTube** propre via extraction Claude
8. **10% réaction emoji seule** → retour 15-45 min avec excuse contextuelle
9. **25% réaction emoji + texte**
10. **Résolution mentions** `@Pseudo → <@id>` et `#salon → <#id>` — **FIXE v2.0.8** : gère now `.`, emojis, diacritiques

---

### 11. Persona Brainee v2.0.8

**Culture gaming** : JRPG, Castlevania, Metroid, Mega Man, soulslike, indie, retro, next-gen, lore, OST.

**Culture large** : films SF/thriller/horreur, musique, manga, bouffe, dev/IA, création artistique, neurodivergence.

**Tags v2.0.8 — STRICT** : évite les @ autant que possible. Une reply Discord notifie déjà. Ne tag que si vraiment nécessaire. Jamais plus d'un tag par message.

---

### 12. DMs v2.0.5

Historique privé MongoDB (30 messages max).
Ton plus intime — posé, à l'écoute, peut creuser les sujets.
Fragmentation 15% en DM (plus douce qu'en serveur).

---

### 13. Retour tardif après emoji v2.0.4

Quand elle tire le 10% emoji-seul, retour 15-45 min avec excuse contextuelle.

---

### 14. Mémoire par salon v2.0.3

`channelMemory` MongoDB — enrichi toutes les 6h en background.

---

### 15. Détection de dérive thématique v2.0.3

Score de dérive 1-10 sur les 30 derniers messages.
4 niveaux : observe → suggest (70%) → redirect (20%) → moderate (10%).

---

### 16. Threads automatiques v2.0.6

Créés uniquement si engagement humain + salon autorisé + contenu assez long + jeu précis détecté.
Salons autorisés : 11 salons gaming/lore uniquement.

---

### 17. Profils membres v1.8.0

toneScore 1-10 : +0.15 emoji rire, +0.10 message long, -0.05 très court.
Niveaux : 1-3 chaleureux / 4-6 ironie légère / 7-10 piques assumées.

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

### Bot v2.0.8
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/slot` | Tranche active + humeur + vibe |
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

**Brainee parle trop / pas assez**
→ La vibe du jour module le comportement — attendre le lendemain ou redéployer pour forcer une nouvelle vibe

**@mention complètement ignorée (agency)**
→ Normal v2.0.8 — elle peut refuser selon sa vibe (skip aléatoire). Réessayer quelques heures après.

**Mention différée jusqu'à demain**
→ Pas urgente + vibe lazy/introvert = relance le lendemain vers 10-12h avec @mention

**Tags qui ne résolvent pas (emojis, points dans noms)**
→ Fix v2.0.8 — `resolveMentionsInText()` est maintenant plus robuste avec normalisation Unicode

**channelDirectory vide après le boot**
→ Attendre 35-40s après le démarrage

**Threads créés sans engagement**
→ Normal avant v2.0.6 — désormais `hasEngagement` requis

---

## 🔄 Changelog complet

### ⭐ `v2.0.8` — Planning Adaptatif + Agency + Moins de Tags *(actuelle)*

**Nouveau système de vibe quotidienne** :
- `getDailyVibe()` : 8 vibes tirées au hasard chaque matin (chatty, introvert, impulsive, lazy, focus, excited, grumpy, balanced)
- Chaque vibe module : chattiness, impulse, responsiveness, tagPenalty, urgencyBias
- Reset quotidien à minuit (Paris)

**Horaires flottants** :
- `getDailyFloatingSchedule()` : morning ± 25 min, lunch ± 25 min, goodnight ± 45 min, nightWakeup ± 60 min
- Chaque jour = horaires différents (plus humain, moins robotisé)
- FloatingEventsCron toutes les 2 min : détecte si on est dans la fenêtre du jour

**Agency — Brainee peut refuser / différer** :
- `decideMentionResponse()` : urgence détectée → rapide; non-urgent + vibe lazy → report au lendemain; aléatoire chance de skip total
- `isUrgentQuery()` : heuristique keywords + ponctuation + structure
- `queueRelance` : queue en mémoire de mentions à relancer le lendemain vers 10-12h

**Moins de tags — règle stricte** :
- v2.0.8 renforce la persona : reply Discord notifie déjà, pas besoin de @pseudo
- `NO_TAG_CLAUSE` injecté dans prompts de greeting/conv ambiante
- `LIGHT_TAG_CLAUSE` pour replies (avertissement à Claude)
- `shouldTagPerson()` roll dice selon vibe.tagPenalty
- Jamais plus d'un tag par message

**Bug fix mentions** :
- `resolveMentionsInText()` complètement réécrit v2.0.8
- Gère now : pseudos avec `.`, emojis, diacritiques, caractères spéciaux
- Normalization Unicode + fuzzy matching de salons/users
- Regex permissive + lookup intelligent

**Crons v2.0.8** :
- `startConvCron()` restructuré : floatingEventsCron + relanceCron en plus
- Skip probabiliste selon vibe
- Post impulsif aléatoire (hors-cron)
- Reset quotidien à minuit

**Nouvelle fonction** :
- `postRelanceMention()` : envoie la relance du jour d'avant à ~10-12h, avec @mention de la personne

---

### ⭐ `v2.0.8` — GNews API + Actualités réelles *(actuelle)*

- **`fetchGamingNews(topic, postedUrls)`** : requête GNews API (FR + EN fallback)
- **Déduplication par MongoDB** : `botState.postedNewsUrls` (max 100 URLs)
- **Actualités vraies + récentes** : 40 jours retour avec filtrage par topic
- **Claude résume + style Brainee** : inclut les liens Markdown dans le résumé
- **Fallback Claude pur** : si GNews ne retourne rien
- Ajout `GNEWS_API_KEY` dans config.js et env Railway
- **Intégration avec v2.0.8** : combine GNews API + Planning Adaptatif + Vibes

---

### `v2.0.8` — Planning Adaptatif + Moins de Robotisme (base 2.0.8)

- **Vibes quotidiennes** : 8 vibes (chatty, introvert, impulsive, lazy, focus, excited, grumpy, balanced)
- **Horaires flottants** : ±jitter aléatoire (morning ±25min, lunch ±25min, goodnight ±45min)
- **Agency système** : Brainee peut refuser, repousser au lendemain, ignorer selon vibe
- **Comportement modulé** : chattiness, impulse, skip rates varient par vibe
- Nouvelle collection `botState.vibeOfTheDay` avec scores quotidiens
- Routes API pour vibes et status

---

### `v2.0.7` — Planning Adaptatif + Moins de Robotisme

### `v2.0.6` — Discipline Salon + Intelligence élargie

- `channelDirectory` MongoDB — description officielle de chaque salon
- `initChannelDirectory()` : lit le premier message au boot, résume via Claude
- 16 catégories de salons avec règles propres
- `getModeInjectionForChannel()` : modes adaptés au salon
- Engagement humain requis pour threads auto
- Embeds TikTok fixes : valeurs castées en String

---

### Versions antérieures

v2.0.5 : DMs + résolution mentions
v2.0.4 : Delayed reply après emoji
v2.0.3 : Channel memory + drift detection
v2.0.2 : Full human update
v2.0.1 : Threads auto
v2.0.0 : Human planning (grilles horaires)
v1.9.0 : MongoDB state migration
v1.8.0+ : Profiles, persona, reactions, welcome...

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
