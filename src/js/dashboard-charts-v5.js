// ============= SISTEMA DE GRÁFICOS DO DASHBOARD V5.0 =============
// ARQUIVO INDEPENDENTE - NÃO MODIFICA OUTROS MÓDULOS
console.log('📊 [DASHBOARD-CHARTS-V5] Inicializando sistema de gráficos do dashboard...');

// ============= OBJETO PARA ARMAZENAR GRÁFICOS =============
const dashboardChartsV5 = {};

// ============= AGUARDAR DADOS DA TABELA =============
async function aguardarDadosTabela() {
    let tentativas = 0;
    const maxTentativas = 50; // 25 segundos
    
    while (tentativas < maxTentativas) {
        // Verificar se o sistema Firebase Table está carregado e tem dados
        if (window.FirebaseTableSystem && 
            typeof window.FirebaseTableSystem.getData === 'function') {
            const dados = window.FirebaseTableSystem.getData();
            if (dados && dados.length > 0) {
                console.log('✅ [DASHBOARD-CHARTS-V5] Dados encontrados:', dados.length, 'registros');
                return dados;
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        tentativas++;
    }
    
    console.warn('⚠️ [DASHBOARD-CHARTS-V5] Timeout aguardando dados');
    return [];
}

// ============= FUNÇÃO PRINCIPAL PARA CRIAR TODOS OS GRÁFICOS =============
async function criarTodosGraficos() {
    console.log('🎨 [DASHBOARD-CHARTS-V5] === CRIANDO TODOS OS GRÁFICOS ===');
    
    try {
        // Aguardar Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [DASHBOARD-CHARTS-V5] Aguardando Chart.js...');
            setTimeout(criarTodosGraficos, 500);
            return;
        }
        
        // Obter dados da tabela
        const dados = await aguardarDadosTabela();
        if (!dados || dados.length === 0) {
            console.warn('⚠️ [DASHBOARD-CHARTS-V5] Nenhum dado disponível');
            return;
        }
        
        console.log('📊 [DASHBOARD-CHARTS-V5] Criando gráficos com', dados.length, 'registros');
        console.log('📊 [DASHBOARD-CHARTS-V5] Exemplo de registro:', dados[0]);
        
        // Limpar gráficos existentes
        Object.values(dashboardChartsV5).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Criar todos os 8 gráficos
        criarGrafico1_AnaliseProjetosV5(dados);
        criarGrafico2_AnaliseSubProjetosV5(dados);
        criarGrafico3_AnaliseCidadesV5(dados);
        criarGrafico4_AnaliseHPProjetosV5(dados);
        criarGrafico5_AnaliseRecebimentosV5(dados);
        criarGrafico6_AnaliseEnderecosSupervisorV5(dados);
        criarRanking1_EquipesTipoAcaoV5(dados);
        criarRanking2_EquipesStatusV5(dados);
        
        console.log('✅ [DASHBOARD-CHARTS-V5] Todos os gráficos criados com sucesso!');
        
    } catch (error) {
        console.error('❌ [DASHBOARD-CHARTS-V5] Erro:', error);
    }
}

// ============= UTILITÁRIOS PARA MAPEAR CAMPOS =============
function obterCampo(item, campo) {
    // Mapear nomes de campos da tabela
    const mapeamento = {
        'projeto': item['Projeto'] || item['projeto'] || '',
        'subProjeto': item['Sub Projeto'] || item['subProjeto'] || '',
        'cidade': item['Cidade'] || item['cidade'] || '',
        'hp': item['HP'] || item['hp'] || '',
        'dataRecebimento': item['DATA RECEBIMENTO'] || item['dataRecebimento'] || '',
        'dataFinal': item['DATA FINAL'] || item['dataFinal'] || '',
        'supervisor': item['Supervisor'] || item['supervisor'] || '',
        'equipe': item['EQUIPE'] || item['equipe'] || '',
        'status': item['Status'] || item['status'] || '',
        'tipoAcao': item['Tipo de Ação'] || item['tipoAcao'] || ''
    };
    
    return mapeamento[campo] || '';
}

// ============= CORES AZUIS PADRÃO =============
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

// ============= 1. ANÁLISE DE PROJETOS (Barras + Linha) =============
function criarGrafico1_AnaliseProjetosV5(dados) {
    console.log('📊 [GRÁFICO-1] Criando Análise de Projetos...');
    
    const canvas = document.getElementById('projetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas projetosChart não encontrado');
        return;
    }
    
    // Processar dados
    const contadorProjetos = {};
    dados.forEach(item => {
        const projeto = obterCampo(item, 'projeto') || 'Não especificado';
        contadorProjetos[projeto] = (contadorProjetos[projeto] || 0) + 1;
    });
    
    // Top 10 projetos
    const entries = Object.entries(contadorProjetos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.projetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: coresAzuis.principal,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: coresAzuis.clara,
                    borderColor: coresAzuis.linha,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: coresAzuis.linha,
                    pointBorderColor: coresAzuis.linha,
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
                        color: coresAzuis.borda
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
                        color: coresAzuis.linha
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
                title: {
                    display: true,
                    text: 'Análise de Projetos'
                }
            }
        }
    });
    
    console.log('✅ [GRÁFICO-1] Análise de Projetos criado');
}

// ============= 2. ANÁLISE DE SUB PROJETOS (Barras + Linha) =============
function criarGrafico2_AnaliseSubProjetosV5(dados) {
    console.log('📊 [GRÁFICO-2] Criando Análise de Sub Projetos...');
    
    const canvas = document.getElementById('subProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas subProjetosChart não encontrado');
        return;
    }
    
    // Processar dados
    const contadorSubProjetos = {};
    dados.forEach(item => {
        const subProjeto = obterCampo(item, 'subProjeto') || 'Não especificado';
        contadorSubProjetos[subProjeto] = (contadorSubProjetos[subProjeto] || 0) + 1;
    });
    
    // Top 10 sub projetos
    const entries = Object.entries(contadorSubProjetos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.subProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: coresAzuis.secundaria,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: coresAzuis.clara,
                    borderColor: coresAzuis.linha,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: coresAzuis.linha,
                    pointBorderColor: coresAzuis.linha,
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
                        color: coresAzuis.borda
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
                        color: coresAzuis.linha
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
                title: {
                    display: true,
                    text: 'Análise de Sub Projetos'
                }
            }
        }
    });
    
    console.log('✅ [GRÁFICO-2] Análise de Sub Projetos criado');
}

// ============= 3. ANÁLISE DE CIDADES (Pizza) =============
function criarGrafico3_AnaliseCidadesV5(dados) {
    console.log('📊 [GRÁFICO-3] Criando Análise de Cidades...');
    
    const canvas = document.getElementById('cidadesChart');
    if (!canvas) {
        console.warn('⚠️ Canvas cidadesChart não encontrado');
        return;
    }
    
    // Processar dados
    const contadorCidades = {};
    dados.forEach(item => {
        const cidade = obterCampo(item, 'cidade') || 'Não especificado';
        contadorCidades[cidade] = (contadorCidades[cidade] || 0) + 1;
    });
    
    // Top 8 cidades
    const entries = Object.entries(contadorCidades)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.cidades = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: coresAzuis.gradiente,
                borderColor: coresAzuis.gradiente.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Cidades'
                }
            }
        }
    });
    
    console.log('✅ [GRÁFICO-3] Análise de Cidades criado');
}

// ============= 4. ANÁLISE DE HP POR PROJETO (Barras Horizontais) =============
function criarGrafico4_AnaliseHPProjetosV5(dados) {
    console.log('📊 [GRÁFICO-4] Criando Análise de HP por Projetos...');
    
    const canvas = document.getElementById('hpProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas hpProjetosChart não encontrado');
        return;
    }
    
    // Processar dados
    const contadorHP = {};
    dados.forEach(item => {
        const projeto = obterCampo(item, 'projeto') || 'Não especificado';
        const hp = obterCampo(item, 'hp') || 'Não especificado';
        const key = `${projeto} - ${hp}`;
        contadorHP[key] = (contadorHP[key] || 0) + 1;
    });
    
    // Top 10 HP/Projetos
    const entries = Object.entries(contadorHP)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome.length > 30 ? nome.substring(0, 30) + '...' : nome);
    const data = entries.map(([,count]) => count);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade de HP',
                data: data,
                backgroundColor: coresAzuis.escura,
                borderColor: coresAzuis.borda,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y', // Barras horizontais
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Projetos/HP'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Análise de HP por Projeto'
                }
            }
        }
    });
    
    console.log('✅ [GRÁFICO-4] Análise de HP por Projetos criado');
}

// ============= 5. ANÁLISE DE RECEBIMENTOS E CONCLUSÕES (Barras + Linha) =============
function criarGrafico5_AnaliseRecebimentosV5(dados) {
    console.log('📊 [GRÁFICO-5] Criando Análise de Recebimentos e Conclusões...');
    
    const canvas = document.getElementById('recebimentosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas recebimentosChart não encontrado');
        return;
    }
    
    // Processar dados mensais
    const dadosMensais = {};
    dados.forEach(item => {
        const dataRecebimento = obterCampo(item, 'dataRecebimento');
        const dataFinal = obterCampo(item, 'dataFinal');
        
        if (dataRecebimento) {
            const mes = dataRecebimento.substring(0, 7); // YYYY-MM
            if (!dadosMensais[mes]) {
                dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
            }
            dadosMensais[mes].recebidos++;
        }
        
        if (dataFinal) {
            const mes = dataFinal.substring(0, 7); // YYYY-MM
            if (!dadosMensais[mes]) {
                dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
            }
            dadosMensais[mes].concluidos++;
        }
    });
    
    // Últimos 12 meses
    const mesesOrdenados = Object.keys(dadosMensais).sort().slice(-12);
    const labels = mesesOrdenados.map(mes => {
        const [ano, mesNum] = mes.split('-');
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${nomesMeses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
    });
    
    const dadosRecebidos = mesesOrdenados.map(mes => dadosMensais[mes]?.recebidos || 0);
    const dadosConcluidos = mesesOrdenados.map(mes => dadosMensais[mes]?.concluidos || 0);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.recebimentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Recebidos',
                    data: dadosRecebidos,
                    backgroundColor: coresAzuis.principal,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                },
                {
                    type: 'line',
                    label: 'Concluídos',
                    data: dadosConcluidos,
                    backgroundColor: coresAzuis.clara,
                    borderColor: coresAzuis.linha,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    pointBackgroundColor: coresAzuis.linha,
                    pointBorderColor: coresAzuis.linha,
                    pointRadius: 4
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
                        text: 'Período'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Recebimentos e Conclusões'
                }
            }
        }
    });
    
    console.log('✅ [GRÁFICO-5] Análise de Recebimentos e Conclusões criado');
}

// ============= 6. ANÁLISE DE ENDEREÇOS POR SUPERVISOR (Barras Agrupadas) =============
function criarGrafico6_AnaliseEnderecosSupervisorV5(dados) {
    console.log('📊 [GRÁFICO-6] Criando Análise de Endereços por Supervisor...');
    
    const canvas = document.getElementById('supervisorStatusChart');
    if (!canvas) {
        console.warn('⚠️ Canvas supervisorStatusChart não encontrado');
        return;
    }
    
    // Processar dados de supervisores por status
    const supervisorData = {};
    dados.forEach(item => {
        const supervisor = obterCampo(item, 'supervisor') || 'Não especificado';
        const status = obterCampo(item, 'status') || 'Não especificado';
        
        if (!supervisorData[supervisor]) {
            supervisorData[supervisor] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase().includes('PRODUTIVA')) {
            supervisorData[supervisor].PRODUTIVA++;
        } else if (status.toUpperCase().includes('IMPRODUTIVA')) {
            supervisorData[supervisor].IMPRODUTIVA++;
        } else {
            // Classificar como produtiva por padrão
            supervisorData[supervisor].PRODUTIVA++;
        }
    });
    
    // Top 10 supervisores
    const supervisores = Object.entries(supervisorData)
        .map(([nome, stats]) => ({
            nome,
            produtiva: stats.PRODUTIVA,
            improdutiva: stats.IMPRODUTIVA,
            total: stats.PRODUTIVA + stats.IMPRODUTIVA
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const labels = supervisores.map(s => s.nome.length > 15 ? s.nome.substring(0, 15) + '...' : s.nome);
    const dadosProdutiva = supervisores.map(s => s.produtiva);
    const dadosImprodutiva = supervisores.map(s => s.improdutiva);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.supervisorStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Produtiva',
                    data: dadosProdutiva,
                    backgroundColor: coresAzuis.principal,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                },
                {
                    label: 'Improdutiva',
                    data: dadosImprodutiva,
                    backgroundColor: coresAzuis.secundaria,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Endereços por Supervisor'
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
        }
    });
    
    console.log('✅ [GRÁFICO-6] Análise de Endereços por Supervisor criado');
}

// ============= 7. RANKING DAS EQUIPES POR TIPO DE AÇÃO =============
function criarRanking1_EquipesTipoAcaoV5(dados) {
    console.log('🏆 [RANKING-1] Criando Ranking das Equipes por Tipo de Ação...');
    
    const tbody = document.getElementById('equipeRankingTableBody');
    if (!tbody) {
        console.warn('⚠️ Tabela equipeRankingTableBody não encontrada');
        return;
    }
    
    // Processar dados
    const equipeStats = {};
    dados.forEach(item => {
        const equipe = obterCampo(item, 'equipe') || 'Não especificado';
        const tipoAcao = obterCampo(item, 'tipoAcao') || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { ATIVAÇÃO: 0, CONSTRUÇÃO: 0, VISTORIA: 0 };
        }
        
        const tipo = tipoAcao.toUpperCase();
        if (tipo.includes('ATIVAÇÃO') || tipo.includes('ATIVACAO')) {
            equipeStats[equipe].ATIVAÇÃO++;
        } else if (tipo.includes('CONSTRUÇÃO') || tipo.includes('CONSTRUCAO')) {
            equipeStats[equipe].CONSTRUÇÃO++;
        } else if (tipo.includes('VISTORIA')) {
            equipeStats[equipe].VISTORIA++;
        } else {
            // Outras ações na categoria ATIVAÇÃO
            equipeStats[equipe].ATIVAÇÃO++;
        }
    });
    
    // Ranquear equipes
    const rankings = Object.entries(equipeStats).map(([equipe, stats]) => ({
        equipe,
        ativacao: stats.ATIVAÇÃO,
        construcao: stats.CONSTRUÇÃO,
        vistoria: stats.VISTORIA,
        total: stats.ATIVAÇÃO + stats.CONSTRUÇÃO + stats.VISTORIA
    })).sort((a, b) => b.total - a.total);
    
    // Limitar a top 50
    const topRankings = rankings.slice(0, 50);
    
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
    
    console.log('✅ [RANKING-1] Ranking das Equipes por Tipo de Ação criado');
}

// ============= 8. RANKING DAS EQUIPES POR STATUS =============
function criarRanking2_EquipesStatusV5(dados) {
    console.log('🏆 [RANKING-2] Criando Ranking das Equipes por Status...');
    
    const tbody = document.getElementById('equipeStatusRankingTableBody');
    if (!tbody) {
        console.warn('⚠️ Tabela equipeStatusRankingTableBody não encontrada');
        return;
    }
    
    // Processar dados
    const equipeStats = {};
    dados.forEach(item => {
        const equipe = obterCampo(item, 'equipe') || 'Não especificado';
        const status = obterCampo(item, 'status') || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase().includes('PRODUTIVA')) {
            equipeStats[equipe].PRODUTIVA++;
        } else if (status.toUpperCase().includes('IMPRODUTIVA')) {
            equipeStats[equipe].IMPRODUTIVA++;
        } else {
            // Classificar como produtiva por padrão
            equipeStats[equipe].PRODUTIVA++;
        }
    });
    
    // Calcular produtividade
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
    
    // Limitar a top 50
    const topRankings = rankings.slice(0, 50);
    
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
    
    console.log('✅ [RANKING-2] Ranking das Equipes por Status criado');
}

// ============= FUNÇÃO GLOBAL PARA TESTE =============
window.criarGraficosV5 = criarTodosGraficos;
window.dashboardChartsV5 = dashboardChartsV5;

// ============= INICIALIZAÇÃO AUTOMÁTICA =============
// Aguardar DOM e dependências carregarem
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 [DASHBOARD-CHARTS-V5] DOM carregado, aguardando dependências...');
    
    // Aguardar um pouco e tentar criar os gráficos
    setTimeout(() => {
        criarTodosGraficos();
    }, 2000);
});

// Também tentar quando a página carregar completamente
window.addEventListener('load', function() {
    console.log('📊 [DASHBOARD-CHARTS-V5] Página carregada, tentando criar gráficos...');
    
    setTimeout(() => {
        criarTodosGraficos();
    }, 1000);
});

console.log('✅ [DASHBOARD-CHARTS-V5] Sistema de gráficos V5 carregado');
console.log('🧪 [DASHBOARD-CHARTS-V5] Para testar manualmente: criarGraficosV5()');