const { redis } = require('./_redis');
const { hashPassword } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2) return res.status(400).json({ error: '用户名至少2个字符' });
  if (password.length < 4) return res.status(400).json({ error: '密码至少4个字符' });

  try {
    const existing = await redis('GET', `User:${username}`);
    if (existing) return res.status(400).json({ error: '用户名已存在' });

    const user = {
      username,
      password: hashPassword(password),
      credits: 0,
      created_at: Date.now(),
    };
    await redis('SET', `User:${username}`, JSON.stringify(user));

    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    res.status(500).json({ error: '注册失败: ' + err.message });
  }
};
