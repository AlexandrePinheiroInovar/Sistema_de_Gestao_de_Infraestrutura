// ============= TABELA RESUMO FILTRADA - SIMPLES =============
console.log('📋 [RESUMO-TABELA] Sistema carregado');

// ============= VARIÁVEIS =============
let resumoData = [];
let currentPage = 1;
let itemsPerPage = 25;
let totalPages = 1;

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
    
    // Escutar filtros aplicados
    window.addEventListener('filtersApplied', function(event) {
        console.log('🔍 [RESUMO-TABELA] Filtros aplicados');
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
        status: item['Status'] || item['status'] || '',
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
    totalPages = Math.ceil(resumoData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
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
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    // Atualizar botões
    const firstBtn = document.getElementById('firstPage');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const lastBtn = document.getElementById('lastPage');
    
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
    
    // Info de página
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
}

// ============= NAVEGAÇÃO DE PÁGINAS =============
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    renderizarTabela();
}

function changePageSize() {
    const pageSize = document.getElementById('pageSize');
    if (!pageSize) return;
    
    itemsPerPage = parseInt(pageSize.value);
    currentPage = 1;
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
    
    // Tentar recarregar dados
    if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
        const dados = window.FirebaseTableSystem.getData();
        if (dados && dados.length > 0) {
            atualizarTabelaResumo(dados);
        }
    }
}

// ============= INTEGRAÇÃO COM SISTEMA UNIFICADO =============
window.updateFilteredTableData = function(data) {
    console.log('🔗 [RESUMO-TABELA] Integração chamada com', data ? data.length : 0, 'registros');
    atualizarTabelaResumo(data);
};

// ============= FUNÇÕES GLOBAIS =============
window.refreshFilteredTable = refreshFilteredTable;
window.goToPage = goToPage;
window.changePageSize = changePageSize;

console.log('✅ [RESUMO-TABELA] Sistema inicializado');