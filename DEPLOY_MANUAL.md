# 🚀 Deploy Manual Firebase - Passo a Passo

## ⚠️ IMPORTANTE
O site não está funcionando porque ainda não foi feito o deploy. Siga exatamente estes passos:

## 🔧 Pré-requisitos
1. Abrir terminal/prompt de comando
2. Navegar até a pasta do projeto: `cd /caminho/para/Sala_Tecnica`

## 📋 Passos para Deploy

### 1. Instalar Firebase CLI (se não tiver)
```bash
npm install -g firebase-tools
```

### 2. Fazer Login no Firebase
```bash
firebase login
```
- Vai abrir o navegador
- Faça login com a conta Google que tem acesso ao projeto
- Autorize o Firebase CLI

### 3. Verificar se está no projeto correto
```bash
firebase projects:list
```
- Deve mostrar "gestao-de-infraestrutura-4ee4a" na lista

### 4. Selecionar o projeto
```bash
firebase use gestao-de-infraestrutura-4ee4a
```

### 5. Fazer o deploy
```bash
firebase deploy --only hosting
```

### 6. Aguardar conclusão
- O comando vai mostrar progresso
- No final vai mostrar: "Deploy complete!"
- Vai exibir a URL: https://gestao-de-infraestrutura-4ee4a.firebaseapp.com

## 🔍 Verificações

### Se der erro de "project not found":
```bash
# Listar projetos disponíveis
firebase projects:list

# Se o projeto não aparecer, criar novo projeto ou verificar permissões
```

### Se der erro de "hosting not enabled":
1. Acesse: https://console.firebase.google.com/project/gestao-de-infraestrutura-4ee4a
2. Vá em "Hosting" no menu lateral
3. Clique em "Get started" para habilitar

### Se der erro de permissão:
- Verifique se sua conta Google tem permissão no projeto
- Peça para o owner do projeto adicionar sua conta como editor

## 🎯 Resultado Esperado

Após o deploy bem-sucedido:
- ✅ Site funcionando em: https://gestao-de-infraestrutura-4ee4a.firebaseapp.com
- ✅ Todos os arquivos HTML, CSS, JS carregando
- ✅ Sistema de login funcionando
- ✅ Dashboard acessível

## 🆘 Se ainda não funcionar

1. **Verificar arquivos ignorados**:
   - O firebase.json está configurado para ignorar alguns arquivos
   - Verifique se index.html está na pasta raiz

2. **Verificar logs**:
   ```bash
   firebase hosting:logs
   ```

3. **Deploy forçado**:
   ```bash
   firebase deploy --only hosting --force
   ```

4. **Verificar cache**:
   - Limpe o cache do navegador
   - Teste em aba anônima

## 📞 Se precisar de ajuda
- Execute os comandos um por um
- Copie qualquer mensagem de erro
- Verifique se está na pasta correta do projeto