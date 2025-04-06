const mineflayer = require('mineflayer');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const autoeat = require('mineflayer-auto-eat');
const armorManager = require('mineflayer-armor-manager');
const express = require('express');
const util = require('util');
const ping = util.promisify(require('minecraft-server-util').ping);
const fs = require('fs');

// إعداد
const botOptions = {
  host: 'X234.aternos.me', // عدل حسب سيرفرك
  port: 13246,
  username: 'Wikko', // ثابت
  auth: 'offline',
  version: false
};

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (_, res) => res.send('Bot is alive'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

let bot;
let isConnecting = false;
let reconnectDelay = 5000;

// ====== بيفحص السيرفر قبل الاتصال ======
async function waitForServerReady() {
  let online = false;
  console.log('⏳ بنفحص إذا السيرفر شغال...');
  while (!online) {
    try {
      const res = await ping(botOptions.host, botOptions.port);
      if (res && res.players && res.players.online >= 0) {
        online = true;
        console.log('✅ السيرفر جاهز. بندخل...');
      }
    } catch {
      console.log('❌ السيرفر مش جاهز... إعادة المحاولة خلال 10 ثواني');
    }
    if (!online) await new Promise(res => setTimeout(res, 10000));
  }
}

// ====== إنشاء البوت ======
function createBot() {
  bot = mineflayer.createBot(botOptions);

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(autoeat);
  bot.loadPlugin(armorManager);

  bot.once('spawn', () => {
    console.log('✅ البوت دخل السيرفر');
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);
    bot.autoEat.options = {
      priority: 'foodPoints',
      startAt: 14,
      bannedFood: [],
    };
    bot.autoEat.enable();
    setTimeout(actHumanLike, 8000);
    setInterval(() => jumpToAvoidAFK(), 60000);
  });

  bot.on('death', () => {
    bot.chat('أنا راجع من الموت!');
  });

  bot.on('kicked', (reason) => {
    console.log('🦶 Kicked:', reason);
    isConnecting = false;
    const match = `${reason}`.match(/wait (\d+)/i);
    reconnectDelay = match ? parseInt(match[1]) * 1000 : Math.min(reconnectDelay + 2000, 15000);
    console.log(`🔁 محاولة إعادة الدخول خلال ${reconnectDelay / 1000} ثواني`);
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('end', () => {
    console.log('🔌 الاتصال انقطع');
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });

  bot.on('error', (err) => {
    console.log('❌ خطأ:', err.message);
    isConnecting = false;
    setTimeout(checkServerAndStart, reconnectDelay);
  });
}

// ====== تصرف طبيعي ======
function actHumanLike() {
  if (!bot || !bot.entity) return;

  const actions = [
    () => bot.setControlState('forward', true),
    () => bot.setControlState('back', true),
    () => bot.setControlState('left', true),
    () => bot.setControlState('right', true),
    () => bot.look(
      Math.random() * 2 * Math.PI - Math.PI,
      Math.random() * Math.PI - Math.PI / 2,
      true
    ),
    () => bot.setControlState('jump', true),
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

// ====== قفزة كل دقيقة ======
function jumpToAvoidAFK() {
  if (!bot || !bot.entity) return;
  bot.setControlState('jump', true);
  setTimeout(() => bot.setControlState('jump', false), 300);
}

// ====== تنفيذ البوت ======
async function checkServerAndStart() {
  if (isConnecting) return;
  isConnecting = true;
  await waitForServerReady();
  createBot();
}

checkServerAndStart();
