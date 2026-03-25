const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');
const { sendBulkEmails } = require('../utils/email');

// ─── Public ─────────────────────────────────────────────────

/**
 * Subscribe an email to the newsletter.
 * POST /api/newsletter/subscribe
 */
exports.subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (existing.isActive) {
        return res.json({ success: true, message: 'Already subscribed' });
      }
      // Re-activate
      await prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { isActive: true, unsubscribedAt: null, subscribedAt: new Date() },
      });
      return res.json({ success: true, message: 'Successfully re-subscribed' });
    }

    await prisma.newsletterSubscriber.create({
      data: { email: normalizedEmail },
    });

    res.status(201).json({ success: true, message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    next(error);
  }
};

/**
 * Unsubscribe an email from the newsletter.
 * POST /api/newsletter/unsubscribe
 */
exports.unsubscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscriber || !subscriber.isActive) {
      return res.status(404).json({ success: false, message: 'Email not found or already unsubscribed' });
    }

    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { isActive: false, unsubscribedAt: new Date() },
    });

    res.json({ success: true, message: 'Successfully unsubscribed' });
  } catch (error) {
    next(error);
  }
};

// ─── Admin ──────────────────────────────────────────────────

/**
 * Get paginated list of subscribers.
 * GET /api/newsletter/subscribers?page=1&limit=20&search=&status=active
 */
exports.getSubscribers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query);
    const search = (req.query.search || '').trim();
    const status = req.query.status; // 'active', 'inactive', or omit for all

    const where = {};

    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.newsletterSubscriber.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        subscribers,
        pagination: paginationMeta(total, page, limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get ALL active subscriber IDs and emails (for "Select All" button).
 * Returns lightweight data only — no pagination.
 * GET /api/newsletter/subscribers/all
 */
exports.getAllSubscriberEmails = async (req, res, next) => {
  try {
    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
      select: { id: true, email: true },
      orderBy: { subscribedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        subscribers,
        total: subscribers.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send newsletter email to selected subscribers or all.
 * POST /api/newsletter/send
 * Body: { subject, html, emailIds?: string[], sendToAll?: boolean }
 */
exports.sendNewsletter = async (req, res, next) => {
  try {
    const { subject, html, emailIds, sendToAll } = req.body;

    let recipients = [];

    if (sendToAll) {
      const all = await prisma.newsletterSubscriber.findMany({
        where: { isActive: true },
        select: { email: true },
      });
      recipients = all.map((s) => s.email);
    } else if (emailIds && emailIds.length > 0) {
      const selected = await prisma.newsletterSubscriber.findMany({
        where: { id: { in: emailIds }, isActive: true },
        select: { email: true },
      });
      recipients = selected.map((s) => s.email);
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients found' });
    }

    const result = await sendBulkEmails({
      recipients,
      subject,
      html,
    });

    res.json({
      success: true,
      message: `Newsletter sent to ${result.sent} recipient(s)`,
      data: {
        totalRecipients: recipients.length,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get newsletter subscription stats.
 * GET /api/newsletter/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const [totalActive, totalInactive, total] = await Promise.all([
      prisma.newsletterSubscriber.count({ where: { isActive: true } }),
      prisma.newsletterSubscriber.count({ where: { isActive: false } }),
      prisma.newsletterSubscriber.count(),
    ]);

    res.json({
      success: true,
      data: { totalActive, totalInactive, total },
    });
  } catch (error) {
    next(error);
  }
};
