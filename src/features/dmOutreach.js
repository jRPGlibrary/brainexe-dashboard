/**
 * ================================================
 * 💬 DM OUTREACH v0.8.6
 * ================================================
 * Passage en DM entre Brainee et un membre, dans trois scénarios :
 *
 *   1. Invitation reçue   : le membre invite Brainee en DM dans un salon
 *      → elle accepte dans le salon puis ouvre le DM et lance la convo
 *
 *   2. Proposal sortante  : Brainee propose elle-même de continuer en DM
 *      → faible proba, réservé aux membres avec un lien solide
 *      → si le membre répond "oui" dans les 5 min, elle ouvre le DM
 *
 *   3. Outreach proactif  : Brainee initie un DM spontané avec un VIP
 *      → appelé depuis proactiveOutreach.js (type dm_outreach)
 *
 * Garde-fous :
 *   - Cooldown par userId (pas de double-DM)
 *   - TTL 5 min sur les proposals en attente
 *   - Bond minimum pour les proposals sortantes
 * ================================================
 */

const shared = require('../shared');
const { pushLog } = require('../logger');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA_DM } = require('../bot/persona');
const { simulateTyping, sendHuman } = require('../bot/messaging');
const { refreshDailyMood, getMoodInjection } = require('../bot/mood');
const { getEmotionalInjection, adjustMaxTokens } = require('../bot/emotions');
const { appendDmMessage } = require('../db/dmHistory');
const { ensureMemberBond, describeBond } = require('../db/memberBonds');
const { getVipTier } = require('../db/vipSystem');
const { ANTHROPIC_API_KEY, GUILD_ID } = require('../config');

// ─── ÉTAT ────────────────────────────────────────────────────────
// Proposals DM en attente : userId → { channelId, contextHint, expiresAt }
const pendingDmProposals = new Map();
const PROPOSAL_TTL_MS = 5 * 60 * 1000;

// Cooldown par user pour éviter les DMs en rafale
const dmCooldowns = new Map();
const DM_COOLDOWN_MS = 10 * 60 * 1000;

// ─── DÉTECTION ───────────────────────────────────────────────────
const DM_INVITE_PATTERNS = [
  /\ben\s*(dm|mp|priv[eé]|message\s*priv[eé]|pv)\b/i,
  /\b(dm|mp)\s*(moi|nous)\b/i,
  /\b(slide|glisse)\s*(en\s*)?(dm|mp)\b/i,
  /\bdébate?\b.*\ben\s*(dm|mp)\b/i,
  /\bcontinuer?\b.*\ben\s*(dm|mp)\b/i,
  /\bon\s+(se\s+)?(parle?|écrit|cause)\b.*\ben\s*(dm|mp)\b/i,
  /\bviens?\s+en\s*(dm|mp)\b/i,
];

const DM_ACCEPT_PATTERNS = [
  /^(oui|ouais|ok|oki|okay|yep|yes|yop|let'?s?\s*go|go|allons?-?y|bien\s*s[uû]r|carrément|clairement|volontiers|avec\s*plaisir|pourquoi\s*pas|pp|👍|✅)[\s!.]*$/i,
];

const DM_REFUSE_PATTERNS = [
  /^(non|nope|nah|nan|pas\s*vraiment|bof|pas\s*là|plus\s*tard|flemme|no|nein)[\s!.]*$/i,
];

function detectDmInvite(content) {
  return DM_INVITE_PATTERNS.some(p => p.test(content));
}

function detectDmAccept(content) {
  if (!content || content.trim().length > 80) return false;
  return DM_ACCEPT_PATTERNS.some(p => p.test(content.trim()));
}

function detectDmRefuse(content) {
  if (!content || content.trim().length > 80) return false;
  return DM_REFUSE_PATTERNS.some(p => p.test(content.trim()));
}

// ─── OUVERTURE DM ─────────────────────────────────────────────────
async function openAndSendDm(user, contextHint, bond) {
  if (!ANTHROPIC_API_KEY) return false;

  // Cooldown
  const lastDm = dmCooldowns.get(user.id) || 0;
  if (Date.now() - lastDm < DM_COOLDOWN_MS) return false;

  try {
    const dmChannel = await user.createDM();
    const mood = refreshDailyMood();
    const emotionBlock = getEmotionalInjection();
    const bondBlock = describeBond(bond, user.username);

    const systemPrompt = `Tu viens d'accepter de passer en DM avec ${user.username} (ou iel t'a invitée directement).
💞 LIEN : ${bondBlock}
Humeur : ${mood}. ${getMoodInjection(mood)}
${emotionBlock}
Contexte du fil dans le salon : ${contextHint || 'discussion générale'}

Envoie le PREMIER message du DM. Naturel, sans "hey bonjour !" générique.
Continue là où la convo s'est arrêtée — ou relance de façon directe sur le sujet.
Max 2 phrases. Ton DM, pas un mail.`;

    await simulateTyping(dmChannel, 1500 + Math.random() * 2000);
    const { text: reply } = await callClaude(systemPrompt, 'Génère le premier message DM.', adjustMaxTokens(150), BOT_PERSONA_DM);
    if (!reply || reply.length < 5) return false;

    await dmChannel.send(reply);
    await appendDmMessage(user.id, user.username, 'assistant', reply);

    dmCooldowns.set(user.id, Date.now());
    pushLog('SYS', `📨 DM ouvert avec ${user.username}`, 'success');
    return true;
  } catch (err) {
    pushLog('ERR', `openAndSendDm: ${err.message}`, 'error');
    return false;
  }
}

// ─── GESTION INVITATION REÇUE ────────────────────────────────────
async function handleDmInvite(message, contextHint) {
  try {
    const bond = await ensureMemberBond(message.author.id, message.author.username);

    const acceptLines = [
      'ouais go, check tes DMs 👀',
      'oui carrément, je t\'écris de suite',
      'yep attends je te slide',
      'oki, je t\'envoie ça maintenant',
      'ouais, check tes messages privés',
    ];
    const channelReply = acceptLines[Math.floor(Math.random() * acceptLines.length)];
    await sendHuman(message.channel, channelReply, message, { bond });

    setTimeout(async () => {
      await openAndSendDm(message.author, contextHint, bond);
    }, 2000 + Math.random() * 3000);

    pushLog('SYS', `💬 Invite DM acceptée → ${message.author.username}`);
    return true;
  } catch (err) {
    pushLog('ERR', `handleDmInvite: ${err.message}`, 'error');
    return false;
  }
}

// ─── PROPOSAL SORTANTE ───────────────────────────────────────────
async function maybeProposeInDm(message, contextHint, bond) {
  const vipTier = getVipTier(bond);
  const bondScore = bond?.score || 0;

  // Seulement pour les membres avec un lien solide
  const isEligible = ['inner_circle', 'trusted', 'vip'].includes(vipTier) || bondScore >= 40;
  if (!isEligible) return false;

  // Pas de double-proposal
  if (pendingDmProposals.has(message.author.id)) return false;

  // Cooldown DM
  const lastDm = dmCooldowns.get(message.author.id) || 0;
  if (Date.now() - lastDm < DM_COOLDOWN_MS) return false;

  // Probabilité selon le lien
  const vipBonus = vipTier === 'inner_circle' ? 0.10 : vipTier === 'trusted' ? 0.05 : 0.02;
  const proba = 0.07 + vipBonus;
  if (Math.random() > proba) return false;

  const proposals = [
    `au fait si tu veux on peut continuer ça en DM, j'ai envie d'aller plus loin là-dessus`,
    `tu veux qu'on continue en priv ? j'ai des trucs à dire que je dirais mieux là-bas`,
    `si t'as envie d'en parler plus tranquillement, fais signe — je peux t'écrire en DM`,
    `j'ai envie d'aller plus loin sur ce sujet avec toi... tu veux continuer en DM ?`,
    `on pourrait continuer ça en DM si tu veux, c'est le genre de truc dont j'ai envie de parler sans les autres 👀`,
  ];
  const proposal = proposals[Math.floor(Math.random() * proposals.length)];

  await sendHuman(message.channel, proposal, null, { bond });

  pendingDmProposals.set(message.author.id, {
    channelId: message.channelId,
    contextHint: contextHint || '',
    expiresAt: Date.now() + PROPOSAL_TTL_MS,
  });

  pushLog('SYS', `💬 Proposal DM envoyée → ${message.author.username}`);
  return true;
}

// ─── VÉRIF. RÉPONSE À PROPOSAL ───────────────────────────────────
function checkPendingDmProposal(message) {
  const proposal = pendingDmProposals.get(message.author.id);
  if (!proposal) return null;

  if (Date.now() > proposal.expiresAt) {
    pendingDmProposals.delete(message.author.id);
    return null;
  }

  if (proposal.channelId !== message.channelId) return null;

  return proposal;
}

function consumeDmProposal(userId) {
  pendingDmProposals.delete(userId);
}

// ─── OUTREACH PROACTIF DM (appelé depuis proactiveOutreach.js) ──────
async function fireProactiveDmToVip(targetUserId, targetUsername, storyHint) {
  if (!ANTHROPIC_API_KEY) return false;

  const lastDm = dmCooldowns.get(targetUserId) || 0;
  if (Date.now() - lastDm < DM_COOLDOWN_MS) return false;

  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(targetUserId).catch(() => null);
    if (!member) return false;

    const bond = await ensureMemberBond(targetUserId, targetUsername);
    const mood = refreshDailyMood();
    const emotionBlock = getEmotionalInjection();
    const bondBlock = describeBond(bond, targetUsername);

    const systemPrompt = `Tu décides d'envoyer un DM spontané à ${targetUsername}, avec qui tu as un lien fort.
💞 LIEN : ${bondBlock}
Humeur : ${mood}. ${getMoodInjection(mood)}
${emotionBlock}
${storyHint ? `Fil narratif : ${storyHint}` : ''}

Écris UN message DM spontané, naturel, court.
Reprends un fil narratif, pose une vraie question, partage une pensée brute.
Pas de "hey comment tu vas" générique. Max 2 phrases.`;

    const dmChannel = await member.user.createDM();
    await simulateTyping(dmChannel, 1500 + Math.random() * 2000);
    const { text: reply } = await callClaude(systemPrompt, 'Génère le DM spontané.', adjustMaxTokens(150), BOT_PERSONA_DM);
    if (!reply || reply.length < 5) return false;

    await dmChannel.send(reply);
    await appendDmMessage(targetUserId, targetUsername, 'assistant', reply);

    dmCooldowns.set(targetUserId, Date.now());
    pushLog('SYS', `⚡ DM outreach proactif → ${targetUsername}`, 'success');
    return true;
  } catch (err) {
    pushLog('ERR', `fireProactiveDmToVip: ${err.message}`, 'error');
    return false;
  }
}

module.exports = {
  detectDmInvite,
  detectDmAccept,
  detectDmRefuse,
  handleDmInvite,
  maybeProposeInDm,
  checkPendingDmProposal,
  consumeDmProposal,
  openAndSendDm,
  fireProactiveDmToVip,
};
