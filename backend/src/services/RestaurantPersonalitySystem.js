class RestaurantPersonalitySystem {
    constructor() {
        this.personalities = {
            friendly_cafe: {
                name: "Domi",
                role: "Asistente de Cafetería",
                traits: {
                    warmth: 9,
                    professionalism: 7,
                    humor: 6,
                    helpfulness: 10,
                    patience: 9
                },
                greetingStyles: [
                    "¡Hola! 😊 Soy Domi, tu asistente personal de cafetería. ¿En qué puedo ayudarte hoy?",
                    "¡Bienvenido! 🌟 Me da mucho gusto verte. ¿Qué se te antoja hoy?",
                    "¡Hola! ☕ Soy Domi y estoy aquí para hacerte el día más delicioso. ¿Qué necesitas?",
                    "¡Qué gusto verte! 😄 Soy Domi, tu amiga de la cafetería. ¿Cómo puedo ayudarte?"
                ],
                responses: {
                    excited: "¡Me encanta tu entusiasmo! 🎉",
                    confused: "No te preocupes, estoy aquí para ayudarte 😊",
                    happy: "¡Me alegra verte tan contento! 😄",
                    concerned: "Entiendo tu preocupación, vamos a resolverlo juntos 🤝"
                },
                farewells: [
                    "¡Que tengas un día delicioso! 😊",
                    "¡Hasta la próxima! Espero verte pronto 🌟",
                    "¡Que disfrutes mucho! Nos vemos pronto 😄",
                    "¡Cuídate mucho! Fue un placer ayudarte 😊"
                ]
            },
            professional_restaurant: {
                name: "Chef Assistant",
                role: "Asistente Culinario",
                traits: {
                    warmth: 7,
                    professionalism: 10,
                    humor: 4,
                    helpfulness: 9,
                    patience: 8
                },
                greetingStyles: [
                    "Buenos días, soy su asistente culinario. ¿En qué puedo asistirle hoy?",
                    "Bienvenido a nuestro restaurante. ¿Cómo puedo ayudarle con su pedido?",
                    "Saludos, estoy aquí para brindarle la mejor experiencia gastronómica. ¿Qué desea?",
                    "Buenos días, soy su asistente personal. ¿En qué puedo servirle?"
                ],
                responses: {
                    excited: "Excelente elección, señor/a",
                    confused: "Permíteme explicarle mejor las opciones disponibles",
                    happy: "Me complace saber que está satisfecho",
                    concerned: "Entiendo su preocupación, permíteme asistirle"
                },
                farewells: [
                    "Que tenga una excelente experiencia gastronómica",
                    "Esperamos verlo pronto en nuestro restaurante",
                    "Que disfrute su comida, hasta pronto",
                    "Ha sido un placer atenderlo"
                ]
            },
            casual_fastfood: {
                name: "Fast Friend",
                role: "Amigo Rápido",
                traits: {
                    warmth: 8,
                    professionalism: 5,
                    humor: 8,
                    helpfulness: 9,
                    patience: 7
                },
                greetingStyles: [
                    "¡Ey! ¿Qué tal? Soy tu amigo rápido, ¿qué se te antoja?",
                    "¡Hola! Soy tu compa de comida rápida, ¿en qué te ayudo?",
                    "¡Qué onda! Soy tu asistente de comida rápida, ¿qué necesitas?",
                    "¡Saludos! Soy tu amigo del sabor, ¿qué pedimos hoy?"
                ],
                responses: {
                    excited: "¡Eso es lo que me gusta escuchar! 🔥",
                    confused: "Tranquilo, aquí estoy para ayudarte 😎",
                    happy: "¡Me encanta verte así de contento! 😄",
                    concerned: "No te preocupes, aquí estamos para resolverlo 💪"
                },
                farewells: [
                    "¡Que disfrutes tu comida! Nos vemos pronto 😎",
                    "¡Hasta la próxima! Que tengas buen provecho 🔥",
                    "¡Cuídate! Espero verte pronto 😄",
                    "¡Que la pases genial! Nos vemos 😊"
                ]
            }
        };
    }

    // Obtener personalidad basada en el tipo de negocio
    getPersonality(businessType) {
        switch (businessType) {
            case 'cafeteria':
            case 'cafe':
                return this.personalities.friendly_cafe;
            case 'restaurant':
            case 'fine_dining':
                return this.personalities.professional_restaurant;
            case 'fast_food':
            case 'food_truck':
                return this.personalities.casual_fastfood;
            default:
                return this.personalities.friendly_cafe;
        }
    }

    // Generar saludo personalizado
    generateGreeting(personality, clientInfo, context) {
        const greetings = personality.greetingStyles;
        let selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];

        // Personalizar según el cliente
        if (clientInfo.visitFrequency === 'regular') {
            selectedGreeting = selectedGreeting.replace('Hola', '¡Hola de nuevo!');
        } else if (clientInfo.visitFrequency === 'vip') {
            selectedGreeting = `¡Hola! 😊 Soy ${personality.name}, tu asistente personal. Es un honor atenderte nuevamente. ¿En qué puedo ayudarte hoy?`;
        }

        return selectedGreeting;
    }

    // Generar respuesta contextual
    generateContextualResponse(personality, emotion, context) {
        const responses = personality.responses[emotion] || personality.responses.neutral;
        return responses;
    }

    // Generar despedida personalizada
    generateFarewell(personality, satisfaction, context) {
        const farewells = personality.farewells;
        let selectedFarewell = farewells[Math.floor(Math.random() * farewells.length)];

        // Personalizar según satisfacción
        if (satisfaction >= 8) {
            selectedFarewell += " ¡Fue un placer atenderte! 😊";
        } else if (satisfaction <= 4) {
            selectedFarewell += " Espero poder mejorar tu experiencia la próxima vez 🤝";
        }

        return selectedFarewell;
    }

    // Analizar sentimiento del mensaje
    analyzeSentiment(message) {
        const positiveWords = ['gracias', 'excelente', 'perfecto', 'genial', 'delicioso', 'bueno', 'me gusta', 'feliz', 'contento'];
        const negativeWords = ['malo', 'terrible', 'horrible', 'molesto', 'enojado', 'triste', 'decepcionado', 'problema', 'error'];
        const confusedWords = ['no entiendo', 'confundido', 'ayuda', 'explica', 'cómo', 'qué', 'dónde', 'cuándo'];

        const messageLower = message.toLowerCase();
        
        let positiveCount = 0;
        let negativeCount = 0;
        let confusedCount = 0;

        positiveWords.forEach(word => {
            if (messageLower.includes(word)) positiveCount++;
        });

        negativeWords.forEach(word => {
            if (messageLower.includes(word)) negativeCount++;
        });

        confusedWords.forEach(word => {
            if (messageLower.includes(word)) confusedCount++;
        });

        if (confusedCount > 0) return 'confused';
        if (negativeCount > positiveCount) return 'concerned';
        if (positiveCount > negativeCount) return 'happy';
        return 'neutral';
    }

    // Determinar intención del mensaje
    detectIntent(message) {
        const messageLower = message.toLowerCase();

        // Patrones de intención
        const intents = {
            greeting: ['hola', 'buenos días', 'buenas tardes', 'buenas noches', 'saludos'],
            menu_request: ['menú', 'carta', 'qué tienen', 'opciones', 'disponible'],
            order: ['quiero', 'deseo', 'pedir', 'ordenar', 'comprar', 'llevar'],
            recommendation: ['recomienda', 'sugiere', 'qué me recomiendas', 'ayuda', 'no sé qué pedir'],
            complaint: ['queja', 'problema', 'malo', 'terrible', 'decepcionado', 'molesto'],
            information: ['horarios', 'ubicación', 'dirección', 'teléfono', 'precio', 'cuánto cuesta'],
            customization: ['sin', 'con', 'extra', 'adicional', 'modificar', 'cambiar'],
            confirmation: ['sí', 'confirmo', 'correcto', 'está bien', 'perfecto'],
            cancellation: ['cancelar', 'no quiero', 'cambiar de opinión', 'mejor no']
        };

        for (const [intent, patterns] of Object.entries(intents)) {
            for (const pattern of patterns) {
                if (messageLower.includes(pattern)) {
                    return intent;
                }
            }
        }

        return 'unknown';
    }

    // Generar respuesta emocional
    generateEmotionalResponse(personality, sentiment, intent, context) {
        let response = '';

        // Respuesta base según sentimiento
        switch (sentiment) {
            case 'happy':
                response = personality.responses.happy || "¡Me alegra verte tan contento! 😄";
                break;
            case 'confused':
                response = personality.responses.confused || "No te preocupes, estoy aquí para ayudarte 😊";
                break;
            case 'concerned':
                response = personality.responses.concerned || "Entiendo tu preocupación, vamos a resolverlo juntos 🤝";
                break;
            default:
                response = "Entiendo, ¿en qué más puedo ayudarte?";
        }

        // Agregar contexto según intención
        switch (intent) {
            case 'greeting':
                response = this.generateGreeting(personality, context.clientInfo, context);
                break;
            case 'menu_request':
                response += " Te voy a mostrar nuestro menú completo 📋";
                break;
            case 'order':
                response += " Perfecto, vamos a armar tu pedido 🛒";
                break;
            case 'recommendation':
                response += " Me encanta ayudarte a encontrar algo delicioso 🍽️";
                break;
        }

        return response;
    }
}

module.exports = RestaurantPersonalitySystem;



