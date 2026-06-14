// 任务查询接口（用于 Nano Banana 异步任务轮询）

const BASE_URL = 'https://xibapi.com';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.XIAOBANSHOU_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 密钥未配置' });

  const taskId = req.query.id;
  if (!taskId) return res.status(400).json({ error: '缺少 task id' });

  try {
    const resp = await fetch(`${BASE_URL}/v1/videos/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await resp.json();
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: '查询失败: ' + err.message });
  }
};
