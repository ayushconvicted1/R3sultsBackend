require('dotenv').config();
const prisma = require('../src/lib/prisma');

const actions = [
  // users
  { actionKey: 'users.list', httpMethod: 'GET', routePath: '/api/admin/users', module: 'users', description: 'List users' },
  { actionKey: 'users.create', httpMethod: 'POST', routePath: '/api/admin/users', module: 'users', description: 'Create user' },
  { actionKey: 'users.read', httpMethod: 'GET', routePath: '/api/admin/users/:id', module: 'users', description: 'Read user' },
  { actionKey: 'users.update', httpMethod: 'PUT', routePath: '/api/admin/users/:id', module: 'users', description: 'Update user' },
  { actionKey: 'users.delete', httpMethod: 'DELETE', routePath: '/api/admin/users/:id', module: 'users', description: 'Delete user' },
  { actionKey: 'users.activate', httpMethod: 'PATCH', routePath: '/api/admin/users/:userId/activate', module: 'users', description: 'Activate user' },
  { actionKey: 'users.deactivate', httpMethod: 'PATCH', routePath: '/api/admin/users/:userId/deactivate', module: 'users', description: 'Deactivate user' },
  { actionKey: 'users.getRole', httpMethod: 'GET', routePath: '/api/admin/users/:userId/role', module: 'users', description: 'Get user role' },
  { actionKey: 'users.assignRole', httpMethod: 'PATCH', routePath: '/api/admin/users/:userId/role', module: 'users', description: 'Assign user role' },
  // disasters
  { actionKey: 'disasters.list', httpMethod: 'GET', routePath: '/api/admin/disasters', module: 'disasters', description: 'List disasters' },
  { actionKey: 'disasters.create', httpMethod: 'POST', routePath: '/api/admin/disasters', module: 'disasters', description: 'Create disaster' },
  { actionKey: 'disasters.read', httpMethod: 'GET', routePath: '/api/admin/disasters/:id', module: 'disasters', description: 'Read disaster' },
  { actionKey: 'disasters.update', httpMethod: 'PUT', routePath: '/api/admin/disasters/:id', module: 'disasters', description: 'Update disaster' },
  { actionKey: 'disasters.delete', httpMethod: 'DELETE', routePath: '/api/admin/disasters/:id', module: 'disasters', description: 'Delete disaster' },
  { actionKey: 'disasters.assignVolunteer', httpMethod: 'POST', routePath: '/api/admin/disasters/:id/assign-volunteer', module: 'disasters', description: 'Assign volunteer to disaster' },
  { actionKey: 'disasters.removeVolunteer', httpMethod: 'DELETE', routePath: '/api/admin/disasters/:id/assign-volunteer', module: 'disasters', description: 'Remove volunteer from disaster' },
  // emergencies
  { actionKey: 'emergencies.list', httpMethod: 'GET', routePath: '/api/admin/emergencies', module: 'emergencies', description: 'List emergencies' },
  { actionKey: 'emergencies.create', httpMethod: 'POST', routePath: '/api/admin/emergencies', module: 'emergencies', description: 'Create emergency' },
  // shelters
  { actionKey: 'shelters.list', httpMethod: 'GET', routePath: '/api/admin/shelters', module: 'shelters', description: 'List shelters' },
  { actionKey: 'shelters.create', httpMethod: 'POST', routePath: '/api/admin/shelters', module: 'shelters', description: 'Create shelter' },
  { actionKey: 'shelters.update', httpMethod: 'PUT', routePath: '/api/admin/shelters', module: 'shelters', description: 'Update shelter' },
  { actionKey: 'shelters.delete', httpMethod: 'DELETE', routePath: '/api/admin/shelters', module: 'shelters', description: 'Delete shelter' },
  { actionKey: 'shelters.seed', httpMethod: 'POST', routePath: '/api/admin/shelters/seed', module: 'shelters', description: 'Seed shelters' },
  { actionKey: 'shelters.init', httpMethod: 'GET', routePath: '/api/admin/shelters/init', module: 'shelters', description: 'Init shelters' },
  // devices
  { actionKey: 'devices.list', httpMethod: 'GET', routePath: '/api/admin/devices', module: 'devices', description: 'List devices' },
  { actionKey: 'devices.create', httpMethod: 'POST', routePath: '/api/admin/devices', module: 'devices', description: 'Create device' },
  { actionKey: 'devices.read', httpMethod: 'GET', routePath: '/api/admin/devices/:id', module: 'devices', description: 'Read device' },
  { actionKey: 'devices.update', httpMethod: 'PUT', routePath: '/api/admin/devices/:id', module: 'devices', description: 'Update device' },
  { actionKey: 'devices.delete', httpMethod: 'DELETE', routePath: '/api/admin/devices/:id', module: 'devices', description: 'Delete device' },
  // incidents
  { actionKey: 'incidents.list', httpMethod: 'GET', routePath: '/api/admin/incidents', module: 'incidents', description: 'List incidents' },
  { actionKey: 'incidents.create', httpMethod: 'POST', routePath: '/api/admin/incidents', module: 'incidents', description: 'Create incident' },
  { actionKey: 'incidents.read', httpMethod: 'GET', routePath: '/api/admin/incidents/:id', module: 'incidents', description: 'Read incident' },
  { actionKey: 'incidents.update', httpMethod: 'PUT', routePath: '/api/admin/incidents/:id', module: 'incidents', description: 'Update incident' },
  { actionKey: 'incidents.delete', httpMethod: 'DELETE', routePath: '/api/admin/incidents/:id', module: 'incidents', description: 'Delete incident' },
  // inventory.items
  { actionKey: 'inventory.items.list', httpMethod: 'GET', routePath: '/api/admin/inventory/items', module: 'inventory.items', description: 'List inventory items' },
  { actionKey: 'inventory.items.create', httpMethod: 'POST', routePath: '/api/admin/inventory/items', module: 'inventory.items', description: 'Create inventory item' },
  { actionKey: 'inventory.items.read', httpMethod: 'GET', routePath: '/api/admin/inventory/items/:id', module: 'inventory.items', description: 'Read inventory item' },
  { actionKey: 'inventory.items.update', httpMethod: 'PUT', routePath: '/api/admin/inventory/items/:id', module: 'inventory.items', description: 'Update inventory item' },
  { actionKey: 'inventory.items.delete', httpMethod: 'DELETE', routePath: '/api/admin/inventory/items/:id', module: 'inventory.items', description: 'Delete inventory item' },
  // inventory.locations
  { actionKey: 'inventory.locations.list', httpMethod: 'GET', routePath: '/api/admin/inventory/locations', module: 'inventory.locations', description: 'List inventory locations' },
  { actionKey: 'inventory.locations.create', httpMethod: 'POST', routePath: '/api/admin/inventory/locations', module: 'inventory.locations', description: 'Create inventory location' },
  { actionKey: 'inventory.locations.read', httpMethod: 'GET', routePath: '/api/admin/inventory/locations/:id', module: 'inventory.locations', description: 'Read inventory location' },
  { actionKey: 'inventory.locations.update', httpMethod: 'PUT', routePath: '/api/admin/inventory/locations/:id', module: 'inventory.locations', description: 'Update inventory location' },
  { actionKey: 'inventory.locations.delete', httpMethod: 'DELETE', routePath: '/api/admin/inventory/locations/:id', module: 'inventory.locations', description: 'Delete inventory location' },
  // inventory.stock
  { actionKey: 'inventory.stock.list', httpMethod: 'GET', routePath: '/api/admin/inventory/stock', module: 'inventory.stock', description: 'List inventory stock' },
  { actionKey: 'inventory.stock.create', httpMethod: 'POST', routePath: '/api/admin/inventory/stock', module: 'inventory.stock', description: 'Create inventory stock' },
  { actionKey: 'inventory.stock.read', httpMethod: 'GET', routePath: '/api/admin/inventory/stock/:id', module: 'inventory.stock', description: 'Read inventory stock' },
  { actionKey: 'inventory.stock.update', httpMethod: 'PUT', routePath: '/api/admin/inventory/stock/:id', module: 'inventory.stock', description: 'Update inventory stock' },
  { actionKey: 'inventory.stock.delete', httpMethod: 'DELETE', routePath: '/api/admin/inventory/stock/:id', module: 'inventory.stock', description: 'Delete inventory stock' },
  { actionKey: 'inventory.stock.dispatch', httpMethod: 'POST', routePath: '/api/admin/inventory/stock/:id/dispatch', module: 'inventory.stock', description: 'Dispatch inventory stock' },
  { actionKey: 'inventory.stock.reserve', httpMethod: 'POST', routePath: '/api/admin/inventory/stock/:id/reserve', module: 'inventory.stock', description: 'Reserve inventory stock' },
  { actionKey: 'inventory.stock.restock', httpMethod: 'POST', routePath: '/api/admin/inventory/stock/:id/restock', module: 'inventory.stock', description: 'Restock inventory stock' },
  // damageReports
  { actionKey: 'damageReports.list', httpMethod: 'GET', routePath: '/api/admin/damage-reports', module: 'damageReports', description: 'List damage reports' },
  { actionKey: 'damageReports.create', httpMethod: 'POST', routePath: '/api/admin/damage-reports', module: 'damageReports', description: 'Create damage report' },
  { actionKey: 'damageReports.read', httpMethod: 'GET', routePath: '/api/admin/damage-reports/:id', module: 'damageReports', description: 'Read damage report' },
  { actionKey: 'damageReports.update', httpMethod: 'PUT', routePath: '/api/admin/damage-reports/:id', module: 'damageReports', description: 'Update damage report' },
  { actionKey: 'damageReports.delete', httpMethod: 'DELETE', routePath: '/api/admin/damage-reports/:id', module: 'damageReports', description: 'Delete damage report' },
  // adjusters
  { actionKey: 'adjusters.list', httpMethod: 'GET', routePath: '/api/admin/adjusters', module: 'adjusters', description: 'List adjusters' },
  { actionKey: 'adjusters.create', httpMethod: 'POST', routePath: '/api/admin/adjusters', module: 'adjusters', description: 'Create adjuster' },
  { actionKey: 'adjusters.read', httpMethod: 'GET', routePath: '/api/admin/adjusters/:id', module: 'adjusters', description: 'Read adjuster' },
  { actionKey: 'adjusters.update', httpMethod: 'PUT', routePath: '/api/admin/adjusters/:id', module: 'adjusters', description: 'Update adjuster' },
  { actionKey: 'adjusters.delete', httpMethod: 'DELETE', routePath: '/api/admin/adjusters/:id', module: 'adjusters', description: 'Delete adjuster' },
  // volunteers
  { actionKey: 'volunteers.list', httpMethod: 'GET', routePath: '/api/admin/volunteer-mgmt', module: 'volunteers', description: 'List volunteers' },
  { actionKey: 'volunteers.create', httpMethod: 'POST', routePath: '/api/admin/volunteer-mgmt', module: 'volunteers', description: 'Create volunteer' },
  { actionKey: 'volunteers.update', httpMethod: 'PUT', routePath: '/api/admin/volunteer-mgmt', module: 'volunteers', description: 'Update volunteer' },
  { actionKey: 'volunteers.delete', httpMethod: 'DELETE', routePath: '/api/admin/volunteer-mgmt', module: 'volunteers', description: 'Delete volunteer' },
  { actionKey: 'volunteers.assignDisaster', httpMethod: 'POST', routePath: '/api/admin/volunteer-mgmt/:id/assign-disaster', module: 'volunteers', description: 'Assign disaster to volunteer' },
  { actionKey: 'volunteers.seed', httpMethod: 'POST', routePath: '/api/admin/volunteer-mgmt/seed', module: 'volunteers', description: 'Seed volunteers' },
  { actionKey: 'volunteers.mobileLogin', httpMethod: 'POST', routePath: '/api/admin/volunteer-mgmt/mobile-login', module: 'volunteers', description: 'Volunteer mobile login' },
  // volunteerTeams
  { actionKey: 'volunteerTeams.list', httpMethod: 'GET', routePath: '/api/admin/volunteer-teams', module: 'volunteerTeams', description: 'List volunteer teams' },
  { actionKey: 'volunteerTeams.create', httpMethod: 'POST', routePath: '/api/admin/volunteer-teams', module: 'volunteerTeams', description: 'Create volunteer team' },
  { actionKey: 'volunteerTeams.read', httpMethod: 'GET', routePath: '/api/admin/volunteer-teams/:id', module: 'volunteerTeams', description: 'Read volunteer team' },
  { actionKey: 'volunteerTeams.update', httpMethod: 'PUT', routePath: '/api/admin/volunteer-teams/:id', module: 'volunteerTeams', description: 'Update volunteer team' },
  { actionKey: 'volunteerTeams.delete', httpMethod: 'DELETE', routePath: '/api/admin/volunteer-teams/:id', module: 'volunteerTeams', description: 'Delete volunteer team' },
  // products
  { actionKey: 'products.list', httpMethod: 'GET', routePath: '/api/admin/products', module: 'products', description: 'List products' },
  { actionKey: 'products.create', httpMethod: 'POST', routePath: '/api/admin/products', module: 'products', description: 'Create product' },
  { actionKey: 'products.read', httpMethod: 'GET', routePath: '/api/admin/products/:id', module: 'products', description: 'Read product' },
  { actionKey: 'products.update', httpMethod: 'PUT', routePath: '/api/admin/products/:id', module: 'products', description: 'Update product' },
  { actionKey: 'products.delete', httpMethod: 'DELETE', routePath: '/api/admin/products/:id', module: 'products', description: 'Delete product' },
  // orders
  { actionKey: 'orders.list', httpMethod: 'GET', routePath: '/api/admin/orders', module: 'orders', description: 'List orders' },
  { actionKey: 'orders.create', httpMethod: 'POST', routePath: '/api/admin/orders', module: 'orders', description: 'Create order' },
  { actionKey: 'orders.read', httpMethod: 'GET', routePath: '/api/admin/orders/:id', module: 'orders', description: 'Read order' },
  // services
  { actionKey: 'services.list', httpMethod: 'GET', routePath: '/api/admin/services', module: 'services', description: 'List services' },
  { actionKey: 'services.create', httpMethod: 'POST', routePath: '/api/admin/services', module: 'services', description: 'Create service' },
  { actionKey: 'services.update', httpMethod: 'PUT', routePath: '/api/admin/services', module: 'services', description: 'Update service' },
  { actionKey: 'services.delete', httpMethod: 'DELETE', routePath: '/api/admin/services', module: 'services', description: 'Delete service' },
  { actionKey: 'services.categoryDocs.list', httpMethod: 'GET', routePath: '/api/admin/services/category-documents', module: 'services', description: 'List category documents' },
  { actionKey: 'services.categoryDocs.create', httpMethod: 'POST', routePath: '/api/admin/services/category-documents', module: 'services', description: 'Create category documents' },
  { actionKey: 'services.categoryDocs.update', httpMethod: 'PUT', routePath: '/api/admin/services/category-documents', module: 'services', description: 'Update category documents' },
  { actionKey: 'services.categoryDocs.delete', httpMethod: 'DELETE', routePath: '/api/admin/services/category-documents', module: 'services', description: 'Delete category documents' },
  // usersMgmt
  { actionKey: 'usersMgmt.list', httpMethod: 'GET', routePath: '/api/admin/users-mgmt', module: 'usersMgmt', description: 'List users management' },
  { actionKey: 'usersMgmt.create', httpMethod: 'POST', routePath: '/api/admin/users-mgmt', module: 'usersMgmt', description: 'Create user management' },
  { actionKey: 'usersMgmt.update', httpMethod: 'PUT', routePath: '/api/admin/users-mgmt', module: 'usersMgmt', description: 'Update user management' },
  { actionKey: 'usersMgmt.delete', httpMethod: 'DELETE', routePath: '/api/admin/users-mgmt', module: 'usersMgmt', description: 'Delete user management' },
  { actionKey: 'usersMgmt.read', httpMethod: 'GET', routePath: '/api/admin/users-mgmt/:id', module: 'usersMgmt', description: 'Read user management' },
  { actionKey: 'usersMgmt.createAppUser', httpMethod: 'POST', routePath: '/api/admin/users-mgmt/create-app-user', module: 'usersMgmt', description: 'Create app user' },
  { actionKey: 'usersMgmt.deleteAppUser', httpMethod: 'DELETE', routePath: '/api/admin/users-mgmt/delete-app-user/:id', module: 'usersMgmt', description: 'Delete app user' },
  // opsUsers
  { actionKey: 'opsUsers.list', httpMethod: 'GET', routePath: '/api/admin/ops-users', module: 'opsUsers', description: 'List ops users' },
  { actionKey: 'opsUsers.create', httpMethod: 'POST', routePath: '/api/admin/ops-users', module: 'opsUsers', description: 'Create ops user' },
  { actionKey: 'opsUsers.read', httpMethod: 'GET', routePath: '/api/admin/ops-users/:id', module: 'opsUsers', description: 'Read ops user' },
  { actionKey: 'opsUsers.update', httpMethod: 'PUT', routePath: '/api/admin/ops-users/:id', module: 'opsUsers', description: 'Update ops user' },
  { actionKey: 'opsUsers.delete', httpMethod: 'DELETE', routePath: '/api/admin/ops-users/:id', module: 'opsUsers', description: 'Delete ops user' },
  // reports
  { actionKey: 'reports.list', httpMethod: 'GET', routePath: '/api/admin/reports', module: 'reports', description: 'List reports' },
  { actionKey: 'reports.generate', httpMethod: 'POST', routePath: '/api/admin/reports/generate', module: 'reports', description: 'Generate report' },
  // search
  { actionKey: 'search.global', httpMethod: 'GET', routePath: '/api/admin/search', module: 'search', description: 'Global search' },
  // broadcast
  { actionKey: 'broadcast.list', httpMethod: 'GET', routePath: '/api/admin/broadcast', module: 'broadcast', description: 'List broadcasts' },
  { actionKey: 'broadcast.create', httpMethod: 'POST', routePath: '/api/admin/broadcast', module: 'broadcast', description: 'Create broadcast' },
  { actionKey: 'broadcast.read', httpMethod: 'GET', routePath: '/api/admin/broadcast/:id', module: 'broadcast', description: 'Read broadcast' },
  // landingContent
  { actionKey: 'landingContent.list', httpMethod: 'GET', routePath: '/api/admin/landing-content', module: 'landingContent', description: 'List landing content' },
  { actionKey: 'landingContent.sectionsList', httpMethod: 'GET', routePath: '/api/admin/landing-content/sections-list', module: 'landingContent', description: 'List landing content sections' },
  { actionKey: 'landingContent.read', httpMethod: 'GET', routePath: '/api/admin/landing-content/:page/:section', module: 'landingContent', description: 'Read landing content' },
  { actionKey: 'landingContent.create', httpMethod: 'PUT', routePath: '/api/admin/landing-content/:page/:section', module: 'landingContent', description: 'Create landing content' },
  { actionKey: 'landingContent.update', httpMethod: 'PUT', routePath: '/api/admin/landing-content/:page/:section', module: 'landingContent', description: 'Update landing content' },
  { actionKey: 'landingContent.patch', httpMethod: 'PATCH', routePath: '/api/admin/landing-content/:page/:section', module: 'landingContent', description: 'Patch landing content' },
  { actionKey: 'landingContent.bulkUpsert', httpMethod: 'PUT', routePath: '/api/admin/landing-content/bulk', module: 'landingContent', description: 'Bulk upsert landing content' },
  { actionKey: 'landingContent.upload', httpMethod: 'POST', routePath: '/api/admin/landing-content/upload', module: 'landingContent', description: 'Upload landing content' },
  { actionKey: 'landingContent.delete', httpMethod: 'DELETE', routePath: '/api/admin/landing-content/:page/:section', module: 'landingContent', description: 'Delete landing content' },
  { actionKey: 'landingContent.seed', httpMethod: 'POST', routePath: '/api/admin/landing-content/seed', module: 'landingContent', description: 'Seed landing content' },
  // dashboard
  { actionKey: 'dashboard.stats', httpMethod: 'GET', routePath: '/api/admin/dashboard/stats', module: 'dashboard', description: 'Dashboard stats' },
  // mobile
  { actionKey: 'mobile.users', httpMethod: 'GET', routePath: '/api/admin/mobile/users', module: 'mobile', description: 'Mobile users' },
  { actionKey: 'mobile.volunteers', httpMethod: 'GET', routePath: '/api/admin/mobile/volunteers', module: 'mobile', description: 'Mobile volunteers' },
  // roles
  { actionKey: 'roles.list', httpMethod: 'GET', routePath: '/api/admin/rbac/roles', module: 'roles', description: 'List roles' },
  { actionKey: 'roles.create', httpMethod: 'POST', routePath: '/api/admin/rbac/roles', module: 'roles', description: 'Create role' },
  { actionKey: 'roles.read', httpMethod: 'GET', routePath: '/api/admin/rbac/roles/:id', module: 'roles', description: 'Read role' },
  { actionKey: 'roles.update', httpMethod: 'PUT', routePath: '/api/admin/rbac/roles/:id', module: 'roles', description: 'Update role' },
  { actionKey: 'roles.delete', httpMethod: 'DELETE', routePath: '/api/admin/rbac/roles/:id', module: 'roles', description: 'Delete role' },
  // actions
  { actionKey: 'actions.list', httpMethod: 'GET', routePath: '/api/admin/rbac/actions', module: 'actions', description: 'List actions' },
  { actionKey: 'actions.create', httpMethod: 'POST', routePath: '/api/admin/rbac/actions', module: 'actions', description: 'Create action' },
  { actionKey: 'actions.read', httpMethod: 'GET', routePath: '/api/admin/rbac/actions/:id', module: 'actions', description: 'Read action' },
  { actionKey: 'actions.update', httpMethod: 'PUT', routePath: '/api/admin/rbac/actions/:id', module: 'actions', description: 'Update action' },
  { actionKey: 'actions.delete', httpMethod: 'DELETE', routePath: '/api/admin/rbac/actions/:id', module: 'actions', description: 'Delete action' },
  // roleMapping
  { actionKey: 'roleMapping.list', httpMethod: 'GET', routePath: '/api/admin/rbac/roles/:roleId/actions', module: 'roleMapping', description: 'List role mappings' },
  { actionKey: 'roleMapping.assign', httpMethod: 'POST', routePath: '/api/admin/rbac/roles/:roleId/actions', module: 'roleMapping', description: 'Assign role mapping' },
  { actionKey: 'roleMapping.revoke', httpMethod: 'DELETE', routePath: '/api/admin/rbac/roles/:roleId/actions/:actionId', module: 'roleMapping', description: 'Revoke role mapping' },
  { actionKey: 'roleMapping.bulkAssign', httpMethod: 'PUT', routePath: '/api/admin/rbac/roles/:roleId/actions/bulk', module: 'roleMapping', description: 'Bulk assign role mapping' },
  { actionKey: 'roleMapping.bulkAdd', httpMethod: 'POST', routePath: '/api/admin/rbac/roles/:roleId/actions/bulk-add', module: 'roleMapping', description: 'Bulk add role mapping' },
  { actionKey: 'roleMapping.bulkRevoke', httpMethod: 'DELETE', routePath: '/api/admin/rbac/roles/:roleId/actions/bulk-remove', module: 'roleMapping', description: 'Bulk revoke role mapping' },
  // rbac util
  { actionKey: 'rbac.check', httpMethod: 'GET', routePath: '/api/admin/rbac/check', module: 'rbac', description: 'Check permission' },
  { actionKey: 'rbac.seed', httpMethod: 'POST', routePath: '/api/admin/rbac/seed', module: 'rbac', description: 'Seed RBAC' },
];

const systemRoles = [
  { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'God mode, access to everything', isSystem: true },
  { name: 'ADMIN', displayName: 'Admin', description: 'Administrative access', isSystem: true },
  { name: 'MEMBER', displayName: 'Member', description: 'Standard member access', isSystem: true },
  { name: 'GUEST', displayName: 'Guest', description: 'Guest access', isSystem: true },
];

async function main() {
  console.log('Starting RBAC seed...');

  // 1. Create or update system roles
  console.log('Upserting system roles...');
  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description, isSystem: role.isSystem },
      create: role,
    });
  }

  // 2. Upsert actions
  console.log(`Upserting ${actions.length} actions...`);
  for (const action of actions) {
    await prisma.action.upsert({
      where: { actionKey: action.actionKey },
      update: {
        httpMethod: action.httpMethod,
        routePath: action.routePath,
        module: action.module,
        description: action.description,
      },
      create: action,
    });
  }

  // 3. Assign all actions to SUPER_ADMIN
  console.log('Assigning all actions to SUPER_ADMIN...');
  const superAdmin = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (superAdmin) {
    const allActions = await prisma.action.findMany();
    for (const action of allActions) {
      await prisma.roleActionMap.upsert({
        where: {
          roleId_actionId: {
            roleId: superAdmin.id,
            actionId: action.id,
          },
        },
        update: {},
        create: {
          roleId: superAdmin.id,
          actionId: action.id,
        },
      });
    }
  }

  // 4. Migrate existing users from UserRole enum to roleId
  console.log('Migrating existing users to use roleId...');
  const allRoles = await prisma.role.findMany();
  const roleMap = {};
  for (const r of allRoles) {
    roleMap[r.name] = r.id;
  }

  const users = await prisma.user.findMany();
  let migratedCount = 0;
  for (const user of users) {
    // Only update if roleId is not set, or doesn't match current role enum
    const expectedRoleId = roleMap[user.role];
    if (expectedRoleId && user.roleId !== expectedRoleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: expectedRoleId },
      });
      migratedCount++;
    }
  }
  console.log(`Migrated ${migratedCount} users.`);

  console.log('RBAC seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
