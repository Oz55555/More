// Donation Page JavaScript
let donationMethod = '';
let stripe = null;
let cardElement = null;
let isStripeLoaded = false;

// Initialize donation page
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    // Payment method selection handlers
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', function() {
            const method = this.dataset.method;
            selectPaymentMethod(method);
        });
    });
    
    // Form submission handler
    document.getElementById('donation-form').addEventListener('submit', function(e) {
        e.preventDefault();
        processDonation();
    });
    
    // Back button handler
    document.getElementById('back-btn').addEventListener('click', function() {
        goBack();
    });
    
    // Amount input handler for real-time validation
    document.getElementById('donationAmount').addEventListener('input', function() {
        const value = parseFloat(this.value);
        if (value && value > 0) {
            this.setCustomValidity('');
        } else {
            this.setCustomValidity('Please enter a valid donation amount');
        }
    });

    // Amount button event listeners
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = this.getAttribute('data-amount');
            selectAmount(amount, this);
        });
    });

    // Custom amount input
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) {
        customAmountInput.addEventListener('input', function() {
            const amount = parseFloat(this.value) || 0;
            if (amount > 0) {
                donationAmount = amount;
                checkIfReadyToShowForm();
            }
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
        
        donationAmount = parseFloat(amount);
        checkIfReadyToShowForm();
    }
}

function selectPaymentMethod(method) {
    donationMethod = method;
    
    // Remove active class from all cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to selected card
    document.querySelector(`[data-method="${method}"]`).classList.add('active');
    
    // Show payment form
    showPaymentForm(method);
}

function showPaymentForm(method) {
    const formSection = document.querySelector('.payment-form-section');
    const summaryMethod = document.getElementById('summary-method');
    
    if (formSection && summaryMethod) {
        // Update summary
        summaryMethod.textContent = method.charAt(0).toUpperCase() + method.slice(1);
        
        // Show form section
        formSection.style.display = 'block';
        
        // Show/hide relevant payment sections
        const cardSection = document.querySelector('.card-payment-section');
        const paypalSection = document.querySelector('.paypal-payment-section');
        
        if (method === 'paypal') {
            cardSection.style.display = 'none';
            paypalSection.style.display = 'block';
        } else {
            cardSection.style.display = 'block';
            paypalSection.style.display = 'none';
            
            // Setup Stripe Elements for card payments
            setupStripeElements();
        }
        
        // Scroll to form
        formSection.scrollIntoView({ behavior: 'smooth' });
    }
}

async function setupStripeElements() {
    console.log('🔄 Setting up Stripe Elements...');
    
    if (!window.Stripe) {
        console.error('❌ Stripe.js not loaded from CDN');
        enableTraditionalCardFields();
        return;
    }
    
    console.log('✅ Stripe.js loaded successfully');
    
    if (!isStripeLoaded) {
        try {
            console.log('🔄 Fetching Stripe configuration...');
            const response = await fetch('/api/stripe-config');
            
            if (!response.ok) {
                throw new Error(`Stripe config endpoint returned ${response.status}`);
            }
            
            const config = await response.json();
            console.log('📋 Stripe config response:', config);
            
            if (!config.success || !config.publishableKey) {
                throw new Error(config.error || 'No Stripe publishable key provided');
            }
            
            console.log('🔑 Initializing Stripe with key:', config.publishableKey.substring(0, 12) + '...');
            stripe = Stripe(config.publishableKey);
            
            const elements = stripe.elements();
            console.log('🎨 Creating card element...');
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
            
            console.log('📍 Mounting card element to #card-element...');
            const cardElementContainer = document.getElementById('card-element');
            if (!cardElementContainer) {
                throw new Error('Card element container not found');
            }
            
            cardElement.mount('#card-element');
            console.log('✅ Stripe Elements mounted successfully');
            
            cardElement.addEventListener('change', (event) => {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
            
            isStripeLoaded = true;
            console.log('🎉 Stripe setup completed successfully');
        } catch (error) {
            console.warn('⚠️ Stripe setup failed, using traditional card fields:', error.message);
            enableTraditionalCardFields();
        }
    }
}

function enableTraditionalCardFields() {
    console.log(' Enabling traditional card fields as fallback');
    
    // Show traditional card input fields
    const cardNumberField = document.getElementById('cardNumber');
    const expiryField = document.getElementById('expiryDate');
    const cvvField = document.getElementById('cvv');
    
    if (cardNumberField && expiryField && cvvField) {
        cardNumberField.style.display = 'block';
        expiryField.style.display = 'block';
        cvvField.style.display = 'block';
        
        // Hide Stripe Elements container
        const stripeElement = document.getElementById('card-element');
        if (stripeElement) {
            stripeElement.style.display = 'none';
        }
        
        // Add visual indicator that we're using fallback
        const cardSection = document.querySelector('.card-payment-section h4');
        if (cardSection) {
            cardSection.innerHTML = 'Card Information <small style="color: #6c757d;">(Secure Form)</small>';
        }
        
        console.log(' Traditional card fields enabled');
    } else {
        console.error(' Could not find traditional card input fields');
    }
}

function checkIfReadyToShowForm() {
    if (donationAmount > 0 && donationMethod) {
        showPaymentForm();
    }
}

async function processDonation() {
    const submitBtn = document.getElementById('submit-donation');
    const formData = new FormData(document.getElementById('donation-form'));
    const donationAmount = parseFloat(formData.get('donationAmount'));
    
    // Validate donation amount
    if (!donationAmount || donationAmount <= 0) {
        alert('Please enter a valid donation amount.');
        return;
    }
    
    if (donationMethod === 'paypal') {
        // Redirect to PayPal
        const paypalUrl = `https://paypal.me/oscarmedina/${donationAmount}`;
        window.open(paypalUrl, '_blank');
        return;
    }
    
    // Check if we should use traditional card processing
    if (!stripe || !cardElement) {
        // Use traditional card processing
        processTraditionalCardPayment();
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    try {
        // Get form data
        const paymentData = {
            amount: donationAmount * 100, // Convert to cents
            currency: 'usd',
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode'),
            paymentMethod: donationMethod === 'visa' ? 'Visa' : 'Mastercard'
        };
        
        // Create payment intent
        const response = await fetch('/api/create-payment-intent', {
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
        alert('Donation successful! Thank you for your support.');
        window.location.href = '/index.html';
        
    } catch (error) {
        alert(`Donation error: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Complete Donation';
    }
}

function processTraditionalCardPayment() {
    const submitBtn = document.getElementById('submit-donation');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Get form data
    const formData = new FormData(document.getElementById('donation-form'));
    
    // Validate traditional card fields
    const cardNumber = formData.get('cardNumber');
    const expiryDate = formData.get('expiryDate');
    const cvv = formData.get('cvv');
    const cardName = formData.get('cardName');
    
    if (!cardNumber || !expiryDate || !cvv || !cardName) {
        alert('Please fill in all card details.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Complete Donation';
        return;
    }
    
    // For demo purposes, show success message
    // In a real implementation, you would send this to your payment processor
    setTimeout(() => {
        alert('Donation processed successfully! Thank you for your support.');
        window.location.href = '/index.html';
    }, 2000);
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
    
    donationMethod = '';
}

// Mobile menu functionality (avoid duplicate declarations)
if (!window.mobileMenuInitialized) {
    const donationHamburger = document.querySelector('.hamburger');
    const donationNavLinks = document.querySelector('.nav-links');

    if (donationHamburger && donationNavLinks) {
        donationHamburger.addEventListener('click', () => {
            donationHamburger.classList.toggle('active');
            donationNavLinks.classList.toggle('active');
            document.body.style.overflow = donationNavLinks.classList.contains('active') ? 'hidden' : 'auto';
        });

        // Close mobile menu when clicking on a nav link
        document.querySelectorAll('.nav-links li a').forEach(link => {
            link.addEventListener('click', () => {
                donationHamburger.classList.remove('active');
                donationNavLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }
    
    window.mobileMenuInitialized = true;
}
