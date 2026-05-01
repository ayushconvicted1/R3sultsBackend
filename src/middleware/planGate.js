const prisma = require('../lib/prisma');
const { PLAN_HIERARCHY } = require('../services/iapService');

const requirePlan = (...minimumPlans) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      let currentPlan = 'BASIC';

      if (subscription && ['active', 'grace_period'].includes(subscription.status)) {
        currentPlan = subscription.plan;
      } else if (subscription && subscription.status === 'canceled') {
        if (subscription.expiresAt && new Date() < subscription.expiresAt) {
          currentPlan = subscription.plan;
        }
      }

      const minRequired = minimumPlans.reduce((min, p) => {
        const level = PLAN_HIERARCHY[p] || 0;
        return Math.min(min, level);
      }, Infinity);

      if ((PLAN_HIERARCHY[currentPlan] || 0) >= minRequired) {
        req.userPlan = currentPlan;
        req.subscription = subscription;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'This feature requires a higher subscription plan',
        data: { currentPlan, requiredPlan: minimumPlans[0], upgradeRequired: true },
      });
    } catch (error) {
      console.error('Plan gate error:', error);
      return next(error);
    }
  };
};

const attachPlan = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      const subscription = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
      req.userPlan = 'BASIC';
      req.subscription = null;
      if (subscription) {
        req.subscription = subscription;
        if (['active', 'grace_period'].includes(subscription.status)) {
          req.userPlan = subscription.plan;
        } else if (subscription.status === 'canceled' && subscription.expiresAt && new Date() < subscription.expiresAt) {
          req.userPlan = subscription.plan;
        }
      }
    }
  } catch (error) {
    console.error('Attach plan error:', error);
  }
  next();
};

module.exports = { requirePlan, attachPlan };
