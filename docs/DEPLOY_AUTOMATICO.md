# 🚀 Deploy Automático - Instruções Completas

## 📋 **Passo a Passo para Configurar Deploy Automático**

### **1. Gerar Novo Token Firebase**

Execute no seu **terminal local**:
```bash
firebase login:ci
```

- Vai abrir o navegador
- Faça login no Google/Firebase  
- Copie o token gerado
- **Guarde este token!**

### **2. Criar Service Account (Recomendado)**

Alternativa mais segura que o token:

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Projeto → **Settings** → **Service Accounts**
3. Click **Generate new private key**
4. Baixe o arquivo JSON
5. **Guarde este arquivo JSON!**

### **3. Configurar GitHub Repository**

#### **3.1 Criar Repository**
```bash
# No diretório do projeto
git init
git add .
git commit -m "Initial commit - Sistema MDU com Firebase Auth"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sistema-mdu.git
git push -u origin main
```

#### **3.2 Configurar Secrets**
No GitHub → **Settings** → **Secrets and variables** → **Actions**

**Adicionar estes secrets:**

1. **FIREBASE_SERVICE_ACCOUNT_GESTAO_DE_INFRAESTRUTURA_4EE4A**
   - Valor: Todo o conteúdo do arquivo JSON do Service Account
   
2. **FIREBASE_TOKEN** (alternativa)
   - Valor: Token gerado com `firebase login:ci`

### **4. Como Funciona o Deploy Automático**

#### **Triggers:**
- ✅ Push para branch `main` → Deploy para produção
- ✅ Pull Request → Deploy para preview
- ✅ Manual via GitHub Actions

#### **Processo:**
1. GitHub Actions detecta push
2. Instala dependências (se houver)
3. Faz build do projeto (se necessário)
4. Deploy para Firebase Hosting
5. URL de produção atualizada automaticamente

### **5. URLs após Deploy**

- **Produção**: `https://gestao-de-infraestrutura-4ee4a.web.app`
- **Backup**: `https://gestao-de-infraestrutura-4ee4a.firebaseapp.com`

## 🔧 **Comandos Úteis**

### **Deploy Manual (fallback)**
```bash
# Se precisar fazer deploy manual
firebase login
firebase use gestao-de-infraestrutura-4ee4a  
firebase deploy --only hosting
```

### **Verificar Status**
```bash
# Ver histórico de deploys
firebase hosting:channel:list

# Ver informações do projeto
firebase projects:list
```

### **Debug Deploy**
```bash
# Ver logs detalhados
firebase deploy --only hosting --debug
```

## 🛡️ **Segurança**

### **Service Account vs Token**
- **Service Account** (JSON): ✅ Recomendado, mais seguro
- **Firebase Token**: ⚠️ Funciona, mas será depreciado

### **Permissões Mínimas**
O Service Account precisa apenas:
- Firebase Hosting Admin
- Firebase Authentication Admin  
- Cloud Firestore User

## 🎯 **Próximos Passos**

1. **Execute `firebase login:ci`** → Copie o token
2. **Crie repository no GitHub** 
3. **Configure os secrets**
4. **Faça push** → Deploy automático!

## 🆘 **Troubleshooting**

### **Erro "Project not found"**
- Verifique o ID do projeto no `.firebaserc`
- Confirme permissões do Service Account

### **Erro de autenticação**
- Regenere o token: `firebase login:ci`
- Verifique se o secret está correto

### **Deploy falha**
- Verifique logs no GitHub Actions
- Confirme que todos os arquivos necessários estão commitados

## 📞 **Suporte**
- GitHub Issues: Para problemas de código
- Firebase Support: Para problemas de infraestrutura