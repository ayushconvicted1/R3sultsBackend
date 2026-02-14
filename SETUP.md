# R3sults Backend — Setup Guide

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

The server will run on `http://localhost:3000`. Health check: `GET /api/health`

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```bash
cp .env.example .env
```

---

## External Platform Setup

### 1. Neon PostgreSQL Database

The database is already provisioned on [Neon](https://neon.tech). The `DATABASE_URL` in `.env` points to the existing database.

- **Console**: https://console.neon.tech
- No migrations are needed — the schema matches the existing database tables.

### 2. Google Cloud Console (OAuth)

Required for: **Google Sign-In** (user + vendor flows)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Create three OAuth clients:
   - **Web application** — add `http://localhost:3000` as authorized origin
   - **iOS** — enter your iOS bundle ID
   - **Android** — enter your Android package name and SHA-1 fingerprint
5. Copy the client IDs into `.env`:
   ```
   GOOGLE_CLIENT_ID=web-client-id.apps.googleusercontent.com
   GOOGLE_IOS_CLIENT_ID=ios-client-id.apps.googleusercontent.com
   GOOGLE_ANDROID_CLIENT_ID=android-client-id.apps.googleusercontent.com
   ```
6. **APIs & Services → OAuth consent screen** — configure app name, support email, and scopes (`email`, `profile`, `openid`)

### 3. Apple Developer (Sign In with Apple)

Required for: **Apple Sign-In** (user + vendor flows)

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. **Certificates, Identifiers & Profiles → Identifiers**
3. Create an **App ID** with "Sign In with Apple" capability enabled
4. Create a **Services ID** (this is your `APPLE_CLIENT_ID`)
5. Create a **Key** with "Sign In with Apple" enabled — download the `.p8` key file
6. Copy values into `.env`:
   ```
   APPLE_CLIENT_ID=com.your.app.service-id
   APPLE_TEAM_ID=YOUR_TEAM_ID
   APPLE_KEY_ID=KEY_ID_FROM_PORTAL
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```

### 4. Stripe (Payments)

Required for: **Order creation** (e-commerce module)

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your **Secret Key** from **Developers → API Keys**
3. For webhooks: **Developers → Webhooks → Add endpoint**
   - URL: `https://your-domain.com/api/webhook/stripe`
   - Events: `charge.succeeded`, `charge.failed`
4. Copy values into `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxx
   ```

> **Note**: Use `sk_test_` keys for development. Products/orders use the `paymentToken` from Stripe.js on the client side.

### 5. Cloudinary (File Uploads)

Required for: **Profile pictures, documents** (admin user update)

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up / log in — your credentials are on the dashboard
3. Copy values into `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789
   CLOUDINARY_API_SECRET=your-api-secret
   ```

### 6. Twilio (SMS OTP)

Required for: **Phone OTP verification** (user, volunteer flows)

1. Go to [Twilio Console](https://console.twilio.com)
2. Get your **Account SID** and **Auth Token** from the dashboard
3. Buy a phone number under **Phone Numbers → Manage → Buy a number**
4. Copy values into `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

> **Dev mode**: When `NODE_ENV=development`, OTPs are logged to the console instead of being sent via SMS.

### 7. Email (SMTP / Nodemailer)

Required for: **Email OTP verification** (vendor flow)

For Gmail:
1. Go to [Google Account → Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. **App passwords** → Generate a new password for "Mail"
4. Copy values into `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM="R3sults <noreply@r3sults.com>"
   ```

---

## API Modules Summary

| Module        | Base Path             | Endpoints | Auth     |
|---------------|-----------------------|-----------|----------|
| Auth          | `/api/auth`           | 12        | Mixed    |
| User          | `/api/user`           | 9         | Required |
| Group/Family  | `/api/group`          | 8         | Required |
| Admin         | `/api/admin`          | 16        | Admin+   |
| Volunteer     | `/api/volunteer`      | 7         | Mixed    |
| Admin Vol.    | `/api/admin/volunteers`| 7        | Admin+   |
| Vendor        | `/api/vendor`         | 14        | Mixed    |
| Tracking      | `/api/tracking`       | 12        | Required |
| Geofence      | `/api/geofence`       | 7         | Required |
| Products      | `/api/products`       | 5         | Mixed    |
| Cart          | `/api/cart`           | 5         | Required |
| Orders        | `/api/orders`         | 3         | Required |
| Mobile        | `/api/mobile`         | 5         | Mixed    |

**Total: ~110 endpoints**

---

## Production Deployment

1. Set `NODE_ENV=production`
2. Replace all test/dev credentials with production values
3. Use a process manager: `pm2 start src/index.js --name r3sults-api`
4. Set up HTTPS via a reverse proxy (Nginx, Caddy)
5. Configure Stripe webhooks with your production domain
