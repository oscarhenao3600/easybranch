const { HfInference } = require('@huggingface/inference');
const fetch = require('node-fetch');
const LoggerService = require('./LoggerService');

class AIService {
  constructor() {
    this.hf = null;
    this.modelName = 'microsoft/DialoGPT-small'; // Cambiado a modelo compatible
    this.useHuggingFace = false;
    this.menuContent = new Map();
    this.aiPrompts = new Map();
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
    this.logger = new LoggerService();
    
    // Auto-configurar desde variables de entorno
    this.autoConfigure();
  }

  // Auto-configurar desde variables de entorno
  autoConfigure() {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    const modelName = process.env.HUGGINGFACE_MODEL;
    const useHF = process.env.USE_HUGGINGFACE === 'true';
    
    if (apiKey && useHF) {
      this.configureHuggingFace(apiKey, modelName);
      this.logger.info('🤖 IA configurada automáticamente desde variables de entorno');
    } else {
      this.logger.info('⚠️ IA usando modo simulación - configura API key para usar IA real');
    }
  }

  // Configurar Hugging Face
  configureHuggingFace(apiKey, modelName = null) {
    if (apiKey) {
      this.hf = new HfInference(apiKey);
      this.useHuggingFace = true;
      if (modelName) {
        this.modelName = modelName;
      }
      this.logger.info('✅ Hugging Face configurado');
    } else {
      this.hf = null;
      this.useHuggingFace = false;
      this.logger.info('⚠️ Hugging Face deshabilitado');
    }
  }

  // Configurar contenido del menú para una sucursal
  setMenuContent(branchId, content) {
    this.menuContent.set(branchId, content);
    this.logger.ai(branchId, '📋 Menú configurado');
  }

  // Limpiar contenido del menú para una sucursal
  clearMenuContent(branchId) {
    this.menuContent.delete(branchId);
    this.logger.ai(branchId, '🗑️ Menú eliminado');
  }

  // Configurar prompt personalizado para una sucursal
  setAIPrompt(branchId, prompt) {
    this.aiPrompts.set(branchId, prompt);
    this.logger.ai(branchId, '🤖 Prompt de IA configurado');
  }

  // Obtener prompt personalizado o usar uno por defecto
  getPrompt(branchId, businessType = 'restaurant') {
    const customPrompt = this.aiPrompts.get(branchId);
    if (customPrompt) {
      return customPrompt;
    }

    // Prompts por defecto según tipo de negocio (optimizados para español)
    const defaultPrompts = {
      restaurant: `Eres un asistente virtual amigable de un restaurante colombiano. 
      Tu objetivo es ayudar a los clientes con sus consultas sobre el menú, precios, pedidos y cualquier otra pregunta relacionada con nuestros servicios.
      
      Debes ser:
      - Amigable y profesional, usando expresiones naturales en español
      - Útil y preciso en tus respuestas
      - Capaz de sugerir productos del menú
      - Ayudar con el proceso de pedidos
      - Responder preguntas sobre precios y disponibilidad
      - Usar un tono cálido y colombiano
      
      Responde de manera natural y conversacional en español colombiano, como si fueras un empleado amigable del restaurante.`,
      
      cafe: `Eres un asistente virtual amigable de una cafetería colombiana. 
      Ayuda a los clientes con consultas sobre bebidas, pastelería, horarios y pedidos.
      
      Debes ser:
      - Conocedor de café y bebidas colombianas
      - Sugerir combinaciones de bebidas y postres
      - Informar sobre horarios de atención
      - Ayudar con pedidos para llevar o consumo en sitio
      - Usar expresiones cálidas y colombianas
      
      Responde en español colombiano natural y amigable.`,
      
      pharmacy: `Eres un asistente virtual de una farmacia colombiana. 
      Ayuda a los clientes con consultas sobre medicamentos, productos de cuidado personal y servicios farmacéuticos.
      
      Debes ser:
      - Profesional y discreto
      - Informar sobre disponibilidad de productos
      - Recordar que no puedes dar diagnósticos médicos
      - Sugerir consultar con un profesional de la salud cuando sea necesario
      - Usar un lenguaje profesional pero amigable en español
      
      Responde en español colombiano profesional y útil.`,
      
      grocery: `Eres un asistente virtual de una tienda de víveres colombiana. 
      Ayuda a los clientes con consultas sobre productos, precios, disponibilidad y pedidos.
      
      Debes ser:
      - Conocedor de productos de consumo colombianos
      - Informar sobre ofertas y promociones
      - Ayudar con listas de compras
      - Sugerir productos complementarios
      - Usar expresiones amigables y colombianas
      
      Responde en español colombiano natural y útil.`
    };

    return defaultPrompts[businessType] || defaultPrompts.restaurant;
  }

  // Generar respuesta usando IA con configuración específica de sucursal
  async generateResponse(branchId, userMessage, clientId = null, businessType = 'restaurant', branchConfig = null) {
    try {
      console.log('🤖 ===== GENERANDO RESPUESTA IA CONTEXTUALIZADA =====');
      console.log('🏪 Branch ID:', branchId);
      console.log('💬 User Message:', userMessage);
      console.log('🏢 Business Type:', businessType);
      console.log('⚙️ Branch Config:', branchConfig ? 'Disponible' : 'No disponible');
      console.log('=================================================');

      // Obtener configuración específica de la sucursal
      const menuContent = this.menuContent.get(branchId);
      const customPrompt = this.aiPrompts.get(branchId);
      const businessSettings = branchConfig || {};

      // Construir contexto completo
      const fullContext = this.buildMenuContext(menuContent, userMessage);
      
      // Intentar usar Hugging Face primero
      if (this.useHuggingFace && this.hf) {
        try {
          const response = await this.callHuggingFace(fullContext, userMessage, clientId);
          this.logger.ai(branchId, '🤖 Respuesta Hugging Face generada');
          return response;
        } catch (hfError) {
          this.logger.warn(`Error con Hugging Face, usando simulación: ${hfError.message}`);
          const response = await this.callContextualizedAI(fullContext, userMessage, businessType, businessSettings, customPrompt);
          this.logger.ai(branchId, '🤖 Respuesta simulación contextualizada generada');
          return response;
        }
      } else {
        // Usar simulación inteligente contextualizada
        const response = await this.callContextualizedAI(fullContext, userMessage, businessType, businessSettings, customPrompt);
        this.logger.ai(branchId, '🤖 Respuesta simulación contextualizada generada');
        return response;
      }
      
    } catch (error) {
      this.logger.error(`Error generando respuesta IA para ${branchId}:`, error);
      return this.getFallbackResponse(userMessage, businessType);
    }
  }

  // Construir contexto del menú
  buildMenuContext(menuContent, userMessage) {
    let context = '';
    
    if (menuContent) {
      context += `Información del menú: ${menuContent}\n\n`;
    }
    
    context += `Mensaje del usuario: ${userMessage}\n\n`;
    context += `Responde de manera amigable y útil en español colombiano.`;
    
    return context;
  }

  // Llamar a Hugging Face usando API REST directa
  async callHuggingFace(context, userMessage, clientId) {
    try {
      // Obtener historial de conversación
      const history = this.getConversationHistory(clientId);
      
      // Crear prompt mejorado
      const enhancedPrompt = this.createEnhancedPrompt(context, userMessage, history);
      
      this.logger.info(`🤖 Llamando a Hugging Face con API REST`);
      
      // Usar API REST directa en lugar del SDK
      const apiKey = process.env.HUGGINGFACE_API_KEY;
      const model = process.env.HUGGINGFACE_MODEL || 'gpt2';
      
      if (!apiKey) {
        throw new Error('API Key de Hugging Face no configurada');
      }
      
      const response = await fetch('https://api-inference.huggingface.co/models/' + model, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: enhancedPrompt,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      
      // Manejar diferentes formatos de respuesta
      let aiResponse;
      if (Array.isArray(data) && data.length > 0) {
        aiResponse = data[0].generated_text || data[0].text || 'Gracias por contactarnos. ¿En qué puedo ayudarte?';
      } else if (data.generated_text) {
        aiResponse = data.generated_text;
      } else if (data.text) {
        aiResponse = data.text;
      } else {
        aiResponse = 'Gracias por contactarnos. ¿En qué puedo ayudarte?';
      }
      
      // Limpiar la respuesta (remover el prompt original si está incluido)
      if (aiResponse.includes(enhancedPrompt)) {
        aiResponse = aiResponse.replace(enhancedPrompt, '').trim();
      }
      
      // Guardar en historial
      this.addToConversationHistory(clientId, userMessage, aiResponse);
      
      this.logger.info(`✅ Respuesta generada exitosamente con modelo: ${model}`);
      return aiResponse;
      
    } catch (error) {
      this.logger.error(`Error llamando a Hugging Face: ${error.message}`);
      throw error;
    }
  }

  // Simulación de IA contextualizada mejorada
  async callContextualizedAI(context, userMessage, businessType, businessSettings = {}, customPrompt = '') {
    const lowerMessage = userMessage.toLowerCase();
    
    console.log('🤖 ===== PROCESANDO CON IA CONTEXTUALIZADA MEJORADA =====');
    console.log('💬 User Message:', userMessage);
    console.log('🏢 Business Type:', businessType);
    console.log('⚙️ Business Settings:', Object.keys(businessSettings).length > 0 ? 'Disponible' : 'No disponible');
    console.log('📋 Context:', context.substring(0, 200) + '...');
    console.log('🎯 Custom Prompt:', customPrompt ? 'Disponible' : 'No disponible');
    console.log('===============================================');
    
    // Generar respuesta más inteligente basada en el contexto
    const contextualResponse = this.generateContextualResponse(userMessage, businessType, context, businessSettings);
    
    console.log('🤖 ===== RESPUESTA CONTEXTUAL GENERADA =====');
    console.log('💬 Respuesta:', contextualResponse.substring(0, 100) + '...');
    console.log('==========================================');
    
    return contextualResponse;
  }

  // Generar respuesta contextual inteligente
  generateContextualResponse(userMessage, businessType, context, businessSettings) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Análisis semántico mejorado
    const intent = this.analyzeUserIntent(userMessage);
    const sentiment = this.analyzeSentiment(userMessage);
    const urgency = this.analyzeUrgency(userMessage);
    
    console.log('🧠 Análisis semántico:');
    console.log(`   Intención: ${intent}`);
    console.log(`   Sentimiento: ${sentiment}`);
    console.log(`   Urgencia: ${urgency}`);
    
    // Generar respuesta basada en análisis
    return this.buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context);
  }

  // Analizar intención del usuario
  analyzeUserIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
      return 'saludo';
    } else if (lowerMessage.includes('menú') || lowerMessage.includes('menu') || lowerMessage.includes('qué tienen')) {
      return 'consulta_menu';
    } else if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('vale')) {
      return 'consulta_precio';
    } else if (lowerMessage.includes('pedido') || lowerMessage.includes('orden') || lowerMessage.includes('quiero')) {
      return 'hacer_pedido';
    } else if (lowerMessage.includes('horario') || lowerMessage.includes('abierto') || lowerMessage.includes('cierra')) {
      return 'consulta_horario';
    } else if (lowerMessage.includes('dirección') || lowerMessage.includes('ubicación') || lowerMessage.includes('dónde')) {
      return 'consulta_ubicacion';
    } else if (lowerMessage.includes('gracias') || lowerMessage.includes('chao') || lowerMessage.includes('adiós')) {
      return 'despedida';
    } else {
      return 'consulta_general';
    }
  }

  // Analizar sentimiento
  analyzeSentiment(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('gracias') || lowerMessage.includes('excelente') || lowerMessage.includes('perfecto')) {
      return 'positivo';
    } else if (lowerMessage.includes('problema') || lowerMessage.includes('malo') || lowerMessage.includes('queja')) {
      return 'negativo';
    } else {
      return 'neutral';
    }
  }

  // Analizar urgencia
  analyzeUrgency(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('urgente') || lowerMessage.includes('rápido') || lowerMessage.includes('ya')) {
      return 'alta';
    } else if (lowerMessage.includes('cuando') || lowerMessage.includes('después') || lowerMessage.includes('luego')) {
      return 'baja';
    } else {
      return 'normal';
    }
  }

  // Construir respuesta inteligente mejorada
  buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context) {
    const responses = {
      saludo: {
        positivo: [
          "¡Hola! 😊 Me da mucho gusto saludarte. ¿En qué puedo ayudarte hoy?",
          "¡Hola! 😊 ¡Qué bueno verte por aquí! ¿Cómo estás? ¿En qué te puedo ayudar?",
          "¡Hola! 😊 ¡Excelente día! ¿En qué puedo asistirte hoy?",
          "¡Hola! 😊 ¡Qué alegría verte! ¿Cómo has estado? ¿En qué puedo ayudarte?",
          "¡Hola! 😊 ¡Qué gusto saludarte! ¿Cómo estás? ¿En qué te puedo asistir?"
        ],
        neutral: [
          "¡Hola! 😊 ¿Cómo estás? ¿En qué puedo ayudarte hoy?",
          "¡Hola! 😊 Bienvenido. ¿En qué te puedo ayudar?",
          "¡Hola! 😊 ¿Cómo te va? ¿En qué puedo asistirte?",
          "¡Hola! 😊 ¿Qué tal? ¿En qué puedo ayudarte?",
          "¡Hola! 😊 ¿Cómo andas? ¿En qué te puedo ayudar?"
        ],
        negativo: [
          "¡Hola! 😊 Entiendo que puede haber alguna preocupación. ¿En qué puedo ayudarte a resolverla?",
          "¡Hola! 😊 Veo que necesitas ayuda. Estoy aquí para asistirte, ¿qué necesitas?",
          "¡Hola! 😊 No te preocupes, estoy aquí para ayudarte. ¿En qué puedo asistirte?",
          "¡Hola! 😊 Entiendo que hay algo que resolver. ¿En qué puedo ayudarte?",
          "¡Hola! 😊 Veo que necesitas apoyo. Estoy aquí para ti, ¿qué necesitas?"
        ]
      },
      consulta_menu: {
        positivo: [
          "¡Perfecto! 😊 Te encantará nuestro menú. Tenemos opciones deliciosas:",
          "¡Excelente elección! 😊 Nuestro menú tiene opciones increíbles:",
          "¡Genial! 😊 Te voy a mostrar nuestras mejores opciones:",
          "¡Fantástico! 😊 Nuestro menú está lleno de opciones deliciosas:",
          "¡Qué bueno! 😊 Te voy a mostrar todo lo que tenemos disponible:"
        ],
        neutral: [
          "Claro, te muestro nuestro menú:",
          "Por supuesto, aquí tienes nuestras opciones:",
          "Perfecto, aquí está nuestro menú:",
          "Por supuesto, aquí tienes todo nuestro menú:",
          "Claro, te muestro todas nuestras opciones:"
        ],
        negativo: [
          "Entiendo tu consulta. Te muestro nuestras opciones disponibles:",
          "Claro, aquí tienes nuestro menú completo:",
          "Por supuesto, estas son nuestras opciones:",
          "Entiendo, aquí tienes todo nuestro menú:",
          "Claro, te muestro todas nuestras opciones disponibles:"
        ]
      },
      consulta_precio: {
        positivo: [
          "¡Perfecto! 😊 Te ayudo con la información de precios:",
          "¡Excelente! 😊 Aquí tienes los precios que necesitas:",
          "¡Genial! 😊 Te muestro toda la información de precios:"
        ],
        neutral: [
          "Claro, aquí tienes la información de precios:",
          "Por supuesto, estos son nuestros precios:",
          "Perfecto, aquí tienes los precios:"
        ],
        negativo: [
          "Entiendo tu consulta sobre precios. Aquí tienes la información:",
          "Claro, aquí tienes todos nuestros precios:",
          "Por supuesto, esta es la información de precios:"
        ]
      },
      hacer_pedido: {
        positivo: [
          "¡Perfecto! 😊 Te ayudo con tu pedido. Necesito saber:",
          "¡Excelente! 😊 Me da mucho gusto ayudarte con tu pedido:",
          "¡Genial! 😊 Vamos a armar tu pedido perfecto:"
        ],
        neutral: [
          "Claro, te ayudo con tu pedido. Necesito saber:",
          "Por supuesto, vamos a hacer tu pedido:",
          "Perfecto, aquí está la información para tu pedido:"
        ],
        negativo: [
          "Entiendo que quieres hacer un pedido. Te ayudo con:",
          "Claro, aquí tienes la información para tu pedido:",
          "Por supuesto, te ayudo con tu pedido:"
        ]
      },
      consulta_horario: {
        positivo: [
          "¡Perfecto! 😊 Te ayudo con la información de horarios:",
          "¡Excelente! 😊 Aquí tienes nuestros horarios:",
          "¡Genial! 😊 Te muestro cuándo estamos abiertos:"
        ],
        neutral: [
          "Claro, aquí tienes nuestros horarios:",
          "Por supuesto, estos son nuestros horarios:",
          "Perfecto, aquí tienes la información de horarios:"
        ],
        negativo: [
          "Entiendo tu consulta sobre horarios. Aquí tienes la información:",
          "Claro, aquí tienes nuestros horarios:",
          "Por supuesto, esta es la información de horarios:"
        ]
      },
      consulta_ubicacion: {
        positivo: [
          "¡Perfecto! 😊 Te ayudo con la información de ubicación:",
          "¡Excelente! 😊 Aquí tienes nuestra dirección:",
          "¡Genial! 😊 Te muestro cómo llegar:"
        ],
        neutral: [
          "Claro, aquí tienes nuestra ubicación:",
          "Por supuesto, esta es nuestra dirección:",
          "Perfecto, aquí tienes la información de ubicación:"
        ],
        negativo: [
          "Entiendo tu consulta sobre ubicación. Aquí tienes la información:",
          "Claro, aquí tienes nuestra dirección:",
          "Por supuesto, esta es la información de ubicación:"
        ]
      },
      despedida: {
        positivo: [
          "¡Fue un placer ayudarte! 😊 ¡Que tengas un excelente día!",
          "¡Gracias por contactarnos! 😊 ¡Que tengas un día maravilloso!",
          "¡Fue genial ayudarte! 😊 ¡Que tengas un día increíble!"
        ],
        neutral: [
          "¡Gracias por contactarnos! 😊 ¡Que tengas un buen día!",
          "¡Fue un placer ayudarte! 😊 ¡Que tengas un buen día!",
          "¡Gracias! 😊 ¡Que tengas un día excelente!"
        ],
        negativo: [
          "Espero haber podido ayudarte. 😊 ¡Que tengas un mejor día!",
          "Gracias por contactarnos. 😊 ¡Que tengas un buen día!",
          "Espero haber resuelto tu consulta. 😊 ¡Que tengas un buen día!"
        ]
      },
      consulta_general: {
        positivo: [
          "¡Perfecto! 😊 Te ayudo con esa información:",
          "¡Excelente pregunta! 😊 Aquí tienes la respuesta:",
          "¡Genial! 😊 Te explico todo lo que necesitas saber:"
        ],
        neutral: [
          "Claro, te ayudo con esa información:",
          "Por supuesto, aquí tienes la respuesta:",
          "Perfecto, te explico lo que necesitas saber:"
        ],
        negativo: [
          "Entiendo tu consulta. Te ayudo con:",
          "Claro, aquí tienes la información:",
          "Por supuesto, te explico lo que necesitas:"
        ]
      }
    };

    // Obtener respuesta base según intención y sentimiento
    const baseResponse = responses[intent]?.[sentiment] || responses[intent]?.neutral || [
      "Entiendo tu consulta. ¿En qué más puedo ayudarte?"
    ];

    // Seleccionar respuesta aleatoria
    const selectedResponse = baseResponse[Math.floor(Math.random() * baseResponse.length)];

    // Agregar contenido específico según el tipo de negocio
    let specificContent = '';
    if (intent === 'consulta_menu') {
      specificContent = this.getMenuContent(businessType);
    } else if (intent === 'consulta_precio') {
      specificContent = this.getPriceInfo(businessType);
    } else if (intent === 'hacer_pedido') {
      specificContent = this.getOrderInfo(businessType);
    } else if (intent === 'consulta_horario') {
      specificContent = this.getScheduleInfo(businessType);
    } else if (intent === 'consulta_ubicacion') {
      specificContent = this.getLocationInfo(businessType);
    }

    // Construir respuesta final
    let finalResponse = selectedResponse;
    if (specificContent) {
      finalResponse += '\n\n' + specificContent;
    }

    // Agregar cierre según urgencia
    if (urgency === 'alta') {
      finalResponse += '\n\n¿Necesitas algo más urgente?';
    } else if (urgency === 'baja') {
      finalResponse += '\n\n¿Hay algo más en lo que pueda ayudarte?';
    } else {
      finalResponse += '\n\n¿En qué más puedo ayudarte?';
    }

    return finalResponse;
  }

  // Obtener contenido del menú según tipo de negocio
  getMenuContent(businessType) {
    const menus = {
      restaurant: `🍽️ *NUESTRO MENÚ*

🥘 *PLATOS PRINCIPALES*
• Bandeja Paisa - $15.000
• Sancocho de Pollo - $12.000
• Arroz con Pollo - $10.000
• Pescado Frito - $14.000

🥗 *ENSALADAS*
• Ensalada César - $8.000
• Ensalada Mixta - $6.000

🍹 *BEBIDAS*
• Jugo Natural - $4.000
• Gaseosa - $3.000
• Agua - $2.000`,

      cafe: `☕ *NUESTRO MENÚ*

☕ *CAFÉS*
• Café Americano - $3.500
• Cappuccino - $4.000
• Café Latte - $4.200
• Frappé de Vainilla - $4.800

🥐 *PASTELERÍA*
• Croissant - $3.000
• Muffin de Arándanos - $2.500
• Brownie de Chocolate - $3.200

🥤 *BEBIDAS FRÍAS*
• Limonada Natural - $3.000
• Smoothie de Frutas - $5.000`,

      pharmacy: `💊 *PRODUCTOS DISPONIBLES*

💊 *MEDICAMENTOS*
• Analgésicos
• Antigripales
• Vitaminas
• Medicamentos recetados

🧴 *CUIDADO PERSONAL*
• Shampoo y Acondicionador
• Jabones
• Cremas corporales
• Productos de higiene

🏥 *SERVICIOS*
• Consulta farmacéutica
• Entrega a domicilio
• Control de presión arterial`
    };

    return menus[businessType] || menus.cafe;
  }

  // Obtener información de precios
  getPriceInfo(businessType) {
    return `💰 *INFORMACIÓN DE PRECIOS*

Los precios pueden variar según el producto específico. Te recomiendo preguntarme por el precio de algún producto en particular.

¿Hay algún producto específico del que quieras saber el precio?`;
  }

  // Obtener información de pedidos
  getOrderInfo(businessType) {
    return `🛒 *INFORMACIÓN DE PEDIDOS*

Para hacer tu pedido, necesito saber:
• ¿Qué productos quieres?
• ¿Cuántas unidades de cada uno?
• ¿Es para llevar o consumo en sitio?

¿Qué te gustaría pedir?`;
  }

  // Obtener información de horarios
  getScheduleInfo(businessType) {
    const schedules = {
      restaurant: `🕒 *NUESTROS HORARIOS*

📅 *LUNES A VIERNES*
• Desayuno: 7:00 AM - 11:00 AM
• Almuerzo: 12:00 PM - 3:00 PM
• Cena: 6:00 PM - 10:00 PM

📅 *SÁBADOS Y DOMINGOS*
• Desayuno: 8:00 AM - 12:00 PM
• Almuerzo: 12:00 PM - 4:00 PM
• Cena: 6:00 PM - 11:00 PM

¿En qué horario te gustaría venir?`,

      cafe: `🕒 *NUESTROS HORARIOS*

📅 *LUNES A VIERNES*
• 6:00 AM - 10:00 PM

📅 *SÁBADOS*
• 7:00 AM - 11:00 PM

📅 *DOMINGOS*
• 8:00 AM - 9:00 PM

¿En qué horario te gustaría visitarnos?`,

      pharmacy: `🕒 *NUESTROS HORARIOS*

📅 *LUNES A VIERNES*
• 7:00 AM - 9:00 PM

📅 *SÁBADOS*
• 8:00 AM - 8:00 PM

📅 *DOMINGOS*
• 9:00 AM - 6:00 PM

¿En qué horario necesitas nuestros servicios?`
    };

    return schedules[businessType] || schedules.cafe;
  }

  // Obtener información de ubicación
  getLocationInfo(businessType) {
    const locations = {
      restaurant: `📍 *NUESTRA UBICACIÓN*

🏢 *DIRECCIÓN*
Calle 123 #45-67, Centro
Bogotá, Colombia

🚗 *CÓMO LLEGAR*
• En carro: Carrera 7 con Calle 123
• En TransMilenio: Estación Centro
• En taxi: "Restaurante EasyBranch Centro"

📱 *CONTACTO*
• Teléfono: (601) 234-5678
• WhatsApp: +57 300 123 4567

¿Necesitas ayuda para llegar?`,

      cafe: `📍 *NUESTRA UBICACIÓN*

🏢 *DIRECCIÓN*
Carrera 15 #93-45, Zona Rosa
Bogotá, Colombia

🚗 *CÓMO LLEGAR*
• En carro: Carrera 15 con Calle 93
• En TransMilenio: Estación Zona Rosa
• En taxi: "Cafetería EasyBranch Zona Rosa"

📱 *CONTACTO*
• Teléfono: (601) 234-5678
• WhatsApp: +57 300 123 4567

¿Necesitas ayuda para llegar?`,

      pharmacy: `📍 *NUESTRA UBICACIÓN*

🏢 *DIRECCIÓN*
Avenida 68 #25-30, Chapinero
Bogotá, Colombia

🚗 *CÓMO LLEGAR*
• En carro: Avenida 68 con Calle 25
• En TransMilenio: Estación Chapinero
• En taxi: "Farmacia EasyBranch Chapinero"

📱 *CONTACTO*
• Teléfono: (601) 234-5678
• WhatsApp: +57 300 123 4567

¿Necesitas ayuda para llegar?`
    };

    return locations[businessType] || locations.cafe;
  }

  // Crear prompt mejorado para Hugging Face
  createEnhancedPrompt(context, userMessage, history) {
    let prompt = context + '\n\n';
    
    if (history && history.length > 0) {
      prompt += 'Historial de conversación:\n';
      history.forEach(entry => {
        prompt += `Usuario: ${entry.user}\nAsistente: ${entry.assistant}\n\n`;
      });
    }
    
    prompt += `Usuario: ${userMessage}\nAsistente:`;
    
    return prompt;
  }

  // Obtener historial de conversación
  getConversationHistory(clientId) {
    if (!clientId) return [];
    return this.conversationHistory.get(clientId) || [];
  }

  // Agregar al historial de conversación
  addToConversationHistory(clientId, userMessage, aiResponse) {
    if (!clientId) return;
    
    let history = this.conversationHistory.get(clientId) || [];
    
    history.push({
      user: userMessage,
      assistant: aiResponse,
      timestamp: new Date()
    });
    
    // Mantener solo los últimos mensajes
    if (history.length > this.maxHistoryLength) {
      history = history.slice(-this.maxHistoryLength);
    }
    
    this.conversationHistory.set(clientId, history);
  }

  // Respuesta de fallback
  getFallbackResponse(userMessage, businessType) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
      return `¡Hola! 😊 ¿Cómo estás? ¿En qué puedo ayudarte hoy?`;
    }
    
    return `Gracias por contactarnos. ¿En qué puedo ayudarte?`;
  }
}

module.exports = AIService;