const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const Contact = require('./models/Contact');
const toneAnalysisService = require('./services/toneAnalysis');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://moreeeee.up.railway.app',
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

// Serve static files
app.use(express.static('.'));

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

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Admin dashboard route
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
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
    const toneAnalysis = await toneAnalysisService.analyzeMessageTone(message);
    
    if (toneAnalysis) {
      console.log(`Tone analysis complete - Sentiment: ${toneAnalysis.sentiment}, Emotion: ${toneAnalysis.emotion}, Confidence: ${toneAnalysis.confidence}`);
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

// Get all contact submissions (admin endpoint)
app.get('/api/contacts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const includeTone = req.query.includeTone === 'true';

    let selectFields = '-ipAddress -userAgent';
    if (!includeTone) {
      selectFields += ' -toneAnalysis';
    }

    const contacts = await Contact.find()
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(selectFields);

    const total = await Contact.countDocuments();

    res.json({
      success: true,
      data: contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts'
    });
  }
});

// Get tone analysis statistics (admin endpoint)
app.get('/api/contacts/tone-stats', async (req, res) => {
  try {
    const stats = await Contact.aggregate([
      {
        $match: {
          'toneAnalysis.sentiment': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalAnalyzed: { $sum: 1 },
          sentimentBreakdown: {
            $push: '$toneAnalysis.sentiment'
          },
          emotionBreakdown: {
            $push: '$toneAnalysis.emotion'
          },
          averageConfidence: {
            $avg: '$toneAnalysis.confidence'
          }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalAnalyzed: 0,
          sentimentStats: {},
          emotionStats: {},
          averageConfidence: 0
        }
      });
    }

    const result = stats[0];
    
    // Count sentiment occurrences
    const sentimentStats = result.sentimentBreakdown.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    // Count emotion occurrences
    const emotionStats = result.emotionBreakdown.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalAnalyzed: result.totalAnalyzed,
        sentimentStats,
        emotionStats,
        averageConfidence: Math.round(result.averageConfidence * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error fetching tone statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tone statistics'
    });
  }
});

// Get OpenAI token usage statistics (admin endpoint)
app.get('/api/token-stats', async (req, res) => {
  try {
    const tokenStats = toneAnalysisService.getTokenStats();
    
    res.json({
      success: true,
      data: tokenStats
    });

  } catch (error) {
    console.error('Error fetching token statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching token statistics'
    });
  }
});

// Reset token statistics (admin endpoint)
app.post('/api/token-stats/reset', async (req, res) => {
  try {
    toneAnalysisService.resetTokenStats();
    
    res.json({
      success: true,
      message: 'Token statistics have been reset'
    });

  } catch (error) {
    console.error('Error resetting token statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting token statistics'
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
