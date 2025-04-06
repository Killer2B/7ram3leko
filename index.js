const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const autoeat = require('mineflayer-auto-eat').plugin;
const armorManager = require('mineflayer-armor-manager').plugin;
const express = require('express');
const fs = require('fs');

const { GoalNear, GoalBlock } = goals;

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

const username = process.env.BOT_USERNAME || 'PlayerBot';
const host = process.env.SERVER_HOST || 'localhost';
const version = process.env.MC_VERSION || false;

const diaryFile = './diary.json';
const memoryFile = './memory.json';
let bot;
let reconnectDelay = 5000;
let isConnecting = false;
let deathCount = 0;
const knownLocations = { villages: [], resources: {} };

if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2));
if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) {
  const diary = JSON.parse(fs.readFileSync(diaryFile));
  diary.push({ date: new Date().toISOString(), entry });
  fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2));
}

function exploreRandomly() {
  if (!bot.entity) return;
  const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10);
  const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10);
  const y = bot.entity.position.y;
  try {
    bot.pathfinder.setGoal(new GoalBlock(x, y, z));
  } catch (err) {
    console.log('⚠️ Goal change error:', err.message);
  }
}

async function evolveBot() {
  if (!bot.chat || typeof bot.chat !== 'function') return;
  const mcData = require('minecraft-data')(bot.version);
  const inventory = bot.inventory.items().map(i => i.name);
  const hasWood = inventory.includes('oak_log') || inventory.some(i => i.includes('_log'));
  const hasCraftingTable = inventory.includes('crafting_table');
  const hasPickaxe = inventory.some(i => i.includes('pickaxe'));

  const wood = bot.findBlock({
    matching: block => block && block.name.includes('_log'),
    maxDistance: 32
  });

  try {
    if (!hasWood && wood) {
      bot.chat('أبحث عن خشب وسأبدأ تكسيره!');
      await bot.pathfinder.goto(new GoalBlock(wood.position.x, wood.position.y, wood.position.z));
      await bot.dig(wood);
      return;
    }

    if (hasWood && !hasCraftingTable) {
      const recipe = mcData.recipes.craftingTable?.[0];
      if (recipe) {
        bot.chat('سأصنع طاولة التصنيع');
        await bot.craft(recipe, 1, null);
      }
      return;
    }

    if (hasWood && hasCraftingTable && !hasPickaxe) {
      const stone = bot.findBlock({
        matching: block => mcData.blocks[block.type].name === 'stone',
        maxDistance: 32
      });
      if (stone) {
        bot.chat('أبحث عن حجر لصنع فأس حجري');
        await bot.pathfinder.goto(new GoalBlock(stone.position.x, stone.position.y, stone.position.z));
      }
      return;
    }

    bot.chat('✅ مستعد للتطوير والمهام!');
    exploreRandomly();

  } catch (err) {
    console.log('❌ evolveBot error:', err.message);
  }
}

function createBot() {
  bot = mineflayer.createBot({ host, username, version });

  // Plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoeat);
  bot.loadPlugin(armorManager);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned');
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: []
    };
    bot.autoEat.enable();

    setInterval(() => {
      if (bot && bot.entity) evolveBot();
    }, 15000);
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

  bot.on('death', () => {
    deathCount++;
    logDiary('مات البوت مرة أخرى. عدد مرات الموت: ' + deathCount);
    if (deathCount >= 3 && bot.chat) bot.chat('🧠 أتعلم كيف أعيش أفضل!');
  });

  bot.on('kicked', (reason) => {
    console.log('🥿 Kicked:', reason);
    isConnecting = false;
    const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason);
    const match = reasonString.match(/wait (\d+) seconds?/i);
    if (match) reconnectDelay = parseInt(match[1]) * 1000;
    else reconnectDelay = Math.min(reconnectDelay + 2000, 15000);
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
