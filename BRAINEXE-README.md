# 🧠 BrainEXE Dashboard — Guide complet

> Bot Discord + Dashboard web pour **Neurodivergent Creator Hub**
> Version 1.1.0 — Repartir de zéro

---

## 📁 Structure du projet

```
brainexe-dashboard/
├── server.js              ← Bot Discord + API Express + WebSocket
├── package.json           ← Dépendances
├── .gitignore             ← Fichiers à ne pas pusher
├── discord-template.json  ← Généré automatiquement au démarrage
└── public/
    └── index.html         ← Dashboard web
```

---

## ⚡ Installation en 5 étapes

### Étape 1 — Créer le dossier

Crée un nouveau dossier `brainexe-dashboard` et copie dedans :
- `server.js` → à la racine
- `package.json` → à la racine
- `.gitignore` → à la racine
- `public/index.html` → dans le dossier `public/`

### Étape 2 — Installer les dépendances

```bash
cd brainexe-dashboard
npm install
```

Tu dois voir à la fin :
```
added X packages in Xs
```

### Étape 3 — Tester en local (optionnel)

Crée un fichier `.env` à la racine :
```
DISCORD_TOKEN=ton_token_ici
GUILD_ID=1481022956816830669
PERPLEXITY_API_KEY=pplx-xxxxxxxx
```

Lance le bot :
```bash
node server.js
```

Tu dois voir :
```
✅ Bot connecté : BrainEXE#XXXX
Serveur démarré sur le port 3000
```

### Étape 4 — Créer le repo GitHub

```bash
git init
git add .
git commit -m "init: BrainEXE v1.1.0"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/brainexe-dashboard.git
git push -u origin main
```

### Étape 5 — Déployer sur Railway

1. Va sur [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Sélectionne `brainexe-dashboard`
4. Onglet **Variables** → ajoute :

| Variable | Valeur |
|---|---|
| `DISCORD_TOKEN` | Ton token Discord |
| `GUILD_ID` | `1481022956816830669` |
| `PERPLEXITY_API_KEY` | Ta clé Perplexity |

5. Railway redémarre automatiquement ✅

---

## 🔑 Obtenir les clés

### Token Discord
1. [discord.com/developers/applications](https://discord.com/developers/applications)
2. Ton app **BrainEXE** → **Bot** → **Reset Token**
3. Copie le token — affiché **une seule fois** !

### Guild ID
1. Discord → Paramètres → Apparence → active **Mode développeur**
2. Clic droit sur ton serveur → **Copier l'identifiant**

### Clé Perplexity
1. [perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. **Generate** → copie la clé `pplx-xxxxxxxx`

---

## 🤖 Fonctionnalités du bot

| Fonctionnalité | Description | Config |
|---|---|---|
| 🎮 Anecdote Gaming | Posté chaque jour à midi dans #général | Dashboard → Automatisations |
| 👋 Welcome auto | Embed + ping à chaque nouveau membre | Dashboard → Automatisations |
| 📰 Actus mensuelles | Le 1er du mois dans chaque salon thématique | Dashboard → Automatisations |
| 💬 Lance-conversations | 3x/semaine entre 14h-22h | Dashboard → Automatisations |
| 🤖 Auto-role | Rôle Lurker assigné à l'arrivée | Dashboard → Auto-Role |
| 🔄 Sync Discord ↔ JSON | Structure du serveur synchronisée en temps réel | Automatique |
| 📦 Backup auto | Toutes les 6h, 10 backups max | Automatique |

---

## 🖥️ Le Dashboard

Accessible sur ton URL Railway :
`https://brainexe-dashboard-production.up.railway.app`

### Pages disponibles
- **🏠 Vue d'ensemble** — Stats serveur + logs en temps réel
- **👥 Membres** — Liste de tous les membres
- **📁 Salons** — Créer / supprimer / modifier les salons
- **🎭 Rôles** — Créer / supprimer les rôles
- **🤖 Automatisations** — Configurer toutes les fonctions IA
- **🤖 Auto-Role** — Changer le rôle d'arrivée
- **📋 Logs** — Historique complet des syncs
- **📦 Backups** — Créer des backups manuels
- **⚙️ Paramètres** — Config générale

---

## ⚙️ Page Automatisations — comment ça marche

Tout se configure depuis le dashboard — **pas besoin de toucher au code**.

Quand tu cliques **💾 Sauvegarder** :
1. La config est sauvegardée dans `brainexe-config.json`
2. Les crons redémarrent instantanément
3. Confirmation dans les logs

### Ce que tu peux changer

**🎮 Anecdote Gaming**
- Salon de destination
- Heure de déclenchement (0–23h)
- Délai aléatoire max (en minutes)
- Activer / désactiver

**👋 Message d'accueil**
- Salon de destination
- Phrases de bienvenue (une par ligne, tirée au sort)
- Activer / désactiver

**📰 Actus mensuelles**
- Jour du mois (1–28)
- Activer/désactiver chaque salon individuellement

**💬 Lance-conversations**
- Fréquence par semaine
- Plage horaire (début / fin)
- Activer/désactiver chaque salon

---

## 🔄 Mettre à jour le bot

```bash
# Modifier tes fichiers puis :
git add .
git commit -m "description de la modif"
git push
```

Railway redéploie automatiquement en 2-3 minutes ⚡

---

## 🐛 Dépannage

| Erreur | Solution |
|---|---|
| `Token invalide` | Régénère le token dans Discord Dev Portal → Railway Variables |
| `Cannot find module` | `npm install` puis re-push |
| `Application failed to respond` | Vérifie que `index.html` est dans `public/` |
| `PERPLEXITY_API_KEY manquante` | Ajoute la variable dans Railway |
| Bot connecté mais dashboard vide | Attends 10s, le bot fetch les données au démarrage |

---

## 📋 Checklist déploiement

- [ ] `npm install` exécuté localement
- [ ] `node_modules/` absent du repo (vérifie `.gitignore`)
- [ ] `DISCORD_TOKEN` dans Railway Variables
- [ ] `GUILD_ID` dans Railway Variables  
- [ ] `PERPLEXITY_API_KEY` dans Railway Variables
- [ ] `public/index.html` dans le bon dossier
- [ ] Déploiement Railway → ✅ Success
- [ ] Logs montrent `✅ Bot connecté`

---

*🧠 BrainEXE v1.1.0 · Neurodivergent Creator Hub*
