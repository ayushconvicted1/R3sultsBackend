const prisma = require('../lib/prisma');
const iap = require('../services/iapService');
const stripeService = require('../services/stripeService');

// GET /api/subscription/plans — List available plans
exports.getPlans = async (req, res, next) => {
  try {
    const plans = [
      {
        id: 'basic', name: 'Basic', tier: 'BASIC',
        priceMonthly: '$0', priceCents: 0, memberLimit: 0,
        tagline: 'Essential awareness tools for every household.',
        productIds: { ios: null, android: null },
        features: iap.getPlanFeatures('BASIC'),
        featureList: [
          'Real-time disaster news feed', 'Weather alerts & forecasts',
          'Emergency broadcast alerts', 'Community alert network',
        ],
      },
      {
        id: 'plus', name: 'Plus', tier: 'PLUS',
        priceMonthly: '$4.99', priceCents: 499, memberLimit: 5,
        tagline: 'Live coordination tools plus preparedness resources.',
        productIds: { ios: 'com.r3sults.plus.monthly', android: 'com.r3sults.plus.monthly' },
        features: iap.getPlanFeatures('PLUS'),
        featureList: [
          'Shelter finder — full map & details', 'Educational disaster library',
          'Preparedness guides & checklists', 'Live GPS location tracking',
          'Family Finder — up to 5 members', 'Damage report submission & tracking',
          'Supply tracker — nearby resources', 'SOS signal & emergency contacts',
        ],
      },
      {
        id: 'pro', name: 'Pro', tier: 'PRO', isPopular: true,
        priceMonthly: '$10.99', priceCents: 1099, memberLimit: 10,
        tagline: 'Full recovery toolkit with discounted supplies & priority support.',
        productIds: { ios: 'com.r3sults.pro.monthly', android: 'com.r3sults.pro.monthly' },
        features: iap.getPlanFeatures('PRO'),
        featureList: [
          'Wholesale-discounted supply pricing', 'Discounted insurance quote access',
          'Priority in-app support', 'Advanced damage assessment tools',
          'Recovery progress dashboard', 'Expanded shelter network access',
          'Advanced preparedness planning tools', 'Family plan — up to 10 members',
        ],
      },
      {
        id: 'elite', name: 'Elite', tier: 'ELITE',
        priceMonthly: '$495', priceCents: 49500, memberLimit: 9999,
        tagline: 'Dedicated concierge support from first alert through full rebuild.',
        productIds: { ios: 'com.r3sults.elite.monthly', android: 'com.r3sults.elite.monthly' },
        features: iap.getPlanFeatures('ELITE'),
        featureList: [
          '24/7 dedicated concierge advisor', 'End-to-end insurance claim support',
          'Managed evacuation coordination', 'Direct access to R3sults ops team',
          'Rebuild vendor coordination', 'Bespoke preparedness planning session',
          'Unlimited members + device priority',
        ],
      },
    ];

    res.json({ success: true, data: { plans } });
  } catch (error) {
    next(error);
  }
};

// GET /api/subscription/current — Current subscription
exports.getCurrent = async (req, res, next) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    const currentPlan = await iap.getUserPlan(req.user.id);
    const features = iap.getPlanFeatures(currentPlan);
    const memberLimit = iap.getPlanMemberLimit(currentPlan);

    res.json({
      success: true,
      data: {
        subscription: subscription || null,
        currentPlan,
        features,
        memberLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscription/verify-apple — Verify Apple purchase
exports.verifyApple = async (req, res, next) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'transactionId is required' });
    }

    const result = await iap.verifyAppleTransaction(transactionId);

    if (!result.valid) {
      return res.status(400).json({ success: false, message: 'Invalid Apple transaction', error: result.error });
    }

    const plan = iap.productIdToPlan(result.productId);
    if (plan === 'BASIC') {
      return res.status(400).json({ success: false, message: 'Unknown product ID: ' + result.productId });
    }

    const subscription = await iap.activateSubscription(req.user.id, {
      plan,
      platform: 'ios',
      transactionData: {
        transactionId: result.transactionId,
        originalTransactionId: result.originalTransactionId,
        productId: result.productId,
        expiresDate: result.expiresDate,
      },
    });

    const features = iap.getPlanFeatures(plan);

    res.json({
      success: true,
      message: `Subscription activated: ${plan}`,
      data: { subscription, plan, features, memberLimit: iap.getPlanMemberLimit(plan) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscription/verify-google — Verify Google purchase
exports.verifyGoogle = async (req, res, next) => {
  try {
    const { purchaseToken, productId } = req.body;

    if (!purchaseToken || !productId) {
      return res.status(400).json({ success: false, message: 'purchaseToken and productId are required' });
    }

    const result = await iap.verifyGooglePurchase(
      process.env.GOOGLE_PLAY_PACKAGE_NAME,
      productId,
      purchaseToken
    );

    if (!result.valid) {
      return res.status(400).json({ success: false, message: 'Invalid Google purchase', error: result.error });
    }

    // Acknowledge the purchase
    await iap.acknowledgeGooglePurchase(process.env.GOOGLE_PLAY_PACKAGE_NAME, productId, purchaseToken);

    const plan = iap.productIdToPlan(result.productId || productId);
    if (plan === 'BASIC') {
      return res.status(400).json({ success: false, message: 'Unknown product ID: ' + productId });
    }

    const subscription = await iap.activateSubscription(req.user.id, {
      plan,
      platform: 'android',
      transactionData: {
        purchaseToken,
        orderId: result.orderId,
        productId: result.productId || productId,
        expiryTime: result.expiryTime,
      },
    });

    const features = iap.getPlanFeatures(plan);

    res.json({
      success: true,
      message: `Subscription activated: ${plan}`,
      data: { subscription, plan, features, memberLimit: iap.getPlanMemberLimit(plan) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscription/restore — Restore purchases
exports.restore = async (req, res, next) => {
  try {
    const { purchases } = req.body; // Array of { transactionId, productId, platform }

    if (!purchases || !Array.isArray(purchases) || purchases.length === 0) {
      return res.status(400).json({ success: false, message: 'No purchases to restore' });
    }

    let activatedPlan = 'BASIC';
    let activatedSubscription = null;

    for (const purchase of purchases) {
      try {
        let plan = 'BASIC';

        if (purchase.platform === 'ios' && purchase.transactionId) {
          const result = await iap.verifyAppleTransaction(purchase.transactionId);
          if (result.valid && result.expiresDate && new Date(result.expiresDate) > new Date()) {
            plan = iap.productIdToPlan(result.productId);
            if (iap.isPlanAtLeast(plan, activatedPlan)) {
              activatedSubscription = await iap.activateSubscription(req.user.id, {
                plan, platform: 'ios',
                transactionData: { transactionId: result.transactionId, originalTransactionId: result.originalTransactionId, productId: result.productId, expiresDate: result.expiresDate },
              });
              activatedPlan = plan;
            }
          }
        } else if (purchase.platform === 'android' && purchase.purchaseToken) {
          const result = await iap.verifyGooglePurchase(process.env.GOOGLE_PLAY_PACKAGE_NAME, purchase.productId, purchase.purchaseToken);
          if (result.valid && result.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE') {
            plan = iap.productIdToPlan(result.productId || purchase.productId);
            if (iap.isPlanAtLeast(plan, activatedPlan)) {
              activatedSubscription = await iap.activateSubscription(req.user.id, {
                plan, platform: 'android',
                transactionData: { purchaseToken: purchase.purchaseToken, orderId: result.orderId, productId: result.productId || purchase.productId, expiryTime: result.expiryTime },
              });
              activatedPlan = plan;
            }
          }
        }
      } catch (err) {
        console.error('Error restoring purchase:', err);
      }
    }

    const features = iap.getPlanFeatures(activatedPlan);

    res.json({
      success: true,
      message: activatedPlan !== 'BASIC' ? `Restored subscription: ${activatedPlan}` : 'No active subscription found to restore',
      data: { subscription: activatedSubscription, plan: activatedPlan, features },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/subscription/webhook/apple — Apple notifications
exports.webhookApple = async (req, res, next) => {
  try {
    const { signedPayload } = req.body;
    if (!signedPayload) {
      return res.status(400).json({ success: false, message: 'Missing signedPayload' });
    }

    await iap.handleAppleNotification(signedPayload);
    res.json({ success: true });
  } catch (error) {
    console.error('Apple webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// POST /api/subscription/webhook/google — Google notifications
exports.webhookGoogle = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.data) {
      return res.status(400).json({ success: false, message: 'Missing notification data' });
    }

    const decodedData = JSON.parse(Buffer.from(message.data, 'base64').toString());
    await iap.handleGoogleNotification(decodedData);
    res.json({ success: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// POST /api/subscription/create-stripe — Create Stripe Subscription Intent
exports.createStripeSubscription = async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    if (!plan || !['PLUS', 'PRO', 'ELITE'].includes(plan.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Valid plan name is required' });
    }

    const stripeData = await stripeService.createSubscriptionFlow(req.user, plan);

    res.json({
      success: true,
      data: stripeData,
    });
  } catch (error) {
    console.error('Stripe create subscription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subscription/webhook/stripe — Stripe Webhook
exports.webhookStripe = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // We use req.body directly if body-parser.raw is used, but if JSON is used, Stripe verification fails unless raw body is available.
    // Assuming express.json() is used globally, we might need to handle this.
    // For now, if req.rawBody exists, use it, else stringify req.body (which might fail validation but is a common workaround if not set up correctly).
    const payload = req.rawBody || req.body;
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripeService.stripe.webhooks.constructEvent(
        payloadString,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      event = req.body; // Fallback if no secret configured (not recommended)
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripeService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handling error:', error);
    res.status(500).json({ success: false });
  }
};
