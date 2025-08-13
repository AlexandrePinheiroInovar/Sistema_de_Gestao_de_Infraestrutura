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
let analytics = null;

// Aguardar carregamento dos scripts do Firebase
document.addEventListener('DOMContentLoaded', function() {
  // Verificar se Firebase está disponível
  if (typeof firebase !== 'undefined') {
    try {
      // Inicializar Firebase se ainda não foi inicializado
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      // Inicializar Firestore
      if (firebase.firestore) {
        db = firebase.firestore();
        console.log('✅ Firestore inicializado');
      }
      
      // Inicializar Analytics (opcional)
      if (firebase.analytics) {
        analytics = firebase.analytics();
        console.log('✅ Analytics inicializado');
      }
      
    } catch (error) {
      console.warn('⚠️ Erro ao inicializar Firebase:', error);
      console.log('📝 Sistema funcionará em modo local');
    }
  } else {
    console.warn('⚠️ Firebase SDK não carregado - usando modo local');
  }
});

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