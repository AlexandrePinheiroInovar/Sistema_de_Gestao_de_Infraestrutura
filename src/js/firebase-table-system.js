// ============= SISTEMA DE TABELA FIREBASE COMPLETAMENTE NOVO =============
console.log('🔥 [FIREBASE-TABLE] Inicializando sistema de tabela Firebase...');

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

        // Fazer login anônimo se necessário
        console.log('👤 [FIREBASE-MANAGER] Fazendo login anônimo...');
        try {
            const result = await this.auth.signInAnonymously();
            this.currentUser = result.user;
            console.log('✅ [FIREBASE-MANAGER] Login anônimo realizado:', this.currentUser.uid);
        } catch (error) {
            console.error('❌ [FIREBASE-MANAGER] Erro no login anônimo:', error);
            throw new Error('Falha na autenticação');
        }
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
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.isConnected()) {
            throw new Error('Firebase não está conectado');
        }

        return true;
    }
}

// Instância singleton
const firebaseManager = new FirebaseManager();

// ============= VARIÁVEIS GLOBAIS DA TABELA =============
let firebaseTableData = [];
let firebaseTableColumns = [];
let filterText = '';

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 [FIREBASE-TABLE] DOM carregado, configurando sistema...');
    initializeFirebaseTableSystem();
});

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
        
        // Buscar dados da collection 'enderecos'
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
        
        if (data.length > 0) {
            // Extrair colunas (excluir campos internos)
            extractTableColumns(data[0]);
            
            // Renderizar tabela
            renderFirebaseTable(data);
            
            // Atualizar estatísticas
            updateTableStats(data.length);
            
        } else {
            console.log('📋 [FIREBASE-TABLE] Nenhum dado encontrado');
            showNoDataMessage();
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
    
    const excludeFields = [
        'id', 'createdAt', 'updatedAt', 'createdBy', 
        'source', 'originalColumns'
    ];
    
    const allColumns = Object.keys(sampleData);
    firebaseTableColumns = allColumns.filter(column => {
        // Excluir campos internos
        if (excludeFields.includes(column)) return false;
        
        // Excluir campos vazios
        const value = sampleData[column];
        if (value === null || value === undefined || value === '') return false;
        
        return true;
    });
    
    console.log('📊 [FIREBASE-TABLE] Colunas detectadas:', firebaseTableColumns);
}

// ============= RENDERIZAR TABELA =============
function renderFirebaseTable(data) {
    console.log('🎨 [FIREBASE-TABLE] Renderizando tabela com', data.length, 'registros');
    
    const table = document.getElementById('firebaseTable');
    const thead = document.getElementById('firebaseTableHead');
    const tbody = document.getElementById('firebaseTableBody');
    const noDataMsg = document.getElementById('noDataMessage');
    
    if (!table || !thead || !tbody) {
        console.error('❌ [FIREBASE-TABLE] Elementos da tabela não encontrados');
        return;
    }
    
    // Esconder mensagem "sem dados"
    if (noDataMsg) noDataMsg.style.display = 'none';
    
    // Renderizar cabeçalho
    renderTableHeader(thead);
    
    // Renderizar corpo
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

function renderTableBody(tbody, data) {
    tbody.innerHTML = '';
    
    // Aplicar filtro se houver
    const filteredData = filterText ? 
        data.filter(row => {
            return firebaseTableColumns.some(column => {
                const value = row[column];
                return value && value.toString().toLowerCase().includes(filterText.toLowerCase());
            });
        }) : data;
    
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
        return;
    }
    
    filteredData.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Adicionar células de dados
        firebaseTableColumns.forEach(column => {
            const td = document.createElement('td');
            const value = row[column];
            
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
            } else {
                td.textContent = '-';
                td.style.opacity = '0.5';
            }
            
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações
        const actionsTd = document.createElement('td');
        actionsTd.style.textAlign = 'center';
        actionsTd.innerHTML = `
            <button onclick="editFirebaseTableRecord('${row.id}')" 
                    style="margin-right: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                    title="Editar registro">
                ✏️
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
}

// ============= FUNÇÕES DE AÇÃO =============
window.editFirebaseTableRecord = function(id) {
    console.log('✏️ [FIREBASE-TABLE] Editando registro:', id);
    // TODO: Implementar edição
    alert('Funcionalidade de edição em desenvolvimento');
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
        
        await firestore.collection('enderecos').doc(id).delete();
        
        // Recarregar dados
        await loadFirebaseTableData();
        
        console.log('✅ [FIREBASE-TABLE] Registro excluído com sucesso');
        showNotification('✅ Sucesso!', 'Registro excluído com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao excluir:', error);
        showNotification('❌ Erro', 'Erro ao excluir registro: ' + error.message, 'error');
    }
};

// ============= FILTROS E BUSCA =============
window.filterDynamicTable = function() {
    const searchInput = document.getElementById('dynamicSearchInput');
    filterText = searchInput ? searchInput.value.trim() : '';
    
    console.log('🔍 [FIREBASE-TABLE] Aplicando filtro:', filterText);
    
    if (firebaseTableData.length > 0) {
        const tbody = document.getElementById('firebaseTableBody');
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
    const tbody = document.getElementById('firebaseTableBody');
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
    
    // Event listener para upload de Excel
    const excelUpload = document.getElementById('excelUpload');
    if (excelUpload) {
        excelUpload.addEventListener('change', handleExcelUpload);
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
        // Garantir que Firebase está pronto
        await firebaseManager.ensureReady();
        
        // Obter referências através do manager
        const firestore = firebaseManager.getFirestore();
        const user = firebaseManager.getCurrentUser();
        
        if (!user) {
            throw new Error('Usuário não autenticado');
        }
        
        // Criar batch operation
        const batch = firestore.batch();
        const collection = firestore.collection('enderecos');
        let savedCount = 0;
        
        for (const row of data) {
            try {
                // Preparar dados
                const documentData = {
                    ...row,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    updatedAt: firestore.FieldValue.serverTimestamp(),
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
            await batch.commit();
            console.log(`✅ [FIREBASE-TABLE] ${savedCount} registros salvos no Firebase`);
        }
        
        return savedCount;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao salvar no Firebase:', error);
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

// ============= EXPOSIÇÃO GLOBAL =============
window.FirebaseTableSystem = {
    loadData: loadFirebaseTableData,
    refreshData: refreshTableData,
    isConnected: () => firebaseManager.isConnected(),
    isInitialized: () => firebaseManager.isInitialized(),
    getData: () => firebaseTableData,
    getColumns: () => firebaseTableColumns,
    manager: firebaseManager
};

console.log('✅ [FIREBASE-TABLE] Sistema de tabela Firebase carregado');