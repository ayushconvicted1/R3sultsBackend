# Dynamic Role-Based Access Control (RBAC) API

This document details the newly implemented dynamic RBAC system for the R3sults admin dashboard.

## Overview

The system replaces the legacy hardcoded `UserRole` and `Permission` enums with a fully dynamic, database-driven structure. This allows administrators to define custom roles, register API actions, and assign fine-grained permissions without requiring code deployment or database schema changes.

### Core Components
1. **Roles**: Defined in the `roles` table. Contains system roles (`SUPER_ADMIN`, `ADMIN`, etc.) and custom roles created by admins.
2. **Actions**: Defined in the `actions` table. Represents specific API endpoints (e.g., `disasters.create`).
3. **Role-Action Mapping**: Defined in the `role_action_map` table. A purely relational mapping table that avoids array-based storage for O(1) index lookups.

---

## Middleware

The access control is enforced via the `requireAction` middleware in `src/middleware/auth.js`.

### Usage
Import the middleware and apply it to specific routes with the required action key:

```javascript
const { requireAction } = require('../middleware/auth');

router.post('/', requireAction('disasters.create'), ctrl.post_disasters);
```

### Behavior
1. **Resolution**: The middleware resolves the user's role from their `roleId`.
2. **God-Mode Bypass**: If the user's resolved role name is `SUPER_ADMIN`, all checks are bypassed, and access is granted immediately.
3. **Database Check**: For non-admin roles, the middleware performs an indexed lookup on `role_action_map` to verify if the role has the requested action.
4. **Denial**: If access is denied, a `403 Forbidden` is returned with a standardized error structure:
   ```json
   {
     "success": false,
     "message": "Insufficient permissions: you do not have the 'disasters.create' permission",
     "error": {
       "code": "PERMISSION_DENIED",
       "requiredAction": "disasters.create",
       "userRole": "MEMBER"
     }
   }
   ```

---

## API Endpoints

All RBAC endpoints are mounted under `/api/admin/rbac` and require `SUPER_ADMIN` privileges.

### 1. Roles API

#### List Roles
* **GET** `/api/admin/rbac/roles`
* **Query Params**:
  * `includeActions=true`: Include the list of actions assigned to each role.
  * `search=query`: Search roles by name or display name.
  * `page`, `limit`: Standard pagination.

#### Create Role
* **POST** `/api/admin/rbac/roles`
* **Body**:
  ```json
  {
    "name": "FIELD_MANAGER", // Required. Auto-uppercased, spaces replaced by _.
    "displayName": "Field Manager",
    "description": "Manages field operations"
  }
  ```

#### Get Role by ID
* **GET** `/api/admin/rbac/roles/:id`
* **Note**: Supports looking up by both `id` (cuid) or `name` (e.g., "SUPER_ADMIN"). Includes all mapped actions.

#### Update Role
* **PUT** `/api/admin/rbac/roles/:id`
* **Body**: `{ "displayName": "...", "description": "...", "isActive": true }`
* **Note**: System roles cannot be deactivated.

#### Delete Role
* **DELETE** `/api/admin/rbac/roles/:id`
* **Note**: System roles cannot be deleted. Roles with active users assigned cannot be deleted.

### 2. Actions API

#### List Actions
* **GET** `/api/admin/rbac/actions`
* **Query Params**:
  * `module=users`: Filter by module.
  * `isActive=true`: Filter by active status.
  * `groupByModule=true`: Group the response data by module keys.

#### Create Action
* **POST** `/api/admin/rbac/actions`
* **Body**:
  ```json
  {
    "actionKey": "custom.action",
    "httpMethod": "POST",
    "routePath": "/api/admin/custom",
    "module": "custom",
    "description": "A custom action"
  }
  ```

#### Update / Delete Action
* **PUT** `/api/admin/rbac/actions/:id`
* **DELETE** `/api/admin/rbac/actions/:id` (Soft delete by setting `isActive = false`)

### 3. Role-Action Mapping API

#### Get Assigned Actions
* **GET** `/api/admin/rbac/roles/:roleId/actions`

#### Assign Single Action
* **POST** `/api/admin/rbac/roles/:roleId/actions`
* **Body**: `{ "actionId": "cuid..." }`

#### Revoke Single Action
* **DELETE** `/api/admin/rbac/roles/:roleId/actions/:actionId`

#### Bulk Operations
* **Replace All**: `PUT /api/admin/rbac/roles/:roleId/actions/bulk` - Body: `{ "actionIds": ["id1", "id2"] }` (Wipes existing mappings and sets these).
* **Add Multiple**: `POST /api/admin/rbac/roles/:roleId/actions/bulk-add` - Body: `{ "actionIds": ["id1", "id2"] }`
* **Remove Multiple**: `DELETE /api/admin/rbac/roles/:roleId/actions/bulk-remove` - Body: `{ "actionIds": ["id1", "id2"] }`

### 4. Utility APIs

#### Check Permission
* **GET** `/api/admin/rbac/check?roleId=...&actionKey=...`
* Returns whether a specific role has a specific action, useful for frontend conditional rendering.

#### Seed
* **POST** `/api/admin/rbac/seed`
* Triggers the internal action seeding script.
