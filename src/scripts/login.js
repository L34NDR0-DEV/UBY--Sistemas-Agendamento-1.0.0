const { ipcRenderer } = require('electron');

// Função para controlar o preloader
function initializePreloader() {
    const preloader = document.getElementById('appPreloader');
    const logoImage = document.querySelector('.preloader-logo-image');
    
    if (!preloader || !logoImage) {
        console.warn('Elementos do preloader não encontrados');
        return;
    }
    
    let preloaderHidden = false;
    
    const hidePreloader = () => {
        if (preloaderHidden) return;
        preloaderHidden = true;
        
        preloader.classList.add('hidden');
        // login.css tem transition de 0.5s -> aguardar um pouco mais
        setTimeout(() => {
            if (preloader && preloader.parentElement) {
                preloader.remove();
            }
        }, 600);
    };
    
    // Aguardar carregamento da logo
    logoImage.onload = () => {
        setTimeout(hidePreloader, 800);
    };
    
    // Fallback caso a logo não carregue
    logoImage.onerror = () => {
        console.warn('Erro ao carregar logo, removendo preloader');
        setTimeout(hidePreloader, 800);
    };
    
    // Se a logo já estiver carregada
    if (logoImage.complete && logoImage.naturalWidth > 0) {
        logoImage.onload();
    }
    
    // Fallback de segurança - remover após tempo máximo
    setTimeout(() => {
        if (!preloaderHidden) {
            console.log('Fallback de segurança: removendo preloader após timeout');
            hidePreloader();
        }
    }, 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar preloader
    initializePreloader();
    // Verificar se há credenciais lembradas
    const rememberedCredentials = await ipcRenderer.invoke('getRememberedCredentials');
    if (rememberedCredentials) {
        document.getElementById('username').value = rememberedCredentials.username;
        document.getElementById('password').value = rememberedCredentials.password;
        document.getElementById('remember').checked = true;
    }

    // Configurar controles da janela
    setupWindowControls();
    
    // Configurar formulário de login
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', handleLogin);
    
    // Configurar toggle da senha
    setupPasswordToggle();
    
    // Configurar modal de cadastro
    setupRegisterModal();
});

// Configurar controles da janela
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeBtn');
    const maximizeBtn = document.getElementById('maximizeBtn');
    const closeBtn = document.getElementById('closeBtn');
    
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            ipcRenderer.send('login-window-minimize');
        });
    }
    if (maximizeBtn) {
        maximizeBtn.addEventListener('click', () => {
            ipcRenderer.send('login-window-maximize');
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            ipcRenderer.send('login-window-close');
        });
    }
}

// Função de login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    if (!username || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    // Mostrar loading
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Entrando...';
    submitBtn.disabled = true;
    
    try {
        const result = await ipcRenderer.invoke('login', { username, password, remember });
        
        if (result.success) {
            // Login bem-sucedido - a janela principal será aberta pelo processo principal
            showSuccess('Login realizado com sucesso!');
        } else {
            showError(result.message || 'Credenciais inválidas');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError('Erro interno do sistema');
    } finally {
        // Restaurar botão
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Configurar toggle da senha
function setupPasswordToggle() {
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            
            if (isPassword) {
                // Mostrar senha
                passwordInput.type = 'text';
                passwordToggle.classList.add('showing');
                passwordToggle.title = 'Ocultar senha';
                
                // Adicionar classe para animação
                passwordToggle.classList.add('animating');
                setTimeout(() => {
                    passwordToggle.classList.remove('animating');
                }, 300);
            } else {
                // Ocultar senha
                passwordInput.type = 'password';
                passwordToggle.classList.remove('showing');
                passwordToggle.title = 'Mostrar senha';
                
                // Adicionar classe para animação
                passwordToggle.classList.add('animating');
                setTimeout(() => {
                    passwordToggle.classList.remove('animating');
                }, 300);
            }
        });
        
        // Adicionar suporte a tecla Enter no campo de senha
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loginForm').dispatchEvent(new Event('submit'));
            }
        });
        
        // Adicionar efeito de hover com animação
        passwordToggle.addEventListener('mouseenter', () => {
            passwordToggle.style.transform = 'translateY(-50%) scale(1.1)';
        });
        
        passwordToggle.addEventListener('mouseleave', () => {
            passwordToggle.style.transform = 'translateY(-50%) scale(1)';
        });
    }
}

// Configurar modal de cadastro
function setupRegisterModal() {
    const newUserBtn = document.getElementById('newUserBtn');
    const registerModal = document.getElementById('registerModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
    const registerForm = document.getElementById('registerForm');
    
    // Abrir modal
    if (newUserBtn) {
        newUserBtn.addEventListener('click', () => {
            registerModal.classList.add('show');
        });
    }
    
    // Fechar modal
    function closeModal() {
        registerModal.classList.remove('show');
        // Limpar formulário
        registerForm.reset();
        hideRegisterError();
    }
    
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', closeModal);
    }
    
    if (cancelRegisterBtn) {
        cancelRegisterBtn.addEventListener('click', closeModal);
    }
    
    // Fechar ao clicar fora do modal
    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            closeModal();
        }
    });
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && registerModal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // Configurar toggles de senha no modal
    setupRegisterPasswordToggles();
    
    // Configurar formulário de cadastro
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Configurar validação em tempo real
    setupRegisterValidation();
}

// Configurar toggles de senha no modal de cadastro
function setupRegisterPasswordToggles() {
    const newPasswordInput = document.getElementById('newPassword');
    const newPasswordToggle = document.getElementById('newPasswordToggle');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    
    // Toggle para nova senha
    if (newPasswordToggle && newPasswordInput) {
        newPasswordToggle.addEventListener('click', () => {
            const isPassword = newPasswordInput.type === 'password';
            
            if (isPassword) {
                newPasswordInput.type = 'text';
                newPasswordToggle.classList.add('showing');
                newPasswordToggle.title = 'Ocultar senha';
            } else {
                newPasswordInput.type = 'password';
                newPasswordToggle.classList.remove('showing');
                newPasswordToggle.title = 'Mostrar senha';
            }
        });
    }
    
    // Toggle para confirmar senha
    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            const isPassword = confirmPasswordInput.type === 'password';
            
            if (isPassword) {
                confirmPasswordInput.type = 'text';
                confirmPasswordToggle.classList.add('showing');
                confirmPasswordToggle.title = 'Ocultar senha';
            } else {
                confirmPasswordInput.type = 'password';
                confirmPasswordToggle.classList.remove('showing');
                confirmPasswordToggle.title = 'Mostrar senha';
            }
        });
    }
}

// Função de cadastro
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validações
    if (!username || !password || !confirmPassword) {
        showRegisterError('Por favor, preencha todos os campos');
        return;
    }
    
    // Validar nome de usuário (apenas primeiro nome ou dois nomes)
    const nameParts = username.trim().split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0 || nameParts.length > 2) {
        showRegisterError('Use apenas primeiro nome ou dois nomes (ex: João ou João Silva)');
        return;
    }
    
    // Validar se contém apenas letras e espaços
    const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
    if (!nameRegex.test(username)) {
        showRegisterError('Nome deve conter apenas letras');
        return;
    }
    
    // Validar senha numérica
    const passwordRegex = /^\d{6,}$/;
    if (!passwordRegex.test(password)) {
        showRegisterError('Senha deve ter pelo menos 6 dígitos numéricos');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegisterError('As senhas não coincidem');
        return;
    }
    
    // Mostrar loading
    const submitBtn = document.getElementById('confirmRegisterBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
        Criando...
    `;
    submitBtn.disabled = true;
    
    try {
        const result = await ipcRenderer.invoke('register', { 
            username: username.trim(),
            displayName: username.trim(), // Usar o username como displayName
            password 
        });
        
        if (result.success) {
            showRegisterSuccess('Conta criada com sucesso! Você pode fazer login agora.');
            setTimeout(() => {
                document.getElementById('registerModal').classList.remove('show');
                // Preencher campos de login
                document.getElementById('username').value = username.trim();
                document.getElementById('password').value = password;
            }, 2000);
        } else {
            showRegisterError(result.message || 'Erro ao criar conta');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        showRegisterError('Erro interno do sistema');
    } finally {
        // Restaurar botão
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Mostrar erro no modal de cadastro
function showRegisterError(message) {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'error-message';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Mostrar sucesso no modal de cadastro
function showRegisterSuccess(message) {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'success-message';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Ocultar erro do modal de cadastro
function hideRegisterError() {
    const errorDiv = document.getElementById('registerErrorMessage');
    errorDiv.style.display = 'none';
}

// Mostrar mensagem de erro
function showError(message) {
    const errorDiv = document.getElementById('error-message') || createErrorDiv();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'error-message';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Mostrar mensagem de sucesso
function showSuccess(message) {
    const errorDiv = document.getElementById('error-message') || createErrorDiv();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.className = 'success-message';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// Criar div de mensagem se não existir
function createErrorDiv() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.style.cssText = `
        margin-top: 15px;
        padding: 10px;
        border-radius: 4px;
        text-align: center;
        font-size: 14px;
        display: none;
    `;
    
    const form = document.getElementById('loginForm');
    form.appendChild(errorDiv);
    
    return errorDiv;
}

// Configurar validação em tempo real para o cadastro
function setupRegisterValidation() {
    const usernameInput = document.getElementById('newUsername');
    const passwordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Validar nome de usuário
    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const value = usernameInput.value.trim();
            const nameParts = value.split(' ').filter(part => part.length > 0);
            const nameRegex = /^[a-zA-ZÀ-ÿ\s]*$/;
            
            if (value && !nameRegex.test(value)) {
                usernameInput.style.borderColor = '#e74c3c';
                showFieldError(usernameInput, 'Apenas letras são permitidas');
            } else if (value && (nameParts.length === 0 || nameParts.length > 2)) {
                usernameInput.style.borderColor = '#e74c3c';
                showFieldError(usernameInput, 'Use apenas primeiro nome ou dois nomes');
            } else {
                usernameInput.style.borderColor = '#2ecc71';
                hideFieldError(usernameInput);
            }
        });
    }
    
    // Validar senha
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const value = passwordInput.value;
            const passwordRegex = /^\d{6,}$/;
            
            if (value && !passwordRegex.test(value)) {
                passwordInput.style.borderColor = '#e74c3c';
                showFieldError(passwordInput, 'Apenas números, mínimo 6 dígitos');
            } else if (value && passwordRegex.test(value)) {
                passwordInput.style.borderColor = '#2ecc71';
                hideFieldError(passwordInput);
            } else {
                passwordInput.style.borderColor = '';
                hideFieldError(passwordInput);
            }
        });
    }
    
    // Validar confirmação de senha
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            const passwordValue = passwordInput.value;
            const confirmValue = confirmPasswordInput.value;
            
            if (confirmValue && confirmValue !== passwordValue) {
                confirmPasswordInput.style.borderColor = '#e74c3c';
                showFieldError(confirmPasswordInput, 'Senhas não coincidem');
            } else if (confirmValue && confirmValue === passwordValue) {
                confirmPasswordInput.style.borderColor = '#2ecc71';
                hideFieldError(confirmPasswordInput);
            } else {
                confirmPasswordInput.style.borderColor = '';
                hideFieldError(confirmPasswordInput);
            }
        });
    }
}

// Mostrar erro de campo específico
function showFieldError(input, message) {
    let errorDiv = input.parentNode.querySelector('.field-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        input.parentNode.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Ocultar erro de campo específico
function hideFieldError(input) {
    const errorDiv = input.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}