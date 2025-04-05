const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Keep-alive HTTP server for Railway/UptimeRobot
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));

// Bot settings (فعالة مش كومنّت)
const botOptions = {
  host: 'X234.aternos.me', // ← عدل ده بالدومين بتاع سيرفرك
  port: 13246,                    // ← البورت، غالبًا ثابت
  username: 'X_NotTheRealOne', //
  auth: 'offline',              // ← حط 'offline' لو سيرفرك كراك
  version: false                  // ← يختار النسخة تلقائي
};

let bot;

function createBot() {
  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('Bot has joined the server.');

    // Anti-AFK: move head randomly
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.log('Error:', err);
  });

  bot.on('death', () => {
    console.log('Bot died. Waiting to respawn...');
  });

  bot.on('kicked', (reason) => {
    console.log('Kicked:', reason);
  });
}

createBot();
