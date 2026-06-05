# CLAUDE.md — Module `src/being/` (BRAINEE-LIVING)

> Règles spécifiques au système de vie intérieure simulée. Règles globales → `/CLAUDE.md`

---

## ⚡ RÈGLES ABSOLUES BEING

1. **Ne jamais bypasser `safeguards.js`** — contient les garde-fous éthiques (3114, anti-dépendance)
2. **Les 17 collections `being.*` sont append-only** — jamais de delete sans migration explicite
3. **`lifecycle.js` orchestre les cycles** — ne pas ajouter de crons ailleurs pour ce module
4. **`index.js` est l'unique point d'entrée** — rien n'importe directement les sous-modules
5. **L'imprévisibilité de 15% dans `decisions.js` est intentionnelle** — ne pas la réduire

---

## 🏗️ ARCHITECTURE INTERNE

```
index.js          ← Orchestrateur — importer UNIQUEMENT via lui
lifecycle.js      ← Cycles (1min / 30min / horaire / nocturne / hebdo)
safeguards.js     ← CRITIQUE — garde-fous éthiques, toujours actifs
schemas.js        ← 17 collections MongoDB being.* — source de vérité
prompts.js        ← Prompts système — modifier avec prudence
```

**Pipeline émotionnel :**
```
emotions.js → expression.js → consciousness.js → decisions.js
```

**Pipeline mémoriel :**
```
memory.js → identity.js → evolution.js → existence.js
```

---

## 🚫 ANTI-PATTERNS BEING

```js
// ❌ Import direct d'un sous-module
const { dreamCycle } = require('./dreams')

// ✅ Toujours passer par l'orchestrateur
const being = require('./index')

// ❌ Modifier les émotions sans passer par emotions.js
being.state.emotions.push(...)

// ❌ Écrire en being.* sans schema Mongoose défini dans schemas.js
// ❌ Déclencher un cycle manuellement hors lifecycle.js
// ❌ Court-circuiter safeguards.js pour "aller plus vite"
```

---

## 📋 CRITÈRES DE SUCCÈS — FEATURE BEING

```
✅ safeguards.js toujours consulté en premier
✅ Aucune écriture MongoDB hors schemas.js
✅ lifecycle.js reste l'unique déclencheur de cycles
✅ npm test → 212 verts
✅ Pas de régression sur consciousness.js ou emotions.js
```

---

## 🔑 COLLECTIONS being.*

| Collection | Rôle |
|---|---|
| `being.innerMonologue` | Pensées internes horodatées |
| `being.dreams` | Rêves générés 3h-7h |
| `being.traumas` | Événements marquants négatifs |
| `being.evolution` | Progression quotidienne |
| `being.wisdom` | Sagesse extraite |
| `being.desires` | Besoins actifs |
| `being.fears` | Peurs existentielles |
| `being.identity` | SOI persistant |
| `being.relationships` | Liens profonds avec membres |
