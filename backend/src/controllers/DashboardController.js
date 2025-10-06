const Business = require('../models/Business');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const User = require('../models/User');
const WhatsAppConnection = require('../models/WhatsAppConnection');
const BranchAIConfig = require('../models/BranchAIConfig');
const LoggerService = require('../services/LoggerService');

class DashboardController {
  constructor() {
    this.logger = new LoggerService();
  }

  // Obtener estadísticas generales del dashboard
  async getDashboardStats(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Calcular estadísticas según el rol del usuario
      let stats = {};

      if (userRole === 'super_admin') {
        // Super admin ve estadísticas globales
        stats = await this.getSuperAdminStats();
      } else if (userRole === 'business_admin') {
        // Business admin ve estadísticas de su negocio
        stats = await this.getBusinessAdminStats(req.user.businessId);
      } else if (userRole === 'branch_admin' || userRole === 'staff') {
        // Branch admin/staff ve estadísticas de su sucursal
        stats = await this.getBranchStats(req.user.branchId);
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Estadísticas para Super Admin (globales)
  async getSuperAdminStats() {
    try {
      const [
        totalBusinesses,
        totalBranches,
        totalOrders,
        totalUsers,
        connectedWhatsApp,
        aiConfigs,
        recentOrders,
        totalRevenue
      ] = await Promise.all([
        Business.countDocuments({ isActive: true }),
        Branch.countDocuments({ isActive: true }),
        Order.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: true }),
        WhatsAppConnection.countDocuments({ status: 'connected' }),
        BranchAIConfig.countDocuments(),
        Order.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('businessId', 'name'),
        Order.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      // Calcular estadísticas adicionales
      const ordersByStatus = await this.getOrdersByStatus();
      const recentActivity = await this.getRecentActivity();
      const systemHealth = await this.calculateSystemHealth();
      const systemProgress = await this.calculateSystemProgress();

      return {
        totalBusinesses: totalBusinesses || 0,
        totalBranches: totalBranches || 0,
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        connectedWhatsApp: connectedWhatsApp || 0,
        aiConfigs: aiConfigs || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus,
        recentOrders: recentOrders || [],
        recentActivity,
        systemHealth,
        systemProgress
      };

    } catch (error) {
      this.logger.error('Error calculando estadísticas de super admin:', error);
      return this.getDefaultStats();
    }
  }

  // Estadísticas para Business Admin
  async getBusinessAdminStats(businessId) {
    try {
      const [
        totalBranches,
        totalOrders,
        totalUsers,
        connectedWhatsApp,
        recentOrders,
        totalRevenue
      ] = await Promise.all([
        Branch.countDocuments({ businessId, isActive: true }),
        Order.countDocuments({ businessId, isActive: true }),
        User.countDocuments({ businessId, isActive: true }),
        WhatsAppConnection.countDocuments({ 
          businessId, 
          status: 'connected' 
        }),
        Order.find({ businessId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(5),
        Order.aggregate([
          { $match: { businessId, isActive: true } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      const ordersByStatus = await this.getOrdersByStatus(businessId);
      const recentActivity = await this.getRecentActivity(businessId);
      const systemProgress = await this.calculateSystemProgress();

      return {
        totalBusinesses: 1, // Solo su negocio
        totalBranches: totalBranches || 0,
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        connectedWhatsApp: connectedWhatsApp || 0,
        aiConfigs: 0, // No relevante para business admin
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus,
        recentOrders: recentOrders || [],
        recentActivity,
        systemHealth: 100, // Asumimos salud completa para business admin
        systemProgress
      };

    } catch (error) {
      this.logger.error('Error calculando estadísticas de business admin:', error);
      return this.getDefaultStats();
    }
  }

  // Estadísticas para Branch Admin/Staff
  async getBranchStats(branchId) {
    try {
      const [
        totalOrders,
        totalUsers,
        connectedWhatsApp,
        recentOrders,
        totalRevenue
      ] = await Promise.all([
        Order.countDocuments({ branchId, isActive: true }),
        User.countDocuments({ branchId, isActive: true }),
        WhatsAppConnection.countDocuments({ 
          branchId, 
          status: 'connected' 
        }),
        Order.find({ branchId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name phone'),
        Order.aggregate([
          { $match: { branchId, isActive: true } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      const ordersByStatus = await this.getOrdersByStatus(null, branchId);
      const recentActivity = await this.getRecentActivity(null, branchId);
      const systemProgress = await this.calculateSystemProgress();

      return {
        totalBusinesses: 1, // Solo su negocio
        totalBranches: 1, // Solo su sucursal
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        connectedWhatsApp: connectedWhatsApp || 0,
        aiConfigs: 0, // No relevante para branch admin
        totalRevenue: totalRevenue[0]?.total || 0,
        ordersByStatus,
        recentOrders: recentOrders || [],
        recentActivity,
        systemHealth: 100, // Asumimos salud completa para branch admin
        systemProgress
      };

    } catch (error) {
      this.logger.error('Error calculando estadísticas de branch:', error);
      return this.getDefaultStats();
    }
  }

  // Obtener pedidos por estado
  async getOrdersByStatus(businessId = null, branchId = null) {
    try {
      const matchFilter = { isActive: true };
      if (businessId) matchFilter.businessId = businessId;
      if (branchId) matchFilter.branchId = branchId;

      const [
        pending,
        confirmed,
        preparing,
        ready,
        delivered,
        cancelled
      ] = await Promise.all([
        Order.countDocuments({ ...matchFilter, status: 'pending' }),
        Order.countDocuments({ ...matchFilter, status: 'confirmed' }),
        Order.countDocuments({ ...matchFilter, status: 'preparing' }),
        Order.countDocuments({ ...matchFilter, status: 'ready' }),
        Order.countDocuments({ ...matchFilter, status: 'delivered' }),
        Order.countDocuments({ ...matchFilter, status: 'cancelled' })
      ]);

      return {
        pending: pending || 0,
        confirmed: confirmed || 0,
        preparing: preparing || 0,
        ready: ready || 0,
        delivered: delivered || 0,
        cancelled: cancelled || 0
      };

    } catch (error) {
      this.logger.error('Error obteniendo pedidos por estado:', error);
      return {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      };
    }
  }

  // Obtener actividad reciente
  async getRecentActivity(businessId = null, branchId = null) {
    try {
      const activities = [];

      // Actividad de pedidos
      const recentOrders = await Order.find({
        isActive: true,
        ...(businessId && { businessId }),
        ...(branchId && { branchId })
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .populate('businessId', 'name');

      recentOrders.forEach(order => {
        activities.push({
          type: 'order',
          message: `Nuevo pedido en sucursal ${order.branchId}`,
          time: this.getTimeAgo(order.createdAt),
          timestamp: order.createdAt
        });
      });

      // Actividad de WhatsApp
      const recentWhatsApp = await WhatsAppConnection.find({
        ...(businessId && { businessId }),
        ...(branchId && { branchId })
      })
        .sort({ updatedAt: -1 })
        .limit(2);

      recentWhatsApp.forEach(connection => {
        if (connection.status === 'connected') {
          activities.push({
            type: 'whatsapp',
            message: `WhatsApp conectado en sucursal ${connection.branchId}`,
            time: this.getTimeAgo(connection.updatedAt),
            timestamp: connection.updatedAt
          });
        }
      });

      // Ordenar por timestamp y tomar los 5 más recientes
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    } catch (error) {
      this.logger.error('Error obteniendo actividad reciente:', error);
      return [];
    }
  }

  // Calcular salud del sistema
  async calculateSystemHealth() {
    try {
      const [
        totalConnections,
        activeConnections,
        totalOrders,
        recentOrders
      ] = await Promise.all([
        WhatsAppConnection.countDocuments(),
        WhatsAppConnection.countDocuments({ status: 'connected' }),
        Order.countDocuments({ isActive: true }),
        Order.countDocuments({ 
          isActive: true, 
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
        })
      ]);

      let healthScore = 100;

      // Penalizar si no hay conexiones activas
      if (totalConnections > 0 && activeConnections === 0) {
        healthScore -= 30;
      }

      // Penalizar si hay muchas conexiones pero pocas activas
      if (totalConnections > 0) {
        const activeRatio = activeConnections / totalConnections;
        if (activeRatio < 0.5) {
          healthScore -= 20;
        }
      }

      // Bonificar si hay actividad reciente
      if (recentOrders > 0) {
        healthScore += 10;
      }

      return Math.max(0, Math.min(100, healthScore));

    } catch (error) {
      this.logger.error('Error calculando salud del sistema:', error);
      return 100; // Asumir salud completa en caso de error
    }
  }

  // Calcular progreso de funcionalidades del sistema
  async calculateSystemProgress() {
    try {
      const progress = {
        business: await this.calculateBusinessProgress(),
        users: await this.calculateUsersProgress(),
        orders: await this.calculateOrdersProgress(),
        whatsapp: await this.calculateWhatsAppProgress(),
        ai: await this.calculateAIProgress(),
        services: await this.calculateServicesProgress(),
        reports: await this.calculateReportsProgress(),
        billing: await this.calculateBillingProgress()
      };

      // Calcular promedio general
      const totalProgress = Object.values(progress).reduce((sum, value) => sum + value, 0);
      const averageProgress = Math.round(totalProgress / Object.keys(progress).length);

      return {
        ...progress,
        overall: averageProgress
      };

    } catch (error) {
      this.logger.error('Error calculando progreso del sistema:', error);
      return {
        business: 100,
        users: 0,
        orders: 75,
        whatsapp: 100,
        ai: 100,
        services: 100,
        reports: 100,
        billing: 100,
        overall: 65
      };
    }
  }

  // Progreso de Mi Negocio (100% - CRUD completo)
  async calculateBusinessProgress() {
    try {
      // Verificar si existen negocios creados
      const businessCount = await Business.countDocuments({ isActive: true });
      
      // Mi Negocio está completo: Create, Read, Update, Delete
      return businessCount > 0 ? 100 : 90;
    } catch (error) {
      return 100; // Asumir completo en caso de error
    }
  }

  // Progreso de Usuarios (25% - Solo registro básico)
  async calculateUsersProgress() {
    try {
      // Solo tenemos registro básico, falta gestión completa de usuarios
      // Funcionalidades faltantes: listar, editar, eliminar, gestionar permisos
      return 25;
    } catch (error) {
      return 25;
    }
  }

  // Progreso de Pedidos (75% - Falta eliminar)
  async calculateOrdersProgress() {
    try {
      // Tenemos: crear, leer, actualizar estado, cancelar
      // Falta: eliminar pedidos permanentemente
      return 75;
    } catch (error) {
      return 75;
    }
  }

  // Progreso de WhatsApp (100% - Completo)
  async calculateWhatsAppProgress() {
    try {
      // WhatsApp está completamente implementado
      return 100;
    } catch (error) {
      return 100;
    }
  }

  // Progreso de IA & PDFs (100% - Completo)
  async calculateAIProgress() {
    try {
      // IA está completamente implementado
      return 100;
    } catch (error) {
      return 100;
    }
  }

  // Progreso de Productos/Servicios (100% - Completo)
  async calculateServicesProgress() {
    try {
      // Servicios están completamente implementados:
      // - Modelo de datos completo
      // - API endpoints para CRUD
      // - Frontend con interfaz completa
      // - Filtros y búsqueda
      // - Integración con PDFs
      return 100;
    } catch (error) {
      return 100;
    }
  }

  // Progreso de Reportes (100% - Completo)
  async calculateReportsProgress() {
    try {
      // Reportes completos implementados:
      // ✅ Reportes de ventas (ingresos, pedidos, tendencias)
      // ✅ Reportes por sucursal (comparativas, rendimiento)
      // ✅ Reportes de WhatsApp (conexiones, actividad)
      // ✅ Reportes de IA (uso, efectividad)
      // ✅ Exportación de reportes (JSON)
      // ✅ Filtros avanzados (fechas, sucursales, tipos)
      return 100;
    } catch (error) {
      return 100;
    }
  }

  // Progreso de Facturación (100% - Completo)
  async calculateBillingProgress() {
    try {
      // Facturación completa implementada:
      // ✅ Gestión de pedidos para facturación
      // ✅ Configuración de datos de facturación por sucursal
      // ✅ Generación de cuentas de cobro
      // ✅ Envío por WhatsApp y email
      // ✅ Historial de facturación
      return 100;
    } catch (error) {
      return 100;
    }
  }

  // Estadísticas por defecto
  getDefaultStats() {
    return {
      totalBusinesses: 0,
      totalBranches: 0,
      totalOrders: 0,
      totalUsers: 0,
      connectedWhatsApp: 0,
      aiConfigs: 0,
      totalRevenue: 0,
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        ready: 0,
        delivered: 0,
        cancelled: 0
      },
      recentOrders: [],
      recentActivity: [],
      systemHealth: 100,
      systemProgress: {
        business: 100,
        users: 25,
        orders: 75,
        whatsapp: 100,
        ai: 100,
        services: 100,
        reports: 100,
        billing: 100,
        overall: 65
      }
    };
  }

  // Obtener alertas del sistema
  async getDashboardAlerts(req, res) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;

      let alerts = [];

      // Alertas según el rol del usuario
      if (userRole === 'super_admin') {
        alerts = await this.getSuperAdminAlerts();
      } else if (userRole === 'business_admin') {
        alerts = await this.getBusinessAdminAlerts(req.user.businessId);
      } else if (userRole === 'branch_admin' || userRole === 'staff') {
        alerts = await this.getBranchAlerts(req.user.branchId);
      }

      res.json({
        success: true,
        data: alerts
      });

    } catch (error) {
      this.logger.error('Error obteniendo alertas del dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Alertas para Super Admin (globales)
  async getSuperAdminAlerts() {
    try {
      const alerts = [];

      // 1. Clientes activos en sesión
      const activeSessions = await this.getActiveSessions();
      if (activeSessions.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'users',
          title: `${activeSessions.count} cliente${activeSessions.count > 1 ? 's' : ''} activo${activeSessions.count > 1 ? 's' : ''}`,
          message: `Clientes en proceso de pedido`,
          details: activeSessions.details,
          time: 'En tiempo real'
        });
      }

      // 2. Pedidos pendientes por mucho tiempo
      const staleOrders = await this.getStaleOrders();
      if (staleOrders.count > 0) {
        alerts.push({
          type: 'warning',
          icon: 'clock',
          title: `${staleOrders.count} pedido${staleOrders.count > 1 ? 's' : ''} pendiente${staleOrders.count > 1 ? 's' : ''}`,
          message: `Pedidos sin actualización por más de 30 minutos`,
          details: staleOrders.details,
          time: 'Última actualización'
        });
      }

      // 3. Pedidos cancelados por inactividad
      const cancelledOrders = await this.getCancelledOrders();
      if (cancelledOrders.count > 0) {
        alerts.push({
          type: 'danger',
          icon: 'times-circle',
          title: `${cancelledOrders.count} pedido${cancelledOrders.count > 1 ? 's' : ''} cancelado${cancelledOrders.count > 1 ? 's' : ''}`,
          message: `Cancelados por inactividad del cliente`,
          details: cancelledOrders.details,
          time: 'Últimas 24 horas'
        });
      }

      // 4. Pedidos cancelados por el cliente
      const clientCancelledOrders = await this.getClientCancelledOrders();
      if (clientCancelledOrders.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'user-times',
          title: `${clientCancelledOrders.count} pedido${clientCancelledOrders.count > 1 ? 's' : ''} cancelado${clientCancelledOrders.count > 1 ? 's' : ''}`,
          message: `Cancelados por decisión del cliente`,
          details: clientCancelledOrders.details,
          time: 'Últimas 24 horas'
        });
      }

      // 5. Conexiones WhatsApp desconectadas
      const disconnectedWhatsApp = await this.getDisconnectedWhatsApp();
      if (disconnectedWhatsApp.count > 0) {
        alerts.push({
          type: 'warning',
          icon: 'whatsapp',
          title: `${disconnectedWhatsApp.count} WhatsApp desconectado${disconnectedWhatsApp.count > 1 ? 's' : ''}`,
          message: `Conexiones que requieren reconexión`,
          details: disconnectedWhatsApp.details,
          time: 'Estado actual'
        });
      }

      return alerts;

    } catch (error) {
      this.logger.error('Error obteniendo alertas de super admin:', error);
      return [];
    }
  }

  // Alertas para Business Admin
  async getBusinessAdminAlerts(businessId) {
    try {
      const alerts = [];

      // Clientes activos en su negocio
      const activeSessions = await this.getActiveSessions(businessId);
      if (activeSessions.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'users',
          title: `${activeSessions.count} cliente${activeSessions.count > 1 ? 's' : ''} activo${activeSessions.count > 1 ? 's' : ''}`,
          message: `En proceso de pedido en tu negocio`,
          details: activeSessions.details,
          time: 'En tiempo real'
        });
      }

      // Pedidos pendientes
      const staleOrders = await this.getStaleOrders(businessId);
      if (staleOrders.count > 0) {
        alerts.push({
          type: 'warning',
          icon: 'clock',
          title: `${staleOrders.count} pedido${staleOrders.count > 1 ? 's' : ''} pendiente${staleOrders.count > 1 ? 's' : ''}`,
          message: `Requieren atención`,
          details: staleOrders.details,
          time: 'Última actualización'
        });
      }

      // Pedidos cancelados por el cliente
      const clientCancelledOrders = await this.getClientCancelledOrders(businessId);
      if (clientCancelledOrders.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'user-times',
          title: `${clientCancelledOrders.count} pedido${clientCancelledOrders.count > 1 ? 's' : ''} cancelado${clientCancelledOrders.count > 1 ? 's' : ''}`,
          message: `Cancelados por decisión del cliente`,
          details: clientCancelledOrders.details,
          time: 'Últimas 24 horas'
        });
      }

      return alerts;

    } catch (error) {
      this.logger.error('Error obteniendo alertas de business admin:', error);
      return [];
    }
  }

  // Alertas para Branch Admin/Staff
  async getBranchAlerts(branchId) {
    try {
      const alerts = [];

      // Clientes activos en su sucursal
      const activeSessions = await this.getActiveSessions(null, branchId);
      if (activeSessions.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'users',
          title: `${activeSessions.count} cliente${activeSessions.count > 1 ? 's' : ''} activo${activeSessions.count > 1 ? 's' : ''}`,
          message: `En proceso de pedido`,
          details: activeSessions.details,
          time: 'En tiempo real'
        });
      }

      // Pedidos pendientes en su sucursal
      const staleOrders = await this.getStaleOrders(null, branchId);
      if (staleOrders.count > 0) {
        alerts.push({
          type: 'warning',
          icon: 'clock',
          title: `${staleOrders.count} pedido${staleOrders.count > 1 ? 's' : ''} pendiente${staleOrders.count > 1 ? 's' : ''}`,
          message: `Requieren tu atención`,
          details: staleOrders.details,
          time: 'Última actualización'
        });
      }

      // Pedidos cancelados por el cliente en su sucursal
      const clientCancelledOrders = await this.getClientCancelledOrders(null, branchId);
      if (clientCancelledOrders.count > 0) {
        alerts.push({
          type: 'info',
          icon: 'user-times',
          title: `${clientCancelledOrders.count} pedido${clientCancelledOrders.count > 1 ? 's' : ''} cancelado${clientCancelledOrders.count > 1 ? 's' : ''}`,
          message: `Cancelados por decisión del cliente`,
          details: clientCancelledOrders.details,
          time: 'Últimas 24 horas'
        });
      }

      return alerts;

    } catch (error) {
      this.logger.error('Error obteniendo alertas de branch:', error);
      return [];
    }
  }

  // Obtener sesiones activas de clientes
  async getActiveSessions(businessId = null, branchId = null) {
    try {
      const UserSession = require('../models/UserSession');
      const Branch = require('../models/Branch');

      const filter = {
        hasActiveOrder: true,
        status: { $in: ['greeting', 'menu_requested', 'waiting_reminder'] }
      };

      // Aplicar filtros según parámetros
      if (businessId || branchId) {
        const branches = await Branch.find({
          ...(businessId && { businessId }),
          ...(branchId && { _id: branchId })
        }).select('_id name');
        
        const branchIds = branches.map(b => b._id);
        filter.branchId = { $in: branchIds };
      }

      const sessions = await UserSession.find(filter)
        .populate('branchId', 'name')
        .sort({ lastActivity: -1 })
        .limit(10);

      const details = sessions.map(session => ({
        phoneNumber: session.phoneNumber,
        branchName: session.branchName || session.branchId?.name || 'Sucursal desconocida',
        status: this.getSessionStatusText(session.status),
        lastActivity: this.getTimeAgo(session.lastActivity),
        timeSinceActivity: Math.floor((Date.now() - session.lastActivity.getTime()) / (1000 * 60))
      }));

      return {
        count: sessions.length,
        details
      };

    } catch (error) {
      this.logger.error('Error obteniendo sesiones activas:', error);
      return { count: 0, details: [] };
    }
  }

  // Obtener pedidos pendientes por mucho tiempo
  async getStaleOrders(businessId = null, branchId = null) {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const filter = {
        isActive: true,
        status: { $in: ['pending', 'confirmed', 'preparing'] },
        updatedAt: { $lt: thirtyMinutesAgo }
      };

      if (businessId) filter.businessId = businessId;
      if (branchId) filter.branchId = branchId;

      const orders = await Order.find(filter)
        .populate('businessId', 'name')
        .populate('branchId', 'name')
        .sort({ updatedAt: 1 })
        .limit(10);

      const details = orders.map(order => ({
        orderId: order.orderId,
        customerName: order.customer?.name || 'Cliente',
        branchName: order.branchId?.name || 'Sucursal desconocida',
        status: order.status,
        total: order.total,
        lastUpdate: this.getTimeAgo(order.updatedAt),
        minutesStale: Math.floor((Date.now() - order.updatedAt.getTime()) / (1000 * 60))
      }));

      return {
        count: orders.length,
        details
      };

    } catch (error) {
      this.logger.error('Error obteniendo pedidos pendientes:', error);
      return { count: 0, details: [] };
    }
  }

  // Obtener pedidos cancelados recientemente
  async getCancelledOrders(businessId = null, branchId = null) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const filter = {
        isActive: true,
        status: 'cancelled',
        updatedAt: { $gte: twentyFourHoursAgo }
      };

      if (businessId) filter.businessId = businessId;
      if (branchId) filter.branchId = branchId;

      const orders = await Order.find(filter)
        .populate('businessId', 'name')
        .populate('branchId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10);

      const details = orders.map(order => ({
        orderId: order.orderId,
        customerName: order.customer?.name || 'Cliente',
        branchName: order.branchId?.name || 'Sucursal desconocida',
        total: order.total,
        cancelledAt: this.getTimeAgo(order.updatedAt),
        reason: this.getCancellationReason(order)
      }));

      return {
        count: orders.length,
        details
      };

    } catch (error) {
      this.logger.error('Error obteniendo pedidos cancelados:', error);
      return { count: 0, details: [] };
    }
  }

  // Obtener conexiones WhatsApp desconectadas
  async getDisconnectedWhatsApp(businessId = null, branchId = null) {
    try {
      const filter = {
        status: { $in: ['disconnected', 'error'] }
      };

      if (businessId) filter.businessId = businessId;
      if (branchId) filter.branchId = branchId;

      const connections = await WhatsAppConnection.find(filter)
        .populate('businessId', 'name')
        .populate('branchId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10);

      const details = connections.map(connection => ({
        phoneNumber: connection.phoneNumber,
        connectionName: connection.connectionName,
        businessName: connection.businessId?.name || 'Negocio desconocido',
        branchName: connection.branchId?.name || 'Sucursal desconocida',
        status: connection.status,
        lastActivity: this.getTimeAgo(connection.lastActivity)
      }));

      return {
        count: connections.length,
        details
      };

    } catch (error) {
      this.logger.error('Error obteniendo WhatsApp desconectados:', error);
      return { count: 0, details: [] };
    }
  }

  // Función auxiliar para obtener texto del estado de sesión
  getSessionStatusText(status) {
    const statusMap = {
      'greeting': 'Esperando respuesta al saludo',
      'menu_requested': 'Revisando menú',
      'waiting_reminder': 'Enviado recordatorio'
    };
    return statusMap[status] || 'Estado desconocido';
  }

  // Obtener pedidos cancelados por el cliente (no por inactividad)
  async getClientCancelledOrders(businessId = null, branchId = null) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const filter = {
        isActive: true,
        status: 'cancelled',
        updatedAt: { $gte: twentyFourHoursAgo }
      };

      if (businessId) filter.businessId = businessId;
      if (branchId) filter.branchId = branchId;

      const orders = await Order.find(filter)
        .populate('businessId', 'name')
        .populate('branchId', 'name')
        .sort({ updatedAt: -1 })
        .limit(10);

      // Filtrar solo los cancelados por el cliente (no por inactividad)
      const clientCancelledOrders = orders.filter(order => {
        const reason = this.getCancellationReason(order);
        return reason.includes('Cancelado por el cliente') && !reason.includes('inactividad');
      });

      const details = clientCancelledOrders.map(order => ({
        orderId: order.orderId,
        customerName: order.customer?.name || 'Cliente',
        branchName: order.branchId?.name || 'Sucursal desconocida',
        total: order.total,
        cancelledAt: this.getTimeAgo(order.updatedAt),
        reason: this.getCancellationReason(order),
        customerMessage: this.extractCustomerMessage(order)
      }));

      return {
        count: clientCancelledOrders.length,
        details
      };

    } catch (error) {
      this.logger.error('Error obteniendo pedidos cancelados por cliente:', error);
      return { count: 0, details: [] };
    }
  }

  // Función auxiliar para extraer el mensaje del cliente de la razón de cancelación
  extractCustomerMessage(order) {
    if (order.statusHistory && order.statusHistory.length > 0) {
      const lastStatus = order.statusHistory[order.statusHistory.length - 1];
      if (lastStatus.note && lastStatus.note.includes('Cancelado por el cliente:')) {
        return lastStatus.note.replace('Cancelado por el cliente:', '').trim();
      }
    }
    return 'Mensaje no disponible';
  }

  // Función auxiliar para obtener razón de cancelación
  getCancellationReason(order) {
    if (order.statusHistory && order.statusHistory.length > 0) {
      const lastStatus = order.statusHistory[order.statusHistory.length - 1];
      return lastStatus.note || 'Cancelado por el cliente';
    }
    return 'Cancelado por el cliente';
  }

  // Función auxiliar para calcular tiempo transcurrido
  getTimeAgo(date) {
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'ahora';
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  }
}

module.exports = new DashboardController();
