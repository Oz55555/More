// Donation Selection Page JavaScript
let selectedAmount = 0;
let selectedMethod = '';

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
                selectedAmount = amount;
                updateSelectedSummary();
            }
        });
    }

    // Proceed button
    const proceedBtn = document.getElementById('proceed-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function() {
            proceedToPayment();
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
        
        selectedAmount = parseFloat(amount);
        updateSelectedSummary();
    }
}

function selectPaymentMethod(method, cardElement) {
    // Remove active class from all payment method cards
    document.querySelectorAll('.payment-method-card').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to selected card
    cardElement.classList.add('active');

    selectedMethod = method;
    updateSelectedSummary();
}

function updateSelectedSummary() {
    const summaryElement = document.querySelector('.selected-summary');
    const amountElement = document.getElementById('selected-amount');
    const methodElement = document.getElementById('selected-method');

    if (selectedAmount > 0 && selectedMethod) {
        // Show summary
        if (summaryElement) {
            summaryElement.style.display = 'block';
        }
        
        if (amountElement) {
            amountElement.textContent = `$${selectedAmount}`;
        }
        
        if (methodElement) {
            const methodNames = {
                'visa': 'Visa',
                'mastercard': 'Mastercard',
                'paypal': 'PayPal'
            };
            methodElement.textContent = methodNames[selectedMethod] || selectedMethod;
        }
    } else {
        // Hide summary
        if (summaryElement) {
            summaryElement.style.display = 'none';
        }
    }
}

function proceedToPayment() {
    if (selectedAmount <= 0) {
        alert('Por favor selecciona un monto de donación.');
        return;
    }

    if (!selectedMethod) {
        alert('Por favor selecciona un método de pago.');
        return;
    }

    // Redirect to payment page with selected parameters
    const paymentMethod = selectedMethod === 'visa' ? 'Visa' : 
                         selectedMethod === 'mastercard' ? 'Mastercard' : 'PayPal';
    
    window.location.href = `/payment.html?amount=${selectedAmount}&method=${paymentMethod}`;
}

// Mobile menu functionality (inherited from main.js)
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
