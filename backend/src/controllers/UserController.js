const User = require('../models/User');
const Business = require('../models/Business');
const Branch = require('../models/Branch');
const LoggerService = require('../services/LoggerService');
const bcrypt = require('bcryptjs');

class UserController {
  constructor() {
    this.logger = new LoggerService('user-controller');
  }

  // Obtener todos los usuarios con filtros y paginación
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        role,
        businessId,
        branchId,
        isActive,
        search
      } = req.query;

      // Construir filtros
      const filters = {};
      
      if (role) filters.role = role;
      if (businessId) filters.businessId = businessId;
      if (branchId) filters.branchId = branchId;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      // Filtro por búsqueda
      if (search) {
        filters.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { userId: { $regex: search, $options: 'i' } }
        ];
      }

      // Calcular paginación
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Obtener usuarios (sin populate ya que businessId y branchId son String, no ObjectId)
      const users = await User.find(filters)
        .select('-password') // Excluir contraseñas
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(); // Usar lean() para mejor rendimiento

      // Enriquecer con información de negocios y sucursales manualmente
      const enrichedUsers = await Promise.all(users.map(async (user) => {
        let businessInfo = null;
        let branchInfo = null;

        // Buscar información del negocio si existe
        if (user.businessId) {
          try {
            businessInfo = await Business.findOne({ businessId: user.businessId })
              .select('name businessType')
              .lean();
          } catch (error) {
            console.log('Error finding business:', error.message);
          }
        }

        // Buscar información de la sucursal si existe
        if (user.branchId) {
          try {
            branchInfo = await Branch.findOne({ branchId: user.branchId })
              .select('name address')
              .lean();
          } catch (error) {
            console.log('Error finding branch:', error.message);
          }
        }

        return {
          ...user,
          businessId: businessInfo,
          branchId: branchInfo
        };
      }));

      // Contar total de usuarios
      const totalUsers = await User.countDocuments(filters);
      
      // Calcular estadísticas
      const stats = await this.calculateUserStats(filters);

      res.json({
        success: true,
        data: {
          users: enrichedUsers,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / parseInt(limit)),
            totalUsers,
            hasNext: parseInt(page) < Math.ceil(totalUsers / parseInt(limit)),
            hasPrev: parseInt(page) > 1
          },
          stats
        }
      });

    } catch (error) {
      this.logger.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuario específico
  async getUser(req, res) {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id)
        .select('-password')
        .lean();

      // Enriquecer con información de negocio y sucursal
      let businessInfo = null;
      let branchInfo = null;

      if (user.businessId) {
        try {
          businessInfo = await Business.findOne({ businessId: user.businessId })
            .select('name businessType')
            .lean();
        } catch (error) {
          console.log('Error finding business:', error.message);
        }
      }

      if (user.branchId) {
        try {
          branchInfo = await Branch.findOne({ branchId: user.branchId })
            .select('name address')
            .lean();
        } catch (error) {
          console.log('Error finding branch:', error.message);
        }
      }

      const enrichedUser = {
        ...user,
        businessId: businessInfo,
        branchId: branchInfo
      };

      if (!enrichedUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: enrichedUser
      });

    } catch (error) {
      this.logger.error('Error obteniendo usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Crear nuevo usuario
  async createUser(req, res) {
    try {
      const {
        email,
        password,
        name,
        role,
        businessId,
        branchId,
        permissions = [],
        profile = {}
      } = req.body;

      // Verificar si el email ya existe
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está registrado'
        });
      }

      // Generar userId único
      const userId = `USR${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Crear usuario
      const user = new User({
        userId,
        email: email.toLowerCase(),
        password,
        name,
        role,
        businessId,
        branchId,
        permissions,
        profile
      });

      await user.save();

      this.logger.auth(user.userId, 'Usuario creado exitosamente');

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user.toSafeObject()
      });

    } catch (error) {
      this.logger.error('Error creando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar usuario
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // No permitir actualizar contraseña desde aquí
      if (updateData.password) {
        delete updateData.password;
      }

      // No permitir actualizar userId
      if (updateData.userId) {
        delete updateData.userId;
      }

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .select('-password')
        .lean();

      // Enriquecer con información de negocio y sucursal
      let businessInfo = null;
      let branchInfo = null;

      if (user && user.businessId) {
        try {
          businessInfo = await Business.findOne({ businessId: user.businessId })
            .select('name businessType')
            .lean();
        } catch (error) {
          console.log('Error finding business:', error.message);
        }
      }

      if (user && user.branchId) {
        try {
          branchInfo = await Branch.findOne({ branchId: user.branchId })
            .select('name address')
            .lean();
        } catch (error) {
          console.log('Error finding branch:', error.message);
        }
      }

      const enrichedUser = user ? {
        ...user,
        businessId: businessInfo,
        branchId: branchInfo
      } : null;

      if (!enrichedUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      this.logger.auth(enrichedUser.userId, 'Usuario actualizado exitosamente');

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: enrichedUser
      });

    } catch (error) {
      this.logger.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Eliminar/desactivar usuario
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // No permitir eliminar super admin
      if (user.role === 'super_admin') {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un Super Administrador'
        });
      }

      // Desactivar en lugar de eliminar
      user.isActive = false;
      await user.save();

      this.logger.auth(user.userId, 'Usuario desactivado exitosamente');

      res.json({
        success: true,
        message: 'Usuario desactivado exitosamente'
      });

    } catch (error) {
      this.logger.error('Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Actualizar permisos de usuario
  async updateUserPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      user.permissions = permissions;
      await user.save();

      this.logger.auth(user.userId, 'Permisos de usuario actualizados');

      res.json({
        success: true,
        message: 'Permisos actualizados exitosamente',
        data: user.toSafeObject()
      });

    } catch (error) {
      this.logger.error('Error actualizando permisos:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Cambiar rol de usuario
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // No permitir cambiar rol de super admin
      if (user.role === 'super_admin') {
        return res.status(400).json({
          success: false,
          error: 'No se puede cambiar el rol de un Super Administrador'
        });
      }

      user.role = role;
      await user.save();

      this.logger.auth(user.userId, `Rol de usuario cambiado a ${role}`);

      res.json({
        success: true,
        message: 'Rol actualizado exitosamente',
        data: user.toSafeObject()
      });

    } catch (error) {
      this.logger.error('Error actualizando rol:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Resetear contraseña
  async resetUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      user.password = newPassword;
      await user.save();

      this.logger.auth(user.userId, 'Contraseña de usuario reseteada');

      res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      this.logger.error('Error reseteando contraseña:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Activar/desactivar usuario
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado'
        });
      }

      // No permitir desactivar super admin
      if (user.role === 'super_admin') {
        return res.status(400).json({
          success: false,
          error: 'No se puede desactivar un Super Administrador'
        });
      }

      user.isActive = !user.isActive;
      await user.save();

      this.logger.auth(user.userId, `Usuario ${user.isActive ? 'activado' : 'desactivado'}`);

      res.json({
        success: true,
        message: `Usuario ${user.isActive ? 'activado' : 'desactivado'} exitosamente`,
        data: user.toSafeObject()
      });

    } catch (error) {
      this.logger.error('Error cambiando estado de usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de usuarios
  async getUserStats(req, res) {
    try {
      const stats = await this.calculateUserStats({});

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      this.logger.error('Error obteniendo estadísticas de usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }

  // Método privado para calcular estadísticas
  async calculateUserStats(filters = {}) {
    try {
      const totalUsers = await User.countDocuments(filters);
      const activeUsers = await User.countDocuments({ ...filters, isActive: true });
      const inactiveUsers = await User.countDocuments({ ...filters, isActive: false });

      // Estadísticas por rol
      const roleStats = await User.aggregate([
        { $match: filters },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ]);

      // Estadísticas por negocio
      const businessStats = await User.aggregate([
        { $match: { ...filters, businessId: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'businesses',
            localField: 'businessId',
            foreignField: '_id',
            as: 'business'
          }
        },
        { $unwind: '$business' },
        {
          $group: {
            _id: '$business.name',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleStats: roleStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        businessStats
      };

    } catch (error) {
      this.logger.error('Error calculando estadísticas de usuarios:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        roleStats: {},
        businessStats: []
      };
    }
  }
}

module.exports = UserController;
