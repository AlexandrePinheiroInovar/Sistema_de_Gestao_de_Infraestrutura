// ============= FIREBASE PRODUCTION ONLY =============
console.log('🔥 [FIREBASE] Inicializando Firebase Complete - PRODUCTION ONLY v3.0...');

// Verificar se Firebase SDK está carregado
if (typeof firebase === 'undefined') {
    console.error('❌ [FIREBASE] Firebase SDK não foi carregado!');
    throw new Error('Firebase SDK não encontrado');
}

// ============= CONFIGURACAO FIREBASE PRODUCAO =============
// APENAS URLs DE PRODUÇÃO - SEM DETECÇÃO DE AMBIENTE LOCAL
const firebaseConfig = {
    apiKey: "AIzaSyDHKb34lNwFIEBmkO9WVVKVwMCL__O_u8A",
    authDomain: "gestao-de-infraestrutura-4ee4a.firebaseapp.com",
    projectId: "gestao-de-infraestrutura-4ee4a",
    storageBucket: "gestao-de-infraestrutura-4ee4a.firebasestorage.app",
    messagingSenderId: "1012042763792",
    appId: "1:1012042763792:web:b2c183bcc490b1bbb24495",
    measurementId: "G-TQCLQ72KYD"
};

console.log('🌐 [FIREBASE] Configurando APENAS para PRODUÇÃO');
console.log('🚫 [FIREBASE] Emuladores e URLs locais DESABILITADOS');

// Inicializar Firebase (verificar se já foi inicializado)
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ [FIREBASE] App inicializado para PRODUÇÃO');
    } else {
        console.log('✅ [FIREBASE] App já estava inicializado');
    }
    
    // Inicializar serviços - APENAS PRODUÇÃO
    window.auth = firebase.auth();
    window.firestore = firebase.firestore();
    
    // GARANTIR QUE NÃO USA EMULADORES
    console.log('🔒 [FIREBASE] Forçando conexão apenas com serviços de PRODUÇÃO');
    
    // Confirmar que está usando produção
    console.log('✅ [FIREBASE] Auth Domain:', window.auth.app.options.authDomain);
    console.log('✅ [FIREBASE] Project ID:', window.auth.app.options.projectId);
    console.log('📝 [FIREBASE] firebase-config.js SUBSTITUÍDO por firebase-complete.js PRODUCTION');
    
} catch (error) {
    console.error('❌ [FIREBASE] Erro ao inicializar:', error);
    throw new Error('Falha na inicialização do Firebase em produção');
}

// ============= SISTEMA DE AUTENTICACAO - PRODUCTION ONLY =============
let authStateInitialized = false;
let preventLoop = false;

// Funcao principal de registro - FIREBASE PRODUCTION
window.registerWithEmailPassword = async function(email, password, displayName) {
    console.log('📝 [AUTH-PROD] Iniciando registro em PRODUÇÃO:', { email, displayName });
    
    if (!window.auth) {
        throw new Error('Firebase Auth não inicializado para produção');
    }
    
    try {
        // Criar usuario com Firebase Auth PRODUÇÃO
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ [AUTH-PROD] Usuário criado em PRODUÇÃO:', user.uid);
        
        // Atualizar perfil do usuario
        if (displayName) {
            await user.updateProfile({
                displayName: displayName
            });
            console.log('✅ [AUTH-PROD] Profile atualizado:', displayName);
        }
        
        // Salvar dados no Firestore PRODUÇÃO
        await window.firestore.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            displayName: displayName,
            role: 'USER',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            environment: 'PRODUCTION'
        });
        
        console.log('✅ [FIRESTORE-PROD] Dados salvos em PRODUÇÃO');
        
        return {
            success: true,
            user: user,
            message: 'Conta criada com sucesso no Firebase!',
            environment: 'PRODUCTION'
        };
        
    } catch (error) {
        console.error('❌ [AUTH-PROD] Erro no registro:', error);
        
        let errorMessage = 'Erro desconhecido';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Este e-mail já está em uso';
                break;
            case 'auth/invalid-email':
                errorMessage = 'E-mail inválido';
                break;
            case 'auth/weak-password':
                errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet';
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            error: error,
            message: errorMessage,
            environment: 'PRODUCTION'
        };
    }
};

// Funcao de login - FIREBASE PRODUCTION
window.signInWithEmailPassword = async function(email, password) {
    console.log('🔑 [AUTH-PROD] Iniciando login em PRODUÇÃO:', { email });
    
    if (!window.auth) {
        throw new Error('Firebase Auth não inicializado para produção');
    }
    
    try {
        const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ [AUTH-PROD] Login realizado em PRODUÇÃO:', user.uid);
        
        // Atualizar ultimo login no Firestore PRODUÇÃO
        try {
            await window.firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                environment: 'PRODUCTION'
            });
            console.log('✅ [FIRESTORE-PROD] Último login atualizado');
        } catch (firestoreError) {
            console.warn('⚠️ [FIRESTORE-PROD] Erro ao atualizar último login:', firestoreError);
        }
        
        return {
            success: true,
            user: user,
            message: 'Login realizado com sucesso!',
            environment: 'PRODUCTION'
        };
        
    } catch (error) {
        console.error('❌ [AUTH-PROD] Erro no login:', error);
        
        let errorMessage = 'Erro desconhecido';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuário não encontrado';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Senha incorreta';
                break;
            case 'auth/invalid-email':
                errorMessage = 'E-mail inválido';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Usuário desabilitado';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet';
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            error: error,
            message: errorMessage,
            environment: 'PRODUCTION'
        };
    }
};

// Funcao de logout - FIREBASE PRODUCTION
window.signOut = async function() {
    console.log('👋 [AUTH-PROD] Fazendo logout em PRODUÇÃO...');
    
    if (!window.auth) {
        console.warn('⚠️ [AUTH-PROD] Auth não disponível para logout');
        return { success: false, message: 'Sistema de autenticação não disponível' };
    }
    
    try {
        preventLoop = true;
        await window.auth.signOut();
        console.log('✅ [AUTH-PROD] Logout realizado em PRODUÇÃO');
        
        // Limpar dados locais
        localStorage.removeItem('user');
        localStorage.removeItem('userToken');
        
        // Aguardar antes de permitir redirecionamentos novamente
        setTimeout(() => {
            preventLoop = false;
        }, 1000);
        
        return {
            success: true,
            message: 'Logout realizado com sucesso!',
            environment: 'PRODUCTION'
        };
        
    } catch (error) {
        console.error('❌ [AUTH-PROD] Erro no logout:', error);
        preventLoop = false;
        return {
            success: false,
            error: error,
            message: 'Erro ao fazer logout',
            environment: 'PRODUCTION'
        };
    }
};

// ============= MONITORAMENTO DE ESTADO - PRODUCTION =============
window.auth.onAuthStateChanged(function(user) {
    // Evitar loops durante inicialização
    if (preventLoop) {
        console.log('🔄 [AUTH-PROD] AuthStateChanged bloqueado para evitar loop');
        return;
    }
    
    if (!authStateInitialized) {
        authStateInitialized = true;
        console.log('🚀 [AUTH-PROD] AuthStateChanged inicializado para PRODUÇÃO');
    }
    
    console.log('🔄 [AUTH-PROD] Estado mudou:', user ? `Logado: ${user.email}` : 'Deslogado');
    
    if (user) {
        // Usuario logado em PRODUÇÃO
        console.log('✅ [AUTH-PROD] Usuário autenticado em PRODUÇÃO:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        });
        
        // Salvar no localStorage
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            environment: 'PRODUCTION'
        }));
        
        // Verificar se precisa redirecionar (apenas em produção)
        const currentPath = window.location.pathname.toLowerCase();
        
        // Verificar se está nas páginas de auth
        const isLoginPage = currentPath.includes('index.html') || 
                           currentPath.includes('cadastro.html') || 
                           currentPath === '/' ||
                           currentPath === '/index.html';
        
        if (isLoginPage) {
            console.log('🔄 [AUTH-PROD] Redirecionando para dashboard em PRODUÇÃO...');
            setTimeout(() => {
                if (!preventLoop) {
                    window.location.href = 'dashboard.html';
                }
            }, 500);
        }
        
    } else {
        // Usuario deslogado
        console.log('❌ [AUTH-PROD] Usuário não autenticado');
        
        // Limpar dados locais
        localStorage.removeItem('user');
        localStorage.removeItem('userToken');
        
        // Verificar se precisa redirecionar
        const currentPath = window.location.pathname.toLowerCase();
        const isDashboardPage = currentPath.includes('dashboard.html');
        
        if (isDashboardPage) {
            console.log('🔄 [AUTH-PROD] Redirecionando para login...');
            setTimeout(() => {
                if (!preventLoop) {
                    window.location.href = 'index.html';
                }
            }, 500);
        }
    }
});

// ============= FUNCOES UTILITARIAS - PRODUCTION =============

// Obter usuario atual
window.getCurrentUser = function() {
    const user = window.auth.currentUser;
    if (user) {
        console.log('👤 [AUTH-PROD] Usuário atual em PRODUÇÃO:', user.email);
    }
    return user;
};

// Verificar se esta logado
window.isAuthenticated = function() {
    const isAuth = !!window.auth.currentUser;
    console.log('🔍 [AUTH-PROD] Status autenticação em PRODUÇÃO:', isAuth);
    return isAuth;
};

// Obter dados do usuario do Firestore PRODUÇÃO
window.getUserData = async function(uid) {
    if (!uid) {
        uid = window.auth.currentUser?.uid;
    }
    
    if (!uid) {
        throw new Error('Usuário não encontrado');
    }
    
    console.log('📊 [FIRESTORE-PROD] Buscando dados do usuário em PRODUÇÃO:', uid);
    
    try {
        const doc = await window.firestore.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            console.log('✅ [FIRESTORE-PROD] Dados encontrados em PRODUÇÃO');
            return { ...data, environment: 'PRODUCTION' };
        } else {
            throw new Error('Dados do usuário não encontrados na produção');
        }
    } catch (error) {
        console.error('❌ [FIRESTORE-PROD] Erro ao buscar dados:', error);
        throw error;
    }
};

// Reset de senha via Firebase Auth PRODUÇÃO
window.sendPasswordResetEmail = async function(email) {
    console.log('🔑 [AUTH-PROD] Enviando reset de senha em PRODUÇÃO para:', email);
    
    if (!window.auth) {
        throw new Error('Firebase Auth não disponível');
    }
    
    try {
        await window.auth.sendPasswordResetEmail(email);
        console.log('✅ [AUTH-PROD] Email de reset enviado em PRODUÇÃO');
        return {
            success: true,
            message: 'Email de recuperação enviado com sucesso!',
            environment: 'PRODUCTION'
        };
    } catch (error) {
        console.error('❌ [AUTH-PROD] Erro no envio de reset:', error);
        
        let errorMessage = 'Erro ao enviar email de recuperação';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'Usuário não encontrado';
                break;
            case 'auth/invalid-email':
                errorMessage = 'E-mail inválido';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Erro de conexão. Verifique sua internet';
                break;
            default:
                errorMessage = error.message;
        }
        
        return {
            success: false,
            error: error,
            message: errorMessage,
            environment: 'PRODUCTION'
        };
    }
};

// ============= NOTIFICACOES =============
window.showCustomNotification = function(title, message, type = 'success') {
    console.log(`📢 [NOTIFICATION-PROD] ${type.toUpperCase()}: ${title} - ${message}`);
    
    // Se existe o sistema de notificacao do script.js, usar
    if (typeof showNotification === 'function') {
        showNotification(title, message, type);
    } else {
        // Fallback para alert simples
        alert(`${title}\n${message}`);
    }
};

// ============= FUNCOES DE COMPATIBILIDADE =============

// Funcoes de logout para o dashboard
window.logout = window.signOut;
window.confirmLogout = function() {
    if (confirm('Tem certeza que deseja sair?')) {
        window.signOut();
    }
};

// ============= INICIALIZACAO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [FIREBASE-PROD] DOM carregado, inicializando para PRODUÇÃO...');
    
    // Aguardar Firebase estar completamente pronto
    setTimeout(() => {
        if (window.auth && window.firestore) {
            console.log('✅ [FIREBASE-PROD] Sistema PRODUÇÃO pronto para uso');
            console.log('🌐 [FIREBASE-PROD] Conectado a:', window.auth.app.options.authDomain);
            
            // Disparar evento customizado
            const event = new CustomEvent('firebaseReady', { 
                detail: { environment: 'PRODUCTION' } 
            });
            document.dispatchEvent(event);
        } else {
            console.error('❌ [FIREBASE-PROD] Erro na inicialização em PRODUÇÃO');
        }
    }, 100);
});

// ============= BLOQUEIO DE FUNCIONALIDADES LOCAIS =============

// Bloquear tentativas de usar emuladores ou localhost
const originalFetch = window.fetch;
window.fetch = function(url, ...args) {
    if (typeof url === 'string') {
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('emulator')) {
            console.error('🚫 [FIREBASE-PROD] BLOQUEADO: Tentativa de acessar URL local:', url);
            return Promise.reject(new Error('URLs locais bloqueadas - apenas produção permitida'));
        }
    }
    return originalFetch.call(this, url, ...args);
};

console.log('✅ [FIREBASE-PROD] Firebase Complete PRODUCTION ONLY carregado com sucesso');
console.log('🚫 [FIREBASE-PROD] Todas as funcionalidades locais foram DESABILITADAS');
console.log('🌐 [FIREBASE-PROD] Sistema configurado EXCLUSIVAMENTE para Firebase Hosting e Auth');