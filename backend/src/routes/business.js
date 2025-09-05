const express = require('express');
const { body, validationResult } = require('express-validator');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const User = require('../models/User');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();

// Validation rules
const businessValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('businessType').isIn(['restaurant', 'coffee', 'pharmacy', 'grocery', 'beauty', 'other']).withMessage('Tipo de negocio inválido'),
    body('contact.email').optional().isEmail().withMessage('Email inválido'),
    body('contact.phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').optional().isObject().withMessage('Dirección debe ser un objeto'),
    body('settings.timezone').optional().isIn(['America/Bogota', 'America/New_York', 'UTC']).withMessage('Zona horaria inválida'),
    body('settings.currency').optional().isIn(['COP', 'USD', 'EUR']).withMessage('Moneda inválida'),
    body('billing.serviceFee').optional().isFloat({ min: 0, max: 50 }).withMessage('Comisión debe estar entre 0 y 50%'),
    body('ai.enabled').optional().isBoolean().withMessage('AI enabled debe ser booleano'),
    body('ai.provider').optional().isIn(['huggingface', 'deepseek', 'openai']).withMessage('Proveedor de IA inválido')
];

const updateBusinessValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('businessType').optional().isIn(['restaurant', 'coffee', 'pharmacy', 'grocery', 'beauty', 'other']).withMessage('Tipo de negocio inválido'),
    body('contact.email').optional().isEmail().withMessage('Email inválido'),
    body('contact.phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').optional().isObject().withMessage('Dirección debe ser un objeto'),
    body('settings.timezone').optional().isIn(['America/Bogota', 'America/New_York', 'UTC']).withMessage('Zona horaria inválida'),
    body('settings.currency').optional().isIn(['COP', 'USD', 'EUR']).withMessage('Moneda inválida'),
    body('billing.serviceFee').optional().isFloat({ min: 0, max: 50 }).withMessage('Comisión debe estar entre 0 y 50%'),
    body('ai.enabled').optional().isBoolean().withMessage('AI enabled debe ser booleano'),
    body('ai.provider').optional().isIn(['huggingface', 'deepseek', 'openai']).withMessage('Proveedor de IA inválido')
];

// GET /api/business - List all businesses (Super Admin only)
router.get('/', authMiddleware.requireRole(['super_admin']), async (req, res) => {
    try {
        const { page = 1, limit = 10, search, status, businessType } = req.query;
        
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { 'contact.email': { $regex: search, $options: 'i' } }
            ];
        }
        if (status) filter.status = status;
        if (businessType) filter.businessType = businessType;

        const businesses = await Business.find(filter)
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await Business.countDocuments(filter);

        res.json({
            success: true,
            data: businesses,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Error listing businesses:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/business/:businessId - Get specific business
router.get('/:businessId', authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
    try {
        const business = await Business.findById(req.params.businessId)
            .select('-__v');

        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        res.json({ success: true, data: business });
    } catch (error) {
        logger.error('Error getting business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/business - Create new business (Super Admin only)
router.post('/', authMiddleware.requireRole(['super_admin']), businessValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const businessData = {
            ...req.body,
            businessId: `BUS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            status: 'active',
            isActive: true
        };

        const business = new Business(businessData);
        await business.save();

        logger.info(`Business created: ${business.businessId} - ${business.name}`);
        res.status(201).json({ success: true, data: business });
    } catch (error) {
        logger.error('Error creating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// PUT /api/business/:businessId - Update business
router.put('/:businessId', authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), updateBusinessValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const business = await Business.findByIdAndUpdate(
            req.params.businessId,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-__v');

        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        logger.info(`Business updated: ${business.businessId} - ${business.name}`);
        res.json({ success: true, data: business });
    } catch (error) {
        logger.error('Error updating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /api/business/:businessId - Delete business (Super Admin only)
router.delete('/:businessId', authMiddleware.requireRole(['super_admin']), async (req, res) => {
    try {
        const business = await Business.findById(req.params.businessId);
        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        // Check if business has active branches
        const activeBranches = await Branch.countDocuments({ 
            businessId: business.businessId, 
            isActive: true 
        });

        if (activeBranches > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `No se puede eliminar el negocio. Tiene ${activeBranches} sucursales activas` 
            });
        }

        // Soft delete
        business.isActive = false;
        business.status = 'inactive';
        business.updatedAt = new Date();
        await business.save();

        logger.info(`Business deleted: ${business.businessId} - ${business.name}`);
        res.json({ success: true, message: 'Negocio eliminado correctamente' });
    } catch (error) {
        logger.error('Error deleting business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/business/:businessId/stats - Get business statistics
router.get('/:businessId/stats', authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
    try {
        const { businessId } = req.params;
        const { period = '30d' } = req.query;

        const dateFilter = {};
        if (period === '7d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
        } else if (period === '30d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
        } else if (period === '90d') {
            dateFilter.createdAt = { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
        }

        // Get branches count
        const branchesCount = await Branch.countDocuments({ businessId, isActive: true });
        const totalBranches = await Branch.countDocuments({ businessId });

        // Get orders statistics
        const ordersStats = await Order.aggregate([
            { $match: { businessId, ...dateFilter } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    avgOrderValue: { $avg: '$total' },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
                }
            }
        ]);

        // Get users count
        const usersCount = await User.countDocuments({ businessId, isActive: true });

        // Get recent activity
        const recentOrders = await Order.find({ businessId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('orderId customer.name total status createdAt');

        const stats = {
            branches: {
                active: branchesCount,
                total: totalBranches
            },
            orders: ordersStats[0] || {
                totalOrders: 0,
                totalRevenue: 0,
                avgOrderValue: 0,
                completedOrders: 0,
                cancelledOrders: 0
            },
            users: usersCount,
            recentOrders
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error getting business stats:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/business/:businessId/branches - Get business branches
router.get('/:businessId/branches', authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        const filter = { businessId: req.params.businessId };
        if (status) filter.status = status;

        const branches = await Branch.find(filter)
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
        logger.error('Error getting business branches:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/business/:businessId/activate - Activate business
router.post('/:businessId/activate', authMiddleware.requireRole(['super_admin']), async (req, res) => {
    try {
        const business = await Business.findByIdAndUpdate(
            req.params.businessId,
            { isActive: true, status: 'active', updatedAt: new Date() },
            { new: true }
        ).select('-__v');

        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        logger.info(`Business activated: ${business.businessId} - ${business.name}`);
        res.json({ success: true, data: business });
    } catch (error) {
        logger.error('Error activating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/business/:businessId/deactivate - Deactivate business
router.post('/:businessId/deactivate', authMiddleware.requireRole(['super_admin']), async (req, res) => {
    try {
        const business = await Business.findByIdAndUpdate(
            req.params.businessId,
            { isActive: false, status: 'inactive', updatedAt: new Date() },
            { new: true }
        ).select('-__v');

        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        logger.info(`Business deactivated: ${business.businessId} - ${business.name}`);
        res.json({ success: true, data: business });
    } catch (error) {
        logger.error('Error deactivating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
