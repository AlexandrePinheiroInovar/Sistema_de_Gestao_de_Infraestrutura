// ============= LISTENERS PARA INPUTS DE DATA =============
console.log('📅 [FILTER-EVENTS] Configurando listeners para inputs de data...');

document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que o filter-state-manager foi carregado
    setTimeout(() => {
        setupDateInputListeners();
    }, 200);
});

function setupDateInputListeners() {
    // Listener para Data Início
    const dataInicio = document.getElementById('infraFilterDataInicio');
    if (dataInicio) {
        dataInicio.addEventListener('change', function() {
            if (window.filterState) {
                window.filterState.updateFilter('dataInicio', this.value);
                console.log('📅 [FILTER-EVENTS] Data início salva:', this.value);
                
                // Auto-aplicar filtros após mudança
                setTimeout(() => {
                    if (typeof window.applyInfraFilters === 'function') {
                        window.applyInfraFilters();
                    }
                }, 100);
            }
        });
        
        dataInicio.addEventListener('blur', function() {
            // Salvar também no blur para garantir
            if (window.filterState && this.value) {
                window.filterState.updateFilter('dataInicio', this.value);
            }
        });
    }
    
    // Listener para Data Fim
    const dataFim = document.getElementById('infraFilterDataFim');
    if (dataFim) {
        dataFim.addEventListener('change', function() {
            if (window.filterState) {
                window.filterState.updateFilter('dataFim', this.value);
                console.log('📅 [FILTER-EVENTS] Data fim salva:', this.value);
                
                // Auto-aplicar filtros após mudança
                setTimeout(() => {
                    if (typeof window.applyInfraFilters === 'function') {
                        window.applyInfraFilters();
                    }
                }, 100);
            }
        });
        
        dataFim.addEventListener('blur', function() {
            // Salvar também no blur para garantir
            if (window.filterState && this.value) {
                window.filterState.updateFilter('dataFim', this.value);
            }
        });
    }
    
    console.log('✅ [FILTER-EVENTS] Listeners configurados para inputs de data');
}

// ============= INTEGRAÇÃO COM MULTI-SELECTS =============
document.addEventListener('multiSelectChange', function(event) {
    console.log('🎯 [FILTER-EVENTS] Multi-select mudou:', event.detail);
    
    // Auto-aplicar filtros após mudança em multi-select
    setTimeout(() => {
        if (typeof window.applyInfraFilters === 'function') {
            window.applyInfraFilters();
        }
    }, 100);
});

// ============= EVITAR RESET DURANTE POPULAÇÃO DE FILTROS =============
let isRestoringFilters = false;

window.setRestoringFiltersFlag = function(value) {
    isRestoringFilters = value;
    console.log('🔒 [FILTER-EVENTS] Flag de restauração:', value);
};

// Interceptar populateFilterSelect para não interferir durante restauração
const originalPopulateFilterSelect = window.populateFilterSelect;
if (originalPopulateFilterSelect) {
    window.populateFilterSelect = function(...args) {
        if (isRestoringFilters) {
            console.log('🔒 [FILTER-EVENTS] População bloqueada durante restauração');
            return;
        }
        return originalPopulateFilterSelect.apply(this, args);
    };
}

console.log('✅ [FILTER-EVENTS] Listeners de filtros configurados com sucesso');