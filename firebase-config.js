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