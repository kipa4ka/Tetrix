const TelegramBot = require('node-telegram-bot-api');

const token = '7566012207:AAHweYz8ujJ17gz_-2QcqIghdRiHDv72iLQ';
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const url = 'https://your-domain.com'; // Або localhost:3000 на тесті
  bot.sendMessage(chatId, 'Натисни кнопку, щоб запустити гру', {
    reply_markup: {
      inline_keyboard: [[
        { text: 'Запустити гру', web_app: { url } }
      ]]
    }
  });
});