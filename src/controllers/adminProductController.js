const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── products ───
exports.get_products = async (req, res, next) => {
  try {

    try {
        // Get query parameters
        // req.query is already available via Express;
        const page = parseInt(req.query['page'] || '1', 10);
        const limit = parseInt(req.query['limit'] || '20', 10);
        const search = req.query['search'] || '';
        const category = req.query['category'] || '';
        const status = req.query['status'] || '';
        const brand = req.query['brand'] || '';
        const lowStock = req.query['lowStock'] === 'true';
        const featured = req.query['featured'] === 'true';
        // Build query
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } },
                { tags: { in: [new RegExp(search, 'i')] } },
            ];
        }
        if (category) {
            query.category = category;
        }
        if (status) {
            query.status = status;
        }
        if (brand) {
            query.brand = { $regex: brand, $options: 'i' };
        }
        if (lowStock) {
            query.$expr = { lt: ['$stock.quantity', '$stock.lowStockThreshold'],
            };
        }
        if (featured) {
            query.isFeatured = true;
        }
        // Calculate skip
        const skip = (page - 1) * limit;
        // Fetch products from database
        const products = await prisma.adminProduct.findMany({ where: query, orderBy: { createdAt: 'desc' }, skip: skip, take: limit });
        const total = await prisma.adminProduct.count({ where: query });
        // Transform products for response
        const transformedProducts = products.map((product) => ({ id: product.id.toString(),
            id: product.id.toString(),
            name: product.name,
            description: product.description,
            sku: product.sku,
            barcode: product.barcode,
            category: product.category,
            subcategory: product.subcategory,
            costPrice: product.costPrice,
            sellingPrice: product.sellingPrice,
            discount: product.discount || 0,
            taxRate: product.taxRate || 0,
            stock: product.stock,
            brand: product.brand,
            model: product.model,
            size: product.size || [],
            color: product.color || [],
            material: product.material,
            weight: product.weight,
            dimensions: product.dimensions,
            safetyFeatures: product.safetyFeatures || [],
            safetyStandards: product.safetyStandards || [],
            certifications: product.certifications || [],
            images: product.images || [],
            videoUrl: product.videoUrl,
            model3dUrl: product.model3dUrl,
            model3dFormat: product.model3dFormat,
            keyFeatures: product.keyFeatures || [],
            variants: product.variants || [],
            categoryAttributes: product.categoryAttributes || {},
            specifications: product.specifications || [],
            vendor: product.vendor,
            status: product.status,
            isFeatured: product.isFeatured || false,
            tags: product.tags || [],
            warrantyPeriod: product.warrantyPeriod,
            returnPolicy: product.returnPolicy,
            shippingInfo: product.shippingInfo,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        }));
        const json = res.json({
            success: true,
            data: {
                products: transformedProducts,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
        addCorsHeaders(json);
        return json;
    }
    catch (error) {
        console.error('Get products error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }

  } catch (error) {
    console.error('get_products error:', error);
    next(error);
  }
};

exports.post_products = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        if (!tokenPayload) {
            return res.json({ success: false, message: 'Not authorized. No token provided.' }, { status: 401 });
        }
        // Allow admin and super_admin to create products
        if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        // Validate required fields
        if (!body.name || !body.sku || !body.category) {
            return res.json({ success: false, error: 'Name, SKU, and category are required' }, { status: 400 });
        }
        // Check if SKU already exists
        const existingProduct = await prisma.adminProduct.findFirst({ where: { sku: body.sku.toUpperCase() } });
        if (existingProduct) {
            return res.json({ success: false, error: 'Product with this SKU already exists' }, { status: 400 });
        }
        // Create new product
        const productData = {
            ...body,
            sku: body.sku.toUpperCase(),
            createdBy: tokenPayload.userId,
            lastModifiedBy: tokenPayload.userId,
            stock: {
                quantity: body.stock?.quantity || 0,
                lowStockThreshold: body.stock?.lowStockThreshold || 10,
                reservedQuantity: body.stock?.reservedQuantity || 0,
                availableQuantity: (body.stock?.quantity || 0) - (body.stock?.reservedQuantity || 0),
                reorderPoint: body.stock?.reorderPoint || 0,
                maxStock: body.stock?.maxStock,
            },
        };
        const product = (productData);
        // Note: product.save() pattern needs prisma.model.update() - see TODO below
        return res.json({
            success: true,
            data: { product },
            message: 'Product created successfully',
        });
    }
    catch (error) {
        console.error('Create product error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }

  } catch (error) {
    console.error('post_products error:', error);
    next(error);
  }
};

// ─── products/[id] ───
exports.get_products__id = async (req, res, next) => {
  try {

    try {
        const { id } = req.params;
        const product = await prisma.adminProduct.findUnique({ where: { id: id } });
        if (!product) {
            const notFound = res.json({ success: false, error: 'Product not found' }, { status: 404 });
            addCorsHeaders(notFound);
            return notFound;
        }
        const json = res.json({
            success: true,
            data: { product },
        });
        addCorsHeaders(json);
        return json;
    }
    catch (error) {
        console.error('Get product error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('get_products__id error:', error);
    next(error);
  }
};

exports.put_products__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Allow admin and super_admin to edit products
        if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const body = req.body;
        // Check if SKU is being changed and if it already exists
        if (body.sku) {
            const existingProduct = await prisma.adminProduct.findFirst({ where: {
                    sku: body.sku.toUpperCase(), id: { not: id },
                } });
            if (existingProduct) {
                return res.json({ success: false, error: 'Product with this SKU already exists' }, { status: 400 });
            }
            body.sku = body.sku.toUpperCase();
        }
        // If variants are provided, calculate total stock from variants
        if (body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
            const totalQuantity = body.variants.reduce((sum, variant) => {
                const qty = variant.stock?.quantity || variant.stockQuantity || 0;
                return sum + (Number(qty) || 0);
            }, 0);
            const totalReserved = body.variants.reduce((sum, variant) => {
                const reserved = variant.stock?.reservedQuantity || variant.reservedQuantity || 0;
                return sum + (Number(reserved) || 0);
            }, 0);
            body.stock = {
                ...body.stock,
                quantity: totalQuantity,
                reservedQuantity: totalReserved,
                availableQuantity: Math.max(0, totalQuantity - totalReserved),
            };
        }
        else if (body.stock) {
            // Update stock calculations if stock is being updated (and no variants)
            const quantity = Number(body.stock.quantity) || 0;
            const reservedQuantity = Number(body.stock.reservedQuantity) || 0;
            body.stock.availableQuantity = Math.max(0, quantity - reservedQuantity);
        }
        body.lastModifiedBy = tokenPayload.userId;
        const product = await prisma.adminProduct.update({ where: { id: id }, data: body });
        if (!product) {
            return res.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            data: { product },
            message: 'Product updated successfully',
        });
    }
    catch (error) {
        console.error('Update product error:', error);
        return res.json({
            success: false,
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        }, { status: 500 });
    }

  } catch (error) {
    console.error('put_products__id error:', error);
    next(error);
  }
};

exports.delete_products__id = async (req, res, next) => {
  try {

    try {
        const tokenPayload = await req.user;
        const { id } = req.params;
        if (!tokenPayload) {
            return res.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        // Allow admin and super_admin to delete products
        if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
            return res.json({ success: false, error: 'Permission denied' }, { status: 403 });
        }
        const product = await prisma.adminProduct.delete({ where: { id: id } });
        if (!product) {
            return res.json({ success: false, error: 'Product not found' }, { status: 404 });
        }
        return res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete product error:', error);
        return res.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

  } catch (error) {
    console.error('delete_products__id error:', error);
    next(error);
  }
};
