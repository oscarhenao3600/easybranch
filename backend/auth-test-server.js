const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use('/frontend-admin', express.static(path.join(__dirname, '../frontend-admin')));

// Datos de prueba (simulando base de datos)
const testUsers = [
  {
    email: 'admin@easybranch.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // admin123
    name: 'Super Administrador',
    role: 'super_admin'
  },
  {
    email: 'gerente@elsabor.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // gerente123
    name: 'Gerente El Sabor',
    role: 'business_admin'
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'Servidor con autenticación funcionando'
  });
});

// Ruta de login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuario
    const user = testUsers.find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }
    
    // Verificar contraseña (en producción usar bcrypt.compare)
    const isValidPassword = password === 'admin123' || password === 'gerente123';
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas'
      });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: user.email, 
        email: user.email, 
        role: user.role,
        name: user.name
      },
      '1357',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      },
      message: 'Login exitoso'
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

// Ruta para obtener perfil del usuario
app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      error: 'Token no proporcionado'
    });
  }
  
  try {
    const decoded = jwt.verify(token, '1357');
    const user = testUsers.find(u => u.email === decoded.email);
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(401).json({
      error: 'Token inválido'
    });
  }
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'EasyBranch API v2.0 - Servidor con Autenticación',
    health: '/api/health',
    login: '/api/auth/login',
    frontend: '/frontend-admin/'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor con autenticación ejecutándose en puerto ${PORT}`);
  console.log(`📱 Frontend disponible en: http://localhost:${PORT}/frontend-admin/`);
  console.log(`🔍 Health check en: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Login en: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Credenciales de prueba:`);
  console.log(`   - admin@easybranch.com / admin123`);
  console.log(`   - gerente@elsabor.com / gerente123`);
});
