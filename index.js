const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const { Vec3 } = require('vec3');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));

const diaryFile = './diary.json';
const memoryFile = './memory.json';

if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify({ villages: [], resources: {} }, null, 2));
if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) {
  const diary = JSON.parse(fs.readFileSync(diaryFile));
  diary.push({ date: new Date().toISOString(), entry });
  fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2));
}

let bot;
let deathCount = 0;
let reconnectDelay = 5000;
let isConnecting = false;

function createBot() {
  const randomId = Math.floor(Math.random() * 10000);
  const botOptions = {
    host: 'X234.aternos.me',
    port: 13246,
    username: 'Wikko_' + randomId,
    auth: 'offline',
    version: false,
  };

  if (bot) {
    try { bot.quit(); } catch (e) {}
    bot = null;
  }

  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Bot has joined the server.');
    reconnectDelay = 5000;
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    setInterval(() => evolveBot(), 15000);
  });

  bot.on('goal_reached', () => {
    console.log('🎯 Reached goal, exploring...');
    exploreRandomly();
  });

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
    isConnecting = false;

    const reasonText = typeof reason === 'string' ? reason : JSON.stringify(reason);
    if (reasonText.includes('duplicate_login')) {
      reconnectDelay += 5000;
    } else if (reasonText.includes('throttled')) {
      reconnectDelay = Math.min(reconnectDelay + 5000, 60000);
    }

    console.log(`🔌 Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('end', () => {
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❌ Error:', err.code || err.message);
    isConnecting = false;
    reconnectDelay = Math.min(reconnectDelay + 5000, 60000);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('death', () => {
    deathCount++;
    logDiary('البوت مات. عدد مرات الموت: ' + deathCount);
    if (deathCount >= 3) bot.chat('أتعلم من أخطائي!');
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
}

function exploreRandomly() {
  const pos = bot.entity.position;
  const x = pos.x + Math.floor(Math.random() * 20 - 10);
  const z = pos.z + Math.floor(Math.random() * 20 - 10);
  const y = pos.y;
  bot.pathfinder.setGoal(new GoalBlock(x, y, z));
}

async function evolveBot() {
  const mcData = require('minecraft-data')(bot.version);
  const inventory = bot.inventory.items().map(i => i.name);
  const hasWood = inventory.includes('oak_log') || inventory.some(i => i.includes('_log'));
  const hasCraftingTable = inventory.includes('crafting_table');
  const hasPickaxe = inventory.some(i => i.includes('pickaxe'));

  if (!hasWood) {
    const wood = bot.findBlock({ matching: block => block.name.includes('_log'), maxDistance: 32 });
    if (wood) {
      bot.chat('أبحث عن خشب!');
      await bot.pathfinder.goto(new GoalBlock(wood.position.x, wood.position.y, wood.position.z));
      try { await bot.dig(wood); } catch (e) { bot.chat('❌ لم أستطع كسر الخشب'); }
    }
    return;
  }

  if (hasWood && !hasCraftingTable) {
    const recipe = mcData.recipes.craftingTable?.[0];
    if (recipe) {
      bot.chat('سأصنع طاولة تصنيع');
      try { await bot.craft(recipe, 1, null); } catch (e) { bot.chat('❌ فشل في الصناعة'); }
    }
    return;
  }

  if (hasWood && hasCraftingTable && !hasPickaxe) {
    bot.chat('أحتاج إلى حجر لأصنع فأس');
    const stone = bot.findBlock({ matching: b => mcData.blocks[b.type].name === 'stone', maxDistance: 32 });
    if (stone) await bot.pathfinder.goto(new GoalBlock(stone.position.x, stone.position.y, stone.position.z));
    return;
  }

  bot.chat('✅ جاهز للتطوير!');
  exploreRandomly();
}

function checkServerAndStart() {
  if (isConnecting) return;
  isConnecting = true;
  try {
    createBot();
  } catch (err) {
    isConnecting = false;
    reconnectDelay = Math.min(reconnectDelay + 5000, 60000);
    console.log(`🔴 فشل الاتصال، المحاولة مجددًا بعد ${reconnectDelay / 1000}s`);
    setTimeout(checkServerAndStart, reconnectDelay);
  }
}

checkServerAndStart();
