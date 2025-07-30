import axios from 'axios';
import dotenv from 'dotenv';

import { balanceCollection, txCollection } from './lib/mongo.js';

dotenv.config();

let lastTransaction = null;
const SOLANA_ADDRESS = process.env.WALLET_ADDRESS;

async function pullNewTransaction() {
  try {
    const balanceDoc = await balanceCollection.findOne({
      _id: 'wallet-balance',
    });

    let totalBalance = balanceDoc?.totalBalance ?? 0;

    const now = Math.floor(Date.now() / 1000); // current time in seconds
    const SEVEN_DAYS_AGO = now - 7 * 24 * 60 * 60; // 7 days ago in seconds

    const URL = 'https://pro-api.solscan.io/v2.0/account/transfer';

    const { data } = await axios.get(URL, {
      params: {
        page: 1,
        flow: 'in',
        page_size: 100,
        sort_order: 'desc',
        to: SOLANA_ADDRESS,
        sort_by: 'block_time',
        address: SOLANA_ADDRESS,
        exclude_amount_zero: true,
        from_time: SEVEN_DAYS_AGO,
      },
      headers: { token: process.env.SOLANA_API_KEY },
    });

    const transactions = data?.data || [];
    const SOL_ADDRESS = 'So11111111111111111111111111111111111111111';

    const inComingTransactions = transactions.filter(
      ({ flow, token_address }) =>
        flow === 'in' && token_address === SOL_ADDRESS
    );

    console.log('InComing Transactions');
    console.log(inComingTransactions);

    if (inComingTransactions.length === 0) {
      console.log('No incoming SOL transfers found.');
      return;
    }

    const newestTx = inComingTransactions[0];

    console.log(newestTx);
    console.log(lastTransaction);

    if (
      lastTransaction &&
      newestTx?.time === lastTransaction?.time &&
      newestTx?.value === lastTransaction?.value
    ) {
      console.log('No new transactions. Skipping...');
      return;
    }

    for (const transaction of inComingTransactions) {
      const { from_address, value, time, trans_id } = transaction;

      const isExist = await txCollection.findOne({ trans_id });

      if (isExist) {
        if (isExist.time !== time) {
          await txCollection.updateOne(
            { trans_id },
            { $inc: { value: Number(value) }, $set: { time } }
          );

          totalBalance += Number(value);
        }
      } else {
        await txCollection.insertOne({
          time,
          trans_id,
          from_address,
          value: Number(value),
        });

        totalBalance += Number(value);
      }
    }

    lastTransaction = newestTx;

    await balanceCollection.updateOne(
      { _id: 'wallet-balance' },
      { $set: { totalBalance } },
      { upsert: true }
    );

    console.log(`✅ Total balance updated: ${totalBalance} SOL`);
  } catch (error) {
    console.log('Error : ', error);
  }
}

export default pullNewTransaction;

// Swap Sol -> Token
// token_adderss === token that I bought end with bonk, pump, ect
// to_address === MY_WALLET_ADDRESS
