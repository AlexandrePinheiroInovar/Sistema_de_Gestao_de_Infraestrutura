# 🛠️ Ambiente de Desenvolvimento - Sistema MDU

## 🚀 Setup Completo do Ambiente

### 📋 Pré-requisitos
- Node.js >= 16.0.0
- npm >= 8.0.0
- Git
- VS Code (recomendado)

### ⚡ Instalação Rápida

```bash
# 1. Clone o repositório
git clone <repo-url>
cd Sala_Tecnica

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cp .env.example .env
# Edite o .env conforme necessário

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: **http://localhost:3000**

## 🔧 Scripts Disponíveis

### 🏃‍♂️ Desenvolvimento
```bash
npm run dev              # Servidor com hot reload (nodemon)
npm run dev:debug        # Servidor com debug habilitado
npm run dev-live         # Live server alternativo
npm run watch            # Watch completo (CSS + JS + Server)
```

### 🏗️ Build e Deploy
```bash
npm run build           # Build completo para produção
npm run start           # Servidor de produção
npm run start:prod      # Produção com variáveis de ambiente
npm run firebase:serve  # Servidor local Firebase
npm run firebase:deploy # Deploy para Firebase
```

### 🧹 Linting e Formatação
```bash
npm run lint            # ESLint + HTML Validate
npm run lint:js         # Apenas JavaScript
npm run lint:html       # Apenas HTML
npm run format          # Prettier em todos os arquivos
```

### 📊 Utilitários
```bash
npm run clean           # Limpar diretório dist/
npm run analyze         # Análise de código
npm run analyze:js      # Contagem de linhas JS
npm run analyze:css     # Contagem de linhas CSS
```

## 🌍 URLs de Desenvolvimento

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **App Principal** | http://localhost:3000 | Interface principal |
| **Firebase Local** | http://localhost:5000 | Emulador Firebase |
| **Status API** | http://localhost:3000/api/dev/status | Status do servidor |
| **Files API** | http://localhost:3000/api/dev/files | Lista de arquivos |
| **Firebase Config** | http://localhost:3000/api/dev/firebase-config | Config Firebase |

## 📁 Estrutura de Desenvolvimento

```
Sala_Tecnica/
├── 🏠 PÁGINAS PRINCIPAIS
│   ├── index.html              # Login
│   ├── dashboard.html          # Dashboard principal  
│   └── cadastro.html          # Registro
├── 📂 src/
│   ├── js/                    # Scripts JavaScript
│   │   ├── firebase-complete.js      # ⭐ Auth Firebase
│   │   ├── firebase-table-system.js  # ⭐ Dados Firestore
│   │   ├── dashboard-charts-v5.js    # ⭐ Sistema gráficos
│   │   ├── dashboard-integration.js  # ⭐ Integração
│   │   └── ...                      # Outros módulos
│   ├── css/                   # Estilos
│   │   ├── styles.css               # ⭐ Estilos principais
│   │   ├── gestao-renovada.css      # Gestão de projetos
│   │   └── checkbox-dropdown.css    # Componentes
│   └── assets/                # Imagens e recursos
├── 🔧 DESENVOLVIMENTO
│   ├── server.js              # Servidor Express
│   ├── .eslintrc.js          # Configuração ESLint
│   ├── .prettierrc           # Configuração Prettier
│   ├── nodemon.json          # Configuração Nodemon
│   ├── .env.example          # Template ambiente
│   └── .vscode/              # Configuração VS Code
├── 🚀 DEPLOY
│   ├── firebase.json         # Configuração Firebase
│   ├── firestore.rules       # Regras Firestore
│   └── scripts/              # Scripts deploy
└── 📚 DOCUMENTAÇÃO
    ├── docs/                 # Documentação completa
    └── DEV-README.md         # Este arquivo
```

## 🔥 Firebase Setup

### 1. Configuração Local
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inicializar projeto
firebase init
```

### 2. Emuladores (Opcional)
```bash
# Iniciar emuladores
firebase emulators:start

# URLs dos emuladores
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
# Hosting: http://localhost:5000
```

### 3. Deploy
```bash
# Deploy manual
npm run firebase:deploy

# Deploy automático (via script)
./scripts/deploy.sh
```

## 🛠️ Ferramentas de Desenvolvimento

### VS Code Extensions (Auto-instaladas)
- **ESLint**: Linting JavaScript
- **Prettier**: Formatação de código
- **Live Server**: Servidor de desenvolvimento
- **Auto Rename Tag**: Renomear tags HTML
- **Path Intellisense**: Autocomplete caminhos

### Configurações Automáticas
- **Format on Save**: ✅ Habilitado
- **ESLint Fix on Save**: ✅ Habilitado
- **Tab Size**: 4 para JS, 2 para HTML/CSS
- **End of Line**: LF (Unix)

## 🐛 Debug e Logs

### Console do Navegador
O sistema possui logging detalhado. Abra o DevTools (F12) para ver:
```javascript
// Logs categorizados por módulo
🔥 [FIREBASE-ISOLATED] - Autenticação
📊 [DASHBOARD-CHARTS-V5] - Gráficos
🏠 [FIREBASE-TABLE] - Dados da tabela
📋 [SHOW-SECTION] - Navegação
```

### Server Logs
```bash
# Logs detalhados no terminal
[2025-08-27T10:30:15.123Z] GET /
[2025-08-27T10:30:15.124Z] GET /src/js/firebase-complete.js
```

### Debug API
```bash
# Status do servidor
curl http://localhost:3000/api/dev/status

# Lista de arquivos
curl http://localhost:3000/api/dev/files

# Config Firebase (sem chaves sensíveis)
curl http://localhost:3000/api/dev/firebase-config
```

## 🔧 Configuração Personalizada

### Variáveis de Ambiente (.env)
```env
NODE_ENV=development
PORT=3000
DEBUG_MODE=true
ENABLE_LOGGING=true
CACHE_DISABLED=true
```

### ESLint Rules
```javascript
// .eslintrc.js - Principais regras
rules: {
    'no-console': 'off',        # Permitir console.log
    'no-unused-vars': 'error',  # Erro para variáveis não usadas
    'prefer-const': 'error',    # Preferir const
    'no-var': 'error'          # Não usar var
}
```

### Prettier Config
```json
{
    "tabWidth": 4,           // JS: 4 espaços
    "singleQuote": true,     // Aspas simples
    "trailingComma": "none", // Sem vírgula final
    "printWidth": 100        // Quebra em 100 chars
}
```

## 🧪 Testing (Futuro)

```bash
# Estrutura preparada para testes
npm test                    # Placeholder para testes
npm run test:unit          # Testes unitários
npm run test:integration   # Testes de integração
npm run test:e2e           # Testes end-to-end
```

## 🚀 Workflow de Desenvolvimento

### 1. Desenvolvimento Diário
```bash
# Iniciar ambiente
npm run dev

# Em paralelo (novo terminal)
npm run watch:css    # Se modificando CSS

# Verificar qualidade
npm run lint
npm run format
```

### 2. Antes de Commit
```bash
# Verificar tudo
npm run precommit

# Se tudo ok
git add .
git commit -m "feat: nova funcionalidade"
```

### 3. Deploy
```bash
# Build e deploy
npm run build
npm run firebase:deploy
```

## 🆘 Troubleshooting

### Problemas Comuns

1. **Porta ocupada**
   ```bash
   # Matar processo na porta
   npx kill-port 3000
   ```

2. **Node modules corrompidos**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Cache do browser**
   ```bash
   # Ctrl+Shift+R (hard refresh)
   # Ou desativar cache no DevTools
   ```

4. **Firebase não conecta**
   ```bash
   # Verificar config
   curl http://localhost:3000/api/dev/firebase-config
   
   # Ver logs no console do browser
   ```

### Logs de Erro
```bash
# Server logs
tail -f logs/app.log

# Browser logs
# DevTools -> Console -> Filter by "Error"
```

## 📞 Suporte

- **Issues**: Abra issue no GitHub
- **Logs**: Sempre inclua logs do console
- **Ambiente**: Especifique Node.js version, OS, etc.

---

## 🎯 Quick Start Checklist

- [ ] Node.js >= 16 instalado
- [ ] npm install executado
- [ ] .env configurado
- [ ] VS Code com extensions
- [ ] npm run dev funcionando
- [ ] http://localhost:3000 acessível
- [ ] Console sem erros
- [ ] Firebase conectado

**🎉 Ambiente pronto para desenvolvimento!**