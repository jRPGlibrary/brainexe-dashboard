# Home Assistant API Service

Service backend indépendant pour intégrer Home Assistant avec le brainexe-dashboard.

## 🚀 Démarrage rapide

### Installation
```bash
cd home-assistant
npm install
```

### Configuration
1. Copier `.env.example` en `.env`
2. Configurer les variables d'environnement :
   - `HOME_ASSISTANT_URL` : URL de votre Home Assistant (ex: `http://192.168.1.100:8123`)
   - `HOME_ASSISTANT_TOKEN` : Token d'authentification Home Assistant

**Où obtenir le token ?**
- Aller dans Home Assistant → Profil → Créer un token long terme

### Démarrage
```bash
npm start          # Production
npm run dev        # Développement (avec nodemon)
```

Le service démarre sur le port 3001 par défaut.

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Récupérer tous les appareils
```
GET /api/devices
Response: [{ entityId, friendlyName, state, domain, attributes }]
```

### Récupérer l'état d'un appareil
```
GET /api/devices/:entityId
Response: { entityId, state, attributes }
```

### Basculer un appareil (ON/OFF)
```
POST /api/devices/:entityId/toggle
Response: { success, message }
```

### Régler la luminosité
```
POST /api/devices/:entityId/brightness
Body: { brightness: 0-255 }
Response: { success, message }
```

### Régler la couleur
```
POST /api/devices/:entityId/color
Body: { rgb: [R, G, B] }
Response: { success, message }
```

## 🔧 Appareils Supportés

- `light` - Lumières intelligentes
- `switch` - Prises intelligentes
- `climate` - Thermostats
- `cover` - Volets/Stores
- `lock` - Serrures intelligentes
- `fan` - Ventilateurs

## 📁 Structure

```
home-assistant/
├── src/
│   ├── app.js              # Serveur Express et routes
│   └── homeAssistant.js    # Logique métier Home Assistant
├── config/
│   └── .env.example        # Variables d'environnement
├── automations/            # Automatisations futures
├── package.json
├── .gitignore
└── README.md
```

## 🔮 Roadmap v0.2+

- [ ] Automatisations simples
- [ ] Scénarios prédéfinis
- [ ] Historique et statistiques
- [ ] Webhooks pour notifications
- [ ] Support des entités personnalisées
