// Admin Dashboard JavaScript
class ToneAnalysisDashboard {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.charts = {};
        this.messages = [];
        this.filteredMessages = [];
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadData();
        this.renderCharts();
        this.renderTable();
    }

    bindEvents() {
        // Refresh button with null check
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadData();
            });
        }

        // Logout button with null check
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Token refresh and reset buttons with null checks
        const refreshTokensBtn = document.getElementById('refreshTokensBtn');
        if (refreshTokensBtn) {
            refreshTokensBtn.addEventListener('click', () => {
                this.loadTokenStats();
            });
        }

        const resetTokensBtn = document.getElementById('resetTokensBtn');
        if (resetTokensBtn) {
            resetTokensBtn.addEventListener('click', () => {
                this.resetTokenStats();
            });
        }

        // Enhanced analysis controls
        const analyzeAllBtn = document.getElementById('analyzeAllBtn');
        if (analyzeAllBtn) {
            analyzeAllBtn.addEventListener('click', () => {
                this.reanalyzeAllMessages();
            });
        }

        const exportAnalysisBtn = document.getElementById('exportAnalysisBtn');
        if (exportAnalysisBtn) {
            exportAnalysisBtn.addEventListener('click', () => {
                this.exportAnalysisData();
            });
        }

        const moodAnalysisBtn = document.getElementById('moodAnalysisBtn');
        if (moodAnalysisBtn) {
            moodAnalysisBtn.addEventListener('click', () => this.performMoodAnalysis());
        }

        const riskAssessmentBtn = document.getElementById('riskAssessmentBtn');
        if (riskAssessmentBtn) {
            riskAssessmentBtn.addEventListener('click', () => this.performRiskAssessment());
        }

        const realTimeToggle = document.getElementById('realTimeToggle');
        if (realTimeToggle) {
            realTimeToggle.addEventListener('click', () => this.toggleRealTimeAnalysis());
        }

        const refreshRisksBtn = document.getElementById('refreshRisksBtn');
        if (refreshRisksBtn) {
            refreshRisksBtn.addEventListener('click', () => this.performRiskAssessment());
        }

        const exportRisksBtn = document.getElementById('exportRisksBtn');
        if (exportRisksBtn) {
            exportRisksBtn.addEventListener('click', () => this.exportRiskData());
        }

        const realTimeAnalysisBtn = document.getElementById('realTimeAnalysisBtn');
        if (realTimeAnalysisBtn) {
            realTimeAnalysisBtn.addEventListener('click', () => this.toggleRealTimeAnalysis());
        }

        const emergencyProtocolBtn = document.getElementById('emergencyProtocolBtn');
        if (emergencyProtocolBtn) {
            emergencyProtocolBtn.addEventListener('click', () => this.activateEmergencyProtocol());
        }

        // Bind filter events with null checks
        const sentimentFilter = document.getElementById('sentimentFilter');
        if (sentimentFilter) {
            sentimentFilter.addEventListener('change', (e) => {
                this.filterBySentiment(e.target.value);
            });
        }

        const emotionFilter = document.getElementById('emotionFilter');
        if (emotionFilter) {
            emotionFilter.addEventListener('change', (e) => {
                this.filterByEmotion(e.target.value);
            });
        }

        const toxicityFilter = document.getElementById('toxicityFilter');
        if (toxicityFilter) {
            toxicityFilter.addEventListener('change', (e) => {
                this.filterByToxicity(e.target.value);
            });
        }

        const languageFilter = document.getElementById('languageFilter');
        if (languageFilter) {
            languageFilter.addEventListener('change', (e) => {
                this.filterByLanguage(e.target.value);
            });
        }

        const riskFilter = document.getElementById('riskFilter');
        if (riskFilter) {
            riskFilter.addEventListener('change', (e) => {
                this.filterByRisk(e.target.value);
            });
        }

        // Alert modal event listeners
        const closeAlertModal = document.getElementById('closeAlertModal');
        if (closeAlertModal) {
            closeAlertModal.addEventListener('click', () => this.closeAlertModal());
        }

        const alertModal = document.getElementById('alertModal');
        if (alertModal) {
            alertModal.addEventListener('click', (e) => {
                if (e.target === alertModal) {
                    this.closeAlertModal();
                }
            });
        }

        // Alert action buttons
        const markAsUrgent = document.getElementById('markAsUrgent');
        if (markAsUrgent) {
            markAsUrgent.addEventListener('click', () => this.markAlertAsUrgent());
        }

        const assignToSupport = document.getElementById('assignToSupport');
        if (assignToSupport) {
            assignToSupport.addEventListener('click', () => this.assignAlertToSupport());
        }

        const markAsResolved = document.getElementById('markAsResolved');
        if (markAsResolved) {
            markAsResolved.addEventListener('click', () => this.markAlertAsResolved());
        }

        const addNotes = document.getElementById('addNotes');
        if (addNotes) {
            addNotes.addEventListener('click', () => this.addAlertNotes());
        }

        // Bind data-action event handlers for CSP compliance
        document.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.getAttribute('data-action');
            if (!action) return;

            const element = e.target.closest('[data-action]');
            const risk = element.getAttribute('data-risk');
            const range = element.getAttribute('data-range');
            const messageId = element.getAttribute('data-message-id');

            switch (action) {
                case 'viewHighRiskMessages':
                    this.viewHighRiskMessages();
                    break;
                case 'viewMediumRiskMessages':
                    this.viewMediumRiskMessages();
                    break;
                case 'notifySupport':
                    this.notifySupport(risk);
                    break;
                case 'scheduleFollowUp':
                    this.scheduleFollowUp(risk);
                    break;
                case 'setTimelineRange':
                    this.setTimelineRange(range);
                    break;
                case 'configureAlerts':
                    this.configureAlerts();
                    break;
                case 'generateRiskReport':
                    this.generateRiskReport();
                    break;
                case 'contactEmergencyServices':
                    this.contactEmergencyServices();
                    break;
                case 'scheduleWellnessCheck':
                    this.scheduleWellnessCheck();
                    break;
                case 'exportRiskData':
                    this.exportRiskData();
                    break;
                case 'deleteMessage':
                    if (messageId) {
                        this.deleteMessage(messageId);
                    }
                    break;
                case 'viewDetails':
                    if (messageId) {
                        this.viewDetails(messageId);
                    }
                    break;
                case 'reanalyzeMessage':
                    if (messageId) {
                        this.reanalyzeMessage(messageId);
                    }
                    break;
                case 'viewMessage':
                    if (messageId) {
                        this.viewDetails(messageId);
                    }
                    break;
                case 'flagMessage':
                    if (messageId) {
                        this.flagMessage(messageId);
                    }
                    break;
                case 'contactUser':
                    const userId = element.getAttribute('data-user-id');
                    if (userId) {
                        this.contactUser(userId);
                    }
                    break;
                case 'dismissAlert':
                    const alertId = element.getAttribute('data-alert-id');
                    if (alertId) {
                        this.dismissAlert(alertId);
                    }
                    break;
                case 'closeNotification':
                    if (element.closest('.notification')) {
                        element.closest('.notification').remove();
                    }
                    break;
                case 'closeMoodAnalysis':
                    this.closeMoodAnalysis();
                    break;
                case 'flagHighRisk':
                    if (messageId) {
                        this.flagHighRisk(messageId);
                    }
                    break;
            }
        });
    }

    async loadData() {
        try {
            this.showLoading();

            // Fetch data from APIs
            const [contactsResponse, statsResponse] = await Promise.all([
                fetch(`${this.apiBase}/admin/contacts?includeTone=true`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${this.apiBase}/contacts/tone-stats`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            console.log('Contacts response status:', contactsResponse.status);
            console.log('Stats response status:', statsResponse.status);

            // Check for authentication errors
            if (contactsResponse.status === 401) {
                console.log('Authentication required, redirecting to login');
                this.showNotification('Sesión expirada. Redirigiendo al login...', 'warning');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            if (statsResponse.status === 401) {
                console.log('Authentication required, redirecting to login');
                this.showNotification('Sesión expirada. Redirigiendo al login...', 'warning');
                setTimeout(() => window.location.href = '/login', 2000);
                return;
            }

            const contactsData = await contactsResponse.json();
            const statsData = await statsResponse.json();

            console.log('Contacts data:', contactsData);
            console.log('Stats data:', statsData);

            if (contactsData.success) {
                this.messages = contactsData.data;
                this.filteredMessages = [...this.messages];
                console.log('Loaded messages:', this.messages.length);
                
                // Hide loading and show success if we have messages
                if (this.messages.length > 0) {
                    this.showNotification(`${this.messages.length} mensajes cargados exitosamente`, 'success');
                }
            } else {
                console.error('Failed to load contacts:', contactsData.message);
                this.showError('Error al cargar mensajes: ' + contactsData.message);
                return; // Don't continue if contacts failed to load
            }

            if (statsData.success) {
                this.stats = statsData.data;
                this.updateStatCards();
            } else {
                console.error('Failed to load stats:', statsData.message);
                // Don't show error for stats, just log it
                console.warn('Stats loading failed, continuing with message display');
            }

            // Load token stats
            await this.loadTokenStats();

            // Load risk assessment data
            await this.loadRiskAssessment();

            this.renderCharts();
            this.renderTable();
            this.updateEnhancedStats();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Error al cargar datos. Verifique su conexión.');
        } finally {
            // Hide loading state even if there's an error
            const tbody = document.getElementById('messagesTableBody');
            if (tbody && tbody.innerHTML.includes('fa-spinner')) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="14" class="loading">
                            <i class="fas fa-exclamation-triangle"></i> Error al cargar mensajes
                        </td>
                    </tr>
                `;
            }
        }
    }

    async loadTokenStats() {
        try {
            const response = await fetch(`${this.apiBase}/token-stats`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                console.log('Authentication required for token stats');
                return;
            }
            
            const data = await response.json();

            if (data.success) {
                this.tokenStats = data.data;
                this.updateTokenStatCards();
                this.renderTokenChart();
            }
        } catch (error) {
            console.error('Error loading token stats:', error);
        }
    }

    async resetTokenStats() {
        if (!confirm('Are you sure you want to reset all token statistics? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/token-stats/reset`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                alert('Token statistics have been reset successfully.');
                await this.loadTokenStats();
            } else {
                alert('Failed to reset token statistics.');
            }
        } catch (error) {
            console.error('Error resetting token stats:', error);
            alert('Error resetting token statistics.');
        }
    }

    updateTokenStatCards() {
        if (!this.tokenStats) return;

        const { total, today } = this.tokenStats;

        document.getElementById('totalTokens').textContent = total.tokensUsed.toLocaleString();
        document.getElementById('totalRequests').textContent = total.requests.toLocaleString();
        document.getElementById('totalCost').textContent = `$${total.cost.toFixed(4)}`;
        document.getElementById('avgTokensPerRequest').textContent = this.tokenStats.averageTokensPerRequest;

        document.getElementById('todayTokens').textContent = today.tokens.toLocaleString();
        document.getElementById('todayRequests').textContent = today.requests.toLocaleString();
        document.getElementById('todayCost').textContent = `$${today.cost.toFixed(4)}`;
    }

    showLoading() {
        document.getElementById('messagesTableBody').innerHTML = `
            <tr>
                <td colspan="14" class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading messages...
                </td>
            </tr>
        `;
    }

    showError(message) {
        document.getElementById('messagesTableBody').innerHTML = `
            <tr>
                <td colspan="14" class="loading">
                    <i class="fas fa-exclamation-triangle"></i> ${message}
                </td>
            </tr>
        `;
    }

    updateStatCards() {
        const totalMessages = this.messages.length;
        const analyzedMessages = this.stats.totalAnalyzed || 0;
        const positiveCount = this.stats.sentimentStats?.positive || 0;
        const positivePercentage = analyzedMessages > 0 ? Math.round((positiveCount / analyzedMessages) * 100) : 0;
        const avgConfidence = this.stats.averageConfidence || 0;

        document.getElementById('totalMessages').textContent = totalMessages;
        document.getElementById('analyzedMessages').textContent = analyzedMessages;
        document.getElementById('positivePercentage').textContent = `${positivePercentage}%`;
        document.getElementById('avgConfidence').textContent = `${Math.round(avgConfidence * 100)}%`;
    }

    renderCharts() {
        this.renderSentimentChart();
        this.renderEmotionChart();
        this.renderTokenChart();
    }

    renderTokenChart() {
        if (!this.tokenStats || !this.tokenStats.last7Days) return;

        const ctx = document.getElementById('tokenUsageChart').getContext('2d');
        
        if (this.charts.tokenUsage) {
            this.charts.tokenUsage.destroy();
        }

        const last7Days = this.tokenStats.last7Days;
        const labels = last7Days.map(day => {
            const date = new Date(day.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const tokenData = last7Days.map(day => day.tokens);
        const costData = last7Days.map(day => day.cost);

        this.charts.tokenUsage = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tokens Used',
                        data: tokenData,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Cost ($)',
                        data: costData,
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Tokens'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Cost ($)'
                        },
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.datasetIndex === 1) {
                                    return `$${context.parsed.y.toFixed(4)}`;
                                }
                                return `${context.parsed.y} tokens`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderSentimentChart() {
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        
        if (this.charts.sentiment) {
            this.charts.sentiment.destroy();
        }

        const sentimentData = this.stats?.sentimentStats || {};
        console.log('Sentiment data for chart:', sentimentData);
        
        // Get actual values and filter out zero values for better visualization
        const chartData = [
            { label: 'Positive', value: sentimentData.positive || 0, color: '#28a745' },
            { label: 'Negative', value: sentimentData.negative || 0, color: '#dc3545' },
            { label: 'Neutral', value: sentimentData.neutral || 0, color: '#6c757d' }
        ].filter(item => item.value > 0);

        // If no data, show a message
        if (chartData.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#6c757d';
            ctx.textAlign = 'center';
            ctx.fillText('No sentiment data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const data = {
            labels: chartData.map(item => item.label),
            datasets: [{
                data: chartData.map(item => item.value),
                backgroundColor: chartData.map(item => item.color),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };

        this.charts.sentiment = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        return {
                                            text: `${label}: ${value}`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            pointStyle: 'circle',
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderEmotionChart() {
        const ctx = document.getElementById('emotionChart').getContext('2d');
        
        if (this.charts.emotion) {
            this.charts.emotion.destroy();
        }

        const emotionData = this.stats?.emotionStats || {};
        console.log('Emotion data for chart:', emotionData);
        
        const emotions = Object.keys(emotionData).filter(key => emotionData[key] > 0);
        const values = emotions.map(key => emotionData[key]);

        // If no data, show a message
        if (emotions.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.font = '16px Arial';
            ctx.fillStyle = '#6c757d';
            ctx.textAlign = 'center';
            ctx.fillText('No emotion data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const colors = {
            joy: '#ffc107',
            anger: '#dc3545',
            sadness: '#007bff',
            fear: '#6f42c1',
            surprise: '#fd7e14',
            disgust: '#e83e8c',
            neutral: '#6c757d'
        };

        const data = {
            labels: emotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
            datasets: [{
                data: values,
                backgroundColor: emotions.map(e => colors[e] || '#6c757d'),
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        };

        this.charts.emotion = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed.y;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: 'Number of Messages'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Emotions'
                        }
                    }
                }
            }
        });
    }

    applyFilters() {
        const sentimentFilter = document.getElementById('sentimentFilter').value;
        const emotionFilter = document.getElementById('emotionFilter').value;
        const toxicityFilter = document.getElementById('toxicityFilter').value;
        const languageFilter = document.getElementById('languageFilter').value;

        this.filteredMessages = this.messages.filter(message => {
            const sentiment = message.toneAnalysis?.sentiment || '';
            const emotion = message.toneAnalysis?.emotion || '';
            const toxicity = message.toneAnalysis?.toxicity || 'safe';
            const language = message.toneAnalysis?.language || 'en';

            const sentimentMatch = !sentimentFilter || sentiment === sentimentFilter;
            const emotionMatch = !emotionFilter || emotion === emotionFilter;
            const toxicityMatch = !toxicityFilter || toxicity === toxicityFilter;
            const languageMatch = !languageFilter || language === languageFilter;

            return sentimentMatch && emotionMatch && toxicityMatch && languageMatch;
        });

        this.renderTable();
        this.updateEnhancedStats();
    }

    renderTable() {
        const tbody = document.getElementById('messagesTableBody');
        
        if (!this.filteredMessages || this.filteredMessages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="loading">
                        <i class="fas fa-inbox"></i> No messages found matching the current filters.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredMessages.map(message => {
            const date = new Date(message.submittedAt).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const sentiment = message.toneAnalysis?.sentiment || 'N/A';
            const emotion = message.toneAnalysis?.emotion || 'N/A';
            const toxicity = message.toneAnalysis?.toxicity || 'safe';
            const language = message.toneAnalysis?.language || 'en';
            const keywords = message.toneAnalysis?.keywords || [];
            const topics = message.toneAnalysis?.topics || [];
            const confidence = message.toneAnalysis?.confidence || 0;
            const summary = message.toneAnalysis?.summary || 'No analysis available';

            // Calculate risk level based on DeepSeek analysis
            const riskLevel = this.calculateRiskLevel(message.toneAnalysis);
            
            const sentimentClass = sentiment !== 'N/A' ? `sentiment-${sentiment}` : '';
            const emotionClass = emotion !== 'N/A' ? `emotion-${emotion}` : '';
            const toxicityClass = toxicity === 'toxic' ? 'toxicity-toxic' : 'toxicity-safe';
            const riskClass = `risk-${riskLevel}`;
            
            let confidenceClass = 'confidence-low';
            if (confidence >= 0.7) confidenceClass = 'confidence-high';
            else if (confidence >= 0.5) confidenceClass = 'confidence-medium';

            const keywordList = keywords.slice(0, 3).map(k => k.word || k).join(', ');
            const topicList = topics.slice(0, 2).map(t => t.label || t).join(', ');

            const riskEmoji = {
                'alto': '🔴',
                'medio': '🟡',
                'bajo': '🟢'
            }[riskLevel] || '⚪';

            return `
                <tr class="${riskLevel === 'alto' ? 'high-risk-row' : ''}">
                    <td>${date}</td>
                    <td>${this.escapeHtml(message.name)}</td>
                    <td>${this.escapeHtml(message.email)}</td>
                    <td class="message-preview" title="${this.escapeHtml(message.message)}">
                        ${this.escapeHtml(message.message)}
                    </td>
                    <td>
                        <span class="sentiment-badge ${sentimentClass}">
                            ${this.translateSentiment(sentiment)}
                        </span>
                    </td>
                    <td>
                        <span class="emotion-badge ${emotionClass}">
                            ${this.translateEmotion(emotion)}
                        </span>
                    </td>
                    <td>
                        <span class="risk-badge ${riskClass}">
                            ${riskEmoji} ${this.translateRiskLevel(riskLevel)}
                        </span>
                    </td>
                    <td>
                        <span class="toxicity-badge ${toxicityClass}">
                            ${toxicity === 'toxic' ? '⚠️ Tóxico' : '✅ Seguro'}
                        </span>
                    </td>
                    <td>
                        <span class="language-badge">
                            ${this.getLanguageName(language)}
                        </span>
                    </td>
                    <td class="keywords-cell">
                        ${keywordList || 'Ninguna'}
                    </td>
                    <td class="topics-cell">
                        ${topicList || 'Ninguno'}
                    </td>
                    <td>
                        <span class="confidence-score ${confidenceClass}">
                            ${Math.round(confidence * 100)}%
                        </span>
                    </td>
                    <td class="summary-text" title="${this.escapeHtml(summary)}">
                        ${this.escapeHtml(summary)}
                    </td>
                    <td class="actions-cell">
                        <button class="btn-small btn-primary" data-action="viewDetails" data-message-id="${message._id}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small btn-secondary" data-action="reanalyzeMessage" data-message-id="${message._id}" title="Re-analizar">
                            <i class="fas fa-sync"></i>
                        </button>
                        <button class="btn-small btn-danger" data-action="deleteMessage" data-message-id="${message._id}" title="Eliminar mensaje">
                            <i class="fas fa-trash"></i>
                        </button>
                        ${riskLevel === 'alto' ? `<button class="btn-small btn-warning" data-action="flagHighRisk" data-message-id="${message._id}" title="Marcar como urgente"><i class="fas fa-flag"></i></button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Enhanced alert system with better UI
    showRiskAlerts(alerts) {
        const alertsList = document.getElementById('alertsList');
        const noAlertsMessage = document.getElementById('noAlertsMessage');
        
        if (alerts.length === 0) {
            this.showNoAlerts();
            return;
        }
        
        noAlertsMessage.style.display = 'none';
        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item ${alert.severity}" data-alert-id="${alert.id}">
                <div class="alert-priority">
                    <div class="priority-indicator ${alert.severity}"></div>
                </div>
                <div class="alert-icon">
                    <i class="fas ${this.getAlertIcon(alert.severity)}"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-header">
                        <h4>${alert.title}</h4>
                        <span class="alert-time">${this.formatTimeAgo(alert.timestamp)}</span>
                    </div>
                    <p class="alert-message">${alert.message}</p>
                    <div class="alert-meta">
                        <span class="risk-score">Riesgo: ${alert.riskScore}/100</span>
                        <span class="confidence">Confianza: ${alert.confidence}%</span>
                    </div>
                </div>
                <div class="alert-actions">
                    <button class="btn-alert btn-view" data-action="viewMessage" data-message-id="${alert.messageId}" title="Ver mensaje completo">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-alert btn-flag" data-action="flagMessage" data-message-id="${alert.messageId}" title="Marcar como revisado">
                        <i class="fas fa-flag"></i>
                    </button>
                    <button class="btn-alert btn-contact" data-action="contactUser" data-user-id="${alert.userId}" title="Contactar usuario">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="btn-alert btn-dismiss" data-action="dismissAlert" data-alert-id="${alert.id}" title="Descartar alerta">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Show no alerts message
    showNoAlerts() {
        const alertsList = document.getElementById('alertsList');
        const noAlertsMessage = document.getElementById('noAlertsMessage');
        
        if (noAlertsMessage) {
            noAlertsMessage.style.display = 'block';
        }
        
        // Clear any existing alerts
        const existingAlerts = alertsList.querySelectorAll('.alert-item');
        existingAlerts.forEach(alert => alert.remove());
    }

    // Update individual risk count with animation
    updateRiskCount(elementId, newValue, change) {
        const element = document.getElementById(elementId);
        const changeElement = document.getElementById(elementId.replace('Count', 'Change'));
        
        if (element) {
            // Animate count change
            const currentValue = parseInt(element.textContent) || 0;
            this.animateNumber(element, currentValue, newValue);
        }
        
        if (changeElement && change !== 0) {
            changeElement.textContent = change > 0 ? `+${change}` : `${change}`;
            changeElement.className = `risk-change ${change > 0 ? 'increase' : 'decrease'}`;
        }
    }

    // Animate number changes
    animateNumber(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    // Update trend arrow based on direction
    updateTrendArrow(direction) {
        const trendArrow = document.getElementById('trendArrow');
        if (!trendArrow) return;
        
        const arrows = {
            'up': '↗',
            'down': '↘',
            'stable': '→'
        };
        
        const colors = {
            'up': '#e74c3c',
            'down': '#27ae60',
            'stable': '#3498db'
        };
        
        trendArrow.textContent = arrows[direction] || '→';
        trendArrow.style.color = colors[direction] || '#3498db';
    }

    // Update risk meter
    updateRiskMeter(riskLevel) {
        const meterFill = document.getElementById('riskMeterFill');
        const currentRiskLevel = document.getElementById('currentRiskLevel');
        const riskLevelDescription = document.getElementById('riskLevelDescription');
        
        if (meterFill) {
            meterFill.style.width = `${riskLevel}%`;
        }
        
        if (currentRiskLevel && riskLevelDescription) {
            if (riskLevel < 25) {
                currentRiskLevel.textContent = 'SEGURO';
                currentRiskLevel.style.color = '#27ae60';
                riskLevelDescription.textContent = 'Nivel de riesgo bajo, situación controlada';
            } else if (riskLevel < 50) {
                currentRiskLevel.textContent = 'MODERADO';
                currentRiskLevel.style.color = '#f39c12';
                riskLevelDescription.textContent = 'Nivel de riesgo moderado, requiere atención';
            } else if (riskLevel < 75) {
                currentRiskLevel.textContent = 'ALTO RIESGO';
                currentRiskLevel.style.color = '#e74c3c';
                riskLevelDescription.textContent = 'Nivel de riesgo alto, intervención necesaria';
            } else {
                currentRiskLevel.textContent = 'CRÍTICO';
                currentRiskLevel.style.color = '#8e44ad';
                riskLevelDescription.textContent = 'Nivel crítico, acción inmediata requerida';
            }
        }
    }

    // Update AI patterns
    updateAIPatterns(patterns) {
        const elements = {
            'peakRiskTime': patterns.peakRiskTime || '--:--',
            'riskLanguage': patterns.riskLanguage || '--',
            'riskKeyword': patterns.riskKeyword || '--',
            'riskAccuracy': patterns.riskAccuracy ? `${patterns.riskAccuracy}%` : '--%'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Update alert summary
    updateAlertSummary(summary) {
        const elements = {
            'todayAlerts': summary.todayAlerts || 0,
            'avgResponseTime': summary.avgResponseTime || '--',
            'resolvedCases': summary.resolvedCases || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Update risk timeline chart
    updateRiskTimeline(timelineData) {
        const canvas = document.getElementById('riskTimelineChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (timelineData.length === 0) return;
        
        // Simple line chart implementation
        const padding = 40;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        // Find max value for scaling
        const maxValue = Math.max(...timelineData.map(d => d.value));
        
        // Draw axes
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // Draw data line
        if (timelineData.length > 1) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            timelineData.forEach((point, index) => {
                const x = padding + (index / (timelineData.length - 1)) * chartWidth;
                const y = canvas.height - padding - (point.value / maxValue) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
    }

    // Format time ago
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        return `${diffDays}d`;
    }

    // Emergency protocol activation
    activateEmergencyProtocol() {
        if (confirm('¿Está seguro de que desea activar el protocolo de emergencia? Esto notificará a los servicios de emergencia.')) {
            this.showNotification('Protocolo de emergencia activado', 'warning');
            // Here you would implement actual emergency protocol logic
            console.log('Emergency protocol activated');
        }
    }

    // View high risk messages
    viewHighRiskMessages() {
        this.applyFilter('riskLevel', 'high');
        document.querySelector('.messages-section').scrollIntoView({ behavior: 'smooth' });
    }

    // View medium risk messages
    viewMediumRiskMessages() {
        this.applyFilter('riskLevel', 'medium');
        document.querySelector('.messages-section').scrollIntoView({ behavior: 'smooth' });
    }

    // Notify support
    notifySupport(riskLevel) {
        this.showNotification(`Notificación enviada para mensajes de riesgo ${riskLevel}`, 'info');
        // Implement actual notification logic
    }

    // Schedule follow up
    scheduleFollowUp(riskLevel) {
        this.showNotification(`Seguimiento programado para mensajes de riesgo ${riskLevel}`, 'success');
        // Implement actual scheduling logic
    }

    // Set timeline range
    setTimelineRange(range) {
        // Remove active class from all buttons
        document.querySelectorAll('.timeline-controls .btn-small').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        event.target.classList.add('active');
        
        // Load data for the selected range
        this.loadTimelineData(range);
    }

    // Load timeline data
    async loadTimelineData(range) {
        try {
            const response = await fetch(`/api/admin/timeline-data?range=${range}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateRiskTimeline(data.timeline || []);
            }
        } catch (error) {
            console.error('Error loading timeline data:', error);
        }
    }

    // Configure alerts
    configureAlerts() {
        // Open alert configuration modal
        this.showNotification('Configuración de alertas próximamente', 'info');
    }

    // Generate risk report
    generateRiskReport() {
        this.showNotification('Generando reporte de riesgos...', 'info');
        // Implement report generation
    }

    // Contact emergency services
    contactEmergencyServices() {
        if (confirm('¿Desea contactar a los servicios de emergencia? Esta acción se registrará.')) {
            this.showNotification('Contactando servicios de emergencia...', 'warning');
            // Implement emergency contact logic
        }
    }

    // Schedule wellness check
    scheduleWellnessCheck() {
        this.showNotification('Chequeo de bienestar programado', 'success');
        // Implement wellness check scheduling
    }

    // Contact user
    contactUser(userId) {
        this.showNotification(`Iniciando contacto con usuario ${userId}`, 'info');
        // Implement user contact logic
    }

    // Dismiss alert
    dismissAlert(alertId) {
        const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
        if (alertElement) {
            alertElement.style.opacity = '0.5';
            alertElement.style.pointerEvents = 'none';
        }
        this.showNotification('Alerta descartada', 'success');
    }

    // Load risk assessment data
    async loadRiskAssessment() {
        try {
            const response = await fetch(`${this.apiBase}/admin/risk-assessment`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateRiskOverview(data.assessment);
                }
            }
        } catch (error) {
            console.error('Error loading risk assessment:', error);
        }
    }

    // Update risk overview with enhanced data
    updateRiskOverview(riskData) {
        try {
            // Update risk counts with change indicators
            this.updateRiskCount('highRiskCount', riskData.highRisk || 0, riskData.highRiskChange || 0);
            this.updateRiskCount('mediumRiskCount', riskData.mediumRisk || 0, riskData.mediumRiskChange || 0);
            this.updateRiskCount('lowRiskCount', riskData.lowRisk || 0, riskData.lowRiskChange || 0);
            
            // Update mood trend with arrow indicator
            const moodTrend = riskData.moodTrend || 'Estable';
            document.getElementById('moodTrend').textContent = moodTrend;
            this.updateTrendArrow(riskData.moodDirection || 'stable');
            
            // Update risk meter
            this.updateRiskMeter(riskData.overallRiskLevel || 25);
            
            // Update safety progress
            const safetyPercentage = riskData.safetyPercentage || 0;
            document.getElementById('safetyProgress').style.width = `${safetyPercentage}%`;
            document.getElementById('safetyPercentage').textContent = `${safetyPercentage}%`;
            
            // Update AI patterns
            this.updateAIPatterns(riskData.patterns || {});
            
            // Update alert summary
            this.updateAlertSummary(riskData.alertSummary || {});
            
            // Show alerts if high risk messages exist
            if (riskData.highRisk > 0) {
                this.showRiskAlerts(riskData.alerts || []);
            } else {
                this.showNoAlerts();
            }
            
            // Update timeline chart
            this.updateRiskTimeline(riskData.timeline || []);
            
        } catch (error) {
            console.error('Error updating risk overview:', error);
        }
    }

    // Apply filter for risk level
    applyFilter(filterType, value) {
        if (filterType === 'riskLevel') {
            this.filteredMessages = this.messages.filter(msg => {
                const riskLevel = this.calculateRiskLevel(msg.toneAnalysis, msg.message);
                return riskLevel === value;
            });
            this.renderTable();
        }
    }

    // Calculate risk level for a message (matching server-side logic)
    calculateRiskLevel(toneAnalysis, message = '') {
        if (!toneAnalysis) return 'bajo';
        
        const { emotion, sentiment, toxicity, toxicityScore = 0, keywords = [], summary = '' } = toneAnalysis;
        const highRiskKeywords = ['suicide', 'kill', 'death', 'die', 'murder', 'hurt', 'pain', 'suicidio', 'muerte', 'matar', 'dolor'];
        const mediumRiskKeywords = ['depressed', 'sad', 'hopeless', 'anxious', 'worried', 'scared', 'depresión', 'triste', 'ansiedad'];
        
        const messageText = (message + ' ' + (summary || '')).toLowerCase();
        const hasHighRiskKeywords = highRiskKeywords.some(word => 
            keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
        );
        const hasMediumRiskKeywords = mediumRiskKeywords.some(word => 
            keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
        );
        
        // High risk conditions
        if (hasHighRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.8) || 
            (emotion === 'sadness' && sentiment === 'negative')) {
            return 'alto';
        }
        
        // Medium risk conditions
        if (hasMediumRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.5) || 
            (emotion === 'anger' && sentiment === 'negative')) {
            return 'medio';
        }
        
        return 'bajo';
    }

    // Update risk count with animation
    updateRiskCount(elementId, count, change) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = count;
            
            // Add change indicator
            const changeElement = element.nextElementSibling;
            if (changeElement && changeElement.classList.contains('risk-change')) {
                changeElement.textContent = change > 0 ? `+${change}` : change < 0 ? `${change}` : '';
                changeElement.className = `risk-change ${change > 0 ? 'increase' : change < 0 ? 'decrease' : ''}`;
            }
        }
    }

    // Update trend arrow
    updateTrendArrow(direction) {
        const arrow = document.getElementById('trendArrow');
        if (arrow) {
            arrow.className = 'trend-arrow';
            switch(direction) {
                case 'up':
                    arrow.classList.add('trend-up');
                    arrow.innerHTML = '<i class="fas fa-arrow-up"></i>';
                    break;
                case 'down':
                    arrow.classList.add('trend-down');
                    arrow.innerHTML = '<i class="fas fa-arrow-down"></i>';
                    break;
                default:
                    arrow.classList.add('trend-stable');
                    arrow.innerHTML = '<i class="fas fa-minus"></i>';
            }
        }
    }

    // Update risk meter
    updateRiskMeter(percentage) {
        const meter = document.getElementById('riskMeter');
        const value = document.getElementById('riskValue');
        if (meter && value) {
            meter.style.width = `${percentage}%`;
            value.textContent = `${percentage}%`;
            
            // Update color based on risk level
            meter.className = 'risk-meter-fill';
            if (percentage > 70) meter.classList.add('high-risk');
            else if (percentage > 40) meter.classList.add('medium-risk');
            else meter.classList.add('low-risk');
        }
    }

    // Update AI patterns
    updateAIPatterns(patterns) {
        const elements = {
            'peakRiskTime': patterns.peakRiskTime || '--:--',
            'riskLanguage': patterns.riskLanguage || 'N/A',
            'riskKeyword': patterns.riskKeyword || 'N/A',
            'riskAccuracy': patterns.riskAccuracy ? `${patterns.riskAccuracy}%` : 'N/A'
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // Update alert summary
    updateAlertSummary(summary) {
        const elements = {
            'todayAlerts': summary.todayAlerts || 0,
            'avgResponseTime': summary.avgResponseTime || 'N/A',
            'resolvedCases': summary.resolvedCases || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // Show risk alerts
    showRiskAlerts(alerts) {
        const container = document.getElementById('alertsList');
        if (!container) return;
        
        container.innerHTML = alerts.map(alert => `
            <div class="alert-item" data-alert-id="${alert.id}">
                <div class="alert-header">
                    <span class="alert-severity ${alert.severity}">${alert.title}</span>
                    <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="alert-content">
                    <p>${alert.message}</p>
                    <div class="alert-meta">
                        <span>Usuario: ${alert.userId}</span>
                        <span>Confianza: ${alert.confidence}%</span>
                    </div>
                </div>
                <div class="alert-actions">
                    <button data-action="dismissAlert" data-alert-id="${alert.id}" class="btn-dismiss">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Show no alerts message
    showNoAlerts() {
        const container = document.getElementById('alertsList');
        if (container) {
            container.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-shield-check"></i>
                    <p>No hay alertas activas</p>
                    <small>Todos los mensajes están dentro de parámetros normales</small>
                </div>
            `;
        }
    }

    // Update risk timeline chart
    updateRiskTimeline(timelineData) {
        const canvas = document.getElementById('riskTimelineChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.timelineChart) {
            this.timelineChart.destroy();
        }
        
        this.timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.map(d => d.time),
                datasets: [{
                    label: 'Nivel de Riesgo',
                    data: timelineData.map(d => d.value),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // Emergency protocol activation
    async activateEmergencyProtocol() {
        const confirmMessage = `🚨 PROTOCOLO DE EMERGENCIA 🚨

¿Confirma la activación del protocolo de emergencia?

Esto ejecutará:
• Notificación inmediata a servicios de crisis
• Escalación automática de casos críticos
• Registro en log de seguridad
• Activación de respuesta rápida

Esta acción NO se puede deshacer.`;

        if (confirm(confirmMessage)) {
            try {
                // Show immediate feedback
                this.showNotification('🚨 Activando protocolo de emergencia...', 'warning');
                
                // Call backend emergency endpoint
                const response = await fetch(`${this.apiBase}/admin/emergency-protocol`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        activatedBy: 'admin',
                        timestamp: new Date().toISOString(),
                        reason: 'Manual activation from dashboard',
                        highRiskMessages: this.getHighRiskMessages()
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        this.showNotification('✅ Protocolo de emergencia activado exitosamente', 'success');
                        this.logEmergencyActivation(result.protocolId);
                        this.updateEmergencyStatus(true);
                        
                        // Auto-refresh risk data after 5 seconds
                        setTimeout(() => {
                            this.loadRiskAssessment();
                        }, 5000);
                    } else {
                        throw new Error(result.message || 'Error activating emergency protocol');
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (error) {
                console.error('Emergency protocol activation error:', error);
                this.showNotification(`❌ Error: ${error.message}`, 'error');
            }
        }
    }

    // Get high risk messages for emergency context
    getHighRiskMessages() {
        return this.messages.filter(msg => {
            const riskLevel = this.calculateRiskLevel(msg.toneAnalysis, msg.message);
            return riskLevel === 'alto';
        }).slice(0, 5).map(msg => ({
            id: msg._id,
            email: msg.email,
            message: msg.message.substring(0, 200),
            riskScore: this.calculateRiskScore(msg.toneAnalysis),
            timestamp: msg.submittedAt
        }));
    }

    // Calculate numerical risk score
    calculateRiskScore(toneAnalysis) {
        if (!toneAnalysis) return 0;
        
        let score = 0;
        const { emotion, sentiment, toxicity, toxicityScore = 0 } = toneAnalysis;
        
        // Base scoring
        if (sentiment === 'negative') score += 30;
        if (toxicity === 'toxic') score += 40;
        score += toxicityScore * 30;
        
        // Emotion-based scoring
        switch(emotion) {
            case 'anger': score += 25; break;
            case 'fear': score += 35; break;
            case 'sadness': score += 20; break;
            case 'disgust': score += 15; break;
        }
        
        return Math.min(Math.round(score), 100);
    }

    // Log emergency activation
    logEmergencyActivation(protocolId) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: 'EMERGENCY_PROTOCOL_ACTIVATED',
            protocolId: protocolId,
            activatedBy: 'admin_dashboard',
            riskLevel: 'CRITICAL'
        };
        
        console.warn('🚨 EMERGENCY PROTOCOL ACTIVATED:', logEntry);
        
        // Store in localStorage for audit trail
        const emergencyLog = JSON.parse(localStorage.getItem('emergencyLog') || '[]');
        emergencyLog.push(logEntry);
        localStorage.setItem('emergencyLog', JSON.stringify(emergencyLog));
    }

    // Update emergency status in UI
    updateEmergencyStatus(isActive) {
        const statusIndicator = document.getElementById('emergencyStatus');
        if (statusIndicator) {
            statusIndicator.className = isActive ? 'emergency-active' : 'emergency-inactive';
            statusIndicator.innerHTML = isActive ? 
                '<i class="fas fa-exclamation-triangle"></i> PROTOCOLO ACTIVO' :
                '<i class="fas fa-shield-check"></i> SISTEMA NORMAL';
        }
        
        // Update emergency button state
        const emergencyBtn = document.getElementById('emergencyProtocolBtn');
        if (emergencyBtn && isActive) {
            emergencyBtn.style.background = '#c0392b';
            emergencyBtn.innerHTML = '<i class="fas fa-check"></i> Protocolo Activo';
            emergencyBtn.disabled = true;
        }
    }

    // Generate risk report
    generateRiskReport() {
        this.showNotification('Generando reporte de riesgos...', 'info');
        // Here you would implement report generation logic
        setTimeout(() => {
            this.showNotification('Reporte generado exitosamente', 'success');
        }, 2000);
    }

    // Delete message functionality
    async deleteMessage(messageId) {
        // Create custom confirmation modal
        const confirmed = await this.showConfirmDialog(
            'Confirmar Eliminación',
            '¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.',
            'Eliminar',
            'Cancelar'
        );

        if (!confirmed) {
            return;
        }

        try {
            this.showNotification('Eliminando mensaje...', 'info');

            const response = await fetch(`${this.apiBase}/admin/contacts/${messageId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Mensaje eliminado exitosamente', 'success');
                // Remove from local arrays
                this.messages = this.messages.filter(msg => msg._id !== messageId);
                this.filteredMessages = this.filteredMessages.filter(msg => msg._id !== messageId);
                // Refresh the table and stats
                this.renderTable();
                this.updateEnhancedStats();
                this.renderCharts();
            } else {
                this.showNotification('Error al eliminar el mensaje: ' + result.message, 'error');
            }

        } catch (error) {
            console.error('Error deleting message:', error);
            this.showNotification('Error al eliminar el mensaje', 'error');
        }
    }

    // Custom confirmation dialog
    showConfirmDialog(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'confirm-modal';
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.3s ease-out;
            `;

            modal.innerHTML = `
                <div class="modal-header" style="margin-bottom: 16px;">
                    <h3 style="margin: 0; color: #333; font-size: 18px;">${title}</h3>
                </div>
                <div class="modal-body" style="margin-bottom: 24px;">
                    <p style="margin: 0; color: #666; line-height: 1.5;">${message}</p>
                </div>
                <div class="modal-footer" style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn-cancel" style="
                        padding: 10px 20px;
                        border: 1px solid #ddd;
                        background: white;
                        color: #666;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">${cancelText}</button>
                    <button class="btn-confirm" style="
                        padding: 10px 20px;
                        border: none;
                        background: linear-gradient(135deg, #ff4757 0%, #c44569 100%);
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    ">${confirmText}</button>
                </div>
            `;

            // Add animation styles
            const style = document.createElement('style');
            style.textContent = `
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
            `;
            document.head.appendChild(style);

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Event handlers
            const confirmBtn = modal.querySelector('.btn-confirm');
            const cancelBtn = modal.querySelector('.btn-cancel');

            const cleanup = () => {
                try {
                    if (overlay && overlay.parentNode) {
                        document.body.removeChild(overlay);
                    }
                    if (style && style.parentNode) {
                        document.head.removeChild(style);
                    }
                } catch (error) {
                    console.warn('Error during modal cleanup:', error);
                }
            };

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(true);
                });
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(false);
                });
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });

            // ESC key handler
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    // Show notification system
    showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notificationContainer') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" data-action="closeNotification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
        
        // Add notification styles
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                margin-bottom: 10px;
                padding: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-left: 4px solid;
                animation: slideIn 0.3s ease-out;
            }
            .notification-info { border-left-color: #3498db; }
            .notification-success { border-left-color: #27ae60; }
            .notification-warning { border-left-color: #f39c12; }
            .notification-error { border-left-color: #e74c3c; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                cursor: pointer;
                color: #666;
                padding: 4px;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        return container;
    }
    
    getNotificationIcon(type) {
        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'exclamation-triangle',
            error: 'times-circle'
        };
        return icons[type] || 'info-circle';
    }

    // Wellness check
    performWellnessCheck() {
        this.showNotification('Iniciando verificación de bienestar...', 'info');
        // Here you would implement wellness check logic
        setTimeout(() => {
            this.showNotification('Verificación de bienestar completada', 'success');
        }, 1500);
    }

    // Load timeline data
    async loadTimelineData(range = '24h') {
        try {
            const response = await fetch(`${this.apiBase}/admin/timeline-data?range=${range}`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateRiskTimeline(data.timeline);
                }
            }
        } catch (error) {
            console.error('Error loading timeline data:', error);
        }
    }

    // Enhanced analysis methods
    async reanalyzeAllMessages() {
        const btn = document.getElementById('analyzeAllBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Re-analyzing...';

        try {
            const response = await fetch(`${this.apiBase}/admin/reanalyze-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                await this.loadData();
                alert('All messages have been re-analyzed with enhanced AI models!');
            } else {
                throw new Error('Failed to re-analyze messages');
            }
        } catch (error) {
            console.error('Re-analysis failed:', error);
            alert('Failed to re-analyze messages. Please try again.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-magic"></i> Re-analyze All';
        }
    }

    async exportAnalysisData() {
        try {
            const data = {
                messages: this.filteredMessages,
                stats: this.calculateEnhancedStats(),
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analysis-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export data. Please try again.');
        }
    }

    calculateEnhancedStats() {
        const messages = this.filteredMessages;
        const stats = {
            total: messages.length,
            toxicity: { safe: 0, toxic: 0 },
            languages: {},
            keywords: {},
            topics: {},
            sentimentByLanguage: {}
        };

        messages.forEach(msg => {
            const analysis = msg.toneAnalysis || {};
            
            // Toxicity stats
            const toxicity = analysis.toxicity || 'safe';
            stats.toxicity[toxicity]++;
            
            // Language stats
            const language = analysis.language || 'en';
            stats.languages[language] = (stats.languages[language] || 0) + 1;
            
            // Keywords frequency
            if (analysis.keywords) {
                analysis.keywords.forEach(kw => {
                    const word = kw.word || kw;
                    stats.keywords[word] = (stats.keywords[word] || 0) + 1;
                });
            }
            
            // Topics frequency
            if (analysis.topics) {
                analysis.topics.forEach(topic => {
                    const label = topic.label || topic;
                    stats.topics[label] = (stats.topics[label] || 0) + 1;
                });
            }
            
            // Sentiment by language
            if (!stats.sentimentByLanguage[language]) {
                stats.sentimentByLanguage[language] = { positive: 0, negative: 0, neutral: 0 };
            }
            const sentiment = analysis.sentiment || 'neutral';
            stats.sentimentByLanguage[language][sentiment]++;
        });

        return stats;
    }

    updateEnhancedStats() {
        const stats = this.calculateEnhancedStats();
        
        // Update toxicity rate
        const toxicityRate = stats.total > 0 ? 
            Math.round((stats.toxicity.toxic / stats.total) * 100) : 0;
        document.getElementById('toxicityRate').textContent = `${toxicityRate}%`;
        
        // Update language count
        const languageCount = Object.keys(stats.languages).length;
        document.getElementById('languageCount').textContent = languageCount;
        
        // Update top languages
        const topLanguages = Object.entries(stats.languages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([lang]) => lang.toUpperCase())
            .join(', ');
        document.getElementById('topLanguages').textContent = topLanguages || 'None';
        
        // Update keyword count
        const keywordCount = Object.keys(stats.keywords).length;
        document.getElementById('keywordCount').textContent = keywordCount;
        
        // Update top keywords
        const topKeywords = Object.entries(stats.keywords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([word]) => word)
            .join(', ');
        document.getElementById('topKeywords').textContent = topKeywords || 'None';
        
        // Update topic count
        const topicCount = Object.keys(stats.topics).length;
        document.getElementById('topicCount').textContent = topicCount;
        
        // Update top topics
        const topTopics = Object.entries(stats.topics)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([topic]) => topic)
            .join(', ');
        document.getElementById('topTopics').textContent = topTopics || 'None';
        
        // Update keyword cloud
        this.renderKeywordCloud(stats.keywords);
        
        // Update advanced charts
        this.renderAdvancedCharts(stats);
    }

    renderKeywordCloud(keywords) {
        const container = document.getElementById('keywordCloud');
        if (!container) return;
        
        const entries = Object.entries(keywords)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20);
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="text-muted">No keywords available</p>';
            return;
        }
        
        const maxCount = entries[0][1];
        
        container.innerHTML = entries.map(([word, count]) => {
            const size = Math.ceil((count / maxCount) * 5);
            return `<span class="keyword-tag size-${size}" title="${count} occurrences">${word}</span>`;
        }).join('');
    }

    renderAdvancedCharts(stats) {
        this.renderLanguageChart(stats.languages);
        this.renderToxicitySentimentChart(stats);
    }

    renderLanguageChart(languages) {
        const ctx = document.getElementById('languageChart');
        if (!ctx) return;
        
        if (this.charts.language) {
            this.charts.language.destroy();
        }
        
        const entries = Object.entries(languages);
        if (entries.length === 0) return;
        
        this.charts.language = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: entries.map(([lang]) => lang.toUpperCase()),
                datasets: [{
                    data: entries.map(([,count]) => count),
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c',
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    renderToxicitySentimentChart(stats) {
        const ctx = document.getElementById('toxicitySentimentChart');
        if (!ctx) return;
        
        if (this.charts.toxicitySentiment) {
            this.charts.toxicitySentiment.destroy();
        }
        
        this.charts.toxicitySentiment = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Safe Messages', 'Toxic Messages'],
                datasets: [{
                    label: 'Count',
                    data: [stats.toxicity.safe, stats.toxicity.toxic],
                    backgroundColor: ['#38a169', '#e53e3e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    async viewDetails(messageId) {
        // Implementation for viewing detailed analysis
        console.log('View details for message:', messageId);
    }

    async reanalyzeMessage(messageId) {
        try {
            const response = await fetch(`${this.apiBase}/admin/reanalyze/${messageId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                await this.loadData();
            } else {
                throw new Error('Failed to re-analyze message');
            }
        } catch (error) {
            console.error('Re-analysis failed:', error);
            alert('Failed to re-analyze message. Please try again.');
        }
    }

    // New DeepSeek-enhanced methods
    calculateRiskLevel(toneAnalysis) {
        if (!toneAnalysis) return 'bajo';
        
        const { emotion, sentiment, toxicity, toxicityScore, keywords = [], summary = '' } = toneAnalysis;
        
        // High-risk indicators
        const highRiskKeywords = ['suicide', 'kill', 'death', 'die', 'murder', 'hurt', 'pain'];
        const mediumRiskKeywords = ['depressed', 'sad', 'hopeless', 'anxious', 'worried', 'scared'];
        
        const messageText = summary.toLowerCase();
        const hasHighRiskKeywords = highRiskKeywords.some(word => 
            keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
        );
        const hasMediumRiskKeywords = mediumRiskKeywords.some(word => 
            keywords.some(k => (k.word || k).toLowerCase().includes(word)) || messageText.includes(word)
        );
        
        if (hasHighRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.8) || 
            (emotion === 'sadness' && sentiment === 'negative')) {
            return 'alto';
        }
        
        if (hasMediumRiskKeywords || (toxicity === 'toxic' && toxicityScore > 0.5) || 
            (emotion === 'anger' && sentiment === 'negative')) {
            return 'medio';
        }
        
        return 'bajo';
    }

    translateSentiment(sentiment) {
        const translations = {
            'positive': 'Positivo',
            'negative': 'Negativo',
            'neutral': 'Neutral'
        };
        return translations[sentiment] || sentiment;
    }

    translateEmotion(emotion) {
        const translations = {
            'joy': 'Alegría',
            'sadness': 'Tristeza',
            'anger': 'Ira',
            'fear': 'Miedo',
            'surprise': 'Sorpresa',
            'disgust': 'Disgusto',
            'neutral': 'Neutral'
        };
        return translations[emotion] || emotion;
    }

    translateRiskLevel(level) {
        const translations = {
            'alto': 'Alto Riesgo',
            'medio': 'Riesgo Medio',
            'bajo': 'Bajo Riesgo'
        };
        return translations[level] || level;
    }

    getLanguageName(code) {
        const languages = {
            'en': 'Inglés',
            'es': 'Español',
            'fr': 'Francés',
            'de': 'Alemán',
            'pt': 'Portugués',
            'it': 'Italiano'
        };
        return languages[code] || code.toUpperCase();
    }

    async performMoodAnalysis() {
        const btn = document.getElementById('moodAnalysisBtn');
        if (!btn) {
            console.error('moodAnalysisBtn not found');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';

        try {
            const response = await fetch(`${this.apiBase}/admin/mood-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.success) {
                this.displayMoodAnalysis(data.analysis);
                this.showNotification('Análisis de humor completado exitosamente', 'success');
            } else {
                throw new Error(data.message || 'Error en análisis de humor');
            }
        } catch (error) {
            console.error('Mood analysis failed:', error);
            this.showNotification(`Error en análisis de humor: ${error.message}`, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-smile"></i> Análisis de Humor';
        }
    }

    // Display mood analysis results
    displayMoodAnalysis(analysis) {
        if (!analysis) {
            this.showNotification('No hay datos de análisis de humor disponibles', 'warning');
            return;
        }

        // Create or update mood analysis display
        let moodDisplay = document.getElementById('moodAnalysisDisplay');
        if (!moodDisplay) {
            moodDisplay = document.createElement('div');
            moodDisplay.id = 'moodAnalysisDisplay';
            moodDisplay.className = 'mood-analysis-results';
            moodDisplay.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-left: 4px solid #3498db;
            `;
            
            // Insert after the enhanced analysis controls
            const analysisSection = document.querySelector('.enhanced-analysis-controls');
            if (analysisSection) {
                analysisSection.parentNode.insertBefore(moodDisplay, analysisSection.nextSibling);
            } else {
                const dashboardContent = document.querySelector('.dashboard-content');
                if (dashboardContent) {
                    dashboardContent.appendChild(moodDisplay);
                } else {
                    document.body.appendChild(moodDisplay);
                }
            }
        }

        // Use the correct property names from server response
        const overallMood = analysis.overallMood || 'neutral';
        const moodTrend = analysis.moodTrend || 'stable';
        const totalAnalyzed = analysis.totalAnalyzed || 0;
        const confidence = analysis.confidence || 0;
        const recommendations = analysis.recommendations || [];

        moodDisplay.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #2c3e50; display: flex; align-items: center; justify-content: space-between;">
                <span style="display: flex; align-items: center;">
                    <i class="fas fa-smile" style="margin-right: 8px; color: #3498db;"></i>
                    Análisis de Humor Global
                </span>
                <button data-action="closeMoodAnalysis" style="background: none; border: none; color: #6c757d; font-size: 18px; cursor: pointer; padding: 4px; border-radius: 4px; transition: all 0.2s;" title="Cerrar análisis">
                    <i class="fas fa-times"></i>
                </button>
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #495057;">Estado General</h4>
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: ${this.getMoodColor(overallMood)};">
                        ${this.translateMood(overallMood)}
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #495057;">Tendencia</h4>
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #6c757d;">
                        ${this.translateTrend(moodTrend)}
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #495057;">Mensajes Analizados</h4>
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #28a745;">
                        ${totalAnalyzed}
                    </p>
                </div>
                <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #495057;">Confianza</h4>
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #17a2b8;">
                        ${Math.round(confidence * 100)}%
                    </p>
                </div>
            </div>
            ${recommendations.length > 0 ? `
                <div style="margin-top: 16px; padding: 16px; background: #e3f2fd; border-radius: 8px;">
                    <h4 style="margin: 0 0 8px 0; color: #1976d2;">Recomendaciones</h4>
                    <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #424242;">
                        ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    getMoodColor(mood) {
        switch (mood) {
            case 'positive': return '#28a745';
            case 'concerning': return '#dc3545';
            case 'neutral': return '#6c757d';
            default: return '#6c757d';
        }
    }

    translateMood(mood) {
        switch (mood) {
            case 'positive': return 'Positivo';
            case 'concerning': return 'Preocupante';
            case 'neutral': return 'Neutral';
            default: return 'Desconocido';
        }
    }

    translateTrend(trend) {
        switch (trend) {
            case 'improving': return 'Mejorando';
            case 'declining': return 'Declinando';
            case 'stable': return 'Estable';
            default: return 'Desconocido';
        }
    }

    getSentimentColor(sentiment) {
        switch (sentiment) {
            case 'positive': return '#28a745';
            case 'negative': return '#dc3545';
            case 'neutral': return '#6c757d';
            default: return '#6c757d';
        }
    }

    translateSentiment(sentiment) {
        switch (sentiment) {
            case 'positive': return 'Positivo';
            case 'negative': return 'Negativo';
            case 'neutral': return 'Neutral';
            default: return 'Desconocido';
        }
    }

    translateEmotion(emotion) {
        const emotions = {
            'joy': 'Alegría',
            'sadness': 'Tristeza',
            'anger': 'Ira',
            'fear': 'Miedo',
            'surprise': 'Sorpresa',
            'disgust': 'Disgusto',
            'neutral': 'Neutral'
        };
        return emotions[emotion] || emotion;
    }

    async performRiskAssessment() {
        const btn = document.getElementById('riskAssessmentBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Evaluando...';
        }

        try {
            const response = await fetch(`${this.apiBase}/admin/risk-assessment`, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Risk assessment response:', data);
            
            if (data.success && data.assessment) {
                this.updateRiskOverview(data.assessment);
                this.showNotification('✅ Evaluación de riesgos completada', 'success');
            } else {
                throw new Error(data.message || 'No se recibieron datos de evaluación');
            }
        } catch (error) {
            console.error('Risk assessment failed:', error);
            this.showNotification(`❌ Error en evaluación de riesgos: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-shield-alt"></i> Evaluación de Riesgos';
            }
        }
    }

    updateRiskCards(assessment) {
        document.getElementById('highRiskCount').textContent = assessment.highRisk || 0;
        document.getElementById('mediumRiskCount').textContent = assessment.mediumRisk || 0;
        document.getElementById('lowRiskCount').textContent = assessment.lowRisk || 0;
        document.getElementById('moodTrend').textContent = assessment.moodTrend || 'Estable';
        
        // Show alerts if there are high-risk messages
        if (assessment.highRisk > 0 && assessment.alerts) {
            this.showRiskAlerts(assessment.alerts);
        }
    }

    showRiskAlerts(alerts) {
        const alertSection = document.getElementById('alertSection');
        const alertsList = document.getElementById('alertsList');
        
        if (alerts.length > 0) {
            alertSection.style.display = 'block';
            alertsList.innerHTML = alerts.map(alert => `
                <div class="alert-item ${alert.level}">
                    <div class="alert-icon">
                        <i class="fas fa-${alert.level === 'high' ? 'skull-crossbones' : 'exclamation-triangle'}"></i>
                    </div>
                    <div class="alert-content">
                        <h4>${alert.title}</h4>
                        <p>${alert.message}</p>
                        <span class="alert-time">${new Date(alert.timestamp).toLocaleString('es-ES')}</span>
                    </div>
                    <div class="alert-actions">
                        <button class="btn-small btn-primary" data-action="viewDetails" data-message-id="${alert.messageId}">
                            Ver Mensaje
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            alertSection.style.display = 'none';
        }
    }

    async flagHighRisk(messageId) {
        if (!confirm('¿Marcar este mensaje como urgente y notificar al equipo de soporte?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/admin/flag-risk/${messageId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (response.ok) {
                alert('Mensaje marcado como urgente. Se ha notificado al equipo de soporte.');
                await this.loadData();
            }
        } catch (error) {
            console.error('Flag risk failed:', error);
            alert('Error al marcar mensaje. Intente nuevamente.');
        }
    }

    toggleRealTimeAnalysis() {
        const btn = document.getElementById('realTimeAnalysisBtn');
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
            btn.innerHTML = '<i class="fas fa-play"></i> Análisis en Tiempo Real';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-success');
        } else {
            this.realTimeInterval = setInterval(() => {
                this.loadData();
            }, 30000); // Update every 30 seconds
            btn.innerHTML = '<i class="fas fa-stop"></i> Detener Análisis';
            btn.classList.remove('btn-success');
            btn.classList.add('btn-danger');
        }
    }

    async logout() {
        try {
            const response = await fetch(`${this.apiBase}/admin/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                // Redirect to login page
                window.location.href = '/login';
            } else {
                console.error('Logout failed:', data.message);
                alert('Error al cerrar sesión. Por favor, intente nuevamente.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error de conexión al cerrar sesión.');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Alert Modal Functions
    showAlertModal(alertData) {
        const modal = document.getElementById('alertModal');
        if (!modal) return;

        // Populate modal with alert data
        document.getElementById('alertRiskLevel').textContent = this.translateRiskLevel(alertData.riskLevel);
        document.getElementById('alertRiskLevel').className = `risk-badge ${alertData.riskLevel}`;
        
        // Fix date formatting
        const timestamp = this.formatDate(alertData.timestamp);
        document.getElementById('alertTimestamp').textContent = timestamp;
        document.getElementById('alertType').textContent = alertData.type || 'Alerta de Riesgo';
        document.getElementById('alertStatus').textContent = alertData.status || 'Activa';
        document.getElementById('alertStatus').className = `status-badge ${alertData.status || 'active'}`;
        
        document.getElementById('alertOriginalMessage').textContent = alertData.message || 'No disponible';
        document.getElementById('alertAnalysis').textContent = alertData.analysis || 'Análisis no disponible';
        
        // Keywords
        const keywordsContainer = document.getElementById('alertKeywords');
        if (alertData.keywords && alertData.keywords.length > 0) {
            keywordsContainer.innerHTML = alertData.keywords.map(keyword => 
                `<span class="keyword-tag">${keyword}</span>`
            ).join('');
        } else {
            keywordsContainer.textContent = 'No se detectaron palabras clave específicas';
        }
        
        // Contact info
        document.getElementById('alertContactName').textContent = alertData.contactName || 'No disponible';
        document.getElementById('alertContactEmail').textContent = alertData.contactEmail || 'No disponible';
        
        // Store current alert data for actions
        this.currentAlert = alertData;
        
        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeAlertModal() {
        const modal = document.getElementById('alertModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            this.currentAlert = null;
        }
    }

    translateRiskLevel(level) {
        const levels = {
            'low': 'Bajo',
            'medium': 'Medio', 
            'high': 'Alto',
            'critical': 'Crítico'
        };
        return levels[level] || level;
    }

    formatDate(dateInput) {
        console.log('formatDate called with:', dateInput, 'Type:', typeof dateInput);
        
        if (!dateInput) {
            console.log('No dateInput provided, returning default message');
            return 'Fecha no disponible';
        }
        
        try {
            let date;
            
            // Handle different date formats
            if (typeof dateInput === 'string') {
                console.log('Parsing string date:', dateInput);
                // Try parsing ISO string or other formats
                date = new Date(dateInput);
            } else if (dateInput instanceof Date) {
                console.log('Date object provided');
                date = dateInput;
            } else if (typeof dateInput === 'number') {
                console.log('Parsing timestamp:', dateInput);
                // Unix timestamp
                date = new Date(dateInput);
            } else {
                console.log('Unknown date format:', typeof dateInput, dateInput);
                return 'Formato de fecha inválido';
            }
            
            console.log('Parsed date:', date);
            
            // Check if date is valid
            if (isNaN(date.getTime())) {
                console.log('Invalid date detected');
                return 'Fecha inválida';
            }
            
            // Format date in Spanish locale
            const formatted = date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            console.log('Formatted date:', formatted);
            return formatted;
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateInput);
            return 'Error en formato de fecha';
        }
    }

    // Alert Action Functions
    async markAlertAsUrgent() {
        if (!this.currentAlert) return;
        
        try {
            const response = await fetch(`${this.apiBase}/admin/alerts/${this.currentAlert.id}/urgent`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showNotification('Alerta marcada como urgente', 'success');
                this.closeAlertModal();
                this.performRiskAssessment(); // Refresh alerts
            }
        } catch (error) {
            console.error('Error marking alert as urgent:', error);
            this.showNotification('Error al marcar como urgente', 'error');
        }
    }

    async assignAlertToSupport() {
        if (!this.currentAlert) return;
        
        try {
            const response = await fetch(`${this.apiBase}/admin/alerts/${this.currentAlert.id}/assign`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showNotification('Alerta asignada al equipo de soporte', 'success');
                this.closeAlertModal();
                this.performRiskAssessment();
            }
        } catch (error) {
            console.error('Error assigning alert:', error);
            this.showNotification('Error al asignar alerta', 'error');
        }
    }

    async markAlertAsResolved() {
        if (!this.currentAlert) return;
        
        try {
            const response = await fetch(`${this.apiBase}/admin/alerts/${this.currentAlert.id}/resolve`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                this.showNotification('Alerta marcada como resuelta', 'success');
                this.closeAlertModal();
                this.performRiskAssessment();
            }
        } catch (error) {
            console.error('Error resolving alert:', error);
            this.showNotification('Error al resolver alerta', 'error');
        }
    }

    addAlertNotes() {
        if (!this.currentAlert) return;
        
        const notes = prompt('Agregar notas a esta alerta:');
        if (notes && notes.trim()) {
            // Here you would typically send the notes to the server
            this.showNotification('Notas agregadas a la alerta', 'success');
        }
    }

    // Close mood analysis section
    closeMoodAnalysis() {
        const moodDisplay = document.getElementById('moodAnalysisDisplay');
        if (moodDisplay) {
            moodDisplay.style.display = 'none';
            moodDisplay.innerHTML = '';
        }
        
        // Reset button state
        const btn = document.getElementById('moodAnalysisBtn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-smile"></i> Análisis de Humor';
        }
        
        this.showNotification('Análisis de humor cerrado', 'info');
    }

    // Enhanced viewDetails function to show alert modal
    viewDetails(messageId) {
        const message = this.messages.find(m => m._id === messageId);
        if (!message) return;

        // Debug: Log message data to see what's available
        console.log('Message data for modal:', message);
        console.log('createdAt:', message.createdAt);
        console.log('timestamp:', message.timestamp);
        console.log('date:', message.date);

        // Try multiple possible date fields
        const timestamp = message.createdAt || message.timestamp || message.date || new Date().toISOString();

        // Create alert data from message
        const alertData = {
            id: messageId,
            riskLevel: message.toneAnalysis?.riskLevel || 'medium',
            timestamp: timestamp,
            type: 'Análisis de Riesgo',
            status: 'active',
            message: message.message,
            analysis: message.toneAnalysis?.summary || 'Análisis no disponible',
            keywords: message.toneAnalysis?.keywords || [],
            contactName: message.name,
            contactEmail: message.email
        };

        console.log('Alert data being sent to modal:', alertData);
        this.showAlertModal(alertData);
    }
}

