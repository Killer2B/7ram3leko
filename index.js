// ✅ البوت الكامل الاحترافي: تطور تدريجي + أدوات + ذكاء اصطناعي شامل

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
  username: '7ram3leko',
  auth: 'offline',
  version: false
};

let bot;
let reconnectDelay = 5000;
let deathCount = 0;
const knownLocations = { villages: [], resources: {} };
const diaryFile = './diary.json';
const memoryFile = './memory.json';

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

async function evolveBot() {
  try {
    if (!bot.chat || typeof bot.chat !== 'function' || !bot._client || typeof bot._client.chat !== 'function') return;
    bot.chat('🚀 بدء التطور الذكي!');
    const mcData = require('minecraft-data')(bot.version);

    async function collectAndCraft() {
      const log = bot.findBlock({
        matching: block => block && block.name.includes('_log'),
        maxDistance: 32
      });
      if (log) {
        await bot.pathfinder.goto(new GoalBlock(log.position.x, log.position.y, log.position.z));
        await bot.dig(log);
        bot.chat('🌲 تم جمع الخشب.');
      }

      const plankId = mcData.itemsByName.oak_planks.id;
      const tableId = mcData.itemsByName.crafting_table.id;
      const wood = bot.inventory.items().find(item => item.name.includes('log'));
      if (wood) {
        await bot.craft(mcData.recipes.find(r => r.result.id === plankId), 1, null);
        bot.chat('🪵 صنع ألواح خشبية.');
        await bot.craft(mcData.recipes.find(r => r.result.id === tableId), 1, null);
        bot.chat('🛠️ صنع طاولة كرافت.');
      }
    }

    await collectAndCraft();
    bot.chat('✅ الخطوات الأولية انتهت. سأبدأ الزراعة والبناء قريبًا.');
  } catch (err) {
    if (bot.chat) bot.chat('⚠️ خطأ أثناء التطوير: ' + err.message);
    console.log(err);
  }
}

function exploreRandomly() {
  if (!bot.entity) return;
  const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10);
  const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10);
  const y = bot.entity.position.y;
  bot.pathfinder.setGoal(new GoalBlock(x, y, z));
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
      if (!bot.entity) return;
      const yaw = Math.random() * Math.PI * 2;
      bot.look(yaw, 0, true);
    }, 10000);

    await evolveBot();
  });

  bot.on('goal_reached', () => {
    console.log('🎯 الهدف تم الوصول إليه! اختيار هدف جديد ...');
    exploreRandomly();
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
    const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason);
    const match = reasonString.match(/wait (\d+) seconds?/i);
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
    if (deathCount >= 3 && bot.chat) bot.chat('🧠 أتعلم كيف أعيش أفضل!');
  });

  bot.on('entityHurt', (entity) => {
    if (!bot.entity || !entity?.position) return;
    if (entity.type === 'player' && entity.username !== bot.username) {
      const dist = bot.entity.position.distanceTo(entity.position);
      if (dist < 4) {
        if (bot.chat) bot.chat('⚔️ لا تقترب مني!');
        bot.attack(entity);
      }
    }
  });

  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    const command = message.trim().toLowerCase();
    // يمكن إضافة أوامر مخصصة لاحقًا هنا
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
