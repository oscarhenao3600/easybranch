const Order = require('../models/Order');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const LoggerService = require('../services/LoggerService');

class OrderController {
  constructor() {
    this.logger = new LoggerService();
  }
  // Obtener todos los pedidos con filtros
  async getOrders(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        businessId, 
        branchId, 
        dateFrom, 
        dateTo,
        search 
      } = req.query;

      // Construir filtros
      const filters = { isActive: true };
      
      if (status) filters.status = status;
      if (businessId) filters.businessId = businessId;
      if (branchId) filters.branchId = branchId;
      
      // Filtro por fechas
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }
      
      // Filtro por búsqueda (nombre del cliente o teléfono)
      if (search) {
        filters.$or = [
          { 'customer.name': { $regex: search, $options: 'i' } },
          { 'customer.phone': { $regex: search, $options: 'i' } },
          { orderId: { $regex: search, $options: 'i' } }
        ];
      }

      // Calcular paginación
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Obtener pedidos con información de negocio y sucursal
      const orders = await Order.find(filters)
        .populate('businessId', 'name businessType')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Obtener información de sucursales por separado ya que branchId puede ser string o ObjectId
      const branchIds = [...new Set(orders.map(order => order.branchId).filter(Boolean))];
      
      // Separar ObjectIds válidos de strings
      const mongoose = require('mongoose');
      const validObjectIds = branchIds.filter(id => mongoose.Types.ObjectId.isValid(id));
      const stringIds = branchIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      
      // Construir consulta condicionalmente
      const query = {};
      if (validObjectIds.length > 0 && stringIds.length > 0) {
        query.$or = [
          { branchId: { $in: stringIds } },
          { _id: { $in: validObjectIds } }
        ];
      } else if (validObjectIds.length > 0) {
        query._id = { $in: validObjectIds };
      } else if (stringIds.length > 0) {
        query.branchId = { $in: stringIds };
      }
      
      const branches = await Branch.find(query);
      const branchMap = {};
      branches.forEach(branch => {
        // Mapear tanto por branchId como por _id
        branchMap[branch.branchId] = branch;
        branchMap[branch._id.toString()] = branch;
      });

      // Agregar información de sucursal a cada pedido
      orders.forEach(order => {
        if (order.branchId && branchMap[order.branchId]) {
          order.branchInfo = {
            name: branchMap[order.branchId].name,
            address: branchMap[order.branchId].address
          };
        }
      });

      // Contar total de pedidos
      const totalOrders = await Order.countDocuments(filters);
      
      // Calcular estadísticas
      const stats = await this.calculateOrderStats(filters);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalOrders / parseInt(limit)),
            totalOrders,
            hasNext: skip + orders.length < totalOrders,
            hasPrev: parseInt(page) > 1
          },
          stats
        }
      });

    } catch (error) {
      this.logger.error('Error obteniendo pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener un pedido específico
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      
      const order = await Order.findById(id)
        .populate('businessId', 'name businessType')
        .populate('assignedTo', 'name email phone');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Obtener información de sucursal por separado
      if (order.branchId) {
        const branch = await Branch.findOne({ branchId: order.branchId });
        if (branch) {
          order.branchInfo = {
            name: branch.name,
            address: branch.address,
            phone: branch.contact?.phone
          };
        }
      }

      res.json({
        success: true,
        data: order
      });

    } catch (error) {
      this.logger.error('Error obteniendo pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Actualizar estado de pedido
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const userId = req.user?.userId;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      // Validar estado
      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de pedido inválido'
        });
      }

      // Actualizar estado
      await order.updateStatus(status, note, userId);

      res.json({
        success: true,
        message: 'Estado del pedido actualizado correctamente',
        data: order
      });

    } catch (error) {
      this.logger.error('Error actualizando estado de pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cancelar pedido
  async cancelOrder(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.userId;

      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      if (!order.canCancel()) {
        return res.status(400).json({
          success: false,
          message: 'Este pedido no se puede cancelar'
        });
      }

      await order.updateStatus('cancelled', reason || 'Cancelado por el usuario', userId);

      res.json({
        success: true,
        message: 'Pedido cancelado correctamente',
        data: order
      });

    } catch (error) {
      this.logger.error('Error cancelando pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Obtener estadísticas de pedidos
  async getOrderStats(req, res) {
    try {
      const { businessId, branchId, dateFrom, dateTo } = req.query;
      
      const filters = { isActive: true };
      if (businessId) filters.businessId = businessId;
      if (branchId) filters.branchId = branchId;
      
      if (dateFrom || dateTo) {
        filters.createdAt = {};
        if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filters.createdAt.$lte = new Date(dateTo);
      }

      const stats = await this.calculateOrderStats(filters);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas de pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Método privado para calcular estadísticas
  async calculateOrderStats(filters) {
    try {
      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        preparingOrders,
        readyOrders,
        deliveredOrders,
        cancelledOrders,
        totalRevenue,
        avgOrderValue
      ] = await Promise.all([
        Order.countDocuments(filters),
        Order.countDocuments({ ...filters, status: 'pending' }),
        Order.countDocuments({ ...filters, status: 'confirmed' }),
        Order.countDocuments({ ...filters, status: 'preparing' }),
        Order.countDocuments({ ...filters, status: 'ready' }),
        Order.countDocuments({ ...filters, status: 'delivered' }),
        Order.countDocuments({ ...filters, status: 'cancelled' }),
        Order.aggregate([
          { $match: { ...filters, status: 'delivered' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        Order.aggregate([
          { $match: { ...filters, status: 'delivered' } },
          { $group: { _id: null, avg: { $avg: '$total' } } }
        ])
      ]);

      return {
        totalOrders,
        byStatus: {
          pending: pendingOrders,
          confirmed: confirmedOrders,
          preparing: preparingOrders,
          ready: readyOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          average: avgOrderValue[0]?.avg || 0
        }
      };

    } catch (error) {
      this.logger.error('Error calculando estadísticas:', error);
      return {
        totalOrders: 0,
        byStatus: {
          pending: 0,
          confirmed: 0,
          preparing: 0,
          ready: 0,
          delivered: 0,
          cancelled: 0
        },
        revenue: {
          total: 0,
          average: 0
        }
      };
    }
  }

  // Obtener pedidos por sucursal
  async getOrdersByBranch(req, res) {
    try {
      const { branchId } = req.params;
      const { status, limit = 10 } = req.query;

      const filters = { branchId, isActive: true };
      if (status) filters.status = status;

      const orders = await Order.find(filters)
        .populate('businessId', 'name')
        .populate('branchId', 'name address')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: orders
      });

    } catch (error) {
      this.logger.error('Error obteniendo pedidos por sucursal:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new OrderController();
