// Sample projects data
const projects = [
    {
        title: 'Task Management App',
        description: 'A responsive web application built with React and Node.js that helps users manage their tasks efficiently.',
        image: 'https://source.unsplash.com/random/600x400?tech,code',
        tags: ['React', 'Node.js', 'MongoDB'],
        demo: '#',
        code: '#'
    },
    {
        title: 'E-commerce Platform',
        description: 'A full-featured e-commerce platform with user authentication, product catalog, and payment integration.',
        image: 'https://source.unsplash.com/random/600x400?ecommerce,shopping',
        tags: ['Vue.js', 'Express', 'PostgreSQL'],
        demo: '#',
        code: '#'
    },
    {
        title: 'Portfolio Website',
        description: 'A modern portfolio website template with smooth animations and responsive design.',
        image: 'https://source.unsplash.com/random/600x400?portfolio,design',
        tags: ['HTML5', 'CSS3', 'JavaScript'],
        demo: '#',
        code: '#'
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
});

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
                top: targetElement.offsetTop - 80,
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
                <div class="project-links">
                    <a href="${project.demo}" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-external-link-alt"></i> Live Demo
                    </a>
                    <a href="${project.code}" target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-github"></i> View Code
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

// Navbar scroll effect
let lastScroll = 0;
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        return;
    }
    
    if (currentScroll > lastScroll && !navLinks.classList.contains('active')) {
        // Scrolling down
        header.style.transform = 'translateY(-100%)';
    } else {
        // Scrolling up
        header.style.transform = 'translateY(0)';
        header.style.boxShadow = currentScroll > 100 ? '0 5px 20px rgba(0, 0, 0, 0.1)' : '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Initialize
function init() {
    // Only render projects if we're on the main page (not payment page)
    if (document.querySelector('.projects-grid')) {
        renderProjects();
    }
}

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
