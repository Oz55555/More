const OpenAI = require('openai');

class ToneAnalysisService {
  constructor() {
    this.openai = null;
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || null;
    this.tokenStats = {
      totalTokensUsed: 0,
      totalRequests: 0,
      totalCost: 0,
      dailyUsage: new Map(),
      lastReset: new Date().toDateString()
    };
    
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async analyzeMessageTone(message) {
    try {
      // Try DeepSeek first, then OpenAI, then fallback
      if (this.deepseekApiKey) {
        console.log('Using DeepSeek for tone analysis...');
        return await this.analyzeWithDeepSeek(message);
      } else if (this.openai) {
        console.log('Using OpenAI for tone analysis...');
        return await this.analyzeWithOpenAI(message);
      } else {
        console.warn('No API keys found. Using fallback analysis.');
        return await this.analyzeMessageToneSimple(message);
      }
    } catch (error) {
      console.error('Error in tone analysis:', error.message);
      
      // Try fallback if primary method fails
      return await this.analyzeMessageToneSimple(message);
    }
  }

  async analyzeWithDeepSeek(message) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert in sentiment and tone analysis. Analyze text and provide structured JSON responses about emotional tone, sentiment, toxicity, language, keywords, and topics. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: `Analyze the tone and sentiment of the following message. Provide a JSON response with this exact structure:
{
  "sentiment": "positive|negative|neutral",
  "emotion": "joy|sadness|anger|fear|surprise|disgust|neutral",
  "confidence": 0.0-1.0,
  "toxicity": "safe|toxic",
  "toxicityScore": 0.0-1.0,
  "language": "language_code",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "topics": ["topic1", "topic2", "topic3"],
  "summary": "Brief explanation of the analysis"
}

Message to analyze: "${message}"

Focus on:
- Overall sentiment (positive, negative, neutral)
- Primary emotion detected
- Confidence level (0-1 scale)
- Toxicity assessment
- Language detection
- Key topics and keywords
- Brief summary

Respond only with valid JSON.`
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.choices[0].message.content.trim();
      
      // Parse the JSON response
      const analysis = JSON.parse(responseText);
      
      // Validate the response structure
      if (!this.validateDeepSeekAnalysis(analysis)) {
        throw new Error('Invalid DeepSeek analysis response structure');
      }

      // Track token usage if available
      if (data.usage) {
        this.trackDeepSeekUsage(data.usage);
      }

      return {
        sentiment: analysis.sentiment,
        emotion: analysis.emotion,
        confidence: parseFloat(analysis.confidence),
        toxicity: analysis.toxicity,
        toxicityScore: parseFloat(analysis.toxicityScore),
        language: analysis.language,
        keywords: analysis.keywords || [],
        topics: analysis.topics || [],
        summary: analysis.summary,
        analyzedAt: new Date(),
        fullAnalysis: analysis
      };

    } catch (error) {
      console.error('DeepSeek analysis failed, using enhanced fallback:', error.message);
      const fallback = await this.analyzeMessageToneEnhanced(message);
      return {
        ...fallback,
        toxicity: 'safe',
        toxicityScore: 0.1,
        language: this.detectLanguage(message),
        keywords: this.extractKeywords(message),
        topics: this.extractTopics(message),
        fullAnalysis: null
      };
    }
  }

  validateDeepSeekAnalysis(analysis) {
    const validSentiments = ['positive', 'negative', 'neutral'];
    const validEmotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];
    const validToxicity = ['safe', 'toxic'];
    
    return (
      analysis &&
      validSentiments.includes(analysis.sentiment) &&
      validEmotions.includes(analysis.emotion) &&
      validToxicity.includes(analysis.toxicity) &&
      typeof analysis.confidence === 'number' &&
      analysis.confidence >= 0 &&
      analysis.confidence <= 1 &&
      typeof analysis.toxicityScore === 'number' &&
      analysis.toxicityScore >= 0 &&
      analysis.toxicityScore <= 1 &&
      typeof analysis.summary === 'string' &&
      analysis.summary.length <= 500
    );
  }

  trackDeepSeekUsage(usage) {
    if (!usage) return;

    const today = new Date().toDateString();
    
    // Reset daily stats if it's a new day
    if (this.tokenStats.lastReset !== today) {
      this.tokenStats.lastReset = today;
    }

    // Update total stats
    this.tokenStats.totalTokensUsed += usage.total_tokens || 0;
    this.tokenStats.totalRequests += 1;
    
    // Calculate cost (DeepSeek pricing: approximately $0.00014 per 1K input tokens, $0.00028 per 1K output tokens)
    const inputCost = (usage.prompt_tokens || 0) * 0.00014 / 1000;
    const outputCost = (usage.completion_tokens || 0) * 0.00028 / 1000;
    this.tokenStats.totalCost += inputCost + outputCost;

    // Track daily usage
    if (!this.tokenStats.dailyUsage.has(today)) {
      this.tokenStats.dailyUsage.set(today, {
        tokens: 0,
        requests: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0
      });
    }

    const dailyStats = this.tokenStats.dailyUsage.get(today);
    dailyStats.tokens += usage.total_tokens || 0;
    dailyStats.requests += 1;
    dailyStats.cost += inputCost + outputCost;
    dailyStats.inputTokens += usage.prompt_tokens || 0;
    dailyStats.outputTokens += usage.completion_tokens || 0;

    console.log(`DeepSeek API Usage - Tokens: ${usage.total_tokens}, Cost: $${(inputCost + outputCost).toFixed(6)}`);
  }


  extractKeywordsSimple(text) {
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const frequency = {};
    
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => ({ word, score: 1 }));
  }

  generateComprehensiveSummary({ sentiment, emotion, toxicity, language, keywords, topics }) {
    const parts = [];
    
    parts.push(`${sentiment.label} sentiment (${Math.round(sentiment.score * 100)}%)`);
    parts.push(`${emotion.label} emotion (${Math.round(emotion.score * 100)}%)`);
    
    if (toxicity.label === 'toxic') {
      parts.push(`⚠️ toxicity detected (${Math.round(toxicity.score * 100)}%)`);
    }
    
    if (language !== 'en') {
      parts.push(`language: ${language}`);
    }
    
    if (keywords.length > 0) {
      const keywordList = keywords.map(k => k.word || k).join(', ');
      parts.push(`keywords: ${keywordList}`);
    }
    
    return `Comprehensive analysis: ${parts.join(', ')}`;
  }


  async analyzeWithOpenAI(message) {
    const prompt = `Analyze the tone and sentiment of the following message. Provide a JSON response with the following structure:
{
  "sentiment": "positive|negative|neutral",
  "emotion": "joy|sadness|anger|fear|surprise|disgust|neutral",
  "confidence": 0.0-1.0,
  "summary": "Brief explanation of the tone analysis"
}

Message to analyze:
"${message}"

Focus on:
- Overall sentiment (positive, negative, neutral)
- Primary emotion detected
- Confidence level in your analysis (0-1 scale)
- Brief summary explaining your assessment

Respond only with valid JSON.`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert in sentiment and tone analysis. Analyze text and provide structured JSON responses about emotional tone, sentiment, and confidence levels."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    // Track token usage
    this.trackTokenUsage(completion.usage);

    const responseText = completion.choices[0].message.content.trim();
    
    // Parse the JSON response
    const analysis = JSON.parse(responseText);
    
    // Validate the response structure
    if (!this.validateAnalysis(analysis)) {
      throw new Error('Invalid analysis response structure');
    }

    return {
      sentiment: analysis.sentiment,
      emotion: analysis.emotion,
      confidence: parseFloat(analysis.confidence),
      summary: analysis.summary,
      analyzedAt: new Date()
    };
  }

  validateAnalysis(analysis) {
    const validSentiments = ['positive', 'negative', 'neutral'];
    const validEmotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'];
    
    return (
      analysis &&
      validSentiments.includes(analysis.sentiment) &&
      validEmotions.includes(analysis.emotion) &&
      typeof analysis.confidence === 'number' &&
      analysis.confidence >= 0 &&
      analysis.confidence <= 1 &&
      typeof analysis.summary === 'string' &&
      analysis.summary.length <= 500
    );
  }

  // Enhanced keyword analysis with better negative sentiment detection
  async analyzeMessageToneEnhanced(message) {
    const positiveWords = ['thank', 'great', 'excellent', 'amazing', 'love', 'wonderful', 'fantastic', 'awesome', 'happy', 'excited', 'good', 'best', 'perfect', 'brilliant', 'outstanding'];
    
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible', 'angry', 'frustrated', 'disappointed', 'sad', 'upset', 'kill', 'suicide', 'death', 'die', 'murder', 'destroy', 'hurt', 'pain', 'suffer', 'cry', 'depressed', 'hopeless', 'worthless', 'useless', 'fail', 'failure', 'broken', 'devastated', 'miserable', 'pathetic'];
    
    const strongNegativeWords = ['suicide', 'kill', 'murder', 'death', 'die', 'destroy', 'devastated', 'hopeless', 'worthless', 'pathetic'];
    
    const emotionWords = {
      anger: ['angry', 'mad', 'furious', 'rage', 'hate', 'kill', 'murder', 'destroy'],
      sadness: ['sad', 'cry', 'depressed', 'suicide', 'hopeless', 'miserable', 'devastated', 'broken'],
      fear: ['afraid', 'scared', 'terrified', 'panic', 'anxious', 'worried'],
      joy: ['happy', 'excited', 'joyful', 'cheerful', 'delighted', 'thrilled'],
      surprise: ['surprised', 'shocked', 'amazed', 'astonished'],
      disgust: ['disgusted', 'revolted', 'sick', 'gross']
    };

    const lowerMessage = message.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    let strongNegativeCount = 0;
    let emotionScores = {
      anger: 0,
      sadness: 0,
      fear: 0,
      joy: 0,
      surprise: 0,
      disgust: 0
    };

    // Count positive words
    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) positiveCount++;
    });

    // Count negative words with extra weight for strong negatives
    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        negativeCount++;
        if (strongNegativeWords.includes(word)) {
          strongNegativeCount++;
        }
      }
    });

    // Count emotion indicators
    Object.keys(emotionWords).forEach(emotion => {
      emotionWords[emotion].forEach(word => {
        if (lowerMessage.includes(word)) {
          emotionScores[emotion]++;
        }
      });
    });

    // Determine sentiment
    let sentiment = 'neutral';
    let confidence = 0.5;

    if (strongNegativeCount > 0) {
      sentiment = 'negative';
      confidence = Math.min(0.95, 0.8 + (strongNegativeCount * 0.1));
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      sentiment = 'negative';
      confidence = Math.min(0.9, 0.6 + (negativeCount * 0.1));
    } else if (positiveCount > negativeCount && positiveCount > 0) {
      sentiment = 'positive';
      confidence = Math.min(0.9, 0.6 + (positiveCount * 0.1));
    }

    // Determine primary emotion
    let emotion = 'neutral';
    let maxEmotionScore = 0;
    Object.keys(emotionScores).forEach(em => {
      if (emotionScores[em] > maxEmotionScore) {
        maxEmotionScore = emotionScores[em];
        emotion = em;
      }
    });

    // Default emotion based on sentiment if no specific emotion detected
    if (emotion === 'neutral') {
      if (sentiment === 'negative') {
        emotion = strongNegativeCount > 0 ? 'sadness' : 'anger';
      } else if (sentiment === 'positive') {
        emotion = 'joy';
      }
    }

    return {
      sentiment,
      emotion,
      confidence,
      summary: `Enhanced analysis: ${positiveCount} positive, ${negativeCount} negative (${strongNegativeCount} strong), emotion: ${emotion}`,
      analyzedAt: new Date()
    };
  }

  // Alternative analysis using a simpler keyword-based approach (fallback)
  async analyzeMessageToneSimple(message) {
    const positiveWords = ['thank', 'great', 'excellent', 'amazing', 'love', 'wonderful', 'fantastic', 'awesome', 'happy', 'excited', 'feliz', 'excelente', 'increíble', 'maravilloso', 'fantástico', 'genial', 'bueno', 'perfecto', 'contento', 'alegre'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible', 'angry', 'frustrated', 'disappointed', 'sad', 'upset', 'odio', 'terrible', 'malo', 'horrible', 'enojado', 'frustrado', 'decepcionado', 'triste', 'molesto', 'deprimido', 'desesperado'];
    const questionWords = ['help', 'question', 'how', 'what', 'when', 'where', 'why', 'can you', 'could you', 'ayuda', 'pregunta', 'cómo', 'qué', 'cuándo', 'dónde', 'por qué', 'puedes', 'podrías'];

    const lowerMessage = message.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    let questionCount = 0;

    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) positiveCount++;
    });

    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) negativeCount++;
    });

    questionWords.forEach(word => {
      if (lowerMessage.includes(word)) questionCount++;
    });

    let sentiment = 'neutral';
    let emotion = 'neutral';
    let confidence = 0.5;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      emotion = 'joy';
      confidence = Math.min(0.8, 0.5 + (positiveCount * 0.1));
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      emotion = negativeCount > 2 ? 'anger' : 'sadness';
      confidence = Math.min(0.8, 0.5 + (negativeCount * 0.1));
    }

    return {
      sentiment,
      emotion,
      confidence,
      toxicity: 'safe',
      toxicityScore: 0.1,
      language: this.detectLanguage(message),
      keywords: this.extractKeywords(message),
      topics: this.extractTopics(message),
      summary: `Simple keyword-based analysis: ${positiveCount} positive, ${negativeCount} negative, ${questionCount} question indicators`,
      analyzedAt: new Date()
    };
  }

  trackTokenUsage(usage) {
    if (!usage) return;

    const today = new Date().toDateString();
    
    // Reset daily stats if it's a new day
    if (this.tokenStats.lastReset !== today) {
      this.tokenStats.lastReset = today;
    }

    // Update total stats
    this.tokenStats.totalTokensUsed += usage.total_tokens || 0;
    this.tokenStats.totalRequests += 1;
    
    // Calculate cost (GPT-3.5-turbo pricing: $0.0015 per 1K input tokens, $0.002 per 1K output tokens)
    const inputCost = (usage.prompt_tokens || 0) * 0.0015 / 1000;
    const outputCost = (usage.completion_tokens || 0) * 0.002 / 1000;
    this.tokenStats.totalCost += inputCost + outputCost;

    // Track daily usage
    if (!this.tokenStats.dailyUsage.has(today)) {
      this.tokenStats.dailyUsage.set(today, {
        tokens: 0,
        requests: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0
      });
    }

    const dailyStats = this.tokenStats.dailyUsage.get(today);
    dailyStats.tokens += usage.total_tokens || 0;
    dailyStats.requests += 1;
    dailyStats.cost += inputCost + outputCost;
    dailyStats.inputTokens += usage.prompt_tokens || 0;
    dailyStats.outputTokens += usage.completion_tokens || 0;

    console.log(`OpenAI API Usage - Tokens: ${usage.total_tokens}, Cost: $${(inputCost + outputCost).toFixed(4)}`);
  }

  getTokenStats() {
    const today = new Date().toDateString();
    const todayStats = this.tokenStats.dailyUsage.get(today) || {
      tokens: 0,
      requests: 0,
      cost: 0,
      inputTokens: 0,
      outputTokens: 0
    };

    // Get last 7 days of usage
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayStats = this.tokenStats.dailyUsage.get(dateStr) || {
        tokens: 0,
        requests: 0,
        cost: 0,
        inputTokens: 0,
        outputTokens: 0
      };
      last7Days.push({
        date: dateStr,
        ...dayStats
      });
    }

    return {
      total: {
        tokensUsed: this.tokenStats.totalTokensUsed,
        requests: this.tokenStats.totalRequests,
        cost: this.tokenStats.totalCost
      },
      today: todayStats,
      last7Days: last7Days,
      averageTokensPerRequest: this.tokenStats.totalRequests > 0 
        ? Math.round(this.tokenStats.totalTokensUsed / this.tokenStats.totalRequests) 
        : 0
    };
  }

  resetTokenStats() {
    this.tokenStats = {
      totalTokensUsed: 0,
      totalRequests: 0,
      totalCost: 0,
      dailyUsage: new Map(),
      lastReset: new Date().toDateString()
    };
  }

  // Detect language based on common words and patterns
  detectLanguage(text) {
    const spanishWords = [
      'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'está', 'muy', 'todo', 'pero', 'más', 'hacer', 'ser', 'tiene', 'ya', 'me', 'cuando', 'puede', 'tiempo', 'cada', 'uno', 'vida', 'sobre', 'después', 'sin', 'lugar', 'años', 'trabajo', 'gobierno', 'día', 'grupo', 'durante', 'siempre', 'hasta', 'desde', 'tanto', 'menos', 'según', 'donde', 'mientras', 'quien', 'además', 'modo', 'bien', 'estado', 'forma', 'caso', 'nada', 'hacer', 'general', 'mismo', 'aunque', 'mucho', 'antes', 'mejor', 'aquí', 'sólo', 'frente', 'proceso', 'medio', 'social', 'realizar', 'llegar', 'pasar', 'punto', 'mayor', 'crear', 'seguir', 'tratarse', 'volver', 'vivir', 'momento', 'dar', 'gran', 'bajo', 'país', 'problema', 'mano', 'sistema', 'programa', 'cuestión', 'hacia', 'política', 'real', 'decir', 'si', 'nuestro', 'primer', 'encontrar', 'contra', 'cualquier', 'ciudad', 'estas', 'algunos', 'service', 'manera', 'tipo', 'parte', 'mundo', 'año', 'conseguir', 'presente', 'empresa', 'proyecto', 'producir', 'esperar', 'existir', 'considerar', 'resultado', 'igual', 'historia', 'comunidad', 'dentro', 'nivel', 'utilizar', 'precio', 'aparecer', 'valor', 'internacional', 'cambio', 'sentir', 'número', 'agua', 'llamar', 'desarrollo', 'parte', 'mayor', 'mercado', 'importante', 'activity', 'llevar', 'conocer', 'razón', 'mes', 'hombre', 'través', 'pueblo', 'mostrar', 'propio', 'empezar', 'creer', 'zona', 'colores', 'papá', 'mamá', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tío', 'tía', 'primo', 'prima', 'esposo', 'esposa', 'novio', 'novia', 'amigo', 'amiga', 'casa', 'hogar', 'familia', 'amor', 'corazón', 'feliz', 'triste', 'contento', 'alegre', 'enojado', 'preocupado', 'nervioso', 'tranquilo', 'cansado', 'enfermo', 'sano', 'fuerte', 'débil', 'joven', 'viejo', 'nuevo', 'viejo', 'grande', 'pequeño', 'alto', 'bajo', 'gordo', 'flaco', 'bonito', 'feo', 'bueno', 'malo', 'rico', 'pobre', 'rápido', 'lento', 'fácil', 'difícil', 'cerca', 'lejos', 'arriba', 'abajo', 'adelante', 'atrás', 'izquierda', 'derecha', 'dentro', 'fuera', 'encima', 'debajo', 'delante', 'detrás', 'entre', 'junto', 'separado', 'abierto', 'cerrado', 'lleno', 'vacío', 'limpio', 'sucio', 'caliente', 'frío', 'seco', 'mojado', 'duro', 'blando', 'suave', 'áspero', 'liso', 'rugoso', 'claro', 'oscuro', 'brillante', 'opaco', 'transparente', 'opaco', 'pesado', 'liviano', 'grueso', 'delgado', 'ancho', 'estrecho', 'largo', 'corto', 'profundo', 'superficial', 'alto', 'bajo', 'caro', 'barato', 'gratis', 'pagado', 'público', 'privado', 'común', 'raro', 'normal', 'extraño', 'conocido', 'desconocido', 'seguro', 'peligroso', 'útil', 'inútil', 'necesario', 'innecesario', 'posible', 'imposible', 'probable', 'improbable', 'cierto', 'falso', 'verdadero', 'mentira', 'correcto', 'incorrecto', 'perfecto', 'imperfecto', 'completo', 'incompleto', 'total', 'parcial', 'entero', 'roto', 'sano', 'enfermo', 'vivo', 'muerto', 'activo', 'inactivo', 'ocupado', 'libre', 'disponible', 'indisponible', 'presente', 'ausente', 'temprano', 'tarde', 'puntual', 'impuntual', 'rápido', 'lento', 'inmediato', 'tardío', 'actual', 'pasado', 'futuro', 'moderno', 'antiguo', 'reciente', 'viejo', 'fresco', 'rancio', 'maduro', 'verde', 'crudo', 'cocido', 'dulce', 'salado', 'amargo', 'ácido', 'picante', 'suave'
    ];
    
    const englishWords = [
      'the', 'of', 'and', 'to', 'a', 'in', 'is', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two', 'more', 'very', 'after', 'words', 'first', 'where', 'much', 'through', 'back', 'years', 'work', 'came', 'right', 'used', 'take', 'three', 'states', 'himself', 'few', 'house', 'use', 'during', 'without', 'again', 'place', 'american', 'around', 'however', 'home', 'small', 'found', 'mrs', 'thought', 'went', 'say', 'part', 'once', 'general', 'high', 'upon', 'school', 'every', 'don', 'does', 'got', 'united', 'left', 'number', 'course', 'war', 'until', 'always', 'away', 'something', 'fact', 'though', 'water', 'less', 'public', 'put', 'think', 'almost', 'hand', 'enough', 'far', 'took', 'head', 'yet', 'government', 'system', 'better', 'set', 'told', 'nothing', 'night', 'end', 'why', 'called', 'didn', 'eyes', 'find', 'going', 'look', 'asked', 'later', 'knew', 'let', 'great', 'year', 'come', 'since', 'against', 'go', 'came', 'right', 'used', 'take', 'three'
    ];

    const lowerText = text.toLowerCase();
    let spanishCount = 0;
    let englishCount = 0;

    // Count Spanish words
    spanishWords.forEach(word => {
      if (lowerText.includes(' ' + word + ' ') || lowerText.startsWith(word + ' ') || lowerText.endsWith(' ' + word)) {
        spanishCount++;
      }
    });

    // Count English words
    englishWords.forEach(word => {
      if (lowerText.includes(' ' + word + ' ') || lowerText.startsWith(word + ' ') || lowerText.endsWith(' ' + word)) {
        englishCount++;
      }
    });

    // Check for Spanish-specific patterns
    const spanishPatterns = [
      /ñ/, /á|é|í|ó|ú/, /¿/, /¡/, /ll/, /rr/, /ch/,
      /ción$/, /sión$/, /mente$/, /ando$/, /iendo$/
    ];
    
    let spanishPatternCount = 0;
    spanishPatterns.forEach(pattern => {
      if (pattern.test(lowerText)) {
        spanishPatternCount++;
      }
    });

    // Determine language
    if (spanishCount > englishCount || spanishPatternCount > 0) {
      return 'es';
    } else if (englishCount > spanishCount) {
      return 'en';
    } else {
      // Default fallback - try to detect by character patterns
      if (/[ñáéíóúü¿¡]/.test(text)) {
        return 'es';
      }
      return 'en';
    }
  }

  // Extract basic keywords from text
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\sáéíóúüñ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common stop words
    const stopWords = ['that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'para', 'esta', 'todo', 'pero', 'más', 'hacer', 'ser', 'tiene', 'cuando', 'puede', 'tiempo', 'cada', 'vida', 'sobre', 'después', 'lugar', 'años', 'trabajo', 'día', 'durante', 'siempre', 'hasta', 'desde', 'tanto', 'menos', 'según', 'donde', 'mientras', 'quien', 'además', 'modo', 'bien', 'estado', 'forma', 'caso', 'nada', 'hacer', 'general', 'mismo', 'aunque', 'mucho', 'antes', 'mejor', 'aquí', 'sólo', 'frente'];
    
    const keywords = words.filter(word => !stopWords.includes(word));
    
    // Return top 5 most frequent keywords
    const wordCount = {};
    keywords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  // Extract basic topics from text
  extractTopics(text) {
    const lowerText = text.toLowerCase();
    const topics = [];
    
    // Define topic keywords
    const topicKeywords = {
      'technology': ['computer', 'software', 'app', 'website', 'digital', 'online', 'internet', 'tech', 'sistema', 'aplicación', 'sitio web', 'digital', 'tecnología'],
      'business': ['work', 'job', 'company', 'business', 'money', 'pay', 'salary', 'career', 'trabajo', 'empresa', 'negocio', 'dinero', 'salario', 'carrera'],
      'health': ['health', 'doctor', 'medicine', 'sick', 'pain', 'hospital', 'treatment', 'salud', 'médico', 'medicina', 'enfermo', 'dolor', 'hospital', 'tratamiento'],
      'education': ['school', 'student', 'teacher', 'learn', 'study', 'education', 'class', 'escuela', 'estudiante', 'maestro', 'aprender', 'estudiar', 'educación', 'clase'],
      'family': ['family', 'mother', 'father', 'child', 'son', 'daughter', 'parent', 'familia', 'madre', 'padre', 'hijo', 'hija', 'papá', 'mamá'],
      'emotions': ['happy', 'sad', 'angry', 'love', 'hate', 'excited', 'worried', 'feliz', 'triste', 'enojado', 'amor', 'odio', 'emocionado', 'preocupado']
    };
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });
    
    return topics.slice(0, 3); // Return top 3 topics
  }
}

module.exports = new ToneAnalysisService(); 
