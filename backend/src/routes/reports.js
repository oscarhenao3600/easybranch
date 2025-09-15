const express = require('express');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const User = require('../models/User');
const Service = require('../models/Service');
const WhatsAppConnection = require('../models/WhatsAppConnection');
const BranchAIConfig = require('../models/BranchAIConfig');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();

// GET /api/reports/sales - Reportes de ventas
router.get('/sales', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            period = '30d', 
            businessId, 
            branchId,
            startDate,
            endDate 
        } = req.query;

        // Construir filtros de fecha
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
            dateFilter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
        }

        // Construir filtros de negocio/sucursal
        let businessFilter = {};
        if (req.user.role === 'business_admin') {
            businessFilter.businessId = req.user.businessId;
        } else if (businessId) {
            businessFilter.businessId = businessId;
        }

        if (branchId) {
            businessFilter.branchId = branchId;
        }

        const matchFilter = { ...dateFilter, ...businessFilter };

        // Estadísticas generales de ventas
        const salesStats = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$total' },
                    avgOrderValue: { $avg: '$total' },
                    completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                    cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                    pendingOrders: { $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing', 'ready']] }, 1, 0] } }
                }
            }
        ]);

        // Ventas por día (últimos 30 días)
        const dailySales = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            { $limit: 30 }
        ]);

        // Ventas por sucursal
        const salesByBranch = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$branchId',
                    orders: { $sum: 1 },
                    revenue: { $sum: '$total' },
                    avgOrderValue: { $avg: '$total' }
                }
            },
            {
                $lookup: {
                    from: 'branches',
                    localField: '_id',
                    foreignField: 'branchId',
                    as: 'branch'
                }
            },
            { $unwind: '$branch' },
            {
                $project: {
                    branchId: '$_id',
                    branchName: '$branch.name',
                    orders: 1,
                    revenue: 1,
                    avgOrderValue: 1
                }
            },
            { $sort: { revenue: -1 } }
        ]);

        // Pedidos por estado
        const ordersByStatus = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    revenue: { $sum: '$total' }
                }
            }
        ]);

        const result = {
            success: true,
            data: {
                period,
                stats: salesStats[0] || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    avgOrderValue: 0,
                    completedOrders: 0,
                    cancelledOrders: 0,
                    pendingOrders: 0
                },
                dailySales,
                salesByBranch,
                ordersByStatus
            }
        };

        logger.info(`Sales report generated for period: ${period}`);
        res.json(result);

    } catch (error) {
        logger.error('Error generating sales report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/reports/branches - Reportes por sucursal
router.get('/branches', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            period = '30d', 
            businessId,
            startDate,
            endDate 
        } = req.query;

        // Construir filtros de fecha
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else {
            const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
            dateFilter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
        }

        // Construir filtros de negocio
        let businessFilter = {};
        if (req.user.role === 'business_admin') {
            businessFilter.businessId = req.user.businessId;
        } else if (businessId) {
            businessFilter.businessId = businessId;
        }

        // Obtener sucursales con estadísticas
        const branches = await Branch.find(businessFilter)
            .populate('businessId', 'name')
            .select('branchId name businessId isActive createdAt');

        const branchReports = await Promise.all(branches.map(async (branch) => {
            const branchFilter = { branchId: branch.branchId, ...dateFilter };

            // Estadísticas de pedidos
            const orderStats = await Order.aggregate([
                { $match: branchFilter },
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

            // Estadísticas de servicios
            const serviceStats = await Service.countDocuments({ branchId: branch._id });

            // Conexión WhatsApp
            const whatsappConnection = await WhatsAppConnection.findOne({ branchId: branch._id });

            // Configuración IA
            const aiConfig = await BranchAIConfig.findOne({ branchId: branch._id });

            return {
                branchId: branch.branchId,
                name: branch.name,
                businessName: branch.businessId?.name,
                isActive: branch.isActive,
                createdAt: branch.createdAt,
                orderStats: orderStats[0] || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    avgOrderValue: 0,
                    completedOrders: 0,
                    cancelledOrders: 0
                },
                serviceCount: serviceStats,
                whatsappConnected: whatsappConnection?.status === 'connected',
                aiEnabled: aiConfig?.enabled || false
            };
        }));

        // Ordenar por ingresos
        branchReports.sort((a, b) => b.orderStats.totalRevenue - a.orderStats.totalRevenue);

        const result = {
            success: true,
            data: {
                period,
                branches: branchReports,
                summary: {
                    totalBranches: branchReports.length,
                    activeBranches: branchReports.filter(b => b.isActive).length,
                    totalRevenue: branchReports.reduce((sum, b) => sum + b.orderStats.totalRevenue, 0),
                    totalOrders: branchReports.reduce((sum, b) => sum + b.orderStats.totalOrders, 0),
                    connectedWhatsApp: branchReports.filter(b => b.whatsappConnected).length,
                    aiEnabled: branchReports.filter(b => b.aiEnabled).length
                }
            }
        };

        logger.info(`Branch report generated for period: ${period}`);
        res.json(result);

    } catch (error) {
        logger.error('Error generating branch report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/reports/whatsapp - Reportes de WhatsApp
router.get('/whatsapp', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { businessId } = req.query;

        // Construir filtros de negocio
        let businessFilter = {};
        if (req.user.role === 'business_admin') {
            businessFilter.businessId = req.user.businessId;
        } else if (businessId) {
            businessFilter.businessId = businessId;
        }

        // Obtener conexiones WhatsApp
        const connections = await WhatsAppConnection.find(businessFilter)
            .populate('branchId', 'name businessId')
            .populate('businessId', 'name')
            .sort({ createdAt: -1 });

        // Estadísticas de conexiones
        const connectionStats = await WhatsAppConnection.aggregate([
            { $match: businessFilter },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Conexiones por sucursal
        const connectionsByBranch = connections.map(conn => ({
            connectionId: conn.connectionId,
            phoneNumber: conn.phoneNumber,
            status: conn.status,
            branchName: conn.branchId?.name,
            businessName: conn.businessId?.name,
            createdAt: conn.createdAt,
            lastSeen: conn.lastSeen,
            qrCodeGenerated: !!conn.qrCodeDataURL
        }));

        const result = {
            success: true,
            data: {
                connections: connectionsByBranch,
                stats: {
                    total: connections.length,
                    connected: connections.filter(c => c.status === 'connected').length,
                    disconnected: connections.filter(c => c.status === 'disconnected').length,
                    connecting: connections.filter(c => c.status === 'connecting').length,
                    error: connections.filter(c => c.status === 'error').length
                },
                statusBreakdown: connectionStats
            }
        };

        logger.info('WhatsApp report generated');
        res.json(result);

    } catch (error) {
        logger.error('Error generating WhatsApp report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/reports/ai - Reportes de IA
router.get('/ai', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { businessId } = req.query;

        // Construir filtros de negocio
        let businessFilter = {};
        if (req.user.role === 'business_admin') {
            businessFilter.businessId = req.user.businessId;
        } else if (businessId) {
            businessFilter.businessId = businessId;
        }

        // Obtener configuraciones de IA
        const aiConfigs = await BranchAIConfig.find(businessFilter)
            .populate({
                path: 'branchId',
                select: 'name branchId',
                populate: {
                    path: 'businessId',
                    select: 'name'
                }
            })
            .sort({ createdAt: -1 });

        // Estadísticas de IA
        const aiStats = await BranchAIConfig.aggregate([
            { $match: businessFilter },
            {
                $group: {
                    _id: '$enabled',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Configuraciones por sucursal
        const aiByBranch = aiConfigs.map(config => ({
            configId: config.configId,
            branchName: config.branchId?.name,
            businessName: config.branchId?.businessId?.name,
            enabled: config.enabled,
            provider: config.provider,
            model: config.model,
            hasMenu: !!config.menu?.content,
            hasPrompt: !!config.prompt?.content,
            menuSections: config.menu?.sections?.length || 0,
            menuProducts: config.menu?.products?.length || 0,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt
        }));

        const result = {
            success: true,
            data: {
                configs: aiByBranch,
                stats: {
                    total: aiConfigs.length,
                    enabled: aiConfigs.filter(c => c.enabled).length,
                    disabled: aiConfigs.filter(c => !c.enabled).length,
                    withMenu: aiConfigs.filter(c => c.menu?.content).length,
                    withPrompt: aiConfigs.filter(c => c.prompt?.content).length
                },
                enabledBreakdown: aiStats
            }
        };

        logger.info('AI report generated');
        res.json(result);

    } catch (error) {
        logger.error('Error generating AI report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/reports/export - Exportar reportes
router.get('/export', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            type = 'sales', 
            format = 'json',
            period = '30d',
            businessId,
            branchId,
            startDate,
            endDate 
        } = req.query;

        // Por ahora solo exportamos en formato JSON
        // En el futuro se puede implementar PDF/Excel
        let reportData = {};

        switch (type) {
            case 'sales':
                // Reutilizar lógica del endpoint de ventas
                const salesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/sales?${new URLSearchParams({
                    period, businessId, branchId, startDate, endDate
                })}`, {
                    headers: { 'Authorization': req.headers.authorization }
                });
                reportData = await salesResponse.json();
                break;

            case 'branches':
                const branchesResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/branches?${new URLSearchParams({
                    period, businessId, startDate, endDate
                })}`, {
                    headers: { 'Authorization': req.headers.authorization }
                });
                reportData = await branchesResponse.json();
                break;

            case 'whatsapp':
                const whatsappResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/whatsapp?${new URLSearchParams({
                    businessId
                })}`, {
                    headers: { 'Authorization': req.headers.authorization }
                });
                reportData = await whatsappResponse.json();
                break;

            case 'ai':
                const aiResponse = await fetch(`${req.protocol}://${req.get('host')}/api/reports/ai?${new URLSearchParams({
                    businessId
                })}`, {
                    headers: { 'Authorization': req.headers.authorization }
                });
                reportData = await aiResponse.json();
                break;

            default:
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tipo de reporte no válido' 
                });
        }

        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="reporte_${type}_${new Date().toISOString().split('T')[0]}.json"`);
            res.json(reportData);
        } else {
            res.status(400).json({ 
                success: false, 
                message: 'Formato de exportación no soportado aún' 
            });
        }

        logger.info(`Report exported: ${type} in ${format} format`);

    } catch (error) {
        logger.error('Error exporting report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
