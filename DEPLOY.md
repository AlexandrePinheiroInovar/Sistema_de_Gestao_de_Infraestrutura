# 🚀 Deploy Manual - Sistema MDU

## ⚠️ **DEPLOY DESABILITADO AUTOMATICAMENTE**

O deploy automático foi **DESABILITADO** para dar controle total ao desenvolvedor.

## 🔧 **Como Fazer Deploy Manual**

### **Método 1: Via npm script**
```bash
npm run deploy:manual
```

### **Método 2: Via GitHub Actions**
1. Acesse: **Actions** → **Deploy to Firebase Hosting**
2. Clique em **Run workflow**
3. Selecione **"yes"** para confirmar deploy
4. Clique em **Run workflow**

### **Método 3: Firebase CLI direto**
```bash
npm run build
firebase deploy
```

## 📋 **Pré-requisitos para Deploy**

- ✅ Firebase CLI configurado
- ✅ Token FIREBASE_TOKEN no GitHub Secrets
- ✅ Projeto Firebase configurado
- ✅ Build funcionando (`npm run build`)

## 🌐 **URLs**

- **Desenvolvimento:** http://localhost:3000
- **Produção:** https://gestao-de-infraestrutura-4ee4a.web.app

## 🛡️ **Segurança**

- Deploy apenas quando explicitamente solicitado
- Confirmação obrigatória via interface
- Nenhum deploy automático em push/merge
- Controle total do desenvolvedor

---

**📝 Nota:** Para reabilitar deploy automático, edite `.github/workflows/firebase-deploy.yml`