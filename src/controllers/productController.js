const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, status, brand, sortBy, sortOrder } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const where = {};
    // Default to only showing active products for public visitors
    where.status = status || 'active';
    if (category) where.category = category;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    const orderBy = {};
    if (sortBy) orderBy[sortBy] = sortOrder === 'DESC' ? 'desc' : 'asc';
    else orderBy.createdAt = 'desc';

    const [products, total] = await Promise.all([
      prisma.adminProduct.findMany({ where, orderBy, skip, take: limit }),
      prisma.adminProduct.count({ where }),
    ]);

    const transformedProducts = products.map((product) => ({
      id: product.id.toString(),
      _id: product.id.toString(),
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      subcategory: product.subcategory,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      price: product.sellingPrice,
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

    res.json({
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
  } catch (error) { next(error); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await prisma.adminProduct.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({
      success: true,
      data: {
        product: {
          id: product.id.toString(),
          _id: product.id.toString(),
          name: product.name,
          description: product.description,
          sku: product.sku,
          barcode: product.barcode,
          category: product.category,
          subcategory: product.subcategory,
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          price: product.sellingPrice,
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
        },
      },
    });
  } catch (error) { next(error); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stockQuantity, imageUrl, isFemaApproved } = req.body;
    const product = await prisma.adminProduct.create({
      data: {
        name,
        description: description || '',
        sku: `PUB-${Date.now()}`,
        category,
        costPrice: price || 0,
        sellingPrice: price || 0,
        stock: {
          quantity: stockQuantity || 0,
          lowStockThreshold: 10,
          reservedQuantity: 0,
          availableQuantity: stockQuantity || 0,
          reorderPoint: 0,
          maxStock: 0,
        },
        images: imageUrl ? [{ url: imageUrl, alt: name, isPrimary: true }] : [],
        status: 'active',
      },
    });
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) { next(error); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await prisma.adminProduct.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) { next(error); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await prisma.adminProduct.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) { next(error); }
};
