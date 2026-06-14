// 管理员接口
const crypto = require('crypto');
const { redis } = require('./_redis');

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

function checkAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === ADMIN_KEY;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!checkAdmin(req)) return res.status(403).json({ error: '无权限' });

  const action = req.query.action || req.body?.action;

  try {
    // 生成激活码
    if (action === 'gen-codes') {
      const { count = 1, credits = 10 } = req.body || {};
      const codes = [];
      for (let i = 0; i < count; i++) {
        const code = 'AI' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const info = { code, credits, used: false, created_at: Date.now() };
        await redis('SET', `Code:${code}`, JSON.stringify(info));
        codes.push(code);
      }
      return res.json({ success: true, codes, credits });
    }

    // 获取统计数据
    if (action === 'stats' || req.method === 'GET') {
      // 简单统计：用 scan 不太好，这里只返回基本信息
      return res.json({ message: '管理后台', note: '可用 action: gen-codes' });
    }

    res.status(400).json({ error: '未知操作' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
