// ============= DASHBOARD HANDLERS - INTEGRAÇÃO COM FIRESTORE =============
console.log('🎯 [DASHBOARD-HANDLERS] Inicializando handlers do dashboard v1.0...');

// ============= VARIÁVEIS GLOBAIS =============
let currentEditingId = null;
let currentUploadData = [];
let currentMapping = {};

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [DASHBOARD-HANDLERS] DOM carregado, inicializando...');
    
    // Aguardar Firebase e Firestore Integration estarem disponíveis
    setTimeout(() => {
        initializeDashboardHandlers();
        setupEventListeners();
        loadInitialData();
    }, 2000);
});

function initializeDashboardHandlers() {
    console.log('🔧 [DASHBOARD-HANDLERS] Configurando handlers...');
    
    // Verificar se os módulos necessários estão disponíveis
    if (!window.FirestoreIntegration) {
        console.error('❌ FirestoreIntegration não está disponível');
        return;
    }
    
    console.log('✅ [DASHBOARD-HANDLERS] Handlers configurados com sucesso');
}

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    // Form de endereço
    const enderecoForm = document.getElementById('enderecoForm');
    if (enderecoForm) {
        enderecoForm.addEventListener('submit', handleEnderecoSubmit);
    }
    
    // Forms de gestão de projetos
    setupGestaoForms();
    
    // Upload de planilha
    setupUploadHandlers();
    
    console.log('🎧 [DASHBOARD-HANDLERS] Event listeners configurados');
}

function setupGestaoForms() {
    const forms = [
        { id: 'projetoForm', handler: handleProjetoSubmit },
        { id: 'subprojetoForm', handler: handleSubProjetoSubmit },
        { id: 'tipoAcaoForm', handler: handleTipoAcaoSubmit },
        { id: 'supervisorForm', handler: handleSupervisorSubmit },
        { id: 'equipeForm', handler: handleEquipeSubmit },
        { id: 'cidadeForm', handler: handleCidadeSubmit }
    ];
    
    forms.forEach(form => {
        const element = document.getElementById(form.id);
        if (element) {
            element.addEventListener('submit', form.handler);
        }
    });
}

function setupUploadHandlers() {
    // Upload area drag and drop
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleFileDrop);
    }
    
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Radio buttons removidos - apenas upload local
}

// ============= HANDLERS DE FORMULÁRIOS =============
async function handleEnderecoSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const enderecoData = {};
        
        // Converter FormData para objeto
        for (let [key, value] of formData.entries()) {
            enderecoData[key] = value;
        }
        
        showMessage('💾 Salvando endereço...', 'info');
        
        const savedId = await window.FirestoreIntegration.saveEndereco(enderecoData, currentEditingId);
        
        showMessage('✅ Endereço salvo com sucesso!', 'success');
        
        // Fechar modal e recarregar tabela
        closeModal();
        await loadEnderecosTable();
        
        // Reset
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar endereço:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleProjetoSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const projetoData = {};
        
        for (let [key, value] of formData.entries()) {
            projetoData[key] = value;
        }
        
        showMessage('💾 Salvando projeto...', 'info');
        
        await window.FirestoreIntegration.saveProjeto(projetoData, currentEditingId);
        
        showMessage('✅ Projeto salvo com sucesso!', 'success');
        
        closeGestaoModal('projetoModal');
        await loadProjetosTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar projeto:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleSubProjetoSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        showMessage('💾 Salvando sub projeto...', 'info');
        
        await window.FirestoreIntegration.saveSubProjeto(data, currentEditingId);
        
        showMessage('✅ Sub projeto salvo com sucesso!', 'success');
        
        closeGestaoModal('subprojetoModal');
        await loadSubProjetosTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar sub projeto:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleTipoAcaoSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        showMessage('💾 Salvando tipo de ação...', 'info');
        
        await window.FirestoreIntegration.saveTipoAcao(data, currentEditingId);
        
        showMessage('✅ Tipo de ação salvo com sucesso!', 'success');
        
        closeGestaoModal('tipoAcaoModal');
        await loadTiposAcaoTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar tipo de ação:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleSupervisorSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        showMessage('💾 Salvando supervisor...', 'info');
        
        await window.FirestoreIntegration.saveSupervisor(data, currentEditingId);
        
        showMessage('✅ Supervisor salvo com sucesso!', 'success');
        
        closeGestaoModal('supervisorModal');
        await loadSupervisoresTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar supervisor:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleEquipeSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        showMessage('💾 Salvando equipe...', 'info');
        
        await window.FirestoreIntegration.saveEquipe(data, currentEditingId);
        
        showMessage('✅ Equipe salva com sucesso!', 'success');
        
        closeGestaoModal('equipeModal');
        await loadEquipesTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar equipe:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

async function handleCidadeSubmit(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        showMessage('💾 Salvando cidade...', 'info');
        
        await window.FirestoreIntegration.saveCidade(data, currentEditingId);
        
        showMessage('✅ Cidade salva com sucesso!', 'success');
        
        closeGestaoModal('cidadeModal');
        await loadCidadesTable();
        await loadSelectOptions(); // Recarregar dropdowns
        
        currentEditingId = null;
        form.reset();
        
    } catch (error) {
        console.error('❌ Erro ao salvar cidade:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

// ============= HANDLERS DE UPLOAD =============
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Função removida - apenas upload local

async function processFile(file) {
    try {
        showMessage('📊 Processando arquivo...', 'info');
        
        const data = await readFileData(file);
        currentUploadData = data;
        
        showPreview(data);
        setupColumnMapping(data);
        
        showMessage('✅ Arquivo carregado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

function readFileData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                let data;
                
                if (file.name.endsWith('.csv')) {
                    // Processar CSV
                    const csv = e.target.result;
                    const parsed = Papa.parse(csv, { header: true });
                    data = parsed.data;
                } else {
                    // Processar Excel
                    const arrayBuffer = e.target.result;
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    data = XLSX.utils.sheet_to_json(worksheet);
                }
                
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        
        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

function showPreview(data) {
    const previewDiv = document.getElementById('uploadPreview');
    const previewTable = document.getElementById('previewTable');
    const previewHead = document.getElementById('previewTableHead');
    const previewBody = document.getElementById('previewTableBody');
    
    if (!data || data.length === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    // Mostrar apenas as primeiras 5 linhas para preview
    const previewData = data.slice(0, 5);
    const columns = Object.keys(previewData[0]);
    
    // Cabeçalhos
    previewHead.innerHTML = `
        <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
    `;
    
    // Dados
    previewBody.innerHTML = previewData.map(row => `
        <tr>
            ${columns.map(col => `<td>${row[col] || ''}</td>`).join('')}
        </tr>
    `).join('');
    
    previewDiv.style.display = 'block';
}

function setupColumnMapping(data) {
    if (!data || data.length === 0) return;
    
    const mappingDiv = document.getElementById('uploadMapping');
    const columns = Object.keys(data[0]);
    
    // Atualizar selects de mapeamento
    const mappingSelects = document.querySelectorAll('.mapping-select');
    mappingSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione a coluna...</option>';
        
        columns.forEach(col => {
            const option = document.createElement('option');
            option.value = col;
            option.textContent = col;
            if (col === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
    
    mappingDiv.style.display = 'block';
    
    // Mostrar botão de processar
    document.getElementById('processBtn').style.display = 'inline-block';
}

async function processUpload() {
    try {
        if (!currentUploadData || currentUploadData.length === 0) {
            throw new Error('Nenhum dado para processar');
        }
        
        // Coletar mapeamento
        const mapping = {};
        const mappingSelects = document.querySelectorAll('.mapping-select');
        mappingSelects.forEach(select => {
            // Converter ID do select para campo do sistema, mantendo camelCase
            let systemField = select.id.replace('map', '');
            
            // Converter para formato correto
            switch(systemField) {
                case 'Projeto':
                    systemField = 'projeto';
                    break;
                case 'SubProjeto':
                    systemField = 'subProjeto';
                    break;
                case 'TipoAcao':
                    systemField = 'tipoAcao';
                    break;
                default:
                    systemField = systemField.toLowerCase();
            }
            
            if (select.value) {
                mapping[systemField] = select.value;
            }
        });
        
        if (Object.keys(mapping).length === 0) {
            throw new Error('Configure o mapeamento de colunas');
        }
        
        showMessage('⚡ Processando upload...', 'info');
        
        const results = await window.FirestoreIntegration.processSpreadsheetData(currentUploadData, mapping);
        
        let message = `✅ Upload concluído!\n`;
        message += `Sucessos: ${results.success}\n`;
        message += `Erros: ${results.errors}`;
        
        if (results.errors > 0) {
            message += `\n\nPrimeiros erros:\n`;
            message += results.errorDetails.slice(0, 3).map(err => 
                `Linha ${err.row}: ${err.error}`
            ).join('\n');
        }
        
        showMessage(message, results.errors > 0 ? 'warning' : 'success');
        
        // Recarregar tabela de endereços
        await loadEnderecosTable();
        
        // Fechar modal
        closeUploadModal();
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
}

// ============= CARREGAMENTO DE DADOS =============
async function loadInitialData() {
    console.log('🔄 [DASHBOARD-HANDLERS] Carregando dados iniciais...');
    
    try {
        // Carregar dropdowns
        await loadSelectOptions();
        
        // Carregar estatísticas
        await loadStatistics();
        
        // IMPORTANTE: Carregar tabela de endereços
        await loadEnderecosTable();
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de endereços carregada');
        
        // Carregar tabelas de gestão
        await loadAllManagementTables();
        
        console.log('✅ [DASHBOARD-HANDLERS] Dados iniciais carregados');
    } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
    }
}

async function loadAllManagementTables() {
    try {
        console.log('🔄 [DASHBOARD-HANDLERS] Carregando tabelas de gestão...');
        
        // Carregar todas as tabelas em paralelo para melhor performance
        await Promise.all([
            loadProjetosTable(),
            loadSubProjetosTable(),
            loadTiposAcaoTable(),
            loadSupervisoresTable(),
            loadEquipesTable(),
            loadCidadesTable()
        ]);
        
        console.log('✅ [DASHBOARD-HANDLERS] Todas as tabelas de gestão carregadas');
    } catch (error) {
        console.error('❌ [DASHBOARD-HANDLERS] Erro ao carregar tabelas de gestão:', error);
    }
}

async function loadSelectOptions() {
    try {
        console.log('🔄 [DASHBOARD-HANDLERS] Carregando opções dos dropdowns...');
        
        // Carregar todas as opções em paralelo
        const [projetos, subProjetos, tiposAcao, supervisores, equipes, cidades] = await Promise.all([
            window.FirestoreIntegration.loadProjetos(true),
            window.FirestoreIntegration.loadSubProjetos(true),
            window.FirestoreIntegration.loadTiposAcao(true),
            window.FirestoreIntegration.loadSupervisores(true),
            window.FirestoreIntegration.loadEquipes(true),
            window.FirestoreIntegration.loadCidades(true)
        ]);
        
        // Atualizar dropdowns do formulário "Novo Endereço"
        populateSelect('projeto', projetos, 'nome');
        populateSelect('subProjeto', subProjetos, 'nome');
        populateSelect('tipoAcao', tiposAcao, 'nome');
        populateSelect('supervisor', supervisores, 'nome');
        populateSelect('equipe', equipes, 'nome');
        populateSelect('cidade', cidades, 'nome');
        
        // Atualizar dropdowns dos formulários de gestão
        populateSelect('subprojetoProjeto', projetos, 'nome');
        populateSelect('equipeLider', supervisores, 'nome');
        
        // Notificar sistema de filtros para recarregar dados
        if (window.loadFilterData && typeof window.loadFilterData === 'function') {
            setTimeout(() => {
                window.loadFilterData();
            }, 1000);
        }
        
        console.log('✅ [DASHBOARD-HANDLERS] Opções dos dropdowns carregadas');
        
    } catch (error) {
        console.error('❌ Erro ao carregar opções dos selects:', error);
    }
}

function populateSelect(selectId, data, textField, valueField = 'id') {
    const select = document.getElementById(selectId);
    if (!select || !data) return;
    
    // Manter option padrão
    const defaultOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    
    if (defaultOption) {
        select.appendChild(defaultOption);
    }
    
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueField];
        option.textContent = item[textField];
        select.appendChild(option);
    });
}

async function loadStatistics() {
    try {
        const stats = await window.FirestoreIntegration.getStatistics();
        
        // Atualizar cards de estatísticas
        updateStatCard('statTotalRegistros', stats.totalRegistros);
        updateStatCard('statEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('statEquipesDistintas', stats.equipesDistintas);
        updateStatCard('statProdutividade', `${stats.produtividade}%`);
        
        // Também atualizar cards da infraestrutura se existirem
        updateStatCard('infraStatTotalRegistros', stats.totalRegistros);
        updateStatCard('infraStatEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('infraStatEquipesDistintas', stats.equipesDistintas);
        updateStatCard('infraStatProdutividade', `${stats.produtividade}%`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

async function loadEnderecosTable() {
    try {
        const enderecos = await window.FirestoreIntegration.loadEnderecos();
        const tbody = document.getElementById('enderecosTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = enderecos.map(endereco => `
            <tr>
                <td>${endereco.id}</td>
                <td>${endereco.projeto || ''}</td>
                <td>${endereco.subProjeto || ''}</td>
                <td>${endereco.tipoAcao || ''}</td>
                <td>${endereco.condominio || ''}</td>
                <td>${endereco.endereco || ''}</td>
                <td>${endereco.cidade || ''}</td>
                <td>${endereco.pep || ''}</td>
                <td>${endereco.codImovelGed || ''}</td>
                <td>${endereco.nodeGerencial || ''}</td>
                <td>${endereco.areaTecnica || ''}</td>
                <td>${endereco.hp || ''}</td>
                <td>${endereco.andar || ''}</td>
                <td>${endereco.dataRecebimento || ''}</td>
                <td>${endereco.dataInicio || ''}</td>
                <td>${endereco.dataFinal || ''}</td>
                <td>${endereco.equipe || ''}</td>
                <td>${endereco.supervisor || ''}</td>
                <td><span class="status-badge ${endereco.status?.toLowerCase()}">${endereco.status || ''}</span></td>
                <td>${endereco.rdo || ''}</td>
                <td>${endereco.book || ''}</td>
                <td>${endereco.projetoStatus || ''}</td>
                <td>${endereco.situacao || ''}</td>
                <td>${endereco.justificativa || ''}</td>
                <td>
                    <button class="btn-edit" onclick="editEndereco('${endereco.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteEndereco('${endereco.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de endereços:', error);
    }
}

// ============= FUNÇÕES DE CARREGAMENTO DAS TABELAS DE GESTÃO =============
async function loadProjetosTable() {
    try {
        const projetos = await window.FirestoreIntegration.loadProjetos();
        const tbody = document.getElementById('projetosTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = projetos.map(projeto => `
            <tr>
                <td>${projeto.id}</td>
                <td>${projeto.nome || ''}</td>
                <td>${projeto.cliente || ''}</td>
                <td>${projeto.descricao || ''}</td>
                <td><span class="status-badge ${projeto.status?.toLowerCase()}">${projeto.status || ''}</span></td>
                <td>${formatDate(projeto.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editProjeto('${projeto.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteProjeto('${projeto.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de projetos carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de projetos:', error);
    }
}

async function loadSubProjetosTable() {
    try {
        const subprojetos = await window.FirestoreIntegration.loadSubProjetos();
        const tbody = document.getElementById('subprojetosTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = subprojetos.map(subprojeto => `
            <tr>
                <td>${subprojeto.id}</td>
                <td>${subprojeto.nome || ''}</td>
                <td>${subprojeto.projetoPrincipal || ''}</td>
                <td>${subprojeto.descricao || ''}</td>
                <td><span class="status-badge ${subprojeto.status?.toLowerCase()}">${subprojeto.status || ''}</span></td>
                <td>${formatDate(subprojeto.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editSubProjeto('${subprojeto.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteSubProjeto('${subprojeto.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de sub-projetos carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de sub-projetos:', error);
    }
}

async function loadTiposAcaoTable() {
    try {
        const tiposAcao = await window.FirestoreIntegration.loadTiposAcao();
        const tbody = document.getElementById('tiposAcaoTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = tiposAcao.map(tipo => `
            <tr>
                <td>${tipo.id}</td>
                <td>${tipo.nome || ''}</td>
                <td>${tipo.descricao || ''}</td>
                <td>${tipo.categoria || ''}</td>
                <td><span class="status-badge ${tipo.status?.toLowerCase()}">${tipo.status || ''}</span></td>
                <td>${formatDate(tipo.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editTipoAcao('${tipo.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteTipoAcao('${tipo.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de tipos de ação carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de tipos de ação:', error);
    }
}

async function loadSupervisoresTable() {
    try {
        const supervisores = await window.FirestoreIntegration.loadSupervisores();
        const tbody = document.getElementById('supervisoresTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = supervisores.map(supervisor => `
            <tr>
                <td>${supervisor.id}</td>
                <td>${supervisor.nome || ''}</td>
                <td>${supervisor.email || ''}</td>
                <td>${supervisor.telefone || ''}</td>
                <td>${supervisor.area || ''}</td>
                <td><span class="status-badge ${supervisor.status?.toLowerCase()}">${supervisor.status || ''}</span></td>
                <td>${formatDate(supervisor.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editSupervisor('${supervisor.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteSupervisor('${supervisor.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de supervisores carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de supervisores:', error);
    }
}

async function loadEquipesTable() {
    try {
        const equipes = await window.FirestoreIntegration.loadEquipes();
        const tbody = document.getElementById('equipesTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = equipes.map(equipe => `
            <tr>
                <td>${equipe.id}</td>
                <td>${equipe.nome || ''}</td>
                <td>${equipe.lider || ''}</td>
                <td>${equipe.membros || ''}</td>
                <td>${equipe.especialidade || ''}</td>
                <td><span class="status-badge ${equipe.status?.toLowerCase()}">${equipe.status || ''}</span></td>
                <td>${formatDate(equipe.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editEquipe('${equipe.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteEquipe('${equipe.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de equipes carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de equipes:', error);
    }
}

async function loadCidadesTable() {
    try {
        const cidades = await window.FirestoreIntegration.loadCidades();
        const tbody = document.getElementById('cidadesTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = cidades.map(cidade => `
            <tr>
                <td>${cidade.id}</td>
                <td>${cidade.nome || ''}</td>
                <td>${cidade.estado || ''}</td>
                <td>${cidade.regiao || ''}</td>
                <td><span class="status-badge ${cidade.status?.toLowerCase()}">${cidade.status || ''}</span></td>
                <td>${formatDate(cidade.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editCidade('${cidade.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteCidade('${cidade.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
        
        console.log('✅ [DASHBOARD-HANDLERS] Tabela de cidades carregada');
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de cidades:', error);
    }
}

// Função auxiliar para formatar datas
function formatDate(timestamp) {
    if (!timestamp) return '--';
    
    let date;
    if (timestamp && timestamp.seconds) {
        // Timestamp do Firestore
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '--';
    }
    
    return date.toLocaleDateString('pt-BR');
}

// Expor função globalmente para uso em outros módulos
window.loadEnderecosTable = loadEnderecosTable;
window.loadProjetosTable = loadProjetosTable;
window.loadSubProjetosTable = loadSubProjetosTable;
window.loadTiposAcaoTable = loadTiposAcaoTable;
window.loadSupervisoresTable = loadSupervisoresTable;
window.loadEquipesTable = loadEquipesTable;
window.loadCidadesTable = loadCidadesTable;

// ============= FUNÇÕES AUXILIARES GLOBAIS - GESTÃO =============

// ============= FUNÇÕES DE EDIÇÃO =============
window.editProjeto = function(id) {
    console.log('✏️ Editando projeto:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('projetoModal').style.display = 'block';
};

window.editSubProjeto = function(id) {
    console.log('✏️ Editando sub-projeto:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('subprojetoModal').style.display = 'block';
};

window.editTipoAcao = function(id) {
    console.log('✏️ Editando tipo de ação:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('tipoAcaoModal').style.display = 'block';
};

window.editSupervisor = function(id) {
    console.log('✏️ Editando supervisor:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('supervisorModal').style.display = 'block';
};

window.editEquipe = function(id) {
    console.log('✏️ Editando equipe:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('equipeModal').style.display = 'block';
};

window.editCidade = function(id) {
    console.log('✏️ Editando cidade:', id);
    currentEditingId = id;
    // TODO: Carregar dados para edição
    document.getElementById('cidadeModal').style.display = 'block';
};

// ============= FUNÇÕES DE EXCLUSÃO =============
window.deleteProjeto = async function(id) {
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
        try {
            await window.FirestoreIntegration.deleteProjeto(id);
            showMessage('✅ Projeto excluído com sucesso!', 'success');
            await loadProjetosTable();
            // Recarregar dropdowns
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir projeto:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.deleteSubProjeto = async function(id) {
    if (confirm('Tem certeza que deseja excluir este sub-projeto?')) {
        try {
            await window.FirestoreIntegration.deleteSubProjeto(id);
            showMessage('✅ Sub-projeto excluído com sucesso!', 'success');
            await loadSubProjetosTable();
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir sub-projeto:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.deleteTipoAcao = async function(id) {
    if (confirm('Tem certeza que deseja excluir este tipo de ação?')) {
        try {
            await window.FirestoreIntegration.deleteTipoAcao(id);
            showMessage('✅ Tipo de ação excluído com sucesso!', 'success');
            await loadTiposAcaoTable();
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir tipo de ação:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.deleteSupervisor = async function(id) {
    if (confirm('Tem certeza que deseja excluir este supervisor?')) {
        try {
            await window.FirestoreIntegration.deleteSupervisor(id);
            showMessage('✅ Supervisor excluído com sucesso!', 'success');
            await loadSupervisoresTable();
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir supervisor:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.deleteEquipe = async function(id) {
    if (confirm('Tem certeza que deseja excluir esta equipe?')) {
        try {
            await window.FirestoreIntegration.deleteEquipe(id);
            showMessage('✅ Equipe excluída com sucesso!', 'success');
            await loadEquipesTable();
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir equipe:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.deleteCidade = async function(id) {
    if (confirm('Tem certeza que deseja excluir esta cidade?')) {
        try {
            await window.FirestoreIntegration.deleteCidade(id);
            showMessage('✅ Cidade excluída com sucesso!', 'success');
            await loadCidadesTable();
            await loadSelectOptions();
        } catch (error) {
            console.error('❌ Erro ao excluir cidade:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

// ============= FUNÇÕES AUXILIARES GLOBAIS - ENDEREÇOS =============
window.editEndereco = function(id) {
    console.log('✏️ Editando endereço:', id);
    currentEditingId = id;
    // TODO: Implementar carregamento de dados para edição
    document.getElementById('crudModal').style.display = 'block';
};

window.deleteEndereco = async function(id) {
    if (confirm('Tem certeza que deseja excluir este endereço?')) {
        try {
            await window.FirestoreIntegration.deleteEndereco(id);
            showMessage('✅ Endereço excluído com sucesso!', 'success');
            await loadEnderecosTable();
        } catch (error) {
            console.error('❌ Erro ao excluir endereço:', error);
            showMessage(`❌ Erro: ${error.message}`, 'error');
        }
    }
};

window.processUpload = processUpload;
window.processWebUrl = async function() {
    try {
        const urlInput = document.getElementById('webUrl');
        if (!urlInput || !urlInput.value.trim()) {
            showMessage('❌ Por favor, insira uma URL válida', 'error');
            return;
        }
        
        const url = urlInput.value.trim();
        
        // Validar URL
        if (!isValidUrl(url)) {
            showMessage('❌ URL inválida. Use uma URL completa (http:// ou https://)', 'error');
            return;
        }
        
        showMessage('🌐 Baixando planilha da web...', 'info');
        
        // Processar diferentes tipos de URL
        let processedUrl = url;
        
        // Converter Google Sheets URL para CSV
        if (url.includes('docs.google.com/spreadsheets')) {
            processedUrl = convertGoogleSheetsUrl(url);
        }
        
        // Baixar dados
        const data = await downloadWebSpreadsheet(processedUrl);
        
        if (!data || data.length === 0) {
            throw new Error('Nenhum dado encontrado na planilha');
        }
        
        // Usar os mesmos processos do upload local
        currentUploadData = data;
        
        showPreview(data);
        setupColumnMapping(data);
        
        showMessage('✅ Planilha web carregada com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro no processamento de URL web:', error);
        showMessage(`❌ Erro: ${error.message}`, 'error');
    }
};

// ============= FUNÇÕES AUXILIARES PARA UPLOAD WEB =============
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function convertGoogleSheetsUrl(url) {
    // Converter URL do Google Sheets para formato CSV
    // Exemplo: https://docs.google.com/spreadsheets/d/SHEET_ID/edit#gid=0
    // Para: https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
    
    try {
        const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
        const match = url.match(regex);
        
        if (!match) {
            throw new Error('URL do Google Sheets inválida');
        }
        
        const sheetId = match[1];
        
        // Extrair GID se existir
        let gid = '0';
        const gidMatch = url.match(/gid=(\d+)/);
        if (gidMatch) {
            gid = gidMatch[1];
        }
        
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } catch (error) {
        console.error('Erro ao converter URL do Google Sheets:', error);
        throw new Error('Não foi possível converter a URL do Google Sheets');
    }
}

async function downloadWebSpreadsheet(url) {
    try {
        console.log('📥 Baixando planilha de:', url);
        
        // Usar CORS proxy se necessário
        let fetchUrl = url;
        
        // Para URLs que podem ter CORS, tentar proxy
        if (!url.includes('docs.google.com')) {
            fetchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        }
        
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }
        
        let text;
        if (fetchUrl.includes('allorigins.win')) {
            const json = await response.json();
            text = json.contents;
        } else {
            text = await response.text();
        }
        
        // Determinar tipo de dados baseado no conteúdo
        if (url.includes('format=csv') || text.includes(',') || text.includes(';')) {
            // Processar como CSV
            return processCSVData(text);
        } else {
            throw new Error('Formato de arquivo não suportado. Use CSV ou Google Sheets.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao baixar planilha web:', error);
        
        if (error.message.includes('CORS')) {
            throw new Error('Erro de CORS. Certifique-se de que a planilha é pública ou use Google Sheets.');
        } else if (error.message.includes('404')) {
            throw new Error('Planilha não encontrada. Verifique se a URL está correta e a planilha é pública.');
        } else if (error.message.includes('403')) {
            throw new Error('Acesso negado. Certifique-se de que a planilha é pública.');
        } else {
            throw new Error(`Erro ao baixar planilha: ${error.message}`);
        }
    }
}

function processCSVData(csvText) {
    try {
        // Usar PapaParse para processar CSV
        if (typeof Papa !== 'undefined') {
            const parsed = Papa.parse(csvText, { 
                header: true,
                skipEmptyLines: true,
                transformHeader: function(header) {
                    // Limpar cabeçalhos
                    return header.trim();
                }
            });
            
            if (parsed.errors.length > 0) {
                console.warn('Avisos no processamento CSV:', parsed.errors);
            }
            
            return parsed.data;
        } else {
            // Fallback manual se PapaParse não estiver disponível
            return processCSVManually(csvText);
        }
    } catch (error) {
        console.error('❌ Erro ao processar CSV:', error);
        throw new Error('Erro ao processar dados CSV');
    }
}

function processCSVManually(csvText) {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
        throw new Error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
    }
    
    // Processar cabeçalho
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    // Processar dados
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        data.push(row);
    }
    
    return data;
}

// ============= FUNÇÕES DE MODAL =============
function closeModal() {
    document.getElementById('crudModal').style.display = 'none';
    currentEditingId = null;
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    currentUploadData = [];
    currentMapping = {};
    
    // Reset do formulário
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadMapping').style.display = 'none';
    document.getElementById('processBtn').style.display = 'none';
}

function closeGestaoModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    currentEditingId = null;
}

// ============= FUNÇÕES DE NOTIFICAÇÃO =============
function showMessage(message, type = 'info') {
    if (window.FirestoreIntegration) {
        window.FirestoreIntegration.showMessage(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

console.log('✅ [DASHBOARD-HANDLERS] Módulo carregado com sucesso');