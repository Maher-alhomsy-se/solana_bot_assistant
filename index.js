import cron from 'node-cron';

import bot from './bot.js';
import pullNewTransaction from './pullNewTransaction.js';

// // Every hour
// cron.schedule('0 * * * *', () => {
//   console.log('Running pullNewTransaction every hour');
//   pullNewTransaction();
// });

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Running pullNewTransaction every 5 minutes');
  pullNewTransaction();
});
