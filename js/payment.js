// Payment Form JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const amount = urlParams.get('amount') || '0';
    const method = urlParams.get('method') || 'PayPal';
    
    // Update payment summary
    updatePaymentSummary(amount, method);
    
    // Show/hide card details based on payment method
    toggleCardDetails(method);
    
    // Form validation and submission
    setupFormHandling();
    
    // Card number formatting
    setupCardFormatting();
    
    // Back button event listener
    setupBackButton();
});

function updatePaymentSummary(amount, method) {
    document.getElementById('payment-method').textContent = method;
    document.getElementById('donation-amount').textContent = `$${parseFloat(amount).toFixed(2)}`;
    document.getElementById('total-amount').textContent = `$${parseFloat(amount).toFixed(2)}`;
    
    // Add payment method indicator class
    const methodElement = document.getElementById('payment-method');
    methodElement.className = `payment-method-indicator ${method.toLowerCase()}`;
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
    } else {
        cardDetails.style.display = 'block';
        // Add required attribute for credit cards
        cardInputs.forEach(input => {
            if (input.id !== 'cvv') { // CVV might not be required for some cards
                input.setAttribute('required', 'required');
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
    return /^\d{13,19}$/.test(cleanNumber) && luhnCheck(cleanNumber);
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
    
    // Add URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    paymentData.amount = urlParams.get('amount');
    paymentData.paymentMethod = urlParams.get('method');
    
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
    
    // For credit card payments, simulate processing
    setTimeout(() => {
        // In a real application, you would send this data to your payment processor
        console.log('Payment Data:', paymentData);
        
        // Show success message
        showPaymentSuccess(paymentData);
        
        // Reset button
        submitBtn.classList.remove('loading');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 2000);
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
    // Create success modal or redirect to success page
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
    
    // Style the modals
    const style = document.createElement('style');
    style.textContent = `
        .payment-success, .paypal-redirect-modal {
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
        .success-content, .modal-content {
            background: white;
            padding: 3rem;
            border-radius: 15px;
            text-align: center;
            max-width: 450px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .success-content i, .modal-content i {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        .success-content i {
            color: #10b981;
        }
        .paypal-icon {
            color: #0070ba !important;
        }
        .success-content h2, .modal-content h2 {
            color: #333;
            margin-bottom: 1rem;
        }
        .success-content p, .modal-content p {
            color: #666;
            margin-bottom: 1rem;
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
        }
        .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .btn-primary {
            background: #0070ba;
            color: white;
        }
        .btn-primary:hover {
            background: #005ea6;
        }
        .btn-secondary {
            background: #f5f5f5;
            color: #333;
        }
        .btn-secondary:hover {
            background: #e0e0e0;
        }
    `;
    document.head.appendChild(style);
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
