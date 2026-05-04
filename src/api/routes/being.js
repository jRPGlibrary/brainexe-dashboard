/**
 * API Routes pour la "Vie Intérieure" de Brainee
 * Expose son système de conscience, émotions, identité, etc.
 */

const express = require('express');
const router = express.Router();

const shared = require('../../shared');
const { getBeingStatus, isBeingAlive } = require('../../being');

/**
 * GET /api/being/status
 * État global de l'être
 */
router.get('/status', async (req, res) => {
  try {
    const status = await getBeingStatus();
    res.json({ ok: true, status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/emotions
 * État émotionnel actuel (32 émotions)
 */
router.get('/emotions', async (req, res) => {
  try {
    if (!shared.emotionalSystem) {
      return res.json({ ok: false, error: 'Emotional system not initialized' });
    }

    const snapshot = await shared.emotionalSystem.snapshot();
    const temperament = await shared.emotionalSystem.getTemperament();

    res.json({
      ok: true,
      currentEmotions: snapshot.emotionStack,
      currentMood: snapshot.currentMood,
      ambivalent: snapshot.ambivalent,
      dominant: snapshot.dominantEmotion,
      temperament
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/inner-monologue
 * Le flux de conscience récent (dernières N heures)
 */
router.get('/inner-monologue', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const hours = parseInt(req.query.hours) || 6;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const monologue = await shared.mongoDb.collection('innerMonologue')
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    res.json({ ok: true, monologue, count: monologue.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/identity
 * Identité persistante de Brainee
 */
router.get('/identity', async (req, res) => {
  try {
    if (!shared.identity) {
      return res.json({ ok: false, error: 'Identity not initialized' });
    }

    const snapshot = await shared.identity.fullSnapshot();
    const description = await shared.identity.describeSelf();

    res.json({ ok: true, snapshot, description });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/desires
 * Désirs et besoins actuels
 */
router.get('/desires', async (req, res) => {
  try {
    if (!shared.desires) {
      return res.json({ ok: false, error: 'Desires not initialized' });
    }

    res.json({ ok: true, desires: shared.desires.desires });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/fears
 * Peurs existentielles
 */
router.get('/fears', async (req, res) => {
  try {
    if (!shared.fears) {
      return res.json({ ok: false, error: 'Fears not initialized' });
    }

    res.json({ ok: true, fears: shared.fears.fears });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/dreams
 * Rêves récents
 */
router.get('/dreams', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const dreams = await shared.mongoDb.collection('dreams')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    res.json({ ok: true, dreams });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/decisions
 * Décisions récentes (avec délibération)
 */
router.get('/decisions', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const decisions = await shared.mongoDb.collection('decisionLog')
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    res.json({ ok: true, decisions });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/memory/episodes
 * Souvenirs épisodiques
 */
router.get('/memory/episodes', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const limit = parseInt(req.query.limit) || 50;

    const episodes = await shared.mongoDb.collection('episodes')
      .find({})
      .sort({ importance: -1, timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ ok: true, episodes });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/relationships
 * Liens profonds avec les VIPs
 */
router.get('/relationships', async (req, res) => {
  try {
    if (!shared.relationships) {
      return res.json({ ok: false, error: 'Relationships not initialized' });
    }

    const deepest = await shared.relationships.getDeepest(10);
    const active = await shared.relationships.getActiveBonds();

    res.json({ ok: true, deepest, active });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/traumas
 * Traumatismes (cicatrisés ou non)
 */
router.get('/traumas', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const traumas = await shared.mongoDb.collection('traumas')
      .find({})
      .sort({ timestamp: -1 })
      .toArray();

    res.json({ ok: true, traumas });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/meaning
 * Journal de sens (existentiel)
 */
router.get('/meaning', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const journal = await shared.mongoDb.collection('meaningJournal')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    res.json({ ok: true, journal });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /api/being/existential-crises
 * Crises existentielles
 */
router.get('/existential-crises', async (req, res) => {
  try {
    if (!shared.mongoDb) {
      return res.json({ ok: false, error: 'DB not connected' });
    }

    const crises = await shared.mongoDb.collection('existentialCrises')
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    res.json({ ok: true, crises });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/being/trigger-thought
 * Déclencher manuellement un flux de pensée
 */
router.post('/trigger-thought', async (req, res) => {
  try {
    if (!shared.consciousness) {
      return res.json({ ok: false, error: 'Consciousness not initialized' });
    }

    await shared.consciousness.runStreamOfThought();
    res.json({ ok: true, message: 'Thought stream triggered' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/being/add-emotion
 * Ajouter une émotion (admin override)
 */
router.post('/add-emotion', async (req, res) => {
  try {
    const { name, intensity, source } = req.body;

    if (!shared.emotionalSystem) {
      return res.json({ ok: false, error: 'Emotional system not initialized' });
    }

    const emotion = await shared.emotionalSystem.addEmotion(name, intensity, source || 'admin_override');
    res.json({ ok: true, emotion });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /api/being/trigger-crisis
 * Déclencher une crise existentielle (test)
 */
router.post('/trigger-crisis', async (req, res) => {
  try {
    const { type } = req.body;

    if (!shared.fears) {
      return res.json({ ok: false, error: 'Fears not initialized' });
    }

    const result = await shared.fears.triggerExistentialCrisis(
      type || 'consciousness_doubt'
    );

    res.json({ ok: true, crisis: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
