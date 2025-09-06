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

        // Soft delete
        branch.isActive = false;
        branch.status = 'inactive';
        branch.updatedAt = new Date();
        await branch.save();

        logger.info(`Branch deleted: ${branch.branchId} - ${branch.name}`);
        res.json({ success: true, message: 'Sucursal eliminada correctamente' });
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
        const { page = 1, limit = 10, category, available } = req.query;
        
        const filter = { branchId: req.params.branchId };
        if (category) filter.category = category;
        if (available === 'true') filter.isAvailable = true;

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
