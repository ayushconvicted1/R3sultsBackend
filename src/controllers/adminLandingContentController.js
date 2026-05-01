const prisma = require('../lib/prisma');
const { uploadToCloudinary, cloudinary } = require('../middleware/upload');
const seedData = require('../utils/landingContentSeed');

// ─── Allowed pages ───
const VALID_PAGES = ['home', 'about', 'contact', 'shared'];

// ═══════════════════════════════════════════════════════════
// PUBLIC + ADMIN: Read endpoints
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/landing-content?page=home
 * GET /api/admin/landing-content?page=home
 *
 * Returns all sections for a page, grouped and ordered.
 * If ?section=hero is provided, returns only that section.
 */
exports.getPageContent = async (req, res, next) => {
  try {
    const { page, section } = req.query;

    if (!page) {
      return res.status(400).json({ success: false, message: 'Query parameter "page" is required (home | about | contact | shared)' });
    }

    const where = { page };
    if (section) where.section = section;

    const items = await prisma.landingContent.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { section: 'asc' }],
    });

    // If single section requested, return just that content
    if (section) {
      const item = items[0];
      return res.json({
        success: true,
        data: item ? { id: item.id, page: item.page, section: item.section, content: item.content, sortOrder: item.sortOrder, updatedAt: item.updatedAt } : null,
      });
    }

    // Build sections object: { sectionName: content }
    const sections = {};
    for (const item of items) {
      sections[item.section] = item.content;
    }

    res.json({
      success: true,
      data: {
        page,
        sections,
        _meta: {
          sectionCount: items.length,
          sectionNames: items.map((i) => i.section),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/landing-content/:page/:section
 * GET /api/admin/landing-content/:page/:section
 *
 * Returns content for a specific page+section.
 */
exports.getSectionContent = async (req, res, next) => {
  try {
    const { page, section } = req.params;

    const item = await prisma.landingContent.findUnique({
      where: { page_section: { page, section } },
    });

    if (!item) {
      return res.status(404).json({ success: false, message: `Section "${section}" not found for page "${page}"` });
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        page: item.page,
        section: item.section,
        content: item.content,
        sortOrder: item.sortOrder,
        updatedBy: item.updatedBy,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/landing-content/full
 *
 * Returns ALL pages and ALL sections in one call.
 * Useful for SSR / initial page loads.
 */
exports.getFullContent = async (_req, res, next) => {
  try {
    const items = await prisma.landingContent.findMany({
      orderBy: [{ page: 'asc' }, { sortOrder: 'asc' }],
    });

    const result = {};
    for (const item of items) {
      if (!result[item.page]) result[item.page] = {};
      result[item.page][item.section] = item.content;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Write endpoints
// ═══════════════════════════════════════════════════════════

/**
 * PUT /api/admin/landing-content/:page/:section
 *
 * Upsert the content JSON for a specific page+section.
 * Body: { content: { ... }, sortOrder?: number }
 */
exports.upsertSection = async (req, res, next) => {
  try {
    const { page, section } = req.params;
    const { content, sortOrder } = req.body;

    if (!VALID_PAGES.includes(page)) {
      return res.status(400).json({ success: false, message: `Invalid page "${page}". Must be one of: ${VALID_PAGES.join(', ')}` });
    }
    if (!section) {
      return res.status(400).json({ success: false, message: 'Section name is required' });
    }
    if (content === undefined || content === null) {
      return res.status(400).json({ success: false, message: 'Content object is required in the request body' });
    }

    const record = await prisma.landingContent.upsert({
      where: { page_section: { page, section } },
      update: {
        content,
        sortOrder: sortOrder ?? undefined,
        updatedBy: req.user?.id || null,
      },
      create: {
        page,
        section,
        content,
        sortOrder: sortOrder ?? 0,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({ success: true, data: record, message: `Section "${section}" saved for page "${page}"` });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/landing-content/bulk
 *
 * Bulk upsert multiple sections at once.
 * Body: { items: [{ page, section, content, sortOrder? }] }
 */
exports.bulkUpsert = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items[] array is required and must not be empty' });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      if (!item.page || !item.section || item.content === undefined) {
        errors.push({ page: item.page, section: item.section, error: 'Missing page, section, or content' });
        continue;
      }
      if (!VALID_PAGES.includes(item.page)) {
        errors.push({ page: item.page, section: item.section, error: `Invalid page "${item.page}"` });
        continue;
      }

      try {
        const record = await prisma.landingContent.upsert({
          where: { page_section: { page: item.page, section: item.section } },
          update: {
            content: item.content,
            sortOrder: item.sortOrder ?? undefined,
            updatedBy: req.user?.id || null,
          },
          create: {
            page: item.page,
            section: item.section,
            content: item.content,
            sortOrder: item.sortOrder ?? 0,
            updatedBy: req.user?.id || null,
          },
        });
        results.push(record);
      } catch (err) {
        errors.push({ page: item.page, section: item.section, error: err.message });
      }
    }

    res.json({
      success: true,
      data: { saved: results.length, failed: errors.length, results, errors },
      message: `${results.length} sections saved, ${errors.length} failed`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/landing-content/:page/:section
 *
 * Partially update a section's content.
 * Merges the provided fields into the existing content JSON.
 * Body: { content: { fieldToUpdate: newValue, ... } }
 */
exports.patchSection = async (req, res, next) => {
  try {
    const { page, section } = req.params;
    const { content: patchContent } = req.body;

    if (!patchContent || typeof patchContent !== 'object') {
      return res.status(400).json({ success: false, message: 'content object is required for patch' });
    }

    const existing = await prisma.landingContent.findUnique({
      where: { page_section: { page, section } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: `Section "${section}" not found for page "${page}"` });
    }

    // Shallow merge
    const mergedContent = { ...existing.content, ...patchContent };

    const record = await prisma.landingContent.update({
      where: { page_section: { page, section } },
      data: {
        content: mergedContent,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({ success: true, data: record, message: `Section "${section}" patched` });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/landing-content/:page/:section
 *
 * Delete a section.
 */
exports.deleteSection = async (req, res, next) => {
  try {
    const { page, section } = req.params;

    const existing = await prisma.landingContent.findUnique({
      where: { page_section: { page, section } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: `Section "${section}" not found for page "${page}"` });
    }

    await prisma.landingContent.delete({
      where: { page_section: { page, section } },
    });

    res.json({ success: true, message: `Section "${section}" deleted from page "${page}"` });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/landing-content/upload
 *
 * Upload media (image/video) to Cloudinary.
 * Form data: file, page, section, key (dot-path inside content, e.g. "hero.backgroundImage")
 * Returns the Cloudinary URL that the admin can then PUT into the content JSON.
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    const { page, section, key } = req.body;

    if (!page || !section) {
      return res.status(400).json({ success: false, message: 'page and section are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `r3sults/landing/${page}/${section}`,
      resource_type: resourceType,
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        mediaType: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        key: key || null,
      },
      message: 'Media uploaded successfully. Use the URL in your content update.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/landing-content/seed
 *
 * Seed the database with default content from the CMS contract.
 * This will upsert all sections — existing content for a page+section will be overwritten.
 */
exports.seedContent = async (req, res, next) => {
  try {
    const results = [];

    for (const item of seedData) {
      const record = await prisma.landingContent.upsert({
        where: { page_section: { page: item.page, section: item.section } },
        update: {
          content: item.content,
          sortOrder: item.sortOrder ?? 0,
          updatedBy: req.user?.id || null,
        },
        create: {
          page: item.page,
          section: item.section,
          content: item.content,
          sortOrder: item.sortOrder ?? 0,
          updatedBy: req.user?.id || null,
        },
      });
      results.push({ page: record.page, section: record.section, id: record.id });
    }

    res.json({
      success: true,
      data: results,
      message: `${results.length} sections seeded across ${[...new Set(results.map((r) => r.page))].length} pages`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/landing-content/sections-list
 *
 * Returns a list of all page+section combinations in the database.
 * Useful for the admin panel to show what's editable.
 */
exports.listSections = async (_req, res, next) => {
  try {
    const items = await prisma.landingContent.findMany({
      select: { id: true, page: true, section: true, sortOrder: true, updatedAt: true, updatedBy: true },
      orderBy: [{ page: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by page
    const grouped = {};
    for (const item of items) {
      if (!grouped[item.page]) grouped[item.page] = [];
      grouped[item.page].push(item);
    }

    res.json({ success: true, data: { pages: grouped, total: items.length } });
  } catch (error) {
    next(error);
  }
};
