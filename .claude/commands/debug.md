# Workflow : Debug

## Contexte
Diagnostiquer sans modifier le code stable.

## Étapes

1. **Reproduire** : identifier le symptôme exact (log Railway, message Discord, erreur)
2. **Localiser** via la carte CLAUDE.md → lire le(s) fichier(s) concerné(s) UNIQUEMENT
3. **Hypothèse** : cause probable en 1 phrase → valider avant de toucher au code
4. **Patch minimal** : corriger uniquement la ligne/bloc fautif (Edit, jamais réécriture)
5. **Tests** : `npx jest --silent` → 212 verts
6. **Commit** : `fix: ...`

## Points chauds fréquents
- `discord.once('clientReady')` → doit être `'ready'` (bug historique)
- Opération async bloquante au boot → Railway SIGTERM
- `brainexe-config.json` manquant → ne pas en dépendre pour persistance critique
- Token Anthropic épuisé → vérifier `src/ai/budget.js`
- MongoDB déconnecté → guard `if (!shared.mongoDb)` présent dans chaque module DB
