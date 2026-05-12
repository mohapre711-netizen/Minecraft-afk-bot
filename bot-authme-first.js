const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// Configuration - تم تعديل البيانات بناءً على طلبك
const config = {
  server: {
    host: 'MM2BXS3.aternos.me', // عنوان سيرفرك المعدل
    port: 45379,               // البورت المعدل
    version: '1.21.1'          // الإصدار المستهدف
  },
  bot: {
    username: 'afk_bot_24',    // اسم البوت الجديد
    auth: 'offline', 
    password: '', 
    authmePassword: '7654321'  // الباسورد الجديد
  },
  serverCommands: {
    enabled: false,            // خليته معطل لو ما عندك نظام انتقال بين سيرفرات
    joinServer: '/server survival', 
    delay: 3000 
  },
  features: {
    autoReconnect: {
      enabled: true,
      delay: 5000
    },
    movement: {
      enabled: false,          // معطل افتراضياً عشان ما يتحرك لمكان غلط
      coordinates: { x: 0, y: 64, z: 0 }
    },
    antiAFK: {
      enabled: true,
      jump: true,
      sneak: false,
      look: true,
      interval: 30000 // كل 30 ثانية يسوي حركة
    },
    chatMessages: {
      enabled: false,
      interval: 300000,
      messages: ['Still here!', 'AFK farming...']
    },
    chatLog: {
      enabled: true
    }
  }
};

let bot;
let isAuthenticated = false;
let loginAttempts = 0;
let serverJoined = false;
let authmeCompleted = false;
const maxLoginAttempts = 3;

function createBot() {
  console.log('🤖 جاري تشغيل البوت...');
  
  const botOptions = {
    host: config.server.host,
    port: config.server.port,
    username: config.bot.username,
    version: config.server.version,
    hideErrors: false
  };

  botOptions.auth = 'offline';

  bot = mineflayer.createBot(botOptions);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ دخل البوت ${bot.username} للسيرفر بنجاح!`);
    isAuthenticated = false;
    loginAttempts = 0;
    serverJoined = false;
    authmeCompleted = false;
    
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    console.log('📋 الخطوة 1: جاري تسجيل الدخول (AuthMe)...');
    setTimeout(() => {
      attemptAuthMeLogin();
    }, 3000);
  });

  bot.on('chat', (username, message) => {
    if (config.features.chatLog.enabled && username !== bot.username) {
      console.log(`💬 [${username}] ${message}`);
    }

    if (username === bot.username) return;
    const lowerMessage = message.toLowerCase();
    
    if ((lowerMessage.includes('register') || lowerMessage.includes('/register'))) {
      console.log('🔐 السيرفر يطلب تسجيل (Register)');
      bot.chat(`/register ${config.bot.authmePassword} ${config.bot.authmePassword}`);
    }
    else if ((lowerMessage.includes('login') || lowerMessage.includes('/login'))) {
      console.log('🔑 السيرفر يطلب تسجيل دخول (Login)');
      bot.chat(`/login ${config.bot.authmePassword}`);
      loginAttempts++;
    }
    else if (lowerMessage.includes('successfully') || lowerMessage.includes('logged in')) {
      console.log('✅ تم تسجيل الدخول بنجاح!');
      authmeCompleted = true;
      startBotActivities();
    }
  });

  bot.on('error', (err) => console.error('❌ خطأ في البوت:', err.message));
  bot.on('kicked', (reason) => {
    console.log('⚠️ تم طرد البوت:', reason);
    if (config.features.autoReconnect.enabled) setTimeout(createBot, config.features.autoReconnect.delay);
  });
  bot.on('end', () => {
    console.log('🔌 انقطع الاتصال');
    if (config.features.autoReconnect.enabled) setTimeout(createBot, config.features.autoReconnect.delay);
  });

  return bot;
}

function attemptAuthMeLogin() {
  if (authmeCompleted) return;
  bot.chat(`/login ${config.bot.authmePassword}`);
  setTimeout(() => {
    if (!authmeCompleted) bot.chat(`/register ${config.bot.authmePassword} ${config.bot.authmePassword}`);
  }, 2000);
}

function startBotActivities() {
  console.log('🎮 بدأت نشاطات الـ AFK...');
  if (config.features.antiAFK.enabled) startAntiAFK();
}

function startAntiAFK() {
  setInterval(() => {
    if (!bot || !bot._client || bot._client.state !== 'play') return;
    if (config.features.antiAFK.jump) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 100);
    }
    if (config.features.antiAFK.look) {
      const yaw = (Math.random() - 0.5) * Math.PI;
      const pitch = (Math.random() - 0.5) * Math.PI / 2;
      bot.look(yaw, pitch);
    }
    console.log('🔄 تم تنفيذ حركة عشوائية لمنع الطرد');
  }, config.features.antiAFK.interval);
}

createBot();
        
