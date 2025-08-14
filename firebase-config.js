// ============================================================================
// FIREBASE CONFIG - Sistema de configuração controlado
// ============================================================================

console.log('🔥 [CONFIG] Firebase-config.js carregado');

// Variáveis globais Firebase
let db = null;
let auth = null;
let analytics = null;
let currentUser = null;

// Aguardar inicialização do Firebase
function waitForFirebaseInit() {
  console.log('🔄 [CONFIG] Aguardando inicialização do Firebase...');
  
  // Se já foi inicializado, configurar imediatamente
  if (window.FIREBASE_INITIALIZED) {
    setupFirebaseServices();
    return;
  }
  
  // Senão, aguardar evento de inicialização
  window.addEventListener('firebaseInitialized', setupFirebaseServices);
}

// Configurar serviços Firebase após inicialização
function setupFirebaseServices() {
  console.log('✅ [CONFIG] Configurando serviços Firebase...');
  
  try {
    // Usar instâncias globais já inicializadas
    auth = window.auth;
    db = window.db;
    analytics = window.analytics;
    
    if (auth) {
      // Configurar listener de mudança de estado de autenticação
      auth.onAuthStateChanged(onAuthStateChanged);
      console.log('✅ [CONFIG] Auth state listener configurado');
    }
    
    if (db) {
      console.log('✅ [CONFIG] Firestore configurado');
    }
    
    // Expor funções e variáveis globalmente para uso nos formulários
    window.loginWithEmailPassword = loginWithEmailPassword;
      window.registerWithEmailPassword = registerWithEmailPassword;
      window.logout = logout;
      window.db = db;
      window.auth = auth;
      window.currentUser = currentUser;
      
      // Função de teste para debug
      window.testarFirebaseAuth = function() {
        console.log('🧪 Testando Firebase Auth...');
        console.log('Auth object:', window.auth);
        console.log('Register function:', typeof window.registerWithEmailPassword);
        console.log('Login function:', typeof window.loginWithEmailPassword);
        console.log('Firebase app:', firebase?.apps?.length || 'nenhum');
        
        // Teste direto
        if (window.registerWithEmailPassword) {
          console.log('✅ Função de registro disponível');
        } else {
          console.log('❌ Função de registro NÃO disponível');
        }
        
        // Verificar se o Auth está funcionando
        if (auth) {
          console.log('✅ Firebase Auth inicializado');
          console.log('Current user:', auth.currentUser);
        } else {
          console.log('❌ Firebase Auth NÃO inicializado');
        }
      };
      
      // Função de teste para cadastro direto
      window.testarCadastroFirebase = async function(email = 'teste@exemplo.com', password = '123456') {
        console.log('🧪 Testando cadastro Firebase direto...', email);
        
        if (!window.registerWithEmailPassword) {
          console.error('❌ Função registerWithEmailPassword não disponível!');
          return;
        }
        
        try {
          const result = await window.registerWithEmailPassword(email, password, 'Usuário Teste');
          console.log('🧪 Resultado do cadastro de teste:', result);
          
          if (result.success) {
            console.log('✅ SUCESSO: Usuário criado no Firebase Auth!');
            console.log('👤 UID:', result.user.uid);
            console.log('📧 Email:', result.user.email);
          } else {
            console.log('❌ ERRO no cadastro:', result.error);
          }
          
        } catch (error) {
          console.error('❌ ERRO inesperado no teste de cadastro:', error);
        }
      };
      
      console.log('🔗 Funções Firebase expostas globalmente:', {
        loginWithEmailPassword: typeof window.loginWithEmailPassword,
        registerWithEmailPassword: typeof window.registerWithEmailPassword,
        logout: typeof window.logout,
        db: typeof window.db,
        auth: typeof window.auth
      });
      
    console.log('🧪 Para testar, execute: window.testarFirebaseAuth()');
    console.log('✅ [CONFIG] Firebase configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ [CONFIG] Erro ao configurar Firebase:', error);
  }
}

// Inicializar quando DOM carregar ou imediatamente se já carregou
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForFirebaseInit);
} else {
  waitForFirebaseInit();
}

// Múltiplas tentativas de inicialização
document.addEventListener('DOMContentLoaded', initializeFirebaseSystem);
window.addEventListener('load', initializeFirebaseSystem);

// Timeout como backup
setTimeout(initializeFirebaseSystem, 1000);
setTimeout(initializeFirebaseSystem, 3000);

// URL base da API (vai ser a URL do Firebase Functions após o deploy)
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/gestao-de-infraestrutura-4ee4a/us-central1/api'
  : 'https://us-central1-gestao-de-infraestrutura-4ee4a.cloudfunctions.net/api';

// Função para fazer requisições à API
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, finalOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// ========== SISTEMA DE AUTENTICAÇÃO E ROLES ==========

// Variável para evitar loops de redirecionamento
let redirectInProgress = false;

// Função chamada quando o estado de autenticação muda
async function onAuthStateChanged(user) {
  currentUser = user;
  
  if (user) {
    console.log('✅ Usuário autenticado:', user.email);
    
    // Carregar dados do usuário do Firestore
    await loadUserData(user.uid);
    
    // Se estiver na página de login ou cadastro, redirecionar para dashboard APENAS UMA VEZ
    const currentPath = window.location.pathname;
    const shouldRedirectToDashboard = (currentPath.includes('index.html') || currentPath === '/' || currentPath.includes('cadastro.html'));
    
    if (shouldRedirectToDashboard && !redirectInProgress) {
      console.log('✅ Usuário autenticado - redirecionando para dashboard (uma vez)');
      redirectInProgress = true;
      
      // Delay maior para evitar conflitos
      setTimeout(() => {
        window.location.replace('dashboard.html'); // replace evita histórico
      }, 1500);
    }
    
    // Atualizar interface baseada no role do usuário (se não estiver redirecionando)
    if (!redirectInProgress) {
      updateUIBasedOnRole();
    }
    
  } else {
    console.log('❌ Usuário não autenticado');
    redirectInProgress = false; // Reset flag quando logout
    
    // Se não estiver na página de login ou cadastro, redirecionar APENAS UMA VEZ
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath === '/';
    const isCadastroPage = currentPath.includes('cadastro.html');
    
    if (!isLoginPage && !isCadastroPage && !redirectInProgress) {
      console.log('🔄 Redirecionando usuário não autenticado para login (uma vez)');
      redirectInProgress = true;
      
      setTimeout(() => {
        window.location.replace('index.html'); // replace evita histórico
      }, 500);
    } else if (isLoginPage || isCadastroPage) {
      console.log('✅ Usuário na página de login/cadastro - sem redirecionamento');
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
      
      // Atualizar UI com dados do usuário
      updateUserInfoInUI(userData);
      
      console.log('👤 Dados do usuário carregados:', userData.role);
    } else {
      // Criar usuário padrão se não existir
      await createDefaultUserData(uid);
    }
  } catch (error) {
    console.error('❌ Erro ao carregar dados do usuário:', error);
  }
}

// Criar dados padrão do usuário
async function createDefaultUserData(uid) {
  if (!db || !currentUser) return;
  
  const defaultUserData = {
    email: currentUser.email,
    displayName: currentUser.displayName || currentUser.email.split('@')[0],
    role: 'normal', // Usuário normal por padrão
    createdAt: new Date(),
    active: true,
    permissions: ['read']
  };
  
  try {
    await db.collection('users').doc(uid).set(defaultUserData);
    currentUser.customClaims = defaultUserData;
    
    updateUserInfoInUI(defaultUserData);
    console.log('👤 Usuário padrão criado com role: normal');
  } catch (error) {
    console.error('❌ Erro ao criar dados do usuário:', error);
  }
}

// Atualizar informações do usuário na interface
function updateUserInfoInUI(userData) {
  // Elementos do dropdown do usuário
  const userNameSimple = document.getElementById('userNameSimple');
  const userRoleSimple = document.getElementById('userRoleSimple');
  const dropdownUserName = document.getElementById('dropdownUserName');
  const dropdownUserEmail = document.getElementById('dropdownUserEmail');
  
  if (userNameSimple) userNameSimple.textContent = userData.displayName || userData.email.split('@')[0];
  if (userRoleSimple) userRoleSimple.textContent = userData.role.toUpperCase();
  if (dropdownUserName) dropdownUserName.textContent = userData.displayName || userData.email.split('@')[0];
  if (dropdownUserEmail) dropdownUserEmail.textContent = userData.email;
  
  // Atualizar avatares com iniciais
  const initials = (userData.displayName || userData.email).substring(0, 2).toUpperCase();
  const avatars = ['userAvatarSimple', 'userAvatarLarge'];
  avatars.forEach(avatarId => {
    const avatar = document.getElementById(avatarId);
    if (avatar) {
      avatar.src = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=${avatarId.includes('Large') ? '60' : '40'}`;
    }
  });
}

// Atualizar interface baseada no role do usuário
function updateUIBasedOnRole() {
  if (!currentUser || !currentUser.customClaims) return;
  
  const userRole = currentUser.customClaims.role;
  console.log('🔐 Aplicando permissões para role:', userRole);
  
  // Elementos do menu lateral
  const enderecosMenitem = document.querySelector('a[onclick*="enderecos"]').parentElement;
  const gestaoMenuItem = document.querySelector('a[onclick*="gestao-projetos"]').parentElement;
  
  // Controle de visibilidade baseado no role
  switch (userRole) {
    case 'normal':
      // Usuários normais: apenas Início e Dashboard
      if (enderecosMenitem) enderecosMenitem.style.display = 'none';
      if (gestaoMenuItem) gestaoMenuItem.style.display = 'none';
      break;
      
    case 'gestor':
      // Gestores: Início, Dashboard e Cadastro de Endereços
      if (enderecosMenitem) enderecosMenitem.style.display = 'block';
      if (gestaoMenuItem) gestaoMenuItem.style.display = 'none';
      break;
      
    case 'admin':
      // Admins: acesso completo
      if (enderecosMenitem) enderecosMenitem.style.display = 'block';
      if (gestaoMenuItem) gestaoMenuItem.style.display = 'block';
      break;
      
    default:
      // Por segurança, tratar como usuário normal
      if (enderecosMenitem) enderecosMenitem.style.display = 'none';
      if (gestaoMenuItem) gestaoMenuItem.style.display = 'none';
  }
}

// Verificar se usuário tem permissão para acessar uma funcionalidade
function hasPermission(requiredRole) {
  if (!currentUser || !currentUser.customClaims) return false;
  
  const userRole = currentUser.customClaims.role;
  const roleHierarchy = {
    'normal': 1,
    'gestor': 2, 
    'admin': 3
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========

// Login com email e senha
async function loginWithEmailPassword(email, password) {
  if (!auth) {
    console.error('❌ Firebase Auth não inicializado');
    return { success: false, error: 'Sistema de autenticação não disponível' };
  }
  
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    console.log('✅ Login realizado com sucesso');
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

// Cadastro com email e senha
async function registerWithEmailPassword(email, password, displayName) {
  if (!auth) {
    console.error('❌ Firebase Auth não inicializado');
    return { success: false, error: 'Sistema de autenticação não disponível' };
  }
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    
    // Atualizar perfil do usuário
    if (displayName) {
      await userCredential.user.updateProfile({ displayName });
    }
    
    console.log('✅ Cadastro realizado com sucesso');
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('❌ Erro no cadastro:', error);
    return { success: false, error: getAuthErrorMessage(error.code) };
  }
}

// Logout
async function logout() {
  if (!auth) return;
  
  try {
    await auth.signOut();
    console.log('✅ Logout realizado com sucesso');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    return { success: false, error: 'Erro ao fazer logout' };
  }
}

// Converter códigos de erro do Firebase para mensagens amigáveis
function getAuthErrorMessage(errorCode) {
  const errorMessages = {
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este email já está em uso.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'Email inválido.',
    'auth/too-many-requests': 'Muitas tentativas de login. Tente novamente mais tarde.',
  };
  
  return errorMessages[errorCode] || 'Erro de autenticação. Tente novamente.';
}