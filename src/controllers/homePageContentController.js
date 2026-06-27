const prisma = require('../lib/prisma');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../middleware/upload');
const seedData = require('../utils/homePageContentSeed');

// ─── Valid top-level section names (used for validation) ───
const VALID_SECTIONS = [
  'hero',
  'approach',
  'impact',
  'operations',
  'testimonials',
  'donate',
  'stories',
  'news',
  'volunteer',
];

// ─── Helper: get or create the single content row ───
async function getContentRow() {
  const row = await prisma.homePageContent.findFirst();
  return row;
}

// ═══════════════════════════════════════════════════════════
// Deep merge utility
// ═══════════════════════════════════════════════════════════

/**
 * Deep-merges `source` into `target`.
 * - Plain objects are recursively merged.
 * - Arrays are replaced entirely (not concatenated).
 * - Primitives from source overwrite target.
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === 'object' &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === 'object' &&
      !Array.isArray(tgtVal)
    ) {
      // Both are plain objects → recurse
      result[key] = deepMerge(tgtVal, srcVal);
    } else {
      // Arrays, primitives, or type mismatch → overwrite
      result[key] = srcVal;
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// PUBLIC: Read endpoints
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/home-page-content
 *
 * Returns the full home page content JSON.
 * This is the single endpoint the frontend fetches.
 */
exports.getFullContent = async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const row = await getContentRow();

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet. Run the seed endpoint first.',
      });
    }

    res.json(row.content);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/home-page-content/:section
 *
 * Returns a single section of the home page content.
 * e.g. GET /api/home-page-content/hero → returns the hero object
 */
exports.getSection = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const { section } = req.params;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section "${section}". Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const row = await getContentRow();

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet.',
      });
    }

    const sectionContent = row.content[section];
    if (sectionContent === undefined) {
      return res.status(404).json({
        success: false,
        message: `Section "${section}" not found in home page content.`,
      });
    }

    res.json({ success: true, data: sectionContent });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Read endpoints
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/admin/home-page-content
 *
 * Returns the full home page content with metadata (version, updatedBy, timestamps).
 */
exports.adminGetFullContent = async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const row = await getContentRow();

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet. Run the seed endpoint first.',
      });
    }

    res.json({
      success: true,
      data: {
        id: row.id,
        content: row.content,
        version: row.version,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/home-page-content/:section
 *
 * Returns a single section with metadata.
 */
exports.adminGetSection = async (req, res, next) => {
  try {
    const { section } = req.params;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section "${section}". Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    const row = await getContentRow();

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet.',
      });
    }

    const sectionContent = row.content[section];
    if (sectionContent === undefined) {
      return res.status(404).json({
        success: false,
        message: `Section "${section}" not found in home page content.`,
      });
    }

    res.json({
      success: true,
      data: {
        section,
        content: sectionContent,
        version: row.version,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════
// ADMIN: Write endpoints
// ═══════════════════════════════════════════════════════════

/**
 * PUT /api/admin/home-page-content
 *
 * Full replace — overwrites the entire content JSON.
 * Body: { content: { hero: {...}, approach: {...}, ... } }
 */
exports.fullReplace = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a "content" object with the full home page JSON.',
      });
    }

    const existing = await getContentRow();
    const newVersion = existing ? existing.version + 1 : 1;

    let record;
    if (existing) {
      record = await prisma.homePageContent.update({
        where: { id: existing.id },
        data: {
          content,
          version: newVersion,
          updatedBy: req.user?.id || null,
        },
      });
    } else {
      record = await prisma.homePageContent.create({
        data: {
          content,
          version: newVersion,
          updatedBy: req.user?.id || null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: record.id,
        version: record.version,
        updatedAt: record.updatedAt,
      },
      message: `Home page content fully replaced (v${record.version}).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/home-page-content/:section
 *
 * Partial update — deep-merges the provided fields into the specified section.
 *
 * Body: { fields: { ... } }
 *
 * Examples:
 *   PATCH /api/admin/home-page-content/hero
 *   { "fields": { "headline": "New Headline" } }
 *   → Only hero.headline is updated; all other hero fields remain.
 *
 *   PATCH /api/admin/home-page-content/impact
 *   { "fields": { "stats": [ ... ] } }
 *   → impact.stats array is fully replaced; other impact fields remain.
 */
exports.patchSection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { fields } = req.body;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section "${section}". Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    if (!fields || typeof fields !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a "fields" object with the fields to update.',
      });
    }

    const existing = await getContentRow();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet. Run the seed endpoint first.',
      });
    }

    const existingContent = existing.content;
    const existingSection = existingContent[section];

    if (existingSection === undefined) {
      return res.status(404).json({
        success: false,
        message: `Section "${section}" does not exist in the current content.`,
      });
    }

    // Deep merge the fields into the existing section
    const mergedSection = deepMerge(existingSection, fields);

    // Rebuild the full content with the updated section
    const updatedContent = {
      ...existingContent,
      [section]: mergedSection,
    };

    const newVersion = existing.version + 1;

    const record = await prisma.homePageContent.update({
      where: { id: existing.id },
      data: {
        content: updatedContent,
        version: newVersion,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({
      success: true,
      data: {
        section,
        content: mergedSection,
        version: record.version,
        updatedAt: record.updatedAt,
      },
      message: `Section "${section}" updated (v${record.version}).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/admin/home-page-content/:section
 *
 * Full section replace — overwrites the entire section content.
 * Body: { content: { ... } }
 */
exports.replaceSection = async (req, res, next) => {
  try {
    const { section } = req.params;
    const { content: sectionContent } = req.body;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section "${section}". Must be one of: ${VALID_SECTIONS.join(', ')}`,
      });
    }

    if (!sectionContent || typeof sectionContent !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Request body must contain a "content" object with the full section JSON.',
      });
    }

    const existing = await getContentRow();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Home page content has not been configured yet. Run the seed endpoint first.',
      });
    }

    const updatedContent = {
      ...existing.content,
      [section]: sectionContent,
    };

    const newVersion = existing.version + 1;

    const record = await prisma.homePageContent.update({
      where: { id: existing.id },
      data: {
        content: updatedContent,
        version: newVersion,
        updatedBy: req.user?.id || null,
      },
    });

    res.json({
      success: true,
      data: {
        section,
        content: sectionContent,
        version: record.version,
        updatedAt: record.updatedAt,
      },
      message: `Section "${section}" fully replaced (v${record.version}).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/home-page-content/seed
 *
 * Seeds the database with the default home page content.
 * If content already exists, it will be overwritten.
 */
exports.seedContent = async (req, res, next) => {
  try {
    const existing = await getContentRow();
    const newVersion = existing ? existing.version + 1 : 1;

    let record;
    if (existing) {
      record = await prisma.homePageContent.update({
        where: { id: existing.id },
        data: {
          content: seedData,
          version: newVersion,
          updatedBy: req.user?.id || null,
        },
      });
    } else {
      record = await prisma.homePageContent.create({
        data: {
          content: seedData,
          version: newVersion,
          updatedBy: req.user?.id || null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: record.id,
        version: record.version,
        sections: Object.keys(seedData),
        updatedAt: record.updatedAt,
      },
      message: `Home page content seeded with ${Object.keys(seedData).length} sections (v${record.version}).`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/home-page-content/upload
 *
 * Upload media (image/video) to Cloudinary for home page content.
 * Form data: file, section, key (dot-path), oldUrl (optional)
 * Returns the Cloudinary URL to use in a subsequent PATCH/PUT call.
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    const { section, key, oldUrl } = req.body;

    if (!section) {
      return res.status(400).json({ success: false, message: '"section" is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const isVideo = req.file.mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : 'image';

    const uploadOptions = {
      folder: `r3sults/home-page/${section}`,
      resource_type: resourceType,
    };

    if (isVideo) {
      uploadOptions.transformation = [
        { width: 1080, crop: 'limit' },
        { quality: 'auto' },
      ];
    } else {
      uploadOptions.transformation = [
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ];
    }

    const result = await uploadToCloudinary(req.file.buffer, uploadOptions);

    // Clean up old media if provided
    if (oldUrl) {
      const oldPublicId = extractPublicId(oldUrl);
      if (oldPublicId) {
        const oldResourceType = oldUrl.includes('/video/') ? 'video' : 'image';
        deleteFromCloudinary(oldPublicId, oldResourceType).catch((err) => {
          console.error(`Failed to delete old Cloudinary media: ${oldPublicId}`, err);
        });
      }
    }

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
 * GET /api/admin/home-page-content/meta
 *
 * Returns metadata about the home page content (without the full content body).
 * Useful for the admin panel to show status/last-updated info.
 */
exports.getMeta = async (_req, res, next) => {
  try {
    const row = await getContentRow();

    if (!row) {
      return res.json({
        success: true,
        data: {
          exists: false,
          sections: [],
          version: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        exists: true,
        id: row.id,
        sections: Object.keys(row.content),
        version: row.version,
        updatedBy: row.updatedBy,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
