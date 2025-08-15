#!/bin/bash

# Script de deploy limpo - evita problemas com permissões executáveis

echo "🚀 Iniciando deploy limpo..."

# Ir para a pasta do projeto
cd "$(dirname "$0")/.."

# Verificar se estamos na pasta correta
if [ ! -f "firebase.json" ]; then
    echo "❌ Erro: firebase.json não encontrado. Execute este script da pasta raiz do projeto."
    exit 1
fi

# Fazer deploy apenas da pasta deploy
echo "📁 Fazendo deploy apenas dos arquivos necessários..."
cd deploy

# Usar firebase-deploy.json como configuração
if [ -f "firebase-deploy.json" ]; then
    echo "🔧 Usando configuração de deploy limpa..."
    cp firebase-deploy.json firebase.json
fi

# Fazer o deploy
echo "🚀 Iniciando deploy do Firebase..."
firebase deploy --only hosting

# Limpar arquivo temporário
if [ -f "firebase.json" ]; then
    rm firebase.json
fi

echo "✅ Deploy concluído!"