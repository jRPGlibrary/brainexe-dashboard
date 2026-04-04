# 🧠 BrainEXE Dashboard — v1.3.0

> Bot Discord + Dashboard de gestion pour le serveur **Neurodivergent Creator Hub**  
> Hébergé sur **Railway** · Repo : [github.com/jRPGlibrary/brainexe-dashboard](https://github.com/jRPGlibrary/brainexe-dashboard)

---

## 📖 C'est quoi ce projet ?

BrainEXE est un bot Discord **entièrement custom** couplé à un dashboard web, conçus pour automatiser et gérer le serveur communautaire gaming/neurodivergent de Matthieu.

Le tout tourne en **Node.js sur Railway** (24/7), se déploie automatiquement depuis GitHub à chaque `git push`, et ne nécessite aucune manipulation manuelle sur le serveur.

---

## 🗂️ Structure des fichiers

```
brainexe-dashboard/
├── server.js              ← Bot Discord + API REST + WebSocket
├── public/
│   └── index.html         ← Dashboard web (single-file)
├── brainexe-config.json   ← Config persistante (auto-générée)
├── discord-template.json  ← Structure Discord (rôles + salons)
├── backup_*.json          ← Snapshots auto toutes les 6h
├── package.json
└── README.md
```

> ⚠️ **Important Railway** : `brainexe-config.json` et les backups sont sur le filesystem éphémère de Railway. Ils sont perdus à chaque redeploy. La logique de rattrapage au démarrage gère les cas manqués.

---

## ⚙️ Variables d'environnement Railway

À configurer dans **Railway → Variables** :

| Variable | Description | Obligatoire |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | ✅ Oui |
| `GUILD_ID` | ID du serveur Discord | ✅ Oui |
| `ANTHROPIC_API_KEY` | Clé API Claude (Anthropic) | ✅ Pour les automatisations IA |
| `PORT` | Port HTTP (Railway le gère auto) | Non |

---

## 🤖 Discord — Intents requis

Dans le **Discord Developer Portal → Bot → Privileged Gateway Intents**, ces 3 intents doivent être activés :

| Intent | Utilité |
|---|---|
| ✅ **Server Members Intent** | Détecter les arrivées, récupérer la liste des membres |
| ✅ **Message Content Intent** | Lire le contenu des messages pour les réponses auto |
| ✅ **Presence Intent** | (optionnel mais recommandé) |

---

## 🚀 Stack technique

| Composant | Technologie |
|---|---|
| Runtime | Node.js |
| Bot framework | Discord.js v14 |
| Serveur web | Express.js |
| Temps réel dashboard | WebSocket (ws) |
| Cron jobs | node-cron |
| Watch fichiers | chokidar |
| IA | Anthropic API (`claude-sonnet-4-6`) |
| Hébergement | Railway |
| Déploiement | GitHub (auto-deploy) |

---

## 📋 Fonctionnalités du Bot

### 1. 🔄 Sync bidirectionnelle Discord ↔ Fichier

Le bot maintient en permanence une synchronisation entre Discord et le fichier `discord-template.json` :

- **Discord → Fichier** : chaque modification sur le serveur (nouveau salon, rôle renommé, catégorie déplacée) met à jour le fichier JSON automatiquement avec un débounce de 2 secondes
- **Fichier → Discord** : modifier le JSON déclenche l'application des changements sur Discord
- Les deux sens ont un système anti-boucle (`isApplyingDiscord` / `isApplyingFile`)

### 2. 🎭 Auto-Role

À l'arrivée d'un nouveau membre, le bot lui assigne automatiquement le rôle configuré (par défaut : `👁️ Lurker`). Ce rôle donne accès au salon `🎭・choix-des-rôles` pour que le membre puisse se configurer via Carl-bot.

**Configurable** depuis le dashboard → page Auto-Role.

### 3. 👋 Message de bienvenue

À chaque arrivée, un embed est posté dans `👋・présentations` avec une phrase aléatoire parmi une liste configurable. L'embed inclut des liens vers les règles et le salon de choix des rôles.

**Configurable** depuis le dashboard → Automatisations → Message d'accueil.

### 4. 🎮 Anecdote Gaming Quotidienne

Chaque jour à une heure configurable (défaut : 12h), le bot génère et poste une anecdote gaming via Claude IA dans le salon configuré. Un délai aléatoire (0 à 30 min par défaut) est appliqué pour paraître naturel.

**Anti-doublon** : `lastPostedDate` sauvegardé dans `brainexe-config.json`. Si le bot redémarre et que l'heure est déjà passée, il rattrape automatiquement dans les 30 secondes.

**Configurable** : heure, délai max, salon de destination.

### 5. 📰 Actus Bi-Mensuelles

Les actus sont postées **le 1er et le 15 de chaque mois à 10h** dans tous les salons actifs. Chaque salon reçoit un résumé d'actus pertinent généré par Claude IA selon son topic.

**Anti-doublon** : système de `lastPostedSlots[]` — chaque slot (`YYYY-MM-1` ou `YYYY-MM-15`) est tracké indépendamment. Un slot ne peut être posté qu'une seule fois (sauf déclenchement manuel avec `force: true`).

**Étalement** : les posts sont répartis aléatoirement sur 12h pour éviter le spam simultané.

**Protection redeploy** : si Railway redémarre entre 10h et 22h un jour d'actus et que le slot n'a pas été posté, le bot rattrape dans la minute. Après 22h, aucun rattrapage (les actus auraient dû être étalées, trop tard).

**Bouton manuel** dans le dashboard : force le post immédiatement, ignore le check de slot.

### 6. 💬 Lance-Conversations + Réponses Auto

Le bot anime les salons de deux façons :

**Lance-conversations** : postes autonomes pour démarrer une discussion dans un salon.
- Check toutes les heures (cron)
- Plage horaire configurable (défaut : 0h-24h)
- Max configurable par jour (défaut : 5)
- **Cible en priorité le salon le plus calme** (tracking `lastPostByChannel`)
- Probabilité adaptive : plus il est tard avec peu de posts, plus la probabilité monte

**Réponses aux membres** : si `canReply` est activé, le bot répond naturellement aux messages humains récents.
- Check toutes les 2h avec 40% de probabilité
- Conditions : message entre 20min et 3h d'ancienneté, auteur humain, contenu > 5 caractères
- **Rate limit global** : minimum 30min entre tout post du bot (conv OU reply) pour éviter le spam

**Anti-doublon** : `dailyCount` + `lastPostDate` — le compteur se remet à zéro automatiquement chaque jour.

**Timezone** : tout le timing est en heure de Paris (`Europe/Paris`).

### 7. 🛡️ Modération

Depuis le dashboard (page Membres), actions disponibles sur chaque membre :
- **Timeout** (mute) : de 10 min à 28 jours, avec raccourcis
- **Lever le timeout** : retrait immédiat
- **Kick** : expulsion (le membre peut revenir)
- **Ban** : bannissement définitif avec suppression optionnelle des messages (1/3/7 jours)
- **Gestion des rôles** : ajout/retrait de rôles via checkboxes

### 8. 📦 Backups automatiques

Toutes les 6h, le bot crée un snapshot JSON complet de la structure Discord (rôles, catégories, salons, topics) dans un fichier `backup_XXXX.json`. Maximum 10 backups conservés (les plus anciens sont supprimés).

---

## 🖥️ Dashboard Web

Accessible depuis le navigateur (URL Railway publique).

### Pages disponibles

| Page | Description |
|---|---|
| 🏠 Vue d'ensemble | Stats globales, structure serveur, live log, actions rapides |
| 👥 Membres | Liste complète avec rôles, dates d'arrivée, actions de modération |
| 📁 Salons | Arbre complet des catégories/salons, création/modification/suppression |
| 🎭 Rôles | Liste des rôles, création/suppression, répartition |
| 🤖 Automatisations | Config complète des 4 automatisations + statuts en temps réel |
| ✏️ Posts manuels | Envoi d'un message dans n'importe quel salon, avec raccourcis par catégorie |
| 🤖 Auto-Role | Rôle assigné à l'arrivée, sélecteur avec tous les rôles du serveur |
| ✨ Reaction Roles | Config Carl-bot, commandes à copier |
| 📋 Logs | Stream en temps réel filtrable (D→F, F→D, API, SYS, ERR) |
| 📦 Backups | Liste des backups, création manuelle |
| ⚙️ Paramètres | Infos bot, liens utiles, zone danger |

### Navigation mobile

Barre de navigation fixe en bas avec 5 onglets principaux + bouton **⋯ Plus** qui ouvre un menu slide-up donnant accès aux pages secondaires (Membres, Rôles, Auto-Role, Reaction Roles, Posts manuels, Backups).

### Temps réel

Le dashboard est connecté via **WebSocket**. Toutes les modifications Discord (arrivée d'un membre, création d'un salon...) apparaissent instantanément dans les logs et la structure sans recharger la page.

---

## 🔌 API REST — Routes disponibles

### État & Config
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/state` | État complet du serveur Discord |
| GET | `/api/logs` | Historique des logs |
| GET | `/api/config` | Config des automatisations |
| POST | `/api/config` | Modifier une section de config (`{ section, data }`) |

### Synchronisation
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/sync/discord-to-file` | Forcer sync Discord → JSON |
| POST | `/api/sync/file-to-discord` | Forcer sync JSON → Discord |

### Salons & Catégories
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/categories` | Créer une catégorie (`{ name }`) |
| POST | `/api/channels` | Créer un salon (`{ name, type, categoryName, topic }`) |
| PATCH | `/api/channels/:id` | Modifier nom/topic d'un salon |
| DELETE | `/api/channels/:id` | Supprimer un salon |

### Rôles
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/roles` | Créer un rôle (`{ name, color, hoist }`) |
| DELETE | `/api/roles/:id` | Supprimer un rôle |

### Auto-Role
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/autorole` | Rôle auto actuel |
| POST | `/api/autorole` | Changer le rôle auto (`{ roleName }`) |

### Automatisations (déclenchement manuel)
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/anecdote` | Forcer une anecdote maintenant |
| POST | `/api/actus` | Poster les actus (`{ force: true }` pour ignorer le slot) |
| POST | `/api/conversation` | Forcer une lance-conv |
| POST | `/api/conversation/reply` | Forcer une tentative de réponse |
| POST | `/api/welcome/test` | Envoyer un message de bienvenue test |

### Posts manuels
| Méthode | Route | Description |
|---|---|---|
| POST | `/api/post` | Envoyer un message (`{ channelId, content, asEmbed, embedTitle }`) |

### Membres
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/members` | Liste des membres |
| POST | `/api/members/:id/mute` | Timeout (`{ duration }` en minutes, 0 = lever) |
| POST | `/api/members/:id/kick` | Expulser (`{ reason }`) |
| POST | `/api/members/:id/ban` | Bannir (`{ reason, deleteMessageDays }`) |
| PATCH | `/api/members/:id/roles` | Modifier les rôles (`{ addRoles, removeRoles }`) |

### Backups
| Méthode | Route | Description |
|---|---|---|
| GET | `/api/backups` | Liste des backups |
| POST | `/api/backup` | Créer un backup maintenant |

---

## 🗃️ Config persistante — `brainexe-config.json`

Généré automatiquement au premier démarrage. Structure complète :

```json
{
  "anecdote": {
    "enabled": true,
    "channelId": "...",
    "channelName": "💬・général",
    "hour": 12,
    "randomDelayMax": 30,
    "lastPostedDate": "2025-04-04"
  },
  "welcome": {
    "enabled": true,
    "channelId": "...",
    "channelName": "👋・présentations",
    "messages": ["...", "..."]
  },
  "actus": {
    "enabled": true,
    "lastPostedSlots": ["2025-04-1", "2025-03-15"],
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
    "lastPostDate": "2025-04-04",
    "lastPostByChannel": { "channelId": 1712345678901 },
    "canReply": true,
    "channels": [...]
  }
}
```

---

## 🔁 Déploiement

```bash
# Modifier les fichiers en local
git add .
git commit -m "feat: description du changement"
git push
# Railway redéploie automatiquement depuis GitHub
```

Le bot redémarre, recharge la config depuis `brainexe-config.json`, relance tous les crons, et vérifie s'il a manqué des posts (anecdote ou actus) pendant le downtime.

---

## 📅 Historique des versions

### v1.3.0 (Avril 2025)
- ✅ Actus bi-mensuelles : 1er et 15 du mois (remplace 1x/mois)
- ✅ Système `lastPostedSlots[]` (anti-doublon amélioré)
- ✅ Conversations 24h/24 avec ciblage salon le plus calme
- ✅ `canReply` : le bot répond aux conversations des membres
- ✅ `maxPerDay` remplace `frequencyPerWeek`
- ✅ Rate limit global 30min entre tout post bot
- ✅ Fix timezone (heure Paris partout)
- ✅ Nav mobile avec bouton ⋯ Plus
- ✅ Statuts temps réel dans les cards Automatisations
- ✅ Vrai modal création de catégorie
- ✅ `botTag` affiché dans Settings
- ✅ Suppression des éléments UI obsolètes (page Bienvenue doublon, toggle Sync bidon)
- ✅ Intent `MessageContent` ajouté

### v1.2.0
- ✅ Fix `getWeekStart()` ne mutait plus `now`
- ✅ `convWeeklyCount` + `convLastPostTime` persistés en config
- ✅ `lastPostedMonth` sauvegardé après confirmation d'envoi
- ✅ Délai rattrapage 5s → 15s
- ✅ Modération complète (mute/kick/ban/gestion rôles) via modal tabbed

### v1.1.0
- ✅ Système de conversations hebdomadaires (3x/semaine)
- ✅ Actus mensuelles avec étalement aléatoire
- ✅ Anecdote quotidienne via Claude IA
- ✅ Auto-role à l'arrivée
- ✅ Message de bienvenue avec phrases aléatoires

### v1.0.0
- ✅ Sync bidirectionnelle Discord ↔ JSON
- ✅ Dashboard WebSocket temps réel
- ✅ Gestion salons, rôles, catégories
- ✅ Logs filtrables
- ✅ Backups automatiques toutes les 6h

---

## 🧠 Notes importantes

**Railway & filesystem éphémère** : à chaque redeploy, `brainexe-config.json` est recréé depuis les `DEFAULT_CONFIG` si absent. Les crons et la logique de rattrapage compensent les posts manqués pendant le downtime.

**Claude API** : le modèle utilisé est `claude-sonnet-4-6`. Chaque appel API consomme des tokens — les anecdotes (400 tokens max), actus (600 tokens max) et conversations (150 tokens max) sont calibrés pour rester économiques.

**Anti-spam Discord** : des délais (`sleep()`) sont insérés entre chaque action Discord lors des syncs F→D pour respecter le rate limit de l'API Discord.

**node_modules** : ne jamais committer dans GitHub. Railway les installe automatiquement depuis `package.json`.

---

*Projet construit et maintenu par Matthieu / BrainEXE 🧠*
