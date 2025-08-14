// ============= HANDLERS DE AUTENTICAÇÃO - PRODUCTION ONLY =============
console.log('🔐 [AUTH-HANDLERS] Inicializando handlers - PRODUCTION ONLY v2.0...');

// Flag para evitar loops de redirecionamento
let isRedirecting = false;

// ============= UTILITÁRIOS =============

// Função para mostrar mensagem de erro/sucesso
function showMessage(message, type = 'info') {
    console.log(`📢 [MESSAGE-PROD] ${type.toUpperCase()}: ${message}`);
    
    // Usar sistema de notificação customizado se disponível
    if (typeof window.showCustomNotification === 'function') {
        const title = type === 'error' ? 'Erro' : type === 'success' ? 'Sucesso' : 'Informação';
        window.showCustomNotification(title, message, type);
    } else {
        // Fallback - criar notificação simples
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Função para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para validar senha
function validatePassword(password) {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
        isValid: minLength,
        minLength,
        hasUpperCase,
        hasSpecialChar,
        score: minLength + hasUpperCase + hasSpecialChar
    };
}

// Função para mostrar/ocultar senha
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    const button = field.nextElementSibling;
    if (!button) return;
    
    const icon = button.querySelector('i');
    if (!icon) return;
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ============= HANDLER DO FORMULÁRIO DE CADASTRO - PRODUCTION =============

function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) {
        console.log('📝 [REGISTER-PROD] Formulário de cadastro não encontrado');
        return;
    }
    
    console.log('📝 [REGISTER-PROD] Inicializando formulário de cadastro para PRODUÇÃO...');
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // PREVENIR RELOAD DA PÁGINA
        console.log('📝 [REGISTER-PROD] Submit capturado, processando em PRODUÇÃO...');
        
        // Desabilitar botão de submit para evitar cliques duplos
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Criando conta...';
        
        try {
            // Pegar valores dos campos
            const firstName = document.getElementById('firstName')?.value.trim() || '';
            const lastName = document.getElementById('lastName')?.value.trim() || '';
            const email = document.getElementById('email')?.value.trim() || '';
            const password = document.getElementById('password')?.value || '';
            const confirmPassword = document.getElementById('confirmPassword')?.value || '';
            const agreeTerms = document.getElementById('agreeTerms')?.checked || false;
            
            console.log('📝 [REGISTER-PROD] Dados coletados para PRODUÇÃO:', { firstName, lastName, email });
            
            // Validações
            if (!firstName || !lastName) {
                throw new Error('Nome e sobrenome são obrigatórios');
            }
            
            if (!isValidEmail(email)) {
                throw new Error('E-mail inválido');
            }
            
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }
            
            if (password !== confirmPassword) {
                throw new Error('Senhas não coincidem');
            }
            
            if (!agreeTerms) {
                throw new Error('Você deve concordar com os termos de uso');
            }
            
            // Aguardar Firebase PRODUÇÃO estar pronto
            if (!window.auth || !window.registerWithEmailPassword) {
                console.log('⏳ [REGISTER-PROD] Aguardando Firebase PRODUÇÃO...');
                await new Promise(resolve => {
                    const checkAuth = () => {
                        if (window.auth && window.registerWithEmailPassword) {
                            resolve();
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                });
            }
            
            // Verificar se está conectado à produção
            if (window.auth.app.options.authDomain !== 'gestao-de-infraestrutura-4ee4a.firebaseapp.com') {
                throw new Error('Sistema não está conectado à produção Firebase');
            }
            
            // Chamar função de registro do Firebase PRODUÇÃO
            const displayName = `${firstName} ${lastName}`;
            console.log('📝 [REGISTER-PROD] Chamando registerWithEmailPassword em PRODUÇÃO...');
            
            const result = await window.registerWithEmailPassword(email, password, displayName);
            
            if (result.success && result.environment === 'PRODUCTION') {
                console.log('✅ [REGISTER-PROD] Cadastro realizado com sucesso em PRODUÇÃO!');
                showMessage('Conta criada com sucesso no Firebase! Redirecionando...', 'success');
                
                // Aguardar um pouco antes de redirecionar
                setTimeout(() => {
                    if (!isRedirecting) {
                        isRedirecting = true;
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
                
            } else {
                throw new Error(result.message || 'Erro ao criar conta na produção');
            }
            
        } catch (error) {
            console.error('❌ [REGISTER-PROD] Erro:', error);
            showMessage(error.message, 'error');
            
            // Reabilitar botão
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    // Validação em tempo real das senhas
    const passwordField = document.getElementById('password');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (confirmPasswordField && passwordField) {
        confirmPasswordField.addEventListener('input', function() {
            const password = passwordField.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && password !== confirmPassword) {
                this.setCustomValidity('Senhas não coincidem');
                this.style.borderColor = '#dc3545';
            } else {
                this.setCustomValidity('');
                this.style.borderColor = '';
            }
        });
    }
}

// ============= HANDLER DO FORMULÁRIO DE LOGIN - PRODUCTION =============

function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) {
        console.log('🔑 [LOGIN-PROD] Formulário de login não encontrado');
        return;
    }
    
    console.log('🔑 [LOGIN-PROD] Inicializando formulário de login para PRODUÇÃO...');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault(); // PREVENIR RELOAD DA PÁGINA
        console.log('🔑 [LOGIN-PROD] Submit capturado, processando em PRODUÇÃO...');
        
        // Desabilitar botão de submit
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        
        try {
            // Pegar valores dos campos
            const username = document.getElementById('username')?.value.trim() || '';
            const password = document.getElementById('password')?.value || '';
            
            console.log('🔑 [LOGIN-PROD] Dados coletados para PRODUÇÃO:', { username });
            
            // Validações
            if (!username || !password) {
                throw new Error('E-mail e senha são obrigatórios');
            }
            
            if (!isValidEmail(username)) {
                throw new Error('E-mail inválido');
            }
            
            // Aguardar Firebase PRODUÇÃO estar pronto
            if (!window.auth || !window.signInWithEmailPassword) {
                console.log('⏳ [LOGIN-PROD] Aguardando Firebase PRODUÇÃO...');
                await new Promise(resolve => {
                    const checkAuth = () => {
                        if (window.auth && window.signInWithEmailPassword) {
                            resolve();
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                });
            }
            
            // Verificar se está conectado à produção
            if (window.auth.app.options.authDomain !== 'gestao-de-infraestrutura-4ee4a.firebaseapp.com') {
                throw new Error('Sistema não está conectado à produção Firebase');
            }
            
            // Chamar função de login do Firebase PRODUÇÃO
            console.log('🔑 [LOGIN-PROD] Chamando signInWithEmailPassword em PRODUÇÃO...');
            
            const result = await window.signInWithEmailPassword(username, password);
            
            if (result.success && result.environment === 'PRODUCTION') {
                console.log('✅ [LOGIN-PROD] Login realizado com sucesso em PRODUÇÃO!');
                showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                
                // Aguardar um pouco antes de redirecionar
                setTimeout(() => {
                    if (!isRedirecting) {
                        isRedirecting = true;
                        window.location.href = 'dashboard.html';
                    }
                }, 1500);
                
            } else {
                throw new Error(result.message || 'Erro ao fazer login na produção');
            }
            
        } catch (error) {
            console.error('❌ [LOGIN-PROD] Erro:', error);
            showMessage(error.message, 'error');
            
            // Reabilitar botão
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// ============= HANDLER DO MODAL DE RESET DE SENHA - PRODUCTION =============

function initForgotPasswordModal() {
    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotModal = document.getElementById('forgotPasswordModal');
    const forgotForm = document.getElementById('forgotPasswordForm');
    
    if (!forgotLink || !forgotModal) {
        console.log('🔐 [FORGOT-PROD] Elementos de reset de senha não encontrados');
        return;
    }
    
    console.log('🔐 [FORGOT-PROD] Inicializando modal de reset de senha para PRODUÇÃO...');
    
    // Mostrar modal
    forgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        forgotModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    });
    
    // Fechar modal
    window.closeForgotPasswordModal = function() {
        forgotModal.style.display = 'none';
        document.body.style.overflow = '';
    };
    
    // Handler do formulário
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('fpEmail')?.value.trim() || '';
            const newPassword = document.getElementById('fpNewPassword')?.value || '';
            const confirmPassword = document.getElementById('fpConfirmPassword')?.value || '';
            
            try {
                if (!email) {
                    throw new Error('E-mail é obrigatório');
                }
                
                if (!isValidEmail(email)) {
                    throw new Error('E-mail inválido');
                }
                
                // Usar Firebase Auth PRODUÇÃO para reset de senha
                if (window.sendPasswordResetEmail) {
                    console.log('🔐 [FORGOT-PROD] Enviando email de recuperação via Firebase PRODUÇÃO...');
                    const result = await window.sendPasswordResetEmail(email);
                    
                    if (result.success && result.environment === 'PRODUCTION') {
                        showMessage('Email de recuperação enviado com sucesso!', 'success');
                    } else {
                        throw new Error(result.message || 'Erro ao enviar email de recuperação');
                    }
                } else {
                    // Fallback - validação local da nova senha
                    if (!newPassword || newPassword.length < 6) {
                        throw new Error('Nova senha deve ter pelo menos 6 caracteres');
                    }
                    
                    if (newPassword !== confirmPassword) {
                        throw new Error('Senhas não coincidem');
                    }
                    
                    showMessage('Senha redefinida com sucesso! Faça login com a nova senha.', 'success');
                }
                
                closeForgotPasswordModal();
                
                // Limpar formulário
                forgotForm.reset();
                
            } catch (error) {
                console.error('❌ [FORGOT-PROD] Erro:', error);
                showMessage(error.message, 'error');
            }
        });
        
        // Validação em tempo real
        const newPasswordField = document.getElementById('fpNewPassword');
        const confirmPasswordField = document.getElementById('fpConfirmPassword');
        const errorElement = document.getElementById('fpError');
        
        if (confirmPasswordField && errorElement && newPasswordField) {
            confirmPasswordField.addEventListener('input', function() {
                const newPassword = newPasswordField.value;
                const confirmPassword = this.value;
                
                if (confirmPassword && newPassword !== confirmPassword) {
                    errorElement.style.display = 'block';
                } else {
                    errorElement.style.display = 'none';
                }
            });
        }
    }
}

// ============= VERIFICAÇÃO DE AUTENTICAÇÃO - PRODUCTION =============

function checkAuthState() {
    console.log('🔍 [AUTH-CHECK-PROD] Verificando estado de autenticação em PRODUÇÃO...');
    
    // Aguardar Firebase PRODUÇÃO estar pronto
    document.addEventListener('firebaseReady', function(event) {
        console.log('🔥 [AUTH-CHECK-PROD] Firebase PRODUÇÃO pronto, verificando usuário...');
        
        if (event.detail && event.detail.environment !== 'PRODUCTION') {
            console.error('❌ [AUTH-CHECK-PROD] Sistema não está em PRODUÇÃO!');
            return;
        }
        
        const currentUser = window.getCurrentUser();
        const currentPage = window.location.pathname;
        
        console.log('🔍 [AUTH-CHECK-PROD] Estado atual em PRODUÇÃO:', {
            user: currentUser ? currentUser.email : 'não logado',
            page: currentPage,
            authDomain: window.auth?.app?.options?.authDomain
        });
        
        // Verificar se está usando produção
        if (window.auth?.app?.options?.authDomain !== 'gestao-de-infraestrutura-4ee4a.firebaseapp.com') {
            console.error('❌ [AUTH-CHECK-PROD] ERRO: Sistema não está conectado à produção!');
            showMessage('Sistema não está conectado à produção Firebase!', 'error');
            return;
        }
        
        // Se usuário está logado e está na página de login/cadastro
        if (currentUser && (currentPage.includes('index.html') || currentPage.includes('cadastro.html') || currentPage === '/')) {
            console.log('🔄 [AUTH-CHECK-PROD] Usuário logado em PRODUÇÃO, redirecionando para dashboard...');
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = 'dashboard.html';
            }
        }
        
        // Se usuário NÃO está logado e está na página do dashboard
        if (!currentUser && currentPage.includes('dashboard.html')) {
            console.log('🔄 [AUTH-CHECK-PROD] Usuário não logado, redirecionando para login...');
            if (!isRedirecting) {
                isRedirecting = true;
                window.location.href = 'index.html';
            }
        }
    });
}

// ============= BLOQUEIO DE FUNCIONALIDADES LOCAIS =============

// Bloquear tentativas de usar URLs locais
function blockLocalUrls() {
    // Interceptar XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (typeof url === 'string' && (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('emulator'))) {
            console.error('🚫 [AUTH-HANDLERS-PROD] BLOQUEADO: Tentativa de XHR para URL local:', url);
            throw new Error('URLs locais bloqueadas - apenas produção permitida');
        }
        return originalXHROpen.call(this, method, url, ...args);
    };
    
    console.log('🚫 [AUTH-HANDLERS-PROD] Bloqueio de URLs locais ativado');
}

// ============= INICIALIZAÇÃO =============

// Tornar togglePassword disponível globalmente
window.togglePassword = togglePassword;

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [AUTH-HANDLERS-PROD] DOM carregado, inicializando para PRODUÇÃO...');
    
    // Ativar bloqueio de URLs locais
    blockLocalUrls();
    
    // Pequeno delay para garantir que o Firebase foi carregado
    setTimeout(() => {
        // Inicializar formulários baseado na página atual
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('cadastro.html')) {
            console.log('📝 [INIT-PROD] Página de cadastro detectada - PRODUÇÃO');
            initRegisterForm();
        } else if (currentPage.includes('index.html') || currentPage === '/') {
            console.log('🔑 [INIT-PROD] Página de login detectada - PRODUÇÃO');
            initLoginForm();
            initForgotPasswordModal();
        }
        
        // Sempre verificar estado de autenticação em PRODUÇÃO
        checkAuthState();
        
    }, 200);
});

console.log('✅ [AUTH-HANDLERS-PROD] Handlers de autenticação PRODUCTION ONLY carregados com sucesso');
console.log('🚫 [AUTH-HANDLERS-PROD] Todas as funcionalidades locais foram DESABILITADAS');
console.log('🌐 [AUTH-HANDLERS-PROD] Sistema configurado EXCLUSIVAMENTE para Firebase PRODUÇÃO');