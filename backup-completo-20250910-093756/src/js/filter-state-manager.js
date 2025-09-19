// ============= GERENCIADOR DE ESTADO DOS FILTROS =============
console.log('🗄️ [FILTER-STATE] Inicializando gerenciador de estado dos filtros...');

class FilterStateManager {
    constructor() {
        this.storageKey = 'dashboard_filters_state';
        this.defaultState = {
            projeto: [],
            subProjeto: [],
            equipe: [],
            status: [],
            cidade: [],
            supervisor: [],
            tipoAcao: [],
            condominio: [],
            dataInicio: '',
            dataFim: ''
        };

        this.currentState = { ...this.defaultState };
        this.listeners = [];

        // Carregar estado salvo
        this.loadState();

        console.log('✅ [FILTER-STATE] Gerenciador inicializado com estado:', this.currentState);
    }

    // ============= GERENCIAMENTO DE ESTADO =============
    getState() {
        return { ...this.currentState };
    }

    setState(newState) {
        const oldState = { ...this.currentState };
        this.currentState = { ...this.currentState, ...newState };

        // Salvar no localStorage
        this.saveState();

        // Notificar listeners
        this.notifyListeners(oldState, this.currentState);

        console.log('🔄 [FILTER-STATE] Estado atualizado:', this.currentState);
    }

    resetState() {
        const oldState = { ...this.currentState };
        this.currentState = { ...this.defaultState };

        // Limpar localStorage
        this.clearStorage();

        // Notificar listeners
        this.notifyListeners(oldState, this.currentState);

        console.log('🧹 [FILTER-STATE] Estado resetado');
    }

    // ============= PERSISTÊNCIA =============
    saveState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentState));
            console.log('💾 [FILTER-STATE] Estado salvo no localStorage');
        } catch (error) {
            console.error('❌ [FILTER-STATE] Erro ao salvar estado:', error);
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsedState = JSON.parse(saved);
                this.currentState = { ...this.defaultState, ...parsedState };
                console.log(
                    '📥 [FILTER-STATE] Estado carregado do localStorage:',
                    this.currentState
                );
            }
        } catch (error) {
            console.error('❌ [FILTER-STATE] Erro ao carregar estado:', error);
            this.currentState = { ...this.defaultState };
        }
    }

    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ [FILTER-STATE] localStorage limpo');
        } catch (error) {
            console.error('❌ [FILTER-STATE] Erro ao limpar localStorage:', error);
        }
    }

    // ============= SISTEMA DE LISTENERS =============
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    notifyListeners(oldState, newState) {
        this.listeners.forEach(callback => {
            try {
                callback(newState, oldState);
            } catch (error) {
                console.error('❌ [FILTER-STATE] Erro em listener:', error);
            }
        });
    }

    // ============= MÉTODOS ESPECÍFICOS =============
    updateFilter(filterName, value) {
        this.setState({ [filterName]: value });
    }

    getFilter(filterName) {
        return this.currentState[filterName];
    }

    hasActiveFilters() {
        const state = this.currentState;

        // Verificar arrays
        const arrayFilters = [
            'projeto',
            'subProjeto',
            'equipe',
            'status',
            'cidade',
            'supervisor',
            'tipoAcao',
            'condominio'
        ];
        const hasArrayFilters = arrayFilters.some(
            key => Array.isArray(state[key]) && state[key].length > 0
        );

        // Verificar datas
        const hasDateFilters = state.dataInicio !== '' || state.dataFim !== '';

        const result = hasArrayFilters || hasDateFilters;
        console.log(
            '🔍 [FILTER-STATE] hasActiveFilters:',
            result,
            'Arrays:',
            hasArrayFilters,
            'Datas:',
            hasDateFilters,
            'Estado:',
            state
        );

        return result;
    }

    getActiveFiltersCount() {
        const state = this.currentState;
        let count = 0;

        // Contar arrays não vazios
        const arrayFilters = [
            'projeto',
            'subProjeto',
            'equipe',
            'status',
            'cidade',
            'supervisor',
            'tipoAcao',
            'condominio'
        ];
        arrayFilters.forEach(key => {
            if (Array.isArray(state[key]) && state[key].length > 0) {
                count += state[key].length;
            }
        });

        // Contar datas
        if (state.dataInicio !== '') {
            count++;
        }
        if (state.dataFim !== '') {
            count++;
        }

        return count;
    }
}

// ============= INSTÂNCIA GLOBAL =============
window.filterState = new FilterStateManager();

// ============= FUNÇÕES UTILITÁRIAS GLOBAIS =============
window.getFilterState = () => window.filterState.getState();
window.setFilterState = newState => window.filterState.setState(newState);
window.resetFilterState = () => window.filterState.resetState();
window.updateFilter = (filterName, value) => window.filterState.updateFilter(filterName, value);
window.hasActiveFilters = () => window.filterState.hasActiveFilters();
window.getActiveFiltersCount = () => window.filterState.getActiveFiltersCount();

// ============= INTEGRAÇÃO COM MULTI-SELECT =============
window.filterState.addListener((newState, oldState) => {
    console.log('🔄 [FILTER-STATE] Estado mudou, atualizando interface...');

    // Atualizar multi-selects com novos valores
    setTimeout(() => {
        restoreFiltersToInterface(newState);
    }, 100);
});

// ============= FUNÇÃO PARA RESTAURAR FILTROS NA INTERFACE =============
function restoreFiltersToInterface(state) {
    console.log('🎨 [FILTER-STATE] === INICIANDO RESTAURAÇÃO DE INTERFACE ===');
    console.log('🎨 [FILTER-STATE] Estado a restaurar:', state);

    // Verificar se multi-selects estão prontos
    const multiSelectIds = [
        'infraFilterProjeto',
        'infraFilterSubProjeto',
        'infraFilterEquipe',
        'infraFilterStatus',
        'infraFilterCidade',
        'infraFilterSupervisor',
        'infraFilterTipoAcao',
        'infraFilterCondominio'
    ];

    let readyCount = 0;
    multiSelectIds.forEach(id => {
        const element = document.getElementById(id);
        const hasInstance = window.multiSelectInstances && window.multiSelectInstances[id];
        console.log(`🔍 [FILTER-STATE] ${id}: elemento=${!!element}, instância=${!!hasInstance}`);
        if (element && hasInstance) {
            readyCount++;
        }
    });

    console.log(`📊 [FILTER-STATE] Multi-selects prontos: ${readyCount}/${multiSelectIds.length}`);

    // Restaurar multi-selects
    const multiSelectFilters = {
        infraFilterProjeto: state.projeto,
        infraFilterSubProjeto: state.subProjeto,
        infraFilterEquipe: state.equipe,
        infraFilterStatus: state.status,
        infraFilterCidade: state.cidade,
        infraFilterSupervisor: state.supervisor,
        infraFilterTipoAcao: state.tipoAcao,
        infraFilterCondominio: state.condominio
    };

    Object.entries(multiSelectFilters).forEach(([selectId, values]) => {
        console.log(`🔄 [FILTER-STATE] Processando ${selectId}:`, values);
        if (Array.isArray(values) && values.length > 0) {
            restoreMultiSelectValues(selectId, values);
        } else {
            console.log(`⏭️ [FILTER-STATE] Pulando ${selectId} - sem valores`);
        }
    });

    // Restaurar inputs de data
    const dataInicio = document.getElementById('infraFilterDataInicio');
    const dataFim = document.getElementById('infraFilterDataFim');

    if (dataInicio && state.dataInicio) {
        dataInicio.value = state.dataInicio;
        console.log('📅 [FILTER-STATE] Data início restaurada:', state.dataInicio);
    }

    if (dataFim && state.dataFim) {
        dataFim.value = state.dataFim;
        console.log('📅 [FILTER-STATE] Data fim restaurada:', state.dataFim);
    }

    console.log('✅ [FILTER-STATE] === RESTAURAÇÃO CONCLUÍDA ===');
}

function restoreMultiSelectValues(selectId, values) {
    console.log(`🔧 [FILTER-STATE] === RESTAURANDO ${selectId} ===`);
    console.log(`🔧 [FILTER-STATE] Valores a restaurar:`, values);

    // Tentar restaurar via instância do multi-select
    if (window.multiSelectInstances && window.multiSelectInstances[selectId]) {
        const instance = window.multiSelectInstances[selectId];
        console.log(`🔧 [FILTER-STATE] Instância encontrada para ${selectId}`);
        console.log(
            `🔧 [FILTER-STATE] Valores atuais antes da restauração:`,
            Array.from(instance.selectedValues)
        );

        // Limpar seleções atuais
        instance.selectedValues.clear();
        console.log(`🔧 [FILTER-STATE] Valores limpos`);

        // Adicionar novos valores
        values.forEach(value => {
            instance.selectedValues.add(value);
            console.log(`🔧 [FILTER-STATE] Adicionado valor: ${value}`);
        });

        console.log(`🔧 [FILTER-STATE] Valores após adição:`, Array.from(instance.selectedValues));

        // Atualizar interface
        console.log(`🔧 [FILTER-STATE] Atualizando interface...`);
        instance.updateOriginalSelect();
        console.log(`🔧 [FILTER-STATE] Select original atualizado`);
        instance.updateButtonDisplay();
        console.log(`🔧 [FILTER-STATE] Display do botão atualizado`);
        instance.renderOptions();
        console.log(`🔧 [FILTER-STATE] Opções renderizadas`);

        console.log(
            `✅ [FILTER-STATE] Multi-select ${selectId} restaurado com sucesso:`,
            Array.from(instance.selectedValues)
        );
    } else {
        console.warn(
            `⚠️ [FILTER-STATE] Instância não encontrada para ${selectId}, usando fallback`
        );
        // Fallback: restaurar select original
        const select = document.getElementById(selectId);
        if (select) {
            Array.from(select.options).forEach(option => {
                const shouldSelect = values.includes(option.value);
                option.selected = shouldSelect;
                if (shouldSelect) {
                    console.log(
                        `🔧 [FILTER-STATE] Marcando opção como selecionada: ${option.value}`
                    );
                }
            });
            console.log(`✅ [FILTER-STATE] Select ${selectId} restaurado via fallback:`, values);
        } else {
            console.error(`❌ [FILTER-STATE] Elemento ${selectId} não encontrado!`);
        }
    }
}

// ============= INICIALIZAÇÃO AUTOMÁTICA COM RETRY =============
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [FILTER-STATE] DOM carregado, restaurando filtros...');

    let retryCount = 0;
    const maxRetries = 10;

    function tryRestoreFilters() {
        retryCount++;
        console.log(`🔄 [FILTER-STATE] Tentativa ${retryCount}/${maxRetries} de restauração...`);

        const state = window.filterState.getState();
        if (!window.filterState.hasActiveFilters()) {
            console.log('📭 [FILTER-STATE] Nenhum filtro ativo para restaurar');
            return;
        }

        // Verificar se multi-selects estão prontos
        const multiSelectIds = [
            'infraFilterProjeto',
            'infraFilterSubProjeto',
            'infraFilterEquipe',
            'infraFilterStatus',
            'infraFilterCidade',
            'infraFilterSupervisor',
            'infraFilterTipoAcao',
            'infraFilterCondominio'
        ];

        let readyCount = 0;
        multiSelectIds.forEach(id => {
            if (window.multiSelectInstances && window.multiSelectInstances[id]) {
                readyCount++;
            }
        });

        console.log(
            `📊 [FILTER-STATE] Multi-selects prontos: ${readyCount}/${multiSelectIds.length}`
        );

        if (readyCount >= multiSelectIds.length * 0.8 || retryCount >= maxRetries) {
            // Se pelo menos 80% estão prontos ou esgotou tentativas
            console.log('🔄 [FILTER-STATE] Filtros ativos encontrados, restaurando...');
            restoreFiltersToInterface(state);

            // Aplicar filtros automaticamente após pequena pausa
            setTimeout(() => {
                if (typeof window.applyInfraFilters === 'function') {
                    console.log('🔥 [FILTER-STATE] Aplicando filtros automaticamente...');
                    window.applyInfraFilters();
                }
            }, 500);
        } else if (retryCount < maxRetries) {
            // Tentar novamente em 500ms
            console.log(
                '⏳ [FILTER-STATE] Multi-selects não prontos, tentando novamente em 500ms...'
            );
            setTimeout(tryRestoreFilters, 500);
        } else {
            console.warn(
                '⚠️ [FILTER-STATE] Máximo de tentativas atingido, alguns multi-selects podem não ter sido inicializados'
            );
        }
    }

    // Começar tentativas após 1 segundo
    setTimeout(tryRestoreFilters, 1000);
});

console.log('✅ [FILTER-STATE] Gerenciador de estado dos filtros carregado com sucesso');
