const prisma = require('../lib/prisma');

// ═══════════════════════════════════════════════════════════
// Plan Hierarchy & Feature Configuration
// ═══════════════════════════════════════════════════════════

const PLAN_HIERARCHY = { BASIC: 0, PLUS: 1, PRO: 2, ELITE: 3 };

const PLAN_MEMBER_LIMITS = {
  BASIC: 0,
  PLUS: 5,
  PRO: 10,
  ELITE: 9999,
};

const PLAN_FEATURES = {
  BASIC: {
    disasterNewsFeed: true,
    weatherAlerts: true,
    emergencyBroadcasts: true,
    communityAlertNetwork: true,
    shelterFinder: false,
    familyFinder: false,
    liveGPS: false,
    damageReports: false,
    sosSignal: false,
    supplyTracker: false,
    preparednessGuides: false,
    educationalLibrary: false,
    advancedDamageAssessment: false,
    recoveryDashboard: false,
    recoverySupport: false,
    prioritySupport: false,
    expandedShelterNetwork: false,
    advancedPrepPlanning: false,
    wholesaleSupplyPricing: false,
    conciergeAdvisor: false,
    vendorCoordination: false,
    managedEvacuation: false,
  },
  PLUS: {
    disasterNewsFeed: true,
    weatherAlerts: true,
    emergencyBroadcasts: true,
    communityAlertNetwork: true,
    shelterFinder: true,
    familyFinder: true,
    liveGPS: true,
    damageReports: true,
    sosSignal: true,
    supplyTracker: true,
    preparednessGuides: true,
    educationalLibrary: true,
    advancedDamageAssessment: false,
    recoveryDashboard: false,
    recoverySupport: false,
    prioritySupport: false,
    expandedShelterNetwork: false,
    advancedPrepPlanning: false,
    wholesaleSupplyPricing: false,
    conciergeAdvisor: false,
    vendorCoordination: false,
    managedEvacuation: false,
  },
  PRO: {
    disasterNewsFeed: true,
    weatherAlerts: true,
    emergencyBroadcasts: true,
    communityAlertNetwork: true,
    shelterFinder: true,
    familyFinder: true,
    liveGPS: true,
    damageReports: true,
    sosSignal: true,
    supplyTracker: true,
    preparednessGuides: true,
    educationalLibrary: true,
    advancedDamageAssessment: true,
    recoveryDashboard: true,
    recoverySupport: true,
    prioritySupport: true,
    expandedShelterNetwork: true,
    advancedPrepPlanning: true,
    wholesaleSupplyPricing: true,
    conciergeAdvisor: false,
    vendorCoordination: false,
    managedEvacuation: false,
  },
  ELITE: {
    disasterNewsFeed: true,
    weatherAlerts: true,
    emergencyBroadcasts: true,
    communityAlertNetwork: true,
    shelterFinder: true,
    familyFinder: true,
    liveGPS: true,
    damageReports: true,
    sosSignal: true,
    supplyTracker: true,
    preparednessGuides: true,
    educationalLibrary: true,
    advancedDamageAssessment: true,
    recoveryDashboard: true,
    recoverySupport: true,
    prioritySupport: true,
    expandedShelterNetwork: true,
    advancedPrepPlanning: true,
    wholesaleSupplyPricing: true,
    conciergeAdvisor: true,
    vendorCoordination: true,
    managedEvacuation: true,
  },
};

// Map store product IDs to plan tiers
const PRODUCT_ID_TO_PLAN = {
  // iOS (App Store Connect)
  'com.r3sults.r3app.plus.monthly': 'PLUS',
  'com.r3sults.r3app.pro.monthly': 'PRO',
  'com.r3sults.r3app.elite.monthly': 'ELITE',
  // Android (Google Play) — keep old IDs
  'com.r3sults.plus.monthly': 'PLUS',
  'com.r3sults.pro.monthly': 'PRO',
  'com.r3sults.elite.monthly': 'ELITE',
  // Annual (if added later)
  'com.r3sults.r3app.plus.yearly': 'PLUS',
  'com.r3sults.r3app.pro.yearly': 'PRO',
  'com.r3sults.r3app.elite.yearly': 'ELITE',
  'com.r3sults.plus.yearly': 'PLUS',
  'com.r3sults.pro.yearly': 'PRO',
  'com.r3sults.elite.yearly': 'ELITE',
};

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function productIdToPlan(productId) {
  return PRODUCT_ID_TO_PLAN[productId] || 'BASIC';
}

function getPlanFeatures(plan) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.BASIC;
}

function getPlanMemberLimit(plan) {
  return PLAN_MEMBER_LIMITS[plan] || 0;
}

function isPlanAtLeast(currentPlan, requiredPlan) {
  return (PLAN_HIERARCHY[currentPlan] || 0) >= (PLAN_HIERARCHY[requiredPlan] || 0);
}

// ═══════════════════════════════════════════════════════════
// Apple StoreKit 2 — Server-Side Verification
// ═══════════════════════════════════════════════════════════

/**
 * Verify an Apple StoreKit 2 transaction.
 * Uses the App Store Server API via the `app-store-server-api` library.
 * 
 * The mobile app sends the transactionId after a successful purchase.
 * We verify it server-side and extract subscription details.
 */
async function verifyAppleTransaction(transactionId) {
  try {
    const { AppStoreServerAPI, Environment } = require('app-store-server-api');
    
    const environment = process.env.APPLE_IAP_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox;

    const client = new AppStoreServerAPI(
      process.env.APPLE_IAP_PRIVATE_KEY,
      process.env.APPLE_IAP_KEY_ID,
      process.env.APPLE_IAP_ISSUER_ID,
      process.env.APPLE_IAP_BUNDLE_ID,
      environment,
    );

    // Get transaction info from Apple
    const transactionInfo = await client.getTransactionInfo(transactionId);
    
    if (!transactionInfo || !transactionInfo.signedTransactionInfo) {
      throw new Error('Invalid transaction response from Apple');
    }

    // Decode the signed transaction
    const { decodeTransaction } = require('app-store-server-api');
    const decoded = await decodeTransaction(transactionInfo.signedTransactionInfo);

    return {
      valid: true,
      transactionId: decoded.transactionId,
      originalTransactionId: decoded.originalTransactionId,
      productId: decoded.productId,
      expiresDate: decoded.expiresDate ? new Date(decoded.expiresDate) : null,
      purchaseDate: decoded.purchaseDate ? new Date(decoded.purchaseDate) : null,
      revocationDate: decoded.revocationDate ? new Date(decoded.revocationDate) : null,
      environment: decoded.environment,
    };
  } catch (error) {
    console.error('Apple transaction verification failed:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Get the current subscription status from Apple.
 * Useful for checking if a subscription is still active.
 */
async function getAppleSubscriptionStatus(originalTransactionId) {
  try {
    const { AppStoreServerAPI, Environment } = require('app-store-server-api');
    
    const environment = process.env.APPLE_IAP_ENVIRONMENT === 'production'
      ? Environment.Production
      : Environment.Sandbox;

    const client = new AppStoreServerAPI(
      process.env.APPLE_IAP_PRIVATE_KEY,
      process.env.APPLE_IAP_KEY_ID,
      process.env.APPLE_IAP_ISSUER_ID,
      process.env.APPLE_IAP_BUNDLE_ID,
      environment,
    );

    const statusResponse = await client.getSubscriptionStatuses(originalTransactionId);
    return statusResponse;
  } catch (error) {
    console.error('Failed to get Apple subscription status:', error);
    return null;
  }
}

/**
 * Process an Apple App Store Server Notification V2.
 * Called from the webhook endpoint.
 */
async function handleAppleNotification(signedPayload) {
  try {
    const { decodeNotificationPayload, decodeTransaction, decodeRenewalInfo } = require('app-store-server-api');
    const notification = await decodeNotificationPayload(signedPayload);

    const { notificationType, subtype, data } = notification;
    const transactionInfo = data?.signedTransactionInfo
      ? await decodeTransaction(data.signedTransactionInfo)
      : null;
    const renewalInfo = data?.signedRenewalInfo
      ? await decodeRenewalInfo(data.signedRenewalInfo)
      : null;

    if (!transactionInfo) {
      console.log('Apple notification without transaction info:', notificationType);
      return;
    }

    const originalTransactionId = transactionInfo.originalTransactionId;
    const subscription = await prisma.subscription.findFirst({
      where: { appleOriginalTransactionId: originalTransactionId },
    });

    if (!subscription) {
      console.log('No subscription found for Apple originalTransactionId:', originalTransactionId);
      return;
    }

    switch (notificationType) {
      case 'DID_RENEW':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            currentPeriodEnd: transactionInfo.expiresDate ? new Date(transactionInfo.expiresDate) : null,
            expiresAt: transactionInfo.expiresDate ? new Date(transactionInfo.expiresDate) : null,
            appleTransactionId: transactionInfo.transactionId,
          },
        });
        break;

      case 'EXPIRED':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'expired',
            expiresAt: new Date(),
          },
        });
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        if (subtype === 'AUTO_RENEW_DISABLED') {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'canceled',
              canceledAt: new Date(),
            },
          });
        } else if (subtype === 'AUTO_RENEW_ENABLED') {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              canceledAt: null,
            },
          });
        }
        break;

      case 'GRACE_PERIOD_EXPIRED':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' },
        });
        break;

      case 'DID_FAIL_TO_RENEW':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: subtype === 'GRACE_PERIOD' ? 'grace_period' : 'billing_retry' },
        });
        break;

      case 'REFUND':
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired', expiresAt: new Date() },
        });
        break;

      case 'DID_CHANGE_RENEWAL_INFO':
        // Plan change — the new product takes effect at next renewal
        if (renewalInfo?.autoRenewProductId) {
          const newPlan = productIdToPlan(renewalInfo.autoRenewProductId);
          // We could store "pending plan change" but for simplicity,
          // the plan changes at renewal (DID_RENEW with new product)
          console.log(`Apple plan change pending: ${subscription.plan} -> ${newPlan}`);
        }
        break;

      default:
        console.log('Unhandled Apple notification:', notificationType, subtype);
    }
  } catch (error) {
    console.error('Error handling Apple notification:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// Google Play Billing — Server-Side Verification
// ═══════════════════════════════════════════════════════════

/**
 * Verify a Google Play purchase using the Android Publisher API.
 */
async function verifyGooglePurchase(packageName, subscriptionId, purchaseToken) {
  try {
    const { google } = require('googleapis');

    const serviceAccount = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({ version: 'v3', auth });

    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName: packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME,
      token: purchaseToken,
    });

    const purchase = response.data;

    return {
      valid: true,
      subscriptionState: purchase.subscriptionState, // SUBSCRIPTION_STATE_ACTIVE, etc.
      productId: purchase.lineItems?.[0]?.productId || subscriptionId,
      expiryTime: purchase.lineItems?.[0]?.expiryTime
        ? new Date(purchase.lineItems[0].expiryTime)
        : null,
      acknowledgementState: purchase.acknowledgementState,
      orderId: purchase.latestOrderId,
    };
  } catch (error) {
    console.error('Google Play purchase verification failed:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Acknowledge a Google Play purchase (required within 3 days).
 */
async function acknowledgeGooglePurchase(packageName, subscriptionId, purchaseToken) {
  try {
    const { google } = require('googleapis');

    const serviceAccount = JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const androidPublisher = google.androidpublisher({ version: 'v3', auth });

    await androidPublisher.purchases.subscriptions.acknowledge({
      packageName: packageName || process.env.GOOGLE_PLAY_PACKAGE_NAME,
      subscriptionId,
      token: purchaseToken,
    });

    return true;
  } catch (error) {
    console.error('Google Play acknowledgement failed:', error);
    return false;
  }
}

/**
 * Process a Google Play Real-Time Developer Notification (RTDN).
 */
async function handleGoogleNotification(data) {
  try {
    const { subscriptionNotification } = data;
    if (!subscriptionNotification) {
      console.log('Google notification without subscription data');
      return;
    }

    const { purchaseToken, notificationType } = subscriptionNotification;

    const subscription = await prisma.subscription.findFirst({
      where: { googlePurchaseToken: purchaseToken },
    });

    if (!subscription) {
      console.log('No subscription found for Google purchaseToken');
      return;
    }

    // Google notification types:
    // 1: RECOVERED, 2: RENEWED, 3: CANCELED, 4: PURCHASED,
    // 5: ON_HOLD, 6: IN_GRACE_PERIOD, 7: RESTARTED,
    // 12: REVOKED, 13: EXPIRED
    switch (notificationType) {
      case 1: // RECOVERED
      case 2: // RENEWED
      case 7: // RESTARTED
        // Re-verify to get updated expiry
        const verified = await verifyGooglePurchase(
          process.env.GOOGLE_PLAY_PACKAGE_NAME,
          subscription.googleProductId,
          purchaseToken
        );
        if (verified.valid) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: 'active',
              currentPeriodEnd: verified.expiryTime,
              expiresAt: verified.expiryTime,
              canceledAt: null,
            },
          });
        }
        break;

      case 3: // CANCELED
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });
        break;

      case 5: // ON_HOLD
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'billing_retry' },
        });
        break;

      case 6: // IN_GRACE_PERIOD
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'grace_period' },
        });
        break;

      case 12: // REVOKED
      case 13: // EXPIRED
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired', expiresAt: new Date() },
        });
        break;

      default:
        console.log('Unhandled Google notification type:', notificationType);
    }
  } catch (error) {
    console.error('Error handling Google notification:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════
// Subscription Management
// ═══════════════════════════════════════════════════════════

/**
 * Get the user's current active plan.
 * Returns 'BASIC' if no active subscription found.
 */
async function getUserPlan(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return 'BASIC';

  // Check if subscription is still active
  if (['active', 'grace_period', 'canceled'].includes(subscription.status)) {
    // If canceled, still active until period end
    if (subscription.status === 'canceled' && subscription.expiresAt) {
      if (new Date() > subscription.expiresAt) {
        return 'BASIC';
      }
    }
    return subscription.plan;
  }

  return 'BASIC';
}

/**
 * Activate or update a subscription after purchase verification.
 */
async function activateSubscription(userId, { plan, platform, transactionData }) {
  const data = {
    plan,
    status: 'active',
    platform,
    currentPeriodStart: new Date(),
    canceledAt: null,
  };

  if (platform === 'ios') {
    data.appleTransactionId = transactionData.transactionId;
    data.appleOriginalTransactionId = transactionData.originalTransactionId;
    data.appleProductId = transactionData.productId;
    data.currentPeriodEnd = transactionData.expiresDate;
    data.expiresAt = transactionData.expiresDate;
  } else if (platform === 'android') {
    data.googlePurchaseToken = transactionData.purchaseToken;
    data.googleOrderId = transactionData.orderId;
    data.googleProductId = transactionData.productId;
    data.currentPeriodEnd = transactionData.expiryTime;
    data.expiresAt = transactionData.expiryTime;
  } else if (platform === 'android_web') {
    // Square Web redirect billing cycle
    data.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    data.expiresAt = data.currentPeriodEnd;
  }

  // Upsert: create if not exists, update if exists
  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  // Also update the legacy planId field for backward compatibility
  await prisma.user.update({
    where: { id: userId },
    data: {
      planId: plan.toLowerCase(),
      isSubscriber: plan !== 'BASIC',
      planLimit: PLAN_MEMBER_LIMITS[plan] || 0,
    },
  });

  return subscription;
}

module.exports = {
  PLAN_HIERARCHY,
  PLAN_MEMBER_LIMITS,
  PLAN_FEATURES,
  PRODUCT_ID_TO_PLAN,
  productIdToPlan,
  getPlanFeatures,
  getPlanMemberLimit,
  isPlanAtLeast,
  verifyAppleTransaction,
  getAppleSubscriptionStatus,
  handleAppleNotification,
  verifyGooglePurchase,
  acknowledgeGooglePurchase,
  handleGoogleNotification,
  getUserPlan,
  activateSubscription,
};
