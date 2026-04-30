'use strict';

/**
 * CalendarAgent — Scheduling & Booking for CadenceWave
 *
 * Generates personalized tracked booking links, monitors scheduling
 * intent, and provides booking context to BAO and other agents.
 *
 * Configure via env vars:
 *   BOOKING_URL      — your Calendly / Cal.com URL
 *   BOOKING_DURATION — discovery call duration in minutes (default: 30)
 */

class CalendarAgent {
  constructor() {
    this.clicks   = new Map(); // email → { count, first, last, source }
    this.baseUrl  = process.env.BOOKING_URL  || 'https://cadencewave.io';
    this.duration = parseInt(process.env.BOOKING_DURATION || '30', 10);
  }

  // ── LINK GENERATION ────────────────────────────────────────────────────────

  generateLink(contact, source = 'direct') {
    const params = new URLSearchParams({
      name:         contact.name  || '',
      email:        contact.email || '',
      utm_source:   source,
      utm_medium:   'bao_agent',
      utm_campaign: 'discovery_call'
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  // ── CLICK TRACKING ─────────────────────────────────────────────────────────

  trackClick(email, source = 'unknown') {
    const key  = (email || '').toLowerCase().trim();
    const prev = this.clicks.get(key) || { count: 0, first: new Date() };
    prev.count++;
    prev.last   = new Date();
    prev.source = source;
    this.clicks.set(key, prev);
    console.log(`[CalendarAgent] Click: ${email} (${source}) — total: ${prev.count}`);
    return prev;
  }

  // ── CONTEXT FOR BAO ────────────────────────────────────────────────────────

  getBookingContext(lang = 'en') {
    const url = this.baseUrl;
    return lang === 'es'
      ? `Puedes agendar una llamada de descubrimiento gratuita de ${this.duration} minutos aquí: ${url}`
      : `You can schedule a free ${this.duration}-min discovery call here: ${url}`;
  }

  // ── INTENT DETECTION ───────────────────────────────────────────────────────

  hasHighIntent(email) {
    const data = this.clicks.get((email || '').toLowerCase().trim());
    return !!data && data.count >= 2;
  }

  detectBookingIntent(message) {
    const text = (message || '').toLowerCase();
    const keywords = [
      'schedule', 'book', 'meeting', 'call', 'demo', 'appointment',
      'agendar', 'reunión', 'cita', 'llamada', 'demostración', 'disponibilidad',
      'cuando', 'when', 'available', 'disponible', 'hablar', 'talk'
    ];
    return keywords.some(k => text.includes(k));
  }

  // ── STATS ──────────────────────────────────────────────────────────────────

  getStats() {
    const entries = [...this.clicks.entries()];
    return {
      uniqueVisitors: entries.length,
      totalClicks:    entries.reduce((s, [, v]) => s + v.count, 0),
      recent:         entries
        .sort(([, a], [, b]) => new Date(b.last) - new Date(a.last))
        .slice(0, 10)
        .map(([email, d]) => ({ email, ...d }))
    };
  }
}

module.exports = new CalendarAgent();
