// ============= FIREBASE AUTH ISOLADO - ANTI-LOOP DEFINITIVO =============
console.log('🔥 [FIREBASE-ISOLATED] Inicializando sistema isolado anti-loop v5.0...');

// ============= NAMESPACE ISOLADO PARA EVITAR CONFLITOS =============
window.FirebaseAuthIsolated = (function() {
    'use strict';
    
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
    
    // ============= VARIAVEIS PRIVADAS ISOLADAS =============
    let app = null;
    let auth = null;
    let firestore = null;
    
    // Controles anti-loop
    let isInitialized = false;
    let authListenerActive = false;
    let redirectInProgress = false;
    let lastUid = null; // Armazena o último UID logado para evitar execuções repetidas
    let authStateChangeCount = 0;
    let persistenceSet = false;
    
    // Sessão de controle 
    const SESSION_KEY = 'firebase_auth_session_control';
    const REDIRECT_LOCK_KEY = 'firebase_redirect_lock';
    
    // ============= FUNCOES UTILITARIAS PRIVADAS =============
    
    function log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = '🔥 [FIREBASE-ISOLATED]';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }
    
    function setSessionFlag(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify({
                value: value,
                timestamp: Date.now()
            }));
        } catch (e) {
            // Ignorar erros de sessionStorage
        }
    }
    
    function getSessionFlag(key, maxAge = 10000) {
        try {
            const data = sessionStorage.getItem(key);
            if (!data) return null;
            
            const parsed = JSON.parse(data);
            if (Date.now() - parsed.timestamp > maxAge) {
                sessionStorage.removeItem(key);
                return null;
            }
            
            return parsed.value;
        } catch (e) {
            return null;
        }
    }
    
    function clearSessionFlag(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            // Ignorar erros
        }
    }
    
    function getCurrentPageType() {
        const path = window.location.pathname.toLowerCase();
        
        if (path === '/' || path.includes('index.html')) {
            return 'login';
        }
        if (path.includes('cadastro.html')) {
            return 'register';
        }
        if (path.includes('dashboard.html')) {
            return 'dashboard';
        }
        
        return 'other';
    }
    
    function isRedirectAllowed() {
        // Verificar se já está redirecionando
        if (redirectInProgress) {
            log('Redirecionamento já em progresso, bloqueado');
            return false;
        }
        
        // Verificar lock de sessão
        const lockTime = getSessionFlag(REDIRECT_LOCK_KEY);
        if (lockTime) {
            log('Redirecionamento bloqueado por lock de sessão');
            return false;
        }
        
        return true;
    }
    
    function executeRedirect(url, reason) {
        if (!isRedirectAllowed()) {
            return;
        }
        
        log(`Executando redirecionamento para: ${url} (${reason})`);
        
        // Marcar redirecionamento em progresso
        redirectInProgress = true;
        setSessionFlag(REDIRECT_LOCK_KEY, true);
        
        // Fazer redirecionamento
        setTimeout(() => {
            window.location.href = url;
        }, 100);
        
        // Reset após delay longo para permitir novos redirecionamentos futuros
        setTimeout(() => {
            redirectInProgress = false;
            clearSessionFlag(REDIRECT_LOCK_KEY);
        }, 5000);
    }
    
    // ============= INICIALIZACAO FIREBASE =============
    
    function initializeFirebase() {
        if (isInitialized) {
            log('Firebase já inicializado, pulando');
            return true;
        }
        
        try {
            log('Inicializando Firebase...');
            
            // Verificar se já existe app
            if (firebase.apps.length > 0) {
                app = firebase.apps[0];
                log('Reutilizando app Firebase existente');
            } else {
                app = firebase.initializeApp(firebaseConfig);
                log('Novo app Firebase criado');
            }
            
            // Inicializar serviços
            auth = firebase.auth();
            firestore = firebase.firestore();
            
            // Disponibilizar globalmente
            window.auth = auth;
            window.firestore = firestore;
            
            isInitialized = true;
            log('Firebase inicializado com sucesso');
            
            return true;
            
        } catch (error) {
            log('Erro ao inicializar Firebase: ' + error.message, 'error');
            return false;
        }
    }
    
    // ============= CONFIGURAR PERSISTENCIA =============
    
    async function ensurePersistence() {
        if (persistenceSet || !auth) return;
        
        try {
            log('Configurando persistência de sessão...');
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            persistenceSet = true;
            log('Persistência configurada: LOCAL');
        } catch (error) {
            log('Erro ao configurar persistência: ' + error.message, 'warn');
        }
    }
    
    // ============= LISTENER DE AUTH ISOLADO =============
    
    function setupAuthListener() {
        if (authListenerActive || !auth) {
            log('Auth listener já ativo ou auth não disponível');
            return;
        }
        
        log('Configurando listener de autenticação com controle por UID...');
        authListenerActive = true;
        
        auth.onAuthStateChanged(function(user) {
            authStateChangeCount++;
            log(`🔄 Auth state changed #${authStateChangeCount}`);
            
            if (user) {
                // Só executa se o usuário atual for diferente do último registrado
                if (user.uid !== lastUid) {
                    lastUid = user.uid;
                    log(`✅ Usuário logado: ${user.email} (UID: ${user.uid})`);
                    
                    // Salvar dados do usuário
                    localStorage.setItem('user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        timestamp: Date.now()
                    }));
                    
                    // Disparar evento para atualizar permissões
                    setTimeout(() => {
                        const authEvent = new CustomEvent('authStateChanged');
                        window.dispatchEvent(authEvent);
                    }, 500);
                    
                    // Redireciona para o dashboard apenas se não já estiver lá
                    if (!window.location.pathname.includes("dashboard.html")) {
                        log('📍 Redirecionando para dashboard...');
                        window.location.href = "dashboard.html";
                    } else {
                        log('📍 Já está no dashboard, não redirecionando');
                    }
                } else {
                    log('🔄 Mesmo usuário, ignorando mudança de estado');
                }
            } else {
                // Se não há usuário logado e o último UID não era nulo
                if (lastUid !== null) {
                    lastUid = null;
                    log('❌ Usuário deslogado');
                    
                    // Limpar dados
                    localStorage.removeItem('user');
                    localStorage.removeItem('userToken');
                    
                    // Redireciona para login apenas se não já estiver lá
                    if (!window.location.pathname.includes("index.html") && window.location.pathname !== '/') {
                        log('📍 Redirecionando para login...');
                        window.location.href = "index.html";
                    } else {
                        log('📍 Já está na página de login, não redirecionando');
                    }
                } else {
                    log('🔄 Já estava deslogado, ignorando');
                }
            }
        });
    }
    
    
    // ============= FUNCOES PUBLICAS DE AUTH =============
    
    async function register(email, password, displayName) {
        log(`Iniciando registro: ${email}`);
        
        if (!auth) {
            throw new Error('Firebase Auth não inicializado');
        }
        
        try {
            await ensurePersistence();
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            log(`Usuário criado: ${user.uid}`);
            
            // Atualizar perfil
            if (displayName) {
                await user.updateProfile({ displayName: displayName });
                log('Perfil atualizado');
            }
            
            // Salvar no Firestore (opcional)
            try {
                await firestore.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName,
                    role: 'USER',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    environment: 'PRODUCTION'
                });
                log('Dados salvos no Firestore');
            } catch (e) {
                log('Erro no Firestore (não crítico): ' + e.message, 'warn');
            }
            
            return {
                success: true,
                user: user,
                message: 'Conta criada com sucesso!'
            };
            
        } catch (error) {
            log('Erro no registro: ' + error.message, 'error');
            
            let errorMessage = 'Erro desconhecido';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este e-mail já está em uso';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'E-mail inválido';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Senha muito fraca';
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
    }
    
    async function login(email, password) {
        log(`Iniciando login: ${email}`);
        
        if (!auth) {
            throw new Error('Firebase Auth não inicializado');
        }
        
        try {
            await ensurePersistence();
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            log(`Login realizado: ${user.uid}`);
            
            return {
                success: true,
                user: user,
                message: 'Login realizado com sucesso!'
            };
            
        } catch (error) {
            log('Erro no login: ' + error.message, 'error');
            
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
                default:
                    errorMessage = error.message;
            }
            
            return {
                success: false,
                error: error,
                message: errorMessage
            };
        }
    }
    
    async function logout() {
        log('Fazendo logout...');
        
        if (!auth) {
            return { success: false, message: 'Auth não disponível' };
        }
        
        try {
            // Evitar redirecionamentos durante logout
            redirectInProgress = true;
            setSessionFlag(REDIRECT_LOCK_KEY, true);
            
            await auth.signOut();
            log('Logout realizado');
            
            // Limpar dados
            localStorage.removeItem('user');
            localStorage.removeItem('userToken');
            clearSessionFlag(SESSION_KEY);
            
            // Liberar redirecionamentos após delay
            setTimeout(() => {
                redirectInProgress = false;
                clearSessionFlag(REDIRECT_LOCK_KEY);
            }, 3000);
            
            return {
                success: true,
                message: 'Logout realizado com sucesso!'
            };
            
        } catch (error) {
            log('Erro no logout: ' + error.message, 'error');
            redirectInProgress = false;
            clearSessionFlag(REDIRECT_LOCK_KEY);
            
            return {
                success: false,
                error: error,
                message: 'Erro ao fazer logout'
            };
        }
    }
    
    function getCurrentUser() {
        return auth?.currentUser || null;
    }
    
    function isAuthenticated() {
        return !!auth?.currentUser;
    }
    
    // ============= INICIALIZACAO =============
    
    function initialize() {
        log('Iniciando sistema isolado...');
        
        if (!initializeFirebase()) {
            log('Falha na inicialização do Firebase', 'error');
            return false;
        }
        
        setupAuthListener();
        
        log('Sistema isolado inicializado com sucesso');
        
        // Disparar evento de pronto
        setTimeout(() => {
            const event = new CustomEvent('firebaseIsolatedReady');
            document.dispatchEvent(event);
        }, 100);
        
        return true;
    }
    
    // ============= API PUBLICA =============
    
    return {
        initialize: initialize,
        register: register,
        login: login,
        logout: logout,
        getCurrentUser: getCurrentUser,
        isAuthenticated: isAuthenticated,
        
        // Para compatibilidade
        get auth() { return auth; },
        get firestore() { return firestore; }
    };
    
})();

// ============= SOBREESCREVER FUNCOES GLOBAIS =============

// Substituir as funções globais para usar o sistema isolado
window.registerWithEmailPassword = async function(email, password, displayName) {
    return await window.FirebaseAuthIsolated.register(email, password, displayName);
};

window.signInWithEmailPassword = async function(email, password) {
    return await window.FirebaseAuthIsolated.login(email, password);
};

window.signOut = async function() {
    return await window.FirebaseAuthIsolated.logout();
};

window.logout = window.signOut;

window.getCurrentUser = function() {
    return window.FirebaseAuthIsolated.getCurrentUser();
};

window.isAuthenticated = function() {
    return window.FirebaseAuthIsolated.isAuthenticated();
};

window.confirmLogout = function() {
    console.log('🔐 [CONFIRM-LOGOUT] Solicitação de logout...');
    if (confirm('Tem certeza que deseja sair?')) {
        console.log('🔐 [CONFIRM-LOGOUT] Confirmado, fazendo logout...');
        window.signOut();
    } else {
        console.log('🔐 [CONFIRM-LOGOUT] Cancelado pelo usuário');
    }
};

// ============= INICIALIZAR AUTOMATICAMENTE =============

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.FirebaseAuthIsolated.initialize();
    });
} else {
    window.FirebaseAuthIsolated.initialize();
}

console.log('✅ [FIREBASE-ISOLATED] Sistema anti-loop isolado carregado');
console.log('🛡️ [FIREBASE-ISOLATED] Proteção máxima contra loops ativada');
console.log('🔒 [FIREBASE-ISOLATED] Sistema completamente isolado de conflitos');