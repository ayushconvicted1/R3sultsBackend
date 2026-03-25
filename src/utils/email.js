const nodemailer = require('nodemailer');

/**
 * Create a reusable nodemailer transporter using the SMTP env vars.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send a single email.
 *
 * @param {Object} opts
 * @param {string} opts.to        - Recipient email address
 * @param {string} opts.subject   - Email subject
 * @param {string} opts.html      - HTML body
 * @param {string} [opts.text]    - Plain text fallback
 * @param {string} [opts.from]    - Sender (defaults to SMTP_FROM env)
 * @returns {Promise<Object>}     - nodemailer send result
 */
const sendEmail = async ({ to, subject, html, text, from }) => {
  const transporter = createTransporter();
  const result = await transporter.sendMail({
    from: from || process.env.SMTP_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // strip HTML as fallback
  });
  return result;
};

/**
 * Send bulk emails in batches to avoid SMTP rate limiting.
 *
 * @param {Object} opts
 * @param {string[]} opts.recipients - Array of email addresses
 * @param {string}   opts.subject    - Email subject
 * @param {string}   opts.html       - HTML body
 * @param {string}   [opts.text]     - Plain text fallback
 * @param {number}   [opts.batchSize=10] - How many emails to send concurrently
 * @param {number}   [opts.delayMs=1000] - Delay between batches in ms
 * @returns {Promise<{ sent: number, failed: number, errors: Array }>}
 */
const sendBulkEmails = async ({ recipients, subject, html, text, batchSize = 10, delayMs = 1000 }) => {
  const transporter = createTransporter();
  const fromAddr = process.env.SMTP_FROM;

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((to) =>
        transporter.sendMail({
          from: fromAddr,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>/g, ''),
        }),
      ),
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        failed++;
        errors.push({ email: batch[idx], error: result.reason?.message || 'Unknown error' });
      }
    });

    // Delay between batches (skip after last batch)
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { sent, failed, errors };
};

module.exports = { sendEmail, sendBulkEmails };
