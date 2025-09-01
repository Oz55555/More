const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Función para crear certificados auto-firmados simples
function createSelfSignedCert() {
  const forge = require('node-forge');
  const pki = forge.pki;

  // Generar par de llaves
  const keys = pki.rsa.generateKeyPair(2048);
  
  // Crear certificado
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [{
    name: 'commonName',
    value: 'localhost'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'Virginia'
  }, {
    name: 'localityName',
    value: 'Blacksburg'
  }, {
    name: 'organizationName',
    value: 'Test'
  }, {
    shortName: 'OU',
    value: 'Test'
  }];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }]
  }]);

  // Firmar certificado
  cert.sign(keys.privateKey);

  return {
    key: pki.privateKeyToPem(keys.privateKey),
    cert: pki.certificateToPem(cert)
  };
}

try {
  let options;

  // Intentar usar certificados existentes o crear nuevos
  if (fs.existsSync('server.key') && fs.existsSync('server.cert')) {
    console.log('📋 Usando certificados SSL existentes...');
    options = {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.cert')
    };
  } else {
    console.log('🔐 Generando certificados SSL para desarrollo...');
    
    try {
      // Intentar instalar node-forge si no está disponible
      require('node-forge');
    } catch (e) {
      console.log('📦 Instalando node-forge para generar certificados...');
      const { execSync } = require('child_process');
      execSync('npm install node-forge --save-dev', { stdio: 'inherit' });
    }

    const certs = createSelfSignedCert();
    
    // Guardar certificados
    fs.writeFileSync('server.key', certs.key);
    fs.writeFileSync('server.cert', certs.cert);
    
    options = {
      key: certs.key,
      cert: certs.cert
    };
    
    console.log('✅ Certificados SSL generados y guardados');
  }

  // Importar la aplicación Express existente
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
  const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
  const HTTP_PORT = process.env.PORT || 3000;

  // Configurar middleware igual que en server.js pero con HTTPS
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
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost:3443',
        'https://localhost:3000',
        'https://moreeeee.up.railway.app',
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('.'));

  // Additional headers for payment processing
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, stripe-signature');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Configurar sesiones
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true, // HTTPS requerido
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
  }));

  // Middleware de autenticación
  const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated) {
      return next();
    } else {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
  };

  // Importar todas las rutas del server.js original
  // Rutas básicas
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });

  app.get('/payment.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
  });

  app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
  });

  app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
  });

  // Endpoint de salud
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'HTTPS Server is running',
      timestamp: new Date().toISOString(),
      secure: true
    });
  });

  // Get Stripe publishable key
  app.get('/api/stripe-config', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    res.json({
      success: true,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  });

  // Create payment intent
  app.post('/api/create-payment-intent', async (req, res) => {
    try {
      // Set payment-specific headers
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, stripe-signature');
      res.header('Access-Control-Allow-Credentials', 'true');
      
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
      // Set payment-specific headers
      res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, stripe-signature');
      res.header('Access-Control-Allow-Credentials', 'true');
      
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

  // Conectar a MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/personal-website')
    .then(() => {
      console.log('✅ Conectado a MongoDB');
      
      // Crear servidor HTTPS
      const httpsServer = https.createServer(options, app);
      
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`🔒 Servidor HTTPS corriendo en https://localhost:${HTTPS_PORT}`);
        console.log('🎯 Stripe funcionará sin advertencias');
        console.log('⚠️  Acepta el certificado en tu navegador la primera vez');
      });

      // Nota: Solo servidor HTTPS para evitar conflictos de puerto
      console.log(`💡 Para HTTP normal, usa: npm start`);

    })
    .catch(err => {
      console.error('❌ Error conectando a MongoDB:', err);
    });

} catch (error) {
  console.error('❌ Error configurando servidor HTTPS:', error.message);
  console.log('💡 Ejecuta: npm install node-forge --save-dev');
  console.log('💡 O usa el servidor HTTP normal: npm start');
}
