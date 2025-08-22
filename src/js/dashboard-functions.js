// ============= FUNÇÕES AUXILIARES DO DASHBOARD =============
console.log('🔧 [DASHBOARD-FUNCTIONS] Inicializando funções auxiliares...');

// ============= FUNÇÕES DE MODAL =============
function abrirNovoEndereco() {
    console.log('➕ Abrindo modal para novo endereço');
    
    // Reset do formulário
    const form = document.getElementById('enderecoForm');
    if (form) {
        form.reset();
    }
    
    // Reset da variável de edição
    if (window.currentEditingId !== undefined) {
        window.currentEditingId = null;
    }
    
    // Atualizar título do modal
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Novo Endereço';
    }
    
    // Atualizar botão de submit
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.textContent = 'Salvar';
    }
    
    // Mostrar modal
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset da variável de edição
    if (window.currentEditingId !== undefined) {
        window.currentEditingId = null;
    }
}

function openUploadModal() {
    console.log('📁 Abrindo modal de upload');
    
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset dos dados de upload
    if (window.currentUploadData !== undefined) {
        window.currentUploadData = [];
    }
    
    // Esconder seções
    const previewDiv = document.getElementById('uploadPreview');
    const mappingDiv = document.getElementById('uploadMapping');
    const processBtn = document.getElementById('processBtn');
    
    if (previewDiv) previewDiv.style.display = 'none';
    if (mappingDiv) mappingDiv.style.display = 'none';
    if (processBtn) processBtn.style.display = 'none';
}

// ============= FUNÇÕES DE GESTÃO DE PROJETOS =============
function openGestaoModal(modalId) {
    console.log(`📋 Abrindo modal: ${modalId}`);
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Reset do formulário
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Reset da variável de edição
        if (window.currentEditingId !== undefined) {
            window.currentEditingId = null;
        }
    }
}

function closeGestaoModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Reset da variável de edição
    if (window.currentEditingId !== undefined) {
        window.currentEditingId = null;
    }
}

// ============= FUNÇÕES DE NAVEGAÇÃO =============
function showSection(sectionId, event) {
    if (event) {
        event.preventDefault();
    }
    
    console.log(`🔄 Mostrando seção: ${sectionId}`);
    
    // Esconder todas as seções
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Atualizar menu
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[onclick*="showSection('${sectionId}'"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Atualizar título da seção
    const sectionTitle = document.getElementById('section-title');
    if (sectionTitle) {
        const titles = {
            'inicio': 'Início',
            'infraestrutura': 'Dashboard - Infraestrutura',
            'enderecos': 'Cadastro de Endereços',
            'gestao-projetos': 'Gestão de Projetos'
        };
        
        sectionTitle.textContent = titles[sectionId] || sectionId;
    }
    
    // Carregar dados específicos da seção se necessário
    loadSectionData(sectionId);
}

async function loadSectionData(sectionId) {
    try {
        switch (sectionId) {
            case 'enderecos':
                // Carregar tabela de endereços
                if (typeof window.loadEnderecosTable === 'function') {
                    await window.loadEnderecosTable();
                }
                break;
                
            case 'gestao-projetos':
                // Carregar dados de gestão
                await loadGestaoData();
                break;
                
            case 'infraestrutura':
                // Carregar dados de infraestrutura
                if (typeof window.loadStatistics === 'function') {
                    await window.loadStatistics();
                }
                break;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar dados da seção ${sectionId}:`, error);
    }
}

// ============= FUNÇÕES DE GESTÃO DE ABAS =============
function showGestaoTab(tabId) {
    console.log(`📑 Mostrando aba: ${tabId}`);
    
    // Esconder todas as abas
    const tabs = document.querySelectorAll('.gestao-tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    const targetTab = document.getElementById(`gestao-${tabId}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Atualizar botões das abas
    const tabButtons = document.querySelectorAll('.gestao-tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Carregar dados da aba
    // loadTabData(tabId); // Desabilitado - usando gestao-renovada.js
}

async function loadTabData(tabId) {
    try {
        switch (tabId) {
            case 'projetos':
                await loadProjetosTable();
                break;
            case 'subprojetos':
                await loadSubProjetosTable();
                break;
            case 'tipos-acao':
                await loadTiposAcaoTable();
                break;
            case 'supervisores':
                await loadSupervisoresTable();
                break;
            case 'equipes':
                await loadEquipesTable();
                break;
            case 'cidades':
                await loadCidadesTable();
                break;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar dados da aba ${tabId}:`, error);
    }
}

// ============= FUNÇÕES DE CARREGAMENTO DE TABELAS =============
async function loadProjetosTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
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
                    <button class="btn-edit" onclick="editProjeto('${projeto.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteProjeto('${projeto.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de projetos:', error);
    }
}

async function loadSubProjetosTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
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
                    <button class="btn-edit" onclick="editSubProjeto('${subprojeto.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteSubProjeto('${subprojeto.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de sub projetos:', error);
    }
}

async function loadTiposAcaoTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
        const tipos = await window.FirestoreIntegration.loadTiposAcao();
        const tbody = document.getElementById('tiposAcaoTableBody');
        
        if (!tbody) return;
        
        tbody.innerHTML = tipos.map(tipo => `
            <tr>
                <td>${tipo.id}</td>
                <td>${tipo.nome || ''}</td>
                <td>${tipo.descricao || ''}</td>
                <td>${tipo.categoria || ''}</td>
                <td><span class="status-badge ${tipo.status?.toLowerCase()}">${tipo.status || ''}</span></td>
                <td>${formatDate(tipo.createdAt)}</td>
                <td>
                    <button class="btn-edit" onclick="editTipoAcao('${tipo.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteTipoAcao('${tipo.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de tipos de ação:', error);
    }
}

async function loadSupervisoresTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
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
                    <button class="btn-edit" onclick="editSupervisor('${supervisor.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteSupervisor('${supervisor.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de supervisores:', error);
    }
}

async function loadEquipesTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
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
                    <button class="btn-edit" onclick="editEquipe('${equipe.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteEquipe('${equipe.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de equipes:', error);
    }
}

async function loadCidadesTable() {
    try {
        if (!window.FirestoreIntegration) return;
        
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
                    <button class="btn-edit" onclick="editCidade('${cidade.id}')">✏️</button>
                    <button class="btn-delete" onclick="deleteCidade('${cidade.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar tabela de cidades:', error);
    }
}

async function loadGestaoData() {
    // Carregar dados iniciais da gestão
    await loadProjetosTable();
}

// ============= FUNÇÕES DE FILTRO E BUSCA =============
function filterTable() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const table = document.getElementById('enderecosTable');
    if (!table) return;
    
    const rows = table.getElementsByTagName('tr');
    
    for (let i = 1; i < rows.length; i++) { // Skip header
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        let found = false;
        
        for (let j = 0; j < cells.length - 1; j++) { // Skip actions column
            const cellText = cells[j].textContent.toLowerCase();
            if (cellText.includes(filter)) {
                found = true;
                break;
            }
        }
        
        row.style.display = found ? '' : 'none';
    }
}

// ============= FUNÇÕES UTILITÁRIAS =============
function formatDate(timestamp) {
    if (!timestamp || !timestamp.toDate) return '';
    
    try {
        return timestamp.toDate().toLocaleDateString('pt-BR');
    } catch (error) {
        return '';
    }
}

function testUploadWithSampleData() {
    showMessage('⚠️ Função de teste removida. Faça upload do arquivo Excel real.', 'warning');
}

function downloadTemplate() {
    console.log('📥 Baixando planilha modelo');
    
    // Criar dados da planilha modelo
    const templateData = [
        {
            'Projeto': 'CLARO',
            'Sub Projeto': 'FTTH',
            'Tipo Ação': 'ATIVAÇÃO',
            'Condomínio': 'Nome do Condomínio',
            'Endereço': 'Endereço Completo',
            'Cidade': 'Nome da Cidade',
            'PEP': 'PEP123',
            'COD IMOVEL GED': 'GED123',
            'NODE GERENCIAL': 'NODE123',
            'Área Técnica': 'PTBAA',
            'HP': '5',
            'ANDAR': '10',
            'Data Recebimento': '2024-01-15',
            'Data Início': '2024-01-20',
            'Data Final': '2024-01-25',
            'Equipe': 'Equipe A',
            'Supervisor': 'João Silva',
            'Status': 'PRODUTIVA',
            'RDO': 'SIM',
            'BOOK': 'SIM',
            'PROJETO': 'CONCLUIDO',
            'Situação': 'Finalizado',
            'Justificativa': 'Trabalho concluído com sucesso'
        }
    ];
    
    // Criar workbook
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    
    // Download
    XLSX.writeFile(wb, 'modelo-upload-enderecos.xlsx');
    
    showMessage('📥 Planilha modelo baixada com sucesso!', 'success');
}

function showMessage(message, type = 'info') {
    if (window.FirestoreIntegration && window.FirestoreIntegration.showMessage) {
        window.FirestoreIntegration.showMessage(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message);
    }
}

// ============= TORNAR FUNÇÕES GLOBAIS =============
window.abrirNovoEndereco = abrirNovoEndereco;
window.closeModal = closeModal;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.openGestaoModal = openGestaoModal;
window.closeGestaoModal = closeGestaoModal;
window.showSection = showSection;
// window.showGestaoTab = showGestaoTab; // Desabilitado - usando gestao-renovada.js
window.filterTable = filterTable;
window.testUploadWithSampleData = testUploadWithSampleData;
window.downloadTemplate = downloadTemplate;

// Tornar funções de carregamento globais também
window.loadProjetosTable = loadProjetosTable;
window.loadSubProjetosTable = loadSubProjetosTable;
window.loadTiposAcaoTable = loadTiposAcaoTable;
window.loadSupervisoresTable = loadSupervisoresTable;
window.loadEquipesTable = loadEquipesTable;
window.loadCidadesTable = loadCidadesTable;

console.log('✅ [DASHBOARD-FUNCTIONS] Funções auxiliares carregadas com sucesso');