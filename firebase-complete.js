// ============================================================================
// FIREBASE COMPLETE - Sistema unificado e limpo (substituir todos os outros)
// ============================================================================

console.log('🔥 [FIREBASE] Sistema Firebase unificado iniciando...');

// Verificar se já foi carregado (evitar duplicação)
if (window.FIREBASE_COMPLETE_LOADED) {
    console.log('✅ [FIREBASE] Sistema já carregado - pulando');
} else {
    window.FIREBASE_COMPLETE_LOADED = true;

    // ============================================================================
    // 1. CONFIGURAÇÃO ÚNICA DO FIREBASE
    // ============================================================================

    const firebaseConfig = {
        apiKey: "AIzaSyDHKb34lNwFIEBmkO9WVVKVwMCL__O_u8A",
        authDomain: "gestao-de-infraestrutura-4ee4a.firebaseapp.com",
        projectId: "gestao-de-infraestrutura-4ee4a",
        storageBucket: "gestao-de-infraestrutura-4ee4a.firebasestorage.app",
        messagingSenderId: "1012042763792",
        appId: "1:1012042763792:web:b2c183bcc490b1bbb24495",
        measurementId: "G-TQCLQ72KYD"
    };

    // ============================================================================
    // 2. VARIÁVEIS GLOBAIS
    // ============================================================================

    let db = null;
    let auth = null;
    let analytics = null;
    let currentUser = null;
    let redirectInProgress = false;

    // ============================================================================
    // 3. FUNÇÃO DE COMPATIBILIDADE (para código legado)
    // ============================================================================

    window.loadUsersFromStorage = function() {
        console.log('⚠️ [COMPAT] loadUsersFromStorage() obsoleta - usando Firebase Auth');
        if (typeof window.usersData === 'undefined') {
            window.usersData = {};
        }
        return window.usersData;
    };

    // ============================================================================
    // 4. INICIALIZAÇÃO FIREBASE
    // ============================================================================

    async function initializeFirebaseComplete() {
        console.log('🔄 [FIREBASE] Inicializando Firebase...');

        // Aguardar Firebase SDK carregar
        let attempts = 0;
        while (typeof firebase === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof firebase === 'undefined') {
            console.error('❌ [FIREBASE] Firebase SDK não carregou após 5 segundos');
            return false;
        }

        try {
            // Inicializar Firebase App
            if (!firebase.apps || firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
                console.log('✅ [FIREBASE] App inicializado');
            }

            // Inicializar serviços
            auth = firebase.auth();
            db = firebase.firestore();
            
            if (firebase.analytics) {
                analytics = firebase.analytics();
            }

            // Configurar listener de autenticação
            auth.onAuthStateChanged(onAuthStateChanged);

            // Expor globalmente
            window.auth = auth;
            window.db = db;
            window.analytics = analytics;

            console.log('✅ [FIREBASE] Serviços inicializados');
            return true;

        } catch (error) {
            console.error('❌ [FIREBASE] Erro na inicialização:', error);
            return false;
        }
    }

    // ============================================================================
    // 5. FUNÇÕES DE AUTENTICAÇÃO
    // ============================================================================

    // Cadastro com email e senha
    async function registerWithEmailPassword(email, password, displayName) {
        console.log('🔐 [FIREBASE] Tentando cadastro:', email);
        
        if (!auth) {
            console.error('❌ [FIREBASE] Auth não inicializado');
            return { success: false, error: 'Sistema de autenticação não disponível' };
        }

        try {
            // USAR FIREBASE AUTH DIRETAMENTE
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            console.log('✅ [FIREBASE] Usuário criado no Auth:', userCredential.user.uid);
            
            // Atualizar perfil se displayName foi fornecido
            if (displayName) {
                await userCredential.user.updateProfile({ displayName });
                console.log('✅ [FIREBASE] Perfil atualizado');
            }

            // Criar documento do usuário no Firestore
            if (db) {
                const userData = {
                    email: userCredential.user.email,
                    displayName: displayName || userCredential.user.email.split('@')[0],
                    role: 'normal',
                    createdAt: new Date(),
                    active: true
                };

                await db.collection('users').doc(userCredential.user.uid).set(userData);
                console.log('✅ [FIREBASE] Documento do usuário criado no Firestore');
            }

            return { success: true, user: userCredential.user };

        } catch (error) {
            console.error('❌ [FIREBASE] Erro no cadastro:', error);
            return { success: false, error: getAuthErrorMessage(error.code) };
        }
    }

    // Login com email e senha
    async function loginWithEmailPassword(email, password) {
        console.log('🔐 [FIREBASE] Tentando login:', email);
        
        if (!auth) {
            console.error('❌ [FIREBASE] Auth não inicializado');
            return { success: false, error: 'Sistema de autenticação não disponível' };
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ [FIREBASE] Login realizado com sucesso');
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('❌ [FIREBASE] Erro no login:', error);
            return { success: false, error: getAuthErrorMessage(error.code) };
        }
    }

    // Logout
    async function logout() {
        if (!auth) return { success: false };

        try {
            await auth.signOut();
            console.log('✅ [FIREBASE] Logout realizado com sucesso');
            return { success: true };
        } catch (error) {
            console.error('❌ [FIREBASE] Erro no logout:', error);
            return { success: false, error: 'Erro ao fazer logout' };
        }
    }

    // ============================================================================
    // 6. GERENCIAMENTO DE ESTADO DE AUTENTICAÇÃO
    // ============================================================================

    async function onAuthStateChanged(user) {
        currentUser = user;

        if (user) {
            console.log('✅ [AUTH] Usuário autenticado:', user.email);
            
            // Carregar dados do usuário do Firestore
            await loadUserData(user.uid);
            
            // Redirecionamento controlado
            const currentPath = window.location.pathname;
            const shouldRedirectToDashboard = (currentPath.includes('index.html') || currentPath === '/' || currentPath.includes('cadastro.html'));
            
            if (shouldRedirectToDashboard && !redirectInProgress) {
                console.log('✅ [AUTH] Redirecionando para dashboard');
                redirectInProgress = true;
                setTimeout(() => {
                    window.location.replace('dashboard.html');
                }, 1500);
            }
            
        } else {
            console.log('❌ [AUTH] Usuário não autenticado');
            redirectInProgress = false;
            
            const currentPath = window.location.pathname;
            const isLoginPage = currentPath.includes('index.html') || currentPath === '/';
            const isCadastroPage = currentPath.includes('cadastro.html');
            
            if (!isLoginPage && !isCadastroPage && !redirectInProgress) {
                console.log('🔄 [AUTH] Redirecionando para login');
                redirectInProgress = true;
                setTimeout(() => {
                    window.location.replace('index.html');
                }, 500);
            }
        }
    }

    // Carregar dados do usuário do Firestore
    async function loadUserData(uid) {
        if (!db) return;

        try {
            const userDoc = await db.collection('users').doc(uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUser.customClaims = userData;
                console.log('👤 [FIREBASE] Dados do usuário carregados:', userData.role);
            }
        } catch (error) {
            console.error('❌ [FIREBASE] Erro ao carregar dados do usuário:', error);
        }
    }

    // ============================================================================
    // 7. UTILITÁRIOS
    // ============================================================================

    function getAuthErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'Usuário não encontrado.',
            'auth/wrong-password': 'Senha incorreta.',
            'auth/email-already-in-use': 'Este email já está em uso.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/invalid-email': 'Email inválido.',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        };
        return errorMessages[errorCode] || 'Erro de autenticação. Tente novamente.';
    }

    // ============================================================================
    // 8. EXPOR FUNÇÕES GLOBALMENTE
    // ============================================================================

    window.registerWithEmailPassword = registerWithEmailPassword;
    window.loginWithEmailPassword = loginWithEmailPassword;
    window.logout = logout;

    // Funções de teste para debug
    window.testarFirebaseAuth = function() {
        console.log('🧪 [TEST] Testando Firebase Auth...');
        console.log('Auth object:', window.auth);
        console.log('Register function:', typeof window.registerWithEmailPassword);
        console.log('Firebase app:', firebase?.apps?.length || 'nenhum');
        
        if (window.registerWithEmailPassword) {
            console.log('✅ [TEST] Função de registro disponível');
        } else {
            console.log('❌ [TEST] Função de registro NÃO disponível');
        }
    };

    window.testarCadastroFirebase = async function(email = 'teste@exemplo.com', password = '123456') {
        console.log('🧪 [TEST] Testando cadastro Firebase:', email);
        
        if (!window.registerWithEmailPassword) {
            console.error('❌ [TEST] Função registerWithEmailPassword não disponível!');
            return;
        }
        
        try {
            const result = await window.registerWithEmailPassword(email, password, 'Usuário Teste');
            console.log('🧪 [TEST] Resultado:', result);
            
            if (result.success) {
                console.log('✅ [TEST] SUCESSO! Usuário criado:', result.user.uid);
            } else {
                console.log('❌ [TEST] ERRO:', result.error);
            }
        } catch (error) {
            console.error('❌ [TEST] Erro inesperado:', error);
        }
    };

    // ============================================================================
    // 9. INICIALIZAÇÃO AUTOMÁTICA
    // ============================================================================

    // Inicializar quando DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeFirebaseComplete);
    } else {
        initializeFirebaseComplete();
    }

    // Backup
    window.addEventListener('load', initializeFirebaseComplete);

    console.log('✅ [FIREBASE] Sistema unificado configurado - aguardando inicialização...');
}