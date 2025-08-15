# 🚀 Instruções de Deploy Firebase

## Pré-requisitos
- Node.js instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)

## Passos para Deploy

### 1. Login no Firebase
```bash
firebase login
```

### 2. Selecionar o projeto
```bash
firebase use gestao-de-infraestrutura-4ee4a
```

### 3. Deploy do Hosting
```bash
firebase deploy --only hosting
```

### 4. Deploy das Functions (opcional, se quiser usar backend serverless)
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Configurações Realizadas

### Arquivos Criados/Modificados:
- ✅ `.firebaserc` - Configuração do projeto
- ✅ `firebase.json` - Configuração de hosting e functions
- ✅ `firebase-config.js` - Configuração do Firebase no frontend
- ✅ `functions/index.js` - Backend serverless (opcional)
- ✅ `functions/package.json` - Dependências do backend

### URLs Após Deploy:
- **Hosting URL**: https://gestao-de-infraestrutura-4ee4a.firebaseapp.com
- **Functions URL**: https://us-central1-gestao-de-infraestrutura-4ee4a.cloudfunctions.net/api

## Como Testar Localmente

### Hosting Local:
```bash
firebase serve --only hosting
```

### Functions Local (se usar backend serverless):
```bash
firebase emulators:start --only functions
```

## Configuração de Produção

O arquivo `firebase-config.js` detecta automaticamente se está rodando localmente ou em produção:
- **Local**: `http://localhost:5001/gestao-de-infraestrutura-4ee4a/us-central1/api`
- **Produção**: `https://us-central1-gestao-de-infraestrutura-4ee4a.cloudfunctions.net/api`

## Importante
1. O sistema funcionará perfeitamente apenas com Firebase Hosting (sem Functions)
2. As Functions são opcionais e só devem ser usadas se precisar de backend serverless
3. Para usar apenas hosting estático, mantenha o `server.js` local para desenvolvimento