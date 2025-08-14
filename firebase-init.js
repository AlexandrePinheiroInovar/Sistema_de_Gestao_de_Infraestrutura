// ============================================================================
// FIREBASE INITIALIZATION - Sistema de inicialização único e controlado
// ============================================================================

console.log('🔥 [INIT] Sistema Firebase iniciando...');

// Verificar se já foi inicializado (evita duplicação)
if (window.FIREBASE_SYSTEM_LOADED) {
    console.log('✅ [INIT] Sistema Firebase já carregado - pulando inicialização');
} else {
    window.FIREBASE_SYSTEM_LOADED = true;
    
    // Controle de inicialização
    window.FIREBASE_INITIALIZED = false;
    window.FIREBASE_INIT_ATTEMPTS = 0;

    // Configuração única do Firebase
    window.FIREBASE_CONFIG = {
        apiKey: "AIzaSyDHKb34lNwFIEBmkO9WVVKVwMCL__O_u8A",
        authDomain: "gestao-de-infraestrutura-4ee4a.firebaseapp.com",
        projectId: "gestao-de-infraestrutura-4ee4a",
        storageBucket: "gestao-de-infraestrutura-4ee4a.firebasestorage.app",
        messagingSenderId: "1012042763792",
        appId: "1:1012042763792:web:b2c183bcc490b1bbb24495",
        measurementId: "G-TQCLQ72KYD"
    };

    // Função para compatibilidade com código legado
    window.loadUsersFromStorage = function() {
        console.log('⚠️ [COMPAT] loadUsersFromStorage() chamada - redirecionando para Firebase Auth');
        if (typeof window.usersData === 'undefined') {
            window.usersData = {};
        }
        return window.usersData;
    };
    
    console.log('✅ [INIT] Funções de compatibilidade criadas');
}

// Função principal de inicialização Firebase
async function initializeFirebaseSafely() {
    if (window.FIREBASE_INITIALIZED) {
        console.log('✅ Firebase já inicializado, pulando...');
        return true;
    }
    
    window.FIREBASE_INIT_ATTEMPTS++;
    
    if (window.FIREBASE_INIT_ATTEMPTS > 5) {
        console.error('❌ Máximo de tentativas de inicialização Firebase atingido');
        return false;
    }
    
    console.log(`🔄 [INIT] Tentativa ${window.FIREBASE_INIT_ATTEMPTS} de inicialização Firebase...`);
    
    // Verificar se Firebase SDK está carregado
    if (typeof firebase === 'undefined') {
        console.log('⏳ Firebase SDK ainda não carregado, aguardando...');
        return false;
    }
    
    try {
        // Inicializar Firebase App (se ainda não foi inicializado)
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            console.log('✅ [INIT] Firebase App inicializado com configuração única');
        }
        
        // Inicializar serviços Firebase
        window.auth = firebase.auth();
        window.db = firebase.firestore();
        
        if (firebase.analytics) {
            window.analytics = firebase.analytics();
        }
        
        console.log('✅ [INIT] Serviços Firebase inicializados');
        
        // Marcar como inicializado
        window.FIREBASE_INITIALIZED = true;
        
        // Disparar evento personalizado para notificar outros scripts
        const event = new CustomEvent('firebaseInitialized', {
            detail: { auth: window.auth, db: window.db }
        });
        window.dispatchEvent(event);
        
        console.log('✅ [INIT] Firebase totalmente inicializado!');
        return true;
        
    } catch (error) {
        console.error('❌ [INIT] Erro na inicialização Firebase:', error);
        return false;
    }
}

// Tentar inicialização múltiplas vezes com intervalos
function attemptFirebaseInit() {
    initializeFirebaseSafely().then(success => {
        if (!success && window.FIREBASE_INIT_ATTEMPTS < 5) {
            setTimeout(attemptFirebaseInit, 1000); // Tentar novamente em 1s
        }
    });
}

// Inicializar quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptFirebaseInit);
} else {
    attemptFirebaseInit();
}

// Backup: Tentar após window load
window.addEventListener('load', attemptFirebaseInit);

console.log('🔥 [INIT] Sistema de inicialização Firebase configurado');