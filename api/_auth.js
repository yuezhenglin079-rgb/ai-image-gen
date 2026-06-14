// 认证辅助模块
const crypto = require('crypto');
const { redis } = require('./_redis');

// 密码 hash
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return salt + '$' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split('$');
  const verify = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// 生成 session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// 从请求头获取当前登录用户
async function getCurrentUser(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const username = await redis('GET', `Session:${token}`);
  return username;
}

// 获取用户余额
async function getUserCredits(username) {
  const data = await redis('GET', `User:${username}`);
  if (!data) return 0;
  const user = JSON.parse(data);
  return user.credits || 0;
}

// 扣除用户余额
async function deductCredit(username) {
  const data = await redis('GET', `User:${username}`);
  if (!data) return false;
  const user = JSON.parse(data);
  if ((user.credits || 0) < 1) return false;
  user.credits -= 1;
  await redis('SET', `User:${username}`, JSON.stringify(user));
  return true;
}

// 加余额
async function addCredits(username, amount) {
  const data = await redis('GET', `User:${username}`);
  if (!data) return;
  const user = JSON.parse(data);
  user.credits = (user.credits || 0) + amount;
  await redis('SET', `User:${username}`, JSON.stringify(user));
}

// 获取每日免费使用次数
async function getDailyUsage(username) {
  const today = new Date().toISOString().slice(0, 10);
  const count = await redis('GET', `Daily:${today}:${username}`);
  return parseInt(count || '0');
}

// 增加每日使用次数
async function incrementDailyUsage(username) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `Daily:${today}:${username}`;
  await redis('INCR', key);
  await redis('EXPIRE', key, 86400); // 24h 后自动过期
}

module.exports = {
  hashPassword, verifyPassword, generateToken,
  getCurrentUser, getUserCredits, deductCredit, addCredits,
  getDailyUsage, incrementDailyUsage
};
