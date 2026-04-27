'use strict';

require('dotenv').config({ path: __dirname + '/.env' });

const chalk    = require('chalk');
const Brain    = require('./core/brain');
const Voice    = require('./core/voice');
const Ear      = require('./core/ear');
const Emotions = require('./core/emotions');
const Memory   = require('./core/memory');

const WAKE_WORDS  = ['nex', 'hey nex', 'hé nex', 'eh nex', 'ok nex'];
const MODE        = process.argv.includes('--voice') ? 'voice'
                  : process.argv.includes('--text')  ? 'text'
                  : (process.env.NEX_MODE || 'text');

const brain    = new Brain();
const voice    = new Voice();
const ear      = new Ear();
const emotions = new Emotions();
const memory   = new Memory();

// ─────────────────────────────────────────────────────────────
//  Traitement d'une commande utilisateur
// ─────────────────────────────────────────────────────────────
async function processCommand(input) {
  const text = input.trim();
  if (!text) return;

  // Commandes internes
  if (text === '/reset') {
    memory.reset();
    const msg = 'Mémoire effacée. Repartir de zéro.';
    console.log(chalk.gray('  ' + msg));
    await voice.say(msg);
    return;
  }
  if (text === '/mute') {
    const muted = voice.toggle();
    console.log(chalk.gray(`  Voix ${muted ? 'coupée' : 'réactivée'}.`));
    return;
  }
  if (text.startsWith('/nom ')) {
    const name = text.slice(5).trim();
    memory.setUserName(name);
    const msg = `Ok, je retiens ${name}.`;
    console.log(chalk.gray('  ' + msg));
    await voice.say(msg);
    return;
  }
  if (text === '/etat') {
    const state = emotions.getState();
    const bond  = memory.getBondSummary();
    const health = brain.getHealth();
    console.log(chalk.gray('\n  État NEX :'));
    console.log(chalk.gray(`  • Énergie: ${state.energy} | Humeur: ${state.mood} | Alertness: ${state.alertness}`));
    console.log(chalk.gray(`  • ${bond}`));
    console.log(chalk.gray(`  • Claude: ${health.totalCalls} appels, ${health.totalErrors} erreurs\n`));
    return;
  }
  if (text === '/aide') {
    console.log(chalk.gray('\n  Commandes internes :'));
    console.log(chalk.gray('  /reset      — Efface la mémoire'));
    console.log(chalk.gray('  /mute       — Active/désactive la voix'));
    console.log(chalk.gray('  /nom Prénom — Mémorise ton prénom'));
    console.log(chalk.gray('  /etat       — Affiche l\'état interne de NEX'));
    console.log(chalk.gray('  exit        — Quitter\n'));
    return;
  }

  // Mise à jour émotionnelle avant de penser
  emotions.updateFromTime();
  emotions.processInteraction(text);

  const context      = memory.getContext();
  const emotionCtx   = emotions.getSummary();
  const bondCtx      = memory.getBondSummary();
  const voiceParams  = emotions.getVoiceParams();

  process.stdout.write(chalk.gray('  ...'));

  try {
    const response = await brain.think(text, { context, emotionContext: emotionCtx, bondContext: bondCtx });

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    console.log(chalk.cyan.bold('NEX › ') + chalk.white(response));
    memory.addExchange(text, response);
    memory.updateBond(text, response);

    await voice.say(response, voiceParams);

  } catch (err) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    const errMsg = err.message?.includes('Timeout')
      ? 'Je réponds plus — Claude time out.'
      : `Erreur : ${err.message}`;
    console.error(chalk.red('  ' + errMsg));
    await voice.say('Problème de connexion, relance si besoin.', voiceParams);
  }
}

// ─────────────────────────────────────────────────────────────
//  Bannière
// ─────────────────────────────────────────────────────────────
function printBanner(mode) {
  console.log('\n' + chalk.cyan('═'.repeat(44)));
  console.log(chalk.cyan.bold('   NEX  —  Assistant Personnel v1.0'));
  console.log(chalk.cyan('═'.repeat(44)));
  console.log(chalk.gray(`   Mode : ${mode === 'voice' ? 'Vocal 🎙' : 'Texte ⌨️'}  |  Humeur : ${emotions.getMoodLabel()}`));
  if (mode === 'text') {
    console.log(chalk.gray('   Tape /aide pour les commandes | exit pour quitter'));
  } else {
    console.log(chalk.gray(`   Mot de réveil : "Hey Nex" ou "Nex"`));
  }
  console.log(chalk.cyan('─'.repeat(44)) + '\n');
}

// ─────────────────────────────────────────────────────────────
//  Mode Texte
// ─────────────────────────────────────────────────────────────
async function runTextMode() {
  printBanner('text');

  const { greeting } = await brain.greet(memory.getBondSummary(), emotions.getSummary());
  console.log(chalk.cyan.bold('NEX › ') + chalk.white(greeting));
  await voice.say(greeting, emotions.getVoiceParams());

  const loop = () => {
    ear.listenText(chalk.yellow('Toi › ')).then(async (input) => {
      if (!input) { loop(); return; }
      if (input.toLowerCase() === 'exit') {
        await shutdown();
        return;
      }
      await processCommand(input);
      loop();
    }).catch(console.error);
  };

  loop();
}

// ─────────────────────────────────────────────────────────────
//  Mode Vocal
// ─────────────────────────────────────────────────────────────
async function runVoiceMode() {
  const { method, label } = await ear.getSTTInfo();

  if (method === 'text') {
    console.log(chalk.yellow('\n  ⚠  Aucun moteur STT détecté. Bascule en mode texte.\n'));
    return runTextMode();
  }

  printBanner('voice');
  console.log(chalk.gray(`   STT : ${label}\n`));

  const { greeting } = await brain.greet(memory.getBondSummary(), emotions.getSummary());
  console.log(chalk.cyan.bold('NEX › ') + chalk.white(greeting));
  await voice.say(greeting, emotions.getVoiceParams());

  console.log(chalk.gray('\n  En écoute...\n'));

  while (true) {
    try {
      const heard = await ear.listen(6000);
      if (!heard) continue;

      const lower = heard.toLowerCase();
      const wakeDetected = WAKE_WORDS.some(w => lower.includes(w));

      if (!wakeDetected) continue;

      let command = lower;
      for (const w of WAKE_WORDS) {
        command = command.replace(w, '').trim();
      }

      if (command) {
        console.log(chalk.yellow('Toi › ') + heard);
        await processCommand(command);
      } else {
        // Mot de réveil seul → fenêtre de commande
        await voice.say('Ouais ?', emotions.getVoiceParams());
        console.log(chalk.gray('  Fenêtre commande ouverte (8 sec)...'));
        const followUp = await ear.listen(8000).catch(() => '');
        if (followUp) {
          console.log(chalk.yellow('Toi › ') + followUp);
          await processCommand(followUp);
        }
      }

    } catch (err) {
      if (!['silence', 'no audio'].includes(err.message?.toLowerCase())) {
        console.error(chalk.red('  Écoute: ' + err.message));
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
//  Arrêt propre
// ─────────────────────────────────────────────────────────────
async function shutdown() {
  console.log(chalk.gray('\n  Sauvegarde... au revoir.\n'));
  memory.save();
  process.exit(0);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

// ─────────────────────────────────────────────────────────────
//  Point d'entrée
// ─────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(chalk.red('\n  Erreur: ANTHROPIC_API_KEY manquant dans .env\n'));
    process.exit(1);
  }

  await memory.load();
  emotions.initialize();

  if (MODE === 'voice') {
    await runVoiceMode();
  } else {
    await runTextMode();
  }
}

main().catch(err => {
  console.error(chalk.red('\n  Fatal: ' + err.message));
  process.exit(1);
});
