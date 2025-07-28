import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const URL = process.env.DB_URL;
const client = new MongoClient(URL);

export const db = client.db('solana_bot');
export const txCollection = db.collection('incoming_tx');
export const tokensCollection = db.collection('token_buys');
export const balanceCollection = db.collection('total_balance');
