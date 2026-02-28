const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';

// ─── inventory/items ───
exports.get_inventory_items = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // req.query is already available via Express;
        const search = req.query['search'];
        const category = req.query['category'];
        const isActive = req.query['isActive'];
        const query = {};
        if (search) {
            query.$text = { $search: search };
        }
        if (category) {
            query.category = category;
        }
        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        const items = await prisma.adminInventoryItem.findMany({ where: query });
        return res.json({
            success: true,
            data: items,
        });
    }
    catch (error) {
        console.error('Error fetching inventory items:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch items' });
    }

  } catch (error) {
    console.error('get_inventory_items error:', error);
    next(error);
  }
};

exports.post_inventory_items = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const body = req.body;
        const { name, description, category, unit, sku, barcode, image, isActive } = body;
        if (!name || !category || !unit) {
            return res.status(400).json({ success: false, error: 'Name, category, and unit are required' });
        }
        const item = await prisma.adminprisma.adminInventoryItem.create({ data: { data: {
                    name,
                    description,
                    category,
                    unit,
                    sku,
                    barcode,
                    image,
                    isActive: isActive !== undefined ? isActive : true,
                } } });
        return res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error('Error creating inventory item:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'SKU or barcode already exists' });
        }
        return res.status(500).json({ success: false, error: error.message || 'Failed to create item' });
    }

  } catch (error) {
    console.error('post_inventory_items error:', error);
    next(error);
  }
};

// ─── inventory/items/[id] ───
exports.get_inventory_items__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const item = await prisma.adminInventoryItem.findUnique({ where: { id: id } });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        return res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error('Error fetching inventory item:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch item' });
    }

  } catch (error) {
    console.error('get_inventory_items__id error:', error);
    next(error);
  }
};

exports.put_inventory_items__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const { name, description, category, unit, sku, barcode, image, isActive } = body;
        const item = await prisma.adminInventoryItem.update({
            where: { id: id },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(category && { category }),
                ...(unit && { unit }),
                ...(sku !== undefined && { sku }),
                ...(barcode !== undefined && { barcode }),
                ...(image !== undefined && { image }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        return res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error('Error updating inventory item:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'SKU or barcode already exists' });
        }
        return res.status(500).json({ success: false, error: error.message || 'Failed to update item' });
    }

  } catch (error) {
    console.error('put_inventory_items__id error:', error);
    next(error);
  }
};

exports.delete_inventory_items__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const item = await prisma.adminInventoryItem.delete({ where: { id: id } });
        if (!item) {
            return res.status(404).json({ success: false, error: 'Item not found' });
        }
        return res.json({
            success: true,
            message: 'Item deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting inventory item:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete item' });
    }

  } catch (error) {
    console.error('delete_inventory_items__id error:', error);
    next(error);
  }
};

// ─── inventory/locations ───
exports.get_inventory_locations = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // req.query is already available via Express;
        const city = req.query['city'];
        const state = req.query['state'];
        const isActive = req.query['isActive'];
        const query = {};
        if (city) {
            query['address.city'] = new RegExp(city, 'i');
        }
        if (state) {
            query['address.state'] = new RegExp(state, 'i');
        }
        if (isActive !== null && isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        const locations = await prisma.adminStockLocation.findMany({ where: query });
        return res.json({
            success: true,
            data: locations,
        });
    }
    catch (error) {
        console.error('Error fetching stock locations:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch locations' });
    }

  } catch (error) {
    console.error('get_inventory_locations error:', error);
    next(error);
  }
};

exports.post_inventory_locations = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const body = req.body;
        const { name, address, coordinates, contactPerson, capacity, isActive } = body;
        if (!name || !address || !coordinates) {
            return res.status(400).json({ success: false, error: 'Name, address, and coordinates are required' });
        }
        if (!address.street || !address.city || !address.state || !address.zipCode) {
            return res.status(400).json({ success: false, error: 'Complete address is required' });
        }
        if (!Array.isArray(coordinates.coordinates) || coordinates.coordinates.length !== 2) {
            return res.status(400).json({ success: false, error: 'Valid coordinates [longitude, latitude] are required' });
        }
        const location = await prisma.adminprisma.adminStockLocation.create({ data: { data: {
                    name,
                    address: {
                        street: address.street,
                        suite: address.suite,
                        city: address.city,
                        state: address.state,
                        zipCode: address.zipCode,
                        country: address.country || 'United States',
                    },
                    coordinates: {
                        type: 'Point',
                        coordinates: coordinates.coordinates,
                    },
                    contactPerson,
                    capacity,
                    isActive: isActive !== undefined ? isActive : true,
                } } });
        return res.json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        console.error('Error creating stock location:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create location' });
    }

  } catch (error) {
    console.error('post_inventory_locations error:', error);
    next(error);
  }
};

// ─── inventory/locations/[id] ───
exports.get_inventory_locations__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const location = await prisma.adminStockLocation.findUnique({ where: { id: id } });
        if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }
        return res.json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        console.error('Error fetching stock location:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch location' });
    }

  } catch (error) {
    console.error('get_inventory_locations__id error:', error);
    next(error);
  }
};

exports.put_inventory_locations__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const updateData = {};
        if (body.name)
            updateData.name = body.name;
        if (body.address)
            updateData.address = body.address;
        if (body.coordinates)
            updateData.coordinates = body.coordinates;
        if (body.contactPerson !== undefined)
            updateData.contactPerson = body.contactPerson;
        if (body.capacity !== undefined)
            updateData.capacity = body.capacity;
        if (body.isActive !== undefined)
            updateData.isActive = body.isActive;
        const location = await prisma.adminStockLocation.update({ where: { id: id }, data: updateData });
        if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }
        return res.json({
            success: true,
            data: location,
        });
    }
    catch (error) {
        console.error('Error updating stock location:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update location' });
    }

  } catch (error) {
    console.error('put_inventory_locations__id error:', error);
    next(error);
  }
};

exports.delete_inventory_locations__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const location = await prisma.adminStockLocation.delete({ where: { id: id } });
        if (!location) {
            return res.status(404).json({ success: false, error: 'Location not found' });
        }
        return res.json({
            success: true,
            message: 'Location deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting stock location:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete location' });
    }

  } catch (error) {
    console.error('delete_inventory_locations__id error:', error);
    next(error);
  }
};

// ─── inventory/stock ───
exports.get_inventory_stock = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // req.query is already available via Express;
        const sku = req.query['sku'];
        const warehouseId = req.query['warehouseId'];
        const category = req.query['category'];
        const status = req.query['status'];
        const tag = req.query['tag'];
        const query = {};
        if (sku)
            query['item.sku'] = new RegExp(sku, 'i');
        if (warehouseId)
            query['location.warehouseId'] = warehouseId;
        if (category)
            query['item.category'] = new RegExp(category, 'i');
        if (status)
            query.status = status;
        if (tag)
            query.tags = tag;
        const stockEntries = await prisma.adminStockEntry.findMany({ where: query });
        return res.json({
            success: true,
            data: stockEntries,
        });
    }
    catch (error) {
        console.error('Error fetching stock entries:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch stock entries' });
    }

  } catch (error) {
    console.error('get_inventory_stock error:', error);
    next(error);
  }
};

exports.post_inventory_stock = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const body = req.body;
        const { item, location, inventory, batches, tags, } = body;
        if (!item || !location || !inventory) {
            return res.status(400).json({ success: false, error: 'Item, location, and inventory are required' });
        }
        if (!item.name || !item.category || !item.sku) {
            return res.status(400).json({ success: false, error: 'Item name, category, and SKU are required' });
        }
        if (!location.warehouseId || !location.name || !location.address) {
            return res.status(400).json({ success: false, error: 'Warehouse ID, name, and address are required' });
        }
        if (inventory.currentQuantity === undefined || !inventory.unit || inventory.threshold === undefined) {
            return res.status(400).json({ success: false, error: 'Current quantity, unit, and threshold are required' });
        }
        // Check if stock entry already exists for this SKU and warehouse
        const existing = await prisma.adminStockEntry.findFirst({ where: {
                'item.sku': item.sku,
                'location.warehouseId': location.warehouseId,
            } });
        if (existing) {
            return res.status(400).json({ success: false, error: 'Stock entry already exists for this SKU and warehouse' });
        }
        const stockEntry = await prisma.adminprisma.adminStockEntry.create({ data: { data: {
                    item: {
                        name: item.name,
                        category: item.category,
                        sku: item.sku,
                        description: item.description,
                    },
                    location: {
                        warehouseId: location.warehouseId,
                        name: location.name,
                        address: location.address,
                        coordinates: {
                            latitude: location.coordinates?.latitude || 0,
                            longitude: location.coordinates?.longitude || 0,
                        },
                        manager: {
                            name: location.manager?.name || '',
                            contact: location.manager?.contact || '',
                            email: location.manager?.email || '',
                        },
                    },
                    inventory: {
                        currentQuantity: Number(inventory.currentQuantity) || 0,
                        unit: inventory.unit,
                        threshold: Number(inventory.threshold) || 0,
                        reservedQuantity: Number(inventory.reservedQuantity) || 0,
                        availableQuantity: (Number(inventory.currentQuantity) || 0) - (Number(inventory.reservedQuantity) || 0),
                    },
                    batches: batches || [],
                    actions: [],
                    auditLog: [{
                            userId: user.userId,
                            change: `Stock entry created with ${inventory.currentQuantity} ${inventory.unit}`,
                            timestamp: new Date(),
                        }],
                    tags: tags || [],
                    lastUpdated: new Date(),
                } } });
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error creating stock entry:', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, error: 'Stock entry already exists for this SKU and warehouse' });
        }
        return res.status(500).json({ success: false, error: error.message || 'Failed to create stock entry' });
    }

  } catch (error) {
    console.error('post_inventory_stock error:', error);
    next(error);
  }
};

// ─── inventory/stock/[id] ───
exports.get_inventory_stock__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const stockEntry = await prisma.adminStockEntry.findUnique({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error fetching stock entry:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch stock entry' });
    }

  } catch (error) {
    console.error('get_inventory_stock__id error:', error);
    next(error);
  }
};

exports.put_inventory_stock__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const stockEntry = await prisma.adminStockEntry.findUnique({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        const oldQuantity = stockEntry.inventory.currentQuantity;
        const oldReserved = stockEntry.inventory.reservedQuantity;
        // Update fields
        if (body.item) {
            if (body.item.name)
                stockEntry.item.name = body.item.name;
            if (body.item.category)
                stockEntry.item.category = body.item.category;
            if (body.item.sku)
                stockEntry.item.sku = body.item.sku;
            if (body.item.description !== undefined)
                stockEntry.item.description = body.item.description;
        }
        if (body.location) {
            if (body.location.warehouseId)
                stockEntry.location.warehouseId = body.location.warehouseId;
            if (body.location.name)
                stockEntry.location.name = body.location.name;
            if (body.location.address)
                stockEntry.location.address = body.location.address;
            if (body.location.coordinates) {
                if (body.location.coordinates.latitude !== undefined) {
                    stockEntry.location.coordinates.latitude = body.location.coordinates.latitude;
                }
                if (body.location.coordinates.longitude !== undefined) {
                    stockEntry.location.coordinates.longitude = body.location.coordinates.longitude;
                }
            }
            if (body.location.manager) {
                if (body.location.manager.name)
                    stockEntry.location.manager.name = body.location.manager.name;
                if (body.location.manager.contact)
                    stockEntry.location.manager.contact = body.location.manager.contact;
                if (body.location.manager.email)
                    stockEntry.location.manager.email = body.location.manager.email;
            }
        }
        if (body.inventory) {
            if (body.inventory.currentQuantity !== undefined) {
                stockEntry.inventory.currentQuantity = Number(body.inventory.currentQuantity) || 0;
            }
            if (body.inventory.unit)
                stockEntry.inventory.unit = body.inventory.unit;
            if (body.inventory.threshold !== undefined)
                stockEntry.inventory.threshold = Number(body.inventory.threshold) || 0;
            if (body.inventory.reservedQuantity !== undefined) {
                stockEntry.inventory.reservedQuantity = Number(body.inventory.reservedQuantity) || 0;
            }
        }
        // Always update batches if provided (even if empty array to allow clearing)
        if (body.batches !== undefined) {
            stockEntry.batches = Array.isArray(body.batches) ? body.batches : [];
        }
        if (body.tags) {
            stockEntry.tags = body.tags;
        }
        // Add audit log entry
        const changes = [];
        const newQuantity = body.inventory?.currentQuantity !== undefined ? Number(body.inventory.currentQuantity) || 0 : oldQuantity;
        const newReserved = body.inventory?.reservedQuantity !== undefined ? Number(body.inventory.reservedQuantity) || 0 : oldReserved;
        if (body.inventory?.currentQuantity !== undefined && newQuantity !== Number(oldQuantity)) {
            const diff = newQuantity - Number(oldQuantity);
            changes.push(`Quantity ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)} ${stockEntry.inventory.unit}`);
        }
        if (body.inventory?.reservedQuantity !== undefined && newReserved !== Number(oldReserved)) {
            const diff = newReserved - Number(oldReserved);
            changes.push(`Reserved quantity ${diff >= 0 ? 'increased' : 'decreased'} by ${Math.abs(diff)}`);
        }
        if (changes.length > 0) {
            stockEntry.auditLog.push({
                userId: user.userId,
                change: changes.join(', '),
                timestamp: new Date(),
            });
        }
        stockEntry.lastUpdated = new Date();
        const updatedEntry = await prisma.adminStockEntry.update({
            where: { id },
            data: {
                item: stockEntry.item,
                location: stockEntry.location,
                inventory: stockEntry.inventory,
                batches: stockEntry.batches,
                actions: stockEntry.actions,
                auditLog: stockEntry.auditLog,
                tags: stockEntry.tags,
                lastUpdated: stockEntry.lastUpdated
            }
        });
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error updating stock entry:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update stock entry' });
    }

  } catch (error) {
    console.error('put_inventory_stock__id error:', error);
    next(error);
  }
};

exports.delete_inventory_stock__id = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const stockEntry = await prisma.adminStockEntry.delete({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        return res.json({
            success: true,
            message: 'Stock entry deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting stock entry:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete stock entry' });
    }

  } catch (error) {
    console.error('delete_inventory_stock__id error:', error);
    next(error);
  }
};

// ─── inventory/stock/[id]/dispatch ───
exports.post_inventory_stock__id_dispatch = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const { quantity, destination, notes } = body;
        // Ensure quantity is a number
        const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
        if (!quantityNum || isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({ success: false, error: 'Valid quantity is required' });
        }
        const stockEntry = await prisma.adminStockEntry.findUnique({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        // Ensure both values are numbers before comparison and subtraction
        const currentQuantity = Number(stockEntry.inventory.currentQuantity) || 0;
        const reservedQuantity = Number(stockEntry.inventory.reservedQuantity) || 0;
        const availableQuantity = Math.max(0, currentQuantity - reservedQuantity);
        if (availableQuantity < quantityNum) {
            return res.status(400).json({ success: false, error: 'Insufficient available quantity' });
        }
        const oldQuantity = currentQuantity;
        const newQuantity = oldQuantity - quantityNum;
        stockEntry.inventory.currentQuantity = newQuantity;
        // Add action
        stockEntry.actions.push({
            type: 'Dispatch',
            triggeredBy: user.userId,
            timestamp: new Date(),
            status: 'Completed',
            notes: notes || `Dispatched ${quantityNum} ${stockEntry.inventory.unit}${destination ? ` to ${destination}` : ''}`,
        });
        // Add audit log
        stockEntry.auditLog.push({
            userId: user.userId,
            change: `Dispatched ${quantityNum} ${stockEntry.inventory.unit}${destination ? ` to ${destination}` : ''}. Quantity changed from ${oldQuantity} to ${newQuantity}`,
            timestamp: new Date(),
        });
        stockEntry.lastUpdated = new Date();
        await prisma.adminStockEntry.update({
            where: { id },
            data: {
                inventory: stockEntry.inventory,
                actions: stockEntry.actions,
                auditLog: stockEntry.auditLog,
                lastUpdated: stockEntry.lastUpdated
            }
        });
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error dispatching stock:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to dispatch stock' });
    }

  } catch (error) {
    console.error('post_inventory_stock__id_dispatch error:', error);
    next(error);
  }
};

// ─── inventory/stock/[id]/reserve ───
exports.post_inventory_stock__id_reserve = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const { quantity, notes } = body;
        // Ensure quantity is a number
        const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
        if (!quantityNum || isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({ success: false, error: 'Valid quantity is required' });
        }
        const stockEntry = await prisma.adminStockEntry.findUnique({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        // Ensure both values are numbers before comparison and addition
        const currentQuantity = Number(stockEntry.inventory.currentQuantity) || 0;
        const reservedQuantity = Number(stockEntry.inventory.reservedQuantity) || 0;
        const availableQuantity = Math.max(0, currentQuantity - reservedQuantity);
        if (availableQuantity < quantityNum) {
            return res.status(400).json({ success: false, error: 'Insufficient available quantity' });
        }
        const oldReserved = reservedQuantity;
        const newReserved = oldReserved + quantityNum;
        stockEntry.inventory.reservedQuantity = newReserved;
        // Add audit log
        stockEntry.auditLog.push({
            userId: user.userId,
            change: `Reserved ${quantityNum} ${stockEntry.inventory.unit}${notes ? `: ${notes}` : ''}. Reserved quantity changed from ${oldReserved} to ${newReserved}`,
            timestamp: new Date(),
        });
        stockEntry.lastUpdated = new Date();
        await prisma.adminStockEntry.update({
            where: { id },
            data: {
                inventory: stockEntry.inventory,
                auditLog: stockEntry.auditLog,
                lastUpdated: stockEntry.lastUpdated
            }
        });
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error reserving stock:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to reserve stock' });
    }

  } catch (error) {
    console.error('post_inventory_stock__id_reserve error:', error);
    next(error);
  }
};

// ─── inventory/stock/[id]/restock ───
exports.post_inventory_stock__id_restock = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { id } = req.params;
        const body = req.body;
        const { quantity, batchNumber, expiryDate, condition, notes } = body;
        // Ensure quantity is a number
        const quantityNum = typeof quantity === 'string' ? parseFloat(quantity) : Number(quantity);
        if (!quantityNum || isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({ success: false, error: 'Valid quantity is required' });
        }
        const stockEntry = await prisma.adminStockEntry.findUnique({ where: { id: id } });
        if (!stockEntry) {
            return res.status(404).json({ success: false, error: 'Stock entry not found' });
        }
        // Ensure both values are numbers before adding
        const oldQuantity = Number(stockEntry.inventory.currentQuantity) || 0;
        const newQuantity = oldQuantity + quantityNum;
        stockEntry.inventory.currentQuantity = newQuantity;
        // Add batch if provided
        if (batchNumber) {
            stockEntry.batches.push({
                batchNumber,
                quantity: quantityNum, // Ensure it's a number
                expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
                receivedDate: new Date(),
                condition: condition || 'New',
            });
        }
        // Add action
        stockEntry.actions.push({
            type: 'Restock',
            triggeredBy: user.userId,
            timestamp: new Date(),
            status: 'Completed',
            notes: notes || `Restocked ${quantityNum} ${stockEntry.inventory.unit}`,
        });
        // Add audit log
        stockEntry.auditLog.push({
            userId: user.userId,
            change: `Restocked ${quantityNum} ${stockEntry.inventory.unit}. Quantity changed from ${oldQuantity} to ${newQuantity}`,
            timestamp: new Date(),
        });
        stockEntry.lastUpdated = new Date();
        await prisma.adminStockEntry.update({
            where: { id },
            data: {
                inventory: stockEntry.inventory,
                batches: stockEntry.batches,
                actions: stockEntry.actions,
                auditLog: stockEntry.auditLog,
                lastUpdated: stockEntry.lastUpdated
            }
        });
        return res.json({
            success: true,
            data: stockEntry,
        });
    }
    catch (error) {
        console.error('Error restocking:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to restock' });
    }

  } catch (error) {
    console.error('post_inventory_stock__id_restock error:', error);
    next(error);
  }
};

// ─── inventory/seed ───
exports.post_inventory_seed = async (req, res, next) => {
  try {

    try {
        const user = await req.user;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // Get the collection directly to drop old indexes
        if (!mongoose.connection.db) {
            throw new Error('Database connection not established');
        }
        const collection = mongoose.connection.db.collection('stock_entries');
        // Try to drop old indexes that might cause conflicts
        try {
            const indexes = await collection.indexes();
            for (const index of indexes) {
                // Drop any index that contains itemId or locationId (old schema)
                if (index.name && (index.name.includes('itemId') || index.name.includes('locationId'))) {
                    try {
                        await collection.dropIndex(index.name);
                        console.log(`Dropped old index: ${index.name}`);
                    }
                    catch (idxError) {
                        // Index might not exist, continue
                        console.log(`Could not drop index ${index.name}:`, idxError.message);
                    }
                }
            }
        }
        catch (error) {
            console.log('Error checking/dropping indexes:', error.message);
        }
        // Clear all existing data from the collection
        const deleteResult = await prisma.adminStockEntry.deleteMany({ where: {} });
        console.log(`Cleared ${deleteResult.deletedCount} existing stock entries`);
        // Drop the entire collection to remove all old indexes
        try {
            await collection.drop();
            console.log('Dropped stock_entries collection to remove old indexes');
        }
        catch (error) {
            // Collection might not exist, which is fine
            if (error.codeName !== 'NamespaceNotFound') {
                console.log('Note: Could not drop collection (will recreate indexes):', error.message);
            }
        }
        // Generate comprehensive sample data
        const sampleData = [
            {
                item: {
                    name: 'Portable Water Filtration Kit',
                    category: 'Water & Sanitation',
                    sku: 'WASH-FIL-001',
                    description: 'Family-sized gravity filter, 20L capacity',
                },
                location: {
                    warehouseId: 'WH-NORTH-01',
                    name: 'Northern Relief Hub',
                    address: '42 Logistics Park, Sector 18, Gurugram, HR',
                    coordinates: {
                        latitude: 28.4595,
                        longitude: 77.0266,
                    },
                    manager: {
                        name: 'Sarah Chen',
                        contact: '+91-9998887776',
                        email: 's.chen@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 450,
                    unit: 'Units',
                    threshold: 100,
                    reservedQuantity: 50,
                    availableQuantity: 400,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-X',
                        quantity: 450,
                        expiryDate: new Date('2028-12-31'),
                        receivedDate: new Date('2025-10-15'),
                        condition: 'New',
                    },
                ],
                actions: [
                    {
                        type: 'Restock',
                        triggeredBy: 'System (Threshold Breach)',
                        timestamp: new Date('2026-01-02T10:00:00Z'),
                        status: 'Pending',
                    },
                ],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Dispatched 50 units to Flood Zone A',
                        timestamp: new Date('2026-01-02T16:00:00Z'),
                    },
                ],
                tags: ['Urgent', 'Flood-Response', 'WASH'],
                lastUpdated: new Date('2026-01-02T17:30:00Z'),
            },
            {
                item: {
                    name: 'Emergency Food Rations',
                    category: 'Food & Nutrition',
                    sku: 'FOOD-RAT-002',
                    description: 'Ready-to-eat meals, 2000 calories per pack',
                },
                location: {
                    warehouseId: 'WH-SOUTH-01',
                    name: 'Southern Distribution Center',
                    address: '15 Industrial Estate, Phase 2, Chennai, TN',
                    coordinates: {
                        latitude: 13.0827,
                        longitude: 80.2707,
                    },
                    manager: {
                        name: 'Rajesh Kumar',
                        contact: '+91-9876543210',
                        email: 'r.kumar@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 1200,
                    unit: 'Packs',
                    threshold: 300,
                    reservedQuantity: 200,
                    availableQuantity: 1000,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-Y',
                        quantity: 1200,
                        expiryDate: new Date('2027-06-30'),
                        receivedDate: new Date('2025-11-20'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Emergency', 'Food-Security'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Medical First Aid Kit',
                    category: 'Medical Supplies',
                    sku: 'MED-FAK-003',
                    description: 'Comprehensive first aid kit with bandages, antiseptics, and basic medications',
                },
                location: {
                    warehouseId: 'WH-NORTH-01',
                    name: 'Northern Relief Hub',
                    address: '42 Logistics Park, Sector 18, Gurugram, HR',
                    coordinates: {
                        latitude: 28.4595,
                        longitude: 77.0266,
                    },
                    manager: {
                        name: 'Sarah Chen',
                        contact: '+91-9998887776',
                        email: 's.chen@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 85,
                    unit: 'Kits',
                    threshold: 100,
                    reservedQuantity: 10,
                    availableQuantity: 75,
                },
                status: 'Low Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-Z',
                        quantity: 85,
                        expiryDate: new Date('2026-12-31'),
                        receivedDate: new Date('2025-09-10'),
                        condition: 'Good',
                    },
                ],
                actions: [
                    {
                        type: 'Restock',
                        triggeredBy: 'System (Threshold Breach)',
                        timestamp: new Date(),
                        status: 'Pending',
                    },
                ],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Stock level below threshold',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Medical', 'Critical', 'Restock-Required'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Emergency Shelter Tents',
                    category: 'Shelter & Housing',
                    sku: 'SHEL-TEN-004',
                    description: 'Weather-resistant family tents, 4-person capacity',
                },
                location: {
                    warehouseId: 'WH-EAST-01',
                    name: 'Eastern Logistics Hub',
                    address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
                    coordinates: {
                        latitude: 22.5726,
                        longitude: 88.3639,
                    },
                    manager: {
                        name: 'Priya Sharma',
                        contact: '+91-9123456789',
                        email: 'p.sharma@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 250,
                    unit: 'Tents',
                    threshold: 50,
                    reservedQuantity: 0,
                    availableQuantity: 250,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-A',
                        quantity: 250,
                        expiryDate: new Date('2030-01-01'),
                        receivedDate: new Date('2025-12-01'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Shelter', 'Disaster-Response'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Portable Water Filtration Kit',
                    category: 'Water & Sanitation',
                    sku: 'WASH-FIL-001',
                    description: 'Family-sized gravity filter, 20L capacity',
                },
                location: {
                    warehouseId: 'WH-SOUTH-01',
                    name: 'Southern Distribution Center',
                    address: '15 Industrial Estate, Phase 2, Chennai, TN',
                    coordinates: {
                        latitude: 13.0827,
                        longitude: 80.2707,
                    },
                    manager: {
                        name: 'Rajesh Kumar',
                        contact: '+91-9876543210',
                        email: 'r.kumar@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 320,
                    unit: 'Units',
                    threshold: 100,
                    reservedQuantity: 30,
                    availableQuantity: 290,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-B',
                        quantity: 320,
                        expiryDate: new Date('2028-12-31'),
                        receivedDate: new Date('2025-11-15'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['WASH', 'Water-Safety'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Blankets & Warm Clothing',
                    category: 'Clothing & Bedding',
                    sku: 'CLOTH-BLK-005',
                    description: 'Heavy-duty blankets and winter clothing sets',
                },
                location: {
                    warehouseId: 'WH-NORTH-01',
                    name: 'Northern Relief Hub',
                    address: '42 Logistics Park, Sector 18, Gurugram, HR',
                    coordinates: {
                        latitude: 28.4595,
                        longitude: 77.0266,
                    },
                    manager: {
                        name: 'Sarah Chen',
                        contact: '+91-9998887776',
                        email: 's.chen@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 45,
                    unit: 'Sets',
                    threshold: 100,
                    reservedQuantity: 5,
                    availableQuantity: 40,
                },
                status: 'Critical',
                batches: [
                    {
                        batchNumber: 'B-2025-C',
                        quantity: 45,
                        expiryDate: new Date('2027-01-01'),
                        receivedDate: new Date('2025-10-01'),
                        condition: 'Good',
                    },
                ],
                actions: [
                    {
                        type: 'Restock',
                        triggeredBy: 'System (Critical Stock)',
                        timestamp: new Date(),
                        status: 'Pending',
                    },
                ],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Stock level critical - urgent restock required',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Urgent', 'Winter-Supplies', 'Critical'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Emergency Communication Devices',
                    category: 'Communication Equipment',
                    sku: 'COMM-RAD-006',
                    description: 'Satellite phones and two-way radios for emergency communication',
                },
                location: {
                    warehouseId: 'WH-WEST-01',
                    name: 'Western Operations Center',
                    address: '25 Tech Park, Andheri East, Mumbai, MH',
                    coordinates: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                    },
                    manager: {
                        name: 'Amit Patel',
                        contact: '+91-9988776655',
                        email: 'a.patel@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 0,
                    unit: 'Devices',
                    threshold: 20,
                    reservedQuantity: 0,
                    availableQuantity: 0,
                },
                status: 'Depleted',
                batches: [],
                actions: [
                    {
                        type: 'Restock',
                        triggeredBy: 'System (Depleted Stock)',
                        timestamp: new Date(),
                        status: 'Pending',
                    },
                ],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'All stock depleted - urgent restock required',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Communication', 'Depleted', 'Urgent-Restock'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Hygiene Kits',
                    category: 'Water & Sanitation',
                    sku: 'WASH-HYG-007',
                    description: 'Personal hygiene kits with soap, shampoo, toothbrush, and sanitary items',
                },
                location: {
                    warehouseId: 'WH-EAST-01',
                    name: 'Eastern Logistics Hub',
                    address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
                    coordinates: {
                        latitude: 22.5726,
                        longitude: 88.3639,
                    },
                    manager: {
                        name: 'Priya Sharma',
                        contact: '+91-9123456789',
                        email: 'p.sharma@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 800,
                    unit: 'Kits',
                    threshold: 200,
                    reservedQuantity: 100,
                    availableQuantity: 700,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-D',
                        quantity: 800,
                        expiryDate: new Date('2027-12-31'),
                        receivedDate: new Date('2025-11-01'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['WASH', 'Hygiene'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Portable Generators',
                    category: 'Power & Energy',
                    sku: 'PWR-GEN-008',
                    description: '5kW portable diesel generators for emergency power supply',
                },
                location: {
                    warehouseId: 'WH-WEST-01',
                    name: 'Western Operations Center',
                    address: '25 Tech Park, Andheri East, Mumbai, MH',
                    coordinates: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                    },
                    manager: {
                        name: 'Amit Patel',
                        contact: '+91-9988776655',
                        email: 'a.patel@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 35,
                    unit: 'Units',
                    threshold: 15,
                    reservedQuantity: 5,
                    availableQuantity: 30,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-E',
                        quantity: 35,
                        expiryDate: new Date('2030-01-01'),
                        receivedDate: new Date('2025-10-20'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Power', 'Emergency', 'Critical-Infrastructure'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Medical Oxygen Cylinders',
                    category: 'Medical Supplies',
                    sku: 'MED-OXY-009',
                    description: 'Portable medical oxygen cylinders, 10L capacity',
                },
                location: {
                    warehouseId: 'WH-NORTH-01',
                    name: 'Northern Relief Hub',
                    address: '42 Logistics Park, Sector 18, Gurugram, HR',
                    coordinates: {
                        latitude: 28.4595,
                        longitude: 77.0266,
                    },
                    manager: {
                        name: 'Sarah Chen',
                        contact: '+91-9998887776',
                        email: 's.chen@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 120,
                    unit: 'Cylinders',
                    threshold: 50,
                    reservedQuantity: 20,
                    availableQuantity: 100,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-F',
                        quantity: 120,
                        expiryDate: new Date('2026-06-30'),
                        receivedDate: new Date('2025-12-10'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Medical', 'Critical', 'Life-Support'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Emergency Food Rations',
                    category: 'Food & Nutrition',
                    sku: 'FOOD-RAT-002',
                    description: 'Ready-to-eat meals, 2000 calories per pack',
                },
                location: {
                    warehouseId: 'WH-EAST-01',
                    name: 'Eastern Logistics Hub',
                    address: '88 Warehouse Complex, Salt Lake, Kolkata, WB',
                    coordinates: {
                        latitude: 22.5726,
                        longitude: 88.3639,
                    },
                    manager: {
                        name: 'Priya Sharma',
                        contact: '+91-9123456789',
                        email: 'p.sharma@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 950,
                    unit: 'Packs',
                    threshold: 300,
                    reservedQuantity: 150,
                    availableQuantity: 800,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-G',
                        quantity: 950,
                        expiryDate: new Date('2027-08-31'),
                        receivedDate: new Date('2025-11-25'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Emergency', 'Food-Security'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Rescue Boats',
                    category: 'Rescue Equipment',
                    sku: 'RESC-BOT-010',
                    description: 'Inflatable rescue boats, 8-person capacity',
                },
                location: {
                    warehouseId: 'WH-SOUTH-01',
                    name: 'Southern Distribution Center',
                    address: '15 Industrial Estate, Phase 2, Chennai, TN',
                    coordinates: {
                        latitude: 13.0827,
                        longitude: 80.2707,
                    },
                    manager: {
                        name: 'Rajesh Kumar',
                        contact: '+91-9876543210',
                        email: 'r.kumar@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 18,
                    unit: 'Boats',
                    threshold: 10,
                    reservedQuantity: 3,
                    availableQuantity: 15,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-H',
                        quantity: 18,
                        expiryDate: new Date('2028-01-01'),
                        receivedDate: new Date('2025-09-15'),
                        condition: 'Good',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['Rescue', 'Flood-Response', 'Water-Rescue'],
                lastUpdated: new Date(),
            },
            {
                item: {
                    name: 'Portable Water Filtration Kit',
                    category: 'Water & Sanitation',
                    sku: 'WASH-FIL-001',
                    description: 'Family-sized gravity filter, 20L capacity',
                },
                location: {
                    warehouseId: 'WH-WEST-01',
                    name: 'Western Operations Center',
                    address: '25 Tech Park, Andheri East, Mumbai, MH',
                    coordinates: {
                        latitude: 19.0760,
                        longitude: 72.8777,
                    },
                    manager: {
                        name: 'Amit Patel',
                        contact: '+91-9988776655',
                        email: 'a.patel@relief.org',
                    },
                },
                inventory: {
                    currentQuantity: 280,
                    unit: 'Units',
                    threshold: 100,
                    reservedQuantity: 25,
                    availableQuantity: 255,
                },
                status: 'In-Stock',
                batches: [
                    {
                        batchNumber: 'B-2025-I',
                        quantity: 280,
                        expiryDate: new Date('2028-12-31'),
                        receivedDate: new Date('2025-12-05'),
                        condition: 'New',
                    },
                ],
                actions: [],
                auditLog: [
                    {
                        userId: user.userId,
                        change: 'Initial stock entry created',
                        timestamp: new Date(),
                    },
                ],
                tags: ['WASH', 'Water-Safety'],
                lastUpdated: new Date(),
            },
        ];
        // Insert data one by one to handle any errors gracefully
        const createdEntries = [];
        for (const entry of sampleData) {
            try {
                const created = await prisma.adminStockEntry.create({ data: entry });
                createdEntries.push(created);
            }
            catch (error) {
                console.error(`Error creating entry for SKU ${entry.item.sku}:`, error.message);
                // Continue with other entries even if one fails
            }
        }
        return res.json({
            success: true,
            message: `Successfully seeded ${createdEntries.length} stock entries`,
            data: createdEntries,
            totalAttempted: sampleData.length,
        });
    }
    catch (error) {
        console.error('Error seeding stock data:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to seed stock data' });
    }

  } catch (error) {
    console.error('post_inventory_seed error:', error);
    next(error);
  }
};
