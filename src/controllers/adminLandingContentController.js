const prisma = require('../lib/prisma');
const { uploadToCloudinary, cloudinary } = require('../middleware/upload');

/**
 * GET /api/admin/landing-content?page=home&section=hero
 * Also used by public route: GET /api/landing-content?page=home
 */
exports.getContent = async (req, res, next) => {
  try {
    const { page, section } = req.query;
    if (!page) {
      return res.status(400).json({ success: false, message: 'Query parameter "page" is required (home | about)' });
    }

    const where = { page };
    if (section) where.section = section;

    const items = await prisma.landingContent.findMany({
      where,
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { key: 'asc' }],
    });

    // Group by section
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.section]) grouped[item.section] = [];
      grouped[item.section].push(item);
    }

    res.json({ success: true, data: { page, sections: grouped, items } });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/landing-content
 * Body: { page, section, key, value, sortOrder? }
 * Or batch: { items: [{ page, section, key, value, sortOrder? }] }
 */
exports.upsertContent = async (req, res, next) => {
  try {
    const { page, section, key, value, sortOrder, items } = req.body;

    // Batch upsert
    if (Array.isArray(items) && items.length > 0) {
      const results = [];
      for (const item of items) {
        if (!item.page || !item.section || !item.key) continue;
        const record = await prisma.landingContent.upsert({
          where: { page_section_key: { page: item.page, section: item.section, key: item.key } },
          update: {
            value: item.value ?? '',
            sortOrder: item.sortOrder ?? 0,
            updatedBy: req.user?.id || null,
          },
          create: {
            page: item.page,
            section: item.section,
            key: item.key,
            value: item.value ?? '',
            sortOrder: item.sortOrder ?? 0,
            updatedBy: req.user?.id || null,
          },
        });
        results.push(record);
      }
      return res.json({ success: true, data: results, message: `${results.length} items saved` });
    }

    // Single upsert
    if (!page || !section || !key) {
      return res.status(400).json({ success: false, message: 'page, section, and key are required' });
    }

    const record = await prisma.landingContent.upsert({
      where: { page_section_key: { page, section, key } },
      update: {
        value: value ?? '',
        sortOrder: sortOrder ?? 0,
        updatedBy: req.user?.id || null,
      },
      create: {
        page,
        section,
        key,
        value: value ?? '',
        sortOrder: sortOrder ?? 0,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/landing-content/upload
 * Form data: file (image/video), page, section, key, sortOrder?
 * Deletes old Cloudinary asset if replacing.
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    const { page, section, key, sortOrder } = req.body;
    if (!page || !section || !key) {
      return res.status(400).json({ success: false, message: 'page, section, and key are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    // Determine media type
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';
    const resourceType = isVideo ? 'video' : 'image';

    // Check if there's an existing record to clean up old Cloudinary asset
    const existing = await prisma.landingContent.findUnique({
      where: { page_section_key: { page, section, key } },
    });

    if (existing && existing.publicId) {
      // Delete old asset from Cloudinary to avoid unnecessary storage
      await cloudinary.uploader.destroy(existing.publicId, { resource_type: resourceType }).catch((err) => {
        console.warn('Failed to delete old Cloudinary asset:', existing.publicId, err.message);
      });
    }

    // Upload new asset to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `r3sults/landing/${page}/${section}`,
      resource_type: resourceType,
    });

    // Upsert the record
    const record = await prisma.landingContent.upsert({
      where: { page_section_key: { page, section, key } },
      update: {
        value: result.secure_url,
        mediaType,
        publicId: result.public_id,
        sortOrder: sortOrder ? parseInt(sortOrder) : (existing?.sortOrder ?? 0),
        updatedBy: req.user?.id || null,
      },
      create: {
        page,
        section,
        key,
        value: result.secure_url,
        mediaType,
        publicId: result.public_id,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/landing-content/:id
 * Deletes the content entry and its Cloudinary asset.
 */
exports.deleteContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.landingContent.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    // Delete Cloudinary asset if present
    if (existing.publicId) {
      const resourceType = existing.mediaType === 'video' ? 'video' : 'image';
      await cloudinary.uploader.destroy(existing.publicId, { resource_type: resourceType }).catch((err) => {
        console.warn('Failed to delete Cloudinary asset:', existing.publicId, err.message);
      });
    }

    await prisma.landingContent.delete({ where: { id } });

    res.json({ success: true, message: 'Content deleted' });
  } catch (error) {
    next(error);
  }
};
