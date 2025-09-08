// ============= SISTEMA UNIFICADO DE FILTROS - VERSÃO LIMPA =============
console.log('🎯 [UNIFIED-FILTER] Inicializando sistema unificado de filtros...');

class UnifiedFilterSystem {
    constructor() {
        // Evitar múltiplas instâncias
        if (window.unifiedFilterSystem) {
            console.warn('⚠️ [UNIFIED-FILTER] Instância já existe, ignorando nova criação');
            return window.unifiedFilterSystem;
        }

        // Configuração dos filtros disponíveis - MAPEAMENTO EXATO DA TABELA DE ENDEREÇOS
        this.filterConfig = [
            { id: 'infraFilterProjeto', name: 'projeto', label: 'Projeto', column: 'Projeto' },
            {
                id: 'infraFilterSubProjeto',
                name: 'subProjeto',
                label: 'Sub-Projeto',
                column: 'Sub Projeto'
            },
            {
                id: 'infraFilterTipoAcao',
                name: 'tipoAcao',
                label: 'Tipo de Ação',
                column: 'Tipo de Ação'
            },
            {
                id: 'infraFilterCondominio',
                name: 'condominio',
                label: 'Condomínio',
                column: 'Condominio'
            },
            {
                id: 'infraFilterSupervisor',
                name: 'supervisor',
                label: 'Supervisor',
                column: 'Supervisor'
            },
            { id: 'infraFilterEquipe', name: 'equipe', label: 'Equipe', column: 'EQUIPE' },
            { id: 'infraFilterStatus', name: 'status', label: 'Status', column: 'Status' },
            { id: 'infraFilterCidade', name: 'cidade', label: 'Cidade', column: 'Cidade' },
            { 
                id: 'infraFilterJustificativa', 
                name: 'justificativa', 
                label: 'Justificativa', 
                column: 'JUSTIFICATIVA' 
            },
            { 
                id: 'infraFilterNodeGerencial', 
                name: 'nodeGerencial', 
                label: 'Node Gerencial', 
                column: 'NODE GERENCIAL' 
            },
            { 
                id: 'infraFilterAreaTecnica', 
                name: 'areaTecnica', 
                label: 'Área Técnica', 
                column: 'Área Técnica' 
            },
            {
                id: 'infraFilterPeriodoRecebimento',
                name: 'periodoRecebimento',
                label: 'Período de Recebimento',
                dateColumns: ['DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL']
            } // Filtro especial para datas
        ];

        // Estado atual dos filtros
        this.currentFilters = {};
        this.allData = [];
        this.filteredData = [];

        // Componentes de interface
        this.dropdownInstances = {};

        // Chave para localStorage
        this.storageKey = 'unified_filters_state';

        // Controle de tentativas
        this.retryCount = 0;
        this.maxRetries = 10;

        // Flags de controle
        this.initialized = false;
        this.interfaceCreated = false;

        // Registrar instância global
        window.unifiedFilterSystem = this;

        // Inicialização
        this.init();
    }

    async init() {
        if (this.initialized) {
            console.warn('⚠️ [UNIFIED-FILTER] Sistema já inicializado, ignorando');
            return;
        }

        console.log('🚀 [UNIFIED-FILTER] Inicializando...');
        this.initialized = true;

        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            await this.setup();
        }
    }

    async setup() {
        try {
            // Escutar evento do FirebaseTableSystem
            window.addEventListener('firebaseTableDataLoaded', event => {
                console.log('📢 [UNIFIED-FILTER] Dados recebidos do FirebaseTableSystem');
                if (event.detail && event.detail.data) {
                    this.allData = event.detail.data;
                    console.log(
                        '✅ [UNIFIED-FILTER] Dados atualizados:',
                        this.allData.length,
                        'registros'
                    );
                    this.createFilterInterface();
                    this.applyFilters();
                }
            });

            // 1. Carregar dados do Firebase
            await this.loadFirebaseData();

            // 2. Carregar estado salvo
            this.loadSavedState();

            // 3. Criar interface visual
            this.createFilterInterface();

            // 4. Aplicar filtros iniciais
            this.applyFilters();

            console.log('✅ [UNIFIED-FILTER] Sistema inicializado com sucesso');
        } catch (error) {
            console.error('❌ [UNIFIED-FILTER] Erro na inicialização:', error);
        }
    }

    // ============= CARREGAMENTO DE DADOS =============
    async loadFirebaseData() {
        console.log('📥 [UNIFIED-FILTER] Carregando dados do Firebase...');

        try {
            // 1. Tentar usar dados da variável global tableData
            if (
                window.tableData &&
                Array.isArray(window.tableData) &&
                window.tableData.length > 0
            ) {
                this.allData = window.tableData;
                console.log(
                    '✅ [UNIFIED-FILTER] Dados obtidos da variável global tableData:',
                    this.allData.length,
                    'registros'
                );
                
                // DEBUG: Mostrar estrutura de dados para análise
                if (this.allData.length > 0) {
                    console.log('🔍 [UNIFIED-FILTER] Amostra de dados (primeiro registro):', this.allData[0]);
                    console.log('🔍 [UNIFIED-FILTER] Chaves disponíveis:', Object.keys(this.allData[0]));
                    
                    // Verificar especificamente as colunas de data
                    const dateColumns = ['DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL'];
                    dateColumns.forEach(col => {
                        const value = this.allData[0][col];
                        console.log(`🔍 [UNIFIED-FILTER] Coluna '${col}':`, typeof value, value);
                    });
                }
                
                this.createFilterInterface();
                return;
            }

            // 2. Tentar usar o sistema Firebase existente
            if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
                const data = window.FirebaseTableSystem.getData();
                if (data && data.length > 0) {
                    this.allData = data;
                    console.log(
                        '✅ [UNIFIED-FILTER] Dados obtidos do FirebaseTableSystem:',
                        this.allData.length,
                        'registros'
                    );
                    this.createFilterInterface();
                    return;
                }
            }

            // 3. Fallback: tentar carregar diretamente do Firebase
            if (window.firebase && window.firebase.firestore) {
                const db = window.firebase.firestore();
                const snapshot = await db.collection('enderecos').get();

                this.allData = [];
                snapshot.forEach(doc => {
                    this.allData.push({ id: doc.id, ...doc.data() });
                });

                console.log(
                    '✅ [UNIFIED-FILTER] Dados carregados diretamente do Firebase:',
                    this.allData.length,
                    'registros'
                );
                this.createFilterInterface();
            } else {
                this.retryCount++;
                if (this.retryCount < this.maxRetries) {
                    console.warn(
                        `⚠️ [UNIFIED-FILTER] Nenhum sistema de dados disponível, aguardando... (tentativa ${this.retryCount}/${this.maxRetries})`
                    );
                    // Retry em 2 segundos
                    setTimeout(() => this.loadFirebaseData(), 2000);
                } else {
                    console.error(
                        '❌ [UNIFIED-FILTER] Máximo de tentativas excedido. Verifique se o sistema Firebase está carregando corretamente.'
                    );
                }
            }
        } catch (error) {
            console.error('❌ [UNIFIED-FILTER] Erro ao carregar dados:', error);
            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                // Retry em caso de erro
                setTimeout(() => this.loadFirebaseData(), 3000);
            }
        }
    }

    // ============= INTERFACE VISUAL =============
    createFilterInterface() {
        if (this.interfaceCreated) {
            console.warn('⚠️ [UNIFIED-FILTER] Interface já criada, ignorando');
            return;
        }

        console.log('🎨 [UNIFIED-FILTER] Criando interface visual...');
        this.interfaceCreated = true;

        this.filterConfig.forEach(config => {
            // Tratamento especial para filtro de período (datas)
            if (config.name === 'periodoRecebimento' && config.dateColumns) {
                // Detectar automaticamente as colunas corretas
                const detectedColumns = this.detectDateColumns();
                config.dateColumns = detectedColumns;
                console.log('📅 [UNIFIED-FILTER] Colunas de data atualizadas:', detectedColumns);
                this.createDateFilter(config);
                return;
            }

            const selectElement = document.getElementById(config.id);
            if (selectElement) {
                // Limpar select original
                selectElement.innerHTML = '<option value="">Todos</option>';

                // Obter valores únicos da coluna correspondente
                const uniqueValues = this.getUniqueValues(config.column);

                // Adicionar opções
                uniqueValues.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    selectElement.appendChild(option);
                });

                // Criar dropdown multi-select
                this.createMultiSelectDropdown(selectElement, config);

                console.log('✅ [UNIFIED-FILTER] Interface criada para:', config.label);
            } else {
                console.warn('⚠️ [UNIFIED-FILTER] Elemento não encontrado:', config.id);
            }
        });

        // Criar botão limpar
        this.createClearButton();
    }

    // Criar filtro de data especial para período de recebimento
    createDateFilter(config) {
        console.log('📅 [UNIFIED-FILTER] Criando filtro de data para:', config.label);
        console.log('📅 [UNIFIED-FILTER] Colunas de data configuradas:', config.dateColumns);

        // Buscar os inputs de data existentes
        const dataInicio = document.getElementById('infraFilterDataInicio');
        const dataFim = document.getElementById('infraFilterDataFim');

        if (dataInicio && dataFim) {
            // Limpar listeners anteriores
            const oldUpdateDateFilter = dataInicio.updateDateFilter || dataFim.updateDateFilter;
            if (oldUpdateDateFilter) {
                dataInicio.removeEventListener('change', oldUpdateDateFilter);
                dataFim.removeEventListener('change', oldUpdateDateFilter);
            }

            // Adicionar listeners para capturar mudanças
            const updateDateFilter = () => {
                const inicio = dataInicio.value;
                const fim = dataFim.value;

                console.log('📅 [DATE-INPUT] Valores dos inputs:', { inicio, fim });

                if (inicio || fim) {
                    this.currentFilters[config.name] = [inicio, fim];
                    console.log('📅 [DATE-INPUT] Filtro de data definido:', this.currentFilters[config.name]);
                } else {
                    delete this.currentFilters[config.name];
                    console.log('📅 [DATE-INPUT] Filtro de data removido');
                }

                this.applyFilters();
            };

            // Guardar referência do listener para poder remover depois
            dataInicio.updateDateFilter = updateDateFilter;
            dataFim.updateDateFilter = updateDateFilter;

            dataInicio.addEventListener('change', updateDateFilter);
            dataFim.addEventListener('change', updateDateFilter);

            // Também escutar eventos de input para mudanças em tempo real
            dataInicio.addEventListener('input', updateDateFilter);
            dataFim.addEventListener('input', updateDateFilter);

            console.log('✅ [UNIFIED-FILTER] Filtro de data configurado com eventos');
        } else {
            console.warn(
                '⚠️ [UNIFIED-FILTER] Inputs de data não encontrados:',
                'dataInicio:', !!dataInicio,
                'dataFim:', !!dataFim
            );
        }
    }

    createMultiSelectDropdown(selectElement, config) {
        // Verificar se já foi criado para este elemento
        if (
            selectElement.nextSibling &&
            selectElement.nextSibling.classList &&
            selectElement.nextSibling.classList.contains('unified-filter-dropdown')
        ) {
            console.warn('⚠️ [UNIFIED-FILTER] Dropdown já criado para:', config.id);
            return;
        }

        // Esconder select original
        selectElement.style.display = 'none';

        // Criar container customizado
        const container = document.createElement('div');
        container.className = 'unified-filter-dropdown';
        container.style.cssText = `
            position: relative;
            width: 100%;
            margin-bottom: 8px;
        `;

        // Inserir após o select original
        selectElement.parentNode.insertBefore(container, selectElement.nextSibling);

        // Criar botão principal
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'unified-filter-button';
        button.style.cssText = `
            width: 100%;
            min-height: 40px;
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: white;
            text-align: left;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            transition: all 0.2s;
        `;

        // Criar dropdown content
        const dropdown = document.createElement('div');
        dropdown.className = 'unified-filter-dropdown-content';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: none;
            max-height: 300px;
            overflow-y: auto;
        `;

        // Input de busca
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Buscar...';
        searchInput.style.cssText = `
            width: calc(100% - 16px);
            margin: 8px;
            padding: 8px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
        `;

        // Container de opções
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'unified-filter-options';

        // Montar estrutura
        dropdown.appendChild(searchInput);
        dropdown.appendChild(optionsContainer);
        container.appendChild(button);
        container.appendChild(dropdown);

        // Criar instância do dropdown
        const instance = {
            selectElement,
            container,
            button,
            dropdown,
            searchInput,
            optionsContainer,
            config,
            selectedValues: new Set(),
            allOptions: []
        };

        // Salvar instância
        this.dropdownInstances[config.id] = instance;

        // Configurar eventos
        this.setupDropdownEvents(instance);

        // Renderizar opções iniciais
        this.renderDropdownOptions(instance);

        // Restaurar valores salvos se houver
        if (this.currentFilters[config.name]) {
            this.currentFilters[config.name].forEach(value => {
                instance.selectedValues.add(value);
            });
            this.updateDropdownDisplay(instance);
        }
    }

    setupDropdownEvents(instance) {
        const { button, dropdown, searchInput, config } = instance;

        // Toggle dropdown
        button.addEventListener('click', e => {
            e.stopPropagation();

            // Fechar outros dropdowns
            Object.values(this.dropdownInstances).forEach(other => {
                if (other !== instance) {
                    other.dropdown.style.display = 'none';
                }
            });

            // Toggle atual
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';

            if (dropdown.style.display === 'block') {
                searchInput.focus();
            }
        });

        // Busca
        searchInput.addEventListener('input', e => {
            this.filterDropdownOptions(instance, e.target.value);
        });

        // Fechar ao clicar fora
        document.addEventListener('click', e => {
            if (!instance.container.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    renderDropdownOptions(instance) {
        const { optionsContainer, config, selectedValues } = instance;

        // Obter valores únicos
        const uniqueValues = this.getUniqueValues(config.column);
        instance.allOptions = uniqueValues;

        // Limpar container
        optionsContainer.innerHTML = '';

        // Criar opções
        uniqueValues.forEach(value => {
            const option = document.createElement('div');
            option.className = 'unified-filter-option';
            option.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: background-color 0.2s;
            `;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedValues.has(value);
            checkbox.value = value;

            const label = document.createElement('span');
            label.textContent = value;

            option.appendChild(checkbox);
            option.appendChild(label);

            // Eventos
            option.addEventListener('click', e => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }

                if (checkbox.checked) {
                    selectedValues.add(value);
                } else {
                    selectedValues.delete(value);
                }

                this.updateDropdownDisplay(instance);
                this.saveFiltersState();
                this.applyFilters();
            });

            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = '#f3f4f6';
            });

            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = '';
            });

            optionsContainer.appendChild(option);
        });
    }

    filterDropdownOptions(instance, searchTerm) {
        const { optionsContainer } = instance;
        const options = optionsContainer.querySelectorAll('.unified-filter-option');

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const matches = text.includes(searchTerm.toLowerCase());
            option.style.display = matches ? 'flex' : 'none';
        });
    }

    updateDropdownDisplay(instance) {
        const { button, selectedValues, config } = instance;
        const count = selectedValues.size;

        let displayText = config.label;
        if (count > 0) {
            if (count <= 2) {
                displayText = Array.from(selectedValues).join(', ');
            } else {
                displayText = `${count} selecionados`;
            }
        }

        button.innerHTML = `
            <span style="color: ${count > 0 ? '#374151' : '#9ca3af'}">${displayText}</span>
            <span style="transform: rotate(${button.nextElementSibling.style.display === 'block' ? '180deg' : '0deg'}); transition: transform 0.2s;">▼</span>
        `;

        // Atualizar filtro atual
        this.currentFilters[config.name] = Array.from(selectedValues);
    }

    createClearButton() {
        // Verificar se o botão já foi criado
        const existingButton = document.querySelector(
            '.unified-clear-filters-btn, .btn-filter-clear'
        );
        if (existingButton) {
            console.warn('⚠️ [UNIFIED-FILTER] Botão "Limpar Filtros" já existe, ignorando criação');
            return;
        }

        // Buscar especificamente o container designado para o botão
        let filterContainer = document.getElementById('unified-filter-actions');

        // Se não encontrar, buscar alternativas
        if (!filterContainer) {
            filterContainer = document.querySelector(
                '.filters-actions, .filter-section, .filtros-container, [class*="filter"]'
            );
        }

        if (!filterContainer) {
            console.warn('⚠️ [UNIFIED-FILTER] Container de filtros não encontrado');
            return;
        }

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'btn-clean btn-filter-clear';
        clearButton.innerHTML =
            '<span class="btn-icon">🔄</span><span class="btn-text">Limpar Filtros</span>';

        clearButton.addEventListener('click', () => {
            this.clearAllFilters();
        });

        filterContainer.appendChild(clearButton);
        console.log(
            '✅ [UNIFIED-FILTER] Botão "Limpar Filtros" inserido no container:',
            filterContainer.id || filterContainer.className
        );
    }

    // ============= LÓGICA DE FILTROS =============
    applyFilters() {
        console.log('🎯 [UNIFIED-FILTER] Aplicando filtros:', this.currentFilters);

        // Filtrar dados
        this.filteredData = this.allData.filter(item => {
            return this.filterConfig.every(config => {
                const filterValues = this.currentFilters[config.name];
                if (!filterValues || filterValues.length === 0) {
                    return true; // Sem filtro = passa
                }

                // Filtro especial para período de recebimento (datas)
                if (config.name === 'periodoRecebimento' && config.dateColumns) {
                    return this.applyDateFilter(item, config.dateColumns, filterValues);
                }

                // Filtros normais (texto)
                const itemValue = item[config.column];
                return filterValues.includes(itemValue);
            });
        });

        console.log(
            '✅ [UNIFIED-FILTER] Filtros aplicados:',
            this.filteredData.length,
            'de',
            this.allData.length,
            'registros'
        );

        // Atualizar interface
        this.updateInterface();

        // Salvar estado
        this.saveFiltersState();
    }

    // Filtro especial para datas (DATA RECEBIMENTO, DATA INICIO, DATA FINAL)
    applyDateFilter(item, dateColumns, filterValues) {
        // filterValues[0] = data início, filterValues[1] = data fim
        if (!filterValues || filterValues.length < 2) {
            return true;
        }

        const [dataInicio, dataFim] = filterValues;
        if (!dataInicio && !dataFim) {
            return true;
        }

        console.log(`📅 [DATE-FILTER] Filtrando item:`, {
            dataInicio, 
            dataFim, 
            dateColumns,
            availableKeys: Object.keys(item).filter(key => key.includes('DATA'))
        });

        // Verificar qualquer uma das colunas de data disponíveis
        const hasValidDate = dateColumns.some(column => {
            const itemDate = item[column];
            
            if (!itemDate) {
                return false; // Sem data nesta coluna, tentar próxima
            }

            // Converter para formato de data comparável
            let itemDateObj;
            try {
                // Tentar múltiplos formatos de data
                if (itemDate && typeof itemDate === 'object' && itemDate.toDate) {
                    // Firebase Timestamp
                    itemDateObj = itemDate.toDate();
                } else if (typeof itemDate === 'string') {
                    // String de data - diversos formatos
                    itemDateObj = new Date(itemDate);
                    // Se não funcionou, tentar formato brasileiro DD/MM/YYYY
                    if (isNaN(itemDateObj.getTime()) && itemDate.includes('/')) {
                        const parts = itemDate.split('/');
                        if (parts.length === 3) {
                            // Assumir DD/MM/YYYY e converter para MM/DD/YYYY
                            itemDateObj = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
                        }
                    }
                } else if (itemDate instanceof Date) {
                    // Já é um objeto Date
                    itemDateObj = itemDate;
                } else {
                    // Tentar conversão direta
                    itemDateObj = new Date(itemDate);
                }
            } catch (error) {
                console.warn(`📅 [DATE-FILTER] Erro ao converter '${itemDate}' da coluna '${column}':`, error);
                return false;
            }
            
            if (isNaN(itemDateObj.getTime())) {
                console.warn(`📅 [DATE-FILTER] Data inválida '${itemDate}' na coluna '${column}'`);
                return false;
            }

            // Aplicar filtros de data
            let passesFilter = true;

            if (dataInicio) {
                const inicioObj = new Date(dataInicio);
                if (!isNaN(inicioObj.getTime())) {
                    passesFilter = passesFilter && itemDateObj >= inicioObj;
                }
            }

            if (dataFim) {
                const fimObj = new Date(dataFim);
                if (!isNaN(fimObj.getTime())) {
                    // Adicionar 23:59:59 ao fim do dia para incluir todo o dia
                    fimObj.setHours(23, 59, 59, 999);
                    passesFilter = passesFilter && itemDateObj <= fimObj;
                }
            }

            if (passesFilter) {
                console.log(`✅ [DATE-FILTER] Data válida encontrada na coluna '${column}': ${itemDateObj.toLocaleDateString()}`);
            }
            
            return passesFilter;
        });

        console.log(`📅 [DATE-FILTER] Resultado final:`, hasValidDate);
        return hasValidDate;
    }

    clearAllFilters() {
        console.log('🧹 [UNIFIED-FILTER] Limpando todos os filtros');
        console.log('🔍 [UNIFIED-FILTER] Dados ANTES de limpar:', {
            dataCount: this.allData.length,
            firstItem: this.allData[0],
            hasDateColumns: this.allData.length > 0 ? ['DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL'].map(col => ({ [col]: this.allData[0][col] })) : 'no data'
        });

        // Limpar estado interno
        this.currentFilters = {};

        // Limpar dropdowns
        Object.values(this.dropdownInstances).forEach(instance => {
            instance.selectedValues.clear();
            this.updateDropdownDisplay(instance);
        });

        // Limpar campos de data
        const dataInicio = document.getElementById('infraFilterDataInicio');
        const dataFim = document.getElementById('infraFilterDataFim');
        if (dataInicio) {
            dataInicio.value = '';
        }
        if (dataFim) {
            dataFim.value = '';
        }

        // Aplicar filtros (vazios)
        this.applyFilters();
        
        console.log('🔍 [UNIFIED-FILTER] Dados APÓS limpar e aplicar filtros:', {
            dataCount: this.filteredData.length,
            firstItem: this.filteredData[0]
        });

        // Limpar localStorage
        localStorage.removeItem(this.storageKey);
    }

    // ============= UTILITÁRIOS =============
    
    // Detectar automaticamente os nomes corretos das colunas de data
    detectDateColumns() {
        if (!this.allData || this.allData.length === 0) {
            return ['DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL'];
        }
        
        const firstItem = this.allData[0];
        const allKeys = Object.keys(firstItem);
        
        // Possíveis variações dos nomes das colunas de data
        const dateColumnVariations = {
            recebimento: [
                'DATA RECEBIMENTO', 'Data Recebimento', 'data_recebimento', 'dataRecebimento',
                'DATA_RECEBIMENTO', 'data recebimento', 'Data_Recebimento'
            ],
            inicio: [
                'DATA INICIO', 'Data Inicio', 'DATA INÍCIO', 'Data Início', 
                'data_inicio', 'dataInicio', 'DATA_INICIO', 'data inicio', 'Data_Inicio'
            ],
            final: [
                'DATA FINAL', 'Data Final', 'data_final', 'dataFinal',
                'DATA_FINAL', 'data final', 'Data_Final'
            ]
        };
        
        const detectedColumns = [];
        
        // Detectar cada tipo de coluna
        ['recebimento', 'inicio', 'final'].forEach(type => {
            const variations = dateColumnVariations[type];
            const foundColumn = variations.find(variation => allKeys.includes(variation));
            if (foundColumn) {
                detectedColumns.push(foundColumn);
                console.log(`✅ [DATE-DETECTION] Coluna de ${type} detectada: '${foundColumn}'`);
            } else {
                console.warn(`⚠️ [DATE-DETECTION] Coluna de ${type} não encontrada. Tentativas:`, variations);
            }
        });
        
        console.log('🔍 [DATE-DETECTION] Colunas detectadas:', detectedColumns);
        console.log('🔍 [DATE-DETECTION] Todas as chaves disponíveis:', allKeys);
        
        // Retornar colunas detectadas ou usar padrão se não encontrar
        return detectedColumns.length > 0 ? detectedColumns : ['DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL'];
    }

    getUniqueValues(columnName) {
        if (!columnName || !this.allData || this.allData.length === 0) {
            return [];
        }

        const values = this.allData
            .map(item => item[columnName])
            .filter(value => value && value.toString().trim() !== '')
            .map(value => value.toString().trim());

        return [...new Set(values)].sort();
    }

    updateInterface() {
        console.log(
            '🔄 [UNIFIED-FILTER] Atualizando interface com',
            this.filteredData.length,
            'registros filtrados'
        );

        // Atualizar tabela se existir
        if (window.FirebaseTableSystem && window.FirebaseTableSystem.updateTable) {
            window.FirebaseTableSystem.updateTable(this.filteredData);
        }

        // Tentar forçar atualização dos cards usando o sistema do FirebaseTableSystem
        if (window.FirebaseTableSystem && window.FirebaseTableSystem.updateCards) {
            console.log('📈 [UNIFIED-FILTER] Atualizando cards via FirebaseTableSystem...');
            try {
                window.FirebaseTableSystem.updateCards(this.filteredData);
            } catch (error) {
                console.warn(
                    '⚠️ [UNIFIED-FILTER] Erro ao atualizar cards via FirebaseTableSystem:',
                    error
                );
            }
        }

        // Atualizar gráficos usando ChartsDashboard
        if (window.ChartsDashboard && typeof window.ChartsDashboard.atualizar === 'function') {
            console.log('📊 [UNIFIED-FILTER] Atualizando gráficos via ChartsDashboard...');
            try {
                window.ChartsDashboard.atualizar(this.filteredData);
            } catch (error) {
                console.warn(
                    '⚠️ [UNIFIED-FILTER] Erro ao atualizar gráficos via ChartsDashboard:',
                    error
                );
            }
        }

        // Fallback: tentar outras funções de gráficos
        if (typeof window.criarTodosGraficos === 'function') {
            console.log('📊 [UNIFIED-FILTER] Atualizando gráficos via criarTodosGraficos...');
            try {
                window.criarTodosGraficos();
            } catch (error) {
                console.warn(
                    '⚠️ [UNIFIED-FILTER] Erro ao atualizar gráficos via criarTodosGraficos:',
                    error
                );
            }
        }

        // Atualizar cards/estatísticas
        if (typeof window.atualizarCardsEstatisticosIntegrado === 'function') {
            console.log(
                '📈 [UNIFIED-FILTER] Atualizando cards via atualizarCardsEstatisticosIntegrado...'
            );
            try {
                window.atualizarCardsEstatisticosIntegrado(this.filteredData);
            } catch (error) {
                console.warn('⚠️ [UNIFIED-FILTER] Erro ao atualizar cards integrados:', error);
            }
        } else if (typeof window.atualizarCardsEstatisticos === 'function') {
            console.log('📈 [UNIFIED-FILTER] Atualizando cards via atualizarCardsEstatisticos...');
            try {
                window.atualizarCardsEstatisticos(this.filteredData);
            } catch (error) {
                console.warn('⚠️ [UNIFIED-FILTER] Erro ao atualizar cards estatísticos:', error);
            }
        } else if (typeof window.atualizarEstatisticas === 'function') {
            console.log('📈 [UNIFIED-FILTER] Atualizando estatísticas...');
            try {
                window.atualizarEstatisticas(this.filteredData);
            } catch (error) {
                console.warn('⚠️ [UNIFIED-FILTER] Erro ao atualizar estatísticas:', error);
            }
        }

        // Disparar evento customizado
        const event = new CustomEvent('unifiedFiltersChanged', {
            detail: {
                filters: this.currentFilters,
                filteredData: this.filteredData,
                totalCount: this.allData.length,
                filteredCount: this.filteredData.length
            }
        });
        document.dispatchEvent(event);

        console.log('✅ [UNIFIED-FILTER] Interface atualizada com sucesso');
    }

    // ============= PERSISTÊNCIA =============
    saveFiltersState() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentFilters));
            console.log('💾 [UNIFIED-FILTER] Estado salvo:', this.currentFilters);
        } catch (error) {
            console.error('❌ [UNIFIED-FILTER] Erro ao salvar estado:', error);
        }
    }

    loadSavedState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.currentFilters = JSON.parse(saved);
                console.log('📥 [UNIFIED-FILTER] Estado carregado:', this.currentFilters);
            }
        } catch (error) {
            console.error('❌ [UNIFIED-FILTER] Erro ao carregar estado:', error);
            this.currentFilters = {};
        }
    }

    // ============= API PÚBLICA =============
    getFilteredData() {
        return this.filteredData;
    }

    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    hasActiveFilters() {
        return Object.values(this.currentFilters).some(values => values && values.length > 0);
    }
}

// ============= INICIALIZAÇÃO CONTROLADA =============
let unifiedFilterSystem;

// Evitar múltiplas inicializações
if (!window.unifiedFilterSystem) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.unifiedFilterSystem) {
                unifiedFilterSystem = new UnifiedFilterSystem();
            }
        });
    } else {
        unifiedFilterSystem = new UnifiedFilterSystem();
    }
} else {
    console.log('⚠️ [UNIFIED-FILTER] Sistema já inicializado globalmente');
    unifiedFilterSystem = window.unifiedFilterSystem;
}

// ============= FUNÇÕES GLOBAIS PARA COMPATIBILIDADE =============
window.applyInfraFilters = function () {
    console.log('🔄 [UNIFIED-FILTER] applyInfraFilters() chamada (compatibilidade)');
    if (unifiedFilterSystem) {
        unifiedFilterSystem.applyFilters();
    }
};

window.clearInfraFilters = function () {
    console.log('🧹 [UNIFIED-FILTER] clearInfraFilters() chamada (compatibilidade)');
    if (unifiedFilterSystem) {
        unifiedFilterSystem.clearAllFilters();
    }
};

window.getFilterState = function () {
    console.log('📖 [UNIFIED-FILTER] getFilterState() chamada (compatibilidade)');
    return unifiedFilterSystem ? unifiedFilterSystem.getCurrentFilters() : {};
};

window.hasActiveFilters = function () {
    console.log('🔍 [UNIFIED-FILTER] hasActiveFilters() chamada (compatibilidade)');
    return unifiedFilterSystem ? unifiedFilterSystem.hasActiveFilters() : false;
};

// ============= FORÇAR INICIALIZAÇÃO APÓS CARREGAMENTO COMPLETO =============
setTimeout(() => {
    console.log('⏰ [UNIFIED-FILTER] Verificação final de inicialização...');

    if (
        unifiedFilterSystem &&
        (!unifiedFilterSystem.allData || unifiedFilterSystem.allData.length === 0)
    ) {
        console.log('🔄 [UNIFIED-FILTER] Forçando nova tentativa de carregamento...');
        unifiedFilterSystem.loadFirebaseData();
    }

    // Tentar força carregamento caso esteja na seção infraestrutura
    const infraSection = document.getElementById('infraestrutura');
    if (infraSection && infraSection.classList.contains('active')) {
        console.log('📊 [UNIFIED-FILTER] Seção infraestrutura ativa, verificando dados...');
        if (
            window.FirebaseTableSystem &&
            typeof window.FirebaseTableSystem.loadData === 'function'
        ) {
            window.FirebaseTableSystem.loadData();
        }
    }
}, 5000);

console.log('✅ [UNIFIED-FILTER] Sistema unificado de filtros carregado com sucesso');
