'use strict';

/**
 * AgentCore — Central AI Orchestrator for CadenceWave
 *
 * Interprets lead score + urgency + tone to determine the optimal
 * response strategy and coordinates all sub-agents:
 *   → Admin alert (HOT leads)
 *   → Booking link generation (CalendarAgent)
 *   → Priority classification
 *   → Decision log for admin dashboard
 */

const calendarAgent = require('./calendarAgent');

class AgentCore {
  constructor() {
    this.decisions = [];
    this.stats = {
      total:       0,
      immediate:   0,
      priority:    0,
      nurture:     0,
      lowPriority: 0,
      discarded:   0
    };
  }

  // ── MAIN ENTRY POINT ───────────────────────────────────────────────────────

  async processContact(contact, leadAnalysis, toneAnalysis) {
    const plan = this.determineActionPlan(leadAnalysis, toneAnalysis);

    console.log(
      `[AgentCore] ${contact.email} → ${plan.action}` +
      ` (score:${leadAnalysis?.score ?? 'N/A'}, urgency:${leadAnalysis?.urgency ?? 'N/A'})`
    );

    const result = {
      contactId:    String(contact._id),
      contactName:  contact.name,
      contactEmail: contact.email,
      action:       plan.action,
      priority:     plan.priority,
      reason:       plan.reason,
      bookingLink:  null,
      steps:        [],
      timestamp:    new Date()
    };

    for (const step of (plan.steps || [])) {
      try {
        const data = await this.executeStep(step, contact, leadAnalysis, toneAnalysis, plan);
        result.steps.push({ step, success: true, data });
      } catch (err) {
        console.error(`[AgentCore] Step "${step}" failed:`, err.message);
        result.steps.push({ step, success: false, error: err.message });
      }
    }

    if (!leadAnalysis?.isSpam) {
      result.bookingLink = calendarAgent.generateLink(contact, 'agent_core');
    }

    this._log(result, leadAnalysis);
    return result;
  }

  // ── DECISION MATRIX ────────────────────────────────────────────────────────

  determineActionPlan(leadAnalysis, toneAnalysis) {
    const score         = leadAnalysis?.score         ?? 0;
    const urgency       = leadAnalysis?.urgency       ?? 'low';
    const qualification = leadAnalysis?.qualification ?? 'cold';
    const isSpam        = leadAnalysis?.isSpam        ?? false;
    const sentiment     = toneAnalysis?.sentiment     ?? 'neutral';

    if (isSpam || qualification === 'not_qualified') {
      return {
        action:   'DISCARD',
        priority: 0,
        steps:    [],
        reason:   `Spam/not-qualified (score ${score})`
      };
    }

    if (score >= 70 && urgency === 'high') {
      return {
        action:   'IMMEDIATE_RESPONSE',
        priority: 10,
        steps:    ['send_admin_alert', 'offer_booking'],
        reason:   `🔥 HOT (${score}/100) + high urgency — act NOW`
      };
    }

    if (score >= 70) {
      return {
        action:   'PRIORITY_RESPONSE',
        priority: 8,
        steps:    ['send_admin_alert', 'offer_booking'],
        reason:   `🔥 HOT lead (${score}/100) — priority follow-up`
      };
    }

    if (score >= 40 && urgency === 'high') {
      return {
        action:   'NURTURE_URGENT',
        priority: 6,
        steps:    ['offer_booking'],
        reason:   `🌡 WARM (${score}/100) + high urgency`
      };
    }

    if (score >= 40) {
      return {
        action:   'NURTURE',
        priority: 4,
        steps:    ['offer_booking'],
        reason:   `🌡 WARM lead (${score}/100) — nurture sequence`
      };
    }

    if (score >= 20 && sentiment === 'negative') {
      return {
        action:   'CARE_RESPONSE',
        priority: 3,
        steps:    ['offer_booking'],
        reason:   `❄ Cold (${score}/100) + negative sentiment — show care`
      };
    }

    return {
      action:   'LOW_PRIORITY',
      priority: 1,
      steps:    [],
      reason:   `❄ Cold/low score (${score}/100) — no immediate action`
    };
  }

  // ── STEP EXECUTOR ──────────────────────────────────────────────────────────

  async executeStep(step, contact, leadAnalysis, _toneAnalysis, plan) {
    switch (step) {

      case 'send_admin_alert': {
        const emailService = require('./emailService');
        const adminEmail   = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
        if (!adminEmail) return { skipped: true, reason: 'ADMIN_EMAIL not configured' };
        const bookingLink = calendarAgent.generateLink(contact, 'admin_alert');
        await emailService.sendAdminAlert(contact, leadAnalysis, plan, bookingLink);
        return { alertSent: true, to: adminEmail };
      }

      case 'offer_booking': {
        const link = calendarAgent.generateLink(contact, 'offer_booking');
        return { bookingLink: link, offered: true };
      }

      default:
        return { unknown: step };
    }
  }

  // ── MEMORY / LOG ───────────────────────────────────────────────────────────

  _log(result, leadAnalysis) {
    this.stats.total++;
    const map = {
      IMMEDIATE_RESPONSE: 'immediate',
      PRIORITY_RESPONSE:  'priority',
      NURTURE_URGENT:     'nurture',
      NURTURE:            'nurture',
      CARE_RESPONSE:      'lowPriority',
      LOW_PRIORITY:       'lowPriority',
      DISCARD:            'discarded'
    };
    const key = map[result.action] || 'lowPriority';
    this.stats[key] = (this.stats[key] || 0) + 1;

    this.decisions.unshift({
      ...result,
      score:         leadAnalysis?.score,
      urgency:       leadAnalysis?.urgency,
      qualification: leadAnalysis?.qualification
    });
    if (this.decisions.length > 100) this.decisions.pop();
  }

  getDecisionLog(limit = 20) { return this.decisions.slice(0, limit); }
  getStats()                  { return { ...this.stats }; }
}

module.exports = new AgentCore();
