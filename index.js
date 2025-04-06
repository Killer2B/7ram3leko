const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;
const autoeat = require('mineflayer-auto-eat').plugin;
const armorManager = require('mineflayer-armor-manager');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

const username = process.env.BOT_USERNAME || 'PlayerBot';
const host = process.env.SERVER_HOST || 'localhost';
const version = process.env.MC_VERSION || false;

let bot;
let reconnectDelay = 5000;
let isConnecting = false;

function createBot() {
  bot = mineflayer.createBot({
    host,
    username,
    version,
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoeat);
  bot.loadPlugin(armorManager);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned');
    mineflayerViewer(bot, { port: 3001, firstPerson: false });
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: []
    };
    bot.autoEat.enable();
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    if (message === 'تعال') {
      const player = bot.players[username];
      if (!player || !player.entity) {
        bot.chat('لا أستطيع رؤيتك');
        return;
      }
      const goal = new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 1);
      bot.pathfinder.setMovements(new Movements(bot));
      bot.pathfinder.setGoal(goal);
      bot.chat('أنا قادم إليك');
    }
  });

  bot.on('kicked', (reason) => {
    console.log('🥿 Kicked:', reason);
    isConnecting = false;

    const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason);
    const match = reasonString.match(/wait (\d+) seconds?/i);

    if (match) {
      reconnectDelay = parseInt(match[1]) * 1000;
    } else {
      reconnectDelay = Math.min(reconnectDelay + 2000, 15000);
    }

    console.log(`⚫ Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('end', () => {
    console.log('🔌 Bot connection ended.');
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });
}

function checkServerAndStart() {
  if (isConnecting) return;
  isConnecting = true;
  console.log('⏳ Checking server and starting bot...');
  createBot();
}

checkServerAndStart();
