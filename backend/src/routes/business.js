const express = require('express');
const { body, validationResult } = require('express-validator');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const User = require('../models/user');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();

// Validation rules
const businessValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('razonSocial').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Razón social debe tener entre 2 y 100 caracteres'),
    body('nit').trim().isLength({ min: 8, max: 20 }).withMessage('NIT debe tener entre 8 y 20 caracteres'),
    body('phone').matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').trim().isLength({ min: 5, max: 200 }).withMessage('Dirección debe tener entre 5 y 200 caracteres'),
    body('city').trim().isLength({ min: 2, max: 50 }).withMessage('Ciudad debe tener entre 2 y 50 caracteres'),
    body('department').trim().isLength({ min: 2, max: 50 }).withMessage('Departamento debe tener entre 2 y 50 caracteres'),
    body('country').optional().trim().isLength({ min: 2, max: 50 }).withMessage('País debe tener entre 2 y 50 caracteres'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Descripción no puede exceder 500 caracteres'),
    body('businessType').optional().isIn(['restaurant', 'cafe', 'pharmacy', 'grocery', 'fastfood', 'salon', 'gym', 'other']).withMessage('Tipo de negocio inválido'),
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('website').optional().isURL().withMessage('Sitio web inválido'),
    body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitud inválida'),
    body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitud inválida'),
    body('timezone').optional().isString().withMessage('Zona horaria inválida'),
    body('currency').optional().isString().withMessage('Moneda inválida'),
    body('language').optional().isString().withMessage('Idioma inválido'),
    body('autoReply').optional().isBoolean().withMessage('AutoReply debe ser verdadero o falso'),
    body('delivery').optional().isBoolean().withMessage('Delivery debe ser verdadero o falso')
];

const updateBusinessValidation = [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('razonSocial').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Razón social debe tener entre 2 y 100 caracteres'),
    body('nit').optional().trim().isLength({ min: 8, max: 20 }).withMessage('NIT debe tener entre 8 y 20 caracteres'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Teléfono inválido'),
    body('address').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Dirección debe tener entre 5 y 200 caracteres'),
    body('city').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Ciudad debe tener entre 2 y 50 caracteres'),
    body('department').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Departamento debe tener entre 2 y 50 caracteres'),
    body('country').optional().trim().isLength({ min: 2, max: 50 }).withMessage('País debe tener entre 2 y 50 caracteres'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Descripción no puede exceder 500 caracteres'),
    body('businessType').optional().isIn(['restaurant', 'cafe', 'pharmacy', 'grocery', 'fastfood', 'salon', 'gym', 'other']).withMessage('Tipo de negocio inválido')
];

// GET /api/business - List all businesses (Super Admin and Business Admin)
router.get('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
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
router.get('/:businessId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
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

// GET /api/business/my - Get current user's business
router.get('/my', authMiddleware.verifyToken, authMiddleware.requireRole(['business_admin', 'branch_admin']), async (req, res) => {
    try {
        const user = req.user;
        
        if (!user.businessId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no tiene negocio asignado' 
            });
        }

        const business = await Business.findOne({ businessId: user.businessId })
            .select('-__v');

        if (!business) {
            return res.status(404).json({ 
                success: false, 
                message: 'Negocio no encontrado' 
            });
        }

        res.json({ 
            success: true, 
            data: [business] // Mantener formato de array para compatibilidad
        });
    } catch (error) {
        logger.error('Error getting user business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/business - Create new business (Super Admin only)
router.post('/', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), businessValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { 
            name, razonSocial, nit, phone, address, city, department, country, description, businessType,
            email, website, coordinates, timezone, currency, language, autoReply, delivery
        } = req.body;

        // Validar que al menos uno de name o razonSocial esté presente
        if (!name && !razonSocial) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debe especificar al menos el nombre del negocio o la razón social' 
            });
        }

        // Verificar que el NIT no exista
        const existingBusiness = await Business.findOne({ nit });
        if (existingBusiness) {
            return res.status(400).json({ 
                success: false, 
                message: 'Ya existe un negocio con este NIT' 
            });
        }

        const businessData = {
            name: name || null,
            razonSocial: razonSocial || null,
            nit,
            businessType: businessType || 'other',
            description: description || null,
            contact: {
                phone,
                email: email || null,
                website: website || null
            },
            address,
            city,
            department,
            country: country || 'Colombia',
            coordinates: coordinates || null,
            settings: {
                timezone: timezone || 'America/Bogota',
                currency: currency || 'COP',
                language: language || 'es',
                autoReply: autoReply !== undefined ? autoReply : true,
                delivery: delivery !== undefined ? delivery : true,
                businessHours: {
                    monday: { open: '08:00', close: '22:00', closed: false },
                    tuesday: { open: '08:00', close: '22:00', closed: false },
                    wednesday: { open: '08:00', close: '22:00', closed: false },
                    thursday: { open: '08:00', close: '22:00', closed: false },
                    friday: { open: '08:00', close: '22:00', closed: false },
                    saturday: { open: '08:00', close: '22:00', closed: false },
                    sunday: { open: '08:00', close: '22:00', closed: false }
                }
            },
            billing: {
                serviceFee: 0.05,
                billingActive: true,
                plan: 'free'
            },
            ai: {
                enabled: true,
                provider: 'simulation',
                model: 'microsoft/DialoGPT-medium',
                prompt: null,
                maxTokens: 150,
                temperature: 0.7
            },
            businessId: `BUS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            status: 'active',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const business = new Business(businessData);
        await business.save();

        logger.info(`Business created: ${business.businessId} - ${business.name || business.razonSocial}`);
        res.status(201).json({ success: true, data: business });
    } catch (error) {
        logger.error('Error creating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// PUT /api/business/:businessId - Update business
router.put('/:businessId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), updateBusinessValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { name, razonSocial, nit, phone, address, city, department, country, description, businessType } = req.body;

        // Validar que al menos uno de name o razonSocial esté presente
        if ((name === undefined && razonSocial === undefined) || (!name && !razonSocial)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debe especificar al menos el nombre del negocio o la razón social' 
            });
        }

        // Si se está actualizando el NIT, verificar que no exista en otro negocio
        if (nit) {
            const existingBusiness = await Business.findOne({ 
                nit, 
                _id: { $ne: req.params.businessId } 
            });
            if (existingBusiness) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Ya existe otro negocio con este NIT' 
                });
            }
        }

        const updateData = {
            ...(name !== undefined && { name: name || null }),
            ...(razonSocial !== undefined && { razonSocial: razonSocial || null }),
            ...(nit && { nit }),
            ...(phone && { phone }),
            ...(address && { address }),
            ...(city && { city }),
            ...(department && { department }),
            ...(country && { country }),
            ...(description !== undefined && { description: description || null }),
            ...(businessType && { businessType }),
            updatedAt: new Date()
        };

        const business = await Business.findByIdAndUpdate(
            req.params.businessId,
            updateData,
            { new: true, runValidators: true }
        ).select('-__v');

        if (!business) {
            return res.status(404).json({ success: false, message: 'Negocio no encontrado' });
        }

        logger.info(`Business updated: ${business.businessId} - ${business.name || business.razonSocial}`);
        res.json({ success: true, data: business });
    } catch (error) {
        logger.error('Error updating business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /api/business/:businessId - Delete business (Super Admin and Business Admin)
router.delete('/:businessId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
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
                message: `No se puede eliminar el negocio. Tiene ${activeBranches} sucursales activas. Elimina primero las sucursales.` 
            });
        }

        // Hard delete - Eliminar realmente de la base de datos
        await Business.findByIdAndDelete(req.params.businessId);

        // También eliminar usuarios asociados al negocio
        await User.deleteMany({ businessId: business.businessId });

        // También eliminar órdenes asociadas al negocio
        await Order.deleteMany({ businessId: business.businessId });

        logger.info(`Business permanently deleted: ${business.businessId} - ${business.name}`);
        res.json({ success: true, message: 'Negocio eliminado permanentemente de la base de datos' });
    } catch (error) {
        logger.error('Error deleting business:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/business/:businessId/stats - Get business statistics
router.get('/:businessId/stats', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
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
router.get('/:businessId/branches', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), authMiddleware.requireBusinessAccess(), async (req, res) => {
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
router.post('/:businessId/activate', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
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
router.post('/:businessId/deactivate', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin']), async (req, res) => {
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
