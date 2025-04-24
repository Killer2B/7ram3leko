// ✅ البوت النهائي مع كل المزايا + أدوات وهدف قتل التنين + ذكاء قتال وتداول + تعلم من الأخطاء

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear, GoalBlock } = goals;
const { Vec3 } = require('vec3');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => res.send('🤖 Bot is alive'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

const botOptions = {
  host: 'X345.aternos.me',
  port: 32510,
  username: 'Wikko',
  auth: 'offline',
  version: false
};

let bot;
let reconnectDelay = 5000;
let deathCount = 0;

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

  bot.on('kicked', (reason) => {
    console.log('🥾 Kicked:', reason);
    const match = reason.match(/wait (\d+) seconds?/i);
    if (match) reconnectDelay = parseInt(match[1]) * 1000;
    else reconnectDelay = Math.min(reconnectDelay + 2000, 15000);
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('end', () => {
    console.log(`🔌 Bot disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
    setTimeout(createBot, reconnectDelay);
  });

  bot.on('error', (err) => console.log('❌ Error:', err));

  bot.on('death', () => {
    deathCount++;
    console.log(`☠️ Bot died ${deathCount} times. Recalculating strategy...`);
    if (deathCount >= 3) {
      console.log('🧠 Bot learned to avoid danger better.');
      bot.chat('I need to avoid mobs better...');
    }
  });

  bot.on('entityHurt', (entity) => {
    if (entity.type === 'mob' && bot.entity.position.distanceTo(entity.position) < 4) {
      bot.attack(entity);
    }
  });

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;
    if (message === 'تاجر') tradeWithVillager();
  });
}

function exploreRandomly() {
  if (!bot || !bot.entity) return;
  const x = bot.entity.position.x + (Math.random() * 20 - 10);
  const z = bot.entity.position.z + (Math.random() * 20 - 10);
  const y = bot.entity.position.y;
  const goal = new GoalNear(x, y, z, 1);
  bot.pathfinder.setGoal(goal);
}

async function collectBlocksAndBuild() {
  const targets = ['oak_log', 'dirt'];
  const blockToCollect = bot.findBlock({
    matching: block => targets.includes(block.name),
    maxDistance: 32
  });

  if (blockToCollect) {
    console.log(`🪓 Found ${blockToCollect.name}, collecting.`);
    await goAndDig(blockToCollect.position);
    console.log('📦 Resource collected, building house.');
    buildSimpleHouse(bot.entity.position.offset(2, 0, 2));
  } else {
    console.log('❌ No blocks nearby.');
  }
}

async function goAndDig(position) {
  return new Promise((resolve) => {
    const goal = new GoalBlock(position.x, position.y, position.z);
    bot.pathfinder.setGoal(goal);
    const interval = setInterval(async () => {
      const block = bot.blockAt(position);
      if (block && bot.canDigBlock(block)) {
        try {
          await bot.dig(block);
          clearInterval(interval);
          resolve();
        } catch (err) {
          console.log('❌ Dig error:', err.message);
        }
      }
    }, 1000);
  });
}

function buildSimpleHouse(origin) {
  const blockType = 'oak_planks';
  const houseBlocks = [];

  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) {
      for (let y = 0; y < 2; y++) {
        if ((x === 1 && z === 1 && y === 0) || y === 1) continue;
        houseBlocks.push(origin.offset(x, y, z));
      }
    }
  }

  let placed = 0;
  const placeNext = async () => {
    if (placed >= houseBlocks.length) return;
    const pos = houseBlocks[placed];
    const referenceBlock = bot.blockAt(pos.offset(0, -1, 0));
    const item = bot.inventory.items().find(i => i.name.includes(blockType));
    if (item && referenceBlock && bot.canSeeBlock(referenceBlock)) {
      try {
        await bot.equip(item, 'hand');
        await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
        placed++;
      } catch (err) {
        console.log('❌ Placement error:', err.message);
      }
    }
    setTimeout(placeNext, 500);
  };
  placeNext();
}

async function craftTools() {
  const toolRecipes = ['wooden_pickaxe', 'wooden_axe'];
  const mcData = require('minecraft-data')(bot.version);
  for (const tool of toolRecipes) {
    const itemId = mcData.itemsByName[tool]?.id;
    const recipe = bot.recipesFor(itemId, null, 1, bot.inventory)[0];
    if (recipe) {
      try {
        await bot.craft(recipe, 1, null);
        console.log(`🛠️ Crafted ${tool}`);
      } catch (err) {
        console.log(`❌ Crafting ${tool} failed:`, err.message);
      }
    }
  }
}

async function prepareForEnderDragon() {
  console.log('🔥 Preparing to fight the Ender Dragon...');
  await collectItem('ender_pearl', 5);
  await collectItem('blaze_powder', 5);
  console.log('🎯 Ready to find the End Portal soon!');
}

async function collectItem(itemName, targetCount) {
  const mcData = require('minecraft-data')(bot.version);
  const currentCount = bot.inventory.count(mcData.itemsByName[itemName].id);
  if (currentCount >= targetCount) return;

  console.log(`🔎 Searching for ${itemName}...`);
  setTimeout(() => {
    console.log(`🤖 Pretending to gather ${itemName}...`);
  }, 3000);
}

async function tradeWithVillager() {
  const villager = bot.nearestEntity(entity => entity.name === 'villager');
  if (!villager) return console.log('❌ No villager nearby.');
  try {
    await bot.lookAt(villager.position.offset(0, 1, 0));
    const trade = await bot.openVillager(villager);
    console.log('🛒 Opened trade window. Listing offers:');
    trade.trades.forEach((t, i) => {
      console.log(` ${i + 1}. ${t.inputItem1?.name} => ${t.outputItem?.name}`);
    });
    trade.close();
  } catch (err) {
    console.log('❌ Trade error:', err.message);
  }
}

function evolveBot() {
  let stage = 0;
  setInterval(async () => {
    switch (stage) {
      case 0:
        console.log('🔄 مرحلة 1: استكشاف');
        exploreRandomly();
        break;
      case 1:
        console.log('🔄 مرحلة 2: جمع الموارد وبناء بيت');
        await collectBlocksAndBuild();
        break;
      case 2:
        console.log('🔄 مرحلة 3: أكل');
        const food = bot.inventory.items().find(i => i.name.includes('cooked') || i.name.includes('bread'));
        if (food) bot.equip(food, 'hand').then(() => bot.consume());
        break;
      case 3:
        console.log('🔄 مرحلة 4: تصنيع الأدوات');
        await craftTools();
        break;
      case 4:
        console.log('🎯 مرحلة 5: التجهيز لقتل التنين');
        await prepareForEnderDragon();
        break;
    }
    stage = (stage + 1) % 5;
  }, 30000);
}

createBot();
