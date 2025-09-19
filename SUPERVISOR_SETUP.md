# 👥 Sistema de Permissões para Supervisores

## 🎯 Objetivo
Este documento explica como foram configurados os 2 UIDs específicos como supervisores no sistema.

## 📋 UIDs Autorizados

Os seguintes UIDs foram liberados com permissões de **SUPERVISOR**:

1. `uncffP1B7HcgPYtC9Z7goxvfkbm1`
2. `MihB6XV6vzOTh9PJOotFgzJynjc2`

## 🔧 Arquivos Modificados

### 1. Novo Arquivo: `src/js/supervisor-permissions.js`
- **Função**: Sistema de permissões para supervisores autorizados
- **Recursos**:
  - Verificação automática de UIDs autorizados
  - Aplicação de permissões na interface
  - Integração com Firebase Auth
  - Salvamento de dados no Firestore

### 2. Modificado: `dashboard.html`
- **Linha adicionada**: `<script src="src/js/supervisor-permissions.js?v=1.0"></script>`
- **Localização**: Após o script `user-dropdown-system.js`

### 3. Novo Arquivo: `test-supervisor-permissions.html`
- **Função**: Página de teste para verificar se o sistema está funcionando
- **Recursos**: Testes automáticos e manuais de permissões

## 🚀 Como Testar

### Teste Rápido via Console
1. Abra o dashboard do sistema
2. Pressione F12 para abrir o console
3. Execute um dos comandos:

```javascript
// Testar UID 1
SupervisorPermissions.isAuthorizedSupervisor('uncffP1B7HcgPYtC9Z7goxvfkbm1');

// Testar UID 2
SupervisorPermissions.isAuthorizedSupervisor('MihB6XV6vzOTh9PJOotFgzJynjc2');

// Ver todos os supervisores
SupervisorPermissions.AUTHORIZED_SUPERVISORS;
```

### Teste Completo
1. Abra a página: `test-supervisor-permissions.html`
2. Clique em "Executar Testes"
3. Verifique se todos os testes passaram

## 🔐 Funcionamento do Sistema

### Quando um usuário autorizado faz login:

1. **Verificação Automática**: O sistema verifica se o UID está na lista de supervisores
2. **Aplicação de Permissões**: Se autorizado, aplica permissões de supervisor
3. **Interface Atualizada**: Mostra elementos exclusivos para supervisores
4. **Notificação**: Exibe mensagem de boas-vindas
5. **Salvamento**: Registra dados no Firestore

### Permissões de Supervisor:

- ✅ **Visualizar**: Todas as seções do sistema
- ✅ **Criar**: Novos registros e projetos
- ✅ **Editar**: Registros existentes
- ❌ **Deletar**: Sem permissão para deletar (segurança)
- ✅ **Upload**: Upload de arquivos Excel
- ✅ **Exportar**: Exportar dados e relatórios
- ✅ **Gestão**: Gerenciar endereços e projetos

## 📁 Estrutura de Dados no Firestore

Os supervisores são salvos na coleção `users` com a seguinte estrutura:

```json
{
  "uid": "uncffP1B7HcgPYtC9Z7goxvfkbm1",
  "email": "supervisor@exemplo.com",
  "role": "SUPERVISOR",
  "permissions": {
    "canView": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": false,
    "canUpload": true,
    "canExport": true,
    "canManageEnderecos": true,
    "canManageProjects": true
  },
  "lastLogin": "2025-09-17T10:30:00.000Z",
  "updatedAt": "2025-09-17T10:30:00.000Z"
}
```

## 🔄 Como Adicionar Novos Supervisores

Para adicionar novos supervisores:

1. Abra o arquivo `src/js/supervisor-permissions.js`
2. Adicione o novo UID na constante `AUTHORIZED_SUPERVISORS`:

```javascript
const AUTHORIZED_SUPERVISORS = {
    // UIDs existentes...
    'uncffP1B7HcgPYtC9Z7goxvfkbm1': { /* configurações */ },
    'MihB6XV6vzOTh9PJOotFgzJynjc2': { /* configurações */ },

    // Novo supervisor
    'NOVO_UID_AQUI': {
        role: 'SUPERVISOR',
        permissions: {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canUpload: true,
            canExport: true,
            canManageEnderecos: true,
            canManageProjects: true
        },
        grantedDate: new Date().toISOString(),
        grantedBy: 'SYSTEM_ADMIN'
    }
};
```

## 🐛 Solução de Problemas

### Problema: Sistema não reconhece supervisor
**Soluções**:
1. Verificar se o UID está correto (case-sensitive)
2. Limpar cache do navegador (Ctrl+F5)
3. Verificar console do navegador para erros
4. Testar na página `test-supervisor-permissions.html`

### Problema: Permissões não aplicadas
**Soluções**:
1. Verificar se o script está carregando no dashboard
2. Verificar ordem de carregamento dos scripts
3. Verificar se o Firebase Auth está funcionando

### Problema: Interface não atualizada
**Soluções**:
1. Verificar se existem elementos com classes `.supervisor-only`
2. Verificar CSS para modo supervisor
3. Recarregar a página após login

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs no console do navegador
2. Testar na página de teste criada
3. Verificar status no Firestore

## 🔒 Segurança

- UIDs são verificados server-side via Firebase
- Permissões são aplicadas apenas após autenticação
- Sistema não permite escalação de privilégios
- Logs de acesso são mantidos no Firestore

---

## ✅ Status da Implementação

- [x] Sistema de permissões criado
- [x] UIDs específicos autorizados
- [x] Integração com Firebase Auth
- [x] Interface atualizada para supervisores
- [x] Página de teste criada
- [x] Documentação completa

**Sistema está pronto para uso!** 🚀