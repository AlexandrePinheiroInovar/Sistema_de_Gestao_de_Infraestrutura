// ============= SISTEMA DE FILTROS MULTI-SELECT COM BUSCA =============
console.log('🔍 [MULTI-SELECT-FILTERS] Inicializando sistema de filtros multi-select...');

// ============= CONFIGURAÇÕES =============
let multiSelectInstances = {};
let filterData = {};

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [MULTI-SELECT-FILTERS] DOM carregado, inicializando filtros...');
    
    // Aguardar o firebase estar carregado
    setTimeout(() => {
        initializeMultiSelectFilters();
    }, 3000);
});

// ============= INICIALIZAR FILTROS MULTI-SELECT =============
async function initializeMultiSelectFilters() {
    console.log('🔧 [MULTI-SELECT-FILTERS] Configurando filtros multi-select...');
    
    try {
        // Lista de filtros para converter em multi-select
        const filterConfigs = [
            { id: 'infraFilterProjeto', field: 'projeto', placeholder: 'Selecione projetos...' },
            { id: 'infraFilterSubProjeto', field: 'subProjeto', placeholder: 'Selecione sub-projetos...' },
            { id: 'infraFilterEquipe', field: 'equipe', placeholder: 'Selecione equipes...' },
            { id: 'infraFilterStatus', field: 'status', placeholder: 'Selecione status...' },
            { id: 'infraFilterCidade', field: 'cidade', placeholder: 'Selecione cidades...' },
            { id: 'infraFilterSupervisor', field: 'supervisor', placeholder: 'Selecione supervisores...' },
            { id: 'infraFilterTipoAcao', field: 'tipoAcao', placeholder: 'Selecione tipos de ação...' },
            { id: 'infraFilterCondominio', field: 'condominio', placeholder: 'Selecione condomínios...' }
        ];
        
        // Carregar dados únicos de cada campo
        await loadFilterData();
        
        // Converter cada select em multi-select
        filterConfigs.forEach(config => {
            convertToMultiSelect(config.id, config.field, config.placeholder);
        });
        
        console.log('✅ [MULTI-SELECT-FILTERS] Filtros multi-select configurados');
        
    } catch (error) {
        console.error('❌ [MULTI-SELECT-FILTERS] Erro ao inicializar filtros:', error);
    }
}

// ============= CARREGAR DADOS PARA FILTROS =============
async function loadFilterData() {
    console.log('📊 [MULTI-SELECT-FILTERS] Carregando dados únicos para filtros...');
    
    try {
        // Aguardar Firebase estar pronto
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            throw new Error('Firebase não está disponível');
        }
        
        // Aguardar conexão
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Carregar todos os endereços
        const snapshot = await firebase.firestore().collection('enderecos').get();
        const enderecos = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            enderecos.push(data);
        });
        
        console.log('📋 [MULTI-SELECT-FILTERS] Carregados', enderecos.length, 'registros para filtros');
        
        // Extrair valores únicos de cada campo
        filterData = {
            projeto: [...new Set(enderecos.map(e => e.projeto).filter(v => v && v.trim()))].sort(),
            subProjeto: [...new Set(enderecos.map(e => e.subProjeto).filter(v => v && v.trim()))].sort(),
            equipe: [...new Set(enderecos.map(e => e.equipe).filter(v => v && v.trim()))].sort(),
            status: [...new Set(enderecos.map(e => e.status).filter(v => v && v.trim()))].sort(),
            cidade: [...new Set(enderecos.map(e => e.cidade).filter(v => v && v.trim()))].sort(),
            supervisor: [...new Set(enderecos.map(e => e.supervisor).filter(v => v && v.trim()))].sort(),
            tipoAcao: [...new Set(enderecos.map(e => e.tipoAcao).filter(v => v && v.trim()))].sort(),
            condominio: [...new Set(enderecos.map(e => e.condominio).filter(v => v && v.trim()))].sort()
        };
        
        console.log('🎯 [MULTI-SELECT-FILTERS] Dados únicos extraídos:', filterData);
        
    } catch (error) {
        console.error('❌ [MULTI-SELECT-FILTERS] Erro ao carregar dados dos filtros:', error);
    }
}

// ============= CONVERTER SELECT PARA MULTI-SELECT =============
function convertToMultiSelect(selectId, fieldName, placeholder) {
    const originalSelect = document.getElementById(selectId);
    if (!originalSelect) {
        console.warn(`⚠️ [MULTI-SELECT-FILTERS] Select ${selectId} não encontrado`);
        return;
    }
    
    // Dados para este filtro
    const options = filterData[fieldName] || [];
    
    // Criar container do multi-select
    const container = document.createElement('div');
    container.className = 'checkbox-dropdown';
    container.setAttribute('data-field', fieldName);
    
    // Criar botão principal
    const button = document.createElement('div');
    button.className = 'checkbox-dropdown-button';
    button.innerHTML = `
        <div class="checkbox-dropdown-selected">
            <span class="checkbox-dropdown-placeholder">${placeholder}</span>
        </div>
        <span class="checkbox-dropdown-arrow">▼</span>
    `;
    
    // Criar conteúdo do dropdown
    const content = document.createElement('div');
    content.className = 'checkbox-dropdown-content';
    
    // Adicionar campo de busca
    const searchDiv = document.createElement('div');
    searchDiv.className = 'checkbox-dropdown-search';
    searchDiv.innerHTML = '<input type="text" placeholder="🔍 Buscar..." autocomplete="off">';
    content.appendChild(searchDiv);
    
    // Adicionar opções
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'checkbox-dropdown-items';
    
    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'checkbox-dropdown-item';
        item.setAttribute('data-value', option);
        item.innerHTML = `
            <input type="checkbox" class="checkbox-dropdown-checkbox" value="${option}">
            <label class="checkbox-dropdown-label">${option}</label>
        `;
        itemsContainer.appendChild(item);
    });
    
    content.appendChild(itemsContainer);
    
    // Montar container
    container.appendChild(button);
    container.appendChild(content);
    
    // Substituir select original
    originalSelect.parentNode.replaceChild(container, originalSelect);
    
    // Configurar eventos
    setupMultiSelectEvents(container, fieldName);
    
    // Armazenar instância
    multiSelectInstances[selectId] = {
        container: container,
        fieldName: fieldName,
        selectedValues: []
    };
    
    console.log(`✅ [MULTI-SELECT-FILTERS] Multi-select criado para ${fieldName} com ${options.length} opções`);
}

// ============= CONFIGURAR EVENTOS DO MULTI-SELECT =============
function setupMultiSelectEvents(container, fieldName) {
    const button = container.querySelector('.checkbox-dropdown-button');
    const content = container.querySelector('.checkbox-dropdown-content');
    const searchInput = container.querySelector('.checkbox-dropdown-search input');
    const itemsContainer = container.querySelector('.checkbox-dropdown-items');
    const selectedDiv = container.querySelector('.checkbox-dropdown-selected');
    
    // Toggle dropdown
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(container);
    });
    
    // Busca
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const items = itemsContainer.querySelectorAll('.checkbox-dropdown-item');
        
        items.forEach(item => {
            const label = item.querySelector('.checkbox-dropdown-label').textContent.toLowerCase();
            item.style.display = label.includes(searchTerm) ? 'flex' : 'none';
        });
    });
    
    // Seleção de itens
    itemsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.checkbox-dropdown-item');
        if (!item) return;
        
        const checkbox = item.querySelector('input[type="checkbox"]');
        const value = item.getAttribute('data-value');
        
        // Toggle checkbox
        checkbox.checked = !checkbox.checked;
        
        // Atualizar seleção visual
        item.classList.toggle('selected', checkbox.checked);
        
        // Atualizar lista de selecionados
        updateSelectedItems(container, fieldName);
    });
    
    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            container.classList.remove('open');
        }
    });
    
    // Prevenir fechamento ao clicar no conteúdo
    content.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

// ============= TOGGLE DROPDOWN =============
function toggleDropdown(container) {
    // Fechar outros dropdowns
    document.querySelectorAll('.checkbox-dropdown.open').forEach(dropdown => {
        if (dropdown !== container) {
            dropdown.classList.remove('open');
        }
    });
    
    // Toggle este dropdown
    container.classList.toggle('open');
    
    // Focar na busca se abriu
    if (container.classList.contains('open')) {
        const searchInput = container.querySelector('.checkbox-dropdown-search input');
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
}

// ============= ATUALIZAR ITENS SELECIONADOS =============
function updateSelectedItems(container, fieldName) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const selectedDiv = container.querySelector('.checkbox-dropdown-selected');
    const button = container.querySelector('.checkbox-dropdown-button');
    
    // Obter valores selecionados
    const selectedValues = Array.from(checkboxes).map(cb => cb.value);
    
    // Atualizar instância
    const instanceKey = Object.keys(multiSelectInstances).find(key => 
        multiSelectInstances[key].fieldName === fieldName
    );
    if (instanceKey) {
        multiSelectInstances[instanceKey].selectedValues = selectedValues;
    }
    
    // Atualizar visualização
    if (selectedValues.length === 0) {
        selectedDiv.innerHTML = `<span class="checkbox-dropdown-placeholder">Selecione ${getFieldDisplayName(fieldName)}...</span>`;
        button.classList.remove('has-selection');
    } else {
        const tags = selectedValues.slice(0, 2).map(value => 
            `<span class="checkbox-dropdown-tag">
                ${value}
                <span class="remove" onclick="removeSelectedItem('${fieldName}', '${value}')">×</span>
            </span>`
        ).join('');
        
        const moreText = selectedValues.length > 2 ? 
            `<span class="checkbox-dropdown-counter">+${selectedValues.length - 2}</span>` : '';
        
        selectedDiv.innerHTML = `${tags}${moreText}`;
        button.classList.add('has-selection');
    }
    
    // Aplicar filtros
    applyInfraFilters();
}

// ============= REMOVER ITEM SELECIONADO =============
window.removeSelectedItem = function(fieldName, value) {
    const instanceKey = Object.keys(multiSelectInstances).find(key => 
        multiSelectInstances[key].fieldName === fieldName
    );
    
    if (!instanceKey) return;
    
    const container = multiSelectInstances[instanceKey].container;
    const checkbox = container.querySelector(`input[value="${value}"]`);
    const item = checkbox.closest('.checkbox-dropdown-item');
    
    // Desmarcar checkbox
    checkbox.checked = false;
    item.classList.remove('selected');
    
    // Atualizar visualização
    updateSelectedItems(container, fieldName);
};

// ============= OBTER NOME DE EXIBIÇÃO DO CAMPO =============
function getFieldDisplayName(fieldName) {
    const displayNames = {
        projeto: 'projetos',
        subProjeto: 'sub-projetos',
        equipe: 'equipes',
        status: 'status',
        cidade: 'cidades',
        supervisor: 'supervisores',
        tipoAcao: 'tipos de ação',
        condominio: 'condomínios'
    };
    
    return displayNames[fieldName] || fieldName;
}

// ============= OBTER VALORES SELECIONADOS =============
function getSelectedValues(fieldName) {
    const instanceKey = Object.keys(multiSelectInstances).find(key => 
        multiSelectInstances[key].fieldName === fieldName
    );
    
    return instanceKey ? multiSelectInstances[instanceKey].selectedValues : [];
}

// ============= LIMPAR TODOS OS FILTROS =============
window.clearInfraFilters = function() {
    Object.keys(multiSelectInstances).forEach(instanceKey => {
        const instance = multiSelectInstances[instanceKey];
        const container = instance.container;
        
        // Desmarcar todos os checkboxes
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.checkbox-dropdown-item').classList.remove('selected');
        });
        
        // Atualizar visualização
        updateSelectedItems(container, instance.fieldName);
    });
    
    // Limpar filtros de data também
    document.getElementById('infraFilterDataInicio').value = '';
    document.getElementById('infraFilterDataFim').value = '';
    
    // Aplicar filtros vazios
    applyInfraFilters();
    
    console.log('🔄 [MULTI-SELECT-FILTERS] Todos os filtros foram limpos');
};

// ============= APLICAR FILTROS (integração com sistema existente) =============
window.applyInfraFilters = function() {
    console.log('🔍 [MULTI-SELECT-FILTERS] Aplicando filtros...');
    
    // Coletar valores dos filtros multi-select
    const filters = {
        projeto: getSelectedValues('projeto'),
        subProjeto: getSelectedValues('subProjeto'),
        equipe: getSelectedValues('equipe'),
        status: getSelectedValues('status'),
        cidade: getSelectedValues('cidade'),
        supervisor: getSelectedValues('supervisor'),
        tipoAcao: getSelectedValues('tipoAcao'),
        condominio: getSelectedValues('condominio'),
        dataInicio: document.getElementById('infraFilterDataInicio')?.value || '',
        dataFim: document.getElementById('infraFilterDataFim')?.value || ''
    };
    
    console.log('🎯 [MULTI-SELECT-FILTERS] Filtros aplicados:', filters);
    
    // Chamar função de filtro do sistema principal
    if (window.applyFirebaseFilters && typeof window.applyFirebaseFilters === 'function') {
        await window.applyFirebaseFilters(filters);
    } else {
        console.warn('⚠️ [MULTI-SELECT-FILTERS] Função applyFirebaseFilters não encontrada');
    }
};

// ============= EXPOSIÇÃO GLOBAL =============
window.multiSelectInstances = multiSelectInstances;
window.getSelectedValues = getSelectedValues;
window.loadFilterData = loadFilterData;

console.log('✅ [MULTI-SELECT-FILTERS] Sistema de filtros multi-select carregado');