const express = require('express');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();

// GET /api/billing/orders - Obtener pedidos para facturación
router.get('/orders', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            branchId, 
            businessId,
            status = 'delivered',
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        // Construir filtros
        let filter = {};
        
        if (req.user.role === 'business_admin') {
            filter.businessId = req.user.businessId;
        } else if (businessId) {
            filter.businessId = businessId;
        }

        if (branchId) {
            filter.branchId = branchId;
        }

        // Filtrar por estado de pedido
        if (status === 'all') {
            // Todos los pedidos
        } else if (status === 'pending') {
            filter.status = { $in: ['pending', 'confirmed', 'preparing', 'ready'] };
        } else {
            filter.status = status;
        }

        // Filtrar por fechas
        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Obtener pedidos con información de sucursal
        const orders = await Order.find(filter)
            .populate('branchId', 'name businessId')
            .populate('businessId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Contar total
        const total = await Order.countDocuments(filter);

        // Obtener sucursales disponibles para filtros
        const branches = await Branch.find(
            req.user.role === 'business_admin' ? { businessId: req.user.businessId } : {}
        ).select('branchId name businessId').populate('businessId', 'name');

        const result = {
            success: true,
            data: {
                orders: orders.map(order => ({
                    orderId: order.orderId,
                    businessName: order.businessId?.name,
                    branchName: order.branchId?.name,
                    customer: order.customer,
                    items: order.items,
                    total: order.total,
                    status: order.status,
                    createdAt: order.createdAt,
                    delivery: order.delivery,
                    payment: order.payment,
                    billingInfo: order.billingInfo || null
                })),
                branches,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        };

        logger.info(`Billing orders retrieved: ${orders.length} orders`);
        res.json(result);

    } catch (error) {
        logger.error('Error getting billing orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/billing/branch/:branchId - Obtener información de facturación de una sucursal
router.get('/branch/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { branchId } = req.params;

        const branch = await Branch.findOne({ branchId })
            .populate('businessId', 'name');

        if (!branch) {
            return res.status(404).json({ 
                success: false, 
                message: 'Sucursal no encontrada' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && branch.businessId.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a esta sucursal' 
            });
        }

        const result = {
            success: true,
            data: {
                branchId: branch.branchId,
                name: branch.name,
                businessName: branch.businessId?.name,
                billingInfo: branch.billingInfo || {
                    nit: '',
                    phone: '',
                    email: '',
                    address: '',
                    city: '',
                    department: ''
                }
            }
        };

        res.json(result);

    } catch (error) {
        logger.error('Error getting branch billing info:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/billing/branch/:branchId - Actualizar información de facturación de una sucursal
router.put('/branch/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { branchId } = req.params;
        const { nit, phone, email, address, city, department } = req.body;

        const branch = await Branch.findOne({ branchId });

        if (!branch) {
            return res.status(404).json({ 
                success: false, 
                message: 'Sucursal no encontrada' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && branch.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a esta sucursal' 
            });
        }

        // Actualizar información de facturación
        branch.billingInfo = {
            nit: nit || branch.billingInfo?.nit || '',
            phone: phone || branch.billingInfo?.phone || '',
            email: email || branch.billingInfo?.email || '',
            address: address || branch.billingInfo?.address || '',
            city: city || branch.billingInfo?.city || '',
            department: department || branch.billingInfo?.department || ''
        };

        await branch.save();

        logger.info(`Branch billing info updated: ${branchId}`);
        res.json({ 
            success: true, 
            message: 'Información de facturación actualizada correctamente',
            data: branch.billingInfo
        });

    } catch (error) {
        logger.error('Error updating branch billing info:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/billing/generate-invoice - Generar cuenta de cobro
router.post('/generate-invoice', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { orderId, branchId } = req.body;

        // Obtener el pedido
        const order = await Order.findOne({ orderId })
            .populate('branchId', 'name businessId billingInfo')
            .populate('businessId', 'name');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido no encontrado' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && order.businessId.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a este pedido' 
            });
        }

        // Verificar que la sucursal tenga información de facturación
        const billingInfo = order.branchId.billingInfo;
        if (!billingInfo || !billingInfo.nit) {
            return res.status(400).json({ 
                success: false, 
                message: 'La sucursal no tiene información de facturación completa. Por favor, complete los datos de facturación primero.' 
            });
        }

        // Generar número de cuenta de cobro
        const invoiceNumber = `CC${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;

        // Crear datos de la cuenta de cobro
        const invoiceData = {
            invoiceNumber,
            orderId: order.orderId,
            businessName: order.businessId.name,
            branchName: order.branchId.name,
            customer: order.customer,
            items: order.items,
            subtotal: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
            deliveryFee: order.delivery.fee || 0,
            total: order.total,
            billingInfo,
            createdAt: new Date(),
            status: 'pending'
        };

        // Actualizar el pedido con información de facturación
        order.billingInfo = {
            invoiceNumber,
            generatedAt: new Date(),
            status: 'pending'
        };

        await order.save();

        logger.info(`Invoice generated: ${invoiceNumber} for order: ${orderId}`);
        res.json({ 
            success: true, 
            message: 'Cuenta de cobro generada correctamente',
            data: invoiceData
        });

    } catch (error) {
        logger.error('Error generating invoice:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/billing/send-invoice - Enviar cuenta de cobro por WhatsApp y/o email
router.post('/send-invoice', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { orderId, sendWhatsApp = true, sendEmail = true } = req.body;

        // Obtener el pedido
        const order = await Order.findOne({ orderId })
            .populate('branchId', 'name businessId billingInfo')
            .populate('businessId', 'name');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pedido no encontrado' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && order.businessId.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a este pedido' 
            });
        }

        const billingInfo = order.branchId.billingInfo;
        if (!billingInfo) {
            return res.status(400).json({ 
                success: false, 
                message: 'No hay información de facturación disponible' 
            });
        }

        const results = {
            whatsapp: { sent: false, error: null },
            email: { sent: false, error: null }
        };

        // Enviar por WhatsApp si está habilitado y hay teléfono
        if (sendWhatsApp && billingInfo.phone) {
            try {
                // Aquí se integraría con el servicio de WhatsApp
                // Por ahora simulamos el envío
                logger.info(`WhatsApp invoice sent to: ${billingInfo.phone}`);
                results.whatsapp.sent = true;
            } catch (error) {
                logger.error('Error sending WhatsApp invoice:', error);
                results.whatsapp.error = error.message;
            }
        }

        // Enviar por email si está habilitado y hay email
        if (sendEmail && billingInfo.email) {
            try {
                // Aquí se integraría con el servicio de email
                // Por ahora simulamos el envío
                logger.info(`Email invoice sent to: ${billingInfo.email}`);
                results.email.sent = true;
            } catch (error) {
                logger.error('Error sending email invoice:', error);
                results.email.error = error.message;
            }
        }

        // Actualizar estado del pedido
        if (order.billingInfo) {
            order.billingInfo.status = 'sent';
            order.billingInfo.sentAt = new Date();
            await order.save();
        }

        logger.info(`Invoice sending completed for order: ${orderId}`);
        res.json({ 
            success: true, 
            message: 'Cuenta de cobro enviada correctamente',
            data: results
        });

    } catch (error) {
        logger.error('Error sending invoice:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/billing/invoices - Obtener historial de cuentas de cobro
router.get('/invoices', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            branchId, 
            businessId,
            status,
            page = 1,
            limit = 20
        } = req.query;

        // Construir filtros
        let filter = { 'billingInfo.invoiceNumber': { $exists: true } };
        
        if (req.user.role === 'business_admin') {
            filter.businessId = req.user.businessId;
        } else if (businessId) {
            filter.businessId = businessId;
        }

        if (branchId) {
            filter.branchId = branchId;
        }

        if (status) {
            filter['billingInfo.status'] = status;
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Obtener pedidos con cuentas de cobro
        const orders = await Order.find(filter)
            .populate('branchId', 'name businessId')
            .populate('businessId', 'name')
            .sort({ 'billingInfo.generatedAt': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Contar total
        const total = await Order.countDocuments(filter);

        const result = {
            success: true,
            data: {
                invoices: orders.map(order => ({
                    invoiceNumber: order.billingInfo.invoiceNumber,
                    orderId: order.orderId,
                    businessName: order.businessId?.name,
                    branchName: order.branchId?.name,
                    customer: order.customer,
                    total: order.total,
                    status: order.billingInfo.status,
                    generatedAt: order.billingInfo.generatedAt,
                    sentAt: order.billingInfo.sentAt
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        };

        logger.info(`Billing invoices retrieved: ${orders.length} invoices`);
        res.json(result);

    } catch (error) {
        logger.error('Error getting billing invoices:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

