// ============= FORM HANDLER - CADASTRO E LOGIN =============
console.log('📝 [FORM-HANDLER] Inicializando handlers de formulário...');

(function() {
    'use strict';
    
    // Prevenir execução múltipla
    if (window.formHandlerLoaded) {
        console.log('⚠️ [FORM-HANDLER] Já foi carregado, ignorando...');
        return;
    }
    window.formHandlerLoaded = true;
    
    // Variáveis de controle para evitar loops
    let isProcessing = false;
    let isRedirecting = false;
    
    // ============= UTILITÁRIOS =============
    
    function showMessage(message, type = 'info') {
        console.log(`📢 [MESSAGE] ${type.toUpperCase()}: ${message}`);
        
        // Usar sistema de notificação se disponível
        if (typeof window.showCustomNotification === 'function') {
            const title = type === 'error' ? '❌ Erro' : type === 'success' ? '✅ Sucesso' : 'ℹ️ Info';
            window.showCustomNotification(title, message, type);
        } else if (typeof showNotification === 'function') {
            showNotification(message, message, type);
        } else {
            // Fallback - notificação visual simples
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                padding: 15px 20px; border-radius: 5px; color: white; font-weight: bold;
                background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.2); max-width: 300px;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 5000);
        }
    }
    
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    function waitForFirebase() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.auth && window.registerWithEmailPassword && window.signInWithEmailPassword) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    
    // ============= HANDLER DO FORMULÁRIO DE CADASTRO =============
    
    function initRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;
        
        console.log('📝 [REGISTER] Inicializando formulário de cadastro...');
        
        // Remover listeners existentes para evitar duplicação
        form.onsubmit = null;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // PREVENIR RELOAD
            
            if (isProcessing) {
                console.log('⏳ [REGISTER] Processamento em andamento, ignorando...');
                return;
            }
            
            isProcessing = true;
            console.log('📝 [REGISTER] Processando cadastro...');
            
            // Desabilitar botão
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Criando conta...';
            
            try {
                // Pegar valores dos campos
                const firstName = document.getElementById('firstName')?.value?.trim() || '';
                const lastName = document.getElementById('lastName')?.value?.trim() || '';
                const email = document.getElementById('email')?.value?.trim() || '';
                const password = document.getElementById('password')?.value || '';
                const confirmPassword = document.getElementById('confirmPassword')?.value || '';
                const agreeTerms = document.getElementById('agreeTerms')?.checked || false;
                
                console.log('📝 [REGISTER] Campos coletados:', { firstName, lastName, email });
                
                // Validações
                if (!firstName || !lastName) {
                    throw new Error('Nome e sobrenome são obrigatórios');
                }
                
                if (!isValidEmail(email)) {
                    throw new Error('E-mail inválido');
                }
                
                if (!password || password.length < 6) {
                    throw new Error('Senha deve ter pelo menos 6 caracteres');
                }
                
                if (password !== confirmPassword) {
                    throw new Error('As senhas não coincidem');
                }
                
                if (!agreeTerms) {
                    throw new Error('Você deve concordar com os termos de uso');
                }
                
                // Aguardar Firebase estar pronto
                await waitForFirebase();
                
                // Chamar função de registro
                const displayName = `${firstName} ${lastName}`;
                console.log('📝 [REGISTER] Chamando registerWithEmailPassword...');
                
                const result = await window.registerWithEmailPassword(email, password, displayName);
                
                if (result.success) {
                    console.log('✅ [REGISTER] Cadastro realizado com sucesso!');
                    showMessage('Conta criada com sucesso! Redirecionando...', 'success');
                    
                    // Redirecionar após sucesso
                    setTimeout(() => {
                        if (!isRedirecting) {
                            isRedirecting = true;
                            window.location.href = 'dashboard.html';
                        }
                    }, 1500);
                    
                } else {
                    throw new Error(result.message || 'Erro ao criar conta');
                }
                
            } catch (error) {
                console.error('❌ [REGISTER] Erro:', error);
                showMessage(error.message, 'error');
                
                // Reabilitar botão
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                isProcessing = false;
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
                    this.style.borderColor = '#dc3545';
                    this.setCustomValidity('As senhas não coincidem');
                } else {
                    this.style.borderColor = '';
                    this.setCustomValidity('');
                }
            });
        }
        
        console.log('✅ [REGISTER] Formulário de cadastro configurado');
    }
    
    // ============= HANDLER DO FORMULÁRIO DE LOGIN =============
    
    function initLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;
        
        console.log('🔑 [LOGIN] Inicializando formulário de login...');
        
        // Remover listeners existentes
        form.onsubmit = null;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // PREVENIR RELOAD
            
            if (isProcessing) {
                console.log('⏳ [LOGIN] Processamento em andamento, ignorando...');
                return;
            }
            
            isProcessing = true;
            console.log('🔑 [LOGIN] Processando login...');
            
            // Desabilitar botão
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';
            
            try {
                // Pegar valores dos campos
                const email = document.getElementById('username')?.value?.trim() || '';
                const password = document.getElementById('password')?.value || '';
                
                console.log('🔑 [LOGIN] Dados coletados:', { email });
                
                // Validações
                if (!email || !password) {
                    throw new Error('E-mail e senha são obrigatórios');
                }
                
                if (!isValidEmail(email)) {
                    throw new Error('E-mail inválido');
                }
                
                // Aguardar Firebase estar pronto
                await waitForFirebase();
                
                // Chamar função de login
                console.log('🔑 [LOGIN] Chamando signInWithEmailPassword...');
                
                const result = await window.signInWithEmailPassword(email, password);
                
                if (result.success) {
                    console.log('✅ [LOGIN] Login realizado com sucesso!');
                    showMessage('Login realizado com sucesso! Redirecionando...', 'success');
                    
                    // Redirecionar após sucesso (o onAuthStateChanged já deve fazer isso, mas garantir)
                    setTimeout(() => {
                        if (!isRedirecting) {
                            isRedirecting = true;
                            window.location.href = 'dashboard.html';
                        }
                    }, 1500);
                    
                } else {
                    throw new Error(result.message || 'Erro ao fazer login');
                }
                
            } catch (error) {
                console.error('❌ [LOGIN] Erro:', error);
                showMessage(error.message, 'error');
                
                // Reabilitar botão
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                isProcessing = false;
            }
        });
        
        console.log('✅ [LOGIN] Formulário de login configurado');
    }
    
    // ============= CORREÇÃO DO LOOP DE LOGIN/LOGOUT =============
    
    function fixAuthLoop() {
        console.log('🔄 [AUTH-FIX] Aplicando correção do loop de login/logout...');
        
        // Interceptar onAuthStateChanged se já existir para evitar loops
        if (window.auth && window.auth.onAuthStateChanged) {
            let authChangeTimeout;
            let lastAuthState = null;
            let authChangeCount = 0;
            
            // Wrapper para prevenir loops
            const originalOnAuthStateChanged = window.auth.onAuthStateChanged;
            window.auth.onAuthStateChanged = function(callback) {
                return originalOnAuthStateChanged.call(this, function(user) {
                    // Detectar mudanças muito rápidas (possível loop)
                    authChangeCount++;
                    const currentState = user ? 'logged-in' : 'logged-out';
                    
                    if (authChangeTimeout) {
                        clearTimeout(authChangeTimeout);
                    }
                    
                    authChangeTimeout = setTimeout(() => {
                        // Reset contador após 2 segundos
                        authChangeCount = 0;
                    }, 2000);
                    
                    // Se muitas mudanças em pouco tempo, ignorar
                    if (authChangeCount > 3) {
                        console.warn('🔄 [AUTH-FIX] Loop detectado, ignorando mudança de estado');
                        return;
                    }
                    
                    // Se é a mesma mudança de estado, ignorar
                    if (lastAuthState === currentState) {
                        console.log('🔄 [AUTH-FIX] Estado duplicado ignorado:', currentState);
                        return;
                    }
                    
                    lastAuthState = currentState;
                    console.log('🔄 [AUTH-FIX] Estado alterado para:', currentState);
                    
                    // Chamar callback original
                    callback(user);
                });
            };
        }
    }
    
    // ============= INICIALIZAÇÃO =============
    
    function init() {
        console.log('🚀 [FORM-HANDLER] Inicializando sistema...');
        
        // Aplicar correção do loop primeiro
        fixAuthLoop();
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initForms);
        } else {
            initForms();
        }
    }
    
    function initForms() {
        console.log('📄 [FORM-HANDLER] DOM pronto, configurando formulários...');
        
        // Pequeno delay para garantir que outros scripts carregaram
        setTimeout(() => {
            // Verificar qual página estamos e inicializar o formulário apropriado
            const path = window.location.pathname.toLowerCase();
            
            if (path.includes('cadastro.html')) {
                initRegisterForm();
            } else if (path.includes('index.html') || path === '/') {
                initLoginForm();
            }
            
            console.log('✅ [FORM-HANDLER] Sistema configurado com sucesso');
        }, 300);
    }
    
    // Inicializar
    init();
    
})();

console.log('✅ [FORM-HANDLER] Form handler carregado com sucesso');