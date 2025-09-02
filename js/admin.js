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
                <td colspan="13" class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading messages...
                </td>
            </tr>
        `;
    }

    showError(message) {
        document.getElementById('messagesTableBody').innerHTML = `
            <tr>
                <td colspan="13" class="loading">
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
        
        console.log('Rendering table with messages:', this.filteredMessages.length);
        console.log('Filtered messages:', this.filteredMessages);
        
        if (!this.filteredMessages || this.filteredMessages.length === 0) {
            console.log('No messages to display');
            tbody.innerHTML = `
                <tr>
                    <td colspan="13" class="loading">
                        <i class="fas fa-inbox"></i> No messages found matching the current filters.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredMessages.map(message => {
            const date = new Date(message.submittedAt).toLocaleDateString('en-US', {
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

            const sentimentClass = sentiment !== 'N/A' ? `sentiment-${sentiment}` : '';
            const emotionClass = emotion !== 'N/A' ? `emotion-${emotion}` : '';
            const toxicityClass = toxicity === 'toxic' ? 'toxicity-toxic' : 'toxicity-safe';
            
            let confidenceClass = 'confidence-low';
            if (confidence >= 0.7) confidenceClass = 'confidence-high';
            else if (confidence >= 0.5) confidenceClass = 'confidence-medium';

            const keywordList = keywords.slice(0, 3).map(k => k.word || k).join(', ');
            const topicList = topics.slice(0, 2).map(t => t.label || t).join(', ');

            return `
                <tr>
                    <td>${date}</td>
                    <td>${this.escapeHtml(message.name)}</td>
                    <td>${this.escapeHtml(message.email)}</td>
                    <td class="message-preview" title="${this.escapeHtml(message.message)}">
                        ${this.escapeHtml(message.message)}
                    </td>
                    <td>
                        <span class="sentiment-badge ${sentimentClass}">
                            ${sentiment}
                        </span>
                    </td>
                    <td>
                        <span class="emotion-badge ${emotionClass}">
                            ${emotion}
                        </span>
                    </td>
                    <td>
                        <span class="toxicity-badge ${toxicityClass}">
                            ${toxicity === 'toxic' ? '⚠️ Toxic' : '✅ Safe'}
                        </span>
                    </td>
                    <td>
                        <span class="language-badge">
                            ${language.toUpperCase()}
                        </span>
                    </td>
                    <td class="keywords-cell">
                        ${keywordList || 'None'}
                    </td>
                    <td class="topics-cell">
                        ${topicList || 'None'}
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
                        <button class="btn-small btn-primary" onclick="dashboard.viewDetails('${message._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-small btn-secondary" onclick="dashboard.reanalyzeMessage('${message._id}')">
                            <i class="fas fa-sync"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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
