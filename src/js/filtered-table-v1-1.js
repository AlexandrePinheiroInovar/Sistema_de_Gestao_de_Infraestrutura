// ============= TABELA RESUMO FILTRADA - SIMPLES =============
console.log('📋 [RESUMO-TABELA] Sistema carregado');

// ============= VARIÁVEIS =============
let resumoData = [];
let resumoCurrentPage = 1;
let resumoItemsPerPage = 25;
let resumoTotalPages = 1;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 [RESUMO-TABELA] Inicializando...');
    
    // Escutar dados do sistema Firebase
    window.addEventListener('firebaseTableDataLoaded', function(event) {
        console.log('📊 [RESUMO-TABELA] Dados recebidos do Firebase');
        if (event.detail && event.detail.data) {
            atualizarTabelaResumo(event.detail.data);
        }
    });
    
    // Escutar filtros aplicados - SISTEMA UNIFICADO
    window.addEventListener('unifiedFiltersChanged', function(event) {
        console.log('🔍 [RESUMO-TABELA] Filtros unificados aplicados:', event.detail.filteredCount, 'de', event.detail.totalCount);
        if (event.detail && event.detail.filteredData) {
            atualizarTabelaResumo(event.detail.filteredData);
        }
    });
    
    // Escutar filtros aplicados - SISTEMA ANTIGO (COMPATIBILIDADE)
    window.addEventListener('filtersApplied', function(event) {
        console.log('🔍 [RESUMO-TABELA] Filtros aplicados (sistema antigo)');
        if (event.detail && event.detail.filteredData) {
            atualizarTabelaResumo(event.detail.filteredData);
        }
    });
    
    // Escutar filtros do dashboard
    window.addEventListener('dashboardFiltersApplied', function(event) {
        console.log('🔍 [RESUMO-TABELA] Filtros do dashboard aplicados:', event.detail.filterCount, 'registros');
        if (event.detail && event.detail.filteredData) {
            atualizarTabelaResumo(event.detail.filteredData);
        }
    });
});

// ============= FUNÇÃO PRINCIPAL =============
function atualizarTabelaResumo(dados) {
    console.log('🔄 [RESUMO-TABELA] Atualizando com', dados.length, 'registros');
    
    if (!dados || dados.length === 0) {
        mostrarTabelaVazia();
        return;
    }
    
    // Extrair apenas as colunas que queremos
    resumoData = dados.map(item => ({
        pep: item['PEP'] || item['pep'] || '',
        nodeGerencial: item['NODE GERENCIAL'] || item['nodeGerencial'] || '',
        status: item['STATUS'] || item['Status'] || item['status'] || '',
        observacao: item['Observação'] || item['observacao'] || item['Observacao'] || '',
        justificativa: item['JUSTIFICATIVA'] || item['justificativa'] || item['Justificativa'] || ''
    }));
    
    console.log('📋 [RESUMO-TABELA] Dados extraídos:', resumoData.length);
    console.log('📋 [RESUMO-TABELA] Exemplo:', resumoData[0]);
    
    renderizarTabela();
    atualizarContadores();
}

// ============= RENDERIZAR TABELA =============
function renderizarTabela() {
    const tbody = document.getElementById('filteredTableBody');
    if (!tbody) {
        console.error('❌ [RESUMO-TABELA] Tbody não encontrado');
        return;
    }
    
    // Calcular itens da página
    resumoTotalPages = Math.ceil(resumoData.length / resumoItemsPerPage);
    const startIndex = (resumoCurrentPage - 1) * resumoItemsPerPage;
    const endIndex = startIndex + resumoItemsPerPage;
    const pageItems = resumoData.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
        mostrarTabelaVazia();
        return;
    }
    
    // Gerar HTML das linhas
    const rows = pageItems.map(item => `
        <tr>
            <td title="${item.pep}">${item.pep}</td>
            <td title="${item.nodeGerencial}">${item.nodeGerencial}</td>
            <td title="${item.status}">${formatarStatus(item.status)}</td>
            <td title="${item.observacao}">${item.observacao}</td>
            <td title="${item.justificativa}">${item.justificativa}</td>
        </tr>
    `).join('');
    
    tbody.innerHTML = rows;
    atualizarPaginacao();
}

// ============= FORMATAR STATUS =============
function formatarStatus(status) {
    if (!status) return '<span class="status-badge pendente">N/A</span>';
    
    const statusLower = status.toLowerCase();
    let statusClass = 'pendente';
    
    if (statusLower.includes('produtiva')) {
        statusClass = 'produtiva';
    } else if (statusLower.includes('improdutiva')) {
        statusClass = 'improdutiva';
    } else if (statusLower.includes('rota')) {
        statusClass = 'em-rota';
    } else if (statusLower.includes('pausa')) {
        statusClass = 'pausa';
    }
    
    return `<span class="status-badge ${statusClass}">${status}</span>`;
}

// ============= TABELA VAZIA =============
function mostrarTabelaVazia() {
    const tbody = document.getElementById('filteredTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="no-data-row">
            <td colspan="5" class="no-data-cell">
                <div class="no-data-content">
                    <i class="fas fa-filter"></i>
                    <p>Nenhum registro encontrado</p>
                </div>
            </td>
        </tr>
    `;
    
    // Esconder paginação
    const pagination = document.getElementById('filteredTablePagination');
    if (pagination) pagination.style.display = 'none';
    
    atualizarContadores(true);
}

// ============= CONTADORES =============
function atualizarContadores(vazia = false) {
    const countElement = document.getElementById('filteredTableCount');
    const statusElement = document.getElementById('filteredTableStatus');
    
    if (countElement) {
        if (vazia) {
            countElement.textContent = 'Nenhum registro encontrado';
        } else {
            countElement.textContent = `${resumoData.length} registros encontrados`;
        }
    }
    
    if (statusElement) {
        const now = new Date();
        statusElement.textContent = `Atualizado às ${now.toLocaleTimeString()}`;
    }
}

// ============= PAGINAÇÃO =============
function atualizarPaginacao() {
    const pagination = document.getElementById('filteredTablePagination');
    if (!pagination) return;
    
    if (resumoTotalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Atualizar botões
    const firstBtn = document.getElementById('firstPage');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const lastBtn = document.getElementById('lastPage');
    
    if (firstBtn) firstBtn.disabled = resumoCurrentPage === 1;
    if (prevBtn) prevBtn.disabled = resumoCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = resumoCurrentPage === resumoTotalPages;
    if (lastBtn) lastBtn.disabled = resumoCurrentPage === resumoTotalPages;
    
    // Info de página
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${resumoCurrentPage} de ${resumoTotalPages}`;
    }
}

// ============= NAVEGAÇÃO DE PÁGINAS =============
function goToPage(page) {
    if (page < 1 || page > resumoTotalPages || page === resumoCurrentPage) return;
    resumoCurrentPage = page;
    renderizarTabela();
}

function changePageSize() {
    const pageSize = document.getElementById('pageSize');
    if (!pageSize) return;
    
    resumoItemsPerPage = parseInt(pageSize.value);
    resumoCurrentPage = 1;
    renderizarTabela();
}

// ============= ATUALIZAÇÃO MANUAL =============
function refreshFilteredTable() {
    console.log('🔄 [RESUMO-TABELA] Atualizando manualmente...');
    
    // Botão feedback
    const refreshBtn = document.getElementById('refreshFilteredData');
    if (refreshBtn) {
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
        refreshBtn.disabled = true;
        
        setTimeout(() => {
            refreshBtn.innerHTML = originalText;
            refreshBtn.disabled = false;
        }, 2000);
    }
    
    // Tentar recarregar dados - PRIORITIZAR DADOS FILTRADOS
    let dados = null;
    
    // 1. Tentar obter dados filtrados do sistema unificado
    if (window.unifiedFilterSystem && window.unifiedFilterSystem.filteredData) {
        dados = window.unifiedFilterSystem.filteredData;
        console.log('📊 [RESUMO-TABELA] Usando dados filtrados do sistema unificado:', dados.length);
    }
    
    // 2. Tentar obter dados do FirebaseTableSystem
    if (!dados && window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
        dados = window.FirebaseTableSystem.getData();
        console.log('📊 [RESUMO-TABELA] Usando dados do FirebaseTableSystem:', dados?.length || 'null');
    }
    
    // 3. Tentar dados globais
    if (!dados && window.currentFirebaseData) {
        dados = window.currentFirebaseData;
        console.log('📊 [RESUMO-TABELA] Usando dados globais:', dados?.length || 'null');
    }
    
    if (dados && dados.length > 0) {
        atualizarTabelaResumo(dados);
    } else {
        console.warn('⚠️ [RESUMO-TABELA] Nenhum dado disponível para atualizar');
    }
}

// ============= INTEGRAÇÃO COM SISTEMA UNIFICADO =============
window.updateFilteredTableData = function(data) {
    console.log('🔗 [RESUMO-TABELA] Integração chamada com', data ? data.length : 0, 'registros');
    atualizarTabelaResumo(data);
};

// ============= FORÇAR SINCRONIZAÇÃO COM FILTROS =============
function forcarSincronizacaoFiltros() {
    console.log('🔄 [RESUMO-TABELA] Forçando sincronização com filtros...');
    
    // Verificar se há filtros ativos
    if (window.unifiedFilterSystem) {
        const filtros = window.unifiedFilterSystem.currentFilters;
        const dadosFiltrados = window.unifiedFilterSystem.filteredData;
        
        console.log('🔍 [RESUMO-TABELA] Filtros ativos:', Object.keys(filtros).length);
        console.log('📊 [RESUMO-TABELA] Dados filtrados disponíveis:', dadosFiltrados?.length || 'null');
        
        if (dadosFiltrados && dadosFiltrados.length >= 0) {
            atualizarTabelaResumo(dadosFiltrados);
            return true;
        }
    }
    
    // Fallback para dados não filtrados
    refreshFilteredTable();
    return false;
}

// ============= FUNÇÕES GLOBAIS =============
window.refreshFilteredTable = refreshFilteredTable;
window.goToPage = goToPage;
window.changePageSize = changePageSize;
window.forcarSincronizacaoFiltros = forcarSincronizacaoFiltros;

console.log('✅ [RESUMO-TABELA] Sistema inicializado');