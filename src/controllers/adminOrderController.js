const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── orders ───
exports.get_orders = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1', 10);
        const limit = Math.min(parseInt(req.query['limit'] || '20', 10), 100);
        const search = (req.query['search'] || '').trim();
        const paymentStatus = req.query['payment_status'] || '';
        const query = {};
        if (search) {
            query.$or = [
                { id: { $regex: search, $options: 'i' } },
                { customer_email: { $regex: search, $options: 'i' } },
                { 'shipping_address.firstName': { $regex: search, $options: 'i' } },
                { 'shipping_address.lastName': { $regex: search, $options: 'i' } },
                { 'shipping_address.city': { $regex: search, $options: 'i' } },
                { 'shipping_address.country': { $regex: search, $options: 'i' } },
            ];
        }
        if (paymentStatus) {
            query.payment_status = paymentStatus;
        }
        const skip = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            prisma.adminOrder.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit }),
            prisma.adminOrder.count({ where: query }),
        ]);
        return res.json({
            success: true,
            data: {
                orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        console.error('Orders list error:', error);
        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch orders' });
    }

  } catch (error) {
    console.error('get_orders error:', error);
    next(error);
  }
};

// ─── orders/[id] ───
exports.get_orders__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const isObjectId = /^[a-f\d]{24}$/i.test(id);
        const order = await prisma.adminOrder.findFirst({ where: isObjectId ? { id: id } : { id } });
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        const lineItems = order.line_items || [];
        const enrichedLineItems = await Promise.all(lineItems.map(async (item) => {
            let product = null;
            if (item.productId && (typeof item.productId === "string" && item.productId.length > 0)) {
                try {
                    product = await prisma.adminProduct.findUnique({ where: { id: item.productId } });
                }
                catch {
                    // product may not exist
                }
            }
            return {
                ...item,
                product,
            };
        }));
        const orderObj = order;
        const result = {
            ...orderObj,
            line_items: enrichedLineItems,
        };
        return res.json({
            success: true,
            data: { order: result },
        });
    }
    catch (error) {
        console.error('Get order error:', error);
        return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch order' });
    }

  } catch (error) {
    console.error('get_orders__id error:', error);
    next(error);
  }
};
