// Upstash Redis 辅助模块
const REDIS_URL = process.env.UPSTASH_REDIS_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

async function redis(method, ...args) {
  const resp = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([method, ...args]),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Redis error: ${err}`);
  }
  const text = await resp.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

module.exports = { redis };
