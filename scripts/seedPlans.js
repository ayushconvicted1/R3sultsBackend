#!/usr/bin/env node
/**
 * Seed the Plan table with the 4 subscription tiers.
 * Run: node scripts/seedPlans.js
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    memberLimit: 0,
    priceCents: 0,
    interval: 'monthly',
    stripePriceId: null,
    sortOrder: 0,
    features: JSON.stringify({
      disasterNewsFeed: true, weatherAlerts: true, emergencyBroadcasts: true,
      communityAlertNetwork: true, shelterFinder: false, familyFinder: false,
      liveGPS: false, damageReports: false, sosSignal: false, supplyTracker: false,
    }),
  },
  {
    id: 'plus',
    name: 'Plus',
    memberLimit: 5,
    priceCents: 499,
    interval: 'monthly',
    stripePriceId: null,
    sortOrder: 1,
    features: JSON.stringify({
      disasterNewsFeed: true, weatherAlerts: true, emergencyBroadcasts: true,
      communityAlertNetwork: true, shelterFinder: true, familyFinder: true,
      liveGPS: true, damageReports: true, sosSignal: true, supplyTracker: true,
      preparednessGuides: true, educationalLibrary: true,
    }),
  },
  {
    id: 'pro',
    name: 'Pro',
    memberLimit: 10,
    priceCents: 1099,
    interval: 'monthly',
    stripePriceId: null,
    sortOrder: 2,
    features: JSON.stringify({
      disasterNewsFeed: true, weatherAlerts: true, emergencyBroadcasts: true,
      communityAlertNetwork: true, shelterFinder: true, familyFinder: true,
      liveGPS: true, damageReports: true, sosSignal: true, supplyTracker: true,
      preparednessGuides: true, educationalLibrary: true,
      advancedDamageAssessment: true, recoveryDashboard: true,
      recoverySupport: true, prioritySupport: true,
      expandedShelterNetwork: true, advancedPrepPlanning: true,
      wholesaleSupplyPricing: true,
    }),
  },
  {
    id: 'elite',
    name: 'Elite',
    memberLimit: 9999,
    priceCents: 49500,
    interval: 'monthly',
    stripePriceId: null,
    sortOrder: 3,
    features: JSON.stringify({
      disasterNewsFeed: true, weatherAlerts: true, emergencyBroadcasts: true,
      communityAlertNetwork: true, shelterFinder: true, familyFinder: true,
      liveGPS: true, damageReports: true, sosSignal: true, supplyTracker: true,
      preparednessGuides: true, educationalLibrary: true,
      advancedDamageAssessment: true, recoveryDashboard: true,
      recoverySupport: true, prioritySupport: true,
      expandedShelterNetwork: true, advancedPrepPlanning: true,
      wholesaleSupplyPricing: true, conciergeAdvisor: true,
      vendorCoordination: true, managedEvacuation: true,
    }),
  },
];

async function seed() {
  console.log('Seeding plans...');
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    console.log(`  ✅ ${plan.name} ($${(plan.priceCents / 100).toFixed(2)}/mo)`);
  }

  // Migrate existing isSubscriber users to PLUS plan
  const subscriberUsers = await prisma.user.findMany({
    where: { isSubscriber: true },
    select: { id: true, fullName: true },
  });

  if (subscriberUsers.length > 0) {
    console.log(`\nMigrating ${subscriberUsers.length} existing subscriber(s) to PLUS...`);
    for (const user of subscriberUsers) {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan: 'PLUS', status: 'active', platform: 'ios' },
        update: { plan: 'PLUS', status: 'active' },
      });
      console.log(`  ✅ ${user.fullName || user.id} → PLUS`);
    }
  }

  console.log('\n✅ Plan seeding complete!');
}

seed()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
