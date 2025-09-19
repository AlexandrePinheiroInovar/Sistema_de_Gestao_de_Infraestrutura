// ============= SISTEMA DE GRÁFICOS DO DASHBOARD - NOVO E LIMPO =============
// Criado do zero com base na documentação completa
// Versão: 1.0 - Implementação limpa e otimizada
console.log('📊 [DASHBOARD-CHARTS-NOVO] Inicializando sistema de gráficos novo...');

// ============= CONFIGURAÇÕES GLOBAIS =============
const ChartsDashboard = {
    // Armazenar instâncias dos gráficos
    instances: {},

    // Configurações de cores (padrão azul do sistema)
    colors: {
        principal: 'rgba(59, 130, 246, 0.8)', // blue-500
        secundaria: 'rgba(30, 64, 175, 0.8)', // blue-700
        clara: 'rgba(147, 197, 253, 0.8)', // blue-300
        escura: 'rgba(29, 78, 216, 0.8)', // blue-600
        linha: 'rgba(37, 99, 235, 1)', // blue-600 solid
        borda: 'rgba(59, 130, 246, 1)', // blue-500 solid
        produtiva: 'rgba(34, 197, 94, 0.8)', // green-500
        improdutiva: 'rgba(239, 68, 68, 0.8)', // red-500
        warning: 'rgba(251, 191, 36, 0.8)', // yellow-500
        gradiente: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(30, 64, 175, 0.8)',
            'rgba(147, 197, 253, 0.8)',
            'rgba(29, 78, 216, 0.8)',
            'rgba(37, 99, 235, 0.8)',
            'rgba(96, 165, 250, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(168, 85, 247, 0.8)'
        ]
    },

    // Estado do sistema
    isInitialized: false,
    hasData: false,
    data: []
};

// ============= UTILITÁRIOS PARA MAPEAR CAMPOS =============
function obterCampo(item, campo) {
    const mapeamentos = {
        projeto: item['Projeto'] || item['projeto'] || '',
        subProjeto: item['Sub Projeto'] || item['subProjeto'] || '',
        cidade: item['Cidade'] || item['cidade'] || '',
        hp: item['HP'] || item['hp'] || '',
        dataRecebimento:
            item['DATA RECEBIMENTO'] || item['dataRecebimento'] || item['Data Recebimento'] || '',
        dataInicio: item['DATA INICIO'] || item['dataInicio'] || item['Data Início'] || '',
        dataFinal: item['DATA FINAL'] || item['dataFinal'] || item['Data Final'] || '',
        supervisor: item['Supervisor'] || item['supervisor'] || '',
        equipe: item['EQUIPE'] || item['equipe'] || '',
        status: item['Status'] || item['status'] || item['STATUS'] || '',
        tipoAcao: item['Tipo de Ação'] || item['tipoAcao'] || item['Tipo Ação'] || '',
        nodeGerencial: item['NODE GERENCIAL'] || item['nodeGerencial'] || item['Node Gerencial'] || '',
        areaTecnica: item['Área Técnica'] || item['areaTecnica'] || item['Area Tecnica'] || '',
        rdo: item['RDO'] || item['rdo'] || '',
        book: item['BOOK'] || item['book'] || '',
        projetoStatus: item['PROJETO'] || item['projetoStatus'] || item['projeto'] || '',
        pep: item['PEP'] || item['pep'] || item['Pep'] || '',
        endereco: item['ENDEREÇO'] || item['ENDERECO'] || item['endereco'] || item['Endereço'] || item['Endereco'] || ''
    };

    return mapeamentos[campo] || '';
}

// ============= GERAÇÃO DINÂMICA DO HTML =============
function gerarHTMLCompleto() {
    return `
        <!-- ============= GRÁFICOS DE ANÁLISE ============= -->
        
        <!-- 1. Análise de Projetos -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📊 Análise de Projetos</h3>
                <p>Quantidade de Projetos e seus Percentuais</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="projetosChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 2. Análise de Sub Projetos -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📊 Análise de Sub Projetos</h3>
                <p>Quantidade de Sub Projetos e seus Percentuais</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="subProjetosChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 3. Análise de Cidades -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📊 Análise de Cidades</h3>
                <p>Quantidade por Cidade e seus Percentuais</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="cidadesChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 4. Análise de HP por Projeto -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📊 Análise de HP por Projeto</h3>
                <p>Soma de HP Ativados por Projeto</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="hpProjetosChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 5. Análise de Recebimentos e Conclusões -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📅 Análise de Recebimentos e Conclusões</h3>
                <p>Registros Recebidos vs Concluídos por Mês</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="recebimentosChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 6. Análise de Status por Supervisor -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📊 Análise de Endereços por Supervisor</h3>
                <p>Quantidade por Status (Produtiva/Improdutiva)</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container">
                    <canvas id="supervisorStatusChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>

        <!-- 7. Análise de NODE GERENCIAL por Área Técnica -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>🔌 Análise de NODE GERENCIAL</h3>
                <p>Distribuição por Área Técnica - Gráfico Horizontal</p>
                <div class="filter-info" id="areaTecnicaFilterInfo">
                    <i class="fas fa-filter"></i>
                    <span>Filtragem por Área Técnica ativa nos filtros</span>
                </div>
            </div>
            <div class="analysis-content">
                <div class="chart-container chart-horizontal">
                    <canvas id="nodeGerencialChart" width="400" height="300"></canvas>
                </div>
            </div>
        </div>

        <!-- 8. Análise de PEP - Gráfico de Pizza -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>🥧 Análise de PEP</h3>
                <p>Distribuição de Projetos por PEP - Gráfico de Pizza</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container chart-pie" style="height: 500px; min-height: 500px;">
                    <canvas id="pepChart" width="400" height="500"></canvas>
                </div>
            </div>
        </div>

        <!-- ============= 9. GRÁFICO MENSAL RDO, BOOK E PROJETOS ============= -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>📈 Evolução Mensal</h3>
                <p>Análise Temporal de RDO, BOOK e Projetos por Mês</p>
            </div>
            <div class="analysis-content">
                <div class="chart-container" style="height: 400px; min-height: 400px;">
                    <canvas id="rdoBookProjetosChart" width="400" height="350"></canvas>
                </div>
            </div>
        </div>

        <!-- ============= RANKINGS DAS EQUIPES ============= -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>🏆 Rankings das Equipes</h3>
                <p>Análise por Tipo de Ação e Status</p>
                <div class="export-controls">
                    <button class="btn btn-secondary" onclick="ChartsDashboard.exportarRankings()">
                        <i class="fas fa-download"></i> Exportar Rankings (XLSX)
                    </button>
                </div>
            </div>
            <div class="analysis-content">
                <div class="rankings-grid">
                    
                    <!-- Ranking por Tipo de Ação -->
                    <div class="ranking-table-container">
                        <div class="table-header">
                            <h4>📊 Por Tipo de Ação</h4>
                        </div>
                        <div class="table-responsive">
                            <table id="equipeRankingTable" class="ranking-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Equipe</th>
                                        <th>ATIVAÇÃO</th>
                                        <th>CONSTRUÇÃO</th>
                                        <th>VISTORIA</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody id="equipeRankingTableBody">
                                    <!-- Dados inseridos dinamicamente -->
                                </tbody>
                                <tfoot>
                                    <tr class="total-row">
                                        <td colspan="2"><strong>Total Geral</strong></td>
                                        <td id="totalAtivacao">0</td>
                                        <td id="totalConstrucao">0</td>
                                        <td id="totalVistoria">0</td>
                                        <td id="totalGeral">0</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Ranking por Status -->
                    <div class="ranking-table-container">
                        <div class="table-header">
                            <h4>📈 Por Status</h4>
                        </div>
                        <div class="table-responsive">
                            <table id="equipeStatusRankingTable" class="ranking-table">
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Equipe</th>
                                        <th>PRODUTIVA</th>
                                        <th>IMPRODUTIVA</th>
                                        <th>Total</th>
                                        <th>Produtividade</th>
                                    </tr>
                                </thead>
                                <tbody id="equipeStatusRankingTableBody">
                                    <!-- Dados inseridos dinamicamente -->
                                </tbody>
                                <tfoot>
                                    <tr class="total-row">
                                        <td colspan="2"><strong>Total Geral</strong></td>
                                        <td id="totalProdutiva">0</td>
                                        <td id="totalImprodutiva">0</td>
                                        <td id="totalStatusGeral">0</td>
                                        <td id="totalProdutividade">0%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>

        <!-- ============= TABELA DE ENDEREÇOS E HP ============= -->
        <div class="analysis-section">
            <div class="analysis-header">
                <h3>🏠 Tabela de Endereços e HP</h3>
                <p>Endereços e suas Quantidades de HP</p>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="ChartsDashboard.atualizarTabelaEnderecos()">
                        <i class="fas fa-sync-alt"></i> Atualizar
                    </button>
                    <button class="btn btn-secondary" onclick="ChartsDashboard.exportarTabelaEnderecos()">
                        <i class="fas fa-download"></i> Exportar (XLSX)
                    </button>
                </div>
            </div>
            <div class="analysis-content" style="display: flex; justify-content: center; align-items: center; flex-direction: column;">
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto; border: 1px solid #ddd; width: 80%; max-width: 800px; margin: 0 auto;">
                    <table id="enderecosHpTable" class="ranking-table" style="width: 100%; margin: 0 auto;">
                        <style>
                            #enderecosHpTable tr:nth-child(1) td:first-child,
                            #enderecosHpTable tr:nth-child(2) td:first-child,
                            #enderecosHpTable tr:nth-child(3) td:first-child {
                                background-color: transparent !important;
                                color: inherit !important;
                            }
                            #enderecosHpTable tbody tr {
                                background-color: transparent !important;
                            }
                            #enderecosHpTable tbody tr:hover {
                                background-color: #f5f5f5 !important;
                            }
                        </style>
                        <thead>
                            <tr>
                                <th>Id</th>
                                <th>Endereço</th>
                                <th>Quantidade HP</th>
                            </tr>
                        </thead>
                        <tbody id="enderecosHpTableBody">
                            <!-- Dados inseridos dinamicamente -->
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Geral</strong></td>
                                <td id="totalEnderecosQuantidade">0</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// ============= FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO =============
ChartsDashboard.inicializar = function (dados = null) {
    console.log('🚀 [CHARTS-NOVO] Inicializando sistema completo...');

    try {
        // 1. Verificar Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [CHARTS-NOVO] Chart.js não carregado, reagendando...');
            setTimeout(() => this.inicializar(dados), 1000);
            return;
        }

        // 2. Obter dados - MELHORADO PARA AGUARDAR DADOS REAIS
        let dadosProcessar = dados;
        
        // Tentar obter dados do FirebaseTableSystem
        if (!dadosProcessar && window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
            dadosProcessar = window.FirebaseTableSystem.getData();
            console.log('📊 [CHARTS-NOVO] Dados obtidos do FirebaseTableSystem:', dadosProcessar?.length || 'null');
        }
        
        // Tentar obter dados do window.currentFirebaseData
        if (!dadosProcessar && window.currentFirebaseData) {
            dadosProcessar = window.currentFirebaseData;
            console.log('📊 [CHARTS-NOVO] Dados obtidos do window.currentFirebaseData:', dadosProcessar?.length || 'null');
        }
        
        // Tentar obter dados da variável global firebaseTableData
        if (!dadosProcessar && window.firebaseTableData) {
            dadosProcessar = window.firebaseTableData;
            console.log('📊 [CHARTS-NOVO] Dados obtidos do window.firebaseTableData:', dadosProcessar?.length || 'null');
        }

        // Se ainda não há dados, aguardar mais ou usar mock apenas como último recurso
        if (!dadosProcessar || dadosProcessar.length === 0) {
            // Se essa é a primeira tentativa, aguardar mais
            if (!this.tentativasSemDados) {
                this.tentativasSemDados = 1;
                console.warn('⚠️ [CHARTS-NOVO] Primeira tentativa sem dados, aguardando 5s...');
                setTimeout(() => this.inicializar(dados), 5000);
                return;
            } else if (this.tentativasSemDados < 3) {
                this.tentativasSemDados++;
                console.warn(`⚠️ [CHARTS-NOVO] Tentativa ${this.tentativasSemDados} sem dados, aguardando mais 3s...`);
                setTimeout(() => this.inicializar(dados), 3000);
                return;
            } else {
                console.warn('⚠️ [CHARTS-NOVO] Máximo de tentativas atingido, usando dados mock como fallback...');
                dadosProcessar = this.gerarDadosMock();
                // Resetar contador para futuras tentativas
                this.tentativasSemDados = 0;
            }
        } else {
            // Reset contador se encontrou dados
            this.tentativasSemDados = 0;
        }

        console.log('📊 [CHARTS-NOVO] Processando', dadosProcessar.length, 'registros');

        // 3. Armazenar dados
        this.data = dadosProcessar;
        this.hasData = true;

        // 4. Gerar HTML se necessário
        const container = document.getElementById('charts-rankings-container');
        if (container) {
            container.innerHTML = gerarHTMLCompleto();
        }

        // 5. Aguardar DOM ser criado e criar gráficos
        setTimeout(() => {
            this.criarTodosGraficos();
            this.criarTabelas();
        }, 100);

        this.isInitialized = true;
        console.log('✅ [CHARTS-NOVO] Sistema inicializado com sucesso!');
    } catch (error) {
        console.error('❌ [CHARTS-NOVO] Erro na inicialização:', error);
    }
};

// ============= GERAR DADOS MOCK PARA TESTE =============
ChartsDashboard.gerarDadosMock = function () {
    return [
        {
            Projeto: 'CLARO FIBRA',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'VISTORIA',
            Cidade: 'São Paulo',
            HP: '24',
            EQUIPE: 'Equipe A',
            Supervisor: 'João Silva',
            Status: 'PRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-15',
            'DATA INICIO': '2025-01-20',
            'DATA FINAL': '2025-01-25',
            RDO: 'SIM',
            BOOK: 'SIM',
            PROJETO: 'CONCLUÍDO',
            'ENDEREÇO': 'Rua das Flores, 123 - São Paulo/SP'
        },
        {
            Projeto: 'VIVO FIBER',
            'Sub Projeto': 'Empresarial',
            'Tipo de Ação': 'CONSTRUÇÃO',
            Cidade: 'Rio de Janeiro',
            HP: '48',
            EQUIPE: 'Equipe B',
            Supervisor: 'Maria Santos',
            Status: 'PRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-16',
            'DATA INICIO': '2025-01-21',
            'DATA FINAL': '2025-01-28',
            RDO: 'SIM',
            BOOK: 'OK',
            PROJETO: 'CONCLUÍDO',
            'ENDEREÇO': 'Av. Atlântica, 456 - Rio de Janeiro/RJ'
        },
        {
            Projeto: 'TIM ULTRA',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'ATIVAÇÃO',
            Cidade: 'Belo Horizonte',
            HP: '12',
            EQUIPE: 'Equipe C',
            Supervisor: 'Carlos Lima',
            Status: 'IMPRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-17',
            'DATA INICIO': '2025-01-22',
            'DATA FINAL': '',
            RDO: 'NÃO',
            BOOK: 'PENDENTE',
            PROJETO: 'EM ANDAMENTO',
            'ENDEREÇO': 'Rua das Palmeiras, 789 - Belo Horizonte/MG'
        },
        {
            Projeto: 'CLARO FIBRA',
            'Sub Projeto': 'Comercial',
            'Tipo de Ação': 'VISTORIA',
            Cidade: 'Salvador',
            HP: '36',
            EQUIPE: 'Equipe A',
            Supervisor: 'João Silva',
            Status: 'PRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-18',
            'DATA INICIO': '2025-01-23',
            'DATA FINAL': '2025-01-30',
            RDO: 'SIM',
            BOOK: 'SIM',
            PROJETO: 'FINALIZADO',
            'ENDEREÇO': 'Rua das Flores, 123 - São Paulo/SP'
        },
        {
            Projeto: 'VIVO FIBER',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'CONSTRUÇÃO',
            Cidade: 'Brasília',
            HP: '60',
            EQUIPE: 'Equipe D',
            Supervisor: 'Ana Costa',
            Status: 'PRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-19',
            'DATA INICIO': '2025-01-24',
            'DATA FINAL': '2025-02-02',
            RDO: 'OK',
            BOOK: 'SIM',
            PROJETO: 'CONCLUÍDO',
            'ENDEREÇO': 'Av. JK, 321 - Brasília/DF'
        },
        {
            Projeto: 'TIM ULTRA',
            'Sub Projeto': 'Empresarial',
            'Tipo de Ação': 'ATIVAÇÃO',
            Cidade: 'Fortaleza',
            HP: '18',
            EQUIPE: 'Equipe B',
            Supervisor: 'Maria Santos',
            Status: 'IMPRODUTIVA',
            'DATA RECEBIMENTO': '2025-01-20',
            'DATA INICIO': '2025-01-25',
            'DATA FINAL': '',
            RDO: '',
            BOOK: 'NÃO',
            PROJETO: 'CANCELADO',
            'ENDEREÇO': 'Rua das Palmeiras, 789 - Belo Horizonte/MG'
        }
    ];
};

// ============= FUNÇÃO PARA CRIAR TODOS OS GRÁFICOS =============
ChartsDashboard.criarTodosGraficos = function () {
    console.log('📊 [CHARTS-NOVO] Criando todos os gráficos...');

    if (!this.hasData) {
        console.warn('⚠️ [CHARTS-NOVO] Sem dados para gráficos');
        return;
    }

    try {
        // Destruir gráficos existentes
        this.destruirGraficos();

        // Criar cada gráfico
        this.criarGraficoProjetos();
        this.criarGraficoSubProjetos();
        this.criarGraficoCidades();
        this.criarGraficoHP();
        this.criarGraficoRecebimentos();
        this.criarGraficoSupervisores();
        this.criarGraficoNodeGerencial();
        this.criarGraficoPEP();
        this.criarGraficoMensalRdoBookProjetos();

        console.log('✅ [CHARTS-NOVO] Todos os gráficos criados!');
    } catch (error) {
        console.error('❌ [CHARTS-NOVO] Erro ao criar gráficos:', error);
    }
};

// ============= DESTRUIR GRÁFICOS EXISTENTES =============
ChartsDashboard.destruirGraficos = function () {
    Object.values(this.instances).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    this.instances = {};
};

// ============= CONTINUA NO PRÓXIMO ARQUIVO... =============
// Este arquivo será completado com todas as funções de criação de gráficos

// ============= INTEGRAÇÃO COM FILTROS DO DASHBOARD =============
ChartsDashboard.setupFilterIntegration = function () {
    console.log('🔗 [CHARTS-NOVO] Configurando integração com filtros...');

    // Escutar evento de filtros aplicados
    window.addEventListener('dashboardFiltersApplied', event => {
        console.log(
            '🔍 [CHARTS-NOVO] Filtros aplicados:',
            event.detail.filterCount,
            'de',
            event.detail.originalCount,
            'registros'
        );

        if (event.detail.filteredData && event.detail.filteredData.length >= 0) {
            console.log('📊 [CHARTS-NOVO] Atualizando gráficos com dados filtrados...');
            this.atualizar(event.detail.filteredData);

            // Também notificar sistema de cards para atualizar
            if (window.updateDashboardCards) {
                try {
                    window.updateDashboardCards();
                    console.log('📊 [CHARTS-NOVO] Cards atualizados com filtros');
                } catch (error) {
                    console.warn('⚠️ [CHARTS-NOVO] Erro ao atualizar cards:', error);
                }
            }
        }
    });

    // Escutar evento de filtros limpos
    window.addEventListener('dashboardFiltersCleared', event => {
        console.log('🧹 [CHARTS-NOVO] Filtros limpos:', event.detail.count, 'registros');

        if (event.detail.data && event.detail.data.length > 0) {
            console.log('📊 [CHARTS-NOVO] Restaurando gráficos com todos os dados...');
            this.atualizar(event.detail.data);

            // Também atualizar cards
            if (window.updateDashboardCards) {
                try {
                    window.updateDashboardCards();
                    console.log('📊 [CHARTS-NOVO] Cards restaurados sem filtros');
                } catch (error) {
                    console.warn('⚠️ [CHARTS-NOVO] Erro ao restaurar cards:', error);
                }
            }
        }
    });

    // Escutar mudanças na tabela do firebase-table-system
    window.addEventListener('firebaseTableDataLoaded', event => {
        console.log('📢 [CHARTS-NOVO] Novos dados carregados:', event.detail.length, 'registros');
        if (event.detail.data && event.detail.data.length > 0) {
            this.atualizar(event.detail.data);
        }
    });

    console.log('✅ [CHARTS-NOVO] Integração com filtros configurada');
};

// ============= FUNÇÃO PARA INTEGRAR COM SISTEMA DE CARDS =============
ChartsDashboard.integrarComCards = function () {
    // Tentar encontrar e integrar com o sistema de cards do dashboard
    if (window.updateDashboardCards) {
        console.log('📊 [CHARTS-NOVO] Sistema de cards encontrado, integrando...');

        // Sobrescrever função de atualização para incluir cards
        const originalAtualizar = this.atualizar.bind(this);
        this.atualizar = function (novosDados) {
            // Atualizar gráficos
            originalAtualizar(novosDados);

            // Atualizar tabelas também
            ChartsDashboard.criarTabelas();

            // Atualizar cards também
            try {
                window.updateDashboardCards();
                console.log('📊 [CHARTS-NOVO] Cards e tabelas atualizados junto com gráficos');
            } catch (error) {
                console.warn('⚠️ [CHARTS-NOVO] Erro ao atualizar cards:', error);
            }
        };
    } else {
        console.log('📊 [CHARTS-NOVO] Sistema de cards não encontrado');
    }
};

// ============= EXPORTAÇÃO GLOBAL =============
window.ChartsDashboard = ChartsDashboard;

// ============= CONFIGURAÇÃO AUTOMÁTICA DE EVENTOS =============
document.addEventListener('DOMContentLoaded', function () {
    // Configurar integração com filtros assim que o DOM carregar
    setTimeout(() => {
        if (ChartsDashboard.setupFilterIntegration) {
            ChartsDashboard.setupFilterIntegration();
            ChartsDashboard.integrarComCards();
        }
    }, 1000);
});

// ============= ESCUTAR SISTEMA FIREBASE GLOBAL =============
window.addEventListener('firebaseSystemReady', function (event) {
    console.log('📊 [CHARTS-NOVO] Sistema Firebase pronto globalmente:', event.detail);

    // Se há dados disponíveis, inicializar gráficos automaticamente
    if (event.detail.dataLength > 0) {
        setTimeout(() => {
            console.log('🚀 [CHARTS-NOVO] Auto-inicializando com dados globais...');

            // Tentar obter dados do sistema Firebase
            if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
                const dados = window.FirebaseTableSystem.getData();
                if (dados && dados.length > 0) {
                    ChartsDashboard.inicializar(dados);
                    console.log(
                        '✅ [CHARTS-NOVO] Gráficos inicializados com',
                        dados.length,
                        'registros'
                    );
                }
            }
        }, 500);
    }
});

// ============= ESCUTAR FILTROS UNIFICADOS =============
document.addEventListener('unifiedFiltersChanged', function(event) {
    console.log('🔍 [CHARTS-NOVO] Filtros unificados alterados:', event.detail);
    
    // Verificar se há dados filtrados
    if (event.detail.filteredData && event.detail.filteredData.length >= 0) {
        console.log('📊 [CHARTS-NOVO] Atualizando gráficos com dados filtrados:', event.detail.filteredData.length);
        
        // Reinicializar gráficos com dados filtrados
        ChartsDashboard.data = event.detail.filteredData;
        ChartsDashboard.hasData = event.detail.filteredData.length > 0;
        
        if (ChartsDashboard.hasData) {
            // Recriar todos os gráficos
            ChartsDashboard.criarTodosGraficos();
            console.log('✅ [CHARTS-NOVO] Gráficos atualizados com filtros');
        } else {
            // Se não há dados filtrados, destruir gráficos
            ChartsDashboard.destruirGraficos();
            console.log('🧹 [CHARTS-NOVO] Gráficos destruídos (nenhum dado filtrado)');
        }
    }
});

// ============= CRIAR TABELAS =============
ChartsDashboard.criarTabelas = function() {
    console.log('📊 [CHARTS-NOVO] Criando tabelas...');
    
    // Criar tabela de endereços e HP
    this.criarTabelaEnderecos();
};

// ============= CRIAR TABELA DE ENDEREÇOS E HP =============
ChartsDashboard.criarTabelaEnderecos = function() {
    console.log('🏠 [TABELA-ENDERECOS] Criando tabela de endereços...');
    console.log('🏠 [TABELA-ENDERECOS] Dados disponíveis:', this.data?.length || 'null');
    
    const tableBody = document.getElementById('enderecosHpTableBody');
    if (!tableBody) {
        console.warn('⚠️ Tabela enderecosHpTableBody não encontrada');
        return;
    }

    if (!this.data || this.data.length === 0) {
        console.warn('⚠️ [TABELA-ENDERECOS] Sem dados - aguardando...');
        tableBody.innerHTML = '<tr><td colspan="3">Carregando dados...</td></tr>';
        
        // Tentar novamente em 2 segundos se não há dados
        setTimeout(() => {
            if (this.data && this.data.length > 0) {
                console.log('🔄 [TABELA-ENDERECOS] Dados carregados, tentando novamente...');
                this.criarTabelaEnderecos();
            }
        }, 2000);
        return;
    }

    // Processar dados - agrupar por endereço
    const enderecos = {};
    
    this.data.forEach(item => {
        const endereco = obterCampo(item, 'endereco') || 'Endereço não especificado';
        
        if (!enderecos[endereco]) {
            enderecos[endereco] = {
                quantidade: 0
            };
        }
        
        enderecos[endereco].quantidade += 1;
    });

    // Converter para array e ordenar por quantidade (decrescente)
    const enderecosArray = Object.entries(enderecos)
        .map(([endereco, dados]) => ({
            endereco,
            quantidade: dados.quantidade
        }))
        .sort((a, b) => b.quantidade - a.quantidade);

    // Gerar HTML da tabela
    let html = '';
    let totalQuantidade = 0;

    enderecosArray.forEach((item, index) => {
        totalQuantidade += item.quantidade;
        
        html += `
            <tr style="background-color: transparent !important;">
                <td style="background-color: transparent !important; color: inherit !important;">${index + 1}</td>
                <td style="background-color: transparent !important; color: inherit !important;" title="${item.endereco}">${item.endereco}</td>
                <td style="background-color: transparent !important; color: inherit !important;">${item.quantidade}</td>
            </tr>
        `;
    });

    // Inserir dados na tabela
    tableBody.innerHTML = html;

    // Atualizar totais no rodapé
    document.getElementById('totalEnderecosQuantidade').textContent = totalQuantidade;

    console.log('✅ [TABELA-ENDERECOS] Tabela criada com', enderecosArray.length, 'endereços');
};

// ============= ATUALIZAR TABELA DE ENDEREÇOS =============
ChartsDashboard.atualizarTabelaEnderecos = function() {
    console.log('🔄 [TABELA-ENDERECOS] Atualizando tabela...');
    this.criarTabelaEnderecos();
};

// ============= EXPORTAR TABELA DE ENDEREÇOS =============
ChartsDashboard.exportarTabelaEnderecos = function() {
    console.log('💾 [TABELA-ENDERECOS] Exportando tabela...');
    
    if (!this.data || this.data.length === 0) {
        alert('Nenhum dado disponível para exportar');
        return;
    }

    // Processar dados para exportação
    const enderecos = {};
    
    this.data.forEach(item => {
        const endereco = obterCampo(item, 'endereco') || 'Endereço não especificado';
        
        if (!enderecos[endereco]) {
            enderecos[endereco] = {
                quantidade: 0
            };
        }
        
        enderecos[endereco].quantidade += 1;
    });

    // Converter para formato de exportação
    const dadosExportacao = Object.entries(enderecos)
        .map(([endereco, dados]) => ({
            'Endereço': endereco,
            'Quantidade HP': dados.quantidade
        }))
        .sort((a, b) => b['Quantidade HP'] - a['Quantidade HP']);

    // Usar a função de exportação existente se disponível
    if (typeof exportarParaExcel === 'function') {
        exportarParaExcel(dadosExportacao, 'enderecos-hp-' + new Date().toISOString().slice(0, 10));
    } else {
        console.warn('⚠️ Função de exportação não disponível');
        // Fallback - copiar para clipboard como CSV
        const csv = [
            'Endereço,Quantidade HP',
            ...dadosExportacao.map(row => `"${row['Endereço']}",${row['Quantidade HP']}`)
        ].join('\n');
        
        navigator.clipboard.writeText(csv).then(() => {
            alert('Dados copiados para a área de transferência em formato CSV!');
        }).catch(() => {
            console.log('CSV:', csv);
            alert('Dados no console (F12) em formato CSV');
        });
    }
};

console.log('✅ [CHARTS-NOVO] Sistema base carregado. Carregando implementações dos gráficos...');
