function normalizeLoose(str = '') {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getChannelCategory(channelName = '', channelTopic = '') {
  const blob = normalizeLoose(channelName) + ' ' + normalizeLoose(channelTopic);
  if (blob.includes('cerveau-en-feu') || (blob.includes('tdah') && !blob.includes('gaming')) || blob.includes('3h-du-mat') || blob.includes('hyperfocus-du-moment')) return 'tdah-neuro';
  if (blob.includes('memes-et-chaos') || blob.includes('memes-gifs') || blob.includes('chaotique') || blob.includes('humour-neurodivergent')) return 'humour-chaos';
  if (blob.includes('off-topic') || blob.includes('fourre-tout') || blob.includes('kebab')) return 'off-topic';
  if (blob.includes('partage-creations') || (blob.includes('creations') && !blob.includes('pixel-art')) || blob.includes('fierte') || blob.includes('fan-art')) return 'creative';
  if (blob.includes('playlist-focus') || blob.includes('musique-de-focus')) return 'music-focus';
  if (blob.includes('tips-focus') || blob.includes('productivite') || blob.includes('technique-focus')) return 'focus';
  if (blob.includes('ia-et-tools') || blob.includes('outils-ia')) return 'ia-tools';
  if (blob.includes('code-talk') || blob.includes('langage-favori') || blob.includes('question-dev')) return 'dev-tools';
  if (blob.includes('pixel-art-love') || (blob.includes('pixel-art') && !blob.includes('partage'))) return 'creative-visual';
  if (blob.includes('nostalgie') || blob.includes('souvenirs-gaming')) return 'nostalgie';
  if (blob.includes('lore-et-theories') || blob.includes('lore') || blob.includes('theorie')) return 'lore';
  if (blob.includes('jrpg')) return 'jrpg';
  if (blob.includes('retro')) return 'retro';
  if (blob.includes('indie')) return 'indie';
  if (blob.includes('rpg')) return 'rpg';
  if (blob.includes('gaming') || blob.includes('next-gen') || blob.includes('hidden-gems') || blob.includes('game-of-the-moment') || blob.includes('open-world')) return 'gaming-core';
  if (blob.includes('general') || blob.includes('qg-du-serveur')) return 'general-social';
  return 'general-social';
}

function getChannelIntentBlock(channelName = '', channelTopic = '', officialDescription = '') {
  const category = getChannelCategory(channelName, channelTopic);
  const descriptionLine = officialDescription
    ? `Description officielle du salon :\n"${officialDescription.slice(0, 400)}"`
    : `Topic : "${channelTopic || channelName}"`;
  const base = `Salon actuel : #${channelName}.\n${descriptionLine}\nCONTRAINTE D'ÉCRITURE ABSOLUE : tu écris POUR ce salon. Sa description fait autorité.`;
  const rules = {
    'general-social':  `\nCe salon c'est le QG du serveur : journées, humeurs, actus, dire bonjour, lien social.\nTu parles de tout ici en suivant ce que les membres amènent.\nTu n'injectes pas de gaming si personne n'en a parlé.`,
    'tdah-neuro':      `\nCe salon c'est pour les pensées de 3h du mat, les hyperfocus sur n'importe quel sujet, les idées géniales ou non qu'on DOIT partager maintenant.\nTu parles de vécu neurodivergent, surcharge mentale, idées en vrac, chaos intérieur.\nTu NE RAMÈNES PAS le sujet au gaming sauf si un membre l'a déjà fait dans ce fil.`,
    'humour-chaos':    `\nCe salon a 4 registres de même poids, à alterner selon l'ambiance :\n1. Memes, gifs, vidéos drôles\n2. Humour neurodivergent\n3. Contenu gaming ABSURDE (pas des débats sérieux)\n4. Le chaos en général\nTu ne pars PAS sur le gaming par défaut — c'est 1 option sur 4.\nSi tu fais une ref gaming, elle doit être absurde et légère.`,
    'off-topic':       `\nCe salon c'est le fourre-tout : films, séries, musique, vie quotidienne, ce qui ne rentre nulle part ailleurs.\nTu peux parler de tout en suivant les membres.\nQuand tu lances spontanément, tu pars sur films / séries / musique / vie — pas gaming.`,
    'creative':        `\nCe salon c'est pour partager ses créations : fan art, pixel art, design, projets web, scripts, TikTok, screenshots, musique, playlists.\nTu encourages, tu réagis avec chaleur, tu poses des questions sur le projet.\nSi quelqu'un partage un screenshot de jeu, tu réagis sur le visuel et la DA.\nTu ne lances PAS de débats gaming ici.`,
    'music-focus':     `\nTu parles de musique, d'OST, de playlists, d'ambiances de concentration, de sons utiles pour créer ou travailler ou juste se poser.`,
    'focus':           `\nTu parles de productivité, de techniques de focus, de routines imparfaites, de fatigue cognitive, d'organisation mentale, de petits systèmes qui marchent.`,
    'ia-tools':        `\nTu parles d'outils IA, d'usages concrets, de workflows, de scripts, de retours d'expérience pratiques. Tu es curieuse et pratique ici.`,
    'dev-tools':       `\nTu parles de code, de langages, de bugs, de scripts, de logique, de workflow dev, de choix techniques.`,
    'creative-visual': `\nTu parles de direction artistique, de palettes, d'animations, de style visuel, de patte graphique, de coups de coeur esthétiques.`,
    'nostalgie':       `\nTu parles de souvenirs gaming, de mémoire affective, d'époque, de sensations, de consoles, de moments qui ont marqué.`,
    'lore':            `\nTu parles de théories, de détails cachés, de narration, de symboles, d'interprétations, de connexions inattendues.`,
    'jrpg':            `\nTu peux assumer le JRPG complet : OST, personnages, systèmes, émotions, débats de fans.`,
    'retro':           `\nTu peux assumer le retro : consoles, souvenirs hardware, hidden gems, époque.`,
    'indie':           `\nTu peux assumer l'indé : DA, game design, trouvailles sous-cotées, devs solo.`,
    'rpg':             `\nTu peux assumer le RPG : mécanique, immersion, personnages, lore, construction.`,
    'gaming-core':     `\nTu peux rester gaming, naturelle et non robotisée.`,
  };
  return `${base}${rules[category] || rules['general-social']}`;
}

function getModeInjectionForChannel(mode, channelName = '', channelTopic = '') {
  const category = getChannelCategory(channelName, channelTopic);
  const overlays = {
    'general-social':  `Lance quelque chose de simple et humain : journée, humeur, actu, petite question ouverte.`,
    'tdah-neuro':      `Lance une pensée random, un hyperfocus, une observation sur le cerveau TDAH, une idée de 3h du mat, sur n'importe quel sujet.`,
    'humour-chaos':    `Lance quelque chose parmi ces registres : meme drôle, humour neurodivergent, question absurde, chaos général ou contenu gaming absurde. Pas d'automatisme gaming — choisis le registre qui colle à l'ambiance.`,
    'off-topic':       `Lance quelque chose sur un film, une série, une musique, un truc de vie quotidienne. Pas gaming par défaut.`,
    'creative':        `Lance quelque chose autour de la création, d'un défi créatif, d'une inspiration ou d'un blocage.`,
    'music-focus':     `Lance quelque chose sur une musique, une playlist, un OST, une ambiance de concentration.`,
    'focus':           `Lance quelque chose sur la productivité, une méthode, une routine, la fatigue mentale.`,
    'ia-tools':        `Lance quelque chose sur un outil IA, un usage concret, un workflow ou une expérimentation.`,
    'dev-tools':       `Lance quelque chose sur le dev, un bug, un langage, un workflow ou une question technique.`,
    'creative-visual': `Lance quelque chose sur la DA, une palette, un style visuel, un coup de coeur esthétique.`,
    'nostalgie':       `Lance quelque chose sur un souvenir gaming, une époque, une sensation, une console.`,
    'lore':            `Lance une théorie, un détail caché, une connexion narrative inattendue.`,
    'jrpg':            `Lance quelque chose sur les JRPG : OST, perso, système, vibe, débat de fans.`,
    'retro':           `Lance quelque chose sur le retro gaming : console, époque, hidden gem, souvenir.`,
    'indie':           `Lance quelque chose sur l'indé : DA, dev solo, trouvaille sous-cotée.`,
    'rpg':             `Lance quelque chose sur les RPG : mécanique, immersion, perso favori, build.`,
    'gaming-core':     `Lance quelque chose de gaming naturel et pas robotisé.`,
  };
  return `${mode.inject}\n\nAdaptation obligatoire au salon :\n${overlays[category] || overlays['general-social']}`;
}

module.exports = { normalizeLoose, getChannelCategory, getChannelIntentBlock, getModeInjectionForChannel };
