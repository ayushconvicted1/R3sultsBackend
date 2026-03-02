const prisma = require('../lib/prisma');
const crypto = require('crypto');
const { paginate, paginationMeta } = require('../utils/pagination');

// ─── Helpers ───

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateOrderId() {
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += ALPHANUM[crypto.randomInt(0, ALPHANUM.length)];
  }
  return `ORD-${suffix}`;
}

function normalizePhone(phone) {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

// ─── Public: Create Order (no auth required) ───

exports.createOrder = async (req, res, next) => {
  try {
    const {
      lineItems,
      shippingAddress,
      billingAddress,
      billingSameAsShipping = true,
      shippingAmount = 0,
    } = req.body;

    // Validate required fields
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ success: false, message: 'lineItems array is required and must not be empty' });
    }
    if (!shippingAddress || !shippingAddress.email) {
      return res.status(400).json({ success: false, message: 'shippingAddress with email is required' });
    }
    if (!shippingAddress.firstName || !shippingAddress.lastName) {
      return res.status(400).json({ success: false, message: 'shippingAddress must include firstName and lastName' });
    }
    if (!shippingAddress.phone) {
      return res.status(400).json({ success: false, message: 'shippingAddress must include phone' });
    }
    if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode || !shippingAddress.country) {
      return res.status(400).json({ success: false, message: 'shippingAddress must include line1, city, state, postalCode, and country' });
    }

    // Validate and enrich line items with product data
    const enrichedItems = [];
    for (const item of lineItems) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ success: false, message: `Invalid line item: productId and quantity >= 1 are required` });
      }

      // Look up product in AdminProduct table
      let product = null;
      try {
        product = await prisma.adminProduct.findUnique({ where: { id: item.productId } });
      } catch {
        // product not found
      }

      // Use provided price/name or fall back to product data
      const price = item.price ?? (product ? product.sellingPrice : 0);
      const name = item.name ?? (product ? product.name : 'Unknown Product');

      // Check stock if product exists
      if (product) {
        const stock = product.stock || {};
        const available = stock.availableQuantity ?? stock.quantity ?? 0;
        if (available < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for "${name}". Available: ${available}, Requested: ${item.quantity}`,
          });
        }
      }

      enrichedItems.push({
        productId: item.productId,
        name,
        price,
        quantity: item.quantity,
        amount_total: Math.round(price * item.quantity * 100) / 100,
        image: item.image,
        description: item.description,
        size: item.size,
        color: item.color,
        productDescription: item.productDescription,
      });
    }

    // Calculate totals
    const subtotal = enrichedItems.reduce((sum, i) => sum + i.amount_total, 0);
    const shippingAmountNum = typeof shippingAmount === 'number' && shippingAmount >= 0 ? shippingAmount : 0;
    const amountTotal = Math.round((subtotal + shippingAmountNum) * 100) / 100;

    // Generate unique order ID
    let orderId;
    let attempts = 0;
    while (attempts < 10) {
      orderId = generateOrderId();
      const existing = await prisma.adminOrder.findUnique({ where: { orderId } }).catch(() => null);
      if (!existing) break;
      attempts++;
    }
    if (attempts >= 10) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique order ID' });
    }

    // Build the order record (matches AdminOrder Prisma model)
    const resolvedBilling = billingSameAsShipping ? shippingAddress : (billingAddress || shippingAddress);

    const order = await prisma.adminOrder.create({
      data: {
        orderId,
        stripeSessionId: `DIRECT-${orderId}`, // no Stripe session for direct orders
        customerEmail: shippingAddress.email.trim().toLowerCase(),
        amountTotalCents: Math.round(amountTotal * 100),
        amountTotal,
        amountSubtotal: subtotal,
        shippingAmount: shippingAmountNum,
        currency: 'usd',
        paymentStatus: 'pending', // direct orders start as pending
        shippingAddress: {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: shippingAddress.email,
          phone: shippingAddress.phone,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || '',
          city: shippingAddress.city,
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
        billingAddress: {
          line1: resolvedBilling.line1,
          line2: resolvedBilling.line2 || '',
          city: resolvedBilling.city,
          state: resolvedBilling.state,
          postalCode: resolvedBilling.postalCode,
          country: resolvedBilling.country,
        },
        billingSameAsShipping: !!billingSameAsShipping,
        lineItems: enrichedItems,
      },
    });

    // Decrement stock for each line item
    for (const item of enrichedItems) {
      try {
        const product = await prisma.adminProduct.findUnique({ where: { id: item.productId } });
        if (product && product.stock) {
          const stock = { ...product.stock };
          stock.quantity = Math.max(0, (stock.quantity || 0) - item.quantity);
          stock.availableQuantity = Math.max(0, (stock.availableQuantity || 0) - item.quantity);
          await prisma.adminProduct.update({
            where: { id: item.productId },
            data: { stock },
          });
        }
      } catch {
        // stock update failed — log but don't fail the order
        console.error(`Failed to update stock for product ${item.productId}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        customerEmail: order.customerEmail,
        amountTotal: order.amountTotal,
        amountSubtotal: order.amountSubtotal,
        shippingAmount: order.shippingAmount,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        lineItems: order.lineItems,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('shopOrder.createOrder error:', error);
    next(error);
  }
};

// ─── Authenticated: Get My Orders (match email or phone) ───

exports.getMyOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const userEmail = (user.email || '').trim().toLowerCase();
    const userPhone = normalizePhone(user.phoneNumber || user.phone || '');

    if (!userEmail && !userPhone) {
      return res.json({ success: true, data: [], pagination: paginationMeta(0, 1, 20) });
    }

    const { page, limit, skip } = paginate(req.query);

    // Build WHERE conditions: match by email OR by phone in shippingAddress JSON
    const orConditions = [];
    if (userEmail) {
      orConditions.push({ customerEmail: userEmail });
    }

    // Query orders matching email
    const [orders, total] = await Promise.all([
      prisma.adminOrder.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminOrder.count({
        where: { OR: orConditions },
      }),
    ]);

    // If we also have a phone, do a second pass to find phone-only matches
    // PostgreSQL JSON querying for phone match within shippingAddress
    let phoneMatches = [];
    if (userPhone) {
      try {
        // Find orders where shippingAddress->phone contains the user's phone digits
        // Exclude already-matched email orders to avoid duplicates
        if (userEmail) {
          phoneMatches = await prisma.$queryRaw`
            SELECT * FROM "admin_orders"
            WHERE "shippingAddress"->>'phone' IS NOT NULL
              AND REGEXP_REPLACE("shippingAddress"->>'phone', '[^0-9]', '', 'g') = ${userPhone}
              AND "customerEmail" != ${userEmail}
            ORDER BY "createdAt" DESC
            LIMIT ${limit}
          `;
        } else {
          phoneMatches = await prisma.$queryRaw`
            SELECT * FROM "admin_orders"
            WHERE "shippingAddress"->>'phone' IS NOT NULL
              AND REGEXP_REPLACE("shippingAddress"->>'phone', '[^0-9]', '', 'g') = ${userPhone}
            ORDER BY "createdAt" DESC
            LIMIT ${limit}
          `;
        }
      } catch {
        // Phone matching via raw query failed — fall back to email-only results
        phoneMatches = [];
      }
    }

    // Merge and deduplicate (email matches + phone-only matches)
    const orderMap = new Map();
    for (const o of orders) orderMap.set(o.id, o);
    for (const o of phoneMatches) orderMap.set(o.id, o);

    const allOrders = Array.from(orderMap.values())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    const totalCount = total + phoneMatches.length;

    res.json({
      success: true,
      data: allOrders.map(formatOrderResponse),
      pagination: paginationMeta(totalCount, page, limit),
    });
  } catch (error) {
    console.error('shopOrder.getMyOrders error:', error);
    next(error);
  }
};

// ─── Authenticated: Get My Order By ID ───

exports.getMyOrderById = async (req, res, next) => {
  try {
    const user = req.user;
    const userEmail = (user.email || '').trim().toLowerCase();
    const userPhone = normalizePhone(user.phoneNumber || user.phone || '');
    const { id } = req.params;

    if (!userEmail && !userPhone) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Find order by ID (orderId or primary key id)
    let order = await prisma.adminOrder.findFirst({
      where: {
        OR: [
          { id },
          { orderId: id },
        ],
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify the order belongs to this user (email or phone match)
    const orderEmail = (order.customerEmail || '').trim().toLowerCase();
    const orderPhone = normalizePhone(
      (order.shippingAddress && typeof order.shippingAddress === 'object')
        ? order.shippingAddress.phone || ''
        : ''
    );

    const emailMatch = userEmail && orderEmail && userEmail === orderEmail;
    const phoneMatch = userPhone && orderPhone && userPhone === orderPhone;

    if (!emailMatch && !phoneMatch) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Enrich line items with product data
    const lineItems = order.lineItems || [];
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (item) => {
        let product = null;
        if (item.productId) {
          try {
            product = await prisma.adminProduct.findUnique({ where: { id: item.productId } });
          } catch {
            // product may not exist
          }
        }
        return { ...item, product: product ? { id: product.id, name: product.name, images: product.images } : null };
      })
    );

    res.json({
      success: true,
      data: {
        ...formatOrderResponse(order),
        lineItems: enrichedLineItems,
      },
    });
  } catch (error) {
    console.error('shopOrder.getMyOrderById error:', error);
    next(error);
  }
};

// ─── Helpers ───

function formatOrderResponse(order) {
  return {
    id: order.id,
    orderId: order.orderId,
    customerEmail: order.customerEmail,
    amountTotal: order.amountTotal,
    amountSubtotal: order.amountSubtotal,
    shippingAmount: order.shippingAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    billingSameAsShipping: order.billingSameAsShipping,
    lineItems: order.lineItems,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
