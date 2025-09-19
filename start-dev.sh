#!/bin/bash

# ============= SCRIPT DE INICIALIZAÇÃO DO AMBIENTE DE DESENVOLVIMENTO =============
# Uso: ./start-dev.sh

echo "🚀 ================================"
echo "🔥 INICIANDO AMBIENTE DE DESENVOLVIMENTO"
echo "🚀 ================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js >= 16.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js versão muito antiga. Versão atual: $(node -v)"
    echo "   Instale Node.js >= 16.0.0"
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# Verificar se existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado. Execute este script na raiz do projeto."
    exit 1
fi

# Verificar e criar .env se não existir
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado"
    if [ -f ".env.example" ]; then
        echo "📋 Copiando .env.example para .env..."
        cp .env.example .env
        echo "✅ Arquivo .env criado"
        echo "📝 Configure as variáveis em .env conforme necessário"
    else
        echo "❌ .env.example também não encontrado"
        echo "📝 Crie um arquivo .env manualmente"
    fi
    echo ""
fi

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo "✅ Dependências instaladas"
    echo ""
fi

# Criar diretórios necessários
echo "📁 Criando diretórios necessários..."
mkdir -p logs
mkdir -p dist
mkdir -p tmp
echo "✅ Diretórios criados"
echo ""

# Verificar se as portas estão livres
echo "🔍 Verificando portas..."

check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Porta $port ($service) está ocupada"
        echo "   Para liberar: npx kill-port $port"
        return 1
    else
        echo "✅ Porta $port ($service) livre"
        return 0
    fi
}

check_port 3000 "Servidor de desenvolvimento"
check_port 5000 "Firebase local"
echo ""

# Verificar arquivos principais
echo "📋 Verificando arquivos principais..."
files=(
    "index.html"
    "dashboard.html" 
    "server.js"
    "src/js/firebase-complete.js"
    "src/css/styles.css"
    "firebase.json"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (não encontrado)"
    fi
done
echo ""

# Opções de inicialização
echo "🎯 OPÇÕES DE INICIALIZAÇÃO:"
echo "1. Servidor de desenvolvimento (npm run dev)"
echo "2. Servidor com debug (npm run dev:debug)"
echo "3. Live server (npm run dev-live)"
echo "4. Watch completo (npm run watch)"
echo "5. Firebase local (npm run firebase:serve)"
echo ""

read -p "Escolha uma opção (1-5) ou Enter para servidor padrão: " choice

case $choice in
    1|"")
        echo "🚀 Iniciando servidor de desenvolvimento..."
        npm run dev
        ;;
    2)
        echo "🐛 Iniciando servidor com debug..."
        npm run dev:debug
        ;;
    3)
        echo "⚡ Iniciando live server..."
        npm run dev-live
        ;;
    4)
        echo "👀 Iniciando watch completo..."
        npm run watch
        ;;
    5)
        echo "🔥 Iniciando Firebase local..."
        npm run firebase:serve
        ;;
    *)
        echo "❌ Opção inválida. Iniciando servidor padrão..."
        npm run dev
        ;;
esac