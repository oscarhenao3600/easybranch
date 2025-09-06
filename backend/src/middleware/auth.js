const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoggerService = require('../services/LoggerService');
const TokenService = require('../services/TokenService');

class AuthMiddleware {
  constructor() {
    this.logger = new LoggerService();
    this.tokenService = new TokenService();
  }

  // Verificar token JWT
  verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
          error: 'Token de acceso requerido',
          code: 'TOKEN_REQUIRED'
        });
      }

      console.log('🔍 Verifying token:', token.substring(0, 50) + '...');
      
      // Usar TokenService para verificar el token
      const tokenService = new TokenService();
      const verification = tokenService.verifyToken(token);
      
      if (!verification.success) {
        console.log('❌ Token verification failed:', verification.error);
        throw new Error(verification.error);
      }
      
      console.log('✅ Token decoded successfully:', verification.payload);
      req.user = verification.payload;
      next();
      
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      const logger = new LoggerService();
      logger.error('Error verificando token:', error);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          code: 'TOKEN_INVALID'
        });
      }
      
      return res.status(401).json({
        error: 'Error de autenticación',
        code: 'AUTH_ERROR'
      });
    }
  }

  // Verificar roles específicos
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          code: 'USER_NOT_AUTHENTICATED'
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(userRole)) {
        const logger = new LoggerService();
        logger.auth(req.user.userId, `Acceso denegado - Rol requerido: ${roles}, Rol actual: ${userRole}`);
        
        return res.status(403).json({
          error: 'Acceso denegado - Permisos insuficientes',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: allowedRoles,
          current: userRole
        });
      }
      
      next();
    };
  }

  // Verificar permisos específicos
  requirePermission(permissions) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Usuario no autenticado',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        // Buscar usuario completo en la base de datos
        const user = await User.findOne({ userId: req.user.userId });
        
        if (!user) {
          return res.status(401).json({
            error: 'Usuario no encontrado',
            code: 'USER_NOT_FOUND'
          });
        }

        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
        
        // Super admin tiene todos los permisos
        if (user.role === 'super_admin') {
          return next();
        }
        
        // Verificar permisos específicos
        const hasAllPermissions = requiredPermissions.every(permission => 
          user.permissions.includes(permission)
        );
        
        if (!hasAllPermissions) {
          const logger = new LoggerService();
          logger.auth(user.userId, `Permisos insuficientes - Requeridos: ${requiredPermissions.join(', ')}`);
          
          return res.status(403).json({
            error: 'Permisos insuficientes',
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredPermissions,
            current: user.permissions
          });
        }
        
        // Agregar usuario completo al request
        req.userData = user;
        next();
        
      } catch (error) {
        const logger = new LoggerService();
        logger.error('Error verificando permisos:', error);
        return res.status(500).json({
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  }

  // Verificar acceso a negocio específico
  requireBusinessAccess() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Usuario no autenticado',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        const businessId = req.params.businessId || req.body.businessId;
        
        if (!businessId) {
          return res.status(400).json({
            error: 'ID de negocio requerido',
            code: 'BUSINESS_ID_REQUIRED'
          });
        }

        // Super admin puede acceder a cualquier negocio
        if (req.user.role === 'super_admin') {
          return next();
        }

        // Verificar si el usuario tiene acceso al negocio
        if (req.user.businessId !== businessId) {
          const logger = new LoggerService();
          logger.auth(req.user.userId, `Acceso denegado al negocio ${businessId}`);
          
          return res.status(403).json({
            error: 'Acceso denegado al negocio',
            code: 'BUSINESS_ACCESS_DENIED',
            userBusiness: req.user.businessId,
            requestedBusiness: businessId
          });
        }
        
        next();
        
      } catch (error) {
        const logger = new LoggerService();
        logger.error('Error verificando acceso al negocio:', error);
        return res.status(500).json({
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  }

  // Verificar acceso a sucursal específica
  requireBranchAccess() {
    return async (req, res, next) => {
      try {
        if (!req.userData) {
          return res.status(401).json({
            error: 'Usuario no autenticado',
            code: 'USER_NOT_AUTHENTICATED'
          });
        }

        const branchId = req.params.branchId || req.body.branchId;
        
        if (!branchId) {
          return res.status(400).json({
            error: 'ID de sucursal requerido',
            code: 'BRANCH_ID_REQUIRED'
          });
        }

        // Super admin puede acceder a cualquier sucursal
        if (req.userData.role === 'super_admin') {
          return next();
        }

        // Business admin puede acceder a cualquier sucursal de su negocio
        if (req.userData.role === 'business_admin') {
          // Aquí deberías verificar que la sucursal pertenece al negocio del usuario
          // Por ahora, permitimos el acceso
          return next();
        }

        // Branch admin y staff solo pueden acceder a su sucursal específica
        if (req.userData.branchId !== branchId) {
          const logger = new LoggerService();
          logger.auth(req.userData.userId, `Acceso denegado a la sucursal ${branchId}`);
          
          return res.status(403).json({
            error: 'Acceso denegado a la sucursal',
            code: 'BRANCH_ACCESS_DENIED',
            userBranch: req.userData.branchId,
            requestedBranch: branchId
          });
        }
        
        next();
        
      } catch (error) {
        const logger = new LoggerService();
        logger.error('Error verificando acceso a la sucursal:', error);
        return res.status(500).json({
          error: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        });
      }
    };
  }

  // Middleware para logging de acceso
  logAccess(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = req.user?.userId || 'anonymous';
      
      const logger = new LoggerService();
      logger.auth(userId, `${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    });
    
    next();
  }

  // Middleware para rate limiting personalizado
  rateLimit(options = {}) {
    const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutos
    const max = options.max || 100; // máximo 100 requests
    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Limpiar requests antiguos
      if (requests.has(key)) {
        requests.set(key, requests.get(key).filter(timestamp => timestamp > windowStart));
      }

      const currentRequests = requests.get(key) || [];
      
      if (currentRequests.length >= max) {
        const logger = new LoggerService();
        logger.warn(`Rate limit excedido para IP: ${key}`);
        
        return res.status(429).json({
          error: 'Demasiadas solicitudes',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      currentRequests.push(now);
      requests.set(key, currentRequests);
      
      next();
    };
  }
}

module.exports = new AuthMiddleware();
