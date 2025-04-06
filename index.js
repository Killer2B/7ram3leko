// ✅ البوت الكامل المتطور: تطور تدريجي + أدوات + ذكاء اصطناعي شامل + مهام نجاة واقعية

const mineflayer = require('mineflayer'); const { pathfinder, Movements, goals } = require('mineflayer-pathfinder'); const { GoalNear, GoalBlock } = goals; const { Vec3 } = require('vec3'); const express = require('express'); const fs = require('fs'); const app = express(); const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('🤖 Bot is alive')); app.listen(PORT, () => console.log(🌐 Web server running on port ${PORT}));

const randomId = Math.floor(Math.random() * 10000); const botOptions = { host: 'X234.aternos.me', port: 13246, username: 'Wikko_' + randomId, auth: 'offline', version: false };

let bot; let reconnectDelay = 5000; let deathCount = 0; const knownLocations = { villages: [], resources: {} }; const diaryFile = './diary.json'; const memoryFile = './memory.json'; let isConnecting = false;

if (!fs.existsSync(memoryFile)) fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2)); if (!fs.existsSync(diaryFile)) fs.writeFileSync(diaryFile, JSON.stringify([], null, 2));

function logDiary(entry) { const diary = JSON.parse(fs.readFileSync(diaryFile)); diary.push({ date: new Date().toISOString(), entry }); fs.writeFileSync(diaryFile, JSON.stringify(diary, null, 2)); }

function saveMemory() { fs.writeFileSync(memoryFile, JSON.stringify(knownLocations, null, 2)); }

async function evolveBot() { if (!bot.chat || typeof bot.chat !== 'function') return;

const mcData = require('minecraft-data')(bot.version); const inventory = bot.inventory.items().map(i => i.name);

const hasLogs = inventory.some(i => i.includes('_log')); const hasPlanks = inventory.some(i => i.includes('_planks')); const hasCraftingTable = inventory.includes('crafting_table'); const hasPickaxe = inventory.some(i => i.includes('pickaxe')); const hasFurnace = inventory.includes('furnace'); const hasBed = inventory.includes('white_bed'); const hasFood = inventory.some(i => i.includes('cooked') || i.includes('beef') || i.includes('bread')); const toolTiers = ['wooden', 'stone', 'iron', 'diamond', 'netherite'];

const woodBlock = bot.findBlock({ matching: block => block?.name.includes('_log'), maxDistance: 32 }); const stoneBlock = bot.findBlock({ matching: block => mcData.blocks[block.type].name === 'stone', maxDistance: 32 });

if (!hasLogs && woodBlock) { bot.chat('🪓 أبحث عن خشب...'); await goToAndDig(woodBlock); return; }

if (hasLogs && !hasPlanks) { bot.chat('🪵 بصنع الألواح من الخشب'); const planksRecipe = mcData.recipesFor('oak_planks', null, 1)[0]; if (planksRecipe) await safeCraft(planksRecipe, 4); return; }

if (hasPlanks && !hasCraftingTable) { bot.chat('🛠️ بصنع طاولة التصنيع'); const tableRecipe = mcData.recipesFor('crafting_table', null, 1)[0]; if (tableRecipe) await safeCraft(tableRecipe, 1); return; }

if (hasCraftingTable && !hasPickaxe) { bot.chat('🪨 بصنع فأس خشبي للبدء بالحفر'); const woodPick = mcData.recipesFor('wooden_pickaxe', null, 1)[0]; if (woodPick) await safeCraft(woodPick, 1); return; }

if (hasPickaxe && stoneBlock && !inventory.some(i => i.includes('stone_pickaxe'))) { bot.chat('⛏️ بحصد حجر لصنع أدوات حجرية'); await goToAndDig(stoneBlock); const stonePick = mcData.recipesFor('stone_pickaxe', null, 1)[0]; if (stonePick) await safeCraft(stonePick, 1); return; }

// تطوير للأسلحة والدروع والبيت والطعام والسرير لاحقًا bot.chat('✅ أكملت الأساسيات! أبدأ مرحلة النجاة والتطور...'); exploreRandomly(); }

async function goToAndDig(block) { try { await bot.pathfinder.goto(new GoalBlock(block.position.x, block.position.y, block.position.z)); await bot.dig(block); } catch (err) { bot.chat('❌ تعذر الوصول إلى الكتلة أو كسرها: ' + err.message); } }

async function safeCraft(recipe, amount) { try { await bot.craft(recipe, amount, null); } catch (err) { bot.chat('❌ فشل في الصنع: ' + err.message); } }

function exploreRandomly() { if (!bot.entity) return; const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10); const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10); const y = bot.entity.position.y; bot.pathfinder.setGoal(new GoalBlock(x, y, z)); }

function createBot() { bot = mineflayer.createBot(botOptions); bot.loadPlugin(pathfinder);

bot.once('spawn', async () => { console.log('✅ Bot has joined the server.'); reconnectDelay = 5000; const mcData = require('minecraft-data')(bot.version); const defaultMove = new Movements(bot, mcData); bot.pathfinder.setMovements(defaultMove);

setInterval(() => {
  if (bot.entity) evolveBot();
}, 15000);

});

bot.on('goal_reached', () => { console.log('🎯 الهدف تم الوصول إليه!'); exploreRandomly(); });

bot.on('kicked', (reason) => { console.log('🥾 Kicked:', reason); isConnecting = false; const reasonString = typeof reason === 'string' ? reason : JSON.stringify(reason); const match = reasonString.match(/wait (\d+) seconds?/i); if (match) reconnectDelay = parseInt(match[1]) * 1000; else reconnectDelay = Math.min(reconnectDelay + 2000, 15000); console.log(🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...); setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('end', () => { console.log(🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...); isConnecting = false; setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('error', (err) => { console.log('❌ Error:', err); isConnecting = false; if (err.code === 'ECONNRESET') { console.log('🔁 تم قطع الاتصال، سيتم إعادة الاتصال خلال ثوانٍ ...'); setTimeout(checkServerAndStart, reconnectDelay); } });

bot.on('death', () => { deathCount++; logDiary('مات البوت. عدد مرات الموت: ' + deathCount); if (deathCount >= 3 && bot.chat) bot.chat('🧠 أتعلم كيف أعيش أفضل!'); });

bot.on('entityHurt', (entity) => { if (!bot.entity || !entity?.position) return; const dist = bot.entity.position.distanceTo(entity.position); if ((entity.type === 'player' || entity.type === 'mob') && dist < 4) { if (bot.chat) bot.chat('⚔️ دفاع تلقائي!'); bot.attack(entity); } });

bot.on('chat', (username, message) => { if (username === bot.username) return; const command = message.trim().toLowerCase(); // أوامر مستقبلية }); }

async function checkServerAndStart() { if (isConnecting) return; isConnecting = true;

try { createBot(); } catch (err) { isConnecting = false; console.log('🔴 السيرفر غير متاح. إعادة المحاولة بعد 30 ثانية...'); setTimeout(checkServerAndStart, 30000); } }

checkServerAndStart();

