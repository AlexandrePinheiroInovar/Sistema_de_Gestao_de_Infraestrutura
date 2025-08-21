// ============= INTEGRAÇÃO DOS DADOS DO DASHBOARD =============
console.log('📊 [DASHBOARD-INTEGRATION] Inicializando integração dos dados...');

// ============= VARIÁVEIS GLOBAIS =============
let dashboardData = [];
let filteredData = [];
let charts = {};

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [DASHBOARD-INTEGRATION] Configurando sistema...');
    
    // Aguardar Firebase carregar
    setTimeout(() => {
        inicializarDashboard();
    }, 2000);
});

async function inicializarDashboard() {
    try {
        console.log('🚀 [DASHBOARD-INTEGRATION] Carregando dados do dashboard...');
        
        // Carregar dados da coleção enderecos_mdu
        await carregarDadosEnderecos();
        
        // Atualizar cards estatísticos
        atualizarCardsEstatisticos();
        
        // Gerar gráficos
        gerarGraficos();
        
        // Gerar tabelas de ranking
        gerarTabelasRanking();
        
        // Configurar filtros
        configurarFiltros();
        
        console.log('✅ [DASHBOARD-INTEGRATION] Dashboard inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ [DASHBOARD-INTEGRATION] Erro na inicialização:', error);
    }
}

// ============= CARREGAMENTO DE DADOS =============
async function carregarDadosEnderecos() {
    try {
        if (!window.firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        console.log('📂 [DASHBOARD-INTEGRATION] Carregando dados dos endereços...');
        
        const snapshot = await firebase.firestore()
            .collection('enderecos_mdu')
            .get();
        
        dashboardData = [];
        snapshot.forEach(doc => {
            dashboardData.push({ ...doc.data(), _id: doc.id });
        });
        
        filteredData = [...dashboardData];
        
        console.log('✅ [DASHBOARD-INTEGRATION] Dados carregados:', dashboardData.length, 'registros');
        
        return dashboardData;
        
    } catch (error) {
        console.error('❌ [DASHBOARD-INTEGRATION] Erro ao carregar dados:', error);
        return [];
    }
}

// ============= CARDS ESTATÍSTICOS =============
function atualizarCardsEstatisticos() {
    console.log('📊 [DASHBOARD-INTEGRATION] Atualizando cards estatísticos...');
    
    const dados = filteredData;
    
    // Total de registros
    const totalRegistros = dados.length;
    document.getElementById('infraStatTotalRegistros').textContent = totalRegistros;
    
    // Endereços distintos
    const enderecosUnicos = new Set(dados.map(item => item['ENDEREÇO'] || '').filter(e => e.trim()));
    document.getElementById('infraStatEnderecosDistintos').textContent = enderecosUnicos.size;
    
    // Equipes distintas
    const equipesUnicas = new Set(dados.map(item => item['EQUIPE'] || '').filter(e => e.trim()));
    document.getElementById('infraStatEquipesDistintas').textContent = equipesUnicas.size;
    
    // Produtividade
    const produtivos = dados.filter(item => (item['Status'] || '').toUpperCase() === 'PRODUTIVA').length;
    const produtividade = totalRegistros > 0 ? Math.round((produtivos / totalRegistros) * 100) : 0;
    document.getElementById('infraStatProdutividade').textContent = `${produtividade}%`;
    
    // Tempo médio de execução (Recebimento → Final)
    const tempoMedioExecucao = calcularTempoMedio(dados, 'DATA RECEBIMENTO', 'DATA FINAL');
    document.getElementById('infraStatTempoMedio').textContent = `${tempoMedioExecucao} dias`;
    
    // Tempo médio Sala Técnica (Recebimento → Início)
    const tempoMedioSalaTecnica = calcularTempoMedio(dados, 'DATA RECEBIMENTO', 'DATA INICIO');
    document.getElementById('infraStatTempoSalaTecnica').textContent = `${tempoMedioSalaTecnica} dias`;
    
    // Tempo médio Técnicos (Início → Final)
    const tempoMedioTecnicos = calcularTempoMedio(dados, 'DATA INICIO', 'DATA FINAL');
    document.getElementById('infraStatTempoTecnicos').textContent = `${tempoMedioTecnicos} dias`;
    
    console.log('✅ [DASHBOARD-INTEGRATION] Cards atualizados');
}

function calcularTempoMedio(dados, campoInicio, campoFim) {
    const registrosComDatas = dados.filter(item => {
        const inicio = item[campoInicio];
        const fim = item[campoFim];
        return inicio && fim && inicio.trim() && fim.trim();
    });
    
    if (registrosComDatas.length === 0) return 0;
    
    const tempos = registrosComDatas.map(item => {
        try {
            const inicio = new Date(item[campoInicio]);
            const fim = new Date(item[campoFim]);
            
            if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
            
            const diffTime = Math.abs(fim - inicio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            return 0;
        }
    });
    
    const temposValidos = tempos.filter(t => t > 0);
    if (temposValidos.length === 0) return 0;
    
    const media = temposValidos.reduce((sum, t) => sum + t, 0) / temposValidos.length;
    return Math.round(media);
}

// ============= GRÁFICOS =============
function gerarGraficos() {
    console.log('📈 [DASHBOARD-INTEGRATION] Gerando gráficos...');
    
    // Aguardar Chart.js carregar
    if (typeof Chart === 'undefined') {
        setTimeout(gerarGraficos, 500);
        return;
    }
    
    gerarGraficoProjects();
    gerarGraficoSubProjects();
    gerarGraficoCidades();
    gerarGraficoHPProjects();
    gerarGraficoRecebimentos();
    gerarGraficoSupervisorStatus();
}

function gerarGraficoProjects() {
    const ctx = document.getElementById('projetosChart');
    if (!ctx) return;
    
    // Contar projetos
    const contadorProjetos = {};
    filteredData.forEach(item => {
        const projeto = item['Projeto'] || 'Não especificado';
        contadorProjetos[projeto] = (contadorProjetos[projeto] || 0) + 1;
    });
    
    const labels = Object.keys(contadorProjetos);
    const data = Object.values(contadorProjetos);
    const colors = gerarCores(labels.length);
    
    // Destruir gráfico anterior se existir
    if (charts.projetos) {
        charts.projetos.destroy();
    }
    
    charts.projetos = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function gerarGraficoSubProjects() {
    const ctx = document.getElementById('subProjetosChart');
    if (!ctx) return;
    
    // Contar sub projetos
    const contadorSubProjetos = {};
    filteredData.forEach(item => {
        const subProjeto = item['Sub Projeto'] || 'Não especificado';
        contadorSubProjetos[subProjeto] = (contadorSubProjetos[subProjeto] || 0) + 1;
    });
    
    const labels = Object.keys(contadorSubProjetos);
    const data = Object.values(contadorSubProjetos);
    const colors = gerarCores(labels.length);
    
    // Destruir gráfico anterior se existir
    if (charts.subProjetos) {
        charts.subProjetos.destroy();
    }
    
    charts.subProjetos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function gerarGraficoCidades() {
    const ctx = document.getElementById('cidadesChart');
    if (!ctx) return;
    
    // Contar cidades
    const contadorCidades = {};
    filteredData.forEach(item => {
        const cidade = item['Cidade'] || 'Não especificado';
        contadorCidades[cidade] = (contadorCidades[cidade] || 0) + 1;
    });
    
    const labels = Object.keys(contadorCidades);
    const data = Object.values(contadorCidades);
    const colors = gerarCores(labels.length);
    
    // Destruir gráfico anterior se existir
    if (charts.cidades) {
        charts.cidades.destroy();
    }
    
    charts.cidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade por Cidade',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function gerarGraficoHPProjects() {
    const ctx = document.getElementById('hpProjetosChart');
    if (!ctx) return;
    
    // Somar HP por projeto
    const hpPorProjeto = {};
    filteredData.forEach(item => {
        const projeto = item['Projeto'] || 'Não especificado';
        const hp = parseInt(item['HP']) || 0;
        hpPorProjeto[projeto] = (hpPorProjeto[projeto] || 0) + hp;
    });
    
    const labels = Object.keys(hpPorProjeto);
    const data = Object.values(hpPorProjeto);
    const colors = gerarCores(labels.length);
    
    // Destruir gráfico anterior se existir
    if (charts.hpProjetos) {
        charts.hpProjetos.destroy();
    }
    
    charts.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total HP',
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function gerarGraficoRecebimentos() {
    const ctx = document.getElementById('recebimentosChart');
    if (!ctx) return;
    
    // Agrupar por mês
    const recebimentosPorMes = {};
    const conclusoesPorMes = {};
    
    filteredData.forEach(item => {
        // Recebimentos
        const dataRecebimento = item['DATA RECEBIMENTO'];
        if (dataRecebimento && dataRecebimento.trim()) {
            const mes = extrairMesAno(dataRecebimento);
            if (mes) {
                recebimentosPorMes[mes] = (recebimentosPorMes[mes] || 0) + 1;
            }
        }
        
        // Conclusões
        const dataFinal = item['DATA FINAL'];
        if (dataFinal && dataFinal.trim()) {
            const mes = extrairMesAno(dataFinal);
            if (mes) {
                conclusoesPorMes[mes] = (conclusoesPorMes[mes] || 0) + 1;
            }
        }
    });
    
    // Combinar meses únicos
    const mesesUnicos = new Set([...Object.keys(recebimentosPorMes), ...Object.keys(conclusoesPorMes)]);
    const labels = Array.from(mesesUnicos).sort();
    
    const dataRecebimentos = labels.map(mes => recebimentosPorMes[mes] || 0);
    const dataConclusoes = labels.map(mes => conclusoesPorMes[mes] || 0);
    
    // Destruir gráfico anterior se existir
    if (charts.recebimentos) {
        charts.recebimentos.destroy();
    }
    
    charts.recebimentos = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recebidos',
                data: dataRecebimentos,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }, {
                label: 'Concluídos',
                data: dataConclusoes,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

function gerarGraficoSupervisorStatus() {
    const ctx = document.getElementById('supervisorStatusChart');
    if (!ctx) return;
    
    // Agrupar por supervisor e status
    const supervisorStatus = {};
    
    filteredData.forEach(item => {
        const supervisor = item['Supervisor'] || 'Não especificado';
        const status = item['Status'] || 'Não especificado';
        
        if (!supervisorStatus[supervisor]) {
            supervisorStatus[supervisor] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase() === 'PRODUTIVA') {
            supervisorStatus[supervisor].PRODUTIVA++;
        } else if (status.toUpperCase() === 'IMPRODUTIVA') {
            supervisorStatus[supervisor].IMPRODUTIVA++;
        }
    });
    
    const supervisores = Object.keys(supervisorStatus);
    const produtivas = supervisores.map(s => supervisorStatus[s].PRODUTIVA);
    const improdutivas = supervisores.map(s => supervisorStatus[s].IMPRODUTIVA);
    
    // Destruir gráfico anterior se existir
    if (charts.supervisorStatus) {
        charts.supervisorStatus.destroy();
    }
    
    charts.supervisorStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: supervisores,
            datasets: [{
                label: 'Produtiva',
                data: produtivas,
                backgroundColor: '#10b981'
            }, {
                label: 'Improdutiva',
                data: improdutivas,
                backgroundColor: '#ef4444'
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

// ============= TABELAS DE RANKING =============
function gerarTabelasRanking() {
    console.log('🏆 [DASHBOARD-INTEGRATION] Gerando tabelas de ranking...');
    
    gerarRankingTipoAcao();
    gerarRankingStatus();
}

function gerarRankingTipoAcao() {
    const tbody = document.getElementById('equipeRankingTableBody');
    if (!tbody) return;
    
    // Agrupar por equipe e tipo de ação
    const equipeStats = {};
    
    filteredData.forEach(item => {
        const equipe = item['EQUIPE'] || 'Não especificado';
        const tipoAcao = item['Tipo de Ação'] || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { ATIVAÇÃO: 0, CONSTRUÇÃO: 0, VISTORIA: 0 };
        }
        
        const tipo = tipoAcao.toUpperCase();
        if (equipeStats[equipe][tipo] !== undefined) {
            equipeStats[equipe][tipo]++;
        }
    });
    
    // Calcular totais e ranquear
    const rankings = Object.entries(equipeStats).map(([equipe, stats]) => ({
        equipe,
        ativacao: stats.ATIVAÇÃO,
        construcao: stats.CONSTRUÇÃO,
        vistoria: stats.VISTORIA,
        total: stats.ATIVAÇÃO + stats.CONSTRUÇÃO + stats.VISTORIA
    })).sort((a, b) => b.total - a.total);
    
    // Gerar HTML
    tbody.innerHTML = rankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.ativacao}</td>
            <td>${item.construcao}</td>
            <td>${item.vistoria}</td>
            <td><strong>${item.total}</strong></td>
        </tr>
    `).join('');
    
    // Atualizar totais
    const totalAtivacao = rankings.reduce((sum, item) => sum + item.ativacao, 0);
    const totalConstrucao = rankings.reduce((sum, item) => sum + item.construcao, 0);
    const totalVistoria = rankings.reduce((sum, item) => sum + item.vistoria, 0);
    const totalGeral = totalAtivacao + totalConstrucao + totalVistoria;
    
    document.getElementById('totalAtivacao').textContent = totalAtivacao;
    document.getElementById('totalConstrucao').textContent = totalConstrucao;
    document.getElementById('totalVistoria').textContent = totalVistoria;
    document.getElementById('totalGeral').textContent = totalGeral;
}

function gerarRankingStatus() {
    const tbody = document.getElementById('equipeStatusRankingTableBody');
    if (!tbody) return;
    
    // Agrupar por equipe e status
    const equipeStats = {};
    
    filteredData.forEach(item => {
        const equipe = item['EQUIPE'] || 'Não especificado';
        const status = item['Status'] || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase() === 'PRODUTIVA') {
            equipeStats[equipe].PRODUTIVA++;
        } else if (status.toUpperCase() === 'IMPRODUTIVA') {
            equipeStats[equipe].IMPRODUTIVA++;
        }
    });
    
    // Calcular totais e produtividade
    const rankings = Object.entries(equipeStats).map(([equipe, stats]) => {
        const total = stats.PRODUTIVA + stats.IMPRODUTIVA;
        const produtividade = total > 0 ? Math.round((stats.PRODUTIVA / total) * 100) : 0;
        
        return {
            equipe,
            produtiva: stats.PRODUTIVA,
            improdutiva: stats.IMPRODUTIVA,
            total,
            produtividade
        };
    }).sort((a, b) => b.produtividade - a.produtividade);
    
    // Gerar HTML
    tbody.innerHTML = rankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.produtiva}</td>
            <td>${item.improdutiva}</td>
            <td><strong>${item.total}</strong></td>
            <td><strong>${item.produtividade}%</strong></td>
        </tr>
    `).join('');
    
    // Atualizar totais
    const totalProdutiva = rankings.reduce((sum, item) => sum + item.produtiva, 0);
    const totalImprodutiva = rankings.reduce((sum, item) => sum + item.improdutiva, 0);
    const totalStatusGeral = totalProdutiva + totalImprodutiva;
    const produtividadeGeral = totalStatusGeral > 0 ? Math.round((totalProdutiva / totalStatusGeral) * 100) : 0;
    
    document.getElementById('totalProdutiva').textContent = totalProdutiva;
    document.getElementById('totalImprodutiva').textContent = totalImprodutiva;
    document.getElementById('totalStatusGeral').textContent = totalStatusGeral;
    document.getElementById('totalProdutividade').textContent = `${produtividadeGeral}%`;
}

// ============= FILTROS =============
function configurarFiltros() {
    console.log('🔍 [DASHBOARD-INTEGRATION] Configurando filtros...');
    
    // Preencher options dos filtros
    preencherFiltros();
}

function preencherFiltros() {
    const dados = dashboardData;
    
    // Projetos
    const projetos = [...new Set(dados.map(item => item['Projeto']).filter(p => p && p.trim()))].sort();
    preencherSelect('infraFilterProjeto', projetos);
    
    // Sub Projetos
    const subProjetos = [...new Set(dados.map(item => item['Sub Projeto']).filter(p => p && p.trim()))].sort();
    preencherSelect('infraFilterSubProjeto', subProjetos);
    
    // Equipes
    const equipes = [...new Set(dados.map(item => item['EQUIPE']).filter(e => e && e.trim()))].sort();
    preencherSelect('infraFilterEquipe', equipes);
    
    // Status
    const status = [...new Set(dados.map(item => item['Status']).filter(s => s && s.trim()))].sort();
    preencherSelect('infraFilterStatus', status);
    
    // Cidades
    const cidades = [...new Set(dados.map(item => item['Cidade']).filter(c => c && c.trim()))].sort();
    preencherSelect('infraFilterCidade', cidades);
    
    // Supervisores
    const supervisores = [...new Set(dados.map(item => item['Supervisor']).filter(s => s && s.trim()))].sort();
    preencherSelect('infraFilterSupervisor', supervisores);
    
    // Tipos de Ação
    const tiposAcao = [...new Set(dados.map(item => item['Tipo de Ação']).filter(t => t && t.trim()))].sort();
    preencherSelect('infraFilterTipoAcao', tiposAcao);
    
    // Condomínios
    const condominios = [...new Set(dados.map(item => item['Condominio']).filter(c => c && c.trim()))].sort();
    preencherSelect('infraFilterCondominio', condominios);
}

function preencherSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Limpar opções existentes (preservar estrutura multiple se existir)
    const wasMultiple = select.hasAttribute('multiple');
    select.innerHTML = '';
    
    // Adicionar atributo multiple se não existir
    if (!wasMultiple) {
        select.setAttribute('multiple', 'multiple');
    }
    
    // Adicionar opções
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    // Inicializar dropdown customizado se ainda não foi inicializado
    setTimeout(() => {
        if (window.initializeMultiSelect && !window.multiSelectInstances[selectId]) {
            window.initializeMultiSelect(select, {
                placeholder: `Selecionar ${getFilterLabel(selectId)}...`,
                searchable: true,
                maxTags: 2,
                closeOnSelect: false,
                showCounter: true
            });
        }
    }, 100);
}

function getFilterLabel(selectId) {
    const labels = {
        'infraFilterProjeto': 'Projetos',
        'infraFilterSubProjeto': 'Sub Projetos', 
        'infraFilterEquipe': 'Equipes',
        'infraFilterStatus': 'Status',
        'infraFilterCidade': 'Cidades',
        'infraFilterSupervisor': 'Supervisores',
        'infraFilterTipoAcao': 'Tipos de Ação',
        'infraFilterCondominio': 'Condomínios'
    };
    return labels[selectId] || 'itens';
}

// ============= APLICAR FILTROS =============
function applyInfraFilters() {
    console.log('🔍 [DASHBOARD-INTEGRATION] Aplicando filtros...');
    
    const filtros = {
        projeto: getSelectValues('infraFilterProjeto'),
        subProjeto: getSelectValues('infraFilterSubProjeto'),
        equipe: getSelectValues('infraFilterEquipe'),
        status: getSelectValues('infraFilterStatus'),
        cidade: getSelectValues('infraFilterCidade'),
        supervisor: getSelectValues('infraFilterSupervisor'),
        tipoAcao: getSelectValues('infraFilterTipoAcao'),
        condominio: getSelectValues('infraFilterCondominio'),
        dataInicio: document.getElementById('infraFilterDataInicio')?.value,
        dataFim: document.getElementById('infraFilterDataFim')?.value
    };
    
    // Filtrar dados
    filteredData = dashboardData.filter(item => {
        // Filtros de select múltiplo
        if (filtros.projeto.length && !filtros.projeto.includes(item['Projeto'])) return false;
        if (filtros.subProjeto.length && !filtros.subProjeto.includes(item['Sub Projeto'])) return false;
        if (filtros.equipe.length && !filtros.equipe.includes(item['EQUIPE'])) return false;
        if (filtros.status.length && !filtros.status.includes(item['Status'])) return false;
        if (filtros.cidade.length && !filtros.cidade.includes(item['Cidade'])) return false;
        if (filtros.supervisor.length && !filtros.supervisor.includes(item['Supervisor'])) return false;
        if (filtros.tipoAcao.length && !filtros.tipoAcao.includes(item['Tipo de Ação'])) return false;
        if (filtros.condominio.length && !filtros.condominio.includes(item['Condominio'])) return false;
        
        // Filtro de data
        if (filtros.dataInicio || filtros.dataFim) {
            const dataRecebimento = item['DATA RECEBIMENTO'];
            if (dataRecebimento) {
                const data = new Date(dataRecebimento);
                if (filtros.dataInicio && data < new Date(filtros.dataInicio)) return false;
                if (filtros.dataFim && data > new Date(filtros.dataFim)) return false;
            }
        }
        
        return true;
    });
    
    // Atualizar dashboard
    atualizarCardsEstatisticos();
    gerarGraficos();
    gerarTabelasRanking();
    
    console.log('✅ [DASHBOARD-INTEGRATION] Filtros aplicados. Resultados:', filteredData.length);
}

function clearInfraFilters() {
    console.log('🧹 [DASHBOARD-INTEGRATION] Limpando filtros...');
    
    // Limpar todos os selects
    const selects = [
        'infraFilterProjeto', 'infraFilterSubProjeto', 'infraFilterEquipe',
        'infraFilterStatus', 'infraFilterCidade', 'infraFilterSupervisor', 
        'infraFilterTipoAcao', 'infraFilterCondominio'
    ];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.selectedIndex = -1;
        }
    });
    
    // Limpar datas
    const dataInicio = document.getElementById('infraFilterDataInicio');
    const dataFim = document.getElementById('infraFilterDataFim');
    if (dataInicio) dataInicio.value = '';
    if (dataFim) dataFim.value = '';
    
    // Resetar dados filtrados
    filteredData = [...dashboardData];
    
    // Atualizar dashboard
    atualizarCardsEstatisticos();
    gerarGraficos();
    gerarTabelasRanking();
}

// ============= FUNÇÕES AUXILIARES =============
function getSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    
    return Array.from(select.selectedOptions).map(option => option.value);
}

function gerarCores(quantidade) {
    const cores = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    
    const resultado = [];
    for (let i = 0; i < quantidade; i++) {
        resultado.push(cores[i % cores.length]);
    }
    
    return resultado;
}

function extrairMesAno(dataString) {
    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return null;
        
        const mes = data.getMonth() + 1;
        const ano = data.getFullYear();
        return `${mes.toString().padStart(2, '0')}/${ano}`;
    } catch (error) {
        return null;
    }
}

// ============= TORNAR FUNÇÕES GLOBAIS =============
window.applyInfraFilters = applyInfraFilters;
window.clearInfraFilters = clearInfraFilters;
window.carregarDadosEnderecos = carregarDadosEnderecos;
window.inicializarDashboard = inicializarDashboard;

console.log('✅ [DASHBOARD-INTEGRATION] Sistema de integração carregado');