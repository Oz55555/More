// Payment Form JavaScript
let stripe;
let elements;
let cardElement;
let isCardElementCreated = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Stripe
    await initializeStripe();
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount') || '0';
    const method = urlParams.get('method') || 'PayPal';
    
    // Update payment summary
    updatePaymentSummary(amount, method);
    
    // Set initial payment method selection
    setInitialPaymentMethod(method);
    
    // Show/hide card details based on payment method
    toggleCardDetails(method);
    
    // Setup payment method change listeners
    setupPaymentMethodListeners();
    
    // Form validation and submission
    setupFormHandling();
    
    // Card number formatting (only for non-Stripe fields)
    setupCardFormatting();
    
    // Back button event listener
    setupBackButton();
});

async function initializeStripe() {
    try {
        console.log('🔄 Initializing Stripe...');
        
        // Check if Stripe.js loaded
        if (typeof Stripe === 'undefined') {
            throw new Error('Stripe.js not loaded');
        }
        
        // Get Stripe publishable key from server
        const response = await fetch('/api/stripe-config');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const config = await response.json();
        console.log('📡 Stripe config received:', { success: config.success, hasKey: !!config.publishableKey });
        
        if (config.success && config.publishableKey) {
            stripe = Stripe(config.publishableKey);
            elements = stripe.elements();
            
            // Don't create card element here - create it only when needed
            console.log('✅ Stripe initialized successfully');
        } else {
            throw new Error('Invalid Stripe configuration: ' + JSON.stringify(config));
        }
    } catch (error) {
        console.error('❌ Error initializing Stripe:', error);
        showStripeError(error.message);
        // Enable fallback to traditional card fields
        enableTraditionalCardFields();
    }
}

function showStripeError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: #fee;
        border: 1px solid #fcc;
        color: #c33;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
        font-size: 14px;
    `;
    errorDiv.innerHTML = `
        <strong>⚠️ Payment System Notice:</strong><br>
        ${message}<br>
        <small>Using traditional card input as fallback.</small>
    `;
    
    const cardDetails = document.getElementById('card-details');
    if (cardDetails) {
        cardDetails.insertBefore(errorDiv, cardDetails.firstChild);
    }
}

function enableTraditionalCardFields() {
    console.log('🔄 Enabling traditional card fields as fallback');
    
    // Show traditional card input fields
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    
    if (cardNumberInput) {
        cardNumberInput.style.display = 'block';
        cardNumberInput.setAttribute('required', 'required');
    }
    if (expiryDateInput) {
        expiryDateInput.style.display = 'block';
        expiryDateInput.setAttribute('required', 'required');
    }
    if (cvvInput) {
        cvvInput.style.display = 'block';
        cvvInput.setAttribute('required', 'required');
    }
    
    // Hide Stripe container if it exists
    const stripeContainer = document.getElementById('stripe-card-element');
    if (stripeContainer) {
        stripeContainer.style.display = 'none';
    }
}

function updatePaymentSummary(amount, method) {
    document.getElementById('payment-method').textContent = method;
    document.getElementById('donation-amount').textContent = `$${parseFloat(amount).toFixed(2)}`;
    document.getElementById('total-amount').textContent = `$${parseFloat(amount).toFixed(2)}`;
    
    // Add payment method indicator class
    const methodElement = document.getElementById('payment-method');
    methodElement.className = `payment-method-indicator ${method.toLowerCase()}`;
}

function setInitialPaymentMethod(method) {
    const methodRadio = document.querySelector(`input[value="${method}"]`);
    if (methodRadio) {
        methodRadio.checked = true;
    }
}

function setupPaymentMethodListeners() {
    const paymentMethodRadios = document.querySelectorAll('input[name="paymentMethod"]');
    
    paymentMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const selectedMethod = this.value;
            updatePaymentSummary(getCurrentAmount(), selectedMethod);
            toggleCardDetails(selectedMethod);
        });
    });
}

function getCurrentAmount() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('amount') || '0';
}

function toggleCardDetails(method) {
    const cardDetails = document.getElementById('card-details');
    const cardInputs = cardDetails.querySelectorAll('input');
    
    if (method === 'PayPal') {
        cardDetails.style.display = 'none';
        // Remove required attribute for PayPal
        cardInputs.forEach(input => {
            input.removeAttribute('required');
        });
        
        // Hide Stripe card element for PayPal but keep it mounted
        const stripeCardContainer = document.getElementById('card-element');
        if (stripeCardContainer) {
            stripeCardContainer.style.display = 'none';
            console.log('🔄 Hidden Stripe element for PayPal (keeping mounted)');
        }
    } else {
        console.log(`🔄 Switching to ${method}, setting up Stripe card element...`);
        cardDetails.style.display = 'block';
        
        // Show Stripe card element if it was hidden
        const stripeCardContainer = document.getElementById('card-element');
        if (stripeCardContainer) {
            stripeCardContainer.style.display = 'block';
        }
        
        // Ensure Stripe is initialized before mounting
        if (!stripe || !elements) {
            console.warn('⚠️ Stripe not initialized, reinitializing...');
            initializeStripe().then(() => {
                setTimeout(() => {
                    setupStripeCardElementWithRetry();
                }, 500);
            });
        } else if (!cardElement || !cardElement._mounted) {
            // Only setup if element doesn't exist or isn't mounted
            setTimeout(() => {
                setupStripeCardElementWithRetry();
            }, 200);
        } else {
            console.log('✅ Stripe element already mounted and ready');
        }
        
        // Only make non-Stripe fields required
        const nameOnCardInput = document.getElementById('cardName');
        if (nameOnCardInput) {
            nameOnCardInput.setAttribute('required', 'required');
        }
    }
}

function setupStripeCardElementWithRetry(retryCount = 0) {
    const maxRetries = 3;
    
    if (!stripe || !elements) {
        console.warn('⚠️ Stripe not properly initialized, using traditional fields');
        enableTraditionalCardFields();
        return;
    }
    
    try {
        console.log(`🔄 Setting up Stripe card element (attempt ${retryCount + 1})`);
        
        // Check if target element exists
        const targetElement = document.getElementById('card-element');
        if (!targetElement) {
            console.error('❌ Target element #card-element not found');
            enableTraditionalCardFields();
            return;
        }
        
        // Hide traditional card input fields
        const cardNumberInput = document.getElementById('cardNumber');
        const expiryDateInput = document.getElementById('expiryDate');
        const cvvInput = document.getElementById('cvv');
        
        if (cardNumberInput) {
            cardNumberInput.style.display = 'none';
            cardNumberInput.removeAttribute('required');
        }
        if (expiryDateInput) {
            expiryDateInput.style.display = 'none';
            expiryDateInput.removeAttribute('required');
        }
        if (cvvInput) {
            cvvInput.style.display = 'none';
            cvvInput.removeAttribute('required');
        }
        
        // Check if element exists and is mounted - if so, we're done
        if (cardElement && cardElement._mounted) {
            console.log('✅ Stripe element already mounted and ready');
            return;
        }
        
        // If element exists but not mounted, try to mount it first
        if (cardElement && !cardElement._mounted) {
            console.log('🔄 Existing element found, attempting to mount...');
            try {
                cardElement.mount('#card-element');
                console.log('✅ Existing Stripe element mounted successfully');
                return;
            } catch (e) {
                console.warn('Failed to mount existing element, will create new one:', e);
                cardElement = null; // Clear the problematic element
            }
        }
        
        // Only create a new card element if one doesn't exist
        if (!cardElement && !isCardElementCreated) {
            console.log('🔄 Creating new Stripe card element...');
            cardElement = elements.create('card', {
                style: {
                    base: {
                        fontSize: '16px',
                        color: '#424770',
                        '::placeholder': {
                            color: '#aab7c4',
                        },
                    },
                    invalid: {
                        color: '#9e2146',
                    },
                },
            });
            isCardElementCreated = true;
        }
        
        // Clear target element and mount
        targetElement.innerHTML = '';
        
        // Wait a moment before mounting to ensure DOM is ready
        setTimeout(() => {
            try {
                // Verify element isn't already mounted
                if (cardElement._mounted) {
                    console.log('✅ Stripe card element already mounted');
                    return;
                }
                
                cardElement.mount('#card-element');
                console.log('✅ Stripe card element mounted successfully');
                
                // Handle real-time validation errors from the card Element
                cardElement.on('change', ({error}) => {
                    let errorElement = document.getElementById('card-errors');
                    if (!errorElement) {
                        errorElement = document.createElement('div');
                        errorElement.id = 'card-errors';
                        errorElement.style.cssText = 'color: #e53e3e; font-size: 14px; margin-top: 0.5rem;';
                        targetElement.appendChild(errorElement);
                    }
                    
                    if (error) {
                        errorElement.textContent = error.message;
                    } else {
                        errorElement.textContent = '';
                    }
                });
                
                // Add loading indicator
                cardElement.on('ready', () => {
                    console.log('✅ Stripe card element ready for input');
                    targetElement.style.borderColor = '#10b981';
                });
                
            } catch (mountError) {
                console.error(`❌ Error mounting Stripe element (attempt ${retryCount + 1}):`, mountError);
                
                // If it's already mounted error, that's actually OK
                if (mountError.message && mountError.message.includes('already mounted')) {
                    console.log('✅ Element was already mounted, continuing...');
                    return;
                }
                
                if (retryCount < maxRetries) {
                    console.log(`🔄 Retrying in ${(retryCount + 1) * 500}ms...`);
                    setTimeout(() => {
                        setupStripeCardElementWithRetry(retryCount + 1);
                    }, (retryCount + 1) * 500);
                } else {
                    console.warn('❌ Max retries reached, falling back to traditional fields');
                    enableTraditionalCardFields();
                }
            }
        }, 200 + (retryCount * 100));
        
    } catch (error) {
        console.error('❌ Error setting up Stripe card element:', error);
        if (retryCount < maxRetries) {
            setTimeout(() => {
                setupStripeCardElementWithRetry(retryCount + 1);
            }, (retryCount + 1) * 500);
        } else {
            enableTraditionalCardFields();
        }
    }
}

// Keep the original function for backward compatibility
function setupStripeCardElement() {
    setupStripeCardElementWithRetry(0);
}

function setupFormHandling() {
    const form = document.getElementById('payment-form');
    const submitBtn = document.getElementById('submit-btn');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            processPayment();
        }
    });
}

function validateForm() {
    const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    // For Stripe payments, skip traditional card field validation since we use Stripe Elements
    const skipCardValidation = (selectedPaymentMethod === 'Visa' || selectedPaymentMethod === 'Mastercard') && cardElement;
    
    requiredFields.forEach(field => {
        const formGroup = field.closest('.form-group');
        
        // Skip traditional card fields if using Stripe Elements
        if (skipCardValidation && ['cardNumber', 'expiryDate', 'cvv'].includes(field.id)) {
            clearFieldError(formGroup);
            return;
        }
        
        if (!field.value.trim()) {
            showFieldError(formGroup, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(formGroup);
            
            // Additional validation for non-Stripe fields
            if (field.type === 'email' && !isValidEmail(field.value)) {
                showFieldError(formGroup, 'Please enter a valid email address');
                isValid = false;
            }
            
            // Only validate traditional card fields if NOT using Stripe Elements
            if (!skipCardValidation) {
                if (field.id === 'cardNumber' && !isValidCardNumber(field.value)) {
                    showFieldError(formGroup, 'Please enter a valid card number');
                    isValid = false;
                }
                
                if (field.id === 'expiryDate' && !isValidExpiryDate(field.value)) {
                    showFieldError(formGroup, 'Please enter a valid expiry date (MM/YY)');
                    isValid = false;
                }
                
                if (field.id === 'cvv' && !isValidCVV(field.value)) {
                    showFieldError(formGroup, 'Please enter a valid CVV');
                    isValid = false;
                }
            }
        }
    });
    
    // Additional validation for Stripe Elements
    if (skipCardValidation && cardElement) {
        // Stripe Elements will handle its own validation during payment processing
        console.log('✅ Using Stripe Elements validation');
    }
    
    return isValid;
}

function showFieldError(formGroup, message) {
    const input = formGroup.querySelector('input, select, textarea');
    const errorElement = formGroup.querySelector('.error-message') || createErrorElement();
    
    input.classList.add('error');
    formGroup.classList.add('has-error');
    errorElement.textContent = message;
    
    if (!formGroup.querySelector('.error-message')) {
        formGroup.appendChild(errorElement);
    }
}

function clearFieldError(formGroup) {
    const input = formGroup.querySelector('input, select, textarea');
    const errorElement = formGroup.querySelector('.error-message');
    
    input.classList.remove('error');
    formGroup.classList.remove('has-error');
    
    if (errorElement) {
        errorElement.remove();
    }
}

function createErrorElement() {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    return errorElement;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidCardNumber(cardNumber) {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cleanNumber)) return false;
    
    // Get selected payment method
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    
    // Validate specific card types
    if (selectedMethod === 'Visa') {
        // Visa cards start with 4 and are 13, 16, or 19 digits
        if (!/^4\d{12}(\d{3})?(\d{3})?$/.test(cleanNumber)) return false;
    } else if (selectedMethod === 'Mastercard') {
        // Mastercard starts with 5[1-5] or 2[2-7] and are 16 digits
        if (!/^(5[1-5]\d{14}|2[2-7]\d{14})$/.test(cleanNumber)) return false;
    }
    
    return luhnCheck(cleanNumber);
}

function isValidExpiryDate(expiryDate) {
    const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!regex.test(expiryDate)) return false;
    
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    
    return expiry > now;
}

function isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
}

function luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

function setupCardFormatting() {
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '');
            let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
            e.target.value = formattedValue;
        });
    }
    
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
}

function processPayment() {
    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.innerHTML = '<i class="fas fa-spinner"></i> Processing...';
    submitBtn.disabled = true;
    
    // Get form data
    const formData = new FormData(document.getElementById('payment-form'));
    const paymentData = Object.fromEntries(formData.entries());
    
    // Add URL parameters and get selected payment method
    const urlParams = new URLSearchParams(window.location.search);
    paymentData.amount = urlParams.get('amount');
    
    // Get the selected payment method from the form
    const selectedMethod = document.querySelector('input[name="paymentMethod"]:checked');
    paymentData.paymentMethod = selectedMethod ? selectedMethod.value : 'PayPal';
    
    // Check if payment method is PayPal
    if (paymentData.paymentMethod === 'PayPal') {
        // Redirect to PayPal.me with the donation amount
        const paypalUsername = 'mentesaludable';
        const paypalUrl = `https://paypal.me/${paypalUsername}/${paymentData.amount}`;
        
        // Optional: Add a note to the PayPal payment
        const note = encodeURIComponent(`Donation from ${paymentData.firstName} ${paymentData.lastName}`);
        const paypalUrlWithNote = `${paypalUrl}?note=${note}`;
        
        // Show PayPal redirect message
        showPayPalRedirect(paymentData, paypalUrlWithNote);
        
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        return;
    }
    
    // For credit card payments, process with Stripe
    processStripePayment(paymentData, submitBtn, originalText);
}

async function processStripePayment(paymentData, submitBtn, originalText) {
    try {
        console.log('🔄 Processing Stripe payment...');
        
        if (!stripe || !cardElement) {
            throw new Error('Stripe not properly initialized - using traditional payment processing');
        }
        
        // Ensure card element is properly mounted before payment
        const targetElement = document.getElementById('card-element');
        if (!cardElement || !cardElement._mounted) {
            console.warn('⚠️ Card element not mounted, reinitializing...');
            
            // Reinitialize Stripe elements if needed
            if (!cardElement && elements) {
                cardElement = elements.create('card', {
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#424770',
                            '::placeholder': {
                                color: '#aab7c4',
                            },
                        },
                        invalid: {
                            color: '#9e2146',
                        },
                    },
                });
            }
            
            if (targetElement && cardElement) {
                try {
                    // Clear and remount
                    targetElement.innerHTML = '';
                    cardElement.mount('#card-element');
                    console.log('✅ Card element remounted for payment');
                } catch (mountError) {
                    console.error('❌ Failed to mount element:', mountError);
                    throw new Error('No se pudo inicializar el formulario de pago. Recarga la página e intenta nuevamente.');
                }
            } else {
                throw new Error('Formulario de pago no disponible. Recarga la página e intenta nuevamente.');
            }
        }

        // Create payment intent on server
        const response = await fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: parseFloat(paymentData.amount),
                currency: 'usd'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Payment intent creation failed:', errorData);
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const { clientSecret, paymentIntentId } = await response.json();
        console.log('✅ Payment intent created successfully');

        if (!clientSecret) {
            throw new Error('Failed to create payment intent - no client secret received');
        }

        console.log('🔄 Confirming payment with Stripe...');
        
        // Validate that card element is visible and ready
        const cardElementContainer = document.getElementById('card-element');
        if (!cardElementContainer || cardElementContainer.style.display === 'none') {
            throw new Error('El formulario de tarjeta no está visible. Por favor, selecciona un método de pago válido.');
        }
        
        // Confirm payment with Stripe
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
                        country: paymentData.country || 'US'
                    }
                }
            }
        });

        if (error) {
            console.error('Payment failed:', error);
            
            // Show specific error message based on error type
            let userFriendlyMessage = error.message;
            
            // Handle incomplete card number specifically
            if (error.code === 'incomplete_number') {
                userFriendlyMessage = 'Por favor, ingresa un número de tarjeta completo y válido.';
            } else if (error.code === 'incomplete_cvc') {
                userFriendlyMessage = 'Por favor, ingresa el código CVC completo de tu tarjeta.';
            } else if (error.code === 'incomplete_expiry') {
                userFriendlyMessage = 'Por favor, ingresa la fecha de vencimiento completa de tu tarjeta.';
            }
            if (error.code === 'card_declined') {
                userFriendlyMessage = '⚠️ Tu tarjeta fue rechazada. Por favor, verifica los datos o intenta con otra tarjeta.';
            } else if (error.code === 'insufficient_funds') {
                userFriendlyMessage = 'Fondos insuficientes en la tarjeta.';
            } else if (error.code === 'expired_card') {
                userFriendlyMessage = 'La tarjeta ha expirado.';
            } else if (error.code === 'incorrect_cvc') {
                userFriendlyMessage = 'El código CVC es incorrecto.';
            }
            
            showCreditCardError({
                ...paymentData,
                error: userFriendlyMessage,
                originalError: error.message,
                errorCode: error.code
            });
        } else if (paymentIntent.status === 'succeeded') {
            // Confirm payment on server and save donation info
            const confirmResponse = await fetch('/api/confirm-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                    donorInfo: {
                        firstName: paymentData.firstName,
                        lastName: paymentData.lastName,
                        email: paymentData.email,
                        phone: paymentData.phone,
                        address: paymentData.address,
                        city: paymentData.city,
                        state: paymentData.state,
                        zipCode: paymentData.zipCode,
                        country: paymentData.country,
                        anonymous: paymentData.anonymous
                    },
                    amount: paymentData.amount,
                    message: paymentData.message
                })
            });

            const confirmResult = await confirmResponse.json();
            
            if (confirmResult.success) {
                showCreditCardSuccess({
                    ...paymentData,
                    transactionId: confirmResult.transactionId,
                    chargeId: confirmResult.chargeId
                });
            } else {
                throw new Error(confirmResult.message || 'Failed to confirm payment');
            }
        }

    } catch (error) {
        console.error('Payment processing error:', error);
        showCreditCardError({
            ...paymentData,
            error: error.message
        });
    } finally {
        // Reset button state
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

function showPayPalRedirect(paymentData, paypalUrl) {
    // Create PayPal redirect modal
    const paypalModal = `
        <div class="paypal-redirect-modal">
            <div class="modal-content">
                <i class="fab fa-paypal paypal-icon"></i>
                <h2>Redirigiendo a PayPal</h2>
                <p>Serás redirigido a PayPal para completar tu donación de <strong>$${paymentData.amount}</strong></p>
                <p class="instructions">Después de completar el pago en PayPal, puedes cerrar esta ventana.</p>
                <div class="modal-actions">
                    <button id="open-paypal-btn" class="btn-primary">
                        <i class="fab fa-paypal"></i> Abrir PayPal
                    </button>
                    <button id="close-modal-btn" class="btn-secondary">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', paypalModal);
    
    // Add event listeners
    document.getElementById('open-paypal-btn').addEventListener('click', function() {
        window.open(paypalUrl, '_blank');
        // Update modal to show payment instructions
        setTimeout(() => {
            updateModalForPaymentInProgress(paymentData);
        }, 1000);
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', function() {
        document.querySelector('.paypal-redirect-modal').remove();
    });
}

function updateModalForPaymentInProgress(paymentData) {
    const modal = document.querySelector('.paypal-redirect-modal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.innerHTML = `
            <i class="fas fa-clock paypal-icon"></i>
            <h2>Pago en Proceso</h2>
            <p>Se ha abierto PayPal en una nueva ventana.</p>
            <p><strong>Instrucciones:</strong></p>
            <ol style="text-align: left; margin: 1rem 0;">
                <li>Completa el pago de $${paymentData.amount} en la ventana de PayPal</li>
                <li>Una vez completado, regresa a esta página</li>
                <li>Haz clic en "He completado el pago" abajo</li>
            </ol>
            <div class="modal-actions">
                <button id="payment-completed-btn" class="btn-primary">
                    <i class="fas fa-check"></i> He completado el pago
                </button>
                <button id="reopen-paypal-btn" class="btn-secondary">
                    <i class="fab fa-paypal"></i> Reabrir PayPal
                </button>
                <button id="cancel-payment-btn" class="btn-secondary">
                    Cancelar
                </button>
            </div>
        `;
        
        // Add new event listeners
        document.getElementById('payment-completed-btn').addEventListener('click', function() {
            modal.remove();
            showPaymentSuccess(paymentData);
        });
        
        document.getElementById('reopen-paypal-btn').addEventListener('click', function() {
            const paypalUsername = 'mentesaludable';
            const paypalUrl = `https://paypal.me/${paypalUsername}/${paymentData.amount}`;
            const note = encodeURIComponent(`Donation from ${paymentData.firstName} ${paymentData.lastName}`);
            const paypalUrlWithNote = `${paypalUrl}?note=${note}`;
            
            // Log the URL for debugging
            console.log('PayPal URL:', paypalUrlWithNote);
            window.open(paypalUrlWithNote, '_blank');
        });
        
        document.getElementById('cancel-payment-btn').addEventListener('click', function() {
            modal.remove();
        });
    }
}

function showPaymentSuccess(paymentData) {
    // Create success modal for PayPal payments
    const successMessage = `
        <div class="payment-success">
            <div class="success-content">
                <i class="fas fa-info-circle"></i>
                <h2>Gracias por tu Intención de Donación</h2>
                <p>Has indicado que completaste una donación de $${paymentData.amount}.</p>
                <p><strong>Importante:</strong> Este mensaje NO confirma que el pago fue procesado.</p>
                <p>Para verificar tu donación:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Revisa tu cuenta PayPal en "Actividad"</li>
                    <li>Busca un email de confirmación de PayPal</li>
                    <li>Si no completaste el pago, puedes intentar nuevamente</li>
                </ul>
                <p><small>Solo PayPal puede confirmar transacciones reales.</small></p>
                <div class="modal-actions">
                    <button id="retry-payment-btn" class="btn-primary">
                        <i class="fab fa-paypal"></i> Reintentar Pago
                    </button>
                    <button id="return-home-btn" class="btn-secondary">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successMessage);
}

function showCreditCardSuccess(paymentData) {
    const successMessage = `
        <div class="payment-success">
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <h2>¡Pago Procesado Exitosamente!</h2>
                <p>Tu donación de <strong>$${paymentData.amount}</strong> ha sido procesada.</p>
                
                <p class="thank-you-message">
                    <strong>¡Gracias ${paymentData.firstName}!</strong><br>
                    Tu generosa donación ayuda a mantener este proyecto funcionando.
                </p>
                
                <div class="modal-actions">
                    <button id="return-home-btn" class="btn-primary">
                        Volver al Inicio
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', successMessage);
    
    // Add event listener for download receipt
    document.getElementById('download-receipt-btn').addEventListener('click', function() {
        generateReceipt(paymentData, transactionId);
    });
}

function showCreditCardError(paymentData) {
    const errorMessage = `
        <div class="payment-error">
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <h2>Error en el Procesamiento</h2>
                <p><strong>${paymentData.error}</strong></p>
                
                <div class="modal-actions">
                    <button id="retry-card-payment-btn" class="btn-primary">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                    <button id="return-home-btn" class="btn-secondary">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', errorMessage);
    
    // Add event listeners
    document.getElementById('retry-card-payment-btn').addEventListener('click', function() {
        document.querySelector('.payment-error').remove();
    });
    
    document.getElementById('try-paypal-btn').addEventListener('click', function() {
        // Switch to PayPal and close modal
        document.querySelector('input[value="PayPal"]').checked = true;
        toggleCardDetails('PayPal');
        updatePaymentSummary(paymentData.amount, 'PayPal');
        document.querySelector('.payment-error').remove();
    });
}

function generateReceipt(paymentData, transactionId) {
    // Create a simple text receipt
    const receiptContent = `
===========================================
           RECIBO DE DONACIÓN
===========================================

Fecha: ${new Date().toLocaleDateString('es-ES')}
ID Transacción: ${transactionId}

-------------------------------------------
DETALLES DEL DONANTE:
-------------------------------------------
Nombre: ${paymentData.firstName} ${paymentData.lastName}
Email: ${paymentData.email}
Teléfono: ${paymentData.phone || 'No proporcionado'}

-------------------------------------------
DETALLES DEL PAGO:
-------------------------------------------
Método: ${paymentData.paymentMethod}
Monto: $${paymentData.amount}
Estado: APROBADO

-------------------------------------------
MENSAJE:
-------------------------------------------
${paymentData.message || 'Sin mensaje'}

-------------------------------------------
¡Gracias por tu generosa donación!
Tu apoyo es muy valorado.

Oscar Medina
Desarrollador Web
===========================================
    `;
    
    // Create and download the receipt
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo_donacion_${transactionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show download confirmation
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = '<i class="fas fa-check"></i> Recibo descargado exitosamente';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function setupBackButton() {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            // Always redirect to root of current domain
            window.location.href = '/';
        });
    }
}

// Set current year in footer
const yearElement = document.getElementById('year');
if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// Add event listener for buttons in success modal
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'return-home-btn') {
        window.location.href = '/';
    }
    // New event listener for retry-payment-btn
    if (e.target && e.target.id === 'retry-payment-btn') {
        // Get payment data from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const amount = urlParams.get('amount');
        const paypalUsername = 'mentesaludable';
        const paypalUrl = `https://paypal.me/${paypalUsername}/${amount}`;
        
        // Remove success modal and open PayPal again
        document.querySelector('.payment-success').remove();
        window.open(paypalUrl, '_blank');
        
        // Show the payment in progress modal again
        const paymentData = {
            amount: amount,
            firstName: 'Usuario',
            lastName: ''
        };
        showPayPalRedirect(paymentData, paypalUrl);
    }
});

// Style the modals
const style = document.createElement('style');
style.textContent = `
    .payment-success, .paypal-redirect-modal, .payment-error {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    .success-content, .modal-content, .error-content {
        background: white;
        padding: 3rem;
        border-radius: 15px;
        text-align: center;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    .success-content i, .modal-content i, .error-content i {
        font-size: 4rem;
        margin-bottom: 1rem;
    }
    .success-content .fa-check-circle {
        color: #10b981;
    }
    .success-content .fa-info-circle {
        color: #3b82f6;
    }
    .error-content .fa-exclamation-triangle {
        color: #ef4444;
    }
    .paypal-icon {
        color: #0070ba !important;
    }
    .success-content h2, .modal-content h2, .error-content h2 {
        color: #333;
        margin-bottom: 1rem;
        font-size: 1.5rem;
    }
    .success-content p, .modal-content p, .error-content p {
        color: #666;
        margin-bottom: 1rem;
        line-height: 1.5;
    }
    .transaction-details {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        text-align: left;
    }
    .transaction-details h3 {
        color: #333;
        margin-bottom: 1rem;
        font-size: 1.1rem;
        text-align: center;
    }
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .status-approved {
        color: #10b981;
        font-weight: 600;
    }
    .thank-you-message {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 1.5rem 0;
    }
    .receipt-info {
        color: #888;
        font-style: italic;
    }
    .error-details {
        background: #fef2f2;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        text-align: left;
    }
    .error-details h3 {
        color: #dc2626;
        margin-bottom: 1rem;
        text-align: center;
    }
    .instructions {
        font-size: 0.9rem;
        color: #888 !important;
    }
    .modal-actions {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
        flex-wrap: wrap;
    }
    .btn-primary, .btn-secondary {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }
    .btn-primary {
        background: #0070ba;
        color: white;
    }
    .btn-primary:hover {
        background: #005ea6;
        transform: translateY(-2px);
    }
    .btn-secondary {
        background: #f5f5f5;
        color: #333;
    }
    .btn-secondary:hover {
        background: #e0e0e0;
        transform: translateY(-2px);
    }
    @media (max-width: 768px) {
        .success-content, .modal-content, .error-content {
            margin: 1rem;
            padding: 2rem;
            max-width: calc(100% - 2rem);
        }
        .modal-actions {
            flex-direction: column;
        }
        .btn-primary, .btn-secondary {
            width: 100%;
            justify-content: center;
        }
    }
`;
document.head.appendChild(style);
