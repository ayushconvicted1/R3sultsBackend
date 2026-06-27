# Home Page CMS — API Documentation

> **Base URL**: `/api` (e.g. `https://r3sults.org/api`)
> **Swagger Docs**: `/api-docs` → search for **"Admin Home Page Content"** and **"Home Page Content (Public)"**

---

## Architecture Overview

The redesigned r3sults.org home page is powered by a **single-row CMS table** (`home_page_content`). The entire page payload is stored as one JSON column, matching the frontend's single-endpoint fetch pattern.

| Concept | Description |
|---------|-------------|
| **Table** | `home_page_content` — stores one row with the complete home page JSON |
| **Content** | A single JSON object containing all 9 sections (hero, approach, impact, etc.) |
| **Version** | Auto-incremented integer on every update — useful for cache busting |
| **Sections** | `hero`, `approach`, `impact`, `operations`, `testimonials`, `donate`, `stories`, `news`, `volunteer` |

### How Updates Work

The API supports **three levels of granularity** for updates:

| Level | Endpoint | Use Case |
|-------|----------|----------|
| **Full replace** | `PUT /api/admin/home-page-content` | Replace the entire page content at once |
| **Section replace** | `PUT /api/admin/home-page-content/:section` | Replace one section entirely |
| **Field-level patch** | `PATCH /api/admin/home-page-content/:section` | Update specific fields within a section (deep merge) |

**Recommended for admin panel**: Use `PATCH /:section` — send only the changed fields and everything else stays intact.

---

## Public Endpoints (No Auth Required)

### 1. Get Full Home Page Content

```
GET /api/home-page-content
```

Returns the raw JSON content object directly (not wrapped in `{ success, data }`). This is the single endpoint the frontend fetches to populate the entire home page.

**Response:**
```json
{
  "hero": {
    "eyebrow": "Nonprofit Disaster Management",
    "headline": "Prepared Before.",
    "headlineAccent": "Present During.",
    "headlineSuffix": "Committed After.",
    "subtext": "We don't just respond to disasters...",
    "ctaPrimary": "Donate Now",
    "ctaSecondary": "Become a Partner",
    "heroImage": "https://cdn.r3sults.org/images/hero-main.jpg",
    "stats": [...]
  },
  "approach": { ... },
  "impact": { ... },
  "operations": { ... },
  "testimonials": { ... },
  "donate": { ... },
  "stories": { ... },
  "news": { ... },
  "volunteer": { ... }
}
```

### 2. Get a Single Section

```
GET /api/home-page-content/:section
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `section` | path | ✅ | One of: `hero`, `approach`, `impact`, `operations`, `testimonials`, `donate`, `stories`, `news`, `volunteer` |

**Example:** `GET /api/home-page-content/hero`

**Response:**
```json
{
  "success": true,
  "data": {
    "eyebrow": "Nonprofit Disaster Management",
    "headline": "Prepared Before.",
    "headlineAccent": "Present During.",
    "headlineSuffix": "Committed After.",
    "subtext": "...",
    "ctaPrimary": "Donate Now",
    "ctaSecondary": "Become a Partner",
    "heroImage": "https://cdn.r3sults.org/images/hero-main.jpg",
    "stats": [
      { "value": "20+", "label": "Years Experience" },
      { "value": "24/7", "label": "Rapid Response" },
      { "value": "10+", "label": "Countries Served" },
      { "value": "100%", "label": "Transparency" }
    ]
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

### 3. Get Content Metadata

```
GET /api/admin/home-page-content/meta
```

Returns metadata without the content body — useful for admin panel dashboards.

**Response:**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "id": "cm...",
    "sections": ["hero", "approach", "impact", "operations", "testimonials", "donate", "stories", "news", "volunteer"],
    "version": 5,
    "updatedBy": "user_abc123",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-15T14:30:00.000Z"
  }
}
```

### 4. Get Full Content (Admin)

```
GET /api/admin/home-page-content
```

Same as public endpoint but includes metadata (`version`, `updatedBy`, timestamps).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "content": { "hero": { ... }, "approach": { ... }, ... },
    "version": 5,
    "updatedBy": "user_abc123",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-06-15T14:30:00.000Z"
  }
}
```

### 5. Get Single Section (Admin)

```
GET /api/admin/home-page-content/:section
```

**Example:** `GET /api/admin/home-page-content/hero`

**Response:**
```json
{
  "success": true,
  "data": {
    "section": "hero",
    "content": {
      "eyebrow": "Nonprofit Disaster Management",
      "headline": "Prepared Before.",
      "headlineAccent": "Present During.",
      ...
    },
    "version": 5,
    "updatedBy": "user_abc123",
    "updatedAt": "2026-06-15T14:30:00.000Z"
  }
}
```

### 6. Partial Update a Section (Deep Merge) ⭐ Recommended

```
PATCH /api/admin/home-page-content/:section
```

**This is the primary update endpoint.** Send only the fields you want to change — everything else remains intact.

**Merge rules:**
- **Objects** → recursively merged (only changed keys are updated)
- **Arrays** → replaced entirely when provided
- **Primitives** → overwrite the existing value
- **Omitted fields** → remain unchanged

**Request Body:**
```json
{
  "fields": {
    // Only include the fields you want to change
  }
}
```

#### Example 1: Update a single field

```bash
PATCH /api/admin/home-page-content/hero
```
```json
{
  "fields": {
    "headline": "New Headline Text"
  }
}
```
→ Only `hero.headline` changes. All other hero fields (`eyebrow`, `subtext`, `stats`, etc.) remain.

#### Example 2: Update multiple fields

```bash
PATCH /api/admin/home-page-content/hero
```
```json
{
  "fields": {
    "headline": "Updated Headline",
    "subtext": "Updated description paragraph",
    "heroImage": "https://cdn.r3sults.org/images/hero-new.jpg"
  }
}
```

#### Example 3: Replace an array

```bash
PATCH /api/admin/home-page-content/hero
```
```json
{
  "fields": {
    "stats": [
      { "value": "25+", "label": "Years Experience" },
      { "value": "24/7", "label": "Rapid Response" },
      { "value": "15+", "label": "Countries Served" },
      { "value": "100%", "label": "Full Transparency" }
    ]
  }
}
```
→ The entire `stats` array is replaced. Other hero fields remain.

#### Example 4: Update nested object fields

```bash
PATCH /api/admin/home-page-content/operations
```
```json
{
  "fields": {
    "positioning": {
      "heading": "Updated positioning heading"
    }
  }
}
```
→ Only `operations.positioning.heading` changes. Other positioning fields (`eyebrow`, `headingAccent`, `points`) remain because objects are deep-merged.

#### Example 5: Update the lead story in news

```bash
PATCH /api/admin/home-page-content/news
```
```json
{
  "fields": {
    "leadStory": {
      "title": "Updated Breaking News Headline",
      "date": "June 27, 2026"
    }
  }
}
```
→ Deep-merges into `news.leadStory` — only `title` and `date` change.

**Response:**
```json
{
  "success": true,
  "data": {
    "section": "hero",
    "content": { /* full merged section content after update */ },
    "version": 6,
    "updatedAt": "2026-06-27T10:00:00.000Z"
  },
  "message": "Section \"hero\" updated (v6)."
}
```

### 7. Full Section Replace

```
PUT /api/admin/home-page-content/:section
```

Replaces an entire section's content. Other sections remain untouched. Use when you want to completely redefine a section (e.g. rebuilding the hero from scratch).

**Request Body:**
```json
{
  "content": {
    "eyebrow": "Nonprofit Disaster Management",
    "headline": "Completely New Hero",
    "headlineAccent": "Brand New Accent",
    "headlineSuffix": "Brand New Suffix",
    "subtext": "Completely rewritten subtext.",
    "ctaPrimary": "Donate Now",
    "ctaSecondary": "Partner With Us",
    "heroImage": "https://cdn.r3sults.org/images/hero-new.jpg",
    "stats": [
      { "value": "25+", "label": "Years" },
      { "value": "24/7", "label": "Response" },
      { "value": "15+", "label": "Countries" },
      { "value": "100%", "label": "Transparency" }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "section": "hero",
    "content": { ... },
    "version": 7,
    "updatedAt": "2026-06-27T10:00:00.000Z"
  },
  "message": "Section \"hero\" fully replaced (v7)."
}
```

### 8. Full Content Replace

```
PUT /api/admin/home-page-content
```

Overwrites the **entire** home page content. Use with extreme caution — this replaces all 9 sections at once.

**Request Body:**
```json
{
  "content": {
    "hero": { ... },
    "approach": { ... },
    "impact": { ... },
    "operations": { ... },
    "testimonials": { ... },
    "donate": { ... },
    "stories": { ... },
    "news": { ... },
    "volunteer": { ... }
  }
}
```

### 9. Seed Default Content

```
POST /api/admin/home-page-content/seed
```

Populates the database with default content from the CMS contract. If content already exists, it will be **overwritten**.

> ⚠️ **Use with caution in production.** This resets all content to defaults.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cm...",
    "version": 1,
    "sections": ["hero", "approach", "impact", "operations", "testimonials", "donate", "stories", "news", "volunteer"],
    "updatedAt": "2026-06-27T10:00:00.000Z"
  },
  "message": "Home page content seeded with 9 sections (v1)."
}
```

### 10. Upload Media

```
POST /api/admin/home-page-content/upload
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | ✅ | Image (jpeg, png, webp, gif) or video (mp4, mov) |
| `section` | text | ✅ | Target section (e.g. `hero`) |
| `key` | text | ❌ | Dot-path for the content field (e.g. `heroImage`) |
| `oldUrl` | text | ❌ | URL of previous media to delete from Cloudinary |

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/r3sults/home-page/hero/abc123.jpg",
    "publicId": "r3sults/home-page/hero/abc123",
    "mediaType": "image",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "bytes": 524288,
    "key": "heroImage"
  },
  "message": "Media uploaded successfully. Use the URL in your content update."
}
```

**Upload + Update workflow:**
1. Upload the file → receive `url`
2. PATCH the section with the new URL:
```json
PATCH /api/admin/home-page-content/hero
{
  "fields": {
    "heroImage": "https://res.cloudinary.com/r3sults/home-page/hero/abc123.jpg"
  }
}
```

---

## Frontend Integration

### Fetching Home Page Content

```tsx
// Single fetch for the entire home page
async function getHomePageContent() {
  const res = await fetch('https://r3sults.org/api/home-page-content', {
    next: { revalidate: 60 }, // ISR: revalidate every 60s
  });
  return res.json();
}

export default async function HomePage() {
  const content = await getHomePageContent();
  
  return (
    <>
      <HeroSection data={content.hero} />
      <ApproachSection data={content.approach} />
      <ImpactSection data={content.impact} />
      <OperationsSection data={content.operations} />
      <TestimonialsSection data={content.testimonials} />
      <DonateSection data={content.donate} />
      <StoriesSection data={content.stories} />
      <NewsSection data={content.news} />
      <VolunteerSection data={content.volunteer} />
    </>
  );
}
```

### Admin Panel — Partial Update

```tsx
// Update only the hero headline
const updateHeroHeadline = async (newHeadline: string) => {
  const res = await fetch('/api/admin/home-page-content/hero', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fields: { headline: newHeadline }
    }),
  });
  const json = await res.json();
  if (json.success) toast.success(`Updated to v${json.data.version}`);
};
```

### Admin Panel — Upload + Update Image

```tsx
const updateHeroImage = async (file: File) => {
  // 1. Upload the image
  const formData = new FormData();
  formData.append('file', file);
  formData.append('section', 'hero');
  formData.append('key', 'heroImage');
  formData.append('oldUrl', currentHeroImage); // optional: clean up old image

  const uploadRes = await fetch('/api/admin/home-page-content/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: formData,
  });
  const uploadJson = await uploadRes.json();

  // 2. Update the content with the new URL
  const patchRes = await fetch('/api/admin/home-page-content/hero', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      fields: { heroImage: uploadJson.data.url }
    }),
  });
};
```

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
| `400` | Missing required fields, invalid section name |
| `401` | Missing or invalid Bearer token |
| `403` | User doesn't have `SUPER_ADMIN` role |
| `404` | Content not seeded yet, or section not found |
| `500` | Server error |

---

## Valid Section Names

| Section | Description |
|---------|-------------|
| `hero` | Hero banner with headline, CTA, stats |
| `approach` | Full-cycle methodology (3 phases) |
| `impact` | Animated counters and stats |
| `operations` | How we operate (6 pillars + positioning) |
| `testimonials` | Testimonial cards |
| `donate` | Donation tiers and trust block |
| `stories` | Story cards from the field |
| `news` | News feed (lead story, side stories, wire items) |
| `volunteer` | Volunteer + partner cards |

---

## Setup Steps

1. **Run Prisma migration** to create the `home_page_content` table:
   ```bash
   npx prisma db push
   ```
2. **Generate Prisma client**:
   ```bash
   npx prisma generate
   ```
3. **Seed default content** by calling the seed endpoint:
   ```bash
   curl -X POST https://r3sults.org/api/admin/home-page-content/seed \
     -H "Authorization: Bearer <admin-token>"
   ```
4. **Verify** by visiting the public endpoint:
   ```bash
   curl https://r3sults.org/api/home-page-content
   ```
