import bs58 from 'bs58';
import { PublicKey } from '@solana/web3.js';

function isValidSolanaAddress(str) {
  try {
    const decoded = bs58.decode(str);
    if (decoded.length < 32 || decoded.length > 44) return false;

    new PublicKey(str);

    return true;
  } catch (err) {
    return false;
  }
}

export default isValidSolanaAddress;
