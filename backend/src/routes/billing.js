const express = require('express');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const Bill = require('../models/Bill');
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
            limit = 20,
            summary = false
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
        } else if (status === 'delivered') {
            // Para facturación, usar 'confirmed' como equivalente a 'delivered'
            filter.status = 'confirmed';
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
            .populate('businessId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Obtener información de sucursales por separado ya que branchId es string
        const branchIds = [...new Set(orders.map(order => order.branchId).filter(Boolean))];
        const branches = await Branch.find({ branchId: { $in: branchIds } });
        const branchMap = {};
        branches.forEach(branch => {
            branchMap[branch.branchId] = branch;
        });

        // Agregar información de sucursal a cada pedido
        orders.forEach(order => {
            if (order.branchId && branchMap[order.branchId]) {
                order.branchInfo = {
                    name: branchMap[order.branchId].name,
                    businessId: branchMap[order.branchId].businessId
                };
            }
        });

        // Contar total
        const total = await Order.countDocuments(filter);

        // Si se solicita resumen por sucursal
        if (summary === 'true') {
            console.log('🔍 Billing Summary Request - Filter:', JSON.stringify(filter, null, 2));
            
            // Log de filtro para debugging
            console.log('🔍 Billing Summary - Filter applied:', JSON.stringify(filter, null, 2));
            
            // Obtener resumen por sucursal - TODOS los pedidos confirmados para calcular comisión
            const branchSummary = await Order.aggregate([
                {
                    $match: {
                        ...filter,
                        status: { $in: ['confirmed', 'completed'] }
                        // Removido filtro de facturación - queremos TODOS los confirmados
                    }
                },
                {
                    $group: {
                        _id: '$branchId',
                        totalOrders: { $sum: 1 },
                        totalValue: { $sum: '$total' },
                        orders: { $push: '$$ROOT' }
                    }
                }
            ]);

            console.log('📊 Branch Summary Results:', JSON.stringify(branchSummary, null, 2));

            // Obtener información de sucursales para el resumen
            const branchIds = branchSummary.map(item => item._id);
            const branches = await Branch.find({ branchId: { $in: branchIds } });
            const branchMap = {};
            branches.forEach(branch => {
                branchMap[branch.branchId] = branch;
            });

            const summaryData = branchSummary.map(item => {
                const branch = branchMap[item._id];
                const commissionPerOrder = branch?.billingInfo?.commissionPerOrder || 500;
                
                return {
                    branchId: item._id,
                    branchName: branch?.name || 'Sucursal no encontrada',
                    businessName: branch?.businessId ? 'Business' : 'N/A', // Se puede mejorar con populate
                    totalOrders: item.totalOrders,
                    totalValue: item.totalValue,
                    totalCommission: item.totalOrders * commissionPerOrder,
                    commissionPerOrder: commissionPerOrder,
                    orders: item.orders.map(order => ({
                        orderId: order.orderId,
                        customerName: order.customer.name,
                        total: order.total,
                        createdAt: order.createdAt,
                        status: order.status
                    }))
                };
            });

            return res.json({
                success: true,
                data: {
                    summary: summaryData,
                    totalBranches: summaryData.length,
                    totalPendingOrders: summaryData.reduce((sum, item) => sum + item.totalOrders, 0),
                    totalCommission: summaryData.reduce((sum, item) => sum + item.totalCommission, 0)
                }
            });
        }

        // Obtener sucursales disponibles para filtros
        const availableBranches = await Branch.find(
            req.user.role === 'business_admin' ? { businessId: req.user.businessId } : {}
        ).select('branchId name businessId').populate('businessId', 'name');

        const result = {
            success: true,
            data: {
                orders: orders.map(order => ({
                    orderId: order.orderId,
                    businessName: order.businessId?.name,
                    branchName: order.branchInfo?.name || 'Sucursal no encontrada',
                    customer: order.customer,
                    items: order.items,
                    total: order.total,
                    status: order.status,
                    createdAt: order.createdAt,
                    delivery: order.delivery,
                    payment: order.payment,
                    billingInfo: order.billingInfo || null
                })),
                branches: availableBranches,
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

        const branch = await Branch.findById(branchId)
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
                    department: '',
                    commissionPerOrder: 500
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
        const { nit, phone, email, address, city, department, commissionPerOrder } = req.body;

        const branch = await Branch.findById(branchId);

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
            department: department || branch.billingInfo?.department || '',
            commissionPerOrder: commissionPerOrder !== undefined ? commissionPerOrder : (branch.billingInfo?.commissionPerOrder || 500)
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

// POST /api/billing/generate-monthly-bill - Generar factura mensual por sucursal
router.post('/generate-monthly-bill', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { branchId, year, month } = req.body;

        if (!branchId || !year || !month) {
            return res.status(400).json({ 
                success: false, 
                message: 'Se requieren branchId, year y month' 
            });
        }

        // Verificar que la sucursal existe
        const branch = await Branch.findById(branchId);
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

        // Verificar si ya existe una factura para ese período
        const existingBill = await Bill.findOne({
            branchId: branchId,
            'period.year': parseInt(year),
            'period.month': parseInt(month)
        });

        if (existingBill) {
            return res.status(400).json({ 
                success: false, 
                message: `Ya existe una factura para ${branch.name} en ${month}/${year}`,
                data: {
                    billId: existingBill.billId,
                    billNumber: existingBill.billNumber
                }
            });
        }

        // Generar la factura mensual
        const bill = await Bill.generateMonthlyBill(branchId, parseInt(year), parseInt(month));

        if (!bill) {
            return res.status(400).json({ 
                success: false, 
                message: 'No hay órdenes para facturar en el período especificado' 
            });
        }

        bill.generatedBy = req.user.userId;
        await bill.save();

        logger.info(`Monthly bill generated: ${bill.billNumber} for branch: ${branchId}`);
        
        res.json({ 
            success: true, 
            message: 'Factura mensual generada correctamente',
            data: {
                billId: bill.billId,
                billNumber: bill.billNumber,
                totalOrders: bill.summary.totalOrders,
                totalServiceFee: bill.summary.totalServiceFee,
                period: bill.period,
                dueDate: bill.payment.dueDate,
                branchInfo: {
                    name: branch.name,
                    phone: branch.billingInfo?.phone || branch.contact?.phone,
                    email: branch.billingInfo?.email || branch.contact?.email
                }
            }
        });

    } catch (error) {
        logger.error('Error generating monthly bill:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/billing/monthly-bills - Obtener facturas mensuales
router.get('/monthly-bills', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { 
            branchId, 
            businessId,
            year,
            month,
            status,
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

        if (year) {
            filter['period.year'] = parseInt(year);
        }

        if (month) {
            filter['period.month'] = parseInt(month);
        }

        if (status) {
            filter.status = status;
        }

        // Paginación
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Obtener facturas con información de sucursal
        const bills = await Bill.find(filter)
            .populate('businessId', 'name')
            .sort({ 'period.year': -1, 'period.month': -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Obtener información de sucursales
        const branchIds = [...new Set(bills.map(bill => bill.branchId).filter(Boolean))];
        const branches = await Branch.find({ branchId: { $in: branchIds } });
        const branchMap = {};
        branches.forEach(branch => {
            branchMap[branch.branchId] = branch;
        });

        // Agregar información de sucursal
        bills.forEach(bill => {
            if (bill.branchId && branchMap[bill.branchId]) {
                bill.branchInfo = {
                    name: branchMap[bill.branchId].name
                };
            }
        });

        // Contar total
        const total = await Bill.countDocuments(filter);

        const result = {
            success: true,
            data: {
                bills: bills.map(bill => ({
                    billId: bill.billId,
                    billNumber: bill.billNumber,
                    businessName: bill.businessId?.name,
                    branchName: bill.branchInfo?.name || 'Sucursal no encontrada',
                    period: bill.period,
                    summary: bill.summary,
                    status: bill.status,
                    dueDate: bill.payment.dueDate,
                    paidDate: bill.payment.paidDate,
                    createdAt: bill.createdAt
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        };

        logger.info(`Monthly bills retrieved: ${bills.length} bills`);
        res.json(result);

    } catch (error) {
        logger.error('Error getting monthly bills:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/billing/monthly-bills/:billId - Obtener detalle de una factura mensual
router.get('/monthly-bills/:billId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findOne({ billId })
            .populate('businessId', 'name');

        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Factura no encontrada' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && bill.businessId.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a esta factura' 
            });
        }

        // Obtener información de la sucursal
        const branch = await Branch.findById(bill.branchId);

        const result = {
            success: true,
            data: {
                billId: bill.billId,
                billNumber: bill.billNumber,
                businessName: bill.businessId?.name,
                branchName: branch?.name || 'Sucursal no encontrada',
                period: bill.period,
                orders: bill.orders,
                summary: bill.summary,
                billingInfo: bill.billingInfo,
                status: bill.status,
                payment: bill.payment,
                generatedBy: bill.generatedBy,
                createdAt: bill.createdAt,
                sentAt: bill.sentAt,
                paidAt: bill.paidAt
            }
        };

        res.json(result);

    } catch (error) {
        logger.error('Error getting bill detail:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/billing/monthly-bills/:billId/status - Actualizar estado de factura
router.put('/monthly-bills/:billId/status', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { billId } = req.params;
        const { status, paymentMethod, paymentReference, notes } = req.body;

        const bill = await Bill.findOne({ billId });

        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Factura no encontrada' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && bill.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a esta factura' 
            });
        }

        bill.status = status;

        if (status === 'paid') {
            bill.markAsPaid(paymentMethod, paymentReference, notes);
        } else if (status === 'sent') {
            bill.sentAt = new Date();
        }

        await bill.save();

        logger.info(`Bill status updated: ${billId} to ${status}`);
        
        res.json({ 
            success: true, 
            message: 'Estado de factura actualizado correctamente',
            data: {
                billId: bill.billId,
                status: bill.status,
                paidAt: bill.paidAt,
                sentAt: bill.sentAt
            }
        });

    } catch (error) {
        logger.error('Error updating bill status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// GET /api/billing/branch-summary/:branchId - Obtener resumen de facturación por sucursal
router.get('/branch-summary/:branchId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { branchId } = req.params;
        const { year } = req.query;

        const branch = await Branch.findById(branchId)
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

        // Construir filtros
        let filter = { branchId };
        if (year) {
            filter['period.year'] = parseInt(year);
        }

        // Obtener facturas de la sucursal
        const bills = await Bill.find(filter).sort({ 'period.year': -1, 'period.month': -1 });

        // Calcular estadísticas
        const stats = {
            totalBills: bills.length,
            totalServiceFee: bills.reduce((sum, bill) => sum + bill.summary.totalServiceFee, 0),
            totalOrders: bills.reduce((sum, bill) => sum + bill.summary.totalOrders, 0),
            totalOrdersValue: bills.reduce((sum, bill) => sum + bill.summary.totalOrdersValue, 0),
            paidBills: bills.filter(bill => bill.status === 'paid').length,
            pendingBills: bills.filter(bill => ['draft', 'sent'].includes(bill.status)).length,
            overdueBills: bills.filter(bill => bill.isOverdue()).length,
            monthlyBreakdown: {}
        };

        // Desglose mensual
        bills.forEach(bill => {
            const monthKey = `${bill.period.year}-${bill.period.month}`;
            if (!stats.monthlyBreakdown[monthKey]) {
                stats.monthlyBreakdown[monthKey] = {
                    year: bill.period.year,
                    month: bill.period.month,
                    bills: 0,
                    serviceFee: 0,
                    orders: 0,
                    status: bill.status
                };
            }
            stats.monthlyBreakdown[monthKey].bills++;
            stats.monthlyBreakdown[monthKey].serviceFee += bill.summary.totalServiceFee;
            stats.monthlyBreakdown[monthKey].orders += bill.summary.totalOrders;
        });

        const result = {
            success: true,
            data: {
                branchId: branch.branchId,
                branchName: branch.name,
                businessName: branch.businessId?.name,
                stats,
                bills: bills.map(bill => ({
                    billId: bill.billId,
                    billNumber: bill.billNumber,
                    period: bill.period,
                    summary: bill.summary,
                    status: bill.status,
                    dueDate: bill.payment.dueDate,
                    paidDate: bill.payment.paidDate,
                    isOverdue: bill.isOverdue()
                }))
            }
        };

        res.json(result);

    } catch (error) {
        logger.error('Error getting branch billing summary:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/billing/generate-pdf/:billId - Generar PDF de factura
router.post('/generate-pdf/:billId', authMiddleware.verifyToken, authMiddleware.requireRole(['super_admin', 'business_admin']), async (req, res) => {
    try {
        const { billId } = req.params;

        const bill = await Bill.findOne({ billId })
            .populate('businessId', 'name')
            .populate('branchId', 'name billingInfo contact');

        if (!bill) {
            return res.status(404).json({ 
                success: false, 
                message: 'Factura no encontrada' 
            });
        }

        // Verificar acceso
        if (req.user.role === 'business_admin' && bill.businessId !== req.user.businessId) {
            return res.status(403).json({ 
                success: false, 
                message: 'No tienes acceso a esta factura' 
            });
        }

        // Generar HTML del PDF (por ahora devolvemos los datos para que el frontend genere el PDF)
        const pdfData = {
            billId: bill.billId,
            billNumber: bill.billNumber,
            businessName: bill.businessId?.name,
            branchName: bill.branchId?.name,
            period: bill.period,
            orders: bill.orders,
            summary: bill.summary,
            billingInfo: bill.billingInfo,
            payment: bill.payment,
            generatedAt: bill.createdAt
        };

        res.json({ 
            success: true, 
            message: 'Datos para PDF generados correctamente',
            data: pdfData
        });

    } catch (error) {
        logger.error('Error generating PDF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al generar PDF',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;

