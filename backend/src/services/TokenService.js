const jwt = require('jsonwebtoken');
const User = require('../models/user');
const LoggerService = require('./LoggerService');

class TokenService {
  constructor() {
    this.logger = new LoggerService();
    this.secret = process.env.JWT_SECRET || '1357';
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  // Generar token completamente nuevo
  generateFreshToken(user) {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      branchId: user.branchId,
      iat: Math.floor(Date.now() / 1000), // Issued at
      jti: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // JWT ID único
    };
    
    const token = jwt.sign(payload, this.secret, { expiresIn: this.expiresIn });
    
    this.logger.auth(user.userId, 'Token fresco generado', {
      tokenId: payload.jti,
      expiresIn: this.expiresIn,
      role: user.role
    });
    
    console.log(`🔑 Token fresco generado para ${user.email}:`, token.substring(0, 50) + '...');
    
    return token;
  }

  // Verificar y decodificar token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      return { success: true, payload: decoded };
    } catch (error) {
      this.logger.error('Error verificando token:', {
        error: error.message,
        errorType: error.name
      });
      return { success: false, error: error.message, errorType: error.name };
    }
  }

  // Renovar token si es válido
  async refreshToken(currentToken) {
    try {
      const verification = this.verifyToken(currentToken);
      
      if (!verification.success) {
        return { success: false, error: verification.error };
      }

      const { userId } = verification.payload;
      const user = await User.findOne({ userId });
      
      if (!user || !user.isActive) {
        this.logger.auth(userId, 'Intento de renovación de token fallido - Usuario no válido');
        return { success: false, error: 'Usuario no válido' };
      }

      // Generar nuevo token
      const newToken = this.generateFreshToken(user);
      
      this.logger.auth(userId, 'Token renovado exitosamente', {
        oldTokenId: verification.payload.jti,
        newTokenId: jwt.decode(newToken).jti
      });

      return { 
        success: true, 
        token: newToken, 
        user: user.toSafeObject(),
        expiresIn: this.expiresIn
      };

    } catch (error) {
      this.logger.error('Error renovando token:', error);
      return { success: false, error: 'Error interno del servidor' };
    }
  }

  // Procesar login con renovación automática
  async processLogin(email, password) {
    try {
      // Buscar usuario
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        this.logger.auth('unknown', `Intento de login fallido - Email no encontrado: ${email}`);
        return { success: false, error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' };
      }

      // Verificar contraseña
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        this.logger.auth(user.userId, 'Intento de login fallido - Contraseña incorrecta');
        return { success: false, error: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' };
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        this.logger.auth(user.userId, 'Intento de login fallido - Usuario inactivo');
        return { success: false, error: 'Usuario inactivo', code: 'USER_INACTIVE' };
      }

      // Actualizar último login
      user.lastLogin = new Date();
      await user.save();

      // Generar token fresco
      const token = this.generateFreshToken(user);

      this.logger.auth(user.userId, 'Login exitoso con token renovado', {
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      });

      return {
        success: true,
        message: 'Login exitoso',
        token: token,
        user: user.toSafeObject(),
        expiresIn: this.expiresIn,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Error en proceso de login:', error);
      return { success: false, error: 'Error interno del servidor', code: 'INTERNAL_ERROR' };
    }
  }

  // Verificar si el token necesita renovación (opcional)
  shouldRefreshToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return false;
      
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      const halfLife = (24 * 60 * 60) / 2; // Mitad de la vida del token (12 horas)
      
      return timeUntilExpiry < halfLife;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TokenService;
