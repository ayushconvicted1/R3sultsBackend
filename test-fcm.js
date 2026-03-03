require('dotenv').config();
const prisma = require('./src/lib/prisma');
async function run() {
  try {
    const result = await prisma.user.updateMany({
      data: { fcmToken: 'test-device-fcm-token-xyz' }
    });
    console.log('Updated users:', result.count);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
