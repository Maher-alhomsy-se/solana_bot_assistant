function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default chunkArray;

export function splitTokens(tokens) {
  const MAX_CHARS = 3800; // safety margin below 4096
  const MAX_LINKS = 100;

  let currentMessage = [];
  let currentLength = 0;
  const messages = [];

  tokens.forEach((t, idx) => {
    const line = `${idx + 1}. <a href="https://dexscreener.com/solana/${
      t.mint
    }">${t?.name || t.mint}</a>\n`;
    const lineLength = line.length;

    // If adding this line exceeds limits → push current chunk & reset
    if (
      currentLength + lineLength > MAX_CHARS ||
      currentMessage.length >= MAX_LINKS
    ) {
      messages.push(currentMessage.join(''));
      currentMessage = [];
      currentLength = 0;
    }

    currentMessage.push(line);
    currentLength += lineLength;
  });

  // Push the last chunk if exists
  if (currentMessage.length) {
    messages.push(currentMessage.join(''));
  }

  return messages;
}
