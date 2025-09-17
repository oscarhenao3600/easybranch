const RecommendationSession = require('../models/RecommendationSession');
const BranchAIConfig = require('../models/BranchAIConfig');

class RecommendationService {
    constructor() {
        this.questionBank = [
            {
                id: 'budget',
                question: '¿Cuál es tu presupuesto aproximado para esta comida? 💰',
                type: 'budget_range',
                options: [
                    'Menos de $15,000',
                    '$15,000 - $25,000',
                    '$25,000 - $40,000',
                    '$40,000 - $60,000',
                    'Más de $60,000'
                ],
                weight: 10
            },
            {
                id: 'meal_type',
                question: '¿Qué tipo de comida prefieres? 🍽️',
                type: 'single_choice',
                options: [
                    'Desayuno',
                    'Almuerzo',
                    'Cena',
                    'Snack/Merienda',
                    'Cualquiera'
                ],
                weight: 8
            },
            {
                id: 'dietary_restrictions',
                question: '¿Tienes alguna restricción alimentaria? 🥗',
                type: 'multiple_choice',
                options: [
                    'Vegetariano',
                    'Vegano',
                    'Sin gluten',
                    'Sin lactosa',
                    'Halal',
                    'Kosher',
                    'Ninguna'
                ],
                weight: 9
            },
            {
                id: 'cuisine_preference',
                question: '¿Qué tipo de cocina prefieres? 🌮',
                type: 'single_choice',
                options: [
                    'Colombiana',
                    'Internacional',
                    'Italiana',
                    'Asiática',
                    'Mexicana',
                    'Cualquiera'
                ],
                weight: 6
            },
            {
                id: 'special_occasion',
                question: '¿Es para alguna ocasión especial? 🎉',
                type: 'single_choice',
                options: [
                    'Comida casual',
                    'Cita romántica',
                    'Celebración',
                    'Reunión de trabajo',
                    'Solo comer'
                ],
                weight: 3
            }
        ];
    }

    // Crear nueva sesión de recomendación
    async createSession(phoneNumber, branchId, businessId, peopleCount = 1) {
        const sessionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const session = new RecommendationSession({
            sessionId,
            phoneNumber,
            branchId,
            businessId,
            status: 'active',
            currentStep: 0,
            maxSteps: 5,
            peopleCount: peopleCount
        });

        await session.save();
        console.log(`✅ Sesión creada para ${peopleCount} persona(s)`);
        return session;
    }

    // Obtener siguiente pregunta
    async getNextQuestion(sessionId) {
        const session = await RecommendationSession.findOne({ sessionId });
        if (!session) {
            throw new Error('Sesión no encontrada');
        }

        if (session.status !== 'active') {
            throw new Error('Sesión no activa');
        }

        if (session.currentStep >= session.maxSteps) {
            return await this.generateRecommendations(session);
        }

        // Seleccionar pregunta inteligente basada en respuestas anteriores
        const nextQuestion = this.selectNextQuestion(session);
        
        return {
            type: 'question',
            question: this.getQuestionTextVariant(nextQuestion.id, nextQuestion.question, session),
            options: nextQuestion.options,
            sessionId: session.sessionId,
            step: session.currentStep + 1,
            totalSteps: session.maxSteps
        };
    }

    // Seleccionar siguiente pregunta de manera inteligente (con variación determinística por sesión)
    selectNextQuestion(session) {
        const answeredQuestions = session.responses.map(r => r.questionId);
        const availableQuestions = this.questionBank.filter(q => !answeredQuestions.includes(q.id));
        
        if (availableQuestions.length === 0) {
            return null; // No hay más preguntas
        }

        // Secuencia base
        const baseSequence = ['budget', 'meal_type', 'dietary_restrictions', 'cuisine_preference', 'special_occasion'];
        
        // Rotación basada en peopleCount y una semilla del sessionId
        const seedChar = session.sessionId && session.sessionId.length > 0 ? session.sessionId.charCodeAt(0) : 0;
        const rotation = ((session.peopleCount || 1) + seedChar) % baseSequence.length;
        const rotated = baseSequence.slice(rotation).concat(baseSequence.slice(0, rotation));
        
        for (const questionId of rotated) {
            if (!answeredQuestions.includes(questionId)) {
                const question = availableQuestions.find(q => q.id === questionId);
                if (question) return question;
            }
        }
        
        // Si no se encuentra en la secuencia, tomar la primera disponible
        return availableQuestions[0];
    }

    // Variantes de texto para cada pregunta
    getQuestionTextVariant(questionId, fallback, session) {
        const variants = {
            budget: [
                '¿Cuál es tu presupuesto aproximado para esta comida? 💰',
                'Para esta ocasión, ¿qué presupuesto tienes en mente? 💵',
                'Para saber qué recomendarte, ¿cuál es tu presupuesto? 💸'
            ],
            meal_type: [
                '¿Qué tipo de comida prefieres? 🍽️',
                '¿Qué te antoja más ahora mismo? 🍛',
                'Pensando en el momento, ¿qué tipo de comida quieres? 🥗'
            ],
            dietary_restrictions: [
                '¿Tienes alguna restricción alimentaria? 🥗',
                '¿Debo tener en cuenta alguna preferencia o restricción? ✅',
                '¿Comes de todo o prefieres evitar algo? 🚫'
            ],
            cuisine_preference: [
                '¿Qué tipo de cocina prefieres? 🌮',
                '¿Te gusta más cocina colombiana u otra? 🍝',
                '¿Qué estilo de comida te provoca? 🍣'
            ],
            special_occasion: [
                '¿Es para alguna ocasión especial? 🎉',
                '¿La salida es casual o algo especial? ✨',
                '¿Hay alguna ocasión particular para este plan? 🎈'
            ]
        };

        const pool = variants[questionId];
        if (!pool || pool.length === 0) return fallback;
        const seedChar = session.sessionId && session.sessionId.length > 1 ? session.sessionId.charCodeAt(1) : 0;
        const idx = ((session.peopleCount || 1) + seedChar) % pool.length;
        return pool[idx];
    }

    // Procesar respuesta del usuario
    async processAnswer(sessionId, answer) {
        const session = await RecommendationSession.findOne({ sessionId });
        if (!session) {
            throw new Error('Sesión no encontrada');
        }

        // Obtener la pregunta actual basada en el paso
        const currentQuestion = this.selectNextQuestion(session);
        if (!currentQuestion) {
            throw new Error('No hay pregunta disponible');
        }

        // Agregar respuesta
        session.responses.push({
            questionId: currentQuestion.id,
            question: currentQuestion.question,
            answer
        });

        // Actualizar preferencias basadas en la respuesta
        this.updatePreferences(session, currentQuestion.id, answer);

        session.currentStep++;
        await session.save();

        return session;
    }

    // Actualizar preferencias del usuario
    updatePreferences(session, questionId, answer) {
        const question = this.questionBank.find(q => q.id === questionId);
        if (!question) return;

        // Convertir respuesta numérica a texto
        let answerText = answer;
        if (/^\d+$/.test(answer)) {
            const optionIndex = parseInt(answer) - 1;
            if (optionIndex >= 0 && optionIndex < question.options.length) {
                answerText = question.options[optionIndex];
            }
        }

        console.log(`🔄 Mapeando respuesta: "${answer}" -> "${answerText}"`);

        switch (questionId) {
            case 'budget':
                const budgetRanges = {
                    'Menos de $15,000': { min: 0, max: 15000 },
                    '$15,000 - $25,000': { min: 15000, max: 25000 },
                    '$25,000 - $40,000': { min: 25000, max: 40000 },
                    '$40,000 - $60,000': { min: 40000, max: 60000 },
                    'Más de $60,000': { min: 60000, max: 999999 }
                };
                session.preferences.budget = budgetRanges[answerText] || { min: 0, max: 50000 };
                console.log(`💰 Presupuesto establecido:`, session.preferences.budget);
                break;

            case 'meal_type':
                session.preferences.mealType = answerText.toLowerCase();
                console.log(`🍽️ Tipo de comida:`, session.preferences.mealType);
                break;

            case 'dietary_restrictions':
                if (answerText !== 'Ninguna') {
                    session.preferences.dietaryRestrictions.push(answerText);
                }
                console.log(`🥗 Restricciones:`, session.preferences.dietaryRestrictions);
                break;

            case 'cuisine_preference':
                session.preferences.cuisinePreferences.push(answerText);
                console.log(`🌮 Preferencias de cocina:`, session.preferences.cuisinePreferences);
                break;

            case 'special_occasion':
                session.preferences.specialOccasion = answerText.toLowerCase();
                console.log(`🎉 Ocasión especial:`, session.preferences.specialOccasion);
                break;
        }
    }

    // Generar recomendaciones finales
    async generateRecommendations(session) {
        try {
            console.log('🎯 ===== GENERANDO RECOMENDACIONES =====');
            console.log('📱 Session ID:', session.sessionId);
            console.log('🏪 Branch ID:', session.branchId);
            console.log('📊 Respuestas:', session.responses.length);
            console.log('💭 Preferencias:', JSON.stringify(session.preferences, null, 2));

            // Obtener configuración de IA de la sucursal
            const branchAIConfig = await BranchAIConfig.findOne({ branchId: session.branchId });
            if (!branchAIConfig || !branchAIConfig.menuContent) {
                console.error('❌ No se encontró configuración de IA o menú');
                throw new Error('Menú no disponible para esta sucursal');
            }

            console.log('✅ Configuración de IA encontrada');
            console.log('📋 Longitud del menú:', branchAIConfig.menuContent.length);

            // Parsear el menú
            const menuData = this.parseMenuContent(branchAIConfig.menuContent);
            console.log('📊 Productos parseados:', menuData.length);
            
            if (menuData.length === 0) {
                console.error('❌ No se pudieron parsear productos del menú');
                throw new Error('No se pudieron extraer productos del menú');
            }
            
            // Filtrar productos según preferencias
            const filteredProducts = this.filterProductsByPreferences(menuData, session.preferences);
            console.log('🔍 Productos filtrados:', filteredProducts.length);
            
            // Calcular puntuaciones de recomendación
            const scoredProducts = this.scoreProducts(filteredProducts, session.preferences);
            console.log('⭐ Productos puntuados:', scoredProducts.length);
            
            // Seleccionar mejores recomendaciones
            const topRecommendations = scoredProducts
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            console.log('🏆 Top recomendaciones:', topRecommendations.length);

            if (topRecommendations.length === 0) {
                console.error('❌ No se encontraron recomendaciones válidas');
                throw new Error('No se encontraron productos que coincidan con tus preferencias');
            }

            // Guardar recomendaciones
            session.recommendations = topRecommendations.map(rec => ({
                productId: rec.id,
                productName: rec.name,
                price: rec.price,
                totalPrice: rec.price * session.peopleCount,
                quantity: session.peopleCount,
                category: rec.category,
                reason: rec.reason,
                confidence: Math.round(rec.score)
            }));

            // Seleccionar recomendación principal
            const mainRecommendation = topRecommendations[0];
            session.finalRecommendation = {
                productId: mainRecommendation.id,
                productName: mainRecommendation.name,
                price: mainRecommendation.price,
                totalPrice: mainRecommendation.price * session.peopleCount,
                quantity: session.peopleCount,
                category: mainRecommendation.category,
                reasoning: mainRecommendation.reason,
                alternatives: topRecommendations.slice(1).map(alt => ({
                    productId: alt.id,
                    productName: alt.name,
                    price: alt.price,
                    totalPrice: alt.price * session.peopleCount,
                    quantity: session.peopleCount,
                    reason: alt.reason
                }))
            };

            session.status = 'completed';
            session.completedAt = new Date();
            
            // Usar findOneAndUpdate para evitar errores de versión
            await RecommendationSession.findOneAndUpdate(
                { sessionId: session.sessionId },
                {
                    recommendations: session.recommendations,
                    finalRecommendation: session.finalRecommendation,
                    status: 'completed',
                    completedAt: new Date()
                },
                { new: true }
            );

            console.log('✅ Recomendaciones generadas exitosamente');
            console.log('🍽️ Recomendación principal:', mainRecommendation.name);

            return {
                type: 'recommendations',
                sessionId: session.sessionId,
                mainRecommendation: session.finalRecommendation,
                alternatives: session.finalRecommendation.alternatives,
                preferences: session.preferences
            };

        } catch (error) {
            console.error('❌ Error generando recomendaciones:', error);
            throw error;
        }
    }

    // Parsear contenido del menú
    parseMenuContent(menuContent) {
        console.log('🔍 ===== PARSEANDO MENÚ =====');
        const products = [];
        const lines = menuContent.split('\n');
        
        let currentSection = '';
        let currentCategory = '';

        console.log('📋 Total de líneas:', lines.length);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Detectar secciones con diferentes formatos
            if (trimmedLine.startsWith('*') && trimmedLine.endsWith('*')) {
                currentSection = trimmedLine.replace(/\*/g, '').trim();
                console.log('📂 Nueva sección:', currentSection);
                continue;
            }

            // Detectar secciones con emojis y texto
            if (trimmedLine.match(/^[🌮🍽️☕🧊🥐🥪🍰🚚💳]/)) {
                currentSection = trimmedLine.replace(/^[🌮🍽️☕🧊🥐🥪🍰🚚💳]\s*/, '').trim();
                console.log('📂 Nueva sección:', currentSection);
                continue;
            }

            // Detectar categorías
            if (trimmedLine.includes(':') && !trimmedLine.includes('$')) {
                currentCategory = trimmedLine.replace(':', '').trim();
                console.log('📁 Nueva categoría:', currentCategory);
                continue;
            }

            // Detectar productos con precios - múltiples formatos
            // Formato 1: "Producto - $precio"
            let priceMatch = trimmedLine.match(/^(.+?)\s*-\s*\$([\d,]+)/);
            if (priceMatch) {
                const productName = priceMatch[1].trim();
                const price = parseInt(priceMatch[2].replace(/,/g, ''));
                
                if (productName && price > 0 && productName.length > 3) {
                    const product = {
                        id: `prod_${products.length + 1}`,
                        name: productName,
                        price: price,
                        category: currentCategory || currentSection,
                        section: currentSection,
                        description: trimmedLine
                    };
                    
                    products.push(product);
                    console.log(`✅ Producto ${products.length}: ${productName} - $${price}`);
                }
                continue;
            }

            // Formato 2: "Producto $precio"
            priceMatch = trimmedLine.match(/^(.+?)\s+\$([\d,]+)/);
            if (priceMatch) {
                const productName = priceMatch[1].trim();
                const price = parseInt(priceMatch[2].replace(/,/g, ''));
                
                if (productName && price > 0 && productName.length > 3) {
                    const product = {
                        id: `prod_${products.length + 1}`,
                        name: productName,
                        price: price,
                        category: currentCategory || currentSection,
                        section: currentSection,
                        description: trimmedLine
                    };
                    
                    products.push(product);
                    console.log(`✅ Producto ${products.length}: ${productName} - $${price}`);
                }
                continue;
            }

            // Formato 3: Solo precio al final
            priceMatch = trimmedLine.match(/\$([\d,]+)$/);
            if (priceMatch && trimmedLine.length > 10) {
                const price = parseInt(priceMatch[1].replace(/,/g, ''));
                const productName = trimmedLine.replace(/\s+\$[\d,]+$/, '').trim();
                
                if (productName && price > 0 && productName.length > 3) {
                    const product = {
                        id: `prod_${products.length + 1}`,
                        name: productName,
                        price: price,
                        category: currentCategory || currentSection,
                        section: currentSection,
                        description: trimmedLine
                    };
                    
                    products.push(product);
                    console.log(`✅ Producto ${products.length}: ${productName} - $${price}`);
                }
            }
        }

        console.log('📊 Total productos parseados:', products.length);
        return products;
    }

    // Filtrar productos según preferencias
    filterProductsByPreferences(products, preferences) {
        return products.filter(product => {
            // Filtro por presupuesto - más flexible
            if (preferences.budget) {
                // Permitir productos hasta 20% por encima del presupuesto máximo
                const maxBudget = preferences.budget.max * 1.2;
                if (product.price > maxBudget) {
                    return false;
                }
            }

            // Filtro por restricciones dietéticas
            if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
                const productText = (product.name + ' ' + product.description).toLowerCase();
                
                for (const restriction of preferences.dietaryRestrictions) {
                    if (restriction.toLowerCase().includes('vegetariano') && 
                        (productText.includes('carne') || productText.includes('pollo') || productText.includes('cerdo'))) {
                        return false;
                    }
                    if (restriction.toLowerCase().includes('vegano') && 
                        (productText.includes('queso') || productText.includes('leche') || productText.includes('huevo'))) {
                        return false;
                    }
                }
            }

            return true;
        });
    }

    // Calcular puntuaciones de productos
    scoreProducts(products, preferences) {
        return products.map(product => {
            let score = 50; // Puntuación base
            let reasons = [];

            // Puntuación por presupuesto (más cerca del rango medio = mejor)
            if (preferences.budget && preferences.budget.min !== undefined && preferences.budget.max !== undefined) {
                const budgetMid = (preferences.budget.min + preferences.budget.max) / 2;
                const priceDiff = Math.abs(product.price - budgetMid);
                
                // Evitar división por cero
                if (budgetMid > 0) {
                    const budgetScore = Math.max(0, 30 - (priceDiff / budgetMid) * 30);
                    score += budgetScore;
                    reasons.push(`Se ajusta a tu presupuesto`);
                } else {
                    // Si el presupuesto es muy bajo, dar puntuación base
                    score += 10;
                    reasons.push(`Opción económica`);
                }
            }

            // Puntuación por tipo de comida
            if (preferences.mealType) {
                const productText = product.name.toLowerCase();
                if (preferences.mealType === 'desayuno' && 
                    (productText.includes('café') || productText.includes('huevo') || productText.includes('pan'))) {
                    score += 20;
                    reasons.push('Perfecto para desayuno');
                }
                if (preferences.mealType === 'almuerzo' && 
                    (productText.includes('arroz') || productText.includes('pollo') || productText.includes('carne'))) {
                    score += 20;
                    reasons.push('Ideal para almuerzo');
                }
            }

            // Puntuación por nivel de picante
            if (preferences.spiceLevel) {
                const productText = product.description.toLowerCase();
                if (preferences.spiceLevel.includes('sin picante') && !productText.includes('picante')) {
                    score += 15;
                    reasons.push('Sin picante como prefieres');
                }
                if (preferences.spiceLevel.includes('picante') && productText.includes('picante')) {
                    score += 15;
                    reasons.push('Con el nivel de picante que buscas');
                }
            }

            // Puntuación por ocasión especial
            if (preferences.specialOccasion) {
                if (preferences.specialOccasion.includes('romántica') && 
                    (product.name.toLowerCase().includes('pasta') || product.name.toLowerCase().includes('vino'))) {
                    score += 25;
                    reasons.push('Perfecto para una cita romántica');
                }
                if (preferences.specialOccasion.includes('trabajo') && 
                    product.price < 30000) {
                    score += 15;
                    reasons.push('Ideal para reunión de trabajo');
                }
            }

            // Asegurar que el score sea un número válido
            const finalScore = Math.min(100, Math.max(0, score || 50));
            
            return {
                ...product,
                score: finalScore,
                reason: reasons.join(', ') || 'Buena opción para ti'
            };
        });
    }

    // Obtener sesión activa
    async getActiveSession(phoneNumber, branchId) {
        return await RecommendationSession.findOne({
            phoneNumber,
            branchId,
            status: 'active'
        });
    }

    // Cancelar sesión
    async cancelSession(sessionId) {
        const session = await RecommendationSession.findOne({ sessionId });
        if (session) {
            session.status = 'abandoned';
            await session.save();
        }
    }
}

module.exports = RecommendationService;
