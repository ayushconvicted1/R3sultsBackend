# R3sults Backend — Environment Variables Setup Guide

> Copy `.env.example` to `.env` and follow the sections below to fill in each value.
> ```bash
> cp .env.example .env
> ```

---

## 1. Database (Neon PostgreSQL) — ✅ Already Set Up

| Variable | Status |
|----------|--------|
| `DATABASE_URL` | **Already configured** in your `.env` |

Your existing Neon PostgreSQL database is already provisioned and the connection string is in `.env`. The Prisma schema was reverse-engineered from this database — **no setup needed**.

- **Console:** [Neon Dashboard](https://console.neon.tech)
- **Region:** `ap-southeast-1`

> [!IMPORTANT]
> Do not change this value unless you're migrating to a different database.

---

## 2. JWT (JSON Web Token)

| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `my-super-secret-key-at-least-32-chars` | Secret key for signing tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token lifetime |

### Steps

1. Generate a secure random secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
2. Copy the output and set it:
   ```
   JWT_SECRET="paste-the-generated-string-here"
   JWT_ACCESS_EXPIRY="15m"
   JWT_REFRESH_EXPIRY="7d"
   ```

> [!CAUTION]
> Use a unique strong key in production. Never reuse dev keys. If this key is compromised, all tokens become invalid.

---

## 3. Server

| Variable | Example | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |

```
PORT=3000
NODE_ENV="development"
```

> In `development` mode, OTPs are logged to the console instead of sent via SMS/email.

---

## 4. Google OAuth (Sign In with Google)

| Variable | Example |
|----------|---------|
| `GOOGLE_CLIENT_ID` | `123456.apps.googleusercontent.com` |
| `GOOGLE_IOS_CLIENT_ID` | `789012.apps.googleusercontent.com` |
| `GOOGLE_ANDROID_CLIENT_ID` | `345678.apps.googleusercontent.com` |

**Used by:** User login, Vendor login

### Steps

1. Go to **[Google Cloud Console](https://console.cloud.google.com)**
2. Create a new project (or select existing) from the top dropdown
3. Navigate to **APIs & Services** → **OAuth consent screen**
   - Select **External** → click Create
   - Fill in App name, Support email
   - Add scopes: `email`, `profile`, `openid`
   - Save
4. Navigate to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Create **3 separate clients**:

   | Platform | Type | Extra Config |
   |----------|------|-------------|
   | Web | Web application | Add `http://localhost:3000` to Authorized Origins |
   | iOS | iOS | Enter your iOS Bundle ID (e.g. `com.r3sults.app`) |
   | Android | Android | Enter Package name + SHA-1 fingerprint |

6. Copy each client ID into `.env`:
   ```
   GOOGLE_CLIENT_ID="web-client-id.apps.googleusercontent.com"
   GOOGLE_IOS_CLIENT_ID="ios-client-id.apps.googleusercontent.com"
   GOOGLE_ANDROID_CLIENT_ID="android-client-id.apps.googleusercontent.com"
   ```

> [!NOTE]
> Get the Android SHA-1 with: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android`

---

## 5. Apple Sign In

| Variable | Example |
|----------|---------|
| `APPLE_CLIENT_ID` | `com.r3sults.app.service` |
| `APPLE_TEAM_ID` | `ABC123DEF4` |
| `APPLE_KEY_ID` | `KEYID12345` |
| `APPLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` |

**Used by:** User login, Vendor login

### Steps

1. Go to **[Apple Developer Portal](https://developer.apple.com/account)** → sign in
2. **Certificates, Identifiers & Profiles** → **Identifiers**
   - Click **+** → select **App IDs** → Continue
   - Enter Description and Bundle ID (e.g. `com.r3sults.app`)
   - Scroll down, check **Sign In with Apple** → Continue → Register
3. **Create a Services ID** (this becomes your `APPLE_CLIENT_ID`):
   - Click **+** → select **Services IDs** → Continue
   - Enter Description and Identifier (e.g. `com.r3sults.app.service`)
   - Check **Sign In with Apple** → Configure
   - Add your domain and return URL → Save → Continue → Register
4. **Create a Key**:
   - Go to **Keys** → Click **+**
   - Enter a name, check **Sign In with Apple** → Configure
   - Select your primary App ID → Save → Continue → Register
   - **Download the `.p8` file** (you can only download once!)
   - Note the **Key ID** shown on the page
5. Find your **Team ID**: visible in the top-right corner of the portal, or under **Membership Details**
6. Set values in `.env`:
   ```
   APPLE_CLIENT_ID="com.r3sults.app.service"
   APPLE_TEAM_ID="YOUR_TEAM_ID"
   APPLE_KEY_ID="KEY_ID_FROM_STEP_4"
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...paste full key...==\n-----END PRIVATE KEY-----"
   ```

> [!IMPORTANT]
> The private key must be on one line with literal `\n` for newlines. Open the `.p8` file and replace actual newlines with `\n`.

---

## 6. Stripe (Payments)

| Variable | Example |
|----------|---------|
| `STRIPE_SECRET_KEY` | `sk_test_51Hx...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_abc123...` |

**Used by:** Order creation (e-commerce)

### Steps

1. Go to **[Stripe Dashboard](https://dashboard.stripe.com)** → Sign up or log in
2. **Get your Secret Key:**
   - Go to **Developers** → **API Keys**
   - Copy the **Secret key** (starts with `sk_test_` for test mode)
3. **Set up Webhooks** (optional for dev, required for production):
   - Go to **Developers** → **Webhooks** → **Add endpoint**
   - Endpoint URL: `https://your-domain.com/api/webhook/stripe`
   - Select events: `charge.succeeded`, `charge.failed`, `payment_intent.succeeded`
   - Click **Add endpoint**
   - Click **Reveal** next to **Signing secret** → copy it
4. Set values in `.env`:
   ```
   STRIPE_SECRET_KEY="sk_test_your_key_here"
   STRIPE_WEBHOOK_SECRET="whsec_your_secret_here"
   ```

> [!TIP]
> For local testing, use `stripe listen --forward-to localhost:3000/api/webhook/stripe` with the [Stripe CLI](https://stripe.com/docs/stripe-cli).

---

## 7. Cloudinary (Image/File Uploads)

| Variable | Example |
|----------|---------|
| `CLOUDINARY_CLOUD_NAME` | `dxyz1234` |
| `CLOUDINARY_API_KEY` | `123456789012345` |
| `CLOUDINARY_API_SECRET` | `abcDEFghiJKL_mnop` |

**Used by:** Admin user update (profile photos, documents)

### Steps

1. Go to **[Cloudinary](https://cloudinary.com/users/register_free)** → Sign up (free tier: 25GB)
2. After signing in, you'll land on the **Dashboard**
3. Under **Product Environment Credentials**, you'll see:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → click **Show** → `CLOUDINARY_API_SECRET`
4. Set values in `.env`:
   ```
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="123456789012345"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

---

## 8. Twilio (SMS OTP)

| Variable | Example |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | `+15551234567` |

**Used by:** Phone OTP verification (user registration, password reset, volunteer)

### Steps

1. Go to **[Twilio Console](https://www.twilio.com/try-twilio)** → Sign up (free trial gives $15 credit)
2. After sign-up, you'll see your **Account SID** and **Auth Token** on the dashboard
   - Click the eye icon to reveal the Auth Token
3. **Buy a phone number:**
   - Go to **Phone Numbers** → **Manage** → **Buy a Number**
   - Search for a number with **SMS capability** → click **Buy**
   - Or use the trial number provided during signup
4. Set values in `.env`:
   ```
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="your_auth_token"
   TWILIO_PHONE_NUMBER="+15551234567"
   ```

> [!NOTE]
> When `NODE_ENV=development`, OTPs are logged to the console and **not sent via SMS**. Twilio is only used when `NODE_ENV=production`.

---

## 9. Email SMTP (Nodemailer)

| Variable | Example |
|----------|---------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `abcd efgh ijkl mnop` |
| `SMTP_FROM` | `R3sults <noreply@r3sults.com>` |

**Used by:** Email OTP verification (vendor registration, vendor password reset)

### Steps (Gmail)

1. Go to **[Google Account Settings](https://myaccount.google.com)** → **Security**
2. Enable **2-Step Verification** (required for app passwords)
3. Go to **[App Passwords](https://myaccount.google.com/apppasswords)**
   - Select app: **Mail**
   - Select device: **Other** → type "R3sults Backend"
   - Click **Generate**
   - You'll get a **16-character password** (like `abcd efgh ijkl mnop`)
4. Set values in `.env`:
   ```
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT=587
   SMTP_USER="your-gmail@gmail.com"
   SMTP_PASS="abcd efgh ijkl mnop"
   SMTP_FROM="R3sults <noreply@r3sults.com>"
   ```

### Alternative: Other SMTP Providers

| Provider | Host | Port |
|----------|------|------|
| Gmail | `smtp.gmail.com` | 587 |
| Outlook | `smtp-mail.outlook.com` | 587 |
| Yahoo | `smtp.mail.yahoo.com` | 587 |
| SendGrid | `smtp.sendgrid.net` | 587 |
| Mailgun | `smtp.mailgun.org` | 587 |

> [!NOTE]
> Same as SMS — when `NODE_ENV=development`, email OTPs are logged to the console and not actually sent.

---

## Quick Reference

| Priority | Variables | Required For |
|----------|-----------|-------------|
| 🔴 Critical | `DATABASE_URL`, `JWT_SECRET` | Server startup |
| 🟡 Auth | `GOOGLE_*`, `APPLE_*` | Social login |
| 🟡 Payments | `STRIPE_*` | Order creation |
| 🟢 Optional (dev) | `TWILIO_*`, `SMTP_*`, `CLOUDINARY_*` | Skipped in dev mode |

> [!TIP]
> For local development, you only **need** `DATABASE_URL` and `JWT_SECRET`. Everything else either has fallbacks or is skipped in development mode.
