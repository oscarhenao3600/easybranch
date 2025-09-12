const express = require('express');
const { body, validationResult } = require('express-validator');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const userController = new UserController();

// Validaciones
const createUserValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('name').notEmpty().withMessage('Nombre es requerido'),
  body('role').isIn(['super_admin', 'business_admin', 'branch_admin', 'staff']).withMessage('Rol inválido')
];

const updateUserValidation = [
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('role').optional().isIn(['super_admin', 'business_admin', 'branch_admin', 'staff']).withMessage('Rol inválido')
];

const resetPasswordValidation = [
  body('newPassword').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
];

// Middleware para verificar permisos de gestión de usuarios
const requireUserManagement = authMiddleware.requirePermission(['manage_users']);

// GET /api/users - Obtener todos los usuarios
router.get('/', authMiddleware.verifyToken, requireUserManagement, async (req, res) => {
  await userController.getUsers(req, res);
});

// GET /api/users/stats - Obtener estadísticas de usuarios
router.get('/stats', authMiddleware.verifyToken, requireUserManagement, async (req, res) => {
  await userController.getUserStats(req, res);
});

// GET /api/users/:id - Obtener usuario específico
router.get('/:id', authMiddleware.verifyToken, requireUserManagement, async (req, res) => {
  await userController.getUser(req, res);
});

// POST /api/users - Crear nuevo usuario
router.post('/', 
  authMiddleware.verifyToken, 
  requireUserManagement, 
  createUserValidation, 
  async (req, res) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    await userController.createUser(req, res);
  }
);

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', 
  authMiddleware.verifyToken, 
  requireUserManagement, 
  updateUserValidation, 
  async (req, res) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    await userController.updateUser(req, res);
  }
);

// DELETE /api/users/:id - Eliminar/desactivar usuario
router.delete('/:id', authMiddleware.verifyToken, requireUserManagement, async (req, res) => {
  await userController.deleteUser(req, res);
});

// PUT /api/users/:id/permissions - Actualizar permisos de usuario
router.put('/:id/permissions', 
  authMiddleware.verifyToken, 
  requireUserManagement, 
  async (req, res) => {
    await userController.updateUserPermissions(req, res);
  }
);

// PUT /api/users/:id/role - Cambiar rol de usuario
router.put('/:id/role', 
  authMiddleware.verifyToken, 
  requireUserManagement, 
  async (req, res) => {
    await userController.updateUserRole(req, res);
  }
);

// POST /api/users/:id/reset-password - Resetear contraseña
router.post('/:id/reset-password', 
  authMiddleware.verifyToken, 
  requireUserManagement, 
  resetPasswordValidation, 
  async (req, res) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: errors.array()
      });
    }

    await userController.resetUserPassword(req, res);
  }
);

// PUT /api/users/:id/toggle-status - Activar/desactivar usuario
router.put('/:id/toggle-status', authMiddleware.verifyToken, requireUserManagement, async (req, res) => {
  await userController.toggleUserStatus(req, res);
});

module.exports = router;
