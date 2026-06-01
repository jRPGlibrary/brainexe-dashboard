# Workflow : Nouvelle Feature

## Contexte
Lire UNIQUEMENT les fichiers concernés par la feature (voir CLAUDE.md carte projet).
Ne pas scanner tout le repo.

## Étapes

1. **Identifier** le(s) fichier(s) impacté(s) via la carte CLAUDE.md
2. **Lire** uniquement ces fichiers
3. **Proposer** le plan en 3 bullet points max → attendre validation
4. **Implémenter** en patch incrémental (Edit, jamais réécriture complète)
5. **Vérifier** : `npx jest --silent` → 212 tests verts
6. **Commit** sur `claude/stoic-albattani-lJVQT` avec message `feat: ...`
7. **Push** : `git push -u origin claude/stoic-albattani-lJVQT`

## Règles
- Ne jamais modifier `server.js` sauf si explicitement demandé
- Ne jamais modifier `src/bot/persona.js` (personnalité Brainee intouchable)
- Ne jamais utiliser `discord.once('clientReady')` → utiliser `'ready'`
- Toute opération async au boot = non-bloquante
