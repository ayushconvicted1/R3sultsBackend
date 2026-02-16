# Location History API — Admin Panel Reference

> **Base URL:** `https://<your-domain>/api/tracking`  
> **Auth:** `Authorization: Bearer <token>`

---

## API to Call

### Get a User's Location History

```
GET /api/tracking/location/history/:userId
```

**Query Params:**

| Param | Type | Example |
|-------|------|---------|
| `page` | int | `1` |
| `limit` | int | `20` |
| `startDate` | ISO date | `2026-02-01` |
| `endDate` | ISO date | `2026-02-16` |

**Example:**
```
GET /api/tracking/location/history/clab123xyz?page=1&limit=20&startDate=2026-02-01&endDate=2026-02-16
```

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "clxyz...",
        "userId": "clab123xyz",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "accuracy": 10.5,
        "altitude": 215.0,
        "speed": 2.5,
        "heading": 180.0,
        "timestamp": "2026-02-16T17:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

---

## ⚠️ Why It Stopped Working

In `trackingController.js` (lines 20–23), the history write was **commented out**:

```js
// await prisma.locationHistory.create({
//   data: { userId, latitude, longitude, accuracy, altitude, speed, heading },
// });
```

**Uncomment these lines** to start saving history again.

---

## ⚠️ Access Control Issue for Admin

`/location/history/:userId` currently requires an active `LocationSharing` record between users. For admin panel usage, either:

1. Add a new admin route `GET /api/admin/users/:userId/location/history` that bypasses sharing checks, OR
2. Use admin token and ensure sharing exists
