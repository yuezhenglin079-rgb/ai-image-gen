// 兑换激活码
const { redis } = require('./_redis');
const { getCurrentUser, addCredits } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const username = await getCurrentUser(req.headers.authorization);
    if (!username) return res.status(401).json({ error: '请先登录' });

    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: '请输入激活码' });

    const codeData = await redis('GET', `Code:${code}`);
    if (!codeData) return res.status(400).json({ error: '激活码无效' });

    const codeInfo = JSON.parse(codeData);
    if (codeInfo.used) return res.status(400).json({ error: '激活码已被使用' });

    // 标记已使用
    codeInfo.used = true;
    codeInfo.used_by = username;
    codeInfo.used_at = Date.now();
    await redis('SET', `Code:${code}`, JSON.stringify(codeInfo));

    // 加余额
    await addCredits(username, codeInfo.credits);

    res.json({ success: true, credits: codeInfo.credits, message: `成功兑换 ${codeInfo.credits} 次生图机会` });
  } catch (err) {
    res.status(500).json({ error: '兑换失败: ' + err.message });
  }
};
