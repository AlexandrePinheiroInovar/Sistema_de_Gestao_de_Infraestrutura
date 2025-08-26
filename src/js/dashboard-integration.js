// ============= INTEGRAÇÃO DOS DADOS DO DASHBOARD =============
console.log('📊 [DASHBOARD-INTEGRATION] Inicializando integração dos dados...');

// ============= VARIÁVEIS GLOBAIS =============
let dashboardData = [];
let filteredData = [];
let charts = {};

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [DASHBOARD-INTEGRATION] Configurando sistema...');
    
    // Aguardar Firebase E firebase-table-system carregarem
    setTimeout(() => {
        // Aguardar firebase-table-system estar pronto
        const waitForFirebaseTable = () => {
            if (window.FirebaseTableSystem && window.FirebaseTableSystem.isInitialized) {
                if (window.FirebaseTableSystem.isInitialized()) {
                    console.log('📋 [DASHBOARD-INTEGRATION] FirebaseTableSystem está pronto');
                    inicializarDashboard();
                } else {
                    console.log('⏳ [DASHBOARD-INTEGRATION] Aguardando FirebaseTableSystem...');
                    setTimeout(waitForFirebaseTable, 1000);
                }
            } else {
                console.log('⏳ [DASHBOARD-INTEGRATION] Aguardando FirebaseTableSystem carregar...');
                setTimeout(waitForFirebaseTable, 1000);
            }
        };
        
        waitForFirebaseTable();
    }, 3000);
});

async function inicializarDashboard() {
    try {
        console.log('🚀 [DASHBOARD-INTEGRATION] Carregando dados do dashboard...');
        
        // PRIORIDADE 1: Usar dados do FirebaseTableSystem (dados reais da tabela)
        if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
            const firebaseData = window.FirebaseTableSystem.getData();
            console.log('🔍 [DASHBOARD-INTEGRATION] Dados do FirebaseTableSystem:', firebaseData?.length || 0, 'registros');
            
            if (firebaseData && firebaseData.length > 0) {
                console.log('✅ [DASHBOARD-INTEGRATION] Usando dados reais da tabela:', firebaseData.length, 'registros');
                dashboardData = firebaseData;
                filteredData = [...dashboardData];
            } else {
                console.log('📥 [DASHBOARD-INTEGRATION] Tabela vazia, carregando dados diretamente do Firestore...');
                const dadosCarregados = await carregarDadosEnderecos();
                if (!dadosCarregados || dadosCarregados.length === 0) {
                    console.warn('⚠️ [DASHBOARD-INTEGRATION] Nenhum dado encontrado na coleção');
                    return;
                }
                dashboardData = dadosCarregados;
                filteredData = [...dashboardData];
            }
        } else {
            // Fallback: carregar dados diretamente
            const dadosCarregados = await carregarDadosEnderecos();
            if (!dadosCarregados || dadosCarregados.length === 0) {
                console.warn('⚠️ [DASHBOARD-INTEGRATION] Nenhum dado encontrado na coleção enderecos_mdu');
                return;
            }
        }
        
        console.log('✅ [DASHBOARD-INTEGRATION] Dados carregados com sucesso:', dashboardData.length, 'registros');
        
        // Aguardar um pouco para garantir que os dados estejam disponíveis
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Configurar filtros conectados à tabela de endereços
        configurarFiltros();
        
        // Aguardar dropdowns serem criados e inicializados
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Configurar observador para recarregar filtros quando tabela mudar
        observarMudancasNaTabela();
        
        // Atualizar cards estatísticos
        atualizarCardsEstatisticos();
        
        // Gerar gráficos
        gerarGraficos();
        
        // Gerar tabelas de ranking
        gerarTabelasRanking();
        
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
    console.log('📈 [DASHBOARD-INTEGRATION] Gerando gráficos modernos V3.0...');
    
    // Aguardar Chart.js carregar
    if (typeof Chart === 'undefined') {
        console.warn('⚠️ Chart.js não carregado, reagendando...');
        setTimeout(gerarGraficos, 500);
        return;
    }
    
    // Verificar se ChartDataLabels está disponível
    if (typeof ChartDataLabels === 'undefined') {
        console.warn('⚠️ ChartDataLabels não carregado, carregando graficos sem rótulos...');
    }
    
    // Destruir todos os gráficos existentes primeiro
    Object.values(charts).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    
    // Recriar todos os gráficos modernos
    criarGraficoProjetosModerno();
    criarGraficoSubProjetosModerno();
    criarGraficoCidadesModerno();
    criarGraficoHPProjetosModerno();
    criarGraficoRecebimentosModerno();
    criarGraficoSupervisorModerno();
}

// ============= GRÁFICOS MODERNOS V3.0 =============
function criarGraficoProjetosModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de Projetos Moderno (Barras + Linhas)...');
    
    const ctx = document.getElementById('projetosChart');
    if (!ctx) {
        console.warn('❌ Canvas projetosChart não encontrado');
        return;
    }
    
    // Contar projetos usando mapeamento correto dos campos
    const contadorProjetos = {};
    filteredData.forEach(item => {
        // Usar o mapeamento correto dos campos do Firestore
        const projeto = item['Projeto'] || item['projeto'] || 'Não especificado';
        contadorProjetos[projeto] = (contadorProjetos[projeto] || 0) + 1;
    });
    
    const labels = Object.keys(contadorProjetos);
    const data = Object.values(contadorProjetos);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    // Destruir gráfico anterior
    if (charts.projetos) {
        charts.projetos.destroy();
    }
    
    // Criar gráfico combinado moderno
    charts.projetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                    pointBorderColor: 'rgba(239, 68, 68, 1)',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Projetos'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade',
                        color: 'rgba(59, 130, 246, 1)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        color: 'rgba(239, 68, 68, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    formatter: function(value, context) {
                        if (context.datasetIndex === 0) {
                            return value; // Quantidade
                        } else {
                            return value + '%'; // Percentual
                        }
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: function(context) {
                        return context.datasetIndex === 0 ? '#1e40af' : '#dc2626';
                    }
                }
            }
        },
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
    });
    
    console.log('✅ Gráfico de Projetos Moderno criado');
}

function criarGraficoSubProjetosModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de Sub-Projetos Moderno (Barras + Linhas)...');
    
    const ctx = document.getElementById('subProjetosChart');
    if (!ctx) {
        console.warn('❌ Canvas subProjetosChart não encontrado');
        return;
    }
    
    // Contar sub projetos usando mapeamento correto dos campos
    const contadorSubProjetos = {};
    filteredData.forEach(item => {
        // Usar o mapeamento correto dos campos do Firestore
        const subProjeto = item['Sub Projeto'] || item['subProjeto'] || 'Não especificado';
        contadorSubProjetos[subProjeto] = (contadorSubProjetos[subProjeto] || 0) + 1;
    });
    
    const labels = Object.keys(contadorSubProjetos);
    const data = Object.values(contadorSubProjetos);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    // Destruir gráfico anterior
    if (charts.subProjetos) {
        charts.subProjetos.destroy();
    }
    
    // Criar gráfico combinado moderno
    charts.subProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    pointBorderColor: 'rgba(245, 158, 11, 1)',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Sub-Projetos'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade',
                        color: 'rgba(16, 185, 129, 1)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        color: 'rgba(245, 158, 11, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    formatter: function(value, context) {
                        if (context.datasetIndex === 0) {
                            return value; // Quantidade
                        } else {
                            return value + '%'; // Percentual
                        }
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: function(context) {
                        return context.datasetIndex === 0 ? '#059669' : '#d97706';
                    }
                }
            }
        },
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
    });
    
    console.log('✅ Gráfico de Sub-Projetos Moderno criado');
}

function criarGraficoCidadesModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de Cidades Moderno (Barras Azuis)...');
    
    const ctx = document.getElementById('cidadesChart');
    if (!ctx) {
        console.warn('❌ Canvas cidadesChart não encontrado');
        return;
    }
    
    // Contar cidades usando mapeamento correto dos campos
    const contadorCidades = {};
    filteredData.forEach(item => {
        // Usar o mapeamento correto dos campos do Firestore
        const cidade = item['Cidade'] || item['cidade'] || 'Não especificado';
        contadorCidades[cidade] = (contadorCidades[cidade] || 0) + 1;
    });
    
    // Ordenar por quantidade e limitar a 15 principais
    const sortedCidades = Object.entries(contadorCidades)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);
    
    // Agrupar o resto em "Outras"
    const remainingCidades = Object.entries(contadorCidades)
        .sort(([,a], [,b]) => b - a)
        .slice(15);
    
    if (remainingCidades.length > 0) {
        const outrasQuantidade = remainingCidades.reduce((sum, [,qty]) => sum + qty, 0);
        sortedCidades.push([`Outras (${remainingCidades.length})`, outrasQuantidade]);
    }
    
    const labels = sortedCidades.map(([nome]) => nome);
    const data = sortedCidades.map(([,qty]) => qty);
    
    // Destruir gráfico anterior
    if (charts.cidades) {
        charts.cidades.destroy();
    }
    
    // Criar gráfico moderno com barras azuis uniformes
    charts.cidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade por Cidade',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    formatter: function(value) {
                        return value;
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: '#1e40af'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Cidades'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        callback: function(value) {
                            if (Math.floor(value) === value) {
                                return value;
                            }
                        }
                    }
                }
            }
        },
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
    });
    
    console.log('✅ Gráfico de Cidades Moderno criado');
}

function criarGraficoHPProjetosModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de HP por Projeto Moderno (Barras Azuis)...');
    
    const ctx = document.getElementById('hpProjetosChart');
    if (!ctx) {
        console.warn('❌ Canvas hpProjetosChart não encontrado');
        return;
    }
    
    // Somar HP por projeto usando mapeamento correto dos campos
    const hpPorProjeto = {};
    filteredData.forEach(item => {
        // Usar o mapeamento correto dos campos do Firestore
        const projeto = item['Projeto'] || item['projeto'] || 'Não especificado';
        const hp = parseInt(item['HP'] || item['hp'] || 0) || 0;
        hpPorProjeto[projeto] = (hpPorProjeto[projeto] || 0) + hp;
    });
    
    const labels = Object.keys(hpPorProjeto);
    const data = Object.values(hpPorProjeto);
    
    // Destruir gráfico anterior
    if (charts.hpProjetos) {
        charts.hpProjetos.destroy();
    }
    
    // Criar gráfico moderno com barras azuis uniformes
    charts.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total HP',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    formatter: function(value) {
                        return value;
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: '#1e40af'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Projetos'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total HP'
                    }
                }
            }
        },
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
    });
    
    console.log('✅ Gráfico de HP por Projeto Moderno criado');
}

function criarGraficoRecebimentosModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de Recebimentos Moderno...');
    
    const ctx = document.getElementById('recebimentosChart');
    if (!ctx) {
        console.warn('❌ Canvas recebimentosChart não encontrado');
        return;
    }
    
    // Agrupar por mês
    const recebimentosPorMes = {};
    const conclusoesPorMes = {};
    
    filteredData.forEach(item => {
        // Recebimentos - usar mapeamento correto dos campos
        const dataRecebimento = item['DATA RECEBIMENTO'] || item['dataRecebimento'];
        if (dataRecebimento) {
            let mes = null;
            if (typeof dataRecebimento === 'number') {
                // Converter número do Excel para data
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + dataRecebimento * 24 * 60 * 60 * 1000);
                mes = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            } else if (typeof dataRecebimento === 'string' && dataRecebimento.trim()) {
                mes = extrairMesAno(dataRecebimento);
            }
            if (mes) {
                recebimentosPorMes[mes] = (recebimentosPorMes[mes] || 0) + 1;
            }
        }
        
        // Conclusões - usar mapeamento correto dos campos
        const dataFinal = item['DATA FINAL'] || item['dataFinal'];
        if (dataFinal) {
            let mes = null;
            if (typeof dataFinal === 'number') {
                // Converter número do Excel para data
                const excelEpoch = new Date(1899, 11, 30);
                const date = new Date(excelEpoch.getTime() + dataFinal * 24 * 60 * 60 * 1000);
                mes = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            } else if (typeof dataFinal === 'string' && dataFinal.trim()) {
                mes = extrairMesAno(dataFinal);
            }
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
    
    // Destruir gráfico anterior
    if (charts.recebimentos) {
        charts.recebimentos.destroy();
    }
    
    // Criar gráfico moderno
    charts.recebimentos = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Recebidos',
                data: dataRecebimentos,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: 'rgba(59, 130, 246, 1)',
                pointRadius: 5,
                tension: 0.4
            }, {
                label: 'Concluídos',
                data: dataConclusoes,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                pointBorderColor: 'rgba(16, 185, 129, 1)',
                pointRadius: 5,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Período (Mês/Ano)'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        callback: function(value) {
                            if (Math.floor(value) === value) {
                                return value;
                            }
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Recebimentos Moderno criado');
}

function criarGraficoSupervisorModerno() {
    console.log('📊 [DASHBOARD-INTEGRATION] Criando gráfico de Supervisores Moderno (2 Barras Separadas)...');
    
    const ctx = document.getElementById('supervisorStatusChart');
    if (!ctx) {
        console.warn('❌ Canvas supervisorStatusChart não encontrado');
        return;
    }
    
    // Agrupar por supervisor e status
    const supervisorStatus = {};
    
    filteredData.forEach(item => {
        // Usar mapeamento correto dos campos do Firestore
        const supervisor = item['Supervisor'] || item['supervisor'] || 'Não especificado';
        const status = item['Status'] || item['status'] || 'Não especificado';
        
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
    
    // Destruir gráfico anterior
    if (charts.supervisorStatus) {
        charts.supervisorStatus.destroy();
    }
    
    // Criar gráfico moderno com 2 barras separadas por supervisor
    charts.supervisorStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: supervisores,
            datasets: [{
                label: 'Produtiva',
                data: produtivas,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2
            }, {
                label: 'Improdutiva',
                data: improdutivas,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    formatter: function(value) {
                        return value > 0 ? value : '';
                    },
                    font: {
                        weight: 'bold',
                        size: 10
                    },
                    color: function(context) {
                        return context.datasetIndex === 0 ? '#065f46' : '#991b1b';
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Supervisores'
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        },
        plugins: typeof ChartDataLabels !== 'undefined' ? [ChartDataLabels] : []
    });
    
    console.log('✅ Gráfico de Supervisores Moderno criado');
}

// ============= FINAL DOS GRÁFICOS MODERNOS =============

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
    
    // Limitar a 50 equipes principais para evitar sobrecarga
    const topRankings = rankings.slice(0, 50);
    
    // Adicionar nota se há mais dados
    const moreDataNote = rankings.length > 50 ? 
        `<tr class="info-row"><td colspan="6" style="text-align: center; font-style: italic; color: #666; padding: 10px;">
            📊 Mostrando top 50 de ${rankings.length} equipes
        </td></tr>` : '';
    
    // Gerar HTML
    tbody.innerHTML = topRankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.ativacao}</td>
            <td>${item.construcao}</td>
            <td>${item.vistoria}</td>
            <td><strong>${item.total}</strong></td>
        </tr>
    `).join('') + moreDataNote;
    
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
    
    // Limitar a 50 equipes principais para evitar sobrecarga
    const topRankings = rankings.slice(0, 50);
    
    // Adicionar nota se há mais dados
    const moreDataNote = rankings.length > 50 ? 
        `<tr class="info-row"><td colspan="6" style="text-align: center; font-style: italic; color: #666; padding: 10px;">
            📊 Mostrando top 50 de ${rankings.length} equipes
        </td></tr>` : '';
    
    // Gerar HTML
    tbody.innerHTML = topRankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.produtiva}</td>
            <td>${item.improdutiva}</td>
            <td><strong>${item.total}</strong></td>
            <td><strong>${item.produtividade}%</strong></td>
        </tr>
    `).join('') + moreDataNote;
    
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

// ============= NOVO SISTEMA DE FILTROS =============
function configurarFiltros() {
    console.log('🔍 [NOVO-FILTRO] Configurando novo sistema de filtros...');
    
    // Buscar dados diretamente da tabela de endereços no DOM
    const dados = extrairDadosDaTabelaEndereco();
    
    if (!dados || dados.length === 0) {
        console.warn('⚠️ [NOVO-FILTRO] Nenhum dado encontrado na tabela de endereços');
        // NÃO fazer loop infinito - aguardar firebase-table-system carregar
        if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
            const firebaseData = window.FirebaseTableSystem.getData();
            if (firebaseData && firebaseData.length > 0) {
                console.log('📊 [NOVO-FILTRO] Usando dados do FirebaseTableSystem:', firebaseData.length, 'registros');
                preencherNovosFiltros(firebaseData);
                return;
            }
        }
        
        // Fallback: usar dados do dashboard se disponível
        if (dashboardData && dashboardData.length > 0) {
            console.log('📊 [NOVO-FILTRO] Usando dados do dashboard:', dashboardData.length, 'registros');
            preencherNovosFiltros(dashboardData);
        }
        return;
    }
    
    console.log('✅ [NOVO-FILTRO] Dados extraídos da tabela:', dados.length, 'registros');
    console.log('📊 [NOVO-FILTRO] Exemplo de dados:', dados[0]);
    
    // Preencher filtros com dados da tabela
    preencherNovosFiltros(dados);
}

function extrairDadosDaTabelaEndereco() {
    const tabela = document.getElementById('enderecoMainTable');
    if (!tabela) {
        console.warn('⚠️ [NOVO-FILTRO] Tabela de endereços não encontrada');
        return [];
    }
    
    const tbody = tabela.querySelector('#enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [NOVO-FILTRO] Tbody da tabela não encontrado');
        return [];
    }
    
    const linhas = tbody.querySelectorAll('tr:not(.empty-state)');
    if (linhas.length === 0) {
        console.warn('⚠️ [NOVO-FILTRO] Nenhuma linha de dados encontrada na tabela');
        return [];
    }
    
    const dados = [];
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 25) {
            dados.push({
                'Projeto': colunas[0]?.textContent?.trim() || '',
                'Sub Projeto': colunas[1]?.textContent?.trim() || '',
                'Tipo de Ação': colunas[2]?.textContent?.trim() || '',
                'CONTRATO': colunas[3]?.textContent?.trim() || '',
                'Condominio': colunas[4]?.textContent?.trim() || '',
                'ENDEREÇO': colunas[5]?.textContent?.trim() || '',
                'Cidade': colunas[6]?.textContent?.trim() || '',
                'PEP': colunas[7]?.textContent?.trim() || '',
                'COD IMOVEL GED': colunas[8]?.textContent?.trim() || '',
                'NODE GERENCIAL': colunas[9]?.textContent?.trim() || '',
                'Área Técnica': colunas[10]?.textContent?.trim() || '',
                'HP': colunas[11]?.textContent?.trim() || '',
                'ANDAR': colunas[12]?.textContent?.trim() || '',
                'DATA RECEBIMENTO': colunas[13]?.textContent?.trim() || '',
                'DATA INICIO': colunas[14]?.textContent?.trim() || '',
                'DATA FINAL': colunas[15]?.textContent?.trim() || '',
                'EQUIPE': colunas[16]?.textContent?.trim() || '',
                'Supervisor': colunas[17]?.textContent?.trim() || '',
                'Status': colunas[18]?.textContent?.trim() || '',
                'RDO': colunas[19]?.textContent?.trim() || '',
                'BOOK': colunas[20]?.textContent?.trim() || '',
                'PROJETO': colunas[21]?.textContent?.trim() || '',
                'JUSTIFICATIVA': colunas[22]?.textContent?.trim() || '',
                'Observação': colunas[23]?.textContent?.trim() || '',
                'Observação2': colunas[24]?.textContent?.trim() || ''
            });
        }
    });
    
    return dados;
}

function preencherNovosFiltros(dados) {
    console.log('📝 [NOVO-FILTRO] Preenchendo filtros com dados da tabela');
    
    // Projetos
    const projetos = [...new Set(dados.map(item => item['Projeto']).filter(p => p))].sort();
    criarNovoDropdown('infraFilterProjeto', projetos, 'Projetos');
    
    // Sub Projetos
    const subProjetos = [...new Set(dados.map(item => item['Sub Projeto']).filter(p => p))].sort();
    criarNovoDropdown('infraFilterSubProjeto', subProjetos, 'Sub-Projetos');
    
    // Equipes
    const equipes = [...new Set(dados.map(item => item['EQUIPE']).filter(e => e))].sort();
    criarNovoDropdown('infraFilterEquipe', equipes, 'Equipes');
    
    // Status
    const status = [...new Set(dados.map(item => item['Status']).filter(s => s))].sort();
    criarNovoDropdown('infraFilterStatus', status, 'Status');
    
    // Cidades
    const cidades = [...new Set(dados.map(item => item['Cidade']).filter(c => c))].sort();
    criarNovoDropdown('infraFilterCidade', cidades, 'Cidades');
    
    // Supervisores
    const supervisores = [...new Set(dados.map(item => item['Supervisor']).filter(s => s))].sort();
    criarNovoDropdown('infraFilterSupervisor', supervisores, 'Supervisores');
    
    // Tipos de Ação
    const tiposAcao = [...new Set(dados.map(item => item['Tipo de Ação']).filter(t => t))].sort();
    criarNovoDropdown('infraFilterTipoAcao', tiposAcao, 'Tipos de Ação');
    
    // Condomínios
    const condominios = [...new Set(dados.map(item => item['Condominio']).filter(c => c))].sort();
    criarNovoDropdown('infraFilterCondominio', condominios, 'Condomínios');
}

function criarNovoDropdown(selectId, options, label) {
    const select = document.getElementById(selectId);
    if (!select) {
        console.warn(`⚠️ [NOVO-FILTRO] Select não encontrado: ${selectId}`);
        return;
    }
    
    console.log(`📝 [NOVO-FILTRO] Criando ${label} com ${options.length} opções:`, options.slice(0, 5));
    
    // Destruir instância anterior se existir
    if (window.multiSelectInstances && window.multiSelectInstances[selectId]) {
        window.multiSelectInstances[selectId].destroy();
        delete window.multiSelectInstances[selectId];
    }
    
    // Limpar e recriar o select
    select.innerHTML = '';
    select.setAttribute('multiple', 'multiple');
    
    // Adicionar opções
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
    
    // Criar nova instância do dropdown com z-index forçado
    setTimeout(() => {
        if (window.initializeMultiSelect) {
            window.initializeMultiSelect(select, {
                placeholder: `Selecionar ${label}...`,
                searchable: true,
                maxTags: 2,
                closeOnSelect: false,
                showCounter: true
            });
            
            // Forçar z-index alto após criação
            setTimeout(() => {
                const dropdown = document.getElementById(`${selectId}_dropdown`);
                if (dropdown) {
                    dropdown.style.zIndex = '999999999';
                    dropdown.style.position = 'relative';
                    
                    const content = dropdown.querySelector('.checkbox-dropdown-content');
                    if (content) {
                        content.style.zIndex = '999999999999';
                        content.style.position = 'absolute';
                        content.style.background = 'white';
                        content.style.color = '#000000';
                        
                        // Forçar cor preta para todos os elementos dentro
                        const items = content.querySelectorAll('*');
                        items.forEach(item => {
                            item.style.color = '#000000';
                        });
                    }
                    
                    // Adicionar evento para forçar z-index quando abrir
                    dropdown.addEventListener('click', () => {
                        setTimeout(() => {
                            dropdown.style.zIndex = '999999999999';
                            if (content) {
                                content.style.zIndex = '999999999999';
                            }
                        }, 10);
                    });
                }
            }, 100);
            
            console.log(`✅ [NOVO-FILTRO] ${label} criado com ${options.length} opções`);
        }
    }, 200);
}

// ============= OBSERVADOR DE MUDANÇAS NA TABELA =============
function observarMudancasNaTabela() {
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) return;
    
    console.log('👁️ [NOVO-FILTRO] Configurando observador de mudanças na tabela');
    
    // Observar mudanças no conteúdo da tabela
    const observer = new MutationObserver((mutations) => {
        let tabelaMudou = false;
        
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                tabelaMudou = true;
            }
        });
        
        if (tabelaMudou) {
            console.log('🔄 [NOVO-FILTRO] Tabela modificada, recarregando filtros...');
            setTimeout(() => configurarFiltros(), 1000);
        }
    });
    
    // Configurar observador
    observer.observe(tbody, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// Função global para recarregar filtros manualmente
window.recarregarFiltrosDashboard = function() {
    console.log('🔄 [NOVO-FILTRO] Recarregando filtros manualmente...');
    configurarFiltros();
};

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
// REMOVIDO window.applyInfraFilters - definido em firebase-table-system.js para evitar conflito
window.clearInfraFilters = clearInfraFilters;
window.carregarDadosEnderecos = carregarDadosEnderecos;
window.inicializarDashboard = inicializarDashboard;

console.log('✅ [DASHBOARD-INTEGRATION] Sistema de integração carregado');