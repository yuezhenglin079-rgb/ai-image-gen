const { getCurrentUser, getUserCredits, getDailyUsage } = require('./_auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const username = await getCurrentUser(req.headers.authorization);
    if (!username) return res.status(401).json({ error: '未登录' });
    const credits = await getUserCredits(username);
    const dailyUsed = await getDailyUsage(username);
    const dailyFree = Math.max(0, 3 - dailyUsed);
    res.json({ username, credits, dailyFree, dailyUsed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
