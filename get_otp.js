
require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function getOTP() {
  try {
    const user = await prisma.user.findUnique({
      where: {
        phoneNumber: '+916396827140',
      },
    });
    console.log('User Found:', user);
    console.log('OTP Code:', user?.otpCode);
  } catch (e) {
    console.error(e);
  } finally {
    // connect/disconnect logic is handled by prisma instance usually
    // but just in case
    // await prisma.$disconnect(); 
  }
}

getOTP();
