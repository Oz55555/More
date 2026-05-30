document.addEventListener('DOMContentLoaded', function() {
    // ── Step 1: Credentials ───────────────────────────────────────────────────
    const loginForm      = document.getElementById('loginForm');
    const usernameInput  = document.getElementById('username');
    const passwordInput  = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const loginBtn       = document.getElementById('loginBtn');
    const errorMessage   = document.getElementById('errorMessage');
    const errorText      = document.getElementById('errorText');
    const loadingMessage = document.getElementById('loadingMessage');

    // ── Step 2: 2FA ───────────────────────────────────────────────────────────
    const mfaStep      = document.getElementById('mfaStep');
    const mfaForm      = document.getElementById('mfaForm');
    const totpInput    = document.getElementById('totpToken');
    const mfaBtn       = document.getElementById('mfaBtn');
    const mfaError     = document.getElementById('mfaError');
    const mfaErrorText = document.getElementById('mfaErrorText');
    const mfaLoading   = document.getElementById('mfaLoading');
    const backToLogin  = document.getElementById('backToLogin');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // ── STEP 1 submit ─────────────────────────────────────────────────────────
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                if (data.mfaRequired) {
                    // Switch to 2FA step
                    loginForm.style.display = 'none';
                    mfaStep.style.display = 'block';
                    totpInput.focus();
                } else {
                    loginBtn.classList.add('success-animation');
                    setTimeout(() => { window.location.href = '/admin'; }, 1000);
                }
            } else {
                showError(data.message || 'Credenciales incorrectas. Verifique su usuario y contraseña.');
            }
        } catch (error) {
            showError('Error de conexión. Por favor, intente nuevamente.');
        } finally {
            showLoading(false);
        }
    }

    // ── STEP 2 submit (2FA) ───────────────────────────────────────────────────
    mfaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const token = totpInput.value.trim().replace(/\s/g, '');
        if (token.length !== 6 || !/^\d{6}$/.test(token)) {
            showMfaError('Ingrese un código de exactamente 6 dígitos.');
            return;
        }
        await verifyMfa(token);
    });

    // Auto-submit when 6 digits entered
    totpInput.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').slice(0, 6);
        if (this.value.length === 6) {
            mfaForm.dispatchEvent(new Event('submit'));
        }
    });

    async function verifyMfa(token) {
        showMfaLoading(true);
        hideMfaError();
        try {
            const response = await fetch('/api/admin/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                mfaBtn.innerHTML = '<i class="fas fa-check"></i> Verificado';
                mfaBtn.style.background = '#16a34a';
                setTimeout(() => { window.location.href = data.redirectUrl || '/admin'; }, 800);
            } else {
                showMfaError(data.message || 'Código incorrecto.');
                totpInput.value = '';
                totpInput.focus();
            }
        } catch (error) {
            showMfaError('Error de conexión. Intente nuevamente.');
        } finally {
            showMfaLoading(false);
        }
    }

    // Back to credentials step
    backToLogin.addEventListener('click', function() {
        mfaStep.style.display = 'none';
        loginForm.style.display = 'block';
        totpInput.value = '';
        hideMfaError();
        usernameInput.focus();
    });

    // ── Helpers ───────────────────────────────────────────────────────────────
    function showError(msg) {
        errorText.textContent = msg;
        errorMessage.style.display = 'flex';
    }
    function hideError() { errorMessage.style.display = 'none'; }

    function showLoading(show) {
        loadingMessage.style.display = show ? 'flex' : 'none';
        loginBtn.disabled = show;
        loginBtn.innerHTML = show
            ? '<i class="fas fa-spinner fa-spin"></i> Verificando...'
            : '<i class="fas fa-sign-in-alt"></i> Iniciar Sesión';
    }

    function showMfaError(msg) {
        mfaErrorText.textContent = msg;
        mfaError.style.display = 'flex';
    }
    function hideMfaError() { mfaError.style.display = 'none'; }

    function showMfaLoading(show) {
        mfaLoading.style.display = show ? 'flex' : 'none';
        mfaBtn.disabled = show;
        mfaBtn.innerHTML = show
            ? '<i class="fas fa-spinner fa-spin"></i> Verificando...'
            : '<i class="fas fa-shield-alt"></i> Verificar';
    }

    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);
    usernameInput.addEventListener('keypress', e => { if (e.key === 'Enter') passwordInput.focus(); });

    usernameInput.focus();
});
