const mineflayer = require('mineflayer'); const { pathfinder, Movements, goals } = require('mineflayer-pathfinder'); const { GoalBlock } = goals; const { Vec3 } = require('vec3'); const express = require('express'); const fs = require('fs');

const app = express(); const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('Bot is alive')); app.listen(PORT, () => console.log(Web server running on port ${PORT}));

const randomId = Math.floor(Math.random() * 10000); const botOptions = { host: 'X234.aternos.me', port: 13246, username: 'Wikko_' + randomId, auth: 'offline', version: false };

let bot; let reconnectDelay = 5000; let deathCount = 0; let isConnecting = false; let isBusy = false;

const knownLocations = { villages: [], resources: {} }; const diaryFile = './diary.json'; const memoryFile = './memory.json';

if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2)); if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) { const diary = JSON.parse(fs.readFileSync(diaryFile)); diary.push({ date: new Date().toISOString(), entry }); fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2)); }

function saveMemory() { fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2)); }

async function evolveBot() { if (!bot.chat || typeof bot.chat !== 'function' || isBusy) return; isBusy = true;

const mcData = require('minecraft-data')(bot.version); const inventory = bot.inventory.items().map(i => i.name); const hasWood = inventory.includes('oak_log') || inventory.some(i => i.includes('_log')); const hasCraftingTable = inventory.includes('crafting_table'); const hasPickaxe = inventory.some(i => i.includes('pickaxe'));

const wood = bot.findBlock({ matching: block => block && block.name.includes('_log'), maxDistance: 32 });

try { if (!hasWood && wood) { bot.chat('أبحث عن خشب وسأبدأ تكسيره!'); await bot.pathfinder.goto(new GoalBlock(wood.position.x, wood.position.y, wood.position.z)); await bot.dig(wood); return; }

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

} catch (err) { console.log('❌ evolveBot error:', err.message); } finally { isBusy = false; } }

function exploreRandomly() { if (!bot.entity) return; const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10); const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10); const y = bot.entity.position.y; try { bot.pathfinder.setGoal(new GoalBlock(x, y, z)); } catch (err) { console.log('⚠️ Goal change error:', err.message); } }

function createBot() { bot = mineflayer.createBot(botOptions); bot.loadPlugin(pathfinder);

bot.once('spawn', () => { console.log('✅ Bot has joined the server.'); reconnectDelay = 5000; const mcData = require('minecraft-data')(bot.version); const defaultMove = new Movements(bot, mcData); bot.pathfinder.setMovements(defaultMove);

setInterval(() => {
  if (bot && bot.entity) evolveBot();
}, 15000);

});

bot.on('goal_reached', () => { console.log('🎯 الهدف تم الوصول إليه! اختيار هدف جديد ...'); exploreRandomly(); });

bot.on('kicked', (reason) => { console.log('🥾 Kicked:', reason); isConnecting = false; const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason); const match = reasonString.match(/wait (\d+) seconds?/i); if (match) reconnectDelay = parseInt(match[1]) * 1000; else reconnectDelay = Math.min(reconnectDelay + 2000, 15000); console.log(🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...); setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('end', () => { console.log(🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...); isConnecting = false; setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('error', (err) => { console.log('❌ Error:', err); isConnecting = false; if (err.code === 'ECONNRESET') { console.log('🔁 تم قطع الاتصال، سيتم إعادة الاتصال خلال ثوانٍ ...'); setTimeout(checkServerAndStart, reconnectDelay); } });

bot.on('death', () => { deathCount++; logDiary('مات البوت مرة أخرى. عدد مرات الموت: ' + deathCount); if (deathCount >= 3 && bot.chat) bot.chat('🧠 أتعلم كيف أعيش أفضل!'); });

bot.on('entityHurt', (entity) => { if (!bot.entity || !entity?.position) return; if (entity.type === 'player' && entity.username !== bot.username) { const dist = bot.entity.position.distanceTo(entity.position); if (dist < 4) { if (bot.chat) bot.chat('⚔️ لا تقترب مني!'); bot.attack(entity); } } });

bot.on('chat', (username, message) => { if (username === bot.username) return; const command = message.trim().toLowerCase(); // يمكن إضافة أوامر مخصصة لاحقًا هنا }); }

function checkServerAndStart() { if (isConnecting) return; isConnecting = true;

try { createBot(); } catch (err) { isConnecting = false; console.log('🔴 السيرفر غير متاح حالياً. إعادة المحاولة بعد 30 ثانية...'); setTimeout(checkServerAndStart, 30000); } }

checkServerAndStart();

