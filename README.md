# 🏗️ Sistema de Gestão de Infraestrutura MDU

## 📋 Visão Geral

Sistema completo de análises e gestão de infraestrutura de telecomunicações para projetos MDU (Multiple Dwelling Units), desenvolvido para otimizar processos operacionais e fornecer insights estratégicos através de dashboards interativos e ferramentas de gestão avançadas.

**🌐 Sistema Online:** [https://gestao-de-infraestrutura-4ee4a.web.app](https://gestao-de-infraestrutura-4ee4a.web.app)

---

## ⚡ Funcionalidades Principais

### 📊 Dashboard Analítico
- **Gráficos Interativos**: Análise de projetos, sub-projetos, cidades e status operacionais
- **Cards Estatísticos**: Métricas em tempo real de produtividade e performance
- **Sistema de Filtros**: Filtros multiselect avançados com persistência de estado
- **Tabelas de Ranking**: Classificações por status, equipes e produtividade

### 🏠 Gestão de Endereços
- **CRUD Completo**: Cadastro, edição, visualização e exclusão de endereços
- **Sistema de Paginação**: Performance otimizada para grandes volumes de dados (50 registros/página)
- **Upload Excel**: Importação em massa com validação automática
- **Filtros Avançados**: Busca por múltiplos critérios simultaneamente

### 👥 Gestão de Dados Mestres
- **Projetos e Sub-Projetos**: Gestão completa de hierarquia de projetos
- **Equipes e Supervisores**: Controle de recursos humanos
- **Cidades e Tipos de Ação**: Padronização de dados operacionais
- **Interface Intuitiva**: Formulários responsivos com validação

### 🔐 Sistema de Usuários
- **Autenticação Firebase**: Login seguro e gerenciamento de sessões
- **Perfil de Usuário**: Edição de dados pessoais e troca de senhas
- **Dropdown Moderno**: Interface elegante para ações do usuário

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5/CSS3**: Interface responsiva e moderna
- **JavaScript ES6+**: Programação assíncrona e modular
- **Chart.js**: Visualizações gráficas interativas
- **Bootstrap Icons**: Iconografia consistente

### Backend & Database
- **Firebase Authentication**: Sistema de autenticação
- **Cloud Firestore**: Banco de dados NoSQL em tempo real
- **Firebase Hosting**: Hospedagem e CDN global

### Ferramentas de Desenvolvimento
- **Node.js**: Ambiente de desenvolvimento
- **npm Scripts**: Automação de tarefas
- **ESLint & Prettier**: Qualidade e formatação de código
- **Live Server**: Servidor de desenvolvimento

---

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js >= 16.0.0
- npm >= 8.0.0
- Firebase CLI (opcional para deploy)

### 1. Clonar o Repositório
```bash
git clone https://github.com/AlexandrePinheiroInovar/Sistema_de_Gestao_de_Infraestrutura.git
cd Sistema_de_Gestao_de_Infraestrutura
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Firebase
- Configure as credenciais do Firebase em `src/js/firebase-complete.js`
- Atualize as regras do Firestore se necessário

### 4. Iniciar Desenvolvimento
```bash
# Servidor de desenvolvimento local
npm run dev-live

# Servidor na porta 8000
npx http-server -p 8000 -c-1
```

---

## 📁 Estrutura do Projeto

```
📦 Sistema_de_Gestao_de_Infraestrutura/
├── 📄 index.html                 # Página inicial
├── 📄 dashboard.html             # Dashboard principal
├── 📄 cadastro.html              # Gestão de dados mestres
├── 📂 src/
│   ├── 📂 css/
│   │   ├── styles.css            # Estilos principais
│   │   └── user-dropdown.css     # Estilos do dropdown de usuário
│   ├── 📂 js/
│   │   ├── firebase-complete.js          # Configuração Firebase
│   │   ├── dashboard-integration.js      # Integração do dashboard
│   │   ├── dashboard-charts-implementacao.js  # Gráficos
│   │   ├── firebase-table-system.js      # Sistema de tabelas
│   │   ├── novo-endereco-limpo.js        # Sistema novo endereço
│   │   ├── user-dropdown-system.js       # Dropdown do usuário
│   │   ├── unified-filter-system.js      # Sistema de filtros
│   │   └── gestao-nova-simples.js        # Gestão de dados
│   └── 📂 assets/
│       └── 📂 images/            # Imagens e logos
├── 📂 backup/                    # Backups do sistema
├── 📂 docs/                      # Documentação técnica
└── 📄 package.json               # Configurações npm
```

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev-live          # Servidor com live reload
npm run dev               # Servidor Node.js com nodemon
npm run firebase:serve    # Servidor Firebase local

# Produção
npm run build            # Build para produção
npm run firebase:deploy  # Deploy no Firebase
npm start               # Servidor de produção

# Qualidade de Código
npm run lint            # Verificar código
npm run format          # Formatar código
npm run analyze         # Análise de código

# Utilidades
npm run clean           # Limpar arquivos de build
npm run serve:dist      # Servir arquivos de build
```

---

## 📊 Funcionalidades Detalhadas

### Sistema de Filtros Unificado
- **Filtros Multiselect**: Seleção múltipla com interface intuitiva
- **Persistência**: Estado mantido no localStorage
- **Sincronização**: Atualização automática de gráficos e tabelas
- **Performance**: Otimizado para grandes volumes de dados

### Gráficos Interativos
- **Tipos Suportados**: Barras, linhas, pizza e radar
- **Responsividade**: Adaptação automática para dispositivos móveis
- **Filtros Dinâmicos**: Atualização em tempo real baseada nos filtros
- **Exportação**: Possibilidade de download das visualizações

### Sistema de Paginação
- **Performance**: Carregamento otimizado (50 registros por página)
- **Navegação**: Controles intuitivos de página
- **Configurável**: Número de registros por página ajustável
- **Responsivo**: Interface adaptável para mobile

---

## 🔐 Segurança e Permissões

### Autenticação
- Login obrigatório para acesso ao sistema
- Sessões gerenciadas pelo Firebase
- Logout automático por inatividade

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🚀 Deploy

### Firebase Hosting
```bash
# Build e deploy automático
npm run firebase:deploy

# Deploy manual
firebase deploy
```

### Outros Provedores
O sistema é compatível com qualquer provedor de hospedagem estática:
- Netlify
- Vercel
- GitHub Pages
- AWS S3

---

## 📈 Performance e Otimizações

### Melhorias Implementadas
- **Paginação**: Reduz tempo de carregamento em 80%
- **Cache de Dados**: Armazenamento local de dados estáticos
- **Lazy Loading**: Carregamento sob demanda de componentes
- **Compressão**: Assets minificados para produção

### Métricas
- **Tempo de Carregamento**: < 2s (primeira visita)
- **Tempo de Resposta**: < 500ms (ações do usuário)
- **Bundle Size**: ~150KB (gzipped)

---

## 🔄 Versionamento e Atualizações

### Histórico de Versões
- **v1.0.0** - Lançamento inicial
- **v1.1.0** - Sistema de paginação
- **v1.2.0** - Filtros unificados
- **v1.3.0** - Novo sistema de endereços
- **v1.4.0** - Otimizações e limpeza

### Próximas Funcionalidades
- [ ] Relatórios em PDF
- [ ] Notificações em tempo real
- [ ] API REST
- [ ] Mobile App

---

## 🤝 Contribuição

### Como Contribuir
1. Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de Código
- Use ESLint para JavaScript
- Siga as convenções de nomenclatura do projeto
- Adicione comentários em código complexo
- Mantenha commits pequenos e focados

---

## 📞 Suporte

### Contato
- **Email**: suporte@inovartelecom.com.br
- **Documentação**: Ver pasta `docs/`
- **Issues**: Use o sistema de Issues do GitHub

### Resolução de Problemas
1. Verifique a documentação na pasta `docs/`
2. Consulte os logs do console do navegador
3. Verifique a conectividade com Firebase
4. Abra uma issue detalhada no GitHub

---

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `LICENSE` para mais detalhes.

---

## 🏆 Créditos

Desenvolvido pela **Equipe de Desenvolvimento Inovar Telecom**

**Principais Tecnologias:**
- Firebase (Google)
- Chart.js
- Bootstrap Icons
- Node.js

---

## 📊 Status do Projeto

![Status](https://img.shields.io/badge/status-ativo-brightgreen)
![Versão](https://img.shields.io/badge/versão-1.4.0-blue)
![Licença](https://img.shields.io/badge/licença-ISC-yellow)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![Firebase](https://img.shields.io/badge/firebase-v12.1.0-orange)

**Última Atualização:** Setembro 2025