// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDHKb34lNwFIEBmkO9WVVKVwMCL__O_u8A",
  authDomain: "gestao-de-infraestrutura-4ee4a.firebaseapp.com",
  projectId: "gestao-de-infraestrutura-4ee4a",
  storageBucket: "gestao-de-infraestrutura-4ee4a.firebasestorage.app",
  messagingSenderId: "1012042763792",
  appId: "1:1012042763792:web:b2c183bcc490b1bbb24495",
  measurementId: "G-TQCLQ72KYD"
};

// Verificar se Firebase SDK está carregado e inicializar
let db = null;
let auth = null;
let analytics = null;
let currentUser = null;

// Log inicial para verificar se o arquivo está sendo carregado
console.log('🔥 [CONFIG] Firebase-config.js INICIANDO carregamento...');
console.log('🔥 [CONFIG] Firebase disponível no carregamento?', typeof firebase);

// Tentar múltiplas estratégias de inicialização
function initializeFirebaseSystem() {
  console.log('🔄 Iniciando configuração do Firebase...');
  console.log('🔍 Verificando disponibilidade do Firebase:', typeof firebase);
  
  // Verificar se Firebase está disponível
  if (typeof firebase !== 'undefined') {
    console.log('✅ Firebase SDK detectado');
    console.log('🔍 Firebase.app:', typeof firebase.app);
    console.log('🔍 Firebase.auth:', typeof firebase.auth);
    console.log('🔍 Firebase.firestore:', typeof firebase.firestore);
    try {
      // Inicializar Firebase se ainda não foi inicializado
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase app inicializado');
      } else {
        console.log('ℹ️ Firebase app já estava inicializado');
      }
      
      // Inicializar Authentication
      if (firebase.auth) {
        auth = firebase.auth();
        console.log('✅ Authentication inicializado');
        
        // Configurar listener de mudança de estado de autenticação
        auth.onAuthStateChanged(onAuthStateChanged);
        console.log('✅ Auth state listener configurado');
      } else {
        console.error('❌ Firebase Auth não disponível');
      }
      
      // Inicializar Firestore
      if (firebase.firestore) {
        db = firebase.firestore();
        console.log('✅ Firestore inicializado');
      } else {
        console.error('❌ Firebase Firestore não disponível');
      }
      
      // Inicializar Analytics (opcional)
      if (firebase.analytics) {
        analytics = firebase.analytics();
        console.log('✅ Analytics inicializado');
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
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      console.log('📝 Sistema funcionará em modo local');
    }
  } else {
    console.error('❌ Firebase SDK não carregado - usando modo local');
    console.log('🔍 Disponível no window:', Object.keys(window).filter(k => k.toLowerCase().includes('firebase')));
  }
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

// Função chamada quando o estado de autenticação muda
async function onAuthStateChanged(user) {
  currentUser = user;
  
  if (user) {
    console.log('✅ Usuário autenticado:', user.email);
    
    // Carregar dados do usuário do Firestore
    await loadUserData(user.uid);
    
    // Se estiver na página de login ou cadastro, redirecionar para dashboard
    const currentPath = window.location.pathname;
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.includes('cadastro.html')) {
      console.log('✅ Usuário autenticado - redirecionando para dashboard');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000); // Delay para mostrar mensagens de sucesso
    }
    
    // Atualizar interface baseada no role do usuário
    updateUIBasedOnRole();
    
  } else {
    console.log('❌ Usuário não autenticado');
    
    // Se não estiver na página de login ou cadastro, redirecionar
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath === '/';
    const isCadastroPage = currentPath.includes('cadastro.html');
    
    if (!isLoginPage && !isCadastroPage) {
      console.log('🔄 Redirecionando usuário não autenticado para login');
      window.location.href = 'index.html';
    } else {
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