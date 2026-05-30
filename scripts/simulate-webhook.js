const axios = require('axios');
const prisma = require('../src/lib/prisma');

async function run() {
  console.log('--- Simulating Square Webhook ---');
  try {
    // 1. Fetch a user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('No users found in database to run simulated webhook. Please register or seed a user first.');
      process.exit(1);
    }
    
    console.log(`Simulating payment for User: ${user.fullName} (ID: ${user.id})`);
    
    // 2. Prepare payload
    const payload = {
      type: 'payment.created',
      data: {
        object: {
          payment: {
            id: 'mock_payment_id_' + Date.now(),
            status: 'COMPLETED',
            reference_id: `${user.id}|PRO`,
            amount_money: {
              amount: 1299,
              currency: 'USD'
            }
          }
        }
      }
    };
    
    // 3. Send webhook
    const url = 'http://localhost:3000/api/subscription/webhook/square';
    console.log(`Sending POST request to ${url}...`);
    const response = await axios.post(url, payload);
    
    console.log('Webhook Response:', response.data);
    
    // 4. Verify in DB
    console.log('Verifying subscription in database...');
    const updatedSub = await prisma.subscription.findUnique({
      where: { userId: user.id }
    });
    
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    console.log('Subscription Record:', updatedSub);
    console.log('User planId:', updatedUser.planId);
    console.log('User isSubscriber:', updatedUser.isSubscriber);
    
    if (updatedSub && updatedSub.plan === 'PRO' && updatedSub.status === 'active') {
      console.log('✅ Webhook verification SUCCESSFUL! Subscription activated in database.');
    } else {
      console.log('❌ Webhook verification FAILED! Record not found or incorrect state.');
    }
  } catch (error) {
    console.error('Simulation failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
