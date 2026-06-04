/**
 * ================================================
 * 🔴 PRESENCE MANAGER v2.0.0
 * ================================================
 * Gère le statut Discord de Brainee en temps réel.
 * - Busy excuse → override DND/Idle avec activité générée par Haiku
 * - Slot horaire → Online/Idle/DND/Invisible + activité générée par Haiku
 * - Cache par slot : Haiku appelé uniquement au changement de slot
 * ================================================
 */

const discord_js = require('discord.js');
const ActivityType = discord_js.ActivityType;
const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { getCurrentActivity, getEveningActivity } = require('../bot/currentActivity');
const { GUILD_ID } = require('../config');

// Statut Discord (dnd/idle/online/invisible) — ne change pas
const REASON_STATUS = {
  eating:   'dnd',
  resting:  'idle',
  gaming:   'dnd',
  browsing: 'idle',
  outside:  'idle',
};

const SLOT_STATUS = {
  sleep:      'invisible',
  wakeup:     'idle',
  active:     'online',
  lunch:      'dnd',
  productive: 'online',
  transition: 'idle',
  gaming:     'dnd',
  latenight:  'idle',
};

// Emojis par contexte
const REASON_EMOJI = { eating: '🍕', resting: '😴', gaming: '🎮', browsing: '🌐', outside: '🚶' };
const SLOT_EMOJI   = { wakeup: '☕', lunch: '🍕', transition: '🚶', gaming: '🎮', latenight: '🌙' };

// Contexte Haiku — ce que Brainee fait réellement
const REASON_CONTEXT = {
  eating:   'tu es en train de manger',
  resting:  'tu te reposes un moment',
  gaming:   'tu es en pleine session de jeu et tu peux pas lâcher',
  browsing: 'tu es tombée dans un rabbit hole sur le web',
  outside:  'tu sors rapidement faire un truc',
};

const SLOT_CONTEXT = {
  wakeup:     'tu viens de te réveiller et tu es encore zombie',
  lunch:      'tu fais une pause déjeuner',
  transition: 'tu sors rapidement',
  gaming:     'tu es en pleine session de jeu',
  latenight:  'il est tard, tu traînes ou tu es en hyperfocus',
};

// Patterns dans les réponses de Brainee indiquant qu'elle part / change de statut
const REPLY_ABSENCE_PATTERNS = [
  { re: /\bstatut (absent|absente|afk|idle)\b/i,                         reason: 'browsing', durationMin: 45 },
  { re: /\b(me mets?|mettre en?|passe en?) (absent|absente|afk|idle)\b/i, reason: 'browsing', durationMin: 45 },
  { re: /\bjuste exister\b/i,                                             reason: 'browsing', durationMin: 60 },
  { re: /\bvais (manger|bouffer|grignoter|dîner|luncher|prendre l.apéro)\b/i, reason: 'eating', durationMin: 50 },
  { re: /\bsuis (à table|en train de manger|au repas)\b/i,               reason: 'eating',   durationMin: 40 },
  { re: /\bvais (dormir|me coucher|au lit|m.endormir)\b/i,               reason: 'resting',  durationMin: 480 },
  { re: /\b(bonne nuit|good night)\b/i,                                  reason: 'resting',  durationMin: 480 },
  { re: /\bvais (sortir|dehors|faire un tour)\b/i,                       reason: 'outside',  durationMin: 30 },
];

let _busyActive = false;
let _lastSlotKey = '';
let _cachedSlotActivity = '';

async function _generateActivity(emoji, context) {
  try {
    const { text } = await callClaude(
      '',
      `Génère une activité Discord ultra courte (max 28 caractères, sans guillemets, en minuscules, style naturel Brainee) pour dire que ${context}. Format : phrase nominale courte comme "s'acharne sur un boss", "kebab du mercredi", "dans youtube depuis 2h", "essaie de dormir". Texte brut uniquement, pas de ponctuation finale.`,
      18,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const clean = text.trim().replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]$/, '').slice(0, 35);
    return emoji ? `${emoji} ${clean}` : clean;
  } catch (_) {
    return null;
  }
}

async function setOccupied(reason) {
  const status = REASON_STATUS[reason] || 'idle';
  const emoji  = REASON_EMOJI[reason] || '🌐';
  let ctx      = REASON_CONTEXT[reason] || 'tu es occupée';
  if (reason === 'gaming') ctx = `tu es ${getCurrentActivity('gaming').label} et tu peux pas lâcher`;
  _busyActive  = true;
  const name   = await _generateActivity(emoji, ctx);
  try {
    shared.discord.user.setPresence({
      status,
      activities: name ? [{ name, type: ActivityType.Playing }] : [],
    });
    pushLog('SYS', `🔴 Présence → ${status} · ${name || '(occupation)'}`);
  } catch (_) {}
}

function setAvailable() {
  _busyActive = false;
  try {
    shared.discord.user.setPresence({ status: 'online', activities: [] });
    pushLog('SYS', '🟢 Présence → online');
  } catch (_) {}
}

async function setOccupiedFor(reason, durationMin) {
  await setOccupied(reason);
  const ms = Math.max(5, durationMin) * 60 * 1000;
  setTimeout(() => {
    setAvailable();
    pushLog('SYS', `🔄 Fin absence auto [${reason}] → retour online`);
  }, ms);
}

async function detectAndSetPresenceFromReply(text) {
  if (!text || !shared.discord?.user) return false;
  const lower = text.toLowerCase();
  for (const { re, reason, durationMin } of REPLY_ABSENCE_PATTERNS) {
    if (re.test(lower)) {
      await setOccupiedFor(reason, durationMin);
      pushLog('SYS', `🟡 Absence détectée dans réponse → [${reason}] ${durationMin}min`);
      return true;
    }
  }
  return false;
}

async function setSlotPresence(slotStatus) {
  if (_busyActive) return;
  const status = SLOT_STATUS[slotStatus] || 'online';
  const emoji  = SLOT_EMOJI[slotStatus];
  let ctx      = SLOT_CONTEXT[slotStatus];
  let actType  = ActivityType.Playing;
  if (slotStatus === 'gaming' || slotStatus === 'latenight') {
    const act = getCurrentActivity(slotStatus);
    ctx = `${SLOT_CONTEXT[slotStatus]} — concrètement tu es ${act.label}, ne mentionne aucune autre activité`;
    if (act.kind === 'series') actType = ActivityType.Watching;
    else if (act.kind === 'chill') actType = ActivityType.Listening;
  }

  // Slots sans activité affichée (active, productive, sleep)
  if (!ctx) {
    if (_lastSlotKey !== slotStatus) {
      _lastSlotKey = slotStatus;
      _cachedSlotActivity = '';
    }
    try { shared.discord.user.setPresence({ status, activities: [] }); } catch (_) {}
    return;
  }

  // Régénère uniquement au changement de slot
  if (_lastSlotKey !== slotStatus) {
    _lastSlotKey = slotStatus;
    const generated = await _generateActivity(emoji, ctx);
    _cachedSlotActivity = generated || '';
    pushLog('SYS', `🔵 Présence slot → ${status}${_cachedSlotActivity ? ' · ' + _cachedSlotActivity : ''}`);
  }

  try {
    const activities = _cachedSlotActivity
      ? [{ name: _cachedSlotActivity, type: actType }]
      : [];
    shared.discord.user.setPresence({ status, activities });
  } catch (_) {}
}

// B — Messages de transition de slot dans #général
const TRANSITION_CONTEXTS = {
  gaming:    { ctx: "tu passes en mode gaming pour la soirée",                       prob: 0.60 },
  lunch:     { ctx: "tu pars manger, tu reviens après",                              prob: 0.35 },
  latenight: { ctx: "il est super tard et tu es encore là, hyperfocus ou insomnie",  prob: 0.30 },
  wakeup:    { ctx: "tu viens de te lever et tu es encore zombie",                   prob: 0.20 },
};

async function postSlotTransitionMessage(slotStatus) {
  const entry = TRANSITION_CONTEXTS[slotStatus];
  if (!entry || Math.random() > entry.prob) return;
  if (!shared.discord?.isReady()) return;
  try {
    let ctx = entry.ctx;
    let hint = '';
    if (slotStatus === 'gaming' || slotStatus === 'latenight') {
      const ev = getEveningActivity();
      if (slotStatus === 'gaming') {
        ctx = ev.kind === 'series' ? `tu te poses devant ${ev.subject} pour la soirée`
            : ev.kind === 'chill'  ? `tu pars ${ev.label} pour la soirée, mode détente`
            : `tu lances ta session ${ev.label} pour la soirée`;
      }
      if (ev.subject) hint = ` Si tu nommes une œuvre ou un jeu, c'est ${ev.subject}, pas un autre.`;
    }
    const { text } = await callClaude(
      '',
      `Tu es Brainee. ${ctx}.${hint} Génère UN message Discord ultra-court et naturel (max 12 mots, style oral, en minuscules, SANS emoji, sans ponctuation finale) à poster dans le général. Texte brut uniquement, pas de guillemets.`,
      20,
      BOT_PERSONA,
      'claude-haiku-4-5-20251001'
    );
    const msg = text.trim().replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]$/, '');
    if (!msg) return;

    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get('1481028189680570421');
    if (!channel) return;

    await channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    await channel.send(msg);
    shared.lastAnyBotPostTime = Date.now();
    pushLog('SYS', `📢 Transition [${slotStatus}] → #général : "${msg}"`);
  } catch (err) {
    pushLog('ERR', `postSlotTransitionMessage: ${err.message}`, 'error');
  }
}

module.exports = { setOccupied, setAvailable, setOccupiedFor, detectAndSetPresenceFromReply, setSlotPresence, postSlotTransitionMessage };
