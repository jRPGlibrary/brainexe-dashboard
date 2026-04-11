# 🧠 BrainEXE Dashboard `v1.9.0`

> **v1.9.0 — MongoDB State Migration** — Persistance complete de l'etat bot entre redeploys Railway. Quota conversations, dates de posts, slots actus : tout survit maintenant aux redemarrages. Fix double-fetch replyToConversations. Boot async non bloquant.

Bot Discord autonome avec dashboard de controle en temps reel, automatisations IA et gestion complete du serveur depuis une interface web.
Concu pour le serveur **Neurodivergent Creator Hub** — propulse par **Brainee**.

---

## 📦 Stack technique

| Outil | Role |
|---|---|
| **Node.js** | Runtime backend |
| **Discord.js v14** | Bot Discord |
| **Express** | Serveur HTTP + API REST |
| **WebSocket (ws)** | Sync temps reel dashboard ↔ bot |
| **node-cron** | Planification automatisations |
| **chokidar** | Watcher fichier JSON |
| **Anthropic API** | Generation contenu IA (Claude — Brainee) |
| **YouTube Data API v3** | Recherche videos sur @mention |
| **tiktok-live-connector** | Detection live TikTok en temps reel |
| **MongoDB Atlas** | Persistance profils membres + etat bot (botState) |
| **Railway** | Hebergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js               # Bot + API + WebSocket (tout le backend)
├── index.html              # Dashboard frontend (single-file)
├── discord-template.json   # Template structure serveur (sync bidirectionnel)
├── brainexe-config.json    # Config persistante (automatisations, reaction roles...)
├── backup_*.json           # Snapshots auto de la structure Discord
└── README.md
```

---

## ⚙️ Variables d'environnement Railway

| Variable | Description | Requis |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ Oui |
| `GUILD_ID` | ID du serveur Discord | ✅ Oui |
| `ANTHROPIC_API_KEY` | Cle API Anthropic (Claude) | ✅ Pour les IA |
| `YOUTUBE_API_KEY` | Cle API YouTube Data v3 | ✅ Pour les recherches @mention |
| `TIKTOK_USERNAME` | Pseudo TikTok a surveiller | ✅ Pour les notifs live |
| `MONGODB_URI` | URI MongoDB Atlas | ✅ Pour profils membres + botState |
| `PORT` | Port serveur (auto Railway) | Auto |

---

## 🚀 Deploiement

```bash
# 1. Installer les dependances
npm install

# 2. Push sur Railway
git add .
git commit -m "feat: v1.9.0"
git push
```

Railway rebuild et redemarre le bot automatiquement.

---

## 🏗️ Architecture

### Sync bidirectionnel Discord ↔ JSON

```
Discord ──────► discord-template.json   (D→F)
              ◄─────── discord-template.json   (F→D)
```

- **D→F** : Chaque evenement Discord met a jour le fichier JSON — debounce 2s
- **F→D** : Chaque modification du fichier JSON applique les changements sur Discord — debounce 2s
- **Rattrapage Railway** : Au boot, `checkAnecdoteMissed()` et `checkActusMissed()` compensent les crons manques (verifie MongoDB avant de rattaper)

### MongoDB Atlas — Deux collections

| Collection | Contenu |
|---|---|
| `memberProfiles` | userId, username, toneScore, topics, interactionCount, lastSeen |
| `botState` | anecdoteLastPostedDate, actusLastPostedSlots, convDailyCount, convLastPostDate, convLastPostByChannel |

> La collection `botState` est le coeur de la v1.9.0 — elle garantit que le bot reprend exactement ou il en etait apres un redeploy Railway.

### WebSocket temps reel

| Evenement | Contenu |
|---|---|
| `state` | Etat complet du serveur |
| `log` | Chaque ligne de log en temps reel |
| `stats` | Compteurs D→F / F→D |
| `autorole` | Arrivee d'un nouveau membre |
| `configUpdate` | Mise a jour config depuis une autre instance |
| `conversation` | Post lance-conv ou reponse membre |
| `anecdote` | Statut anecdote quotidienne (posted / error + salon) |
| `tiktokLive` | Statut live TikTok (started / ended + stats) |

---

## 🤖 Fonctionnalites bot

### 1. Auto-Role a l'arrivee

Chaque nouveau membre recoit automatiquement le role configure (defaut : `👁️ Lurker`).

---

### 2. Reaction Roles — natif BrainEXE

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

- Phrase tiree au sort dans `welcome.messages`
- Embed violet BrainEXE avec avatar du membre
- Liens automatiques vers `#regles` et `#choix-des-roles`

---

### 4. Anecdote Gaming Quotidienne ✨

**Routing intelligent** — l'anecdote est envoyee dans le bon salon selon son sujet.

| Salon | Theme injecte dans le prompt |
|---|---|
| `🕹️・retro-general` | Consoles classiques, annees 80/90/2000, bugs legendaires |
| `🐉・jrpg-corner` | Final Fantasy, Persona, Dragon Quest, secrets de dev |
| `⚔️・rpg-general` | Systemes de jeu innovants, mecaniques RPG surprenantes |
| `🌿・indie-general` | Dev solo, histoires de creation, pepites cachees |
| `🚀・next-gen-general` | Innovations PS5/Xbox/PC, records techniques |
| `🏆・hidden-gems` | Jeux meconnus, tresors oublies |
| `🃏・lore-et-theories` | Easter eggs, mysteres, secrets de developpement |

- Declenchee chaque jour a 12h (Paris) + delai aleatoire 0–30 min
- Anti-doublon : `lastPostedDate` verifie dans **MongoDB** (v1.9.0)
- Rattrapage automatique si Railway a redemarre

---

### 5. TikTok Live → Discord 📺

Notification automatique a chaque live `@brain.exe_modded`.

**Detection :**
- Cron toutes les **2 minutes** — connexion tentee via `tiktok-live-connector`
- Delai max de detection : 2 minutes apres le demarrage du live

**Embed 🔴 Live demarre :**
- Titre du live recupere automatiquement
- Message d'accroche **genere par Claude** — unique a chaque live
- Nombre de viewers en direct
- Lien direct vers le live TikTok
- Ping automatique `🔔 Notif Lives`
- Rappels : 👏 Tapote • 📤 Partage • ➕ Abonne-toi

**Embed ⚫ Live termine :**
- Duree totale
- Pic de viewers
- Likes totaux
- Nombre total de gifts recus
- Top 3 des gifts les plus envoyes
- Message de remerciement

---

### 6. Actus Bi-Mensuelles

- Le **1er et le 15 de chaque mois a 10h** (Europe/Paris)
- Posts etales sur 12h — 9 salons configurables
- Generees par Claude avec la persona Brainee
- Anti-doublon par slot (`YYYY-MM-1` / `YYYY-MM-15`) verifie dans **MongoDB** (v1.9.0)

---

### 7. Lance-Conversations + Reponses Auto

- Check toutes les heures — max 5 posts/jour
- **Quota journalier persiste dans MongoDB** (v1.9.0) — survit aux redeploys
- Rate limit global : 30 min minimum entre tout post du bot
- Fetch les **100 derniers messages** avant de lancer un sujet
- 4 modes : `debat` / `chaos` / `deep` / `simple`
- **canReply** : fetch les **100 derniers messages** avant chaque reponse spontanee
- **Fix v1.9.0** : 1 seul fetch 100 msgs dans `replyToConversations` (plus de double-fetch)

---

### 8. @Brainee Mention Directe 🎯

Quand un membre mentionne `@Brainee` dans n'importe quel salon :

1. Brainee lit les **100 derniers messages** du salon (contexte complet)
2. Identifie precisement qui a dit quoi grace au formatage enrichi
3. Injecte le profil du membre pour adapter son ton
4. Detecte si le message contient un mot-cle YouTube
5. Si mot-cle detecte → lance une recherche YouTube Data API v3
6. Genere une reponse **contextualisee** via Claude — jamais hors-sujet

---

### 9. Persona Brainee

**Profil :** Fille de 24 ans, internet native, gaming hardcore — membre BrainEXE.

**Deux personas distinctes :**

| Persona | Utilisee pour | Regle fin de message |
|---|---|---|
| `BOT_PERSONA` | Anecdotes, actus, lance-convs | Question/hook si pertinent |
| `BOT_PERSONA_CONVERSATION` | @mentions et replies directs | Conclusion naturelle autorisee |

**Style commun :** Phrases courtes, style oral, emojis legers, tutoiement, jamais corporate.

---

### 10. Profils Membres MongoDB

Brainee construit une relation differente avec chaque membre au fil du temps.

**Donnees stockees :**

| Champ | Description |
|---|---|
| `userId` | ID Discord du membre |
| `username` | Pseudo Discord |
| `toneScore` | Score de complicite 1–10 (evolue automatiquement) |
| `topics` | Sujets gaming mentionnes ensemble (max 15) |
| `interactionCount` | Nombre total d'interactions avec Brainee |
| `lastSeen` | Derniere interaction |
| `receptiveToBanter` | `true` si toneScore >= 5 |

**Evolution du toneScore :**
- `+0.15` — emoji de rire dans le message (😂 🤣 💀...)
- `+0.10` — message engage (> 60 caracteres)
- `-0.05` — message tres court (< 10 caracteres)
- Score initial : **3** pour tout nouveau membre
- Plafond : **1–10**, evolution lente et progressive

**Les trois niveaux de ton :**

| Score | Comportement |
|---|---|
| 1–3 | Chaleureuse et douce uniquement. Aucune pique. |
| 4–6 | Ironie tres legere si naturelle. Reste accessible. |
| 7–10 | Piques assumees, sarcasme leger — ce membre joue le jeu. |

**Regle non negociable :** Quel que soit le score, si le message exprime une difficulte, fatigue ou sujet sensible — ton doux et bienveillant systematiquement.

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
| POST | `/api/conversation/reply` | Forcer une reponse |
| POST | `/api/tiktok/test` | Tester la connexion live TikTok |
| POST | `/api/welcome/test` | Tester le message de bienvenue |
| POST | `/api/post` | Post manuel dans un salon |

### Membres

| Methode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste des membres |
| GET | `/api/members/profiles` | Profils MongoDB (top 50 par interactions) |
| PATCH | `/api/members/:id/roles` | Modifier les roles |
| POST | `/api/members/:id/mute` | Timeout |
| POST | `/api/members/:id/kick` | Expulser |
| POST | `/api/members/:id/ban` | Bannir |

---

## 🗃️ Structure `brainexe-config.json` — v1.9.0

```json
{
  "anecdote": {
    "enabled": true,
    "hour": 12,
    "randomDelayMax": 30,
    "lastPostedDate": null,
    "channels": [
      { "channelId": "...", "channelName": "🕹️・retro-general", "topic": "...", "enabled": true }
    ]
  },
  "tiktokLive": {
    "enabled": true,
    "username": "brain.exe_modded",
    "channelId": "1481028204897501273",
    "channelName": "🔴・alertes-live",
    "pingRoleName": "🔔 Notif Lives"
  },
  "welcome": { "enabled": true, "channelId": "...", "messages": [] },
  "actus": { "enabled": true, "channels": [] },
  "conversations": { "enabled": true, "maxPerDay": 5, "canReply": true, "channels": [] },
  "reactionRoles": { "enabled": true, "messageId": "...", "channelId": "...", "mappings": [] }
}
```

> ⚠️ Les profils membres ET l'etat bot (quota, dates) sont stockes dans **MongoDB Atlas** — pas dans ce fichier.

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

---

## 🔧 Depannage

**Le bot ne detecte pas le live TikTok**
→ `tiktok-live-connector` installe ? `npm install`
→ `TIKTOK_USERNAME` dans les variables Railway ?
→ Tester via `POST /api/tiktok/test` depuis le dashboard
→ Logs : l'erreur TikTok est complete via `JSON.stringify(err)`

**@Brainee ne repond pas / pas de YouTube**
→ `YOUTUBE_API_KEY` dans Railway ?
→ Quota YouTube epuise ? (10 000 unites/jour, 1 recherche = 100 unites)

**Profils membres non sauvegardes**
→ `MONGODB_URI` defini dans Railway ?
→ Verifier les logs au demarrage : `✅ MongoDB Atlas connecte`
→ Si absent : `⚠️ MONGODB_URI non defini — profils membres desactives`

**Quota conversations repart de zero apres un redeploy**
→ Normal avant v1.9.0. Depuis v1.9.0, le quota est lu depuis MongoDB au boot.
→ Verifier que `MONGODB_URI` est bien defini dans Railway.

**Les automatisations ne se declenchent pas**
→ Rattrapage automatique au boot (25s apres demarrage) — laisser Railway redemarrer
→ Rate limit global 30min entre chaque post du bot

---

## 🔄 Changelog

---

### ⭐ `v1.9.0` — MongoDB State Migration *(actuelle)*

- **`getBotState` / `setBotState`** : etat bot persistent dans MongoDB entre tous les redeploys Railway
- **`checkAnecdoteMissed`** : async — verifie MongoDB avant de lancer le rattrapage
- **`checkActusMissed`** : async — verifie les slots MongoDB avant rattrapage
- **`postDailyAnecdote`** : appelle `setBotState` apres chaque post
- **`postBiMonthlyActus`** : appelle `setBotState` apres chaque slot poste
- **`resetDailyCountIfNeeded`** : async — recupere le quota conversations depuis MongoDB si Railway a redemarre aujourd'hui
- **`updateConvStats`** : async — quota conversations survit aux redeploys
- **Fix `replyToConversations`** : 1 seul fetch 100 messages (suppression du double-fetch v1.8.0)
- **Boot non bloquant** : checks MongoDB en background avec delai 25s (plus de SIGTERM Railway)

---

### `v1.8.0` — Brainee LevelUP

- **MongoDB Atlas** : profils membres persistants
- **Profils membres** : `toneScore` 1–10 evolutif, `topics` gaming detectes, `interactionCount`, `lastSeen`
- **Adaptation du ton** : 3 niveaux selon le score de complicite
- **Garde-fou sujets sensibles** : ton doux force quel que soit le score
- **`BOT_PERSONA_CONVERSATION`** : persona dediee aux interactions directes — conclusions naturelles
- **Contexte enrichi 100 messages** partout
- **`formatContext()`** : identification precise des speakers + resolution mentions @user
- **Fix TikTok error logging** : `JSON.stringify(err)` remplace `err.message`
- **Route API** `/api/members/profiles`

---

### `v1.7.0` — Special Optimisation

- Anecdote multi-salon (7 salons avec routing thematique)
- TikTok Live → Discord (embeds demarrage + fin + stats)
- @Brainee mention directe avec YouTube Data API v3
- canReply enrichi : fetch 20 messages avant reponse
- Conversations enrichies : fetch 15 messages avant lance-conv
- Renommage complet Brainy.exe → Brainee

---

### `v1.6.0` — Modes par categorie

- `CATEGORY_MODES` : injection contextuelle selon la categorie du salon
- Fix apostrophes francaises dans les prompts

---

### `v1.5.0` — Reaction Roles natif

- Carl-bot retraite — Reaction Roles gere nativement
- `GuildMessageReactions` + `Partials` actives
- Config persistee dans `brainexe-config.json`

---

### `v1.4.0` — Persona Brainee

- Personnage Brainee : fille de 24 ans, internet native, gaming hardcore
- `BOT_PERSONA` injectee dans tous les prompts IA
- `CONV_MODES` : 4 modes — debat / chaos / deep / simple

---

### `v1.3.0` — Automatisations avancees

- Actus bi-mensuelles : 1er et 15 du mois, etalees sur 12h
- `lastPostedSlots[]` — anti-doublon robuste
- Conversations : plage 24h, cible le salon le plus calme
- `canReply` + rate limit global 30min
- Rattrapage au boot des crons manques

---

### `v1.2.0` — Dashboard multi-pages

- Pages completes : Members, Channels, Roles, Welcome, Logs, Backups, Settings
- Gestion membres : roles, timeout, kick, ban
- Posts manuels avec raccourcis par categorie

---

### `v1.1.0` — Sync bidirectionnel

- Sync Discord ↔ JSON en temps reel (debounce 2s)
- Watcher `chokidar` sur le fichier template
- Dashboard WebSocket en temps reel

---

### `v1.0.0` — Base

- Bot Discord connecte + serveur Express + WebSocket
- Sync initiale Discord → JSON au demarrage
- Dashboard basique single-file HTML

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
