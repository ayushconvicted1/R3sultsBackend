# Admin Panel RBAC Integration Guide

This guide outlines the necessary steps to integrate the new Dynamic Role-Based Access Control (RBAC) system into the R3sults Admin Panel frontend. 

## 1. Overview of Required UI Pages

You will need to build the following views in the admin panel (typically under a "Settings" or "Access Control" section):

1.  **Roles Management Page**: A list view of all roles with options to create, edit, and delete custom roles.
2.  **Role Permissions Editor**: A detailed view for a specific role where administrators can view all available API actions (grouped by module) and toggle them on/off for that role.
3.  **Actions Directory (Optional/Developer Only)**: A list of all registered system actions. This is mostly read-only, but useful for debugging.

---

## 2. API Endpoints to Consume

All endpoints are prefixed with `BASE_URL/api/admin/rbac/`. Your frontend API service (e.g., Axios instance) must send the `Authorization: Bearer <token>` header.

### Roles Management
*   **List Roles**: `GET /roles` 
    *   *Returns*: `{ success: true, data: { roles: [...], pagination: {...} } }`
*   **Create Role**: `POST /roles`
    *   *Payload*: `{ "name": "FIELD_MANAGER", "displayName": "Field Manager", "description": "..." }`
*   **Edit Role**: `PUT /roles/:id`
    *   *Payload*: `{ "displayName": "New Name", "description": "...", "isActive": true }`
*   **Delete Role**: `DELETE /roles/:id`

### Permissions Assignment (The UI Matrix)
The easiest way to build the permission assignment matrix is to use the bulk assignment endpoints.

1.  **Fetch all available actions grouped by module**:
    *   `GET /actions?groupByModule=true`
    *   *Returns*: An object where keys are modules (e.g., `disasters`, `users`) and values are arrays of action objects. Use this to render the UI checkboxes grouped by category.
2.  **Fetch actions assigned to a specific role**:
    *   `GET /roles/:roleId/actions`
    *   *Returns*: An array of action objects the role currently has. Check the corresponding boxes in your UI.
3.  **Save changes (Bulk Update)**:
    *   When the admin clicks "Save Permissions", collect all the `actionId`s of the checked boxes.
    *   `PUT /roles/:roleId/actions/bulk`
    *   *Payload*: `{ "actionIds": ["cuid1", "cuid2", ...] }`
    *   *Note*: This endpoint replaces *all* mappings for that role with the new array. It is the safest and easiest way to handle checkbox saves.

---

## 3. Required Frontend Changes (Breaking Changes)

The migration to the new RBAC system introduces changes to how the frontend handles authorization state and API errors.

### A. Handling 403 Forbidden Errors (Crucial)

Previously, unauthorized requests might have returned a generic 403 or 401. The new middleware returns a specific error structure when a user lacks a required action. 

You should update your global Axios/Fetch error interceptor to handle this gracefully:

**Example Axios Interceptor Update:**
```javascript
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data.error;
      
      if (errorData && errorData.code === 'PERMISSION_DENIED') {
        // Show a clear toast/notification to the user
        toast.error(`Access Denied: You do not have the '${errorData.requiredAction}' permission.`);
        
        // Optionally redirect to a generic "Not Authorized" page if it was a page load request
      } else {
        toast.error(error.response.data.message || 'Forbidden');
      }
    }
    return Promise.reject(error);
  }
);
```

### B. Conditional Rendering (Hiding Buttons/Tabs)

If you want to hide a "Create Disaster" button because the user doesn't have the `disasters.create` permission, you have two options:

**Option 1: The API Check Approach (Lazy Check)**
Call the utility endpoint before rendering specific high-security sections:
*   `GET /check?roleId=<user_role_id>&actionKey=disasters.create`
*   *Returns*: `{ success: true, data: { hasAccess: true/false } }`

**Option 2: The Context Approach (Recommended for UI speed)**
1.  When the user logs into the admin panel, fetch their full role profile along with their assigned actions: `GET /roles/<user_role_id>`.
2.  Store the array of assigned `actionKey`s in your React/Vue global state (e.g., Redux, Context API, Zustand).
3.  Create a wrapper component (e.g., `<RequirePermission action="disasters.create">`) that checks if the action key exists in the global array before rendering its children.

> [!IMPORTANT]  
> If the user's role is `SUPER_ADMIN`, your frontend logic should automatically assume `hasAccess = true` for everything without checking the array, mimicking the backend's god-mode bypass.

### C. Updating the User Login Response

Ensure that your authentication state now stores the `roleId` and `roleName` returned by the backend login endpoints, as any legacy code checking `user.role === 'SUPER_ADMIN'` may need to be updated to check `user.roleName === 'SUPER_ADMIN'`.

### D. User Management Integration

When creating or editing an `OpsUser` or an admin user in the system, the dropdown for selecting their role must now be populated dynamically from the database, rather than using a hardcoded frontend enum.

1.  Fetch the roles: `GET /roles`
2.  Render a `<select>` or dropdown using `role.id` as the value and `role.displayName` as the label.
3.  Submit the selected `role.id` when saving the user.
