// ============= FORÇAR INICIALIZAÇÃO DOS GRÁFICOS =============
// Script para garantir que os gráficos sempre inicializem
console.log('🔥 [FORCE-CHARTS] Carregando sistema de força bruta para gráficos...');

// Função para forçar inicialização dos gráficos
function forcarInicializacaoGraficos() {
    console.log('🚀 [FORCE-CHARTS] Executando inicialização forçada...');
    
    // Verificar dependências
    const temChart = typeof Chart !== 'undefined';
    const temChartsDashboard = typeof ChartsDashboard !== 'undefined';
    const temInicializar = temChartsDashboard && typeof ChartsDashboard.inicializar === 'function';
    
    console.log('📊 [FORCE-CHARTS] Status das dependências:');
    console.log('  - Chart.js:', temChart ? '✅' : '❌');
    console.log('  - ChartsDashboard:', temChartsDashboard ? '✅' : '❌');
    console.log('  - ChartsDashboard.inicializar:', temInicializar ? '✅' : '❌');
    
    if (temChart && temChartsDashboard && temInicializar) {
        try {
            // Garantir que o container existe e está visível
            const container = document.getElementById('charts-rankings-container');
            if (container) {
                container.style.display = 'block';
                container.style.visibility = 'visible';
                container.style.opacity = '1';
                console.log('✅ [FORCE-CHARTS] Container forçado como visível');
            }
            
            // Destruir qualquer gráfico existente
            if (ChartsDashboard.destruirGraficos) {
                ChartsDashboard.destruirGraficos();
            }
            
            // Resetar estado
            ChartsDashboard.isInitialized = false;
            
            // Inicializar sistema
            ChartsDashboard.inicializar();
            
            console.log('✅ [FORCE-CHARTS] Inicialização executada com sucesso!');
            
            // Verificar se realmente inicializou
            setTimeout(() => {
                if (ChartsDashboard.isInitialized) {
                    console.log('✅ [FORCE-CHARTS] Sistema confirmado como inicializado!');
                } else {
                    console.error('❌ [FORCE-CHARTS] Sistema não se marcou como inicializado');
                    // Tentar novamente
                    setTimeout(forcarInicializacaoGraficos, 2000);
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ [FORCE-CHARTS] Erro durante inicialização:', error);
            
            // Tentar novamente em 3 segundos
            setTimeout(forcarInicializacaoGraficos, 3000);
        }
    } else {
        console.warn('⚠️ [FORCE-CHARTS] Dependências não disponíveis, tentando novamente em 2s...');
        setTimeout(forcarInicializacaoGraficos, 2000);
    }
}

// Função pública para forçar gráficos
window.forcarGraficos = function() {
    console.log('🔥 [FORCE-CHARTS] Chamada manual para forçar gráficos...');
    forcarInicializacaoGraficos();
};

// Múltiplas tentativas de inicialização
setTimeout(forcarInicializacaoGraficos, 1000);  // 1 segundo
setTimeout(forcarInicializacaoGraficos, 3000);  // 3 segundos  
setTimeout(forcarInicializacaoGraficos, 5000);  // 5 segundos
setTimeout(forcarInicializacaoGraficos, 10000); // 10 segundos

// Escutar eventos do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [FORCE-CHARTS] DOM carregado, tentando inicialização...');
    setTimeout(forcarInicializacaoGraficos, 500);
});

// Escutar quando scripts carregarem
window.addEventListener('load', function() {
    console.log('🌐 [FORCE-CHARTS] Window carregada, tentando inicialização...');
    setTimeout(forcarInicializacaoGraficos, 500);
});

console.log('✅ [FORCE-CHARTS] Sistema de força bruta carregado - múltiplas tentativas agendadas');