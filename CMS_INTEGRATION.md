# CMS Landing Content — API Integration Guide

> **Base URL**: `/api` (e.g. `https://your-domain.com/api`)  
> **Swagger Docs**: `/api-docs` → search for **"Admin Landing Content"** and **"Landing Content (Public)"**

---

## Architecture Overview

The CMS stores landing page content in a `landing_content` table. Each row represents one **page + section** combination and stores the section's full content as a JSON column.

| Concept | Description |
|---------|-------------|
| **Page** | `home`, `about`, `contact`, or `shared` |
| **Section** | A named content block within a page (e.g. `hero`, `delayedEmergencyResponse`) |
| **Content** | A JSON object matching the frontend component's data contract |
| **Shared** | Reusable content (footer, forms) referenced by multiple pages |

### Pages & Sections

| Page | Sections |
|------|----------|
| `shared` | `footer`, `forms` |
| `home` | `hero`, `delayedEmergencyResponse`, `buildingSection`, `lifelineSection`, `comingSoonSection`, `inActionVideos`, `testimonialsSection`, `liveImpactUpdates`, `guidesResourcesSection`, `communitySection` |
| `about` | `hero`, `visionMissionSection`, `teamLeadershipSection`, `teamAdditionalSection` |
| `contact` | `hero`, `contactSection`, `quoteSection` |

---

## Public Endpoints (No Auth Required)

### 1. Get Full Site Content

```
GET /api/landing-content/full
```

Returns ALL pages and ALL sections in one call. Ideal for SSR / `getServerSideProps`.

**Response:**
```json
{
  "success": true,
  "data": {
    "shared": {
      "footer": { "brand": { "logoColor": "white", "tagline": "..." }, "quickLinks": [...], ... },
      "forms": { "emailLaunchForm": { ... } }
    },
    "home": {
      "hero": { "sectionId": "hero", "headlineLines": [...], "description": "...", ... },
      "delayedEmergencyResponse": { "title": { "prefix": "...", "highlight": "..." }, ... },
      ...
    },
    "about": { ... },
    "contact": { ... }
  }
}
```

### 2. Get All Sections for a Page

```
GET /api/landing-content?page=home
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | query | ✅ | `home`, `about`, `contact`, or `shared` |
| `section` | query | ❌ | Filter to a single section |

**Response:**
```json
{
  "success": true,
  "data": {
    "page": "home",
    "sections": {
      "hero": { "sectionId": "hero", "headlineLines": [...], ... },
      "delayedEmergencyResponse": { ... },
      "buildingSection": { ... }
    },
    "_meta": {
      "sectionCount": 10,
      "sectionNames": ["hero", "delayedEmergencyResponse", "buildingSection", ...]
    }
  }
}
```

### 3. Get a Specific Section

```
GET /api/landing-content/:page/:section
```

**Example:** `GET /api/landing-content/home/hero`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "page": "home",
    "section": "hero",
    "content": {
      "sectionId": "hero",
      "backgroundVideo": { "src": "/HeroVid1.mp4", "stopBeforeEndSeconds": 1 },
      "headlineLines": ["Helping resolve the", "Overcoming Disaster :", "Using People, Technology & AI"],
      "description": "A disaster management ecosystem...",
      "newsletterCard": { "title": "...", "formType": "shared.footer.newsletter" }
    },
    "sortOrder": 0,
    "updatedAt": "2026-05-01T10:00:00.000Z"
  }
}
```

---

## Admin Endpoints (Requires `SUPER_ADMIN` + Bearer Token)

All admin endpoints require:
```
Authorization: Bearer <jwt_token>
```

The authenticated user must have role `SUPER_ADMIN`.

### 4. List All Sections

```
GET /api/admin/landing-content/sections-list
```

Returns a metadata list of every stored page+section (no content bodies). Useful for building the admin sidebar navigation.

**Response:**
```json
{
  "success": true,
  "data": {
    "pages": {
      "shared": [
        { "id": "cm...", "page": "shared", "section": "footer", "sortOrder": 0, "updatedAt": "..." },
        { "id": "cm...", "page": "shared", "section": "forms", "sortOrder": 1, "updatedAt": "..." }
      ],
      "home": [
        { "id": "cm...", "page": "home", "section": "hero", "sortOrder": 0, "updatedAt": "..." },
        ...
      ],
      "about": [...],
      "contact": [...]
    },
    "total": 17
  }
}
```

### 5. Seed Default Content

```
POST /api/admin/landing-content/seed
```

Populates the database with the default content from the CMS contract. Uses upsert — existing sections will be **overwritten** with defaults.

> ⚠️ **Use with caution in production.** This resets all content to defaults.

**Response:**
```json
{
  "success": true,
  "data": [
    { "page": "shared", "section": "footer", "id": "cm..." },
    { "page": "shared", "section": "forms", "id": "cm..." },
    { "page": "home", "section": "hero", "id": "cm..." },
    ...
  ],
  "message": "17 sections seeded across 4 pages"
}
```

### 6. Get Page Content (Admin)

```
GET /api/admin/landing-content?page=home
```

Same as the public endpoint but requires auth. Use this in the admin panel.

### 7. Get Specific Section (Admin)

```
GET /api/admin/landing-content/:page/:section
```

Same as public but includes `updatedBy` field.

### 8. Create or Update a Section (Full Replace)

```
PUT /api/admin/landing-content/:page/:section
```

**Example:** `PUT /api/admin/landing-content/home/hero`

**Request Body:**
```json
{
  "content": {
    "sectionId": "hero",
    "backgroundVideo": { "src": "/NewVideo.mp4", "stopBeforeEndSeconds": 2 },
    "headlineLines": ["New Headline 1", "New Headline 2"],
    "description": "Updated description text",
    "newsletterCard": {
      "title": "Updated newsletter title",
      "formType": "shared.footer.newsletter"
    }
  },
  "sortOrder": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": { "id": "cm...", "page": "home", "section": "hero", "content": { ... }, ... },
  "message": "Section \"hero\" saved for page \"home\""
}
```

### 9. Partially Update a Section (Merge)

```
PATCH /api/admin/landing-content/:page/:section
```

Shallow-merges the provided fields into the existing content. Only top-level keys are merged — nested objects are replaced entirely.

**Example:** `PATCH /api/admin/landing-content/home/hero`

```json
{
  "content": {
    "description": "Only this field is updated. Everything else stays the same."
  }
}
```

### 10. Bulk Upsert

```
PUT /api/admin/landing-content/bulk
```

Save multiple sections in one call.

```json
{
  "items": [
    {
      "page": "home",
      "section": "hero",
      "content": { "headlineLines": ["Updated Line 1"], "description": "..." },
      "sortOrder": 0
    },
    {
      "page": "shared",
      "section": "footer",
      "content": { "copyrightText": "© 2027 R3sults" },
      "sortOrder": 0
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saved": 2,
    "failed": 0,
    "results": [...],
    "errors": []
  },
  "message": "2 sections saved, 0 failed"
}
```

### 11. Upload Media

```
POST /api/admin/landing-content/upload
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | ✅ | Image (jpeg, png, webp, gif) or video (mp4, mov) |
| `page` | text | ✅ | Target page |
| `section` | text | ✅ | Target section |
| `key` | text | ❌ | Dot-path for the content field (e.g. `backgroundVideo.src`) |

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/r3sults/landing/home/hero/abc123.mp4",
    "publicId": "r3sults/landing/home/hero/abc123",
    "mediaType": "video",
    "width": 1920,
    "height": 1080,
    "format": "mp4",
    "bytes": 5242880,
    "key": "backgroundVideo.src"
  },
  "message": "Media uploaded successfully. Use the URL in your content update."
}
```

**Workflow:**
1. Upload the file → receive `url`
2. PUT/PATCH the section content with the new `url` in the appropriate field

### 12. Delete a Section

```
DELETE /api/admin/landing-content/:page/:section
```

Permanently removes the section from the CMS.

---

## Frontend Integration Examples

### Next.js — Server Component (App Router)

```tsx
// app/page.tsx
async function getHomeContent() {
  const res = await fetch(`${process.env.API_URL}/api/landing-content?page=home`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
  });
  const json = await res.json();
  return json.data.sections;
}

async function getSharedContent() {
  const res = await fetch(`${process.env.API_URL}/api/landing-content?page=shared`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  return json.data.sections;
}

export default async function HomePage() {
  const [sections, shared] = await Promise.all([
    getHomeContent(),
    getSharedContent(),
  ]);

  return (
    <>
      <HeroSection data={sections.hero} />
      <StatsSection data={sections.delayedEmergencyResponse} />
      <BuildingSection data={sections.buildingSection} />
      <LifelineSection data={sections.lifelineSection} />
      <ComingSoonSection data={sections.comingSoonSection} />
      <TestimonialsSection data={sections.testimonialsSection} />
      <ImpactUpdates data={sections.liveImpactUpdates} />
      <GuidesSection data={sections.guidesResourcesSection} />
      <CommunitySection data={sections.communitySection} />
      <Footer data={shared.footer} />
    </>
  );
}
```

### Full Site Load (SSR)

```tsx
// Load everything at once for maximum efficiency
async function getFullSiteContent() {
  const res = await fetch(`${process.env.API_URL}/api/landing-content/full`, {
    next: { revalidate: 60 },
  });
  const json = await res.json();
  return json.data; // { shared: {...}, home: {...}, about: {...}, contact: {...} }
}
```

### Admin Panel — Edit a Section

```tsx
// Admin: Edit hero section
const updateHero = async (updatedContent) => {
  const res = await fetch('/api/admin/landing-content/home/hero', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ content: updatedContent }),
  });
  const json = await res.json();
  if (json.success) toast.success('Hero section updated!');
};
```

### Admin Panel — Partial Update

```tsx
// Admin: Update only the description field
const patchHero = async (newDescription) => {
  const res = await fetch('/api/admin/landing-content/home/hero', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      content: { description: newDescription }
    }),
  });
};
```

---

## Content JSON Structure Reference

### Shared — Footer

```json
{
  "brand": { "logoColor": "white", "tagline": "..." },
  "quickLinksTitle": "Quick Links",
  "quickLinks": [{ "label": "About", "href": "/about" }],
  "contactTitle": "Contact",
  "contact": {
    "phone": { "display": "+1 954-231-1750", "href": "tel:+19542311750" },
    "email": { "display": "info@r3sults.com", "href": "mailto:info@r3sults.com" },
    "address": "2120 SW , 60th Ter Miramar, FL 33023"
  },
  "connectTitle": "Connect",
  "socialLinks": [{ "platform": "Facebook", "href": "...", "ariaLabel": "Facebook", "iconKey": "facebook" }],
  "newsletter": { "title": "...", "input": { "placeholder": "..." }, "button": { "defaultLabel": "...", "loadingLabel": "..." } },
  "copyrightText": "© 2026 R3sults. All rights reserved."
}
```

### Home — Hero

```json
{
  "sectionId": "hero",
  "backgroundVideo": { "src": "/HeroVid1.mp4", "stopBeforeEndSeconds": 1 },
  "headlineLines": ["Helping resolve the", "Overcoming Disaster :", "Using People, Technology & AI"],
  "description": "A disaster management ecosystem...",
  "newsletterCard": { "title": "...", "formType": "shared.footer.newsletter" }
}
```

> For the complete content structure of every section, see the seed data in `src/utils/landingContentSeed.js`.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

| Status | Description |
|--------|-------------|
| `400` | Missing required fields or invalid page name |
| `401` | Missing or invalid Bearer token |
| `403` | User doesn't have `SUPER_ADMIN` role |
| `404` | Page+section combination not found |
| `500` | Server error |

---

## Setup Steps

1. **Run migration** to update the `landing_content` table schema:
   ```bash
   npx prisma db push
   ```
2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```
3. **Seed default content** by calling the seed endpoint:
   ```bash
   curl -X POST http://localhost:5001/api/admin/landing-content/seed \
     -H "Authorization: Bearer <admin-token>"
   ```
4. **Verify** by visiting the public endpoint:
   ```bash
   curl http://localhost:5001/api/landing-content/full
   ```
