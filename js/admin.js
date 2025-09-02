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
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Token refresh and reset buttons
        document.getElementById('refreshTokensBtn').addEventListener('click', () => {
            this.loadTokenStats();
        });

        document.getElementById('resetTokensBtn').addEventListener('click', () => {
            this.resetTokenStats();
        });

        // Enhanced analysis controls
        document.getElementById('analyzeAllBtn').addEventListener('click', () => {
            this.reanalyzeAllMessages();
        });

        document.getElementById('exportAnalysisBtn').addEventListener('click', () => {
            this.exportAnalysisData();
        });

        document.getElementById('moodAnalysisBtn')?.addEventListener('click', () => this.performMoodAnalysis());
        document.getElementById('riskAssessmentBtn')?.addEventListener('click', () => this.performRiskAssessment());
        document.getElementById('realTimeToggle')?.addEventListener('click', () => this.toggleRealTimeAnalysis());
        document.getElementById('refreshRisksBtn')?.addEventListener('click', () => this.performRiskAssessment());
        document.getElementById('exportRisksBtn')?.addEventListener('click', () => this.exportRiskData());
        document.getElementById('realTimeAnalysisBtn')?.addEventListener('click', () => this.toggleRealTimeAnalysis());
        document.getElementById('emergencyProtocolBtn')?.addEventListener('click', () => this.activateEmergencyProtocol());

        // Filter controls
        document.getElementById('sentimentFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('emotionFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('toxicityFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('languageFilter').addEventListener('change', () => {
            this.applyFilters();
        });
    }

    async loadData() {
        try {
            // Show loading state
            this.showLoading();

            // Fetch data from APIs
            const [contactsResponse, statsResponse] = await Promise.all([
                fetch(`${this.apiBase}/contacts?includeTone=true`),
                fetch(`${this.apiBase}/contacts/tone-stats`)
            ]);

            console.log('Contacts response status:', contactsResponse.status);
            console.log('Stats response status:', statsResponse.status);

            const contactsData = await contactsResponse.json();
            const statsData = await statsResponse.json();

            console.log('Contacts data:', contactsData);
            console.log('Stats data:', statsData);

            if (contactsData.success) {
                this.messages = contactsData.data;
                this.filteredMessages = [...this.messages];
                console.log('Loaded messages:', this.messages.length);
            }

            if (statsData.success) {
                this.stats = statsData.data;
                this.updateStatCards();
            }

            // Load token stats
            await this.loadTokenStats();

            this.renderCharts();
            this.renderTable();
            this.updateEnhancedStats();

        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please check your connection.');
        }
    }

    async loadTokenStats() {
        try {
            const response = await fetch(`${this.apiBase}/token-stats`);
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
                        <button class="btn-small btn-primary" onclick="dashboard.viewDetails('${message._id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small btn-secondary" onclick="dashboard.reanalyzeMessage('${message._id}')" title="Re-analizar">
                            <i class="fas fa-sync"></i>
                        </button>
                        ${riskLevel === 'alto' ? `<button class="btn-small btn-danger" onclick="dashboard.flagHighRisk('${message._id}')" title="Marcar como urgente"><i class="fas fa-flag"></i></button>` : ''}
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
                    <button class="btn-alert btn-view" onclick="dashboard.viewMessage('${alert.messageId}')" title="Ver mensaje completo">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-alert btn-flag" onclick="dashboard.flagMessage('${alert.messageId}')" title="Marcar como revisado">
                        <i class="fas fa-flag"></i>
                    </button>
                    <button class="btn-alert btn-contact" onclick="dashboard.contactUser('${alert.userId}')" title="Contactar usuario">
                        <i class="fas fa-phone"></i>
                    </button>
                    <button class="btn-alert btn-dismiss" onclick="dashboard.dismissAlert('${alert.id}')" title="Descartar alerta">
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
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';

        try {
            const response = await fetch(`${this.apiBase}/admin/mood-analysis`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.displayMoodAnalysis(data.analysis);
            }
        } catch (error) {
            console.error('Mood analysis failed:', error);
            alert('Error en análisis de humor. Intente nuevamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-smile"></i> Análisis de Humor';
        }
    }

    async performRiskAssessment() {
        const btn = document.getElementById('riskAssessmentBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Evaluando...';

        try {
            const response = await fetch(`${this.apiBase}/admin/risk-assessment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                this.displayRiskAssessment(data.assessment);
                this.updateRiskCards(data.assessment);
            }
        } catch (error) {
            console.error('Risk assessment failed:', error);
            alert('Error en evaluación de riesgos. Intente nuevamente.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-shield-alt"></i> Evaluación de Riesgos';
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
                        <button class="btn-small btn-primary" onclick="dashboard.viewDetails('${alert.messageId}')">
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
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new ToneAnalysisDashboard();
});
