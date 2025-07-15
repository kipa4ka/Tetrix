require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const url = 'https://dainty-dodol-f6a881.netlify.app/index.html';
    bot.sendMessage(chatId, 'Натисни кнопку, щоб запустити гру', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Запустити гру', web_app: { url } }]
            ]
        }
    });
});