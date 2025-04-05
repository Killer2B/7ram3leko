// ✅ البوت النهائي مع كل المزايا (دخول Aternos، بقاء، استكشاف، تأخير ذكي)

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

let bot;
let reconnectDelay = 5000; // تأخير أولي

// 🌐 خادم HTTP علشان Railway/UptimeRobot
app.get('/', (req, res) => res.send('🤖 Bot is alive'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// ⚙️ إعدادات البوت
const botOptions = {
  host: 'X234.aternos.me', // ← عدل ده للدومين بتاع سيرفرك
  port: 13246,
  username: 'Wikko',
  auth: 'offline',
  version: false
};

function createBot() {
  bot = mineflayer.createBot(botOptions);

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Bot has joined the server.');
    reconnectDelay = 5000;

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // 💡 حركة بسيطة علشان Anti-AFK
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);

    // 🧠 ذكاء استكشاف بسيط
    exploreRandomly();
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);

    const match = reason.match(/wait (\d+) seconds?/i);
    if (match) reconnectDelay = parseInt(match[1]) * 1000;
    else reconnectDelay = Math.min(reconnectDelay + 2000, 15000);

    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('end', () => {
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('error', (err) => console.log('❌ Error:', err));
  bot.on('death', () => console.log('☠️ Bot died. Waiting to respawn...'));
}

function exploreRandomly() {
  setInterval(() => {
    if (!bot || !bot.entity) return;

    const x = bot.entity.position.x + (Math.random() * 20 - 10);
    const z = bot.entity.position.z + (Math.random() * 20 - 10);
    const y = bot.entity.position.y;

    const goal = new GoalNear(x, y, z, 1);
    bot.pathfinder.setGoal(goal);
  }, 30000); // كل 30 ثانية استكشاف
}

createBot();
