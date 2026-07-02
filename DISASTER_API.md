# Disaster API Documentation

The disaster API has been refactored to support **persistent, stable IDs** for disasters while continuously syncing with upstream live data. Instead of caching ephemeral data and overwriting it, the system now maintains a long-term database of disasters and matches returning data via a fingerprinting system.

## Overview

- **Source API:** Merged live disaster API (`https://results-admin-dashboard.vercel.app/api/merged-live-disasters`)
- **Sync Interval:** Every 24 hours (run automatically in the background)
- **ID Strategy:** Each disaster receives a custom stable ID (e.g. `FL-32A2EB`).
- **Data Persistence:** Disasters are never hard-deleted by syncs. If an API stops reporting a disaster, it is soft-deleted (`isActive = false`).

## Disaster ID Format

Every disaster in the database is assigned a unique ID in the format:
`[PREFIX]-[6-DIGIT-ALPHANUMERIC]`

The prefix corresponds to the disaster type:
- **HC-** : Hurricane
- **FL-** : Flood
- **WF-** : Wildfire
- **SS-** : Snowstorm
- **TD-** : Tornado
- **EQ-** : Earthquake
- **VE-** : Volcanic Eruption
- **PO-** : Power Outage
- **EW-** : Extreme Weather

*Example:* `FL-32A2EB` or `EQ-899A75`

## Endpoints

### 1. Get All Disasters
`GET /api/disasters`

Returns a list of active disasters, sorted by the latest event date.

**Query Parameters:**
- `limit` (default: 100, max: 500)
- `type` (filter by type e.g. `wildfire`)
- `severity` (filter by severity e.g. `high`)
- `source` (filter by data source e.g. `NASA EONET`)
- `status` (filter by open/closed status)
- `search` (text search against title/description)
- `includeInactive` (set to `true` to include soft-deleted past disasters)

### 2. Get Single Disaster
`GET /api/disasters/:id`

Look up a specific disaster by its custom coded ID (e.g., `GET /api/disasters/FL-32A2EB`).

### 3. Create Manual Disaster
`POST /api/disasters`

Allows the creation of a disaster record manually. Manually created records (`isManual = true`) are immediately active and will never be overwritten or soft-deleted by the 24-hour sync process.

**Body Payload (JSON):**
```json
{
  "title": "Hurricane Maria - Puerto Rico",
  "type": "hurricane",
  "description": "Category 4 hurricane making landfall",
  "severity": "critical",
  "status": "open",
  "location": {
    "coordinates": {
      "lat": 18.2208,
      "lng": -66.5901
    }
  },
  "date": "2026-07-02T12:00:00Z"
}
```

### 4. Force Manual Sync
`POST /api/disasters/sync`

Forces an immediate data pull from the upstream merged-live-disasters API and processes the updates against the database. 

---

## How Syncing & Fingerprinting Works

Because upstream APIs like Weather.gov and USGS generate new IDs on every request, we cannot rely on upstream IDs alone to prevent duplicates. 

To solve this, the sync engine uses a **Fingerprint Hash**:
- **NASA EONET:** Uses the stable EONET ID (e.g. `EONET_20558`).
- **Weather.gov / USGS:** Generates a deterministic SHA-256 hash using the string: `Title | Rounded Latitude | Rounded Longitude | Source`

**During the 24-hour sync:**
1. Upstream events are fetched and fingerprinted.
2. If the fingerprint **already exists** in the database, the record is `UPDATED` (status, severity, etc) but its custom `ID` (e.g., `FL-32A2EB`) remains untouched.
3. If the fingerprint is **new**, a new disaster is `CREATED` with a freshly generated custom ID.
4. Any API-sourced disasters in the database that were **not** found in the current sync are marked as `isActive = false` (soft-deleted).
