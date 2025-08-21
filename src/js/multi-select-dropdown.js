// ============= SISTEMA AVANÇADO DE DROPDOWNS COM SELEÇÃO MÚLTIPLA =============
console.log('🎯 [MULTI-SELECT] Inicializando sistema de dropdowns...');

// ============= CLASSE PRINCIPAL DO DROPDOWN =============
class MultiSelectDropdown {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            placeholder: 'Selecione...',
            searchable: true,
            maxTags: 3,
            closeOnSelect: false,
            showCounter: true,
            ...options
        };
        
        this.selectedValues = new Set();
        this.allOptions = [];
        this.filteredOptions = [];
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Salvar opções originais se existirem
        this.saveOriginalOptions();
        
        // Criar estrutura do dropdown
        this.createDropdownStructure();
        
        // Configurar eventos
        this.attachEvents();
        
        console.log('✅ [MULTI-SELECT] Dropdown inicializado:', this.element.id);
    }
    
    saveOriginalOptions() {
        const originalOptions = this.element.querySelectorAll('option');
        this.allOptions = Array.from(originalOptions).map(option => ({
            value: option.value,
            text: option.textContent,
            selected: option.selected
        })).filter(opt => opt.value !== ''); // Remove opção vazia
        
        // Carregar seleções iniciais
        this.allOptions.forEach(option => {
            if (option.selected) {
                this.selectedValues.add(option.value);
            }
        });
        
        this.filteredOptions = [...this.allOptions];
    }
    
    createDropdownStructure() {
        // Esconder select original
        this.element.style.display = 'none';
        
        // Criar container do dropdown
        this.dropdownContainer = document.createElement('div');
        this.dropdownContainer.className = 'checkbox-dropdown';
        this.dropdownContainer.id = `${this.element.id}_dropdown`;
        
        // Criar botão principal
        this.createButton();
        
        // Criar conteúdo do dropdown
        this.createDropdownContent();
        
        // Inserir depois do select original
        this.element.parentNode.insertBefore(this.dropdownContainer, this.element.nextSibling);
        
        // Atualizar display inicial
        this.updateButtonDisplay();
    }
    
    createButton() {
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'checkbox-dropdown-button';
        
        this.buttonContent = document.createElement('div');
        this.buttonContent.className = 'checkbox-dropdown-selected';
        
        this.arrow = document.createElement('span');
        this.arrow.className = 'checkbox-dropdown-arrow';
        this.arrow.innerHTML = '▼';
        
        this.button.appendChild(this.buttonContent);
        this.button.appendChild(this.arrow);
        this.dropdownContainer.appendChild(this.button);
        
        // Contador de seleções
        if (this.options.showCounter) {
            this.counter = document.createElement('span');
            this.counter.className = 'checkbox-dropdown-counter';
            this.counter.style.display = 'none';
            this.button.appendChild(this.counter);
        }
    }
    
    createDropdownContent() {
        this.content = document.createElement('div');
        this.content.className = 'checkbox-dropdown-content';
        
        // Campo de busca
        if (this.options.searchable) {
            this.createSearchBox();
        }
        
        // Container das opções
        this.optionsContainer = document.createElement('div');
        this.optionsContainer.className = 'checkbox-dropdown-options';
        this.content.appendChild(this.optionsContainer);
        
        // Botões de ação
        this.createActionButtons();
        
        this.dropdownContainer.appendChild(this.content);
        
        // Renderizar opções
        this.renderOptions();
    }
    
    createSearchBox() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'checkbox-dropdown-search';
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = '🔍 Buscar...';
        this.searchInput.className = 'search-input';
        
        searchContainer.appendChild(this.searchInput);
        this.content.appendChild(searchContainer);
        
        // Evento de busca
        this.searchInput.addEventListener('input', (e) => {
            this.filterOptions(e.target.value);
        });
    }
    
    createActionButtons() {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'checkbox-dropdown-actions';
        actionsContainer.style.cssText = `
            padding: 8px 12px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 8px;
            background: #f9fafb;
        `;
        
        // Botão Selecionar Todos
        const selectAllBtn = document.createElement('button');
        selectAllBtn.type = 'button';
        selectAllBtn.className = 'action-btn select-all';
        selectAllBtn.textContent = 'Todos';
        selectAllBtn.style.cssText = `
            flex: 1;
            padding: 4px 8px;
            font-size: 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            background: white;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        // Botão Limpar Todos
        const clearAllBtn = document.createElement('button');
        clearAllBtn.type = 'button';
        clearAllBtn.className = 'action-btn clear-all';
        clearAllBtn.textContent = 'Limpar';
        clearAllBtn.style.cssText = selectAllBtn.style.cssText;
        
        // Eventos dos botões
        selectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectAll();
        });
        
        clearAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearAll();
        });
        
        // Hover effects
        [selectAllBtn, clearAllBtn].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = '#3b82f6';
                btn.style.color = '#3b82f6';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = '#d1d5db';
                btn.style.color = '#374151';
            });
        });
        
        actionsContainer.appendChild(selectAllBtn);
        actionsContainer.appendChild(clearAllBtn);
        this.content.appendChild(actionsContainer);
    }
    
    renderOptions() {
        this.optionsContainer.innerHTML = '';
        
        if (this.filteredOptions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'checkbox-dropdown-no-results';
            noResults.textContent = 'Nenhum resultado encontrado';
            noResults.style.cssText = `
                padding: 12px;
                text-align: center;
                color: #6b7280;
                font-style: italic;
                font-size: 13px;
            `;
            this.optionsContainer.appendChild(noResults);
            return;
        }
        
        this.filteredOptions.forEach(option => {
            const item = document.createElement('div');
            item.className = 'checkbox-dropdown-item';
            if (this.selectedValues.has(option.value)) {
                item.classList.add('selected');
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checkbox-dropdown-checkbox';
            checkbox.checked = this.selectedValues.has(option.value);
            checkbox.value = option.value;
            
            const label = document.createElement('label');
            label.className = 'checkbox-dropdown-label';
            label.textContent = option.text;
            
            // Eventos
            const toggleSelection = (e) => {
                e.stopPropagation();
                this.toggleOption(option.value);
            };
            
            checkbox.addEventListener('change', toggleSelection);
            label.addEventListener('click', toggleSelection);
            item.addEventListener('click', toggleSelection);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            this.optionsContainer.appendChild(item);
        });
    }
    
    attachEvents() {
        // Clique no botão
        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', (e) => {
            if (!this.dropdownContainer.contains(e.target)) {
                this.close();
            }
        });
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        if (this.isOpen) return;
        
        // Fechar outros dropdowns
        this.closeOtherDropdowns();
        
        this.isOpen = true;
        this.dropdownContainer.classList.add('open');
        
        // Focar no campo de busca se existir
        if (this.searchInput) {
            setTimeout(() => this.searchInput.focus(), 100);
        }
        
        // Resetar busca
        this.filterOptions('');
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.dropdownContainer.classList.remove('open');
        
        // Limpar busca
        if (this.searchInput) {
            this.searchInput.value = '';
            this.filterOptions('');
        }
    }
    
    closeOtherDropdowns() {
        document.querySelectorAll('.checkbox-dropdown.open').forEach(dropdown => {
            if (dropdown !== this.dropdownContainer) {
                dropdown.classList.remove('open');
            }
        });
    }
    
    toggleOption(value) {
        if (this.selectedValues.has(value)) {
            this.selectedValues.delete(value);
        } else {
            this.selectedValues.add(value);
        }
        
        this.updateOriginalSelect();
        this.updateButtonDisplay();
        this.renderOptions();
        this.triggerChange();
        
        // Fechar após seleção se configurado
        if (this.options.closeOnSelect) {
            this.close();
        }
    }
    
    selectAll() {
        this.filteredOptions.forEach(option => {
            this.selectedValues.add(option.value);
        });
        
        this.updateOriginalSelect();
        this.updateButtonDisplay();
        this.renderOptions();
        this.triggerChange();
    }
    
    clearAll() {
        this.selectedValues.clear();
        
        this.updateOriginalSelect();
        this.updateButtonDisplay();
        this.renderOptions();
        this.triggerChange();
    }
    
    filterOptions(searchTerm) {
        if (!searchTerm) {
            this.filteredOptions = [...this.allOptions];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredOptions = this.allOptions.filter(option =>
                option.text.toLowerCase().includes(term)
            );
        }
        
        this.renderOptions();
    }
    
    updateOriginalSelect() {
        // Limpar seleções atuais
        Array.from(this.element.options).forEach(option => {
            option.selected = false;
        });
        
        // Aplicar novas seleções
        this.selectedValues.forEach(value => {
            const option = this.element.querySelector(`option[value="${value}"]`);
            if (option) {
                option.selected = true;
            }
        });
    }
    
    updateButtonDisplay() {
        const selectedCount = this.selectedValues.size;
        
        if (selectedCount === 0) {
            // Sem seleções
            this.buttonContent.innerHTML = `<span class="checkbox-dropdown-placeholder">${this.options.placeholder}</span>`;
            this.button.classList.remove('has-selection');
            if (this.counter) this.counter.style.display = 'none';
            
        } else {
            // Com seleções
            this.button.classList.add('has-selection');
            
            if (selectedCount <= this.options.maxTags) {
                // Mostrar tags individuais
                const tags = Array.from(this.selectedValues).map(value => {
                    const option = this.allOptions.find(opt => opt.value === value);
                    return this.createTag(option ? option.text : value, value);
                }).join('');
                
                this.buttonContent.innerHTML = tags;
                if (this.counter) this.counter.style.display = 'none';
                
            } else {
                // Mostrar contador
                this.buttonContent.innerHTML = `<span style="color: #374151; font-weight: 500;">${selectedCount} itens selecionados</span>`;
                if (this.counter) {
                    this.counter.textContent = selectedCount;
                    this.counter.style.display = 'inline-block';
                }
            }
        }
    }
    
    createTag(text, value) {
        return `
            <span class="checkbox-dropdown-tag">
                ${text}
                <span class="remove" onclick="event.stopPropagation(); window.multiSelectInstances['${this.element.id}'].removeTag('${value}')">×</span>
            </span>
        `;
    }
    
    removeTag(value) {
        this.selectedValues.delete(value);
        this.updateOriginalSelect();
        this.updateButtonDisplay();
        this.renderOptions();
        this.triggerChange();
    }
    
    triggerChange() {
        // Disparar evento change no select original
        const event = new Event('change', { bubbles: true });
        this.element.dispatchEvent(event);
    }
    
    // Métodos públicos
    getSelectedValues() {
        return Array.from(this.selectedValues);
    }
    
    setSelectedValues(values) {
        this.selectedValues = new Set(values);
        this.updateOriginalSelect();
        this.updateButtonDisplay();
        this.renderOptions();
    }
    
    addOptions(options) {
        options.forEach(option => {
            if (!this.allOptions.find(opt => opt.value === option.value)) {
                this.allOptions.push(option);
                
                // Adicionar ao select original
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                this.element.appendChild(optElement);
            }
        });
        
        this.filteredOptions = [...this.allOptions];
        this.renderOptions();
    }
    
    destroy() {
        if (this.dropdownContainer) {
            this.dropdownContainer.remove();
        }
        this.element.style.display = '';
        
        // Remover da instância global
        if (window.multiSelectInstances && window.multiSelectInstances[this.element.id]) {
            delete window.multiSelectInstances[this.element.id];
        }
    }
}

// ============= GERENCIADOR GLOBAL =============
window.multiSelectInstances = {};

function initializeMultiSelect(selector, options = {}) {
    const elements = typeof selector === 'string' ? 
        document.querySelectorAll(selector) : 
        [selector];
    
    elements.forEach(element => {
        if (element && element.tagName === 'SELECT' && element.multiple) {
            // Destruir instância anterior se existir
            if (window.multiSelectInstances[element.id]) {
                window.multiSelectInstances[element.id].destroy();
            }
            
            // Criar nova instância
            const instance = new MultiSelectDropdown(element, options);
            window.multiSelectInstances[element.id] = instance;
            
            console.log('✅ [MULTI-SELECT] Dropdown criado para:', element.id);
        }
    });
}

// ============= INICIALIZAÇÃO AUTOMÁTICA =============
function autoInitializeDropdowns() {
    // Aguardar DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitializeDropdowns);
        return;
    }
    
    console.log('🚀 [MULTI-SELECT] Inicializando dropdowns automáticamente...');
    
    // Aguardar um pouco para garantir que outros scripts carregaram
    setTimeout(() => {
        const multiSelects = document.querySelectorAll('select[multiple]');
        
        multiSelects.forEach(select => {
            if (select.id) {
                initializeMultiSelect(select, {
                    placeholder: select.getAttribute('data-placeholder') || 'Selecione...',
                    searchable: select.getAttribute('data-searchable') !== 'false',
                    maxTags: parseInt(select.getAttribute('data-max-tags')) || 3,
                    closeOnSelect: select.getAttribute('data-close-on-select') === 'true',
                    showCounter: select.getAttribute('data-show-counter') !== 'false'
                });
            }
        });
        
        console.log('✅ [MULTI-SELECT] Inicialização automática concluída');
    }, 500);
}

// ============= FUNÇÕES GLOBAIS =============
window.initializeMultiSelect = initializeMultiSelect;
window.MultiSelectDropdown = MultiSelectDropdown;

// ============= INICIALIZAR =============
autoInitializeDropdowns();

console.log('✅ [MULTI-SELECT] Sistema de dropdowns carregado');