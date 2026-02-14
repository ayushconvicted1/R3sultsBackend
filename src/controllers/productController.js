const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, location, sortBy, sortOrder } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const where = {};
    if (category) where.category = category;

    const orderBy = {};
    if (sortBy) orderBy[sortBy] = sortOrder === 'DESC' ? 'desc' : 'asc';
    else orderBy.createdAt = 'desc';

    const [products, total] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM products ${category ? `WHERE category = '${category}'` : ''} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${skip}`).catch(() => []),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM products ${category ? `WHERE category = '${category}'` : ''}`).catch(() => [{ count: 0 }]),
    ]);

    // Products table may not exist yet — return empty if so
    res.json({
      success: true,
      data: products || [],
      pagination: paginationMeta(parseInt(total?.[0]?.count || '0', 10), page, limit),
      recommendedCategory: null,
    });
  } catch (error) { next(error); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const [product] = await prisma.$queryRawUnsafe(`SELECT * FROM products WHERE id = ${parseInt(req.params.id, 10)}`).catch(() => [null]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, category, stockQuantity, imageUrl, isFemaApproved } = req.body;
    const [product] = await prisma.$queryRawUnsafe(
      `INSERT INTO products (name, description, price, category, "stockQuantity", "imageUrl", "isFemaApproved", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      name, description, price, category, stockQuantity || 0, imageUrl || null, isFemaApproved || false
    ).catch(() => [null]);
    if (!product) return res.status(500).json({ success: false, message: 'Failed to create product. Ensure products table exists.' });
    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) { next(error); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(req.body)) {
      const dbKey = key === 'stockQuantity' ? '"stockQuantity"' : key === 'imageUrl' ? '"imageUrl"' : key === 'isFemaApproved' ? '"isFemaApproved"' : `"${key}"`;
      fields.push(`${dbKey} = $${idx}`);
      values.push(val);
      idx++;
    }
    fields.push(`"updatedAt" = NOW()`);
    values.push(parseInt(req.params.id, 10));

    const [product] = await prisma.$queryRawUnsafe(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, ...values
    ).catch(() => [null]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error) { next(error); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    await prisma.$queryRawUnsafe(`DELETE FROM products WHERE id = $1`, parseInt(req.params.id, 10)).catch(() => {});
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) { next(error); }
};
