const nodemailer = require('nodemailer');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isOTPExpired = expiresAt => {
  return new Date() > new Date(expiresAt);
};

const axios = require('axios');

const GoHighLevelKey = process.env.GOHIGHLEVEL_API_KEY;
const GoHighLevelNumber = process.env.GOHIGHLEVEL_NUMBER;

const requestHeaders = {
  Authorization: `Bearer ${GoHighLevelKey}`,
  Version: '2021-07-28',
  'Content-Type': 'application/json',
};

const findGHLContactByPhone = async phone => {
  try {
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts?phone=${encodeURIComponent(
        phone,
      )}`,
      { headers: requestHeaders },
    );

    const contacts =
      response.data?.data ?? response.data?.contacts ?? response.data;
    if (Array.isArray(contacts) && contacts.length > 0) {
      return contacts[0]?.id || contacts[0]?.contactId || contacts[0]?._id;
    }
  } catch (error) {
    return null;
  }

  return null;
};

const createGHLContact = async phone => {
  const locationId = process.env.GOHIGHLEVEL_LOCATION_ID;
  const country = process.env.GOHIGHLEVEL_COUNTRY || 'US';
  if (!locationId) {
    throw new Error('Missing GOHIGHLEVEL_LOCATION_ID environment variable');
  }

  const existingContactId = await findGHLContactByPhone(phone);
  if (existingContactId) {
    return { contactId: existingContactId, created: false };
  }

  const contactPayload = {
    name: 'OTP Contact',
    firstName: 'OTP',
    lastName: 'Contact',
    phone,
    country,
    locationId,
    source: 'public api',
  };

  try {
    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts',
      contactPayload,
      { headers: requestHeaders },
    );

    const contactId = response.data?.id || response.data?.data?.id;
    if (!contactId) {
      throw new Error('Failed to create GoHighLevel contact');
    }

    return { contactId, created: true };
  } catch (error) {
    const duplicateContactId = error?.response?.data?.meta?.contactId;
    if (duplicateContactId) {
      return { contactId: duplicateContactId, created: false };
    }
    throw error;
  }
};

const deleteGHLContact = async contactId => {
  if (!contactId) return;

  await axios.delete(
    `https://services.leadconnectorhq.com/contacts/${contactId}`,
    {
      headers: {
        Authorization: `Bearer ${GoHighLevelKey}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
    },
  );
};

const sendOtpViaGHL = async (phone, otp) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    // return true; // (Optional: commenting out so development also hits GHL or you can leave it)
  }

  let contactId;
  let createdContact = false;

  try {
    const result = await createGHLContact(phone);
    contactId = result.contactId;
    createdContact = result.created;

    const fromNumber = GoHighLevelNumber;
    if (!fromNumber) {
      throw new Error('Missing GOHIGHLEVEL_NUMBER environment variable');
    }

    console.log(`[SMS] Sending OTP to contactId: ${contactId} via GoHighLevel`);

    const response = await axios.post(
      'https://services.leadconnectorhq.com/conversations/messages',
      {
        type: 'SMS',
        contactId,
        message: `Your OTP is ${otp}`,
        status: 'pending',
        fromNumber,
        toNumber: phone,
      },
      { headers: requestHeaders },
    );

    console.log('[SMS] GoHighLevel API success:', response.data);
    return true;
  } catch (error) {
    console.error(
      '[SMS] GoHighLevel send error:',
      error?.response?.data || error.message,
    );
    return false;
  } finally {
    if (contactId && createdContact) {
      try {
        await deleteGHLContact(contactId);
      } catch (deleteError) {
        console.error(
          '[SMS] Failed to delete temporary GoHighLevel contact:',
          deleteError?.response?.data || deleteError.message,
        );
      }
    }
  }
};

const sendEmailOTP = async (email, otp) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Email OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    if (process.env.SMTP_USER) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'R3sults Verification Code',
        text: `Your verification code is: ${otp}. Valid for 5 minutes.`,
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>Valid for 5 minutes.</p>`,
      });
    } else {
      console.log(`[EMAIL] OTP for ${email}: ${otp}`);
    }
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

module.exports = { generateOTP, isOTPExpired, sendOtpViaGHL, sendEmailOTP };
