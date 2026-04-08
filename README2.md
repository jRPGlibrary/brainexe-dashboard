# 🧠 BrainEXE Dashboard

**Serveur backend + dashboard frontend pour le serveur Discord "Neurodivergent Creator Hub"**

Bot Discord autonome avec dashboard de contrôle en temps réel, automatisations IA et gestion complète du serveur depuis une interface web.

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
| **Anthropic API** | Génération contenu IA (Brainy.exe) |
| **Railway** | Hébergement + auto-deploy |

---

## 🗂️ Structure du projet

```
brainexe-dashboard/
├── server.js              # Bot + API + WebSocket (tout le backend)
├── index.html             # Dashboard frontend (single-file)
├── discord-template.json  # Template de structure serveur (sync bidirectionnel)
├── brainexe-config.json   # Config persistante (automatisations, reaction roles…)
├── backup_*.json          # Snapshots auto de la structure Discord
└── README.md
```

---

## ⚙️ Variables d'environnement Railway

| Variable | Description | Requis |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ Oui |
| `GUILD_ID` | ID du serveur Discord | ✅ Oui |
| `ANTHROPIC_API_KEY` | Clé API Anthropic (Claude) | ✅ Pour les IA |
| `PORT` | Port serveur (auto Railway) | Auto |

---

## 🚀 Déploiement

Le projet se déploie automatiquement sur Railway à chaque push GitHub.

```bash
git add .
git commit -m "description du changement"
git push
```

Railway rebuild et redémarre le bot automatiquement.

---

## 🏗️ Architecture

### Sync bidirectionnel Discord ↔ JSON

```
Discord ──────► discord-template.json   (D→F : déclenché par events Discord)
              ◄─────── discord-template.json   (F→D : déclenché par modif fichier)
```

- **D→F** : Chaque événement Discord (création salon, rôle, etc.) met à jour le fichier JSON (debounce 2s)
- **F→D** : Chaque modification du fichier JSON applique les changements sur Discord (debounce 2s)
- **Rattrapage Railway** : Au démarrage, le bot vérifie s'il a manqué des crons (redémarrages fréquents sur Railway)

### WebSocket temps réel

Le dashboard se connecte via WebSocket au démarrage. Il reçoit :
- `state` : état complet du serveur (structure, rôles, membres)
- `log` : chaque ligne de log en temps réel
- `stats` : compteurs de syncs
- `autorole` : événements d'arrivée de membres
- `configUpdate` : mise à jour config depuis une autre instance
- `conversation` : notification quand un lance-conv est posté

---

## 🤖 Fonctionnalités bot

### 1. Auto-Role à l'arrivée

Chaque nouveau membre reçoit automatiquement le rôle configuré (par défaut `👁️ Lurker`).
Configurable depuis le dashboard → **Auto-Role**.

### 2. Reaction Roles (v1.5.0 — natif BrainEXE)

**Remplacement de Carl-bot** — BrainEXE gère maintenant directement les reaction roles.

- Écoute les réactions sur le message ID configuré (`#choix-des-rôles`)
- Assigne le rôle correspondant à l'emoji
- Retire le rôle si la réaction est annulée
- Cumul autorisé (plusieurs rôles possibles)

**Mapping actuel :**
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

> ⚠️ **Important** : les `Partials` Discord.js sont activés — obligatoire pour détecter les réactions sur des messages antérieurs au démarrage du bot.

### 3. Message de bienvenue automatique

Envoyé dans `#présentations` à chaque nouvel arrivant.
- Phrase tirée au sort parmi une liste configurable
- Embed violet BrainEXE avec avatar du membre
- Liens vers les règles et le choix des rôles

### 4. Anecdote Gaming Quotidienne

- Déclenchée chaque jour à l'heure configurée (défaut : 12h Paris)
- Délai aléatoire pour paraître naturel
- Générée par Claude IA avec la persona **Brainy.exe**
- Anti-doublon : ne poste pas deux fois le même jour
- Rattrapage au redémarrage si l'heure est dépassée

### 5. Actus Bi-Mensuelles

- Le **1er et le 15 de chaque mois à 10h**
- Posts étalés aléatoirement sur 12h par salon
- 9 salons configurables (gaming, JRPG, RPG, indie, retro, next-gen…)
- Générées par Claude IA — ton Brainy.exe
- Anti-doublon par slot (`YYYY-MM-1` ou `YYYY-MM-15`)
- Rattrapage au redémarrage si le slot du jour n'a pas été posté

### 6. Lance-Conversations + Réponses Auto

- Check toutes les heures, probabilité adaptative selon quota restant
- Max configurable par jour (défaut : 5)
- Plage horaire configurable
- Cible le salon le plus "calme" (le moins récemment posté)
- **4 modes aléatoires** : débat / chaos / deep / simple
- **canReply** : le bot répond aux messages membres (20min–3h, toutes les 2h, 40% de chance)
- Rate limit global : minimum 30min entre TOUT post du bot

---

## 🎭 Persona Brainy.exe (v1.4.0)

Le bot répond avec une identité cohérente dans tous ses messages IA :

- **Nom** : Brainy.exe
- **Profil** : Fille de 24 ans, internet native, gaming hardcore
- **Style** : Phrases courtes, oral, emojis légers, tutoiement, jamais corporate
- **Règles** : Max 3 phrases, toujours une question ou un hook à la fin, zéro intro forcée
- **Défauts humains** : procrastine, pose des débats et ghost le thread
- **Modes conv** : débat / chaos / deep / simple (tiré au sort)

---

## 🌐 API Routes

### Sync

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | État complet du serveur Discord |
| POST | `/api/sync/discord-to-file` | Force sync Discord → JSON |
| POST | `/api/sync/file-to-discord` | Force sync JSON → Discord |

### Config

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/config` | Lire toute la config |
| POST | `/api/config` | Sauvegarder une section de config |

Body POST : `{ section: "anecdote" | "welcome" | "actus" | "conversations" | "reactionRoles", data: {...} }`

### Salons & Rôles

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/categories` | Créer une catégorie |
| POST | `/api/channels` | Créer un salon |
| PATCH | `/api/channels/:id` | Modifier un salon |
| DELETE | `/api/channels/:id` | Supprimer un salon |
| POST | `/api/roles` | Créer un rôle |
| DELETE | `/api/roles/:id` | Supprimer un rôle |

### Membres

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste des membres |
| PATCH | `/api/members/:id/roles` | Modifier les rôles d'un membre |
| POST | `/api/members/:id/mute` | Timeout (0 = lever) |
| POST | `/api/members/:id/kick` | Expulser |
| POST | `/api/members/:id/ban` | Bannir |

### Auto-Role

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/autorole` | Rôle auto actuel |
| POST | `/api/autorole` | Changer le rôle auto |

### Automatisations

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/anecdote` | Forcer une anecdote |
| POST | `/api/welcome/test` | Tester le message de bienvenue |
| POST | `/api/actus` | Forcer les actus (`{ force: true }`) |
| POST | `/api/conversation` | Forcer un lance-conv |
| POST | `/api/conversation/reply` | Forcer une tentative de réponse |
| POST | `/api/post` | Post manuel dans un salon |

### Backups

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/backup` | Créer un backup JSON |
| GET | `/api/backups` | Lister les backups existants |
| GET | `/api/logs` | Historique des logs |

---

## 🗃️ Structure `brainexe-config.json`

```json
{
  "anecdote": {
    "enabled": true,
    "channelId": "...",
    "channelName": "...",
    "hour": 12,
    "randomDelayMax": 30,
    "lastPostedDate": "2026-04-08"
  },
  "welcome": {
    "enabled": true,
    "channelId": "...",
    "channelName": "...",
    "messages": ["phrase 1", "phrase 2"]
  },
  "actus": {
    "enabled": true,
    "lastPostedSlots": ["2026-04-1", "2026-04-15"],
    "channels": [
      { "channelId": "...", "channelName": "...", "topic": "...", "enabled": true }
    ]
  },
  "conversations": {
    "enabled": true,
    "maxPerDay": 5,
    "timeStart": 0,
    "timeEnd": 24,
    "dailyCount": 2,
    "lastPostDate": "2026-04-08",
    "lastPostByChannel": {},
    "canReply": true,
    "channels": [...]
  },
  "reactionRoles": {
    "enabled": true,
    "messageId": "1481033797800693790",
    "channelId": "1481028181485027471",
    "mappings": [
      { "emoji": "📱", "roleName": "📱 TikToker" },
      { "emoji": "🧠", "roleName": "🧠 TDAH" }
    ]
  }
}
```

---

## 🔄 Historique des versions

### v1.5.0 — Reaction Roles natif BrainEXE
- **Reaction Roles** géré en natif — Carl-bot retraité 🎉
- Nouveau intent `GuildMessageReactions` + `Partials` (obligatoire pour vieux messages)
- Page dashboard Reaction Roles entièrement refaite
- Config persistée dans `brainexe-config.json`
- Toggle activé/désactivé + Message ID éditable depuis le dashboard

### v1.4.0 — Persona Brainy.exe
- Identité féminine cohérente dans tous les prompts IA
- `BOT_PERSONA` injectée dans anecdote, actus, conversations, réponses
- `CONV_MODES` : 4 modes de conversation (débat / chaos / deep / simple)
- Style d'écriture naturel, communauté-first

### v1.3.0 — Automatisations avancées
- Actus bi-mensuelles : le 1er et le 15 de chaque mois
- `lastPostedSlots[]` remplace le tracking par mois simple
- Conversations : plage 24h, salon le plus calme en priorité
- `canReply` : réponses aux messages membres
- `maxPerDay` + rate limit global 30min
- Rattrapage au redémarrage Railway

### v1.2.0 — Dashboard multi-pages
- Pages : Members, Channels, Roles, Auto-Role, Reaction Roles, Welcome, Logs, Backups, Settings, Manual Posts
- Gestion membres : rôles, timeout, kick, ban
- Navigation mobile avec bottom nav bar
- Posts manuels avec raccourcis par catégorie

### v1.1.0 — Sync bidirectionnel
- Sync Discord ↔ JSON en temps réel
- Watcher chokidar sur le fichier template
- Events Discord → mise à jour fichier automatique
- Dashboard WebSocket temps réel

### v1.0.0 — Base
- Bot Discord + Express + WebSocket
- Sync initiale Discord → JSON
- Dashboard basique single-file

---

## 🔧 Dépannage courant

### Le bot ne détecte pas les réactions
- Vérifie que `GuildMessageReactions` est dans les intents
- Vérifie que les `Partials` sont configurés (Message, Channel, Reaction)
- L'ID du message dans la config doit correspondre exactement au message Discord

### Les automatisations ne se déclenchent pas
- Railway redémarre régulièrement — les fonctions de rattrapage compensent
- Vérifie que `ANTHROPIC_API_KEY` est bien définie dans les variables Railway
- Le rate limit global de 30min peut bloquer les posts trop rapprochés

### Le fichier JSON devient invalide
- Ne jamais éditer `discord-template.json` à la main sans vérifier la syntaxe
- En cas de JSON invalide, le bot logue `ERR: JSON invalide` et ne fait rien

### Le message de bienvenue ne s'affiche pas
- Vérifie que l'intent `GuildMembers` est activé dans le portail développeur Discord
- Vérifie que le bot a les permissions d'envoi dans le salon configured

---

## 📋 IDs importants

| Élément | ID |
|---|---|
| Serveur (Guild) | `1481022956816830669` |
| Bot (App) | `1481022516783747242` |
| Message reaction roles | `1481033797800693790` |
| Salon choix-des-rôles | `1481028181485027471` |
| Salon présentations | `1481028178389635292` |
| Salon règles | `1481028175474589827` |

---

*BrainEXE Dashboard — Neurodivergent Creator Hub 🧠*
