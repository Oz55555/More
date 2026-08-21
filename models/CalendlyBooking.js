const mongoose = require('mongoose');

const calendlyBookingSchema = new mongoose.Schema({
  calendlyEventUuid:    { type: String, unique: true, required: true },
  calendlyInviteeUuid:  { type: String },
  name:        { type: String, required: true, trim: true },
  email:       { type: String, required: true, trim: true, lowercase: true },
  timezone:    { type: String, default: null },
  eventName:   { type: String, default: '30 Minute Meeting' },
  startTime:   { type: Date, required: true },
  endTime:     { type: Date, default: null },
  status:      { type: String, enum: ['scheduled', 'cancelled', 'rescheduled'], default: 'scheduled' },
  notes:       { type: String, default: null },
  cancelUrl:   { type: String, default: null },
  rescheduleUrl: { type: String, default: null },
  createdAt:   { type: Date, default: Date.now }
});

calendlyBookingSchema.index({ startTime: -1 });
calendlyBookingSchema.index({ email: 1 });

module.exports = mongoose.model('CalendlyBooking', calendlyBookingSchema);
