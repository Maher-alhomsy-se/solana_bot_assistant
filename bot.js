import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';

import {
  txCollection,
  tokensCollection,
  balanceCollection,
} from './lib/mongo.js';
import chunkArray from './utils/chunkArray.js';
import isValidSolanaAddress from './utils/isValidAddress.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;

  const message = `👋 *Welcome to Solana Ritual Bot!*

Invest in memecoins through the power of our expert callers.

🔮 *Once you send SOL, the ritual begins.*

💀 *No mercy for fat\\-fingered apes \\— your tokens are sealed by fate.*

📈 Auto\\-buy calls from trusted alpha hunters.  
Track your balance, see what was bought, and ride the wave.

*Ready to ape?* Just send, sit back, and let the spirits trade for you.

➡️ Available commands:\\n
/to \\- Get deposit address  
/total \\- View tokens bought in the last 7 days  
/my\\_balance \\- Check your current balance`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Handle /to command
bot.onText(/^\/to$/, (msg) => {
  const chatId = msg.chat.id;

  const message = `🚀 *Start Investing Now!*

To participate, please send at least *0.001 SOL* to the address below:

\`\`\`
HL5bfDCFR4EdnP4b9HZk3mAXFQpM6T89nBJSASpWr9KC
\`\`\`

Once the transaction is confirmed, you'll be automatically added to the system.`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Handle /total command
bot.onText(/^\/total$/, async (msg) => {
  const chatId = msg.chat.id;

  const now = new Date();

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const tokens = await tokensCollection
    .find({ boughtAt: { $gte: sevenDaysAgo } })
    .sort({ boughtAt: 1 })
    .toArray();

  const doc = await balanceCollection.findOne({ _id: 'wallet-balance' });

  if (!doc) return null;

  const totalBalance = doc.totalBalance.toFixed(4);

  let roundRemaining = 'Unknown';

  if (tokens.length > 0) {
    const roundStart = new Date(tokens[0].boughtAt);
    const roundEnd = new Date(roundStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ms = roundEnd - now;

    if (ms > 0) {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      roundRemaining = `${days}d ${hours}h ${minutes}m remaining`;
    } else {
      roundRemaining = '⏳ Round ended. Awaiting next cycle.';
    }
  }

  if (!tokens.length) {
    return bot.sendMessage(
      chatId,
      `<i>No tokens bought in the last 7 days.</i>`,
      { parse_mode: 'HTML' }
    );
  }

  // Limit to 100 clickable links per message
  const tokenChunks = chunkArray(tokens, 100);

  // Send each chunk separately
  for (let chunkIndex = 0; chunkIndex < tokenChunks.length; chunkIndex++) {
    const chunk = tokenChunks[chunkIndex];

    const tokenList = chunk
      .map((t, i) => {
        const index = chunkIndex * 100 + i + 1;
        const nameOrMint = t?.name || t.mint;
        const dexscreenerUrl = `https://dexscreener.com/solana/${t.mint}`;
        return `${index}. <a href="${dexscreenerUrl}">${nameOrMint}</a>`;
      })
      .join('\n');

    let message;

    if (chunkIndex === 0) {
      // Add summary only to first message
      message = `📊 <b>Weekly Summary</b>\n\n<b>🪙 Tokens bought in the last 7 days:</b>\n${tokenList}\n\n<b>💰 Total USDT Balance:</b> <code>${totalBalance} USDT</code>\n<b>⏳ Time left in current round:</b> ${roundRemaining}`;
    } else {
      // Only tokens for subsequent messages
      message = tokenList;
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    });
  }

  // const tokenList = tokens.length
  //   ? tokens
  //       .map((t, i) => {
  //         const nameOrMint = t?.name || t.mint;
  //         const dexscreenerUrl = `https://dexscreener.com/solana/${t.mint}`;
  //         return `${i + 1}. <a href="${dexscreenerUrl}">${nameOrMint}</a>`;
  //       })
  //       .join('\n')
  //   : '<i>No tokens bought in the last 7 days.</i>';

  // const message = `📊 <b>Weekly Summary</b>\n\n<b>🪙 Tokens bought in the last 7 days:</b>\n${tokenList}\n\n<b>💰 Total USDT Balance:</b> <code>${totalBalance} USDT</code>\n<b>⏳ Time left in current round:</b> ${roundRemaining}`;

  // bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
});

// Handle /my-balance command
bot.onText(/^\/my_balance$/, async (msg) => {
  const chatId = msg.chat.id;

  const doc = await balanceCollection.findOne({ _id: 'wallet-balance' });

  if (!doc) return null;

  const message = `📬 *Please send your Solana wallet address:*\n\nWe'll check your balance and get back to you.`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.on('text', async (msg) => {
  const commands = ['/to', '/total', '/my_balance', '/start'];

  const isCommand = commands.includes(msg.text);

  if (isCommand) return;

  const input = msg.text?.trim();

  const isValid = isValidSolanaAddress(input);

  if (!isValid) {
    bot.sendMessage(
      msg.chat.id,
      `❌ *Invalid Solana address.*\nPlease double-check and try again.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const txList = await txCollection.find({ from_address: input }).toArray();

  if (txList.length === 0) {
    bot.sendMessage(
      msg.chat.id,
      `⚠️ *Address not found in our system.*\nNo transactions recorded for:\n\`${input}\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const userTotal = txList.reduce((sum, tx) => sum + Number(tx.value), 0);

  console.log(`The total balance of ${input} is ${userTotal}`);

  const balanceDoc = await balanceCollection.findOne({
    _id: 'wallet-balance',
  });

  const totalBalance = balanceDoc?.totalBalance ?? 0;

  const percentage =
    totalBalance > 0 ? ((userTotal / totalBalance) * 100).toFixed(2) : '0.00';

  bot.sendMessage(
    msg.chat.id,
    `✅ *Your Contribution:*\n` +
      `💵 Amount Sent: \`${userTotal.toFixed(4)} USDT\`\n` +
      `📊 Share of Total Pool: \`${percentage}%\``,
    { parse_mode: 'Markdown' }
  );
});

// async function setCommands() {
//   try {
//     const result = await bot.setMyCommands([
//       { command: 'to', description: '💸 Deposit to Pool' },
//       { command: 'total', description: '📊 Pool Stats' },
//       { command: 'my_balance', description: '👤 My Balance' },
//     ]);

//     console.log(result);
//   } catch (error) {
//     console.log('Errro: ', error);
//   }
// }
// setCommands();

export default bot;
