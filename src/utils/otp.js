const nodemailer = require('nodemailer');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isOTPExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

const sendSmsOTP = async (phoneNumber, otp) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);
    return true;
  }

  try {
    if (process.env.TWILIO_ACCOUNT_SID) {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      await twilio.messages.create({
        body: `Your R3sults verification code is: ${otp}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    } else {
      console.log(`[SMS] OTP for ${phoneNumber}: ${otp}`);
    }
    return true;
  } catch (error) {
    console.error('SMS send error:', error);
    return false;
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

module.exports = { generateOTP, isOTPExpired, sendSmsOTP, sendEmailOTP };
