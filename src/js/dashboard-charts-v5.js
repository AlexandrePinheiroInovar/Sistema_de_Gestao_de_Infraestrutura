// ============= SISTEMA DE GRÁFICOS DO DASHBOARD V5.0 =============
// ARQUIVO INDEPENDENTE - NÃO MODIFICA OUTROS MÓDULOS
console.log('📊 [DASHBOARD-CHARTS-V5] Inicializando sistema de gráficos do dashboard...');

// ============= FUNÇÃO DE INICIALIZAÇÃO MANUAL =============
window.debugGraficos = function() {
    console.log('🐛 [DEBUG] Iniciando debug manual dos gráficos...');
    criarTodosGraficos();
};

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
async function criarTodosGraficos(dadosExternos = null) {
    console.log('🎨 [DASHBOARD-CHARTS-V5] === CRIANDO TODOS OS GRÁFICOS ===');
    
    try {
        // Aguardar Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [DASHBOARD-CHARTS-V5] Aguardando Chart.js...');
            setTimeout(() => criarTodosGraficos(dadosExternos), 500);
            return;
        }
        
        // Usar dados externos se fornecidos, senão buscar dados da tabela
        let dados;
        if (dadosExternos && dadosExternos.length > 0) {
            dados = dadosExternos;
            console.log('📊 [DASHBOARD-CHARTS-V5] Usando dados filtrados:', dados.length, 'registros');
        } else {
            dados = await aguardarDadosTabela();
            console.log('📊 [DASHBOARD-CHARTS-V5] Dados carregados da tabela:', dados ? dados.length : 0, 'registros');
        }
        
        if (!dados || dados.length === 0) {
            console.warn('⚠️ [DASHBOARD-CHARTS-V5] Nenhum dado disponível');
            return;
        }
        
        console.log('📊 [DASHBOARD-CHARTS-V5] Criando gráficos com', dados.length, 'registros');
        console.log('📊 [DASHBOARD-CHARTS-V5] Exemplo de registro:', dados[0]);
        console.log('📊 [DASHBOARD-CHARTS-V5] Campos disponíveis:', Object.keys(dados[0] || {}));
        
        // Debug específico para datas e status
        const primeiroRegistro = dados[0];
        if (primeiroRegistro) {
            console.log('📅 [DEBUG-DATAS] Campos de data no primeiro registro:', {
                'DATA RECEBIMENTO': primeiroRegistro['DATA RECEBIMENTO'],
                'DATA INICIO': primeiroRegistro['DATA INICIO'], 
                'DATA FINAL': primeiroRegistro['DATA FINAL'],
                'dataRecebimento': primeiroRegistro['dataRecebimento'],
                'dataInicio': primeiroRegistro['dataInicio'],
                'dataFinal': primeiroRegistro['dataFinal']
            });
            
            console.log('📊 [DEBUG-STATUS] Campos de status e supervisor:', {
                'Status': primeiroRegistro['Status'],
                'status': primeiroRegistro['status'],
                'Supervisor': primeiroRegistro['Supervisor'],
                'supervisor': primeiroRegistro['supervisor'],
                'EQUIPE': primeiroRegistro['EQUIPE'],
                'equipe': primeiroRegistro['equipe']
            });
            
            console.log('🔍 [DEBUG-FULL] Todos os campos disponíveis:', Object.keys(primeiroRegistro));
            console.log('🔍 [DEBUG-SAMPLE] 3 primeiros registros completos:', dados.slice(0, 3));
        }
        
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

// ============= AUTO INICIALIZAÇÃO =============
// Tentar criar gráficos quando a página carregar
// INICIALIZAÇÃO REMOVIDA - Usando sistema de eventos na linha 1191

// Também tentar quando o usuário navegar para a seção infraestrutura
document.addEventListener('click', function(event) {
    if (event.target.textContent && event.target.textContent.includes('Dashboard')) {
        console.log('📊 [DASHBOARD-CHARTS-V5] Navegação para Dashboard detectada...');
        setTimeout(() => {
            criarTodosGraficos();
        }, 1000);
    }
});

// ============= UTILITÁRIOS PARA MAPEAR CAMPOS =============
function obterCampo(item, campo) {
    // Mapear nomes de campos da tabela
    const mapeamento = {
        'projeto': item['Projeto'] || item['projeto'] || '',
        'subProjeto': item['Sub Projeto'] || item['subProjeto'] || '',
        'cidade': item['Cidade'] || item['cidade'] || '',
        'hp': item['HP'] || item['hp'] || '',
        'dataRecebimento': item['DATA RECEBIMENTO'] || item['dataRecebimento'] || item['Data Recebimento'] || item['Data de Recebimento'] || '',
        'dataInicio': item['DATA INICIO'] || item['dataInicio'] || item['Data Início'] || item['Data de Início'] || item['DATA INÍCIO'] || '',
        'dataFinal': item['DATA FINAL'] || item['dataFinal'] || item['Data Final'] || item['Data de Conclusão'] || item['DATA CONCLUSÃO'] || '',
        'supervisor': item['Supervisor'] || item['supervisor'] || '',
        'equipe': item['EQUIPE'] || item['equipe'] || '',
        'status': item['Status'] || item['status'] || item['STATUS'] || item['Status da Atividade'] || item['statusAtividade'] || '',
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
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade por Cidade',
                data: data,
                backgroundColor: coresAzuis.gradiente,
                borderColor: coresAzuis.gradiente.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade de Registros'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Cidades'
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
    
    // Processar dados - Somar HP por projeto
    const somaHPPorProjeto = {};
    dados.forEach(item => {
        let projeto = obterCampo(item, 'projeto') || 'Não especificado';
        
        // Agrupar todas variações de MDU-TOA em um só
        if (projeto.toLowerCase().includes('mdu-toa') || projeto.toLowerCase().includes('mdu toa')) {
            projeto = 'MDU-TOA';
        }
        
        const hp = parseInt(obterCampo(item, 'hp')) || 0;
        somaHPPorProjeto[projeto] = (somaHPPorProjeto[projeto] || 0) + hp;
    });
    
    // Ordenar por soma de HP (maior para menor) e pegar top 10
    const entries = Object.entries(somaHPPorProjeto)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,soma]) => soma);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Soma de HP Ativados',
                data: data,
                backgroundColor: coresAzuis.gradiente,
                borderColor: coresAzuis.gradiente.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Soma de HP Ativados'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Projetos'
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
    console.log('📊 [GRÁFICO-5] Exemplo de dados recebidos:', dados.slice(0, 2));
    
    const canvas = document.getElementById('recebimentosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas recebimentosChart não encontrado');
        return;
    }
    
    // Processar dados mensais
    const dadosMensais = {};
    dados.forEach((item, index) => {
        const dataRecebimento = obterCampo(item, 'dataRecebimento');
        const dataFinal = obterCampo(item, 'dataFinal');
        
        // Debug para os primeiros registros
        if (index < 3) {
            console.log(`📅 [DEBUG] Registro ${index}:`, {
                dataRecebimento,
                dataFinal,
                itemCompleto: item
            });
        }
        
        if (dataRecebimento && dataRecebimento.length >= 7) {
            let mes = null;
            // Tentar diferentes formatos de data
            if (dataRecebimento.includes('-')) {
                // Formato YYYY-MM-DD
                const partesMes = dataRecebimento.substring(0, 7);
                if (partesMes.match(/^\d{4}-\d{2}$/)) {
                    mes = partesMes;
                }
            } else if (dataRecebimento.includes('/')) {
                // DD/MM/YYYY -> YYYY-MM
                const partes = dataRecebimento.split('/');
                if (partes.length === 3 && partes[2].length === 4) {
                    const ano = partes[2];
                    const mesNum = partes[1].padStart(2, '0');
                    if (ano && mesNum && !isNaN(ano) && !isNaN(mesNum)) {
                        mes = `${ano}-${mesNum}`;
                    }
                }
            }
            
            if (mes && mes !== 'undefined-undefined') {
                if (!dadosMensais[mes]) {
                    dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
                }
                dadosMensais[mes].recebidos++;
                console.log(`📅 [DEBUG] Recebimento processado: ${dataRecebimento} -> ${mes}`);
            } else {
                console.warn(`⚠️ [DEBUG] Data de recebimento inválida ignorada: "${dataRecebimento}"`);
            }
        }
        
        if (dataFinal && dataFinal.length >= 7) {
            let mes = null;
            // Tentar diferentes formatos de data
            if (dataFinal.includes('-')) {
                // Formato YYYY-MM-DD
                const partesMes = dataFinal.substring(0, 7);
                if (partesMes.match(/^\d{4}-\d{2}$/)) {
                    mes = partesMes;
                }
            } else if (dataFinal.includes('/')) {
                // DD/MM/YYYY -> YYYY-MM
                const partes = dataFinal.split('/');
                if (partes.length === 3 && partes[2].length === 4) {
                    const ano = partes[2];
                    const mesNum = partes[1].padStart(2, '0');
                    if (ano && mesNum && !isNaN(ano) && !isNaN(mesNum)) {
                        mes = `${ano}-${mesNum}`;
                    }
                }
            }
            
            if (mes && mes !== 'undefined-undefined') {
                if (!dadosMensais[mes]) {
                    dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
                }
                dadosMensais[mes].concluidos++;
                console.log(`📅 [DEBUG] Conclusão processada: ${dataFinal} -> ${mes}`);
            } else {
                console.warn(`⚠️ [DEBUG] Data final inválida ignorada: "${dataFinal}"`);
            }
        }
    });
    
    console.log('📊 [GRÁFICO-5] Dados mensais processados:', dadosMensais);
    
    // Últimos 12 meses
    const mesesOrdenados = Object.keys(dadosMensais).sort().slice(-12);
    console.log('📊 [GRÁFICO-5] Meses processados:', mesesOrdenados);
    
    const labels = mesesOrdenados.map(mes => {
        const [ano, mesNum] = mes.split('-');
        
        // Validar se ano e mesNum são válidos
        if (!ano || !mesNum || isNaN(parseInt(ano)) || isNaN(parseInt(mesNum))) {
            console.warn(`⚠️ [DEBUG-LABEL] Mês inválido ignorado: ${mes}`);
            return null;
        }
        
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mesNumInt = parseInt(mesNum);
        
        // Validar se o mês está dentro do range válido
        if (mesNumInt < 1 || mesNumInt > 12) {
            console.warn(`⚠️ [DEBUG-LABEL] Número do mês inválido: ${mesNumInt}`);
            return null;
        }
        
        const nomesMes = nomesMeses[mesNumInt - 1];
        const labelFinal = `${nomesMes}/${ano}`;
        
        console.log(`📅 [DEBUG-LABEL] ${mes} -> ${labelFinal} (mesNum: ${mesNum}, ano: ${ano})`);
        return labelFinal;
    }).filter(label => label !== null);
    
    // Filtrar também os dados para corresponder aos labels válidos
    const mesesValidos = mesesOrdenados.filter(mes => {
        const [ano, mesNum] = mes.split('-');
        return ano && mesNum && !isNaN(parseInt(ano)) && !isNaN(parseInt(mesNum)) && 
               parseInt(mesNum) >= 1 && parseInt(mesNum) <= 12;
    });
    
    const dadosRecebidos = mesesValidos.map(mes => dadosMensais[mes]?.recebidos || 0);
    const dadosConcluidos = mesesValidos.map(mes => dadosMensais[mes]?.concluidos || 0);
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardChartsV5.recebimentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Recebidos',
                    data: dadosRecebidos,
                    backgroundColor: coresAzuis.principal,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                },
                {
                    label: 'Concluídos',
                    data: dadosConcluidos,
                    backgroundColor: coresAzuis.secundaria,
                    borderColor: coresAzuis.escura,
                    borderWidth: 2
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
    let totalProdutivas = 0;
    let totalImprodutivas = 0;
    let statusEncontrados = new Set();
    
    dados.forEach((item, index) => {
        const supervisor = obterCampo(item, 'supervisor') || 'Não especificado';
        
        // Tentar TODAS as variações possíveis de Status
        let status = null;
        const possiveisNomesStatus = [
            'Status', 'status', 'STATUS', 
            'Status da Atividade', 'statusAtividade',
            'Status do Projeto', 'statusProjeto',
            'Status Atual', 'statusAtual',
            'Situação', 'situacao', 'SITUACAO'
        ];
        
        for (const nomeStatus of possiveisNomesStatus) {
            if (item[nomeStatus] && item[nomeStatus].toString().trim() !== '') {
                status = item[nomeStatus];
                break;
            }
        }
        
        // Se ainda não encontrou, tentar buscar por campos que contenham "status"
        if (!status) {
            const camposComStatus = Object.keys(item).filter(key => 
                key.toLowerCase().includes('status') || 
                key.toLowerCase().includes('situac')
            );
            
            for (const campo of camposComStatus) {
                if (item[campo] && item[campo].toString().trim() !== '') {
                    status = item[campo];
                    break;
                }
            }
        }
        
        status = status || 'Não especificado';
        
        // Debug detalhado para os primeiros registros
        if (index < 5) {
            console.log(`📊 [DEBUG-SUPERVISOR] Registro ${index}:`, {
                supervisor,
                status,
                statusEncontradoEm: possiveisNomesStatus.find(nome => item[nome]) || 'Nenhum',
                todosOsStatusDisponiveis: possiveisNomesStatus.reduce((acc, nome) => {
                    if (item[nome]) acc[nome] = item[nome];
                    return acc;
                }, {}),
                camposDisponiveis: Object.keys(item).slice(0, 10) // Primeiros 10 campos
            });
        }
        
        statusEncontrados.add(status.toUpperCase());
        
        if (!supervisorData[supervisor]) {
            supervisorData[supervisor] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        // Melhor detecção de status (mais flexível e abrangente)
        const statusUpper = status.toUpperCase().trim();
        
        // Verificar múltiplas variações
        const ehProdutiva = statusUpper === 'PRODUTIVA' || 
                           statusUpper.includes('PRODUTIVA') ||
                           statusUpper === 'PRODUTIVO' ||
                           statusUpper.includes('PRODUTIVO') ||
                           statusUpper === 'ATIVO' ||
                           statusUpper === 'CONCLUÍDO' ||
                           statusUpper === 'CONCLUIDO';
                           
        const ehImprodutiva = statusUpper === 'IMPRODUTIVA' || 
                             statusUpper.includes('IMPRODUTIVA') ||
                             statusUpper === 'IMPRODUTIVO' ||
                             statusUpper.includes('IMPRODUTIVO') ||
                             statusUpper === 'INATIVO' ||
                             statusUpper === 'PENDENTE' ||
                             statusUpper === 'CANCELADO';
        
        if (ehProdutiva) {
            supervisorData[supervisor].PRODUTIVA++;
            totalProdutivas++;
            if (index < 5) console.log(`✅ [DEBUG-SUPERVISOR] PRODUTIVA detectada: "${status}"`);
        } else if (ehImprodutiva) {
            supervisorData[supervisor].IMPRODUTIVA++;
            totalImprodutivas++;
            if (index < 5) console.log(`❌ [DEBUG-SUPERVISOR] IMPRODUTIVA detectada: "${status}"`);
        } else {
            // Log status não reconhecidos
            if (index < 10) {
                console.log(`⚠️ [DEBUG-SUPERVISOR] Status não reconhecido: "${status}" (registro ${index})`);
            }
            // Para campos vazios ou não reconhecidos, não classificar como produtiva automaticamente
            if (status && status.trim() !== '' && status !== 'Não especificado') {
                supervisorData[supervisor].PRODUTIVA++;
                totalProdutivas++;
            }
        }
    });
    
    console.log('📊 [GRÁFICO-6] Estatísticas de status:', {
        totalProdutivas,
        totalImprodutivas,
        statusEncontrados: Array.from(statusEncontrados),
        supervisorData
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
    console.log('🏆 [RANKING-2] Top 3 equipes:', topRankings.slice(0, 3));
}

// ============= FUNÇÕES GLOBAIS PARA INTEGRAÇÃO =============
window.criarGraficosV5 = criarTodosGraficos;

// Função para integração com o sistema de filtros
window.atualizarGraficosComFiltros = async function(dadosFiltrados) {
    console.log('🔄 [DASHBOARD-CHARTS-V5] === ATUALIZANDO COM DADOS FILTRADOS ===');
    console.log('📊 [DASHBOARD-CHARTS-V5] Dados filtrados recebidos:', dadosFiltrados ? dadosFiltrados.length : 0, 'registros');
    
    try {
        if (dadosFiltrados && dadosFiltrados.length > 0) {
            await criarTodosGraficos(dadosFiltrados);
            console.log('✅ [DASHBOARD-CHARTS-V5] Gráficos atualizados com dados filtrados');
        } else {
            console.warn('⚠️ [DASHBOARD-CHARTS-V5] Nenhum dado filtrado fornecido, usando dados originais');
            await criarTodosGraficos();
        }
    } catch (error) {
        console.error('❌ [DASHBOARD-CHARTS-V5] Erro ao atualizar gráficos:', error);
    }
};

// Função de inicialização que pode ser chamada pelo dashboard-integration
window.inicializarGraficosV5 = async function() {
    console.log('🚀 [DASHBOARD-CHARTS-V5] === INICIALIZAÇÃO SOLICITADA ===');
    
    // Aguardar um pouco para garantir que todos os sistemas estejam carregados
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        await criarTodosGraficos();
        console.log('✅ [DASHBOARD-CHARTS-V5] Inicialização completa');
    } catch (error) {
        console.error('❌ [DASHBOARD-CHARTS-V5] Erro na inicialização:', error);
    }
};

// Função específica para debug do gráfico de supervisor
window.debugGraficoSupervisor = function() {
    console.clear();
    console.log('🔍 [DEBUG-SUPERVISOR] === ANÁLISE ESPECÍFICA DO GRÁFICO DE SUPERVISOR ===');
    
    if (window.FirebaseTableSystem && typeof window.FirebaseTableSystem.getData === 'function') {
        const dados = window.FirebaseTableSystem.getData();
        console.log('📊 [DEBUG-SUPERVISOR] Total de registros:', dados.length);
        
        if (dados.length > 0) {
            // 1. Mostrar campos disponíveis
            console.log('📋 [DEBUG-SUPERVISOR] Campos disponíveis:', Object.keys(dados[0]));
            
            // 2. Buscar campos que contenham "status" ou "Status"
            const camposStatus = Object.keys(dados[0]).filter(key => 
                key.toLowerCase().includes('status')
            );
            console.log('📊 [DEBUG-SUPERVISOR] Campos com "status":', camposStatus);
            
            // 3. Buscar campos que contenham "supervisor" 
            const camposSupervisor = Object.keys(dados[0]).filter(key => 
                key.toLowerCase().includes('supervisor')
            );
            console.log('👥 [DEBUG-SUPERVISOR] Campos com "supervisor":', camposSupervisor);
            
            // 4. Mostrar valores únicos do campo Status
            if (camposStatus.length > 0) {
                camposStatus.forEach(campo => {
                    const valoresUnicos = [...new Set(dados.map(item => item[campo]))].filter(v => v);
                    console.log(`📊 [DEBUG-SUPERVISOR] Valores únicos em "${campo}":`, valoresUnicos);
                });
            }
            
            // 5. Mostrar valores únicos dos supervisores
            if (camposSupervisor.length > 0) {
                camposSupervisor.forEach(campo => {
                    const valoresUnicos = [...new Set(dados.map(item => item[campo]))].filter(v => v);
                    console.log(`👥 [DEBUG-SUPERVISOR] Supervisores únicos em "${campo}":`, valoresUnicos.slice(0, 10));
                });
            }
            
            // 6. Análise detalhada de campos possíveis para Status
            console.log('📋 [DEBUG-SUPERVISOR] === ANÁLISE DETALHADA DE CAMPOS ===');
            const primeiroItem = dados[0];
            const todosCampos = Object.keys(primeiroItem);
            
            // Buscar TODOS os campos possíveis relacionados a status/produtividade
            const camposSuspeitos = todosCampos.filter(campo => {
                const campoLower = campo.toLowerCase();
                return campoLower.includes('status') || 
                       campoLower.includes('produt') ||
                       campoLower.includes('situac') ||
                       campoLower.includes('ativo') ||
                       campoLower.includes('conclu');
            });
            
            console.log('🎯 [DEBUG-SUPERVISOR] Campos suspeitos para Status:', camposSuspeitos);
            
            // Mostrar valores desses campos nos primeiros registros
            camposSuspeitos.forEach(campo => {
                const valores = dados.slice(0, 10).map(item => item[campo]).filter(v => v);
                console.log(`📊 [DEBUG-SUPERVISOR] Valores no campo "${campo}":`, [...new Set(valores)]);
            });
            
            // 7. Mostrar exemplo de 3 registros completos FOCANDO nos campos importantes
            console.log('📋 [DEBUG-SUPERVISOR] Primeiros 3 registros (campos importantes):');
            dados.slice(0, 3).forEach((item, index) => {
                const camposImportantes = {};
                todosCampos.forEach(campo => {
                    const campoLower = campo.toLowerCase();
                    if (campoLower.includes('supervisor') || 
                        campoLower.includes('status') ||
                        campoLower.includes('produt') ||
                        campoLower.includes('situac')) {
                        camposImportantes[campo] = item[campo];
                    }
                });
                
                console.log(`📊 [REGISTRO-${index}] Campos importantes:`, camposImportantes);
            });
        }
    } else {
        console.error('❌ [DEBUG-SUPERVISOR] FirebaseTableSystem não disponível');
    }
};

// Função para recarregar todos os dados e gráficos
window.forcarDebugCompleto = async function() {
    console.clear();
    console.log('🚀 [FORCE-DEBUG] Iniciando debug completo...');
    
    // Verificar se os dados estão disponíveis
    if (window.FirebaseTableSystem && typeof window.FirebaseTableSystem.getData === 'function') {
        const dados = window.FirebaseTableSystem.getData();
        console.log('📊 [FORCE-DEBUG] Dados encontrados:', dados.length, 'registros');
        
        if (dados.length > 0) {
            console.log('🔍 [FORCE-DEBUG] Primeiro registro completo:', dados[0]);
            console.log('🔍 [FORCE-DEBUG] Campos disponíveis:', Object.keys(dados[0]));
            
            // Debug específico para STATUS
            console.log('📊 [FORCE-DEBUG] === ANÁLISE DE STATUS ===');
            const statusCounts = { PRODUTIVA: 0, IMPRODUTIVA: 0, OUTROS: 0 };
            const statusExemplos = new Map();
            
            dados.slice(0, 10).forEach((item, index) => {
                // Buscar TODOS os campos que contenham "status" (case insensitive)
                const camposStatus = {};
                Object.keys(item).forEach(key => {
                    if (key.toLowerCase().includes('status')) {
                        camposStatus[key] = item[key];
                    }
                });
                
                const statusRaw = item['Status'] || item['status'] || item['STATUS'] || 'N/A';
                const statusProcessado = obterCampo(item, 'status');
                const statusUpper = statusProcessado.toUpperCase().trim();
                
                console.log(`📊 [DEBUG-STATUS-${index}]:`, {
                    raw: statusRaw,
                    processado: statusProcessado,
                    upper: statusUpper,
                    supervisor: item['Supervisor'] || item['supervisor'] || 'N/A',
                    todosOsCamposStatus: camposStatus
                });
                
                if (statusUpper.includes('PRODUTIVA')) {
                    statusCounts.PRODUTIVA++;
                    statusExemplos.set('PRODUTIVA', statusRaw);
                } else if (statusUpper.includes('IMPRODUTIVA')) {
                    statusCounts.IMPRODUTIVA++;
                    statusExemplos.set('IMPRODUTIVA', statusRaw);
                } else {
                    statusCounts.OUTROS++;
                    statusExemplos.set('OUTROS', statusRaw);
                }
            });
            
            console.log('📊 [FORCE-DEBUG] Status counts (primeiros 10):', statusCounts);
            console.log('📊 [FORCE-DEBUG] Status exemplos:', Object.fromEntries(statusExemplos));
            
            // Verificar se há colunas específicas para PRODUTIVA/IMPRODUTIVA
            console.log('📊 [FORCE-DEBUG] === BUSCA POR COLUNAS PRODUTIVA/IMPRODUTIVA ===');
            const primeiroRegistro = dados[0];
            const colunasProdutiva = Object.keys(primeiroRegistro).filter(key => 
                key.toLowerCase().includes('produtiva') || key.toLowerCase().includes('improdutiva')
            );
            console.log('📊 [FORCE-DEBUG] Colunas com PRODUTIVA/IMPRODUTIVA:', colunasProdutiva);
            
            if (colunasProdutiva.length > 0) {
                colunasProdutiva.forEach(coluna => {
                    console.log(`📊 [FORCE-DEBUG] Valores da coluna "${coluna}":`, 
                        dados.slice(0, 5).map(item => item[coluna])
                    );
                });
            }
            
            // Verificar colunas de DATA
            console.log('📊 [FORCE-DEBUG] === BUSCA POR COLUNAS DE DATA ===');
            const colunasData = Object.keys(primeiroRegistro).filter(key => 
                key.toLowerCase().includes('data') || key.toLowerCase().includes('recebimento') || key.toLowerCase().includes('conclus')
            );
            console.log('📊 [FORCE-DEBUG] Colunas de DATA encontradas:', colunasData);
            
            colunasData.forEach(coluna => {
                console.log(`📊 [FORCE-DEBUG] Valores da coluna "${coluna}":`, 
                    dados.slice(0, 3).map(item => item[coluna])
                );
            });
        }
        
        // Forçar criação dos gráficos
        await criarTodosGraficos();
    } else {
        console.error('❌ [FORCE-DEBUG] FirebaseTableSystem não disponível');
    }
};
window.dashboardChartsV5 = dashboardChartsV5;

// ============= INICIALIZAÇÃO AUTOMÁTICA =============
// Aguardar DOM e dependências carregarem
document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 [DASHBOARD-CHARTS-V5] DOM carregado, configurando evento de sincronização...');
    
    // Escutar quando os dados do firebase-table-system estiverem prontos
    window.addEventListener('firebaseTableDataLoaded', function(event) {
        console.log('📢 [DASHBOARD-CHARTS-V5] Recebido evento de dados carregados:', event.detail.length, 'registros');
        
        // Aguardar um pouco para outros sistemas se estabilizarem
        setTimeout(() => {
            console.log('🚀 [DASHBOARD-CHARTS-V5] Inicializando gráficos com dados carregados...');
            criarTodosGraficos(event.detail.data);
        }, 1500);
    });
    
    // Escutar quando filtros são aplicados no dashboard
    window.addEventListener('dashboardFiltersApplied', function(event) {
        console.log('🔍 [DASHBOARD-CHARTS-V5] Recebido evento de filtros aplicados:', event.detail.filterCount, 'de', event.detail.originalCount, 'registros');
        
        // Atualizar gráficos com dados filtrados imediatamente
        setTimeout(() => {
            console.log('🔄 [DASHBOARD-CHARTS-V5] Atualizando gráficos com dados filtrados...');
            criarTodosGraficos(event.detail.filteredData);
        }, 200);
    });
    
    // Escutar quando filtros são limpos no dashboard
    window.addEventListener('dashboardFiltersCleared', function(event) {
        console.log('🧹 [DASHBOARD-CHARTS-V5] Recebido evento de filtros limpos:', event.detail.count, 'registros');
        
        // Atualizar gráficos com todos os dados
        setTimeout(() => {
            console.log('🔄 [DASHBOARD-CHARTS-V5] Atualizando gráficos com todos os dados...');
            criarTodosGraficos(event.detail.data);
        }, 200);
    });
    
    // Método de fallback (caso o evento não seja disparado)
    setTimeout(() => {
        if (window.FirebaseTableSystem?.getData()?.length > 0) {
            console.log('🔄 [DASHBOARD-CHARTS-V5] Fallback - dados já disponíveis, criando gráficos...');
            criarTodosGraficos();
        } else {
            console.log('⏳ [DASHBOARD-CHARTS-V5] Fallback - aguardando dados ficarem disponíveis...');
        }
    }, 4000);
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