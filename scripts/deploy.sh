#!/bin/bash

# Script de Deploy Firebase
echo "🚀 Iniciando deploy do Sistema MDU..."

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Fazer login (se necessário)
echo "🔐 Verificando autenticação..."
if ! firebase projects:list &> /dev/null; then
    echo "🔐 Faça login no Firebase:"
    firebase login
fi

# Selecionar projeto
echo "🎯 Selecionando projeto..."
firebase use gestao-de-infraestrutura-4ee4a

# Fazer deploy do hosting
echo "📤 Fazendo deploy do hosting..."
firebase deploy --only hosting

# Perguntar se quer fazer deploy das functions
read -p "🤔 Deseja fazer deploy das Functions também? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Instalando dependências das Functions..."
    cd functions
    npm install
    cd ..
    
    echo "📤 Fazendo deploy das Functions..."
    firebase deploy --only functions
fi

echo "✅ Deploy concluído!"
echo "🌐 Acesse: https://gestao-de-infraestrutura-4ee4a.firebaseapp.com"