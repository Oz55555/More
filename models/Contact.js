const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  toneAnalysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: null
    },
    emotion: {
      type: String,
      enum: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'neutral'],
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null
    },
    summary: {
      type: String,
      maxlength: [500, 'Tone summary cannot exceed 500 characters'],
      default: null
    },
    analyzedAt: {
      type: Date,
      default: null
    }
  },
  leadAnalysis: {
    score: { type: Number, min: 0, max: 100 },
    qualification: {
      type: String,
      enum: ['hot', 'warm', 'cold', 'not_qualified']
    },
    intent: { type: String, maxlength: 200 },
    interestAreas: [{ type: String }],
    urgency: { type: String, enum: ['high', 'medium', 'low'] },
    companySignals: { type: Boolean, default: false },
    budgetSignals: { type: Boolean, default: false },
    summary: { type: String, maxlength: 400 },
    recommendedAction: { type: String, maxlength: 300 },
    language: { type: String, enum: ['es', 'en', 'other'], default: 'en' },
    analyzedAt: { type: Date }
  },
  emailStatus: {
    sent: { type: Boolean, default: false },
    sentAt: { type: Date, default: null },
    messageId: { type: String, default: null },
    subject: { type: String, default: null }
  },
  flaggedAsHighRisk: { type: Boolean, default: false },
  flaggedAt: { type: Date, default: null }
});

// Index for faster queries
contactSchema.index({ submittedAt: -1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', contactSchema);