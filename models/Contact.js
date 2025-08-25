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
  }
});

// Index for faster queries
contactSchema.index({ submittedAt: -1 });
contactSchema.index({ email: 1 });

module.exports = mongoose.model('Contact', contactSchema);