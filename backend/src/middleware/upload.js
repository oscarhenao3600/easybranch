const multer = require('multer');
const path = require('path');
const fs = require('fs');
const LoggerService = require('../services/LoggerService');

class UploadMiddleware {
  constructor() {
    this.logger = new LoggerService();
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    // Tamaño máximo por defecto 25MB; permite override vía MAX_FILE_SIZE_BYTES o MAX_FILE_SIZE_MB
    const maxBytes = process.env.MAX_FILE_SIZE_BYTES ? parseInt(process.env.MAX_FILE_SIZE_BYTES) : null;
    const maxMb = process.env.MAX_FILE_SIZE_MB ? parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024 : null;
    this.maxFileSize = maxBytes || maxMb || 25 * 1024 * 1024; // 25MB por defecto
    this.allowedFileTypes = (process.env.ALLOWED_FILE_TYPES || 'application/pdf').split(',');
    
    // Crear directorio de uploads si no existe
    this.ensureUploadDirectory();
  }

  // Crear directorio de uploads si no existe
  ensureUploadDirectory() {
    const pdfPath = path.join(this.uploadPath, 'pdfs');
    const promptsPath = path.join(this.uploadPath, 'prompts');
    
    [this.uploadPath, pdfPath, promptsPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.info(`📁 Directorio creado: ${dir}`);
      }
    });
  }

  // Configuración de multer para PDFs
  getPDFUploadConfig() {
    const storage = multer.diskStorage({
      destination: (req, res, file, cb) => {
        const branchId = req.params.branchId;
        const branchPath = path.join(this.uploadPath, 'pdfs', branchId);
        
        // Crear directorio específico para la sucursal
        if (!fs.existsSync(branchPath)) {
          fs.mkdirSync(branchPath, { recursive: true });
        }
        
        cb(null, branchPath);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000000000);
        const extension = path.extname(file.originalname);
        const filename = `pdf-${timestamp}-${randomSuffix}${extension}`;
        
        this.logger.info(`📄 Archivo PDF subido: ${filename}`);
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      if (this.allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        const error = new Error(`Tipo de archivo no permitido: ${file.mimetype}`);
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: this.maxFileSize,
        files: 1 // Solo un archivo por vez
      }
    });
  }

  // Middleware para subir PDFs
  uploadPDF() {
    const upload = this.getPDFUploadConfig();
    
    return (req, res, next) => {
      // Aceptar tanto 'pdf' como 'menuPDF'
      const fieldsUpload = upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'menuPDF', maxCount: 1 }]);
      fieldsUpload(req, res, (err) => {
        if (err) {
          this.logger.error('Error en subida de PDF:', err);
          
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: `El archivo es demasiado grande. Máximo permitido: ${(this.maxFileSize / 1024 / 1024).toFixed(0)}MB`
            });
          }
          
          if (err.code === 'INVALID_FILE_TYPE') {
            return res.status(400).json({
              success: false,
              message: 'Solo se permiten archivos PDF'
            });
          }
          
          return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al subir el archivo'
          });
        }
        
        // Normalizar req.file desde los campos aceptados
        let file = null;
        if (req.files) {
          if (req.files['menuPDF'] && req.files['menuPDF'][0]) file = req.files['menuPDF'][0];
          else if (req.files['pdf'] && req.files['pdf'][0]) file = req.files['pdf'][0];
        }
        
        if (!file) {
          return res.status(400).json({
            success: false,
            message: 'No se ha seleccionado ningún archivo PDF'
          });
        }
        
        // Agregar información del archivo al request
        req.uploadedFile = {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date()
        };
        
        next();
      });
    };
  }

  // Validar archivo PDF
  validatePDF(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const stats = fs.statSync(filePath);
        
        // Verificar que el archivo existe y tiene contenido
        if (!stats.isFile() || stats.size === 0) {
          reject(new Error('El archivo PDF está vacío o no existe'));
          return;
        }
        
        // Verificar tamaño máximo
        if (stats.size > this.maxFileSize) {
          reject(new Error(`El archivo es demasiado grande: ${stats.size} bytes`));
          return;
        }
        
        // Verificar extensión
        const ext = path.extname(filePath).toLowerCase();
        if (ext !== '.pdf') {
          reject(new Error('El archivo no es un PDF válido'));
          return;
        }
        
        resolve({
          size: stats.size,
          isValid: true
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Limpiar archivos temporales
  cleanupTempFiles(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.info(`🗑️ Archivo temporal eliminado: ${filePath}`);
      }
    } catch (error) {
      this.logger.error('Error eliminando archivo temporal:', error);
    }
  }

  // Obtener información de archivos subidos
  getUploadedFiles(branchId) {
    const branchPath = path.join(this.uploadPath, 'pdfs', branchId);
    
    if (!fs.existsSync(branchPath)) {
      return [];
    }
    
    try {
      const files = fs.readdirSync(branchPath);
      return files.map(filename => {
        const filePath = path.join(branchPath, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename,
          path: filePath,
          size: stats.size,
          uploadedAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      }).sort((a, b) => b.uploadedAt - a.uploadedAt); // Más recientes primero
      
    } catch (error) {
      this.logger.error('Error obteniendo archivos subidos:', error);
      return [];
    }
  }

  // Eliminar archivo específico
  deleteFile(branchId, filename) {
    const filePath = path.join(this.uploadPath, 'pdfs', branchId, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.info(`🗑️ Archivo eliminado: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Error eliminando archivo:', error);
      return false;
    }
  }
}

module.exports = new UploadMiddleware();
