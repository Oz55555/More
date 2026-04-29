const cron = require('node-cron');
const Contact = require('../models/Contact');
const emailService = require('./emailService');

class SchedulerService {
  init() {
    this.scheduleFollowUps();
    this.scheduleWeeklyReport();
    console.log('BAO Scheduler: cron jobs initialized');
  }

  // Daily at 10:00 AM — follow up hot leads with no response after 3 days
  scheduleFollowUps() {
    cron.schedule('0 10 * * *', async () => {
      try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const candidates = await Contact.find({
          'leadAnalysis.qualification': 'hot',
          followUpSent: { $ne: true },
          'emailStatus.sent': true,
          submittedAt: { $lte: threeDaysAgo },
          isSpam: { $ne: true }
        }).limit(20);

        console.log(`BAO Follow-up scheduler: ${candidates.length} hot leads to follow up`);

        for (const contact of candidates) {
          try {
            await emailService.sendFollowUpEmail(contact);
            await Contact.findByIdAndUpdate(contact._id, { $set: { followUpSent: true } });
          } catch (err) {
            console.error(`Follow-up failed for ${contact.email}:`, err.message);
          }
        }
      } catch (err) {
        console.error('Follow-up scheduler error:', err.message);
      }
    }, { timezone: 'America/Mexico_City' });
  }

  // Every Monday at 8:00 AM — weekly summary to admin
  scheduleWeeklyReport() {
    cron.schedule('0 8 * * 1', async () => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
        if (!adminEmail) return;

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newLeads = await Contact.find({ submittedAt: { $gte: weekAgo }, isSpam: { $ne: true } })
          .sort({ 'leadAnalysis.score': -1 }).limit(20);

        const hotLeads  = newLeads.filter(l => l.leadAnalysis?.qualification === 'hot').length;
        const warmLeads = newLeads.filter(l => l.leadAnalysis?.qualification === 'warm').length;
        const emailsSent = newLeads.filter(l => l.emailStatus?.sent).length;

        // Top industries this week
        const industryCounts = {};
        newLeads.forEach(l => { if (l.industry) industryCounts[l.industry] = (industryCounts[l.industry] || 0) + 1; });
        const topIndustries = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

        await emailService.sendWeeklyReport(adminEmail, { newLeads, hotLeads, warmLeads, emailsSent, topIndustries });
      } catch (err) {
        console.error('Weekly report scheduler error:', err.message);
      }
    }, { timezone: 'America/Mexico_City' });
  }
}

module.exports = new SchedulerService();
