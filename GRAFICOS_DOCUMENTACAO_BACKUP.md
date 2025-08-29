# 📊 DOCUMENTAÇÃO COMPLETA DOS GRÁFICOS E RANKINGS - BACKUP PARA RECRIAÇÃO

## 📁 ARQUIVOS QUE CRIAM GRÁFICOS IDENTIFICADOS:
- `src/js/dashboard-charts-v5.js` ⭐ PRINCIPAL
- `src/js/firebase-table-system.js` (tem funções de gráficos desabilitadas)
- `src/js/dashboard-integration.js` (tem funções de gráficos)

## 🎨 GRÁFICOS MAPEADOS NO DASHBOARD:

### 1️⃣ **ANÁLISE DE PROJETOS** (projetosChart)
- **Canvas ID**: `projetosChart`
- **Tipo**: Gráfico de Barras + Linha (mixed chart)
- **Dados**: Campo `Projeto` da tabela de endereços
- **Processamento**: Contador de ocorrências por projeto (Top 10)
- **Layout**: Barras = quantidade, Linha = percentual
- **Título HTML**: `📊 Análise de Projetos`
- **Subtítulo**: `Quantidade de Projetos e seus Percentuais`

### 2️⃣ **ANÁLISE DE SUB PROJETOS** (subProjetosChart)  
- **Canvas ID**: `subProjetosChart`
- **Tipo**: Gráfico Pizza (doughnut)
- **Dados**: Campo `Sub Projeto` da tabela de endereços
- **Processamento**: Contador de ocorrências por sub projeto (Top 8)
- **Layout**: Pizza com cores azuis
- **Título HTML**: `📊 Análise de Sub Projetos`
- **Subtítulo**: `Quantidade de Sub Projetos e seus Percentuais`

### 3️⃣ **ANÁLISE DE CIDADES** (cidadesChart)
- **Canvas ID**: `cidadesChart`  
- **Tipo**: Gráfico de Barras horizontais
- **Dados**: Campo `Cidade` da tabela de endereços
- **Processamento**: Contador de ocorrências por cidade (Top 10)
- **Layout**: Barras horizontais ordenadas por quantidade
- **Título HTML**: `📊 Análise de Cidades`
- **Subtítulo**: `Quantidade por Cidade e seus Percentuais`

### 4️⃣ **ANÁLISE DE HP POR PROJETO** (hpProjetosChart)
- **Canvas ID**: `hpProjetosChart`
- **Tipo**: Gráfico de Barras
- **Dados**: Campos `Projeto` + `HP` da tabela de endereços
- **Processamento**: Soma de HP por projeto (apenas valores numéricos)
- **Layout**: Barras com soma total de HP por projeto
- **Título HTML**: `📊 Análise de HP por Projeto` 
- **Subtítulo**: `Soma de HP Ativados por Projeto`

### 5️⃣ **ANÁLISE DE RECEBIMENTOS E CONCLUSÕES** (recebimentosChart)
- **Canvas ID**: `recebimentosChart`
- **Tipo**: Gráfico de Linhas (time series)
- **Dados**: Campos `DATA RECEBIMENTO` + `DATA FINAL` da tabela de endereços
- **Processamento**: Agrupamento por mês/ano, separando recebidos vs concluídos
- **Layout**: 2 linhas - Recebidos (azul) e Concluídos (verde)
- **Título HTML**: `📅 Análise de Recebimentos e Conclusões`
- **Subtítulo**: `Registros Recebidos vs Concluídos por Mês`

### 6️⃣ **ANÁLISE DE ENDEREÇOS POR SUPERVISOR** (supervisorStatusChart)
- **Canvas ID**: `supervisorStatusChart`
- **Tipo**: Gráfico de Barras empilhadas
- **Dados**: Campos `Supervisor` + `Status` da tabela de endereços  
- **Processamento**: Contagem de PRODUTIVA vs IMPRODUTIVA por supervisor
- **Layout**: Barras empilhadas (verde=produtiva, vermelho=improdutiva)
- **Título HTML**: `📊 Análise de Endereços por Supervisor`
- **Subtítulo**: `Quantidade por Status (Produtiva/Improdutiva)`

## 🏆 TABELAS DE RANKING MAPEADAS:

### 7️⃣ **RANKING POR TIPO DE AÇÃO** (equipeRankingTable)
- **Tabela ID**: `equipeRankingTable` 
- **Body ID**: `equipeRankingTableBody`
- **Dados**: Campos `EQUIPE` + `Tipo de Ação` da tabela de endereços
- **Colunas**: Rank | Equipe | ATIVAÇÃO | CONSTRUÇÃO | VISTORIA | Total
- **Processamento**: Contagem por equipe e tipo de ação
- **Totalizadores**: 
  - `totalAtivacao` (soma ATIVAÇÃO)
  - `totalConstrucao` (soma CONSTRUÇÃO) 
  - `totalVistoria` (soma VISTORIA)
  - `totalGeral` (soma total)

### 8️⃣ **RANKING POR STATUS** (equipeStatusRankingTable)
- **Tabela ID**: `equipeStatusRankingTable`
- **Body ID**: `equipeStatusRankingTableBody`
- **Dados**: Campos `EQUIPE` + `Status` da tabela de endereços
- **Colunas**: Rank | Equipe | PRODUTIVA | IMPRODUTIVA | Total | Produtividade%
- **Processamento**: Contagem por equipe de PRODUTIVA vs IMPRODUTIVA
- **Totalizadores**:
  - `totalProdutiva` (soma PRODUTIVA)
  - `totalImprodutiva` (soma IMPRODUTIVA)
  - `totalStatusGeral` (soma total)
  - `totalProdutividade` (percentual produtividade)

## 🗂️ ESTRUTURA HTML DAS SEÇÕES:

### Estrutura Gráficos:
```html
<div class="analysis-section">
    <div class="analysis-header">
        <h3>[ÍCONE] [TÍTULO]</h3>
        <p>[SUBTÍTULO/DESCRIÇÃO]</p>
    </div>
    <div class="analysis-content">
        <div class="chart-container">
            <canvas id="[ID]" width="400" height="200"></canvas>
        </div>
    </div>
</div>
```

### Estrutura Rankings:
```html
<div class="analysis-section">
    <div class="analysis-header">
        <h3>🏆 Rankings das Equipes</h3>
        <p>Análise por Tipo de Ação e Status</p>
        <div class="export-controls">
            <button class="btn btn-secondary" onclick="exportAllRankings()">
                <i class="fas fa-download"></i> Exportar Rankings (XLSX)
            </button>
        </div>
    </div>
    <div class="analysis-content">
        <div class="rankings-grid">
            [DUAS TABELAS LADO A LADO]
        </div>
    </div>
</div>
```

## 🎨 CONFIGURAÇÕES DE CORES E ESTILO:
```javascript
const coresAzuis = {
    principal: 'rgba(59, 130, 246, 0.8)',     // blue-500
    secundaria: 'rgba(30, 64, 175, 0.8)',     // blue-700  
    clara: 'rgba(147, 197, 253, 0.8)',        // blue-300
    escura: 'rgba(29, 78, 216, 0.8)',         // blue-600
    linha: 'rgba(37, 99, 235, 1)',            // blue-600 solid
    borda: 'rgba(59, 130, 246, 1)',           // blue-500 solid
    gradiente: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(30, 64, 175, 0.8)',
        'rgba(147, 197, 253, 0.8)', 
        'rgba(29, 78, 216, 0.8)',
        'rgba(37, 99, 235, 0.8)',
        'rgba(96, 165, 250, 0.8)',
        'rgba(59, 130, 246, 0.6)',
        'rgba(30, 64, 175, 0.6)'
    ]
};
```

## 📊 MAPEAMENTO DE CAMPOS DA TABELA DE ENDEREÇOS:
```javascript
const mapeamento = {
    'projeto': item['Projeto'] || item['projeto'] || '',
    'subProjeto': item['Sub Projeto'] || item['subProjeto'] || '',  
    'cidade': item['Cidade'] || item['cidade'] || '',
    'hp': item['HP'] || item['hp'] || '',
    'dataRecebimento': item['DATA RECEBIMENTO'] || item['dataRecebimento'] || '',
    'dataInicio': item['DATA INICIO'] || item['dataInicio'] || '',
    'dataFinal': item['DATA FINAL'] || item['dataFinal'] || '',
    'supervisor': item['Supervisor'] || item['supervisor'] || '',
    'equipe': item['EQUIPE'] || item['equipe'] || '',
    'status': item['Status'] || item['status'] || item['STATUS'] || '',
    'tipoAcao': item['Tipo de Ação'] || item['tipoAcao'] || ''
};
```

## 🔧 FUNÇÕES JAVASCRIPT ATIVAS:
- `criarTodosGraficos(dados)` - Função principal
- `criarGrafico1_AnaliseProjetosV5(dados)`
- `criarGrafico2_AnaliseSubProjetosV5(dados)`  
- `criarGrafico3_AnaliseCidadesV5(dados)`
- `criarGrafico4_AnaliseHPProjetosV5(dados)`
- `criarGrafico5_AnaliseRecebimentosV5(dados)`
- `criarGrafico6_AnaliseEnderecosSupervisorV5(dados)`
- `criarRanking1_EquipesTipoAcaoV5(dados)`
- `criarRanking2_EquipesStatusV5(dados)`

## 📍 LOCALIZAÇÃO NO DASHBOARD.HTML:
- **Gráficos**: Linhas 382-457 (section Dashboard)
- **Rankings**: Linhas 460-539 (section Dashboard)
- **Scripts**: Linhas 1512-1543 (final do arquivo)

---
**⚠️ ESTE ARQUIVO SERVE COMO BACKUP COMPLETO PARA RECRIAR TODO O SISTEMA DO ZERO**