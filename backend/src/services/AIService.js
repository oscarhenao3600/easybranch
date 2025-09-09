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

  // Generar respuesta usando IA con configuración específica de sucursal
  async generateResponse(branchId, userMessage, clientId = null, businessType = 'restaurant', branchConfig = null) {
    try {
      console.log('🤖 ===== GENERANDO RESPUESTA IA CONTEXTUALIZADA =====');
      console.log('🏪 Branch ID:', branchId);
      console.log('💬 User Message:', userMessage);
      console.log('🏢 Business Type:', businessType);
      console.log('⚙️ Branch Config:', branchConfig ? 'Disponible' : 'No disponible');
      console.log('==================================================');

      // Usar configuración específica de la sucursal si está disponible
      let menuContent = '';
      let customPrompt = '';
      let businessSettings = {};

      if (branchConfig) {
        menuContent = branchConfig.menuContent || '';
        customPrompt = branchConfig.customPrompt || '';
        businessSettings = branchConfig.businessSettings || {};
        businessType = businessSettings.businessType || businessType;
        
        console.log('📋 Menu Content:', menuContent ? 'Disponible' : 'No disponible');
        console.log('🎯 Custom Prompt:', customPrompt ? 'Disponible' : 'No disponible');
        console.log('⚙️ Business Settings:', Object.keys(businessSettings).length > 0 ? 'Disponible' : 'No disponible');
      } else {
        // Usar configuración básica
        menuContent = this.menuContent.get(branchId) || '';
        customPrompt = this.aiPrompts.get(branchId) || '';
      }

      // Construir prompt contextualizado
      const prompt = this.buildContextualizedPrompt(branchId, businessType, customPrompt, businessSettings);
      
      // Crear contexto solo con el menú (sin el prompt)
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

  // Construir prompt contextualizado para la sucursal
  buildContextualizedPrompt(branchId, businessType, customPrompt, businessSettings) {
    if (customPrompt) {
      return customPrompt;
    }

    // Construir prompt basado en configuración específica
    let prompt = `Eres un asistente virtual especializado para esta sucursal específica. `;
    
    if (businessSettings.messages && businessSettings.messages.welcome) {
      prompt += `Tu mensaje de bienvenida personalizado es: "${businessSettings.messages.welcome}". `;
    }
    
    if (businessSettings.businessHours) {
      const hours = businessSettings.businessHours;
      prompt += `Nuestros horarios de atención son: `;
      
      // Handle both Map and Object formats
      const hoursData = hours instanceof Map ? hours : hours;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      days.forEach(day => {
        const dayData = hoursData.get ? hoursData.get(day) : hoursData[day];
        if (dayData && dayData.isOpen) {
          prompt += `${day}: ${dayData.open} - ${dayData.close}, `;
        }
      });
      prompt += `. `;
    }
    
    if (businessSettings.deliverySettings && businessSettings.deliverySettings.enabled) {
      prompt += `Ofrecemos servicio a domicilio con tiempo de entrega de ${businessSettings.deliverySettings.deliveryTime}. `;
      if (businessSettings.deliverySettings.minimumOrder > 0) {
        prompt += `Pedido mínimo: $${businessSettings.deliverySettings.minimumOrder}. `;
      }
    }
    
    prompt += `Debes ser amigable, profesional y específico a esta sucursal. `;
    prompt += `Responde de manera natural y conversacional, como si fueras un empleado de esta sucursal específica.`;
    
    return prompt;
  }

  // Construir contexto completo (solo para HuggingFace)
  buildContext(prompt, menuContent, userMessage) {
    let context = prompt;
    
    if (menuContent) {
      context += `\n\nINFORMACIÓN DEL MENÚ:\n${menuContent}\n\n`;
    }
    
    context += `\nMENSAJE DEL CLIENTE: ${userMessage}\n\nRESPUESTA:`;
    
    return context;
  }

  // Construir contexto solo con el menú (para respuestas contextualizadas)
  buildMenuContext(menuContent, userMessage) {
    let context = '';
    
    if (menuContent) {
      context += menuContent;
    }
    
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

  // Simulación de IA contextualizada
  async callContextualizedAI(context, userMessage, businessType, businessSettings = {}, customPrompt = '') {
    const lowerMessage = userMessage.toLowerCase();
    
    console.log('🤖 ===== PROCESANDO CON IA CONTEXTUALIZADA =====');
    console.log('💬 User Message:', userMessage);
    console.log('🏢 Business Type:', businessType);
    console.log('⚙️ Business Settings:', Object.keys(businessSettings).length > 0 ? 'Disponible' : 'No disponible');
    console.log('📋 Context:', context.substring(0, 200) + '...');
    console.log('🎯 Custom Prompt:', customPrompt ? 'Disponible' : 'No disponible');
    console.log('===============================================');
    
    // PRIORIDAD 1: Verificar si es un pedido específico ANTES de usar respuestas hardcodeadas
    if (this.isOrderRequest(userMessage)) {
      console.log('🛒 Detectado pedido específico - procesando...');
      return this.processOrder(userMessage, context, businessSettings);
    }
    
    // PRIORIDAD 2: Comprensión semántica para consultas específicas
    if (lowerMessage.includes('tragos') || lowerMessage.includes('alcohólicas') || lowerMessage.includes('alcoholicas') || 
        lowerMessage.includes('cerveza') || lowerMessage.includes('aguardiente') || lowerMessage.includes('whisky') || 
        lowerMessage.includes('ron') || lowerMessage.includes('vino') || lowerMessage.includes('licor')) {
      return `¡Hola! Me da mucho gusto que quieras disfrutar 🍷\n\nSin embargo, debo informarte que somos una cafetería especializada en café y comida, no vendemos bebidas alcohólicas.\n\n¿Te gustaría en su lugar?\n• Cafés especiales para compartir\n• Bebidas frías refrescantes\n• Postres deliciosos\n• Entradas para picar\n\n¿Qué les parece si les preparo algo especial? 😊`;
    }
    
    // Comprensión semántica para consultas sobre menú específico
    if (lowerMessage.includes('lista de') && (lowerMessage.includes('bebidas') || lowerMessage.includes('menu'))) {
      if (lowerMessage.includes('alcohólicas') || lowerMessage.includes('alcoholicas') || lowerMessage.includes('acholicas')) {
        return `Me da pena, pero no tenemos bebidas alcohólicas en nuestro menú. Somos una cafetería especializada en café y comida.\n\n¿Te interesa conocer nuestras opciones disponibles?\n• Bebidas frías refrescantes\n• Cafés especiales\n• Jugos naturales\n• Postres\n\n¿Qué te gustaría probar? 😊`;
      }
      return this.generateMenuBasedResponse(context, userMessage);
    }
    
    // Patrón específico para "bibidas acholicas" (con error de ortografía)
    if (lowerMessage.includes('bibidas') && lowerMessage.includes('acholicas')) {
      return `Me da pena, pero no tenemos bebidas alcohólicas en nuestro menú. Somos una cafetería especializada en café y comida.\n\n¿Te interesa conocer nuestras opciones disponibles?\n• Bebidas frías refrescantes\n• Cafés especiales\n• Jugos naturales\n• Postres\n\n¿Qué te gustaría probar? 😊`;
    }
    
    // Comprensión semántica para consultas sobre disponibilidad
    if (lowerMessage.includes('tienes') && (lowerMessage.includes('bebidas') || lowerMessage.includes('tragos'))) {
      if (lowerMessage.includes('alcohólicas') || lowerMessage.includes('alcoholicas') || lowerMessage.includes('cerveza')) {
        return `Entiendo que buscas bebidas alcohólicas, pero como cafetería no manejamos ese tipo de productos.\n\nEn su lugar, puedo ofrecerte:\n• Cerveza sin alcohol (si la tenemos)\n• Bebidas refrescantes naturales\n• Cafés especiales\n• Jugos naturales\n\n¿Te gustaría que te recomiende algo refrescante para disfrutar? 🌿`;
      }
    }
    
    // USAR EL PROMPT PERSONALIZADO SI ESTÁ DISPONIBLE
    if (customPrompt && customPrompt.trim()) {
      console.log('🎯 Usando prompt personalizado para respuesta contextualizada');
      
      // Detectar tipo de consulta y responder apropiadamente usando el prompt personalizado
      if (lowerMessage.includes('hola') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas') || lowerMessage.includes('buen dia') || lowerMessage.includes('buenas tardes') || lowerMessage.includes('holi') || lowerMessage.includes('hey') || lowerMessage.includes('hi')) {
        return `¡Holi! 😊 ¿Cómo estás?\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre:\n• Nuestro menú\n• Hacer un pedido\n• Precios\n• Información de envío\n\n¡Estoy aquí para ayudarte! ☕`;
      } else if (lowerMessage.includes('partido') || lowerMessage.includes('futbol') || lowerMessage.includes('deportes') || lowerMessage.includes('colombia')) {
        return `¡Perfecto para ver el partido! ⚽\n\nTe recomiendo opciones ideales para disfrutar durante el juego:\n\n🍿 *SNACKS*\n• Brownie de Chocolate - $3.200\n• Muffin de Arándanos - $2.500\n• Galletas - $1.000\n\n☕ *BEBIDAS*\n• Café Americano - $3.500\n• Frappé de Vainilla - $4.800\n• Limonada Natural - $3.000\n\n🥪 *ENTRADAS*\n• Club Sandwich - $8.500\n• Panini de Pollo - $7.200\n\n¿Cuántas personas serán? Te ayudo a armar el pedido perfecto para el partido.`;
      } else {
        // Para otras consultas, usar el contenido del menú
        return this.generateMenuBasedResponse(context, userMessage);
      }
    }
    
    // FALLBACK: Respuestas genéricas si no hay prompt personalizado
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas') || lowerMessage.includes('buen dia') || lowerMessage.includes('holi') || lowerMessage.includes('hey') || lowerMessage.includes('hi')) {
      return `¡Holi! 😊 ¿Cómo estás?\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre:\n• Nuestro menú\n• Hacer un pedido\n• Precios\n• Información de envío\n\n¡Estoy aquí para ayudarte! ☕`;
    }
    
    if (lowerMessage.includes('reunión') || lowerMessage.includes('reunion') || lowerMessage.includes('amigos') || lowerMessage.includes('grupo')) {
      return `👥 *PERFECTO PARA REUNIONES*\n\nPara una reunión de amigos te recomiendo:\n\n☕ *CAFÉS*\n• Cappuccino - $4.000\n• Café Latte - $4.200\n• Café Americano - $3.500\n\n🥪 *ENTRADAS*\n• Club Sandwich - $8.500\n• Panini de Pollo - $7.200\n• Bagel con Queso Crema - $4.500\n\n🍰 *POSTRES*\n• Brownie de Chocolate - $3.200\n• Cheesecake de Fresa - $4.800\n\n¿Cuántas personas serán? Te ayudo a calcular el pedido completo.`;
    }
    
    // Respuestas específicas para refrigerios y grupos
    if (lowerMessage.includes('refrigerio') || lowerMessage.includes('8 personas') || lowerMessage.includes('grupo')) {
      return `👥 *PERFECTO PARA REFRIGERIOS*\n\nPara un refrigerio de 8 personas te recomiendo:\n\n☕ *CAFÉS*\n• Cappuccino - $4.000\n• Café Latte - $4.200\n• Café Americano - $3.500\n\n🥤 *BEBIDAS FRÍAS*\n• Frappé de Vainilla - $4.800\n• Frappé de Chocolate - $5.200\n• Limonada Natural - $3.000\n\n🍰 *POSTRES DULCES*\n• Brownie de Chocolate - $3.200\n• Cheesecake de Fresa - $4.800\n• Tiramisú - $5.200\n\n🥪 *ENTRADAS*\n• Club Sandwich - $8.500\n• Panini de Pollo - $7.200\n• Bagel con Queso Crema - $4.500\n\n¿Te gustaría que calcule el total para 8 personas?`;
    }
    
    // Respuestas específicas para bebidas frías - USAR CONTENIDO REAL DEL MENÚ
    if (lowerMessage.includes('bebidas frías') || lowerMessage.includes('bebidas frias') || lowerMessage.includes('frio') || lowerMessage.includes('frío') || lowerMessage.includes('bebidas frias tienes')) {
      // Extraer información de bebidas frías del contexto real del menú
      const coldDrinksInfo = this.extractColdDrinksInfo(context);
      if (coldDrinksInfo) {
        return coldDrinksInfo;
      }
      // Fallback si no encuentra información específica
      return `🥤 *NUESTRAS BEBIDAS FRÍAS*\n\nTenemos una variedad de bebidas frías disponibles. ¿Te gustaría ver nuestro menú completo?`;
    }
    
    // Respuestas específicas para postres dulces - USAR CONTENIDO REAL DEL MENÚ
    if (lowerMessage.includes('postres dulces') || lowerMessage.includes('postres') || lowerMessage.includes('dulce') || lowerMessage.includes('dulces')) {
      // Extraer información de postres del contexto real del menú
      const dessertInfo = this.extractDessertInfo(context);
      if (dessertInfo) {
        return dessertInfo;
      }
      // Fallback si no encuentra información específica
      return `🍰 *NUESTROS POSTRES DULCES*\n\nTenemos deliciosos postres disponibles. ¿Te gustaría ver nuestro menú completo?`;
    }
    
    // Respuestas específicas para información de domicilio
    if (lowerMessage.includes('domicilio') || lowerMessage.includes('delivery') || lowerMessage.includes('envio') || lowerMessage.includes('envío') || lowerMessage.includes('costo') || lowerMessage.includes('cuanto')) {
      return `🚚 *INFORMACIÓN DE DOMICILIO*\n\n💰 *COSTOS*\n• Costo de envío: $3.000\n• Pedido mínimo: $15.000\n• Radio de entrega: 5 km\n\n⏰ *TIEMPOS*\n• Tiempo estimado: 30-45 minutos\n• Horario de entrega: 7:00 AM - 8:00 PM\n\n💡 *TIP*: Puedes pedir cantidades específicas como "2 cappuccinos" y te calcularemos el total con envío automáticamente.`;
    }
    
    // Usar configuración específica de horarios
    if (lowerMessage.includes('hora') || lowerMessage.includes('abierto') || lowerMessage.includes('cerrado')) {
      return this.getHoursResponse(businessSettings.businessHours);
    }
    
    // Usar configuración específica de productos
    if (lowerMessage.includes('menú') || lowerMessage.includes('menu') || lowerMessage.includes('productos')) {
      return this.getMenuResponse(businessSettings.productCategories);
    }
    
    // Usar configuración específica de delivery
    if (lowerMessage.includes('domicilio') || lowerMessage.includes('delivery') || lowerMessage.includes('entrega')) {
      return this.getDeliveryResponse(businessSettings.deliverySettings);
    }
    
    // NUEVO: Usar el contenido del menú PDF si está disponible en el contexto
    if (context && (context.includes('MENÚ') || context.includes('PRODUCTOS') || context.includes('CAFÉ') || context.includes('CAFE'))) {
      console.log('📋 Usando contenido del menú PDF para responder');
      
      // Buscar información específica en el contexto del menú
      if (lowerMessage.includes('café') || lowerMessage.includes('cafe') || lowerMessage.includes('coffee')) {
        // Extraer información sobre café del contexto
        const cafeInfo = this.extractCafeInfo(context);
        if (cafeInfo) {
          return cafeInfo;
        }
      }
      
      if (lowerMessage.includes('precio') || lowerMessage.includes('costo')) {
        // Extraer información de precios del contexto
        const priceInfo = this.extractPriceInfo(context);
        if (priceInfo) {
          return priceInfo;
        }
      }
      
      if (lowerMessage.includes('postre') || lowerMessage.includes('postres') || lowerMessage.includes('dulce')) {
        // Extraer información sobre postres del contexto
        const dessertInfo = this.extractDessertInfo(context);
        if (dessertInfo) {
          return dessertInfo;
        }
      }
      
      if (lowerMessage.includes('entrada') || lowerMessage.includes('entradas') || lowerMessage.includes('aperitivo') || lowerMessage.includes('aperitivos') || lowerMessage.includes('sándwich') || lowerMessage.includes('sandwich') || lowerMessage.includes('sándwiches') || lowerMessage.includes('sandwiches')) {
        // Extraer información sobre entradas del contexto
        const appetizerInfo = this.extractAppetizerInfo(context);
        if (appetizerInfo) {
          return appetizerInfo;
        }
      }
      
      // Detectar pedidos específicos con cantidades
      if (this.isOrderRequest(userMessage)) {
        const orderResponse = this.processOrder(userMessage, context, businessSettings);
        if (orderResponse) {
          return orderResponse;
        }
      }
      
      // Si no encuentra información específica, usar el contexto general del menú
      return this.generateMenuBasedResponse(context, userMessage);
    }
    
    // Fallback a respuestas básicas solo si no hay contexto de menú
    console.log('⚠️ Usando respuesta básica como fallback');
    return this.callFreeAI(context, userMessage, businessType);
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
    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos días') || lowerMessage.includes('buenas') || lowerMessage.includes('buen dia') || lowerMessage.includes('holi') || lowerMessage.includes('hey') || lowerMessage.includes('hi')) {
      return `¡Holi! 😊 ¿Cómo estás?\n\n¿En qué puedo ayudarte hoy? Puedes preguntarme sobre:\n• Nuestro menú\n• Hacer un pedido\n• Precios\n• Información de envío\n\n¡Estoy aquí para ayudarte! ☕`;
    }
    
    if (lowerMessage.includes('refrigerio') || lowerMessage.includes('8 personas') || lowerMessage.includes('grupo')) {
      return `👥 *PERFECTO PARA REFRIGERIOS*\n\nPara un refrigerio de 8 personas te recomiendo:\n\n☕ *CAFÉS*\n• Cappuccino - $4.000\n• Café Latte - $4.200\n• Café Americano - $3.500\n\n🥤 *BEBIDAS FRÍAS*\n• Frappé de Vainilla - $4.800\n• Frappé de Chocolate - $5.200\n• Limonada Natural - $3.000\n\n🍰 *POSTRES DULCES*\n• Brownie de Chocolate - $3.200\n• Cheesecake de Fresa - $4.800\n• Tiramisú - $5.200\n\n🥪 *ENTRADAS*\n• Club Sandwich - $8.500\n• Panini de Pollo - $7.200\n• Bagel con Queso Crema - $4.500\n\n¿Te gustaría que calcule el total para 8 personas?`;
    }
    
    if (lowerMessage.includes('bebidas frías') || lowerMessage.includes('bebidas frias') || lowerMessage.includes('frio') || lowerMessage.includes('frío')) {
      return `🥤 *NUESTRAS BEBIDAS FRÍAS*\n\n• Frappé de Vainilla - $4.800\n• Frappé de Chocolate - $5.200\n• Frappé de Caramelo - $5.500\n• Limonada Natural - $3.000\n• Jugo de Naranja - $3.500\n• Agua con Gas - $2.500\n• Té Helado - $3.200\n\n¿Te gustaría probar alguna de nuestras bebidas frías?`;
    }
    
    if (lowerMessage.includes('postres dulces') || lowerMessage.includes('postres') || lowerMessage.includes('dulce') || lowerMessage.includes('dulces')) {
      return `🍰 *NUESTROS POSTRES DULCES*\n\n• Brownie de Chocolate - $3.200\n• Cheesecake de Fresa - $4.800\n• Tiramisú - $5.200\n• Muffin de Arándanos - $2.500\n• Croissant - $2.800\n• Torta de Chocolate - $4.500\n• Flan de Vainilla - $3.500\n\n¿Te gustaría probar alguno de nuestros postres?`;
    }
    
    if (lowerMessage.includes('domicilio') || lowerMessage.includes('delivery') || lowerMessage.includes('envio') || lowerMessage.includes('envío') || lowerMessage.includes('costo') || lowerMessage.includes('cuanto')) {
      return `🚚 *INFORMACIÓN DE DOMICILIO*\n\n💰 *COSTOS*\n• Costo de envío: $3.000\n• Pedido mínimo: $15.000\n• Radio de entrega: 5 km\n\n⏰ *TIEMPOS*\n• Tiempo estimado: 30-45 minutos\n• Horario de entrega: 7:00 AM - 8:00 PM\n\n💡 *TIP*: Puedes pedir cantidades específicas como "2 cappuccinos" y te calcularemos el total con envío automáticamente.`;
    }
    
    if (lowerMessage.includes('menú') || lowerMessage.includes('menu') || lowerMessage.includes('productos')) {
      return businessResponses.menu;
    }
    
    if (lowerMessage.includes('pedido') || lowerMessage.includes('ordenar') || lowerMessage.includes('comprar')) {
      return businessResponses.order;
    }
    
    if (lowerMessage.includes('precio') || lowerMessage.includes('oferta')) {
      return businessResponses.price;
    }
    
    if (lowerMessage.includes('hora') || lowerMessage.includes('abierto') || lowerMessage.includes('cerrado')) {
      return businessResponses.hours;
    }

    return `Gracias por contactarnos. ¿En qué puedo ayudarte? Puedes preguntarme sobre nuestros productos, precios o hacer un pedido.`;
  }

  // Métodos auxiliares para respuestas contextualizadas
  getDefaultGreeting(businessType) {
    const greetings = {
      restaurant: '¡Hola! Bienvenido a nuestro restaurante 🍽️\n\n¿En qué puedo ayudarte hoy?',
      cafe: '¡Hola! Bienvenido a nuestra cafetería ☕\n\n¿En qué puedo ayudarte hoy?',
      pharmacy: '¡Hola! Bienvenido a nuestra farmacia 💊\n\n¿En qué puedo ayudarte hoy?',
      grocery: '¡Hola! Bienvenido a nuestra tienda 🛒\n\n¿En qué puedo ayudarte hoy?'
    };
    return greetings[businessType] || greetings.restaurant;
  }

  getDefaultOrderResponse(businessType) {
    return '¡Perfecto! Para hacer tu pedido, por favor indícame qué te gustaría ordenar y te ayudo a procesarlo.';
  }

  getDefaultDeliveryResponse(businessType) {
    return 'Ofrecemos servicio a domicilio. ¿Te gustaría conocer nuestros tiempos de entrega y tarifas?';
  }

  getHoursResponse(businessHours) {
    if (!businessHours) {
      return '🕐 Nuestros horarios de atención son de lunes a domingo. ¿Te gustaría conocer horarios específicos?';
    }

    let response = '🕐 *HORARIOS DE ATENCIÓN*\n\n';
    const days = {
      monday: 'Lunes',
      tuesday: 'Martes', 
      wednesday: 'Miércoles',
      thursday: 'Jueves',
      friday: 'Viernes',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    // Handle both Map and Object formats
    const hoursData = businessHours instanceof Map ? businessHours : businessHours;
    
    Object.keys(days).forEach(day => {
      const dayData = hoursData.get ? hoursData.get(day) : hoursData[day];
      if (dayData && dayData.isOpen) {
        response += `${days[day]}: ${dayData.open} - ${dayData.close}\n`;
      } else {
        response += `${days[day]}: Cerrado\n`;
      }
    });

    return response;
  }

  getMenuResponse(productCategories) {
    if (!productCategories || productCategories.length === 0) {
      return '🍽️ Tenemos una gran variedad de productos disponibles. ¿Te gustaría que te ayude a elegir algo específico?';
    }

    let response = '🍽️ *NUESTRO MENÚ*\n\n';
    productCategories.forEach(category => {
      response += `*${category.name}*\n`;
      if (category.description) {
        response += `${category.description}\n`;
      }
      category.items.forEach(item => {
        response += `• ${item.name}`;
        if (item.price) {
          response += ` - $${item.price}`;
        }
        if (item.description) {
          response += `\n  ${item.description}`;
        }
        response += '\n';
      });
      response += '\n';
    });

    return response;
  }

  getDeliveryResponse(deliverySettings) {
    if (!deliverySettings || !deliverySettings.enabled) {
      return 'Actualmente no ofrecemos servicio a domicilio, pero puedes recoger tu pedido en nuestra sucursal.';
    }

    let response = '🚚 *SERVICIO A DOMICILIO*\n\n';
    response += `⏰ Tiempo de entrega: ${deliverySettings.deliveryTime}\n`;
    
    if (deliverySettings.minimumOrder > 0) {
      response += `💰 Pedido mínimo: $${deliverySettings.minimumOrder}\n`;
    }
    
    if (deliverySettings.deliveryFee > 0) {
      response += `🚚 Costo de envío: $${deliverySettings.deliveryFee}\n`;
    } else {
      response += `🚚 Envío gratuito\n`;
    }
    
    if (deliverySettings.deliveryRadius) {
      response += `📍 Radio de entrega: ${deliverySettings.deliveryRadius} km\n`;
    }

    return response;
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

  // Generar prompt enriquecido con contenido del PDF
  generateEnhancedPrompt(branchId, businessType = 'restaurant') {
    const basePrompt = this.getPrompt(branchId, businessType);
    const menuContent = this.menuContent.get(branchId);
    
    if (!menuContent) {
      return basePrompt;
    }

    let enhancedPrompt = basePrompt + '\n\n';
    
    // Agregar información del negocio
    if (menuContent.businessInfo) {
      const businessInfo = menuContent.businessInfo;
      enhancedPrompt += 'INFORMACIÓN DEL NEGOCIO:\n';
      
      if (businessInfo.name) {
        enhancedPrompt += `- Nombre: ${businessInfo.name}\n`;
      }
      if (businessInfo.address) {
        enhancedPrompt += `- Dirección: ${businessInfo.address}\n`;
      }
      if (businessInfo.phone) {
        enhancedPrompt += `- Teléfono: ${businessInfo.phone}\n`;
      }
      if (businessInfo.hours) {
        enhancedPrompt += `- Horarios: ${businessInfo.hours}\n`;
      }
      enhancedPrompt += '\n';
    }

    // Agregar información de contacto
    if (menuContent.contactInfo) {
      const contactInfo = menuContent.contactInfo;
      if (contactInfo.phones.length > 0) {
        enhancedPrompt += `CONTACTOS:\n`;
        enhancedPrompt += `- Teléfonos: ${contactInfo.phones.join(', ')}\n`;
      }
      if (contactInfo.emails.length > 0) {
        enhancedPrompt += `- Emails: ${contactInfo.emails.join(', ')}\n`;
      }
      if (contactInfo.socialMedia.length > 0) {
        enhancedPrompt += `- Redes Sociales: `;
        contactInfo.socialMedia.forEach(social => {
          enhancedPrompt += `${social.platform}: ${social.handle} `;
        });
        enhancedPrompt += '\n';
      }
      enhancedPrompt += '\n';
    }

    // Agregar secciones del menú
    if (menuContent.sections && menuContent.sections.length > 0) {
      enhancedPrompt += 'MENÚ DISPONIBLE:\n';
      menuContent.sections.forEach(section => {
        enhancedPrompt += `\n${section.name.toUpperCase()}:\n`;
        if (section.products && section.products.length > 0) {
          section.products.forEach(product => {
            enhancedPrompt += `- ${product.name}`;
            if (product.description) {
              enhancedPrompt += `: ${product.description}`;
            }
            if (product.price) {
              enhancedPrompt += ` - $${product.price}`;
            }
            enhancedPrompt += '\n';
          });
        }
      });
      enhancedPrompt += '\n';
    }

    // Agregar productos destacados
    if (menuContent.products && menuContent.products.length > 0) {
      enhancedPrompt += 'PRODUCTOS DESTACADOS:\n';
      const topProducts = menuContent.products.slice(0, 10); // Top 10 productos
      topProducts.forEach(product => {
        enhancedPrompt += `- ${product.name}`;
        if (product.price) {
          enhancedPrompt += ` ($${product.price})`;
        }
        if (product.category && product.category !== 'general') {
          enhancedPrompt += ` [${product.category}]`;
        }
        enhancedPrompt += '\n';
      });
      enhancedPrompt += '\n';
    }

    // Agregar resumen estadístico
    if (menuContent.summary) {
      const summary = menuContent.summary;
      enhancedPrompt += 'RESUMEN DEL MENÚ:\n';
      enhancedPrompt += `- Total de secciones: ${summary.totalSections}\n`;
      enhancedPrompt += `- Total de productos: ${summary.totalProducts}\n`;
      
      if (summary.priceRange.min !== null) {
        enhancedPrompt += `- Rango de precios: $${summary.priceRange.min} - $${summary.priceRange.max}\n`;
        enhancedPrompt += `- Precio promedio: $${summary.priceRange.average.toFixed(2)}\n`;
      }
      enhancedPrompt += '\n';
    }

    // Instrucciones finales
    enhancedPrompt += `INSTRUCCIONES IMPORTANTES:
- Usa esta información para responder preguntas sobre productos, precios y disponibilidad
- Si no encuentras un producto específico, sugiere alternativas similares
- Siempre menciona los precios cuando sea relevante
- Si el cliente pregunta por información de contacto, usa los datos proporcionados
- Mantén un tono amigable y profesional
- Si no estás seguro de algo, es mejor decir que no tienes esa información específica`;

    return enhancedPrompt;
  }

  // Obtener respuesta de IA con contexto enriquecido
  async getAIResponse(branchId, userMessage, businessType = 'restaurant') {
    try {
      const enhancedPrompt = this.generateEnhancedPrompt(branchId, businessType);
      const conversationHistory = this.conversationHistory.get(branchId) || [];
      
      // Construir contexto completo
      let fullContext = enhancedPrompt + '\n\nCONVERSACIÓN:\n';
      
      // Agregar historial de conversación (últimos 5 mensajes)
      const recentHistory = conversationHistory.slice(-5);
      recentHistory.forEach(msg => {
        fullContext += `${msg.role}: ${msg.content}\n`;
      });
      
      fullContext += `Usuario: ${userMessage}\nAsistente:`;

      // Simular respuesta de IA (aquí integrarías con el modelo real)
      const response = await this.generateSimulatedResponse(userMessage, enhancedPrompt);
      
      // Guardar en historial
      conversationHistory.push(
        { role: 'Usuario', content: userMessage, timestamp: new Date() },
        { role: 'Asistente', content: response, timestamp: new Date() }
      );
      
      // Mantener solo los últimos mensajes
      if (conversationHistory.length > this.maxHistoryLength) {
        conversationHistory.splice(0, conversationHistory.length - this.maxHistoryLength);
      }
      
      this.conversationHistory.set(branchId, conversationHistory);
      
      return {
        success: true,
        response: response,
        context: {
          hasMenuContent: !!this.menuContent.get(branchId),
          promptLength: enhancedPrompt.length,
          conversationLength: conversationHistory.length
        }
      };
      
    } catch (error) {
      this.logger.error(`Error generando respuesta de IA para sucursal ${branchId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generar respuesta simulada mejorada
  async generateSimulatedResponse(userMessage, enhancedPrompt) {
    const message = userMessage.toLowerCase();
    
    // Respuestas basadas en contenido del PDF
    if (message.includes('menú') || message.includes('menu')) {
      return 'Te puedo ayudar con información sobre nuestro menú. ¿Hay alguna categoría específica que te interese? Por ejemplo: bebidas, platos principales, postres, etc.';
    }
    
    if (message.includes('precio') || message.includes('cuesta') || message.includes('vale')) {
      return 'Los precios varían según el producto. ¿Hay algún plato específico del que te gustaría saber el precio? Puedo ayudarte a encontrar la información que necesitas.';
    }
    
    if (message.includes('dirección') || message.includes('ubicación') || message.includes('donde')) {
      return 'Te puedo proporcionar nuestra dirección y datos de contacto. ¿Te gustaría que te comparta esta información?';
    }
    
    if (message.includes('horario') || message.includes('hora') || message.includes('abierto')) {
      return 'Te puedo informar sobre nuestros horarios de atención. ¿Necesitas saber los horarios para algún día específico?';
    }
    
    if (message.includes('pedido') || message.includes('orden') || message.includes('comprar')) {
      return '¡Perfecto! Te puedo ayudar con tu pedido. ¿Qué te gustaría ordenar? Puedo sugerirte algunos de nuestros platos más populares.';
    }
    
    if (message.includes('recomendación') || message.includes('recomienda') || message.includes('sugerir')) {
      return '¡Me encanta ayudar con recomendaciones! Basándome en nuestro menú, puedo sugerirte algunos platos excelentes. ¿Tienes alguna preferencia de sabor o tipo de comida?';
    }
    
    // Respuesta por defecto más inteligente
    return 'Hola! Soy tu asistente virtual y estoy aquí para ayudarte con cualquier consulta sobre nuestro menú, precios, pedidos o información general. ¿En qué puedo asistirte hoy?';
  }

  // Extraer información sobre café del contexto del menú
  extractCafeInfo(context) {
    try {
      const lines = context.split('\n');
      const cafeLines = lines.filter(line => 
        line.toLowerCase().includes('café') || 
        line.toLowerCase().includes('cafe') || 
        line.toLowerCase().includes('coffee') ||
        line.toLowerCase().includes('espresso') ||
        line.toLowerCase().includes('americano') ||
        line.toLowerCase().includes('latte') ||
        line.toLowerCase().includes('cappuccino')
      );
      
      if (cafeLines.length > 0) {
        // Filtrar solo las líneas que contienen productos con precios
        const cafeProducts = cafeLines.filter(line => 
          line.includes('•') || line.includes('-') || line.includes('$')
        );
        
        if (cafeProducts.length > 0) {
          return `☕ *NUESTROS CAFÉS*\n\n${cafeProducts.slice(0, 6).join('\n')}\n\n¿Te gustaría probar alguno de nuestros cafés especiales?`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extrayendo información de café:', error);
      return null;
    }
  }

  // Extraer información de precios del contexto del menú
  extractPriceInfo(context) {
    try {
      const lines = context.split('\n');
      const priceLines = lines.filter(line => 
        line.includes('$') || 
        line.includes('pesos') || 
        line.includes('precio') ||
        line.match(/\d+\.\d+/) ||
        line.match(/\$\d+/)
      );
      
      if (priceLines.length > 0) {
        const priceInfo = priceLines.slice(0, 10).join('\n'); // Limitar a 10 líneas
        return `💰 *NUESTROS PRECIOS*\n\n${priceInfo}\n\n¿Te gustaría ver más información sobre algún producto específico?`;
      }
      
      return null;
    } catch (error) {
      console.error('Error extrayendo información de precios:', error);
      return null;
    }
  }

  // Extraer información de bebidas frías del contexto real del menú
  extractColdDrinksInfo(context) {
    try {
      const lines = context.split('\n');
      const coldDrinksLines = lines.filter(line =>
        line.toLowerCase().includes('bebidas frías') ||
        line.toLowerCase().includes('frappé') ||
        line.toLowerCase().includes('limonada') ||
        line.toLowerCase().includes('jugo') ||
        line.toLowerCase().includes('agua con gas') ||
        line.toLowerCase().includes('té helado')
      );
      
      if (coldDrinksLines.length > 0) {
        // Buscar las líneas que contienen productos con precios
        const coldDrinksProducts = lines.filter(line =>
          (line.includes('•') || line.includes('-')) &&
          (line.toLowerCase().includes('frappé') ||
           line.toLowerCase().includes('limonada') ||
           line.toLowerCase().includes('jugo') ||
           line.toLowerCase().includes('agua') ||
           line.toLowerCase().includes('té helado') ||
           line.toLowerCase().includes('frío'))
        );
        
        if (coldDrinksProducts.length > 0) {
          return `🥤 *NUESTRAS BEBIDAS FRÍAS*\n\n${coldDrinksProducts.join('\n')}\n\n¿Te gustaría probar alguna de nuestras bebidas frías?`;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extrayendo información de bebidas frías:', error);
      return null;
    }
  }

  // Extraer información sobre postres del contexto del menú
  extractDessertInfo(context) {
    try {
      const lines = context.split('\n');
      const dessertLines = lines.filter(line => 
        line.toLowerCase().includes('postre') || 
        line.toLowerCase().includes('brownie') ||
        line.toLowerCase().includes('cheesecake') ||
        line.toLowerCase().includes('tiramisú') ||
        line.toLowerCase().includes('muffin') ||
        line.toLowerCase().includes('dulce') ||
        line.toLowerCase().includes('torta') ||
        line.toLowerCase().includes('pastel')
      );
      
      if (dessertLines.length > 0) {
        // Filtrar solo las líneas que contienen productos con precios
        const dessertProducts = dessertLines.filter(line => 
          line.includes('•') || line.includes('-') || line.includes('$')
        );
        
        if (dessertProducts.length > 0) {
          return `🍰 *NUESTROS POSTRES*\n\n${dessertProducts.slice(0, 6).join('\n')}\n\n¿Te gustaría probar alguno de nuestros postres?`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extrayendo información de postres:', error);
      return null;
    }
  }

  // Extraer información sobre entradas del contexto del menú
  extractAppetizerInfo(context) {
    try {
      const lines = context.split('\n');
      const appetizerLines = lines.filter(line => 
        line.toLowerCase().includes('entrada') || 
        line.toLowerCase().includes('aperitivo') ||
        line.toLowerCase().includes('sándwich') ||
        line.toLowerCase().includes('sandwich') ||
        line.toLowerCase().includes('panini') ||
        line.toLowerCase().includes('bagel') ||
        line.toLowerCase().includes('tostada') ||
        line.toLowerCase().includes('bruschetta') ||
        line.toLowerCase().includes('nachos') ||
        line.toLowerCase().includes('empanada')
      );
      
      if (appetizerLines.length > 0) {
        // Filtrar solo las líneas que contienen productos con precios
        const appetizerProducts = appetizerLines.filter(line => 
          line.includes('•') || line.includes('-') || line.includes('$')
        );
        
        if (appetizerProducts.length > 0) {
          return `🥪 *NUESTRAS ENTRADAS*\n\n${appetizerProducts.slice(0, 6).join('\n')}\n\n¿Te gustaría probar alguna de nuestras entradas?`;
        }
      }
      
      // Si no encuentra entradas específicas, buscar en sándwiches
      const sandwichLines = lines.filter(line => 
        line.toLowerCase().includes('sándwich') ||
        line.toLowerCase().includes('sandwich') ||
        line.toLowerCase().includes('panini') ||
        line.toLowerCase().includes('bagel')
      );
      
      if (sandwichLines.length > 0) {
        const sandwichProducts = sandwichLines.filter(line => 
          line.includes('•') || line.includes('-') || line.includes('$')
        );
        
        if (sandwichProducts.length > 0) {
          return `🥪 *NUESTRAS ENTRADAS*\n\n${sandwichProducts.slice(0, 6).join('\n')}\n\n¿Te gustaría probar alguna de nuestras entradas?`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extrayendo información de entradas:', error);
      return null;
    }
  }

  // Detectar si el mensaje es una solicitud de pedido
  isOrderRequest(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Patrones que indican un pedido
    const orderPatterns = [
      /\d+\s+(café|cafe|cappuccino|latte|americano|mocha|espresso)/i,
      /\d+\s+(panini|sandwich|sándwich|bagel|club)/i,
      /\d+\s+(brownie|cheesecake|tiramisú|muffin|torta|postre)/i,
      /\d+\s+(frappé|limonada|jugo)/i,
      /\d+\s+(club\s+sandwich|panini\s+de\s+pollo)/i,
      /me\s+gustan\s+los?\s+club\s+sandwich\s+me\s+regalas?\s+\d+/i,
      /me\s+gustan\s+los?\s+\w+\s+me\s+regalas?\s+\d+.*porfa/i,
      /.*me\s+gustan\s+los?\s+club\s+sandwich.*me\s+regalas?\s+\d+/i,
      /.*me\s+gustan\s+los?\s+\w+.*me\s+regalas?\s+\d+/i,
      // Patrón específico para el mensaje del usuario
      /axcelente\s+me\s+gustan\s+los\s+club\s+sandwich\s+me\s+ragalas\s+\d+/i,
      /quiero\s+\d+/i,
      /me\s+gustaría\s+\d+/i,
      /me\s+gusta\s+el?\s+\w+\s+me\s+dás?\s+\d+/i,
      /me\s+gustan\s+los?\s+\w+\s+me\s+regalas?\s+\d+/i,
      /regalame\s+\d+/i,
      /regálame\s+\d+/i,
      /pedir\s+\d+/i,
      /ordenar\s+\d+/i,
      /cuanto\s+(seria|cuesta|vale)/i,
      /costo\s+de\s+envio/i,
      /precio\s+total/i,
      /total\s+con\s+domicilio/i,
      /domicilio\s+para\s+pago/i,
      /valor\s+total/i,
      /pago\s+por\s+transferencia/i
    ];
    
    return orderPatterns.some(pattern => pattern.test(userMessage));
  }

  // Procesar pedido específico con cálculos
  processOrder(userMessage, context, businessSettings) {
    try {
      console.log('🛒 ===== PROCESANDO PEDIDO =====');
      console.log('💬 Mensaje:', userMessage);
      
      // Extraer productos y cantidades del mensaje
      const orderItems = this.extractOrderItems(userMessage, context);
      
      if (orderItems.length === 0) {
        return null;
      }
      
      // Calcular totales
      const subtotal = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const deliveryFee = businessSettings.deliverySettings?.deliveryFee || 3000;
      const total = subtotal + deliveryFee;
      
      // Generar respuesta del pedido
      let response = `🛒 *RESUMEN DE TU PEDIDO*\n\n`;
      
      orderItems.forEach(item => {
        response += `• ${item.quantity}x ${item.name} - $${item.price.toLocaleString()} c/u\n`;
      });
      
      response += `\n💰 *TOTALES*\n`;
      response += `Subtotal: $${subtotal.toLocaleString()}\n`;
      response += `Costo de envío: $${deliveryFee.toLocaleString()}\n`;
      response += `*Total: $${total.toLocaleString()}*\n\n`;
      
      response += `¿Confirmas tu pedido? Te enviaremos los detalles de pago y entrega.`;
      
      console.log('✅ Pedido procesado exitosamente');
      return response;
      
    } catch (error) {
      console.error('Error procesando pedido:', error);
      return null;
    }
  }

  // Extraer productos y cantidades del mensaje
  extractOrderItems(userMessage, context) {
    const items = [];
    const lines = context.split('\n');
    
    // Crear mapa de productos con precios - MEJORADO
    const productMap = new Map();
    lines.forEach(line => {
      // Mejorar la expresión regular para capturar precios con puntos
      const match = line.match(/•\s*(.+?)\s*-\s*\$\s*([\d.,]+)/);
      if (match) {
        const name = match[1].trim().toLowerCase();
        // Convertir precio correctamente (remover comas y puntos)
        const priceStr = match[2].replace(/[,.]/g, '');
        const price = parseInt(priceStr);
        productMap.set(name, price);
        console.log(`📦 Producto mapeado: ${name} - $${price}`);
      }
    });
    
    // Buscar cantidades y productos en el mensaje
    const lowerMessage = userMessage.toLowerCase();
    
    // Patrón mejorado para encontrar productos con cantidades
    const quantityPattern = /(\d+)\s+([^,\n]+?)(?:\s+con\s+[^,\n]+)?/g;
    let match;
    
    while ((match = quantityPattern.exec(lowerMessage)) !== null) {
      const quantity = parseInt(match[1]);
      const productText = match[2].trim();
      
      console.log(`🔍 Buscando producto: "${productText}" (cantidad: ${quantity})`);
      
      // Buscar el producto en el mapa con mejor lógica
      let found = false;
      for (const [productName, price] of productMap) {
        // Buscar coincidencias más precisas
        if (productText.includes(productName) || 
            productName.includes(productText.split(' ')[0]) ||
            productName.includes(productText.split(' ')[1]) ||
            productName.includes(productText.split(' ')[2]) ||
            // Casos especiales para productos compuestos
            (productText.includes('torta') && productName.includes('torta')) ||
            (productText.includes('cafe') && productName.includes('café')) ||
            (productText.includes('espresso') && productName.includes('espresso'))) {
          
          console.log(`✅ Producto encontrado: ${productName} - $${price}`);
          items.push({
            name: productName,
            quantity: quantity,
            price: price
          });
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.log(`❌ Producto no encontrado: "${productText}"`);
        // Mostrar productos disponibles para debug
        console.log(`📋 Productos disponibles:`, Array.from(productMap.keys()));
      }
    }
    
    return items;
  }

  // Generar respuesta basada en el contenido del menú
  generateMenuBasedResponse(context, userMessage) {
    try {
      const lowerMessage = userMessage.toLowerCase();
      
      // Si pregunta por productos específicos, buscar en el menú
      if (lowerMessage.includes('café') || lowerMessage.includes('cafe')) {
        return this.extractCafeInfo(context) || '☕ Tenemos una gran variedad de cafés especiales. ¿Te gustaría conocer nuestras opciones?';
      }
      
      // Responder específicamente a acompañantes/pan
      if (lowerMessage.includes('acompañante') || lowerMessage.includes('acompañantes') || lowerMessage.includes('pan')) {
        const lines = context.split('\n');
        const accompaniments = lines.filter(line => 
          line.toLowerCase().includes('pan') || 
          line.toLowerCase().includes('postre') ||
          line.toLowerCase().includes('brownie') ||
          line.toLowerCase().includes('cheesecake') ||
          line.toLowerCase().includes('tiramisú') ||
          line.toLowerCase().includes('muffin') ||
          line.toLowerCase().includes('sándwich') ||
          line.toLowerCase().includes('panini') ||
          line.toLowerCase().includes('bagel')
        );
        
        if (accompaniments.length > 0) {
          return `🥖 *NUESTROS ACOMPAÑANTES*\n\n${accompaniments.slice(0, 8).join('\n')}\n\n¿Te gustaría probar alguno de nuestros acompañantes?`;
        }
        
        return '🥖 Tenemos deliciosos acompañantes como pan, postres y sándwiches. ¿Te gustaría conocer nuestras opciones?';
      }
      
      if (lowerMessage.includes('comida') || lowerMessage.includes('plato') || lowerMessage.includes('almuerzo')) {
        const foodLines = context.split('\n').filter(line => 
          line.toLowerCase().includes('plato') || 
          line.toLowerCase().includes('comida') ||
          line.toLowerCase().includes('almuerzo') ||
          line.toLowerCase().includes('cena')
        );
        
        if (foodLines.length > 0) {
          return `🍽️ *NUESTROS PLATOS*\n\n${foodLines.slice(0, 5).join('\n')}\n\n¿Te gustaría probar alguno de nuestros platos especiales?`;
        }
      }
      
      // Respuesta más conversacional y útil
      const lines = context.split('\n');
      const menuItems = lines.filter(line => 
        line.includes('☕') || 
        line.includes('🍰') || 
        line.includes('🥪') || 
        line.includes('🥤') ||
        line.includes('•')
      ).slice(0, 8); // Mostrar más elementos
      
      if (menuItems.length > 0) {
        return `🍽️ *NUESTRO MENÚ*\n\n${menuItems.join('\n')}\n\n💡 *TIP*: Puedes pedir cantidades específicas como "2 cappuccinos" o "3 paninis" y te calcularemos el total con envío.`;
      }
      
      return '🍽️ Tenemos una gran variedad de productos disponibles. ¿Te gustaría que te ayude a elegir algo específico?';
      
    } catch (error) {
      console.error('Error generando respuesta basada en menú:', error);
      return '🍽️ Tenemos una gran variedad de productos disponibles. ¿Te gustaría que te ayude a elegir algo específico?';
    }
  }
}

module.exports = AIService;
