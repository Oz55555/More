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

  async verifyConnection() {
    try {
      const resend = this.getResend();
      const { data, error } = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: this.fromEmail,
        subject: 'Cadence Wave — Connection Test',
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
