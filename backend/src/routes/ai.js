const express = require('express');
const { body, validationResult } = require('express-validator');
const Branch = require('../models/Branch');
const Business = require('../models/Business');
const AIService = require('../services/AIService');
const PDFParserService = require('../services/PDFParserService');
const authMiddleware = require('../middleware/auth');
const LoggerService = require('../services/LoggerService');

const router = express.Router();
const logger = new LoggerService();
const aiService = new AIService();
const pdfParserService = new PDFParserService();

// GET /api/ai/status - Get AI service status
router.get('/status', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), async (req, res) => {
    try {
        const { businessId, branchId } = req.query;
        
        let filter = {};
        if (req.user.role === 'business_admin') {
            filter.businessId = req.user.businessId;
        } else if (req.user.role === 'branch_admin') {
            filter.branchId = req.user.branchId;
        } else if (businessId) {
            filter.businessId = businessId;
        } else if (branchId) {
            filter.branchId = branchId;
        }

        const branches = await Branch.find(filter)
            .select('branchId name ai businessId')
            .populate('businessId', 'name ai');

        const statusList = branches.map(branch => {
            const businessAI = branch.businessId?.ai;
            const branchAI = branch.ai;
            
            return {
                branchId: branch.branchId,
                branchName: branch.name,
                businessName: branch.businessId?.name,
                aiEnabled: branchAI?.enabled || businessAI?.enabled || false,
                aiProvider: branchAI?.provider || businessAI?.provider || 'huggingface',
                aiModel: branchAI?.model || businessAI?.model || 'deepseek-chat',
                hasCatalog: !!branch.catalog?.content,
                catalogSections: branch.catalog?.sections?.length || 0,
                catalogProducts: branch.catalog?.products?.length || 0
            };
        });

        const stats = aiService.getStats();

        res.json({
            success: true,
            data: {
                branches: statusList,
                stats
            }
        });
    } catch (error) {
        logger.error('Error getting AI status:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/ai/:branchId/status - Get specific branch AI status
router.get('/:branchId/status', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name ai catalog businessId')
            .populate('businessId', 'name ai');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        const businessAI = branch.businessId?.ai;
        const branchAI = branch.ai;
        
        const aiConfig = {
            enabled: branchAI?.enabled ?? businessAI?.enabled ?? false,
            provider: branchAI?.provider || businessAI?.provider || 'huggingface',
            model: branchAI?.model || businessAI?.model || 'deepseek-chat',
            prompt: branchAI?.prompt || businessAI?.prompt || '',
            useBusinessSettings: branchAI?.useBusinessSettings ?? true
        };

        const catalogInfo = {
            hasCatalog: !!branch.catalog?.content,
            sections: branch.catalog?.sections?.length || 0,
            products: branch.catalog?.products?.length || 0,
            lastUpdated: branch.catalog?.lastUpdated,
            pdfUrl: branch.catalog?.pdfUrl
        };

        res.json({
            success: true,
            data: {
                branchId: branch.branchId,
                branchName: branch.name,
                businessName: branch.businessId?.name,
                ai: aiConfig,
                catalog: catalogInfo
            }
        });
    } catch (error) {
        logger.error('Error getting branch AI status:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/ai/:branchId/configure - Configure AI for specific branch
router.post('/:branchId/configure', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), [
    body('enabled').optional().isBoolean().withMessage('Enabled debe ser booleano'),
    body('provider').optional().isIn(['huggingface', 'deepseek', 'openai']).withMessage('Proveedor de IA inválido'),
    body('model').optional().isLength({ min: 1, max: 100 }).withMessage('Modelo debe tener entre 1 y 100 caracteres'),
    body('prompt').optional().isLength({ max: 1000 }).withMessage('Prompt no puede exceder 1000 caracteres'),
    body('useBusinessSettings').optional().isBoolean().withMessage('Use business settings debe ser booleano')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { branchId } = req.params;
        const { enabled, provider, model, prompt, useBusinessSettings } = req.body;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name ai businessId')
            .populate('businessId', 'name');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        // Update AI configuration
        const updateData = {};
        if (enabled !== undefined) updateData['ai.enabled'] = enabled;
        if (provider) updateData['ai.provider'] = provider;
        if (model) updateData['ai.model'] = model;
        if (prompt !== undefined) updateData['ai.prompt'] = prompt;
        if (useBusinessSettings !== undefined) updateData['ai.useBusinessSettings'] = useBusinessSettings;

        const updatedBranch = await Branch.findByIdAndUpdate(
            branchId,
            updateData,
            { new: true, runValidators: true }
        ).select('branchId name ai businessId')
         .populate('businessId', 'name');

        // Update AI service configuration
        if (provider && model) {
            aiService.configureHuggingFace(process.env.HUGGINGFACE_API_KEY, model);
        }

        logger.info(`AI configured for branch: ${branchId} - ${branch.name}`);
        
        res.json({
            success: true,
            message: 'Configuración de IA actualizada correctamente',
            data: {
                branchId: updatedBranch.branchId,
                branchName: updatedBranch.name,
                ai: updatedBranch.ai
            }
        });
    } catch (error) {
        logger.error('Error configuring AI:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/ai/:branchId/query - Query AI for specific branch
router.post('/:branchId/query', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), [
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Mensaje debe tener entre 1 y 1000 caracteres'),
    body('clientId').optional().isLength({ min: 1, max: 100 }).withMessage('Client ID debe tener entre 1 y 100 caracteres'),
    body('context').optional().isObject().withMessage('Context debe ser un objeto')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { branchId } = req.params;
        const { message, clientId, context } = req.body;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name ai catalog businessId')
            .populate('businessId', 'name businessType ai');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        // Check if AI is enabled
        const businessAI = branch.businessId?.ai;
        const branchAI = branch.ai;
        const aiEnabled = branchAI?.enabled ?? businessAI?.enabled ?? false;

        if (!aiEnabled) {
            return res.status(400).json({ 
                success: false, 
                message: 'IA no está habilitada para esta sucursal' 
            });
        }

        // Get AI configuration
        const aiConfig = {
            provider: branchAI?.provider || businessAI?.provider || 'huggingface',
            model: branchAI?.model || businessAI?.model || 'deepseek-chat',
            prompt: branchAI?.prompt || businessAI?.prompt || '',
            useBusinessSettings: branchAI?.useBusinessSettings ?? true
        };

        // Get business type for context
        const businessType = branch.businessId?.businessType || 'restaurant';

        // Generate AI response
        const response = await aiService.generateResponse(
            branchId,
            message,
            clientId,
            businessType
        );

        if (response.success) {
            logger.info(`AI response generated for branch ${branchId}: ${message.substring(0, 50)}...`);
            
            res.json({
                success: true,
                data: {
                    response: response.response,
                    branchId,
                    branchName: branch.name,
                    businessType,
                    aiProvider: aiConfig.provider,
                    aiModel: aiConfig.model,
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al generar respuesta de IA',
                error: response.error
            });
        }
    } catch (error) {
        logger.error('Error querying AI:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/ai/:branchId/upload-catalog - Upload and parse catalog PDF
router.post('/:branchId/upload-catalog', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name businessId')
            .populate('businessId', 'name businessType');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        // This endpoint will be implemented when we add file upload middleware
        // For now, return a placeholder response
        res.json({
            success: true,
            message: 'Endpoint para subir y procesar catálogo PDF - Pendiente de implementar',
            data: {
                branchId,
                branchName: branch.name,
                businessType: branch.businessId?.businessType
            }
        });
    } catch (error) {
        logger.error('Error uploading catalog:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// POST /api/ai/:branchId/process-catalog - Process catalog content manually
router.post('/:branchId/process-catalog', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), [
    body('content').trim().isLength({ min: 10, max: 50000 }).withMessage('Contenido debe tener entre 10 y 50000 caracteres'),
    body('businessType').optional().isIn(['restaurant', 'coffee', 'pharmacy', 'grocery', 'beauty', 'other']).withMessage('Tipo de negocio inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { branchId } = req.params;
        const { content, businessType } = req.body;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name businessId')
            .populate('businessId', 'name businessType');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        const branchBusinessType = businessType || branch.businessId?.businessType || 'restaurant';

        // Process catalog content
        const processedContent = await pdfParserService.processMenuContent(content, branchBusinessType);

        if (!processedContent.success) {
            return res.status(400).json({
                success: false,
                message: 'Error al procesar el contenido del catálogo',
                error: processedContent.error
            });
        }

        // Update branch catalog
        const updatedBranch = await Branch.findByIdAndUpdate(
            branchId,
            {
                'catalog.content': content,
                'catalog.sections': processedContent.sections,
                'catalog.products': processedContent.products,
                'catalog.prices': processedContent.prices,
                'catalog.summary': processedContent.summary,
                'catalog.lastUpdated': new Date(),
                updatedAt: new Date()
            },
            { new: true }
        ).select('branchId name catalog businessId')
         .populate('businessId', 'name');

        // Update AI service with menu content
        aiService.setMenuContent(branchId, content);

        logger.info(`Catalog processed for branch: ${branchId} - ${branch.name}`);

        res.json({
            success: true,
            message: 'Catálogo procesado correctamente',
            data: {
                branchId: updatedBranch.branchId,
                branchName: updatedBranch.name,
                catalog: {
                    sections: processedContent.sections.length,
                    products: processedContent.products.length,
                    prices: processedContent.prices.length,
                    summary: processedContent.summary
                }
            }
        });
    } catch (error) {
        logger.error('Error processing catalog:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/ai/:branchId/catalog - Get processed catalog for specific branch
router.get('/:branchId/catalog', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name catalog businessId')
            .populate('businessId', 'name businessType');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        if (!branch.catalog?.content) {
            return res.status(404).json({ success: false, message: 'No hay catálogo procesado para esta sucursal' });
        }

        res.json({
            success: true,
            data: {
                branchId: branch.branchId,
                branchName: branch.name,
                businessType: branch.businessId?.businessType,
                catalog: {
                    sections: branch.catalog.sections,
                    products: branch.catalog.products,
                    prices: branch.catalog.prices,
                    summary: branch.catalog.summary,
                    lastUpdated: branch.catalog.lastUpdated
                }
            }
        });
    } catch (error) {
        logger.error('Error getting catalog:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /api/ai/:branchId/catalog - Clear catalog for specific branch
router.delete('/:branchId/catalog', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name catalog businessId')
            .populate('businessId', 'name');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        // Clear catalog
        const updatedBranch = await Branch.findByIdAndUpdate(
            branchId,
            {
                'catalog.content': null,
                'catalog.sections': [],
                'catalog.products': [],
                'catalog.prices': [],
                'catalog.summary': null,
                'catalog.lastUpdated': null,
                updatedAt: new Date()
            },
            { new: true }
        ).select('branchId name catalog businessId')
         .populate('businessId', 'name');

        // Clear AI service menu content
        aiService.setMenuContent(branchId, '');

        logger.info(`Catalog cleared for branch: ${branchId} - ${branch.name}`);

        res.json({
            success: true,
            message: 'Catálogo eliminado correctamente',
            data: {
                branchId: updatedBranch.branchId,
                branchName: updatedBranch.name
            }
        });
    } catch (error) {
        logger.error('Error clearing catalog:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// GET /api/ai/:branchId/conversation-history - Get conversation history
router.get('/:branchId/conversation-history', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        const { clientId, limit = 50 } = req.query;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name businessId')
            .populate('businessId', 'name');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        let history = [];
        if (clientId) {
            history = aiService.getConversationHistory(clientId);
        }

        res.json({
            success: true,
            data: {
                branchId,
                branchName: branch.name,
                clientId,
                history: history.slice(-limit),
                totalMessages: history.length
            }
        });
    } catch (error) {
        logger.error('Error getting conversation history:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// DELETE /api/ai/:branchId/conversation-history - Clear conversation history
router.delete('/:branchId/conversation-history', authMiddleware.requireRole(['super_admin', 'business_admin', 'branch_admin']), authMiddleware.requireBranchAccess(), async (req, res) => {
    try {
        const { branchId } = req.params;
        const { clientId } = req.query;
        
        const branch = await Branch.findById(branchId)
            .select('branchId name businessId')
            .populate('businessId', 'name');

        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        if (clientId) {
            aiService.clearConversationHistory(clientId);
        }

        logger.info(`Conversation history cleared for branch: ${branchId} - ${branch.name}`);

        res.json({
            success: true,
            message: 'Historial de conversación eliminado correctamente',
            data: {
                branchId,
                branchName: branch.name,
                clientId
            }
        });
    } catch (error) {
        logger.error('Error clearing conversation history:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

module.exports = router;
