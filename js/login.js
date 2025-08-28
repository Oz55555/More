document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loadingMessage = document.getElementById('loadingMessage');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Load saved credentials if "Remember me" was checked
    loadSavedCredentials();

    // Form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showError('Por favor, complete todos los campos.');
            return;
        }

        await attemptLogin(username, password);
    });

    async function attemptLogin(username, password) {
        showLoading(true);
        hideError();
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Save credentials if remember me is checked
                if (rememberMeCheckbox.checked) {
                    saveCredentials(username);
                } else {
                    clearSavedCredentials();
                }

                // Show success animation
                loginBtn.classList.add('success-animation');
                
                // Redirect to admin panel
                setTimeout(() => {
                    window.location.href = '/admin';
                }, 1000);
                
            } else {
                showError(data.message || 'Credenciales incorrectas. Verifique su usuario y contraseña.');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Error de conexión. Por favor, intente nuevamente.');
        } finally {
            showLoading(false);
        }
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function showLoading(show) {
        if (show) {
            loadingMessage.style.display = 'flex';
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        } else {
            loadingMessage.style.display = 'none';
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
        }
    }

    function saveCredentials(username) {
        try {
            localStorage.setItem('adminUsername', username);
            localStorage.setItem('rememberAdmin', 'true');
        } catch (error) {
            console.warn('Could not save credentials to localStorage:', error);
        }
    }

    function loadSavedCredentials() {
        try {
            const savedUsername = localStorage.getItem('adminUsername');
            const rememberAdmin = localStorage.getItem('rememberAdmin');
            
            if (rememberAdmin === 'true' && savedUsername) {
                usernameInput.value = savedUsername;
                rememberMeCheckbox.checked = true;
                passwordInput.focus();
            }
        } catch (error) {
            console.warn('Could not load saved credentials:', error);
        }
    }

    function clearSavedCredentials() {
        try {
            localStorage.removeItem('adminUsername');
            localStorage.removeItem('rememberAdmin');
        } catch (error) {
            console.warn('Could not clear saved credentials:', error);
        }
    }

    // Clear error message when user starts typing
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

    // Enter key handling for better UX
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Focus on username field on page load
    usernameInput.focus();
});
