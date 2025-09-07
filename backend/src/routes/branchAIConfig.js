const express = require('express');
const multer = require('multer');
const path = require('path');
const BranchAIConfigController = require('../controllers/BranchAIConfigController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const controller = new BranchAIConfigController();

// Configurar multer para subir archivos PDF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/menus');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const branchId = req.params.branchId;
        const timestamp = Date.now();
        const filename = `menu-${branchId}-${timestamp}.pdf`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    }
});

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware.verifyToken);

// Rutas para configuración de IA por sucursal
router.post('/:branchId', controller.createOrUpdateConfig.bind(controller));
router.get('/:branchId', controller.getConfig.bind(controller));
router.get('/', controller.getAllConfigs.bind(controller));
router.delete('/:branchId', controller.deleteConfig.bind(controller));

// Ruta para subir menú PDF
router.post('/:branchId/upload-menu', upload.single('menuPDF'), controller.uploadMenuPDF.bind(controller));

module.exports = router;
