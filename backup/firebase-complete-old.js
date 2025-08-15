// ============= FIREBASE AUTH SYSTEM - CORRIGIDO PARA EVITAR LOOPS =============
console.log('🔥 [FIREBASE-AUTH] Inicializando sistema de autenticação corrigido v4.0...');

// Verificar se Firebase SDK está carregado
if (typeof firebase === 'undefined') {
    console.error('❌ [FIREBASE-AUTH] Firebase SDK não foi carregado!');
    throw new Error('Firebase SDK não encontrado');
}

// ============= CONFIGURACAO FIREBASE =============
const firebaseConfig = {
    apiKey: "AIzaSyDHKb34lNwFIEBmkO9WVVKVwMCL__O_u8A",
    authDomain: "gestao-de-infraestrutura-4ee4a.firebaseapp.com",
    projectId: "gestao-de-infraestrutura-4ee4a",
    storageBucket: "gestao-de-infraestrutura-4ee4a.firebasestorage.app",
    messagingSenderId: "1012042763792",
    appId: "1:1012042763792:web:b2c183bcc490b1bbb24495",
    measurementId: "G-TQCLQ72KYD"
};

// ============= VARIAVEIS DE CONTROLE DE LOOP =============
let authStateInitialized = false;
let isRedirecting = false; // Evita redirecionamentos múltiplos
let lastAuthState = null; // Rastreia último estado para evitar duplicatas
let authDebounceTimer = null; // Timer para debounce de mudanças de auth
let persistenceConfigured = false; // Flag para persistência configurada

// ============= INICIALIZACAO UNICA DO FIREBASE =============
let app = null;
let auth = null;
let firestore = null;

function initializeFirebaseOnce() {
    try {
        // Verificar se já foi inicializado
        if (firebase.apps.length > 0) {
            console.log('✅ [FIREBASE-AUTH] Firebase já inicializado, reutilizando...');
            app = firebase.apps[0];
        } else {
            console.log('🚀 [FIREBASE-AUTH] Inicializando Firebase pela primeira vez...');
            app = firebase.initializeApp(firebaseConfig);
        }
        
        // Inicializar serviços
        auth = firebase.auth();
        firestore = firebase.firestore();
        
        // Disponibilizar globalmente
        window.auth = auth;
        window.firestore = firestore;
        
        console.log('✅ [FIREBASE-AUTH] Serviços inicializados');
        console.log('🌐 [FIREBASE-AUTH] Auth Domain:', auth.app.options.authDomain);
        console.log('📋 [FIREBASE-AUTH] Project ID:', auth.app.options.projectId);
        
        return true;
        
    } catch (error) {
        console.error('❌ [FIREBASE-AUTH] Erro na inicialização:', error);
        return false;
    }
}

// ============= CONFIGURAR PERSISTENCIA DE SESSAO =============
async function configurePersistence() {
    if (persistenceConfigured || !auth) return;
    
    try {
        console.log('🔒 [FIREBASE-AUTH] Configurando persistência de sessão...');
        
        // Configurar persistência local (mantém login após fechar navegador)
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        
        persistenceConfigured = true;
        console.log('✅ [FIREBASE-AUTH] Persistência configurada: LOCAL');
        
    } catch (error) {
        console.warn('⚠️ [FIREBASE-AUTH] Erro ao configurar persistência:', error);
        // Continuar mesmo com erro de persistência
    }
}

// ============= FUNCOES DE AUTENTICACAO =============

// Função de registro
window.registerWithEmailPassword = async function(email, password, displayName) {
    console.log('📝 [REGISTER] Iniciando registro:', { email, displayName });
    
    if (!auth) {
        throw new Error('Firebase Auth não inicializado');
    }
    
    try {
        // Configurar persistência antes de qualquer operação de auth
        await configurePersistence();
        
        // Criar usuário
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ [REGISTER] Usuário criado:', user.uid);
        
        // Atualizar perfil
        if (displayName) {
            await user.updateProfile({ displayName: displayName });
            console.log('✅ [REGISTER] Perfil atualizado');
        }
        
        // Salvar dados no Firestore (opcional, não crítico)
        try {
            await firestore.collection('users').doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: displayName,
                role: 'USER',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                environment: 'PRODUCTION'
            });
            console.log('✅ [REGISTER] Dados salvos no Firestore');
        } catch (firestoreError) {
            console.warn('⚠️ [REGISTER] Erro no Firestore (não crítico):', firestoreError);
        }
        
        // NÃO redirecionar aqui - deixar o onAuthStateChanged fazer isso
        console.log('🔄 [REGISTER] Aguardando onAuthStateChanged para redirecionamento');
        
        return {
            success: true,
            user: user,
            message: 'Conta criada com sucesso!'
        };
        
    } catch (error) {
        console.error('❌ [REGISTER] Erro:', error);
        
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
            message: errorMessage
        };
    }
};

// Função de login
window.signInWithEmailPassword = async function(email, password) {
    console.log('🔑 [LOGIN] Iniciando login:', { email });
    
    if (!auth) {
        throw new Error('Firebase Auth não inicializado');
    }
    
    try {
        // Configurar persistência antes de qualquer operação de auth
        await configurePersistence();
        
        // Fazer login
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ [LOGIN] Login realizado:', user.uid);
        
        // Atualizar último login (opcional, não crítico)
        try {
            await firestore.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                environment: 'PRODUCTION'
            });
            console.log('✅ [LOGIN] Último login atualizado');
        } catch (firestoreError) {
            console.warn('⚠️ [LOGIN] Erro ao atualizar último login (não crítico):', firestoreError);
        }
        
        // NÃO redirecionar aqui - deixar o onAuthStateChanged fazer isso
        console.log('🔄 [LOGIN] Aguardando onAuthStateChanged para redirecionamento');
        
        return {
            success: true,
            user: user,
            message: 'Login realizado com sucesso!'
        };
        
    } catch (error) {
        console.error('❌ [LOGIN] Erro:', error);
        
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
            message: errorMessage
        };
    }
};

// Função de logout
window.signOut = async function() {
    console.log('👋 [LOGOUT] Fazendo logout...');
    
    if (!auth) {
        console.warn('⚠️ [LOGOUT] Auth não disponível');
        return { success: false, message: 'Sistema de autenticação não disponível' };
    }
    
    try {
        // Evitar redirecionamentos durante logout
        isRedirecting = true;
        
        // Fazer logout
        await auth.signOut();
        console.log('✅ [LOGOUT] Logout realizado');
        
        // Limpar dados locais
        localStorage.removeItem('user');
        localStorage.removeItem('userToken');
        
        // Permitir redirecionamentos novamente após delay
        setTimeout(() => {
            isRedirecting = false;
        }, 2000);
        
        return {
            success: true,
            message: 'Logout realizado com sucesso!'
        };
        
    } catch (error) {
        console.error('❌ [LOGOUT] Erro:', error);
        isRedirecting = false;
        return {
            success: false,
            error: error,
            message: 'Erro ao fazer logout'
        };
    }
};

// ============= FUNCOES UTILITARIAS =============

// Obter usuário atual
window.getCurrentUser = function() {
    const user = auth?.currentUser;
    if (user) {
        console.log('👤 [AUTH] Usuário atual:', user.email);
    }
    return user;
};

// Verificar se está logado
window.isAuthenticated = function() {
    const isAuth = !!auth?.currentUser;
    console.log('🔍 [AUTH] Status autenticação:', isAuth);
    return isAuth;
};

// Funções de compatibilidade
window.logout = window.signOut;
window.confirmLogout = function() {
    if (confirm('Tem certeza que deseja sair?')) {
        window.signOut();
    }
};

// ============= DETECÇÃO DE PAGINA ROBUSTA =============

function getCurrentPageType() {
    const path = window.location.pathname.toLowerCase();
    const hostname = window.location.hostname;
    
    console.log('🔍 [PAGE-DETECTION] Path:', path, 'Hostname:', hostname);
    
    // Detectar tipo de página
    if (path === '/' || path === '/index.html' || path.endsWith('/index.html') || path.includes('index.html')) {
        return 'login';
    }
    
    if (path.includes('cadastro.html')) {
        return 'register';
    }
    
    if (path.includes('dashboard.html')) {
        return 'dashboard';
    }
    
    // Páginas protegidas (assumir que precisam de auth)
    return 'protected';
}

function shouldRedirectWhenLoggedIn(pageType) {
    // Redirecionar para dashboard se estiver em páginas de auth
    return pageType === 'login' || pageType === 'register';
}

function shouldRedirectWhenLoggedOut(pageType) {
    // Redirecionar para login se estiver em páginas protegidas
    return pageType === 'dashboard' || pageType === 'protected';
}

// ============= REDIRECIONAMENTO SEGURO =============

function safeRedirect(url, reason) {
    if (isRedirecting) {
        console.log('🔄 [REDIRECT] Redirecionamento já em andamento, ignorando:', reason);
        return;
    }
    
    console.log('🔄 [REDIRECT] Redirecionando para:', url, 'Motivo:', reason);
    isRedirecting = true;
    
    // Delay para evitar conflitos
    setTimeout(() => {
        window.location.href = url;
    }, 500);
    
    // Reset flag após delay longo para permitir novos redirecionamentos
    setTimeout(() => {
        isRedirecting = false;
    }, 3000);
}

// ============= LISTENER DE AUTENTICACAO COM DEBOUNCE =============

function setupAuthStateListener() {
    if (!auth) {
        console.error('❌ [AUTH-LISTENER] Auth não disponível para listener');
        return;
    }
    
    console.log('🎧 [AUTH-LISTENER] Configurando listener de estado...');
    
    auth.onAuthStateChanged(function(user) {
        const currentState = user ? 'logged-in' : 'logged-out';
        
        // Evitar processamento duplicado do mesmo estado
        if (lastAuthState === currentState) {
            console.log('🔄 [AUTH-LISTENER] Estado duplicado ignorado:', currentState);
            return;
        }
        
        lastAuthState = currentState;
        
        // Debounce para evitar mudanças muito rápidas
        if (authDebounceTimer) {
            clearTimeout(authDebounceTimer);
        }
        
        authDebounceTimer = setTimeout(() => {
            processAuthStateChange(user);
        }, 300); // Delay de 300ms para estabilizar
    });
}

function processAuthStateChange(user) {
    if (!authStateInitialized) {
        authStateInitialized = true;
        console.log('🚀 [AUTH-LISTENER] Listener inicializado');
    }
    
    console.log('🔄 [AUTH-LISTENER] Estado mudou:', user ? `Logado: ${user.email}` : 'Deslogado');
    
    const pageType = getCurrentPageType();
    
    if (user) {
        // Usuário logado
        console.log('✅ [AUTH-LISTENER] Usuário autenticado:', {
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
        
        // Redirecionar se necessário
        if (shouldRedirectWhenLoggedIn(pageType)) {
            safeRedirect('dashboard.html', 'usuário logado em página de auth');
        }
        
    } else {
        // Usuário deslogado
        console.log('❌ [AUTH-LISTENER] Usuário não autenticado');
        
        // Limpar dados locais
        localStorage.removeItem('user');
        localStorage.removeItem('userToken');
        
        // Redirecionar se necessário
        if (shouldRedirectWhenLoggedOut(pageType)) {
            safeRedirect('index.html', 'usuário deslogado em página protegida');
        }
    }
}

// ============= INICIALIZACAO PRINCIPAL =============

function initializeAuthSystem() {
    console.log('🚀 [FIREBASE-AUTH] Iniciando sistema de autenticação...');
    
    // 1. Inicializar Firebase
    if (!initializeFirebaseOnce()) {
        console.error('❌ [FIREBASE-AUTH] Falha na inicialização do Firebase');
        return;
    }
    
    // 2. Configurar listener de auth
    setupAuthStateListener();
    
    // 3. Configurar persistência (será feita no primeiro login/registro)
    console.log('✅ [FIREBASE-AUTH] Sistema inicializado com sucesso');
    
    // 4. Disparar evento de pronto
    setTimeout(() => {
        if (auth && firestore) {
            console.log('✅ [FIREBASE-AUTH] Sistema pronto para uso');
            
            const event = new CustomEvent('firebaseReady', {
                detail: { environment: 'PRODUCTION' }
            });
            document.dispatchEvent(event);
        }
    }, 100);
}

// ============= INICIALIZAR QUANDO DOM ESTIVER PRONTO =============

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthSystem);
} else {
    // DOM já carregado
    initializeAuthSystem();
}

// ============= BLOQUEIO DE FUNCIONALIDADES LOCAIS =============

// Bloquear tentativas de usar emuladores ou localhost
const originalFetch = window.fetch;
window.fetch = function(url, ...args) {
    if (typeof url === 'string') {
        if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('emulator')) {
            console.error('🚫 [FIREBASE-AUTH] BLOQUEADO: Tentativa de acessar URL local:', url);
            return Promise.reject(new Error('URLs locais bloqueadas - apenas produção permitida'));
        }
    }
    return originalFetch.call(this, url, ...args);
};

console.log('✅ [FIREBASE-AUTH] Sistema de autenticação corrigido carregado com sucesso');
console.log('🛡️ [FIREBASE-AUTH] Proteção contra loops infinitos ativada');
console.log('🔒 [FIREBASE-AUTH] Persistência de sessão será configurada automaticamente');