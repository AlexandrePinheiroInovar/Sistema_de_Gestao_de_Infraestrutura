# 🔐 Documentação das Regras Firestore

## 📋 Resumo das Permissões por Role

### 👤 **USER (Usuário Comum)**
- **Endereços**: ✅ Apenas leitura
- **Gestão de Projetos**: ❌ Sem acesso
- **Sistema**: ✅ Apenas leitura
- **Relatórios**: ✅ Apenas os próprios relatórios
- **Logs**: ❌ Sem acesso
- **Usuários**: ✅ Apenas seus próprios dados

### 👥 **SUPERVISOR**
- **Endereços**: ✅ Leitura + Criação + Edição
- **Gestão de Projetos**: ❌ Sem acesso
- **Sistema**: ✅ Apenas leitura
- **Relatórios**: ✅ Leitura + Criação + Edição próprios
- **Logs**: ✅ Apenas leitura
- **Usuários**: ✅ Apenas seus próprios dados

### 🏢 **GESTOR**
- **Endereços**: ✅ Acesso total (CRUD)
- **Gestão de Projetos**: ✅ Leitura + Criação + Edição
- **Sistema**: ✅ Leitura + Edição
- **Relatórios**: ✅ Acesso total a todos
- **Logs**: ✅ Leitura + Criação
- **Usuários**: ✅ Apenas seus próprios dados

### 🛡️ **ADMIN**
- **Tudo**: ✅ Acesso total (CRUD)
- **Usuários**: ✅ Pode ver e editar todos os usuários
- **Logs**: ✅ Acesso total
- **Sistema**: ✅ Acesso total

## 🗂️ Estrutura das Coleções

```
/users/{userId}          - Dados dos usuários
/enderecos/{enderecoId}  - Cadastro de endereços
/gestao/{gestaoId}       - Gestão geral
  /projetos/{projetoId}     - Sub-coleção de projetos
  /subprojetos/{subId}      - Sub-coleção de sub-projetos
  /tipos-acao/{tipoId}      - Sub-coleção de tipos de ação
  /supervisores/{supId}     - Sub-coleção de supervisores
  /equipes/{equipeId}       - Sub-coleção de equipes
  /cidades/{cidadeId}       - Sub-coleção de cidades
/sistema/{docId}         - Configurações do sistema
/relatorios/{relatorioId} - Relatórios do sistema
/logs/{logId}            - Logs de auditoria
```

## 🚀 Como Aplicar as Regras

### 1. **Via Firebase Console:**
1. Acesse: https://console.firebase.google.com/project/gestao-de-infraestrutura-4ee4a/firestore/rules
2. Cole o conteúdo do arquivo `firestore.rules`
3. Clique em "Publicar"

### 2. **Via Firebase CLI:**
```bash
# Configurar firebase.json (se necessário)
firebase deploy --only firestore:rules
```

### 3. **Configuração firebase.json:**
```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

## 🔍 Funções de Validação

- **getUserRole()**: Obtém o role do usuário logado
- **isAuthenticated()**: Verifica se usuário está autenticado
- **isUser()**: Verifica se é role USER
- **isSupervisor()**: Verifica se é role SUPERVISOR
- **isGestor()**: Verifica se é role GESTOR
- **isAdmin()**: Verifica se é role ADMIN
- **isOwner(userId)**: Verifica se é o próprio usuário

## 🛡️ Recursos de Segurança

1. **Usuários não podem alterar próprio role**
2. **Novos registros sempre começam como 'USER'**
3. **Admins têm acesso total para gestão**
4. **Regra padrão nega tudo que não foi especificado**
5. **Validação de propriedade para dados pessoais**

## 📝 Exemplos de Uso

### Criar usuário (automático no registro):
```javascript
// Permitido - cria como USER
{
  uid: "user123",
  email: "user@exemplo.com",
  role: "USER",  // Obrigatório ser USER
  displayName: "João Silva"
}
```

### Atualizar dados pessoais:
```javascript
// Permitido - próprio usuário, sem alterar role
{
  displayName: "João Santos",
  phone: "11999999999"
  // role não pode ser alterado pelo usuário
}
```

### Admin alterar role:
```javascript
// Permitido apenas por ADMIN
{
  role: "SUPERVISOR"  // Só admin pode fazer isso
}
```

## ⚠️ Notas Importantes

1. **Primeiro Admin**: Use `createFirstAdmin()` no console para criar o primeiro admin
2. **Teste**: Use `setUserRoleForTesting()` apenas para testes locais
3. **Logs**: Sistema grava automaticamente quem alterou roles
4. **Segurança**: Regras são aplicadas no servidor, não podem ser burladas

## 🔧 Comando para Deploy

```bash
cd /mnt/c/Users/yan.matos/Downloads/Sala_Tecnica
firebase deploy --only firestore:rules
```