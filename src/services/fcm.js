const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Ideally, use environment variables for service account credentials
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS 
      ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS) 
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin initialized successfully');
    } else {
      // Fallback for development if no credentials found, but warn heavily
      console.warn('WARNING: Firebase Admin not initialized (no credentials found). Notifications will fail.');
      // You might want to initialize with default credentials if running in GCP environment
      // admin.initializeApp(); 
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

/**
 * Send a notification to specific user devices
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
exports.sendMulticastNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return { success: 0, failure: 0 };
  
  // Filter out empty tokens
  const validTokens = tokens.filter(t => t);
  if (validTokens.length === 0) return { success: 0, failure: 0 };

  const message = {
    notification: {
      title,
      body,
    },
    data,
    tokens: validTokens,
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`${response.successCount} messages were sent successfully`);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(validTokens[idx]);
          console.error(`Token failed: ${validTokens[idx]} - Error: ${resp.error}`);
        }
      });
      // Here you might want to remove invalid tokens from DB
    }
    return response;
  } catch (error) {
    console.error('Error sending multicast notification:', error);
    throw error;
  }
};

/**
 * Send a notification to a single device
 * @param {string} token - FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
exports.sendNotification = async (token, title, body, data = {}) => {
  if (!token) return;

  const message = {
    notification: {
      title,
      body,
    },
    data,
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
