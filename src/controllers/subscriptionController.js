const prisma = require('../lib/prisma');
const iap = require('../services/iapService');
const squareService = require('../services/squareService');

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
        priceMonthly: '$12.99', priceCents: 1299, memberLimit: 10,
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
        priceMonthly: '$49.99', priceCents: 4999, memberLimit: 9999,
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
};// POST /api/subscription/create-square-checkout — Create Square Web Checkout
exports.createSquareCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    if (!plan || !['PLUS', 'PRO', 'ELITE'].includes(plan.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Valid plan name is required' });
    }

    // Determine price in cents (hardcoded for simplicity, should match getPlans)
    const prices = { PLUS: 499, PRO: 1299, ELITE: 49500 };
    const amountCents = prices[plan.toUpperCase()];

    const checkoutUrl = await squareService.createSubscriptionCheckout(req.user.id, plan.toUpperCase(), amountCents);

    res.json({
      success: true,
      data: { checkoutUrl },
    });
  } catch (error) {
    console.error('Square create checkout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/subscription/webhook/square — Square Webhook
exports.webhookSquare = async (req, res, next) => {
  // In a real app, verify Square webhook signature here
  try {
    const event = req.body;
    
    if (event.type === 'payment.updated' || event.type === 'invoice.payment_made') {
      // In this boilerplate, if you use createPaymentLink, Square might send a payment.created event.
      // We would parse the referenceId to get userId and plan
      console.log('Received Square payment webhook', event);
      // const referenceId = event.data.object.payment.reference_id;
      // if (referenceId) {
      //   const [userId, plan] = referenceId.split('|');
      //   await iap.activateSubscription(userId, { plan, platform: 'android_web' });
      // }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    res.status(500).json({ success: false });
  }
};
