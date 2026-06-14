// 创建 XorPay 支付订单
const crypto = require('crypto');
const { redis } = require('./_redis');
const { getCurrentUser } = require('./_auth');

const XORPAY_APPID = process.env.XORPAY_APPID;
const XORPAY_SECRET = process.env.XORPAY_SECRET;
const SITE_URL = process.env.VERCEL_URL || 'ai-image-l5kbfoqbs-zhenglin-s-projects.vercel.app';

// 套餐配置
const PACKAGES = {
  p1: { name: '尝鲜包', price: '9.90', credits: 15 },
  p2: { name: '畅享包', price: '19.90', credits: 40 },
  p3: { name: '超值包', price: '49.90', credits: 120 },
  p4: { name: '专业包', price: '99.00', credits: 300 },
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const username = await getCurrentUser(req.headers.authorization);
    if (!username) return res.status(401).json({ error: '请先登录' });

    const { package_id } = req.body || {};
    const pkg = PACKAGES[package_id];
    if (!pkg) return res.status(400).json({ error: '无效的套餐' });

    // 生成唯一订单号
    const order_id = `AI${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    // 存订单到 Redis
    const order = {
      order_id,
      username,
      package_id,
      price: pkg.price,
      credits: pkg.credits,
      status: 'pending',
      created_at: Date.now(),
    };
    await redis('SET', `Order:${order_id}`, JSON.stringify(order), 'EX', 3600); // 1h 过期

    // 调用 XorPay 创建支付
    const notifyUrl = `https://${SITE_URL}/api/xorpay-callback`;
    const signStr = `${XORPAY_APPID}&${order_id}&${pkg.price}&${notifyUrl}&${XORPAY_SECRET}`;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    const params = new URLSearchParams();
    params.append('appid', XORPAY_APPID);
    params.append('order_id', order_id);
    params.append('price', pkg.price);
    params.append('name', `AI 绘 - ${pkg.name}`);
    params.append('pay_type', 'wx');
    params.append('notify_url', notifyUrl);
    params.append('sign', sign);

    const xorResp = await fetch('https://xorpay.com/api/pay/' + XORPAY_APPID, {
      method: 'POST',
      body: params,
    });
    const xorData = await xorResp.json();

    if (xorData.state !== 0) {
      return res.status(500).json({ error: '支付创建失败: ' + (xorData.msg || '未知错误') });
    }

    res.json({
      success: true,
      order_id,
      pay_url: xorData.url,
      qrcode: xorData.qrcode || xorData.url,
      package: pkg,
    });
  } catch (err) {
    res.status(500).json({ error: '创建订单失败: ' + err.message });
  }
};

// 导出套餐信息供前端使用
module.exports.PACKAGES = PACKAGES;
module.exports.PACKAGES_LIST = Object.entries(PACKAGES).map(([id, p]) => ({ id, ...p }));
