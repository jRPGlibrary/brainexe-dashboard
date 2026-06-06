# CLAUDE.md — BrainEXE / Brainee Bot

> Lis ce fichier EN ENTIER avant toute action. Pour la carte complète du projet → `ARCHITECTURE.md`

---

## ⚡ RÈGLES ABSOLUES — LIRE EN PREMIER

1. **NE JAMAIS modifier du code existant qui fonctionne** pour ajouter une feature
2. **NE JAMAIS utiliser `discord.once('clientReady')`** → l'event correct est `'ready'`
3. **`brainexe-config.json` est éphémère sur Railway** → ne jamais en dépendre pour la persistance critique
4. **Ne pas bloquer le boot** → toute opération async au démarrage doit être non-bloquante
5. **Livrer toujours le fichier complet** — jamais de patch partiel
6. **`npm test` après chaque changement** → 225 tests Jest doivent rester verts
7. **`server.js` est sanctuarisé** — NE PAS TOUCHER sauf modification de boot explicite
8. **Ne jamais altérer la personnalité Brainee** → voir section BRAINEE ci-dessous
9. **Après chaque correction de bug → mettre à jour ce CLAUDE.md** avec la règle apprise

---

## 🏗️ STACK

| Couche | Techno |
|---|---|
| Runtime | Node.js 18+ |
| Bot | discord.js **v14** |
| IA | Anthropic Claude (`claude-sonnet-4-6`) |
| DB | MongoDB Atlas |
| Hosting | Railway (auto-deploy GitHub) |
| Dashboard | Express 4 + WebSocket + vanilla JS (38 modules, no bundler) |
| Tests | Jest 30 — 11 suites, 225 tests |

---

## 🤖 BRAINEE — PERSONNALITÉ (immuable)

- **Qui** : IA féminine 24 ans, version féminine de Matthieu (fondateur BrainEXE)
- **Traits** : internet-native, passionnée gaming, énergie hyperfocus/chaotique, loyalty forte, honnête, présente quand ça compte, ghosts ses propres débats
- **INTERDIT** : adoucir le caractère, ajouter des questions forcées, changer le ton
- **Humeurs** : `energique` / `chill` / `hyperfocus` / `zombie`

---

## 🚫 ANTI-PATTERNS — NE JAMAIS FAIRE

```js
client.once('clientReady', ...)  // ❌ n'existe pas en discord.js v14
client.once('ready', ...)        // ✅ correct

// ❌ Dépendance persistance critique sur fichier JSON éphémère
const config = require('./brainexe-config.json')

// ❌ Bloquer le boot avec await au top-level sans try/catch non-bloquant
await heavyOperation() // sans fallback → Railway SIGTERM

// ❌ Patch partiel — toujours livrer le fichier complet
// ❌ console.log laissé en production
// ❌ any en TypeScript
// ❌ Requêtes MongoDB sans index sur les champs filtrés fréquemment
```

---

## 📋 WORKFLOW OBLIGATOIRE

### Avant de coder
1. `/compact` si session longue
2. Lire UNIQUEMENT le(s) fichier(s) concerné(s) — utiliser `ARCHITECTURE.md` pour localiser
3. Définir les critères de succès avant d'implémenter

### Critères de succès à définir pour chaque feature
```
✅ Comportement attendu : [description]
✅ Tests passants : npm test → 225 verts
✅ Aucune régression sur les modules existants
✅ Pas de nouveau console.log en prod
```

### Après avoir codé
- `npm test` → vérifier 212 tests verts
- Si bug corrigé → **ajouter la règle dans ce CLAUDE.md**

---

## 🚢 DÉPLOIEMENT

```bash
npm test                          # Vérifier avant tout
git add <fichiers spécifiques>
git commit -m "feat|fix|chore: description"
git push -u origin <branch>
# → Railway auto-deploy depuis GitHub main
```

**`git push` automatique après chaque changement validé — aucune confirmation requise.**

---

## 🔑 ENV REQUISES

```
DISCORD_TOKEN · GUILD_ID=1481022956816830669 · ANTHROPIC_API_KEY
YOUTUBE_API_KEY · GNEWS_API_KEY · MONGODB_URI · PORT (défaut 3000)
```

---

## 📐 STYLE DE RÉPONSE

- Max 25 mots entre deux appels d'outils
- Max 100 mots pour les réponses finales
- Code only quand c'est du code

---

## 🚢 POST-TÂCHE OBLIGATOIRE (automatique — sans confirmation)

Après chaque tâche terminée, **exécuter immédiatement dans cet ordre** :

### Étape 1 — Tests + commit + push
```bash
npm test                              # 225 tests verts obligatoires
npm version patch|minor --no-git-tag-version  # bump selon tableau
git add <fichiers modifiés>
git commit -m "feat|fix|chore: ..."
git push -u origin <branch>
```

### Étape 2 — Créer la PR (via mcp__github__create_pull_request)
- `owner`: `jRPGlibrary` · `repo`: `brainexe-dashboard`
- `head`: branch courante · `base`: `main`
- Titre court + body avec résumé du fix
- **Demander la permission de merger avant de continuer**

### Étape 3 — Merger (via mcp__github__merge_pull_request) après confirmation
- `merge_method`: `squash`
- Confirmer le merge à l'utilisateur une fois fait

---

Puis informer l'utilisateur :

```
📦 Déployé :
• Changement : [description]
• Type : feature / fix / refacto
• Version : vX.Y.Z → vA.B.C
• Fichiers : [liste]
• PR mergée → main → Railway auto-deploy en cours
```

| Type | Bump |
|---|---|
| Nouvelle feature / nouveau module | MINOR `0.X.0` |
| Fix bug / amélioration | PATCH `0.0.X` |
| Refacto / config / docs | AUCUN |

**Seule exception : si `npm test` échoue → stopper et signaler avant tout push.**
