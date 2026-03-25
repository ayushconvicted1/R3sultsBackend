# Newsletter API Documentation

Complete guide for the Newsletter subscription and email broadcasting APIs.

**Base URL:** `/api/newsletter`

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/subscribe` | Public | Subscribe email to newsletter |
| POST | `/unsubscribe` | Public | Unsubscribe email |
| GET | `/subscribers` | Admin | Paginated subscriber list |
| GET | `/subscribers/all` | Admin | All active subscriber IDs/emails |
| POST | `/send` | Admin | Send email to subscribers |
| GET | `/stats` | Admin | Subscription statistics |

---

## Public Endpoints

### POST `/subscribe`

Subscribe an email to the newsletter. Used on the landing page.

**Request:**
```json
{ "email": "user@example.com" }
```

**Responses:**
- `201` — Successfully subscribed
- `200` — Already subscribed / re-subscribed
- `400` — Invalid email

**curl:**
```bash
curl -X POST https://your-api.com/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### POST `/unsubscribe`

Marks the subscriber as inactive (soft delete).

**Request:**
```json
{ "email": "user@example.com" }
```

**Responses:**
- `200` — Successfully unsubscribed
- `404` — Email not found or already unsubscribed

**curl:**
```bash
curl -X POST https://your-api.com/api/newsletter/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

## Admin Endpoints

> All admin endpoints require `Authorization: Bearer <token>` with ADMIN or SUPER_ADMIN role.

### GET `/subscribers`

Paginated list of subscribers with search and status filter.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `search` | string | — | Search by email |
| `status` | string | — | `active` or `inactive` |

**Response:**
```json
{
  "success": true,
  "data": {
    "subscribers": [
      {
        "id": "clxyz...",
        "email": "user@example.com",
        "isActive": true,
        "subscribedAt": "2026-03-25T09:00:00.000Z",
        "unsubscribedAt": null,
        "createdAt": "2026-03-25T09:00:00.000Z",
        "updatedAt": "2026-03-25T09:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

**curl:**
```bash
curl "https://your-api.com/api/newsletter/subscribers?page=1&limit=20&status=active" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET `/subscribers/all`

Returns ALL active subscriber IDs and emails (no pagination). Used to power the **"Select All"** button in the admin UI.

**Response:**
```json
{
  "success": true,
  "data": {
    "subscribers": [
      { "id": "clxyz...", "email": "user@example.com" },
      { "id": "clabc...", "email": "user2@example.com" }
    ],
    "total": 2
  }
}
```

**curl:**
```bash
curl "https://your-api.com/api/newsletter/subscribers/all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### POST `/send`

Send an email to selected subscribers or all active subscribers.

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | ✅ | Email subject line |
| `html` | string | ✅ | HTML body (from rich text editor) |
| `emailIds` | string[] | ❌ | Specific subscriber IDs to send to |
| `sendToAll` | boolean | ❌ | Set `true` to send to all active subscribers |

> Provide either `emailIds` **or** `sendToAll: true`, not both.

**Example — Send to selected:**
```json
{
  "subject": "March Newsletter",
  "html": "<h1>Hello!</h1><p>Here's what's new...</p>",
  "emailIds": ["clxyz...", "clabc..."]
}
```

**Example — Send to all:**
```json
{
  "subject": "March Newsletter",
  "html": "<h1>Hello!</h1><p>Here's what's new...</p>",
  "sendToAll": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Newsletter sent to 42 recipient(s)",
  "data": {
    "totalRecipients": 42,
    "sent": 40,
    "failed": 2,
    "errors": [
      { "email": "bad@example.com", "error": "Invalid address" }
    ]
  }
}
```

**curl:**
```bash
curl -X POST https://your-api.com/api/newsletter/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subject": "March Newsletter",
    "html": "<h1>Hello!</h1><p>Content here</p>",
    "sendToAll": true
  }'
```

---

### GET `/stats`

Get subscriber count statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalActive": 42,
    "totalInactive": 5,
    "total": 47
  }
}
```

**curl:**
```bash
curl "https://your-api.com/api/newsletter/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Integration Guide

### Landing Page — Subscribe Form

```javascript
const handleSubscribe = async (email) => {
  const res = await fetch('/api/newsletter/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (data.success) {
    showToast(data.message); // "Successfully subscribed to newsletter"
  }
};
```

### Landing Page — Rich Text Editor + Send

Use any rich text editor (TipTap, React Quill, CKEditor, etc.) that outputs HTML:

```javascript
const handleSendNewsletter = async (subject, htmlContent, selectedIds, sendToAll) => {
  const token = getAdminToken(); // your auth token
  const body = { subject, html: htmlContent };

  if (sendToAll) {
    body.sendToAll = true;
  } else {
    body.emailIds = selectedIds;
  }

  const res = await fetch('/api/newsletter/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  console.log(`Sent: ${data.data.sent}, Failed: ${data.data.failed}`);
};
```

### Admin UI — Subscriber Selection with "Select All"

```javascript
const [subscribers, setSubscribers] = useState([]);
const [selectedIds, setSelectedIds] = useState(new Set());
const [allSelected, setAllSelected] = useState(false);
const [pagination, setPagination] = useState({});

// Load paginated subscribers for the current page view
const loadPage = async (page = 1) => {
  const res = await fetch(`/api/newsletter/subscribers?page=${page}&limit=20&status=active`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  setSubscribers(data.data.subscribers);
  setPagination(data.data.pagination);
};

// "Select All" button handler — fetches ALL IDs
const handleSelectAll = async () => {
  if (allSelected) {
    setSelectedIds(new Set());
    setAllSelected(false);
    return;
  }
  const res = await fetch('/api/newsletter/subscribers/all', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await res.json();
  setSelectedIds(new Set(data.data.subscribers.map(s => s.id)));
  setAllSelected(true);
};

// Toggle individual subscriber
const toggleSelect = (id) => {
  const next = new Set(selectedIds);
  next.has(id) ? next.delete(id) : next.add(id);
  setSelectedIds(next);
  setAllSelected(false);
};

// Send to selected
const handleSend = () => {
  sendNewsletter(subject, html, Array.from(selectedIds), false);
};
```

---

## Swagger Docs

All endpoints are documented in Swagger and accessible at:

```
http://localhost:5001/api-docs
```

Look under the **"Newsletter"** tag.
