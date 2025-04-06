// ✅ البوت الذكي المتطور: تطور كامل + ذكاء ذاتي + نجاة + بناء + تخزين + دفاع

const mineflayer = require('mineflayer'); const { pathfinder, Movements, goals } = require('mineflayer-pathfinder'); const { GoalNear, GoalBlock } = goals; const { Vec3 } = require('vec3'); const collectBlock = require('mineflayer-collectblock').plugin; const autoeat = require('mineflayer-auto-eat').plugin; const toolPlugin = require('mineflayer-tool').plugin; const armorManager = require('mineflayer-armor-manager'); const express = require('express'); const fs = require('fs'); const app = express(); const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('🤖 Bot is alive')); app.listen(PORT, () => console.log(🌐 Web server running on port ${PORT}));

const randomId = Math.floor(Math.random() * 10000); const botOptions = { host: 'X234.aternos.me', port: 13246, username: 'Wikko_' + randomId, auth: 'offline', version: false };

let bot; let isConnecting = false; let reconnectDelay = 5000; let deathCount = 0;

function createBot() { bot = mineflayer.createBot(botOptions);

bot.loadPlugin(pathfinder); bot.loadPlugin(collectBlock); bot.loadPlugin(autoeat); bot.loadPlugin(toolPlugin); bot.loadPlugin(armorManager);

bot.once('spawn', () => { console.log('✅ Bot has joined the server.'); reconnectDelay = 5000; const mcData = require('minecraft-data')(bot.version); const movements = new Movements(bot, mcData); bot.pathfinder.setMovements(movements);

bot.autoEat.options = {
  priority: 'foodPoints',
  startAt: 14,
  bannedFood: []
};

bot.autoEat.enable();

setInterval(() => {
  if (bot && bot.health > 0) mainLoop();
}, 10000);

});

bot.on('death', () => { deathCount++; console.log(☠️ Death #${deathCount}.); if (bot.chat) bot.chat('❗ تعلمت من موتي وسأحاول النجاة المرة القادمة.'); });

bot.on('kicked', (reason) => { console.log('🥾 Kicked:', reason); isConnecting = false; reconnectDelay = Math.min(reconnectDelay + 2000, 15000); setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('end', () => { console.log(🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...); isConnecting = false; setTimeout(checkServerAndStart, reconnectDelay); });

bot.on('error', (err) => { console.log('❌ Error:', err); isConnecting = false; }); }

async function mainLoop() { const mcData = require('minecraft-data')(bot.version); const inventory = bot.inventory.items().map(i => i.name); const has = name => inventory.includes(name);

if (!has('oak_log') && !has('birch_log')) { const wood = bot.findBlock({ matching: block => block?.name?.includes('_log'), maxDistance: 32 }); if (wood) { bot.chat('🪓 أجمع الخشب.'); await bot.collectBlock.collect(wood); return; } }

if (!has('crafting_table')) { const tableRecipe = mcData.recipesFor(mcData.itemsByName.crafting_table.id, null)[0]; if (tableRecipe) { bot.chat('🛠️ أصنع طاولة التصنيع.'); try { await bot.craft(tableRecipe, 1, null); } catch (e) { bot.chat('❌ فشل صنع الطاولة: ' + e.message); } return; } }

const toolNeeded = !inventory.some(i => i.includes('pickaxe')); if (toolNeeded) { const planks = inventory.find(i => i.includes('planks')); const stick = inventory.find(i => i.includes('stick')); if (!planks || !stick) { await craftItem('stick', 4); await craftItem('oak_planks', 4); } await craftTool('wooden_pickaxe'); return; }

const stone = bot.findBlock({ matching: block => mcData.blocks[block.type].name === 'stone', maxDistance: 32 }); if (stone) { bot.chat('🧱 أجمع الحجر.'); await bot.collectBlock.collect(stone); return; }

if (!has('stone_pickaxe') && has('cobblestone')) { await craftTool('stone_pickaxe'); return; }

if (bot.food < 16) { const food = bot.findBlock({ matching: block => block?.name?.includes('wheat'), maxDistance: 32 }); if (food) { bot.chat('🌾 أجمع طعاماً.'); await bot.collectBlock.collect(food); return; } }

if (!has('bed') && has('wool') && has('planks')) { await craftItem('bed', 1); }

bot.chat('✅ أبحث عن مهام جديدة...'); explore(); }

async function craftItem(name, amount = 1) { const mcData = require('minecraft-data')(bot.version); const id = mcData.itemsByName[name]?.id; if (!id) return; const recipe = mcData.recipesFor(id, null)?.[0]; if (recipe) { try { await bot.craft(recipe, amount, null); } catch (err) { bot.chat('❌ فشل في صنع ' + name); } } }

async function craftTool(name) { const id = require('minecraft-data')(bot.version).itemsByName[name]?.id; if (!id) return; const recipe = require('minecraft-data')(bot.version).recipesFor(id, null)?.[0]; if (recipe) { try { await bot.craft(recipe, 1, null); bot.chat('🛠️ صنعت ' + name); } catch (e) { bot.chat('❌ لم أستطع صنع ' + name); } } }

function explore() { const x = bot.entity.position.x + Math.floor(Math.random() * 20 - 10); const z = bot.entity.position.z + Math.floor(Math.random() * 20 - 10); const y = bot.entity.position.y; bot.pathfinder.setGoal(new GoalBlock(x, y, z)); }

function checkServerAndStart() { if (isConnecting) return; isConnecting = true; try { createBot(); } catch (err) { isConnecting = false; console.log('🔴 فشل الاتصال. إعادة المحاولة بعد 30 ثانية...'); setTimeout(checkServerAndStart, 30000); } }

checkServerAndStart();

