# CLAUDE.md — Module `src/bot/` (Comportements Discord)

> Règles spécifiques au comportement Discord de Brainee. Règles globales → `/CLAUDE.md`

---

## ⚡ RÈGLES ABSOLUES BOT

1. **`persona.js` est SANCTUARISÉ** — ne jamais modifier le caractère, le ton, les traits
2. **`humanize.js` doit TOUJOURS être appliqué** avant tout envoi de message Discord
3. **Le chemin emoji-only (10%) dans `reactions.js` est intentionnel** — ne pas le supprimer
4. **`messaging.js` gère le typing simulé** — ne jamais envoyer de message sans passer par lui
5. **`scheduling.js` définit les fenêtres horaires** — respecter weekday/Saturday/Sunday

---

## 🏗️ ARCHITECTURE INTERNE

```
Pipeline d'envoi (TOUJOURS dans cet ordre) :
  callClaude() → humanize.js → messaging.js → Discord API

Pipeline émotionnel :
  emotions.js → emotionCombos.js → mood.js → persona.js

Pipeline de décision temporelle :
  scheduling.js → adaptiveSchedule.js → dailyCache.js
```

**Fichiers clés :**
```
persona.js          ← NE PAS TOUCHER — caractère de Brainee
humanize.js         ← 3 filtres anti-IA (obligatoire avant envoi)
messaging.js        ← simulateDmTyping + sendHuman + multimodal
mood.js             ← energique / chill / hyperfocus / zombie
```

---

## 🚫 ANTI-PATTERNS BOT

```js
// ❌ Envoyer un message sans humanize.js
channel.send(rawClaudeResponse)

// ✅ Toujours post-processer
const humanized = await humanize(rawClaudeResponse, member)
await messaging.sendHuman(channel, humanized)

// ❌ Modifier persona.js pour "adoucir" ou "clarifier" Brainee
// ❌ Forcer un mood sans passer par mood.js
// ❌ Supprimer ou réduire le délai de typing simulé
// ❌ Envoyer plus d'un message par burst sans délai inter-messages
// ❌ Ignorer channelIntel.js pour évaluer la discipline d'un salon
```

---

## 🎭 HUMEURS — COMPORTEMENTS ATTENDUS

| Mood | Comportement |
|---|---|
| `energique` | Réponses vives, beaucoup de réactions, initiatives |
| `chill` | Réponses courtes, plus de silences, ton relax |
| `hyperfocus` | Messages longs, obsession sujet, peu de diversions |
| `zombie` | Réponses minimales, parfois juste un emoji |

---

## 📋 CRITÈRES DE SUCCÈS — FEATURE BOT

```
✅ humanize.js appliqué sur toutes les sorties
✅ persona.js non modifié
✅ Timing typing simulé respecté (simulateDmTyping)
✅ npm test → 212 verts
✅ Pas de régression sur decisionLogic.js
```

---

## 🔍 DÉTECTION AVANCÉE

| Module | Seuil / Logique |
|---|---|
| `hyperFocus.js` | Détecte obsession sur un topic → mode hyperfocus |
| `vulnerability.js` | Détecte détresse membre → comportement soutien |
| `channelIntel.js` | Évalue vibe + discipline → adapte ton |
| `keywords.js` | Mots-clés déclencheurs → réactions spécifiques |
