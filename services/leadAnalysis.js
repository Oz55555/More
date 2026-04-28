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
    return `B2B lead analyst for Cadence Wave (SAFe agile consultancy). Score this contact form submission.

Name: ${name} | Email: ${email}
Message: "${message.substring(0, 400)}"

Return ONLY this JSON:
{"score":<0-100>,"qualification":"<hot|warm|cold|not_qualified>","intent":"<5-10 words>","interestAreas":["..."],"urgency":"<high|medium|low>","companySignals":<bool>,"budgetSignals":<bool>,"summary":"<2 sentences>","recommendedAction":"<next step>","language":"<es|en|other>"}

Scoring: 70-100=hot(clear business need+company), 40-69=warm(exploratory), 20-39=cold(general info), 0-19=not_qualified(spam/personal). ONLY JSON.`;
  }

  async analyzeWithDeepSeek(name, email, message) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.deepseekApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: this.buildLeadPrompt(name, email, message) }], temperature: 0.1, max_tokens: 350 }),
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
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: this.buildLeadPrompt(name, email, message) }], temperature: 0.1, max_tokens: 350, response_format: { type: 'json_object' } }),
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
        analyzedAt: new Date()
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
    const prompt = `You are a representative of Cadence Wave (cadencewave.io), a digital transformation consultancy.
Detect the language of the client's message and write the entire email in that SAME language.
Write a personalized outreach email to this contact form lead. Use their REAL name throughout the email.

Client first name: ${firstName}
Full name: ${name}
Message: "${message.substring(0, 300)}"
Interests: ${interests}
Intent: ${leadAnalysis?.intent || 'general inquiry'}

IMPORTANT:
- Use "${firstName}" as the greeting name — never use placeholders like [Name] or [Contact Name].
- Detect the language from the client's message and respond in that exact language.
- Email must: greet ${firstName}, acknowledge their need, mention 2 relevant CadenceWave benefits, mention BAO AI assistant (24/7), invite 30-min discovery call (cadencewave.io).
- Sign ONLY as: "CadenceWave Team\ncadencewave.io" — do NOT use any personal names.

Return ONLY JSON: {"subject":"...","bodyText":"...","bodyHtml":"<p>...</p>"}`;

    const apiKey = this.deepseekApiKey || this.openaiApiKey;
    const endpoint = this.deepseekApiKey
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';
    const model = this.deepseekApiKey ? 'deepseek-chat' : 'gpt-4o-mini';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 550 }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!data.choices?.[0]) throw new Error(`AI email API error: ${data.error?.message || data.message || JSON.stringify(data)}`);
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI email response');

    const result = JSON.parse(jsonMatch[0]);
    // Safety: replace any leftover placeholders with the real name
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
        subject: `Gracias por contactar a CadenceWave, ${firstName} 🚀`,
        bodyText: `Hola ${firstName},\n\nGracias por contactarnos sobre ${intent}. En CadenceWave nos especializamos en ${areas} y estaremos encantados de ayudarte.\n\nPodemos agendar una llamada de descubrimiento de 30 minutos para entender mejor tus necesidades. También tienes disponible BAO, nuestra asistente de IA, que puede responderte de inmediato.\n\nEscríbenos o visita cadencewave.io para más información.\n\nSaludos,\nCadenceWave Team\ncadencewave.io`,
        bodyHtml: `<p>Hola <strong>${firstName}</strong>,</p><p>Gracias por contactar a CadenceWave. Recibimos tu mensaje y nos da mucho gusto saber que estás interesado/a en <strong>${areas}</strong>.</p><p>En CadenceWave ayudamos a organizaciones a acelerar su transformación digital usando marcos ágiles como SAFe, logrando resultados concretos en tiempo récord.</p><p>Tienes disponible <strong>BAO</strong>, nuestra asistente de inteligencia artificial, para que puedas obtener respuestas inmediatas 24/7.</p><p><strong>¿Agendamos una llamada de descubrimiento de 30 min?</strong> → <a href="https://cadencewave.io">cadencewave.io</a></p><br><p>Saludos,<br><strong>CadenceWave Team</strong><br>cadencewave.io</p>`
      };
    }
    return {
      subject: `Thank you for reaching out to CadenceWave, ${firstName} 🚀`,
      bodyText: `Hi ${firstName},\n\nThank you for reaching out to CadenceWave about ${intent}. We specialize in ${areas} and we'd love to help.\n\nLet's schedule a 30-min discovery call to understand your needs better. You also have access to BAO, our AI assistant, for immediate answers 24/7.\n\nReply to this email or visit cadencewave.io to learn more.\n\nBest regards,\nCadenceWave Team\ncadencewave.io`,
      bodyHtml: `<p>Hi <strong>${firstName}</strong>,</p><p>Thank you for reaching out to CadenceWave. We received your message and we're excited about your interest in <strong>${areas}</strong>.</p><p>At CadenceWave, we help organizations accelerate digital transformation using proven agile frameworks like SAFe, delivering measurable results.</p><p><strong>BAO</strong>, our AI assistant, is available 24/7 to provide you with immediate answers — just reply to this email.</p><p><strong>Ready to explore how we can help?</strong> → <a href="https://cadencewave.io">cadencewave.io</a></p><br><p>Best regards,<br><strong>CadenceWave Team</strong><br>cadencewave.io</p>`
    };
  }
}

module.exports = new LeadAnalysisService();
