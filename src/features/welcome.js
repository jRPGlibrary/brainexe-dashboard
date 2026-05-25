const shared = require('../shared');
const { pushLog } = require('../logger');
const { GUILD_ID } = require('../config');
const { callClaude } = require('../ai/claude');
const { BOT_PERSONA } = require('../bot/persona');
const { recordTokenUsage } = require('../db/tokenUsage');

const GENERAL_CHANNEL_ID = '1481028189680570421';

async function generateWelcomePhrase(username) {
  const prompt = `Un nouveau membre "${username}" vient d'arriver sur le serveur Discord BrainEXE (communauté gaming / créateurs neurodivergents). Génère UNE phrase courte et spontanée pour l'accueillir dans le salon général (max 15 mots, style oral Brainee, en français, SANS emoji, sans ponctuation finale, pas de formule bateau type "bienvenue parmi nous"). Sois naturelle et originale. Texte brut uniquement.`;
  try {
    const { text, usage } = await callClaude('', prompt, 40, BOT_PERSONA, 'claude-haiku-4-5-20251001');
    await recordTokenUsage('system', 'brainee', usage.inputTokens, usage.outputTokens, 'welcome');
    return text.trim().replace(/^["'«»]|["'«»]$/g, '').replace(/[.!?]$/, '');
  } catch (_) {
    return `ah tiens, ${username} qui rappliche`;
  }
}

async function sendWelcomeMessage(member) {
  try {
    const guild = await shared.discord.guilds.fetch(GUILD_ID);
    await guild.channels.fetch();
    const channel = guild.channels.cache.get(GENERAL_CHANNEL_ID);
    if (!channel) return;

    const phrase = await generateWelcomePhrase(member.user.username);

    await channel.sendTyping().catch(() => {});
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    await channel.send(`<@${member.id}> ${phrase}`);

    pushLog('SYS', `👋 Welcome #général → ${member.user.tag} : "${phrase}"`, 'success');
  } catch (err) {
    pushLog('ERR', `Welcome échoué : ${err.message}`, 'error');
  }
}

module.exports = { sendWelcomeMessage };
