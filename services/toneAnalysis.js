const OpenAI = require('openai');

class ToneAnalysisService {
  constructor() {
    this.openai = null;
    this.huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY || null;
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
      // Try Hugging Face first (free), then OpenAI, then fallback
      if (this.huggingFaceApiKey) {
        console.log('Using Hugging Face for tone analysis...');
        return await this.analyzeWithHuggingFace(message);
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

  async analyzeWithHuggingFace(message) {
    try {
      // Run multiple HF models in parallel for comprehensive analysis
      const analysisPromises = {
        sentiment: this.analyzeSentiment(message),
        emotion: this.analyzeEmotion(message),
        toxicity: this.analyzeToxicity(message),
        keywords: this.extractKeywords(message),
        language: this.detectLanguage(message),
        topics: this.classifyTopics(message)
      };

      const results = await Promise.allSettled(Object.values(analysisPromises));
      const analysis = {};
      
      // Process results
      const keys = Object.keys(analysisPromises);
      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === 'fulfilled') {
          analysis[key] = result.value;
        } else {
          console.warn(`${key} analysis failed:`, result.reason?.message);
          analysis[key] = null;
        }
      });

      // Fallback to enhanced analysis if HF models fail
      if (!analysis.sentiment) {
        const enhancedAnalysis = await this.analyzeMessageToneEnhanced(message);
        analysis.sentiment = {
          label: enhancedAnalysis.sentiment.toUpperCase(),
          score: enhancedAnalysis.confidence
        };
        analysis.emotion = {
          label: enhancedAnalysis.emotion,
          score: enhancedAnalysis.confidence
        };
      }

      // Process comprehensive results
      const sentiment = this.processSentimentResult(analysis.sentiment);
      const emotion = this.processEmotionResult(analysis.emotion);
      const toxicity = this.processToxicityResult(analysis.toxicity);
      const language = analysis.language?.label || 'en';
      const keywords = analysis.keywords || [];
      const topics = analysis.topics || [];

      const confidence = Math.max(
        sentiment.score || 0.5,
        emotion.score || 0.5,
        toxicity.score || 0.5
      );

      return {
        sentiment: sentiment.label,
        emotion: emotion.label,
        confidence,
        toxicity: toxicity.label,
        toxicityScore: toxicity.score,
        language,
        keywords: keywords.slice(0, 5), // Top 5 keywords
        topics: topics.slice(0, 3), // Top 3 topics
        summary: this.generateComprehensiveSummary({
          sentiment,
          emotion,
          toxicity,
          language,
          keywords,
          topics
        }),
        analyzedAt: new Date(),
        fullAnalysis: analysis // Store complete results
      };

    } catch (error) {
      console.error('Comprehensive HF analysis failed, using enhanced fallback:', error.message);
      const fallback = await this.analyzeMessageToneEnhanced(message);
      return {
        ...fallback,
        toxicity: 'safe',
        toxicityScore: 0.1,
        language: 'en',
        keywords: [],
        topics: [],
        fullAnalysis: null
      };
    }
  }

  async analyzeSentiment(text) {
    const models = [
      'cardiffnlp/twitter-roberta-base-sentiment-latest',
      'nlptown/bert-base-multilingual-uncased-sentiment'
    ];
    
    for (const model of models) {
      try {
        return await this.callHuggingFaceAPI(text, model);
      } catch (error) {
        continue;
      }
    }
    throw new Error('All sentiment models failed');
  }

  async analyzeEmotion(text) {
    const models = [
      'bhadresh-savani/distilbert-base-uncased-emotion',
      'j-hartmann/emotion-english-distilroberta-base'
    ];
    
    for (const model of models) {
      try {
        return await this.callHuggingFaceAPI(text, model);
      } catch (error) {
        continue;
      }
    }
    throw new Error('All emotion models failed');
  }

  async analyzeToxicity(text) {
    const models = [
      'unitary/toxic-bert',
      'martin-ha/toxic-comment-model'
    ];
    
    for (const model of models) {
      try {
        return await this.callHuggingFaceAPI(text, model);
      } catch (error) {
        continue;
      }
    }
    throw new Error('All toxicity models failed');
  }

  async extractKeywords(text) {
    try {
      return await this.callHuggingFaceAPI(text, 'yanekyuk/bert-keyword-extractor');
    } catch (error) {
      // Fallback to simple keyword extraction
      return this.extractKeywordsSimple(text);
    }
  }

  async detectLanguage(text) {
    try {
      return await this.callHuggingFaceAPI(text, 'papluca/xlm-roberta-base-language-detection');
    } catch (error) {
      return { label: 'en', score: 0.5 };
    }
  }

  async classifyTopics(text) {
    try {
      return await this.callHuggingFaceAPI(text, 'facebook/bart-large-mnli');
    } catch (error) {
      return [];
    }
  }

  processSentimentResult(result) {
    if (!result || !Array.isArray(result) || result.length === 0) {
      return { label: 'neutral', score: 0.5 };
    }
    
    const top = result[0];
    let label = 'neutral';
    
    if (top.label) {
      const labelLower = top.label.toLowerCase();
      if (labelLower.includes('positive') || labelLower === 'label_2' || labelLower === 'pos') {
        label = 'positive';
      } else if (labelLower.includes('negative') || labelLower === 'label_0' || labelLower === 'neg') {
        label = 'negative';
      }
    }
    
    return { label, score: top.score || 0.5 };
  }

  processEmotionResult(result) {
    if (!result || !Array.isArray(result) || result.length === 0) {
      return { label: 'neutral', score: 0.5 };
    }
    
    const top = result[0];
    return { 
      label: top.label?.toLowerCase() || 'neutral', 
      score: top.score || 0.5 
    };
  }

  processToxicityResult(result) {
    if (!result || !Array.isArray(result) || result.length === 0) {
      return { label: 'safe', score: 0.1 };
    }
    
    const top = result[0];
    const isToxic = top.label?.toLowerCase().includes('toxic') || top.score > 0.5;
    
    return {
      label: isToxic ? 'toxic' : 'safe',
      score: top.score || 0.1
    };
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

  async callHuggingFaceAPI(text, model) {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.huggingFaceApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: text })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
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
    const positiveWords = ['thank', 'great', 'excellent', 'amazing', 'love', 'wonderful', 'fantastic', 'awesome', 'happy', 'excited'];
    const negativeWords = ['hate', 'terrible', 'awful', 'bad', 'horrible', 'angry', 'frustrated', 'disappointed', 'sad', 'upset'];
    const questionWords = ['help', 'question', 'how', 'what', 'when', 'where', 'why', 'can you', 'could you'];

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
}

module.exports = new ToneAnalysisService(); 
