/**
 * Cookie Consent Manager
 * Handles cookie consent banner and preferences
 */

class CookieConsent {
    constructor() {
        this.cookieName = 'cadencewave_cookie_consent';
        this.cookieExpiry = 365; // days
        this.preferences = {
            necessary: true, // Always true, cannot be disabled
            analytics: false,
            marketing: false,
            preferences: false
        };
        
        this.init();
    }

    init() {
        // Check if user has already made a choice
        const consent = this.getConsent();
        
        if (!consent) {
            // Show banner if no consent found
            this.showBanner();
        } else {
            // Apply saved preferences
            this.preferences = consent;
            this.applyPreferences();
        }
    }

    showBanner() {
        // Create banner HTML
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-text">
                    <div class="cookie-icon">
                        <i class="fas fa-cookie-bite"></i>
                    </div>
                    <div class="cookie-message">
                        <h3>We Value Your Privacy</h3>
                        <p>We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
                    </div>
                </div>
                <div class="cookie-banner-actions">
                    <button class="cookie-btn cookie-btn-settings" id="cookie-settings-btn">
                        <i class="fas fa-cog"></i> Cookie Settings
                    </button>
                    <button class="cookie-btn cookie-btn-reject" id="cookie-reject-btn">
                        Reject All
                    </button>
                    <button class="cookie-btn cookie-btn-accept" id="cookie-accept-btn">
                        Accept All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Add event listeners
        document.getElementById('cookie-accept-btn').addEventListener('click', () => this.acceptAll());
        document.getElementById('cookie-reject-btn').addEventListener('click', () => this.rejectAll());
        document.getElementById('cookie-settings-btn').addEventListener('click', () => this.showSettings());

        // Animate banner in
        setTimeout(() => banner.classList.add('show'), 100);
    }

    showSettings() {
        // Create settings modal
        const modal = document.createElement('div');
        modal.id = 'cookie-settings-modal';
        modal.className = 'cookie-modal';
        modal.innerHTML = `
            <div class="cookie-modal-overlay"></div>
            <div class="cookie-modal-content">
                <div class="cookie-modal-header">
                    <h2>Cookie Preferences</h2>
                    <button class="cookie-modal-close" id="cookie-modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="cookie-modal-body">
                    <p class="cookie-modal-description">
                        We use different types of cookies to optimize your experience on our website. 
                        Click on the categories below to learn more and customize your preferences.
                    </p>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <div class="cookie-category-info">
                                <h4><i class="fas fa-shield-alt"></i> Strictly Necessary Cookies</h4>
                                <p>These cookies are essential for the website to function properly. They cannot be disabled.</p>
                            </div>
                            <label class="cookie-toggle">
                                <input type="checkbox" checked disabled>
                                <span class="cookie-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <div class="cookie-category-info">
                                <h4><i class="fas fa-chart-line"></i> Analytics Cookies</h4>
                                <p>Help us understand how visitors interact with our website by collecting and reporting information anonymously.</p>
                            </div>
                            <label class="cookie-toggle">
                                <input type="checkbox" id="analytics-toggle" ${this.preferences.analytics ? 'checked' : ''}>
                                <span class="cookie-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <div class="cookie-category-info">
                                <h4><i class="fas fa-bullhorn"></i> Marketing Cookies</h4>
                                <p>Used to track visitors across websites to display relevant advertisements.</p>
                            </div>
                            <label class="cookie-toggle">
                                <input type="checkbox" id="marketing-toggle" ${this.preferences.marketing ? 'checked' : ''}>
                                <span class="cookie-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="cookie-category">
                        <div class="cookie-category-header">
                            <div class="cookie-category-info">
                                <h4><i class="fas fa-sliders-h"></i> Preference Cookies</h4>
                                <p>Enable the website to remember your preferences and provide enhanced features.</p>
                            </div>
                            <label class="cookie-toggle">
                                <input type="checkbox" id="preferences-toggle" ${this.preferences.preferences ? 'checked' : ''}>
                                <span class="cookie-toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="cookie-modal-footer">
                    <button class="cookie-btn cookie-btn-secondary" id="cookie-save-btn">
                        Save Preferences
                    </button>
                    <button class="cookie-btn cookie-btn-accept" id="cookie-accept-all-btn">
                        Accept All
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('cookie-modal-close').addEventListener('click', () => this.closeModal());
        document.querySelector('.cookie-modal-overlay').addEventListener('click', () => this.closeModal());
        document.getElementById('cookie-save-btn').addEventListener('click', () => this.savePreferences());
        document.getElementById('cookie-accept-all-btn').addEventListener('click', () => this.acceptAll());

        // Animate modal in
        setTimeout(() => modal.classList.add('show'), 100);
    }

    closeModal() {
        const modal = document.getElementById('cookie-settings-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        }
    }

    acceptAll() {
        this.preferences = {
            necessary: true,
            analytics: true,
            marketing: true,
            preferences: true
        };
        this.saveConsent();
        this.hideBanner();
        this.closeModal();
        this.applyPreferences();
    }

    rejectAll() {
        this.preferences = {
            necessary: true,
            analytics: false,
            marketing: false,
            preferences: false
        };
        this.saveConsent();
        this.hideBanner();
        this.applyPreferences();
    }

    savePreferences() {
        this.preferences = {
            necessary: true,
            analytics: document.getElementById('analytics-toggle').checked,
            marketing: document.getElementById('marketing-toggle').checked,
            preferences: document.getElementById('preferences-toggle').checked
        };
        this.saveConsent();
        this.hideBanner();
        this.closeModal();
        this.applyPreferences();
    }

    saveConsent() {
        const consent = JSON.stringify(this.preferences);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + this.cookieExpiry);
        document.cookie = `${this.cookieName}=${consent}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    }

    getConsent() {
        const name = this.cookieName + '=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        
        for (let cookie of cookieArray) {
            cookie = cookie.trim();
            if (cookie.indexOf(name) === 0) {
                try {
                    return JSON.parse(cookie.substring(name.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }

    hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 300);
        }
    }

    applyPreferences() {
        // Apply analytics cookies
        if (this.preferences.analytics) {
            this.enableAnalytics();
        }

        // Apply marketing cookies
        if (this.preferences.marketing) {
            this.enableMarketing();
        }

        // Apply preference cookies
        if (this.preferences.preferences) {
            this.enablePreferences();
        }

        console.log('Cookie preferences applied:', this.preferences);
    }

    enableAnalytics() {
        // Add Google Analytics or other analytics code here
        console.log('Analytics cookies enabled');
        // Example: Load Google Analytics
        // window.dataLayer = window.dataLayer || [];
        // function gtag(){dataLayer.push(arguments);}
        // gtag('js', new Date());
        // gtag('config', 'GA_MEASUREMENT_ID');
    }

    enableMarketing() {
        // Add marketing/advertising code here
        console.log('Marketing cookies enabled');
    }

    enablePreferences() {
        // Add preference cookies here
        console.log('Preference cookies enabled');
    }
}

// Initialize cookie consent when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CookieConsent();
    });
} else {
    new CookieConsent();
}
