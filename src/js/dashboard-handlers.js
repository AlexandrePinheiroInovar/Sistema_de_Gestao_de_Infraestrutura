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
    
    // Radio buttons para tipo de upload
    const uploadTypeRadios = document.querySelectorAll('input[name="uploadType"]');
    uploadTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleUploadTypeChange);
    });
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

function handleUploadTypeChange(event) {
    const webUrlInput = document.getElementById('webUrlInput');
    if (event.target.value === 'web') {
        webUrlInput.style.display = 'block';
    } else {
        webUrlInput.style.display = 'none';
    }
}

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
            const systemField = select.id.replace('map', '').toLowerCase();
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
        
        console.log('✅ [DASHBOARD-HANDLERS] Dados iniciais carregados');
    } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
    }
}

async function loadSelectOptions() {
    try {
        // Carregar projetos para dropdown
        const projetos = await window.FirestoreIntegration.loadProjetos(true);
        populateSelect('projeto', projetos, 'nome');
        
        // Carregar outras opções
        const [subProjetos, tiposAcao, supervisores, equipes, cidades] = await Promise.all([
            window.FirestoreIntegration.loadSubProjetos(true),
            window.FirestoreIntegration.loadTiposAcao(true),
            window.FirestoreIntegration.loadSupervisores(true),
            window.FirestoreIntegration.loadEquipes(true),
            window.FirestoreIntegration.loadCidades(true)
        ]);
        
        populateSelect('subProjeto', subProjetos, 'nome');
        populateSelect('tipoAcao', tiposAcao, 'nome');
        populateSelect('supervisor', supervisores, 'nome');
        populateSelect('equipe', equipes, 'nome');
        populateSelect('cidade', cidades, 'nome');
        
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

// ============= FUNÇÕES AUXILIARES GLOBAIS =============
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
window.processWebUrl = function() {
    // TODO: Implementar processamento de URL web
    showMessage('📝 Funcionalidade de URL web em desenvolvimento', 'info');
};

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