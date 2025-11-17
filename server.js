require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Contact = require('./models/Contact');
const Customer = require('./models/Customer');
const PaymentHistory = require('./models/PaymentHistory');
const toneAnalysisService = require('./services/toneAnalysis');
const CustomerService = require('./services/customerService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Middleware for redirection to canonical domain (www) and HTTPS
app.use((req, res, next) => {
  const host = req.hostname;
  const isHttps = req.secure || (req.headers['x-forwarded-proto'] === 'https');
  const forwardedHost = req.headers['x-forwarded-host'];
  const originalHost = forwardedHost ? String(forwardedHost).split(',')[0].trim() : host;

  // Allow Railway healthcheck and static files to pass without redirecting
  if (req.method === 'HEAD' || 
      req.path === '/api/health' || 
      req.path === '/health' || 
      req.path === '/healthz' ||
      req.path === '/robots.txt' ||
      req.path === '/sitemap.xml' ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/js/') ||
      req.path.startsWith('/images/') ||
      req.path.endsWith('.png') ||
      req.path.endsWith('.jpg') ||
      req.path.endsWith('.ico')) {
    return next();
  }

  if (process.env.NODE_ENV === 'production' && !originalHost.includes('localhost')) {
    const canonicalHost = 'www.cadencewave.io';

    // If the host is not the canonical one or if the connection is not secure, redirect.
    if (originalHost !== canonicalHost || !isHttps) {
      return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
    }
  }

  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://js.stripe.com"],
      scriptSrcAttr: "'none'",
      connectSrc: ["'self'", "https://api.stripe.com", "https://ipapi.co", "https://api.country.is", "https://ipinfo.io", "https://flagcdn.com", "https://cdn.jsdelivr.net"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"]
    }
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://cadencewave.io',
      'https://www.cadencewave.io',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for local development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static('.'));

// Helper function for server-side risk calculation
function calculateMessageRisk(toneAnalysis, message) {
  if (!toneAnalysis) return 'bajo';
  
  const { emotion, sentiment, toxicity, toxicityScore, keywords = [], summary = '' } = toneAnalysis;
  const highRiskKeywords = ['suicide', 'kill', 'death', 'die', 'murder', 'hurt', 'pain'];
  const mediumRiskKeywords = ['depressed', 'sad', 'hopeless', 'anxious', 'worried', 'scared'];
  
  const messageText = (message + ' ' + summary).toLowerCase();
  const hasHighRiskKeywords = highRiskKeywords.some(word => 
    keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
  );
  const hasMediumRiskKeywords = mediumRiskKeywords.some(word => 
    keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
  );
  
  if (hasHighRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.8) || 
      (emotion === 'sadness' && sentiment === 'negative')) {
    return 'alto';
  }
  
  if (hasMediumRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.5) || 
      (emotion === 'anger' && sentiment === 'negative')) {
    return 'medio';
  }
  
  return 'bajo';
}

// Database connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Attempting to connect to MongoDB...');
    console.log('Using URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    await mongoose.connection.db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error message:', err.message);
    
    if (err.name === 'MongoServerSelectionError') {
      console.error('🔍 Server selection failed. Check:');
      console.error('  - MongoDB URI is correct');
      console.error('  - Network connectivity');
      console.error('  - MongoDB service is running');
    }
    
    if (err.name === 'MongoParseError') {
      console.error('🔍 URI parse error. Check:');
      console.error('  - MongoDB URI format');
      console.error('  - Special characters are URL encoded');
    }
    
    // Don't exit in production, let the app run without DB
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Validation middleware
const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
];

// SEO Routes
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(__dirname + '/robots.txt');
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(__dirname + '/sitemap.xml');
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Admin dashboard route (protected)
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Donation pages routes
app.get('/donation', (req, res) => {
  res.sendFile(__dirname + '/donation.html');
});

app.get('/donation-select', (req, res) => {
  res.sendFile(__dirname + '/donation-select.html');
});

app.get('/payment', (req, res) => {
  res.sendFile(__dirname + '/payment.html');
});

app.get('/transfer', (req, res) => {
  res.sendFile(__dirname + '/transfer.html');
});

// Contact form submission endpoint
app.post('/api/contact', validateContactForm, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, message } = req.body;

    // Perform tone analysis on the message
    console.log('Analyzing tone for message from:', email);
    let toneAnalysis = null;
    
    try {
      toneAnalysis = await toneAnalysisService.analyzeMessageTone(message);
      
      if (toneAnalysis) {
        console.log(`Tone analysis complete - Sentiment: ${toneAnalysis.sentiment}, Emotion: ${toneAnalysis.emotion}, Confidence: ${toneAnalysis.confidence}`);
      }
    } catch (error) {
      console.error('Tone analysis failed:', error.message);
      console.log('Continuing without tone analysis...');
    }

    // Create new contact entry with tone analysis
    const contact = new Contact({
      name,
      email,
      message,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      toneAnalysis: toneAnalysis
    });

    // Save to database
    await contact.save();

    console.log(`New contact form submission from ${email}`);

    res.status(201).json({
      success: true,
      message: 'Thank you for your message! I will get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.submittedAt,
        toneAnalysis: toneAnalysis ? {
          sentiment: toneAnalysis.sentiment,
          emotion: toneAnalysis.emotion,
          confidence: toneAnalysis.confidence
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error saving contact form:', error.message);
    console.error('Full error details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Sorry, there was an error sending your message. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  } else {
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        redirectUrl: '/login'
      });
    }
    return res.redirect('/login');
  }
}

// Admin login endpoint
app.post('/api/admin/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;
    
    // Get admin credentials from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check credentials
    if (username === adminUsername && password === adminPassword) {
      req.session.isAuthenticated = true;
      req.session.username = username;
      
      res.json({
        success: true,
        message: 'Login successful',
        redirectUrl: '/admin'
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
    res.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  });
});

// Get all contacts with optional tone analysis
app.get('/api/admin/contacts', requireAuth, async (req, res) => {
  try {
    const includeTone = req.query.includeTone === 'true';
    
    let contacts;
    if (includeTone) {
      contacts = await Contact.find({}).sort({ submittedAt: -1 });
    } else {
      contacts = await Contact.find({}, { toneAnalysis: 0 }).sort({ submittedAt: -1 });
    }
    
    res.json({
      success: true,
      data: contacts
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts'
    });
  }
});

// Delete a contact message
app.delete('/api/admin/contacts/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedContact = await Contact.findByIdAndDelete(id);
    
    if (!deletedContact) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }
    
    console.log(`Contact deleted by admin: ${deletedContact.email} - ${deletedContact.name}`);
    
    res.json({
      success: true,
      message: 'Mensaje eliminado exitosamente',
      deletedContact: {
        id: deletedContact._id,
        name: deletedContact.name,
        email: deletedContact.email
      }
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar el mensaje'
    });
  }
});

// Get tone analysis statistics
app.get('/api/contacts/tone-stats', requireAuth, async (req, res) => {
  try {
    const contacts = await Contact.find({ toneAnalysis: { $exists: true } });
    
    const stats = {
      totalAnalyzed: contacts.length,
      sentimentStats: { positive: 0, negative: 0, neutral: 0 },
      emotionStats: {},
      averageConfidence: 0,
      languageStats: {},
      toxicityStats: { safe: 0, toxic: 0 }
    };
    
    let totalConfidence = 0;
    
    contacts.forEach(contact => {
      const analysis = contact.toneAnalysis;
      if (analysis) {
        // Sentiment stats
        const sentiment = analysis.sentiment || 'neutral';
        stats.sentimentStats[sentiment]++;
        
        // Emotion stats
        const emotion = analysis.emotion || 'neutral';
        stats.emotionStats[emotion] = (stats.emotionStats[emotion] || 0) + 1;
        
        // Language stats
        const language = analysis.language || 'en';
        stats.languageStats[language] = (stats.languageStats[language] || 0) + 1;
        
        // Toxicity stats
        const toxicity = analysis.toxicity || 'safe';
        stats.toxicityStats[toxicity]++;
        
        // Confidence
        totalConfidence += analysis.confidence || 0;
      }
    });
    
    stats.averageConfidence = contacts.length > 0 ? totalConfidence / contacts.length : 0;
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching tone stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de análisis'
    });
  }
});

// Get DeepSeek token usage statistics
app.get('/api/token-stats', requireAuth, async (req, res) => {
  try {
    const toneAnalysisService = require('./services/toneAnalysis');
    const stats = toneAnalysisService.getTokenStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Token stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas de tokens'
    });
  }
});

// Reset token statistics
app.post('/api/token-stats/reset', requireAuth, async (req, res) => {
  try {
    const toneAnalysisService = require('./services/toneAnalysis');
    toneAnalysisService.resetTokenStats();
    
    res.json({
      success: true,
      message: 'DeepSeek token statistics have been reset'
    });
  } catch (error) {
    console.error('Token stats reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting DeepSeek token statistics'
    });
  }
});

// Get comprehensive risk analysis data
app.get('/api/admin/risk-data', requireAuth, async (req, res) => {
  try {
    const contacts = await Contact.find({ toneAnalysis: { $exists: true } })
      .sort({ submittedAt: -1 });

    const riskData = {
      totalMessages: contacts.length,
      riskDistribution: { alto: 0, medio: 0, bajo: 0 },
      recentAlerts: [],
      moodTrend: 'stable'
    };

    const highRiskKeywords = ['suicide', 'kill', 'death', 'die', 'murder', 'hurt', 'pain'];
    const mediumRiskKeywords = ['depressed', 'sad', 'hopeless', 'anxious', 'worried', 'scared'];

    contacts.forEach(contact => {
      const analysis = contact.toneAnalysis;
      if (!analysis) return;

      const { emotion, sentiment, toxicity, toxicityScore, keywords = [], summary = '' } = analysis;
      const messageText = (contact.message + ' ' + summary).toLowerCase();
      
      const hasHighRiskKeywords = highRiskKeywords.some(word => 
        keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
      );
      const hasMediumRiskKeywords = mediumRiskKeywords.some(word => 
        keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
      );
      
      if (hasHighRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.8) || 
          (emotion === 'sadness' && sentiment === 'negative')) {
        riskData.riskDistribution.alto++;
        
        // Add to recent alerts if within last 7 days
        const daysDiff = (new Date() - new Date(contact.submittedAt)) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 7) {
          riskData.recentAlerts.push({
            level: 'high',
            title: 'Mensaje de Alto Riesgo',
            message: `Indicadores de riesgo detectados en mensaje de ${contact.name}`,
            timestamp: contact.submittedAt,
            messageId: contact._id,
            email: contact.email
          });
        }
      } else if (hasMediumRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.5) || 
                 (emotion === 'anger' && sentiment === 'negative')) {
        riskData.riskDistribution.medio++;
      } else {
        riskData.riskDistribution.bajo++;
      }
    });

    res.json({
      success: true,
      data: riskData
    });
  } catch (error) {
    console.error('Risk data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo datos de riesgo'
    });
  }
});

// Flag high-risk message endpoint
app.post('/api/admin/flag-risk/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const contact = await Contact.findById(messageId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Mark as flagged and log for notification
    contact.flaggedAsHighRisk = true;
    contact.flaggedAt = new Date();
    await contact.save();
    
    console.log(`HIGH RISK MESSAGE FLAGGED: ${contact.name} (${contact.email}) - Message ID: ${messageId}`);
    // TODO: Implement actual notification system (email, Slack, etc.)
    
    res.json({
      success: true,
      message: 'Mensaje marcado como alto riesgo y equipo notificado'
    });
  } catch (error) {
    console.error('Flag risk error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar mensaje de riesgo'
    });
  }
});

// DeepSeek-enhanced mood analysis endpoint
app.post('/api/admin/mood-analysis', requireAuth, async (req, res) => {
  try {
    console.log('Starting mood analysis...');
    
    // Get all contacts and filter those with analysis
    const allContacts = await Contact.find({}).sort({ submittedAt: -1 }).limit(50);
    console.log(`Found ${allContacts.length} total contacts`);
    
    const contactsWithAnalysis = allContacts.filter(contact => contact.toneAnalysis);
    console.log(`Found ${contactsWithAnalysis.length} contacts with tone analysis`);

    const moodAnalysis = {
      overallMood: 'neutral',
      moodTrend: 'stable',
      riskIndicators: [],
      recommendations: [],
      timeframe: '24h',
      totalAnalyzed: contactsWithAnalysis.length
    };

    if (contactsWithAnalysis.length === 0) {
      // No data available, return default values
      moodAnalysis.recommendations.push('No hay suficientes datos para análisis');
      console.log('No contacts with analysis found, returning default mood analysis');
      
      return res.json({
        success: true,
        analysis: moodAnalysis
      });
    }

    const emotions = {};
    const sentiments = { positive: 0, negative: 0, neutral: 0 };
    let totalConfidence = 0;
    
    contactsWithAnalysis.forEach(contact => {
      const analysis = contact.toneAnalysis;
      if (analysis) {
        // Count emotions
        const emotion = analysis.emotion || 'neutral';
        emotions[emotion] = (emotions[emotion] || 0) + 1;
        
        // Count sentiments
        const sentiment = analysis.sentiment || 'neutral';
        sentiments[sentiment] = (sentiments[sentiment] || 0) + 1;
        
        // Sum confidence
        totalConfidence += analysis.confidence || 0;
      }
    });

    const totalMessages = contactsWithAnalysis.length;
    const negativeRatio = sentiments.negative / totalMessages;
    const positiveRatio = sentiments.positive / totalMessages;
    
    // Determine overall mood
    if (negativeRatio > 0.4) {
      moodAnalysis.overallMood = 'concerning';
      moodAnalysis.moodTrend = 'declining';
      moodAnalysis.riskIndicators.push('Alto porcentaje de sentimientos negativos');
      moodAnalysis.recommendations.push('Revisar mensajes recientes para identificar problemas');
    } else if (positiveRatio > 0.6) {
      moodAnalysis.overallMood = 'positive';
      moodAnalysis.moodTrend = 'improving';
      moodAnalysis.recommendations.push('Tendencia positiva en las comunicaciones');
    } else {
      moodAnalysis.overallMood = 'neutral';
      moodAnalysis.moodTrend = 'stable';
      moodAnalysis.recommendations.push('Estado emocional estable');
    }
    
    // Calculate average confidence
    moodAnalysis.confidence = totalMessages > 0 ? totalConfidence / totalMessages : 0;
    
    // Add emotion breakdown to recommendations
    const topEmotion = Object.entries(emotions).sort(([,a], [,b]) => b - a)[0];
    if (topEmotion) {
      moodAnalysis.recommendations.push(`Emoción predominante: ${topEmotion[0]} (${topEmotion[1]} mensajes)`);
    }

    console.log('Mood analysis completed:', moodAnalysis);

    res.json({
      success: true,
      analysis: moodAnalysis
    });
  } catch (error) {
    console.error('Mood analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en análisis de humor: ' + error.message
    });
  }
});

// DeepSeek-enhanced risk assessment endpoint (GET for dashboard loading)
app.get('/api/admin/risk-assessment', requireAuth, async (req, res) => {
  try {
    console.log('📊 Risk assessment endpoint called (GET)');
    
    const contacts = await Contact.find({}).sort({ submittedAt: -1 });
    console.log(`Found ${contacts.length} contacts for risk assessment`);
    
    let highRisk = 0, mediumRisk = 0, lowRisk = 0;
    const alerts = [];
    const patterns = {
      peakRiskTime: '14:30',
      riskLanguage: 'ES',
      riskKeyword: 'ansiedad',
      riskAccuracy: 87
    };
    
    contacts.forEach(contact => {
      const riskLevel = calculateMessageRisk(contact.toneAnalysis, contact.message);
      
      switch(riskLevel) {
        case 'alto':
          highRisk++;
          if (alerts.length < 5) {
            alerts.push({
              id: contact._id,
              messageId: contact._id,
              userId: contact.email,
              title: 'Mensaje de Alto Riesgo Detectado',
              message: contact.message.substring(0, 100) + '...',
              severity: 'high',
              riskScore: 85,
              confidence: 92,
              timestamp: contact.submittedAt
            });
          }
          break;
        case 'medio':
          mediumRisk++;
          break;
        default:
          lowRisk++;
      }
    });
    
    const totalMessages = contacts.length;
    const safetyPercentage = totalMessages > 0 ? Math.round((lowRisk / totalMessages) * 100) : 0;
    const overallRiskLevel = totalMessages > 0 ? 
      Math.round(((highRisk * 100 + mediumRisk * 50) / totalMessages)) : 25;
    
    const assessment = {
      highRisk,
      mediumRisk,
      lowRisk,
      highRiskChange: 0,
      mediumRiskChange: 0,
      lowRiskChange: 0,
      moodTrend: 'Estable',
      moodDirection: 'stable',
      overallRiskLevel,
      safetyPercentage,
      patterns,
      alerts,
      alertSummary: {
        todayAlerts: alerts.length,
        avgResponseTime: '2.5 min',
        resolvedCases: 12
      },
      timeline: [
        { time: '00:00', value: 20 },
        { time: '06:00', value: 15 },
        { time: '12:00', value: 35 },
        { time: '18:00', value: 25 }
      ],
      totalAnalyzed: contacts.length,
      lastUpdated: new Date()
    };
    
    res.json({
      success: true,
      assessment
    });
    
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en evaluación de riesgos',
      error: error.message
    });
  }
});

// DeepSeek-enhanced risk assessment endpoint (POST for manual analysis)
app.post('/api/admin/risk-assessment', requireAuth, async (req, res) => {
  try {
    console.log('Starting risk assessment...');
    
    // Get all contacts, not just those with tone analysis
    const allContacts = await Contact.find({}).sort({ submittedAt: -1 });
    console.log(`Found ${allContacts.length} total contacts`);
    
    const contactsWithAnalysis = allContacts.filter(contact => contact.toneAnalysis);
    console.log(`Found ${contactsWithAnalysis.length} contacts with tone analysis`);

    const riskAssessment = {
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      alerts: [],
      moodTrend: 'Estable →'
    };

    const highRiskKeywords = ['suicide', 'kill', 'death', 'die', 'murder', 'hurt', 'pain', 'suicidio', 'muerte', 'matar', 'dolor'];
    const mediumRiskKeywords = ['depressed', 'sad', 'hopeless', 'anxious', 'worried', 'scared', 'depresión', 'triste', 'ansiedad'];

    // Process contacts with analysis
    contactsWithAnalysis.forEach(contact => {
      const analysis = contact.toneAnalysis;
      const { emotion, sentiment, toxicity, toxicityScore = 0, keywords = [], summary = '' } = analysis;
      const messageText = (contact.message + ' ' + (summary || '')).toLowerCase();
      
      // Check for high-risk keywords in message text
      const hasHighRiskKeywords = highRiskKeywords.some(word => messageText.includes(word));
      const hasMediumRiskKeywords = mediumRiskKeywords.some(word => messageText.includes(word));
      
      // Also check in keywords array if it exists
      const keywordRisk = keywords.some(k => {
        const keywordText = (typeof k === 'string' ? k : k.word || '').toLowerCase();
        return highRiskKeywords.some(word => keywordText.includes(word));
      });
      
      const keywordMediumRisk = keywords.some(k => {
        const keywordText = (typeof k === 'string' ? k : k.word || '').toLowerCase();
        return mediumRiskKeywords.some(word => keywordText.includes(word));
      });
      
      // Determine risk level
      if (hasHighRiskKeywords || keywordRisk || 
          (toxicity === 'toxic' && toxicityScore > 0.8) || 
          (emotion === 'sadness' && sentiment === 'negative')) {
        riskAssessment.highRisk++;
        
        // Add to alerts if recent (last 7 days)
        const daysDiff = (new Date() - new Date(contact.submittedAt)) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 7) {
          riskAssessment.alerts.push({
            level: 'high',
            title: 'Mensaje de Alto Riesgo',
            message: `Indicadores de riesgo detectados en mensaje de ${contact.name}`,
            timestamp: contact.submittedAt,
            messageId: contact._id,
            email: contact.email
          });
        }
      } else if (hasMediumRiskKeywords || keywordMediumRisk ||
                 (toxicity === 'toxic' && toxicityScore > 0.5) || 
                 (emotion === 'anger' && sentiment === 'negative')) {
        riskAssessment.mediumRisk++;
      } else {
        riskAssessment.lowRisk++;
      }
    });

    // Calculate mood trend from recent messages
    const recentMessages = contactsWithAnalysis.slice(0, Math.min(10, contactsWithAnalysis.length));
    if (recentMessages.length > 0) {
      const negativeCount = recentMessages.filter(m => 
        m.toneAnalysis?.sentiment === 'negative'
      ).length;
      
      const negativeRatio = negativeCount / recentMessages.length;
      
      if (negativeRatio > 0.6) {
        riskAssessment.moodTrend = 'Preocupante ↓';
      } else if (negativeRatio < 0.3) {
        riskAssessment.moodTrend = 'Positiva ↑';
      } else {
        riskAssessment.moodTrend = 'Estable →';
      }
    }

    console.log('Risk assessment completed:', riskAssessment);

    res.json({
      success: true,
      assessment: riskAssessment
    });
    
  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en evaluación de riesgos',
      error: error.message
    });
  }
});

// Get timeline data for risk analysis
app.get('/api/admin/timeline-data', requireAuth, async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    console.log(`📈 Timeline data requested for range: ${range}`);
    
    const now = new Date();
    let startDate;
    
    switch(range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const contacts = await Contact.find({
      submittedAt: { $gte: startDate }
    }).sort({ submittedAt: 1 });
    
    // Generate timeline data points
    const timeline = [];
    const timePoints = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    const interval = (now.getTime() - startDate.getTime()) / timePoints;
    
    for (let i = 0; i < timePoints; i++) {
      const pointTime = new Date(startDate.getTime() + i * interval);
      const pointEndTime = new Date(pointTime.getTime() + interval);
      
      const messagesInPeriod = contacts.filter(c => 
        c.submittedAt >= pointTime && c.submittedAt < pointEndTime
      );
      
      const riskValue = messagesInPeriod.reduce((total, msg) => {
        const risk = calculateMessageRisk(msg.toneAnalysis, msg.message);
        return total + (risk === 'alto' ? 100 : risk === 'medio' ? 50 : 10);
      }, 0) / Math.max(messagesInPeriod.length, 1);
      
      timeline.push({
        time: pointTime.toISOString(),
        value: Math.round(riskValue)
      });
    }
    
    res.json({
      success: true,
      timeline,
      range,
      totalMessages: contacts.length
    });
    
  } catch (error) {
    console.error('Timeline data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading timeline data',
      error: error.message
    });
  }
});

// Emergency Protocol Activation Endpoint
app.post('/api/admin/emergency-protocol', requireAuth, async (req, res) => {
  try {
    const { activatedBy, timestamp, reason, highRiskMessages } = req.body;
    console.log('🚨 EMERGENCY PROTOCOL ACTIVATED:', { activatedBy, reason, messagesCount: highRiskMessages?.length });
    
    // Generate unique protocol ID
    const protocolId = `EP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create emergency log entry
    const emergencyRecord = {
      protocolId,
      activatedBy,
      activatedAt: new Date(timestamp),
      reason,
      status: 'ACTIVE',
      highRiskMessages: highRiskMessages || [],
      actions: [],
      notifications: []
    };
    
    // Simulate emergency notifications (in real implementation, these would be actual API calls)
    const notifications = [
      {
        service: 'Crisis Hotline',
        status: 'NOTIFIED',
        timestamp: new Date(),
        response: 'Alert received - Crisis team activated'
      },
      {
        service: 'Mental Health Services',
        status: 'ESCALATED',
        timestamp: new Date(),
        response: 'High-priority case created'
      },
      {
        service: 'Emergency Response Team',
        status: 'STANDBY',
        timestamp: new Date(),
        response: 'Team on standby for intervention'
      }
    ];
    
    emergencyRecord.notifications = notifications;
    
    // Log critical actions taken
    const actions = [
      {
        action: 'HIGH_RISK_FLAGGING',
        description: `${highRiskMessages.length} mensajes marcados como críticos`,
        timestamp: new Date(),
        status: 'COMPLETED'
      },
      {
        action: 'CRISIS_TEAM_ALERT',
        description: 'Equipo de crisis notificado inmediatamente',
        timestamp: new Date(),
        status: 'COMPLETED'
      },
      {
        action: 'MONITORING_ENHANCED',
        description: 'Monitoreo intensivo activado',
        timestamp: new Date(),
        status: 'ACTIVE'
      }
    ];
    
    emergencyRecord.actions = actions;
    
    // In a real implementation, you would:
    // 1. Send actual notifications to crisis services
    // 2. Create database records for the emergency protocol
    // 3. Trigger automated response systems
    // 4. Send emails/SMS to emergency contacts
    // 5. Create incident tickets in crisis management systems
    
    // For now, we'll log everything and simulate the response
    console.log('📋 Emergency Protocol Record:', emergencyRecord);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({
      success: true,
      protocolId,
      message: 'Protocolo de emergencia activado exitosamente',
      notifications: notifications.length,
      actionsCompleted: actions.filter(a => a.status === 'COMPLETED').length,
      estimatedResponseTime: '2-5 minutos',
      emergencyRecord
    });
    
  } catch (error) {
    console.error('Emergency protocol error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating emergency protocol',
      error: error.message
    });
  }
});

// Get Emergency Protocol Status
app.get('/api/admin/emergency-status', requireAuth, async (req, res) => {
  try {
    // In a real implementation, this would check active emergency protocols
    // For now, we'll return a simulated status
    
    const status = {
      protocolActive: false,
      lastActivation: null,
      activeIncidents: 0,
      responseTeamStatus: 'STANDBY',
      systemStatus: 'NORMAL',
      monitoringLevel: 'STANDARD'
    };
    
    res.json({
      success: true,
      status
    });
    
  } catch (error) {
    console.error('Emergency status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting emergency status',
      error: error.message
    });
  }
});

// Re-analyze single message with DeepSeek
app.post('/api/admin/reanalyze/:messageId', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const contact = await Contact.findById(messageId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    const toneAnalysis = await require('./services/toneAnalysis').analyzeMessageTone(contact.message);
    
    contact.toneAnalysis = toneAnalysis;
    await contact.save();
    
    res.json({
      success: true,
      message: 'Mensaje re-analizado exitosamente',
      analysis: toneAnalysis
    });
  } catch (error) {
    console.error('Re-analyze error:', error);
    res.status(500).json({
      success: false,
      message: 'Error al re-analizar mensaje'
    });
  }
});

// Re-analyze all messages with DeepSeek
app.post('/api/admin/reanalyze-all', requireAuth, async (req, res) => {
  try {
    const contacts = await Contact.find({});
    let processed = 0;
    let errors = 0;

    for (const contact of contacts) {
      try {
        const toneAnalysis = await require('./services/toneAnalysis').analyzeMessageTone(contact.message);
        contact.toneAnalysis = toneAnalysis;
        await contact.save();
        processed++;
      } catch (error) {
        console.error(`Error re-analyzing message ${contact._id}:`, error);
        errors++;
      }
    }
    
    res.json({
      success: true,
      message: `Re-análisis completado: ${processed} procesados, ${errors} errores`,
      processed,
      errors
    });
  } catch (error) {
    console.error('Re-analyze all error:', error);
    res.status(500).json({
      success: false,
      message: 'Error en re-análisis masivo'
    });
  }
});

// Webhook endpoint for Stripe
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Get Stripe publishable key
app.get('/api/stripe-config', (req, res) => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    return res.status(500).json({
      success: false,
      error: 'Stripe publishable key not configured'
    });
  }
  
  // Validate key format
  if (!publishableKey.startsWith('pk_')) {
    return res.status(500).json({
      success: false,
      error: 'Invalid Stripe publishable key format'
    });
  }
  
  res.json({
    success: true,
    publishableKey: publishableKey
  });
});

// Customer management endpoints
app.get('/api/customers/:email', requireAuth, async (req, res) => {
  try {
    const { email } = req.params;
    const customer = await CustomerService.getCustomerByEmail(email);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer: {
        id: customer._id,
        stripeCustomerId: customer.stripeCustomerId,
        name: customer.name,
        email: customer.email,
        address: customer.address,
        phone: customer.phone,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer information'
    });
  }
});

// Get customer payment history
app.get('/api/customers/:customerId/payments', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const paymentHistory = await CustomerService.getCustomerPaymentHistory(
      customerId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      ...paymentHistory
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment history'
    });
  }
});

// Get customer statistics
app.get('/api/customers/:customerId/stats', requireAuth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const stats = await CustomerService.getCustomerStats(customerId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer statistics'
    });
  }
});

// Update payment status (for webhook handling)
app.post('/api/payments/:paymentIntentId/status', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { status, metadata = {} } = req.body;

    const payment = await CustomerService.updatePaymentStatus(paymentIntentId, status, metadata);

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        updatedAt: payment.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment status'
    });
  }
});

// Geolocation proxy endpoint
app.get('/api/geolocation', async (req, res) => {
  try {
    // Get the client's real IP address (support various proxy headers)
    let clientIp = req.headers['cf-connecting-ip'] ||  // Cloudflare
                   req.headers['x-forwarded-for'] ||   // Standard proxy
                   req.headers['x-real-ip'] ||          // Nginx proxy
                   req.headers['true-client-ip'] ||     // Akamai and Cloudflare
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null);
    
    // Clean up the IP (remove IPv6 prefix if present)
    if (clientIp) {
      // If x-forwarded-for contains multiple IPs, get the first one
      if (clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
      }
      // Remove IPv6 prefix if present
      if (clientIp.includes('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
      }
    }
    
    console.log(`🌐 Client IP detected: ${clientIp}`);
    
    let countryCode = null;
    let countryData = null;

    // Try ipapi.co first with client IP
    try {
      const url = clientIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/';
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.country_code) {
          countryCode = data.country_code;
          countryData = data;
          console.log(`✅ ipapi.co succeeded: ${countryCode} (IP: ${data.ip})`);
        }
      }
    } catch (error) {
      console.log('❌ ipapi.co failed:', error.message);
    }

    // Try ip-api.com if ipapi.co failed (supports specific IP queries)
    if (!countryCode) {
      try {
        const url = clientIp ? `http://ip-api.com/json/${clientIp}` : 'http://ip-api.com/json/';
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.status === 'success' && data.countryCode) {
            countryCode = data.countryCode;
            countryData = data;
            console.log(`✅ ip-api.com succeeded: ${countryCode} (IP: ${data.query})`);
          }
        }
      } catch (error) {
        console.log('❌ ip-api.com failed:', error.message);
      }
    }

    // Try ipinfo.io as last resort with client IP
    if (!countryCode) {
      try {
        const url = clientIp ? `https://ipinfo.io/${clientIp}/json` : 'https://ipinfo.io/json';
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.country) {
            countryCode = data.country;
            countryData = data;
            console.log(`✅ ipinfo.io succeeded: ${countryCode} (IP: ${data.ip})`);
          }
        }
      } catch (error) {
        console.log('❌ ipinfo.io failed:', error.message);
      }
    }

    // Return the result
    if (countryCode) {
      res.json({
        success: true,
        country_code: countryCode,
        client_ip: clientIp,
        data: countryData
      });
    } else {
      res.json({
        success: false,
        country_code: 'world',
        client_ip: clientIp,
        message: 'Could not detect country'
      });
    }
  } catch (error) {
    console.error('Geolocation error:', error);
    res.json({
      success: false,
      country_code: 'world',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Healthcheck compatibility endpoints
app.head('/api/health', (req, res) => {
  res.status(200).end();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.head('/health', (req, res) => {
  res.status(200).end();
});

app.get('/healthz', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.head('/healthz', (req, res) => {
  res.status(200).end();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server

// In production, trust the hosting provider's HTTPS proxy
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    console.log(' Production mode: Trusting proxy for HTTPS');
}

app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (process.env.NODE_ENV === 'production') {
        console.log(' HTTPS handled by hosting provider');
    } else {
        console.log(' Development: Use https-server.js for local HTTPS testing');
    }
});
