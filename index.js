const mineflayer = require('mineflayer'); const { pathfinder, Movements, goals } = require('mineflayer-pathfinder'); const { GoalBlock, GoalNear } = goals; const autoeat = require('mineflayer-auto-eat'); const armorManager = require('mineflayer-armor-manager'); const express = require('express'); const fs = require('fs');

const app = express(); const PORT = process.env.PORT || 3000; app.get('/', (req, res) => res.send('Bot is alive')); app.listen(PORT, () => console.log('Web server running on port ${PORT}'));

const botOptions = { host: 'X234.aternos.me', port: 13246, username: 'wikko', auth: 'offline', version: false };

const diaryFile = './diary.json'; const memoryFile = './memory.json'; let bot; let reconnectDelay = 5000; let isConnecting = false; let deathCount = 0; let taskQueue = []; let isWorking = false;

const knownLocations = { villages: [], resources: {} }; if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2)); if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) { const diary = JSON.parse(fs.readFileSync(diaryFile)); diary.push({ date: new Date().toISOString(), entry }); fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2)); }

function addTask(task) { taskQueue.push(task); if (!isWorking) runNextTask(); }

async function runNextTask() { if (taskQueue.length === 0) { isWorking = false; return; } isWorking = true; const task = taskQueue.shift(); try { await task(); } catch (err) { console.log('❌ Task error:', err.message); } runNextTask(); }

function exploreRandomly() { if (!bot.entity) return; const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10); const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10); const y = bot.entity.position.y; addTask(async () => { bot.chat('أستكشف المنطقة...'); await bot.pathfinder.goto(new GoalBlock(x, y, z)); }); }

async function evolveBot() { if (isWorking || !bot.chat || typeof bot.chat !== 'function') return; isWorking = true;

try { const mcData = require('minecraft-data')(bot.version); const inventory = bot.inventory.items().map(i => i.name); const hasWood = inventory.includes('oak_log') || inventory.some(i => i.includes('_log')); const hasCraftingTable = inventory.includes('crafting_table'); const hasPickaxe = inventory.some(i => i.includes('pickaxe')); const wood = bot.findBlock({ matching: block => block && block.name.includes('_log'), maxDistance: 32 });

if (!hasWood && wood) {
  addTask(async () => {
    bot.chat('أبحث عن خشب...');
    await bot.pathfinder.goto(new GoalBlock(wood.position.x, wood.position.y, wood.position.z));
    await bot.dig(wood);
  });
  return;
}

if (hasWood && !hasCraftingTable) {
  const recipe = mcData.recipes.craftingTable?.[0];
  if (recipe) {
    addTask(async () => {
      bot.chat('أصنع طاولة تصنيع...');
      await bot.craft(recipe, 1, null);
    });
  }
  return;
}

if (hasWood && hasCraftingTable && !hasPickaxe) {
  const stone = bot.findBlock({ matching: block => mcData.blocks[block.type].name === 'stone', maxDistance: 32 });
  if (stone) {
    addTask(async () => {
      bot.chat('أبحث عن حجر...');
      await bot.pathfinder.goto(new GoalBlock(stone.position.x, stone.position.y, stone.position.z));
    });
  }
  return;
}

bot.chat('✅ مستعد لمهام جديدة!');
exploreRandomly();

} catch (err) { console.log('❌ evolveBot error:', err.message); }

isWorking = false; }

function createBot() { bot = mineflayer.createBot(botOptions);

bot.loadPlugin(pathfinder); bot.loadPlugin(autoeat); bot.loadPlugin(armorManager);

bot.once('spawn', () => { console.log('✅ Bot spawned'); const mcData = require('minecraft-data')(bot.version); const defaultMove = new Movements(bot, mcData); bot.pathfinder.setMovements(defaultMove); bot.autoEat.options = { priority: 'foodPoints', startAt: 14, bannedFood: [] }; bot.autoEat.enable();

setInterval(() => {
  if (bot && bot.entity && !isWorking) evolveBot();
}, 15000);

});

bot.on('chat', (username, message) => { if (username === bot.username) return; if (message === 'تعال') { const player = bot.players[username]; if (!player || !player.entity) { bot.chat('لا أراك'); return; } const goal = new GoalNear(player.entity.position.x, player.entity.position.y, player.entity.position.z, 1); addTask(async () => { bot.chat('أنا قادم إليك'); await bot.pathfinder.goto(goal); }); } });

bot.on('death', () => { deathCount++; logDiary('مات البوت. عدد الوفيات: ' + deathCount); if (deathCount >= 3) bot.chat('أتعلم من أخطائي'); });

bot.on('kicked', (reason) => { console.log('🦶 Kicked:', reason); isConnecting = false; const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason); const match = reasonString.match(/wait (\d+) seconds?/i); reconnectDelay = match ? parseInt(match[1]) * 1000 : Math.min(reconnectDelay + 2000, 15000); console.log('🔁 إعادة الاتصال خلال' ${reconnectDelay / 1000}s...); setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('end', () => { console.log('🔌 انتهى الاتصال.'); isConnecting = false; setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('error', (err) => { console.log('❌ خطأ:', err.message); isConnecting = false; setTimeout(checkServerAndStart, reconnectDelay); }); }

function checkServerAndStart() { if (isConnecting) return; isConnecting = true; console.log('⏳ جاري تشغيل البوت...'); createBot(); }

checkServerAndStart();

