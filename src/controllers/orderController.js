const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.createOrder = async (req, res, next) => {
  try {
    const { deliveryAddress, paymentToken } = req.body;
    const userId = req.user.id;

    // Get cart
    const [cart] = await prisma.$queryRawUnsafe(`SELECT * FROM carts WHERE "userId" = $1`, userId).catch(() => [null]);
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Validate stock and enrich items
    const orderItems = [];
    for (const item of cart.items) {
      const [product] = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id = $1`, item.productId).catch(() => [null]);
      if (!product) return res.status(400).json({ success: false, message: `Product ${item.productId} not found` });
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }
      orderItems.push({ productId: item.productId, quantity: item.quantity, price: product.price, product });
    }

    const totalPrice = orderItems.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0).toFixed(2);

    // Stripe charge
    let stripeChargeId = null;
    if (process.env.STRIPE_SECRET_KEY && paymentToken) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const charge = await stripe.charges.create({
          amount: Math.round(parseFloat(totalPrice) * 100),
          currency: 'usd',
          source: paymentToken,
          description: `R3sults Order - ${userId}`,
        });
        stripeChargeId = charge.id;
      } catch (stripeErr) {
        return res.status(400).json({ success: false, message: 'Payment failed: ' + stripeErr.message });
      }
    }

    // Create order
    const [order] = await prisma.$queryRawUnsafe(
      `INSERT INTO orders ("userId", items, "totalPrice", status, "deliveryAddress", "stripeChargeId", "createdAt", "updatedAt")
       VALUES ($1, $2::jsonb, $3, 'pending', $4, $5, NOW(), NOW()) RETURNING *`,
      userId, JSON.stringify(orderItems), totalPrice, deliveryAddress, stripeChargeId
    ).catch(() => [null]);

    // Decrement stock
    for (const item of orderItems) {
      await prisma.$queryRawUnsafe(
        `UPDATE products SET "stockQuantity" = "stockQuantity" - $1 WHERE id = $2`,
        item.quantity, item.productId
      ).catch(() => {});
    }

    // Clear cart
    await prisma.$queryRawUnsafe(
      `UPDATE carts SET items = '[]'::jsonb, "totalPrice" = 0, "updatedAt" = NOW() WHERE "userId" = $1`, userId
    ).catch(() => {});

    res.status(201).json({ success: true, message: 'Order created successfully', data: order || { items: orderItems, totalPrice, status: 'pending' } });
  } catch (error) { next(error); }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const orders = await prisma.$queryRawUnsafe(
      `SELECT * FROM orders WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2 OFFSET $3`,
      req.user.id, limit, skip
    ).catch(() => []);
    const [{ count }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM orders WHERE "userId" = $1`, req.user.id
    ).catch(() => [{ count: 0 }]);

    res.json({ success: true, data: orders, pagination: paginationMeta(count, page, limit) });
  } catch (error) { next(error); }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const [order] = await prisma.$queryRawUnsafe(
      `SELECT * FROM orders WHERE id = $1 AND "userId" = $2`, parseInt(req.params.id, 10), req.user.id
    ).catch(() => [null]);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
};
