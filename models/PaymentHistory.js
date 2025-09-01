const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  stripePaymentIntentId: {
    type: String,
    required: [true, 'Stripe payment intent ID is required'],
    unique: true,
    trim: true
  },
  stripeCustomerId: {
    type: String,
    required: [true, 'Stripe customer ID is required'],
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    default: 'USD',
    maxlength: [3, 'Currency code must be 3 characters']
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'succeeded', 'failed', 'canceled', 'requires_action'],
    default: 'pending'
  },
  paymentMethod: {
    type: {
      type: String,
      enum: ['card', 'paypal', 'bank_transfer', 'other'],
      required: true
    },
    brand: String, // visa, mastercard, etc.
    last4: String, // last 4 digits for cards
    details: {
      type: Map,
      of: String,
      default: new Map()
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  receiptEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  fees: {
    stripeFee: {
      type: Number,
      default: 0
    },
    applicationFee: {
      type: Number,
      default: 0
    }
  },
  refunds: [{
    stripeRefundId: String,
    amount: Number,
    reason: String,
    status: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    type: Map,
    of: String,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date,
    default: null
  }
});

// Update the updatedAt field before saving
paymentHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
paymentHistorySchema.index({ stripePaymentIntentId: 1 });
paymentHistorySchema.index({ stripeCustomerId: 1 });
paymentHistorySchema.index({ customerId: 1 });
paymentHistorySchema.index({ status: 1 });
paymentHistorySchema.index({ createdAt: -1 });
paymentHistorySchema.index({ 'paymentMethod.type': 1 });

module.exports = mongoose.model('PaymentHistory', paymentHistorySchema);
