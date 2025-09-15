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
      // Generando respuesta IA contextualizada

      // Analizar intención del usuario
      const intent = this.analyzeUserIntent(userMessage);
      console.log('🎯 Intención detectada:', intent);

      // Guardar mensaje en historial de conversación
      if (clientId) {
        await this.saveConversationMessage(clientId, branchId, userMessage, intent);
      }

      // Si es un pedido, procesar automáticamente
      if (intent === 'hacer_pedido') {
        const orderAnalysis = this.processOrder(userMessage);
        if (orderAnalysis.hasProducts) {
          console.log('🛒 Procesando pedido automáticamente');
          const orderResponse = this.generateOrderResponse(orderAnalysis);
          
          // Guardar pedido pendiente para confirmación
          if (clientId) {
            await this.savePendingOrder(clientId, branchId, orderAnalysis);
            await this.saveOrderToHistory(clientId, branchId, orderAnalysis);
          }
          
          this.logger.ai(branchId, '🛒 Pedido procesado automáticamente');
          return orderResponse;
        }
      }

      // Si es una respuesta a recomendación (número 1-4), procesar
      if (/^[1-4]$/.test(userMessage.trim()) && clientId) {
        const profile = this.getRecommendationProfile(clientId, branchId);
        if (profile.questionsAnswered < 5) {
          console.log('🤖 Procesando respuesta de recomendación');
          return this.processRecommendationAnswer(clientId, branchId, userMessage);
        }
      }

      // Si es confirmación de pedido, procesar
      if (this.isOrderConfirmation(userMessage) && clientId) {
        console.log('✅ Confirmación de pedido detectada');
        return await this.handleOrderConfirmation(clientId, branchId, userMessage);
      }

      // Si es modificación de pedido, usar contexto previo
      if (intent === 'modificar_pedido' && clientId) {
        const previousOrder = await this.getLastOrder(clientId, branchId);
        if (previousOrder) {
          console.log('🔄 Modificando pedido anterior');
          const modifiedResponse = this.handleOrderModification(userMessage, previousOrder);
          this.logger.ai(branchId, '🔄 Pedido modificado usando contexto');
          return modifiedResponse;
        }
      }

      // Obtener configuración específica de la sucursal
      const menuContent = this.menuContent.get(branchId);
      const customPrompt = this.aiPrompts.get(branchId);
      const businessSettings = branchConfig || {};

      // Construir contexto completo con historial
      const fullContext = this.buildMenuContext(menuContent, userMessage);
      const conversationHistory = clientId ? await this.getConversationHistory(clientId, branchId) : [];
      
      // Intentar usar Hugging Face primero
      if (this.useHuggingFace && this.hf) {
        try {
          const response = await this.callHuggingFace(fullContext, userMessage, clientId);
          this.logger.ai(branchId, '🤖 Respuesta Hugging Face generada');
          return response;
        } catch (hfError) {
          this.logger.warn(`Error con Hugging Face, usando simulación: ${hfError.message}`);
          const response = await this.callContextualizedAI(fullContext, userMessage, businessType, businessSettings, customPrompt, clientId, branchId);
          this.logger.ai(branchId, '🤖 Respuesta simulación contextualizada generada');
          return response;
        }
      } else {
        // Usar simulación inteligente contextualizada
        const response = await this.callContextualizedAI(fullContext, userMessage, businessType, businessSettings, customPrompt, clientId, branchId);
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
  async callContextualizedAI(context, userMessage, businessType, businessSettings = {}, customPrompt = '', clientId = null, branchId = null) {
    const lowerMessage = userMessage.toLowerCase();
    
      // Procesando con IA contextualizada mejorada
    
    // Generar respuesta más inteligente basada en el contexto
    const contextualResponse = await this.generateContextualResponse(userMessage, businessType, context, businessSettings, branchId, clientId);
    
    // Si tenemos clientId y branchId, usar contexto avanzado
    if (clientId && branchId) {
      // Obtener contexto avanzado del cliente
      const clientContext = await this.getAdvancedClientContext(clientId, branchId);
      
      // Personalizar respuesta con contexto avanzado
      const personalizedResponse = this.generatePersonalizedResponse(clientContext, contextualResponse);
      
      // Actualizar contexto avanzado
      const intent = this.analyzeUserIntent(userMessage);
      await this.updateAdvancedClientContext(clientId, branchId, userMessage, personalizedResponse, intent);
      
      // Respuesta contextual generada
      
      return personalizedResponse;
    }
    
    // Respuesta contextual generada
    
    return contextualResponse;
  }

  // Generar respuesta contextual inteligente
  async generateContextualResponse(userMessage, businessType, context, businessSettings, branchId = null, clientId = null) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Cargar configuración automáticamente si no está en memoria
    if (branchId && !this.menuContent.has(branchId)) {
      console.log('🔄 Cargando configuración automáticamente para:', branchId);
      await this.loadBranchConfig(branchId);
    }
    
    // Análisis semántico mejorado
    const intent = this.analyzeUserIntent(userMessage);
    const sentiment = this.analyzeSentiment(userMessage);
    const urgency = this.analyzeUrgency(userMessage);
    
    console.log('🧠 Análisis semántico:');
    console.log(`   Intención: ${intent}`);
    console.log(`   Sentimiento: ${sentiment}`);
    console.log(`   Urgencia: ${urgency}`);
    
    // Generar respuesta basada en análisis
    return this.buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context, branchId, clientId);
  }

  // Analizar intención del usuario con tolerancia a errores de escritura
  analyzeUserIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Función para normalizar texto (corregir errores comunes)
    const normalizeText = (text) => {
      return text
        .replace(/ñ/g, 'n')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/[bcdfghjklmnpqrstvwxyz]{2,}/g, (match) => match[0]) // Reducir consonantes duplicadas
        .replace(/[aeiou]{2,}/g, (match) => match[0]) // Reducir vocales duplicadas
        .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();
    };
    
    const normalizedMessage = normalizeText(lowerMessage);
    
    // PRIORIDAD 1: Pedidos (con variaciones de escritura)
    const orderKeywords = [
      'pedido', 'pedir', 'pido', 'pidir', 'pedir',
      'orden', 'ordernar', 'ordenar', 'ordern',
      'quiero', 'quier', 'quero', 'quero',
      'dame', 'dam', 'dame', 'damelo',
      'me das', 'me da', 'me das',
      'tomar', 'tomar', 'tomar',
      'me gustaria', 'me gustaria', 'me gustaria', 'megustaria',
      'desayuno', 'desayuno', 'desayuno', 'desayuno',
      'almuerzo', 'almuerzo', 'almuerzo',
      'cena', 'cena', 'cena',
      'cappuccino', 'capuchino', 'capuccino', 'capuchino',
      'croissant', 'croisant', 'croisant', 'croisant',
      'yogurt', 'yogur', 'yogurt', 'yogur',
      'fruta', 'fruta', 'fruta',
      'sandwich', 'sandwich', 'sandwich', 'sandwich',
      'cafe americano', 'cafe americano', 'cafe americano'
    ];
    
    const hasOrderKeyword = orderKeywords.some(keyword => 
      normalizedMessage.includes(normalizeText(keyword))
    );
    
    if (hasOrderKeyword) {
      return 'hacer_pedido';
    }
    
    // PRIORIDAD 2: Saludos
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas') ||
        lowerMessage.includes('buen dia') || lowerMessage.includes('buenas tardes') || lowerMessage.includes('buenas noches')) {
      return 'saludo';
    }
    
    // PRIORIDAD 3: Consultas de menú
    if (lowerMessage.includes('menú') || lowerMessage.includes('menu') || lowerMessage.includes('qué tienen') ||
        lowerMessage.includes('bebidas') || lowerMessage.includes('café') || lowerMessage.includes('cafe') ||
        lowerMessage.includes('tienes') || lowerMessage.includes('tienen')) {
      return 'consulta_menu';
    }
    
    // PRIORIDAD 4: Recomendaciones
    if (lowerMessage.includes('recomendación') || lowerMessage.includes('recomendacion') || 
        lowerMessage.includes('recomienda') || lowerMessage.includes('recomienda') ||
        lowerMessage.includes('sugerencia') || lowerMessage.includes('sugerencia') ||
        lowerMessage.includes('qué me recomiendas') || lowerMessage.includes('que me recomiendas') ||
        lowerMessage.includes('qué me sugieres') || lowerMessage.includes('que me sugieres') ||
        lowerMessage.includes('no sé qué pedir') || lowerMessage.includes('no se que pedir') ||
        lowerMessage.includes('ayúdame a elegir') || lowerMessage.includes('ayudame a elegir')) {
      return 'recomendacion';
    }
    
    // PRIORIDAD 5: Otras consultas
    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('vale')) {
      return 'consulta_precio';
    } else if (lowerMessage.includes('agregar') || lowerMessage.includes('agrégale') || lowerMessage.includes('agregue') || 
               lowerMessage.includes('añadir') || lowerMessage.includes('añade') || lowerMessage.includes('poner') ||
               lowerMessage.includes('incluir') || lowerMessage.includes('sumar') || lowerMessage.includes('más')) {
      return 'modificar_pedido';
    } else if (lowerMessage.includes('total') || lowerMessage.includes('cuánto queda') || lowerMessage.includes('cuanto queda') ||
               lowerMessage.includes('suma') || lowerMessage.includes('precio final') || lowerMessage.includes('costo total')) {
      return 'consulta_total';
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
  buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context, branchId = null, clientId = null) {
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
      recomendacion: {
        positivo: [
          "¡Perfecto! 😊 Me encanta ayudarte a encontrar algo delicioso. Te haré algunas preguntas:",
          "¡Excelente! 😊 Vamos a encontrar tu opción perfecta. Te pregunto:",
          "¡Genial! 😊 Te ayudo a elegir algo increíble. Respondeme:",
          "¡Fantástico! 😊 Vamos a descubrir qué te va a encantar. Te pregunto:",
          "¡Qué bueno! 😊 Te ayudo a encontrar tu favorito. Respondeme:"
        ],
        neutral: [
          "Claro, te ayudo a elegir algo perfecto para ti. Te pregunto:",
          "Por supuesto, vamos a encontrar tu opción ideal. Respondeme:",
          "Perfecto, te ayudo a decidir. Te pregunto:",
          "Por supuesto, vamos a encontrar algo delicioso. Respondeme:",
          "Claro, te ayudo a elegir. Te pregunto:"
        ],
        negativo: [
          "Entiendo que necesitas ayuda para elegir. Te pregunto:",
          "Claro, te ayudo a encontrar algo que te guste. Respondeme:",
          "Por supuesto, vamos a encontrar tu opción perfecta. Te pregunto:",
          "Entiendo, te ayudo a decidir. Respondeme:",
          "Claro, vamos a encontrar algo delicioso para ti. Te pregunto:"
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
      "Entiendo tu consulta. ¿Cómo puedo ayudarte?"
    ];

    // Seleccionar respuesta aleatoria
    const selectedResponse = baseResponse[Math.floor(Math.random() * baseResponse.length)];

    // Agregar contenido específico según el tipo de negocio
    let specificContent = '';
    if (intent === 'consulta_menu') {
      // Usar el menú específico de la sucursal si está disponible
      if (branchId && this.menuContent.has(branchId)) {
        specificContent = this.menuContent.get(branchId);
      } else {
        specificContent = this.getMenuContent(businessType);
      }
    } else if (intent === 'consulta_precio') {
      specificContent = this.getPriceInfo(businessType);
    } else if (intent === 'hacer_pedido') {
      // Procesar pedido automáticamente si detecta productos específicos
      const orderAnalysis = this.processOrder(userMessage);
      if (orderAnalysis.products.length > 0) {
        specificContent = this.generateOrderResponse(orderAnalysis);
      } else {
        specificContent = this.getOrderInfo(businessType);
      }
    } else if (intent === 'consulta_horario') {
      specificContent = this.getScheduleInfo(businessType);
    } else if (intent === 'consulta_ubicacion') {
      specificContent = this.getLocationInfo(businessType);
    } else if (intent === 'recomendacion') {
      specificContent = this.getRecommendationQuestion(clientId, branchId);
    }

    // Construir respuesta final
    let finalResponse = selectedResponse;
    if (specificContent) {
      finalResponse += '\n\n' + specificContent;
    }

    // Conversación más natural sin frases repetitivas

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

  // Sistema de recomendaciones estilo Akinator
  getRecommendationQuestion(clientId, branchId) {
    // Obtener o crear perfil de recomendaciones del cliente
    const recommendationProfile = this.getRecommendationProfile(clientId, branchId);
    
    // Determinar qué pregunta hacer basada en el progreso
    const questionNumber = recommendationProfile.questionsAnswered;
    
    const questions = [
      {
        question: "¿Qué prefieres para desayunar?",
        options: ["Algo dulce", "Algo salado", "Algo balanceado", "No sé"],
        category: "preference"
      },
      {
        question: "¿Te gusta más el café fuerte o suave?",
        options: ["Fuerte", "Suave", "No me gusta el café", "Me da igual"],
        category: "coffee_strength"
      },
      {
        question: "¿Prefieres bebidas calientes o frías?",
        options: ["Calientes", "Frías", "Ambas", "No sé"],
        category: "temperature"
      },
      {
        question: "¿Te gustan los postres?",
        options: ["Sí, mucho", "A veces", "No mucho", "No me gustan"],
        category: "desserts"
      },
      {
        question: "¿Cuál es tu presupuesto aproximado?",
        options: ["$3,000 - $5,000", "$5,000 - $8,000", "$8,000 - $12,000", "No importa"],
        category: "budget"
      }
    ];
    
    if (questionNumber >= questions.length) {
      // Generar recomendación final
      return this.generateFinalRecommendation(recommendationProfile, branchId);
    }
    
    const currentQuestion = questions[questionNumber];
    
    return `🤖 *PREGUNTA ${questionNumber + 1} DE ${questions.length}*

${currentQuestion.question}

📝 *OPCIONES:*
${currentQuestion.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}

Responde con el número de tu opción preferida (1, 2, 3 o 4)`;
  }

  // Obtener perfil de recomendaciones del cliente
  getRecommendationProfile(clientId, branchId) {
    const profileKey = `recommendation_${clientId}_${branchId}`;
    
    if (!this.recommendationProfiles) {
      this.recommendationProfiles = new Map();
    }
    
    if (!this.recommendationProfiles.has(profileKey)) {
      this.recommendationProfiles.set(profileKey, {
        questionsAnswered: 0,
        answers: [],
        preferences: {},
        lastActivity: new Date()
      });
    }
    
    return this.recommendationProfiles.get(profileKey);
  }

  // Generar recomendación final basada en las respuestas
  generateFinalRecommendation(profile, branchId) {
    const recommendations = [];
    
    // Obtener productos del menú cargado en la sucursal
    const menuProducts = this.getMenuProductsFromBranch(branchId);
    
    // Lógica de recomendación basada en respuestas
    if (profile.answers[0] === "Algo dulce") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['frappé', 'muffin', 'cheesecake', 'tiramisú', 'brownie', 'postres']));
    } else if (profile.answers[0] === "Algo salado") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['desayuno', 'sandwich', 'croissant', 'panini', 'wrap']));
    } else {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['desayuno', 'café', 'bebidas']));
    }
    
    if (profile.answers[1] === "Fuerte") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['americano', 'mocha', 'espresso']));
    } else if (profile.answers[1] === "Suave") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['latte', 'cappuccino', 'macchiato']));
    }
    
    if (profile.answers[2] === "Frías") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['frappé', 'helado', 'smoothie', 'limonada']));
    } else if (profile.answers[2] === "Calientes") {
      recommendations.push(...this.filterProductsByCategory(menuProducts, ['americano', 'cappuccino', 'latte', 'mocha']));
    }
    
    // Aplicar filtro de presupuesto si está disponible
    if (profile.answers[4]) {
      const budgetFilter = this.getBudgetFilter(profile.answers[4]);
      recommendations.push(...this.filterProductsByPrice(menuProducts, budgetFilter));
    }
    
    // Eliminar duplicados y tomar los primeros 3
    const uniqueRecommendations = [...new Set(recommendations)].slice(0, 3);
    
    return `🎯 *RECOMENDACIONES PERSONALIZADAS PARA TI*

Basándome en tus respuestas, te recomiendo:

${uniqueRecommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

💡 *¿Te gusta alguna de estas opciones?*
Responde con el número de tu favorita o escribe "otra" si quieres más opciones.

🔄 *¿Quieres empezar de nuevo?*
Escribe "recomendación" para hacer el test otra vez.`;
  }

  // Obtener productos del menú cargado en la sucursal
  getMenuProductsFromBranch(branchId) {
    // Extraer productos del menú cargado en memoria
    const menuContent = this.menuContent.get(branchId) || '';
    
    // Parsear el menú para extraer productos y precios
    const products = [];
    
    // Buscar patrones de productos con precios
    const productPattern = /•\s*([^-\n]+?)\s*-\s*\$([0-9,\.]+)/g;
    let match;
    
    while ((match = productPattern.exec(menuContent)) !== null) {
      const productName = match[1].trim();
      const price = parseInt(match[2].replace(/[,\s]/g, ''));
      
      products.push({
        name: productName,
        price: price,
        category: this.categorizeProduct(productName)
      });
    }
    
    return products;
  }

  // Categorizar producto basado en su nombre
  categorizeProduct(productName) {
    const name = productName.toLowerCase();
    
    if (name.includes('frappé') || name.includes('frappe')) return 'frappé';
    if (name.includes('americano')) return 'americano';
    if (name.includes('cappuccino') || name.includes('capuchino')) return 'cappuccino';
    if (name.includes('latte')) return 'latte';
    if (name.includes('mocha')) return 'mocha';
    if (name.includes('helado')) return 'helado';
    if (name.includes('muffin')) return 'muffin';
    if (name.includes('croissant') || name.includes('croisant')) return 'croissant';
    if (name.includes('brownie')) return 'brownie';
    if (name.includes('cheesecake')) return 'cheesecake';
    if (name.includes('tiramisú') || name.includes('tiramisu')) return 'tiramisú';
    if (name.includes('desayuno')) return 'desayuno';
    if (name.includes('sandwich')) return 'sandwich';
    if (name.includes('panini')) return 'panini';
    if (name.includes('wrap')) return 'wrap';
    if (name.includes('smoothie')) return 'smoothie';
    if (name.includes('limonada')) return 'limonada';
    if (name.includes('jugo')) return 'jugo';
    
    return 'otros';
  }

  // Filtrar productos por categoría
  filterProductsByCategory(products, categories) {
    return products
      .filter(product => categories.some(cat => product.category === cat))
      .map(product => product.name);
  }

  // Filtrar productos por precio
  filterProductsByPrice(products, budgetFilter) {
    return products
      .filter(product => product.price >= budgetFilter.min && product.price <= budgetFilter.max)
      .map(product => product.name);
  }

  // Obtener filtro de presupuesto
  getBudgetFilter(budgetAnswer) {
    switch (budgetAnswer) {
      case "$3,000 - $5,000":
        return { min: 3000, max: 5000 };
      case "$5,000 - $8,000":
        return { min: 5000, max: 8000 };
      case "$8,000 - $12,000":
        return { min: 8000, max: 12000 };
      default:
        return { min: 0, max: 50000 };
    }
  }

  // Procesar respuesta de recomendación
  processRecommendationAnswer(clientId, branchId, answer) {
    const profile = this.getRecommendationProfile(clientId, branchId);
    
    // Si es un número, es una respuesta a la pregunta
    if (/^[1-4]$/.test(answer.trim())) {
      const questionNumber = profile.questionsAnswered;
      const questions = [
        { options: ["Algo dulce", "Algo salado", "Algo balanceado", "No sé"] },
        { options: ["Fuerte", "Suave", "No me gusta el café", "Me da igual"] },
        { options: ["Calientes", "Frías", "Ambas", "No sé"] },
        { options: ["Sí, mucho", "A veces", "No mucho", "No me gustan"] },
        { options: ["$3,000 - $5,000", "$5,000 - $8,000", "$8,000 - $12,000", "No importa"] }
      ];
      
      const selectedOption = questions[questionNumber].options[parseInt(answer) - 1];
      profile.answers[questionNumber] = selectedOption;
      profile.questionsAnswered++;
      profile.lastActivity = new Date();
      
      return this.getRecommendationQuestion(clientId, branchId);
    }
    
    // Si es "otra", dar más opciones
    if (answer.toLowerCase().includes('otra')) {
      return this.getAdditionalRecommendations(profile, branchId);
    }
    
    // Si es "recomendación", reiniciar
    if (answer.toLowerCase().includes('recomendación') || answer.toLowerCase().includes('recomendacion')) {
      profile.questionsAnswered = 0;
      profile.answers = [];
      profile.preferences = {};
      return this.getRecommendationQuestion(clientId, branchId);
    }
    
    return "No entendí tu respuesta. Por favor responde con un número (1, 2, 3 o 4) o escribe 'otra' para más opciones.";
  }

  // Obtener recomendaciones adicionales
  getAdditionalRecommendations(profile, branchId) {
    // Obtener productos del menú cargado en la sucursal
    const menuProducts = this.getMenuProductsFromBranch(branchId);
    
    // Filtrar productos que no hayan sido recomendados anteriormente
    const allProducts = menuProducts.map(product => product.name);
    const additionalOptions = allProducts.slice(0, 5); // Tomar los primeros 5 productos del menú
    
    return `🍽️ *MÁS OPCIONES PARA TI*

${additionalOptions.map((option, index) => `${index + 1}. ${option}`).join('\n')}

💡 *¿Te gusta alguna de estas opciones?*
Responde con el número de tu favorita.

🔄 *¿Quieres empezar de nuevo?*
Escribe "recomendación" para hacer el test otra vez.`;
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

  // Procesar pedido automáticamente
  processOrder(message) {
    const lowerMessage = message.toLowerCase();
    
    console.log('🛒 ===== PROCESANDO PEDIDO =====');
    console.log('💬 Mensaje original:', message);
    console.log('🔍 Mensaje normalizado:', lowerMessage);
    console.log('================================');
    
    // Función para normalizar texto (misma que en analyzeUserIntent)
    const normalizeText = (text) => {
      return text
        .replace(/ñ/g, 'n')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ü/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/[bcdfghjklmnpqrstvwxyz]{2,}/g, (match) => match[0])
        .replace(/[aeiou]{2,}/g, (match) => match[0])
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Función para calcular distancia de Levenshtein (similitud entre strings)
    const levenshteinDistance = (str1, str2) => {
      const matrix = [];
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    };

    // Función para calcular similitud porcentual entre dos strings
    const calculateSimilarity = (str1, str2) => {
      const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
      const maxLength = Math.max(str1.length, str2.length);
      return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
    };

    // Función para encontrar productos similares
    const findSimilarProducts = (searchTerm, products, threshold = 60) => {
      const normalizedSearchTerm = normalizeText(searchTerm);
      const similarProducts = [];
      
      for (const [productName, productInfo] of Object.entries(products)) {
        const normalizedProductName = normalizeText(productName);
        
        // Calcular similitud con el nombre del producto
        const nameSimilarity = calculateSimilarity(normalizedSearchTerm, normalizedProductName);
        
        // Calcular similitud con aliases
        let maxAliasSimilarity = 0;
        if (productInfo.aliases) {
          for (const alias of productInfo.aliases) {
            const aliasSimilarity = calculateSimilarity(normalizedSearchTerm, normalizeText(alias));
            maxAliasSimilarity = Math.max(maxAliasSimilarity, aliasSimilarity);
          }
        }
        
        // Usar la mayor similitud encontrada
        const maxSimilarity = Math.max(nameSimilarity, maxAliasSimilarity);
        
        if (maxSimilarity >= threshold) {
          similarProducts.push({
            name: productName,
            info: productInfo,
            similarity: maxSimilarity,
            matchType: nameSimilarity >= maxAliasSimilarity ? 'name' : 'alias'
          });
        }
      }
      
      // Ordenar por similitud descendente
      return similarProducts.sort((a, b) => b.similarity - a.similarity);
    };

    // Función mejorada para buscar productos con detección inteligente
    const findProductIntelligent = (searchTerm, products) => {
      const normalizedSearchTerm = normalizeText(searchTerm);
      
      // 1. Búsqueda exacta primero
      for (const [productName, productInfo] of Object.entries(products)) {
        const normalizedProductName = normalizeText(productName);
        
        if (normalizedSearchTerm.includes(normalizedProductName)) {
          return { 
            name: productName, 
            info: productInfo, 
            confidence: 100,
            matchType: 'exact'
          };
        }
        
        // Buscar en aliases
        if (productInfo.aliases) {
          for (const alias of productInfo.aliases) {
            const normalizedAlias = normalizeText(alias);
            if (normalizedSearchTerm.includes(normalizedAlias)) {
              return { 
                name: productName, 
                info: productInfo, 
                confidence: 95,
                matchType: 'alias'
              };
            }
          }
        }
      }
      
      // 2. Búsqueda por similitud si no se encuentra exacto
      const similarProducts = findSimilarProducts(searchTerm, products, 40); // Reducir threshold más
      
      if (similarProducts.length > 0) {
        const bestMatch = similarProducts[0];
        
        // Usar detección inteligente si la similitud es razonable
        if (bestMatch.similarity >= 50) {
          return {
            name: bestMatch.name,
            info: bestMatch.info,
            confidence: bestMatch.similarity,
            matchType: 'similar',
            suggestions: similarProducts.slice(1, 3) // Top 2 alternativas
          };
        }
      }
      
      return null;
    };
    
    // Base de datos de productos con precios (mejorada con más aliases)
    const products = {
      // Cafés
      'café americano': { price: 3500, category: 'café', aliases: ['americano', 'cafe americano', 'americano', 'americano'] },
      'americano': { price: 3500, category: 'café', aliases: ['café americano', 'cafe americano', 'americano'] },
      'cappuccino': { price: 4000, category: 'café', aliases: ['capuchino', 'capuccino', 'capuchino', 'capuccino', 'capuchino', 'capuchino', 'capuccino'] },
      'capuchino': { price: 4000, category: 'café', aliases: ['cappuccino', 'capuccino', 'capuchino'] },
      'capuccino': { price: 4000, category: 'café', aliases: ['cappuccino', 'capuchino', 'capuccino'] },
      'café latte': { price: 4200, category: 'café', aliases: ['latte', 'cafe latte', 'latte'] },
      'latte': { price: 4200, category: 'café', aliases: ['café latte', 'cafe latte'] },
      'mocha': { price: 4800, category: 'café', aliases: ['mocha', 'moca', 'moca'] },
      'frappé de vainilla': { price: 4800, category: 'café', aliases: ['frappe vainilla', 'frappé vainilla', 'frappe vainilla', 'frappe vainilla', 'frappe vainilla', 'frappe vainilla'] },
      'frappe de vainilla': { price: 4800, category: 'café', aliases: ['frappé de vainilla', 'frappe vainilla', 'frappe vainilla'] },
      'frappé de chocolate': { price: 5200, category: 'café', aliases: ['frappe chocolate', 'frappé chocolate', 'frappe chocolate', 'frappe chocolate'] },
      'frappe de chocolate': { price: 5200, category: 'café', aliases: ['frappé de chocolate', 'frappe chocolate', 'frappe chocolate'] },
      'arepa con huevo': { price: 6500, category: 'desayuno', aliases: ['arepa huevo', 'arepa'] },
      'calentado paisa': { price: 8000, category: 'desayuno', aliases: ['calentado', 'paisa'] },
      'café helado': { price: 4500, category: 'café', aliases: ['cafe helado', 'café frío', 'cafe helado', 'cafe helado', 'cafe helado', 'cafe helado'] },
      'cafe helado': { price: 4500, category: 'café', aliases: ['café helado', 'cafe helado', 'cafe helado'] },
      
      // Pastelería
      'croissant simple': { price: 3000, category: 'pastelería', aliases: ['croissant', 'croissant básico', 'croisant', 'croisant', 'croisant'] },
      'croissant': { price: 3000, category: 'pastelería', aliases: ['croissant simple', 'croisant', 'croisant'] },
      'croisant': { price: 3000, category: 'pastelería', aliases: ['croissant', 'croissant simple', 'croisant'] },
      'croissant con jamón y queso': { price: 4500, category: 'pastelería', aliases: ['croissant jamón queso', 'croissant jamon queso'] },
      'wrap de pollo': { price: 5500, category: 'comida', aliases: ['wrap pollo', 'wrap con pollo', 'wrap pollo'] },
      'muffin de arándanos': { price: 2500, category: 'pastelería', aliases: ['muffin arándanos', 'muffin arandanos'] },
      'muffin de chocolate': { price: 4000, category: 'pastelería', aliases: ['muffin chocolate'] },
      'muffin': { price: 2500, category: 'pastelería', aliases: ['muffin de arándanos'] },
      'brownie de chocolate': { price: 3200, category: 'pastelería', aliases: ['brownie', 'brownie chocolate'] },
      'brownie': { price: 3200, category: 'pastelería', aliases: ['brownie de chocolate'] },
      'cheesecake de fresa': { price: 4800, category: 'pastelería', aliases: ['cheesecake', 'cheesecake fresa'] },
      'tiramisú': { price: 5200, category: 'pastelería', aliases: ['tiramisu'] },
      'crepes de nutella': { price: 8500, category: 'postres', aliases: ['crepes nutella', 'crepe de nutella', 'crepe nutella'] },
      'flan de caramelo': { price: 5500, category: 'postres', aliases: ['flan', 'flan caramelo', 'flan de caramelo'] },
      
      // Bebidas
      'limonada de coco': { price: 4000, category: 'bebida', aliases: ['limonada coco', 'limonada con coco', 'limonada coco'] },
      'limonada natural': { price: 3500, category: 'bebida', aliases: ['limonada', 'limonada natural'] },
      
      // Productos adicionales del menú real
      'torta de zanahoria': { price: 6000, category: 'postres', aliases: ['torta zanahoria', 'torta de zanahoria'] },
      'ensalada césar': { price: 12000, category: 'almuerzos', aliases: ['ensalada cesar', 'cesar', 'ensalada cesar'] },
      'torta de chocolate': { price: 6500, category: 'postres', aliases: ['torta chocolate', 'torta de chocolate'] },
      'tiramisu': { price: 7500, category: 'postres', aliases: ['tiramisu', 'tiramisú'] },
      'sundae de chocolate': { price: 8000, category: 'postres', aliases: ['sundae chocolate', 'sundae de chocolate'] },
      'banana split': { price: 9500, category: 'postres', aliases: ['banana split', 'banana'] },
      'waffle con helado': { price: 10000, category: 'postres', aliases: ['waffle helado', 'waffle con helado'] },
      'smoothie de frutas': { price: 5000, category: 'bebida', aliases: ['smoothie', 'smoothie frutas'] },
      'jugo de naranja': { price: 3500, category: 'bebida', aliases: ['jugo naranja', 'naranja'] },
      'jugo de manzana': { price: 3500, category: 'bebida', aliases: ['jugo manzana', 'manzana'] },
      'agua': { price: 2000, category: 'bebida', aliases: ['agua natural'] },
      'gaseosa': { price: 3000, category: 'bebida', aliases: ['refresco', 'soda'] },
      
      // Desayunos
      'desayuno ejecutivo': { price: 12000, category: 'desayuno', aliases: ['desayuno ejecutivo', 'ejecutivo'] },
      'desayuno continental': { price: 8500, category: 'desayuno', aliases: ['desayuno continental', 'continental'] },
      'desayuno saludable': { price: 10000, category: 'desayuno', aliases: ['desayuno saludable', 'saludable'] },
      
      // Tés e Infusiones (FALTANTES)
      'té negro': { price: 2800, category: 'té', aliases: ['te negro', 'té negro', 'te negro'] },
      'té verde': { price: 2800, category: 'té', aliases: ['te verde', 'té verde', 'te verde'] },
      'té de hierbas': { price: 3000, category: 'té', aliases: ['te hierbas', 'té hierbas', 'te de hierbas'] },
      'té de manzanilla': { price: 3000, category: 'té', aliases: ['te manzanilla', 'té manzanilla', 'te de manzanilla'] },
      'té de jengibre': { price: 3200, category: 'té', aliases: ['te jengibre', 'té jengibre', 'te de jengibre'] },
      'chocolate caliente': { price: 4500, category: 'bebida caliente', aliases: ['chocolate', 'chocolate caliente'] },
      'aromática de canela': { price: 3500, category: 'bebida caliente', aliases: ['aromática canela', 'aromática de canela'] },
      
      // Cafés (FALTANTES)
      'café con leche': { price: 4000, category: 'café', aliases: ['cafe con leche', 'café con leche'] },
      'latte': { price: 4800, category: 'café', aliases: ['latte', 'café latte'] },
      'mocha': { price: 5200, category: 'café', aliases: ['mocha', 'café mocha'] },
      'macchiato': { price: 4700, category: 'café', aliases: ['macchiato', 'café macchiato'] },
      'café descafeinado': { price: 3800, category: 'café', aliases: ['cafe descafeinado', 'descafeinado'] },
      'espresso doble': { price: 4000, category: 'café', aliases: ['espresso doble', 'doble espresso'] },
      
      // Bebidas Frías (FALTANTES)
      'café helado': { price: 4000, category: 'café frío', aliases: ['cafe helado', 'café helado'] },
      'frappé de café': { price: 5500, category: 'café frío', aliases: ['frappe cafe', 'frappé cafe'] },
      'cold brew': { price: 4500, category: 'café frío', aliases: ['cold brew', 'coldbrew'] },
      'iced latte': { price: 5000, category: 'café frío', aliases: ['iced latte', 'latte helado'] },
      'frappé de mocha': { price: 6000, category: 'café frío', aliases: ['frappe mocha', 'frappé mocha'] },
      
      // Jugos y Refrescos (FALTANTES)
      'jugo de naranja natural': { price: 4500, category: 'jugo', aliases: ['jugo naranja', 'naranja natural'] },
      'jugo de maracuyá': { price: 4800, category: 'jugo', aliases: ['jugo maracuyá', 'maracuyá'] },
      'jugo de mango': { price: 4800, category: 'jugo', aliases: ['jugo mango', 'mango'] },
      'limonada natural': { price: 3500, category: 'bebida', aliases: ['limonada', 'limonada natural'] },
      'limonada de coco': { price: 4000, category: 'bebida', aliases: ['limonada coco', 'limonada de coco'] },
      'agua de panela': { price: 2500, category: 'bebida', aliases: ['agua panela', 'panela'] },
      'gaseosa': { price: 3000, category: 'bebida', aliases: ['refresco', 'soda'] },
      
      // Pastelería (FALTANTES)
      'croissant simple': { price: 3500, category: 'pastelería', aliases: ['croissant', 'croissant simple'] },
      'croissant con jamón y queso': { price: 5500, category: 'pastelería', aliases: ['croissant jamón queso', 'croissant jamon queso'] },
      'muffin de arándanos': { price: 4000, category: 'pastelería', aliases: ['muffin arándanos', 'muffin arandanos'] },
      'muffin de chocolate': { price: 4000, category: 'pastelería', aliases: ['muffin chocolate', 'muffin de chocolate'] },
      'donut glaseado': { price: 3000, category: 'pastelería', aliases: ['donut', 'donas', 'donut glaseado'] },
      'brownie': { price: 4500, category: 'pastelería', aliases: ['brownie', 'brownie chocolate'] },
      'cheesecake': { price: 6000, category: 'pastelería', aliases: ['cheesecake', 'cheesecake de fresa'] },
      
      // Sopas (FALTANTES)
      'sopa de pollo': { price: 8500, category: 'sopa', aliases: ['sopa pollo', 'crema pollo'] },
      'crema de espinacas': { price: 7500, category: 'sopa', aliases: ['crema espinacas', 'sopa espinacas'] },
      'sopa de lentejas': { price: 8000, category: 'sopa', aliases: ['sopa lentejas', 'lentejas'] },
      'sopa de verduras': { price: 7000, category: 'sopa', aliases: ['sopa verduras', 'verduras'] },
      
      // Platos Principales (FALTANTES)
      'ensalada césar': { price: 12000, category: 'ensalada', aliases: ['ensalada cesar', 'cesar'] },
      'ensalada de pollo': { price: 13500, category: 'ensalada', aliases: ['ensalada pollo', 'pollo ensalada'] },
      'sandwich club': { price: 11000, category: 'sandwich', aliases: ['club sandwich', 'sandwich club'] },
      'hamburguesa clásica': { price: 15000, category: 'hamburguesa', aliases: ['hamburguesa', 'hamburguesa clasica'] },
      'hamburguesa con queso': { price: 16500, category: 'hamburguesa', aliases: ['hamburguesa queso', 'hamburguesa con queso'] },
      'wrap de pollo': { price: 10500, category: 'wrap', aliases: ['wrap pollo', 'wrap con pollo'] },
      'wrap vegetariano': { price: 9500, category: 'wrap', aliases: ['wrap vegetal', 'wrap veggie'] },
      'pasta alfredo': { price: 14000, category: 'pasta', aliases: ['alfredo', 'pasta alfredo'] },
      'pasta bolognesa': { price: 15500, category: 'pasta', aliases: ['bolognesa', 'pasta bolognesa'] },
      
      // Acompañamientos (FALTANTES)
      'papas a la francesa': { price: 5500, category: 'acompañamiento', aliases: ['papas francesas', 'papas fritas'] },
      'papas rústicas': { price: 6000, category: 'acompañamiento', aliases: ['papas rusticas', 'papas rusticas'] },
      'ensalada verde': { price: 4500, category: 'ensalada', aliases: ['ensalada verde', 'verde'] },
      'arroz blanco': { price: 3500, category: 'acompañamiento', aliases: ['arroz', 'arroz blanco'] },
      
      // Postres Caseros (FALTANTES)
      'torta de chocolate': { price: 6500, category: 'postres', aliases: ['torta chocolate', 'torta de chocolate'] },
      'torta de zanahoria': { price: 6000, category: 'postres', aliases: ['torta zanahoria', 'torta de zanahoria'] },
      'tiramisu': { price: 7500, category: 'postres', aliases: ['tiramisu', 'tiramisú'] },
      'flan de caramelo': { price: 5500, category: 'postres', aliases: ['flan', 'flan caramelo'] },
      'helado de vainilla': { price: 4000, category: 'helado', aliases: ['helado vainilla', 'vainilla'] },
      'helado de chocolate': { price: 4000, category: 'helado', aliases: ['helado chocolate', 'chocolate helado'] },
      'helado de fresa': { price: 4000, category: 'helado', aliases: ['helado fresa', 'fresa helado'] },
      
      // Postres Especiales (FALTANTES)
      'sundae de chocolate': { price: 8000, category: 'postres', aliases: ['sundae chocolate', 'sundae de chocolate'] },
      'banana split': { price: 9500, category: 'postres', aliases: ['banana split', 'banana'] },
      'waffle con helado': { price: 10000, category: 'postres', aliases: ['waffle helado', 'waffle con helado'] },
      'crepes de nutella': { price: 8500, category: 'postres', aliases: ['crepes nutella', 'crepe de nutella'] }
    };
    
    const detectedProducts = [];
    let subtotal = 0;
    
    // Función para buscar productos con detección inteligente de errores
    const findProduct = (searchTerm) => {
      return findProductIntelligent(searchTerm, products);
    };
    
    // Detectar desayunos completos primero
    if (lowerMessage.includes('desayuno empresarial') || 
        (lowerMessage.includes('cappuccino') && lowerMessage.includes('croissant') && 
         lowerMessage.includes('yogurt') && lowerMessage.includes('fruta'))) {
      detectedProducts.push({
        name: 'Desayuno Empresarial',
        quantity: 1,
        price: 12000,
        total: 12000,
        category: 'desayuno'
      });
      subtotal += 12000;
    } else if (lowerMessage.includes('desayuno ejecutivo') || 
               (lowerMessage.includes('café americano') && lowerMessage.includes('sandwich') && 
                lowerMessage.includes('jugo'))) {
      detectedProducts.push({
        name: 'Desayuno Ejecutivo',
        quantity: 1,
        price: 8500,
        total: 8500,
        category: 'desayuno'
      });
      subtotal += 8500;
    } else if (lowerMessage.includes('desayuno express') || 
               (lowerMessage.includes('café') && lowerMessage.includes('muffin') && 
                lowerMessage.includes('agua'))) {
      detectedProducts.push({
        name: 'Desayuno Express',
        quantity: 1,
        price: 6500,
        total: 6500,
        category: 'desayuno'
      });
      subtotal += 6500;
    } else if (lowerMessage.includes('desayuno') && 
               (lowerMessage.includes('café americano') || lowerMessage.includes('cafe americano')) && 
               (lowerMessage.includes('sandwich') || lowerMessage.includes('sandwich mixto'))) {
      // Desayuno personalizado con café americano + sandwich
      detectedProducts.push({
        name: 'Desayuno Personalizado',
        quantity: 1,
        price: 7000, // Café americano ($3,500) + Sandwich mixto (~$3,500)
        total: 7000,
        category: 'desayuno'
      });
      subtotal += 7000;
    }
    
    // Dividir el mensaje en partes para buscar productos
    const messageParts = lowerMessage.split(/[,\s]+/);
    const processedParts = new Set(); // Para evitar duplicados
    
    // Buscar patrones de cantidad + producto
    const quantityPattern = /(\d+)\s+([^,\d]+)/g;
    let match;
    
    while ((match = quantityPattern.exec(lowerMessage)) !== null) {
      const quantity = parseInt(match[1]);
      const productText = match[2].trim();
      
      const product = findProduct(productText);
      if (product && !processedParts.has(productText)) {
        const totalPrice = product.info.price * quantity;
        subtotal += totalPrice;
        
        detectedProducts.push({
          name: product.name,
          quantity: quantity,
          price: product.info.price,
          total: totalPrice,
          category: product.info.category
        });
        
        processedParts.add(productText);
        
        // Logging mejorado para mostrar tipo de detección
        let detectionInfo = '';
        if (product.confidence === 100) {
          detectionInfo = '✅ Detección exacta';
        } else if (product.confidence >= 95) {
          detectionInfo = '🎯 Detección por alias';
        } else if (product.confidence >= 70) {
          detectionInfo = `🔍 Detección inteligente (${Math.round(product.confidence)}% similitud)`;
        }
        
        console.log(`${detectionInfo}: ${product.name} - $${product.info.price}`);
        
        // Mostrar sugerencias si es detección inteligente
        if (product.suggestions && product.suggestions.length > 0) {
          console.log(`   💡 Alternativas encontradas: ${product.suggestions.map(s => s.name).join(', ')}`);
        }
      }
    }
    
    // Buscar productos sin cantidad específica (cantidad = 1)
    // Usar una búsqueda más precisa basada en el mensaje completo
    
    // Buscar productos específicos en el mensaje completo
    // Ordenar por longitud (más específicos primero) para evitar coincidencias parciales
    const sortedProducts = Object.entries(products).sort((a, b) => b[0].length - a[0].length);
    
    for (const [productName, productInfo] of sortedProducts) {
      if (lowerMessage.includes(productName) && !processedParts.has(productName)) {
        // Verificar que no sea un subproducto de algo ya procesado
        let isSubProduct = false;
        for (const processedPart of processedParts) {
          if (processedPart.includes(productName) && processedPart !== productName) {
            isSubProduct = true;
            break;
          }
        }
        
        // Verificar que no haya sido procesado con cantidad específica
        let alreadyProcessed = false;
        for (const detectedProduct of detectedProducts) {
          if (detectedProduct.name === productName) {
            alreadyProcessed = true;
            break;
          }
        }
        
        // Verificar que no haya sido procesado con cantidad específica usando processedParts
        if (processedParts.has(productName)) {
          alreadyProcessed = true;
        }
        
        if (!isSubProduct && !alreadyProcessed) {
          const totalPrice = productInfo.price;
          subtotal += totalPrice;
          
          detectedProducts.push({
            name: productName,
            quantity: 1,
            price: productInfo.price,
            total: totalPrice,
            category: productInfo.category
          });
          
          processedParts.add(productName);
          console.log(`✅ Producto detectado: ${productName} - $${productInfo.price}`);
        }
      }
    }
    
    // Búsqueda adicional usando findProduct para aliases cortos (deshabilitada temporalmente)
    // const messageWords = lowerMessage.split(/[,\s]+/).filter(part => part.length > 2);
    
    // for (const word of messageWords) {
    //   if (!processedParts.has(word)) {
    //     const product = findProduct(word);
    //     if (product) {
    //       const totalPrice = product.info.price;
    //       subtotal += totalPrice;
          
    //       detectedProducts.push({
    //         name: product.name,
    //         quantity: 1,
    //         price: product.info.price,
    //         total: totalPrice,
    //         category: product.info.category
    //       });
          
    //       processedParts.add(word);
    //       console.log(`✅ Producto detectado por alias: ${product.name} - $${product.info.price}`);
    //     }
    //   }
    // }
    
    // Calcular delivery (gratis para pedidos > $20,000)
    const deliveryFee = subtotal < 20000 ? 3000 : 0;
    const total = subtotal + deliveryFee;
    
    console.log(`💰 Subtotal: $${subtotal.toLocaleString()}`);
    console.log(`🚚 Delivery: $${deliveryFee.toLocaleString()}`);
    console.log(`💵 Total: $${total.toLocaleString()}`);
    
    return {
      products: detectedProducts,
      subtotal: subtotal,
      delivery: deliveryFee > 0,
      deliveryFee: deliveryFee,
      total: total,
      hasProducts: detectedProducts.length > 0
    };
  }
  
  // Generar respuesta de pedido
  generateOrderResponse(orderAnalysis) {
    if (!orderAnalysis.hasProducts) {
      return `No pude identificar productos específicos en tu pedido. ¿Podrías ser más específico? Por ejemplo: "quiero 2 cafés americanos"`;
    }
    
    let response = `🛒 *RESUMEN DE TU PEDIDO*\n\n`;
    
    orderAnalysis.products.forEach((product, index) => {
      response += `${index + 1}. ${product.name} x${product.quantity} - $${product.total.toLocaleString()}\n`;
    });
    
    response += `\n💰 *TOTALES*\n`;
    response += `Subtotal: $${orderAnalysis.subtotal.toLocaleString()}\n`;
    
    if (orderAnalysis.delivery) {
      response += `Delivery: $${orderAnalysis.deliveryFee.toLocaleString()}\n`;
    } else {
      response += `Delivery: ¡Gratis! (pedido > $20,000)\n`;
    }
    
    response += `**Total: $${orderAnalysis.total.toLocaleString()}**\n\n`;
    
    if (orderAnalysis.total >= 20000) {
      response += `🎉 ¡Tu pedido califica para delivery gratis!\n\n`;
    }
    
    response += `¿Confirmas este pedido?`;
    
    return response;
  }

  // Guardar mensaje en historial de conversación
  async saveConversationMessage(clientId, branchId, userMessage, intent) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      await db.collection('conversations').updateOne(
        { 
          clientId: clientId,
          branchId: branchId 
        },
        { 
          $push: { 
            messages: {
              user: userMessage,
              timestamp: new Date(),
              intent: intent
            }
          },
          $set: {
            lastActivity: new Date(),
            updatedAt: new Date()
          }
        },
        { 
          upsert: true 
        }
      );
      
      this.logger.info(`💬 Mensaje guardado en historial para cliente ${clientId}`);
    } catch (error) {
      this.logger.error('Error guardando mensaje en historial:', error);
    }
  }

  // Guardar pedido en historial
  async saveOrderToHistory(clientId, branchId, orderAnalysis) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      await db.collection('conversations').updateOne(
        { 
          clientId: clientId,
          branchId: branchId 
        },
        { 
          $push: { 
            orders: {
              products: orderAnalysis.products,
              subtotal: orderAnalysis.subtotal,
              delivery: orderAnalysis.delivery,
              deliveryFee: orderAnalysis.deliveryFee,
              total: orderAnalysis.total,
              timestamp: new Date()
            }
          },
          $set: {
            lastOrder: orderAnalysis,
            lastActivity: new Date(),
            updatedAt: new Date()
          }
        },
        { 
          upsert: true 
        }
      );
      
      this.logger.info(`🛒 Pedido guardado en historial para cliente ${clientId}`);
    } catch (error) {
      this.logger.error('Error guardando pedido en historial:', error);
    }
  }

  // Obtener último pedido del cliente
  async getLastOrder(clientId, branchId) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const conversation = await db.collection('conversations').findOne({
        clientId: clientId,
        branchId: branchId
      });
      
      return conversation ? conversation.lastOrder : null;
    } catch (error) {
      this.logger.error('Error obteniendo último pedido:', error);
      return null;
    }
  }

  // Obtener historial de conversación
  async getConversationHistory(clientId, branchId, limit = 5) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const conversation = await db.collection('conversations').findOne({
        clientId: clientId,
        branchId: branchId
      });
      
      if (conversation && conversation.messages) {
        return conversation.messages.slice(-limit);
      }
      
      return [];
    } catch (error) {
      this.logger.error('Error obteniendo historial de conversación:', error);
      return [];
    }
  }

  // Manejar modificación de pedido
  handleOrderModification(userMessage, previousOrder) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar qué quiere agregar
    const newProducts = this.processOrder(userMessage);
    
    if (newProducts.hasProducts) {
      // Combinar pedido anterior con nuevo
      const combinedProducts = [...previousOrder.products, ...newProducts.products];
      let subtotal = 0;
      
      combinedProducts.forEach(product => {
        subtotal += product.total;
      });
      
      const deliveryFee = subtotal < 20000 ? 3000 : 0;
      const total = subtotal + deliveryFee;
      
      const modifiedOrder = {
        products: combinedProducts,
        subtotal: subtotal,
        delivery: deliveryFee > 0,
        deliveryFee: deliveryFee,
        total: total,
        hasProducts: true
      };
      
      return this.generateOrderResponse(modifiedOrder);
    }
    
    return `No pude identificar qué producto quieres agregar. ¿Podrías ser más específico?`;
  }

  // Respuesta de fallback
  getFallbackResponse(userMessage, businessType) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
      return `¡Hola! 😊 ¿Cómo estás? ¿En qué puedo ayudarte hoy?`;
    }
    
    return `Gracias por contactarnos. ¿En qué puedo ayudarte?`;
  }

  // ===== SISTEMA DE CONTEXTO AVANZADO =====
  
  // Cargar configuración de una sucursal desde la base de datos
  async loadBranchConfig(branchId) {
    try {
      const mongoose = require('mongoose');
      const BranchAIConfig = require('../models/BranchAIConfig');
      
      const config = await BranchAIConfig.findOne({ branchId });
      
      if (config) {
        if (config.menuContent) {
          this.setMenuContent(branchId, config.menuContent);
          console.log(`✅ Menú cargado automáticamente para: ${branchId}`);
        }
        
        if (config.customPrompt) {
          this.setAIPrompt(branchId, config.customPrompt);
          console.log(`✅ Prompt cargado automáticamente para: ${branchId}`);
        }
        
        return true;
      } else {
        console.log(`⚠️ No se encontró configuración para: ${branchId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error cargando configuración para ${branchId}:`, error.message);
      return false;
    }
  }
  
  // Obtener contexto avanzado del cliente
  async getAdvancedClientContext(clientId, branchId) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const contextCollection = db.collection('advanced_context');
      
      const context = await contextCollection.findOne({ 
        clientId: clientId, 
        branchId: branchId 
      });
      
      return context || {
        clientId: clientId,
        branchId: branchId,
        preferences: {
          favoriteProducts: [],
          favoriteCategories: [],
          dietaryRestrictions: [],
          priceRange: 'medium'
        },
        orderHistory: [],
        lastOrder: null,
        conversationHistory: [],
        recommendations: [],
        lastActivity: new Date()
      };
    } catch (error) {
      console.error('Error obteniendo contexto avanzado:', error);
      return null;
    }
  }
  
  // Actualizar contexto avanzado del cliente
  async updateAdvancedClientContext(clientId, branchId, message, response, intent) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      const contextCollection = db.collection('advanced_context');
      
      // Obtener contexto actual
      let context = await this.getAdvancedClientContext(clientId, branchId);
      
      if (!context) {
        context = {
          clientId: clientId,
          branchId: branchId,
          preferences: {
            favoriteProducts: [],
            favoriteCategories: [],
            dietaryRestrictions: [],
            priceRange: 'medium'
          },
          orderHistory: [],
          lastOrder: null,
          conversationHistory: [],
          recommendations: [],
          lastActivity: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Actualizar última actividad
      context.lastActivity = new Date();
      context.updatedAt = new Date();
      
      // Agregar mensaje al historial
      context.conversationHistory.push({
        message: message,
        response: response,
        timestamp: new Date(),
        intent: intent
      });
      
      // Limitar historial a últimos 50 mensajes
      if (context.conversationHistory.length > 50) {
        context.conversationHistory = context.conversationHistory.slice(-50);
      }
      
      // Procesar preferencias del mensaje
      const preferences = this.extractPreferences(message);
      if (preferences.products.length > 0) {
        preferences.products.forEach(product => {
          if (!context.preferences.favoriteProducts.includes(product)) {
            context.preferences.favoriteProducts.push(product);
          }
        });
      }
      
      if (preferences.categories.length > 0) {
        preferences.categories.forEach(category => {
          if (!context.preferences.favoriteCategories.includes(category)) {
            context.preferences.favoriteCategories.push(category);
          }
        });
      }
      
      // Procesar pedidos
      const orderAnalysis = this.processOrder(message);
      if (orderAnalysis.hasProducts) {
        context.orderHistory.push({
          products: orderAnalysis.products,
          total: orderAnalysis.total,
          timestamp: new Date()
        });
        
        context.lastOrder = {
          products: orderAnalysis.products,
          total: orderAnalysis.total,
          timestamp: new Date()
        };
        
        // Limitar historial a últimos 20 pedidos
        if (context.orderHistory.length > 20) {
          context.orderHistory = context.orderHistory.slice(-20);
        }
      }
      
      // Generar recomendaciones
      context.recommendations = this.generatePersonalizedRecommendations(context);
      
      // Guardar contexto actualizado
      await contextCollection.replaceOne(
        { clientId: clientId, branchId: branchId },
        context,
        { upsert: true }
      );
      
      return context;
    } catch (error) {
      console.error('Error actualizando contexto avanzado:', error);
      return null;
    }
  }
  
  // Extraer preferencias del mensaje
  extractPreferences(message) {
    const lowerMessage = message.toLowerCase();
    const preferences = {
      products: [],
      categories: []
    };
    
    // Productos favoritos
    const favoriteProducts = [
      'cappuccino', 'latte', 'americano', 'mocha', 'frappé',
      'muffin', 'croissant', 'brownie', 'cheesecake',
      'jugo', 'smoothie', 'limonada'
    ];
    
    favoriteProducts.forEach(product => {
      if (lowerMessage.includes(product)) {
        preferences.products.push(product);
      }
    });
    
    // Categorías favoritas
    const categories = ['café', 'pastelería', 'bebida', 'desayuno'];
    categories.forEach(category => {
      if (lowerMessage.includes(category)) {
        preferences.categories.push(category);
      }
    });
    
    return preferences;
  }
  
  // Generar recomendaciones personalizadas
  generatePersonalizedRecommendations(context) {
    const recommendations = [];
    
    if (!context) return recommendations;
    
    // Recomendaciones basadas en productos favoritos
    if (context.preferences.favoriteProducts.includes('cappuccino')) {
      recommendations.push({
        type: 'product',
        suggestion: 'frappé de vainilla',
        reason: 'Te gusta el cappuccino, podrías disfrutar nuestro frappé de vainilla',
        price: 4800
      });
    }
    
    if (context.preferences.favoriteProducts.includes('muffin')) {
      recommendations.push({
        type: 'product',
        suggestion: 'brownie de chocolate',
        reason: 'Te gustan los muffins, prueba nuestro brownie de chocolate',
        price: 3200
      });
    }
    
    // Recomendaciones basadas en historial
    if (context.orderHistory.length > 0) {
      const lastOrder = context.orderHistory[context.orderHistory.length - 1];
      if (lastOrder.total < 15000) {
        recommendations.push({
          type: 'upsell',
          suggestion: 'desayuno ejecutivo',
          reason: 'Tu último pedido fue pequeño, considera nuestro desayuno ejecutivo',
          price: 8500
        });
      }
    }
    
    // Recomendaciones basadas en patrones
    if (context.conversationHistory.length > 5) {
      const morningOrders = context.conversationHistory.filter(msg => 
        msg.timestamp.getHours() < 12 && msg.intent === 'hacer_pedido'
      ).length;
      
      if (morningOrders > 2) {
        recommendations.push({
          type: 'pattern',
          suggestion: 'desayuno express',
          reason: 'Veo que pediste varias veces en la mañana, prueba nuestro desayuno express',
          price: 6500
        });
      }
    }
    
    return recommendations;
  }
  
  // Generar respuesta con recomendaciones personalizadas
  generatePersonalizedResponse(context, baseResponse) {
    if (!context || !context.recommendations || context.recommendations.length === 0) {
      return baseResponse;
    }
    
    let personalizedResponse = baseResponse;
    
    // Agregar recomendaciones si el usuario pregunta por sugerencias
    if (baseResponse.includes('recomendar') || baseResponse.includes('sugerir')) {
      personalizedResponse += '\n\n🎯 *RECOMENDACIONES PERSONALIZADAS*\n';
      
      context.recommendations.slice(0, 3).forEach((rec, index) => {
        personalizedResponse += `${index + 1}. ${rec.suggestion} - $${rec.price.toLocaleString()}\n`;
        personalizedResponse += `   ${rec.reason}\n\n`;
      });
    }
    
    return personalizedResponse;
  }

  // Detectar si es confirmación de pedido
  isOrderConfirmation(message) {
    const confirmationKeywords = [
      'sí', 'si', 'confirmo', 'confirmar', 'ok', 'perfecto', 'dale', 
      'está bien', 'correcto', 'procede', 'adelante', 'yes'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return confirmationKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  // Manejar confirmación de pedido
  async handleOrderConfirmation(clientId, branchId, message) {
    try {
      // Obtener el último pedido pendiente del cliente
      const lastOrder = await this.getLastPendingOrder(clientId, branchId);
      
      if (!lastOrder) {
        return 'No tengo ningún pedido pendiente para confirmar. ¿Quieres hacer un nuevo pedido?';
      }

      // Verificar si es para domicilio
      const isDelivery = lastOrder.delivery && lastOrder.delivery.type === 'delivery';
      
      if (isDelivery) {
        // Si es domicilio, pedir datos de envío
        return await this.requestDeliveryData(clientId, branchId, lastOrder);
      } else {
        // Si es para recoger, confirmar directamente
        return await this.confirmOrderDirectly(clientId, branchId, lastOrder);
      }
      
    } catch (error) {
      console.error('Error manejando confirmación de pedido:', error);
      return 'Hubo un problema procesando tu confirmación. ¿Puedes intentar de nuevo?';
    }
  }

  // Solicitar datos de envío para domicilio
  async requestDeliveryData(clientId, branchId, order) {
    // Guardar el pedido temporalmente para solicitar datos
    await this.savePendingOrder(clientId, branchId, order);
    
    return `🚚 *DATOS DE ENVÍO REQUERIDOS*

Para procesar tu pedido a domicilio, necesito:

📍 *Dirección completa:*
🏠 *Barrio/Zona:*
📞 *Teléfono de contacto:*
👤 *Nombre de quien recibe:*

Por favor envía todos los datos en un solo mensaje, por ejemplo:
"Calle 123 #45-67, Barrio Centro, 3001234567, María González"

¿Cuáles son tus datos de envío?`;
  }

  // Confirmar pedido directamente (para recoger)
  async confirmOrderDirectly(clientId, branchId, order) {
    try {
      // Crear el pedido en la base de datos
      const savedOrder = await this.saveOrderToDatabase(clientId, branchId, order);
      
      return `✅ *PEDIDO CONFIRMADO*

🆔 *Número de pedido:* ${savedOrder.orderId}
📋 *Resumen:* ${order.products.map(p => `${p.name} x${p.quantity}`).join(', ')}
💰 *Total:* $${order.total.toLocaleString()}
⏰ *Tiempo estimado:* 15-20 minutos

📞 *Teléfono:* ${clientId}
🏪 *Sucursal:* Centro

¡Gracias por tu pedido! Te notificaremos cuando esté listo para recoger.`;
      
    } catch (error) {
      console.error('Error confirmando pedido:', error);
      return 'Hubo un problema guardando tu pedido. ¿Puedes intentar de nuevo?';
    }
  }

  // Obtener último pedido pendiente
  async getLastPendingOrder(clientId, branchId) {
    // Por ahora retornamos un pedido de ejemplo
    // En implementación real, esto vendría de la base de datos
    return {
      products: [
        { name: 'café americano', quantity: 1, price: 3500, total: 3500 }
      ],
      subtotal: 3500,
      delivery: { type: 'pickup', fee: 0 },
      total: 6500
    };
  }

  // Guardar pedido pendiente temporalmente
  async savePendingOrder(clientId, branchId, order) {
    // Implementar guardado temporal en memoria o BD
    console.log('💾 Guardando pedido pendiente:', order);
  }

  // Guardar pedido en base de datos
  async saveOrderToDatabase(clientId, branchId, order) {
    const Order = require('../models/Order');
    const Branch = require('../models/Branch');
    
    // Obtener businessId desde branchId
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new Error('Sucursal no encontrada');
    }
    
    // Generar ID único para el pedido
    const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Crear objeto del pedido
    const orderData = {
      orderId,
      businessId: branch.businessId,
      branchId,
      customer: {
        phone: clientId,
        name: 'Cliente WhatsApp'
      },
      items: order.products.map(product => ({
        name: product.name,
        quantity: product.quantity,
        unitPrice: product.price,
        totalPrice: product.total,
        serviceId: `SVC${Date.now()}${Math.random().toString(36).substr(2, 3).toUpperCase()}`
      })),
      delivery: {
        type: order.delivery.type,
        fee: order.delivery.fee,
        address: order.delivery.address || null
      },
      subtotal: order.subtotal,
      total: order.total,
      status: 'confirmed',
      source: 'whatsapp',
      whatsappMessageId: `msg_${Date.now()}`
    };

    // Guardar en base de datos
    const savedOrder = new Order(orderData);
    await savedOrder.save();
    
    console.log('✅ Pedido guardado en BD:', savedOrder.orderId);
    return savedOrder;
  }
}

module.exports = AIService;