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

  // Generar respuesta fluida usando IA contextual
  async generateFluidResponse(userMessage, branchId = null, clientId = null, context = {}) {
    try {
      // Obtener el prompt del negocio
      const customPrompt = this.aiPrompts.get(branchId) || null;
      
      // Detectar si el mensaje del usuario necesita guía hacia opciones válidas
      const needsGuidance = this.detectIfNeedsGuidance(userMessage, context);
      
      // Obtener historial de conversación para mejor contexto
      const conversationHistory = await this.getConversationHistory(clientId, branchId);
      
      // Si necesita guía específica, usar respuesta guiada predefinida
      if (needsGuidance) {
        console.log('🎯 Usuario necesita guía específica, usando respuesta guiada...');
        
        // Primero verificar si es validación de datos de envío
        const deliveryValidation = this.validateDeliveryData(userMessage, context);
        if (deliveryValidation) {
          console.log('🎯 Validación de datos de envío detectada');
          
          // Guardar en historial de conversación
          if (clientId && branchId) {
            await this.saveConversationTurn(clientId, branchId, userMessage, deliveryValidation);
          }
          
          return deliveryValidation;
        }
        
        // Luego verificar si es una respuesta contextual especial
        const contextualResponses = this.detectContextualResponses(userMessage, context);
        if (contextualResponses.needsSpecialHandling && contextualResponses.response) {
          console.log(`🎯 Manejo contextual: ${contextualResponses.type}`);
          
          // Guardar en historial de conversación
          if (clientId && branchId) {
            await this.saveConversationTurn(clientId, branchId, userMessage, contextualResponses.response);
          }
          
          return contextualResponses.response;
        }
        
        // Si no es contextual, usar respuesta guiada normal
        const guidedResponse = this.generateGuidedResponse(userMessage, context);
        
        // Guardar en historial de conversación
        if (clientId && branchId) {
          await this.saveConversationTurn(clientId, branchId, userMessage, guidedResponse);
        }
        
        return guidedResponse;
      }
      
      // Construir prompt para respuesta fluida con mejor manejo de contexto
      let fluidPrompt = `
Eres un asistente virtual especializado en atención al cliente para restaurantes de comida rápida.

CONTEXTO DEL NEGOCIO:
${customPrompt || 'Restaurante de comida rápida'}

CONTEXTO DE LA CONVERSACIÓN:
- Cliente: ${clientId || 'Usuario'}
- Sucursal: ${branchId || 'No especificada'}
- Historial reciente: ${conversationHistory.length > 0 ? conversationHistory.slice(-3).map(h => `${h.user}: ${h.bot}`).join(' | ') : 'Nueva conversación'}
- Estado actual: ${context.currentState || 'Conversación normal'}
- Último mensaje del bot: ${context.lastBotMessage || 'No disponible'}

MENSAJE DEL CLIENTE: "${userMessage}"

INSTRUCCIONES ESPECÍFICAS:
1. Si es un pedido, procesa automáticamente y muestra los detalles
2. Si es una consulta, responde de forma útil y específica
3. Si hay errores de escritura, corrígelos automáticamente de forma natural
4. Mantén un tono profesional pero cercano
5. Usa emojis apropiados para hacer la conversación más amigable
6. SIEMPRE ofrece opciones claras y específicas para guiar al usuario
7. Si detectas que el usuario quiere hacer un pedido pero no especifica bien, ofrece las opciones más comunes

RESPUESTA (máximo 200 palabras):`;

      console.log('🤖 Generando respuesta fluida con IA...');
      
      // Generar respuesta con IA
      const aiResponse = await this.generateAIResponse(fluidPrompt, userMessage);
      
      // Post-procesar la respuesta para asegurar formato correcto
      const processedResponse = this.postProcessAIResponse(aiResponse, userMessage, branchId);
      
      // Guardar en historial de conversación
      if (clientId && branchId) {
        await this.saveConversationTurn(clientId, branchId, userMessage, processedResponse);
      }
      
      console.log(`✅ Respuesta fluida generada: ${processedResponse.substring(0, 100)}...`);
      
      return processedResponse;
      
    } catch (error) {
      console.error('❌ Error en generación de respuesta fluida:', error);
      // Fallback al sistema original
      return await this.generateResponse(branchId, userMessage, clientId, 'restaurant', null);
    }
  }

  // Post-procesar respuesta de IA para asegurar formato y funcionalidad
  postProcessAIResponse(aiResponse, userMessage, branchId) {
    let processedResponse = aiResponse.trim();
    
    // Corregir errores de escritura comunes en la respuesta si es necesario
    processedResponse = this.correctCommonTypos(processedResponse, userMessage);
    
    // Si la respuesta parece ser un pedido, agregar formato de pedido
    if (this.isOrderResponse(processedResponse, userMessage)) {
      processedResponse = this.formatOrderResponse(processedResponse, userMessage, branchId);
    }
    
    // Asegurar que tenga emojis apropiados
    if (!processedResponse.includes('😊') && !processedResponse.includes('🍗') && !processedResponse.includes('✅')) {
      processedResponse = `😊 ${processedResponse}`;
    }
    
    // Limitar longitud si es muy larga
    if (processedResponse.length > 500) {
      processedResponse = processedResponse.substring(0, 497) + '...';
    }
    
    return processedResponse;
  }

  // Corregir errores de escritura comunes
  correctCommonTypos(response, userMessage) {
    let correctedResponse = response;
    const lowerMessage = userMessage.toLowerCase();
    
    // Correcciones automáticas de errores comunes
    const autoCorrections = {
      'mpersona': 'persona',
      'somo': 'somos',
      'som': 'somos',
      'somoss': 'somos',
      'menu': 'menú'
    };
    
    Object.entries(autoCorrections).forEach(([wrong, right]) => {
      if (lowerMessage.includes(wrong) && !correctedResponse.includes(right)) {
        correctedResponse = correctedResponse.replace(new RegExp(wrong, 'gi'), right);
      }
    });
    
    return correctedResponse;
  }

  // Verificar si la respuesta parece ser un pedido
  isOrderResponse(response, userMessage) {
    const orderKeywords = ['combo', 'familiar', 'emparejado', 'alitas', 'pedido', 'orden'];
    const hasOrderKeyword = orderKeywords.some(keyword => 
      response.toLowerCase().includes(keyword) || userMessage.toLowerCase().includes(keyword)
    );
    
    return hasOrderKeyword && (response.includes('$') || response.includes('total'));
  }

  // Detectar si el usuario necesita guía hacia opciones válidas
  detectIfNeedsGuidance(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // PRIMERO: Verificar si es validación de datos de envío
    const deliveryValidation = this.validateDeliveryData(userMessage, context);
    if (deliveryValidation) {
      return true; // Necesita manejo especial para datos de envío
    }
    
    // Detectar errores de escritura comunes
    const commonTypos = {
      'mpersona': 'persona',
      'personas': 'personas',
      'pedir': 'pedir',
      'menu': 'menú',
      'combo': 'combo',
      'familiar': 'familiar',
      'somo': 'somos',
      'som': 'somos',
      'son': 'somos',
      'somoss': 'somos'
    };
    
    // Detectar si hay errores de escritura
    const hasTypo = Object.keys(commonTypos).some(typo => lowerMessage.includes(typo));
    
    // Detectar respuestas contextuales que necesitan manejo específico
    const contextualResponses = this.detectContextualResponses(userMessage, context);
    
    // Detectar respuestas vagas o confusas (solo si no son contextuales)
    const vagueResponses = ['si', 'sí', 'ok', 'bueno', 'está bien', 'dale'];
    const isVague = !contextualResponses.needsSpecialHandling && vagueResponses.some(vague => lowerMessage === vague);
    
    // Detectar si está respondiendo algo que no tiene sentido en el contexto
    const contextMismatch = this.detectContextMismatch(userMessage, context);
    
    return hasTypo || isVague || contextMismatch || contextualResponses.needsSpecialHandling;
  }

  // Detectar respuestas contextuales que necesitan manejo especial
  detectContextualResponses(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Detectar saludos
    const greetings = ['hola', 'hello', 'buenas tardes', 'buenas noches', 'buenos días', 'hey', 'hi'];
    const isGreeting = greetings.some(greeting => lowerMessage.includes(greeting));
    
    // Detectar respuestas afirmativas/negativas
    const positiveResponses = ['si', 'sí', 'yes', 'ok', 'bueno', 'está bien', 'dale', 'perfecto'];
    const negativeResponses = ['no', 'nop', 'nope', 'no gracias', 'no quiero', 'cancelar'];
    
    const isPositive = positiveResponses.some(pos => lowerMessage === pos);
    const isNegative = negativeResponses.some(neg => lowerMessage === neg);
    
    // Determinar el contexto de la conversación
    const conversationState = this.determineConversationState(context);
    
    // Si es saludo, manejar especialmente
    if (isGreeting) {
      return { needsSpecialHandling: true, type: 'greeting', response: this.handleGreeting(userMessage) };
    }
    
    // Si es respuesta afirmativa/negativa en contexto específico
    if ((isPositive || isNegative) && conversationState !== 'unknown') {
      return { 
        needsSpecialHandling: true, 
        type: 'contextual_response', 
        response: this.handleContextualResponse(isPositive, isNegative, conversationState, context)
      };
    }
    
    return { needsSpecialHandling: false };
  }

  // Determinar el estado actual de la conversación
  determineConversationState(context = {}) {
    const lastBotMessage = context.lastBotMessage || '';
    const currentState = context.currentState || '';
    
    // Si el bot preguntó sobre hacer un pedido
    if (lastBotMessage.includes('pedido pendiente') || lastBotMessage.includes('hacer un nuevo pedido')) {
      return 'asking_about_order';
    }
    
    // Si el bot preguntó sobre enviar menú
    if (lastBotMessage.includes('enviarte el menú') || lastBotMessage.includes('envíame el menú')) {
      return 'asking_about_menu';
    }
    
    // Si es saludo inicial
    if (currentState === 'greeting' || lastBotMessage.includes('¿En qué te puedo ayudar?')) {
      return 'greeting';
    }
    
    // Si está en proceso de pedido
    if (currentState === 'ordering' || lastBotMessage.includes('combo') || lastBotMessage.includes('alitas')) {
      return 'ordering';
    }
    
    return 'unknown';
  }

  // Manejar saludos
  handleGreeting(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('buenas noches')) {
      return `¡Buenas noches! 😊 Somos Alitas Mix americas. ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
    } else if (lowerMessage.includes('buenas tardes')) {
      return `¡Buenas tardes! 😊 Somos Alitas Mix americas. ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
    } else if (lowerMessage.includes('buenos días')) {
      return `¡Buenos días! 😊 Somos Alitas Mix americas. ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
    } else {
      return `¡Hola! 😊 Somos Alitas Mix americas. ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
    }
  }

  // Manejar respuestas contextuales
  handleContextualResponse(isPositive, isNegative, conversationState, context) {
    switch (conversationState) {
      case 'asking_about_order':
        if (isPositive) {
          return `😊 ¡Perfecto! Te ayudo con un nuevo pedido. 

Para recomendarte lo mejor, dime cuántas personas son y te doy la opción más adecuada:

- 1 persona: Combo 1 (5 alitas + acompañante)
- 2 personas: Combo Emparejado (16 alitas + 2 acompañantes)
- 3-4 personas: Combo 2/3 (7-9 alitas + acompañante)
- 5+ personas: Combos Familiares (30+ alitas + gaseosa)

¿Para cuántas personas es el pedido?`;
        } else if (isNegative) {
          return `😊 No hay problema. Estaremos aquí para atenderte cuando lo necesites. 

Si en el futuro quieres hacer un pedido, solo dime "menú" o "pedir" y te ayudo.

¡Que tengas un excelente día! 👋`;
        }
        break;
        
      case 'asking_about_menu':
        if (isPositive) {
          return `😊 ¡Perfecto! Te envío el menú completo:

🍗 **COMBOS PERSONALES**
• Combo 1: 5 alitas + acompañante + salsas - $21.900
• Combo 2: 7 alitas + acompañante + salsas - $26.900
• Combo 3: 9 alitas + acompañante + salsas - $31.900

🍗 **COMBOS FAMILIARES**
• Combo Emparejado: 16 alitas + 2 acompañantes - $45.900
• Familiar 2: 30 alitas + acompañante + gaseosa 1.5L - $89.900
• Familiar 3: 40 alitas + acompañante + gaseosa 1.5L - $119.900
• Familiar 4: 50 alitas + 2 acompañantes + gaseosa 1.5L - $149.900

¿Qué combo te gusta más? Solo dime el nombre del combo para ordenar.`;
        } else if (isNegative) {
          return `😊 No hay problema. Estaremos aquí para atenderte cuando lo necesites. 

Si en el futuro quieres ver el menú, solo dime "menú" y te lo envío.

¡Que tengas un excelente día! 👋`;
        }
        break;
        
      case 'greeting':
        if (isPositive) {
          return `😊 ¡Genial! Te ayudo con lo que necesites. 

Puedo ayudarte con:
• Ver el menú completo
• Hacer un pedido
• Información sobre precios
• Recomendaciones

¿Qué te gustaría hacer? Solo dime "menú", "pedir" o "precios".`;
        } else if (isNegative) {
          return `😊 No hay problema. Estaremos aquí para atenderte cuando lo necesites. 

Si en el futuro necesitas algo, solo escribe y te ayudo.

¡Que tengas un excelente día! 👋`;
        }
        break;
        
      default:
        return null;
    }
    
    return null;
  }

  // Validar y procesar datos de envío
  validateDeliveryData(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar si el bot está pidiendo datos de envío
    const isAskingForDeliveryData = context.lastBotMessage && (
      context.lastBotMessage.includes('DATOS DE ENVÍO') ||
      context.lastBotMessage.includes('datos de envío') ||
      context.lastBotMessage.includes('dirección completa') ||
      context.lastBotMessage.includes('barrio/zona') ||
      context.lastBotMessage.includes('teléfono de contacto') ||
      context.lastBotMessage.includes('nombre de quien recibe')
    );
    
    if (!isAskingForDeliveryData) {
      return null;
    }
    
    // Extraer datos del mensaje del usuario
    const extractedData = this.extractDeliveryInfo(userMessage);
    
    // Validar si todos los campos están presentes
    const validation = this.validateDeliveryFields(extractedData);
    
    if (validation.isComplete) {
      return this.generateDeliveryConfirmation(extractedData);
    } else {
      return this.generateMissingFieldsMessage(validation.missingFields, extractedData);
    }
  }

  // Extraer información de envío del mensaje
  extractDeliveryInfo(message) {
    const data = {
      address: null,
      neighborhood: null,
      phone: null,
      name: null
    };
    
    // Limpiar el mensaje
    const cleanMessage = message.replace(/[,\-]/g, ' ').trim();
    const words = cleanMessage.split(/\s+/);
    
    // Detectar teléfono (secuencia de números de 7-15 dígitos)
    const phonePattern = /\b(\d{7,15})\b/g;
    const phoneMatches = [...cleanMessage.matchAll(phonePattern)];
    if (phoneMatches.length > 0) {
      // Tomar el teléfono más largo (más probable)
      data.phone = phoneMatches.reduce((longest, match) => 
        match[1].length > longest.length ? match[1] : longest, phoneMatches[0][1]);
    }
    
    // Detectar dirección (números, calles, carreras, casas)
    const addressWords = [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (
        /^\d/.test(word) || 
        word.toLowerCase().includes('calle') ||
        word.toLowerCase().includes('carrera') ||
        word.toLowerCase().includes('casa') ||
        word.includes('#') ||
        word.includes('nº') ||
        word.includes('no')
      ) {
        addressWords.push(word);
      }
    }
    
    if (addressWords.length > 0) {
      data.address = addressWords.join(' ');
    }
    
    // Detectar barrio/neighborhood
    const neighborhoodKeywords = ['barrio', 'zona', 'sector', 'urbanización', 'conjunto'];
    const neighborhoodWords = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      if (neighborhoodKeywords.includes(word)) {
        // Buscar la siguiente palabra que no sea número ni palabra clave
        for (let j = i + 1; j < words.length; j++) {
          const nextWord = words[j];
          if (!/^\d/.test(nextWord) && 
              !phonePattern.test(nextWord) &&
              !neighborhoodKeywords.includes(nextWord.toLowerCase()) &&
              nextWord.length > 2) {
            neighborhoodWords.push(nextWord);
          } else if (neighborhoodWords.length > 0) {
            break;
          }
        }
        break;
      }
    }
    
    if (neighborhoodWords.length > 0) {
      data.neighborhood = neighborhoodWords.join(' ');
    }
    
    // Detectar nombre (palabras que empiezan con mayúscula, no números, no direcciones)
    const nameWords = [];
    const usedWords = new Set([...addressWords.map(w => w.toLowerCase()), ...neighborhoodWords.map(w => w.toLowerCase())]);
    
    for (const word of words) {
      if (
        word.length > 2 && 
        /^[A-ZÁÉÍÓÚÑ]/.test(word) && 
        !/^\d/.test(word) &&
        !usedWords.has(word.toLowerCase()) &&
        !neighborhoodKeywords.includes(word.toLowerCase()) &&
        !phonePattern.test(word)
      ) {
        nameWords.push(word);
      }
    }
    
    if (nameWords.length > 0) {
      data.name = nameWords.join(' ');
    }
    
    // Si no se detectó barrio pero hay palabras que podrían serlo
    if (!data.neighborhood && nameWords.length > 1) {
      // Asumir que la última palabra del nombre podría ser el barrio
      const possibleNeighborhood = nameWords[nameWords.length - 1];
      if (possibleNeighborhood.length > 3 && !possibleNeighborhood.toLowerCase().includes('garcía') && 
          !possibleNeighborhood.toLowerCase().includes('gonzález') && !possibleNeighborhood.toLowerCase().includes('hernández')) {
        data.neighborhood = possibleNeighborhood;
        data.name = nameWords.slice(0, -1).join(' ');
      }
    }
    
    return data;
  }

  // Validar campos de envío
  validateDeliveryFields(data) {
    const missingFields = [];
    
    if (!data.address || data.address.length < 5) {
      missingFields.push('dirección completa');
    }
    
    if (!data.neighborhood || data.neighborhood.length < 3) {
      missingFields.push('barrio/zona');
    }
    
    if (!data.phone || data.phone.length < 7) {
      missingFields.push('teléfono de contacto');
    }
    
    if (!data.name || data.name.length < 3) {
      missingFields.push('nombre de quien recibe');
    }
    
    return {
      isComplete: missingFields.length === 0,
      missingFields: missingFields,
      extractedData: data
    };
  }

  // Generar confirmación de datos de envío
  generateDeliveryConfirmation(data) {
    return `✅ **DATOS DE ENVÍO CONFIRMADOS**

📍 **Dirección:** ${data.address}
🏠 **Barrio/Zona:** ${data.neighborhood}
📞 **Teléfono:** ${data.phone}
👤 **Nombre:** ${data.name}

¿Confirmas estos datos? Escribe "confirmo" para proceder con tu pedido o "cambio" si necesitas modificar algo.`;
  }

  // Generar mensaje de campos faltantes
  generateMissingFieldsMessage(missingFields, extractedData) {
    let message = `⚠️ **FALTAN ALGUNOS DATOS**

He detectado estos datos de tu mensaje:`;
    
    if (extractedData.address) {
      message += `\n📍 Dirección: ${extractedData.address}`;
    }
    if (extractedData.neighborhood) {
      message += `\n🏠 Barrio: ${extractedData.neighborhood}`;
    }
    if (extractedData.phone) {
      message += `\n📞 Teléfono: ${extractedData.phone}`;
    }
    if (extractedData.name) {
      message += `\n👤 Nombre: ${extractedData.name}`;
    }
    
    message += `\n\n❌ **Faltan:** ${missingFields.join(', ')}`;
    
    message += `\n\nPor favor envía la información faltante. Puedes enviarla en cualquier orden, por ejemplo:
"${missingFields.includes('teléfono de contacto') ? '3001234567' : ''} ${missingFields.includes('dirección completa') ? 'Calle 123 #45-67' : ''} ${missingFields.includes('barrio/zona') ? 'Barrio Centro' : ''} ${missingFields.includes('nombre de quien recibe') ? 'María González' : ''}".trim()}`;
    
    return message;
  }

  // Detectar si hay un desajuste con el contexto de la conversación
  detectContextMismatch(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Si el bot acabó de mostrar el menú y el usuario responde algo que no es una opción válida
    if (context.lastBotMessage && context.lastBotMessage.includes('MENÚ')) {
      const validOptions = ['combo', 'familiar', 'pedir', 'menu', 'persona', 'personas'];
      const hasValidOption = validOptions.some(option => lowerMessage.includes(option));
      
      // Si no tiene ninguna opción válida pero parece querer pedir algo
      const wantsToOrder = ['quiero', 'dame', 'para', 'comprar', 'ordenar'].some(word => 
        lowerMessage.includes(word)
      );
      
      return wantsToOrder && !hasValidOption;
    }
    
    return false;
  }

  // Detectar si el usuario ya proporcionó información sobre el número de personas
  hasProvidedPersonCount(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar números de personas (incluyendo errores de escritura comunes)
    const personPatterns = [
      /(\d+)\s*personas?/,
      /somos\s*(\d+)/,
      /familia\s*de\s*(\d+)/,
      /para\s*(\d+)/,
      /somo\s*(\d+)/, // Error común: "somo" en lugar de "somos"
      /som\s*(\d+)/,  // Error común: "som" en lugar de "somos"
      /son\s*(\d+)/,  // Error común: "son" en lugar de "somos"
      /somoss?\s*(\d+)/ // Error común: "somos" con s extra
    ];
    
    for (const pattern of personPatterns) {
      const match = lowerMessage.match(pattern);
      if (match && match[1]) {
        const count = parseInt(match[1]);
        if (count >= 1 && count <= 100) { // Permitir hasta 100 personas
          return { hasCount: true, count: count, originalText: match[0] };
        }
      }
    }
    
    // También revisar el contexto para ver si ya se mencionó antes
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      for (const turn of context.conversationHistory) {
        const contextLower = turn.user.toLowerCase();
        for (const pattern of personPatterns) {
          const match = contextLower.match(pattern);
          if (match && match[1]) {
            const count = parseInt(match[1]);
            if (count >= 1 && count <= 100) { // Permitir hasta 100 personas
              return { hasCount: true, count: count, originalText: match[0], fromContext: true };
            }
          }
        }
      }
    }
    
    return { hasCount: false, count: 0 };
  }

  // Detectar si el usuario especificó un combo específico
  hasSpecifiedCombo(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    const comboPatterns = [
      /combo\s*1/,
      /combo\s*2/,
      /combo\s*3/,
      /familiar\s*2/,
      /familiar\s*3/,
      /familiar\s*4/,
      /emparejado/
    ];
    
    for (const pattern of comboPatterns) {
      if (pattern.test(lowerMessage)) {
        return { hasCombo: true, combo: lowerMessage.match(pattern)[0] };
      }
    }
    
    return { hasCombo: false, combo: null };
  }

  // Obtener historial de conversación
  async getConversationHistory(clientId, branchId) {
    try {
      if (!clientId || !branchId) return [];
      
      // Buscar en el historial de conversación
      const history = this.conversationHistory.get(`${clientId}_${branchId}`) || [];
      return history.slice(-5); // Últimos 5 mensajes
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return [];
    }
  }

  // Guardar turno de conversación
  async saveConversationTurn(clientId, branchId, userMessage, botResponse) {
    try {
      if (!clientId || !branchId) return;
      
      const key = `${clientId}_${branchId}`;
      let history = this.conversationHistory.get(key) || [];
      
      // Agregar el nuevo turno
      history.push({
        user: userMessage,
        bot: botResponse,
        timestamp: new Date()
      });
      
      // Mantener solo los últimos 10 turnos
      if (history.length > 10) {
        history = history.slice(-10);
      }
      
      this.conversationHistory.set(key, history);
      
      console.log(`💾 Turno guardado en historial: ${clientId}_${branchId}`);
    } catch (error) {
      console.error('❌ Error guardando turno:', error);
    }
  }

  // Generar respuesta guiada cuando el usuario necesita ayuda
  generateGuidedResponse(userMessage, context = {}) {
    const lowerMessage = userMessage.toLowerCase().trim();
    
    // Detectar si ya proporcionó número de personas (incluyendo contexto)
    const personInfo = this.hasProvidedPersonCount(userMessage, context);
    const comboInfo = this.hasSpecifiedCombo(userMessage);
    
    // Si ya tiene número de personas Y combo específico, procesar el pedido
    if (personInfo.hasCount && comboInfo.hasCombo) {
      return this.generateOrderConfirmation(personInfo.count, comboInfo.combo);
    }
    
    // Si ya tiene número de personas pero no combo específico
    if (personInfo.hasCount && !comboInfo.hasCombo) {
      return this.generateComboRecommendation(personInfo.count);
    }
    
    // Si tiene combo específico pero no número de personas
    if (!personInfo.hasCount && comboInfo.hasCombo) {
      return `😊 Perfecto, quieres el ${comboInfo.combo}. ¿Para cuántas personas es?`;
    }
    
    // Detectar errores de escritura específicos
    if (lowerMessage.includes('mpersona')) {
      return `😊 ¡Perfecto! Entiendo que quieres pedir para 1 persona. 

Te recomiendo el **Combo 1**: 5 alitas + acompañante + salsas - $21.900

¿Te gusta esta opción? Solo escribe "pedir combo 1" para ordenar.`;
    }
    
    // Respuestas vagas
    if (lowerMessage === 'si' || lowerMessage === 'sí' || lowerMessage === 'ok') {
      return `😊 ¡Genial! Para ayudarte mejor, necesito que me digas:

🔹 **Cuántas personas son** (ejemplo: "2 personas")
🔹 **Qué quieres pedir** (ejemplo: "Combo 1" o "Familiar 2")

O si prefieres, puedes escribir "menú" para ver todas las opciones disponibles.

¿Qué te parece más fácil?`;
    }
    
    // Respuesta genérica para casos no específicos
    return `😊 Entiendo que quieres hacer un pedido. Para ayudarte mejor, por favor dime:

🔹 **Cuántas personas son**
🔹 **Qué tipo de combo prefieres**

Por ejemplo:
- "2 personas, combo emparejado"
- "1 persona, combo 1"
- "familia de 4, combo familiar"

O escribe "menú" para ver todas las opciones. ¿Qué prefieres?`;
  }

  // Generar recomendación de combo basada en número de personas
  generateComboRecommendation(personCount) {
    let recommendation = '';
    
    if (personCount === 1) {
      recommendation = `😊 ¡Perfecto! Para 1 persona te recomiendo:

**Combo 1**: 5 alitas + acompañante + salsas - $21.900

¿Te gusta esta opción? Solo escribe "pedir combo 1" para ordenar.`;
    } else if (personCount === 2) {
      recommendation = `😊 ¡Perfecto! Para 2 personas te recomiendo:

**Combo Emparejado**: 16 alitas + 2 acompañantes - $45.900

¿Te gusta esta opción? Solo escribe "pedir emparejado" para ordenar.`;
    } else if (personCount >= 3 && personCount <= 4) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**Combo ${personCount === 3 ? '2' : '3'}**: ${personCount === 3 ? '7' : '9'} alitas + acompañante + salsas - $${personCount === 3 ? '26.900' : '31.900'}

¿Te gusta esta opción? Solo escribe "pedir combo ${personCount === 3 ? '2' : '3'}" para ordenar.`;
    } else if (personCount >= 5 && personCount <= 6) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**Familiar 2**: 30 alitas + acompañante + gaseosa 1.5L - $89.900

¿Te gusta esta opción? Solo escribe "pedir familiar 2" para ordenar.`;
    } else if (personCount >= 7 && personCount <= 8) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**Familiar 3**: 40 alitas + acompañante + gaseosa 1.5L - $119.900

¿Te gusta esta opción? Solo escribe "pedir familiar 3" para ordenar.`;
    } else if (personCount >= 9 && personCount <= 10) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**Familiar 4**: 50 alitas + 2 acompañantes + gaseosa 1.5L - $149.900

¿Te gusta esta opción? Solo escribe "pedir familiar 4" para ordenar.`;
    } else if (personCount >= 11 && personCount <= 20) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**2x Familiar 4**: 100 alitas + 4 acompañantes + 2 gaseosas 1.5L - $299.800

¿Te gusta esta opción? Solo escribe "pedir 2 familiar 4" para ordenar.`;
    } else if (personCount >= 21 && personCount <= 30) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**3x Familiar 4**: 150 alitas + 6 acompañantes + 3 gaseosas 1.5L - $449.700

¿Te gusta esta opción? Solo escribe "pedir 3 familiar 4" para ordenar.`;
    } else if (personCount >= 31 && personCount <= 40) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**4x Familiar 4**: 200 alitas + 8 acompañantes + 4 gaseosas 1.5L - $599.600

¿Te gusta esta opción? Solo escribe "pedir 4 familiar 4" para ordenar.`;
    } else if (personCount >= 41 && personCount <= 50) {
      recommendation = `😊 ¡Perfecto! Para ${personCount} personas te recomiendo:

**5x Familiar 4**: 250 alitas + 10 acompañantes + 5 gaseosas 1.5L - $749.500

¿Te gusta esta opción? Solo escribe "pedir 5 familiar 4" para ordenar.`;
    } else {
      recommendation = `😊 Para ${personCount} personas, necesitarías varios combos familiares.

**Opción recomendada**: ${Math.ceil(personCount / 10)}x Familiar 4 (${Math.ceil(personCount / 10) * 50} alitas total)

¿Te parece bien esta opción? Solo escribe "pedir ${Math.ceil(personCount / 10)} familiar 4" para ordenar.`;
    }
    
    return recommendation;
  }

  // Generar confirmación de pedido
  generateOrderConfirmation(personCount, comboName) {
    return `😊 ¡Excelente elección! 

**Tu pedido:**
- ${comboName} para ${personCount} personas
- Total: $${this.getComboPrice(comboName)}

¿Confirmas este pedido? Escribe "confirmo" para proceder.`;
  }

  // Obtener precio del combo
  getComboPrice(comboName) {
    const prices = {
      'combo 1': '21.900',
      'combo 2': '26.900',
      'combo 3': '31.900',
      'emparejado': '45.900',
      'familiar 2': '89.900',
      'familiar 3': '119.900',
      'familiar 4': '149.900'
    };
    
    const normalizedCombo = comboName.toLowerCase();
    return prices[normalizedCombo] || 'consultar precio';
  }

  // Formatear respuesta de pedido
  formatOrderResponse(response, userMessage, branchId) {
    // Si ya está bien formateada, devolverla tal como está
    if (response.includes('🍗') && response.includes('TOTAL')) {
      return response;
    }
    
    // Si no, intentar extraer información del pedido y formatearla
    const customPrompt = this.aiPrompts.get(branchId) || null;
    const orderAnalysis = this.processOrder(userMessage, branchId, customPrompt);
    
    if (orderAnalysis.hasProducts) {
      return this.generateOrderResponse(orderAnalysis);
    }
    
    return response;
  }

  // Generar respuesta usando IA con configuración específica de sucursal
  async generateResponse(branchId, userMessage, clientId = null, businessType = 'restaurant', branchConfig = null) {
    try {
      // Cargar configuración específica de la sucursal automáticamente
      if (branchId && !this.menuContent.has(branchId)) {
        console.log('🔄 Cargando configuración automáticamente para sucursal:', branchId);
        await this.loadBranchConfig(branchId);
      }

      // Generando respuesta IA contextualizada

      // Analizar intención del usuario usando IA contextual
      let intent;
      try {
        // Intentar usar análisis de IA contextual primero
        const context = {
          lastMessages: await this.getRecentMessages(clientId, branchId),
          currentState: 'conversation_active'
        };
        intent = await this.analyzeUserIntentWithAI(userMessage, branchId, clientId, context);
        console.log('🎯 Intención detectada con IA contextual:', intent);
      } catch (error) {
        console.log('⚠️ Fallback a análisis de patrones:', error.message);
        // Fallback al sistema de patrones
        intent = this.analyzeUserIntent(userMessage);
        console.log('🎯 Intención detectada con patrones:', intent);
      }

      // Guardar mensaje en historial de conversación
      if (clientId) {
        await this.saveConversationMessage(clientId, branchId, userMessage, intent);
      }

      // Si es saludo, responder incluyendo el nombre de la sucursal
      if (intent === 'saludo' || intent === 'greeting') {
        try {
          const Branch = require('../models/Branch');
          let branchName = 'nuestra sucursal';
          try {
            // Try both ObjectId and string searches
            let branchDoc = await Branch.findById(branchId);
            if (!branchDoc) {
              branchDoc = await Branch.findOne({ branchId: String(branchId) });
            }
            if (!branchDoc) {
              branchDoc = await Branch.findOne({ branchId: branchId });
            }
            if (branchDoc && branchDoc.name) branchName = branchDoc.name;
          } catch (error) {
            console.log('⚠️ Error buscando nombre de sucursal:', error.message);
          }
          return `¡Hola! 😊 Somos ${branchName}. ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
        } catch (_) {
          return `¡Hola! 😊 ¿Cómo andas? ¿En qué te puedo ayudar?

Si deseas, puedo enviarte el menú para que lo revises. Solo dime "menú" o "envíame el menú".`;
        }
      }

      // PRIORIDAD MÁXIMA: Si es una cancelación, procesar automáticamente ANTES que cualquier otra lógica
      if (intent === 'cancelar_pedido') {
        console.log('🚫 ===== CANCELACIÓN DETECTADA =====');
        console.log(`📞 Cliente: ${clientId}`);
        console.log(`💬 Mensaje: ${userMessage}`);
        console.log('=====================================');
        
        if (clientId) {
          const cancellationResult = await this.handleOrderCancellation(clientId, branchId, userMessage);
          return cancellationResult;
        }
        
        return "Entiendo que quieres cancelar. Si tienes algún pedido pendiente, lo cancelaré inmediatamente.\n\n😔 Es un infortunio no poder continuar contigo en esta ocasión.\n\n💙 Pero no te preocupes, estaremos aquí listos para atenderte próximamente cuando lo desees.\n\n¡Gracias por contactarnos y esperamos verte pronto! 😊";
      }

      // Si estamos esperando que el cliente elija domicilio o recoger
      if (clientId && this._awaitingDeliveryChoice && this._awaitingDeliveryChoice.has(`${clientId}::${branchId}`)) {
        const pendingOrder = await this.getLastPendingOrder(clientId, branchId);
        if (pendingOrder) {
          const choiceHandled = await this.handleDeliveryChoice(clientId, branchId, userMessage, pendingOrder);
          if (choiceHandled) {
            return choiceHandled;
          }
        }
      }

      // Si estamos esperando datos de envío para un pedido de domicilio y el usuario envía datos, procesarlos
      if (clientId) {
        const pendingOrder = await this.getLastPendingOrder(clientId, branchId);
        if (pendingOrder && pendingOrder.delivery && pendingOrder.delivery.type === 'delivery' && !pendingOrder.delivery.address) {
          const handled = await this.tryHandleDeliveryData(clientId, branchId, userMessage, pendingOrder);
          if (handled) return handled;
        }
      }

      // Si hay un pedido pendiente que necesita clarificación, procesar la respuesta
      if (clientId) {
        const pendingOrder = await this.getLastPendingOrder(clientId, branchId);
        if (pendingOrder && pendingOrder.needsClarification) {
          const clarificationHandled = await this.handleClarificationResponse(clientId, branchId, userMessage, pendingOrder);
          if (clarificationHandled) {
            return clarificationHandled;
          }
        }
      }

      // Si es un pedido, procesar automáticamente
      if (intent === 'hacer_pedido') {
        // Si hay una recomendación activa y el usuario dice "pedir", procesar la recomendación
        if (clientId && userMessage.toLowerCase().includes('pedir')) {
          const profile = this.getRecommendationProfile(clientId, branchId);
          if (profile.questionsAnswered === 5) {
            console.log('🤖 Procesando pedido desde recomendación');
            return await this.processRecommendationOrder(clientId, branchId, profile);
          }
        }
        
        // Obtener el customPrompt de la configuración cargada
        const customPrompt = this.aiPrompts.get(branchId) || null;
        
        // Usar mensaje corregido si está disponible
        const correctionResult = this.detectAndCorrectOrderPattern(userMessage);
        const messageToProcess = correctionResult.corrected ? correctionResult.correctedMessage : userMessage;
        
        console.log('🔧 Procesando pedido con mensaje:', messageToProcess);
        if (correctionResult.corrected) {
          console.log('✅ Corrección aplicada:', userMessage, '→', messageToProcess);
        }
        
        const orderAnalysis = this.processOrder(messageToProcess, branchId, customPrompt);
        if (orderAnalysis.hasProducts) {
          console.log('🛒 Procesando pedido automáticamente');
          
          // Agregar nota de corrección si se aplicó
          let orderResponse = this.generateOrderResponse(orderAnalysis);
          if (correctionResult.corrected) {
            orderResponse = `🔧 *Entendí tu pedido:* "${correctionResult.correctedMessage}"\n\n` + orderResponse;
          }
          
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
        // Completar timers de sesión al confirmar (persistente)
        try {
          const SessionTimerService = require('./SessionTimerService');
          const Branch = require('../models/Branch');
          const svc = new SessionTimerService();
          // branchId aquí llega como id de sucursal
          await svc.complete({ phoneNumber: clientId, branchId });
        } catch (_) {}
        return await this.handleOrderConfirmation(clientId, branchId, userMessage);
      }

      // Si el usuario menciona que quiere dar datos de envío y hay pedido pendiente de domicilio,
      // re-envía el formato de solicitud de datos de entrega para guiarlo correctamente
      if (clientId && this.isDeliveryDataRequest && this.isDeliveryDataRequest(userMessage)) {
        const pendingOrder = await this.getLastPendingOrder(clientId, branchId);
        if (pendingOrder && pendingOrder.delivery && pendingOrder.delivery.type === 'delivery') {
          console.log('📦 Usuario menciona datos de envío; enviando formato');
          return await this.requestDeliveryData(clientId, branchId, pendingOrder);
        }
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

      console.log('🔍 ===== CONFIGURACIÓN DE IA CARGADA =====');
      console.log('🏪 Branch ID:', branchId);
      console.log('📋 Menu Content:', menuContent ? 'Disponible' : 'No disponible');
      console.log('🤖 Custom Prompt:', customPrompt ? 'Disponible' : 'No disponible');
      console.log('📏 Menu Length:', menuContent ? menuContent.length : 0, 'caracteres');
      console.log('==========================================');

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
    return await this.buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context, branchId, clientId);
  }

  // Función para corregir errores de escritura específicos del menú
  correctMenuErrors(text) {
    const corrections = {
      // Errores comunes de dislexia y escritura - FAMILIAR
      'fanili': 'familiar',
      'faniliar': 'familiar',
      'famili': 'familiar',
      'familia': 'familiar',
      'familiar': 'familiar',
      'fam': 'familiar',
      'familar': 'familiar',
      'familliar': 'familiar',
      'fammiliar': 'familiar',
      'fammilliar': 'familiar',
      'familiiar': 'familiar',
      
      // Errores comunes de dislexia y escritura - COMBO
      'combo': 'combo',
      'combos': 'combo',
      'comboo': 'combo',
      'comboos': 'combo',
      'combooo': 'combo',
      'comboss': 'combo',
      'combooss': 'combo',
      'combooos': 'combo',
      'cambo': 'combo',
      'camboo': 'combo',
      'cambos': 'combo',
      'camboss': 'combo',
      
      // Errores comunes de dislexia y escritura - EMPAREJADO
      'emparejado': 'emparejado',
      'emparejados': 'emparejado',
      'emparejao': 'emparejado',
      'emparejaos': 'emparejado',
      'emparejadoo': 'emparejado',
      'emparejadoos': 'emparejado',
      'emparejadooo': 'emparejado',
      'emparejadoss': 'emparejado',
      'emparejadooss': 'emparejado',
      'emparejadooos': 'emparejado',
      'emparajado': 'emparejado',
      'emparajados': 'emparejado',
      'emparajao': 'emparejado',
      'emparajaos': 'emparejado',
      
      // Números escritos (dislexia numérica)
      'uno': '1',
      'dos': '2',
      'tres': '3',
      'cuatro': '4',
      'cinco': '5',
      'seis': '6',
      'siete': '7',
      'ocho': '8',
      'nueve': '9',
      'diez': '10',
      
      // Errores de escritura comunes - ALITAS
      'alitas': 'alitas',
      'alita': 'alitas',
      'alitass': 'alitas',
      'alitasss': 'alitas',
      'alitassss': 'alitas',
      'alitas': 'alitas',
      'alitass': 'alitas',
      'alittas': 'alitas',
      'alittass': 'alitas',
      
      // Acompañantes
      'papas': 'papas',
      'papa': 'papas',
      'papass': 'papas',
      'papasss': 'papas',
      'papassss': 'papas',
      'papass': 'papas',
      'papas': 'papas',
      
      'cascos': 'cascos',
      'casco': 'cascos',
      'cascoss': 'cascos',
      'cascoss': 'cascos',
      'cascoss': 'cascos',
      
      'yucas': 'yucas',
      'yuca': 'yucas',
      'yucass': 'yucas',
      'yucass': 'yucas',
      'yucass': 'yucas',
      
      'arepitas': 'arepitas',
      'arepita': 'arepitas',
      'arepitass': 'arepitas',
      'arepitass': 'arepitas',
      'arepitass': 'arepitas',
      
      // Bebidas
      'gaseosa': 'gaseosa',
      'gaseosas': 'gaseosa',
      'gaseoza': 'gaseosa',
      'gaseozaa': 'gaseosa',
      'gaseozass': 'gaseosa',
      'gaseozass': 'gaseosa',
      
      'limonada': 'limonada',
      'limonadas': 'limonada',
      'limonadaa': 'limonada',
      'limonadaaa': 'limonada',
      'limonadass': 'limonada',
      'limonadass': 'limonada',
      
      // Errores comunes de dislexia general
      'quiero': 'quiero',
      'quieroo': 'quiero',
      'quieros': 'quiero',
      'quieroos': 'quiero',
      
      'pedir': 'pedir',
      'pedirr': 'pedir',
      'pedirs': 'pedir',
      'pedirrs': 'pedir',
      
      'deseo': 'deseo',
      'deseoo': 'deseo',
      'deseos': 'deseo',
      'deseoos': 'deseo',
      
      'gustaria': 'gustaría',
      'gustaría': 'gustaría',
      'gustariaa': 'gustaría',
      'gustaríaa': 'gustaría',
      'gustariass': 'gustaría',
      'gustaríass': 'gustaría'
    };
    
    let correctedText = text.toLowerCase();
    
    // Aplicar correcciones
    Object.keys(corrections).forEach(error => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi');
      correctedText = correctedText.replace(regex, corrections[error]);
    });
    
    return correctedText;
  }

  // Función para detectar y corregir patrones de pedido con errores
  detectAndCorrectOrderPattern(message) {
    const correctedMessage = this.correctMenuErrors(message);
    
    // Patrones de pedido con tolerancia a errores
    const orderPatterns = [
      // Combo + número
      /(combo|famili?ar|fam)\s*(\d+)/i,
      // Emparejado (sin número, es único)
      /(emparejad[oa]s?|emparajad[oa]s?)/i,
      // Solo número (si el contexto sugiere combo)
      /^\s*(\d+)\s*$/,
      // Producto + número
      /(alitas?|papas?|cascos?|yucas?|arepitas?)\s*(\d+)/i
    ];
    
    for (const pattern of orderPatterns) {
      const match = correctedMessage.match(pattern);
      if (match) {
        console.log('🔧 Corrección aplicada:', message, '→', correctedMessage);
        return {
          corrected: true,
          originalMessage: message,
          correctedMessage: correctedMessage,
          pattern: pattern.source,
          match: match
        };
      }
    }
    
    return {
      corrected: false,
      originalMessage: message,
      correctedMessage: correctedMessage
    };
  }

  // Análisis de IA contextual para entender la intención real del usuario
  async analyzeUserIntentWithAI(message, branchId = null, clientId = null, context = {}) {
    try {
      // Obtener el prompt del negocio
      const customPrompt = this.aiPrompts.get(branchId) || null;
      
      // Construir prompt contextual
      let contextualPrompt = `
Eres un asistente virtual especializado en atención al cliente para restaurantes de comida rápida.

CONTEXTO DEL NEGOCIO:
${customPrompt || 'Restaurante de comida rápida'}

CONTEXTO DE LA CONVERSACIÓN:
- Cliente: ${clientId || 'Usuario'}
- Sucursal: ${branchId || 'No especificada'}
- Historial reciente: ${context.lastMessages ? context.lastMessages.slice(-3).join(' | ') : 'Nueva conversación'}

MENSAJE DEL CLIENTE: "${message}"

ANALIZA LA INTENCIÓN DEL CLIENTE y responde ÚNICAMENTE con una de estas opciones:

INTENCIONES VÁLIDAS:
- hacer_pedido: Quiere ordenar comida/bebida
- consulta_menu: Pide ver el menú
- cancelar_pedido: Quiere cancelar su pedido
- saludo: Saluda o inicia conversación
- agradecimiento: Agradece algo
- consulta_horario: Pregunta horarios
- consulta_ubicacion: Pregunta ubicación/dirección
- recomendacion: Pide recomendaciones
- no_entendido: Expresa confusión o queja
- consulta_general: Otras consultas

IMPORTANTE:
- Si menciona productos del menú (combo, familiar, emparejado, alitas, etc.) = hacer_pedido
- Si dice "cancelar", "no quiero", "ya no" = cancelar_pedido
- Si dice "menú", "qué tienen", "bebidas" = consulta_menu
- Si expresa confusión o queja = no_entendido
- Sé tolerante con errores de escritura y dislexia

RESPUESTA (solo la intención):`;

      console.log('🤖 Analizando intención con IA contextual...');
      
      // Usar IA para análisis contextual
      const aiResponse = await this.generateAIResponse(contextualPrompt, message);
      
      // Extraer la intención de la respuesta de la IA
      const detectedIntent = this.extractIntentFromAIResponse(aiResponse);
      
      console.log(`🎯 IA detectó intención: ${detectedIntent} para mensaje: "${message}"`);
      
      return detectedIntent;
      
    } catch (error) {
      console.error('❌ Error en análisis de IA contextual:', error);
      // Fallback al sistema de patrones
      return this.analyzeUserIntent(message);
    }
  }

  // Extraer intención de la respuesta de la IA
  extractIntentFromAIResponse(aiResponse) {
    const validIntents = [
      'hacer_pedido', 'consulta_menu', 'cancelar_pedido', 'saludo',
      'agradecimiento', 'consulta_horario', 'consulta_ubicacion',
      'recomendacion', 'no_entendido', 'consulta_general'
    ];
    
    const response = aiResponse.toLowerCase().trim();
    
    // Buscar la intención en la respuesta
    for (const intent of validIntents) {
      if (response.includes(intent)) {
        return intent;
      }
    }
    
    // Si no encuentra una intención válida, usar fallback
    console.log('⚠️ IA no detectó intención válida, usando fallback');
    return 'consulta_general';
  }

  // Obtener mensajes recientes para contexto
  async getRecentMessages(clientId, branchId, limit = 5) {
    try {
      if (!clientId) return [];
      
      // Aquí podrías implementar la lógica para obtener mensajes recientes de la base de datos
      // Por ahora, retornamos un array vacío como placeholder
      return [];
      
    } catch (error) {
      console.error('❌ Error obteniendo mensajes recientes:', error);
      return [];
    }
  }

  // Analizar intención del usuario con tolerancia a errores de escritura (MÉTODO ORIGINAL)
  analyzeUserIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Primero intentar detectar y corregir patrones de pedido
    const correctionResult = this.detectAndCorrectOrderPattern(message);
    
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
    
    // Usar el mensaje corregido si se encontró un patrón
    const messageToAnalyze = correctionResult.corrected ? correctionResult.correctedMessage : lowerMessage;
    const normalizedMessage = normalizeText(messageToAnalyze);
    
    // PRIORIDAD 0: Cancelaciones (máxima prioridad)
    const cancellationKeywords = [
      // Palabras directas de cancelación
      'cancelar', 'cancelar pedido', 'cancelar orden', 'cancelar mi pedido',
      'cancelar el pedido', 'cancelar la orden', 'cancelar mi orden',
      'cancelado', 'cancelo', 'cancela', 'cancelar todo',
      
      // Expresiones de desistimiento (más específicas)
      'ya no quiero pedir', 'ya no quiero ordenar', 'ya no quiero el pedido',
      'no quiero pedir', 'no quiero ordenar', 'no quiero el pedido',
      'ya no deseo pedir', 'ya no deseo ordenar', 'ya no deseo el pedido',
      'no deseo pedir', 'no deseo ordenar', 'no deseo el pedido',
      'mejor no pedir', 'mejor no ordenar', 'mejor no hacer pedido',
      'olvídalo', 'olvidalo', 'olvídame', 'olvidame',
      'déjalo', 'dejalo', 'déjame', 'dejame',
      'no gracias', 'no, gracias',
      
      // Expresiones de cambio de opinión
      'cambié de opinión', 'cambie de opinion', 'cambié de parecer',
      'cambie de parecer', 'ya no más', 'ya no mas',
      'mejor después', 'mejor despues', 'después', 'despues',
      'más tarde', 'mas tarde', 'más adelante', 'mas adelante',
      
      // Expresiones de desistimiento formal
      'desisto', 'desistir', 'desistir del pedido', 'desistir de la orden',
      'renunciar', 'renunciar al pedido', 'renunciar a la orden',
      'retirar', 'retirar pedido', 'retirar orden', 'retirar mi pedido',
      
      // Expresiones informales (más específicas)
      'nada más', 'nada mas', 'nada de nada',
      'no es nada', 'no es na', 'no es na mas',
      'no pasa nada', 'no pasa na', 'tranquilo',
      'está bien así', 'esta bien asi',
      
      // Expresiones de urgencia cancelada (más específicas)
      'ya no es urgente', 'ya no es urgencia', 'no es urgente',
      'ya no necesito el pedido', 'no necesito el pedido', 'no lo necesito',
      'ya no me sirve', 'no me sirve', 'no me sirve ya',
      
      // Expresiones de tiempo (más específicas)
      'ya no tengo tiempo', 'no tengo tiempo para pedir', 'se me pasó el tiempo',
      'se me paso el tiempo', 'ya es tarde para pedir', 'ya es muy tarde'
    ];
    
    const hasCancellationKeyword = cancellationKeywords.some(keyword => 
      normalizedMessage.includes(normalizeText(keyword))
    );
    
    if (hasCancellationKeyword) {
      return 'cancelar_pedido';
    }

    // PRIORIDAD 1.5: Preguntas sobre porciones (antes de pedidos para evitar conflictos)
    if (lowerMessage.includes('cuantas alitas') || lowerMessage.includes('cuántas alitas') ||
        lowerMessage.includes('cuanta porcion') || lowerMessage.includes('cuánta porción') ||
        lowerMessage.includes('tamaño porcion') || lowerMessage.includes('tamaño porción') ||
        lowerMessage.includes('porcion') || lowerMessage.includes('porción')) {
      return 'consulta_porciones';
    }

    // PRIORIDAD 2: Pedidos (más tolerante y con sinónimos comunes)
    const orderKeywords = [
      // verbos y expresiones generales
      'pedido', 'pedir', 'pido', 'orden', 'ordenar',
      'quiero', 'quisiera', 'quiciera', 'kiciera', 'quisera',
      'deseo', 'desearia', 'desearía', 'me gustaria', 'me gustaría',
      'me das', 'me da', 'dame', 'ponme', 'ponga', 'tráeme', 'traeme',
      'llevar', 'para llevar', 'para domicilio', 'a domicilio',

      // triggers de menú que suelen implicar intención de pedir
      'desayuno', 'almuerzo', 'cena',

      // productos típicos que implican pedido directo
      'cappuccino', 'capuchino', 'capuccino',
      'croissant', 'croasan', 'yogurt', 'yogur', 'sandwich', 'sándwich', 'cafe', 'café',

      // patrones de alitas
      'combo', 'familiar', 'emparejado', 'alitas'
    ];
    
    const hasOrderKeyword = orderKeywords.some(keyword => 
      normalizedMessage.includes(normalizeText(keyword))
    );
    
    if (hasOrderKeyword) {
      return 'hacer_pedido';
    }

    // Detección extra: mensajes cortos tipo "combo 2", "familiar 3", "emparejado"
    const comboLike = /(combo\s*\d+|familiar\s*\d+|emparejad[oa]s?|emparajad[oa]s?|combo\d+|fam\s*\d+)/i;
    if (comboLike.test(messageToAnalyze)) {
      console.log('🎯 Patrón de combo detectado:', messageToAnalyze);
      return 'hacer_pedido';
    }
    
    // Detección mejorada: si se corrigió un patrón de pedido, es un pedido
    if (correctionResult.corrected && correctionResult.match) {
      console.log('🎯 Patrón corregido detectado como pedido:', correctionResult.correctedMessage);
      return 'hacer_pedido';
    }
    
    // PRIORIDAD 2: No entendido / Quejas (antes de saludos)
    const noEntendidoKeywords = [
      'no entiendo', 'no comprendo', 'no entiendo nada', 'no comprendo nada',
      'no me estas dando', 'no me estás dando', 'no me das', 'no me da',
      'no funciona', 'no está funcionando', 'no esta funcionando',
      'no es lo que quiero', 'no es lo que busco', 'no es lo que necesito',
      'no me gusta', 'no me sirve', 'no es correcto',
      'estás mal', 'estas mal', 'está mal', 'esta mal',
      'te equivocaste', 'te equivocas', 'te estás equivocando', 'te estas equivocando'
    ];
    
    const hasNoEntendidoKeyword = noEntendidoKeywords.some(keyword => 
      normalizedMessage.includes(normalizeText(keyword))
    );
    
    if (hasNoEntendidoKeyword) {
      return 'no_entendido';
    }

    // PRIORIDAD 3: Saludos (variantes comunes: hola/ola/holi/oli/hi/hello/hey)
    const isGreetingMsg = (
      lowerMessage.includes('hola') ||
      lowerMessage === 'ola' || lowerMessage.startsWith('ola ') || lowerMessage.endsWith(' ola') || lowerMessage.includes(' ola ')
      || lowerMessage.includes('holi') || lowerMessage.includes('oli')
      || lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')
      || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')
      || lowerMessage.includes('buen dia') || lowerMessage.includes('buenas tardes') || lowerMessage.includes('buenas noches')
    );
    if (isGreetingMsg) {
      return 'saludo';
    }
    
    // Agradecimientos (tolerante a errores: gracia, grasias, grx, thanx, thanks, ty)
    const gratitudePatterns = [
      'gracias', 'gracia', 'grasias', 'grcs', 'grx', 'mil gracias', 'muchas gracias', 'se agradece',
      'thanks', 'thank you', 'thanx', 'thx', 'ty', 'muchas gracia', 'muchas grasias',
      'te agradezco', 'le agradezco', 'agradecido', 'agradecida', 'agradecimiento',
      'muy amable', 'muy gentil', 'muy buena', 'excelente servicio', 'perfecto servicio',
      'ok gracias', 'ok gracia', 'vale gracias', 'vale gracia', 'bueno gracias', 'bueno gracia'
    ];
    const isGratitude = gratitudePatterns.some(k => lowerMessage.includes(k));
    if (isGratitude) {
      return 'agradecimiento';
    }
    
    // PRIORIDAD 3: Consultas de menú
    if (lowerMessage.includes('menú pdf') || lowerMessage.includes('menu pdf') || lowerMessage.includes('pdf')) {
      return 'consulta_menu_pdf';
    }
    if (
        lowerMessage.includes('menú') ||
        lowerMessage.includes('menu') ||
        normalizedMessage.startsWith('men') || // tolerar recortes: "men"
        lowerMessage.includes('qué tienen') ||
        lowerMessage.includes('bebidas') || lowerMessage.includes('café') || lowerMessage.includes('cafe') ||
        lowerMessage.includes('tienes') || lowerMessage.includes('tienen')
    ) {
      return 'consulta_menu';
    }
    
    // PRIORIDAD 4: Recomendaciones
    if (lowerMessage.includes('recomendación') || lowerMessage.includes('recomendacion') || 
        lowerMessage.includes('recomienda') || lowerMessage.includes('recomienda') ||
        lowerMessage.includes('sugerencia') || lowerMessage.includes('sugerencia') ||
        lowerMessage.includes('qué me recomiendas') || lowerMessage.includes('que me recomiendas') ||
        lowerMessage.includes('qué me sugieres') || lowerMessage.includes('que me sugieres') ||
        lowerMessage.includes('no sé qué pedir') || lowerMessage.includes('no se que pedir') ||
        lowerMessage.includes('ayúdame a elegir') || lowerMessage.includes('ayudame a elegir') ||
        lowerMessage.includes('me puedes ayudar') || lowerMessage.includes('me puedes ayudar') ||
        lowerMessage.includes('cual combo me puede funcionar') || lowerMessage.includes('cual combo me puede funcionar') ||
        lowerMessage.includes('que combo me recomiendas') || lowerMessage.includes('qué combo me recomiendas') ||
        lowerMessage.includes('que me sugieres para') || lowerMessage.includes('qué me sugieres para') ||
        lowerMessage.includes('no se cual elegir') || lowerMessage.includes('no sé cual elegir') ||
        lowerMessage.includes('ayudame a decidir') || lowerMessage.includes('ayúdame a decidir')) {
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
  async buildIntelligentResponse(intent, sentiment, urgency, businessType, userMessage, context, branchId = null, clientId = null) {
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
      agradecimiento: {
        positivo: [
          "¡De nada! 😊",
          "¡Con mucho gusto! 😊",
          "¡Para eso estamos! 😊",
          "¡Fue un placer ayudarte! 😊",
          "¡De nada, que tengas un excelente día! 😊"
        ],
        neutral: [
          "Con gusto 😊",
          "De nada 😊",
          "Para eso estamos 😊",
          "Fue un placer 😊",
          "Con gusto, que tengas buen día 😊"
        ],
        negativo: [
          "Con gusto 😊",
          "De nada 😊",
          "Para eso estamos 😊",
          "Fue un placer 😊",
          "Con gusto, que tengas buen día 😊"
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
      // Resumen del menú siempre (resumido)
      specificContent = this.getMenuSummary(businessType, branchId);
    } else if (intent === 'consulta_menu_pdf') {
      // Enviar indicaciones de PDF si existe, si no, enviar el resumen como fallback
      specificContent = await this.getMenuPDFOrSummary(branchId, businessType);
    } else if (intent === 'consulta_precio') {
      specificContent = this.getPriceInfo(businessType);
    } else if (intent === 'hacer_pedido') {
      // Procesar pedido automáticamente si detecta productos específicos
      const customPrompt = this.aiPrompts.get(branchId) || null;
      const orderAnalysis = this.processOrder(userMessage, branchId, customPrompt);
      if (orderAnalysis.products.length > 0) {
        specificContent = this.generateOrderResponse(orderAnalysis);
      } else {
        // Clarificación amigable cuando hay intención de pedir pero sin productos claros
        specificContent = (
          `No estoy seguro de qué quieres pedir exactamente. ¿Puedes ser más específico?\n\n` +
          `Por ejemplo, puedes decir: "quiero combo 2", "deseo un latte", "me gustaría familiar 3" ` +
          `o el nombre del producto con cantidad.`
        );
      }
    } else if (intent === 'consulta_horario') {
      specificContent = this.getScheduleInfo(businessType);
    } else if (intent === 'consulta_ubicacion') {
      specificContent = this.getLocationInfo(businessType);
    } else if (intent === 'recomendacion') {
      specificContent = this.getRecommendationQuestion(clientId, branchId, userMessage);
    } else if (intent === 'agradecimiento') {
      // Para agradecimientos, solo usar la respuesta base sin contenido adicional
      specificContent = null;
    } else if (intent === 'no_entendido') {
      specificContent = (
        `Entiendo tu preocupación. Permíteme ayudarte mejor. 😊\n\n` +
        `¿Podrías decirme específicamente qué necesitas? Por ejemplo:\n\n` +
        `• "quiero ver el menú"\n` +
        `• "quiero hacer un pedido"\n` +
        `• "combo emparejado"\n` +
        `• "familiar 3"\n\n` +
        `Estoy aquí para ayudarte de la mejor manera posible. 💙`
      );
    } else if (intent === 'consulta_porciones') {
      specificContent = this.getPortionInformation(userMessage);
    }

    // Construir respuesta final
    let finalResponse = selectedResponse;
    if (specificContent) {
      // Para menús de alitas mix, mostrar solo el contenido formateado
      if (intent === 'consulta_menu' && specificContent.includes('MENÚ ALITAS MIX')) {
        finalResponse = specificContent;
      } else {
        finalResponse += '\n\n' + specificContent;
      }
    }

    // Conversación más natural sin frases repetitivas

    // Guardar respuesta del asistente en el historial
    if (clientId) {
      await this.saveAssistantResponse(clientId, branchId, finalResponse);
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

  // Formatear menú específico para alitas mix
  formatAlitasMenu(menuContent) {
    return `🍗 *MENÚ ALITAS MIX*

🍽️ *COMBOS PERSONALES*
• Combo 1: 5 alitas + acompañante + salsas - $21.900
• Combo 2: 7 alitas + acompañante + salsas - $26.900
• Combo 3: 9 alitas + acompañante + salsas - $30.900
• Combo 4: 14 alitas + acompañante + salsas - $42.900

👨‍👩‍👧‍👦 *COMBOS FAMILIARES*
• Familiar 1: 20 alitas + acompañante + salsas + gaseosa 1.5L - $65.900
• Familiar 2: 30 alitas + acompañante + salsas + gaseosa 1.5L - $62.900
• Familiar 3: 40 alitas + acompañante + salsas + gaseosa 1.5L - $87.900
• Familiar 4: 50 alitas + 2 acompañantes + salsas + gaseosa 1.5L - $107.900

💑 *COMBO EMPAREJADO*
• Emparejado: 16 alitas + 2 acompañantes + salsas + 2 limonadas - $123.900

🍟 *ACOMPAÑANTES*
• Papas criollas - $9.000
• Cascos - $9.000
• Yucas - $9.000
• Arepitas - $9.000
• Papas francesa - $9.000

🌶️ *SALSAS TRADICIONALES*
BBQ, Miel mostaza, Picante suave/full, Envinada, Frutos rojos, Parmesano, Maracuyá, Limón pimienta

⭐ *SALSAS PREMIUM* (gratis una)
Dulce maíz, La original, Cheddar, Sour cream, Pepinillo

💰 *PRECIOS ADICIONALES*
• Alita individual: $3.000
• Salsa premium adicional: $3.000

Si quieres el PDF completo, dime: "menú pdf".`;
  }

  // Obtener resumen breve del menú (resumido) usando menú cargado si existe
  getMenuSummary(businessType, branchId) {
    const loaded = branchId && this.menuContent.has(branchId) ? this.menuContent.get(branchId) : null;
    if (loaded) {
      // Formatear menú específicamente para alitas mix
      if ((loaded.includes('ALITAS') || loaded.includes('A LITAS')) && (loaded.includes('COMBO') || loaded.includes('combo'))) {
        return this.formatAlitasMenu(loaded);
      }
      // Extraer primeras líneas por categorías comunes
      const lines = loaded.split(/\r?\n/).filter(Boolean);
      const top = lines.slice(0, 12).join('\n');
      return `📄 *MENÚ RESUMIDO*\n\n${top}\n\nSi quieres el PDF completo, dime: "menú pdf".`;
    }
    // Resumen por defecto según tipo
    const full = this.getMenuContent(businessType);
    const lines = full.split(/\r?\n/).filter(Boolean);
    const top = lines.slice(0, 12).join('\n');
    return `📄 *MENÚ RESUMIDO*\n\n${top}\n\nSi quieres el PDF completo, dime: "menú pdf".`;
  }

  // Obtener link/indicaciones de PDF o fallback al resumen
  async getMenuPDFOrSummary(branchId, businessType) {
    try {
      const BranchAIConfig = require('../models/BranchAIConfig');
      const config = await BranchAIConfig.findOne({ branchId: branchId }) || await BranchAIConfig.findOne({ branchId });
      const pdfPath = config?.files?.menuPDF?.path;
      if (pdfPath) {
        return `📎 *MENÚ PDF*\n\nPuedes revisar el menú completo aquí (PDF): ${pdfPath}`;
      }
    } catch (_) {}
    return this.getMenuSummary(businessType, branchId);
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

  // Obtener preguntas de recomendación específicas según el tipo de negocio
  getRecommendationQuestions(branchId) {
    // Verificar si es un menú de alitas mix
    const menuContent = this.menuContent.get(branchId) || '';
    const isAlitasMix = (menuContent.includes('ALITAS') || menuContent.includes('A LITAS')) && 
                       (menuContent.includes('COMBO') || menuContent.includes('combo'));
    
    if (isAlitasMix) {
      return [
        {
          question: "¿Para cuántas personas es tu pedido?",
          options: ["Solo para mí", "Para 2-3 personas", "Para 4-5 personas", "Para 6+ personas"],
          category: "people_count"
        },
        {
          question: "¿Qué tipo de salsas prefieres?",
          options: ["Salsas tradicionales (BBQ, miel mostaza)", "Salsas premium (cheddar, sour cream)", "Me gustan ambas", "No sé"],
          category: "sauce_preference"
        },
        {
          question: "¿Cómo prefieres las alitas?",
          options: ["Bañadas con salsa", "Con salsa aparte", "Me da igual", "No sé"],
          category: "sauce_style"
        },
        {
          question: "¿Qué acompañante prefieres?",
          options: ["Papas criollas", "Cascos o yucas", "Arepitas", "No sé"],
          category: "side_preference"
        },
        {
          question: "¿Cuál es tu presupuesto aproximado?",
          options: ["$20,000 - $30,000", "$30,000 - $50,000", "$50,000 - $80,000", "No importa"],
          category: "budget"
        }
      ];
    }
    
    // Preguntas por defecto para cafetería
    return [
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
  }

  // Sistema de recomendaciones estilo Akinator
  getRecommendationQuestion(clientId, branchId, originalMessage = null) {
    // Obtener o crear perfil de recomendaciones del cliente
    const recommendationProfile = this.getRecommendationProfile(clientId, branchId, originalMessage);
    
    // Determinar qué pregunta hacer basada en el progreso
    const questionNumber = recommendationProfile.questionsAnswered;
    
    // Obtener preguntas específicas según el tipo de negocio
    const questions = this.getRecommendationQuestions(branchId);
    
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
  getRecommendationProfile(clientId, branchId, originalMessage = null) {
    const profileKey = `recommendation_${clientId}_${branchId}`;
    
    if (!this.recommendationProfiles) {
      this.recommendationProfiles = new Map();
    }
    
    if (!this.recommendationProfiles.has(profileKey)) {
      this.recommendationProfiles.set(profileKey, {
        questionsAnswered: 0,
        answers: [],
        preferences: {},
        lastActivity: new Date(),
        originalMessage: null
      });
    }
    
    const profile = this.recommendationProfiles.get(profileKey);
    
    // Guardar el mensaje original si se proporciona
    if (originalMessage && !profile.originalMessage) {
      profile.originalMessage = originalMessage;
    }
    
    return profile;
  }

  // Extraer número de personas del mensaje inicial
  extractPeopleCountFromMessage(message) {
    const lowerMessage = message.toLowerCase();
    
    // Patrones para detectar número de personas
    const patterns = [
      /somos (\d+)/i,
      /somos (\d+) en total/i,
      /(\d+) personas/i,
      /(\d+) gente/i,
      /(\d+) amigos/i,
      /para (\d+)/i,
      /(\d+) comensales/i,
      /grupo de (\d+)/i,
      /en total (\d+)/i,
      /somos (\d+) en/i,
      /(\d+) en total/i,
      /(\d+) de nosotros/i,
      /(\d+) vamos/i,
      /(\d+) estamos/i,
      /reunion de (\d+)/i,
      /reunión de (\d+)/i,
      /meeting de (\d+)/i,
      /encuentro de (\d+)/i,
      /junta de (\d+)/i,
      /evento de (\d+)/i,
      /celebracion de (\d+)/i,
      /celebración de (\d+)/i,
      /fiesta de (\d+)/i,
      /(\d+) para comer/i,
      /(\d+) para cenar/i,
      /(\d+) para almorzar/i,
      /(\d+) para desayunar/i
    ];
    
    for (const pattern of patterns) {
      const match = lowerMessage.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0 && count <= 100) { // Límite razonable hasta 100 personas
          return count;
        }
      }
    }
    
    return null;
  }

  // Calcular alitas necesarias basado en número de personas
  calculateAlitasNeeded(peopleCount) {
    const alitasPerPerson = 5; // 5 alitas por persona
    return peopleCount * alitasPerPerson;
  }

  // Encontrar combos óptimos basado en número de personas
  findOptimalCombos(peopleCount, menuProducts) {
    const totalAlitasNeeded = this.calculateAlitasNeeded(peopleCount);
    const recommendations = [];
    
    // Estrategia: encontrar combinaciones que se acerquen al número de alitas necesarias
    const comboOptions = [
      // Combinaciones de combos familiares
      { name: "Familiar 3 + Familiar 2", alitas: 40 + 30, price: 87900 + 62900, description: "70 alitas para todos" },
      { name: "Familiar 3 + Familiar 1", alitas: 40 + 20, price: 87900 + 65900, description: "60 alitas para todos" },
      { name: "2x Familiar 2", alitas: 30 + 30, price: 62900 + 62900, description: "60 alitas para todos" },
      { name: "Familiar 4", alitas: 50, price: 107900, description: "50 alitas + 2 acompañantes" },
      { name: "Familiar 3", alitas: 40, price: 87900, description: "40 alitas + acompañante + gaseosa" },
      { name: "Familiar 2", alitas: 30, price: 62900, description: "30 alitas + acompañante + gaseosa" },
      { name: "Familiar 1", alitas: 20, price: 65900, description: "20 alitas + acompañante + gaseosa" }
    ];
    
    // Encontrar la mejor opción
    let bestOption = comboOptions[0];
    let smallestDifference = Math.abs(comboOptions[0].alitas - totalAlitasNeeded);
    
    for (const option of comboOptions) {
      const difference = Math.abs(option.alitas - totalAlitasNeeded);
      if (difference < smallestDifference) {
        smallestDifference = difference;
        bestOption = option;
      }
    }
    
    return {
      peopleCount,
      alitasNeeded: totalAlitasNeeded,
      recommendedCombo: bestOption,
      efficiency: Math.round((totalAlitasNeeded / bestOption.alitas) * 100)
    };
  }

  // Verificar si es un negocio de alitas
  isAlitasBusiness(branchId) {
    const menuContent = this.menuContent.get(branchId) || '';
    return menuContent.toLowerCase().includes('alitas') || menuContent.toLowerCase().includes('wings');
  }

  // Generar recomendación final basada en las respuestas
  generateFinalRecommendation(profile, branchId) {
    const recommendations = [];
    
    // Obtener productos del menú cargado en la sucursal
    const menuProducts = this.getMenuProductsFromBranch(branchId);
    
    // Si es un menú de alitas mix, usar lógica específica
    if (menuProducts.length > 0 && (menuProducts[0].category === 'alitas' || this.isAlitasBusiness(branchId))) {
      return this.generateAlitasRecommendation(profile, menuProducts);
    }
    
    // Lógica de recomendación basada en respuestas (método original)
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
    
    // Si es un menú de alitas mix, usar parser específico
    if ((menuContent.includes('ALITAS') || menuContent.includes('A LITAS')) && 
        (menuContent.includes('COMBO') || menuContent.includes('combo'))) {
      return this.getAlitasProductsFromMenu(menuContent);
    }
    
    // Parsear el menú para extraer productos y precios (método original)
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

  // Extraer productos específicos del menú de alitas mix
  getAlitasProductsFromMenu(menuContent) {
    const products = [];
    
    // Extraer precios de la línea de precios
    const priceMatch = menuContent.match(/\$([0-9,\.\s]+)/g);
    const prices = priceMatch ? priceMatch.map(p => parseInt(p.replace(/[$,\.\s]/g, ''))) : [];
    
    // Mapear combos con sus precios correspondientes
    const comboMappings = [
      // Combos personales
      { name: 'Combo 1', alitas: 5, price: prices[0] || 21900, type: 'personal' },
      { name: 'Combo 2', alitas: 7, price: prices[1] || 26900, type: 'personal' },
      { name: 'Combo 3', alitas: 9, price: prices[2] || 30900, type: 'personal' },
      { name: 'Combo 4', alitas: 14, price: prices[3] || 42900, type: 'personal' },
      
      // Combos familiares
      { name: 'Combo Familiar 1', alitas: 20, price: prices[4] || 65900, type: 'familiar' },
      { name: 'Combo Familiar 2', alitas: 30, price: prices[5] || 62900, type: 'familiar' },
      { name: 'Combo Familiar 3', alitas: 40, price: prices[6] || 87900, type: 'familiar' },
      { name: 'Combo Familiar 4', alitas: 50, price: prices[7] || 107900, type: 'familiar' },
      
      // Combo emparejado
      { name: 'Combo Emparejado', alitas: 16, price: prices[8] || 123900, type: 'emparejado' }
    ];
    
    comboMappings.forEach(combo => {
      products.push({
        name: combo.name,
        price: combo.price,
        category: 'alitas',
        type: combo.type,
        alitasCount: combo.alitas
      });
    });
    
    return products;
  }

  // Generar recomendación específica para alitas mix
  generateAlitasRecommendation(profile, menuProducts) {
    // Intentar extraer número de personas del mensaje inicial si está disponible
    let peopleCount = null;
    if (profile.originalMessage) {
      peopleCount = this.extractPeopleCountFromMessage(profile.originalMessage);
    }
    
    // Si no se detectó en el mensaje inicial, usar la respuesta de la primera pregunta
    if (!peopleCount && profile.answers[0]) {
      const peopleAnswer = profile.answers[0];
      if (peopleAnswer === "Solo para mí") {
        peopleCount = 1;
      } else if (peopleAnswer === "Para 2-3 personas") {
        peopleCount = 3;
      } else if (peopleAnswer === "Para 4-5 personas") {
        peopleCount = 5;
      } else if (peopleAnswer === "Para 6+ personas") {
        peopleCount = 6;
      }
    }
    
    // Si aún no tenemos número de personas, usar default
    if (!peopleCount) {
      peopleCount = 1;
    }
    
    // Usar el nuevo sistema inteligente para encontrar combos óptimos
    const optimalCombos = this.findOptimalCombos(peopleCount, menuProducts);
    
    // Aplicar filtro de presupuesto si está disponible (respuesta 4 - budget)
    let filteredCombo = optimalCombos.recommendedCombo;
    if (profile.answers[4]) {
      const budgetAnswer = profile.answers[4];
      let maxBudget = 0;
      
      if (budgetAnswer === "$20,000 - $30,000") {
        maxBudget = 30000;
      } else if (budgetAnswer === "$30,000 - $50,000") {
        maxBudget = 50000;
      } else if (budgetAnswer === "$50,000 - $80,000") {
        maxBudget = 80000;
      }
      
      // Si el combo recomendado excede el presupuesto, buscar alternativas
      if (maxBudget > 0 && filteredCombo.price > maxBudget) {
        // Buscar combos más económicos que se ajusten al presupuesto
        const budgetOptions = [
          { name: "Familiar 1", alitas: 20, price: 65900, description: "20 alitas + acompañante + gaseosa" },
          { name: "Familiar 2", alitas: 30, price: 62900, description: "30 alitas + acompañante + gaseosa" },
          { name: "Combo 4", alitas: 14, price: 42900, description: "14 alitas + acompañante + salsas" },
          { name: "Combo 3", alitas: 9, price: 30900, description: "9 alitas + acompañante + salsas" }
        ];
        
        const affordableOptions = budgetOptions.filter(option => option.price <= maxBudget);
        if (affordableOptions.length > 0) {
          filteredCombo = affordableOptions[0];
        }
      }
    }
    
    // Formatear la recomendación con el nuevo formato claro
    return this.formatSmartAlitasRecommendation(optimalCombos, filteredCombo, profile.answers[4]);
  }

  // Formatear recomendación de alitas
  formatAlitasRecommendation(product) {
    return `Perfecto! 🎉 Creo que encontré algo que te va a encantar:

🍗 *MI RECOMENDACIÓN PARA TI:*
• ${product.name} - $${product.price.toLocaleString()}
${product.alitasCount ? `• ${product.alitasCount} alitas deliciosas` : ''}
${product.type === 'personal' ? '• Perfecto para ti solo' : ''}
${product.type === 'familiar' ? '• Ideal para compartir en familia' : ''}
${product.type === 'emparejado' ? '• Perfecto para una pareja' : ''}

💰 *Precio:* $${product.price.toLocaleString()}
📋 *Categoría:* ${product.type === 'personal' ? 'Combo Personal' : product.type === 'familiar' ? 'Combo Familiar' : 'Combo Emparejado'}
💡 *¿Por qué te lo recomiendo?* Se ajusta perfectamente a tus preferencias

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Te gusta esta recomendación? 😊

Puedes:
* Escribir "pedir" para hacer tu pedido
* Escribir "menu" para ver todo el menú
* Escribir "otra sugerencia" para buscar algo diferente
* O preguntarme cualquier cosa que necesites 😊`;
  }

  // Formatear recomendación inteligente de alitas con cálculo de porciones
  formatSmartAlitasRecommendation(optimalCombos, recommendedCombo, budgetAnswer) {
    const { peopleCount, alitasNeeded, recommendedCombo: originalCombo, efficiency } = optimalCombos;
    
    return `🎯 *RECOMENDACIÓN INTELIGENTE PARA ${peopleCount} PERSONAS*

📊 *ANÁLISIS DE PORCIONES:*
• 👥 Personas: ${peopleCount}
• 🍗 Alitas necesarias: ${alitasNeeded} (5 por persona)
• 🎯 Combo recomendado: ${recommendedCombo.name}
• 📦 Alitas incluidas: ${recommendedCombo.alitas}
• ✅ Eficiencia: ${efficiency}% de las alitas necesarias

🍽️ *DETALLE DEL COMBO:*
${recommendedCombo.description}
💰 *Precio:* $${recommendedCombo.price.toLocaleString()}

💡 *¿Por qué esta opción?*
${this.getRecommendationReason(optimalCombos, recommendedCombo, budgetAnswer)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

¿Te gusta esta recomendación? 😊

Puedes:
• Escribir "pedir" para hacer tu pedido
• Escribir "menu" para ver todo el menú  
• Escribir "otra sugerencia" para buscar algo diferente
• O preguntarme cualquier cosa que necesites 😊`;
  }

  // Obtener razón de la recomendación
  getRecommendationReason(optimalCombos, recommendedCombo, budgetAnswer) {
    const { peopleCount, alitasNeeded, efficiency } = optimalCombos;
    
    let reasons = [];
    
    // Razón de porciones
    if (efficiency >= 90) {
      reasons.push("Se ajusta perfectamente a la cantidad de personas");
    } else if (efficiency >= 80) {
      reasons.push("Cubre muy bien las necesidades del grupo");
    } else if (efficiency >= 70) {
      reasons.push("Adecuado para el tamaño del grupo");
    } else {
      reasons.push("Buena opción para el grupo, aunque puede quedar algo");
    }
    
    // Razón de presupuesto
    if (budgetAnswer) {
      reasons.push("Se ajusta a tu presupuesto");
    }
    
    // Razón de valor
    if (recommendedCombo.price <= 70000) {
      reasons.push("Excelente relación calidad-precio");
    }
    
    return reasons.join(", ") + ".";
  }

  // Responder preguntas sobre porciones
  getPortionInformation(message) {
    const lowerMessage = message.toLowerCase();
    
    // Detectar preguntas sobre porciones
    const portionKeywords = [
      'cuantas alitas', 'cuántas alitas', 'cuanta alita', 'cuánta alita',
      'cuantas son', 'cuántas son', 'cuanta porcion', 'cuánta porción',
      'porcion', 'porción', 'cuanto es', 'cuánto es',
      'tamaño porcion', 'tamaño porción', 'tamaño de porcion', 'tamaño de porción'
    ];
    
    const hasPortionQuestion = portionKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasPortionQuestion) {
      return `🍗 *INFORMACIÓN SOBRE PORCIONES DE ALITAS*

📏 *TAMAÑO ESTÁNDAR:*
• 1 porción = 5 alitas por persona
• Este es el tamaño estándar recomendado

👥 *PARA DIFERENTES GRUPOS:*
• 1 persona → 5 alitas
• 2 personas → 10 alitas  
• 4 personas → 20 alitas
• 6 personas → 30 alitas
• 8 personas → 40 alitas
• 10 personas → 50 alitas

💡 *CONSEJOS:*
• Si tienes hambre, considera 6-7 alitas por persona
• Si es para compartir como snack, 3-4 alitas por persona
• Los acompañantes (papas, yucas, etc.) complementan la porción

¿Te gustaría que te ayude a calcular cuántas alitas necesitas para tu grupo? 😊`;
    }
    
    return null;
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
      const questions = this.getRecommendationQuestions(branchId);
      
      const selectedOption = questions[questionNumber].options[parseInt(answer) - 1];
      profile.answers[questionNumber] = selectedOption;
      profile.questionsAnswered++;
      profile.lastActivity = new Date();
      
      return this.getRecommendationQuestion(clientId, branchId);
    }
    
    // Si es "pedir", procesar el pedido de la recomendación
    if (answer.toLowerCase().includes('pedir')) {
      return this.processRecommendationOrder(clientId, branchId, profile);
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

  // Procesar pedido basado en recomendación
  async processRecommendationOrder(clientId, branchId, profile) {
    try {
      // Generar la recomendación final
      const recommendation = this.generateFinalRecommendation(profile, branchId);
      
      if (!recommendation) {
        return "Lo siento, no pude generar una recomendación. ¿Podrías intentar de nuevo?";
      }
      
      // Extraer el nombre del producto de la recomendación
      const productMatch = recommendation.match(/\•\s*([^-]+?)\s*-\s*\$/);
      if (!productMatch) {
        return "Lo siento, no pude identificar el producto recomendado. ¿Podrías intentar de nuevo?";
      }
      
      const productName = productMatch[1].trim();
      
      // Crear un pedido personalizado con las respuestas de la recomendación
      const customOrder = this.createOrderFromRecommendation(productName, profile);
      
      // Procesar el pedido personalizado
      const customPrompt = this.aiPrompts.get(branchId) || null;
      const orderAnalysis = this.processOrder(customOrder.message, branchId, customPrompt);
      
      // Aplicar las respuestas de la recomendación al análisis del pedido
      if (orderAnalysis.hasProducts) {
        this.applyRecommendationAnswers(orderAnalysis, profile);
        
        // Guardar pedido pendiente
        await this.savePendingOrder(clientId, branchId, orderAnalysis);
        await this.saveOrderToHistory(clientId, branchId, orderAnalysis);
        
        // Generar respuesta del pedido
        return this.generateOrderResponse(orderAnalysis);
      } else {
        return `Perfecto! Quieres pedir ${productName}. 

🛒 *INFORMACIÓN DE PEDIDOS*

Para hacer tu pedido, necesito saber:
• ¿Qué productos quieres?
• ¿Cuántas unidades de cada uno?
• ¿Es para llevar o consumo en sitio?

¿Qué te gustaría pedir?`;
      }
    } catch (error) {
      console.error('Error procesando pedido de recomendación:', error);
      return "Lo siento, hubo un problema procesando tu pedido. ¿Podrías intentar de nuevo?";
    }
  }

  // Crear mensaje de pedido basado en recomendación
  createOrderFromRecommendation(productName, profile) {
    let message = `quiero ${productName}`;
    
    // Agregar detalles basados en las respuestas
    const answers = profile.answers;
    
    // Agregar tipo de salsas (respuesta 1)
    if (answers[1]) {
      if (answers[1].includes('tradicionales')) {
        message += ' con salsa bbq';
      } else if (answers[1].includes('premium')) {
        message += ' con salsa cheddar';
      } else if (answers[1].includes('ambas')) {
        message += ' con salsa bbq y cheddar';
      }
    }
    
    // Agregar tipo de alitas (respuesta 2)
    if (answers[2]) {
      if (answers[2].includes('Bañadas')) {
        message += ' bañadas';
      } else if (answers[2].includes('apart')) {
        message += ' con salsa aparte';
      }
    }
    
    // Agregar acompañante (respuesta 3)
    if (answers[3]) {
      if (answers[3].includes('Papas criollas')) {
        message += ' y papas criollas';
      } else if (answers[3].includes('Cascos')) {
        message += ' y cascos';
      } else if (answers[3].includes('Arepitas')) {
        message += ' y arepitas';
      }
    }
    
    return { message, answers };
  }

  // Aplicar respuestas de recomendación al análisis del pedido
  applyRecommendationAnswers(orderAnalysis, profile) {
    if (!orderAnalysis.hasProducts) return;
    
    const answers = profile.answers;
    
    orderAnalysis.products.forEach(product => {
      if (product.details) {
        // Aplicar tipo de alitas (respuesta 2)
        if (answers[2]) {
          if (answers[2].includes('Bañadas')) {
            product.details.tipoAlitas = 'bañadas';
          } else if (answers[2].includes('apart')) {
            product.details.tipoAlitas = 'salsa aparte';
          }
        }
        
        // Aplicar salsas (respuesta 1)
        if (answers[1]) {
          if (answers[1].includes('tradicionales')) {
            product.details.salsas = [{ nombre: 'bbq', tipo: 'tradicional' }];
          } else if (answers[1].includes('premium')) {
            product.details.salsas = [{ nombre: 'cheddar', tipo: 'premium' }];
          } else if (answers[1].includes('ambas')) {
            product.details.salsas = [
              { nombre: 'bbq', tipo: 'tradicional' },
              { nombre: 'cheddar', tipo: 'premium' }
            ];
          }
        }
        
        // Aplicar acompañante (respuesta 3)
        if (answers[3]) {
          if (answers[3].includes('Papas criollas')) {
            product.details.acompanantes = ['papas criollas'];
          } else if (answers[3].includes('Cascos')) {
            product.details.acompanantes = ['cascos'];
          } else if (answers[3].includes('Arepitas')) {
            product.details.acompanantes = ['arepitas'];
          }
        }
      }
    });
    
    // Marcar que no necesita clarificación si ya tenemos toda la información
    const hasAllInfo = orderAnalysis.products.every(product => {
      if (!product.details) return false;
      return product.details.tipoAlitas && 
             product.details.salsas && 
             product.details.acompanantes;
    });
    
    if (hasAllInfo) {
      orderAnalysis.needsClarification = false;
      orderAnalysis.clarificationQuestions = [];
    }
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

  // Procesar pedidos específicos de alitas con todos los detalles
  processAlitasOrder(message, lowerMessage, customPrompt) {
    console.log('🍗 ===== PROCESANDO PEDIDO DE ALITAS =====');
    
    const order = {
      products: [],
      total: 0,
      hasProducts: false,
      needsClarification: false,
      clarificationQuestions: [],
      orderType: 'alitas'
    };

    // Detectar tipo de combo
    const comboPatterns = {
      personal: {
        'combo 1': { alitas: 5, price: 21900 },
        'combo 2': { alitas: 7, price: 26900 },
        'combo 3': { alitas: 9, price: 30900 },
        'combo 4': { alitas: 14, price: 42900 },
        '5 alitas': { alitas: 5, price: 21900 },
        '7 alitas': { alitas: 7, price: 26900 },
        '9 alitas': { alitas: 9, price: 30900 },
        '14 alitas': { alitas: 14, price: 42900 }
      },
      familiar: {
        'familiar 1': { alitas: 20, price: 65900 },
        'familiar 2': { alitas: 30, price: 62900 },
        'familiar 3': { alitas: 40, price: 87900 },
        'familiar 4': { alitas: 50, price: 107900 },
        '20 alitas': { alitas: 20, price: 65900 },
        '30 alitas': { alitas: 30, price: 62900 },
        '40 alitas': { alitas: 40, price: 87900 },
        '50 alitas': { alitas: 50, price: 107900 }
      },
      emparejado: {
        'combo emparejado': { alitas: 16, price: 123900 },
        '16 alitas': { alitas: 16, price: 123900 }
      }
    };

    // Detectar salsas
    const salsasTradicionales = ['bbq', 'miel mostaza', 'picante suave', 'picante full', 'envinada', 'frutos rojos', 'parmesano', 'maracuyá', 'limón pimienta'];
    const salsasPremium = ['dulce maíz', 'la original', 'cheddar', 'sour cream', 'pepinillo'];

    // Detectar acompañantes
    const acompanantes = ['papas criollas', 'cascos', 'yucas', 'arepitas', 'papas francesa', 'papas fritas'];

    // Detectar bebidas
    const bebidas = ['gaseosa', 'limonada', 'coca cola', 'pepsi'];

    // Detectar tipo de alitas
    const tipoAlitas = {
      bañadas: ['bañadas', 'con salsa', 'bañada'],
      separadas: ['con salsa aparte', 'salsa aparte', 'separadas']
    };

    // Analizar el mensaje
    let detectedCombo = null;
    let detectedSalsas = [];
    let detectedAcompanantes = [];
    let detectedBebidas = [];
    let detectedTipoAlitas = null;

    // Detectar combo
    for (const [tipo, combos] of Object.entries(comboPatterns)) {
      for (const [comboName, comboInfo] of Object.entries(combos)) {
        // Crear patrones flexibles para detectar combos con o sin espacios
        const flexiblePatterns = [
          comboName, // "combo 2"
          comboName.replace(/\s+/g, ''), // "combo2"
          comboName.replace(/\s+/g, '\\s*') // "combo\\s*2" para regex
        ];
        
        let found = false;
        for (const pattern of flexiblePatterns) {
          if (lowerMessage.includes(pattern)) {
            detectedCombo = { tipo, comboName, ...comboInfo };
            found = true;
            break;
          }
        }
        if (found) break;
      }
      if (detectedCombo) break;
    }

    // Detectar salsas
    for (const salsa of salsasTradicionales) {
      if (lowerMessage.includes(salsa)) {
        detectedSalsas.push({ nombre: salsa, tipo: 'tradicional' });
      }
    }
    for (const salsa of salsasPremium) {
      if (lowerMessage.includes(salsa)) {
        detectedSalsas.push({ nombre: salsa, tipo: 'premium' });
      }
    }

    // Detectar acompañantes
    for (const acompanante of acompanantes) {
      if (lowerMessage.includes(acompanante)) {
        detectedAcompanantes.push(acompanante);
      }
    }

    // Detectar bebidas
    for (const bebida of bebidas) {
      if (lowerMessage.includes(bebida)) {
        detectedBebidas.push(bebida);
      }
    }

    // Detectar tipo de alitas
    for (const [tipo, keywords] of Object.entries(tipoAlitas)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          detectedTipoAlitas = tipo;
          break;
        }
      }
      if (detectedTipoAlitas) break;
    }

    // Si se detectó un combo, procesar
    if (detectedCombo) {
      order.hasProducts = true;
      
      const product = {
        name: `Combo ${detectedCombo.comboName}`,
        quantity: 1,
        price: detectedCombo.price,
        total: detectedCombo.price,
        details: {
          alitas: detectedCombo.alitas,
          tipo: detectedCombo.tipo,
          salsas: detectedSalsas,
          acompanantes: detectedAcompanantes,
          bebidas: detectedBebidas,
          tipoAlitas: detectedTipoAlitas
        }
      };

      order.products.push(product);
      order.total += product.total;

      // Generar preguntas de clarificación si faltan detalles
      if (!detectedTipoAlitas) {
        order.needsClarification = true;
        order.clarificationQuestions.push('¿Quieres las alitas bañadas o con la salsa aparte?');
      }

      if (detectedSalsas.length === 0) {
        order.needsClarification = true;
        order.clarificationQuestions.push('¿Qué salsas prefieres? Tenemos tradicionales (BBQ, miel mostaza, picante) y premium (cheddar, sour cream).');
      }

      if (detectedAcompanantes.length === 0) {
        order.needsClarification = true;
        order.clarificationQuestions.push('¿Qué acompañante prefieres? Papas criollas, cascos, yucas o arepitas.');
      }

      if (detectedCombo.tipo === 'familiar' && detectedBebidas.length === 0) {
        order.needsClarification = true;
        order.clarificationQuestions.push('¿Qué bebida prefieres? Incluye gaseosa de 1.5L.');
      }

      if (detectedCombo.tipo === 'emparejado' && detectedBebidas.length < 2) {
        order.needsClarification = true;
        order.clarificationQuestions.push('¿Qué bebidas prefieres? Incluye 2 limonadas.');
      }
    }

    console.log('🍗 Pedido de alitas procesado:', order);
    return order;
  }

  // Procesar pedido automáticamente con configuración específica de sucursal
  processOrder(message, branchId = null, customPrompt = null) {
    const lowerMessage = message.toLowerCase();
    
    console.log('🛒 ===== PROCESANDO PEDIDO =====');
    console.log('💬 Mensaje original:', message);
    console.log('🔍 Mensaje normalizado:', lowerMessage);
    console.log('🏪 Branch ID:', branchId);
    console.log('🤖 Custom Prompt:', customPrompt ? 'Disponible' : 'No disponible');
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

    // Procesar pedidos específicos de alitas usando prompt personalizado
    if (customPrompt && customPrompt.toLowerCase().includes('alitas')) {
      return this.processAlitasOrder(message, lowerMessage, customPrompt);
    }

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
    
    // Si necesita clarificación (específico para alitas)
    if (orderAnalysis.needsClarification && orderAnalysis.orderType === 'alitas') {
      let response = `🍗 *PEDIDO DE ALITAS DETECTADO*\n\n`;
      
      orderAnalysis.products.forEach((product, index) => {
        response += `${index + 1}. ${product.name} - $${product.total.toLocaleString()}\n`;
        if (product.details) {
          response += `   📋 Detalles:\n`;
          if (product.details.alitas) response += `   • ${product.details.alitas} alitas\n`;
          if (product.details.salsas && product.details.salsas.length > 0) {
            response += `   • Salsas: ${product.details.salsas.map(s => s.nombre).join(', ')}\n`;
          }
          if (product.details.acompanantes && product.details.acompanantes.length > 0) {
            response += `   • Acompañantes: ${product.details.acompanantes.join(', ')}\n`;
          }
          if (product.details.bebidas && product.details.bebidas.length > 0) {
            response += `   • Bebidas: ${product.details.bebidas.join(', ')}\n`;
          } else {
            // Fallback para sucursal de alitas mix cuando no hay info de bebidas
            response += `   • Bebida incluida: Será despachada según disponibilidad (no tenemos información de sabores/tamaños). Estamos en mejora constante.\n`;
          }
          if (product.details.tipoAlitas) {
            response += `   • Tipo: ${product.details.tipoAlitas}\n`;
          }
        }
      });
      
      response += `\n💰 *TOTAL: $${orderAnalysis.total.toLocaleString()}*\n\n`;
      response += `❓ *NECESITO ALGUNOS DETALLES MÁS:*\n\n`;
      
      orderAnalysis.clarificationQuestions.forEach((question, index) => {
        response += `${index + 1}. ${question}\n`;
      });
      
      response += `\nPor favor responde cada pregunta para completar tu pedido.`;
      
      return response;
    }
    
    let response = `🛒 *RESUMEN DE TU PEDIDO*\n\n`;
    
    orderAnalysis.products.forEach((product, index) => {
      response += `${index + 1}. ${product.name} x${product.quantity} - $${product.total.toLocaleString()}\n`;
    });
    
    response += `\n💰 *TOTALES*\n`;
    response += `Subtotal: $${(orderAnalysis.subtotal || orderAnalysis.total || 0).toLocaleString()}\n`;
    
    if (orderAnalysis.delivery) {
      response += `Delivery: $${(orderAnalysis.deliveryFee || 0).toLocaleString()}\n`;
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

  // Guardar respuesta del asistente en el último mensaje
  async saveAssistantResponse(clientId, branchId, assistantResponse) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      // Buscar la conversación del cliente
      const conversation = await db.collection('conversations').findOne({
        clientId: clientId,
        branchId: branchId
      });
      
      if (conversation && conversation.messages && conversation.messages.length > 0) {
        // Actualizar el último mensaje con la respuesta del asistente
        const lastMessageIndex = conversation.messages.length - 1;
        
        await db.collection('conversations').updateOne(
          { 
            clientId: clientId,
            branchId: branchId
          },
          { 
            $set: {
              [`messages.${lastMessageIndex}.assistant`]: assistantResponse,
              lastActivity: new Date(),
              updatedAt: new Date()
            }
          }
        );
        
        this.logger.info(`🤖 Respuesta del asistente guardada para cliente ${clientId}`);
      }
    } catch (error) {
      this.logger.error('Error guardando respuesta del asistente:', error);
    }
  }

  // Guardar mensaje en historial de conversación
  async saveConversationMessage(clientId, branchId, userMessage, intent, assistantResponse = null) {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const messageData = {
        user: userMessage,
        timestamp: new Date(),
        intent: intent
      };
      
      // Agregar respuesta del asistente si está disponible
      if (assistantResponse) {
        messageData.assistant = assistantResponse;
      }
      
      await db.collection('conversations').updateOne(
        { 
          clientId: clientId,
          branchId: branchId
        },
        { 
          $push: { 
            messages: messageData
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
      'está bien', 'correcto', 'procede', 'adelante', 'yes',
      'acepto', 'aceptar', 'lo confirmo', 'confirmado', 'listo', 'vale', 'de una', 'hágale', 'hagale'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    const isConfirm = confirmationKeywords.some(keyword => lowerMessage.includes(keyword));
    if (isConfirm) {
      // Completar timers de sesión al confirmar pedido
      try {
        const InMemorySessionTimer = require('./InMemorySessionTimer');
        const timers = InMemorySessionTimer.getInstance();
        // Nota: aquí no tenemos phone/branch. El que confirma se maneja en generateResponse con clientId.
      } catch (_) {}
    }
    return isConfirm;
  }

  // Detectar si el usuario está pidiendo/proponiendo enviar datos de envío
  isDeliveryDataRequest(message) {
    const lower = message.toLowerCase();
    const keywords = [
      'datos de envío', 'datos para el envío', 'mis datos', 'mis datos para el envío',
      'dirección', 'direccion', 'teléfono', 'telefono', 'quien recibe', 'persona que recibe',
      'enviar direccion', 'enviar dirección', 'enviar datos', 'requiere mis datos', 'requieren mis datos'
    ];
    return keywords.some(k => lower.includes(k));
  }

  // Manejar confirmación de pedido
  async handleOrderConfirmation(clientId, branchId, message) {
    try {
      // Obtener el último pedido pendiente del cliente
      const lastOrder = await this.getLastPendingOrder(clientId, branchId);
      
      if (!lastOrder) {
        return 'No tengo ningún pedido pendiente para confirmar. ¿Quieres hacer un nuevo pedido?';
      }

      // Si aún no se definió el tipo de entrega, preguntar al cliente
      const hasType = lastOrder.delivery && lastOrder.delivery.type;
      if (!hasType) {
        await this.savePendingOrder(clientId, branchId, lastOrder);
        if (!this._awaitingDeliveryChoice) this._awaitingDeliveryChoice = new Map();
        this._awaitingDeliveryChoice.set(`${clientId}::${branchId}`, true);
        return '¿Quieres domicilio o recoger en tienda? Responde con "domicilio" o "recoger".';
      }

      // Verificar si es para domicilio
      const isDelivery = lastOrder.delivery && lastOrder.delivery.type === 'delivery';
      if (isDelivery) {
        return await this.requestDeliveryData(clientId, branchId, lastOrder);
      } else {
        return await this.confirmOrderDirectly(clientId, branchId, lastOrder);
      }
      
    } catch (error) {
      console.error('Error manejando confirmación de pedido:', error);
      return 'Hubo un problema procesando tu confirmación. ¿Puedes intentar de nuevo?';
    }
  }

  // Manejar elección de entrega (domicilio o recoger)
  async handleDeliveryChoice(clientId, branchId, message, order) {
    const msg = message.toLowerCase();
    const key = `${clientId}::${branchId}`;
    // Aceptar variantes y errores comunes: domicilio/domisi(l)io, recoger/recojer/recojo, etc.
    const saysDelivery = /(domicilio|domisilio|domicillio|domicillio|a domicilio|a domisilio|enviar|env[íi]o|envio|delivery)/i.test(msg);
    const saysPickup = /(recoger|recojer|recojo|recogo|recogida|para recoger|para recojer|pickup|voy por|paso por|retirar|retiro|lo recojo)/i.test(msg);

    if (!saysDelivery && !saysPickup) {
      return null;
    }

    // Ya no estamos esperando elección
    if (this._awaitingDeliveryChoice) this._awaitingDeliveryChoice.delete(key);

    if (saysDelivery) {
      const fee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 3000;
      const updated = {
        ...order,
        delivery: { type: 'delivery', fee },
        total: (typeof order.subtotal === 'number' ? order.subtotal : order.total - (order.deliveryFee || 0)) + fee
      };
      await this.savePendingOrder(clientId, branchId, updated);
      return await this.requestDeliveryData(clientId, branchId, updated);
    }

    if (saysPickup) {
      const updated = {
        ...order,
        delivery: { type: 'pickup', fee: 0 },
        total: typeof order.subtotal === 'number' ? order.subtotal : order.total
      };
      await this.savePendingOrder(clientId, branchId, updated);
      return await this.confirmOrderDirectly(clientId, branchId, updated);
    }

    return null;
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

  // Intentar procesar datos de envío proporcionados en texto libre
  async tryHandleDeliveryData(clientId, branchId, message, order) {
    const text = message.trim();
    // Heurística simple: buscar teléfono como dígitos 7-12, separar por comas
    const phoneMatch = text.match(/(\+?\d[\d\s-]{6,14}\d)/);
    const parts = text.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    if (!phoneMatch || parts.length < 2) {
      return null; // no parece datos completos
    }

    // Asignación tentativa: dirección = primera parte, barrio/extra = segunda si existe, nombre = última parte
    const addressLine = parts[0];
    const neighborhood = parts.length >= 3 ? parts[1] : '';
    const phone = phoneMatch[1].replace(/[^\d]/g, '');
    const recipient = parts[parts.length - 1];

    const updated = {
      ...order,
      delivery: {
        type: 'delivery',
        fee: typeof order.deliveryFee === 'number' ? order.deliveryFee : (order.delivery?.fee ?? 3000),
        address: {
          street: `${addressLine}${neighborhood ? `, ${neighborhood}` : ''}`,
          city: undefined,
          state: undefined,
          zipCode: undefined
        }
      },
      customer: {
        ...(order.customer || {}),
        phone,
        name: recipient || 'Cliente WhatsApp'
      }
    };

    await this.savePendingOrder(clientId, branchId, updated);

    // Guardar pedido en BD
    const saved = await this.saveOrderToDatabase(clientId, branchId, updated);

    // Desactivar temporizadores al confirmar el pedido de domicilio
    try {
      const SessionTimerService = require('./SessionTimerService');
      const InMemorySessionTimer = require('./InMemorySessionTimer');
      
      // Desactivar temporizador persistente
      const sessionTimer = new SessionTimerService();
      await sessionTimer.complete({ phoneNumber: clientId, branchId });
      
      // Desactivar temporizador en memoria
      const memoryTimer = InMemorySessionTimer.getInstance();
      memoryTimer.clearSession(clientId);
      
      console.log('✅ Temporizadores desactivados para domicilio:', clientId);
    } catch (timerError) {
      console.warn('⚠️ Error desactivando temporizadores de domicilio:', timerError.message);
    }

    const etaMin = 25 + Math.floor(Math.random() * 11); // 25-35
    
    // IMPORTANTE: Enviar comanda al restaurante cuando se confirma pedido de domicilio
    console.log('🚀 ===== ENVIANDO COMANDA DE DOMICILIO AL RESTAURANTE =====');
    console.log('📦 Order ID:', saved.orderId);
    console.log('👤 Cliente:', clientId);
    console.log('📍 Tipo: Domicilio');
    console.log('=====================================================');
    
    try {
      // Obtener la conexión WhatsApp para enviar comanda
      const WhatsAppConnection = require('../models/WhatsAppConnection');
      const connection = await WhatsAppConnection.findOne({ branchId });
      
      if (connection) {
        console.log('✅ Conexión encontrada para envío de comanda');
        // Importar el controlador para usar la función de envío
        const WhatsAppController = require('../controllers/WhatsAppController');
        const controller = new WhatsAppController();
        await controller.sendOrderSummaryToBranch(connection, clientId, message);
        console.log('✅ Comanda de domicilio enviada al restaurante');
      } else {
        console.log('❌ No se encontró conexión WhatsApp para enviar comanda');
      }
    } catch (comandaError) {
      console.error('❌ Error enviando comanda de domicilio:', comandaError.message);
    }
    
    return `✅ *PEDIDO CONFIRMADO*

🆔 *Número de pedido:* ${saved.orderId}
📍 *Entrega:* A domicilio
📦 *Dirección:* ${updated.delivery.address.street}
📞 *Contacto:* ${phone}
👤 *Recibe:* ${recipient}
💰 *Total:* $${updated.total.toLocaleString()}
⏰ *Tiempo estimado:* ${etaMin} minutos

¡Gracias por tu pedido! Tu domicilio va en camino. Fue un gusto atenderte, espero poder ayudarte de nuevo pronto.`;
  }

  // Confirmar pedido directamente (para recoger)
  async confirmOrderDirectly(clientId, branchId, order) {
    try {
      // Crear el pedido en la base de datos
      const savedOrder = await this.saveOrderToDatabase(clientId, branchId, order);
      
      // Desactivar temporizadores al confirmar el pedido
      try {
        const SessionTimerService = require('./SessionTimerService');
        const InMemorySessionTimer = require('./InMemorySessionTimer');
        
        // Desactivar temporizador persistente
        const sessionTimer = new SessionTimerService();
        await sessionTimer.complete({ phoneNumber: clientId, branchId });
        
        // Desactivar temporizador en memoria
        const memoryTimer = InMemorySessionTimer.getInstance();
        memoryTimer.clearSession(clientId);
        
      console.log('✅ Temporizadores desactivados para:', clientId);
    } catch (timerError) {
      console.warn('⚠️ Error desactivando temporizadores:', timerError.message);
    }
    
    // IMPORTANTE: Enviar comanda al restaurante cuando se confirma pedido para recoger
    console.log('🚀 ===== ENVIANDO COMANDA DE RECOGER AL RESTAURANTE =====');
    console.log('📦 Order ID:', savedOrder.orderId);
    console.log('👤 Cliente:', clientId);
    console.log('📍 Tipo: Recoger en tienda');
    console.log('=====================================================');
    
    try {
      // Obtener la conexión WhatsApp para enviar comanda
      const WhatsAppConnection = require('../models/WhatsAppConnection');
      const connection = await WhatsAppConnection.findOne({ branchId });
      
      if (connection) {
        console.log('✅ Conexión encontrada para envío de comanda');
        // Importar el controlador para usar la función de envío
        const WhatsAppController = require('../controllers/WhatsAppController');
        const controller = new WhatsAppController();
        await controller.sendOrderSummaryToBranch(connection, clientId, 'Pedido confirmado para recoger');
        console.log('✅ Comanda de recoger enviada al restaurante');
      } else {
        console.log('❌ No se encontró conexión WhatsApp para enviar comanda');
      }
    } catch (comandaError) {
      console.error('❌ Error enviando comanda de recoger:', comandaError.message);
    }
    
    return `✅ *PEDIDO CONFIRMADO*

🆔 *Número de pedido:* ${savedOrder.orderId}
📋 *Resumen:* ${order.products.map(p => `${p.name} x${p.quantity}`).join(', ')}
💰 *Total:* $${order.total.toLocaleString()}
⏰ *Tiempo estimado:* 15-20 minutos

📞 *Teléfono:* ${clientId}
🏪 *Sucursal:* Centro

¡Gracias por tu pedido! Te notificaremos cuando esté listo para recoger.

Gracias por tu compra, que las disfrutes 😊`;
      
    } catch (error) {
      console.error('Error confirmando pedido:', error);
      return 'Hubo un problema guardando tu pedido. ¿Puedes intentar de nuevo?';
    }
  }

  // Obtener último pedido pendiente
  async getLastPendingOrder(clientId, branchId) {
    const key = `${clientId}::${branchId}`;
    if (this._pendingOrders && this._pendingOrders.has(key)) {
      return this._pendingOrders.get(key);
    }
    return null;
  }

  // Guardar pedido pendiente temporalmente
  async savePendingOrder(clientId, branchId, order) {
    if (!this._pendingOrders) {
      this._pendingOrders = new Map();
    }
    const key = `${clientId}::${branchId}`;
    this._pendingOrders.set(key, { ...order, savedAt: Date.now() });
    console.log('💾 Guardando pedido pendiente:', { key, items: order.products?.length || 0, total: order.total });
  }

  // Guardar pedido en base de datos
  async saveOrderToDatabase(clientId, branchId, order) {
    const Order = require('../models/Order');
    const Branch = require('../models/Branch');
    
    // Obtener businessId desde branchId (aceptar ObjectId o branchId string)
    let branch = null;
    try {
      branch = await Branch.findById(branchId);
    } catch (e) {
      branch = null;
    }
    if (!branch) {
      branch = await Branch.findOne({ branchId: branchId });
    }
    if (!branch) {
      throw new Error('Sucursal no encontrada');
    }
    
    // Generar ID único para el pedido
    const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Crear objeto del pedido
    const orderData = {
      orderId,
      businessId: (branch.businessId && branch.businessId.toString) ? branch.businessId.toString() : String(branch.businessId || ''),
      branchId: (branch._id && branch._id.toString) ? branch._id.toString() : String(branchId),
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
        type: (order.delivery && order.delivery.type) ? order.delivery.type : 'pickup',
        fee: (order.delivery && typeof order.delivery.fee === 'number') ? order.delivery.fee : 0,
        address: (order.delivery && order.delivery.address) ? order.delivery.address : null
      },
      subtotal: order.subtotal || order.total || 0,
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

  // Manejar respuestas a preguntas de clarificación
  async handleClarificationResponse(clientId, branchId, userMessage, pendingOrder) {
    try {
      const lowerMessage = userMessage.toLowerCase();
      
      // Obtener el customPrompt para procesar la respuesta
      const customPrompt = this.aiPrompts.get(branchId) || null;
      
      // Procesar la respuesta del usuario con el pedido existente
      const updatedOrder = await this.processOrderWithClarification(userMessage, branchId, customPrompt, pendingOrder);
      
      if (updatedOrder.hasProducts && !updatedOrder.needsClarification) {
        // El pedido está completo, mostrar resumen final
        await this.savePendingOrder(clientId, branchId, updatedOrder);
        const orderResponse = this.generateOrderResponse(updatedOrder);
        return orderResponse;
      } else if (updatedOrder.needsClarification) {
        // Aún necesita más información
        await this.savePendingOrder(clientId, branchId, updatedOrder);
        const clarificationResponse = this.generateClarificationResponse(updatedOrder);
        return clarificationResponse;
      }
      
      return null; // No se pudo procesar la respuesta
    } catch (error) {
      console.error('Error procesando respuesta de clarificación:', error);
      return null;
    }
  }

  // Procesar pedido con información de clarificación adicional
  async processOrderWithClarification(userMessage, branchId, customPrompt, existingOrder) {
    // Usar el análisis existente como base
    const orderAnalysis = { ...existingOrder };
    
    // Procesar la nueva información del usuario
    const lowerMessage = userMessage.toLowerCase();
    
    // Detectar tipo de alitas (bañadas o salsa aparte)
    if (lowerMessage.includes('bañadas') || lowerMessage.includes('bañada')) {
      orderAnalysis.products.forEach(product => {
        if (product.details) {
          product.details.tipoAlitas = 'bañadas';
        }
      });
    } else if (lowerMessage.includes('salsa aparte') || lowerMessage.includes('apart')) {
      orderAnalysis.products.forEach(product => {
        if (product.details) {
          product.details.tipoAlitas = 'salsa aparte';
        }
      });
    }
    
    // Detectar salsas
    const salsasTradicionales = ['bbq', 'miel mostaza', 'picante', 'envinada', 'frutos rojos', 'parmesano', 'maracuyá', 'limón pimienta'];
    const salsasPremium = ['dulce maíz', 'la original', 'cheddar', 'sour cream', 'pepinillo'];
    
    salsasTradicionales.forEach(salsa => {
      if (lowerMessage.includes(salsa)) {
        orderAnalysis.products.forEach(product => {
          if (product.details && product.details.salsas) {
            product.details.salsas.push({ nombre: salsa, tipo: 'tradicional' });
          }
        });
      }
    });
    
    salsasPremium.forEach(salsa => {
      if (lowerMessage.includes(salsa)) {
        orderAnalysis.products.forEach(product => {
          if (product.details && product.details.salsas) {
            product.details.salsas.push({ nombre: salsa, tipo: 'premium' });
          }
        });
      }
    });
    
    // Detectar acompañantes
    const acompanantes = ['papas criollas', 'cascos', 'yucas', 'arepitas', 'papas francesa'];
    acompanantes.forEach(acompanante => {
      if (lowerMessage.includes(acompanante)) {
        orderAnalysis.products.forEach(product => {
          if (product.details && product.details.acompanantes) {
            product.details.acompanantes.push(acompanante);
          }
        });
      }
    });
    
    // Detectar bebidas
    const bebidas = ['gaseosa', 'limonada', 'coca cola', 'pepsi'];
    bebidas.forEach(bebida => {
      if (lowerMessage.includes(bebida)) {
        orderAnalysis.products.forEach(product => {
          if (product.details && product.details.bebidas) {
            product.details.bebidas.push(bebida);
          }
        });
      }
    });
    
    // Verificar si aún necesita clarificación
    orderAnalysis.needsClarification = false;
    orderAnalysis.clarificationQuestions = [];
    
    orderAnalysis.products.forEach(product => {
      if (product.details) {
        // Verificar si falta información crítica
        if (!product.details.tipoAlitas) {
          orderAnalysis.needsClarification = true;
          if (!orderAnalysis.clarificationQuestions.includes('¿Quieres las alitas bañadas o con la salsa aparte?')) {
            orderAnalysis.clarificationQuestions.push('¿Quieres las alitas bañadas o con la salsa aparte?');
          }
        }
        
        if (!product.details.salsas || product.details.salsas.length === 0) {
          orderAnalysis.needsClarification = true;
          if (!orderAnalysis.clarificationQuestions.includes('¿Qué salsas prefieres?')) {
            orderAnalysis.clarificationQuestions.push('¿Qué salsas prefieres? Tenemos tradicionales (BBQ, miel mostaza, picante) y premium (cheddar, sour cream).');
          }
        }
        
        if (!product.details.acompanantes || product.details.acompanantes.length === 0) {
          orderAnalysis.needsClarification = true;
          if (!orderAnalysis.clarificationQuestions.includes('¿Qué acompañante prefieres?')) {
            orderAnalysis.clarificationQuestions.push('¿Qué acompañante prefieres? Papas criollas, cascos, yucas o arepitas.');
          }
        }
      }
    });
    
    return orderAnalysis;
  }

  // Generar respuesta de clarificación
  generateClarificationResponse(orderAnalysis) {
    let response = `🍗 *ACTUALIZANDO TU PEDIDO*\n\n`;
    
    orderAnalysis.products.forEach((product, index) => {
      response += `${index + 1}. ${product.name} - $${product.total.toLocaleString()}\n`;
      if (product.details) {
        if (product.details.tipoAlitas) {
          response += `   • Tipo: ${product.details.tipoAlitas}\n`;
        }
        if (product.details.salsas && product.details.salsas.length > 0) {
          response += `   • Salsas: ${product.details.salsas.map(s => s.nombre).join(', ')}\n`;
        }
        if (product.details.acompanantes && product.details.acompanantes.length > 0) {
          response += `   • Acompañantes: ${product.details.acompanantes.join(', ')}\n`;
        }
        if (product.details.bebidas && product.details.bebidas.length > 0) {
          response += `   • Bebidas: ${product.details.bebidas.join(', ')}\n`;
        }
      }
    });
    
    response += `\n💰 *TOTAL: $${orderAnalysis.total.toLocaleString()}*\n\n`;
    
    if (orderAnalysis.clarificationQuestions.length > 0) {
      response += `❓ *AÚN NECESITO SABER:*\n`;
      orderAnalysis.clarificationQuestions.forEach((question, index) => {
        response += `${index + 1}. ${question}\n`;
      });
    }
    
    return response;
  }

  // Manejar cancelación de pedidos
  async handleOrderCancellation(clientId, branchId, userMessage) {
    try {
      console.log('🚫 ===== MANEJANDO CANCELACIÓN DE PEDIDO =====');
      console.log(`📞 Cliente: ${clientId}`);
      console.log(`🏪 Sucursal: ${branchId}`);
      console.log(`💬 Mensaje: ${userMessage}`);
      
      // Buscar pedidos activos del cliente
      const Order = require('../models/Order');
      const UserSession = require('../models/UserSession');
      const SessionTimerService = require('./SessionTimerService');
      
      // Convertir branchId a ObjectId si es necesario
      const mongoose = require('mongoose');
      let branchIdObjectId;
      
      if (typeof branchId === 'string' && mongoose.Types.ObjectId.isValid(branchId)) {
        branchIdObjectId = new mongoose.Types.ObjectId(branchId);
      } else if (typeof branchId === 'object') {
        branchIdObjectId = branchId;
      } else {
        branchIdObjectId = branchId;
      }
      
      // Buscar pedidos pendientes del cliente
      const pendingOrders = await Order.find({
        'customer.phone': clientId,
        branchId: branchIdObjectId,
        status: { $in: ['pending', 'confirmed', 'preparing'] },
        isActive: true
      }).sort({ createdAt: -1 });
      
      console.log(`📋 Pedidos pendientes encontrados: ${pendingOrders.length}`);
      
      if (pendingOrders.length === 0) {
        console.log('✅ No hay pedidos pendientes para cancelar');
        return `¡Perfecto! 😊 No tienes pedidos pendientes que cancelar.\n\n😔 Es un infortunio no poder continuar contigo en esta ocasión.\n\n💙 Pero no te preocupes, estaremos aquí listos para atenderte próximamente cuando lo desees.\n\n¡Gracias por contactarnos y esperamos verte pronto! 😊`;
      }
      
      // Cancelar todos los pedidos pendientes
      let cancelledCount = 0;
      const cancelledOrders = [];
      
      for (const order of pendingOrders) {
        try {
          // Actualizar estado del pedido
          await order.updateStatus('cancelled', `Cancelado por el cliente: ${userMessage}`, 'system');
          
          cancelledOrders.push({
            orderId: order.orderId,
            total: order.total,
            status: order.status
          });
          
          cancelledCount++;
          
          console.log(`✅ Pedido ${order.orderId} cancelado exitosamente`);
          
        } catch (error) {
          console.error(`❌ Error cancelando pedido ${order.orderId}:`, error.message);
        }
      }
      
      // Completar sesión del cliente (detener timers)
      try {
        const sessionTimerService = new SessionTimerService();
        await sessionTimerService.completeSession({
          phoneNumber: clientId,
          branchId: branchId
        });
        
        console.log('✅ Sesión completada, timers detenidos');
      } catch (error) {
        console.error('⚠️ Error completando sesión:', error.message);
      }
      
      // Generar respuesta personalizada
      let response = '';
      
      if (cancelledCount === 1) {
        const order = cancelledOrders[0];
        response = `✅ *PEDIDO CANCELADO*\n\n`;
        response += `📋 Pedido #${order.orderId}\n`;
        response += `💰 Valor: $${order.total.toLocaleString()}\n\n`;
        response += `Tu pedido ha sido cancelado exitosamente. No se realizará ningún cobro.\n\n`;
        response += `😔 Es un infortunio no poder continuar con tu pedido en esta ocasión.\n\n`;
        response += `💙 Pero no te preocupes, estaremos aquí listos para atenderte próximamente cuando lo desees.\n\n`;
        response += `¡Gracias por contactarnos y esperamos verte pronto! 😊`;
      } else {
        response = `✅ *${cancelledCount} PEDIDOS CANCELADOS*\n\n`;
        response += `Se han cancelado todos tus pedidos pendientes:\n\n`;
        
        cancelledOrders.forEach((order, index) => {
          response += `${index + 1}. Pedido #${order.orderId} - $${order.total.toLocaleString()}\n`;
        });
        
        response += `\n💰 *Total cancelado: $${cancelledOrders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}*\n\n`;
        response += `No se realizará ningún cobro por estos pedidos.\n\n`;
        response += `😔 Es un infortunio no poder continuar con tus pedidos en esta ocasión.\n\n`;
        response += `💙 Pero no te preocupes, estaremos aquí listos para atenderte próximamente cuando lo desees.\n\n`;
        response += `¡Gracias por contactarnos y esperamos verte pronto! 😊`;
      }
      
      console.log('✅ Cancelación procesada exitosamente');
      console.log('=====================================');
      
      return response;
      
    } catch (error) {
      console.error('❌ Error manejando cancelación:', error);
      return `Lo siento, hubo un problema al cancelar tu pedido. Por favor, contacta directamente con la sucursal para confirmar la cancelación. 😔`;
    }
  }
}

module.exports = AIService;