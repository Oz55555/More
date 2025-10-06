// Country Flag Auto-Detection
const countryFlags = {
    'mx': 'https://flagcdn.com/w40/mx.png',
    'us': 'https://flagcdn.com/w40/us.png',
    'ca': 'https://flagcdn.com/w40/ca.png'
};

// Update flag display
function updateFlagDisplay(countryCode) {
    const navFlag = document.getElementById('nav-country-flag');
    if (navFlag && countryFlags[countryCode]) {
        navFlag.src = countryFlags[countryCode];
        navFlag.alt = `${countryCode.toUpperCase()} Flag`;
        console.log(`Flag updated to: ${countryCode.toUpperCase()}`);
    }
}

// Detect country from IP geolocation and show flag
async function detectAndShowCountryFlag() {
    let countryCode = 'us'; // Default
    
    try {
        // Try primary geolocation service
        console.log('Detecting country from IP...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        console.log('Geolocation data:', data);
        
        if (data && data.country_code) {
            const detectedCode = data.country_code.toLowerCase();
            console.log(`Detected country: ${detectedCode}`);
            
            // Only set if it's Mexico, US, or Canada
            if (detectedCode === 'mx' || detectedCode === 'us' || detectedCode === 'ca') {
                countryCode = detectedCode;
            } else {
                console.log(`Country ${detectedCode} not in list, using default US`);
            }
        }
    } catch (error) {
        console.log('Primary geolocation failed, trying backup...', error);
        
        // Try backup geolocation service
        try {
            const backupResponse = await fetch('https://api.country.is/');
            const backupData = await backupResponse.json();
            
            if (backupData && backupData.country) {
                const detectedCode = backupData.country.toLowerCase();
                console.log(`Backup detected country: ${detectedCode}`);
                
                if (detectedCode === 'mx' || detectedCode === 'us' || detectedCode === 'ca') {
                    countryCode = detectedCode;
                }
            }
        } catch (backupError) {
            console.log('Backup geolocation also failed, using default US', backupError);
        }
    }
    
    // Update the flag
    updateFlagDisplay(countryCode);
}

// Initialize country detection when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', detectAndShowCountryFlag);
} else {
    // DOM is already ready
    detectAndShowCountryFlag();
}

// Page Loader with Connection Speed Detection
window.addEventListener('load', function() {
    const loader = document.getElementById('page-loader');
    const progressFill = document.querySelector('.progress-fill');
    
    // Detect connection speed
    let minLoadTime = 1000; // Default minimum load time
    
    if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const effectiveType = connection?.effectiveType;
        
        // Adjust load time based on connection speed
        switch(effectiveType) {
            case 'slow-2g':
            case '2g':
                minLoadTime = 2000;
                break;
            case '3g':
                minLoadTime = 1500;
                break;
            case '4g':
            default:
                minLoadTime = 1000;
                break;
        }
    }
    
    // Ensure minimum display time for smooth experience
    setTimeout(() => {
        loader.classList.add('hidden');
        document.body.classList.add('loaded');
        
        // Remove from DOM after transition
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }, minLoadTime);
});

// Agile Transformation Projects
const projects = [
    {
        title: 'Healthcare ART Implementation - European Pharma Giant',
        description: 'Led the implementation of 3 Agile Release Trains for a multinational pharmaceutical company, transforming drug development processes and reducing time-to-market by 40%. Coordinated 150+ team members across 8 countries.',
        image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&fit=crop',
        tags: ['SAFe 6.0', 'ART Setup', 'Healthcare', 'PI Planning'],
        metrics: '40% faster delivery • 150+ team members • 8 countries',
        outcome: 'Successful PI Planning events with 95% commitment reliability'
    },
    {
        title: 'Financial Services Digital Transformation - LATAM Bank',
        description: 'Established 2 ARTs for core banking modernization across Mexico and Colombia. Implemented DevSecOps practices and automated compliance workflows, achieving 99.9% system uptime during transformation.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
        tags: ['Digital Banking', 'DevSecOps', 'Compliance', 'Cross-border'],
        metrics: '99.9% uptime • 60% faster releases • $2M cost savings',
        outcome: 'Zero security incidents during 18-month transformation'
    },
    {
        title: 'Tech Startup Scale-Up - Silicon Valley SaaS Platform',
        description: 'Designed and launched the first ART for a rapidly growing SaaS company, scaling from 30 to 120 engineers. Implemented value stream mapping and established continuous delivery pipelines supporting 10M+ users.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
        tags: ['Startup Scaling', 'Value Streams', 'SaaS', 'Continuous Delivery'],
        metrics: '4x team growth • 10M+ users • 50% faster features',
        outcome: 'Seamless scaling with maintained code quality and team velocity'
    },
    {
        title: 'Manufacturing IoT Transformation - German Industrial Leader',
        description: 'Orchestrated ART implementation for Industry 4.0 initiative, connecting 500+ manufacturing devices across 12 facilities. Established lean-agile practices for hardware-software integration teams.',
        image: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=600&h=400&fit=crop',
        tags: ['Industry 4.0', 'IoT Integration', 'Lean-Agile', 'Manufacturing'],
        metrics: '500+ connected devices • 12 facilities • 30% efficiency gain',
        outcome: 'Real-time production visibility and predictive maintenance'
    },
    {
        title: 'Telecom 5G Network Rollout - Multi-National Carrier',
        description: 'Led agile transformation for 5G infrastructure deployment across USA and Europe. Coordinated 4 ARTs managing network planning, deployment, and optimization with strict regulatory compliance.',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
        tags: ['5G Networks', 'Infrastructure', 'Regulatory Compliance', 'Multi-ART'],
        metrics: '4 ARTs • 200+ cell towers/month • 99.99% reliability',
        outcome: 'Fastest 5G rollout in company history with zero compliance issues'
    },
    {
        title: 'Healthcare AI Platform - US Medical Research Institute',
        description: 'Implemented SAFe framework for AI-driven diagnostic platform development. Established cross-functional ARTs integrating data scientists, medical experts, and software engineers for FDA-compliant solutions.',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=600&h=400&fit=crop',
        tags: ['Healthcare AI', 'FDA Compliance', 'Cross-functional', 'Research'],
        metrics: 'FDA approval • 85% diagnostic accuracy • 6-month delivery',
        outcome: 'First AI diagnostic tool approved for clinical use'
    }
];

// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links li a');
const projectsGrid = document.querySelector('.projects-grid');
const form = document.getElementById('contact-form');
const currentYear = new Date().getFullYear();

// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Donation functionality
let selectedAmount = 0;

// Initialize donation event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Amount button event listeners
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            if (amount === 'custom') {
                setCustomAmount(this);
            } else {
                setAmount(parseFloat(amount), this);
            }
        });
    });

    // Donation button event listener
    document.querySelectorAll('[data-payment="donate"]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Redirect to donation selection page
            window.location.href = '/donation-select.html';
        });
    });
});

function setAmount(amount, buttonElement) {
    selectedAmount = amount;
    
    // Update button states
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    buttonElement.classList.add('active');
}

function setCustomAmount(buttonElement) {
    const amount = prompt('Enter your custom donation amount (USD):');
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
        selectedAmount = parseFloat(amount);
        
        // Update button states
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        buttonElement.classList.add('active');
        buttonElement.textContent = `$${selectedAmount}`;
    }
}

function openPaymentMethod(method) {
    if (selectedAmount <= 0) {
        alert('Por favor selecciona un monto de donación primero.');
        return;
    }
    
    // Always use current domain for payment redirect
    const amount = selectedAmount;
    window.location.href = `/payment.html?amount=${amount}&method=${method}`;
}

// Mobile menu toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
    
    // Update menu background with current carousel image
    if (navLinks.classList.contains('active')) {
        updateMenuBackground();
    }
});

// Function to update menu background with current carousel image
function updateMenuBackground() {
    const activeCarouselImage = document.querySelector('.carousel-container img.active');
    const navLinks = document.querySelector('.nav-links');
    
    if (activeCarouselImage && navLinks) {
        const imageUrl = activeCarouselImage.src;
        navLinks.style.setProperty('--menu-bg-image', `url(${imageUrl})`);
    }
}

// Close mobile menu when clicking on a nav link
navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    });
});

// Populate projects
function renderProjects() {
    if (!projectsGrid) {
        console.warn('Projects grid element not found');
        return;
    }
    
    projectsGrid.innerHTML = projects.map(project => `
        <div class="project-card fade-in">
            <img src="${project.image}" alt="${project.title}" class="project-img">
            <div class="project-info">
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-tags">
                    ${project.tags.map(tag => `<span>${tag}</span>`).join('')}
                </div>
                <div class="project-metrics">
                    <div class="metrics-label">Key Metrics:</div>
                    <div class="metrics-value">${project.metrics}</div>
                </div>
                <div class="project-outcome">
                    <div class="outcome-label">Outcome:</div>
                    <div class="outcome-value">${project.outcome}</div>
                </div>
                <div class="project-links">
                    <a href="#contact" class="consultation-btn">
                        <i class="fas fa-handshake"></i> Request Consultation
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// Form submission
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const formObject = Object.fromEntries(formData.entries());   
            const response = await fetch(window.location.origin + '/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formObject)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                showNotification('Thank you for your message! I will get back to you soon.', 'success');
                form.reset();
            } else {
                // Show error message
                const errorMsg = result.errors ? 
                    result.errors.map(err => err.msg).join(', ') : 
                    result.message;
                showNotification(errorMsg, 'error');
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
}

// Intersection Observer for scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe sections
const sections = document.querySelectorAll('section');
sections.forEach(section => {
    observer.observe(section);
});

// Navbar scroll effect for transparent header
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// Initialize
function init() {
    // Only render projects if we're on the main page (not payment page)
    if (document.querySelector('.projects-grid')) {
        renderProjects();
    }
}

// Carousel functionality
function initCarousel() {
    const carouselImages = document.querySelectorAll('.carousel-container img');
    const dotsContainer = document.querySelector('.carousel-dots');
    if (carouselImages.length === 0) return;

    let currentIndex = 0;
    let intervalId;

    // Create navigation dots
    carouselImages.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            goToImage(index);
            resetInterval();
        });
        dotsContainer.appendChild(dot);
    });

    const dots = document.querySelectorAll('.carousel-dots .dot');

    function updateDots() {
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function goToImage(index) {
        carouselImages[currentIndex].classList.remove('active');
        currentIndex = index;
        carouselImages[currentIndex].classList.add('active');
        updateDots();
    }

    function showNextImage() {
        goToImage((currentIndex + 1) % carouselImages.length);
        resetInterval(); // Reset interval after changing image to apply correct delay
    }

    function startInterval() {
        clearInterval(intervalId);
        // Check if current image is wave.png (index 0)
        const isWaveImage = currentIndex === 0;
        const delay = isWaveImage ? 10000 : 5000; // 10 seconds for wave.png, 5 seconds for others
        intervalId = setTimeout(() => {
            showNextImage();
        }, delay);
    }

    function resetInterval() {
        startInterval();
    }

    // Initial setup
    goToImage(0);
    startInterval();
}

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    init();
    initCarousel();
});
