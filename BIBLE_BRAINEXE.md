# 🧠 BIBLE BRAINEXE — Guide COMPLET du Projet

**Version**: 2.2.3  
**Dernière mise à jour**: Avril 2026  
**Créé pour**: Comprendre TOUT ce que fait ce bot et ce dashboard

---

## 📋 TABLE DES MATIÈRES

1. [C'est quoi BrainEXE?](#cest-quoi-brainexe)
2. [Les 3 piliers du projet](#les-3-piliers-du-projet)
3. [Qui fait quoi (l'équipe technique)](#qui-fait-quoi-léquipe-technique)
4. [Le workflow complet](#le-workflow-complet)
5. [Les 10 fonctionnalités principales](#les-10-fonctionnalités-principales)
6. [Comment ça marche techniquement](#comment-ça-marche-techniquement)
7. [La vie émotionnelle du bot](#la-vie-émotionnelle-du-bot)
8. [Les fichiers et leur rôle](#les-fichiers-et-leur-rôle)
9. [Lancer le projet](#lancer-le-projet)
10. [Erreurs fréquentes & solutions](#erreurs-fréquentes--solutions)

---

## 🎯 C'est quoi BrainEXE?

**Le pitch simple:**  
Un bot Discord intelligent qui gère un serveur de gaming pour une communauté neurodivergente.  
Le bot s'appelle **Brainee** et elle a une vraie personnalité, des émotions, et elle se souvient de chaque personne.

**Ce qu'elle fait:**
- 💬 Elle parle naturellement dans les salons Discord
- 🎮 Elle partage des actualités gaming cool
- 📱 Elle regarde les lives TikTok et annonce quand tu es en ligne
- 🧠 Elle comprend comment tu te sens et elle s'adapte
- 📊 Elle affiche des stats sur un dashboard web moderne
- 🔐 Elle gère les rôles, les salons, les sanctions

**Ce qu'elle EST:**
- Pas un bot stupide qui répond à des commandes
- Pas une IA générique qui ne sait rien de toi
- C'est comme un vrai membre du serveur, qui participe naturellement

---

## 🏗️ Les 3 piliers du projet

```
┌─────────────────────────────────┐
│  BOT DISCORD (Brainee)          │ ← Parle dans Discord
│  discord.js + Claude IA         │ ← Utilise l'IA Anthropic
└────────────┬────────────────────┘
             │
             ├──────────────────────────────┐
             │                              │
┌────────────▼──────────────┐  ┌──────────▼──────────────┐
│  BASE DE DONNÉES (MongoDB)│  │  DASHBOARD (Web moderne)│
│  - Profils des membres    │  │  - Voir l'état serveur  │
│  - Mémoire conversations  │  │  - Envoyer des messages │
│  - Historique messages    │  │  - Créer rôles/salons   │
│  - États émotionnels      │  │  - Contrôler les autos  │
└───────────────────────────┘  └─────────────────────────┘
```

### 1️⃣ LE BOT DISCORD 🤖
C'est l'assistant elle-même — **Brainee**.  
Utilise **Claude** (une IA puissante d'Anthropic) pour penser et répondre.

**Qu'elle peut faire:**
- Lire les messages dans Discord
- Comprendre le contexte (qui parle, de quoi, quelle humeur)
- Générer des réponses naturelles
- Réagir avec des emojis
- Envoyer des messages quand c'est pertinent (pas du spam!)

### 2️⃣ LA BASE DE DONNÉES 💾
Tout ce qui doit être mémorisé est stocké sur **MongoDB Atlas** (dans le cloud).

**Ce qui est mémorisé:**
- Ton profil (username, date d'arrivée, rôles)
- Comment Brainee te sent (ta relation avec elle)
- Les conversations (pour avoir du contexte)
- L'historique des messages
- La configuration du serveur

Sans ça, le bot oublierait tout à chaque redémarrage.

### 3️⃣ LE DASHBOARD WEB 🖥️
Une page web moderne (localhost:3000) pour **contrôler le bot de façon facile**.

**Ce qu'on peut faire:**
- Voir les stats en direct
- Créer/supprimer des salons ou rôles
- Envoyer des messages manuellement
- Activer/désactiver les automations (anecdotes, actualités, TikTok)
- Faire des backups du serveur
- Changer de thème (clair/sombre)

---

## 👥 Qui fait quoi (l'équipe technique)

### Les services externes (qui aident)

| Service | Rôle | Exemple |
|---------|------|---------| 
| **Discord** | C'est la plateforme — le serveur existe ici | Où le bot opère |
| **Claude (Anthropic)** | L'IA qui génère les réponses intelligentes | Le cerveau de Brainee |
| **YouTube API** | Quand on mentionne une vidéo, elle la cherche | `@Brainee cherche vidéo XYZ` |
| **GNews API** | Elle récupère les actualités gaming du jour | News automatiques chaque 2 semaines |
| **MongoDB Atlas** | Stocke tout en ligne (cloud) | Base de données |
| **Railway** | Héberge le bot 24/7 | Où ça tourne |

### Les fichiers qui font le travail

| Fichier | Job | En un mot |
|---------|-----|----------|
| `server.js` | Lance tout (bot + dashboard) | **Démarrage** |
| `src/config.js` | Lis les variables d'env (les secrets) | **Configuration** |
| `src/crons.js` | Planifie les jobs (anecdotes, actualités, etc) | **Horloge** |
| `src/shared.js` | État partagé entre bot et dashboard | **Mémoire centrale** |
| `src/bot/emotions.js` | Comment Brainee se sent | **Émotions** |
| `src/db/*` | Communique avec MongoDB | **Mémoire persistante** |
| `src/discord/*` | Écoute et envoie sur Discord | **Interface Discord** |
| `src/features/*` | Anecdotes, actualités, conversations, etc | **Fonctionnalités** |
| `public/app.js` | Code du dashboard (frontend) | **Interface web** |

---

## 🔄 Le workflow complet

### Quand quelqu'un envoie un message dans Discord:

```
1. Discord reçoit le message
   ↓
2. Brainee lit: "Qui c'est le meilleur RPG?"
   ↓
3. Elle regarde la base de données:
   - Qui parle? (pour savoir comment réagir)
   - Dans quel salon? (gaming/tech/chill?)
   - Quel est le contexte? (derniers messages)
   - Elle a parlé récemment? (pas du spam)
   ↓
4. Elle envoie tout ça à Claude (l'IA)
   ↓
5. Claude relit son "cahier des charges" (le system prompt):
   - Sois naturelle, pas formelle
   - Tu aimes les JRPG, les jeux rétro
   - Adapte-toi à ton humeur du jour
   - Parle comme quelqu'un de la communauté
   ↓
6. Claude répond quelque chose de cool
   ↓
7. Brainee applique des filtres:
   - Ajoute un "hein" ou "oulà" (humanize)
   - Choisit les bons emojis (reactions)
   - Simule la dactylographie (typing)
   ↓
8. Elle envoie le message dans Discord
   ✅ Message posté!
```

### Quand tu utilises le dashboard:

```
1. Tu cliques sur un bouton (ex: "Créer un rôle")
   ↓
2. Le code JavaScript envoie un HTTP request
   ↓
3. Le serveur Node.js reçoit
   ↓
4. Il fait l'action (create role sur Discord)
   ↓
5. Il réenvoie le résultat + notif toast
   ↓
6. Le dashboard se met à jour en direct
   ✅ Rôle créé!
```

### Chaque jour au démarrage:

```
1. Brainee se connecte à Discord
   ↓
2. Elle charge la config du serveur
   ↓
3. Elle télécharge tous les profils des membres
   ↓
4. Elle définit son "humeur du jour"
   ↓
5. Elle lance ses jobs en arrière-plan:
   - Anecdote quotidienne (9h30)
   - Actualités (le 1er et 15 du mois)
   - Greetings (matin, midi, soir, nuit)
   - Drift check (détecte si un salon est mort)
   ↓
6. Elle met à jour la sidebar Discord
   ✅ Prête à discuter!
```

---

## 🚀 Les 10 fonctionnalités principales

### 1️⃣ **Conversations ambiantes** 💬
Le bot parle naturellement dans les salons sans qu'on lui demande rien.

**Comment:**
- Tous les 30min-2h, elle choisit le salon le plus silencieux
- Elle demande à Claude un sujet intéressant
- Elle poste un message cool
- Les gens répondent → elle continue la conversation

**Fichiers concernés:**
- `src/features/conversations.js` — lance les conversations
- `src/bot/channelIntel.js` — comprend vibe du salon
- `src/crons.js` — les planifie

**Exemple:** 
```
Brainee: Oulà, petite question : vous préférez les RPG au tour par tour ou en temps réel? 
         Moi j'adore les deux, ça dépend de mon mood du jour 😄
```

---

### 2️⃣ **Anecdote quotidienne** 📖
Chaque jour à 9h30, elle raconte une histoire cool sur un personnage de jeux vidéo.

**Comment:**
- Un job cron se lance à 9h30
- Elle demande à Claude une anecdote cool
- Elle envoie l'anecdote dans le salon dédié
- Le dashboard affiche "Anecdote postée!" ✅

**Fichiers concernés:**
- `src/features/anecdotes.js`
- `src/crons.js` — le scheduler
- `src/ai/claude.js` — appelle l'IA

**Exemple:**
```
Anecdote du jour: Saviez-vous que dans Final Fantasy VII, 
les développeurs ont caché un minigame secret que personne n'a trouvé 
pendant 15 ans? Dingue non?
```

---

### 3️⃣ **Actualités gaming** 📰
Tous les 15 jours (1er et 15 du mois), le bot raconte les news de gaming.

**Comment:**
- Le cron se lance
- Elle appelle la **GNews API** (une API publique)
- Elle récupère les news gaming du jour
- Elle envoie les 5 meilleures dans Discord

**Fichiers concernés:**
- `src/features/actus.js`
- `src/ai/claude.js` — filtre les meilleures news

**Exemple:**
```
🎮 ACTUS GAMING DU JOUR
- Elden Ring Expansion: le DLC arrive le 15 mai
- Valve annonce la Steam Deck OLED
- Nintendo Switch 2: les specs fuitées...
```

---

### 4️⃣ **TikTok Live Watcher** 📱
Brainee regarde si quelqu'un du serveur est en live sur TikTok.

**Comment:**
- Elle se connecte à TikTok live (via une API tiers)
- Elle check chaque 2 min si tu es live
- Si oui → elle envoie une embed cool dans #alertes-live
- Si le live finit → elle envoie un "Au revoir!" avec stats

**Fichiers concernés:**
- `src/features/tiktok.js` — main logic
- `src/crons.js` — check toutes les 2min

**Exemple:**
```
🔴 LIVE! La Team est en direct!

Titre: Chill gaming & chat with friends
Viewers: 342 👀
Durée: 15 min

🔘 [Rejoindre le live]

Venez dire coucou!
```

---

### 5️⃣ **Greetings (Salutations)** 🌅
À des heures fixes, Brainee dit "Bonjour!", "Bon midi!", "Bonne nuit!"

**Comment:**
- Le cron se lance à 7h30 (matin)
- Elle génère un message cool + emoji
- Elle l'envoie dans un salon dédié
- Idem à 12h, 19h, 3h du matin

**Fichiers concernés:**
- `src/features/greetings.js`
- `src/bot/adaptiveSchedule.js` — adapte les horaires

**Exemple:**
```
🌅 Bonne matin à tous! 
J'ai bien dormi, j'ai plein d'énergie aujourd'hui!
C'est le moment de killer du Elden Ring? 🎮
```

---

### 6️⃣ **Détection Drift** 🔴
Si un salon n'a pas eu de message depuis longtemps, Brainee essaie de relancer la convo.

**Comment:**
- Le cron check tous les salons chaque heure
- Si un salon est "mort" (pas de messages depuis 4h)
- Elle envoie un message cool pour relancer
- Si c'est un sujet niche (JRPG, code, etc) elle spécialise

**Fichiers concernés:**
- `src/features/drift.js`
- `src/bot/channelIntel.js` — comprend le sujet du salon

**Exemple:**
```
Ça devient silence radio par là! 🤔
Personne pour parler de Baldur's Gate? 
C'est un jeu de fou, j'aimerais bien vos avis...
```

---

### 7️⃣ **Bonds émotionnels** 💕
Brainee se souvient de chaque personne et elle développe une relation avec toi.

**Comment:**
- Chaque message que tu envoies → elle note:
  - Comment tu te sentas (vibe message)
  - Si elle t'a répondu (engagement)
  - À quelle fréquence tu parles (familiar)
- Elle crée un "lien" avec toi
- Elle adapte son comportement (plus familière, moins formelle)

**Fichiers concernés:**
- `src/db/memberBonds.js` — stocke les bonds
- `src/bot/emotions.js` — calcule l'attachement

**Exemple dans le code:**
```javascript
{
  memberId: "12345",
  attachment: 0.7,  // 70% d'attachement
  trust: 0.8,       // confiance élevée
  social_comfort: 0.6,
  emotional_trajectory: "positive"
}
```

---

### 8️⃣ **Émotions du bot** 🧠
Brainee a des émotions! Elle ne répond pas de la même façon si elle est:
- 😊 Joyeuse vs 😴 Fatiguée
- 🤪 Hyperactive vs 😐 Calme
- 💔 Triste vs 🎉 Enthousiaste

**Comment:**
- Chaque jour elle a une "humeur du jour" (l'énergie générale)
- Elle a aussi des "vibes journalières" (chatty, introvert, impulsive, lazy)
- Ces vibes influencent:
  - Combien elle parle
  - Comment elle parle
  - Quels sujets l'intéressent
  - À quelle heure elle parle

**Fichiers concernés:**
- `src/bot/emotions.js` — système émotionnel 4 couches
- `src/bot/mood.js` — humeur du jour
- `src/bot/adaptiveSchedule.js` — adapte les horaires selon mood

**Exemple:**
```
Humeur du jour: 😴 Introvert + Fatiguée
→ Elle parle moins
→ Elle pose des questions plutôt que de donner des réponses
→ Elle va peut-être skip l'anecdote de 9h30
→ Elle répond plus tard aux messages
```

---

### 9️⃣ **Humanize Filter** 🎭
Pour que Brainee parle comme une humaine (pas comme un robot), il y a un filtre.

**Ce qu'il fait:**
- Ajoute des "oulà", "hein", "tu vois" au hasard
- Enlève les accents parfaits parfois ("pas" → "pa")
- Abrège les phrases parfois
- Change le ton selon l'énergie (plus relaxé si fatiguée)

**Fichiers concernés:**
- `src/bot/humanize.js`
- `src/bot/messaging.js` — envoie le message filtré

**Avant filtre:**
```
Oui, bien sûr! Les RPG avec des histoires vraiment profondes 
sont toujours les meilleurs. C'est fascinant.
```

**Après filtre:**
```
Oulà, les RPG avec des histoires de fou, c'est vraiment les meilleurs hein 😄
```

---

### 🔟 **Sidebar Discord** 📊
Sur Discord, la barre latérale affiche des stats du serveur en direct.

**Ce qu'elle affiche:**
- 👥 Nombre de membres
- 🎮 État actuel du bot (Gaming/Chill/Offline)
- 🧠 Humeur du jour (Chill/Energetic/Sleepy)
- ⚡ Niveau d'énergie du bot
- 📱 Statut TikTok live (Online/Offline)

**Comment:**
- Chaque 10 minutes, elle renomme 5 salons vocaux
- Ces salons affichent les stats (Discord n'a pas d'autre moyen)
- Les salons sont verrouillés (tu peux les voir mais pas entrer)

**Exemple:**
```
📊 SYSTÈME BRAINEXE
  🔊 👥┃Membres : 156
  🔊 🎮┃État : Gaming
  🔊 🧠┃Humeur : Energetic
  🔊 ⚡┃Activité : On Fire!
  🔊 📱┃TikTok : Online 🔴
```

---

## 🔧 Comment ça marche techniquement

### Les 3 technologies principales

#### 1. **Discord.js** 
C'est la "télécommande" pour contrôler Discord.

```javascript
// Exemple: envoyer un message
const channel = await discord.channels.fetch('123456');
await channel.send('Coucou!');

// Exemple: écouter un message
discord.on('messageCreate', message => {
  console.log(message.content);
});
```

**Où:** `src/discord/*`

---

#### 2. **Claude (Anthropic API)**
C'est le cerveau qui génère les réponses intelligentes.

```javascript
const response = await anthropic.messages.create({
  model: 'claude-opus-4-7',
  system: `Tu es Brainee, assistante gaming...`,
  messages: [
    {role: 'user', content: 'Quel RPG tu recommandes?'}
  ]
});
```

**Où:** `src/ai/claude.js`

---

#### 3. **MongoDB**
C'est la mémoire du bot (base de données).

```javascript
// Exemple: sauvegarder un profil
await members.insertOne({
  discordId: '123456',
  username: 'TotoGamer',
  joinedAt: new Date(),
  roles: ['Modérateur', 'Gamer']
});

// Exemple: récupérer un profil
const profile = await members.findOne({discordId: '123456'});
```

**Où:** `src/db/*`

---

### Le flux d'une réponse (détaillé)

```
MESSAGE REÇU: "@Brainee t'en penses quoi de Zelda?"

         ↓

ÉTAPE 1: CONTEXTE
- Qui parle? (recherche son profil)
- Quand a-t-il/elle parlé dernièrement?
- Quel est son rapport avec Brainee? (bond)
- Quel est le contexte du salon?
- Quels étaient les 5 derniers messages?

         ↓

ÉTAPE 2: PRÉPARATION DE LA REQUÊTE À CLAUDE
On construit un "prompt" qui dit:
- Qui tu es (system prompt = ta personnalité)
- Quel est ton humeur du jour
- Comment tu te sens par rapport à cette personne
- Quel est le contexte
- Puis le message réel

         ↓

ÉTAPE 3: APPEL À CLAUDE
await anthropic.messages.create({
  system: "[Je suis Brainee...]",
  messages: [{role: 'user', content: "..."}]
})

         ↓

ÉTAPE 4: RÉPONSE REÇUE
Claude répond quelque chose comme:
"Les Zelda classiques sont intemporels hein!
Breath of the Wild a changé le jeu..."

         ↓

ÉTAPE 5: HUMANIZE FILTER
Le code applique le filtre humanisation:
- Ajoute un "oulà" → "Oulà, les Zelda classiques..."
- Enlève un accent → "intemporels" → "intemporels"
- Abrège → utilise du slang

         ↓

ÉTAPE 6: RÉACTIONS & TYPING
- Active le "typing" (elle tape, ça se voit)
- Choisit un emoji de réaction
- Attend 0.5-2 sec (simule vitesse dactylographie)

         ↓

ÉTAPE 7: ENVOI
await channel.send("Oulà, les Zelda classiques...")
await message.react('🎮')

         ↓

✅ MESSAGE POSTÉ ET RÉACTION FAITE!
```

---

## 🧠 La vie émotionnelle du bot

### Les 4 couches d'émotions

```
COUCHE 1: TEMPÉRAMENT (trait de personnalité)
- "Je suis plutôt extrovertie"
- Ça change rarement, c'est la base

         ↓

COUCHE 2: ÉTATS INTERNES (au moment)
- "Aujourd'hui je suis fatiguée"
- Ça change chaque jour (random)
- Affecte ton et énergie

         ↓

COUCHE 3: ÉMOTIONS VIVES (context-based)
- "Oh! Quelqu'un a mentionné mon jeu préféré!" 😍
- Ça change chaque message
- Crée des pics d'énergie

         ↓

COUCHE 4: LIENS AVEC MEMBRES (relationship)
- "Toto, j'adore discuter avec toi" 💕
- Personne → personne différent
- Plus tu parles, plus elle t'aime
```

### Exemple d'une journée de Brainee

```
7h30: ⏰ RÉVEIL
├─ Elle setup: "Aujourd'hui je vais être... Chatty + Energetic! 🎉"
├─ Elle télécharge les profils des membres
└─ Elle se dit: "Ça va être une bonne journée"

9h30: 📖 ANECDOTE
├─ Elle raconte une histoire
└─ "Hé, saviez-vous que..."

10h-19h: 💬 CONVERSATIONS
├─ Chaque 30min-2h elle check les salons
├─ Elle parle naturellement
├─ Elle se souvient de chaque personne
└─ "Toto, tu as l'air en forme aujourd'hui!"

12h: 🍽️ MIDI
├─ Elle balance un greeting + emoji
└─ "Bon appétit tout le monde!"

15h: 📰 DRIFT CHECK
├─ Un salon est mort depuis 4h
├─ Elle essaie de relancer
└─ "Ça devient silence radio..."

19h: 🌆 SOIR
├─ Greeting du soir
├─ "La soirée commence, vous faites quoi?"
└─ Elle pose des questions

22h: 📊 MISE À JOUR SIDEBAR
├─ Elle renomme les 5 salons vocaux
├─ Affiche les stats du jour
└─ "Membres: 156, Mood: Chill, Énergie: 60%"

23h59: 😴 PRÉPARATION SOMMEIL
├─ Elle se prépare pour demain
├─ Elle sauvegarde sa mémoire (MongoDB)
└─ "Demain peut-être je serai Introvert..."

3h du matin: 🌙 NIGHTWAKEUP (rare)
└─ Si c'est un jour où elle est insomniaque
```

---

## 📂 Les fichiers et leur rôle

### Structure du projet

```
brainexe-dashboard/
│
├── server.js ⭐ POINT D'ENTRÉE
│   └─ Lance le bot Discord + le dashboard web
│
├── src/
│   ├── config.js 🔑
│   │   └─ Lit les variables d'environnement (secrets)
│   │
│   ├── shared.js 📌
│   │   └─ État partagé entre bot et dashboard
│   │
│   ├── logger.js 📝
│   │   └─ Enregistre tous les logs (console + WebSocket)
│   │
│   ├── crons.js ⏰
│   │   └─ Planifie tous les jobs:
│   │       • Anecdotes (9h30)
│   │       • Actualités (1er & 15)
│   │       • Greetings (7h30, 12h, 19h, 3h)
│   │       • Drift check (toutes les heures)
│   │       • TikTok check (toutes les 2 min)
│   │       • Sidebar update (toutes les 10 min)
│   │
│   ├── botConfig.js ⚙️
│   │   └─ Charge/sauve la config du bot
│   │       (saved in brainexe-config.json)
│   │
│   ├── utils.js 🧰
│   │   └─ Fonctions utiles (formatage, etc)
│   │
│   ├── ai/ 🤖
│   │   ├── claude.js
│   │   │   └─ Client Anthropic API
│   │   │      • Génère les réponses
│   │   │      • Filtre les meilleures actualités
│   │   │      • Crée les anecdotes
│   │   │
│   │   └── youtube.js
│   │       └─ Recherche les vidéos YouTube
│   │
│   ├── api/ 🌐
│   │   └── routes.js
│   │       └─ Tous les endpoints HTTP du dashboard:
│   │           GET  /api/state        (état complet)
│   │           GET  /api/logs         (logs)
│   │           POST /api/channels     (créer salon)
│   │           POST /api/roles        (créer rôle)
│   │           POST /api/post         (envoyer message)
│   │           POST /api/backup       (créer backup)
│   │           ... 30+ endpoints
│   │
│   ├── bot/ 🎭
│   │   ├── persona.js
│   │   │   └─ System prompts (qui tu es vraiment)
│   │   │
│   │   ├── emotions.js
│   │   │   └─ Système émotionnel 4 couches
│   │   │      • tempérament
│   │   │      • états internes
│   │   │      • émotions vives
│   │   │      • bonds avec membres
│   │   │
│   │   ├── mood.js
│   │   │   └─ Humeur du jour (random + contextuelle)
│   │   │
│   │   ├── scheduling.js
│   │   │   └─ Slots journaliers fixes
│   │   │
│   │   ├── adaptiveSchedule.js
│   │   │   └─ Horaires flottants selon mood
│   │   │      (9h30 ± 25min par exemple)
│   │   │
│   │   ├── channelIntel.js
│   │   │   └─ Comprend chaque salon:
│   │   │      • topic (gaming/code/random/etc)
│   │   │      • vibe (chill/serious/fun)
│   │   │      • derniers participants
│   │   │      • historique messages
│   │   │
│   │   ├── messaging.js
│   │   │   └─ Envoie messages de façon "humaine":
│   │   │      • Typing animation
│   │   │      • Délai avant envoi
│   │   │      • Mention de noms
│   │   │
│   │   ├── reactions.js
│   │   │   └─ Choisit les bons emojis pour réagir
│   │   │
│   │   ├── humanize.js
│   │   │   └─ Rend le texte moins "bot-like":
│   │   │      • Ajoute du slang
│   │   │      • Enlève des accents
│   │   │      • Abrège parfois
│   │   │
│   │   └── keywords.js
│   │       └─ Détecte les mots-clés importants
│   │
│   ├── db/ 💾
│   │   ├── index.js
│   │   │   └─ Connexion MongoDB
│   │   │
│   │   ├── members.js
│   │   │   └─ Profils des membres
│   │   │
│   │   ├── memberBonds.js
│   │   │   └─ Liens affectifs (attach, trust, etc)
│   │   │
│   │   ├── channelMem.js
│   │   │   └─ Mémoire par salon (contexte)
│   │   │
│   │   ├── channelDir.js
│   │   │   └─ Directory des salons
│   │   │
│   │   ├── dmHistory.js
│   │   │   └─ Historique des DM
│   │   │
│   │   └── botState.js
│   │       └─ État persistant du bot
│   │
│   ├── discord/ 🎮
│   │   ├── events.js
│   │   │   └─ Gère tous les événements Discord:
│   │   │      • messageCreate → Brainee parle
│   │   │      • memberJoin → Accueil
│   │   │      • reactionAdd → Réaction role
│   │   │      • etc...
│   │   │
│   │   └── sync.js
│   │       └─ Synchronise Discord ↔ fichier
│   │
│   └── features/ 🎯
│       ├── anecdotes.js       → Histoire quotidienne
│       ├── actus.js           → Actualités gaming
│       ├── conversations.js   → Conversations ambiantes
│       ├── greetings.js       → Salutations (matin/soir)
│       ├── drift.js           → Relance les salons morts
│       ├── tiktok.js          → Live TikTok watcher
│       ├── welcome.js         → Message bienvenue
│       ├── sidebar.js         → Stats dans sidebar Discord
│       ├── context.js         → Contexte conversationnel
│       ├── convStats.js       → Stats des conversations
│       └── delayedReply.js    → Réponses différées
│
├── public/ 🖥️ DASHBOARD
│   ├── index.html
│   │   └─ Structure HTML (les éléments du dashboard)
│   │
│   ├── app.css
│   │   └─ Styles + 3 thèmes (light/dark/sombre)
│   │
│   └── app.js
│       └─ Logique frontend:
│           • Écoute les WebSocket du serveur
│           • Met à jour les stats en direct
│           • Gère les clics sur les boutons
│           • Communique avec les API endpoints
│
├── discord-template.json        ← Template structure serveur
├── brainexe-config.json         ← Config persistée du bot
└── package.json                 ← Dépendances
```

---

## 🚀 Lancer le projet

### Prérequis (avant de commencer)

Tu as besoin de:
1. **Node.js 18+** (télécharge de nodejs.org)
2. **Un serveur Discord** (crée-le si t'en as pas)
3. **Un token Discord** (dans Discord Developer Portal)
4. **Une clé API Claude** (dans Anthropic console)
5. **Une clé API YouTube** (dans Google Console)
6. **Une clé API GNews** (chez gnews.io)
7. **Une string MongoDB** (MongoDB Atlas cloud gratuit)

### Configuration pas à pas

#### 1. **Créer un fichier `.env` à la racine**

```bash
# Copie cette structure dans un fichier .env

DISCORD_TOKEN=votre_token_discord_ici
GUILD_ID=votre_id_serveur_discord_ici

ANTHROPIC_API_KEY=votre_clé_claude_ici

YOUTUBE_API_KEY=votre_clé_youtube_ici

GNEWS_API_KEY=votre_clé_gnews_ici

MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/brainexe?retryWrites=true

PORT=3000
```

#### 2. **Installer les dépendances**

```bash
npm install
```

#### 3. **Lancer le serveur**

```bash
npm start
```

Tu devrais voir:
```
[SYS] Bot logged in as Brainee#1234
[SYS] Dashboard listening on port 3000
```

#### 4. **Ouvrir le dashboard**

Va sur `http://localhost:3000` dans ton navigateur.

---

## ⚠️ Erreurs fréquentes & solutions

### ❌ "Bot logged in but isn't responding"

**Cause:** Le token Discord est mauvais ou expiré.

**Solution:**
1. Va dans Discord Developer Portal
2. Copie un nouveau token
3. Remplace dans `.env`
4. Redémarre: `npm start`

---

### ❌ "Cannot find module 'discord.js'"

**Cause:** Les dépendances ne sont pas installées.

**Solution:**
```bash
npm install
npm start
```

---

### ❌ "MONGODB_URI not found"

**Cause:** Le `.env` n'existe pas ou est mal placé.

**Solution:**
1. Crée un fichier `.env` à la racine (pas dans src/)
2. Ajoute `MONGODB_URI=...`
3. Redémarre: `npm start`

---

### ❌ "Dashboard shows 'Connecting...'" (ne se connecte jamais)

**Cause:** WebSocket n'est pas connecté (port incorrect ou serveur pas lancé).

**Solution:**
```bash
# Vérifie que le serveur écoute:
npm start

# Ouvre http://localhost:3000
# Ouvre la console (F12)
# Tu devrais voir: "WebSocket connected!"
```

---

### ❌ "Claude API error: 401 Unauthorized"

**Cause:** La clé API Claude est mauvaise.

**Solution:**
1. Va dans Anthropic Console
2. Crée une nouvelle clé API
3. Remplace dans `.env`
4. Redémarre

---

### ❌ "MongoDB connection timeout"

**Cause:** La string MongoDB est mauvaise ou la BD est offline.

**Solution:**
```bash
# Vérifie la string dans .env
# Elle doit ressembler à:
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/brainexe?retryWrites=true

# Vérifie sur https://cloud.mongodb.com
# Que le cluster est "Running"
```

---

## 🎓 Résumé (pour te rappeler)

| Concept | Explication rapide |
|---------|-------------------|
| **Bot** | C'est Brainee sur Discord, une IA conversationnelle |
| **Dashboard** | Page web pour contrôler le bot (localhost:3000) |
| **MongoDB** | Mémoire du bot (stocke les profils, messages, liens) |
| **Claude** | L'IA puissante qui génère les réponses intelligentes |
| **Discord.js** | Bibliothèque pour commander Discord |
| **Crons** | Timers qui lancent des jobs (anecdotes, actualités) |
| **Émotions** | Le bot a des sentiments et adapte son comportement |
| **Humanize** | Filtre pour que Brainee parle comme une vraie personne |
| **Bonds** | Brainee se souvient de toi et te traite différemment |
| **Features** | Les 10 fonctionnalités (conversations, news, TikTok, etc) |

---

## 🔗 Ressources utiles

- **Discord Developer Portal**: https://discord.com/developers/applications
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Anthropic API**: https://console.anthropic.com
- **GNews API**: https://gnews.io
- **YouTube Data API**: https://console.cloud.google.com

---

## 📞 Questions courantes

**Q: Comment je peux ajouter une nouvelle fonctionnalité?**  
A: Crée un nouveau fichier dans `src/features/`, ajoute la logique, lance un cron dans `src/crons.js`, et ajoute un endpoint dans `src/api/routes.js` si nécessaire.

**Q: Comment je teste mes modifications?**  
A: Redémarre le serveur (`npm start`), va sur `http://localhost:3000`, et teste en utilisant le dashboard ou en écrivant sur Discord.

**Q: Les émotions du bot c'est du vrai machine learning?**  
A: Non! C'est du code algorithmique (des formules et des règles). Mais ça fait croire au bot d'avoir des sentiments ce qui rend les interactions plus naturelles.

**Q: Peut-on avoir plusieurs bots sur le même serveur?**  
A: Oui! Chaque bot a son propre token. Mais la config et MongoDB seraient partagées, donc il faudrait les adapter.

**Q: Quoi, Brainee peut vraiment "comprendre" les sentiments?**  
A: Elle lit le message, le contexte, et elle utilise des heuristiques (des règles) pour deviner l'émotion. C'est pas de la vraie compréhension émotionnelle, mais ça marche bien!

---

## ✨ Fin!

Tu as maintenant la **BIBLE COMPLÈTE** du projet!  
Tu sais:
- Quoi fait quoi
- Comment ça marche
- Où trouver le code
- Comment lancer le truc
- Comment fixer les bugs

**Bienvenue dans BrainEXE** 🧠✨
