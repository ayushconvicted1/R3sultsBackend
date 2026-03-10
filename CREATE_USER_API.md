# Create User API Documentation

## Endpoint

```
POST /api/admin/users-mgmt/create-app-user
```

**Authentication**: Bearer token (Admin or Super Admin role required)

## Request

### Headers

| Header          | Value              | Required |
| --------------- | ------------------ | -------- |
| `Content-Type`  | `application/json` | ✅       |
| `Authorization` | `Bearer <token>`   | ✅       |

### Body

| Field                  | Type   | Required                    | Description                                 |
| ---------------------- | ------ | --------------------------- | ------------------------------------------- |
| `phoneNumber`          | string | At least one of phone/email | Unique phone number (e.g. `+911234567890`)  |
| `email`                | string | At least one of phone/email | Unique email address                        |
| `fullName`             | string | No                          | User's full name                            |
| `password`             | string | No                          | Min 6 characters (hashed with bcrypt)       |
| `username`             | string | No                          | Unique username                             |
| `role`                 | string | No                          | `SUPER_ADMIN`, `ADMIN`, `MEMBER` (default), `GUEST` |
| `gender`               | string | No                          | `male`, `female`, `other`                   |
| `dateOfBirth`          | string | No                          | ISO date format (e.g. `1990-05-15`)         |
| `bloodGroup`           | string | No                          | e.g. `O+`, `A-`, `B+`                      |
| `address`              | string | No                          | Street address                              |
| `city`                 | string | No                          | City                                        |
| `state`                | string | No                          | State                                       |
| `country`              | string | No                          | Country (default: `India`)                  |
| `pincode`              | string | No                          | Pincode / ZIP                               |
| `emergencyContactName` | string | No                          | Emergency contact's name                    |
| `emergencyContactPhone`| string | No                          | Emergency contact's phone                   |
| `profilePictureUrl`    | string | No                          | Profile picture URL                         |

### Example Request

```bash
curl -X POST "https://r3sults-backend.vercel.app/api/admin/users-mgmt/create-app-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "phoneNumber": "+911234567890",
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass@123",
    "role": "MEMBER",
    "gender": "male",
    "city": "Mumbai",
    "state": "Maharashtra",
    "bloodGroup": "O+"
  }'
```

## Responses

### 201 — Created

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "clxyz...",
      "phoneNumber": "+911234567890",
      "email": "john@example.com",
      "fullName": "John Doe",
      "role": "MEMBER",
      "gender": "male",
      "isActive": true,
      "isVerified": true,
      "createdAt": "2026-03-10T07:18:00.000Z",
      "updatedAt": "2026-03-10T07:18:00.000Z"
    }
  }
}
```

### 400 — Validation Error

```json
{
  "success": false,
  "message": "At least one of phoneNumber or email is required"
}
```

### 400 — Duplicate User

```json
{
  "success": false,
  "message": "A user already exists with this phone number"
}
```

### 401 — Unauthorized

```json
{
  "success": false,
  "message": "Access token required"
}
```

### 403 — Forbidden

```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

## Notes

- The password is hashed with `bcrypt` (12 salt rounds) before storage
- Sensitive fields (`passwordHash`, `otpCode`, `refreshToken`) are never returned
- The user is created as verified and active by default
- Swagger docs are also available at `/api-docs`
