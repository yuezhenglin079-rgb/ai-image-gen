// 小扳手 AI 生图 - 后端代理接口
// GPT-image2: 同步返回（快）
// Nano Banana: 异步返回（需要轮询）

const BASE_URL = 'https://xibapi.com';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST' });

  const apiKey = process.env.XIAOBANSHOU_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 密钥未配置' });

  const { model, prompt, size, aspect_ratio, images } = req.body || {};
  if (!model) return res.status(400).json({ error: '缺少 model 参数' });
  if (!prompt) return res.status(400).json({ error: '缺少 prompt 参数' });

  try {
    // --- GPT-image2 (同步) ---
    if (model === 'image2') {
      const body = { model: 'image2', prompt };
      if (size) body.size = size;
      if (images?.length) body.image = images;

      const resp = await fetch(`${BASE_URL}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      return res.status(resp.ok ? 200 : resp.status).json(data);
    }

    // --- Nano Banana (异步) ---
    if (model.startsWith('nano_banana')) {
      const body = { model, prompt, aspect_ratio: aspect_ratio || '1:1' };
      if (images?.length) body.images = images;

      const resp = await fetch(`${BASE_URL}/v1/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await resp.json();
      return res.status(resp.ok ? 200 : resp.status).json(data);
    }

    return res.status(400).json({ error: `不支持的模型: ${model}` });
  } catch (err) {
    return res.status(500).json({ error: '请求失败: ' + err.message });
  }
};
