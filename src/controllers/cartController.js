const prisma = require('../lib/prisma');

const getOrCreateCart = async (userId) => {
  let [cart] = await prisma.$queryRawUnsafe(`SELECT * FROM carts WHERE "userId" = $1`, userId).catch(() => []);
  if (!cart) {
    [cart] = await prisma.$queryRawUnsafe(
      `INSERT INTO carts ("userId", items, "totalPrice", "createdAt", "updatedAt")
       VALUES ($1, '[]'::jsonb, 0, NOW(), NOW()) RETURNING *`, userId
    ).catch(() => [null]);
  }
  return cart;
};

const calcTotal = (items) => {
  return items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * item.quantity), 0).toFixed(2);
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const [product] = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id = $1`, productId).catch(() => [null]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.stockQuantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    let cart = await getOrCreateCart(req.user.id);
    const items = cart.items || [];
    const existingIdx = items.findIndex((i) => i.productId === productId);
    if (existingIdx >= 0) {
      items[existingIdx].quantity += quantity;
      items[existingIdx].price = product.price;
    } else {
      items.push({ productId, quantity, price: product.price });
    }
    const totalPrice = calcTotal(items);

    [cart] = await prisma.$queryRawUnsafe(
      `UPDATE carts SET items = $1::jsonb, "totalPrice" = $2, "updatedAt" = NOW() WHERE "userId" = $3 RETURNING *`,
      JSON.stringify(items), totalPrice, req.user.id
    );
    res.json({ success: true, message: 'Item added to cart', data: cart });
  } catch (error) { next(error); }
};

exports.getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    const items = cart?.items || [];
    const enriched = [];
    for (const item of items) {
      const [product] = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id = $1`, item.productId).catch(() => [null]);
      enriched.push({ ...item, product: product || null });
    }
    res.json({ success: true, data: { ...cart, items: enriched } });
  } catch (error) { next(error); }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const { quantity } = req.body;
    if (quantity <= 0) return res.status(400).json({ success: false, message: 'Quantity must be positive' });

    const cart = await getOrCreateCart(req.user.id);
    const items = cart?.items || [];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx < 0) return res.status(404).json({ success: false, message: 'Item not in cart' });

    const [product] = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id = $1`, productId).catch(() => [null]);
    if (product && product.stockQuantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

    items[idx].quantity = quantity;
    const totalPrice = calcTotal(items);

    const [updated] = await prisma.$queryRawUnsafe(
      `UPDATE carts SET items = $1::jsonb, "totalPrice" = $2, "updatedAt" = NOW() WHERE "userId" = $3 RETURNING *`,
      JSON.stringify(items), totalPrice, req.user.id
    );
    res.json({ success: true, message: 'Cart item updated', data: updated });
  } catch (error) { next(error); }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const cart = await getOrCreateCart(req.user.id);
    const items = (cart?.items || []).filter((i) => i.productId !== productId);
    const totalPrice = calcTotal(items);

    const [updated] = await prisma.$queryRawUnsafe(
      `UPDATE carts SET items = $1::jsonb, "totalPrice" = $2, "updatedAt" = NOW() WHERE "userId" = $3 RETURNING *`,
      JSON.stringify(items), totalPrice, req.user.id
    );
    res.json({ success: true, message: 'Item removed from cart', data: updated });
  } catch (error) { next(error); }
};

exports.clearCart = async (req, res, next) => {
  try {
    const [cart] = await prisma.$queryRawUnsafe(
      `UPDATE carts SET items = '[]'::jsonb, "totalPrice" = 0, "updatedAt" = NOW() WHERE "userId" = $1 RETURNING *`,
      req.user.id
    ).catch(() => [null]);
    res.json({ success: true, message: 'Cart cleared', data: cart });
  } catch (error) { next(error); }
};
