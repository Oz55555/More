// Payment Form JavaScript
let stripe;
let elements;
let cardElement;

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
        // Get Stripe publishable key from server
        const response = await fetch('/api/stripe-config');
        const config = await response.json();
        
        if (config.success && config.publishableKey) {
            stripe = Stripe(config.publishableKey);
            elements = stripe.elements();
            
            // Create card element
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
        } else {
            console.error('Failed to load Stripe configuration');
        }
    } catch (error) {
        console.error('Error initializing Stripe:', error);
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
        
        // Unmount Stripe card element if it exists
        if (cardElement && cardElement._mounted) {
            cardElement.unmount();
        }
    } else {
        cardDetails.style.display = 'block';
        
        // Replace traditional card inputs with Stripe Elements
        setupStripeCardElement();
        
        // Only make non-Stripe fields required
        const nameOnCardInput = document.getElementById('cardName');
        if (nameOnCardInput) {
            nameOnCardInput.setAttribute('required', 'required');
        }
    }
}

function setupStripeCardElement() {
    if (!stripe || !elements) {
        console.error('Stripe not initialized');
        return;
    }
    
    // Hide traditional card input fields
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    
    if (cardNumberInput) cardNumberInput.style.display = 'none';
    if (expiryDateInput) expiryDateInput.style.display = 'none';
    if (cvvInput) cvvInput.style.display = 'none';
    
    // Create container for Stripe card element
    let stripeCardContainer = document.getElementById('stripe-card-element');
    if (!stripeCardContainer) {
        stripeCardContainer = document.createElement('div');
        stripeCardContainer.id = 'stripe-card-element';
        stripeCardContainer.style.cssText = `
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            margin-bottom: 1rem;
            background: white;
        `;
        
        // Insert after card number label
        const cardNumberGroup = cardNumberInput.closest('.form-group');
        if (cardNumberGroup) {
            cardNumberGroup.appendChild(stripeCardContainer);
        }
    }
    
    // Mount Stripe card element
    if (cardElement && !cardElement._mounted) {
        cardElement.mount('#stripe-card-element');
        
        // Handle real-time validation errors from the card Element
        cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (!displayError) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'card-errors';
                errorDiv.style.cssText = 'color: #e53e3e; font-size: 14px; margin-top: 0.5rem;';
                stripeCardContainer.appendChild(errorDiv);
            }
            
            const errorElement = document.getElementById('card-errors');
            if (error) {
                errorElement.textContent = error.message;
            } else {
                errorElement.textContent = '';
            }
        });
    }
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
    const requiredFields = document.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        const formGroup = field.closest('.form-group');
        
        if (!field.value.trim()) {
            showFieldError(formGroup, 'This field is required');
            isValid = false;
        } else {
            clearFieldError(formGroup);
            
            // Additional validation
            if (field.type === 'email' && !isValidEmail(field.value)) {
                showFieldError(formGroup, 'Please enter a valid email address');
                isValid = false;
            }
            
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
    });
    
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
        if (!stripe || !cardElement) {
            throw new Error('Stripe not properly initialized');
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

        const { clientSecret, paymentIntentId } = await response.json();

        if (!clientSecret) {
            throw new Error('Failed to create payment intent');
        }

        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: `${paymentData.firstName} ${paymentData.lastName}`,
                    email: paymentData.email,
                    phone: paymentData.phone,
                    address: {
                        line1: paymentData.address,
                        city: paymentData.city,
                        state: paymentData.state,
                        postal_code: paymentData.zipCode,
                        country: paymentData.country
                    }
                }
            }
        });

        if (error) {
            console.error('Payment failed:', error);
            showCreditCardError({
                ...paymentData,
                error: error.message
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
    // Generate a fake transaction ID for demo purposes
    const transactionId = 'TXN' + Date.now().toString().slice(-8);
    const cardType = paymentData.paymentMethod;
    const lastFourDigits = paymentData.cardNumber ? paymentData.cardNumber.replace(/\s/g, '').slice(-4) : '****';
    
    const successMessage = `
        <div class="payment-success">
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <h2>¡Pago Procesado Exitosamente!</h2>
                <p>Tu donación de <strong>$${paymentData.amount}</strong> ha sido procesada.</p>
                
                <div class="transaction-details">
                    <h3>Detalles de la Transacción</h3>
                    <div class="detail-row">
                        <span>ID de Transacción:</span>
                        <span><strong>${transactionId}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span>Método de Pago:</span>
                        <span>${cardType} ****${lastFourDigits}</span>
                    </div>
                    <div class="detail-row">
                        <span>Fecha:</span>
                        <span>${new Date().toLocaleDateString('es-ES')}</span>
                    </div>
                    <div class="detail-row">
                        <span>Estado:</span>
                        <span class="status-approved">Aprobado</span>
                    </div>
                </div>
                
                <p class="thank-you-message">
                    <strong>¡Gracias ${paymentData.firstName}!</strong><br>
                    Tu generosa donación ayuda a mantener este proyecto funcionando.
                </p>
                
                <p class="receipt-info">
                    <small>Se enviará un recibo por email a ${paymentData.email}</small>
                </p>
                
                <div class="modal-actions">
                    <button id="download-receipt-btn" class="btn-primary">
                        <i class="fas fa-download"></i> Descargar Recibo
                    </button>
                    <button id="return-home-btn" class="btn-secondary">
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
                <p>Lo sentimos, no pudimos procesar tu pago en este momento.</p>
                
                <div class="error-details">
                    <h3>Posibles causas:</h3>
                    <ul style="text-align: left; margin: 1rem 0;">
                        <li>Fondos insuficientes en la tarjeta</li>
                        <li>Información de tarjeta incorrecta</li>
                        <li>Tarjeta expirada o bloqueada</li>
                        <li>Problema temporal del procesador</li>
                    </ul>
                </div>
                
                <p><strong>Sugerencias:</strong></p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Verifica los datos de tu tarjeta</li>
                    <li>Intenta con otra tarjeta</li>
                    <li>Usa PayPal como alternativa</li>
                </ul>
                
                <div class="modal-actions">
                    <button id="retry-card-payment-btn" class="btn-primary">
                        <i class="fas fa-redo"></i> Reintentar
                    </button>
                    <button id="try-paypal-btn" class="btn-secondary">
                        <i class="fab fa-paypal"></i> Usar PayPal
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
            window.history.back();
        });
    }
}

// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// Add event listener for buttons in success modal
document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'return-home-btn') {
        window.location.href = 'index.html';
    }
    
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
