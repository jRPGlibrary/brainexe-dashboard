# 🧠 BrainEXE — État du projet
> Dernière mise à jour : 12 mars 2026

---

## 🌐 Liens importants
| Quoi | Lien |
|------|------|
| Dashboard en ligne | https://brainexe-dashboard-production.up.railway.app |
| GitHub repo | https://github.com/jRPGlibrary/brainexe-dashboard |
| Discord Dev Portal | https://discord.com/developers/applications |

---

## 🤖 Bot BrainEXE
- **Tag** : Brain.EXE
- **Guild ID** : `1481022956816830669`
- **Hébergement** : Railway (24h/24)
- **Token** : stocké dans les variables Railway (`DISCORD_TOKEN`)

---

## 📁 Structure du projet
```
brainexe-dashboard/
├── server.js            ← backend Express + Discord + WebSocket
├── package.json
├── discord-template.json ← généré auto par la sync
└── public/
    └── index.html       ← dashboard frontend
```

---

## ✅ Fonctionnalités actives

### Bot
- Auto-role à l'arrivée → `👁️ Lurker`
- Embed de bienvenue dans `👋・présentations`
- Sync bidirectionnelle Discord ⟷ `discord-template.json`
- Backup auto toutes les **6h** → dossier `/backups`
- Logs persistants → `brainexe.log`

### Dashboard
- Gestion salons (créer / supprimer)
- Gestion rôles (créer / supprimer)
- Page Auto-Role (changer le rôle d'arrivée)
- Live log en temps réel via WebSocket
- Forcer sync + Backup manuel

---

## 🎭 Rôles (17 rôles)
| Rôle | Couleur | Accès |
|------|---------|-------|
| 👑 Fondateur | `#b890ff` | Tout |
| 🛡️ Modérateur | `#5b9cf6` | Tout |
| 📱 TikToker | `#e040c8` | TikTok & Lives |
| 🧠 TDAH | `#3ba55c` | TDAH & Neurodivergence |
| 💜 Borderline | `#f5a623` | TDAH & Neurodivergence |
| ⚔️ RPG Addict | `#e74c3c` | RPG & Aventure |
| 🕹️ Retro Gamer | `#f39c12` | Retro Gaming |
| 🌿 Indie Explorer | `#2ecc71` | Indie Games |
| 🚀 Next-Gen Player | `#3498db` | Next-Gen & Actus |
| 💻 Web Dev / Dev | `#40c8e0` | Web Dev & Tech |
| 🔔 Notif Lives | `#e74c3c` | Ping alertes live |
| 👁️ Lurker | `#95a5a6` | Accueil uniquement |
| carl-bot | — | Bot |
| Ticket Tool | — | Bot |
| Statbot | — | Bot |
| Brain.EXE | — | Bot |

---

## 📂 Structure serveur (42 salons / 10 catégories)

| Catégorie | Salons | Accès |
|-----------|--------|-------|
| 📌 Accueil | annonces, règles, présentations, choix-des-rôles, agenda-lives | Tout le monde |
| 💬 Communauté | général, cerveau-en-feu, memes-et-chaos, off-topic, partage-créations | Tout le monde |
| 📱 TikTok & Lives | alertes-live, idées-contenu, clips-du-live, suggestions-live, stats-et-growth | 📱 TikToker |
| 🧠 TDAH & Neurodivergence | tdah-talk, borderline-safe, soutien-mutuel, tips-focus, playlist-focus | 🧠 TDAH / 💜 Borderline |
| ⚔️ RPG & Aventure | rpg-général, jrpg-corner, open-world-rpg, lore-et-théories | ⚔️ RPG Addict |
| 🕹️ Retro Gaming | retro-général, hidden-gems, nostalgie | 🕹️ Retro Gamer |
| 🌿 Indie Games | indie-général, à-découvrir, pixel-art-love | 🌿 Indie Explorer |
| 🚀 Next-Gen & Actus | next-gen-général, actus-gaming, game-of-the-moment | 🚀 Next-Gen Player |
| 💻 Web Dev & Tech | code-talk, projets-web, debug-help, ia-et-tools | 💻 Dev / Web Dev |
| 🔊 Vocaux | Général Vocal, Live Watch Party, Gaming Session, Cowork & Focus, Lofi & Chill | Tout le monde |

---

## 🔧 Bots installés
| Bot | Rôle |
|-----|------|
| Carl-bot | Reaction roles dans #choix-des-rôles |
| Ticket Tool | Support privé |
| Statbot | Stats du serveur |
| Brain.EXE | Bot custom — tout le reste |

---

## ⏳ Ce qui reste à faire
- [ ] Configurer le message de bienvenue Carl-bot
- [ ] Connecter TikTok Notifier (ou PingSync)
- [ ] Commandes slash personnalisées (`/live`, `/tips`...)
- [ ] Déployer une mise à jour → `git push`

---

## 🔄 Mettre à jour le bot
```bash
git add .
git commit -m "description de la modif"
git push
```
Railway redéploie automatiquement en ~30 secondes ⚡
