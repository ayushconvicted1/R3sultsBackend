const prisma = require('../lib/prisma');
const { paginate, paginationMeta } = require('../utils/pagination');

// ─── ROLES CRUD ───

exports.getRoles = async (req, res, next) => {
  try {
    const { includeActions, search } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const include = {};
    if (includeActions === 'true') {
      include.roleActions = {
        include: { action: true },
      };
    }

    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: Object.keys(include).length ? include : undefined,
      }),
      prisma.role.count({ where }),
    ]);

    const formattedRoles = roles.map(role => {
      const formatted = { ...role };
      if (role.roleActions) {
        formatted.actions = role.roleActions.map(ra => ra.action);
        delete formatted.roleActions;
      }
      return formatted;
    });

    res.json({
      success: true,
      data: {
        roles: formattedRoles,
        pagination: paginationMeta(total, page, limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const { name, displayName, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const uppercaseName = name.toUpperCase().replace(/\s+/g, '_');

    const existingRole = await prisma.role.findUnique({ where: { name: uppercaseName } });
    if (existingRole) {
      return res.status(400).json({ success: false, message: 'Role already exists' });
    }

    const role = await prisma.role.create({
      data: {
        name: uppercaseName,
        displayName: displayName || uppercaseName,
        description,
        isSystem: false,
      },
    });

    res.status(201).json({ success: true, message: 'Role created successfully', data: { role } });
  } catch (error) {
    next(error);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Support finding by either ID or Name
    const isId = id.length > 20; // cuids are typically 25 chars
    const where = isId ? { id } : { name: id.toUpperCase() };

    const role = await prisma.role.findUnique({
      where,
      include: {
        roleActions: {
          include: { action: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const formattedRole = { ...role };
    formattedRole.actions = role.roleActions.map(ra => ra.action);
    delete formattedRole.roleActions;

    res.json({ success: true, data: { role: formattedRole } });
  } catch (error) {
    next(error);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { displayName, description, isActive } = req.body;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem && isActive === false) {
      return res.status(400).json({ success: false, message: 'System roles cannot be deactivated' });
    }

    const updatedRole = await prisma.role.update({
      where: { id },
      data: {
        displayName: displayName !== undefined ? displayName : undefined,
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({ success: true, message: 'Role updated successfully', data: { role: updatedRole } });
  } catch (error) {
    next(error);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'System roles cannot be deleted' });
    }

    // Check if any users are assigned to this role
    const usersWithRole = await prisma.user.count({ where: { roleId: id } });
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete role. ${usersWithRole} users are currently assigned to it.` 
      });
    }

    await prisma.role.delete({ where: { id } });

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── ACTIONS CRUD ───

exports.getActions = async (req, res, next) => {
  try {
    const { module, isActive, search } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const where = {};
    if (module) where.module = module;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { actionKey: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [actions, total] = await Promise.all([
      prisma.action.findMany({
        where,
        skip,
        take: limit,
        orderBy: { module: 'asc' },
      }),
      prisma.action.count({ where }),
    ]);

    // Group by module if requested
    if (req.query.groupByModule === 'true') {
      const grouped = {};
      actions.forEach(action => {
        if (!grouped[action.module]) grouped[action.module] = [];
        grouped[action.module].push(action);
      });
      return res.json({
        success: true,
        data: {
          groupedActions: grouped,
          total,
        },
      });
    }

    res.json({
      success: true,
      data: {
        actions,
        pagination: paginationMeta(total, page, limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createAction = async (req, res, next) => {
  try {
    const { actionKey, httpMethod, routePath, module, description } = req.body;

    if (!actionKey || !httpMethod || !routePath || !module) {
      return res.status(400).json({ 
        success: false, 
        message: 'actionKey, httpMethod, routePath, and module are required' 
      });
    }

    const existingAction = await prisma.action.findUnique({ where: { actionKey } });
    if (existingAction) {
      return res.status(400).json({ success: false, message: 'Action key already exists' });
    }

    const action = await prisma.action.create({
      data: {
        actionKey,
        httpMethod: httpMethod.toUpperCase(),
        routePath,
        module,
        description,
      },
    });

    res.status(201).json({ success: true, message: 'Action created successfully', data: { action } });
  } catch (error) {
    next(error);
  }
};

exports.getActionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const isId = id.length > 20;
    const where = isId ? { id } : { actionKey: id };

    const action = await prisma.action.findUnique({
      where,
      include: {
        roleActions: {
          include: { role: true },
        },
      },
    });

    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found' });
    }

    const formattedAction = { ...action };
    formattedAction.roles = action.roleActions.map(ra => ra.role);
    delete formattedAction.roleActions;

    res.json({ success: true, data: { action: formattedAction } });
  } catch (error) {
    next(error);
  }
};

exports.updateAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, isActive } = req.body;

    const action = await prisma.action.findUnique({ where: { id } });
    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found' });
    }

    const updatedAction = await prisma.action.update({
      where: { id },
      data: {
        description: description !== undefined ? description : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({ success: true, message: 'Action updated successfully', data: { action: updatedAction } });
  } catch (error) {
    next(error);
  }
};

exports.deleteAction = async (req, res, next) => {
  try {
    const { id } = req.params;

    const action = await prisma.action.findUnique({ where: { id } });
    if (!action) {
      return res.status(404).json({ success: false, message: 'Action not found' });
    }

    // Soft delete
    const deletedAction = await prisma.action.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Action deactivated successfully', data: { action: deletedAction } });
  } catch (error) {
    next(error);
  }
};

// ─── ROLE-ACTION MAPPING ───

exports.getRoleActions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const roleActions = await prisma.roleActionMap.findMany({
      where: { roleId },
      include: { action: true },
    });

    const actions = roleActions.map(ra => ra.action);

    res.json({ 
      success: true, 
      data: { 
        role,
        actions,
        total: actions.length
      } 
    });
  } catch (error) {
    next(error);
  }
};

exports.assignAction = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { actionId } = req.body;

    if (!actionId) {
      return res.status(400).json({ success: false, message: 'actionId is required' });
    }

    const [role, action] = await Promise.all([
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.action.findUnique({ where: { id: actionId } }),
    ]);

    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (!action) return res.status(404).json({ success: false, message: 'Action not found' });

    const mapping = await prisma.roleActionMap.upsert({
      where: {
        roleId_actionId: { roleId, actionId },
      },
      update: {},
      create: { roleId, actionId },
    });

    res.status(201).json({ success: true, message: 'Action assigned to role', data: { mapping } });
  } catch (error) {
    next(error);
  }
};

exports.revokeAction = async (req, res, next) => {
  try {
    const { roleId, actionId } = req.params;

    const mapping = await prisma.roleActionMap.findUnique({
      where: { roleId_actionId: { roleId, actionId } },
    });

    if (!mapping) {
      return res.status(404).json({ success: false, message: 'Role-Action mapping not found' });
    }

    await prisma.roleActionMap.delete({
      where: { id: mapping.id },
    });

    res.json({ success: true, message: 'Action revoked from role' });
  } catch (error) {
    next(error);
  }
};

exports.bulkAssignActions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { actionIds } = req.body; // Array of action IDs

    if (!Array.isArray(actionIds)) {
      return res.status(400).json({ success: false, message: 'actionIds must be an array' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    // Verify all actions exist
    const actionsCount = await prisma.action.count({
      where: { id: { in: actionIds } }
    });

    if (actionsCount !== actionIds.length) {
      return res.status(400).json({ success: false, message: 'One or more action IDs are invalid' });
    }

    // Replace all mappings using transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing mappings
      await tx.roleActionMap.deleteMany({
        where: { roleId },
      });

      // 2. Insert new mappings
      if (actionIds.length > 0) {
        const data = actionIds.map(actionId => ({ roleId, actionId }));
        await tx.roleActionMap.createMany({ data });
      }
    });

    res.json({ 
      success: true, 
      message: `Successfully assigned ${actionIds.length} actions to role` 
    });
  } catch (error) {
    next(error);
  }
};

exports.bulkAddActions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { actionIds } = req.body; 

    if (!Array.isArray(actionIds)) {
      return res.status(400).json({ success: false, message: 'actionIds must be an array' });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    let addedCount = 0;
    
    for (const actionId of actionIds) {
      try {
        await prisma.roleActionMap.upsert({
          where: { roleId_actionId: { roleId, actionId } },
          update: {},
          create: { roleId, actionId },
        });
        addedCount++;
      } catch (err) {
        // Skip if action doesn't exist
      }
    }

    res.json({ success: true, message: `Successfully added ${addedCount} actions to role` });
  } catch (error) {
    next(error);
  }
};

exports.bulkRevokeActions = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { actionIds } = req.body; 

    if (!Array.isArray(actionIds)) {
      return res.status(400).json({ success: false, message: 'actionIds must be an array' });
    }

    const { count } = await prisma.roleActionMap.deleteMany({
      where: {
        roleId,
        actionId: { in: actionIds },
      },
    });

    res.json({ success: true, message: `Successfully revoked ${count} actions from role` });
  } catch (error) {
    next(error);
  }
};

// ─── UTILITY ───

exports.checkPermission = async (req, res, next) => {
  try {
    const { roleId, actionKey } = req.query;

    if (!roleId || !actionKey) {
      return res.status(400).json({ success: false, message: 'roleId and actionKey are required' });
    }

    const [role, action] = await Promise.all([
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.action.findUnique({ where: { actionKey } }),
    ]);

    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    
    // SUPER_ADMIN god mode
    if (role.name === 'SUPER_ADMIN') {
      return res.json({ success: true, data: { hasAccess: true, reason: 'SUPER_ADMIN bypass' } });
    }

    if (!action || !action.isActive) {
      return res.json({ success: true, data: { hasAccess: false, reason: 'Action not found or inactive' } });
    }

    const mapping = await prisma.roleActionMap.findUnique({
      where: { roleId_actionId: { roleId: role.id, actionId: action.id } },
    });

    res.json({ 
      success: true, 
      data: { 
        hasAccess: !!mapping,
        reason: !!mapping ? 'Permission granted' : 'Permission denied'
      } 
    });
  } catch (error) {
    next(error);
  }
};
