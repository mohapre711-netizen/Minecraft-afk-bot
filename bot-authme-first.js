const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const TelegramBot = require('node-telegram-bot-api');

// إعدادات التلغرام
const telegramConfig = {
  token: '8696372248:AAHwMz-fkfpT3Safhf_OGy05duNu91ds7uo', 
  chatId: '8288001731'   
};
const botTelegram = new TelegramBot(telegramConfig.token, {polling: true});

const config = {
  server: { host: '193.56.156.142', port: 45379, version: '1.21.1' },
  bot: { username: 'afk_bot_24', authmePassword: '7654321' },
  features: {
    // زيادة وقت الانتظار لـ 30 ثانية لتجنب الـ Throttling الموضح في صورة 24093
    autoReconnect: { enabled: true, delay: 30000 }, 
    antiAFK: { enabled: true, interval: 15000 }
  }
};

let bot;
let authmeCompleted = false;

function createBot() {
  // 1. تنظيف الذاكرة بشكل جذري قبل كل محاولة جديدة (حل Heap Out of Memory)
  if (bot) {
    bot.removeAllListeners();
    try { bot.end(); } catch (e) {}
    bot = null;
  }

  bot = mineflayer.createBot({
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    version: config.server.version,
    auth: 'offline',
    checkTimeoutInterval: 90000 // رفع وقت فحص الاتصال
  });

  bot.loadPlugin(pathfinder);

  // --- التحكم من تلغرام ---
  botTelegram.on('message', (msg) => {
    const text = msg.text;
    if (!text || text === '/start') return; 
    if (bot && bot._client && bot._client.state === 'play') {
      bot.chat(text);
    }
  });

  // --- نقل الشات لتلغرام ---
  bot.on('message', (jsonMsg) => {
    const message = jsonMsg.toString();
    if (message.includes(config.bot.username)) return;
    if (message.trim().length > 0) {
      botTelegram.sendMessage(telegramConfig.chatId, `💬 ${message}`);
    }
  });

  // --- الدخول التلقائي مع فحص الأمان ---
  bot.once('spawn', () => {
    console.log(`✅ البوت دخل.. ننتظر الاستقرار`);
    authmeCompleted = false;
    setTimeout(() => {
        if (bot && bot._client && bot._client.state === 'play') {
            bot.chat(`/login ${config.bot.authmePassword}`);
            console.log("🔑 تم إرسال كلمة السر.");
        }
    }, 8000); 
  });

  bot.on('chat', (username, message) => {
    if (message.toLowerCase().includes('successfully') || message.toLowerCase().includes('logged in')) {
      if (!authmeCompleted) {
          authmeCompleted = true;
          startBotActivities();
      }
    }
  });

  // --- معالجة الأخطاء الذكية لتقليل الضغط على السيرفر والذاكرة ---
  bot.on('error', (err) => {
    console.log(`⚠️ خطأ: ${err.message}`);
    // إذا كان السيرفر يرفضك (Throttled)، ننتظر وقتاً أطول (60 ثانية)
    let waitTime = config.features.autoReconnect.delay;
    if (err.message.includes('throttled')) {
        console.log("⏳ السيرفر يرفض الاتصال السريع، سننتظر دقيقة كاملة...");
        waitTime = 60000;
    }
    setTimeout(createBot, waitTime);
  });

  bot.on('end', () => {
    console.log("📡 انقطع الاتصال.. جاري إعادة المحاولة.");
    setTimeout(createBot, config.features.autoReconnect.delay);
  });
}

function startBotActivities() {
    setInterval(() => {
      if (!bot || !bot.entity) return;
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 200);
      bot.look((Math.random() - 0.5) * Math.PI * 2, (Math.random() - 0.5) * Math.PI / 2);
    }, config.features.antiAFK.interval);
}

// درع حماية يمنع انهيار البرنامج عند أي خطأ غير متوقع
process.on('uncaughtException', (err) => console.log('🛡️ درع الحماية: ' + err));

createBot();

        
