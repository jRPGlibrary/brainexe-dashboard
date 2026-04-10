# 🧠 BrainEXE Dashboard `v1.8.0`

> **v1.8.0 — Brainee LevelUP** — Profils membres MongoDB, adaptation du ton par personne, contexte enrichi 100 messages, identification précise des speakers, conclusions naturelles.

Bot Discord autonome avec dashboard de contrôle en temps réel, automatisations IA et gestion complète du serveur depuis une interface web.
Conçu pour le serveur **Neurodivergent Creator Hub** — propulsé par **Brainee**.

---

## 📦 Stack technique

| Outil | Rôle |
|---|---|
| **Node.js** | Runtime backend |
| **Discord.js v14** | Bot Discord |
| **Express** | Serveur HTTP + API REST |
| **WebSocket (ws)** | Sync temps réel dashboard ↔ bot |
| **node-cron** | Planification automatisations |
| **chokidar** | Watcher fichier JSON |
| **Anthropic API** | Génération contenu IA (Claude — Brainee) |
| **YouTube Data API v3** | Recherche vidéos sur @mention |
| **tiktok-live-connector** | Détection live TikTok en temps réel |
| **MongoDB Atlas** | Persistance profils membres (toneScore, topics) |
| **Railway** | Hébergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js               # Bot + API + WebSocket (tout le backend)
├── index.html              # Dashboard frontend (single-file)
├── discord-template.json   # Template structure serveur (sync bidirectionnel)
├── brainexe-config.json    # Config persistante (automatisations, reaction roles…)
├── backup_*.json           # Snapshots auto de la structure Discord
└── README.md
```

---

## ⚙️ Variables d'environnement Railway

| Variable | Description | Requis |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ Oui |
| `GUILD_ID` | ID du serveur Discord | ✅ Oui |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (Claude) | ✅ Pour les IA |
| `YOUTUBE_API_KEY` | Clé API YouTube Data v3 | ✅ Pour les recherches @mention |
| `TIKTOK_USERNAME` | Pseudo TikTok à surveiller | ✅ Pour les notifs live |
| `MONGODB_URI` | URI MongoDB Atlas | ✅ Pour les profils membres |
| `PORT` | Port serveur (auto Railway) | Auto |

---

## 🚀 Déploiement

```bash
# 1. Installer les dépendances
npm install

# 2. Push sur Railway
git add .
git commit -m "feat: v1.8.0"
git push
```

Railway rebuild et redémarre le bot automatiquement.

---

## 🏗️ Architecture

### Sync bidirectionnel Discord ↔ JSON

```
Discord ──────► discord-template.json   (D→F)
              ◄─────── discord-template.json   (F→D)
```

- **D→F** : Chaque événement Discord met à jour le fichier JSON — debounce 2s
- **F→D** : Chaque modification du fichier JSON applique les changements sur Discord — debounce 2s
- **Rattrapage Railway** : Au boot, `checkAnecdoteMissed()` et `checkActusMissed()` compensent les crons manqués

### MongoDB Atlas — Persistance des profils membres

Les profils membres survivent aux redéploiements Railway grâce à MongoDB Atlas (free tier).

| Collection | Contenu |
|---|---|
| `memberProfiles` | userId, username, toneScore, topics, interactionCount, lastSeen |

### WebSocket temps réel

| Événement | Contenu |
|---|---|
| `state` | État complet du serveur |
| `log` | Chaque ligne de log en temps réel |
| `stats` | Compteurs D→F / F→D |
| `autorole` | Arrivée d'un nouveau membre |
| `configUpdate` | Mise à jour config depuis une autre instance |
| `conversation` | Post lance-conv ou réponse membre |
| `anecdote` | Statut anecdote quotidienne (posted / error + salon) |
| `tiktokLive` | Statut live TikTok (started / ended + stats) |

---

## 🤖 Fonctionnalités bot

### 1. Auto-Role à l'arrivée

Chaque nouveau membre reçoit automatiquement le rôle configuré (défaut : `👁️ Lurker`).

---

### 2. Reaction Roles — natif BrainEXE *(v1.5.0)*

| Emoji | Rôle |
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

- Phrase tirée au sort dans `welcome.messages`
- Embed violet BrainEXE avec avatar du membre
- Liens automatiques vers `#règles` et `#choix-des-rôles`

---

### 4. Anecdote Gaming Quotidienne ✨ *(v1.7.0)*

**Routing intelligent** — l'anecdote est envoyée dans le bon salon selon son sujet.

| Salon | Thème injecté dans le prompt |
|---|---|
| `🕹️・retro-général` | Consoles classiques, années 80/90/2000, bugs légendaires |
| `🐉・jrpg-corner` | Final Fantasy, Persona, Dragon Quest, secrets de dev |
| `⚔️・rpg-général` | Systèmes de jeu innovants, mécaniques RPG surprenantes |
| `🌿・indie-général` | Dev solo, histoires de création, pépites cachées |
| `🚀・next-gen-général` | Innovations PS5/Xbox/PC, records techniques |
| `🏆・hidden-gems` | Jeux méconnus, trésors oubliés |
| `🃏・lore-et-théories` | Easter eggs, mystères, secrets de développement |

- Déclenchée chaque jour à 12h (Paris) + délai aléatoire 0–30 min
- Anti-doublon : `lastPostedDate`
- Rattrapage automatique si Railway a redémarré

---

### 5. TikTok Live → Discord 📺 *(v1.7.0)*

Notification automatique à chaque live `@brain.exe_modded`.

**Détection :**
- Cron toutes les **2 minutes** — connexion tentée via `tiktok-live-connector`
- Délai max de détection : 2 minutes après le démarrage du live

**Embed 🔴 Live démarré :**
- Titre du live récupéré automatiquement
- Message d'accroche **généré par Claude** — unique à chaque live
- Nombre de viewers en direct
- Lien direct vers le live TikTok
- Ping automatique `🔔 Notif Lives`
- Rappels : 👏 Tapote • 📤 Partage • ➕ Abonne-toi

**Embed ⚫ Live terminé :**
- Durée totale
- Pic de viewers
- Likes totaux
- Nombre total de gifts reçus
- Top 3 des gifts les plus envoyés
- Message de remerciement

**Config `brainexe-config.json` :**
```json
"tiktokLive": {
  "enabled": true,
  "username": "brain.exe_modded",
  "channelId": "1481028204897501273",
  "channelName": "🔴・alertes-live",
  "pingRoleName": "🔔 Notif Lives"
}
```

---

### 6. Actus Bi-Mensuelles

- Le **1er et le 15 de chaque mois à 10h** (Europe/Paris)
- Posts étalés sur 12h — 9 salons configurables
- Générées par Claude avec la persona Brainee
- Anti-doublon par slot (`YYYY-MM-1` / `YYYY-MM-15`)

---

### 7. Lance-Conversations + Réponses Auto *(enrichi v1.8.0)*

- Check toutes les heures — max 5 posts/jour
- Rate limit global : 30 min minimum entre tout post du bot
- Fetch les **100 derniers messages** avant de lancer un sujet
- 4 modes : `débat` / `chaos` / `deep` / `simple`
- **canReply enrichi** : fetch les **100 derniers messages** avant chaque réponse spontanée
- Contexte formaté avec identification précise de chaque speaker

---

### 8. @Brainee Mention Directe 🎯 *(v1.7.0 — enrichi v1.8.0)*

Quand un membre mentionne `@Brainee` dans n'importe quel salon :

1. Brainee lit les **100 derniers messages** du salon (contexte complet)
2. Identifie précisément qui a dit quoi grâce au formatage enrichi
3. Injecte le profil du membre pour adapter son ton
4. Détecte si le message contient un mot-clé YouTube
5. Si mot-clé détecté → lance une recherche YouTube Data API v3
6. Génère une réponse **contextualisée** via Claude — jamais hors-sujet

---

### 9. Persona Brainee *(v1.4.0 — deux modes v1.8.0)*

**Profil :** Fille de 24 ans, internet native, gaming hardcore — membre BrainEXE.

**Deux personas distinctes :**

| Persona | Utilisée pour | Règle fin de message |
|---|---|---|
| `BOT_PERSONA` | Anecdotes, actus, lance-convs | Question/hook obligatoire |
| `BOT_PERSONA_CONVERSATION` | @mentions et replies directs | Conclusion naturelle autorisée |

**Style commun :** Phrases courtes, style oral, emojis légers, tutoiement, jamais corporate.

---

### 10. Profils Membres MongoDB *(v1.8.0)*

Brainee construit une relation différente avec chaque membre au fil du temps.

**Données stockées :**

| Champ | Description |
|---|---|
| `userId` | ID Discord du membre |
| `username` | Pseudo Discord |
| `toneScore` | Score de complicité 1–10 (évolue automatiquement) |
| `topics` | Sujets gaming mentionnés ensemble (max 15) |
| `interactionCount` | Nombre total d'interactions avec Brainee |
| `lastSeen` | Dernière interaction |
| `receptiveToBanter` | `true` si toneScore ≥ 5 |

**Évolution du toneScore :**
- `+0.15` — emoji de rire dans le message (😂 🤣 💀...)
- `+0.10` — message engagé (> 60 caractères)
- `-0.05` — message très court (< 10 caractères)
- Score initial : **3** pour tout nouveau membre
- Plafond : **1–10**, évolution lente et progressive

**Les trois niveaux de ton :**

| Score | Comportement |
|---|---|
| 1–3 | Chaleureuse et douce uniquement. Aucune pique. |
| 4–6 | Ironie très légère si naturelle. Reste accessible. |
| 7–10 | Piques assumées, sarcasme léger — ce membre joue le jeu. |

**Règle non négociable :** Quel que soit le score, si le message exprime une difficulté, fatigue ou sujet sensible — ton doux et bienveillant systématiquement.

---

## 🌐 API Routes

### Sync

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | État complet Discord |
| POST | `/api/sync/discord-to-file` | Force D→F |
| POST | `/api/sync/file-to-discord` | Force F→D |

### Config

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/config` | Lire toute la config |
| POST | `/api/config` | Sauvegarder une section |

### Automatisations

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/anecdote` | Forcer une anecdote |
| POST | `/api/actus` | Forcer les actus |
| POST | `/api/conversation` | Forcer un lance-conv |
| POST | `/api/conversation/reply` | Forcer une réponse |
| POST | `/api/tiktok/test` | Tester la connexion live TikTok |
| POST | `/api/welcome/test` | Tester le message de bienvenue |
| POST | `/api/post` | Post manuel dans un salon |

### Membres

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste des membres |
| GET | `/api/members/profiles` | Profils MongoDB (top 50 par interactions) |
| PATCH | `/api/members/:id/roles` | Modifier les rôles |
| POST | `/api/members/:id/mute` | Timeout |
| POST | `/api/members/:id/kick` | Expulser |
| POST | `/api/members/:id/ban` | Bannir |

---

## 🗃️ Structure `brainexe-config.json` — v1.8.0

```json
{
  "anecdote": {
    "enabled": true,
    "hour": 12,
    "randomDelayMax": 30,
    "lastPostedDate": null,
    "channels": [
      { "channelId": "...", "channelName": "🕹️・retro-général", "topic": "...", "enabled": true }
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

> ⚠️ Les profils membres sont stockés dans **MongoDB Atlas** et non dans ce fichier.

---

## 📋 IDs importants

| Élément | ID |
|---|---|
| Serveur (Guild) | `1481022956816830669` |
| Bot (App) | `1481022516783747242` |
| Message reaction roles | `1481033797800693790` |
| Salon `#choix-des-rôles` | `1481028181485027471` |
| Salon `#présentations` | `1481028178389635292` |
| Salon `#alertes-live` | `1481028204897501273` |

---

## 🔧 Dépannage

**Le bot ne détecte pas le live TikTok**
→ `tiktok-live-connector` installé ? `npm install`
→ `TIKTOK_USERNAME` dans les variables Railway ?
→ Tester via `POST /api/tiktok/test` depuis le dashboard
→ Logs v1.8.0 : l'erreur TikTok est maintenant complète (plus de `undefined`)

**@Brainee ne répond pas / pas de YouTube**
→ `YOUTUBE_API_KEY` dans Railway ?
→ Quota YouTube épuisé ? (10 000 unités/jour, 1 recherche = 100 unités)

**Profils membres non sauvegardés**
→ `MONGODB_URI` défini dans Railway ?
→ Vérifier les logs au démarrage : `✅ MongoDB Atlas connecté`
→ Si absent : `⚠️ MONGODB_URI non défini — profils membres désactivés`

**Les automatisations ne se déclenchent pas**
→ Rattrapage automatique au boot — laisser Railway redémarrer
→ Rate limit global 30min entre chaque post du bot

---

## 🔄 Changelog

---

### ⭐ `v1.8.0` — Brainee LevelUP *(actuelle)*

- **MongoDB Atlas** : profils membres persistants — survivent aux redéploiements Railway
- **Profils membres** : `toneScore` 1–10 évolutif, `topics` gaming détectés, `interactionCount`, `lastSeen`
- **Adaptation du ton** : 3 niveaux selon le score de complicité (doux / ironie légère / piques assumées)
- **Garde-fou sujets sensibles** : ton doux forcé quel que soit le score si difficulté/fatigue détectée
- **BOT_PERSONA_CONVERSATION** : persona dédiée aux interactions directes — conclusions naturelles, plus de question forcée à chaque message
- **Contexte enrichi 100 messages** : fetch au maximum Discord partout (mentions, replies, lance-convs)
- **Identification précise des speakers** : `formatContext()` résout les mentions @user et identifie les replies
- **Fix TikTok error logging** : `JSON.stringify(err)` remplace `err.message` — erreur complète visible dans les logs
- **Route API** `/api/members/profiles` : accès aux profils MongoDB depuis le dashboard

---

### `v1.7.0` — Spécial Optimisation

- Anecdote multi-salon (7 salons avec routing thématique)
- TikTok Live → Discord (embeds démarrage + fin + stats)
- @Brainee mention directe avec YouTube Data API v3
- canReply enrichi : fetch 20 messages avant réponse
- Conversations enrichies : fetch 15 messages avant lance-conv
- Renommage complet Brainy.exe → Brainee

---

### `v1.6.0` — Modes par categorie

- `CATEGORY_MODES` : injection contextuelle selon la catégorie du salon
- Fix apostrophes françaises dans les prompts

---

### `v1.5.0` — Reaction Roles natif

- Carl-bot retraité — Reaction Roles géré nativement
- `GuildMessageReactions` + `Partials` activés
- Config persistée dans `brainexe-config.json`

---

### `v1.4.0` — Persona Brainee

- Personnage Brainee : fille de 24 ans, internet native, gaming hardcore
- `BOT_PERSONA` injectée dans tous les prompts IA
- `CONV_MODES` : 4 modes — débat / chaos / deep / simple

---

### `v1.3.0` — Automatisations avancées

- Actus bi-mensuelles : 1er et 15 du mois, étalées sur 12h
- `lastPostedSlots[]` — anti-doublon robuste
- Conversations : plage 24h, cible le salon le plus calme
- `canReply` + rate limit global 30min
- Rattrapage au boot des crons manqués

---

### `v1.2.0` — Dashboard multi-pages

- Pages complètes : Members, Channels, Roles, Welcome, Logs, Backups, Settings
- Gestion membres : rôles, timeout, kick, ban
- Posts manuels avec raccourcis par catégorie

---

### `v1.1.0` — Sync bidirectionnel

- Sync Discord ↔ JSON en temps réel (debounce 2s)
- Watcher `chokidar` sur le fichier template
- Dashboard WebSocket en temps réel

---

### `v1.0.0` — Base

- Bot Discord connecté + serveur Express + WebSocket
- Sync initiale Discord → JSON au démarrage
- Dashboard basique single-file HTML

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
