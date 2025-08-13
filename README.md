# 🏗️ Sistema MDU - Análise de Infraestrutura

Sistema completo para análise de dados de infraestrutura MDU (Multi Dwelling Unit) com dashboards interativos e relatórios em tempo real.

## ✨ Funcionalidades

- 📊 **Dashboard Interativo**: Gráficos e KPIs em tempo real
- 🔍 **Filtros Avançados**: Por projeto, supervisor, período e status
- 📈 **Análises Visuais**: Chart.js com visualizações profissionais
- 📁 **Exportação**: CSV e relatórios PDF
- 🔄 **Auto-refresh**: Dados atualizados automaticamente
- 💻 **Console Debug**: Área de desenvolvimento integrada
- 📱 **Responsivo**: Funciona em todos os dispositivos

## 🚀 Início Rápido

### Pré-requisitos
- Node.js >= 16.0.0
- npm >= 8.0.0

### Instalação
```bash
# Clone o repositório
git clone <url-do-repositorio>
cd Sala_Tecnica

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## 📋 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm start` | Servidor de produção (porta 8080) |
| `npm run build` | Build para produção |
| `npm run lint:js` | Verificar código JavaScript |
| `npm run format` | Formatar código com Prettier |
| `npm run validate:html` | Validar arquivos HTML |
| `npm run clean` | Limpar diretório de build |

## 🏗️ Estrutura do Projeto

```
Sala_Tecnica/
├── index.html          # Página de login
├── dashboard.html      # Dashboard principal
├── script.js          # Lógica da aplicação
├── styles.css         # Estilos CSS
├── package.json       # Configurações do projeto
├── server.js          # Servidor Node.js
├── images/            # Imagens do projeto
└── node_modules/      # Dependências
```

## ⚙️ Configuração

### Google Sheets Integration
1. Configure a URL da planilha no arquivo `.env`
2. Certifique-se de que a planilha está compartilhada publicamente
3. Use o formato CSV para exportação

### Variáveis de Ambiente
```env
GOOGLE_SHEETS_API_KEY=sua_api_key
SHEET_ID=id_da_planilha
REFRESH_INTERVAL=30000
DEBUG_MODE=false
```

## 🛠️ Desenvolvimento

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar em http://localhost:3000
```

## 🔧 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Gráficos**: Chart.js
- **Ícones**: Font Awesome
- **Servidor**: Node.js + Express

## 📊 Dados e Integração

### Formato dos Dados
O sistema espera dados no formato CSV com as seguintes colunas:
- Data
- Projeto
- Supervisor
- Vistoriador
- Status (PRODUTIVA/IMPRODUTIVA)
- HP (Home Passed)
- Outras métricas específicas

### API Google Sheets
Configuração para integração direta com Google Sheets:
1. Ative a API Google Sheets
2. Configure as credenciais
3. Defina a URL da planilha

## 🎯 Uso

### Login
- Acesse a página inicial
- Use qualquer usuário/senha para entrar
- Sistema salva sessão no localStorage

### Dashboard
- **Início**: Visão geral e guia de uso
- **Infraestrutura**: Dashboards e análises
- **Desenvolvimento**: Console debug e configurações

### Filtros
- Selecione múltiplos projetos
- Filtre por supervisor
- Defina período específico
- Busque colaboradores

## 📈 Performance

- Minificação automática (CSS/JS)
- Cache inteligente
- Lazy loading de gráficos
- Otimização de assets

## 🐛 Debug e Logs

Acesse a área de **Desenvolvimento** para:
- Console JavaScript integrado
- Logs do sistema
- Status de conexões
- Configurações avançadas

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença ISC. Veja o arquivo `package.json` para detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento