const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();

const Contact = require('./models/Contact');
const Customer = require('./models/Customer');
const PaymentHistory = require('./models/PaymentHistory');
const toneAnalysisService = require('./services/toneAnalysis');
const CustomerService = require('./services/customerService');

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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Admin dashboard route (protected)
app.get('/admin', requireAuth, (req, res) => {
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

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.isAuthenticated) {
    return next();
  } else {
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

// Check authentication status
app.get('/api/admin/status', (req, res) => {
  res.json({
    isAuthenticated: !!(req.session && req.session.isAuthenticated),
    username: req.session ? req.session.username : null
  });
});

// Get all contact submissions (admin endpoint)
app.get('/api/contacts', requireAuth, async (req, res) => {
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
app.get('/api/contacts/tone-stats', requireAuth, async (req, res) => {
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
app.get('/api/token-stats', requireAuth, async (req, res) => {
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
app.post('/api/token-stats/reset', requireAuth, async (req, res) => {
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

// Stripe payment routes

// Create payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    console.log('🔄 Creating payment intent with data:', req.body);
    
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return res.status(500).json({
        success: false,
        message: 'Payment system not configured'
      });
    }
    
    const { amount, currency = 'usd', paymentMethodType = 'card' } = req.body;
    console.log('💰 Payment details:', { amount, currency, paymentMethodType });

    if (!amount || amount < 0.50) { // Minimum $0.50
      console.log('❌ Invalid amount:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least $0.50'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      payment_method_types: [paymentMethodType],
      metadata: {
        type: 'donation',
        website: 'personal-website'
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    });
  }
});

// Confirm payment and save donation info
app.post('/api/confirm-payment', async (req, res) => {
  try {
    const {
      paymentIntentId,
      donorInfo,
      amount,
      message
    } = req.body;

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Create or update customer in Stripe and database
      const customer = await CustomerService.createOrUpdateCustomer({
        name: `${donorInfo.firstName} ${donorInfo.lastName}`,
        email: donorInfo.email,
        phone: donorInfo.phone || '',
        address: {
          line1: donorInfo.address,
          city: donorInfo.city,
          state: donorInfo.state,
          postalCode: donorInfo.zipCode,
          country: donorInfo.country
        },
        metadata: {
          source: 'donation_form',
          anonymous: donorInfo.anonymous || false
        }
      });

      // Record payment in payment history
      await CustomerService.recordPayment({
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.stripeCustomerId,
        amount: amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        paymentMethod: {
          type: 'card',
          brand: paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand || 'unknown',
          last4: paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4 || 'unknown'
        },
        description: message || 'Donation via credit card',
        receiptEmail: donorInfo.email,
        billingAddress: {
          line1: donorInfo.address,
          city: donorInfo.city,
          state: donorInfo.state,
          postalCode: donorInfo.zipCode,
          country: donorInfo.country
        },
        metadata: {
          type: 'donation',
          anonymous: donorInfo.anonymous || false,
          source: 'website'
        }
      });

      // Also save as contact for backward compatibility
      const donationRecord = new Contact({
        name: `${donorInfo.firstName} ${donorInfo.lastName}`,
        email: donorInfo.email,
        message: message || 'Donation via credit card',
        metadata: {
          type: 'donation',
          amount: amount,
          paymentMethod: 'credit_card',
          paymentIntentId: paymentIntentId,
          stripeChargeId: paymentIntent.latest_charge,
          stripeCustomerId: customer.stripeCustomerId
        }
      });

      await donationRecord.save();

      res.json({
        success: true,
        message: 'Payment confirmed and donation recorded',
        transactionId: paymentIntent.id,
        chargeId: paymentIntent.latest_charge,
        customerId: customer._id
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not successful',
        status: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment'
    });
  }
});

// Stripe webhook endpoint
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
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
      // Additional processing can be done here
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
  res.json({
    success: true,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
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



