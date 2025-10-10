const BranchAIConfig = require('../models/BranchAIConfig');
const Branch = require('../models/Branch');
const LoggerService = require('../services/LoggerService');
const PDFParserService = require('../services/PDFParserService');
const path = require('path');
const fs = require('fs');

class BranchAIConfigController {
    constructor() {
        this.logger = new LoggerService('branch-ai-config');
        this.pdfParser = new PDFParserService();
    }

    // Crear o actualizar configuración de IA para una sucursal
    async createOrUpdateConfig(req, res) {
        try {
            const { branchId } = req.params;
            
            console.log('🤖 ===== CONFIGURANDO IA PARA SUCURSAL =====');
            console.log('🏪 Branch ID:', branchId);
            console.log('👤 User info:', req.user);
            console.log('📁 File uploaded:', req.file ? req.file.filename : 'No file');
            console.log('📊 Content-Type:', req.headers['content-type']);
            console.log('==========================================');

            // Verificar que la sucursal existe
            const branch = await Branch.findById(branchId);
            if (!branch) {
                return res.status(404).json({
                    success: false,
                    error: 'Sucursal no encontrada'
                });
            }

            // Buscar el usuario real en la base de datos
            const User = require('../models/user');
            const user = await User.findOne({ userId: req.user.userId });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Usuario no encontrado'
                });
            }
            
            console.log('👤 Usuario encontrado:', user._id, user.name);

            // Determinar si es FormData o JSON
            let configData = {};
            let pdfFile = null;

            if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
                // Es FormData - extraer datos del body
                configData = {
                    customPrompt: req.body.customPrompt || '',
                    businessSettings: req.body.businessSettings ? JSON.parse(req.body.businessSettings) : {}
                };
                pdfFile = req.file;
                console.log('📄 PDF File:', pdfFile ? pdfFile.filename : 'No PDF');
            } else {
                // Es JSON
                configData = req.body;
                console.log('📊 Config Data (JSON):', JSON.stringify(configData, null, 2));
            }

            // Buscar configuración existente
            let config = await BranchAIConfig.findOne({ branchId });
            
            if (config) {
                // Actualizar configuración existente
                Object.assign(config, configData);
                config.lastUpdated = new Date();
                
                // Procesar PDF si se subió
                if (pdfFile) {
                    await this.processPDFFile(config, pdfFile);
                }
                
                await config.save();
                
                // Actualizar el servicio de IA con la nueva configuración
                await this.updateAIService(branchId, config);
                
                console.log('✅ Configuración actualizada para sucursal:', branchId);
            } else {
                // Crear nueva configuración
                config = new BranchAIConfig({
                    branchId,
                    ...configData,
                    createdBy: user._id
                });
                
                // Procesar PDF si se subió
                if (pdfFile) {
                    await this.processPDFFile(config, pdfFile);
                }
                
                await config.save();
                
                // Actualizar el servicio de IA con la nueva configuración
                await this.updateAIService(branchId, config);
                
                console.log('✅ Nueva configuración creada para sucursal:', branchId);
            }

            this.logger.info('Branch AI config created/updated', { 
                branchId, 
                userId: req.user.id 
            });

            res.json({
                success: true,
                message: 'Configuración de IA guardada exitosamente',
                data: config
            });

        } catch (error) {
            console.error('❌ Error configurando IA:', error);
            this.logger.error('Error creating/updating branch AI config', { 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                error: 'Error al guardar la configuración de IA'
            });
        }
    }

    // Obtener configuración de IA de una sucursal
    async getConfig(req, res) {
        try {
            const { branchId } = req.params;

            const config = await BranchAIConfig.findOne({ branchId })
                .populate('branchId', 'name address phone')
                .populate('createdBy', 'name email');

            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'Configuración de IA no encontrada'
                });
            }

            res.json({
                success: true,
                data: config
            });

        } catch (error) {
            this.logger.error('Error getting branch AI config', { 
                branchId: req.params.branchId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                error: 'Error al obtener la configuración de IA'
            });
        }
    }

    // Subir y procesar menú PDF
    async uploadMenuPDF(req, res) {
        try {
            const { branchId } = req.params;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No se ha subido ningún archivo PDF'
                });
            }

            console.log('📄 ===== PROCESANDO MENÚ PDF =====');
            console.log('🏪 Branch ID:', branchId);
            console.log('📁 File:', req.file.filename);
            console.log('==================================');

            // Buscar o crear configuración
            let config = await BranchAIConfig.findOne({ branchId });
            if (!config) {
                config = new BranchAIConfig({
                    branchId,
                    createdBy: req.user.id
                });
            }

            // Guardar información del archivo
            config.files.menuPDF = {
                filename: req.file.filename,
                path: req.file.path,
                uploadedAt: new Date(),
                processed: false
            };

            // Procesar el PDF para extraer contenido
            try {
                const pdfContent = await this.pdfParser.extractText(req.file.path);
                
                // Procesar contenido para crear estructura de menú
                const menuContent = this.processMenuContent(pdfContent);
                
                config.menuContent = menuContent;
                config.files.menuPDF.processed = true;
                
                console.log('✅ PDF procesado exitosamente');
                console.log('📊 Contenido extraído:', menuContent.substring(0, 200) + '...');
                
            } catch (pdfError) {
                console.error('❌ Error procesando PDF:', pdfError);
                config.files.menuPDF.processed = false;
            }

            await config.save();

            this.logger.info('Menu PDF uploaded and processed', { 
                branchId, 
                filename: req.file.filename 
            });

            res.json({
                success: true,
                message: 'Menú PDF subido y procesado exitosamente',
                data: {
                    filename: req.file.filename,
                    processed: config.files.menuPDF.processed,
                    menuContent: config.menuContent
                }
            });

        } catch (error) {
            console.error('❌ Error subiendo PDF:', error);
            this.logger.error('Error uploading menu PDF', { 
                branchId: req.params.branchId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                error: 'Error al procesar el archivo PDF'
            });
        }
    }

    // Procesar archivo PDF subido
    async processPDFFile(config, pdfFile) {
        try {
            console.log('📄 Procesando archivo PDF:', pdfFile.filename);
            
            // Guardar información del archivo
            config.files.menuPDF = {
                filename: pdfFile.filename,
                path: pdfFile.path,
                uploadedAt: new Date(),
                processed: false
            };

            // Procesar el PDF para extraer contenido
            try {
                const pdfContent = await this.pdfParser.extractTextFromPDF(pdfFile.path);
                
                // Procesar contenido para crear estructura de menú
                const menuContent = this.processMenuContent(pdfContent.text);
                
                config.menuContent = menuContent;
                config.files.menuPDF.processed = true;
                
                console.log('✅ PDF procesado exitosamente');
                console.log('📊 Contenido extraído:', menuContent.substring(0, 200) + '...');
                
            } catch (pdfError) {
                console.error('❌ Error procesando PDF:', pdfError);
                config.files.menuPDF.processed = false;
            }
            
        } catch (error) {
            console.error('❌ Error procesando archivo PDF:', error);
        }
    }

    // Procesar contenido del menú para crear estructura
    processMenuContent(pdfContent) {
        try {
            // Limpiar y estructurar el contenido del PDF
            let processedContent = pdfContent
                .replace(/\s+/g, ' ') // Normalizar espacios
                .replace(/\n+/g, '\n') // Normalizar saltos de línea
                .trim();

            // Buscar patrones comunes de menús
            const menuPatterns = [
                /MENÚ|MENU|CARTA/i,
                /ENTRADAS|APPETIZERS/i,
                /PLATOS PRINCIPALES|MAIN COURSES/i,
                /POSTRES|DESSERTS/i,
                /BEBIDAS|DRINKS/i,
                /PRECIOS|PRICES/i
            ];

            let structuredContent = 'MENÚ DE LA SUCURSAL:\n\n';
            
            // Dividir por secciones si se encuentran patrones
            let sections = [processedContent];
            menuPatterns.forEach(pattern => {
                const matches = processedContent.match(pattern);
                if (matches) {
                    // Dividir contenido por secciones
                    const parts = processedContent.split(pattern);
                    if (parts.length > 1) {
                        sections = parts.filter(part => part.trim().length > 0);
                    }
                }
            });

            // Procesar cada sección
            sections.forEach((section, index) => {
                if (section.trim().length > 10) {
                    structuredContent += `SECCIÓN ${index + 1}:\n${section.trim()}\n\n`;
                }
            });

            return structuredContent;

        } catch (error) {
            console.error('Error procesando contenido del menú:', error);
            return pdfContent; // Devolver contenido original si falla el procesamiento
        }
    }

    // Obtener todas las configuraciones
    async getAllConfigs(req, res) {
        try {
            const configs = await BranchAIConfig.find({ isActive: true })
                .populate('branchId', 'name address phone')
                .populate('createdBy', 'name email')
                .sort({ lastUpdated: -1 });

            res.json({
                success: true,
                data: configs
            });

        } catch (error) {
            this.logger.error('Error getting all AI configs', { error: error.message });
            
            res.status(500).json({
                success: false,
                error: 'Error al obtener las configuraciones de IA'
            });
        }
    }

    // Eliminar configuración
    async deleteConfig(req, res) {
        try {
            const { branchId } = req.params;

            const config = await BranchAIConfig.findOne({ branchId });
            if (!config) {
                return res.status(404).json({
                    success: false,
                    error: 'Configuración no encontrada'
                });
            }

            // Eliminar archivos asociados
            if (config.files.menuPDF.path) {
                try {
                    fs.unlinkSync(config.files.menuPDF.path);
                } catch (fileError) {
                    console.warn('No se pudo eliminar archivo PDF:', fileError.message);
                }
            }

            await BranchAIConfig.findByIdAndDelete(config._id);

            this.logger.info('Branch AI config deleted', { branchId });

            res.json({
                success: true,
                message: 'Configuración eliminada exitosamente'
            });

        } catch (error) {
            this.logger.error('Error deleting branch AI config', { 
                branchId: req.params.branchId, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                error: 'Error al eliminar la configuración'
            });
        }
    }

    // Actualizar el servicio de IA con la configuración de la sucursal
    async updateAIService(branchId, config) {
        try {
            console.log('🤖 ===== ACTUALIZANDO SERVICIO DE IA =====');
            console.log('🏪 Branch ID:', branchId);
            console.log('📋 Menu Content:', config.menuContent ? 'Disponible' : 'No disponible');
            console.log('🎯 Custom Prompt:', config.customPrompt ? 'Disponible' : 'No disponible');
            console.log('==========================================');

            // Obtener el servicio de IA del WhatsAppController
            const WhatsAppController = require('./WhatsAppController');
            const whatsappController = new WhatsAppController();
            
            // Actualizar el contenido del menú en el servicio de IA
            if (config.menuContent) {
                whatsappController.aiService.setMenuContent(branchId, config.menuContent);
                console.log('✅ Contenido del menú actualizado en IA');
            }
            
            // Actualizar el prompt personalizado en el servicio de IA
            if (config.customPrompt) {
                whatsappController.aiService.setAIPrompt(branchId, config.customPrompt);
                console.log('✅ Prompt personalizado actualizado en IA');
            }
            
            console.log('✅ Servicio de IA actualizado exitosamente');
            
        } catch (error) {
            console.error('❌ Error actualizando servicio de IA:', error);
            // No lanzar error para no interrumpir el guardado de la configuración
        }
    }
}

module.exports = BranchAIConfigController;
