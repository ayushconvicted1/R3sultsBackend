const Stripe = require('stripe');
const prisma = require('../lib/prisma');
const { activateSubscription } = require('./iapService');

// Initialize Stripe (will fail gracefully if key is missing)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
});

// Map of plan names to env variables for Stripe Price IDs
// e.g. STRIPE_PRICE_PLUS
function getPriceIdForPlan(planName) {
  const planKey = `STRIPE_PRICE_${planName.toUpperCase()}`;
  return process.env[planKey];
}

/**
 * Creates or retrieves a Stripe Customer for the given user.
 */
async function getOrCreateCustomer(user) {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create a new customer in Stripe
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.fullName || user.username || undefined,
    phone: user.phoneNumber || undefined,
    metadata: {
      userId: user.id,
    },
  });

  // Save the Stripe customer ID to the user record
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Creates a Stripe Subscription with payment_behavior: 'default_incomplete'.
 * This returns the clientSecret for the PaymentSheet.
 */
async function createSubscriptionFlow(user, planName) {
  const priceId = getPriceIdForPlan(planName);
  
  if (!priceId) {
    throw new Error(`Stripe Price ID not configured for plan: ${planName}`);
  }

  const customerId = await getOrCreateCustomer(user);

  // Check if they already have an active subscription for this plan
  // Note: For simplicity, we just create a new one. In a real app, you might want to check for existing incomplete ones to resume.
  
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId: user.id,
      plan: planName.toUpperCase(),
      platform: 'android_stripe',
    },
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    customerId: customerId,
    ephemeralKey: await createEphemeralKey(customerId),
  };
}

/**
 * Creates an ephemeral key for the PaymentSheet
 */
async function createEphemeralKey(customerId) {
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: '2023-10-16' }
  );
  return ephemeralKey.secret;
}

/**
 * Handle Stripe Webhooks
 */
async function handleWebhook(event) {
  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

async function handlePaymentSucceeded(invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    const plan = subscription.metadata.plan || 'BASIC';

    if (userId) {
      // Use the existing iapService function to activate the subscription
      await activateSubscription(userId, {
        plan: plan,
        platform: 'android_stripe',
        transactionData: {
          purchaseToken: subscription.id, // For stripe, we use sub ID
          orderId: invoice.payment_intent,
          productId: subscription.items.data[0].price.id,
          expiryTime: new Date(subscription.current_period_end * 1000),
        },
      });

      // Also update the specific Stripe fields on the Subscription record
      await prisma.subscription.update({
        where: { userId: userId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
        },
      });
    }
  }
}

async function handlePaymentFailed(invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;

    if (userId) {
      await prisma.subscription.update({
        where: { userId: userId },
        data: { status: 'billing_retry' },
      });
    }
  }
}

async function handleSubscriptionCanceled(stripeSub) {
  const userId = stripeSub.metadata.userId;
  if (userId) {
    await prisma.subscription.update({
      where: { userId: userId },
      data: { 
        status: 'canceled',
        canceledAt: new Date(stripeSub.canceled_at * 1000),
      },
    });
  }
}

async function handleSubscriptionUpdated(stripeSub) {
  const userId = stripeSub.metadata.userId;
  if (userId) {
    if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
      await prisma.subscription.update({
        where: { userId: userId },
        data: {
          status: 'active',
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          expiresAt: new Date(stripeSub.current_period_end * 1000),
          canceledAt: stripeSub.cancel_at ? new Date(stripeSub.cancel_at * 1000) : null,
        },
      });
    } else if (stripeSub.status === 'past_due' || stripeSub.status === 'unpaid') {
      await prisma.subscription.update({
        where: { userId: userId },
        data: { status: 'billing_retry' },
      });
    }
  }
}

module.exports = {
  stripe,
  getOrCreateCustomer,
  createSubscriptionFlow,
  createEphemeralKey,
  handleWebhook,
};
