const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Vec3 } = require('vec3');
const autoeat = require('mineflayer-auto-eat').plugin;
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// سيرفر Railway keep-alive
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// إعدادات السيرفر (عدّلهم)
const botOptions = {
  host: 'X234.aternos.me',
  port: 13246,
  username: 'X_NotTheRealOne',
  auth: 'offline',
  version: false
};

let bot;

function createBot() {
  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoeat);

  let defaultMove;
  let homePos;

  bot.once('spawn', () => {
    console.log('✅ Bot joined the server.');

    defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);

    // حفظ مكان البيت
    homePos = bot.entity.position.clone();

    // تفعيل الأكل التلقائي
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 16,
      bannedFood: []
    };

    // يبدأ في الاستكشاف والبناء
    exploreAndBuild();
  });

  function exploreAndBuild() {
    const x = bot.entity.position.x + (Math.random() * 15 - 7);
    const z = bot.entity.position.z + (Math.random() * 15 - 7);
    const y = bot.entity.position.y;

    const goal = new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    bot.pathfinder.setGoal(goal);

    setTimeout(() => {
      breakNearbyBlocks();
      if (Math.random() < 0.3) buildSimpleHouse(homePos);
      exploreAndBuild();
    }, 10000 + Math.random() * 5000);
  }

  function breakNearbyBlocks() {
    const types = ['log', 'stone', 'leaves', 'grass'];
    const blocks = bot.findBlocks({
      matching: block => types.some(type => block.name.includes(type)),
      maxDistance: 5,
      count: 1
    });

    if (blocks.length) {
      const target = bot.blockAt(blocks[0]);
      if (bot.canDigBlock(target)) {
        bot.dig(target).then(() => {
          console.log('كسر:', target.name);
        }).catch(err => console.log('فشل:', err.message));
      }
    }
  }

  // يبني كوخ خشبي بسيط عند homePos
  function buildSimpleHouse(pos) {
    const baseX = Math.floor(pos.x);
    const baseY = Math.floor(pos.y);
    const baseZ = Math.floor(pos.z);

    const width = 5, length = 5, height = 3;
    const blocks = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        blocks.push([x, y, 0]);
        blocks.push([x, y, length - 1]);
      }
    }
    for (let z = 1; z < length - 1; z++) {
      for (let y = 0; y < height; y++) {
        blocks.push([0, y, z]);
        blocks.push([width - 1, y, z]);
      }
    }
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        blocks.push([x, height, z]);
      }
    }

    placeBlocksSequentially(blocks, baseX, baseY, baseZ);
  }

  function placeBlocksSequentially(blocks, baseX, baseY, baseZ) {
    if (!blocks.length) return;
    const [x, y, z] = blocks.shift();
    const targetPos = new Vec3(baseX + x, baseY + y, baseZ + z);
    const referenceBlock = bot.blockAt(targetPos.offset(0, -1, 0));
    const wood = bot.inventory.items().find(item => item.name.includes('planks') || item.name.includes('log'));

    if (wood) {
      bot.equip(wood, 'hand').then(() => {
        bot.placeBlock(referenceBlock, new Vec3(0, 1, 0)).then(() => {
          setTimeout(() => placeBlocksSequentially(blocks, baseX, baseY, baseZ), 500);
        }).catch(() => placeBlocksSequentially(blocks, baseX, baseY, baseZ));
      });
    } else {
      console.log('مفيش خشب للبناء.');
    }
  }

  // يرجع البيت
  function returnHome() {
    if (!homePos) return;
    const goal = new goals.GoalBlock(
      Math.floor(homePos.x),
      Math.floor(homePos.y),
      Math.floor(homePos.z)
    );
    bot.pathfinder.setGoal(goal);
  }

  bot.on('death', () => {
    console.log('☠️ مات... بيحاول يرجع.');
  });

  bot.on('end', () => {
    console.log('❌ فصل... بيعيد الدخول.');
    setTimeout(createBot, 5000);
  });

  bot.on('kicked', reason => {
    console.log('⛔ طُرد:', reason);
  });

  bot.on('error', err => {
    console.log('Error:', err);
  });

  bot.on('chat', (username, message) => {
    if (message === 'رجع') returnHome();
    if (message === 'بيت') buildSimpleHouse(bot.entity.position);
  });
}

createBot();
