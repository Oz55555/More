const { Resend } = require('resend');
const leadAnalysisService = require('./leadAnalysis');

class EmailService {
  constructor() {
    this.fromName = (process.env.EMAIL_FROM_NAME || 'Oscar Medina - Cadence Wave').replace(/[|<>]/g, '-');
    this.fromEmail = process.env.EMAIL_FROM || '';
  }

  getResend() {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    return new Resend(process.env.RESEND_API_KEY);
  }

  buildHtmlEmail(bodyHtml, recipientName) {
    const firstName = (recipientName || '').split(' ')[0];
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cadence Wave</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,83,155,0.10);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00539B 0%,#1e3a8a 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Cadence Wave</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;font-weight:400;">Digital Transformation · SAFe Agile · Consulting</p>
            </td>
          </tr>
          <!-- AI Badge -->
          <tr>
            <td style="background:#f0f7ff;padding:14px 40px;border-bottom:1px solid #e8f0fb;">
              <p style="margin:0;font-size:13px;color:#00539B;display:flex;align-items:center;gap:8px;">
                <span style="background:#00539B;color:#fff;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;letter-spacing:0.5px;">✦ NOVA AI</span>
                <span style="margin-left:8px;">This message was personalized by NOVA, our AI assistant</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 24px;color:#1f2937;font-size:15px;line-height:1.8;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 36px;text-align:center;">
              <a href="https://cadencewave.io" style="display:inline-block;background:linear-gradient(135deg,#00539B,#1e3a8a);color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                Explore Cadence Wave →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8faff;border-top:1px solid #e8f0fb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                © ${new Date().getFullYear()} Cadence Wave · <a href="https://cadencewave.io" style="color:#00539B;text-decoration:none;">cadencewave.io</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
                You received this email because you submitted a contact form at cadencewave.io.<br>
                Reply directly to this email to reach Oscar Medina.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendLeadOutreachEmail(contact) {
    if (!this.fromEmail) throw new Error('EMAIL_FROM environment variable is required');
    const resend = this.getResend();

    const emailContent = await leadAnalysisService.generateOutreachEmail(contact);
    const htmlBody = this.buildHtmlEmail(emailContent.bodyHtml, contact.name);

    const { data, error } = await resend.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: contact.email,
      reply_to: this.fromEmail,
      subject: emailContent.subject,
      text: emailContent.bodyText,
      html: htmlBody
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
