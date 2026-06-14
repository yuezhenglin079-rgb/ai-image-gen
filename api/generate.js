// 生图接口（带配额检查）
const BASE = 'https://xibapi.com';
const { getCurrentUser, deductCredit, getDailyUsage, incrementDailyUsage } = require('./_auth');

const FREE_DAILY_LIMIT = 3;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST' });

  const apiKey = process.env.XIAOBANSHOU_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 未配置' });

  // 检查登录
  const username = await getCurrentUser(req.headers.authorization);
  if (!username) return res.status(401).json({ error: '请先登录', needLogin: true });

  const { model, prompt, size, aspect_ratio, images, n } = req.body || {};
  if (!model) return res.status(400).json({ error: '缺少 model 参数' });
  if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });

  try {
    // 检查配额：先用每日免费次数
    const dailyUsed = await getDailyUsage(username);
    let useFree = false;
    if (dailyUsed < FREE_DAILY_LIMIT) {
      useFree = true;
    } else {
      // 用付费余额
      const ok = await deductCredit(username);
      if (!ok) {
        return res.status(402).json({ error: '余额不足，请充值', needPay: true });
      }
    }

    // --- GPT-image2 ---
    if (model === 'image2') {
      const body = { model: 'image2', prompt };
      if (size) body.size = size;
      if (n) body.n = n;
      if (images?.length) body.image = images;

      const resp = await fetch(`${BASE}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (data?.data) {
        data.data = data.data.map(item => ({
          ...item,
          b64_json: item.b64_json
            ? (item.b64_json.startsWith('data:') ? item.b64_json : `data:image/png;base64,${item.b64_json}`)
            : item.b64_json
        }));
      }

      if (useFree && resp.ok) await incrementDailyUsage(username);

      const result = { ...data, _quota: { usedFree: useFree } };
      return res.status(resp.ok ? 200 : resp.status).json(result);
    }

    // --- Nano Banana ---
    if (model.startsWith('nano_banana')) {
      const body = { model, prompt, aspect_ratio: aspect_ratio || '1:1' };
      if (images?.length) body.images = images;

      const resp = await fetch(`${BASE}/v1/videos`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      if (useFree && resp.ok) await incrementDailyUsage(username);

      const result = { ...data, _quota: { usedFree: useFree } };
      return res.status(resp.ok ? 200 : resp.status).json(result);
    }

    return res.status(400).json({ error: `不支持的模型: ${model}` });
  } catch (err) {
    return res.status(500).json({ error: '请求失败: ' + err.message });
  }
};
