const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const TelegramBot = require('node-telegram-bot-api');

// 1. إعدادات التلغرام (المعلومات الجديدة)
const telegramConfig = {
  token: '8730870165:AAFJNe83OgqWtAlwMnuMKkiSvzTOwC1lQU4', 
  chatId: '8288001731'   
};
// تحسين الاتصال بالتلغرام لتجنب التوقف
const botTelegram = new TelegramBot(telegramConfig.token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

const config = {
  server: { host: '193.56.156.142', port: 45379, version: '1.21.1' },
  bot: { username: 'MyNewAFK24_bot', authmePassword: '7654321' },
  features: {
    autoReconnect: { enabled: true, delay: 30000 }, 
    antiAFK: { enabled: true, interval: 15000 }
  }
};

let bot;
let authmeCompleted = false;

function createBot() {
  // تنظيف الذاكرة والجلسات القديمة
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
    checkTimeoutInterval: 90000
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
      botTelegram.sendMessage(telegramConfig.chatId, `💬 ${message}`).catch(() => {});
    }
  });

  // --- الدخول التلقائي ---
  bot.once('spawn', () => {
    console.log(`✅ البوت الجديد دخل.. ننتظر الاستقرار`);
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

  // --- معالجة الأخطاء ---
  bot.on('error', (err) => {
    console.log(`⚠️ خطأ في البوت: ${err.message}`);
    setTimeout(createBot, config.features.autoReconnect.delay);
  });

  bot.on('end', () => {
    console.log("📡 انقطع الاتصال.. جاري إعادة المحاولة خلال 30 ثانية.");
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

// درع حماية لمنع انهيار البرنامج
process.on('uncaughtException', (err) => {
    if (err.message.includes('409 Conflict')) {
        console.log('❌ تداخل في التلغرام: تأكد من إغلاق تيرموكس وعمل Clear Cache في Render.');
    } else {
        console.log('🛡️ درع الحماية: ' + err);
    }
});

createBot();
