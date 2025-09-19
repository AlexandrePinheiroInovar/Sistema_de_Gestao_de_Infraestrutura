// ============= GRÁFICOS STANDALONE - FUNCIONA SEMPRE =============
// Sistema simplificado que sempre mostra gráficos, independente do resto do sistema
console.log('📊 [STANDALONE] Carregando sistema de gráficos standalone...');

// Sistema simplificado
window.GraficosStandalone = {
    container: null,
    instances: {},
    
    // Dados de exemplo garantidos
    dadosExemplo: [
        {
            Projeto: 'CLARO FIBRA',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'VISTORIA',
            Cidade: 'São Paulo',
            HP: '24',
            EQUIPE: 'Equipe A',
            Supervisor: 'João Silva',
            Status: 'PRODUTIVA'
        },
        {
            Projeto: 'VIVO FIBER',
            'Sub Projeto': 'Empresarial',
            'Tipo de Ação': 'CONSTRUÇÃO',
            Cidade: 'Rio de Janeiro',
            HP: '48',
            EQUIPE: 'Equipe B',
            Supervisor: 'Maria Santos',
            Status: 'PRODUTIVA'
        },
        {
            Projeto: 'TIM ULTRA',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'ATIVAÇÃO',
            Cidade: 'Belo Horizonte',
            HP: '12',
            EQUIPE: 'Equipe C',
            Supervisor: 'Carlos Lima',
            Status: 'IMPRODUTIVA'
        },
        {
            Projeto: 'CLARO FIBRA',
            'Sub Projeto': 'Comercial',
            'Tipo de Ação': 'VISTORIA',
            Cidade: 'Salvador',
            HP: '36',
            EQUIPE: 'Equipe A',
            Supervisor: 'João Silva',
            Status: 'PRODUTIVA'
        },
        {
            Projeto: 'VIVO FIBER',
            'Sub Projeto': 'Residencial',
            'Tipo de Ação': 'CONSTRUÇÃO',
            Cidade: 'Brasília',
            HP: '60',
            EQUIPE: 'Equipe D',
            Supervisor: 'Ana Costa',
            Status: 'PRODUTIVA'
        }
    ],

    // Inicializar sistema
    inicializar: function() {
        console.log('🚀 [STANDALONE] Inicializando gráficos standalone...');
        
        // Verificar Chart.js
        if (typeof Chart === 'undefined') {
            console.error('❌ [STANDALONE] Chart.js não disponível');
            return false;
        }
        
        // Encontrar container
        this.container = document.getElementById('charts-rankings-container');
        if (!this.container) {
            console.error('❌ [STANDALONE] Container não encontrado');
            return false;
        }
        
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar HTML básico
        this.criarHTML();
        
        // Aguardar DOM e criar gráficos
        setTimeout(() => {
            this.criarGraficos();
        }, 100);
        
        console.log('✅ [STANDALONE] Sistema inicializado!');
        return true;
    },
    
    // Criar HTML básico
    criarHTML: function() {
        this.container.innerHTML = `
            <div style="padding: 20px;">
                <h2 style="color: #333; margin-bottom: 30px;">📊 Análise de Dados - Sistema Standalone</h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="color: #555; margin-bottom: 15px;">Projetos</h3>
                        <canvas id="standalone-projetos" width="400" height="200"></canvas>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="color: #555; margin-bottom: 15px;">Status por Supervisor</h3>
                        <canvas id="standalone-status" width="400" height="200"></canvas>
                    </div>
                </div>
                
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h3 style="color: #555; margin-bottom: 15px;">Resumo dos Dados</h3>
                    <div id="standalone-resumo"></div>
                </div>
            </div>
        `;
    },
    
    // Criar gráficos
    criarGraficos: function() {
        console.log('📊 [STANDALONE] Criando gráficos...');
        
        this.criarGraficoProjetos();
        this.criarGraficoStatus();
        this.criarResumo();
        
        console.log('✅ [STANDALONE] Gráficos criados!');
    },
    
    // Gráfico de projetos
    criarGraficoProjetos: function() {
        const canvas = document.getElementById('standalone-projetos');
        if (!canvas) return;
        
        // Contar projetos
        const contagem = {};
        this.dadosExemplo.forEach(item => {
            const projeto = item.Projeto || 'Outros';
            contagem[projeto] = (contagem[projeto] || 0) + 1;
        });
        
        const labels = Object.keys(contagem);
        const data = Object.values(contagem);
        
        const ctx = canvas.getContext('2d');
        this.instances.projetos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
                    borderColor: ['#1D4ED8', '#059669', '#D97706', '#DC2626', '#7C3AED'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Projeto'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },
    
    // Gráfico de status
    criarGraficoStatus: function() {
        const canvas = document.getElementById('standalone-status');
        if (!canvas) return;
        
        // Contar status
        let produtiva = 0;
        let improdutiva = 0;
        
        this.dadosExemplo.forEach(item => {
            if (item.Status === 'PRODUTIVA') {
                produtiva++;
            } else {
                improdutiva++;
            }
        });
        
        const ctx = canvas.getContext('2d');
        this.instances.status = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Produtiva', 'Improdutiva'],
                datasets: [{
                    data: [produtiva, improdutiva],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderColor: ['#059669', '#DC2626'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Status dos Trabalhos'
                    }
                }
            }
        });
    },
    
    // Criar resumo
    criarResumo: function() {
        const resumoEl = document.getElementById('standalone-resumo');
        if (!resumoEl) return;
        
        const total = this.dadosExemplo.length;
        const projetos = [...new Set(this.dadosExemplo.map(item => item.Projeto))].length;
        const cidades = [...new Set(this.dadosExemplo.map(item => item.Cidade))].length;
        const equipes = [...new Set(this.dadosExemplo.map(item => item.EQUIPE))].length;
        
        resumoEl.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; text-align: center;">
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #3B82F6;">${total}</div>
                    <div style="color: #666;">Total de Registros</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #10B981;">${projetos}</div>
                    <div style="color: #666;">Projetos</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #F59E0B;">${cidades}</div>
                    <div style="color: #666;">Cidades</div>
                </div>
                <div>
                    <div style="font-size: 24px; font-weight: bold; color: #8B5CF6;">${equipes}</div>
                    <div style="color: #666;">Equipes</div>
                </div>
            </div>
        `;
    }
};

// Função pública para inicializar
window.inicializarGraficosStandalone = function() {
    console.log('🚀 [STANDALONE] Chamada pública para inicializar...');
    return GraficosStandalone.inicializar();
};

// Tentar inicializar automaticamente
setTimeout(() => {
    if (typeof Chart !== 'undefined') {
        GraficosStandalone.inicializar();
    } else {
        console.warn('⚠️ [STANDALONE] Chart.js ainda não carregado, aguardando...');
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                GraficosStandalone.inicializar();
            }
        }, 2000);
    }
}, 1000);

console.log('✅ [STANDALONE] Sistema standalone carregado');