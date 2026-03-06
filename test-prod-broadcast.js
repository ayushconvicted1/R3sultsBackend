require('dotenv').config();
const prisma = require('./src/lib/prisma');
const jwt = require('jsonwebtoken');

const API_URL = "https://r3sults-backend.vercel.app/api";

async function runTest() {
  try {
    // 1. Get Admin Token
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    });

    if (!admin) {
      console.log('No admin found.');
      return;
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('Using Admin:', admin.email);
    console.log('Target URL:', API_URL);

    // 2. Refresh test user location (to ensure they are found)
    const lat = 40.7128;
    const lng = -74.0060;
    
    await prisma.userLocation.update({
      where: { userId: "cmmf4p20t0000szs4p9019fcm" }, // The test receiver ID from local test
      data: { latitude: lat, longitude: lng, lastUpdatedAt: new Date() }
    });

    console.log('Updated test user location in DB.');

    // 3. Call Production API
    console.log('Calling POST /admin/broadcast on production...');
    const postResponse = await fetch(`${API_URL}/admin/broadcast`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        radius: 5000,
        title: 'Production Test Broadcast',
        description: 'Testing targeted users list on production URL'
      })
    });

    const postText = await postResponse.text();
    let postData;
    try {
      postData = JSON.parse(postText);
    } catch (e) {
      console.error('Failed to parse POST response as JSON:', postText);
      return;
    }
    console.log('POST Response Status:', postResponse.status);
    console.log('POST Success:', postData.success);
    
    if (postData.data) {
      console.log('Users found:', postData.data.usersFound);
      console.log('Users list excerpt:', JSON.stringify(postData.data.users, null, 2));
    } else {
      console.log('No data in response:', postData);
    }

    // 4. Test GET /api/admin/broadcast
    console.log('Calling GET /admin/broadcast on production...');
    const getResponse = await fetch(`${API_URL}/admin/broadcast`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const getData = await getResponse.json();
    if (getData.data && getData.data.broadcasts && getData.data.broadcasts.length > 0) {
      const last = getData.data.broadcasts[0];
      console.log('Last broadcast sentByUser:', JSON.stringify(last.sentByUser, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
