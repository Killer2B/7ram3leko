const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const autoeat = require('mineflayer-auto-eat');
const armorManager = require('mineflayer-armor-manager');
const express = require('express');
const fs = require('fs');

// ====== إعداد البوت والسيرفر ======
const botOptions = {
  host: 'X234.aternos.me',
  port: 13246,
  username: 'Wikko', // ثابت ومش متغير
  auth: 'offline',
  version: false,
};

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

let bot;
let isConnecting = false;
let reconnectDelay = 5000;

// ====== إنشاء البوت ======
function createBot() {
  bot = mineflayer.createBot(botOptions);

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
      bannedFood: [],
    };
    bot.autoEat.enable();

    // تصرف عشوائي واقعي
    setTimeout(actHumanLike, 8000);
    setInterval(() => jumpToAvoidAFK(), 60 * 1000);
  });

  bot.on('death', () => {
    bot.chat('رجعت من الموت!');
  });

  bot.on('kicked', (reason) => {
    console.log('🦶 Kicked:', reason);
    isConnecting = false;
    const reasonStr = typeof reason === 'string' ? reason : JSON.stringify(reason);
    const match = reasonStr.match(/wait (\d+) seconds?/i);
    reconnectDelay = match ? parseInt(match[1]) * 1000 : Math.min(reconnectDelay + 2000, 15000);
    console.log(`🔁 إعادة الاتصال خلال ${reconnectDelay / 1000}s...`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('end', () => {
    console.log('🔌 الاتصال انتهى.');
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❌ خطأ:', err.message);
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });
}

// ====== تصرفات بشرية عشوائية ======
function actHumanLike() {
  if (!bot || !bot.entity) return;

  const actions = [
    () => bot.setControlState('forward', true),
    () => bot.setControlState('back', true),
    () => bot.setControlState('left', true),
    () => bot.setControlState('right', true),
    () => bot.setControlState('jump', true),
    () => bot.look(
      Math.random() * 2 * Math.PI - Math.PI,
      Math.random() * Math.PI - Math.PI / 2,
      true
    ),
    () => bot.setControlState('sprint', Math.random() > 0.5),
    () => {}, // وقوف
  ];

  const action = actions[Math.floor(Math.random() * actions.length)];
  action();

  setTimeout(() => {
    bot.clearControlStates();
    if (Math.random() > 0.3) {
      setTimeout(actHumanLike, Math.random() * 10000 + 3000);
    }
  }, Math.random() * 1500 + 500);
}

// ====== قفزة بسيطة عشان Aternos ما يطردوش ======
function jumpToAvoidAFK() {
  if (!bot || !bot.entity) return;
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 500);
}

// ====== تشغيل البوت ======
function checkServerAndStart() {
  if (isConnecting) return;
  isConnecting = true;
  console.log('⏳ جاري تشغيل البوت...');
  createBot();
}

checkServerAndStart();
