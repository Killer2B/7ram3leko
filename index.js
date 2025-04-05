const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));

const botOptions = {
  host: 'X234.aternos.me', // ← غيّر ده بالدومين الحقيقي
  port: 13246,              // ← غيّر ده بالبورت الحقيقي
  username: 'X_NotTheRealOne',
  auth: 'offline',
  version: false
};

let bot;

function createBot() {
  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('**✅ Bot has joined the server.**');
    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected. Reconnecting...');
    setTimeout(createBot, 5000);
  });

  bot.on('error', (err) => {
    console.log('Error:', err);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Waiting to respawn...');
  });

  bot.on('kicked', (reason) => {
    console.log('Kicked:', reason);
  });
}

createBot();
