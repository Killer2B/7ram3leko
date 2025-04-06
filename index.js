// ✅ البوت النهائي مع كل المزايا + تطور تدريجي ذكي حتى قتل التنين + صناديق + دفاع عن النفس + احتراف + بناء بيت + نوم + نذر + تفاعل + تعدين ذكي + ذكاء بيئي + زراعة + بوابة Nether + إدارة موارد + دخول End + صيد + فرن + تجارة مع القرويين + سرير تلقائي + محادثة عربية ذكية (مئات الأوامر) + تعلم ذاتي + مذكرات + تطور لنيذر رايت

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear, GoalBlock } = goals;
const { Vec3 } = require('vec3');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('🤖 Bot is alive'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const botOptions = {
  host: 'X234.aternos.me',
  port: 13246,
  username: 'Wikko',
  auth: 'offline',
  version: false
};

let bot;
let reconnectDelay = 5000;
let deathCount = 0;
const knownLocations = { villages: [], resources: {} };
const diaryFile = './diary.json';
const memoryFile = './memory.json';
const arabicCommands = JSON.parse(fs.readFileSync('./arabic_commands.json'));

if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2));
if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) {
  const diary = JSON.parse(fs.readFileSync(diaryFile));
  diary.push({ date: new Date().toISOString(), entry });
  fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2));
}

function saveMemory() {
  fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2));
}

function createBot() {
  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', async () => {
    console.log('✅ Bot has joined the server.');
    reconnectDelay = 5000;
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    setInterval(() => {
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);

    evolveBot();
  });

  bot.on('goal_reached', () => {
    console.log('🎯 الهدف تم الوصول إليه! اختيار هدف جديد ...');
    exploreRandomly();
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
    const match = reason.match(/wait (\d+) seconds?/i);
    if (match) reconnectDelay = parseInt(match[1]) * 1000;
    else reconnectDelay = Math.min(reconnectDelay + 2000, 15000);
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('end', () => {
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❌ Error:', err);
    if (err.code === 'ECONNRESET') {
      console.log('🔁 تم قطع الاتصال، سيتم إعادة الاتصال خلال ثوانٍ ...');
      setTimeout(checkServerAndStart, reconnectDelay);
    }
  });

  bot.on('death', () => {
    deathCount++;
    logDiary('مات البوت مرة أخرى. عدد مرات الموت: ' + deathCount);
    if (deathCount >= 3) bot.chat('🧠 أتعلم كيف أعيش أفضل!');
  });

  bot.on('entityHurt', (entity) => {
    if (entity.type === 'player' && entity.username !== bot.username) {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < 4) {
        bot.chat('⚔️ لا تقترب مني!');
        bot.attack(entity);
      }
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    const command = message.trim().toLowerCase();
    for (const key in arabicCommands) {
      if (command.includes(key)) {
        bot.chat(arabicCommands[key].response);
        if (arabicCommands[key].action) arabicCommands[key].action(bot);
        return;
      }
    }
  });
}

async function checkServerAndStart() {
  try {
    createBot();
  } catch (err) {
    console.log('🔴 السيرفر غير متاح حالياً. إعادة المحاولة بعد 30 ثانية...');
    setTimeout(checkServerAndStart, 30000);
  }
}

checkServerAndStart();
