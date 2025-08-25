// Admin Dashboard JavaScript
class ToneAnalysisDashboard {
    constructor() {
        this.apiBase = 'http://localhost:3000/api';
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

        // Token refresh and reset buttons
        document.getElementById('refreshTokensBtn').addEventListener('click', () => {
            this.loadTokenStats();
        });

        document.getElementById('resetTokensBtn').addEventListener('click', () => {
            this.resetTokenStats();
        });

        // Filter controls
        document.getElementById('sentimentFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('emotionFilter').addEventListener('change', () => {
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
                <td colspan="8" class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Loading messages...
                </td>
            </tr>
        `;
    }

    showError(message) {
        document.getElementById('messagesTableBody').innerHTML = `
            <tr>
                <td colspan="8" class="loading">
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
        const data = {
            labels: ['Positive', 'Negative', 'Neutral'],
            datasets: [{
                data: [
                    sentimentData.positive || 0,
                    sentimentData.negative || 0,
                    sentimentData.neutral || 0
                ],
                backgroundColor: [
                    '#28a745',
                    '#dc3545',
                    '#6c757d'
                ],
                borderWidth: 0
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
                            usePointStyle: true
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
        const emotions = Object.keys(emotionData);
        const values = Object.values(emotionData);

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
                borderWidth: 0
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
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    applyFilters() {
        const sentimentFilter = document.getElementById('sentimentFilter').value;
        const emotionFilter = document.getElementById('emotionFilter').value;

        this.filteredMessages = this.messages.filter(message => {
            const sentiment = message.toneAnalysis?.sentiment || '';
            const emotion = message.toneAnalysis?.emotion || '';

            const sentimentMatch = !sentimentFilter || sentiment === sentimentFilter;
            const emotionMatch = !emotionFilter || emotion === emotionFilter;

            return sentimentMatch && emotionMatch;
        });

        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('messagesTableBody');
        
        console.log('Rendering table with messages:', this.filteredMessages.length);
        console.log('Filtered messages:', this.filteredMessages);
        
        if (!this.filteredMessages || this.filteredMessages.length === 0) {
            console.log('No messages to display');
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="loading">
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
            const confidence = message.toneAnalysis?.confidence || 0;
            const summary = message.toneAnalysis?.summary || 'No analysis available';

            const sentimentClass = sentiment !== 'N/A' ? `sentiment-${sentiment}` : '';
            const emotionClass = emotion !== 'N/A' ? `emotion-${emotion}` : '';
            
            let confidenceClass = 'confidence-low';
            if (confidence >= 0.7) confidenceClass = 'confidence-high';
            else if (confidence >= 0.5) confidenceClass = 'confidence-medium';

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
                        <span class="confidence-score ${confidenceClass}">
                            ${Math.round(confidence * 100)}%
                        </span>
                    </td>
                    <td class="summary-text" title="${this.escapeHtml(summary)}">
                        ${this.escapeHtml(summary)}
                    </td>
                </tr>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ToneAnalysisDashboard();
});
