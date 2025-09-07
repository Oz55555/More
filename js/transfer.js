// Transfer Page JavaScript
let transferAmount = 0;
let transferMethod = '';
let stripe;
let cardElement;
let isStripeLoaded = false;

document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Amount button event listeners
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            selectAmount(amount, this);
        });
    });

    // Payment method card event listeners
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', function() {
            const method = this.getAttribute('data-method');
            selectPaymentMethod(method, this);
        });
    });

    // Custom amount input
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            if (amount > 0) {
                transferAmount = amount;
                checkIfReadyToShowForm();
            }
        });
    }

    // Form submission
    const transferForm = document.getElementById('transfer-form');
    // Form submission handler
    document.getElementById('transfer-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processTransfer();
    });
    
    // Back button handler
    const backBtn = document.getElementById('back-btn-transfer');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            goBack();
        });
    }
});

function selectAmount(amount, buttonElement) {
    // Remove active class from all amount buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to selected button
    buttonElement.classList.add('active');

    if (amount === 'custom') {
        // Show custom amount input
        const customInput = document.querySelector('.custom-amount-input');
        if (customInput) {
            customInput.style.display = 'block';
            document.getElementById('customAmount').focus();
        }
    } else {
        // Hide custom amount input
        const customInput = document.querySelector('.custom-amount-input');
        if (customInput) {
            customInput.style.display = 'none';
        }
        
        transferAmount = parseFloat(amount);
        checkIfReadyToShowForm();
    }
}

function selectPaymentMethod(method, cardElement) {
    // Remove active class from all payment method cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to selected card
    cardElement.classList.add('active');

    transferMethod = method;
    showPaymentForm();
}

function showPaymentForm() {
    if (transferAmount > 0 && transferMethod) {
        const formSection = document.querySelector('.payment-form-section');
        const summaryAmount = document.getElementById('summary-amount');
        const summaryMethod = document.getElementById('summary-method');
        
        // Update summary
        if (summaryAmount) {
            summaryAmount.textContent = `$${transferAmount}`;
        }
        
        if (summaryMethod) {
            const methodNames = {
                'visa': 'Visa',
                'mastercard': 'Mastercard',
                'paypal': 'PayPal'
            };
            summaryMethod.textContent = methodNames[transferMethod] || transferMethod;
        }
        
        // Show form section
        if (formSection) {
            formSection.style.display = 'block';
        }
        
        // Show/hide payment method specific sections
        const cardSection = document.querySelector('.card-payment-section');
        const paypalSection = document.querySelector('.paypal-payment-section');
        
        if (transferMethod === 'visa' || transferMethod === 'mastercard') {
            if (cardSection) cardSection.style.display = 'block';
            if (paypalSection) paypalSection.style.display = 'none';
            setupStripeElements();
        } else if (transferMethod === 'paypal') {
            if (cardSection) cardSection.style.display = 'none';
            if (paypalSection) paypalSection.style.display = 'block';
        }
        
        // Scroll to form
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function setupStripeElements() {
    if (!window.Stripe) {
        console.error('Stripe.js not loaded');
        return;
    }
    
    if (!isStripeLoaded) {
        try {
            const response = await fetch('/stripe-config');
            const { publishableKey } = await response.json();
            stripe = Stripe(publishableKey);
            
            const elements = stripe.elements();
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                            color: '#aab7c4',
                        },
                    },
                },
            });
            
            cardElement.mount('#card-element');
            
            cardElement.on('change', function(event) {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
            
            isStripeLoaded = true;
        } catch (error) {
            console.error('Error setting up Stripe:', error);
        }
    }
}

function checkIfReadyToShowForm() {
    if (transferAmount > 0 && transferMethod) {
        showPaymentForm();
    }
}

async function processTransfer() {
    const submitBtn = document.getElementById('submit-transfer');
    
    if (transferMethod === 'paypal') {
        // Redirect to PayPal
        const paypalUrl = `https://paypal.me/oscarmedina/${transferAmount}`;
        window.open(paypalUrl, '_blank');
        return;
    }
    
    // Process Stripe payment
    if (!stripe || !cardElement) {
        alert('Payment system not ready. Please try again.');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Get form data
        const formData = new FormData(document.getElementById('transfer-form'));
        const paymentData = {
            amount: transferAmount,
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode'),
            paymentMethod: transferMethod === 'visa' ? 'Visa' : 'Mastercard'
        };
        
        // Create payment intent
        const response = await fetch('/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentData)
        });
        
        const { clientSecret } = await response.json();
        
        // Confirm payment
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: `${paymentData.firstName} ${paymentData.lastName}`,
                    email: paymentData.email,
                    phone: paymentData.phone || undefined,
                    address: {
                        line1: paymentData.address || undefined,
                        city: paymentData.city || undefined,
                        state: paymentData.state || undefined,
                        postal_code: paymentData.zipCode || undefined,
                        country: 'US'
                    }
                }
            }
        });
        
        if (error) {
            throw new Error(error.message);
        }
        
        // Payment successful
        alert('Transfer successful! Thank you.');
        window.location.href = '/index.html';
        
    } catch (error) {
        alert(`Transfer error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Complete Transfer';
    }
}

function goBack() {
    const formSection = document.querySelector('.payment-form-section');
    if (formSection) {
        formSection.style.display = 'none';
    }
    
    // Clear selections
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('active');
    });
    
    transferMethod = '';
}

// Mobile menu functionality
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
    });

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-links li a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    });
}
