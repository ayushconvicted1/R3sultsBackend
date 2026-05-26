require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function main() {
  const phoneNumber = '+15551234567';
  
  const user = await prisma.user.findUnique({
    where: { phoneNumber }
  });

  if (!user) {
    console.log(`Test user with phone ${phoneNumber} not found.`);
    return;
  }

  console.log(`Found test user: ${user.id}`);

  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {
      plan: 'ELITE',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    create: {
      userId: user.id,
      plan: 'ELITE',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }
  });

  console.log(`Activated ELITE plan for test user! Subscription ID: ${subscription.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
