const ConversationMemory = require('../models/ConversationMemory');
const RestaurantPersonalitySystem = require('./RestaurantPersonalitySystem');
const BusinessKnowledgeService = require('./BusinessKnowledgeService');

class ConversationalMemoryService {
    constructor() {
        this.personalitySystem = new RestaurantPersonalitySystem();
        this.knowledgeService = new BusinessKnowledgeService();
    }

    // Obtener o crear memoria conversacional
    async getOrCreateMemory(phoneNumber, branchId, businessId) {
        try {
            let memory = await ConversationMemory.findOne({
                phoneNumber,
                branchId,
                businessId
            });

            if (!memory) {
                memory = new ConversationMemory({
                    phoneNumber,
                    branchId,
                    businessId,
                    clientInfo: {
                        visitFrequency: 'first_time'
                    },
                    currentContext: {
                        conversationStage: 'greeting',
                        messageCount: 0
                    },
                    emotionalState: {
                        satisfaction: 5,
                        trust: 5,
                        engagement: 5
                    }
                });
                await memory.save();
            }

            return memory;
        } catch (error) {
            console.error('Error getting/creating memory:', error);
            throw error;
        }
    }

    // Actualizar contexto de la conversación
    async updateConversationContext(phoneNumber, branchId, businessId, userMessage, botResponse, intent, sentiment) {
        try {
            const memory = await this.getOrCreateMemory(phoneNumber, branchId, businessId);
            
            // Actualizar información del cliente
            if (intent === 'greeting' && memory.clientInfo.visitFrequency === 'first_time') {
                memory.clientInfo.visitFrequency = 'occasional';
            }

            // Actualizar contexto actual
            memory.currentContext.intent = intent;
            memory.currentContext.mood = sentiment;
            memory.currentContext.lastMessage = userMessage;
            memory.currentContext.messageCount += 1;

            // Determinar etapa de la conversación
            memory.currentContext.conversationStage = this.determineConversationStage(intent, memory.currentContext.conversationStage);

            // Agregar al historial
            memory.conversationHistory.push({
                userMessage,
                botResponse,
                intent,
                sentiment,
                resolved: true
            });

            // Mantener solo los últimos 50 mensajes
            if (memory.conversationHistory.length > 50) {
                memory.conversationHistory = memory.conversationHistory.slice(-50);
            }

            // Actualizar estado emocional
            this.updateEmotionalState(memory, sentiment, intent);

            await memory.save();
            return memory;
        } catch (error) {
            console.error('Error updating conversation context:', error);
            throw error;
        }
    }

    // Determinar etapa de la conversación
    determineConversationStage(intent, currentStage) {
        const stageFlow = {
            greeting: ['browsing', 'asking_info'],
            browsing: ['ordering', 'asking_info', 'recommendation'],
            ordering: ['customizing', 'confirming'],
            customizing: ['confirming'],
            confirming: ['greeting'],
            asking_info: ['browsing', 'ordering'],
            recommendation: ['ordering', 'browsing'],
            complaint: ['greeting'],
            cancellation: ['greeting']
        };

        const possibleStages = stageFlow[currentStage] || ['greeting'];
        
        if (possibleStages.includes(intent)) {
            return intent;
        }

        return currentStage;
    }

    // Actualizar estado emocional
    updateEmotionalState(memory, sentiment, intent) {
        const emotionalImpact = {
            happy: { satisfaction: 1, trust: 1, engagement: 1 },
            neutral: { satisfaction: 0, trust: 0, engagement: 0 },
            confused: { satisfaction: -1, trust: 0, engagement: 1 },
            concerned: { satisfaction: -2, trust: -1, engagement: 1 },
            excited: { satisfaction: 2, trust: 1, engagement: 2 }
        };

        const impact = emotionalImpact[sentiment] || emotionalImpact.neutral;

        // Aplicar impacto
        memory.emotionalState.satisfaction = Math.max(1, Math.min(10, 
            memory.emotionalState.satisfaction + impact.satisfaction));
        memory.emotionalState.trust = Math.max(1, Math.min(10, 
            memory.emotionalState.trust + impact.trust));
        memory.emotionalState.engagement = Math.max(1, Math.min(10, 
            memory.emotionalState.engagement + impact.engagement));

        // Bonificación por intenciones positivas
        if (['order', 'recommendation', 'confirmation'].includes(intent)) {
            memory.emotionalState.satisfaction = Math.min(10, memory.emotionalState.satisfaction + 1);
            memory.emotionalState.trust = Math.min(10, memory.emotionalState.trust + 1);
        }
    }

    // Generar respuesta personalizada
    async generatePersonalizedResponse(phoneNumber, branchId, businessId, userMessage, businessType) {
        try {
            // Obtener memoria
            const memory = await this.getOrCreateMemory(phoneNumber, branchId, businessId);
            
            // Analizar mensaje
            const sentiment = this.personalitySystem.analyzeSentiment(userMessage);
            const intent = this.personalitySystem.detectIntent(userMessage);
            
            // Obtener personalidad
            const personality = this.personalitySystem.getPersonality(businessType);
            
            // Buscar respuesta en base de conocimiento
            let knowledgeResponse = null;
            if (intent === 'information' || intent === 'menu_request' || intent === 'delivery_inquiry') {
                knowledgeResponse = await this.knowledgeService.findFAQAnswer(userMessage, businessId, branchId);
            }
            
            // Generar respuesta contextual desde base de conocimiento
            let contextualResponse = null;
            if (!knowledgeResponse) {
                contextualResponse = await this.knowledgeService.generateContextualResponse(intent, memory.currentContext, businessId, branchId);
            }
            
            // Generar respuesta personalizada
            let response = '';
            if (knowledgeResponse) {
                response = knowledgeResponse.answer;
            } else if (contextualResponse && contextualResponse.confidence > 0.7) {
                response = contextualResponse.response;
            } else {
                response = this.personalitySystem.generateEmotionalResponse(
                    personality, 
                    sentiment, 
                    intent, 
                    { clientInfo: memory.clientInfo, context: memory.currentContext }
                );
            }
            
            // Personalizar respuesta según el cliente
            response = this.personalizeResponse(response, memory, personality);

            // Actualizar memoria
            await this.updateConversationContext(
                phoneNumber, 
                branchId, 
                businessId, 
                userMessage, 
                response, 
                intent, 
                sentiment
            );

            return {
                response,
                intent,
                sentiment,
                personality: personality.name,
                context: memory.currentContext,
                emotionalState: memory.emotionalState,
                knowledgeSource: knowledgeResponse ? 'faq' : contextualResponse ? 'contextual' : 'personality'
            };
        } catch (error) {
            console.error('Error generating personalized response:', error);
            throw error;
        }
    }

    // Personalizar respuesta según el cliente
    personalizeResponse(response, memory, personality) {
        let personalizedResponse = response;
        
        // Personalizar según frecuencia de visita
        if (memory.clientInfo.visitFrequency === 'regular') {
            personalizedResponse = personalizedResponse.replace('Hola', '¡Hola de nuevo!');
        } else if (memory.clientInfo.visitFrequency === 'vip') {
            personalizedResponse = `¡Hola! 😊 Soy ${personality.name}, tu asistente personal. ` + personalizedResponse;
        }
        
        // Personalizar según estado emocional
        if (memory.emotionalState.satisfaction >= 8) {
            personalizedResponse += " ¡Me alegra verte tan contento! 😊";
        } else if (memory.emotionalState.satisfaction <= 4) {
            personalizedResponse += " Espero poder mejorar tu experiencia hoy 🤝";
        }
        
        // Personalizar según confianza
        if (memory.emotionalState.trust >= 8) {
            personalizedResponse = personalizedResponse.replace('puedo ayudarte', 'puedo ayudarte como siempre');
        }
        
        return personalizedResponse;
    }

    // Obtener contexto del cliente
    async getClientContext(phoneNumber, branchId, businessId) {
        try {
            const memory = await this.getOrCreateMemory(phoneNumber, branchId, businessId);
            return {
                clientInfo: memory.clientInfo,
                currentContext: memory.currentContext,
                emotionalState: memory.emotionalState,
                conversationHistory: memory.conversationHistory.slice(-10) // Últimos 10 mensajes
            };
        } catch (error) {
            console.error('Error getting client context:', error);
            throw error;
        }
    }

    // Actualizar preferencias del cliente
    async updateClientPreferences(phoneNumber, branchId, businessId, preferences) {
        try {
            const memory = await this.getOrCreateMemory(phoneNumber, branchId, businessId);
            
            if (preferences.items) {
                memory.clientInfo.favoriteItems = preferences.items;
            }
            if (preferences.dietaryRestrictions) {
                memory.clientInfo.dietaryRestrictions = preferences.dietaryRestrictions;
            }
            if (preferences.lastOrder) {
                memory.clientInfo.lastOrder = preferences.lastOrder;
            }

            await memory.save();
            return memory;
        } catch (error) {
            console.error('Error updating client preferences:', error);
            throw error;
        }
    }

    // Obtener estadísticas de conversación
    async getConversationStats(phoneNumber, branchId, businessId) {
        try {
            const memory = await this.getOrCreateMemory(phoneNumber, branchId, businessId);
            
            const stats = {
                totalMessages: memory.currentContext.messageCount,
                visitFrequency: memory.clientInfo.visitFrequency,
                satisfaction: memory.emotionalState.satisfaction,
                trust: memory.emotionalState.trust,
                engagement: memory.emotionalState.engagement,
                currentStage: memory.currentContext.conversationStage,
                lastInteraction: memory.updatedAt
            };

            return stats;
        } catch (error) {
            console.error('Error getting conversation stats:', error);
            throw error;
        }
    }
}

module.exports = ConversationalMemoryService;
