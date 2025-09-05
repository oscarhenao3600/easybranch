const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const LoggerService = require('./LoggerService');

class PDFParserService {
  constructor() {
    this.logger = new LoggerService();
  }

  // Extraer texto de un PDF
  async extractTextFromPDF(filePath) {
    try {
      this.logger.info(`📄 Extrayendo texto del PDF: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Archivo PDF no encontrado');
      }

      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      
      const extractedText = pdfData.text;
      const pageCount = pdfData.numpages;
      
      this.logger.info(`✅ Texto extraído: ${extractedText.length} caracteres, ${pageCount} páginas`);
      
      return {
        text: extractedText,
        pageCount: pageCount,
        info: pdfData.info,
        metadata: pdfData.metadata
      };
      
    } catch (error) {
      this.logger.error(`Error extrayendo texto del PDF ${filePath}:`, error);
      throw error;
    }
  }

  // Procesar contenido del PDF para extraer productos/precios
  async processMenuContent(text, businessType = 'restaurant') {
    try {
      this.logger.info('🔍 Procesando contenido del menú');
      
      const sections = this.extractSections(text, businessType);
      const products = this.extractProducts(text, businessType);
      const prices = this.extractPrices(text);
      
      const processedContent = {
        sections: sections,
        products: products,
        prices: prices,
        rawText: text,
        processedAt: new Date()
      };
      
      this.logger.info(`✅ Contenido procesado: ${sections.length} secciones, ${products.length} productos`);
      
      return processedContent;
      
    } catch (error) {
      this.logger.error('Error procesando contenido del menú:', error);
      throw error;
    }
  }

  // Extraer secciones del menú
  extractSections(text, businessType) {
    const sections = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    let currentSection = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detectar encabezados de sección
      if (this.isSectionHeader(trimmedLine, businessType)) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          name: trimmedLine,
          content: '',
          products: []
        };
      } else if (currentSection) {
        currentSection.content += trimmedLine + '\n';
        
        // Detectar productos en esta sección
        if (this.isProductLine(trimmedLine, businessType)) {
          const product = this.parseProductLine(trimmedLine);
          if (product) {
            currentSection.products.push(product);
          }
        }
      }
    }
    
    // Agregar la última sección
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  }

  // Detectar si una línea es un encabezado de sección
  isSectionHeader(line, businessType) {
    const upperLine = line.toUpperCase();
    
    const sectionKeywords = {
      restaurant: ['MENÚ', 'ENTRADAS', 'PLATOS PRINCIPALES', 'POSTRES', 'BEBIDAS', 'ESPECIALES'],
      cafe: ['BEBIDAS', 'CAFÉ', 'TÉ', 'PASTELERÍA', 'SANDWICHES', 'ESPECIALES'],
      pharmacy: ['MEDICAMENTOS', 'CUIDADO PERSONAL', 'VITAMINAS', 'COSMÉTICOS', 'PRESCRIPCIÓN'],
      grocery: ['FRESCOS', 'LÁCTEOS', 'ENLATADOS', 'CONGELADOS', 'BEBIDAS', 'LIMPIEZA']
    };
    
    const keywords = sectionKeywords[businessType] || sectionKeywords.restaurant;
    
    return keywords.some(keyword => upperLine.includes(keyword)) || 
           (upperLine.length < 50 && /^[A-Z\s]+$/.test(upperLine));
  }

  // Detectar si una línea contiene un producto
  isProductLine(line, businessType) {
    const upperLine = line.toUpperCase();
    
    // Patrones comunes de productos
    const patterns = [
      /\d+\.?\s*[A-Z]/i,  // Número seguido de texto
      /[A-Z][a-z]+\s+\$?\d+/,  // Texto seguido de precio
      /[A-Z][a-z]+\s+[A-Z][a-z]+/  // Dos palabras en mayúscula
    ];
    
    return patterns.some(pattern => pattern.test(line)) && 
           !this.isSectionHeader(line, businessType) &&
           line.length > 3 && line.length < 100;
  }

  // Extraer productos del texto
  extractProducts(text, businessType) {
    const products = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (this.isProductLine(line, businessType)) {
        const product = this.parseProductLine(line);
        if (product) {
          products.push(product);
        }
      }
    }
    
    return products;
  }

  // Parsear una línea de producto
  parseProductLine(line) {
    try {
      // Buscar precio en la línea
      const priceMatch = line.match(/\$?(\d+(?:\.\d{2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;
      
      // Extraer nombre del producto
      let name = line;
      if (priceMatch) {
        name = line.replace(priceMatch[0], '').trim();
      }
      
      // Limpiar el nombre
      name = name.replace(/^\d+\.?\s*/, '').trim();
      
      if (name.length > 0) {
        return {
          name: name,
          price: price,
          description: '',
          available: true
        };
      }
      
      return null;
      
    } catch (error) {
      this.logger.error('Error parseando línea de producto:', error);
      return null;
    }
  }

  // Extraer precios del texto
  extractPrices(text) {
    const prices = [];
    const priceRegex = /\$?(\d+(?:\.\d{2})?)/g;
    let match;
    
    while ((match = priceRegex.exec(text)) !== null) {
      const price = parseFloat(match[1]);
      if (price > 0 && price < 10000) { // Rango razonable de precios
        prices.push({
          value: price,
          position: match.index,
          context: text.substring(Math.max(0, match.index - 20), match.index + 30)
        });
      }
    }
    
    return prices;
  }

  // Generar resumen del menú
  generateMenuSummary(processedContent) {
    const summary = {
      totalSections: processedContent.sections.length,
      totalProducts: processedContent.products.length,
      priceRange: {
        min: null,
        max: null,
        average: null
      },
      sections: processedContent.sections.map(section => ({
        name: section.name,
        productCount: section.products.length
      }))
    };
    
    // Calcular rango de precios
    const prices = processedContent.products
      .map(p => p.price)
      .filter(p => p !== null && p > 0);
    
    if (prices.length > 0) {
      summary.priceRange.min = Math.min(...prices);
      summary.priceRange.max = Math.max(...prices);
      summary.priceRange.average = prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    
    return summary;
  }

  // Validar contenido del PDF
  validatePDFContent(content) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };
    
    if (!content.text || content.text.length < 50) {
      validation.isValid = false;
      validation.errors.push('El PDF no contiene suficiente texto');
    }
    
    if (content.pageCount > 10) {
      validation.warnings.push('El PDF tiene muchas páginas, puede afectar el rendimiento');
    }
    
    if (content.text.length > 50000) {
      validation.warnings.push('El contenido es muy extenso, puede afectar el procesamiento');
    }
    
    return validation;
  }
}

module.exports = PDFParserService;
