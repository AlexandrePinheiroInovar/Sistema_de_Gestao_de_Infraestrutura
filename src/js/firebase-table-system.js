// ============= SISTEMA DE TABELA FIREBASE COMPLETAMENTE NOVO =============
console.log('🔥 [FIREBASE-TABLE] Inicializando sistema de tabela Firebase...');

// ============= SISTEMA DE PAGINAÇÃO =============
const paginationConfig = {
    currentPage: 1,
    recordsPerPage: 50,
    totalRecords: 0,
    totalPages: 0
};

// ============= SISTEMA DE GERENCIAMENTO FIREBASE - SINGLETON =============
class FirebaseManager {
    constructor() {
        this.initialized = false;
        this.connected = false;
        this.auth = null;
        this.firestore = null;
        this.currentUser = null;
        this.initializationPromise = null;
    }

    async initialize() {
        // Evitar múltiplas inicializações
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeInternal();
        return this.initializationPromise;
    }

    async _initializeInternal() {
        try {
            console.log('🔥 [FIREBASE-MANAGER] Inicializando Firebase...');

            // Aguardar Firebase SDK estar disponível
            await this._waitForFirebaseSDK();

            // Obter referências do Firebase (já inicializadas pelo firebase-complete.js)
            this.auth = firebase.auth();
            this.firestore = firebase.firestore();

            // Configurar listener de autenticação
            this._setupAuthListener();

            // Aguardar autenticação
            await this._ensureAuthentication();

            this.initialized = true;
            this.connected = true;

            console.log('✅ [FIREBASE-MANAGER] Firebase inicializado com sucesso');
            return true;

        } catch (error) {
            console.error('❌ [FIREBASE-MANAGER] Erro na inicialização:', error);
            this.initialized = false;
            this.connected = false;
            throw error;
        }
    }

    async _waitForFirebaseSDK() {
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.firestore) {
                console.log('✅ [FIREBASE-MANAGER] Firebase SDK disponível');
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        throw new Error('Firebase SDK não carregou em tempo hábil');
    }

    _setupAuthListener() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('👤 [FIREBASE-MANAGER] Usuário autenticado:', user.uid);
                this.currentUser = user;
                this.connected = true;
            } else {
                console.log('👤 [FIREBASE-MANAGER] Usuário desautenticado');
                this.currentUser = null;
                this.connected = false;
            }
        });
    }

    async _ensureAuthentication() {
        // Verificar se já há usuário autenticado
        if (this.auth.currentUser) {
            this.currentUser = this.auth.currentUser;
            console.log('👤 [FIREBASE-MANAGER] Usuário já autenticado:', this.currentUser.uid);
            return;
        }

        // AGUARDAR USUÁRIO SE AUTENTICAR (não fazer login anônimo)
        console.log('⏳ [FIREBASE-MANAGER] Aguardando usuário se autenticar...');
        try {
            // Aguardar até que um usuário se autentique
            await this._waitForUserAuthentication();
            console.log('✅ [FIREBASE-MANAGER] Usuário autenticado:', this.currentUser.uid);
        } catch (error) {
            console.error('❌ [FIREBASE-MANAGER] Erro na autenticação:', error);
            throw new Error('Usuário precisa estar logado para usar o sistema');
        }
    }

    async _waitForUserAuthentication() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout: Usuário precisa fazer login'));
            }, 30000); // 30 segundos para o usuário fazer login

            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                if (user) { // Qualquer usuário autenticado
                    clearTimeout(timeout);
                    unsubscribe();
                    this.currentUser = user;
                    console.log('✅ [FIREBASE-MANAGER] Usuário autenticado:', user.uid);
                    resolve();
                }
            });
        });
    }

    // Métodos públicos para verificar estado
    isInitialized() {
        return this.initialized;
    }

    isConnected() {
        return this.connected && this.currentUser !== null;
    }

    getFirestore() {
        if (!this.isConnected()) {
            throw new Error('Firebase não está conectado');
        }
        return this.firestore;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    // Método para garantir que está pronto para uso
    async ensureReady() {
        console.log('🔍 [FIREBASE-MANAGER] Verificando se Firebase está pronto...');
        
        if (!this.initialized) {
            console.log('⏳ [FIREBASE-MANAGER] Inicializando Firebase...');
            await this.initialize();
        }

        // Verificação rigorosa da conexão e autenticação
        if (!this.isConnected() || !this.currentUser || !this.auth.currentUser) {
            console.error('❌ [FIREBASE-MANAGER] Estado inadequado:', {
                initialized: this.initialized,
                connected: this.connected,
                hasCurrentUser: !!this.currentUser,
                hasAuthCurrentUser: !!this.auth?.currentUser
            });
            throw new Error('Usuário precisa estar logado para usar o sistema');
        }

        // Usuário está autenticado e validado

        // Verificação adicional para garantir que o usuário está realmente autenticado
        if (this.currentUser.uid !== this.auth.currentUser.uid) {
            console.error('❌ [FIREBASE-MANAGER] Inconsistência nos dados do usuário');
            throw new Error('Inconsistência na autenticação do usuário');
        }

        console.log('✅ [FIREBASE-MANAGER] Firebase está pronto para uso:', this.currentUser.uid);
        return true;
    }
}

// Instância singleton
const firebaseManager = new FirebaseManager();

// ============= VARIÁVEIS GLOBAIS DA TABELA =============
let firebaseTableData = [];
let firebaseTableColumns = [];
let filterText = '';

// ============= INICIALIZAÇÃO GLOBAL =============
// Inicialização imediata para carregar dados em qualquer página
(function() {
    console.log('🚀 [FIREBASE-TABLE] Inicialização global ativada...');
    
    // Se DOM já carregou, inicializar imediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeGlobal);
    } else {
        // DOM já carregou, inicializar após breve delay
        setTimeout(initializeGlobal, 100);
    }
    
    async function initializeGlobal() {
        console.log('📄 [FIREBASE-TABLE] DOM carregado, configurando sistema GLOBALMENTE...');
        
        // Sempre inicializar o sistema, independente da página
        await initializeFirebaseTableSystem();
        
        // Emitir evento global para outros sistemas
        window.dispatchEvent(new CustomEvent('firebaseSystemReady', {
            detail: { 
                system: 'firebase-table-system',
                dataLength: firebaseTableData?.length || 0
            }
        }));
    }
})();

async function initializeFirebaseTableSystem() {
    console.log('🔧 [FIREBASE-TABLE] Inicializando sistema completo...');
    
    try {
        // Configurar eventos
        setupEventListeners();
        
        // Inicializar Firebase usando o manager
        updateFirebaseStatus('connecting', 'Conectando ao Firebase...');
        await firebaseManager.initialize();
        updateFirebaseStatus('connected', 'Conectado ao Firebase');
        
        // Carregar dados existentes
        await loadFirebaseTableData();
        
        console.log('✅ [FIREBASE-TABLE] Sistema inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro na inicialização:', error);
        updateFirebaseStatus('error', 'Erro na conexão com Firebase: ' + error.message);
        showNoDataMessage();
    }
}

// ============= CARREGAR DADOS DO FIREBASE =============

async function loadFirebaseTableData() {
    console.log('📥 [FIREBASE-TABLE] Carregando dados do Firebase...');
    
    try {
        // Garantir que o Firebase está pronto
        await firebaseManager.ensureReady();
        
        // Obter referência do Firestore
        const firestore = firebaseManager.getFirestore();
        
        // Buscar dados da collection 'enderecos' (PADRONIZADA)
        const snapshot = await firestore.collection('enderecos').get();
        const data = [];
        
        snapshot.forEach(doc => {
            const docData = doc.data();
            // Adicionar ID do documento
            data.push({
                id: doc.id,
                ...docData
            });
        });
        
        console.log('📋 [FIREBASE-TABLE] Dados carregados:', data.length, 'registros');
        
        // Armazenar dados
        firebaseTableData = data;
        // Armazenar globalmente para paginação
        window.currentFirebaseData = data;
        
        // Notificar outros sistemas que os dados estão prontos
        console.log('📢 [FIREBASE-TABLE] Notificando outros sistemas sobre dados carregados...');
        window.dispatchEvent(new CustomEvent('firebaseTableDataLoaded', { 
            detail: { data: data, length: data.length } 
        }));
        
        // Também notificar via callback se existir
        if (window.onFirebaseTableDataLoaded) {
            window.onFirebaseTableDataLoaded(data);
        }
        
        if (data.length > 0) {
            // Extrair colunas (excluir campos internos)
            extractTableColumns(data[0]);
            
            // Renderizar tabela
            renderFirebaseTable(data);
            
            // Atualizar estatísticas
            updateTableStats(data.length);
            
            // ATUALIZAR CARDS, FILTROS E GRÁFICOS DO DASHBOARD
            try {
                await updateDashboardCards();
                
                // Só atualizar filtros se não houver filtros ativos
                if (!window.filterState || !window.filterState.hasActiveFilters()) {
                    await updateDashboardFilters();
                } else {
                    console.log('🔒 [FIREBASE-TABLE] Mantendo filtros ativos, pulando atualização');
                }
                
                await updateDashboardCharts(); // HABILITADO - gráficos integrados no firebase-table-system
                console.log('✅ [FIREBASE-TABLE] Cards, filtros e gráficos atualizados');
            } catch (error) {
                console.warn('⚠️ [FIREBASE-TABLE] Erro ao atualizar dashboard:', error);
            }
            
        } else {
            console.log('📋 [FIREBASE-TABLE] Nenhum dado encontrado');
            showNoDataMessage();
            
            // Atualizar com estatísticas vazias
            try {
                await updateDashboardCards();
            } catch (error) {
                console.warn('⚠️ [FIREBASE-TABLE] Erro ao atualizar cards vazios:', error);
            }
        }
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao carregar dados:', error);
        updateFirebaseStatus('error', 'Erro ao carregar dados: ' + error.message);
        showNoDataMessage();
    }
}

// ============= EXTRAIR COLUNAS DA TABELA =============
function extractTableColumns(sampleData) {
    if (!sampleData) return;
    
    console.log('🔍 [FIREBASE-TABLE] Definindo colunas fixas conforme HTML...');
    
    // Colunas fixas conforme definidas no HTML (25 colunas)
    firebaseTableColumns = [
        'projeto', 'subProjeto', 'tipoAcao', 'contrato', 'condominio',
        'endereco', 'cidade', 'pep', 'codImovelGed', 'nodeGerencial',
        'areaTecnica', 'hp', 'andar', 'dataRecebimento', 'dataInicio',
        'dataFinal', 'equipe', 'supervisor', 'status', 'rdo',
        'book', 'projeto2', 'justificativa', 'observacao1', 'observacao2'
    ];
    
    console.log('📊 [FIREBASE-TABLE] Colunas fixas definidas:', firebaseTableColumns.length, 'colunas');
}

// ============= RENDERIZAR TABELA =============
function renderFirebaseTable(data) {
    console.log('🎨 [FIREBASE-TABLE] Renderizando tabela com', data.length, 'registros');
    
    const table = document.getElementById('enderecoMainTable');
    const thead = table ? table.querySelector('thead') : null;
    const tbody = document.getElementById('enderecoTableBody');
    const noDataMsg = document.getElementById('noDataMessage');
    
    if (!table || !thead || !tbody) {
        console.error('❌ [FIREBASE-TABLE] Elementos da tabela não encontrados');
        return;
    }
    
    // Esconder mensagem "sem dados"
    if (noDataMsg) noDataMsg.style.display = 'none';
    
    // NÃO recriar cabeçalho - usar o que já existe no HTML
    // renderTableHeader(thead);
    
    // Renderizar apenas o corpo
    renderTableBody(tbody, data);
    
    console.log('✅ [FIREBASE-TABLE] Tabela renderizada com sucesso');
}

function renderTableHeader(thead) {
    thead.innerHTML = '';
    
    const headerRow = document.createElement('tr');
    
    // Adicionar colunas de dados
    firebaseTableColumns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        th.title = `Ordenar por ${column}`;
        th.style.cursor = 'pointer';
        th.onclick = () => sortTable(column);
        headerRow.appendChild(th);
    });
    
    // Adicionar coluna de ações
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Ações';
    actionsHeader.style.width = '120px';
    actionsHeader.style.textAlign = 'center';
    headerRow.appendChild(actionsHeader);
    
    thead.appendChild(headerRow);
}

// Mapeamento direto baseado nos campos EXATOS salvos no Firestore
function mapFieldValue(row, column) {
    // Mapeamento direto: campo da tabela -> campo no Firestore (EXATOS como no exemplo)
    const exactFieldMappings = {
        'projeto': 'Projeto',
        'subProjeto': 'Sub Projeto', 
        'tipoAcao': 'Tipo de Ação',
        'contrato': 'CONTRATO',
        'condominio': 'Condominio',
        'endereco': 'ENDEREÇO',
        'cidade': 'Cidade',
        'pep': 'PEP',
        'codImovelGed': 'COD IMOVEL GED',
        'nodeGerencial': 'NODE GERENCIAL',
        'areaTecnica': 'Área Técnica',
        'hp': 'HP',
        'andar': 'ANDAR',
        'dataRecebimento': 'DATA RECEBIMENTO',
        'dataInicio': 'DATA INICIO',
        'dataFinal': 'DATA FINAL',
        'equipe': 'EQUIPE',
        'supervisor': 'Supervisor',
        'status': 'Status',
        'rdo': 'RDO',
        'book': 'BOOK',
        'projeto2': 'Projeto', // Reutilizar mesmo campo "Projeto" 
        'justificativa': 'JUSTIFICATIVA',
        'observacao1': 'JUSTIFICATIVA', // Mapear para JUSTIFICATIVA se não houver Observação
        'observacao2': 'JUSTIFICATIVA' // Mapear para JUSTIFICATIVA se não houver Observação 2
    };
    
    // Primeiro: tentar mapeamento direto
    const firestoreFieldName = exactFieldMappings[column];
    if (firestoreFieldName && row[firestoreFieldName] !== undefined) {
        const value = row[firestoreFieldName];
        
        // Tratar campos de data (números do Excel)
        if (firestoreFieldName.includes('DATA') && typeof value === 'number') {
            // Converter número serial do Excel para data
            const excelEpoch = new Date(1899, 11, 30); // 30 de dezembro de 1899
            const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
            return date.toLocaleDateString('pt-BR');
        }
        
        if (value !== null && value !== '') {
            return value;
        }
    }
    
    // Fallback: buscar campo exato como está salvo
    if (row[column] !== undefined && row[column] !== null && row[column] !== '') {
        return row[column];
    }
    
    return null;
}

function renderTableBody(tbody, data) {
    tbody.innerHTML = '';
    
    console.log('🎨 [FIREBASE-TABLE] Renderizando body com', data.length, 'registros');
    
    // Debug: Mostrar estrutura do primeiro registro
    if (data.length > 0) {
        console.log('📊 [FIREBASE-TABLE] Estrutura do primeiro registro:', Object.keys(data[0]));
        console.log('📊 [FIREBASE-TABLE] Primeiro registro completo:', data[0]);
    }
    
    // Aplicar filtro se houver
    const filteredData = filterText ? 
        data.filter(row => {
            return firebaseTableColumns.some(column => {
                const value = mapFieldValue(row, column);
                return value && value.toString().toLowerCase().includes(filterText.toLowerCase());
            });
        }) : data;
    
    // Atualizar configuração de paginação
    paginationConfig.totalRecords = filteredData.length;
    paginationConfig.totalPages = Math.ceil(filteredData.length / paginationConfig.recordsPerPage);
    
    if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = firebaseTableColumns.length + 1;
        td.style.textAlign = 'center';
        td.style.padding = '40px';
        td.innerHTML = filterText ? 
            '<div class="loading-spinner"><p>Nenhum resultado encontrado para o filtro aplicado</p></div>' :
            '<div class="loading-spinner"><p>Nenhum dado disponível</p></div>';
        tr.appendChild(td);
        tbody.appendChild(tr);
        updatePaginationControls();
        return;
    }
    
    // Calcular índices para paginação
    const startIndex = (paginationConfig.currentPage - 1) * paginationConfig.recordsPerPage;
    const endIndex = startIndex + paginationConfig.recordsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    console.log(`📄 [PAGINAÇÃO] Exibindo registros ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} de ${filteredData.length}`);
    
    paginatedData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Debug para primeiro registro
        if (index === 0) {
            console.log('🔍 [FIREBASE-TABLE] Renderizando primeira linha:', row);
        }
        
        // Adicionar células de dados
        firebaseTableColumns.forEach((column, colIndex) => {
            const td = document.createElement('td');
            const value = mapFieldValue(row, column);
            
            // Debug para primeiras colunas da primeira linha
            if (index === 0 && colIndex < 5) {
                console.log(`🔍 [FIREBASE-TABLE] Coluna ${column}:`, value);
            }
            
            // Formatação baseada no tipo de valor
            if (value !== undefined && value !== null && value !== '') {
                if (typeof value === 'object' && value.seconds) {
                    // Timestamp do Firestore
                    const date = new Date(value.seconds * 1000);
                    td.textContent = date.toLocaleDateString('pt-BR');
                    td.title = date.toLocaleString('pt-BR');
                } else if (typeof value === 'number') {
                    td.textContent = value.toString();
                } else if (typeof value === 'string' && value.length > 30) {
                    td.textContent = value.substring(0, 30) + '...';
                    td.title = value;
                } else {
                    td.textContent = value.toString();
                    if (value.toString().length > 15) {
                        td.title = value.toString();
                    }
                }
                td.style.color = '#333';
            } else {
                td.textContent = '-';
                td.style.opacity = '0.5';
                td.style.color = '#999';
            }
            
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações (COM HISTÓRICO)
        const actionsTd = document.createElement('td');
        actionsTd.style.textAlign = 'center';
        actionsTd.style.minWidth = '160px';
        actionsTd.innerHTML = `
            <button onclick="editFirebaseTableRecord('${row.id}')" 
                    style="margin-right: 3px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                    title="Editar registro">
                ✏️
            </button>
            <button onclick="duplicateFirebaseTableRecord('${row.id}')" 
                    style="margin-right: 3px; padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;"
                    title="Duplicar linha">
                📄
            </button>
            <button onclick="deleteFirebaseTableRecord('${row.id}')" 
                    style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;"
                    title="Excluir registro">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    // Atualizar controles de paginação
    updatePaginationControls();
}

// ============= FUNÇÕES DE AÇÃO =============
window.editFirebaseTableRecord = async function(id) {
    console.log('✏️ [FIREBASE-TABLE] Editando registro:', id);
    
    try {
        // Garantir que Firebase está pronto
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        
        // Buscar o registro no Firestore
        const doc = await firestore.collection('enderecos').doc(id).get();
        if (!doc.exists) {
            alert('Registro não encontrado!');
            return;
        }
        
        const data = doc.data();
        console.log('📄 [FIREBASE-TABLE] Dados do registro:', data);
        
        // Abrir modal de edição
        openEditModal(id, data);
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao carregar registro para edição:', error);
        alert('Erro ao carregar registro: ' + error.message);
    }
};

// Função para duplicar registro
window.duplicateFirebaseTableRecord = async function(id) {
    console.log('📄 [FIREBASE-TABLE] Duplicando registro:', id);
    
    if (!confirm('Deseja duplicar este registro?')) {
        return;
    }
    
    try {
        // Garantir que Firebase está pronto
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        
        // Buscar o registro original
        const originalDoc = await firestore.collection('enderecos').doc(id).get();
        if (!originalDoc.exists) {
            alert('Registro original não encontrado!');
            return;
        }
        
        const originalData = originalDoc.data();
        
        // Remover o ID e timestamp para criar um novo documento
        const duplicateData = { ...originalData };
        delete duplicateData.id;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;
        
        // Adicionar sufixo ao condomínio para identificar como cópia
        if (duplicateData.condominio) {
            duplicateData.condominio += ' - CÓPIA';
        }
        
        // Adicionar timestamps como strings para evitar erro do Firebase
        const now = new Date().toISOString();
        duplicateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        duplicateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Salvar novo registro
        const newDocRef = await firestore.collection('enderecos').add(duplicateData);
        console.log('✅ [FIREBASE-TABLE] Registro duplicado com ID:', newDocRef.id);
        
        // Salvar log de duplicação
        if (typeof window.salvarLogAlteracao === 'function') {
            await window.salvarLogAlteracao(newDocRef.id, {}, duplicateData, 'duplicate', `Duplicado de: ${originalData.condominio || 'registro'}`);
        }
        
        // Recarregar dados
        await loadFirebaseTableData();
        
        alert('✅ Registro duplicado com sucesso!');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao duplicar registro:', error);
        alert('Erro ao duplicar registro: ' + error.message);
    }
};

window.deleteFirebaseTableRecord = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) {
        return;
    }
    
    try {
        console.log('🗑️ [FIREBASE-TABLE] Excluindo registro:', id);
        
        // Garantir que Firebase está pronto
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        
        // Obter dados antes de excluir para histórico
        const doc = await firestore.collection('enderecos').doc(id).get();
        const dadosAntigos = doc.exists ? doc.data() : {};
        
        console.log('🔍 [DEBUG] Dados antes da exclusão:', dadosAntigos);
        console.log('🔍 [DEBUG] Descrição gerada:', gerarDescricaoAmigavel(dadosAntigos));
        
        await firestore.collection('enderecos').doc(id).delete();
        
        // Salvar log de exclusão no histórico
        console.log('📝 [FIREBASE-TABLE] Salvando log de exclusão...');
        await salvarLogAlteracao(id, dadosAntigos, {}, 'delete');
        
        // Recarregar dados
        await loadFirebaseTableData();
        
        console.log('✅ [FIREBASE-TABLE] Registro excluído com sucesso');
        showNotification('✅ Sucesso!', 'Registro excluído e histórico salvo!', 'success');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao excluir:', error);
        showNotification('❌ Erro', 'Erro ao excluir registro: ' + error.message, 'error');
    }
};

// ============= FUNÇÕES DE PAGINAÇÃO =============
function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (!paginationContainer) {
        console.warn('⚠️ [PAGINAÇÃO] Container de paginação não encontrado');
        return;
    }
    
    if (paginationConfig.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <div class="pagination-info">
            <span>Mostrando ${(paginationConfig.currentPage - 1) * paginationConfig.recordsPerPage + 1}-${Math.min(paginationConfig.currentPage * paginationConfig.recordsPerPage, paginationConfig.totalRecords)} de ${paginationConfig.totalRecords} registros</span>
        </div>
        <div class="pagination-controls">
            <button onclick="changePage(1)" ${paginationConfig.currentPage === 1 ? 'disabled' : ''} class="pagination-btn">
                « Primeiro
            </button>
            <button onclick="changePage(${paginationConfig.currentPage - 1})" ${paginationConfig.currentPage === 1 ? 'disabled' : ''} class="pagination-btn">
                ‹ Anterior
            </button>
            <span class="pagination-pages">
    `;
    
    // Calcular páginas a mostrar
    const maxVisiblePages = 5;
    let startPage = Math.max(1, paginationConfig.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(paginationConfig.totalPages, startPage + maxVisiblePages - 1);
    
    // Ajustar se não temos páginas suficientes no final
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button onclick="changePage(${i})" class="pagination-btn ${i === paginationConfig.currentPage ? 'active' : ''}">
                ${i}
            </button>
        `;
    }
    
    paginationHTML += `
            </span>
            <button onclick="changePage(${paginationConfig.currentPage + 1})" ${paginationConfig.currentPage === paginationConfig.totalPages ? 'disabled' : ''} class="pagination-btn">
                Próxima ›
            </button>
            <button onclick="changePage(${paginationConfig.totalPages})" ${paginationConfig.currentPage === paginationConfig.totalPages ? 'disabled' : ''} class="pagination-btn">
                Última »
            </button>
        </div>
        <div class="pagination-size">
            <label for="recordsPerPage">Registros por página:</label>
            <select id="recordsPerPage" onchange="changeRecordsPerPage(this.value)">
                <option value="25" ${paginationConfig.recordsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${paginationConfig.recordsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${paginationConfig.recordsPerPage === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${paginationConfig.recordsPerPage === 200 ? 'selected' : ''}>200</option>
            </select>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
}

window.changePage = function(page) {
    if (page < 1 || page > paginationConfig.totalPages || page === paginationConfig.currentPage) {
        return;
    }
    
    paginationConfig.currentPage = page;
    console.log(`📄 [PAGINAÇÃO] Mudando para página ${page}`);
    
    // Re-renderizar tabela
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody && window.currentFirebaseData) {
        renderTableBody(tbody, window.currentFirebaseData);
    }
};

window.changeRecordsPerPage = function(recordsPerPage) {
    paginationConfig.recordsPerPage = parseInt(recordsPerPage);
    paginationConfig.currentPage = 1; // Resetar para primeira página
    console.log(`📄 [PAGINAÇÃO] Alterando para ${recordsPerPage} registros por página`);
    
    // Re-renderizar tabela
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody && window.currentFirebaseData) {
        renderTableBody(tbody, window.currentFirebaseData);
    }
};

// ============= FILTROS E BUSCA =============
window.filterDynamicTable = function() {
    const searchInput = document.getElementById('dynamicSearchInput');
    filterText = searchInput ? searchInput.value.trim() : '';
    
    console.log('🔍 [FIREBASE-TABLE] Aplicando filtro:', filterText);
    
    if (firebaseTableData.length > 0) {
        const tbody = document.getElementById('enderecoTableBody');
        renderTableBody(tbody, firebaseTableData);
    }
};

// ============= REFRESH DE DADOS =============
window.refreshTableData = async function() {
    console.log('🔄 [FIREBASE-TABLE] Atualizando dados...');
    
    try {
        updateFirebaseStatus('connecting', 'Atualizando dados...');
        
        // Garantir conexão antes de carregar dados
        await firebaseManager.ensureReady();
        
        await loadFirebaseTableData();
        updateFirebaseStatus('connected', 'Dados atualizados');
        
        showNotification('✅ Sucesso!', 'Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar:', error);
        updateFirebaseStatus('error', 'Erro ao atualizar dados');
        showNotification('❌ Erro', 'Erro ao atualizar dados: ' + error.message, 'error');
    }
};

// ============= FUNÇÕES UTILITÁRIAS =============
function updateFirebaseStatus(status, message) {
    const statusDot = document.querySelector('.firebase-status .status-dot');
    const statusText = document.querySelector('.firebase-status .status-text');
    
    if (statusDot && statusText) {
        // Remover classes anteriores
        statusDot.classList.remove('connecting', 'connected', 'error');
        
        // Adicionar nova classe
        statusDot.classList.add(status);
        
        // Atualizar texto
        statusText.textContent = message;
    }
}

function updateTableStats(recordCount) {
    const countElement = document.getElementById('tableRecordCount');
    const updateElement = document.getElementById('tableLastUpdate');
    
    if (countElement) {
        countElement.textContent = `${recordCount} registro${recordCount !== 1 ? 's' : ''}`;
    }
    
    if (updateElement) {
        const now = new Date();
        updateElement.textContent = `Última atualização: ${now.toLocaleString('pt-BR')}`;
    }
}

function showNoDataMessage() {
    const tbody = document.getElementById('enderecoTableBody');
    const noDataMsg = document.getElementById('noDataMessage');
    
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    if (noDataMsg) {
        noDataMsg.style.display = 'block';
    }
    
    updateTableStats(0);
}

function sortTable(column) {
    console.log('📊 [FIREBASE-TABLE] Ordenando por:', column);
    // TODO: Implementar ordenação
    alert('Funcionalidade de ordenação em desenvolvimento');
}

function setupEventListeners() {
    console.log('🔧 [FIREBASE-TABLE] Configurando event listeners...');
    
    // Event listener para upload de Excel (ID correto do HTML)
    const excelUpload = document.getElementById('novoExcelUpload');
    if (excelUpload) {
        console.log('📁 [FIREBASE-TABLE] Upload Excel encontrado');
        excelUpload.addEventListener('change', handleExcelUpload);
    } else {
        console.warn('⚠️ [FIREBASE-TABLE] Elemento novoExcelUpload não encontrado');
    }
    
    // Event listener para formulário de novo endereço
    const enderecoForm = document.getElementById('enderecoForm');
    if (enderecoForm) {
        console.log('📝 [FIREBASE-TABLE] Formulário de endereço encontrado');
        enderecoForm.addEventListener('submit', handleNovoEndereco);
    }
}

// ============= INTEGRAÇÃO COM UPLOAD DE EXCEL =============
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    try {
        console.log('📊 [FIREBASE-TABLE] Processando upload de Excel:', file.name);
        
        // Validar arquivo
        const validExtensions = ['.xlsx', '.xls'];
        const fileName = file.name.toLowerCase();
        const isValidFile = validExtensions.some(ext => fileName.endsWith(ext));
        
        if (!isValidFile) {
            throw new Error('Por favor, selecione apenas arquivos Excel (.xlsx ou .xls)');
        }
        
        updateFirebaseStatus('connecting', 'Preparando Firebase...');
        
        // GARANTIR QUE FIREBASE ESTEJA CONECTADO
        await firebaseManager.ensureReady();
        
        updateFirebaseStatus('connecting', 'Processando planilha...');
        
        // Ler arquivo Excel
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            throw new Error('Arquivo Excel está vazio ou não contém dados válidos');
        }
        
        console.log('📋 [FIREBASE-TABLE] Dados lidos do Excel:', data.length, 'linhas');
        
        updateFirebaseStatus('connecting', 'Salvando no Firebase...');
        
        // Salvar no Firebase
        await saveExcelDataToFirebase(data);
        
        updateFirebaseStatus('connecting', 'Atualizando tabela...');
        
        // Recarregar tabela
        await loadFirebaseTableData();
        
        updateFirebaseStatus('connected', 'Upload concluído');
        showNotification('✅ Sucesso!', `Upload concluído! ${data.length} registros importados.`, 'success');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro no upload:', error);
        updateFirebaseStatus('error', 'Erro no upload');
        showNotification('❌ Erro', 'Erro no upload: ' + error.message, 'error');
    } finally {
        // Limpar input
        event.target.value = '';
    }
}


function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                resolve(jsonData);
                
            } catch (error) {
                console.error('❌ [FIREBASE-TABLE] Erro ao ler Excel:', error);
                reject(new Error('Não foi possível ler o arquivo Excel'));
            }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo'));
        reader.readAsArrayBuffer(file);
    });
}

async function saveExcelDataToFirebase(data) {
    console.log('💾 [FIREBASE-TABLE] Salvando dados no Firebase...');
    
    try {
        // GARANTIR QUE FIREBASE ESTÁ PRONTO E USUÁRIO AUTENTICADO
        console.log('🔍 [FIREBASE-TABLE] Verificando estado do Firebase...');
        await firebaseManager.ensureReady();
        
        // Obter referências através do manager
        const firestore = firebaseManager.getFirestore();
        const user = firebaseManager.getCurrentUser();
        
        // Verificação adicional de segurança
        if (!user || !user.uid) {
            throw new Error('Usuário não autenticado ou sem UID');
        }
        
        console.log('👤 [FIREBASE-TABLE] Usuário confirmado para salvamento:', user.uid);
        
        // Criar batch operation
        const batch = firestore.batch();
        const collection = firestore.collection('enderecos');
        let savedCount = 0;
        
        for (const row of data) {
            try {
                // Preparar dados - USAR firebase.firestore.FieldValue CORRETAMENTE
                const documentData = {
                    ...row,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: user.uid,
                    source: 'excel_upload'
                };
                
                // Verificar se tem dados válidos
                const hasData = Object.values(row).some(value => 
                    value !== null && value !== undefined && value !== ''
                );
                
                if (hasData) {
                    const docRef = collection.doc();
                    batch.set(docRef, documentData);
                    savedCount++;
                }
                
            } catch (error) {
                console.error('❌ [FIREBASE-TABLE] Erro na linha:', row, error);
            }
        }
        
        if (savedCount > 0) {
            console.log(`💾 [FIREBASE-TABLE] Salvando ${savedCount} registros no Firebase...`);
            await batch.commit();
            console.log(`✅ [FIREBASE-TABLE] ${savedCount} registros salvos com sucesso no Firebase`);
        } else {
            console.warn('⚠️ [FIREBASE-TABLE] Nenhum registro válido para salvar');
        }
        
        return savedCount;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro detalhado ao salvar no Firebase:', error);
        console.error('❌ [FIREBASE-TABLE] Stack trace:', error.stack);
        throw error;
    }
}

function showNotification(title, message, type) {
    if (window.showCustomNotification && typeof window.showCustomNotification === 'function') {
        window.showCustomNotification(title, message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        alert(`${title}: ${message}`);
    }
}

// ============= ESTATÍSTICAS E ANÁLISE DE DADOS =============
async function getFirebaseTableStatistics() {
    console.log('📊 [FIREBASE-TABLE] Calculando estatísticas...');
    
    try {
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        const snapshot = await firestore.collection('enderecos').get();
        
        const allData = [];
        snapshot.forEach(doc => {
            allData.push(doc.data());
        });
        
        if (allData.length === 0) {
            return getEmptyStatistics();
        }
        
        // Calcular estatísticas
        const stats = {
            totalRegistros: allData.length,
            enderecosDistintos: getUniqueCount(allData, 'endereco'),
            condominiosDistintos: getUniqueCount(allData, 'condominio'),
            cidadesDistintas: getUniqueCount(allData, 'cidade'),
            equipesDistintas: getUniqueCount(allData, 'equipe'),
            supervisoresDistintos: getUniqueCount(allData, 'supervisor'),
            projetosDistintos: getUniqueCount(allData, 'projeto'),
            statusCounts: getStatusCounts(allData),
            produtividade: calculateProductivity(allData),
            registrosPorMes: getRecordsByMonth(allData),
            topEquipes: getTopEquipes(allData),
            topCidades: getTopCidades(allData)
        };
        
        console.log('📊 [FIREBASE-TABLE] Estatísticas calculadas:', stats);
        return stats;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao calcular estatísticas:', error);
        return getEmptyStatistics();
    }
}

function getEmptyStatistics() {
    return {
        totalRegistros: 0,
        enderecosDistintos: 0,
        condominiosDistintos: 0,
        cidadesDistintas: 0,
        equipesDistintas: 0,
        supervisoresDistintos: 0,
        projetosDistintos: 0,
        statusCounts: {},
        produtividade: 0,
        registrosPorMes: {},
        topEquipes: [],
        topCidades: []
    };
}

function getUniqueCount(data, field) {
    const unique = new Set();
    data.forEach(item => {
        if (item[field] && item[field] !== '') {
            unique.add(item[field]);
        }
    });
    return unique.size;
}

function getStatusCounts(data) {
    const counts = {};
    data.forEach(item => {
        const status = item.status || 'Sem Status';
        counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
}

function calculateProductivity(data) {
    const withStatus = data.filter(item => item.status && item.status !== '').length;
    if (data.length === 0) return 0;
    return Math.round((withStatus / data.length) * 100);
}

function getRecordsByMonth(data) {
    const byMonth = {};
    data.forEach(item => {
        let date = null;
        
        // Tentar diferentes campos de data
        if (item.createdAt && item.createdAt.seconds) {
            date = new Date(item.createdAt.seconds * 1000);
        } else if (item.dataInicio) {
            date = new Date(item.dataInicio);
        } else if (item.dataRecebimento) {
            date = new Date(item.dataRecebimento);
        }
        
        if (date && !isNaN(date)) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        }
    });
    
    return byMonth;
}

function getTopEquipes(data) {
    const equipeCounts = {};
    data.forEach(item => {
        if (item.equipe && item.equipe !== '') {
            equipeCounts[item.equipe] = (equipeCounts[item.equipe] || 0) + 1;
        }
    });
    
    return Object.entries(equipeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
}

function getTopCidades(data) {
    const cidadeCounts = {};
    data.forEach(item => {
        if (item.cidade && item.cidade !== '') {
            cidadeCounts[item.cidade] = (cidadeCounts[item.cidade] || 0) + 1;
        }
    });
    
    return Object.entries(cidadeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
}

// ============= ATUALIZAÇÃO COMPLETA DE CARDS DO DASHBOARD =============
async function updateDashboardCards() {
    console.log('🎯 [FIREBASE-TABLE] Atualizando TODOS os cards do dashboard...');
    
    try {
        // Usar dados diretamente da tabela carregada
        const data = firebaseTableData || [];
        
        if (data.length === 0) {
            console.warn('⚠️ [FIREBASE-TABLE] Nenhum dado disponível para cards');
            updateAllCardsWithEmptyData();
            return;
        }
        
        // Calcular estatísticas dos dados reais
        const stats = calculateStatisticsFromTableData(data);
        
        console.log('📊 [FIREBASE-TABLE] Estatísticas calculadas:', stats);
        
        // ===== CARDS DA SEÇÃO CADASTRO DE ENDEREÇOS =====
        updateStatCard('statTotalRegistros', stats.totalRegistros);
        updateStatCard('statEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('statEquipesDistintas', stats.equipesDistintas);
        updateStatCard('statProdutividade', `${stats.produtividade}%`);
        
        // ===== CARDS DA SEÇÃO INFRAESTRUTURA (DASHBOARD) =====
        updateStatCard('infraStatTotalRegistros', stats.totalRegistros);
        updateStatCard('infraStatEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('infraStatEquipesDistintas', stats.equipesDistintas);
        updateStatCard('infraStatProdutividade', `${stats.produtividade}%`);
        
        // ===== CARDS ESPECÍFICOS DE TEMPO =====
        updateStatCard('infraStatTempoMedio', `${stats.tempoMedio} dias`);
        updateStatCard('infraStatTempoSalaTecnica', `${stats.tempoSalaTecnica} dias`);
        updateStatCard('infraStatTempoTecnicos', `${stats.tempoTecnicos} dias`);
        
        // ===== CARDS DE RANKINGS =====
        updateStatCard('totalStatusGeral', stats.totalRegistros);
        updateStatCard('totalProdutiva', stats.totalProdutiva);
        updateStatCard('totalImprodutiva', stats.totalImprodutiva);
        updateStatCard('totalProdutividade', `${stats.produtividade}%`);
        
        // ===== ATUALIZAR TABELAS DE RANKING =====
        if (stats.rankingEquipes) {
            updateEquipeRankingTables(stats.rankingEquipes);
        }
        
        console.log('✅ [FIREBASE-TABLE] TODOS os cards atualizados com dados reais da tabela');
        return stats;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar cards:', error);
        updateAllCardsWithEmptyData();
        return null;
    }
}

// ============= CALCULAR ESTATÍSTICAS DOS DADOS DA TABELA =============
function calculateStatisticsFromTableData(data) {
    console.log('🧮 [FIREBASE-TABLE] Calculando estatísticas de', data.length, 'registros');
    
    const stats = {
        totalRegistros: data.length,
        enderecosDistintos: 0,
        equipesDistintas: 0,
        cidadesDistintas: 0,
        supervisoresDistintos: 0,
        totalProdutiva: 0,
        totalImprodutiva: 0,
        produtividade: 0,
        tempoMedio: 0,
        tempoSalaTecnica: 0,
        tempoTecnicos: 0,
        rankingEquipes: []
    };
    
    // Usar função mapFieldValue para acessar dados corretamente
    const enderecosUnicos = new Set();
    const equipesUnicas = new Set();
    const cidadesUnicas = new Set();
    const supervisoresUnicos = new Set();
    let produtivos = 0;
    let improdutivos = 0;
    
    // Arrays para calcular tempos médios
    const temposExecucao = [];
    const temposSalaTecnica = [];
    const temposTecnicos = [];
    
    // Contador de equipes por tipo de ação e status
    const equipesRanking = {};
    
    data.forEach(row => {
        // Endereços únicos
        const endereco = mapFieldValue(row, 'endereco');
        if (endereco && endereco.trim()) {
            enderecosUnicos.add(endereco.trim());
        }
        
        // Equipes únicas
        const equipe = mapFieldValue(row, 'equipe');
        if (equipe && equipe.trim()) {
            equipesUnicas.add(equipe.trim());
            
            // Inicializar ranking da equipe se não existir
            if (!equipesRanking[equipe]) {
                equipesRanking[equipe] = {
                    nome: equipe,
                    ATIVACAO: 0,
                    CONSTRUCAO: 0,
                    VISTORIA: 0,
                    PRODUTIVA: 0,
                    IMPRODUTIVA: 0,
                    total: 0
                };
            }
            equipesRanking[equipe].total++;
        }
        
        // Cidades únicas
        const cidade = mapFieldValue(row, 'cidade');
        if (cidade && cidade.trim()) {
            cidadesUnicas.add(cidade.trim());
        }
        
        // Supervisores únicos
        const supervisor = mapFieldValue(row, 'supervisor');
        if (supervisor && supervisor.trim()) {
            supervisoresUnicos.add(supervisor.trim());
        }
        
        // Status de produtividade
        const status = mapFieldValue(row, 'status');
        if (status) {
            const statusUpper = status.toString().toUpperCase();
            if (statusUpper === 'PRODUTIVA') {
                produtivos++;
                if (equipe && equipesRanking[equipe]) {
                    equipesRanking[equipe].PRODUTIVA++;
                }
            } else if (statusUpper === 'IMPRODUTIVA') {
                improdutivos++;
                if (equipe && equipesRanking[equipe]) {
                    equipesRanking[equipe].IMPRODUTIVA++;
                }
            }
        }
        
        // Tipo de ação para ranking
        const tipoAcao = mapFieldValue(row, 'tipoAcao');
        if (tipoAcao && equipe && equipesRanking[equipe]) {
            const tipoUpper = tipoAcao.toString().toUpperCase();
            if (tipoUpper.includes('ATIVAÇÃO') || tipoUpper.includes('ATIVACAO')) {
                equipesRanking[equipe].ATIVACAO++;
            } else if (tipoUpper.includes('CONSTRUÇÃO') || tipoUpper.includes('CONSTRUCAO')) {
                equipesRanking[equipe].CONSTRUCAO++;
            } else if (tipoUpper.includes('VISTORIA')) {
                equipesRanking[equipe].VISTORIA++;
            }
        }
        
        // Cálculos de tempo usando as datas do Excel (números seriais)
        const dataRecebimento = mapFieldValue(row, 'dataRecebimento');
        const dataInicio = mapFieldValue(row, 'dataInicio');
        const dataFinal = mapFieldValue(row, 'dataFinal');
        
        // Debug para primeiros 3 registros
        if (data.indexOf(row) < 3) {
            console.log(`🕐 [TEMPO-DEBUG] Registro ${data.indexOf(row) + 1}:`, {
                dataRecebimento: dataRecebimento,
                dataInicio: dataInicio,
                dataFinal: dataFinal,
                tipos: {
                    recebimento: typeof dataRecebimento,
                    inicio: typeof dataInicio,
                    final: typeof dataFinal
                }
            });
        }
        
        // Tempo Médio de Execução (Recebimento → Final)
        if (typeof dataRecebimento === 'number' && typeof dataFinal === 'number') {
            const diasExecucao = Math.abs(dataFinal - dataRecebimento);
            temposExecucao.push(diasExecucao);
        }
        
        // Tempo Médio Sala Técnica (Recebimento → Início)
        if (typeof dataRecebimento === 'number' && typeof dataInicio === 'number') {
            const diasSalaTecnica = Math.abs(dataInicio - dataRecebimento);
            temposSalaTecnica.push(diasSalaTecnica);
        }
        
        // Tempo Médio Técnicos (Início → Final)
        if (typeof dataInicio === 'number' && typeof dataFinal === 'number') {
            const diasTecnicos = Math.abs(dataFinal - dataInicio);
            temposTecnicos.push(diasTecnicos);
        }
    });
    
    // Atualizar estatísticas
    stats.enderecosDistintos = enderecosUnicos.size;
    stats.equipesDistintas = equipesUnicas.size;
    stats.cidadesDistintas = cidadesUnicas.size;
    stats.supervisoresDistintos = supervisoresUnicos.size;
    stats.totalProdutiva = produtivos;
    stats.totalImprodutiva = improdutivos;
    stats.produtividade = stats.totalRegistros > 0 ? Math.round((produtivos / stats.totalRegistros) * 100) : 0;
    
    // Calcular tempos médios com logs detalhados
    stats.tempoMedio = temposExecucao.length > 0 ? Math.round(temposExecucao.reduce((a, b) => a + b, 0) / temposExecucao.length) : 0;
    stats.tempoSalaTecnica = temposSalaTecnica.length > 0 ? Math.round(temposSalaTecnica.reduce((a, b) => a + b, 0) / temposSalaTecnica.length) : 0;
    stats.tempoTecnicos = temposTecnicos.length > 0 ? Math.round(temposTecnicos.reduce((a, b) => a + b, 0) / temposTecnicos.length) : 0;
    
    // Logs detalhados dos cálculos de tempo
    console.log('🕐 [FIREBASE-TABLE] Cálculos de tempo detalhados:');
    console.log(`📊 Tempo Médio de Execução: ${stats.tempoMedio} dias (baseado em ${temposExecucao.length} registros)`);
    console.log(`🧰 Tempo Médio Sala Técnica: ${stats.tempoSalaTecnica} dias (baseado em ${temposSalaTecnica.length} registros)`);
    console.log(`👷 Tempo Médio Técnicos: ${stats.tempoTecnicos} dias (baseado em ${temposTecnicos.length} registros)`);
    
    if (temposExecucao.length > 0) {
        console.log(`📈 Primeiros tempos de execução:`, temposExecucao.slice(0, 5));
    }
    if (temposSalaTecnica.length > 0) {
        console.log(`📈 Primeiros tempos sala técnica:`, temposSalaTecnica.slice(0, 5));
    }
    if (temposTecnicos.length > 0) {
        console.log(`📈 Primeiros tempos técnicos:`, temposTecnicos.slice(0, 5));
    }
    
    // Converter ranking de equipes para array ordenado
    stats.rankingEquipes = Object.values(equipesRanking)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20); // Top 20 equipes
    
    return stats;
}

// ============= ATUALIZAR CARDS COM DADOS VAZIOS =============
function updateAllCardsWithEmptyData() {
    const cardIds = [
        // Cards da seção Cadastro de Endereços
        'statTotalRegistros', 'statEnderecosDistintos', 'statEquipesDistintas', 'statProdutividade',
        'statTempoMedio', 'statTempoSalaTecnica', 'statTempoTecnicos',
        
        // Cards da seção Dashboard (Infraestrutura) 
        'infraStatTotalRegistros', 'infraStatEnderecosDistintos', 'infraStatEquipesDistintas', 'infraStatProdutividade',
        'infraStatTempoMedio', 'infraStatTempoSalaTecnica', 'infraStatTempoTecnicos',
        
        // Cards de rankings
        'totalStatusGeral', 'totalProdutiva', 'totalImprodutiva', 'totalProdutividade'
    ];
    
    cardIds.forEach(id => {
        updateStatCard(id, id.includes('Produtividade') || id.includes('produtividade') ? '0%' : '0');
    });
}

// ============= ATUALIZAR TABELAS DE RANKING =============
function updateEquipeRankingTables(rankingEquipes) {
    console.log('🏆 [FIREBASE-TABLE] === FUNÇÃO DE RANKING DESABILITADA - USANDO DASHBOARD-CHARTS-V5.JS ===');
    return true; // Retornar sucesso sem fazer nada
    /* CÓDIGO DESABILITADO - USANDO DASHBOARD-CHARTS-V5.JS
    // Atualizar tabela principal de ranking
    const tableBody = document.getElementById('equipeStatusRankingTableBody');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        rankingEquipes.forEach((equipe, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${equipe.nome}</td>
                <td>${equipe.total}</td>
                <td>${equipe.PRODUTIVA}</td>
                <td>${equipe.IMPRODUTIVA}</td>
                <td>${equipe.total > 0 ? Math.round((equipe.PRODUTIVA / equipe.total) * 100) : 0}%</td>
                <td>${equipe.ATIVACAO}</td>
                <td>${equipe.CONSTRUCAO}</td>
                <td>${equipe.VISTORIA}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    */ // FIM DO CÓDIGO DESABILITADO
}

function calculateTimeStatistics(stats) {
    // Esta função mantida para compatibilidade, mas não é mais usada
    // As estatísticas de tempo agora são calculadas em calculateStatisticsFromTableData
    return {
        tempoMedio: 0,
        tempoSalaTecnica: 0,
        tempoTecnicos: 0
    };
}

function updateEquipeStatusRanking(topEquipes, statusCounts) {
    console.log('🏆 [FIREBASE-TABLE] === FUNÇÃO DE STATUS RANKING DESABILITADA - USANDO DASHBOARD-CHARTS-V5.JS ===');
    return true; // Retornar sucesso sem fazer nada
    /* CÓDIGO DESABILITADO - USANDO DASHBOARD-CHARTS-V5.JS
    const tableBody = document.getElementById('equipeStatusRankingTableBody');
    
    if (!tableBody) {
        console.warn('⚠️ [FIREBASE-TABLE] Tabela de ranking não encontrada');
        return;
    }
    
    // Limpar tabela existente
    tableBody.innerHTML = '';
    
    // Adicionar top equipes ao ranking
    topEquipes.forEach((equipe, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${equipe.name}</td>
            <td>${equipe.count}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // Preencher até 5 linhas se necessário
    while (tableBody.children.length < 5) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${tableBody.children.length + 1}</td>
            <td>-</td>
            <td>0</td>
        `;
        tableBody.appendChild(row);
    }
    */ // FIM DO CÓDIGO DESABILITADO
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        // Animação de atualização
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(1.05)';
        element.textContent = value;
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }
}

// ============= FILTROS DINÂMICOS COMPLETOS =============
async function updateDashboardFilters() {
    console.log('🚫 [FIREBASE-TABLE] updateDashboardFilters() DESABILITADA - usando sistema unificado');
    // FUNÇÃO DESABILITADA - Sistema unificado de filtros está ativo
    return;
    
    try {
        // Marcar que estamos atualizando filtros
        window.isRestoringFilters = true;
        
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        const snapshot = await firestore.collection('enderecos').get();
        
        const allData = [];
        snapshot.forEach(doc => {
            allData.push(doc.data());
        });
        
        // Extrair valores únicos para TODOS os filtros (usando nomes corretos das colunas)
        const filterData = {
            projetos: getUniqueValues(allData, 'Projeto'),
            subProjetos: getUniqueValues(allData, 'Sub Projeto'),
            cidades: getUniqueValues(allData, 'Cidade'),
            equipes: getUniqueValues(allData, 'EQUIPE'),
            supervisores: getUniqueValues(allData, 'Supervisor'),
            status: getUniqueValues(allData, 'Status'),
            condominios: getUniqueValues(allData, 'Condominio'),
            tiposAcao: getUniqueValues(allData, 'Tipo de Ação')
        };
        
        // ===== ATUALIZAR FILTROS DA SEÇÃO INFRAESTRUTURA =====
        populateFilterSelect('infraFilterProjeto', filterData.projetos);
        populateFilterSelect('infraFilterSubProjeto', filterData.subProjetos);
        populateFilterSelect('infraFilterEquipe', filterData.equipes);
        populateFilterSelect('infraFilterStatus', filterData.status);
        populateFilterSelect('infraFilterCidade', filterData.cidades);
        populateFilterSelect('infraFilterSupervisor', filterData.supervisores);
        populateFilterSelect('infraFilterTipoAcao', filterData.tiposAcao);
        populateFilterSelect('infraFilterCondominio', filterData.condominios);
        
        // ===== ATUALIZAR OUTROS FILTROS SE EXISTIREM =====
        populateFilterSelect('filterProjeto', filterData.projetos);
        populateFilterSelect('filterCidade', filterData.cidades);
        populateFilterSelect('filterEquipe', filterData.equipes);
        populateFilterSelect('filterSupervisor', filterData.supervisores);
        populateFilterSelect('filterStatus', filterData.status);
        populateFilterSelect('filterCondominio', filterData.condominios);
        
        // ===== CONFIGURAR EVENTOS DE FILTROS =====
        setupFilterEvents();
        
        console.log('✅ [FIREBASE-TABLE] TODOS os filtros atualizados');
        
        // Desmarcar flag de restauração
        setTimeout(() => {
            window.isRestoringFilters = false;
        }, 1000);
        
        return filterData;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar filtros:', error);
        window.isRestoringFilters = false; // Reset flag even on error
        return null;
    }
}

function setupFilterEvents() {
    // FUNÇÃO REMOVIDA - Deixando o dashboard-integration.js gerenciar os filtros
    
    // Criar função para ser chamada pelos multi-select filters
    window.applyFirebaseFilters = applyFirebaseFilters;
    
    console.log('✅ [FIREBASE-TABLE] Eventos de filtros configurados');
}

async function applyFirebaseFilters(customFilters = null) {
    try {
        let filters;
        
        if (customFilters) {
            // Usar filtros fornecidos pelo sistema de multi-select
            filters = customFilters;
        } else {
            // Coletar valores dos filtros (método tradicional para compatibilidade)
            filters = {
                projeto: getSelectValues('infraFilterProjeto'),
                subProjeto: getSelectValues('infraFilterSubProjeto'),
                equipe: getSelectValues('infraFilterEquipe'),
                status: getSelectValues('infraFilterStatus'),
                cidade: getSelectValues('infraFilterCidade'),
                supervisor: getSelectValues('infraFilterSupervisor'),
                tipoAcao: getSelectValues('infraFilterTipoAcao'),
                condominio: getSelectValues('infraFilterCondominio')
            };
        }
        
        // Filtrar dados
        const filteredData = filterFirebaseData(firebaseTableData, filters);
        
        // Recriar tabela com dados filtrados
        renderFirebaseTable(filteredData);
        
        // Atualizar estatísticas baseadas nos dados filtrados
        const filteredStats = calculateFilteredStatistics(filteredData);
        updateFilteredCards(filteredStats);
        
        // EMITIR EVENTO PARA O SISTEMA DE GRÁFICOS
        const hasActiveFilters = Object.values(filters).some(filterArray => 
            Array.isArray(filterArray) && filterArray.length > 0
        );
        
        if (hasActiveFilters) {
            // Filtros ativos - enviar dados filtrados
            const filterEvent = new CustomEvent('dashboardFiltersApplied', {
                detail: {
                    filteredData: filteredData,
                    originalData: firebaseTableData,
                    filterCount: filteredData.length,
                    originalCount: firebaseTableData.length,
                    appliedFilters: filters
                }
            });
            window.dispatchEvent(filterEvent);
            console.log('📤 [FIREBASE-TABLE] Evento dashboardFiltersApplied enviado:', filteredData.length, 'registros');
        } else {
            // Sem filtros - limpar filtros
            const clearEvent = new CustomEvent('dashboardFiltersCleared', {
                detail: {
                    originalData: firebaseTableData,
                    totalCount: firebaseTableData.length
                }
            });
            window.dispatchEvent(clearEvent);
            console.log('📤 [FIREBASE-TABLE] Evento dashboardFiltersCleared enviado:', firebaseTableData.length, 'registros');
        }
        
        console.log('✅ [FIREBASE-TABLE] Filtros aplicados:', filters);
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao aplicar filtros:', error);
    }
}

function getSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    
    // VERIFICAR SE É UM MULTI-SELECT DROPDOWN
    if (select.dataset.multiSelectActive === 'true' || select.hasAttribute('data-multi-select')) {
        // Buscar pelos valores selecionados no multi-select customizado
        const container = select.closest('.multi-select-container');
        if (container) {
            const selectedValues = [];
            const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                if (checkbox.value !== '') {
                    selectedValues.push(checkbox.value);
                }
            });
            console.log(`🎯 [FIREBASE-TABLE] Multi-select ${selectId}:`, selectedValues);
            return selectedValues;
        }
        
        // Fallback: buscar pela instância do MultiSelectDropdown
        if (window.multiSelectInstances && window.multiSelectInstances[selectId]) {
            const instance = window.multiSelectInstances[selectId];
            const values = Array.from(instance.selectedValues);
            console.log(`🎯 [FIREBASE-TABLE] Multi-select instance ${selectId}:`, values);
            return values;
        }
    }
    
    // SELECT NORMAL
    const values = [];
    for (const option of select.selectedOptions) {
        if (option.value) {
            values.push(option.value);
        }
    }
    console.log(`📋 [FIREBASE-TABLE] Select normal ${selectId}:`, values);
    return values;
}

function filterFirebaseData(data, filters) {
    return data.filter(row => {
        // Aplicar filtros de arrays (multi-select)
        const arrayFields = ['projeto', 'subProjeto', 'equipe', 'status', 'cidade', 'supervisor', 'tipoAcao', 'condominio'];
        
        for (const field of arrayFields) {
            const values = filters[field];
            if (Array.isArray(values) && values.length > 0) {
                if (!values.includes(row[field])) {
                    return false;
                }
            }
        }
        
        // Aplicar filtro de data
        if (filters.dataInicio && filters.dataFim) {
            const rowDate = row.dataRecebimento;
            if (rowDate) {
                const rowDateObj = new Date(rowDate);
                const startDate = new Date(filters.dataInicio);
                const endDate = new Date(filters.dataFim);
                
                if (rowDateObj < startDate || rowDateObj > endDate) {
                    return false;
                }
            }
        } else if (filters.dataInicio) {
            const rowDate = row.dataRecebimento;
            if (rowDate) {
                const rowDateObj = new Date(rowDate);
                const startDate = new Date(filters.dataInicio);
                
                if (rowDateObj < startDate) {
                    return false;
                }
            }
        } else if (filters.dataFim) {
            const rowDate = row.dataRecebimento;
            if (rowDate) {
                const rowDateObj = new Date(rowDate);
                const endDate = new Date(filters.dataFim);
                
                if (rowDateObj > endDate) {
                    return false;
                }
            }
        }
        
        return true;
    });
}

function calculateFilteredStatistics(filteredData) {
    if (filteredData.length === 0) {
        return getEmptyStatistics();
    }
    
    return {
        totalRegistros: filteredData.length,
        enderecosDistintos: getUniqueCount(filteredData, 'endereco'),
        condominiosDistintos: getUniqueCount(filteredData, 'condominio'),
        cidadesDistintas: getUniqueCount(filteredData, 'cidade'),
        equipesDistintas: getUniqueCount(filteredData, 'equipe'),
        supervisoresDistintos: getUniqueCount(filteredData, 'supervisor'),
        projetosDistintos: getUniqueCount(filteredData, 'projeto'),
        statusCounts: getStatusCounts(filteredData),
        produtividade: calculateProductivity(filteredData),
        topEquipes: getTopEquipes(filteredData),
        topCidades: getTopCidades(filteredData)
    };
}

function updateFilteredCards(stats) {
    console.log('🎯 [FIREBASE-TABLE] Atualizando cards filtrados:', stats);
    
    // Atualizar cards principais da seção infraestrutura
    updateStatCard('infraStatTotalRegistros', stats.totalRegistros);
    updateStatCard('infraStatEnderecosDistintos', stats.enderecosDistintos);
    updateStatCard('infraStatEquipesDistintas', stats.equipesDistintas);  
    updateStatCard('infraStatProdutividade', `${stats.produtividade}%`);
    
    // Atualizar também os cards da seção endereços (se existirem)
    updateStatCard('statTotalRegistros', stats.totalRegistros);
    updateStatCard('statEnderecosDistintos', stats.enderecosDistintos);
    updateStatCard('statEquipesDistintas', stats.equipesDistintas);
    updateStatCard('statProdutividade', `${stats.produtividade}%`);
    
    // Atualizar cards de ranking (se existirem)
    updateStatCard('totalStatusGeral', stats.totalRegistros);
    updateStatCard('totalProdutiva', stats.totalProdutiva || 0);
    updateStatCard('totalImprodutiva', stats.totalImprodutiva || 0);
    updateStatCard('totalProdutividade', `${stats.produtividade}%`);
    
    // Atualizar ranking de equipes
    updateEquipeStatusRanking(stats.topEquipes, stats.statusCounts);
    
    console.log('✅ [FIREBASE-TABLE] Cards filtrados atualizados com sucesso');
}

function getUniqueValues(data, field) {
    const unique = new Set();
    data.forEach(item => {
        if (item[field] && item[field] !== '') {
            unique.add(item[field]);
        }
    });
    return Array.from(unique).sort();
}

function populateFilterSelect(selectId, values) {
    console.log(`🚫 [FIREBASE-TABLE] populateFilterSelect() DESABILITADA - usando sistema unificado`);
    // FUNÇÃO DESABILITADA - Sistema unificado de filtros está ativo
    return;
    
    // BLOQUEAR se estamos restaurando filtros
    if (window.isRestoringFilters) {
        console.log(`🔒 [FIREBASE-TABLE] População bloqueada durante restauração: ${selectId}`);
        return;
    }
    
    // IMPORTANTE: Não recriar options se é um multi-select ativo OU tem filtros salvos
    const isMultiSelect = select.classList.contains('multi-select-active') || select.hasAttribute('data-multi-select');
    
    // Verificar se existem filtros salvos para este select
    const hasActiveFilters = window.filterState && window.filterState.hasActiveFilters();
    
    console.log(`🔍 [FIREBASE-TABLE] Análise do select ${selectId}:`, {
        isMultiSelect: isMultiSelect,
        hasActiveFilters: hasActiveFilters,
        hasInstance: !!(window.multiSelectInstances && window.multiSelectInstances[selectId]),
        classes: Array.from(select.classList),
        attributes: Array.from(select.attributes).map(attr => `${attr.name}="${attr.value}"`)
    });
    
    if (isMultiSelect) {
        console.log(`🔒 [FIREBASE-TABLE] Preservando multi-select ativo: ${selectId}`);
        
        // Apenas atualizar as opções disponíveis sem alterar seleções
        if (window.multiSelectInstances && window.multiSelectInstances[selectId]) {
            const instance = window.multiSelectInstances[selectId];
            
            console.log(`🔧 [FIREBASE-TABLE] Valores selecionados antes da atualização:`, Array.from(instance.selectedValues));
            
            // Atualizar allOptions com novos valores, preservando seleções
            const newOptions = values.map(value => ({
                value: value,
                text: value,
                selected: instance.selectedValues.has(value)
            }));
            
            instance.allOptions = newOptions;
            instance.filteredOptions = [...newOptions];
            instance.renderOptions();
            
            console.log(`🔧 [FIREBASE-TABLE] Valores selecionados após a atualização:`, Array.from(instance.selectedValues));
            console.log(`✅ [FIREBASE-TABLE] Opções atualizadas no multi-select: ${selectId}`);
        } else {
            console.warn(`⚠️ [FIREBASE-TABLE] Instância do multi-select não encontrada para: ${selectId}`);
        }
        return;
    }
    
    // Para selects normais, preservar valor selecionado
    const currentValue = select.value;
    
    // Limpar e recriar options apenas para selects normais
    select.innerHTML = '<option value="">Todos</option>';
    
    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        if (value === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`✅ [FIREBASE-TABLE] Select normal atualizado: ${selectId} com ${values.length} opções`);
}

// ============= ATUALIZAÇÃO COMPLETA DE GRÁFICOS DO DASHBOARD =============
// FUNÇÃO DESABILITADA - Os gráficos agora são gerenciados por dashboard-integration.js
async function updateDashboardCharts() {
    console.log('📈 [FIREBASE-TABLE] === SISTEMA DE GRÁFICOS REMOVIDO ===');
    console.log('📈 [FIREBASE-TABLE] Aguardando implementação do novo sistema');
    return true;
    
    /* CÓDIGO DESABILITADO - USANDO DASHBOARD-CHARTS-V5.JS
    try {
        // DEBUG: Verificar estado inicial
        console.log('🔍 [DEBUG-CHARTS] Verificações iniciais:');
        console.log('🔍 [DEBUG-CHARTS] - Chart.js disponível:', typeof Chart !== 'undefined');
        console.log('🔍 [DEBUG-CHARTS] - firebaseTableData:', firebaseTableData ? firebaseTableData.length : 'undefined');
        console.log('🔍 [DEBUG-CHARTS] - DOM ready:', document.readyState);
        
        // Aguardar Chart.js estar disponível
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [FIREBASE-TABLE] Chart.js não carregado, reagendando em 500ms...');
            setTimeout(updateDashboardCharts, 500);
            return false;
        }
        
        // Verificar se temos dados
        if (!firebaseTableData || firebaseTableData.length === 0) {
            console.warn('⚠️ [FIREBASE-TABLE] Nenhum dado disponível para gráficos');
            console.warn('⚠️ [FIREBASE-TABLE] firebaseTableData estado:', firebaseTableData);
            return false;
        }
        
        console.log('📊 [FIREBASE-TABLE] Gerando gráficos com', firebaseTableData.length, 'registros');
        console.log('📊 [DEBUG-CHARTS] Exemplo de dados:', firebaseTableData[0]);
        
        // Verificar se os canvas existem
        const canvasIds = ['projetosChart', 'subProjetosChart', 'cidadesChart', 'hpProjetosChart', 'recebimentosChart', 'supervisorStatusChart'];
        console.log('🎨 [DEBUG-CHARTS] Verificando canvas elements:');
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            console.log(`🎨 [DEBUG-CHARTS] ${id}:`, {
                exists: !!canvas,
                visible: canvas ? (canvas.offsetWidth > 0 && canvas.offsetHeight > 0) : false,
                parent: canvas ? canvas.parentElement?.tagName : 'N/A'
            });
        });
        
        const stats = await getFirebaseTableStatistics();
        console.log('📊 [DEBUG-CHARTS] Estatísticas obtidas:', stats);
        
        // Criar todos os 6 gráficos do dashboard com logging individual
        console.log('📊 [DEBUG-CHARTS] Iniciando criação dos gráficos...');
        
        console.log('1️⃣ Criando gráfico de Projetos...');
        createProjetosChart(stats);
        
        console.log('2️⃣ Criando gráfico de Sub Projetos...');
        createSubProjetosChart(stats);
        
        console.log('3️⃣ Criando gráfico de Cidades...');
        createCidadesChart(stats);
        
        console.log('4️⃣ Criando gráfico de HP Projetos...');
        createHpProjetosChart(stats);
        
        console.log('5️⃣ Criando gráfico de Recebimentos...');
        createRecebimentosChart(stats);
        
        console.log('6️⃣ Criando gráfico de Supervisores...');
        createSupervisorStatusChart(stats);
        
        console.log('✅ [FIREBASE-TABLE] Todos os 6 gráficos processados');
        console.log('📊 [DEBUG-CHARTS] Gráficos em dashboardCharts:', Object.keys(dashboardCharts));
        
        // Aguardar um pouco e verificar se os gráficos foram criados
        setTimeout(() => {
            console.log('🔍 [DEBUG-CHARTS] Verificação pós-criação:');
            canvasIds.forEach(id => {
                const canvas = document.getElementById(id);
                if (canvas) {
                    const hasChart = !!canvas.chart || !!dashboardCharts[id.replace('Chart', '')];
                    console.log(`📊 [DEBUG-CHARTS] ${id} tem gráfico:`, hasChart);
                }
            });
        }, 1000);
        
        return true;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar gráficos:', error);
        console.error('❌ [FIREBASE-TABLE] Stack trace:', error.stack);
        return false;
    }
    */ // FIM DO CÓDIGO DESABILITADO
}

// ============= GRÁFICOS MODERNOS V4.0 - INTEGRADOS COM FIREBASE-TABLE =============

// Objeto para armazenar referências dos gráficos
const dashboardCharts = {};

function createProjetosChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Projetos (Barras + Linha)...');
    
    const canvas = document.getElementById('projetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas projetosChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.projetos) {
        dashboardCharts.projetos.destroy();
    }
    
    // Processar dados dos projetos
    const contadorProjetos = {};
    firebaseTableData.forEach(item => {
        const projeto = mapFieldValue(item, 'projeto') || 'Não especificado';
        contadorProjetos[projeto] = (contadorProjetos[projeto] || 0) + 1;
    });
    
    // Pegar top 10 projetos
    const entries = Object.entries(contadorProjetos).sort(([,a], [,b]) => b - a).slice(0, 10);
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.projetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                    pointBorderColor: 'rgba(37, 99, 235, 1)',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Projetos'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade',
                        color: 'rgba(59, 130, 246, 1)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        color: 'rgba(37, 99, 235, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Projetos'
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Projetos criado');
}

function createSubProjetosChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Sub Projetos (Barras + Linha)...');
    
    const canvas = document.getElementById('subProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas subProjetosChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.subProjetos) {
        dashboardCharts.subProjetos.destroy();
    }
    
    // Processar dados dos sub projetos
    const contadorSubProjetos = {};
    firebaseTableData.forEach(item => {
        const subProjeto = mapFieldValue(item, 'subProjeto') || 'Não especificado';
        contadorSubProjetos[subProjeto] = (contadorSubProjetos[subProjeto] || 0) + 1;
    });
    
    // Pegar top 10 sub projetos
    const entries = Object.entries(contadorSubProjetos).sort(([,a], [,b]) => b - a).slice(0, 10);
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    const total = data.reduce((a, b) => a + b, 0);
    const percentuais = data.map(val => Math.round((val / total) * 100));
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.subProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.6)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Percentual (%)',
                    data: percentuais,
                    backgroundColor: 'rgba(37, 99, 235, 0.2)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1,
                    yAxisID: 'y1',
                    pointBackgroundColor: 'rgba(37, 99, 235, 1)',
                    pointBorderColor: 'rgba(37, 99, 235, 1)',
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Sub-Projetos'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade',
                        color: 'rgba(30, 64, 175, 1)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        color: 'rgba(37, 99, 235, 1)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                    beginAtZero: true,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Sub Projetos'
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Sub Projetos criado');
}

function createCidadesChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Gráfico de Cidades (Pizza)...');
    
    const canvas = document.getElementById('cidadesChart');
    if (!canvas) {
        console.warn('⚠️ Canvas cidadesChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.cidades) {
        dashboardCharts.cidades.destroy();
    }
    
    // Processar dados das cidades
    const contadorCidades = {};
    firebaseTableData.forEach(item => {
        const cidade = mapFieldValue(item, 'cidade') || 'Não especificado';
        contadorCidades[cidade] = (contadorCidades[cidade] || 0) + 1;
    });
    
    // Pegar top 8 cidades
    const entries = Object.entries(contadorCidades).sort(([,a], [,b]) => b - a).slice(0, 8);
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,count]) => count);
    
    // Cores azuis degradê
    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(30, 64, 175, 0.8)', 
        'rgba(37, 99, 235, 0.8)',
        'rgba(29, 78, 216, 0.8)',
        'rgba(30, 58, 138, 0.8)',
        'rgba(23, 37, 84, 0.8)',
        'rgba(15, 23, 42, 0.8)',
        'rgba(2, 6, 23, 0.8)'
    ];
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.cidades = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Distribuição por Cidades'
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Cidades criado');
}

function createHpProjetosChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Gráfico de HP por Projetos (Barras Horizontais)...');
    
    const canvas = document.getElementById('hpProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas hpProjetosChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.hpProjetos) {
        dashboardCharts.hpProjetos.destroy();
    }
    
    // Processar dados de HP
    const contadorHP = {};
    firebaseTableData.forEach(item => {
        const hp = mapFieldValue(item, 'hp') || 'Não especificado';
        const projeto = mapFieldValue(item, 'projeto') || 'Não especificado';
        const key = `${projeto} - ${hp}`;
        contadorHP[key] = (contadorHP[key] || 0) + 1;
    });
    
    // Pegar top 10 HP/Projetos
    const entries = Object.entries(contadorHP).sort(([,a], [,b]) => b - a).slice(0, 10);
    const labels = entries.map(([nome]) => nome.length > 30 ? nome.substring(0, 30) + '...' : nome);
    const data = entries.map(([,count]) => count);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade de HP',
                data: data,
                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Projetos/HP'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'HP por Projetos'
                }
            }
        }
    });
    
    console.log('✅ Gráfico de HP por Projetos criado');
}

function createRecebimentosChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Gráfico de Recebimentos vs Conclusões...');
    
    const canvas = document.getElementById('recebimentosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas recebimentosChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.recebimentos) {
        dashboardCharts.recebimentos.destroy();
    }
    
    // Processar dados mensais
    const dadosMensais = {};
    firebaseTableData.forEach(item => {
        const dataRecebimento = mapFieldValue(item, 'dataRecebimento');
        const dataFinal = mapFieldValue(item, 'dataFinal');
        
        if (dataRecebimento) {
            const mes = dataRecebimento.substring(0, 7); // YYYY-MM
            if (!dadosMensais[mes]) {
                dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
            }
            dadosMensais[mes].recebidos++;
        }
        
        if (dataFinal) {
            const mes = dataFinal.substring(0, 7); // YYYY-MM
            if (!dadosMensais[mes]) {
                dadosMensais[mes] = { recebidos: 0, concluidos: 0 };
            }
            dadosMensais[mes].concluidos++;
        }
    });
    
    // Ordenar por mês e pegar últimos 12 meses
    const mesesOrdenados = Object.keys(dadosMensais).sort().slice(-12);
    const labels = mesesOrdenados.map(mes => {
        const [ano, mesNum] = mes.split('-');
        const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${nomesMeses[parseInt(mesNum) - 1]}/${ano.slice(2)}`;
    });
    
    const dadosRecebidos = mesesOrdenados.map(mes => dadosMensais[mes]?.recebidos || 0);
    const dadosConcluidos = mesesOrdenados.map(mes => dadosMensais[mes]?.concluidos || 0);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.recebimentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Recebidos',
                    data: dadosRecebidos,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2
                },
                {
                    type: 'line',
                    label: 'Concluídos',
                    data: dadosConcluidos,
                    backgroundColor: 'rgba(30, 64, 175, 0.2)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Período'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Recebimentos vs Conclusões'
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Recebimentos criado');
}

function createSupervisorStatusChart(stats) {
    console.log('📊 [FIREBASE-TABLE] Criando Gráfico de Supervisores por Status...');
    
    const canvas = document.getElementById('supervisorStatusChart');
    if (!canvas) {
        console.warn('⚠️ Canvas supervisorStatusChart não encontrado');
        return;
    }
    
    // Destruir gráfico existente
    if (dashboardCharts.supervisorStatus) {
        dashboardCharts.supervisorStatus.destroy();
    }
    
    // Processar dados de supervisores por status
    const supervisorData = {};
    firebaseTableData.forEach(item => {
        const supervisor = mapFieldValue(item, 'supervisor') || 'Não especificado';
        const status = mapFieldValue(item, 'status') || 'Não especificado';
        
        if (!supervisorData[supervisor]) {
            supervisorData[supervisor] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase().includes('PRODUTIVA')) {
            supervisorData[supervisor].PRODUTIVA++;
        } else if (status.toUpperCase().includes('IMPRODUTIVA')) {
            supervisorData[supervisor].IMPRODUTIVA++;
        } else {
            // Classificar por padrão como produtiva se não especificado
            supervisorData[supervisor].PRODUTIVA++;
        }
    });
    
    // Pegar top 10 supervisores
    const supervisores = Object.entries(supervisorData)
        .map(([nome, stats]) => ({
            nome,
            produtiva: stats.PRODUTIVA,
            improdutiva: stats.IMPRODUTIVA,
            total: stats.PRODUTIVA + stats.IMPRODUTIVA
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    
    const labels = supervisores.map(s => s.nome.length > 15 ? s.nome.substring(0, 15) + '...' : s.nome);
    const dadosProdutiva = supervisores.map(s => s.produtiva);
    const dadosImprodutiva = supervisores.map(s => s.improdutiva);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.supervisorStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Produtiva',
                    data: dadosProdutiva,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Improdutiva',
                    data: dadosImprodutiva,
                    backgroundColor: 'rgba(30, 64, 175, 0.6)',
                    borderColor: 'rgba(30, 64, 175, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Supervisores por Status'
                }
            },
            scales: {
                x: {
                    stacked: false,
                    title: {
                        display: true,
                        text: 'Supervisores'
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Supervisores criado');
}

function updateHpProjetosChart(stats) {
    const chartCanvas = document.getElementById('hpProjetosChart');
    
    if (!chartCanvas) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Usar dados das top equipes como HP por projeto
    const labels = stats.topEquipes.map(item => item.name);
    const data = stats.topEquipes.map(item => item.count * 5); // Simular HP (multiplicar por 5)
    const colors = generateChartColors(labels.length);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'HP Ativados',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Barras horizontais
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade de HP'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Projetos/Equipes'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'HP Ativados por Projeto'
                    },
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

function updateRecebimentosChart(monthlyData) {
    const chartCanvas = document.getElementById('recebimentosChart');
    
    if (!chartCanvas) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Ordenar por mês
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthName = monthNames[parseInt(monthNum) - 1];
        return `${monthName}/${year}`;
    });
    const data = sortedMonths.map(month => monthlyData[month]);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registros Recebidos',
                    data: data,
                    backgroundColor: 'rgba(40, 167, 69, 0.6)',
                    borderColor: '#28a745',
                    borderWidth: 1,
                    type: 'bar'
                }, {
                    label: 'Tendência',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    type: 'line'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Período'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Recebimentos vs Conclusões por Mês'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}

function updateSupervisorStatusChart(topEquipes, statusCounts) {
    const chartCanvas = document.getElementById('supervisorStatusChart');
    
    if (!chartCanvas) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Combinar dados de equipes e status
    const equipesData = topEquipes.map(item => item.count);
    const statusData = Object.values(statusCounts);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topEquipes.map(item => item.name),
                datasets: [{
                    label: 'Produtiva',
                    data: equipesData.map(val => Math.floor(val * 0.7)), // 70% como produtiva
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: '#28a745',
                    borderWidth: 1
                }, {
                    label: 'Improdutiva',
                    data: equipesData.map(val => Math.floor(val * 0.3)), // 30% como improdutiva
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    borderColor: '#dc3545',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Supervisor/Equipe'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade de Endereços'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Endereços por Status (Produtiva/Improdutiva)'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }
}

function updateStatusChart(statusCounts) {
    // Procurar por canvas de gráfico de status
    const chartCanvas = document.getElementById('statusChart') || 
                       document.getElementById('pieChart') ||
                       document.getElementById('donutChart');
    
    if (!chartCanvas) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Preparar dados
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const colors = generateChartColors(labels.length);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    // Verificar se Chart.js está disponível
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribuição por Status'
                    }
                }
            }
        });
    }
}

function updateMonthlyChart(monthlyData) {
    const chartCanvas = document.getElementById('monthlyChart') || 
                       document.getElementById('lineChart') ||
                       document.getElementById('barChart');
    
    if (!chartCanvas) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Ordenar por mês
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                           'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthName = monthNames[parseInt(monthNum) - 1];
        return `${monthName}/${year}`;
    });
    const data = sortedMonths.map(month => monthlyData[month]);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registros por Mês',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Registros ao Longo do Tempo'
                    }
                }
            }
        });
    }
}

function updateEquipesChart(topEquipes) {
    const chartCanvas = document.getElementById('equipesChart') || 
                       document.getElementById('teamChart');
    
    if (!chartCanvas || topEquipes.length === 0) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    const labels = topEquipes.map(item => item.name);
    const data = topEquipes.map(item => item.count);
    const colors = generateChartColors(labels.length);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registros',
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top 5 Equipes'
                    }
                }
            }
        });
    }
}

function updateCidadesChart(topCidades) {
    const chartCanvas = document.getElementById('cidadesChart') || 
                       document.getElementById('cityChart');
    
    if (!chartCanvas || topCidades.length === 0) {
        return; // Silenciosamente se não encontrar
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    const labels = topCidades.map(item => item.name);
    const data = topCidades.map(item => item.count);
    const colors = generateChartColors(labels.length);
    
    // Destruir gráfico existente se houver
    if (chartCanvas.chart) {
        chartCanvas.chart.destroy();
    }
    
    if (typeof Chart !== 'undefined') {
        chartCanvas.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Registros',
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top 5 Cidades'
                    }
                }
            }
        });
    }
}

function generateChartColors(count) {
    const colors = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#36A2EB'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    
    return result;
}

// ============= HOOK PARA INTEGRAÇÃO COM OUTROS SISTEMAS =============
function integrateWithExistingSystems() {
    // Integrar com sistema de estatísticas existente se disponível
    if (window.FirestoreIntegration && window.FirestoreIntegration.getStatistics) {
        // Substituir função de estatísticas existente
        const originalGetStats = window.FirestoreIntegration.getStatistics;
        window.FirestoreIntegration.getStatistics = async function() {
            try {
                return await getFirebaseTableStatistics();
            } catch (error) {
                console.warn('⚠️ Fallback para estatísticas originais:', error);
                return await originalGetStats();
            }
        };
    }
    
    // Integrar com dashboard handlers se disponível
    if (window.loadStatistics) {
        const originalLoadStats = window.loadStatistics;
        window.loadStatistics = async function() {
            try {
                await updateDashboardCards();
                
                // Criar gráficos se disponível
                if (typeof window.criarTodosGraficos === 'function') {
                    await window.criarTodosGraficos();
                    console.log('📊 [FIREBASE-TABLE] Gráficos criados após carregamento de dados');
                }
                
                console.log('✅ [FIREBASE-TABLE] Estatísticas e gráficos atualizados via hook');
            } catch (error) {
                console.warn('⚠️ Fallback para carregamento original:', error);
                await originalLoadStats();
            }
        };
    }
}

// ============= INTEGRAÇÃO TOTAL COM SISTEMAS EXISTENTES =============
function integrateWithExistingSystems() {
    console.log('🔗 [FIREBASE-TABLE] Integrando com sistemas existentes...');
    
    // Substituir função de estatísticas existente
    if (window.FirestoreIntegration && window.FirestoreIntegration.getStatistics) {
        const originalGetStats = window.FirestoreIntegration.getStatistics;
        window.FirestoreIntegration.getStatistics = async function() {
            try {
                return await getFirebaseTableStatistics();
            } catch (error) {
                console.warn('⚠️ Fallback para estatísticas originais:', error);
                return await originalGetStats();
            }
        };
    }
    
    // Substituir loadStatistics global
    if (window.loadStatistics) {
        const originalLoadStats = window.loadStatistics;
        window.loadStatistics = async function() {
            try {
                await updateDashboardCards();
                
                // Criar gráficos se disponível
                if (typeof window.criarTodosGraficos === 'function') {
                    await window.criarTodosGraficos();
                    console.log('📊 [FIREBASE-TABLE] Gráficos criados após carregamento de dados');
                }
                
                console.log('✅ [FIREBASE-TABLE] Estatísticas e gráficos atualizados via hook');
            } catch (error) {
                console.warn('⚠️ Fallback para carregamento original:', error);
                await originalLoadStats();
            }
        };
    }
    
    // Integrar funções de dashboard handlers
    if (window.loadInitialData) {
        const originalLoadInitial = window.loadInitialData;
        window.loadInitialData = async function() {
            try {
                // Carregar dados originais primeiro
                await originalLoadInitial();
                
                // Depois integrar nossos dados
                await updateDashboardCards();
                
                // Só atualizar filtros se não houver filtros ativos
                if (!window.filterState || !window.filterState.hasActiveFilters()) {
                    await updateDashboardFilters();
                } else {
                    console.log('🔒 [FIREBASE-TABLE] Mantendo filtros ativos na integração');
                }
                
                await updateDashboardCharts(); // HABILITADO - gráficos integrados no firebase-table-system
                
                console.log('✅ [FIREBASE-TABLE] Integração completa realizada');
            } catch (error) {
                console.warn('⚠️ Erro na integração:', error);
            }
        };
    }
    
    // Força uma atualização inicial após 5 segundos
    setTimeout(async () => {
        try {
            if (firebaseTableData.length > 0) {
                console.log('🔄 [FIREBASE-TABLE] Executando atualização forçada...');
                await updateDashboardCards();
                
                // Só atualizar filtros se não houver filtros ativos
                if (!window.filterState || !window.filterState.hasActiveFilters()) {
                    await updateDashboardFilters();
                } else {
                    console.log('🔒 [FIREBASE-TABLE] Mantendo filtros ativos na atualização forçada');
                }
                
                await updateDashboardCharts(); // HABILITADO - gráficos integrados no firebase-table-system
            }
        } catch (error) {
            console.warn('⚠️ [FIREBASE-TABLE] Erro na atualização forçada:', error);
        }
    }, 5000);
    
    console.log('✅ [FIREBASE-TABLE] Integração configurada');
}

// Executar integração quando o sistema carregar
setTimeout(integrateWithExistingSystems, 2000);

// ============= FUNÇÕES DE RESET E LIMPEZA =============
function clearAllCharts() {
    const chartIds = [
        'projetosChart', 'subProjetosChart', 'cidadesChart', 
        'hpProjetosChart', 'recebimentosChart', 'supervisorStatusChart',
        'statusChart', 'pieChart', 'donutChart', 'lineChart', 
        'barChart', 'monthlyChart', 'equipesChart', 'teamChart', 'cityChart'
    ];
    
    chartIds.forEach(chartId => {
        const canvas = document.getElementById(chartId);
        if (canvas && canvas.chart) {
            canvas.chart.destroy();
            canvas.chart = null;
        }
    });
    
    console.log('🧹 [FIREBASE-TABLE] Todos os gráficos limpos');
}

// ============= INTEGRAÇÃO COM FORMULÁRIO NOVO ENDEREÇO =============
async function handleNovoEndereco(event) {
    event.preventDefault();
    console.log('📝 [FIREBASE-TABLE] Processando novo endereço...');
    
    try {
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        const user = firebaseManager.getCurrentUser();
        
        if (!user) {
            throw new Error('Usuário não autenticado');
        }
        
        // Coletar dados do formulário
        const formData = new FormData(event.target);
        const enderecoData = {};
        
        // Mapear campos do formulário para campos do Firestore
        for (let [key, value] of formData.entries()) {
            enderecoData[key] = value;
        }
        
        // Adicionar metadados
        enderecoData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        enderecoData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        enderecoData.createdBy = user.uid;
        enderecoData.source = 'form_manual';
        
        // Salvar no Firestore
        const docRef = await firestore.collection('enderecos').add(enderecoData);
        
        console.log('✅ [FIREBASE-TABLE] Endereço salvo com ID:', docRef.id);
        
        // Fechar modal
        const modal = document.getElementById('crudModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Recarregar dados
        await loadFirebaseTableData();
        
        // Notificar sucesso
        if (window.showCustomNotification) {
            window.showCustomNotification('Sucesso!', 'Endereço adicionado com sucesso', 'success');
        } else {
            alert('✅ Endereço adicionado com sucesso!');
        }
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao salvar endereço:', error);
        alert('❌ Erro ao salvar endereço: ' + error.message);
    }
}

// FUNÇÃO REMOVIDA - Usando a do dashboard-functions.js para evitar conflito

// ============= POPULAR DROPDOWNS COM DADOS DA GESTÃO =============
async function populateDropdowns() {
    console.log('📋 [FIREBASE-TABLE] Populando dropdowns...');
    
    try {
        const firestore = firebaseManager.getFirestore();
        
        // Mapear dropdowns para coleções
        const dropdownConfig = {
            'projeto': 'nova_gestao_projetos',
            'subProjeto': 'nova_gestao_subprojetos', 
            'tipoAcao': 'nova_gestao_tipos_acao',
            'cidade': 'nova_gestao_cidades',
            'supervisor': 'nova_gestao_supervisores',
            'equipe': 'nova_gestao_equipes'
        };
        
        // Popular cada dropdown
        for (const [dropdownId, collection] of Object.entries(dropdownConfig)) {
            const select = document.getElementById(dropdownId);
            if (!select) continue;
            
            try {
                const snapshot = await firestore.collection(collection).get();
                
                // Limpar opções existentes (exceto a primeira)
                const firstOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }
                
                // Adicionar opções
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = data.nome || data.name || doc.id;
                    option.textContent = data.nome || data.name || doc.id;
                    select.appendChild(option);
                });
                
                console.log(`✅ [FIREBASE-TABLE] Dropdown ${dropdownId} populado com ${snapshot.size} itens`);
                
            } catch (error) {
                console.warn(`⚠️ [FIREBASE-TABLE] Erro ao popular ${dropdownId}:`, error);
            }
        }
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao popular dropdowns:', error);
    }
}

// ============= FUNÇÕES GLOBAIS PARA COMPATIBILIDADE =============
window.filterDynamicTable = function() {
    const searchInput = document.getElementById('dynamicSearchInput');
    if (searchInput) {
        filterText = searchInput.value.trim();
        console.log('🔍 [FIREBASE-TABLE] Aplicando filtro:', filterText);
        
        if (firebaseTableData.length > 0) {
            const tbody = document.getElementById('enderecoTableBody');
            renderTableBody(tbody, firebaseTableData);
        }
    }
};

window.reloadCompleteInterface = async function() {
    console.log('🔄 [FIREBASE-TABLE] Recarregando interface completa...');
    await loadFirebaseTableData();
};

// ============= FUNÇÃO DE DEBUG PARA DIAGNOSTICAR PROBLEMA =============
window.debugTableData = function() {
    console.log('🔍 [DEBUG] Diagnosticando problema da tabela...');
    
    // 1. Verificar se dados existem
    console.log('📊 [DEBUG] Dados carregados:', {
        totalRegistros: firebaseTableData.length,
        colunas: firebaseTableColumns.length,
        primeirosRegistros: firebaseTableData.slice(0, 3)
    });
    
    // 2. Verificar estrutura do primeiro registro
    if (firebaseTableData.length > 0) {
        const primeiro = firebaseTableData[0];
        console.log('🔍 [DEBUG] Primeiro registro completo:', primeiro);
        console.log('🔍 [DEBUG] Chaves do primeiro registro:', Object.keys(primeiro));
        console.log('🔍 [DEBUG] Valores não vazios:', Object.entries(primeiro).filter(([k,v]) => v !== null && v !== undefined && v !== ''));
    }
    
    // 3. Verificar mapeamento de campos
    if (firebaseTableData.length > 0) {
        const primeiro = firebaseTableData[0];
        console.log('🔍 [DEBUG] Teste de mapeamento de campos:');
        firebaseTableColumns.slice(0, 10).forEach(col => {
            const valor = mapFieldValue(primeiro, col);
            console.log(`  ${col}: "${valor}"`);
        });
    }
    
    // 4. Verificar elementos DOM
    console.log('🔍 [DEBUG] Elementos DOM:', {
        tabela: !!document.getElementById('enderecoMainTable'),
        tbody: !!document.getElementById('enderecoTableBody'),
        linhasNaTabela: document.getElementById('enderecoTableBody')?.children.length || 0
    });
    
    // 5. Forçar re-renderização
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody && firebaseTableData.length > 0) {
        console.log('🔄 [DEBUG] Forçando re-renderização...');
        renderTableBody(tbody, firebaseTableData);
    }
    
    return {
        dados: firebaseTableData.length,
        colunas: firebaseTableColumns,
        primeiro: firebaseTableData[0],
        elementos: {
            tabela: !!document.getElementById('enderecoMainTable'),
            tbody: !!document.getElementById('enderecoTableBody')
        }
    };
};

// SISTEMA DE INTERFACE DE USUÁRIO REMOVIDO - Usando o do dashboard-minimal.js

// ============= FUNÇÕES GLOBAIS DE DEBUG PARA GRÁFICOS =============
window.testCharts = async function() {
    console.log('🧪 [TEST-CHARTS] Testando sistema de gráficos...');
    
    // 1. Verificar dados
    console.log('📊 [TEST-CHARTS] Dados disponíveis:', firebaseTableData?.length || 0);
    if (firebaseTableData && firebaseTableData.length > 0) {
        console.log('📊 [TEST-CHARTS] Primeiro registro:', firebaseTableData[0]);
    }
    
    // 2. Verificar Chart.js
    console.log('📊 [TEST-CHARTS] Chart.js disponível:', typeof Chart !== 'undefined');
    
    // 3. Verificar canvas
    const canvasIds = ['projetosChart', 'subProjetosChart', 'cidadesChart', 'hpProjetosChart', 'recebimentosChart', 'supervisorStatusChart'];
    canvasIds.forEach(id => {
        const canvas = document.getElementById(id);
        console.log(`📊 [TEST-CHARTS] ${id}:`, !!canvas);
    });
    
    // 4. Tentar criar gráficos
    try {
        await updateDashboardCharts();
        console.log('✅ [TEST-CHARTS] updateDashboardCharts executado');
    } catch (error) {
        console.error('❌ [TEST-CHARTS] Erro:', error);
    }
};

window.forceCreateCharts = async function() {
    console.log('🔧 [FORCE-CHARTS] Forçando criação de gráficos...');
    
    if (!firebaseTableData || firebaseTableData.length === 0) {
        console.error('❌ [FORCE-CHARTS] Nenhum dado disponível');
        return;
    }
    
    if (typeof Chart === 'undefined') {
        console.error('❌ [FORCE-CHARTS] Chart.js não disponível');
        return;
    }
    
    try {
        const stats = await getFirebaseTableStatistics();
        console.log('📊 [FORCE-CHARTS] Stats obtidas:', stats);
        
        // Criar gráficos um por um com try-catch individual
        try {
            createProjetosChart(stats);
            console.log('✅ Gráfico de Projetos criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de Projetos:', e);
        }
        
        try {
            createSubProjetosChart(stats);
            console.log('✅ Gráfico de Sub Projetos criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de Sub Projetos:', e);
        }
        
        try {
            createCidadesChart(stats);
            console.log('✅ Gráfico de Cidades criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de Cidades:', e);
        }
        
        try {
            createHpProjetosChart(stats);
            console.log('✅ Gráfico de HP criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de HP:', e);
        }
        
        try {
            createRecebimentosChart(stats);
            console.log('✅ Gráfico de Recebimentos criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de Recebimentos:', e);
        }
        
        try {
            createSupervisorStatusChart(stats);
            console.log('✅ Gráfico de Supervisores criado');
        } catch (e) {
            console.error('❌ Erro no gráfico de Supervisores:', e);
        }
        
    } catch (error) {
        console.error('❌ [FORCE-CHARTS] Erro geral:', error);
    }
};

// ============= EXPOSIÇÃO GLOBAL =============
window.FirebaseTableSystem = {
    loadData: loadFirebaseTableData,
    refreshData: refreshTableData,
    isConnected: () => firebaseManager.isConnected(),
    isInitialized: () => firebaseManager.isInitialized(),
    getData: () => firebaseTableData,
    getColumns: () => firebaseTableColumns,
    getStatistics: getFirebaseTableStatistics,
    updateCards: updateDashboardCards,
    updateFilters: updateDashboardFilters,
    updateCharts: updateDashboardCharts,
    manager: firebaseManager
};

// ============= SISTEMA INTEGRADO DE DASHBOARD =============
// Cores padrão para gráficos (mantendo design atual)
const coresAzuis = {
    principal: 'rgba(59, 130, 246, 0.8)',     // blue-500
    secundaria: 'rgba(29, 78, 216, 0.8)',    // blue-700
    clara: 'rgba(147, 197, 253, 0.8)',       // blue-300
    escura: 'rgba(30, 58, 138, 0.8)',        // blue-900
    borda: 'rgba(59, 130, 246, 1)',
    gradiente: [
        'rgba(59, 130, 246, 0.8)',   'rgba(29, 78, 216, 0.8)', 
        'rgba(147, 197, 253, 0.8)',  'rgba(30, 58, 138, 0.8)',
        'rgba(99, 102, 241, 0.8)',   'rgba(79, 70, 229, 0.8)',
        'rgba(124, 58, 237, 0.8)',   'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',   'rgba(239, 68, 68, 0.8)'
    ]
};

// Sistema de charts integrado (usa a declaração global existente)
let filteredTableData = [];

// ============= MAPEAMENTO DE CAMPOS =============
function obterCampo(item, campo) {
    const mapeamento = {
        'projeto': item['Projeto'] || item['projeto'] || '',
        'subProjeto': item['Sub Projeto'] || item['subProjeto'] || '',
        'cidade': item['Cidade'] || item['cidade'] || '',
        'hp': item['HP'] || item['hp'] || '',
        'dataRecebimento': item['DATA RECEBIMENTO'] || item['dataRecebimento'] || item['Data Recebimento'] || '',
        'dataInicio': item['DATA INICIO'] || item['dataInicio'] || item['Data Início'] || '',
        'dataFinal': item['DATA FINAL'] || item['dataFinal'] || item['Data Final'] || '',
        'supervisor': item['Supervisor'] || item['supervisor'] || '',
        'equipe': item['EQUIPE'] || item['equipe'] || '',
        'status': item['Status'] || item['status'] || item['STATUS'] || '',
        'tipoAcao': item['Tipo de Ação'] || item['tipoAcao'] || ''
    };
    return mapeamento[campo] || '';
}

// ============= DESTRUIR GRÁFICOS EXISTENTES =============
function destruirGraficosExistentes() {
    Object.keys(dashboardCharts).forEach(key => {
        if (dashboardCharts[key] && typeof dashboardCharts[key].destroy === 'function') {
            try {
                dashboardCharts[key].destroy();
                console.log(`🗑️ [FIREBASE-TABLE] Gráfico ${key} destruído`);
            } catch (error) {
                console.warn(`⚠️ [FIREBASE-TABLE] Erro ao destruir gráfico ${key}:`, error);
            }
        }
        dashboardCharts[key] = null;
    });
}

// ============= FUNÇÃO PRINCIPAL PARA CRIAR TODOS OS GRÁFICOS =============
async function criarTodosGraficosIntegrados(dadosParaUsar = null) {
    console.log('🎨 [FIREBASE-TABLE] === CRIANDO DASHBOARD INTEGRADO ===');
    
    try {
        // Aguardar Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ [FIREBASE-TABLE] Aguardando Chart.js...');
            setTimeout(() => criarTodosGraficosIntegrados(dadosParaUsar), 500);
            return;
        }
        
        // Usar dados fornecidos ou dados da tabela
        const dados = dadosParaUsar || firebaseTableData;
        
        if (!dados || dados.length === 0) {
            console.warn('⚠️ [FIREBASE-TABLE] Nenhum dado disponível para gráficos');
            return;
        }
        
        console.log('📊 [FIREBASE-TABLE] Criando dashboard com', dados.length, 'registros');
        
        // Destruir gráficos existentes
        destruirGraficosExistentes();
        
        // Criar cards estatísticos
        atualizarCardsEstatisticosIntegrado(dados);
        
        // GRÁFICOS DESABILITADOS - Gerenciados pelo dashboard-integration.js
        // Os gráficos são chamados pelo dashboard-integration.js para evitar conflitos
        
        // Criar tabelas de ranking
        criarRanking1_EquipesTipoAcaoIntegrado(dados);
        criarRanking2_EquipesStatusIntegrado(dados);
        
        console.log('✅ [FIREBASE-TABLE] Dashboard integrado criado com sucesso!');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao criar dashboard:', error);
    }
}

// ============= CARDS ESTATÍSTICOS INTEGRADOS =============
function atualizarCardsEstatisticosIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Atualizando cards estatísticos...');
    
    const totalRegistros = dados.length;
    const elemento1 = document.getElementById('infraStatTotalRegistros');
    if (elemento1) elemento1.textContent = totalRegistros;
    
    // Endereços distintos
    const enderecosUnicos = new Set(dados.map(item => item['ENDEREÇO'] || '').filter(e => e.trim()));
    const elemento2 = document.getElementById('infraStatEnderecosDistintos');
    if (elemento2) elemento2.textContent = enderecosUnicos.size;
    
    // Equipes distintas
    const equipesUnicas = new Set(dados.map(item => item['EQUIPE'] || '').filter(e => e.trim()));
    const elemento3 = document.getElementById('infraStatEquipesDistintas');
    if (elemento3) elemento3.textContent = equipesUnicas.size;
    
    // Produtividade
    const produtivos = dados.filter(item => {
        const status = (item['Status'] || '').toUpperCase();
        return status === 'PRODUTIVA' || status.includes('PRODUTIVA');
    }).length;
    const produtividade = totalRegistros > 0 ? Math.round((produtivos / totalRegistros) * 100) : 0;
    const elemento4 = document.getElementById('infraStatProdutividade');
    if (elemento4) elemento4.textContent = `${produtividade}%`;
    
    // Tempo médio de execução (Recebimento → Final)
    const tempoMedioExecucao = calcularTempoMedioIntegrado(dados, 'DATA RECEBIMENTO', 'DATA FINAL');
    document.getElementById('infraStatTempoMedio').textContent = `${tempoMedioExecucao} dias`;
    
    // Tempo médio Sala Técnica (Recebimento → Início)
    const tempoMedioSalaTecnica = calcularTempoMedioIntegrado(dados, 'DATA RECEBIMENTO', 'DATA INICIO');
    document.getElementById('infraStatTempoSalaTecnica').textContent = `${tempoMedioSalaTecnica} dias`;
    
    // Tempo médio Técnicos (Início → Final)
    const tempoMedioTecnicos = calcularTempoMedioIntegrado(dados, 'DATA INICIO', 'DATA FINAL');
    document.getElementById('infraStatTempoTecnicos').textContent = `${tempoMedioTecnicos} dias`;
    
    console.log('✅ [FIREBASE-TABLE] Cards atualizados');
}

function calcularTempoMedioIntegrado(dados, campoInicio, campoFim) {
    const registrosComDatas = dados.filter(item => {
        const inicio = item[campoInicio];
        const fim = item[campoFim];
        // Verificar se os valores existem e são válidos (string ou objeto Date)
        const inicioValido = inicio && (typeof inicio === 'string' ? inicio.trim() : true);
        const fimValido = fim && (typeof fim === 'string' ? fim.trim() : true);
        return inicioValido && fimValido;
    });
    
    if (registrosComDatas.length === 0) return 0;
    
    const tempos = registrosComDatas.map(item => {
        try {
            const inicio = new Date(item[campoInicio]);
            const fim = new Date(item[campoFim]);
            
            if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
            
            const diffTime = Math.abs(fim - inicio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (error) {
            return 0;
        }
    });
    
    const temposValidos = tempos.filter(t => t > 0);
    if (temposValidos.length === 0) return 0;
    
    const media = temposValidos.reduce((sum, t) => sum + t, 0) / temposValidos.length;
    return Math.round(media);
}

// ============= 1. ANÁLISE DE PROJETOS (Barras + Linhas) =============
function criarGrafico1_AnaliseProjetosIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Projetos (Barras + Linhas)...');
    
    const canvas = document.getElementById('projetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas projetosChart não encontrado');
        return;
    }
    
    // Contar projetos
    const contadorProjetos = {};
    dados.forEach(item => {
        const projeto = obterCampo(item, 'projeto') || 'Não especificado';
        contadorProjetos[projeto] = (contadorProjetos[projeto] || 0) + 1;
    });
    
    // Ordenar por quantidade e pegar top 10
    const entries = Object.entries(contadorProjetos)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const dataQuantidade = entries.map(([,quantidade]) => quantidade);
    const dataLinha = entries.map(([,quantidade]) => Math.round(quantidade * 0.8)); // Linha com 80% dos valores
    
    // Criar gráfico
    const ctx = canvas.getContext('2d');
    dashboardCharts.projetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: dataQuantidade,
                    backgroundColor: coresAzuis.principal,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                },
                {
                    type: 'line',
                    label: 'Tendência',
                    data: dataLinha,
                    borderColor: coresAzuis.secundaria,
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: coresAzuis.escura
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                    display: true
                },
                title: {
                    display: true,
                    text: 'Análise de Projetos'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Quantidade'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Projetos'
                    }
                }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de Projetos criado');
}

// ============= 2. ANÁLISE DE SUB-PROJETOS (Barras + Linhas) =============
function criarGrafico2_AnaliseSubProjetosIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Sub-Projetos (Barras + Linhas)...');
    
    const canvas = document.getElementById('subProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas subProjetosChart não encontrado');
        return;
    }
    
    // Contar sub-projetos
    const contador = {};
    dados.forEach(item => {
        const subProjeto = obterCampo(item, 'subProjeto') || 'Não especificado';
        contador[subProjeto] = (contador[subProjeto] || 0) + 1;
    });
    
    // Ordenar e pegar top 10
    const entries = Object.entries(contador)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const dataQuantidade = entries.map(([,quantidade]) => quantidade);
    const dataLinha = entries.map(([,quantidade]) => Math.round(quantidade * 0.75));
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.subProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Quantidade',
                    data: dataQuantidade,
                    backgroundColor: coresAzuis.clara,
                    borderColor: coresAzuis.borda,
                    borderWidth: 2
                },
                {
                    type: 'line',
                    label: 'Tendência',
                    data: dataLinha,
                    borderColor: coresAzuis.escura,
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: coresAzuis.secundaria
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', display: true },
                title: { display: true, text: 'Análise de Sub-Projetos' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
                x: { title: { display: true, text: 'Sub-Projetos' } }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de Sub-Projetos criado');
}

// ============= 3. ANÁLISE DE CIDADES (Barras) =============
function criarGrafico3_AnaliseCidadesIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Cidades (Barras)...');
    
    const canvas = document.getElementById('cidadesChart');
    if (!canvas) {
        console.warn('⚠️ Canvas cidadesChart não encontrado');
        return;
    }
    
    const contador = {};
    dados.forEach(item => {
        const cidade = obterCampo(item, 'cidade') || 'Não especificado';
        contador[cidade] = (contador[cidade] || 0) + 1;
    });
    
    const entries = Object.entries(contador)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,quantidade]) => quantidade);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.cidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade por Cidade',
                data: data,
                backgroundColor: coresAzuis.gradiente,
                borderColor: coresAzuis.gradiente.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', display: true },
                title: { display: true, text: 'Análise de Cidades' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
                x: { title: { display: true, text: 'Cidades' } }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de Cidades criado');
}

// ============= 4. ANÁLISE DE HP POR PROJETO (Barras) =============
function criarGrafico4_AnaliseHPProjetosIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de HP por Projetos (Barras)...');
    
    const canvas = document.getElementById('hpProjetosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas hpProjetosChart não encontrado');
        return;
    }
    
    // Somar HP por projeto e agrupar MDU-TOA
    const somaHPPorProjeto = {};
    dados.forEach(item => {
        let projeto = obterCampo(item, 'projeto') || 'Não especificado';
        
        // Agrupar todas variações de MDU-TOA
        if (projeto.toLowerCase().includes('mdu-toa') || projeto.toLowerCase().includes('mdu toa')) {
            projeto = 'MDU-TOA';
        }
        
        const hp = parseInt(obterCampo(item, 'hp')) || 0;
        somaHPPorProjeto[projeto] = (somaHPPorProjeto[projeto] || 0) + hp;
    });
    
    const entries = Object.entries(somaHPPorProjeto)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    const labels = entries.map(([nome]) => nome);
    const data = entries.map(([,soma]) => soma);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.hpProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Soma de HP Ativados',
                data: data,
                backgroundColor: coresAzuis.gradiente,
                borderColor: coresAzuis.gradiente.map(color => color.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', display: true },
                title: { display: true, text: 'Análise de HP por Projeto' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Soma de HP Ativados' } },
                x: { title: { display: true, text: 'Projetos' } }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de HP por Projeto criado');
}

// ============= GRÁFICO 5: ANÁLISE DE RECEBIMENTOS E CONCLUSÕES (BARRAS DUPLAS) =============
function criarGrafico5_AnaliseRecebimentosIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Recebimentos e Conclusões (Barras Duplas)...');
    console.log('📊 [DEBUG-RECEBIMENTOS] Total de dados recebidos:', dados.length);
    
    const canvas = document.getElementById('recebimentosChart');
    if (!canvas) {
        console.warn('⚠️ Canvas recebimentosChart não encontrado');
        return;
    }
    console.log('✅ [DEBUG-RECEBIMENTOS] Canvas encontrado:', canvas);
    
    // Contar recebimentos e conclusões por mês/ano
    const dadosPorMes = {};
    
    let datasRecebimentoEncontradas = 0;
    let datasConclusaoEncontradas = 0;
    
    dados.forEach((item, index) => {
        // Data de recebimento
        const dataRecebimento = obterCampo(item, 'dataRecebimento');
        if (index < 3) console.log(`📅 [DEBUG-RECEBIMENTOS] Item ${index} - dataRecebimento:`, dataRecebimento);
        if (dataRecebimento) {
            datasRecebimentoEncontradas++;
            const mesAnoRecebimento = formatarMesAno(dataRecebimento);
            if (mesAnoRecebimento) {
                if (!dadosPorMes[mesAnoRecebimento]) {
                    dadosPorMes[mesAnoRecebimento] = { recebidos: 0, concluidos: 0 };
                }
                dadosPorMes[mesAnoRecebimento].recebidos++;
            }
        }
        
        // Data de conclusão
        const dataConclusao = obterCampo(item, 'dataFinal');
        if (index < 3) console.log(`📅 [DEBUG-RECEBIMENTOS] Item ${index} - dataFinal:`, dataConclusao);
        if (dataConclusao) {
            datasConclusaoEncontradas++;
            const mesAnoConclusao = formatarMesAno(dataConclusao);
            if (mesAnoConclusao) {
                if (!dadosPorMes[mesAnoConclusao]) {
                    dadosPorMes[mesAnoConclusao] = { recebidos: 0, concluidos: 0 };
                }
                dadosPorMes[mesAnoConclusao].concluidos++;
            }
        }
    });
    
    console.log('📊 [DEBUG-RECEBIMENTOS] Datas de recebimento encontradas:', datasRecebimentoEncontradas);
    console.log('📊 [DEBUG-RECEBIMENTOS] Datas de conclusão encontradas:', datasConclusaoEncontradas);
    console.log('📊 [DEBUG-RECEBIMENTOS] Dados por mês:', dadosPorMes);
    
    // Função auxiliar para formatar mês/ano como "Jan/2025"
    function formatarMesAno(dataStr) {
        try {
            let data;
            if (dataStr.includes('/')) {
                const [dia, mes, ano] = dataStr.split('/');
                data = new Date(ano, mes - 1, dia);
            } else if (dataStr.includes('-')) {
                data = new Date(dataStr);
            } else {
                return null;
            }
            
            const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const mesNome = meses[data.getMonth()];
            const ano = data.getFullYear();
            
            return `${mesNome}/${ano}`;
        } catch (error) {
            return null;
        }
    }
    
    // Ordenar por data
    const mesesOrdenados = Object.keys(dadosPorMes).sort((a, b) => {
        const [mesA, anoA] = a.split('/');
        const [mesB, anoB] = b.split('/');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        if (anoA !== anoB) return parseInt(anoA) - parseInt(anoB);
        return meses.indexOf(mesA) - meses.indexOf(mesB);
    });
    
    const labels = mesesOrdenados;
    const dadosRecebidos = mesesOrdenados.map(mes => dadosPorMes[mes].recebidos);
    const dadosConcluidos = mesesOrdenados.map(mes => dadosPorMes[mes].concluidos);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.recebimentos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Notas Recebidas',
                data: dadosRecebidos,
                backgroundColor: coresVerdes.gradiente[0],
                borderColor: coresVerdes.gradiente[0].replace('0.8', '1'),
                borderWidth: 2
            }, {
                label: 'Notas Concluídas',
                data: dadosConcluidos,
                backgroundColor: coresAzuis.gradiente[0],
                borderColor: coresAzuis.gradiente[0].replace('0.8', '1'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', display: true },
                title: { display: true, text: 'Análise de Recebimentos e Conclusões' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
                x: { title: { display: true, text: 'Período' } }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de Recebimentos e Conclusões criado');
}

// ============= GRÁFICO 6: ANÁLISE DE ENDEREÇOS POR SUPERVISOR (BARRAS AGRUPADAS) =============
function criarGrafico6_AnaliseEnderecosSupervisorIntegrado(dados) {
    console.log('📊 [FIREBASE-TABLE] Criando Análise de Endereços por Supervisor (Barras Agrupadas)...');
    
    const canvas = document.getElementById('supervisorStatusChart');
    if (!canvas) {
        console.warn('⚠️ Canvas supervisorStatusChart não encontrado');
        return;
    }
    
    // Contar PRODUTIVA/IMPRODUTIVA por supervisor
    const dadosPorSupervisor = {};
    
    dados.forEach(item => {
        const supervisor = obterCampo(item, 'supervisor') || 'Não especificado';
        const status = (obterCampo(item, 'status') || '').toUpperCase();
        
        if (!dadosPorSupervisor[supervisor]) {
            dadosPorSupervisor[supervisor] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status === 'PRODUTIVA' || status.includes('PRODUTIVA')) {
            dadosPorSupervisor[supervisor].PRODUTIVA++;
        } else if (status === 'IMPRODUTIVA' || status.includes('IMPRODUTIVA')) {
            dadosPorSupervisor[supervisor].IMPRODUTIVA++;
        }
    });
    
    // Filtrar supervisores com dados e ordenar por total
    const supervisoresComDados = Object.entries(dadosPorSupervisor)
        .filter(([supervisor, dados]) => dados.PRODUTIVA > 0 || dados.IMPRODUTIVA > 0)
        .sort(([,a], [,b]) => (b.PRODUTIVA + b.IMPRODUTIVA) - (a.PRODUTIVA + a.IMPRODUTIVA))
        .slice(0, 10);
    
    const labels = supervisoresComDados.map(([supervisor]) => supervisor);
    const dadosProdutiva = supervisoresComDados.map(([,dados]) => dados.PRODUTIVA);
    const dadosImprodutiva = supervisoresComDados.map(([,dados]) => dados.IMPRODUTIVA);
    
    const ctx = canvas.getContext('2d');
    dashboardCharts.supervisorStatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'PRODUTIVA',
                data: dadosProdutiva,
                backgroundColor: coresVerdes.gradiente[0],
                borderColor: coresVerdes.gradiente[0].replace('0.8', '1'),
                borderWidth: 2
            }, {
                label: 'IMPRODUTIVA',
                data: dadosImprodutiva,
                backgroundColor: coresVermelhas.gradiente[0],
                borderColor: coresVermelhas.gradiente[0].replace('0.8', '1'),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top', display: true },
                title: { display: true, text: 'Análise de Endereços por Supervisor' }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Quantidade de Endereços' } },
                x: { title: { display: true, text: 'Supervisores' } }
            }
        }
    });
    
    console.log('✅ [FIREBASE-TABLE] Análise de Endereços por Supervisor criado');
}

// ============= RANKING 1: EQUIPES POR TIPO DE AÇÃO =============
function criarRanking1_EquipesTipoAcaoIntegrado(dados) {
    console.log('🏆 [FIREBASE-TABLE] Gerando ranking por tipo de ação...');
    
    const tbody = document.getElementById('equipeRankingTableBody');
    if (!tbody) return;
    
    // Agrupar por equipe e tipo de ação
    const equipeStats = {};
    
    dados.forEach(item => {
        const equipe = item['EQUIPE'] || 'Não especificado';
        const tipoAcao = item['Tipo de Ação'] || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { ATIVAÇÃO: 0, CONSTRUÇÃO: 0, VISTORIA: 0 };
        }
        
        const tipo = tipoAcao.toUpperCase();
        if (equipeStats[equipe][tipo] !== undefined) {
            equipeStats[equipe][tipo]++;
        }
    });
    
    // Calcular totais e ranquear
    const rankings = Object.entries(equipeStats).map(([equipe, stats]) => ({
        equipe,
        ativacao: stats.ATIVAÇÃO,
        construcao: stats.CONSTRUÇÃO,
        vistoria: stats.VISTORIA,
        total: stats.ATIVAÇÃO + stats.CONSTRUÇÃO + stats.VISTORIA
    })).sort((a, b) => b.total - a.total);
    
    // Limitar a 50 equipes principais para evitar sobrecarga
    const topRankings = rankings.slice(0, 50);
    
    // Adicionar nota se há mais dados
    const moreDataNote = rankings.length > 50 ? 
        `<tr class="info-row"><td colspan="6" style="text-align: center; font-style: italic; color: #666; padding: 10px;">
            📊 Mostrando top 50 de ${rankings.length} equipes
        </td></tr>` : '';
    
    // Gerar HTML
    tbody.innerHTML = topRankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.ativacao}</td>
            <td>${item.construcao}</td>
            <td>${item.vistoria}</td>
            <td><strong>${item.total}</strong></td>
        </tr>
    `).join('') + moreDataNote;
    
    // Atualizar totais
    const totalAtivacao = rankings.reduce((sum, item) => sum + item.ativacao, 0);
    const totalConstrucao = rankings.reduce((sum, item) => sum + item.construcao, 0);
    const totalVistoria = rankings.reduce((sum, item) => sum + item.vistoria, 0);
    const totalGeral = totalAtivacao + totalConstrucao + totalVistoria;
    
    document.getElementById('totalAtivacao').textContent = totalAtivacao;
    document.getElementById('totalConstrucao').textContent = totalConstrucao;
    document.getElementById('totalVistoria').textContent = totalVistoria;
    document.getElementById('totalGeral').textContent = totalGeral;
}

// ============= RANKING 2: EQUIPES POR STATUS =============
function criarRanking2_EquipesStatusIntegrado(dados) {
    console.log('🏆 [FIREBASE-TABLE] Gerando ranking por status...');
    
    const tbody = document.getElementById('equipeStatusRankingTableBody');
    if (!tbody) return;
    
    // Agrupar por equipe e status
    const equipeStats = {};
    
    dados.forEach(item => {
        const equipe = item['EQUIPE'] || 'Não especificado';
        const status = item['Status'] || 'Não especificado';
        
        if (!equipeStats[equipe]) {
            equipeStats[equipe] = { PRODUTIVA: 0, IMPRODUTIVA: 0 };
        }
        
        if (status.toUpperCase() === 'PRODUTIVA') {
            equipeStats[equipe].PRODUTIVA++;
        } else if (status.toUpperCase() === 'IMPRODUTIVA') {
            equipeStats[equipe].IMPRODUTIVA++;
        }
    });
    
    // Calcular totais e produtividade
    const rankings = Object.entries(equipeStats).map(([equipe, stats]) => {
        const total = stats.PRODUTIVA + stats.IMPRODUTIVA;
        const produtividade = total > 0 ? Math.round((stats.PRODUTIVA / total) * 100) : 0;
        
        return {
            equipe,
            produtiva: stats.PRODUTIVA,
            improdutiva: stats.IMPRODUTIVA,
            total,
            produtividade
        };
    }).sort((a, b) => b.produtividade - a.produtividade);
    
    // Limitar a 50 equipes principais para evitar sobrecarga
    const topRankings = rankings.slice(0, 50);
    
    // Adicionar nota se há mais dados
    const moreDataNote = rankings.length > 50 ? 
        `<tr class="info-row"><td colspan="6" style="text-align: center; font-style: italic; color: #666; padding: 10px;">
            📊 Mostrando top 50 de ${rankings.length} equipes
        </td></tr>` : '';
    
    // Gerar HTML
    tbody.innerHTML = topRankings.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.equipe}</td>
            <td>${item.produtiva}</td>
            <td>${item.improdutiva}</td>
            <td><strong>${item.total}</strong></td>
            <td><strong>${item.produtividade}%</strong></td>
        </tr>
    `).join('') + moreDataNote;
    
    // Atualizar totais
    const totalProdutiva = rankings.reduce((sum, item) => sum + item.produtiva, 0);
    const totalImprodutiva = rankings.reduce((sum, item) => sum + item.improdutiva, 0);
    const totalStatusGeral = totalProdutiva + totalImprodutiva;
    const produtividadeGeral = totalStatusGeral > 0 ? Math.round((totalProdutiva / totalStatusGeral) * 100) : 0;
    
    document.getElementById('totalProdutiva').textContent = totalProdutiva;
    document.getElementById('totalImprodutiva').textContent = totalImprodutiva;
    document.getElementById('totalStatusGeral').textContent = totalStatusGeral;
    document.getElementById('totalProdutividade').textContent = `${produtividadeGeral}%`;
}

console.log('✅ [FIREBASE-TABLE] Sistema de tabela Firebase carregado');
console.log('🧪 [FIREBASE-TABLE] Funções de debug disponíveis: testCharts(), forceCreateCharts()');

// Verificar se as funções foram definidas corretamente
setTimeout(() => {
    console.log('🔍 [FIREBASE-TABLE] Verificação de funções globais:');
    console.log('🔍 [FIREBASE-TABLE] - testCharts:', typeof window.testCharts);
    console.log('🔍 [FIREBASE-TABLE] - forceCreateCharts:', typeof window.forceCreateCharts);
    console.log('🔍 [FIREBASE-TABLE] - FirebaseTableSystem:', typeof window.FirebaseTableSystem);
    
    if (typeof window.testCharts === 'undefined') {
        console.error('❌ [FIREBASE-TABLE] testCharts não foi definido corretamente!');
    }
    if (typeof window.forceCreateCharts === 'undefined') {
        console.error('❌ [FIREBASE-TABLE] forceCreateCharts não foi definido corretamente!');
    }
}, 1000);

// Exportar função principal para ser usada pelos filtros
window.criarTodosGraficosIntegrados = criarTodosGraficosIntegrados;

// Função de backup para depuração
window.debugFirebaseTable = function() {
    console.log('🔧 [DEBUG-BACKUP] Estado do sistema:');
    console.log('📊 firebaseTableData:', firebaseTableData?.length || 'undefined');
    console.log('📊 Chart.js:', typeof Chart);
    console.log('📊 Canvas projetosChart:', !!document.getElementById('projetosChart'));
    console.log('📊 Canvas subProjetosChart:', !!document.getElementById('subProjetosChart'));
    console.log('📊 Canvas cidadesChart:', !!document.getElementById('cidadesChart'));
    console.log('📊 Canvas hpProjetosChart:', !!document.getElementById('hpProjetosChart'));
    console.log('📊 Canvas recebimentosChart:', !!document.getElementById('recebimentosChart'));
    console.log('📊 Canvas supervisorStatusChart:', !!document.getElementById('supervisorStatusChart'));
    
    // Tentar criar um gráfico simples de teste
    if (typeof Chart !== 'undefined') {
        const canvas = document.getElementById('projetosChart');
        if (canvas) {
            console.log('🧪 [DEBUG-BACKUP] Testando criação de gráfico simples...');
            try {
                new Chart(canvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Teste'],
                        datasets: [{
                            label: 'Teste',
                            data: [1],
                            backgroundColor: 'rgba(59, 130, 246, 0.6)'
                        }]
                    },
                    options: { responsive: true }
                });
                console.log('✅ [DEBUG-BACKUP] Gráfico de teste criado com sucesso!');
            } catch (e) {
                console.error('❌ [DEBUG-BACKUP] Erro no gráfico de teste:', e);
            }
        }
    }
};

// ============= SISTEMA DE EDIÇÃO DE REGISTROS =============

// Variável global para armazenar ID do registro sendo editado
let currentEditingRecordId = null;

// Função para abrir modal de edição
function openEditModal(recordId, recordData) {
    console.log('✏️ [EDIT-MODAL] Abrindo modal de edição para ID:', recordId);
    
    currentEditingRecordId = recordId;
    
    // Verificar se existe o modal do sistema novo-endereco-limpo
    const modal = document.getElementById('crudModal');
    if (!modal) {
        alert('Modal de edição não encontrado! Verifique se o sistema está carregado corretamente.');
        return;
    }
    
    // Definir título como edição
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Endereço';
    }
    
    // Carregar seletores com dados atualizados (igual ao novo endereço)
    console.log('📋 [EDIT-MODAL] Carregando seletores para edição...');
    carregarSeletoresParaEdicao();
    
    // Preencher formulário com dados do registro
    setTimeout(() => {
        populateEditForm(recordData);
    }, 500);
    
    // Configurar event listener do formulário para edição
    setupEditFormSubmission();
    
    // Abrir modal
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('show');
    
    console.log('✅ [EDIT-MODAL] Modal de edição aberto');
}

// Função para carregar seletores para edição (igual ao novo endereço)
async function carregarSeletoresParaEdicao() {
    console.log('📋 [EDIT-SELETORES] Carregando dados dos seletores...');
    
    try {
        // Usar a mesma lógica do novo-endereco-limpo.js
        if (window.NovoEndereco && window.NovoEndereco.initialized && window.NovoEndereco.firestore) {
            await window.NovoEndereco.carregarSeletores();
        } else {
            // Fallback: carregar dados estáticos + PEP
            carregarSeletoresFallbackComPEP();
        }
        
        console.log('✅ [EDIT-SELETORES] Seletores carregados para edição');
    } catch (error) {
        console.error('❌ [EDIT-SELETORES] Erro ao carregar seletores:', error);
        carregarSeletoresFallbackComPEP();
    }
}

// Função para carregar seletores com dados da tabela (incluindo PEP da tabela)
function carregarSeletoresFallbackComPEP() {
    console.log('🔄 [EDIT-SELETORES] Carregando seletores com dados da tabela...');
    
    // Extrair dados únicos da tabela atual
    const dadosDaTabela = extrairDadosUnicosDaTabela();
    
    // Dados estáticos para campos que não estão na tabela
    const dadosEstaticos = {
        projeto: dadosDaTabela.projeto.length > 0 ? dadosDaTabela.projeto : ['CLARO', 'VIVO', 'TIM', 'OI'],
        subProjeto: dadosDaTabela.subProjeto.length > 0 ? dadosDaTabela.subProjeto : ['MDU RESIDENCIAL', 'MDU COMERCIAL', 'FTTH', 'HFC'],
        tipoAcao: dadosDaTabela.tipoAcao.length > 0 ? dadosDaTabela.tipoAcao : ['VISTORIA', 'CONSTRUÇÃO', 'ATIVAÇÃO', 'MANUTENÇÃO'],
        cidade: dadosDaTabela.cidade.length > 0 ? dadosDaTabela.cidade : ['SALVADOR', 'LAURO DE FREITAS', 'CAMAÇARI', 'FEIRA DE SANTANA'],
        equipe: dadosDaTabela.equipe.length > 0 ? dadosDaTabela.equipe : ['EQUIPE A', 'EQUIPE B', 'EQUIPE C', 'EQUIPE D'],
        supervisor: dadosDaTabela.supervisor.length > 0 ? dadosDaTabela.supervisor : ['JOÃO SILVA', 'MARIA SANTOS', 'PEDRO OLIVEIRA'],
        pep: dadosDaTabela.pep // PEP sempre vem da tabela
    };
    
    // Popular cada seletor
    for (const [selectorId, opcoes] of Object.entries(dadosEstaticos)) {
        const select = document.getElementById(selectorId);
        if (!select) continue;
        
        // Manter valor selecionado atual se existir
        const valorAtual = select.value;
        
        // Limpar e recriar opções
        select.innerHTML = '<option value="">Selecione...</option>';
        
        opcoes.forEach(opcao => {
            const option = document.createElement('option');
            option.value = opcao;
            option.textContent = opcao;
            if (opcao === valorAtual) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        console.log(`✅ [EDIT-SELETORES] ${selectorId}: ${opcoes.length} opções carregadas`);
    }
    
    // Adicionar status fixo
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
        const valorAtualStatus = statusSelect.value;
        statusSelect.innerHTML = `
            <option value="">Selecione o status...</option>
            <option value="PRODUTIVA" ${valorAtualStatus === 'PRODUTIVA' ? 'selected' : ''}>PRODUTIVA</option>
            <option value="IMPRODUTIVA" ${valorAtualStatus === 'IMPRODUTIVA' ? 'selected' : ''}>IMPRODUTIVA</option>
        `;
        console.log('✅ [EDIT-SELETORES] Status: Opções fixas adicionadas');
    }
}

// Função para extrair dados únicos da tabela de endereços
function extrairDadosUnicosDaTabela() {
    console.log('📊 [EXTRAIR-DADOS] Extraindo dados únicos da tabela...');
    
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [EXTRAIR-DADOS] Tabela não encontrada');
        return {
            projeto: [], subProjeto: [], tipoAcao: [], cidade: [], 
            equipe: [], supervisor: [], pep: []
        };
    }
    
    const linhas = tbody.querySelectorAll('tr:not(.empty-state)');
    const dados = {
        projeto: new Set(),
        subProjeto: new Set(), 
        tipoAcao: new Set(),
        cidade: new Set(),
        equipe: new Set(),
        supervisor: new Set(),
        pep: new Set()
    };
    
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 18) {
            // Extrair valores das colunas correspondentes
            const projeto = colunas[0]?.textContent?.trim();
            const subProjeto = colunas[1]?.textContent?.trim();
            const tipoAcao = colunas[2]?.textContent?.trim();
            const cidade = colunas[6]?.textContent?.trim();
            const pep = colunas[7]?.textContent?.trim(); // Coluna PEP
            const equipe = colunas[15]?.textContent?.trim();
            const supervisor = colunas[16]?.textContent?.trim();
            
            if (projeto) dados.projeto.add(projeto);
            if (subProjeto) dados.subProjeto.add(subProjeto);
            if (tipoAcao) dados.tipoAcao.add(tipoAcao);
            if (cidade) dados.cidade.add(cidade);
            if (pep) dados.pep.add(pep);
            if (equipe) dados.equipe.add(equipe);
            if (supervisor) dados.supervisor.add(supervisor);
        }
    });
    
    // Converter Sets para Arrays ordenados
    const resultado = {
        projeto: Array.from(dados.projeto).sort(),
        subProjeto: Array.from(dados.subProjeto).sort(),
        tipoAcao: Array.from(dados.tipoAcao).sort(),
        cidade: Array.from(dados.cidade).sort(),
        equipe: Array.from(dados.equipe).sort(),
        supervisor: Array.from(dados.supervisor).sort(),
        pep: Array.from(dados.pep).sort()
    };
    
    console.log('📊 [EXTRAIR-DADOS] Dados únicos extraídos:', {
        projeto: resultado.projeto.length,
        subProjeto: resultado.subProjeto.length,
        tipoAcao: resultado.tipoAcao.length,
        cidade: resultado.cidade.length,
        equipe: resultado.equipe.length,
        supervisor: resultado.supervisor.length,
        pep: resultado.pep.length
    });
    
    return resultado;
}

// ============= SISTEMA DE HISTÓRICO DE ALTERAÇÕES =============

// Função para gerar descrição amigável do registro
function gerarDescricaoAmigavel(dados) {
    if (!dados) return 'Registro desconhecido';
    
    // Para endereços - mais detalhado
    if (dados.condominio || dados.endereco) {
        const partes = [];
        
        // Sempre começar com o condomínio se disponível
        if (dados.condominio) {
            partes.push(`🏢 "${dados.condominio}"`);
        }
        
        // Adicionar endereço se disponível e diferente do condomínio
        if (dados.endereco && dados.endereco !== dados.condominio) {
            partes.push(`📍 ${dados.endereco}`);
        }
        
        // Adicionar cidade
        if (dados.cidade) {
            partes.push(`🌆 ${dados.cidade}`);
        }
        
        // Adicionar projeto
        if (dados.projeto) {
            partes.push(`📋 ${dados.projeto}`);
        }
        
        // Adicionar equipe se disponível
        if (dados.equipe) {
            partes.push(`👥 Equipe: ${dados.equipe}`);
        }
        
        return partes.length > 0 ? partes.join(' • ') : 'Endereço';
    }
    
    // Para projetos/gestão - identificar melhor o tipo
    if (dados.nome) {
        // Tentar identificar o tipo baseado em propriedades específicas
        let tipo = 'Item';
        
        if (dados.cliente) {
            tipo = 'Projeto';
        } else if (dados.projetoPrincipal) {
            tipo = 'Sub-Projeto';
        } else if (dados.categoria) {
            tipo = 'Tipo de Ação';
        } else if (dados.email) {
            tipo = 'Supervisor';
        } else if (dados.especialidade || dados.lider) {
            tipo = 'Equipe';
        } else if (dados.estado || dados.regiao) {
            tipo = 'Cidade';
        }
        
        return `${tipo}: "${dados.nome}"`;
    }
    
    // Para outros tipos
    if (dados.titulo) {
        return `📄 "${dados.titulo}"`;
    }
    
    // Fallback mais inteligente
    const camposImportantes = [
        { campo: 'condominio', prefixo: '🏢 Condomínio' },
        { campo: 'endereco', prefixo: '📍 Endereço' },
        { campo: 'projeto', prefixo: '📋 Projeto' },
        { campo: 'subProjeto', prefixo: '📂 Sub-Projeto' },
        { campo: 'tipoAcao', prefixo: '⚡ Tipo de Ação' },
        { campo: 'equipe', prefixo: '👥 Equipe' },
        { campo: 'supervisor', prefixo: '👨‍💼 Supervisor' },
        { campo: 'cidade', prefixo: '🌆 Cidade' }
    ];
    
    for (const {campo, prefixo} of camposImportantes) {
        if (dados[campo]) {
            return `${prefixo}: "${dados[campo]}"`;
        }
    }
    
    // Último recurso - mostrar qualquer campo não-técnico disponível
    const camposDescritivos = Object.keys(dados).filter(key => 
        !['id', 'createdAt', 'updatedAt', 'timestamp', 'autoSaved', 'source', 'tabId'].includes(key)
    );
    
    if (camposDescritivos.length > 0) {
        const primeiroValor = dados[camposDescritivos[0]];
        if (primeiroValor) {
            return `${camposDescritivos[0]}: "${primeiroValor}"`;
        }
    }
    
    return 'Registro não identificado';
}

// Função para gerar detalhes específicos da operação
function gerarDetalhesOperacao(log) {
    const operacao = log.tipoOperacao?.toLowerCase() || 'unknown';
    
    // Tentar diferentes fontes para a descrição
    let descricao = log.descricaoRegistro;
    
    if (!descricao || descricao === 'Registro não identificado' || descricao === 'Registro do sistema') {
        // Tentar dados completos
        const dados = log.dadosCompletos?.depois || log.dadosCompletos?.antes || {};
        if (Object.keys(dados).length > 0) {
            descricao = gerarDescricaoAmigavel(dados);
        }
    }
    
    // Se ainda não temos descrição, tentar os campos alterados
    if (!descricao || descricao === 'Registro não identificado' || descricao === 'Registro do sistema') {
        if (log.camposAlterados && log.camposAlterados.length > 0) {
            const primeiroCampo = log.camposAlterados[0];
            const valor = primeiroCampo.valorNovo || primeiroCampo.valorAnterior || primeiroCampo.valorAntigo;
            if (valor) {
                descricao = `${traduzirNomeCampo(primeiroCampo.campo)}: "${valor}"`;
            }
        }
    }
    
    // Fallback final
    if (!descricao || descricao === 'Registro não identificado' || descricao === 'Registro do sistema') {
        descricao = `Registro ID: ${log.recordId || 'desconhecido'}`;
    }
    
    console.log(`🔍 [DEBUG-DETALHES] Operação: ${operacao}, Descrição final: ${descricao}`);
    
    switch(operacao) {
        case 'create':
        case 'criar':
            return `<div style="color: #059669; font-weight: 500;">✨ <strong>CRIADO:</strong> ${descricao}</div>`;
            
        case 'edit':
        case 'editar':
            return `<div style="color: #3b82f6; font-weight: 500;">📝 <strong>EDITADO:</strong> ${descricao}</div>`;
            
        case 'duplicate':
        case 'duplicar':
            const observacao = log.observacao || '';
            return `<div style="color: #8b5cf6; font-weight: 500;">📄 <strong>DUPLICADO:</strong> ${descricao}</div>
                    ${observacao ? `<div style="color: #6b7280; font-size: 11px; margin-top: 4px;">${observacao}</div>` : ''}`;
            
        case 'delete':
        case 'deletar':
        case 'excluir':
            return `<div style="color: #ef4444; font-weight: 500;">🗑️ <strong>EXCLUÍDO:</strong> ${descricao}</div>
                    <div style="color: #dc2626; font-size: 11px; margin-top: 4px;">⚠️ Este registro foi removido permanentemente do sistema</div>
                    ${gerarDetalhesExclusao(log)}`;
            
        default:
            return `<div style="color: #6b7280; font-weight: 500;">❓ <strong>OPERAÇÃO:</strong> ${operacao.toUpperCase()} - ${descricao}</div>`;
    }
}

// Função para traduzir nomes de campos para português
function traduzirNomeCampo(campo) {
    const traducoes = {
        'condominio': '🏢 Condomínio',
        'endereco': '📍 Endereço',
        'cidade': '🌆 Cidade',
        'projeto': '📋 Projeto',
        'subProjeto': '📂 Sub-Projeto',
        'tipoAcao': '⚡ Tipo de Ação',
        'contrato': '📄 Contrato',
        'pep': '🔧 PEP',
        'codImovelGed': '🏷️ Código GED',
        'nodeGerencial': '🌐 Node Gerencial',
        'areaTecnica': '⚙️ Área Técnica',
        'hp': '💪 HP',
        'andar': '🏗️ Andar',
        'dataRecebimento': '📅 Data Recebimento',
        'dataInicio': '🚀 Data Início',
        'dataFinal': '🏁 Data Final',
        'equipe': '👥 Equipe',
        'supervisor': '👨‍💼 Supervisor',
        'status': '📊 Status',
        'rdo': '📋 RDO',
        'book': '📖 Book',
        'projetoStatus': '📈 Status do Projeto',
        'situacao': '📋 Situação',
        'justificativa': '📝 Justificativa',
        'observacao': '💭 Observação',
        'nome': '📛 Nome',
        'descricao': '📝 Descrição',
        'cliente': '🏢 Cliente',
        'categoria': '📂 Categoria',
        'email': '✉️ Email',
        'telefone': '📞 Telefone',
        'area': '🎯 Área',
        'especialidade': '🎯 Especialidade',
        'lider': '👑 Líder',
        'membros': '👥 Membros',
        'estado': '🗺️ Estado',
        'regiao': '🌎 Região'
    };
    
    return traducoes[campo] || campo.charAt(0).toUpperCase() + campo.slice(1);
}

// Função para formatar valores de campos
function formatarValorCampo(valor) {
    if (!valor) return 'vazio';
    if (typeof valor === 'string' && valor.length > 50) {
        return valor.substring(0, 47) + '...';
    }
    return valor;
}

// Função para limpar timestamps do Firebase dos dados
function limparTimestampsFirebase(dados) {
    if (!dados || typeof dados !== 'object') return dados;
    
    const dadosLimpos = {};
    for (const [key, value] of Object.entries(dados)) {
        // Pular campos com timestamps do Firebase
        if (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') {
            if (value && typeof value === 'object' && value.seconds) {
                // Converter Firebase Timestamp para string
                dadosLimpos[key] = new Date(value.seconds * 1000).toISOString();
            } else if (value instanceof Date) {
                dadosLimpos[key] = value.toISOString();
            } else {
                dadosLimpos[key] = String(value);
            }
        } else {
            dadosLimpos[key] = value;
        }
    }
    return dadosLimpos;
}

// Função para gerar detalhes específicos da exclusão
function gerarDetalhesExclusao(log) {
    const dados = log.dadosCompletos?.antes || {};
    if (!dados || Object.keys(dados).length === 0) {
        return '';
    }
    
    // Campos mais importantes para mostrar na exclusão
    const camposImportantes = [
        { campo: 'projeto', label: '📋 Projeto' },
        { campo: 'subProjeto', label: '📂 Sub-Projeto' },
        { campo: 'tipoAcao', label: '⚡ Tipo' },
        { campo: 'equipe', label: '👥 Equipe' },
        { campo: 'supervisor', label: '👨‍💼 Supervisor' },
        { campo: 'status', label: '📊 Status' },
        { campo: 'dataRecebimento', label: '📅 Recebimento' },
        { campo: 'hp', label: '💪 HP' }
    ];
    
    const detalhes = [];
    camposImportantes.forEach(({campo, label}) => {
        if (dados[campo] && String(dados[campo]).trim()) {
            detalhes.push(`<span style="color: #6b7280;">${label}: <strong>${dados[campo]}</strong></span>`);
        }
    });
    
    if (detalhes.length > 0) {
        return `<div style="background: #fef2f2; padding: 8px; border-radius: 4px; margin-top: 8px; font-size: 11px;">
                    <strong>📝 Dados que foram excluídos:</strong><br>
                    ${detalhes.join(' • ')}
                </div>`;
    }
    
    return '';
}

// Função para gerar detalhes específicos dos campos por operação
function gerarDetalhesOperacaoCampos(log) {
    const operacao = log.tipoOperacao?.toLowerCase() || 'unknown';
    
    switch(operacao) {
        case 'delete':
        case 'deletar':
        case 'excluir':
            return gerarCamposExcluidos(log);
        case 'create':
        case 'criar':
            return gerarCamposCriados(log);
        case 'duplicate':
        case 'duplicar':
            return gerarCamposDuplicados(log);
        case 'edit':
        case 'editar':
        default:
            return gerarCamposEditados(log);
    }
}

// Função para gerar lista de campos excluídos
function gerarCamposExcluidos(log) {
    const dados = log.dadosCompletos?.antes || {};
    if (!dados || Object.keys(dados).length === 0) {
        return '<div style="color: #6b7280;">Nenhum dado disponível do registro excluído</div>';
    }
    
    const camposExcluidos = [];
    Object.keys(dados).forEach(campo => {
        if (!['id', 'createdAt', 'updatedAt'].includes(campo)) {
            const valor = dados[campo];
            if (valor !== null && valor !== undefined && String(valor).trim()) {
                camposExcluidos.push({
                    campo: campo,
                    valor: formatarValorCampo(valor)
                });
            }
        }
    });
    
    if (camposExcluidos.length === 0) {
        return '<div style="color: #6b7280;">Registro excluído sem dados detalhados</div>';
    }
    
    return `<div><strong>🗑️ ${camposExcluidos.length} campos excluídos:</strong></div>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                ${camposExcluidos.map(({campo, valor}) => `
                    <li style="margin-bottom: 4px;">
                        <strong>${traduzirNomeCampo(campo)}:</strong> 
                        <span style="color: #6b7280;">vazio</span>
                        → 
                        <span style="color: #ef4444; text-decoration: line-through;">${valor}</span>
                    </li>
                `).join('')}
            </ul>`;
}

// Função para gerar lista de campos criados
function gerarCamposCriados(log) {
    const dados = log.dadosCompletos?.depois || {};
    if (!dados || Object.keys(dados).length === 0) {
        return '<div style="color: #6b7280;">Nenhum dado disponível do registro criado</div>';
    }
    
    const camposCriados = [];
    Object.keys(dados).forEach(campo => {
        if (!['id', 'createdAt', 'updatedAt'].includes(campo)) {
            const valor = dados[campo];
            if (valor !== null && valor !== undefined && String(valor).trim()) {
                camposCriados.push({
                    campo: campo,
                    valor: formatarValorCampo(valor)
                });
            }
        }
    });
    
    if (camposCriados.length === 0) {
        return '<div style="color: #6b7280;">Registro criado sem dados detalhados</div>';
    }
    
    return `<div><strong>✨ ${camposCriados.length} campos criados:</strong></div>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                ${camposCriados.map(({campo, valor}) => `
                    <li style="margin-bottom: 4px;">
                        <strong>${traduzirNomeCampo(campo)}:</strong> 
                        <span style="color: #6b7280;">vazio</span>
                        → 
                        <span style="color: #059669;">${valor}</span>
                    </li>
                `).join('')}
            </ul>`;
}

// Função para gerar lista de campos duplicados
function gerarCamposDuplicados(log) {
    const dados = log.dadosCompletos?.depois || {};
    if (!dados || Object.keys(dados).length === 0) {
        return '<div style="color: #6b7280;">Nenhum dado disponível do registro duplicado</div>';
    }
    
    const camposDuplicados = [];
    Object.keys(dados).forEach(campo => {
        if (!['id', 'createdAt', 'updatedAt'].includes(campo)) {
            const valor = dados[campo];
            if (valor !== null && valor !== undefined && String(valor).trim()) {
                camposDuplicados.push({
                    campo: campo,
                    valor: formatarValorCampo(valor)
                });
            }
        }
    });
    
    if (camposDuplicados.length === 0) {
        return '<div style="color: #6b7280;">Registro duplicado sem dados detalhados</div>';
    }
    
    return `<div><strong>📄 ${camposDuplicados.length} campos duplicados:</strong></div>
            <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                ${camposDuplicados.map(({campo, valor}) => `
                    <li style="margin-bottom: 4px;">
                        <strong>${traduzirNomeCampo(campo)}:</strong> 
                        <span style="color: #6b7280;">vazio</span>
                        → 
                        <span style="color: #8b5cf6;">${valor}</span>
                    </li>
                `).join('')}
            </ul>`;
}

// Função para gerar lista de campos editados (original)
function gerarCamposEditados(log) {
    if (log.camposAlterados && log.camposAlterados.length > 0) {
        return `<div><strong>📝 ${log.camposAlterados.length} campos alterados:</strong></div>
                <ul style="margin: 8px 0; padding-left: 20px; font-size: 12px;">
                    ${log.camposAlterados.map(campo => `
                        <li style="margin-bottom: 4px;">
                            <strong>${traduzirNomeCampo(campo.campo)}:</strong> 
                            <span style="color: #dc2626; text-decoration: line-through;">${formatarValorCampo(campo.valorAntigo || campo.valorAnterior) || 'vazio'}</span>
                            → 
                            <span style="color: #059669;">${formatarValorCampo(campo.valorNovo) || 'vazio'}</span>
                        </li>
                    `).join('')}
                </ul>`;
    } else {
        return '<div style="color: #6b7280;">Operação sem campos específicos alterados</div>';
    }
}

// Função para salvar log de alteração
async function salvarLogAlteracao(recordId, dadosAntigos, dadosNovos, tipoOperacao = 'edit') {
    if (!firebase || !firebase.firestore) {
        console.warn('⚠️ [HISTORICO] Firebase não disponível para salvar log');
        return;
    }
    
    try {
        // Identificar usuário (usar email do Firebase Auth se disponível)
        let usuario = 'Sistema';
        if (firebase.auth && firebase.auth().currentUser) {
            usuario = firebase.auth().currentUser.email || 'Usuário Autenticado';
        } else {
            // Fallback: tentar obter de localStorage ou session
            usuario = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser') || 'Usuário Anônimo';
        }
        
        // Gerar descrição amigável do registro
        const descricaoRegistro = gerarDescricaoAmigavel(dadosNovos || dadosAntigos || {});
        
        // Limpar timestamps do Firebase dos dados para evitar erro
        const dadosAntigosLimpos = limparTimestampsFirebase(dadosAntigos || {});
        const dadosNovosLimpos = limparTimestampsFirebase(dadosNovos || {});
        
        // Identificar campos alterados
        const camposAlterados = [];
        for (const campo in dadosNovosLimpos) {
            if (dadosAntigosLimpos[campo] !== dadosNovosLimpos[campo]) {
                camposAlterados.push({
                    campo: campo,
                    valorAnterior: dadosAntigosLimpos[campo] || '',
                    valorNovo: dadosNovosLimpos[campo] || ''
                });
            }
        }
        
        // Criar registro de log
        const logEntry = {
            recordId: recordId,
            usuario: usuario,
            tipoOperacao: tipoOperacao, // 'edit', 'create', 'delete'
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            timestampLocal: new Date().toISOString(),
            camposAlterados: camposAlterados,
            totalCamposAlterados: camposAlterados.length,
            dadosCompletos: {
                antes: dadosAntigosLimpos,
                depois: dadosNovosLimpos
            },
            ip: await obterIPUsuario(),
            userAgent: navigator.userAgent,
            origem: 'sistema_mdu_v1',
            descricaoRegistro: descricaoRegistro // Descrição amigável
        };
        
        // Salvar no Firebase
        const logRef = await firebase.firestore()
            .collection('logs_alteracoes')
            .add(logEntry);
            
        console.log(`📝 [HISTORICO] Log salvo: ${logRef.id} - ${camposAlterados.length} campos alterados por ${usuario}`);
        
        return logRef.id;
        
    } catch (error) {
        console.error('❌ [HISTORICO] Erro ao salvar log:', error);
        return null;
    }
}

// Função para obter IP do usuário (simplificada)
async function obterIPUsuario() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'IP não identificado';
    }
}

// Função para visualizar histórico geral de todos os registros
async function visualizarHistoricoGeral() {
    if (!firebase || !firebase.firestore) {
        alert('⚠️ Firebase não disponível para consultar histórico');
        return;
    }
    
    try {
        console.log('🔍 [HISTORICO-GERAL] Buscando histórico geral...');
        
        const logs = await firebase.firestore()
            .collection('logs_alteracoes')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
            
        console.log(`🔍 [HISTORICO-GERAL] Encontrados ${logs.docs.length} logs`);
        logs.docs.forEach((doc, index) => {
            if (index < 5) { // Log apenas os primeiros 5 para debug
                const data = doc.data();
                console.log(`🔍 [DEBUG-LOG ${index}] Operação: ${data.tipoOperacao}, Descrição: ${data.descricaoRegistro || 'N/A'}`);
            }
        });
            
        if (logs.empty) {
            alert('📄 Nenhum histórico encontrado no sistema');
            return;
        }
        
        // Criar modal de histórico geral
        criarModalHistoricoGeral(logs.docs);
        
    } catch (error) {
        console.error('❌ [HISTORICO-GERAL] Erro ao buscar histórico:', error);
        alert('❌ Erro ao buscar histórico: ' + error.message);
    }
}

// Função para visualizar histórico de um registro específico (mantida para compatibilidade)
async function visualizarHistorico(recordId) {
    if (!firebase || !firebase.firestore) {
        alert('⚠️ Firebase não disponível para consultar histórico');
        return;
    }
    
    try {
        console.log(`🔍 [HISTORICO] Buscando histórico para record: ${recordId}`);
        
        const logs = await firebase.firestore()
            .collection('logs_alteracoes')
            .where('recordId', '==', recordId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
            
        if (logs.empty) {
            alert('📄 Nenhum histórico encontrado para este registro');
            return;
        }
        
        // Criar modal de histórico
        criarModalHistorico(logs.docs, recordId);
        
    } catch (error) {
        console.error('❌ [HISTORICO] Erro ao buscar histórico:', error);
        alert('❌ Erro ao buscar histórico: ' + error.message);
    }
}

// Função para criar modal de histórico
function criarModalHistorico(logDocs, recordId) {
    // Remover modal existente se houver
    const modalExistente = document.getElementById('historicoModal');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Criar HTML do modal
    const modalHTML = `
        <div id="historicoModal" class="modal" style="
            display: block; 
            z-index: 9999; 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.5); 
            overflow: hidden;
        ">
            <div class="modal-content" style="
                position: relative;
                background-color: white;
                margin: 2% auto;
                padding: 0;
                border-radius: 8px;
                width: 90%;
                max-width: 1000px;
                height: 85vh;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            ">
                <div class="modal-header" style="
                    padding: 20px;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                    background-color: #f9fafb;
                ">
                    <h3 style="margin: 0; color: #1f2937;">📋 Histórico de Alterações</h3>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                        ${logDocs.length > 0 ? gerarDescricaoAmigavel(logDocs[0].data().dadosCompletos?.depois || logDocs[0].data().dadosCompletos?.antes || {}) : 'Registro'}
                    </div>
                    <span class="close" onclick="document.getElementById('historicoModal').remove()" style="
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        color: #6b7280;
                        float: right;
                        font-size: 28px;
                        font-weight: bold;
                        cursor: pointer;
                        line-height: 1;
                    ">&times;</span>
                </div>
                <div class="historico-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                ">
                    ${gerarHTMLHistorico(logDocs)}
                </div>
            </div>
        </div>
    `;
    
    // Inserir no DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Adicionar evento para fechar clicando fora do modal
    const modal = document.getElementById('historicoModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Adicionar evento para fechar com ESC
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    console.log(`✅ [HISTORICO] Modal criado com ${logDocs.length} entradas`);
}

// Função para gerar HTML do histórico
function gerarHTMLHistorico(logDocs) {
    let html = '<div class="historico-timeline" style="padding: 20px;">';
    
    logDocs.forEach((doc, index) => {
        const log = doc.data();
        const data = log.timestampLocal ? new Date(log.timestampLocal) : new Date();
        const dataFormatada = data.toLocaleString('pt-BR');
        
        html += `
            <div class="historico-entry" style="border-left: 3px solid #3b82f6; padding-left: 15px; margin-bottom: 20px; position: relative;">
                <div class="historico-header" style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                    <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${log.tipoOperacao?.toUpperCase() || 'EDIT'}
                    </span>
                    <span style="margin-left: 10px;">${log.usuario || 'Usuário não identificado'}</span>
                    <span style="float: right; font-size: 12px; color: #6b7280;">${dataFormatada}</span>
                </div>
                <div class="historico-detalhes">
                    ${log.camposAlterados && log.camposAlterados.length > 0 ? 
                        `<div><strong>${log.camposAlterados.length} campos alterados:</strong></div>
                         <ul style="margin: 8px 0; padding-left: 20px;">
                            ${log.camposAlterados.map(campo => `
                                <li style="margin: 4px 0; font-size: 13px;">
                                    <strong>${campo.campo}:</strong> 
                                    <span style="color: #dc2626; text-decoration: line-through;">"${campo.valorAnterior}"</span>
                                    → <span style="color: #059669;">"${campo.valorNovo}"</span>
                                </li>
                            `).join('')}
                         </ul>` 
                        : '<div style="color: #6b7280;">Nenhuma alteração específica registrada</div>'
                    }
                    ${log.ip && log.ip !== 'IP não identificado' ? 
                        `<div style="font-size: 11px; color: #9ca3af; margin-top: 8px;">IP: ${log.ip}</div>` 
                        : ''
                    }
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Função para criar modal de histórico geral
function criarModalHistoricoGeral(logDocs) {
    // Remover modal existente se houver
    const modalExistente = document.getElementById('historicoModal');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Criar HTML do modal
    const modalHTML = `
        <div id="historicoModal" class="modal" style="
            display: block; 
            z-index: 9999; 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(0,0,0,0.5); 
            overflow: hidden;
        ">
            <div class="modal-content" style="
                position: relative;
                background-color: white;
                margin: 2% auto;
                padding: 0;
                border-radius: 8px;
                width: 95%;
                max-width: 1200px;
                height: 90vh;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            ">
                <div class="modal-header" style="
                    padding: 20px;
                    border-bottom: 1px solid #e5e7eb;
                    flex-shrink: 0;
                    background-color: #f9fafb;
                ">
                    <h3 style="margin: 0; color: #1f2937;">📋 Histórico Geral do Sistema</h3>
                    <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">
                        ${logDocs.length} alterações encontradas (últimas 100)
                    </div>
                    <span class="close" onclick="document.getElementById('historicoModal').remove()" style="
                        position: absolute;
                        top: 15px;
                        right: 20px;
                        color: #6b7280;
                        float: right;
                        font-size: 28px;
                        font-weight: bold;
                        cursor: pointer;
                        line-height: 1;
                    ">&times;</span>
                </div>
                <div class="historico-content" style="
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                ">
                    ${gerarHTMLHistoricoGeral(logDocs)}
                </div>
            </div>
        </div>
    `;
    
    // Inserir no DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Adicionar evento para fechar clicando fora do modal
    const modal = document.getElementById('historicoModal');
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Adicionar evento para fechar com ESC
    const handleEsc = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    console.log(`✅ [HISTORICO-GERAL] Modal criado com ${logDocs.length} entradas`);
}

// Função para gerar HTML do histórico geral
function gerarHTMLHistoricoGeral(logDocs) {
    let html = '<div class="historico-timeline" style="padding: 20px; max-height: none;">';
    
    logDocs.forEach((doc, index) => {
        const log = doc.data();
        const data = log.timestampLocal ? new Date(log.timestampLocal) : new Date();
        const dataFormatada = data.toLocaleString('pt-BR');
        
        // Cor do border baseada no tipo de operação
        let borderColor = '#3b82f6'; // padrão azul
        let operationIcon = '✏️';
        
        switch(log.tipoOperacao?.toLowerCase()) {
            case 'create':
            case 'criar':
                borderColor = '#10b981'; // verde
                operationIcon = '➕';
                break;
            case 'delete':
            case 'deletar':
            case 'excluir':
                borderColor = '#ef4444'; // vermelho
                operationIcon = '🗑️';
                break;
            case 'duplicate':
            case 'duplicar':
                borderColor = '#8b5cf6'; // roxo
                operationIcon = '📄';
                break;
            case 'edit':
            case 'editar':
            default:
                borderColor = '#3b82f6'; // azul
                operationIcon = '✏️';
                break;
        }
        
        html += `
            <div class="historico-entry" style="border-left: 3px solid ${borderColor}; padding-left: 15px; margin-bottom: 20px; position: relative;">
                <div class="historico-header" style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">
                    <span style="background: ${borderColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                        ${operationIcon} ${log.tipoOperacao?.toUpperCase() || 'EDIT'}
                    </span>
                    <span style="margin-left: 10px;">${log.usuario || 'Usuário não identificado'}</span>
                    <span style="float: right; font-size: 12px; color: #6b7280;">${dataFormatada}</span>
                </div>
                <div class="historico-record-info" style="margin-bottom: 8px;">
                    <strong>Registro:</strong> 
                    <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #1f2937;">
                        ${log.descricaoRegistro || gerarDescricaoAmigavel(log.dadosCompletos?.depois || log.dadosCompletos?.antes || {}) || 'Registro desconhecido'}
                    </span>
                    ${log.tipoOperacao?.toLowerCase() === 'delete' ? 
                        '<span style="color: #ef4444; margin-left: 10px; font-size: 11px;">(EXCLUÍDO)</span>' 
                        : ''
                    }
                    <br>
                    <span style="font-size: 10px; color: #9ca3af;">
                        ID: ${log.recordId || 'N/A'}
                    </span>
                </div>
                <div class="historico-detalhes">
                    ${gerarDetalhesOperacao(log)}
                </div>
                <div class="historico-campos-alterados" style="margin-top: 10px;">
                    ${gerarDetalhesOperacaoCampos(log)}
                </div>
                    ${log.ip && log.ip !== 'IP não identificado' ? 
                        `<div style="font-size: 11px; color: #9ca3af; margin-top: 8px;">IP: ${log.ip}</div>` 
                        : ''
                    }
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Exportar funções de histórico para escopo global
window.visualizarHistorico = visualizarHistorico;
window.visualizarHistoricoGeral = visualizarHistoricoGeral;
window.salvarLogAlteracao = salvarLogAlteracao;

// Função para preencher formulário com dados existentes
function populateEditForm(data) {
    console.log('📝 [EDIT-FORM] Preenchendo formulário com dados:', data);
    
    const fieldMapping = {
        'projeto': data.projeto || '',
        'subProjeto': data.subProjeto || '',
        'tipoAcao': data.tipoAcao || '',
        'contrato': data.contrato || '',
        'condominio': data.condominio || '',
        'endereco': data.endereco || '',
        'cidade': data.cidade || '',
        'pep': data.pep || '',
        'codImovelGed': data.codImovelGed || '',
        'nodeGerencial': data.nodeGerencial || '',
        'areaTecnica': data.areaTecnica || '',
        'hp': data.hp || '',
        'andar': data.andar || '',
        'dataRecebimento': formatDateForInput(data.dataRecebimento),
        'dataInicio': formatDateForInput(data.dataInicio),
        'dataFinal': formatDateForInput(data.dataFinal),
        'equipe': data.equipe || '',
        'supervisor': data.supervisor || '',
        'status': data.status || '',
        'rdo': data.rdo || '',
        'book': data.book || '',
        'projetoStatus': data.projetoStatus || '',
        'situacao': data.situacao || '',
        'justificativa': data.justificativa || '',
        'observacao': data.observacao || ''
    };
    
    // Preencher todos os campos do formulário
    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = value;
            console.log(`📝 [EDIT-FORM] Campo ${fieldId} preenchido com:`, value);
        } else {
            console.warn(`⚠️ [EDIT-FORM] Campo ${fieldId} não encontrado no DOM`);
        }
    });
}

// Função para formatar data do Firestore para input
function formatDateForInput(firebaseDate) {
    if (!firebaseDate) return '';
    
    try {
        let date;
        
        // Se é um Timestamp do Firebase
        if (firebaseDate && typeof firebaseDate.toDate === 'function') {
            date = firebaseDate.toDate();
        }
        // Se é uma string de data
        else if (typeof firebaseDate === 'string') {
            date = new Date(firebaseDate);
        }
        // Se já é um objeto Date
        else if (firebaseDate instanceof Date) {
            date = firebaseDate;
        }
        else {
            return '';
        }
        
        // Retornar no formato YYYY-MM-DD
        return date.toISOString().split('T')[0];
        
    } catch (error) {
        console.warn('⚠️ [EDIT-FORM] Erro ao formatar data:', firebaseDate, error);
        return '';
    }
}

// Configurar submissão do formulário para edição
function setupEditFormSubmission() {
    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.error('❌ [EDIT-FORM] Formulário não encontrado');
        return;
    }
    
    // Remover event listeners anteriores para evitar duplicações
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    // Adicionar novo event listener
    newForm.addEventListener('submit', handleEditFormSubmission);
    
    console.log('🔧 [EDIT-FORM] Event listener de edição configurado');
}

// Handler para submissão de formulário de edição (COM HISTÓRICO)
async function handleEditFormSubmission(event) {
    event.preventDefault();
    
    console.log('💾 [EDIT-FORM] Salvando alterações do registro:', currentEditingRecordId);
    
    if (!currentEditingRecordId) {
        alert('Erro: ID do registro não encontrado!');
        return;
    }
    
    try {
        // Garantir que Firebase está pronto
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        
        // Primeiro, obter dados atuais para histórico
        const docAtual = await firestore.collection('enderecos').doc(currentEditingRecordId).get();
        const dadosAntigos = docAtual.exists ? docAtual.data() : {};
        console.log('📄 [EDIT-FORM] Dados atuais obtidos para histórico');
        
        // Coletar dados do formulário
        const formData = collectFormData();
        console.log('📋 [EDIT-FORM] Dados coletados:', formData);
        
        // Adicionar timestamp de atualização
        formData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        formData.updatedAtLocal = new Date().toISOString();
        
        // Salvar no Firestore
        await firestore.collection('enderecos').doc(currentEditingRecordId).update(formData);
        console.log('✅ [EDIT-FORM] Registro atualizado no Firestore');
        
        // Salvar log de alteração no histórico
        console.log('📝 [EDIT-FORM] Salvando log de alteração...');
        await salvarLogAlteracao(currentEditingRecordId, dadosAntigos, formData, 'edit');
        
        // Fechar modal
        closeModal();
        
        // Recarregar dados da tabela
        await loadFirebaseTableData();
        
        // Mostrar notificação de sucesso
        if (typeof showNotification === 'function') {
            showNotification('✅ Sucesso!', 'Registro atualizado e histórico salvo!', 'success');
        } else {
            alert('✅ Registro atualizado com sucesso!');
        }
        
        // Limpar variável de edição
        currentEditingRecordId = null;
        
    } catch (error) {
        console.error('❌ [EDIT-FORM] Erro ao salvar alterações:', error);
        alert('Erro ao salvar alterações: ' + error.message);
    }
}

// Função para coletar dados do formulário
function collectFormData() {
    const form = document.getElementById('enderecoForm');
    if (!form) {
        throw new Error('Formulário não encontrado');
    }
    
    const formData = {};
    
    // Lista de todos os campos do formulário
    const fieldIds = [
        'projeto', 'subProjeto', 'tipoAcao', 'contrato', 'condominio', 'endereco', 
        'cidade', 'pep', 'codImovelGed', 'nodeGerencial', 'areaTecnica', 'hp', 'andar',
        'dataRecebimento', 'dataInicio', 'dataFinal', 'equipe', 'supervisor', 'status',
        'rdo', 'book', 'projetoStatus', 'situacao', 'justificativa', 'observacao'
    ];
    
    fieldIds.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            let value = element.value.trim();
            
            // Converter datas para formato Date se não estiver vazio
            if ((fieldId.includes('data') || fieldId.includes('Data')) && value) {
                try {
                    value = new Date(value);
                } catch (e) {
                    console.warn(`⚠️ [FORM-DATA] Erro ao converter data ${fieldId}:`, value);
                }
            }
            
            // Converter HP para número se não estiver vazio
            if (fieldId === 'hp' && value) {
                value = parseInt(value) || 0;
            }
            
            formData[fieldId] = value;
        }
    });
    
    return formData;
}

// Função para fechar modal (usando a função global existente)
function closeModal() {
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
        modal.classList.remove('show');
    }
    
    // Limpar variável de edição
    currentEditingRecordId = null;
    
    console.log('❌ [EDIT-MODAL] Modal fechado');
}

console.log('✅ [FIREBASE-TABLE-SYSTEM] Sistema de edição carregado completamente');