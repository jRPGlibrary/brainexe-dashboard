module.exports = {
  TOKEN: process.env.DISCORD_TOKEN,
  GUILD_ID: process.env.GUILD_ID || '1481022956816830669',
  PORT: process.env.PORT || 3000,
  TEMPLATE_FILE: 'discord-template.json',
  CONFIG_FILE: 'brainexe-config.json',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  MIN_GAP_ANY_POST: 15 * 60 * 1000,
};
