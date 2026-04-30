// Lead Capture Agent Dashboard — CadenceWave
class LeadCaptureAgent {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.leads = [];
        this.filteredLeads = [];
        this.currentFilter = 'all';
        this.currentLeadId = null;
        this.charts = {};
        this.stats = {};
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadLeads();
        await this.loadTokenStats();
        this.renderCharts();
    }

    // ── EVENT BINDING ──────────────────────────────────────────────────────────

    bindEvents() {
        const bind = (id, event, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, fn.bind(this));
        };

        bind('refreshBtn', 'click', async () => { await this.loadLeads(); await this.loadTokenStats(); });
        bind('logoutBtn', 'click', this.logout);
        bind('rescoreAllBtn', 'click', this.rescoreAll);
        bind('exportLeadsBtn', 'click', this.exportCSV);
        bind('emailStatusBtn', 'click', this.checkEmailStatus);

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.applyFilter();
            });
        });

        // Search
        const search = document.getElementById('leadSearch');
        if (search) search.addEventListener('input', () => this.applyFilter());

        // Modal close buttons
        bind('closeLeadModal', 'click', this.closeModal);
        bind('closeModalFooterBtn', 'click', this.closeModal);
        bind('previewEmailBtn', 'click', this.previewEmail);
        bind('sendEmailBtn', 'click', this.sendEmail);
        bind('rescoreLeadBtn', 'click', this.rescoreCurrent);

        // Close modal on overlay click
        const modal = document.getElementById('leadModal');
        if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) this.closeModal(); });
    }

    // ── DATA LOADING ───────────────────────────────────────────────────────────

    async loadLeads() {
        this.setTableLoading();
        try {
            const [leadsRes, statsRes] = await Promise.all([
                this.apiFetch('/admin/leads'),
                this.apiFetch('/admin/leads/stats')
            ]);

            if (!leadsRes || !statsRes) return;

            this.leads = leadsRes.data || [];
            this.stats = statsRes.stats || {};

            this.renderStats();
            this.renderPipeline();
            this.applyFilter();
        } catch (err) {
            console.error('Load leads error:', err);
            this.setTableError('Error al cargar leads. Verifique su conexión.');
        }
    }

    async loadTokenStats() {
        try {
            const data = await this.apiFetch('/token-stats');
            if (!data) return;
            this.tokenStats = data.data;
            this.updateTokenCards();
            this.renderTokenChart();
        } catch (err) {
            console.error('Token stats error:', err);
        }
    }

    // ── STATS RENDER ───────────────────────────────────────────────────────────

    renderStats() {
        const s = this.stats;
        this.setText('statHot', s.hot || 0);
        this.setText('statWarm', s.warm || 0);
        this.setText('statCold', s.cold || 0);
        this.setText('statEmails', s.emailsSent || 0);
        this.setText('statTotal', s.total || 0);
        this.setText('statCompany', s.companyLeads || 0);
        const badge = document.getElementById('tokenBadge');
        if (badge && this.tokenStats) {
            badge.textContent = `${this.tokenStats.total?.requests || 0} requests`;
        }
    }

    // ── PIPELINE RENDER ────────────────────────────────────────────────────────

    renderPipeline() {
        const hot = this.leads.filter(l => l.leadAnalysis?.qualification === 'hot');
        const warm = this.leads.filter(l => l.leadAnalysis?.qualification === 'warm');
        const cold = this.leads.filter(l => !['hot','warm'].includes(l.leadAnalysis?.qualification));

        this.setText('pipelineHot', hot.length);
        this.setText('pipelineWarm', warm.length);
        this.setText('pipelineCold', cold.length);

        this.renderPipelineList('pipelineHotList', hot.slice(0, 4));
        this.renderPipelineList('pipelineWarmList', warm.slice(0, 4));
        this.renderPipelineList('pipelineColdList', cold.slice(0, 4));
    }

    renderPipelineList(containerId, leads) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (leads.length === 0) {
            el.innerHTML = '<p class="pipeline-empty">Sin leads</p>';
            return;
        }
        el.innerHTML = leads.map(l => `
            <div class="pipeline-card" data-id="${l._id}" title="${this.esc(l.leadAnalysis?.intent || '')}">
                <div class="pc-name">${this.esc(l.name)}</div>
                <div class="pc-meta">
                    <span class="score-pill">${l.leadAnalysis?.score ?? '?'}</span>
                    <span class="pc-intent">${this.esc((l.leadAnalysis?.intent || 'General').substring(0, 30))}</span>
                </div>
            </div>
        `).join('');
        el.querySelectorAll('.pipeline-card').forEach(card => {
            card.addEventListener('click', () => this.openModal(card.dataset.id));
        });
    }

    // ── FILTER & TABLE ─────────────────────────────────────────────────────────

    applyFilter() {
        const search = (document.getElementById('leadSearch')?.value || '').toLowerCase();
        const filter = this.currentFilter;

        this.filteredLeads = this.leads.filter(l => {
            const q = l.leadAnalysis?.qualification;
            const emailSent = l.emailStatus?.sent;

            if (filter === 'hot' && q !== 'hot') return false;
            if (filter === 'warm' && q !== 'warm') return false;
            if (filter === 'cold' && !['cold', 'not_qualified', null, undefined].includes(q)) return false;
            if (filter === 'emailed' && !emailSent) return false;
            if (filter === 'pending' && emailSent) return false;

            if (search) {
                const nameMatch = (l.name || '').toLowerCase().includes(search);
                const emailMatch = (l.email || '').toLowerCase().includes(search);
                const msgMatch = (l.message || '').toLowerCase().includes(search);
                if (!nameMatch && !emailMatch && !msgMatch) return false;
            }
            return true;
        });

        // Dynamic prioritization: sort by conversionScore → leadScore → urgency
        this.filteredLeads.sort((a, b) => {
            const urgOrder = { high: 3, medium: 2, low: 1 };
            const aConv = a.conversionScore ?? a.leadAnalysis?.score ?? 0;
            const bConv = b.conversionScore ?? b.leadAnalysis?.score ?? 0;
            if (bConv !== aConv) return bConv - aConv;
            const aUrg = urgOrder[a.leadAnalysis?.urgency] || 0;
            const bUrg = urgOrder[b.leadAnalysis?.urgency] || 0;
            return bUrg - aUrg;
        });

        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('leadsTableBody');
        if (!tbody) return;

        if (this.filteredLeads.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="loading"><i class="fas fa-inbox"></i> Sin leads para mostrar</td></tr>`;
            return;
        }

        tbody.innerHTML = this.filteredLeads.map(l => {
            const la = l.leadAnalysis || {};
            const es = l.emailStatus || {};
            const score = la.score ?? '—';
            const qual = la.qualification || 'unknown';
            const date = new Date(l.submittedAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });

            const scoreClass = score >= 70 ? 'score-hot' : score >= 40 ? 'score-warm' : 'score-cold';
            const qualLabel = { hot:'🔥 Hot', warm:'🌡 Warm', cold:'❄️ Cold', not_qualified:'— N/Q' }[qual] || '?';
            const urgClass = { high:'urg-high', medium:'urg-med', low:'urg-low' }[la.urgency] || '';
            const emailLabel = es.sent
                ? `<span class="email-sent" title="Enviado ${new Date(es.sentAt).toLocaleDateString()}">✉️ Enviado</span>`
                : `<span class="email-pending">⏳ Pendiente</span>`;

            const spamBadge = l.isSpam ? `<span style="background:#ef4444;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;margin-left:4px">SPAM</span>` : '';
            const industryTag = l.industry ? `<small style="color:#6b7280;font-size:11px">${this.esc(l.industry)}</small>` : '';
            const convScore = l.conversionScore != null ? `<span title="Conv. score" style="font-size:10px;color:#6b7280;margin-left:3px">(${l.conversionScore})</span>` : '';
            return `<tr class="${qual === 'hot' ? 'hot-row' : ''}${l.isSpam ? ' opacity-50' : ''}">
                <td class="date-cell">${date}</td>
                <td>
                    <div class="contact-cell">
                        <strong>${this.esc(l.name)}</strong>${spamBadge}
                        <small><a href="mailto:${this.esc(l.email)}">${this.esc(l.email)}</a></small>
                        ${industryTag}
                    </div>
                </td>
                <td class="msg-preview" title="${this.esc(l.message)}">${this.esc(l.message.substring(0, 70))}…</td>
                <td><span class="score-badge ${scoreClass}">${score}</span>${convScore}</td>
                <td><span class="qual-badge qual-${qual}">${qualLabel}</span></td>
                <td class="intent-cell">${this.esc((la.intent || '—').substring(0, 40))}</td>
                <td><span class="urg-badge ${urgClass}">${la.urgency || '—'}</span></td>
                <td class="center">${la.companySignals ? '<i class="fas fa-building company-yes" title="Señal empresa"></i>' : '—'}</td>
                <td>${emailLabel}</td>
                <td class="actions-cell">
                    <button class="btn-xs btn-view" data-id="${l._id}" title="Ver detalle"><i class="fas fa-eye"></i></button>
                    ${!es.sent ? `<button class="btn-xs btn-email" data-id="${l._id}" title="Enviar email IA"><i class="fas fa-paper-plane"></i></button>` : ''}
                    <button class="btn-xs btn-rescore" data-id="${l._id}" title="Re-puntuar"><i class="fas fa-brain"></i></button>
                    <button class="btn-xs btn-delete" data-id="${l._id}" data-name="${this.esc(l.name)}" title="Eliminar lead"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');

        // Bind row action buttons
        tbody.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', () => this.openModal(b.dataset.id)));
        tbody.querySelectorAll('.btn-email').forEach(b => b.addEventListener('click', () => this.quickSendEmail(b.dataset.id)));
        tbody.querySelectorAll('.btn-rescore').forEach(b => b.addEventListener('click', () => this.quickRescore(b.dataset.id)));
        tbody.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => this.quickDelete(b.dataset.id, b.dataset.name)));
    }

    // ── MODAL ──────────────────────────────────────────────────────────────────

    openModal(id) {
        const lead = this.leads.find(l => l._id === id);
        if (!lead) return;
        this.currentLeadId = id;
        const la = lead.leadAnalysis || {};
        const es = lead.emailStatus || {};

        const scoreEl = document.getElementById('modalScoreCircle');
        if (scoreEl) {
            const s = la.score ?? 0;
            scoreEl.style.background = s >= 70 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : s >= 40 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#3b82f6,#2563eb)';
        }

        this.setText('modalScore', la.score ?? '—');
        this.setText('modalName', lead.name);
        this.setText('modalDate', new Date(lead.submittedAt).toLocaleString('es-ES'));
        this.setText('modalIntent', la.intent || '—');
        this.setText('modalSummary', la.summary || '—');
        this.setText('modalAction', la.recommendedAction || '—');
        this.setText('modalCompany', la.companySignals ? '✅ Sí' : '❌ No');
        this.setText('modalBudget', la.budgetSignals ? '✅ Sí' : '❌ No');
        this.setText('modalUrgency', `Urgencia: ${la.urgency || '—'}`);
        this.setText('modalMessage', lead.message);

        const qualBadge = document.getElementById('modalQualBadge');
        if (qualBadge) {
            const qual = la.qualification || 'unknown';
            qualBadge.textContent = { hot:'🔥 Hot Lead', warm:'🌡 Warm Lead', cold:'❄️ Cold Lead', not_qualified:'— No Calificado' }[qual] || qual;
            qualBadge.className = `qual-badge qual-${qual}`;
        }

        const emailEl = document.getElementById('modalEmail');
        if (emailEl) { emailEl.textContent = lead.email; emailEl.href = `mailto:${lead.email}`; }

        const areas = document.getElementById('modalAreas');
        if (areas) {
            areas.innerHTML = (la.interestAreas || []).map(a => `<span class="tag">${this.esc(a)}</span>`).join('') || '—';
        }

        // Send button state
        const sendBtn = document.getElementById('sendEmailBtn');
        if (sendBtn) {
            if (es.sent) {
                sendBtn.textContent = `✉️ Email enviado (${new Date(es.sentAt).toLocaleDateString()})`;
                sendBtn.disabled = true;
            } else {
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Email IA';
                sendBtn.disabled = false;
            }
        }

        // Reset preview
        const previewBox = document.getElementById('emailPreviewBox');
        if (previewBox) previewBox.style.display = 'none';

        document.getElementById('leadModal').style.display = 'flex';

        // Pre-warm email cache in background so "Enviar" is instant
        if (!es.sent) {
            this.apiFetch(`/admin/leads/${id}/preview-email`).catch(() => {});
        }
    }

    closeModal() {
        const modal = document.getElementById('leadModal');
        if (modal) modal.style.display = 'none';
        this.currentLeadId = null;
    }

    // ── EMAIL ACTIONS ──────────────────────────────────────────────────────────

    async previewEmail() {
        if (!this.currentLeadId) return;
        const btn = document.getElementById('previewEmailBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';

        try {
            const data = await this.apiFetch(`/admin/leads/${this.currentLeadId}/preview-email`);
            if (!data) return;

            const box = document.getElementById('emailPreviewBox');
            document.getElementById('previewSubject').textContent = data.email.subject;
            document.getElementById('previewBody').innerHTML = data.email.bodyHtml;
            box.style.display = 'block';
            box.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            this.toast('Error al generar vista previa', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-eye"></i> Ver Email IA';
        }
    }

    async sendEmail() {
        if (!this.currentLeadId) return;
        const lead = this.leads.find(l => l._id === this.currentLeadId);
        if (!lead) return;

        const ok = await this.showConfirm(
            'Enviar Email IA',
            `¿Enviar email personalizado a <strong>${lead.name}</strong>?<br><span style="font-size:0.85rem;color:#9ca3af">${lead.email}</span>`
        );
        if (!ok) return;

        const btn = document.getElementById('sendEmailBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            const data = await this.apiFetch(`/admin/leads/${this.currentLeadId}/send-email`, 'POST');
            if (!data) return;

            this.toast(`✅ Email enviado a ${lead.email}`, 'success');
            btn.textContent = '✉️ Email enviado';

            // Update local data
            const idx = this.leads.findIndex(l => l._id === this.currentLeadId);
            if (idx >= 0) {
                this.leads[idx].emailStatus = { sent: true, sentAt: new Date(), subject: data.result?.subject };
            }
            this.stats.emailsSent = (this.stats.emailsSent || 0) + 1;
            this.renderStats();
            this.applyFilter();
        } catch (err) {
            this.toast('Error al enviar email: ' + err.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Email IA';
        }
    }

    async quickSendEmail(id) {
        const lead = this.leads.find(l => l._id === id);
        if (!lead) return;
        const ok = await this.showConfirm(
            'Enviar Email IA',
            `¿Enviar email personalizado a <strong>${lead.name}</strong>?<br><span style="font-size:0.85rem;color:#9ca3af">${lead.email}</span>`
        );
        if (!ok) return;
        try {
            const data = await this.apiFetch(`/admin/leads/${id}/send-email`, 'POST');
            if (!data) return;
            this.toast(`✅ Email enviado a ${lead.email}`, 'success');
            const idx = this.leads.findIndex(l => l._id === id);
            if (idx >= 0) this.leads[idx].emailStatus = { sent: true, sentAt: new Date() };
            this.stats.emailsSent = (this.stats.emailsSent || 0) + 1;
            this.renderStats();
            this.applyFilter();
        } catch (err) {
            this.toast('Error: ' + err.message, 'error');
        }
    }

    // ── RESCORE ────────────────────────────────────────────────────────────────

    async quickDelete(id, name) {
        const ok = await this.showConfirm(
            'Eliminar lead',
            `¿Eliminar el mensaje de <strong>${name}</strong>?<br><span style="font-size:0.85rem;color:#ef4444">Esta acción no se puede deshacer.</span>`
        );
        if (!ok) return;
        try {
            const data = await this.apiFetch(`/admin/contacts/${id}`, 'DELETE');
            if (!data) return;
            this.leads = this.leads.filter(l => l._id !== id);
            this.applyFilter();
            this.toast(`🗑️ Mensaje de ${name} eliminado`, 'success');
        } catch (err) {
            this.toast('Error al eliminar: ' + err.message, 'error');
        }
    }

    async quickRescore(id) {
        this.toast('Re-puntuando lead...', 'info');
        try {
            const data = await this.apiFetch(`/admin/leads/${id}/rescore`, 'POST');
            if (!data) return;
            const idx = this.leads.findIndex(l => l._id === id);
            if (idx >= 0) this.leads[idx].leadAnalysis = data.leadAnalysis;
            this.toast(`✅ Re-puntuado: Score ${data.leadAnalysis.score} (${data.leadAnalysis.qualification})`, 'success');
            this.renderPipeline();
            this.applyFilter();
        } catch (err) {
            this.toast('Error al re-puntuar: ' + err.message, 'error');
        }
    }

    async rescoreCurrent() {
        if (!this.currentLeadId) return;
        await this.quickRescore(this.currentLeadId);
        this.openModal(this.currentLeadId);
    }

    async rescoreAll() {
        const ok = await this.showConfirm(
            'Re-puntuar con IA',
            '¿Analizar todos los leads sin score con inteligencia artificial?<br><span style="font-size:0.85rem;color:#9ca3af">Este proceso puede tomar varios minutos.</span>'
        );
        if (!ok) return;
        const btn = document.getElementById('rescoreAllBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        try {
            const data = await this.apiFetch('/admin/leads/rescore-all', 'POST');
            if (!data) return;
            this.toast(`✅ ${data.processed} leads puntuados, ${data.errors} errores`, 'success');
            await this.loadLeads();
        } catch (err) {
            this.toast('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain"></i> Re-puntuar Todo';
        }
    }

    // ── EMAIL STATUS CHECK ─────────────────────────────────────────────────────

    async checkEmailStatus() {
        try {
            const data = await this.apiFetch('/admin/email-status');
            if (!data) return;
            if (data.success) {
                this.toast('✅ Servicio de email conectado correctamente', 'success');
            } else {
                this.toast('⚠️ Email no configurado: ' + data.message, 'error');
            }
        } catch (err) {
            this.toast('Error verificando email: ' + err.message, 'error');
        }
    }

    // ── EXPORT CSV ─────────────────────────────────────────────────────────────

    exportCSV() {
        const headers = ['Fecha','Nombre','Email','Score','Calificación','Intención','Urgencia','Empresa','Budget','Email Enviado','Mensaje'];
        const rows = this.filteredLeads.map(l => {
            const la = l.leadAnalysis || {};
            return [
                new Date(l.submittedAt).toLocaleDateString('es-ES'),
                l.name, l.email,
                la.score ?? '', la.qualification ?? '', la.intent ?? '',
                la.urgency ?? '', la.companySignals ? 'Sí' : 'No', la.budgetSignals ? 'Sí' : 'No',
                l.emailStatus?.sent ? 'Sí' : 'No',
                `"${(l.message || '').replace(/"/g, '""')}"`
            ].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `cadencewave-leads-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    }

    // ── CONFIRM MODAL ───────────────────────────────────────────────────────────

    showConfirm(title, bodyHtml) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            document.getElementById('confirmModalTitle').textContent = title;
            document.getElementById('confirmModalBody').innerHTML = bodyHtml;
            modal.style.display = 'flex';

            const ok = document.getElementById('confirmModalOk');
            const cancel = document.getElementById('confirmModalCancel');

            const cleanup = (result) => {
                modal.style.display = 'none';
                ok.replaceWith(ok.cloneNode(true));
                cancel.replaceWith(cancel.cloneNode(true));
                resolve(result);
            };

            document.getElementById('confirmModalOk').addEventListener('click', () => cleanup(true));
            document.getElementById('confirmModalCancel').addEventListener('click', () => cleanup(false));
            modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(false); }, { once: true });
        });
    }

    // ── CHARTS ─────────────────────────────────────────────────────────────────

    renderCharts() {
        this.renderSentimentChart();
        this.renderEmotionChart();
    }

    renderTokenChart() {
        if (!this.tokenStats?.last7Days) return;
        const ctx = document.getElementById('tokenUsageChart');
        if (!ctx) return;
        if (this.charts.token) this.charts.token.destroy();
        const days = this.tokenStats.last7Days;
        this.charts.token = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: days.map(d => new Date(d.date).toLocaleDateString('es-ES', { month:'short', day:'numeric' })),
                datasets: [{
                    label: 'Tokens', data: days.map(d => d.tokens),
                    borderColor: '#00539B', backgroundColor: 'rgba(0,83,155,0.1)', tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    renderSentimentChart() {
        const ctx = document.getElementById('sentimentChart');
        if (!ctx) return;
        const hot = this.stats.hot || 0, warm = this.stats.warm || 0, cold = this.stats.cold || 0;
        if (this.charts.sentiment) this.charts.sentiment.destroy();
        this.charts.sentiment = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Hot Leads', 'Warm Leads', 'Cold/NQ'],
                datasets: [{ data: [hot, warm, cold], backgroundColor: ['#ef4444','#f59e0b','#3b82f6'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    renderEmotionChart() {
        const ctx = document.getElementById('emotionChart');
        if (!ctx) return;
        const analyzed = this.stats.analyzed || 0, emailsSent = this.stats.emailsSent || 0, company = this.stats.companyLeads || 0;
        if (this.charts.emotion) this.charts.emotion.destroy();
        this.charts.emotion = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Analizados', 'Emails Enviados', 'Señal Empresa'],
                datasets: [{ data: [analyzed, emailsSent, company], backgroundColor: ['#00539B','#10b981','#8b5cf6'], borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // ── TOKEN CARDS ────────────────────────────────────────────────────────────

    updateTokenCards() {
        if (!this.tokenStats) return;
        const { total } = this.tokenStats;
        this.setText('totalTokens', (total?.tokensUsed || 0).toLocaleString());
        this.setText('totalRequests', (total?.requests || 0).toLocaleString());
        this.setText('totalCost', `$${(total?.cost || 0).toFixed(4)}`);
        this.setText('avgTokensPerRequest', this.tokenStats.averageTokensPerRequest || 0);
    }

    // ── LOGOUT ─────────────────────────────────────────────────────────────────

    async logout() {
        try {
            await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
        } catch (e) { /* ignore */ }
        window.location.href = '/login';
    }

    // ── UTILITIES ──────────────────────────────────────────────────────────────

    async apiFetch(path, method = 'GET', body = null) {
        const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(this.apiBase + path, opts);
        if (res.status === 401) { window.location.href = '/login'; return null; }
        const data = await res.json();
        if (!data.success && data.message) { this.toast(data.message, 'error'); }
        return data;
    }

    setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    esc(str) {
        return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    setTableLoading() {
        const tb = document.getElementById('leadsTableBody');
        if (tb) tb.innerHTML = `<tr><td colspan="10" class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando leads...</td></tr>`;
    }

    setTableError(msg) {
        const tb = document.getElementById('leadsTableBody');
        if (tb) tb.innerHTML = `<tr><td colspan="10" class="loading"><i class="fas fa-exclamation-triangle"></i> ${msg}</td></tr>`;
    }

    toast(msg, type = 'info') {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = msg;
        el.className = `toast toast-${type}`;
        el.style.display = 'block';
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}
