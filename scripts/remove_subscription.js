require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const email = 'ayushconvicted@gmail.com';
  
  console.log(`Searching for user with email: ${email}...`);
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log(`User with email ${email} not found.`);
    // Let's check if there's any user with a similar email as a fallback
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: 'ayushconvicted',
          mode: 'insensitive'
        }
      }
    });
    if (users.length > 0) {
      console.log(`Found ${users.length} similar user(s):`);
      users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}`));
    }
    return;
  }

  console.log(`Found user: ${user.fullName || 'No Name'} (ID: ${user.id}, Email: ${user.email})`);

  // Check if subscription exists
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id }
  });

  if (subscription) {
    console.log(`Found active subscription for user:`);
    console.log(JSON.stringify(subscription, null, 2));
    
    // Delete the subscription
    await prisma.subscription.delete({
      where: { userId: user.id }
    });
    console.log(`Successfully deleted the subscription record.`);
  } else {
    console.log(`No active subscription record found for this user.`);
  }

  // Update User to reset to basic plan
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      planId: 'basic',
      isSubscriber: false,
      planLimit: 2, // Default limit for BASIC plan
      subscriptionEndsAt: null,
      subscriptionId: null
    }
  });

  console.log(`Successfully reset user status to BASIC!`);
  console.log(`Updated User fields:`);
  console.log(`- planId: ${updatedUser.planId}`);
  console.log(`- isSubscriber: ${updatedUser.isSubscriber}`);
  console.log(`- planLimit: ${updatedUser.planLimit}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
