// XorPay 支付回调
const crypto = require('crypto');
const { redis } = require('./_redis');
const { addCredits } = require('./_auth');

module.exports = async (req, res) => {
  // XorPay 通常用 POST 回调
  const params = req.method === 'POST' ? req.body : req.query;

  const { order_id, price, trade_no, status, sign } = params;

  // 验证签名
  const secret = process.env.XORPAY_SECRET;
  const signStr = `${order_id}&${price}&${trade_no}&${status}&${secret}`;
  const verifySign = crypto.createHash('md5').update(signStr).digest('hex');

  if (sign !== verifySign) {
    return res.status(400).send('sign error');
  }

  try {
    const orderData = await redis('GET', `Order:${order_id}`);
    if (!orderData) return res.status(404).send('order not found');

    const order = JSON.parse(orderData);
    if (order.status !== 'pending') return res.status(200).send('duplicate');

    if (status === 'completed') {
      // 给用户添加余额
      await addCredits(order.username, order.credits);

      // 更新订单状态
      order.status = 'completed';
      order.trade_no = trade_no;
      order.paid_at = Date.now();
      await redis('SET', `Order:${order_id}`, JSON.stringify(order));
    } else {
      order.status = 'failed';
      await redis('SET', `Order:${order_id}`, JSON.stringify(order));
    }

    res.status(200).send('success');
  } catch (err) {
    res.status(500).send('error: ' + err.message);
  }
};
