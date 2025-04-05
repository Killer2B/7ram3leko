const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const autoEat = require('mineflayer-auto-eat');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// خادم Express لتشغيل Railway/UptimeRobot
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// إعدادات السيرفر
const botOptions = {
  host: 'X234.aternos.me', // ← غيره بدومين سيرفرك
  port: 13246,              // ← البورت من Aternos
  username: 'X_NotTheRealOne', // ← اسم البوت
  auth: 'offline',
  version: false
};

let bot;
let reconnectDelay = 5000; // تأخير مبدئي 5 ثواني

function createBot() {
  bot = mineflayer.createBot(botOptions);

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoEat);

  bot.once('spawn', () => {
    console.log('✅ Bot joined the server.');

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // منع AFK بالحركة العشوائية للرأس
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);

    // إعداد الأكل التلقائي
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: []
    };
    bot.autoEat.foodsByName = require('minecraft-data')(bot.version).foodsByName;

    // استكشاف بسيط
    const goal = new goals.GoalBlock(
      Math.floor(bot.entity.position.x + (Math.random() * 10 - 5)),
      Math.floor(bot.entity.position.y),
      Math.floor(bot.entity.position.z + (Math.random() * 10 - 5))
    );
    bot.pathfinder.setGoal(goal);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Waiting to respawn...');
  });

  bot.on('end', () => {
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
    // نعيد التشغيل بعد تأخير
    reconnectDelay = Math.min(reconnectDelay + 2000, 15000); // نزود التأخير تدريجيًا
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❗ Error:', err.message);
  });
}

createBot();
