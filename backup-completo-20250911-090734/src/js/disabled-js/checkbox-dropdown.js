// Sistema de Dropdown com Checkboxes
console.log('🎯 Carregando sistema de dropdown com checkboxes...');

class CheckboxDropdown {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            placeholder: 'Selecione...',
            searchable: true,
            maxTags: 3,
            ...options
        };
        
        this.selectedValues = [];
        this.allOptions = [];
        this.filteredOptions = [];
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Extrair opções do select original
        this.extractOptions();
        
        // Criar estrutura do dropdown
        this.createDropdown();
        
        // Adicionar event listeners
        this.addEventListeners();
        
        // Esconder select original
        this.element.style.display = 'none';
    }
    
    extractOptions() {
        const options = Array.from(this.element.options);
        this.allOptions = options
            .filter(option => option.value !== '')
            .map(option => ({
                value: option.value,
                text: option.text,
                selected: option.selected
            }));
        
        this.selectedValues = this.allOptions
            .filter(option => option.selected)
            .map(option => option.value);
            
        this.filteredOptions = [...this.allOptions];
    }
    
    createDropdown() {
        // Container principal
        this.container = document.createElement('div');
        this.container.className = 'checkbox-dropdown';
        
        // Botão do dropdown
        this.button = document.createElement('div');
        this.button.className = 'checkbox-dropdown-button';
        this.button.setAttribute('tabindex', '0');
        
        // Área de selecionados/placeholder
        this.selectedArea = document.createElement('div');
        this.selectedArea.className = 'checkbox-dropdown-selected';
        this.button.appendChild(this.selectedArea);
        
        // Seta
        this.arrow = document.createElement('div');
        this.arrow.className = 'checkbox-dropdown-arrow';
        this.arrow.innerHTML = '<i class="fas fa-chevron-down"></i>';
        this.button.appendChild(this.arrow);
        
        // Conteúdo do dropdown
        this.content = document.createElement('div');
        this.content.className = 'checkbox-dropdown-content';
        
        // Campo de busca (se habilitado)
        if (this.options.searchable) {
            this.createSearchBox();
        }
        
        // Lista de opções
        this.optionsList = document.createElement('div');
        this.optionsList.className = 'checkbox-dropdown-options';
        this.content.appendChild(this.optionsList);
        
        // Montar estrutura
        this.container.appendChild(this.button);
        this.container.appendChild(this.content);
        
        // Inserir após o select original
        this.element.parentNode.insertBefore(this.container, this.element.nextSibling);
        
        // Renderizar estado inicial
        this.renderOptions();
        this.updateButton();
    }
    
    createSearchBox() {
        this.searchContainer = document.createElement('div');
        this.searchContainer.className = 'checkbox-dropdown-search';
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = '🔍 Buscar...';
        
        this.searchContainer.appendChild(this.searchInput);
        this.content.appendChild(this.searchContainer);
        
        // Event listener para busca
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
    }
    
    renderOptions() {
        this.optionsList.innerHTML = '';
        
        this.filteredOptions.forEach(option => {
            const item = document.createElement('div');
            item.className = 'checkbox-dropdown-item';
            
            if (this.selectedValues.includes(option.value)) {
                item.classList.add('selected');
            }
            
            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox-dropdown-checkbox';
            checkbox.checked = this.selectedValues.includes(option.value);
            checkbox.value = option.value;
            
            // Label
            const label = document.createElement('div');
            label.className = 'checkbox-dropdown-label';
            label.textContent = option.text;
            
            item.appendChild(checkbox);
            item.appendChild(label);
            
            // Event listener principal no item
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.target.type !== 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                }
                this.toggleOption(option.value, checkbox.checked);
            });
            
            // Event listener direto no checkbox
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleOption(option.value, e.target.checked);
            });
            
            // Event listener no label também
            label.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                checkbox.checked = !checkbox.checked;
                this.toggleOption(option.value, checkbox.checked);
            });
            
            // Event listener para mousedown (mais responsivo)
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });
            
            this.optionsList.appendChild(item);
        });
    }
    
    toggleOption(value, checked) {
        if (checked) {
            if (!this.selectedValues.includes(value)) {
                this.selectedValues.push(value);
            }
        } else {
            this.selectedValues = this.selectedValues.filter(v => v !== value);
        }
        
        this.updateOriginalSelect();
        this.updateButton();
        this.renderOptions();
        
        // Disparar evento de mudança
        this.element.dispatchEvent(new Event('change'));
    }
    
    removeTag(value) {
        this.selectedValues = this.selectedValues.filter(v => v !== value);
        this.updateOriginalSelect();
        this.updateButton();
        this.renderOptions();
        this.element.dispatchEvent(new Event('change'));
    }
    
    updateButton() {
        if (this.selectedValues.length === 0) {
            this.selectedArea.innerHTML = `<span class="checkbox-dropdown-placeholder">${this.options.placeholder}</span>`;
            this.button.classList.remove('has-selection');
        } else {
            this.button.classList.add('has-selection');
            
            const selectedOptions = this.allOptions.filter(opt => 
                this.selectedValues.includes(opt.value)
            );
            
            let html = '';
            const maxTags = this.options.maxTags;
            
            // Mostrar tags até o limite
            for (let i = 0; i < Math.min(selectedOptions.length, maxTags); i++) {
                const option = selectedOptions[i];
                html += `
                    <span class="checkbox-dropdown-tag">
                        ${option.text}
                        <span class="remove" onclick="event.stopPropagation(); window.checkboxDropdowns['${this.element.id}'].removeTag('${option.value}')">×</span>
                    </span>
                `;
            }
            
            // Se há mais seleções, mostrar contador
            if (selectedOptions.length > maxTags) {
                const remaining = selectedOptions.length - maxTags;
                html += `<span class="checkbox-dropdown-counter">+${remaining}</span>`;
            }
            
            this.selectedArea.innerHTML = html;
        }
    }
    
    updateOriginalSelect() {
        // Atualizar o select original
        Array.from(this.element.options).forEach(option => {
            option.selected = this.selectedValues.includes(option.value);
        });
    }
    
    filterOptions(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredOptions = [...this.allOptions];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredOptions = this.allOptions.filter(option =>
                option.text.toLowerCase().includes(term)
            );
        }
        this.renderOptions();
    }
    
    open() {
        if (this.isOpen) return;
        
        this.isOpen = true;
        this.container.classList.add('open');
        
        // Focar no campo de busca se existir
        if (this.searchInput) {
            setTimeout(() => this.searchInput.focus(), 100);
        }
        
        // Fechar outros dropdowns
        document.querySelectorAll('.checkbox-dropdown.open').forEach(dropdown => {
            if (dropdown !== this.container) {
                dropdown.classList.remove('open');
            }
        });
    }
    
    close() {
        this.isOpen = false;
        this.container.classList.remove('open');
        
        // Limpar busca
        if (this.searchInput) {
            this.searchInput.value = '';
            this.filterOptions('');
        }
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    addEventListeners() {
        // Click no botão
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Keyboard navigation
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape') {
                this.close();
            }
        });
        
        // Click fora fecha o dropdown
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
    }
    
    // Método para limpar seleções
    clear() {
        this.selectedValues = [];
        this.updateOriginalSelect();
        this.updateButton();
        this.renderOptions();
        this.element.dispatchEvent(new Event('change'));
    }
}

// Armazenar instâncias globalmente para acesso pelo HTML
window.checkboxDropdowns = {};

// Função para converter selects múltiplos em checkbox dropdowns
function initializeCheckboxDropdowns() {
    const multiSelectIds = [
        'infraFilterProjeto',
        'infraFilterSubProjeto', 
        'infraFilterEquipe',
        'infraFilterStatus',
        'infraFilterCidade',
        'infraFilterSupervisor',
        'infraFilterTipoAcao'
    ];
    
    console.log('🎯 Iniciando conversão de selects para checkbox dropdowns...');
    
    multiSelectIds.forEach(selectId => {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            // Verificar se já foi inicializado
            if (window.checkboxDropdowns[selectId]) {
                console.log(`⏭️ Dropdown ${selectId} já inicializado, pulando...`);
                return;
            }
            
            console.log(`🔄 Inicializando dropdown para ${selectId}...`);
            console.log(`📊 Select tem ${selectElement.options.length} opções`);
            
            // Verificar se tem opções (além da padrão)
            if (selectElement.options.length <= 1) {
                console.warn(`⚠️ Select ${selectId} não tem opções suficientes`);
                return;
            }
            
            // Adicionar atributo multiple se não existir
            selectElement.setAttribute('multiple', 'multiple');
            
            // Criar instância do dropdown
            const dropdown = new CheckboxDropdown(selectElement, {
                placeholder: getPlaceholderText(selectId),
                searchable: true,
                maxTags: 2
            });
            
            // Armazenar instância
            window.checkboxDropdowns[selectId] = dropdown;
            
            console.log(`✅ Dropdown ${selectId} inicializado com sucesso!`);
        } else {
            console.warn(`⚠️ Elemento ${selectId} não encontrado`);
        }
    });
    
    console.log(`✅ ${Object.keys(window.checkboxDropdowns).length} dropdowns inicializados`);
}

function getPlaceholderText(selectId) {
    const placeholders = {
        'infraFilterProjeto': 'Selecione projetos...',
        'infraFilterSubProjeto': 'Selecione sub-projetos...',
        'infraFilterEquipe': 'Selecione equipes...',
        'infraFilterStatus': 'Selecione status...',
        'infraFilterCidade': 'Selecione cidades...',
        'infraFilterSupervisor': 'Selecione supervisores...',
        'infraFilterTipoAcao': 'Selecione tipos de ação...'
    };
    
    return placeholders[selectId] || 'Selecione...';
}

// Função para limpar todos os dropdowns (integração com clearInfraFilters)
window.clearAllCheckboxDropdowns = function() {
    Object.values(window.checkboxDropdowns).forEach(dropdown => {
        if (dropdown && typeof dropdown.clear === 'function') {
            dropdown.clear();
        }
    });
};

// Função para inicializar quando os filtros estiverem prontos
window.initializeCheckboxDropdownsWhenReady = function() {
    // Verificar se os selects já foram populados
    const checkIfReady = () => {
        const firstSelect = document.getElementById('infraFilterProjeto');
        if (firstSelect && firstSelect.options.length > 1) {
            initializeCheckboxDropdowns();
            console.log('✅ Sistema de checkbox dropdowns inicializado!');
            return true;
        }
        return false;
    };
    
    // Tentar inicializar imediatamente
    if (!checkIfReady()) {
        // Se não estiver pronto, verificar a cada 500ms por até 10 segundos
        let attempts = 0;
        const maxAttempts = 20;
        
        const interval = setInterval(() => {
            attempts++;
            if (checkIfReady() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts) {
                    console.warn('⚠️ Timeout ao aguardar filtros serem populados');
                }
            }
        }, 500);
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco e tentar inicializar
    setTimeout(() => {
        window.initializeCheckboxDropdownsWhenReady();
    }, 2000);
});

// Sobrescrever função clearInfraFilters para incluir limpeza dos dropdowns
const originalClearInfraFilters = window.clearInfraFilters;
if (typeof originalClearInfraFilters === 'function') {
    window.clearInfraFilters = function() {
        // Limpar dropdowns primeiro
        if (typeof clearAllCheckboxDropdowns === 'function') {
            clearAllCheckboxDropdowns();
        }
        
        // Chamar função original
        originalClearInfraFilters();
    };
}