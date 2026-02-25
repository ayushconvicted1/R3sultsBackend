const prisma = require('../lib/prisma');

// ─── products ───
exports.get_products = async (req, res, next) => {
  try {
    const page = parseInt(req.query['page'] || '1', 10);
    const limit = parseInt(req.query['limit'] || '20', 10);
    const search = (req.query['search'] || '').trim();
    const category = req.query['category'] || '';
    const status = req.query['status'] || '';
    const brand = req.query['brand'] || '';
    const lowStock = req.query['lowStock'] === 'true';
    const featured = req.query['featured'] === 'true';

    // Build Prisma-compatible where clause
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      where.category = category;
    }
    if (status) {
      where.status = status;
    }
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }
    if (featured) {
      where.isFeatured = true;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.adminProduct.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.adminProduct.count({ where }),
    ]);

    // Transform products for response
    const transformedProducts = products.map((product) => ({
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

    return res.json({
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
  } catch (error) {
    console.error('get_products error:', error);
    next(error);
  }
};

exports.post_products = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, message: 'Not authorized. No token provided.' });
    }
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const body = req.body;
    if (!body.name || !body.sku || !body.category) {
      return res.status(400).json({ success: false, error: 'Name, SKU, and category are required' });
    }

    const existingProduct = await prisma.adminProduct.findFirst({ where: { sku: body.sku.toUpperCase() } });
    if (existingProduct) {
      return res.status(400).json({ success: false, error: 'Product with this SKU already exists' });
    }

    const product = await prisma.adminProduct.create({
      data: {
        name: body.name,
        sku: body.sku.toUpperCase(),
        category: body.category,
        description: body.description || '',
        barcode: body.barcode || '',
        subcategory: body.subcategory || '',
        costPrice: body.costPrice || 0,
        sellingPrice: body.sellingPrice || 0,
        discount: body.discount || 0,
        taxRate: body.taxRate || 0,
        brand: body.brand || '',
        model: body.model || '',
        material: body.material || '',
        weight: body.weight || 0,
        dimensions: body.dimensions || {},
        size: body.size || [],
        color: body.color || [],
        safetyFeatures: body.safetyFeatures || [],
        safetyStandards: body.safetyStandards || [],
        certifications: body.certifications || [],
        images: body.images || [],
        videoUrl: body.videoUrl || '',
        keyFeatures: body.keyFeatures || [],
        variants: body.variants || [],
        categoryAttributes: body.categoryAttributes || {},
        specifications: body.specifications || [],
        vendor: body.vendor || {},
        status: body.status || 'active',
        isFeatured: body.isFeatured || false,
        tags: body.tags || [],
        warrantyPeriod: body.warrantyPeriod || '',
        returnPolicy: body.returnPolicy || '',
        shippingInfo: body.shippingInfo || {},
        createdBy: tokenPayload.userId,
        lastModifiedBy: tokenPayload.userId,
        stock: {
          quantity: body.stock?.quantity || 0,
          lowStockThreshold: body.stock?.lowStockThreshold || 10,
          reservedQuantity: body.stock?.reservedQuantity || 0,
          availableQuantity: (body.stock?.quantity || 0) - (body.stock?.reservedQuantity || 0),
          reorderPoint: body.stock?.reorderPoint || 0,
          maxStock: body.stock?.maxStock || 0,
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: { product },
      message: 'Product created successfully',
    });
  } catch (error) {
    console.error('post_products error:', error);
    next(error);
  }
};

// ─── products/[id] ───
exports.get_products__id = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.adminProduct.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('get_products__id error:', error);
    next(error);
  }
};

exports.put_products__id = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    const { id } = req.params;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const body = req.body;

    if (body.sku) {
      const existingProduct = await prisma.adminProduct.findFirst({
        where: { sku: body.sku.toUpperCase(), id: { not: id } },
      });
      if (existingProduct) {
        return res.status(400).json({ success: false, error: 'Product with this SKU already exists' });
      }
      body.sku = body.sku.toUpperCase();
    }

    if (body.variants && Array.isArray(body.variants) && body.variants.length > 0) {
      const totalQuantity = body.variants.reduce((sum, variant) => {
        return sum + (Number(variant.stock?.quantity || variant.stockQuantity || 0) || 0);
      }, 0);
      const totalReserved = body.variants.reduce((sum, variant) => {
        return sum + (Number(variant.stock?.reservedQuantity || variant.reservedQuantity || 0) || 0);
      }, 0);
      body.stock = {
        ...body.stock,
        quantity: totalQuantity,
        reservedQuantity: totalReserved,
        availableQuantity: Math.max(0, totalQuantity - totalReserved),
      };
    } else if (body.stock) {
      const quantity = Number(body.stock.quantity) || 0;
      const reservedQuantity = Number(body.stock.reservedQuantity) || 0;
      body.stock.availableQuantity = Math.max(0, quantity - reservedQuantity);
    }

    body.lastModifiedBy = tokenPayload.userId;

    const product = await prisma.adminProduct.update({ where: { id }, data: body });
    return res.json({
      success: true,
      data: { product },
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('put_products__id error:', error);
    next(error);
  }
};

exports.delete_products__id = async (req, res, next) => {
  try {
    const tokenPayload = req.user;
    const { id } = req.params;
    if (!tokenPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    if (tokenPayload.role !== 'super_admin' && tokenPayload.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const product = await prisma.adminProduct.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await prisma.adminProduct.delete({ where: { id } });
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('delete_products__id error:', error);
    next(error);
  }
};
