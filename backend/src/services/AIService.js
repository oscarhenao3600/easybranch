const { HfInference } = require('@huggingface/inference');
const fetch = require('node-fetch');
const LoggerService = require('./LoggerService');

class AIService {
  constructor() {
    this.hf = null;
    this.modelName = 'microsoft/DialoGPT-medium';
    this.useHuggingFace = false;
    this.menuContent = new Map();
    this.aiPrompts = new Map();
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
    this.logger = new LoggerService();
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

    // Prompts por defecto según tipo de negocio
    const defaultPrompts = {
      restaurant: `Eres un asistente virtual amigable de un restaurante. 
      Tu objetivo es ayudar a los clientes con sus consultas sobre el menú, precios, pedidos y cualquier otra pregunta relacionada con nuestros servicios.
      
      Debes ser:
      - Amigable y profesional
      - Útil y preciso en tus respuestas
      - Capaz de sugerir productos del menú
      - Ayudar con el proceso de pedidos
      - Responder preguntas sobre precios y disponibilidad
      
      Responde de manera natural y conversacional, como si fueras un empleado amigable del restaurante.`,
      
      cafe: `Eres un asistente virtual amigable de una cafetería. 
      Ayuda a los clientes con consultas sobre bebidas, pastelería, horarios y pedidos.
      
      Debes ser:
      - Conocedor de café y bebidas
      - Sugerir combinaciones de bebidas y postres
      - Informar sobre horarios de atención
      - Ayudar con pedidos para llevar o consumo en sitio`,
      
      pharmacy: `Eres un asistente virtual de una farmacia. 
      Ayuda a los clientes con consultas sobre medicamentos, productos de cuidado personal y servicios farmacéuticos.
      
      Debes ser:
      - Profesional y discreto
      - Informar sobre disponibilidad de productos
      - Recordar que no puedes dar diagnósticos médicos
      - Sugerir consultar con un profesional de la salud cuando sea necesario`,
      
      grocery: `Eres un asistente virtual de una tienda de víveres. 
      Ayuda a los clientes con consultas sobre productos, precios, disponibilidad y pedidos.
      
      Debes ser:
      - Conocedor de productos de consumo
      - Informar sobre ofertas y promociones
      - Ayudar con listas de compras
      - Sugerir productos complementarios`
    };

    return defaultPrompts[businessType] || defaultPrompts.restaurant;
  }

  // Generar respuesta usando IA
  async generateResponse(branchId, userMessage, clientId = null, businessType = 'restaurant') {
    try {
      const menuContent = this.menuContent.get(branchId) || '';
      const prompt = this.getPrompt(branchId, businessType);
      
      // Crear contexto completo
      const fullContext = this.buildContext(prompt, menuContent, userMessage);
      
      // Intentar usar Hugging Face primero
      if (this.useHuggingFace && this.hf) {
        try {
          const response = await this.callHuggingFace(fullContext, userMessage, clientId);
          this.logger.ai(branchId, '🤖 Respuesta Hugging Face generada');
          return response;
        } catch (hfError) {
          this.logger.warn(`Error con Hugging Face, usando simulación: ${hfError.message}`);
          const response = await this.callFreeAI(fullContext, userMessage, businessType);
          this.logger.ai(branchId, '🤖 Respuesta simulación generada');
          return response;
        }
      } else {
        // Usar simulación inteligente
        const response = await this.callFreeAI(fullContext, userMessage, businessType);
        this.logger.ai(branchId, '🤖 Respuesta simulación generada');
        return response;
      }
      
    } catch (error) {
      this.logger.error(`Error generando respuesta IA para ${branchId}:`, error);
      return this.getFallbackResponse(userMessage, businessType);
    }
  }

  // Construir contexto completo
  buildContext(prompt, menuContent, userMessage) {
    let context = prompt;
    
    if (menuContent) {
      context += `\n\nINFORMACIÓN DEL MENÚ:\n${menuContent}\n\n`;
    }
    
    context += `\nMENSAJE DEL CLIENTE: ${userMessage}\n\nRESPUESTA:`;
    
    return context;
  }

  // Llamar a Hugging Face
  async callHuggingFace(context, userMessage, clientId) {
    try {
      // Obtener historial de conversación
      const history = this.getConversationHistory(clientId);
      
      // Crear prompt mejorado
      const enhancedPrompt = this.createEnhancedPrompt(context, userMessage, history);
      
      // Llamar al modelo
      const response = await this.hf.textGeneration({
        model: this.modelName,
        inputs: enhancedPrompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.1
        }
      });
      
      const aiResponse = response.generated_text || 'Gracias por contactarnos. ¿En qué puedo ayudarte?';
      
      // Guardar en historial
      this.addToConversationHistory(clientId, userMessage, aiResponse);
      
      return aiResponse;
      
    } catch (error) {
      this.logger.error('Error llamando a Hugging Face:', error);
      throw error;
    }
  }

  // Simulación de IA gratuita
  async callFreeAI(context, userMessage, businessType) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Respuestas específicas por tipo de negocio
    const responses = {
      restaurant: {
        greeting: '¡Hola! Bienvenido a nuestro restaurante 🍽️\n\n¿En qué puedo ayudarte hoy?\n• Ver nuestro menú\n• Hacer un pedido\n• Consultar precios\n• Horarios de atención',
        menu: '🍽️ *NUESTRO MENÚ*\n\nTenemos una gran variedad de opciones deliciosas. ¿Te gustaría que te ayude a elegir algo específico?',
        order: '¡Perfecto! Para hacer tu pedido, por favor indícame:\n\n1. ¿Qué te gustaría ordenar?\n2. ¿Para cuántas personas?\n3. ¿Prefieres recoger o delivery?\n\nTe ayudo a procesar tu pedido 😊',
        price: '💰 *NUESTROS PRECIOS*\n\nTenemos opciones para todos los presupuestos. ¿Te gustaría ver el menú completo con precios?',
        hours: '🕐 *HORARIOS DE ATENCIÓN*\n\nLunes a Domingo: 11:00 AM - 10:00 PM\n\n¿En qué horario te gustaría hacer tu pedido?'
      },
      cafe: {
        greeting: '¡Hola! Bienvenido a nuestra cafetería ☕\n\n¿En qué puedo ayudarte hoy?\n• Ver nuestro menú de bebidas\n• Hacer un pedido\n• Consultar horarios\n• Reservar mesa',
        menu: '☕ *NUESTRO MENÚ*\n\nTenemos café, té, bebidas especiales y deliciosa pastelería. ¿Qué te gustaría probar?',
        order: '¡Excelente! Para tu pedido, dime:\n\n1. ¿Qué bebida te gustaría?\n2. ¿Algún acompañamiento?\n3. ¿Para llevar o consumo en sitio?\n\nTe preparo todo con mucho gusto 😊',
        price: '💰 *NUESTROS PRECIOS*\n\nBebidas desde $2.99 hasta $6.99\nPastelería desde $3.99\n\n¿Te gustaría ver el menú completo?',
        hours: '🕐 *HORARIOS*\n\nLunes a Viernes: 7:00 AM - 8:00 PM\nSábados y Domingos: 8:00 AM - 6:00 PM'
      },
      pharmacy: {
        greeting: '¡Hola! Bienvenido a nuestra farmacia 💊\n\n¿En qué puedo ayudarte hoy?\n• Consultar disponibilidad de medicamentos\n• Información sobre productos\n• Horarios de atención\n• Servicios farmacéuticos',
        menu: '💊 *NUESTROS PRODUCTOS*\n\nContamos con medicamentos, productos de cuidado personal, vitaminas y más. ¿Qué estás buscando?',
        order: 'Para ayudarte mejor, necesito saber:\n\n1. ¿Qué producto necesitas?\n2. ¿Tienes receta médica?\n3. ¿Prefieres recoger o delivery?\n\nRecuerda que algunos productos requieren receta médica.',
        price: '💰 *INFORMACIÓN DE PRECIOS*\n\nLos precios varían según el producto. ¿Te gustaría consultar algún producto específico?',
        hours: '🕐 *HORARIOS DE ATENCIÓN*\n\nLunes a Sábado: 8:00 AM - 9:00 PM\nDomingos: 9:00 AM - 6:00 PM'
      },
      grocery: {
        greeting: '¡Hola! Bienvenido a nuestra tienda de víveres 🛒\n\n¿En qué puedo ayudarte hoy?\n• Ver productos disponibles\n• Hacer un pedido\n• Consultar ofertas\n• Horarios de atención',
        menu: '🛒 *NUESTROS PRODUCTOS*\n\nTenemos una amplia variedad de productos frescos, enlatados, lácteos y más. ¿Qué necesitas?',
        order: '¡Perfecto! Para tu pedido, dime:\n\n1. ¿Qué productos necesitas?\n2. ¿Cantidades aproximadas?\n3. ¿Para recoger o delivery?\n\nTe ayudo a organizar tu lista de compras 😊',
        price: '💰 *PRECIOS Y OFERTAS*\n\nTenemos ofertas especiales y precios competitivos. ¿Te gustaría ver nuestras promociones?',
        hours: '🕐 *HORARIOS*\n\nLunes a Sábado: 7:00 AM - 9:00 PM\nDomingos: 8:00 AM - 7:00 PM'
      }
    };

    const businessResponses = responses[businessType] || responses.restaurant;

    // Lógica de respuesta inteligente
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas')) {
      return businessResponses.greeting;
    }
    
    if (lowerMessage.includes('menú') || lowerMessage.includes('menu') || lowerMessage.includes('productos')) {
      return businessResponses.menu;
    }
    
    if (lowerMessage.includes('pedido') || lowerMessage.includes('ordenar') || lowerMessage.includes('comprar')) {
      return businessResponses.order;
    }
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('oferta')) {
      return businessResponses.price;
    }
    
    if (lowerMessage.includes('hora') || lowerMessage.includes('abierto') || lowerMessage.includes('cerrado')) {
      return businessResponses.hours;
    }

    return `Gracias por contactarnos. ¿En qué puedo ayudarte? Puedes preguntarme sobre nuestros productos, precios o hacer un pedido.`;
  }

  // Respuesta de fallback
  getFallbackResponse(userMessage, businessType) {
    return `Gracias por contactarnos. ¿En qué puedo ayudarte? Puedes preguntarme sobre nuestros productos, precios o hacer un pedido.`;
  }

  // Crear prompt mejorado para Hugging Face
  createEnhancedPrompt(context, userMessage, history) {
    let prompt = context;
    
    if (history.length > 0) {
      prompt += '\n\nHISTORIAL DE CONVERSACIÓN:\n';
      history.forEach(entry => {
        prompt += `Cliente: ${entry.user}\nAsistente: ${entry.assistant}\n`;
      });
    }
    
    return prompt;
  }

  // Obtener historial de conversación
  getConversationHistory(clientId) {
    if (!clientId) return [];
    return this.conversationHistory.get(clientId) || [];
  }

  // Agregar al historial de conversación
  addToConversationHistory(clientId, userMessage, assistantResponse) {
    if (!clientId) return;
    
    if (!this.conversationHistory.has(clientId)) {
      this.conversationHistory.set(clientId, []);
    }
    
    const history = this.conversationHistory.get(clientId);
    history.push({
      user: userMessage,
      assistant: assistantResponse,
      timestamp: new Date()
    });
    
    // Mantener solo los últimos mensajes
    if (history.length > this.maxHistoryLength) {
      history.splice(0, history.length - this.maxHistoryLength);
    }
  }

  // Limpiar historial de conversación
  clearConversationHistory(clientId) {
    if (clientId) {
      this.conversationHistory.delete(clientId);
    }
  }

  // Obtener estadísticas
  getStats() {
    return {
      totalConversations: this.conversationHistory.size,
      totalMenuContent: this.menuContent.size,
      totalPrompts: this.aiPrompts.size,
      useHuggingFace: this.useHuggingFace,
      modelName: this.modelName
    };
  }
}

module.exports = AIService;
