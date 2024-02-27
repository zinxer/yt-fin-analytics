import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { OpenAI } from 'openai';
import fs from 'fs';
import { YoutubeTranscript } from 'youtube-transcript';

dotenv.config();

// Initialize OpenAI and Telegram Bot
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! || '' });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN || '', { polling: true });

// Read initial context
const initialContext = fs.readFileSync('initialContext.txt', 'utf8');

// Store conversation history
const conversations = new Map<number, { role: string; content: string }[]>();

// Greet user on start
bot.onText(/\/start/, (msg: { chat: { id: any; }; }) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "Hello! I am your chatbot. How can I assist you today?");
    conversations.set(chatId, [{ role: 'system', content: initialContext }]);
});

// Handle user messages
bot.on('message', async (msg) => {
    if (msg.text && msg.text.toLowerCase() !== '/start') {
        const chatId = msg.chat.id;
        const history = conversations.get(chatId) || [{ role: 'system', content: initialContext }];
        history.push({ role: 'user', content: msg.text });

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo-1106",
                messages: history as any,
            });

            const answer = response.choices[0].message.content;
            history.push({ role: 'assistant', content: answer as any });
            conversations.set(chatId, history);

            const tokenCount = response.usage?.total_tokens;
            console.log(`Q:${msg.text}`);
            console.log(`A:${answer}`);
            console.log("-I-", `Estimated tokens used: ${tokenCount}\n\n`);

            bot.sendMessage(chatId, answer || ""); // Fix for problem 2: handle null value
        } catch (error) {
            console.error('Error with OpenAI:', error);
            bot.sendMessage(chatId, "[System] Our AI model is working hard in our servers, please try again in a minute or pace your questions. Thanks!");
        }
    }
});