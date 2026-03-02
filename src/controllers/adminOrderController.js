const prisma = require('../lib/prisma');

// ─── orders ───
exports.get_orders = async (req, res, next) => {
  try {
    const tokenPayload = await req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const page = parseInt(req.query['page'] || '1', 10);
    const limit = Math.min(parseInt(req.query['limit'] || '20', 10), 100);
    const search = (req.query['search'] || '').trim();
    const paymentStatus = req.query['payment_status'] || '';
    const skip = (page - 1) * limit;

    // Build Prisma WHERE clause
    const where = {};

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.adminOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminOrder.count({ where }),
    ]);

    // Transform to snake_case for admin panel frontend compatibility
    const transformedOrders = orders.map(toSnakeCaseOrder);

    return res.json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Orders list error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch orders',
    });
  }
};

// ─── orders/[id] ───
exports.get_orders__id = async (req, res, next) => {
  try {
    const tokenPayload = await req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Try finding by orderId first, then by primary key id
    let order = await prisma.adminOrder.findFirst({
      where: {
        OR: [
          { orderId: id },
          { id: id },
        ],
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Enrich line items with product data
    const lineItems = order.lineItems || [];
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (item) => {
        let product = null;
        if (item.productId && typeof item.productId === 'string' && item.productId.length > 0) {
          try {
            product = await prisma.adminProduct.findUnique({
              where: { id: item.productId },
            });
          } catch {
            // product may not exist
          }
        }
        return { ...item, product };
      })
    );

    const transformed = toSnakeCaseOrder(order);
    transformed.line_items = enrichedLineItems;

    return res.json({
      success: true,
      data: {
        order: transformed,
      },
    });
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch order',
    });
  }
};

// ─── Transform Prisma camelCase to snake_case for frontend ───
function toSnakeCaseOrder(order) {
  return {
    _id: order.id,
    id: order.orderId || order.id,
    stripe_session_id: order.stripeSessionId,
    customer_email: order.customerEmail,
    amount_total: order.amountTotal,
    amount_total_cents: order.amountTotalCents,
    amount_subtotal: order.amountSubtotal,
    shipping_amount: order.shippingAmount,
    currency: order.currency,
    payment_status: order.paymentStatus,
    shipping_address: order.shippingAddress,
    billing_address: order.billingAddress,
    billing_same_as_shipping: order.billingSameAsShipping,
    line_items: order.lineItems || [],
    created_at: order.createdAt
      ? (order.createdAt.toISOString ? order.createdAt.toISOString() : order.createdAt)
      : order.orderCreatedAt,
    updated_at: order.updatedAt
      ? (order.updatedAt.toISOString ? order.updatedAt.toISOString() : order.updatedAt)
      : undefined,
  };
}
