const BusinessKnowledgeBase = require('../models/BusinessKnowledgeBase');
const Business = require('../models/Business');
const Branch = require('../models/Branch');

class BusinessKnowledgeService {
    constructor() {
        this.knowledgeCache = new Map();
    }

    // Obtener o crear base de conocimiento
    async getOrCreateKnowledgeBase(businessId, branchId) {
        try {
            let knowledgeBase = await BusinessKnowledgeBase.findOne({
                businessId,
                branchId
            });

            if (!knowledgeBase) {
                // Obtener información del negocio y sucursal
                const business = await Business.findById(businessId);
                const branch = await Branch.findById(branchId);

                knowledgeBase = new BusinessKnowledgeBase({
                    businessId,
                    branchId,
                    businessInfo: {
                        name: business?.name || 'Negocio',
                        type: business?.type || 'restaurant',
                        description: business?.description || 'Un lugar delicioso para comer',
                        specialties: business?.specialties || [],
                        atmosphere: business?.atmosphere || 'acogedor',
                        targetAudience: business?.targetAudience || ['familias', 'jóvenes', 'profesionales']
                    },
                    products: [],
                    services: [],
                    policies: {
                        delivery: {
                            available: true,
                            minimumOrder: 15000,
                            deliveryFee: 3000,
                            deliveryTime: '30-45 minutos',
                            coverage: ['Zona centro', 'Zona norte']
                        },
                        payment: {
                            methods: ['Efectivo', 'Tarjeta', 'Transferencia'],
                            tips: 'Las propinas son opcionales pero apreciadas',
                            discounts: ['Estudiantes', 'Adultos mayores']
                        },
                        specialRequests: {
                            allowed: true,
                            limitations: ['Sin modificaciones en platos especiales'],
                            additionalFees: 'Pueden aplicar cargos adicionales'
                        }
                    },
                    operations: {
                        hours: {
                            monday: '7:00 AM - 10:00 PM',
                            tuesday: '7:00 AM - 10:00 PM',
                            wednesday: '7:00 AM - 10:00 PM',
                            thursday: '7:00 AM - 10:00 PM',
                            friday: '7:00 AM - 11:00 PM',
                            saturday: '8:00 AM - 11:00 PM',
                            sunday: '8:00 AM - 9:00 PM'
                        },
                        contact: {
                            phone: branch?.phone || 'No disponible',
                            email: business?.email || 'No disponible',
                            address: branch?.address || 'No disponible',
                            socialMedia: business?.socialMedia || []
                        },
                        capacity: {
                            indoor: branch?.capacity?.indoor || 50,
                            outdoor: branch?.capacity?.outdoor || 20,
                            delivery: true
                        }
                    },
                    faqs: [
                        {
                            question: "¿Hacen delivery?",
                            answer: "Sí, hacemos delivery a toda la zona. El tiempo de entrega es de 30-45 minutos y el costo es de $3,000.",
                            category: "delivery",
                            keywords: ["delivery", "domicilio", "entrega", "envío"]
                        },
                        {
                            question: "¿Cuáles son sus horarios?",
                            answer: "Estamos abiertos de lunes a jueves de 7:00 AM a 10:00 PM, viernes y sábado hasta las 11:00 PM, y domingos hasta las 9:00 PM.",
                            category: "horarios",
                            keywords: ["horarios", "horario", "abierto", "cerrado", "cuándo"]
                        },
                        {
                            question: "¿Aceptan tarjetas?",
                            answer: "Sí, aceptamos efectivo, tarjeta de crédito/débito y transferencias bancarias.",
                            category: "pago",
                            keywords: ["tarjeta", "pago", "efectivo", "transferencia", "dinero"]
                        },
                        {
                            question: "¿Tienen opciones vegetarianas?",
                            answer: "Sí, tenemos varias opciones vegetarianas y veganas en nuestro menú. Puedes pedir modificaciones especiales.",
                            category: "dietas",
                            keywords: ["vegetariano", "vegano", "dieta", "sin carne", "opciones"]
                        }
                    ],
                    conversationScenarios: [
                        {
                            trigger: "hola",
                            context: "greeting",
                            response: "¡Hola! Bienvenido a nuestro restaurante. ¿En qué puedo ayudarte hoy?",
                            followUp: ["menú", "horarios", "delivery", "reservas"]
                        },
                        {
                            trigger: "menú",
                            context: "menu_request",
                            response: "Te voy a mostrar nuestro menú completo. ¿Hay algo específico que te interese?",
                            followUp: ["desayunos", "almuerzos", "bebidas", "postres"]
                        },
                        {
                            trigger: "delivery",
                            context: "delivery_inquiry",
                            response: "Sí, hacemos delivery. El costo es de $3,000 y el tiempo de entrega es de 30-45 minutos.",
                            followUp: ["zona", "tiempo", "costo", "pedido"]
                        }
                    ]
                });

                await knowledgeBase.save();
            }

            return knowledgeBase;
        } catch (error) {
            console.error('Error getting/creating knowledge base:', error);
            throw error;
        }
    }

    // Buscar respuesta en FAQs
    async findFAQAnswer(question, businessId, branchId) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            const questionLower = question.toLowerCase();

            // Buscar por palabras clave
            for (const faq of knowledgeBase.faqs) {
                for (const keyword of faq.keywords) {
                    if (questionLower.includes(keyword.toLowerCase())) {
                        return {
                            answer: faq.answer,
                            category: faq.category,
                            confidence: 0.8
                        };
                    }
                }
            }

            // Buscar por similitud en la pregunta
            for (const faq of knowledgeBase.faqs) {
                const faqLower = faq.question.toLowerCase();
                if (this.calculateSimilarity(questionLower, faqLower) > 0.6) {
                    return {
                        answer: faq.answer,
                        category: faq.category,
                        confidence: 0.7
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding FAQ answer:', error);
            return null;
        }
    }

    // Obtener información de productos
    async getProductInfo(productName, businessId, branchId) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            const productNameLower = productName.toLowerCase();

            for (const product of knowledgeBase.products) {
                if (product.name.toLowerCase().includes(productNameLower) || 
                    productNameLower.includes(product.name.toLowerCase())) {
                    return product;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting product info:', error);
            return null;
        }
    }

    // Obtener información operativa
    async getOperationalInfo(infoType, businessId, branchId) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            
            switch (infoType) {
                case 'hours':
                    return knowledgeBase.operations.hours;
                case 'contact':
                    return knowledgeBase.operations.contact;
                case 'delivery':
                    return knowledgeBase.policies.delivery;
                case 'payment':
                    return knowledgeBase.policies.payment;
                default:
                    return null;
            }
        } catch (error) {
            console.error('Error getting operational info:', error);
            return null;
        }
    }

    // Generar respuesta contextual
    async generateContextualResponse(intent, context, businessId, branchId) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            
            // Buscar escenario de conversación
            for (const scenario of knowledgeBase.conversationScenarios) {
                if (scenario.context === intent) {
                    return {
                        response: scenario.response,
                        followUp: scenario.followUp,
                        confidence: 0.9
                    };
                }
            }

            // Respuestas por defecto según intención
            const defaultResponses = {
                greeting: "¡Hola! Bienvenido a nuestro restaurante. ¿En qué puedo ayudarte hoy?",
                menu_request: "Te voy a mostrar nuestro menú completo. ¿Hay algo específico que te interese?",
                delivery_inquiry: "Sí, hacemos delivery. ¿Te gustaría conocer más detalles?",
                hours_inquiry: "Estamos abiertos de lunes a domingo. ¿Te gustaría saber los horarios específicos?",
                payment_inquiry: "Aceptamos efectivo, tarjeta y transferencias. ¿Necesitas más información?",
                complaint: "Lamento mucho que hayas tenido una mala experiencia. ¿Podrías contarme qué pasó?",
                compliment: "¡Muchas gracias! Me alegra saber que disfrutaste tu experiencia con nosotros."
            };

            return {
                response: defaultResponses[intent] || "¿En qué más puedo ayudarte?",
                followUp: [],
                confidence: 0.5
            };
        } catch (error) {
            console.error('Error generating contextual response:', error);
            return {
                response: "¿En qué puedo ayudarte?",
                followUp: [],
                confidence: 0.3
            };
        }
    }

    // Calcular similitud entre textos
    calculateSimilarity(text1, text2) {
        const words1 = text1.split(' ');
        const words2 = text2.split(' ');
        
        let commonWords = 0;
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2) {
                    commonWords++;
                    break;
                }
            }
        }
        
        return commonWords / Math.max(words1.length, words2.length);
    }

    // Actualizar base de conocimiento
    async updateKnowledgeBase(businessId, branchId, updates) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            
            // Actualizar campos específicos
            if (updates.products) {
                knowledgeBase.products = updates.products;
            }
            if (updates.faqs) {
                knowledgeBase.faqs = updates.faqs;
            }
            if (updates.policies) {
                knowledgeBase.policies = { ...knowledgeBase.policies, ...updates.policies };
            }
            if (updates.operations) {
                knowledgeBase.operations = { ...knowledgeBase.operations, ...updates.operations };
            }

            await knowledgeBase.save();
            return knowledgeBase;
        } catch (error) {
            console.error('Error updating knowledge base:', error);
            throw error;
        }
    }

    // Obtener estadísticas de la base de conocimiento
    async getKnowledgeStats(businessId, branchId) {
        try {
            const knowledgeBase = await this.getOrCreateKnowledgeBase(businessId, branchId);
            
            return {
                totalProducts: knowledgeBase.products.length,
                totalFAQs: knowledgeBase.faqs.length,
                totalScenarios: knowledgeBase.conversationScenarios.length,
                lastUpdated: knowledgeBase.updatedAt,
                businessType: knowledgeBase.businessInfo.type
            };
        } catch (error) {
            console.error('Error getting knowledge stats:', error);
            return null;
        }
    }
}

module.exports = BusinessKnowledgeService;



