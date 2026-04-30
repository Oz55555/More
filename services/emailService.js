const { Resend } = require('resend');
const leadAnalysisService = require('./leadAnalysis');

class EmailService {
  constructor() {
    this.fromName = (process.env.EMAIL_FROM_NAME || 'CadenceWave').replace(/[|<>]/g, '-');
    this.fromEmail = process.env.EMAIL_FROM || '';
  }

  getResend() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    return new Resend(process.env.RESEND_API_KEY);
  }

  buildHtmlEmail(bodyHtml, recipientName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;padding:32px 24px;">
    <!-- Minimal header -->
    <div style="margin-bottom:28px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
      <img src="https://www.cadencewave.io/images/cw.png" alt="" width="28" height="28" style="vertical-align:middle;margin-right:8px;border-radius:4px;" />
      <span style="font-size:15px;font-weight:600;color:#111827;vertical-align:middle;">CadenceWave</span>
    </div>
    <!-- Body -->
    <div style="color:#111827;font-size:15px;line-height:1.7;">
      ${bodyHtml}
    </div>
    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        cadencewave.io &nbsp;·&nbsp; You're receiving this because you submitted a contact form on our site.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  async sendLeadOutreachEmail(contact) {
    const fromEmail = (process.env.EMAIL_FROM || '').trim();
    const fromName = this.fromName;
    if (!fromEmail) throw new Error('EMAIL_FROM environment variable is required');
    const fromField = `${fromName} <${fromEmail}>`;
    console.log('[EmailService] from field:', JSON.stringify(fromField));
    const resend = this.getResend();

    const emailContent = await leadAnalysisService.generateOutreachEmail(contact);
    const htmlBody = this.buildHtmlEmail(emailContent.bodyHtml, contact.name);

    const { data, error } = await resend.emails.send({
      from: fromField,
      to: contact.email,
      reply_to: this.fromEmail,
      subject: emailContent.subject,
      text: emailContent.bodyText,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MS-Exchange-Organization-SCL': '-1',
        'Precedence': 'personal'
      }
    });

    if (error) throw new Error(`Resend error: ${error.message}`);

    return {
      messageId: data.id,
      subject: emailContent.subject,
      previewText: emailContent.bodyText.substring(0, 200) + '...',
      sentTo: contact.email
    };
  }

  async sendWelcomeEmail(contact) {
    const fromEmail = (process.env.EMAIL_FROM || '').trim();
    if (!fromEmail) return;
    const resend = this.getResend();
    const firstName = contact.name.split(' ')[0];
    const lang = contact.leadAnalysis?.language || 'en';
    const isEs = lang === 'es';

    const subject = isEs
      ? `Hola ${firstName}, recibimos tu mensaje ✓`
      : `Hi ${firstName}, we received your message ✓`;

    const bodyText = isEs
      ? `Hola ${firstName},\n\nGracias por contactar a CadenceWave. Hemos recibido tu mensaje y nos pondremos en contacto contigo pronto.\n\nMientras tanto, puedes conocer más sobre nuestros servicios en cadencewave.io.\n\nSaludos,\nCadenceWave Team`
      : `Hi ${firstName},\n\nThank you for reaching out to CadenceWave. We've received your message and will get back to you shortly.\n\nIn the meantime, feel free to explore our services at cadencewave.io.\n\nBest regards,\nCadenceWave Team`;

    const bodyHtml = isEs
      ? `<p>Hola <strong>${firstName}</strong>,</p><p>Gracias por contactar a CadenceWave. Hemos recibido tu mensaje y nos pondremos en contacto contigo en las próximas horas.</p><p>Mientras tanto, puedes explorar nuestros servicios en <a href="https://cadencewave.io">cadencewave.io</a>.</p><p>Saludos,<br><strong>CadenceWave Team</strong></p>`
      : `<p>Hi <strong>${firstName}</strong>,</p><p>Thank you for reaching out to CadenceWave. We've received your message and will get back to you shortly.</p><p>In the meantime, feel free to explore our services at <a href="https://cadencewave.io">cadencewave.io</a>.</p><p>Best regards,<br><strong>CadenceWave Team</strong></p>`;

    const { error } = await resend.emails.send({
      from: `${this.fromName} <${fromEmail}>`,
      to: contact.email,
      reply_to: fromEmail,
      subject,
      text: bodyText,
      html: this.buildHtmlEmail(bodyHtml, contact.name),
      headers: { 'Precedence': 'personal', 'Importance': 'high' }
    });
    if (error) throw new Error(`Welcome email error: ${error.message}`);
    console.log(`Welcome email sent to ${contact.email}`);
  }

  async sendFollowUpEmail(contact) {
    const fromEmail = (process.env.EMAIL_FROM || '').trim();
    if (!fromEmail) return;
    const resend = this.getResend();
    const firstName = contact.name.split(' ')[0];
    const lang = contact.leadAnalysis?.language || 'en';
    const isEs = lang === 'es';

    const subject = isEs
      ? `${firstName}, ¿pudimos ayudarte?`
      : `${firstName}, just checking in`;

    const bodyText = isEs
      ? `Hola ${firstName},\n\nTe escribo para dar seguimiento a tu consulta de hace unos días. ¿Pudiste encontrar la información que necesitabas?\n\nEstamos disponibles para agendar una llamada de 30 minutos sin costo. Visita cadencewave.io para más información.\n\nSaludos,\nCadenceWave Team`
      : `Hi ${firstName},\n\nI wanted to follow up on your inquiry from a few days ago. Were you able to find the information you needed?\n\nWe'd love to schedule a free 30-min discovery call. Visit cadencewave.io to learn more.\n\nBest regards,\nCadenceWave Team`;

    const bodyHtml = isEs
      ? `<p>Hola <strong>${firstName}</strong>,</p><p>Te escribo para dar seguimiento a tu consulta. ¿Pudiste encontrar la información que necesitabas o tienes alguna pregunta?</p><p>Podemos agendar una <strong>llamada de descubrimiento de 30 minutos sin costo</strong> para hablar sobre cómo CadenceWave puede ayudarte.</p><p>→ <a href="https://cadencewave.io">cadencewave.io</a></p><p>Saludos,<br><strong>CadenceWave Team</strong></p>`
      : `<p>Hi <strong>${firstName}</strong>,</p><p>I wanted to follow up on your recent inquiry. Were you able to find what you needed, or do you have any questions?</p><p>We'd love to schedule a <strong>free 30-min discovery call</strong> to discuss how CadenceWave can help you.</p><p>→ <a href="https://cadencewave.io">cadencewave.io</a></p><p>Best regards,<br><strong>CadenceWave Team</strong></p>`;

    const { error } = await resend.emails.send({
      from: `${this.fromName} <${fromEmail}>`,
      to: contact.email,
      reply_to: fromEmail,
      subject,
      text: bodyText,
      html: this.buildHtmlEmail(bodyHtml, contact.name),
      headers: { 'Precedence': 'personal', 'Importance': 'high' }
    });
    if (error) throw new Error(`Follow-up email error: ${error.message}`);
    console.log(`Follow-up email sent to ${contact.email}`);
  }

  async sendWeeklyReport(adminEmail, stats) {
    const fromEmail = (process.env.EMAIL_FROM || '').trim();
    if (!fromEmail || !adminEmail) return;
    const resend = this.getResend();
    const { newLeads = [], hotLeads = 0, warmLeads = 0, emailsSent = 0, topIndustries = [] } = stats;

    const leadRows = newLeads.slice(0, 10).map(l =>
      `<tr><td style="padding:6px 10px">${l.name}</td><td style="padding:6px 10px">${l.leadAnalysis?.score ?? '—'}</td><td style="padding:6px 10px">${l.leadAnalysis?.qualification ?? '—'}</td><td style="padding:6px 10px">${l.industry ?? '—'}</td></tr>`
    ).join('');

    const bodyHtml = `
      <p>Weekly lead summary for <strong>CadenceWave</strong> — ${new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr style="background:#f3f4f6"><td style="padding:8px 10px"><strong>🔥 Hot Leads</strong></td><td style="padding:8px 10px">${hotLeads}</td></tr>
        <tr><td style="padding:8px 10px"><strong>🌡 Warm Leads</strong></td><td style="padding:8px 10px">${warmLeads}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px 10px"><strong>📧 Emails Sent</strong></td><td style="padding:8px 10px">${emailsSent}</td></tr>
        <tr><td style="padding:8px 10px"><strong>🏭 Top Industries</strong></td><td style="padding:8px 10px">${topIndustries.join(', ') || '—'}</td></tr>
      </table>
      ${newLeads.length > 0 ? `<br><p><strong>New leads this week:</strong></p><table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#f3f4f6"><th style="padding:6px 10px;text-align:left">Name</th><th>Score</th><th>Qualification</th><th>Industry</th></tr>${leadRows}</table>` : ''}
      <br><p>→ <a href="https://cadencewave.io/admin">View Admin Dashboard</a></p>`;

    const { error } = await resend.emails.send({
      from: `${this.fromName} <${fromEmail}>`,
      to: adminEmail,
      subject: `CadenceWave Weekly Report — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      text: `Weekly report: ${hotLeads} hot, ${warmLeads} warm, ${emailsSent} emails sent.`,
      html: this.buildHtmlEmail(bodyHtml, 'Admin'),
      headers: { 'Precedence': 'personal' }
    });
    if (error) throw new Error(`Weekly report error: ${error.message}`);
    console.log('Weekly report sent to', adminEmail);
  }

  async sendAdminAlert(contact, leadAnalysis, plan, bookingLink) {
    const fromEmail  = (process.env.EMAIL_FROM  || '').trim();
    const adminEmail = (process.env.ADMIN_EMAIL || fromEmail).trim();
    if (!fromEmail || !adminEmail) return;
    const resend = this.getResend();

    const score         = leadAnalysis?.score         ?? 0;
    const urgency       = leadAnalysis?.urgency       ?? 'low';
    const qualification = leadAnalysis?.qualification ?? 'unknown';
    const industry      = leadAnalysis?.industry      ?? '—';
    const intent        = leadAnalysis?.intent        ?? '—';
    const action        = plan?.action                ?? '—';
    const reason        = plan?.reason                ?? '—';

    const urgencyEmoji = urgency === 'high' ? '🚨' : urgency === 'medium' ? '⚠️' : '📋';
    const scoreColor   = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#6b7280';
    const subject      = `${urgencyEmoji} [BAO Agent] ${qualification.toUpperCase()} Lead — ${contact.name} (${score}/100)`;
    const dashUrl      = process.env.ADMIN_URL || 'https://cadencewave.io/admin';

    const bodyHtml = `
      <p style="font-size:16px"><strong>BAO detectó un lead ${qualification.toUpperCase()}.</strong> Aquí el resumen:</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin:16px 0">
        <tr style="background:#f3f4f6">
          <td style="padding:8px 12px;font-weight:600;width:140px">Score</td>
          <td style="padding:8px 12px"><strong style="color:${scoreColor};font-size:20px">${score}/100</strong></td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600">Calificación</td>
          <td style="padding:8px 12px">${qualification.toUpperCase()}</td>
        </tr>
        <tr style="background:#f3f4f6">
          <td style="padding:8px 12px;font-weight:600">Urgencia</td>
          <td style="padding:8px 12px">${urgency} ${urgencyEmoji}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600">Industria</td>
          <td style="padding:8px 12px">${industry}</td>
        </tr>
        <tr style="background:#f3f4f6">
          <td style="padding:8px 12px;font-weight:600">Intención</td>
          <td style="padding:8px 12px">${intent}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;font-weight:600">Nombre</td>
          <td style="padding:8px 12px">${contact.name}</td>
        </tr>
        <tr style="background:#f3f4f6">
          <td style="padding:8px 12px;font-weight:600">Email</td>
          <td style="padding:8px 12px"><a href="mailto:${contact.email}">${contact.email}</a></td>
        </tr>
      </table>
      <p><strong>Mensaje:</strong><br>
         <em style="color:#374151">"${contact.message.substring(0, 350)}${contact.message.length > 350 ? '...' : ''}"</em></p>
      <p style="background:#fef3c7;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:4px;font-size:13px">
        <strong>Decisión del Agente:</strong> ${action}<br>
        <span style="color:#6b7280">${reason}</span>
      </p>
      <p style="margin-top:24px">
        <a href="${bookingLink || dashUrl}" style="background:#1e40af;color:white;padding:11px 22px;text-decoration:none;border-radius:6px;display:inline-block;margin-right:10px;font-size:14px">📅 Enviar link de cita</a>
        <a href="${dashUrl}" style="background:#059669;color:white;padding:11px 22px;text-decoration:none;border-radius:6px;display:inline-block;font-size:14px">👁 Ver en Dashboard</a>
      </p>`;

    const { error } = await resend.emails.send({
      from:    `${this.fromName} <${fromEmail}>`,
      to:      adminEmail,
      subject,
      text:    `[BAO Agent] ${qualification.toUpperCase()} Lead — ${contact.name} (${score}/100) | ${urgency} urgency | ${contact.email}\n\nMensaje: ${contact.message.substring(0, 200)}`,
      html:    this.buildHtmlEmail(bodyHtml, 'Admin'),
      headers: { 'X-Priority': '1', 'Importance': 'high', 'Precedence': 'personal' }
    });
    if (error) throw new Error(`Admin alert error: ${error.message}`);
    console.log(`[AgentCore] Admin alert sent for ${contact.email} (${qualification} ${score}/100)`);
  }

  async verifyConnection() {
    try {
      const resend = this.getResend();
      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: this.fromEmail,
        subject: 'CadenceWave — Connection Test',
        text: 'Email service is working.'
      });
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Resend API connected' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
