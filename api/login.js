const { redis } = require('./_redis');
const { verifyPassword, generateToken } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

  try {
    const data = await redis('GET', `User:${username}`);
    if (!data) return res.status(400).json({ error: '用户名或密码错误' });

    const user = JSON.parse(data);
    if (!verifyPassword(password, user.password)) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    const token = generateToken();
    await redis('SET', `Session:${token}`, username, 'EX', 86400 * 7); // 7天有效

    res.json({ success: true, token, username, credits: user.credits || 0 });
  } catch (err) {
    res.status(500).json({ error: '登录失败: ' + err.message });
  }
};
