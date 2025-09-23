const express = require('express');
const { body, validationResult } = require('express-validator');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const Service = require('../models/Service');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();

// Validation rules
const branchValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('razonSocial').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Razón social debe tener entre 2 y 100 caracteres'),
    body('nit').trim().isLength({ min: 8, max: 20 }).withMessage('NIT debe tener entre 8 y 20 caracteres'),
    body('phone').matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Dirección debe tener entre 5 y 200 caracteres'),
    body('city').trim().isLength({ min: 2, max: 50 }).withMessage('Ciudad debe tener entre 2 y 50 caracteres'),
    body('department').trim().isLength({ min: 2, max: 50 }).withMessage('Departamento debe tener entre 2 y 50 caracteres'),
    body('country').optional().trim().isLength({ min: 2, max: 50 }).withMessage('País debe tener entre 2 y 50 caracteres'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Descripción no puede exceder 500 caracteres'),
    body('manager').optional().trim().isLength({ max: 100 }).withMessage('Gerente no puede exceder 100 caracteres'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('businessId').isMongoId().withMessage('ID de negocio inválido')
];

const updateBranchValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('razonSocial').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Razón social debe tener entre 2 y 100 caracteres'),
    body('nit').optional().trim().isLength({ min: 8, max: 20 }).withMessage('NIT debe tener entre 8 y 20 caracteres'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Dirección debe tener entre 5 y 200 caracteres'),
    body('city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Ciudad debe tener entre 2 y 50 caracteres'),
    body('department').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Departamento debe tener entre 2 y 50 caracteres'),
    body('country').optional().trim().isLength({ min: 2, max: 50 }).withMessage('País debe tener entre 2 y 50 caracteres'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Descripción no puede exceder 500 caracteres'),
    body('manager').optional().trim().isLength({ max: 100 }).withMessage('Gerente no puede exceder 100 caracteres'),
    body('email').optional().isEmail().withMessage('Email inválido')
];

// GET /api/branch - List branches (with business access control)
router.get('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, businessId } = req.query;
        
        const filter = {};
        
        // Apply business access control
        if (req.user.role === 'business_admin') {
            filter.businessId = req.user.businessId;
        } else if (req.user.role === 'branch_admin') {
            filter.branchId = req.user.branchId;
        } else if (businessId) {
            filter.businessId = businessId;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'address.city': { $regex: search, $options: 'i' } },
                { 'contact.phone': { $regex: search, $options: 'i' } }
            ];
        }
        if (status) filter.status = status;

        const branches = await Branch.find(filter)
            .populate('businessId', 'name businessType')
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Branch.countDocuments(filter);

        res.json({
            success: true,
            data: branches,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error listing branches:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/branch/services - Get all services (for super admin)
router.get('/services', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
    try {
        logger.info('Starting services endpoint');
        const { page = 1, limit = 12, category, available, search } = req.query;

        // Obtener todas las configuraciones de IA con menú
        const BranchAIConfig = require('../models/BranchAIConfig');
        const configs = await BranchAIConfig.find({ isActive: true, menuContent: { $exists: true, $ne: '' } })
            .populate('branchId', 'name businessId')
            .populate('createdBy', 'name email');

        // Extraer productos de cada menú
        const allProducts = [];
        for (const config of configs) {
            if (!config.menuContent) continue;
            const products = parseMenuToProducts(config.menuContent, config.branchId, config.branchId?.businessId);
            allProducts.push(...products);
        }

        // Aplicar filtros
        let filtered = allProducts;
        if (search) {
            const s = search.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
        }
        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }
        if (available === 'true') {
            filtered = filtered.filter(p => p.availability?.isAvailable);
        }

        // Paginación
        const total = filtered.length;
        const start = (page - 1) * limit;
        const end = start + parseInt(limit);
        const data = filtered.slice(start, end);

        res.json({
            success: true,
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error getting all services:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Función auxiliar para parsear menú a productos
function parseMenuToProducts(menuContent, branchId, businessId) {
    const products = [];
    
    // Detectar si es un menú de alitas mix
    const isAlitasMenu = menuContent.toLowerCase().includes('alitas') || 
                         menuContent.toLowerCase().includes('combo') ||
                         menuContent.includes('🍗');
    
    if (isAlitasMenu) {
        return parseAlitasMenu(menuContent, branchId, businessId);
    }
    
    // Parser original para menús de cafetería
    const lines = menuContent.split(/\r?\n/).filter(Boolean);
    let currentCategory = 'General';
    const productPattern = /^[•\-\*]\s*(.+?)\s*-\s*\$?([0-9,]+)/i;
    const categoryPattern = /^[#*]?\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+)[#*]?$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const catMatch = categoryPattern.exec(trimmed);
        if (catMatch) {
            currentCategory = catMatch[1].trim();
            continue;
        }

        const match = productPattern.exec(trimmed);
        if (match) {
            const name = match[1].trim();
            const price = parseInt(match[2].replace(/[,\s]/g, ''));
            products.push({
                serviceId: `SVC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                businessId: businessId ? String(businessId) : '',
                branchId: branchId ? String(branchId) : '',
                name,
                description: null,
                category: currentCategory,
                subcategory: null,
                price,
                currency: 'COP',
                images: [],
                options: [],
                availability: { isAvailable: true, stock: -1, preparationTime: 15 },
                tags: [],
                isActive: true
            });
        }
    }
    return products;
}

function parseAlitasMenu(menuContent, branchId, businessId) {
    const products = [];
    
    // Para el formato comprimido de alitas mix, necesitamos un enfoque diferente
    // Los precios están al final en secuencia: $21.900 $26.900 $30.900 $42.900 $65.900 $62.900 $87.900 $107.900 $123.900
    
    // Extraer todos los precios del menú
    const priceMatches = menuContent.match(/\$([0-9,]+)/g);
    const prices = priceMatches ? priceMatches.map(p => parseInt(p.replace(/[$,]/g, ''))) : [];
    
    console.log('💰 Precios encontrados:', prices);
    
    // Definir los combos con sus precios correspondientes
    const combos = [
        { name: 'Combo 1', category: 'Combos Personales', alitas: 5, priceIndex: 0 },
        { name: 'Combo 2', category: 'Combos Personales', alitas: 7, priceIndex: 1 },
        { name: 'Combo 3', category: 'Combos Personales', alitas: 9, priceIndex: 2 },
        { name: 'Combo 4', category: 'Combos Personales', alitas: 14, priceIndex: 3 },
        { name: 'Combo Familiar 1', category: 'Combos Familiares', alitas: 20, priceIndex: 4 },
        { name: 'Combo Familiar 2', category: 'Combos Familiares', alitas: 30, priceIndex: 5 },
        { name: 'Combo Familiar 3', category: 'Combos Familiares', alitas: 40, priceIndex: 6 },
        { name: 'Combo Familiar 4', category: 'Combos Familiares', alitas: 50, priceIndex: 7 },
        { name: 'Combo Emparejado', category: 'Combo Emparejado', alitas: 16, priceIndex: 8 }
    ];
    
    // Crear productos basados en los precios encontrados
    combos.forEach(combo => {
        if (prices[combo.priceIndex]) {
            products.push({
                serviceId: `SVC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                businessId: businessId ? String(businessId) : '',
                branchId: branchId ? String(branchId) : '',
                name: combo.name,
                description: `${combo.alitas} alitas + acompañante + salsas${combo.category.includes('Familiar') ? ' + gaseosa 1.5L' : ''}${combo.category.includes('Emparejado') ? ' + 2 limonadas' : ''}`,
                category: combo.category,
                subcategory: null,
                price: prices[combo.priceIndex],
                currency: 'COP',
                images: [],
                options: [],
                availability: { isAvailable: true, stock: -1, preparationTime: 20 },
                tags: ['alitas', 'combo'],
                isActive: true,
                alitasCount: combo.alitas
            });
        }
    });
    
    // Buscar acompañantes con precios específicos
    const accompaniments = [
        { name: 'Papas criollas', price: 9000 },
        { name: 'Cascos', price: 9000 },
        { name: 'Yucas', price: 9000 },
        { name: 'Arepitas', price: 9000 },
        { name: 'Papas francesa', price: 9000 }
    ];
    
    accompaniments.forEach(accompaniment => {
        products.push({
            serviceId: `SVC_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            businessId: businessId ? String(businessId) : '',
            branchId: branchId ? String(branchId) : '',
            name: accompaniment.name,
            description: 'Acompañante para alitas',
            category: 'Acompañantes',
            subcategory: null,
            price: accompaniment.price,
            currency: 'COP',
            images: [],
            options: [],
            availability: { isAvailable: true, stock: -1, preparationTime: 10 },
            tags: ['acompañante'],
            isActive: true
        });
    });
    
    return products;
}

// GET /api/branch/:branchId - Get specific branch
router.get('/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.branchId)
            .populate('businessId', 'name businessType settings')
            .select('-__v');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        res.json({ success: true, data: branch });
    } catch (error) {
        logger.error('Error getting branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/branch - Create new branch
router.post('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), branchValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, razonSocial, nit, phone, address, city, department, country, description, manager, email, businessId } = req.body;

        // Validar que al menos uno de name o razonSocial esté presente
        if (!name && !razonSocial) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debe especificar al menos el nombre de la sucursal o la razón social' 
            });
        }

        // Check if business exists and user has access
        const business = await Business.findById(businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        if (req.user.role === 'business_admin' && req.user.businessId !== businessId) {
            return res.status(403).json({ success: false, message: 'No tienes permisos para crear sucursales en este negocio' });
        }

        const branchData = {
            name: name || null,
            razonSocial: razonSocial || null,
            nit,
            phone,
            address,
            city,
            department,
            country: country || 'Colombia',
            description: description || null,
            manager: manager || null,
            businessId,
            branchId: `BR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            status: 'active',
            isActive: true,
            contact: {
                phone,
                email: email || null,
                whatsapp: null
            },
            whatsapp: {
                provider: 'whatsapp-web.js',
                phoneNumber: phone,
                connectionStatus: 'disconnected',
                qrCode: null,
                sessionData: null
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const branch = new Branch(branchData);
        await branch.save();

        logger.info(`Branch created: ${branch.branchId} - ${branch.name || branch.razonSocial} for business ${business.name || business.razonSocial}`);
        res.status(201).json({ success: true, data: branch });
    } catch (error) {
        logger.error('Error creating branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// PUT /api/branch/:branchId - Update branch
router.put('/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), updateBranchValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const branch = await Branch.findByIdAndUpdate(
            req.params.branchId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).populate('businessId', 'name businessType')
         .select('-__v');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        logger.info(`Branch updated: ${branch.branchId} - ${branch.name}`);
        res.json({ success: true, data: branch });
    } catch (error) {
        logger.error('Error updating branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /api/branch/:branchId - Delete branch
router.delete('/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const branch = await Branch.findById(req.params.branchId);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        // Check if branch has active orders
        const activeOrders = await Order.countDocuments({ 
            branchId: branch.branchId, 
            status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } 
        });

        if (activeOrders > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar la sucursal. Tiene ${activeOrders} pedidos activos` 
            });
        }

        // Hard delete - Eliminar realmente de la base de datos
        await Branch.findByIdAndDelete(req.params.branchId);

        // También eliminar servicios asociados a la sucursal
        await Service.deleteMany({ branchId: branch.branchId });

        // También eliminar órdenes asociadas a la sucursal
        await Order.deleteMany({ branchId: branch.branchId });

        logger.info(`Branch permanently deleted: ${branch.branchId} - ${branch.name || branch.razonSocial}`);
        res.json({ success: true, message: 'Sucursal eliminada permanentemente de la base de datos' });
    } catch (error) {
        logger.error('Error deleting branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/branch/:branchId/stats - Get branch statistics
router.get('/:branchId/stats', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        const { period = '30d' } = req.query;

        const dateFilter = {};
        if (period === '7d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        } else if (period === '30d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        } else if (period === '90d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
        }

        // Get services count
        const servicesCount = await Service.countDocuments({ branchId, isActive: true });
        const totalServices = await Service.countDocuments({ branchId });

        // Get orders statistics
        const ordersStats = await Order.aggregate([
            { $match: { branchId, ...dateFilter } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    avgOrderValue: { $avg: '$total' },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    pendingOrders: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                    preparingOrders: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'preparing']] }, 1, 0] } }
                }
            }
        ]);

        // Get today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayOrders = await Order.countDocuments({ 
            branchId, 
            createdAt: { $gte: today } 
        });

        // Get WhatsApp status
        const branch = await Branch.findById(branchId).select('whatsapp.connectionStatus');

        const stats = {
            services: {
                active: servicesCount,
                total: totalServices
            },
            orders: ordersStats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                pendingOrders: 0,
                preparingOrders: 0
            },
            todayOrders,
            whatsapp: {
                status: branch?.whatsapp?.connectionStatus || 'disconnected'
            }
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting branch stats:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


// GET /api/branch/:branchId/services - Get branch services
router.get('/:branchId/services', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { page = 1, limit = 10, category, available, search } = req.query;
        
        const filter = { branchId: req.params.branchId };
        if (category) filter.category = category;
        if (available === 'true') filter['availability.isAvailable'] = true;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }

        const services = await Service.find(filter)
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ category: 1, name: 1 });

        const total = await Service.countDocuments(filter);

        res.json({
            success: true,
            data: services,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error getting branch services:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/branch/:branchId/orders - Get branch orders
router.get('/:branchId/orders', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { page = 1, limit = 10, status, date } = req.query;
        
        const filter = { branchId: req.params.branchId };
        if (status) filter.status = status;
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            filter.createdAt = { $gte: startDate, $lt: endDate };
        }

        const orders = await Order.find(filter)
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Order.countDocuments(filter);

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error getting branch orders:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/branch/:branchId/activate - Activate branch
router.post('/:branchId/activate', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(
            req.params.branchId,
            { isActive: true, status: 'active', updatedAt: new Date() },
            { new: true }
        ).select('-__v');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        logger.info(`Branch activated: ${branch.branchId} - ${branch.name}`);
        res.json({ success: true, data: branch });
    } catch (error) {
        logger.error('Error activating branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/branch/:branchId/deactivate - Deactivate branch
router.post('/:branchId/deactivate', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(
            req.params.branchId,
            { isActive: false, status: 'inactive', updatedAt: new Date() },
            { new: true }
        ).select('-__v');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        logger.info(`Branch deactivated: ${branch.branchId} - ${branch.name}`);
        res.json({ success: true, data: branch });
    } catch (error) {
        logger.error('Error deactivating branch:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/branch/:branchId/upload-catalog - Upload catalog PDF
router.post('/:branchId/upload-catalog', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        // This endpoint will be implemented when we add file upload middleware
        res.json({ success: true, message: 'Endpoint para subir catálogo PDF - Pendiente de implementar' });
    } catch (error) {
        logger.error('Error uploading catalog:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
