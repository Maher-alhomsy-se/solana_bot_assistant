import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

import isValidSolanaAddress from './utils/isValidAddress.js';
import { balanceCollection, txCollection } from './lib/mongo.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Handle /to command
bot.onText(/^\/to$/, (msg) => {
  const chatId = msg.chat.id;
  const messgae = 'You clicked /to. Please enter the recipient address.';

  bot.sendMessage(chatId, messgae);
});

// Handle /total command
bot.onText(/^\/total$/, async (msg) => {
  const chatId = msg.chat.id;

  const doc = await balanceCollection.findOne({ _id: 'wallet-balance' });

  if (!doc) return null;

  const messgae = `The total Solana balance now is: ${doc.totalBalance}`;

  bot.sendMessage(chatId, messgae);
});

// Handle /my-balance command
bot.onText(/^\/my_balance$/, async (msg) => {
  const chatId = msg.chat.id;

  const doc = await balanceCollection.findOne({ _id: 'wallet-balance' });

  if (!doc) return null;

  const messgae = `Please, Send Your Address`;

  bot.sendMessage(chatId, messgae);
});

bot.on('text', async (msg) => {
  if (msg.text === '/to' || msg.text === '/total' || msg.text === '/my_balance')
    return;

  const isValid = isValidSolanaAddress(msg.text?.trim());

  if (!isValid) {
    bot.sendMessage(msg.chat.id, `This invalid soalana address`);
    return;
  }

  const tx = await txCollection.findOne({ from_address: msg.text });

  if (!tx) {
    bot.sendMessage(msg.chat.id, `This address ${msg.text} not found!`);
    return;
  }

  console.log(tx);

  bot.sendMessage(msg.chat.id, `Your Current Balance is ${tx?.value}`);
});

// async function setCommands() {
//   try {
//     const result = await bot.setMyCommands([
//       { command: 'to', description: 'Send To' },
//       { command: 'total', description: 'Total Balance' },
//       { command: 'my_balance', description: 'My Balance' },
//     ]);

//     console.log(result);
//   } catch (error) {
//     console.log('Errro: ', error);
//   }
// }
// setCommands();

export default bot;
