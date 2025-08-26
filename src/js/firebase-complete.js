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
            
            // Timeout para evitar travamento
            const persistencePromise = auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout na configuração de persistência')), 3000)
            );
            
            await Promise.race([persistencePromise, timeoutPromise]);
            persistenceSet = true;
            log('Persistência configurada: LOCAL');
        } catch (error) {
            log('Erro ao configurar persistência: ' + error.message, 'warn');
            // Continuar mesmo com erro na persistência
            persistenceSet = true;
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
        
        auth.onAuthStateChanged(async function(user) {
            authStateChangeCount++;
            log(`🔄 Auth state changed #${authStateChangeCount}`);
            
            if (user) {
                // Só executa se o usuário atual for diferente do último registrado
                if (user.uid !== lastUid) {
                    lastUid = user.uid;
                    log(`✅ Usuário logado: ${user.email} (UID: ${user.uid})`);
                    
                    // Criar/atualizar documento do usuário no Firestore
                    try {
                        const userDocRef = firestore.collection('users').doc(user.uid);
                        const userDoc = await userDocRef.get();
                        
                        if (!userDoc.exists) {
                            log(`📄 Criando documento do usuário no Firestore...`);
                            await userDocRef.set({
                                uid: user.uid,
                                email: user.email,
                                displayName: user.displayName || user.email.split('@')[0],
                                role: 'USER',
                                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                                environment: 'PRODUCTION'
                            });
                            log(`✅ Documento do usuário criado no Firestore`);
                            
                            // Auto-promoção especial para yan@test.com.br
                            if (user.email === 'yan@test.com.br') {
                                log(`🛡️ Auto-promovendo ${user.email} para ADMIN...`);
                                await userDocRef.update({
                                    role: 'ADMIN',
                                    promotedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                    promotedBy: 'AUTO_SYSTEM'
                                });
                                log(`✅ ${user.email} promovido para ADMIN automaticamente`);
                            }
                        } else {
                            log(`📄 Atualizando último login...`);
                            await userDocRef.update({
                                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            log(`✅ Último login atualizado`);
                            
                            // Verificar se yan@test.com.br precisa ser promovido
                            if (user.email === 'yan@test.com.br') {
                                const userData = userDoc.data();
                                if (userData.role !== 'ADMIN') {
                                    log(`🛡️ Promovendo ${user.email} para ADMIN...`);
                                    await userDocRef.update({
                                        role: 'ADMIN',
                                        promotedAt: firebase.firestore.FieldValue.serverTimestamp(),
                                        promotedBy: 'AUTO_SYSTEM'
                                    });
                                    log(`✅ ${user.email} promovido para ADMIN`);
                                }
                            }
                        }
                    } catch (e) {
                        log(`❌ Erro no Firestore: ${e.message}`, 'error');
                        console.error('Erro detalhado Firestore:', e);
                    }
                    
                    // Salvar dados do usuário no localStorage
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
            // Tentar configurar persistência com timeout
            try {
                await Promise.race([
                    ensurePersistence(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout na persistência')), 2000)
                    )
                ]);
            } catch (persistenceError) {
                log('Pulando persistência devido a timeout: ' + persistenceError.message, 'warn');
            }
            
            log('Realizando autenticação...');
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
    if (confirm('Deseja realmente sair do sistema?')) {
        console.log('🔐 [CONFIRM-LOGOUT] Confirmado, fazendo logout...');
        window.signOut().then((result) => {
            if (result.success) {
                console.log('✅ [LOGOUT] Logout realizado com sucesso, redirecionando...');
                window.location.href = 'index.html';
            } else {
                console.error('❌ [LOGOUT] Erro no logout:', result.error);
                // Mesmo com erro, redirecionar para evitar travamento
                window.location.href = 'index.html';
            }
        }).catch((error) => {
            console.error('❌ [LOGOUT] Erro crítico no logout:', error);
            // Forçar redirecionamento
            window.location.href = 'index.html';
        });
    } else {
        console.log('🔐 [CONFIRM-LOGOUT] Cancelado pelo usuário');
    }
};

// ============= CONFIGURAÇÃO AUTOMÁTICA DO USUÁRIO ADMIN =============

// Função para criar usuário admin automaticamente se não existir
window.setupAdminUser = async function() {
    const adminEmail = 'yan@test.com.br';
    const adminPassword = 'test123';
    
    console.log('🔧 [ADMIN-SETUP] Verificando usuário admin...');
    
    try {
        // Tentar fazer login primeiro para ver se já existe
        const loginResult = await window.FirebaseAuthIsolated.login(adminEmail, adminPassword);
        if (loginResult.success) {
            console.log('✅ [ADMIN-SETUP] Usuário admin já existe e está funcional');
            // Fazer logout após verificar
            await window.FirebaseAuthIsolated.logout();
            return true;
        }
    } catch (loginError) {
        console.log('🔧 [ADMIN-SETUP] Usuário admin não existe ou senha incorreta, criando...');
        console.log('🔍 [ADMIN-SETUP] Erro detalhado:', loginError.message);
        
        try {
            // Criar usuário admin
            const registerResult = await window.FirebaseAuthIsolated.register(adminEmail, adminPassword, 'Admin Test');
            if (registerResult.success) {
                console.log('✅ [ADMIN-SETUP] Usuário admin criado com sucesso');
                
                // Aguardar um pouco e definir role como ADMIN
                setTimeout(async () => {
                    try {
                        const user = registerResult.user;
                        const firestore = window.FirebaseAuthIsolated.firestore;
                        if (firestore && user) {
                            await firestore.collection('users').doc(user.uid).update({
                                role: 'ADMIN'
                            });
                            console.log('✅ [ADMIN-SETUP] Role ADMIN definida com sucesso');
                        }
                    } catch (roleError) {
                        console.error('❌ [ADMIN-SETUP] Erro ao definir role:', roleError);
                    }
                }, 1000);
                
                return true;
            }
        } catch (registerError) {
            console.error('❌ [ADMIN-SETUP] Erro ao criar usuário admin:', registerError);
            return false;
        }
    }
    
    return false;
};

// ============= INICIALIZAR AUTOMATICAMENTE =============

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        window.FirebaseAuthIsolated.initialize();
        // Setup do usuário admin após inicialização
        setTimeout(() => {
            window.setupAdminUser();
        }, 2000);
    });
} else {
    window.FirebaseAuthIsolated.initialize();
    // Setup do usuário admin após inicialização
    setTimeout(() => {
        window.setupAdminUser();
    }, 2000);
}

console.log('✅ [FIREBASE-ISOLATED] Sistema anti-loop isolado carregado');
console.log('🛡️ [FIREBASE-ISOLATED] Proteção máxima contra loops ativada');
console.log('🔒 [FIREBASE-ISOLATED] Sistema completamente isolado de conflitos');
console.log('');
console.log('🔑 [LOGIN-INFO] Credenciais de teste:');
console.log('   Email: yan@test.com.br');
console.log('   Senha: test123');
console.log('   O sistema criará este usuário automaticamente se não existir.');
console.log('');
console.log('💡 [TROUBLESHOOTING] Se houver problemas de login:');
console.log('   1. Aguarde alguns segundos após carregar a página');
console.log('   2. Verifique o console para logs de [ADMIN-SETUP]');
console.log('   3. Recarregue a página se necessário');