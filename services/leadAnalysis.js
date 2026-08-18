class LeadAnalysisService {
  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this._emailCache = new Map(); // contactId → emailContent
  }

  async analyzeLeadPotential(name, email, message) {
    try {
      if (this.deepseekApiKey) {
        return await this.analyzeWithDeepSeek(name, email, message);
      }
      if (this.openaiApiKey) {
        return await this.analyzeWithOpenAI(name, email, message);
      }
      return this.analyzeWithKeywords(message);
    } catch (error) {
      console.error('Lead analysis failed, using keyword fallback:', error.message);
      return this.analyzeWithKeywords(message);
    }
  }

  buildLeadPrompt(name, email, message) {
    const hour = new Date().getHours();
    const dow  = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const msgLen = message.length;
    return `You are a B2B lead analyst for CadenceWave (SAFe agile & digital transformation consultancy).
Analyze this contact form submission and return ONLY a JSON object — no text before or after.

Name: ${name} | Email: ${email}
Message (${msgLen} chars): "${message.substring(0, 400)}"
Submitted: ${dow}, hour ${hour}:00

Instructions:
1. SPAM detection: flag as spam if message is nonsense, test data, job application, competitor scraping, or contains only URLs/random chars.
2. INDUSTRY: detect sector (Technology, Finance, Healthcare, Retail, Manufacturing, Education, Government, Real Estate, Media, Other).
3. EXTRACT from message: company name, phone number, budget amount, project deadline (null if not found).
4. CONVERSION SCORE (0-100): combine lead score + time bonus (business hours +5, Mon-Thu +3) + message length bonus (>100 chars +5) + email domain bonus (corporate email +10).
5. INTEREST AREAS: list specific topics mentioned.

Return ONLY this JSON:
{
  "score": <0-100>,
  "qualification": "<hot|warm|cold|not_qualified>",
  "intent": "<5-10 words>",
  "interestAreas": ["..."],
  "urgency": "<high|medium|low>",
  "companySignals": <bool>,
  "budgetSignals": <bool>,
  "summary": "<2 sentences>",
  "recommendedAction": "<next step>",
  "language": "<es|en|other>",
  "industry": "<sector>",
  "extractedData": { "company": "<or null>", "phone": "<or null>", "budget": "<or null>", "deadline": "<or null>" },
  "isSpam": <bool>,
  "spamScore": <0-100>,
  "conversionScore": <0-100>
}

Scoring guide: 70-100=hot(clear need+company email), 40-69=warm(exploratory), 20-39=cold(general info), 0-19=not_qualified(spam/personal).`;
  }

  async analyzeWithDeepSeek(name, email, message) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.deepseekApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: this.buildLeadPrompt(name, email, message) }], temperature: 0.1, max_tokens: 500 }),
      signal: AbortSignal.timeout(8000)
    });
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error(`DeepSeek API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
    return this.parseLeadAnalysis(data.choices[0].message.content);
  }

  async analyzeWithOpenAI(name, email, message) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: this.buildLeadPrompt(name, email, message) }], temperature: 0.1, max_tokens: 500, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(8000)
    });
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error(`OpenAI API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
    return this.parseLeadAnalysis(data.choices[0].message.content);
  }

  parseLeadAnalysis(content) {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const raw = JSON.parse(jsonMatch[0]);

      return {
        score: Math.min(100, Math.max(0, parseInt(raw.score) || 0)),
        qualification: ['hot', 'warm', 'cold', 'not_qualified'].includes(raw.qualification)
          ? raw.qualification : 'cold',
        intent: String(raw.intent || 'General inquiry').substring(0, 200),
        interestAreas: Array.isArray(raw.interestAreas) ? raw.interestAreas.slice(0, 8) : [],
        urgency: ['high', 'medium', 'low'].includes(raw.urgency) ? raw.urgency : 'low',
        companySignals: Boolean(raw.companySignals),
        budgetSignals: Boolean(raw.budgetSignals),
        summary: String(raw.summary || '').substring(0, 400),
        recommendedAction: String(raw.recommendedAction || 'Review message').substring(0, 300),
        language: ['es', 'en', 'other'].includes(raw.language) ? raw.language : 'en',
        analyzedAt: new Date(),
        industry: raw.industry ? String(raw.industry).substring(0, 100) : null,
        extractedData: raw.extractedData && typeof raw.extractedData === 'object' ? {
          company:  raw.extractedData.company  || null,
          phone:    raw.extractedData.phone    || null,
          budget:   raw.extractedData.budget   || null,
          deadline: raw.extractedData.deadline || null
        } : null,
        isSpam: Boolean(raw.isSpam),
        spamScore: Math.min(100, Math.max(0, parseInt(raw.spamScore) || 0)),
        conversionScore: Math.min(100, Math.max(0, parseInt(raw.conversionScore) || 0))
      };
    } catch (error) {
      console.error('Lead parse failed:', error.message);
      return this.analyzeWithKeywords('');
    }
  }

  analyzeWithKeywords(message) {
    const text = (message || '').toLowerCase();
    let score = 10;
    const interestAreas = [];

    const businessKeywords = ['company', 'empresa', 'organization', 'organización', 'team', 'equipo', 'enterprise', 'startup', 'firma', 'corporate'];
    const serviceKeywords = ['consulting', 'consultoría', 'agile', 'ágil', 'safe', 'transformation', 'transformación', 'training', 'capacitación', 'coaching', 'implementation', 'implementación', 'framework', 'scrum', 'pi planning', 'art', 'devops'];
    const urgencyKeywords = ['asap', 'urgent', 'urgente', 'immediately', 'inmediatamente', 'soon', 'pronto', 'quarter', 'deadline', 'plazo', 'need to start'];
    const budgetKeywords = ['budget', 'presupuesto', 'invest', 'inversión', 'cost', 'costo', 'pricing', 'precio', 'rates', 'tarifas'];

    const bizCount = businessKeywords.filter(k => text.includes(k)).length;
    const svcCount = serviceKeywords.filter(k => text.includes(k)).length;
    const urgCount = urgencyKeywords.filter(k => text.includes(k)).length;
    const budCount = budgetKeywords.filter(k => text.includes(k)).length;

    score += bizCount * 12 + svcCount * 18 + urgCount * 8 + budCount * 10;
    score = Math.min(100, score);

    if (text.includes('safe') || text.includes('scaled agile')) interestAreas.push('SAFe');
    if (text.includes('agile') || text.includes('ágil') || text.includes('scrum')) interestAreas.push('Agile');
    if (text.includes('digital transformation') || text.includes('transformación digital')) interestAreas.push('Digital Transformation');
    if (text.includes('consult')) interestAreas.push('Consulting');
    if (text.includes('train') || text.includes('capacit')) interestAreas.push('Training');
    if (text.includes('coach')) interestAreas.push('Coaching');
    if (interestAreas.length === 0) interestAreas.push('General Inquiry');

    let qualification = 'not_qualified';
    if (score >= 70) qualification = 'hot';
    else if (score >= 40) qualification = 'warm';
    else if (score >= 20) qualification = 'cold';

    const hasSpanish = /[áéíóúñ]/.test(text) || ['empresa', 'quiero', 'necesito', 'ayuda'].some(w => text.includes(w));

    return {
      score,
      qualification,
      intent: svcCount > 0 ? 'Seeking transformation/agile services' : 'General inquiry',
      interestAreas,
      urgency: urgCount > 1 ? 'high' : urgCount > 0 ? 'medium' : 'low',
      companySignals: bizCount > 0,
      budgetSignals: budCount > 0,
      summary: `Lead score ${score}/100. Interests: ${interestAreas.join(', ')}.`,
      recommendedAction: score >= 70 ? 'Contact immediately — high value lead' : score >= 40 ? 'Send AI agent email within 24h' : 'Add to nurture sequence',
      language: hasSpanish ? 'es' : 'en',
      analyzedAt: new Date()
    };
  }

  async generateOutreachEmail(contact) {
    const { name, message, leadAnalysis } = contact;
    const lang = leadAnalysis?.language || 'en';
    const areas = (leadAnalysis?.interestAreas || []).join(', ') || 'digital transformation';
    const intent = leadAnalysis?.intent || 'your project';
    const cacheKey = String(contact._id);

    if (this._emailCache.has(cacheKey)) {
      console.log('Email cache hit for', cacheKey);
      return this._emailCache.get(cacheKey);
    }

    try {
      if (this.deepseekApiKey || this.openaiApiKey) {
        const result = await this.generateEmailWithAI(name, message, leadAnalysis, lang);
        this._emailCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('AI email generation failed, using template:', error.message);
    }

    const result = this.generateEmailTemplate(name, message, areas, intent, lang);
    this._emailCache.set(cacheKey, result);
    return result;
  }

  async generateEmailWithAI(name, message, leadAnalysis, lang) {
    const firstName = name.split(' ')[0];
    const interests = (leadAnalysis?.interestAreas || []).join(', ') || 'digital transformation';
    const prompt = `You are writing a personal reply email on behalf of CadenceWave (cadencewave.io), a digital transformation consultancy.
This email must look and feel like a personal message from a colleague — NOT a marketing or promotional email.
Detect the language of the client's message and write the entire response in that SAME language.

Client first name: ${firstName}
Full name: ${name}
Message: "${message.substring(0, 300)}"
Interests: ${interests}
Intent: ${leadAnalysis?.intent || 'general inquiry'}

SUBJECT LINE rules (critical):
- Plain, conversational, max 7 words. No punctuation at end.
- Must read like a human reply, not a campaign.
- Examples: "Re: your message to CadenceWave" / "Following up, ${firstName}" / "Your question about ${interests}"
- NEVER use: exclamation marks, ALL CAPS, emojis, "free", "offer", "opportunity", "sale", emotional phrases.

BODY rules:
- Write exactly as a knowledgeable colleague would reply to a colleague — short, direct, no hype.
- 3-4 short paragraphs max.
- Greet by first name: "Hola ${firstName}," or "Hi ${firstName},"
- Briefly address their specific question or need.
- Mention one concrete way CadenceWave can help (specific to their message, not generic).
- One soft call to action: suggest a quick call or reply to this email. NO aggressive CTAs.
- Sign as: "CadenceWave Team\ncadencewave.io"
- NO bullet lists, NO bold headers, NO promotional language like "benefits", "solutions", "transform your business".

Return ONLY JSON: {"subject":"...","bodyText":"...","bodyHtml":"<p>...</p>"}`;

    const apiKey = this.deepseekApiKey || this.openaiApiKey;
    const endpoint = this.deepseekApiKey
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const model = this.deepseekApiKey ? 'deepseek-chat' : 'gpt-4o-mini';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 900 }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error(`AI email API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
    const raw = data.choices[0].message.content;
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI email raw response (no JSON found):', raw.substring(0, 300));
      throw new Error('No JSON in AI email response');
    }

    const result = JSON.parse(jsonMatch[0]);
    const replacePlaceholders = (str) => str
      .replace(/\[nombre del contacto\]/gi, firstName)
      .replace(/\[nombre\]/gi, firstName)
      .replace(/\[name\]/gi, firstName)
      .replace(/\[contact name\]/gi, firstName)
      .replace(/\[cliente\]/gi, firstName);
    result.subject  = replacePlaceholders(result.subject  || '');
    result.bodyText = replacePlaceholders(result.bodyText || '');
    result.bodyHtml = replacePlaceholders(result.bodyHtml || '');
    return result;
  }

  generateEmailTemplate(name, message, areas, intent, lang) {
    const firstName = name.split(' ')[0];
    if (lang === 'es') {
      return {
        subject: `Re: tu mensaje a CadenceWave`,
        bodyText: `Hola ${firstName},\n\nGracias por escribirnos. Vi tu mensaje sobre ${intent} y quería responderte directamente.\n\nEn CadenceWave trabajamos en ${areas}. Si tienes unos minutos esta semana, podríamos hablar y ver si podemos ayudarte con lo que necesitas.\n\nMe puedes responder aquí o visitar cadencewave.io si quieres saber más antes.\n\nSaludos,\nCadenceWave Team\ncadencewave.io`,
        bodyHtml: `<p>Hola ${firstName},</p><p>Gracias por escribirnos. Vi tu mensaje sobre ${intent} y quería responderte directamente.</p><p>En CadenceWave trabajamos en ${areas}. Si tienes unos minutos esta semana, podríamos hablar y ver si podemos ayudarte con lo que necesitas.</p><p>Me puedes responder aquí o visitar <a href="https://cadencewave.io">cadencewave.io</a> si quieres saber más antes.</p><p>Saludos,<br>CadenceWave Team<br>cadencewave.io</p>`
      };
    }
    return {
      subject: `Re: your message to CadenceWave`,
      bodyText: `Hi ${firstName},\n\nThanks for getting in touch. I saw your message about ${intent} and wanted to reply directly.\n\nAt CadenceWave we work on ${areas}. If you have a few minutes this week, we could have a quick chat and see if we can help.\n\nFeel free to reply here or check cadencewave.io if you'd like to know more first.\n\nBest,\nCadenceWave Team\ncadencewave.io`,
      bodyHtml: `<p>Hi ${firstName},</p><p>Thanks for getting in touch. I saw your message about ${intent} and wanted to reply directly.</p><p>At CadenceWave we work on ${areas}. If you have a few minutes this week, we could have a quick chat and see if we can help.</p><p>Feel free to reply here or check <a href="https://cadencewave.io">cadencewave.io</a> if you'd like to know more first.</p><p>Best,<br>CadenceWave Team<br>cadencewave.io</p>`
    };
  }
}

module.exports = new LeadAnalysisService();
