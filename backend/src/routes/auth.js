const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');
const TokenService = require('../services/TokenService');

const router = express.Router();
const logger = new LoggerService();
const tokenService = new TokenService();

// Validaciones
const loginValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
];

const registerValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('role').isIn(['super_admin', 'business_admin', 'branch_admin', 'staff']).withMessage('Rol inválido')
];

// Generar token JWT
const generateToken = (user) => {
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role,
    businessId: user.businessId,
    branchId: user.branchId,
    iat: Math.floor(Date.now() / 1000), // Issued at
    jti: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // JWT ID único
  };
  
  return jwt.sign(
    payload,
    process.env.JWT_SECRET || '1357',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// POST /api/auth/login
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Usar TokenService para procesar el login con renovación automática
    const result = await tokenService.processLogin(email, password);

    if (!result.success) {
      const statusCode = result.code === 'INVALID_CREDENTIALS' || result.code === 'USER_INACTIVE' ? 401 : 500;
      return res.status(statusCode).json({
        error: result.error,
        code: result.code
      });
    }

    // Login exitoso - el TokenService ya generó un token fresco
    res.json(result);

  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/register
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { email, password, name, role, businessId, branchId, permissions } = req.body;

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'El email ya está registrado',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Generar userId único
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear usuario
    const user = new User({
      userId,
      email: email.toLowerCase(),
      password,
      name,
      role,
      businessId,
      branchId,
      permissions: permissions || []
    });

    await user.save();

    // Generar token
    const token = generateToken(user);

    logger.auth(user.userId, 'Usuario registrado exitosamente');

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token: token,
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authMiddleware.verifyToken, async (req, res) => {
  try {
    const currentToken = req.headers.authorization?.split(' ')[1];
    
    if (!currentToken) {
      return res.status(401).json({
        error: 'Token requerido',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Usar TokenService para renovar el token
    const result = await tokenService.refreshToken(currentToken);

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
        code: 'TOKEN_REFRESH_FAILED'
      });
    }

    res.json({
      message: 'Token renovado exitosamente',
      token: result.token,
      user: result.user,
      expiresIn: result.expiresIn,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error refrescando token:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware.verifyToken, async (req, res) => {
  try {
    logger.auth(req.user.userId, 'Logout exitoso');

    res.json({
      message: 'Logout exitoso'
    });

  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware.verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId });
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: user.toSafeObject()
    });

  } catch (error) {
    logger.error('Error obteniendo perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/change-password
router.post('/change-password', [
  authMiddleware.verifyToken,
  body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findOne({ userId: req.user.userId });
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      logger.auth(user.userId, 'Cambio de contraseña fallido - Contraseña actual incorrecta');
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Cambiar contraseña
    user.password = newPassword;
    await user.save();

    logger.auth(user.userId, 'Contraseña cambiada exitosamente');

    res.json({
      message: 'Contraseña cambiada exitosamente'
    });

  } catch (error) {
    logger.error('Error cambiando contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Email inválido',
        details: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return res.json({
        message: 'Si el email existe, se enviará un enlace de recuperación'
      });
    }

    // Aquí implementarías el envío de email con token de recuperación
    // Por ahora, solo logueamos
    logger.auth(user.userId, 'Solicitud de recuperación de contraseña');

    res.json({
      message: 'Si el email existe, se enviará un enlace de recuperación'
    });

  } catch (error) {
    logger.error('Error en forgot password:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
