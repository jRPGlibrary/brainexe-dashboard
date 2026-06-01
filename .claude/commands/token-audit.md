# Workflow : Audit Token / Coût API

## Fichiers à surveiller (par ordre d'impact)

| Fichier | Risque | Action |
|---|---|---|
| `src/features/conversations.js` | Prompt dynamique ~600-900 tokens/appel | `joinBlocks()` appliqué ✅ |
| `src/db/channelMem.js` | Enrichissement Haiku toutes 2h | Cooldown intégré ✅ |
| `src/db/crossChannelMem.js` | 4 entrées × 100 chars | Limite intégrée ✅ |
| `src/being/` lifecycle | Appels toutes les minutes/30min | Vérifier fréquence dans `lifecycle.js` |
| `src/features/greetings.js` | 4× par jour (matin/midi/soir/nuit) | Normal |
| `src/features/anecdotes.js` | Planifié via crons | Vérifier `src/crons.js` |

## Optimisations déjà en place
- `BOT_PERSONA` / `BOT_PERSONA_CONVERSATION` → cache Anthropic 1h (`cache_control: ephemeral`)
- `joinBlocks()` dans `conversations.js` → élimine whitespace inutile
- Contexte conv : 8 messages max (réduit depuis 15)
- Contexte reply : 5 messages max
- Budget mode : `src/ai/budget.js` → skip conv si budget `reduced`/`minimal`

## Commandes utiles
```bash
# Vérifier usage tokens MongoDB
# collection tokenUsage → sum par jour

# Estimer taille prompt dynamique (à la main)
node -e "const c = require('./src/features/conversations.js')" 
# → utiliser pushLog pour logguer la taille du prompt dans un env dev
```
