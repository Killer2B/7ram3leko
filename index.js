const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const autoEat = require('mineflayer-auto-eat');
const vec3 = require('vec3');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Keep bot alive for Railway
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// إعدادات السيرفر
const botOptions = {
  host: 'X234.aternos.me', // ← غيره إلى دومين سيرفرك
  port: 13246,              // ← البورت من أترنوس
  username: 'X_NotTheRealOne',
  auth: 'offline',
  version: false
};

let bot;

function createBot() {
  bot = mineflayer.createBot(botOptions);

  // تحميل الإضافات
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoEat);

  bot.once('spawn', () => {
    console.log('✅ Bot joined the server.');

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // حركة رأس عشوائية لتجنب AFK
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);

    // أكل تلقائي
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: []
    };

    // تكسير بلوك قدامه للتجربة
    const targetBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
    if (targetBlock && bot.canDigBlock(targetBlock)) {
      bot.dig(targetBlock, (err) => {
        if (err) console.log('❌ Error digging:', err.message);
        else console.log('⛏️ Dug a block under me.');
      });
    }

    // يمشي لمكان عشوائي بسيط كنوع من الاستكشاف
    const randomGoal = new goals.GoalBlock(
      Math.floor(bot.entity.position.x + (Math.random() * 10 - 5)),
      Math.floor(bot.entity.position.y),
      Math.floor(bot.entity.position.z + (Math.random() * 10 - 5))
    );
    bot.pathfinder.setGoal(randomGoal);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Waiting to respawn...');
  });

  bot.on('end', () => {
    console.log('🔁 Bot disconnected. Reconnecting in 5 seconds...');
    setTimeout(createBot, 5000);
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
  });

  bot.on('error', (err) => {
    console.log('❗ Error:', err.message);
  });
}

createBot();
