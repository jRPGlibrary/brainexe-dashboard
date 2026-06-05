# CLAUDE.md — Module `public/js/` (Dashboard Frontend)

> Règles spécifiques au frontend dashboard. Règles globales → `/CLAUDE.md`

---

## ⚡ RÈGLES ABSOLUES FRONTEND

1. **Pas de bundler, pas de framework** — vanilla JS, scope global, ES modules natifs interdits
2. **Chaque module est indépendant** — pas d'import/export, communication via `window.*`
3. **`boot.js` charge les modules dans l'ordre** — ne jamais modifier l'ordre de chargement
4. **`websocket.js` est la source de vérité temps réel** — ne pas créer de connexion WS parallèle
5. **`core.js` contient les utilitaires partagés** — ne pas dupliquer dans les sections
6. **`theme-customizer.js` gère les 3 thèmes** — ne pas hardcoder de couleurs dans les sections

---

## 🏗️ ARCHITECTURE FRONTEND

```
Ordre de chargement (boot.js) :
  core.js → auth.js → websocket.js → charts.js → navigation.js
  → modal.js → notifications.js → [section-*.js] → hotkeys.js

Communication inter-modules :
  window.dispatch(event, data)   ← émettre
  window.on(event, handler)      ← écouter (défini dans core.js)

API calls :
  window.api.get('/api/...')     ← GET avec auth auto
  window.api.post('/api/...')    ← POST avec auth auto
```

**38 modules au total :**
```
Utilitaires : core, boot, auth, websocket, charts, navigation, modal
              notifications, push-notifications, hotkeys, search
              export, favorites, readonly, customizable, log-filters
              logs-pagination, backup-restore, analytics-dashboard
              theme-customizer, actions

Sections (17) : section-overview, section-discord, section-logs
                section-members, section-moderation, section-admin
                section-settings, section-health, section-schedule
                section-emotions, section-bonds, section-beings
                section-tokens, section-audit, section-audit-v2
                section-backups, section-automations, section-posts
                section-funding
```

---

## 🚫 ANTI-PATTERNS FRONTEND

```js
// ❌ Import ES module
import { foo } from './core.js'

// ✅ Accès global
const result = window.core.foo()

// ❌ Créer une nouvelle connexion WebSocket
const ws = new WebSocket(...)

// ✅ Utiliser l'instance partagée
window.wsInstance.send(...)

// ❌ Hardcoder une couleur CSS
element.style.color = '#7c3aed'

// ✅ Utiliser une variable CSS
element.style.color = 'var(--accent)'

// ❌ Fetch direct sans window.api
fetch('/api/members')

// ✅ Utiliser le wrapper (gère auth + erreurs)
window.api.get('/api/members')

// ❌ Modifier boot.js pour ajouter un module sans respecter l'ordre
// ❌ Utiliser localStorage pour des données sensibles (token, config)
```

---

## 🎨 THÈMES DISPONIBLES

| Thème | Classe CSS | Description |
|---|---|---|
| Dark | `theme-dark` | Défaut — fond sombre violet |
| Light | `theme-light` | Fond clair |
| Neon | `theme-neon` | Accents néon cyan/violet |

Variables CSS à utiliser : `--bg`, `--bg-secondary`, `--accent`, `--text`, `--text-muted`, `--border`

---

## 📋 CRITÈRES DE SUCCÈS — FEATURE FRONTEND

```
✅ Aucun import/export ES module
✅ Communication via window.dispatch/window.on uniquement
✅ Variable CSS pour toutes les couleurs
✅ Testé sur les 3 thèmes
✅ Testé sur mobile (responsive via mobile.css)
✅ npm test → 212 verts (tests backend non cassés)
✅ Pas de console.error dans la console navigateur
```

---

## 🔌 WEBSOCKET — ÉVÉNEMENTS

| Événement WS | Handler |
|---|---|
| `log` | section-logs.js |
| `emotion` | section-emotions.js |
| `stats` | section-overview.js |
| `being` | section-beings.js |
| `alert` | notifications.js |
