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
                if (user && !user.isAnonymous) { // Apenas usuários reais, não anônimos
                    clearTimeout(timeout);
                    unsubscribe();
                    this.currentUser = user;
                    console.log('✅ [FIREBASE-MANAGER] Usuário real autenticado:', user.uid);
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

        // Verificar se não é usuário anônimo
        if (this.currentUser.isAnonymous) {
            throw new Error('Sistema requer usuário cadastrado (não anônimo)');
        }

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
            
            // ATUALIZAR CARDS, FILTROS E GRÁFICOS DO DASHBOARD
            try {
                await updateDashboardCards();
                await updateDashboardFilters();
                await updateDashboardCharts();
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

// ============= ATUALIZAÇÃO DE CARDS DO DASHBOARD =============
async function updateDashboardCards() {
    console.log('🎯 [FIREBASE-TABLE] Atualizando cards do dashboard...');
    
    try {
        const stats = await getFirebaseTableStatistics();
        
        // Atualizar cards principais
        updateStatCard('statTotalRegistros', stats.totalRegistros);
        updateStatCard('statEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('statEquipesDistintas', stats.equipesDistintas);
        updateStatCard('statProdutividade', `${stats.produtividade}%`);
        
        // Também atualizar cards da infraestrutura se existirem
        updateStatCard('infraStatTotalRegistros', stats.totalRegistros);
        updateStatCard('infraStatEnderecosDistintos', stats.enderecosDistintos);
        updateStatCard('infraStatEquipesDistintas', stats.equipesDistintas);
        updateStatCard('infraStatProdutividade', `${stats.produtividade}%`);
        
        // Cards adicionais
        updateStatCard('statCondominios', stats.condominiosDistintos);
        updateStatCard('statCidades', stats.cidadesDistintas);
        updateStatCard('statSupervisores', stats.supervisoresDistintos);
        updateStatCard('statProjetos', stats.projetosDistintos);
        
        console.log('✅ [FIREBASE-TABLE] Cards do dashboard atualizados');
        return stats;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar cards:', error);
        return null;
    }
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

// ============= FILTROS DINÂMICOS =============
async function updateDashboardFilters() {
    console.log('🔍 [FIREBASE-TABLE] Atualizando filtros do dashboard...');
    
    try {
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        const snapshot = await firestore.collection('enderecos').get();
        
        const allData = [];
        snapshot.forEach(doc => {
            allData.push(doc.data());
        });
        
        // Extrair valores únicos para filtros
        const filterData = {
            projetos: getUniqueValues(allData, 'projeto'),
            cidades: getUniqueValues(allData, 'cidade'),
            equipes: getUniqueValues(allData, 'equipe'),
            supervisores: getUniqueValues(allData, 'supervisor'),
            status: getUniqueValues(allData, 'status'),
            condominios: getUniqueValues(allData, 'condominio')
        };
        
        // Atualizar selects de filtro
        populateFilterSelect('filterProjeto', filterData.projetos);
        populateFilterSelect('filterCidade', filterData.cidades);
        populateFilterSelect('filterEquipe', filterData.equipes);
        populateFilterSelect('filterSupervisor', filterData.supervisores);
        populateFilterSelect('filterStatus', filterData.status);
        populateFilterSelect('filterCondominio', filterData.condominios);
        
        console.log('✅ [FIREBASE-TABLE] Filtros atualizados');
        return filterData;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar filtros:', error);
        return null;
    }
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
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Preservar valor selecionado
    const currentValue = select.value;
    
    // Limpar e recriar options
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
}

// ============= ATUALIZAÇÃO DE GRÁFICOS DO DASHBOARD =============
async function updateDashboardCharts() {
    console.log('📈 [FIREBASE-TABLE] Atualizando gráficos do dashboard...');
    
    try {
        const stats = await getFirebaseTableStatistics();
        
        // Atualizar diferentes tipos de gráficos
        updateStatusChart(stats.statusCounts);
        updateMonthlyChart(stats.registrosPorMes);
        updateEquipesChart(stats.topEquipes);
        updateCidadesChart(stats.topCidades);
        
        console.log('✅ [FIREBASE-TABLE] Gráficos atualizados');
        return true;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar gráficos:', error);
        return false;
    }
}

function updateStatusChart(statusCounts) {
    // Procurar por canvas de gráfico de status
    const chartCanvas = document.getElementById('statusChart') || 
                       document.getElementById('pieChart') ||
                       document.getElementById('donutChart');
    
    if (!chartCanvas) {
        console.warn('⚠️ [FIREBASE-TABLE] Canvas de gráfico de status não encontrado');
        return;
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
        console.warn('⚠️ [FIREBASE-TABLE] Canvas de gráfico mensal não encontrado');
        return;
    }
    
    const ctx = chartCanvas.getContext('2d');
    
    // Ordenar por mês
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return `${monthNum}/${year}`;
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
        console.warn('⚠️ [FIREBASE-TABLE] Canvas de gráfico de equipes não encontrado');
        return;
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
        console.warn('⚠️ [FIREBASE-TABLE] Canvas de gráfico de cidades não encontrado');
        return;
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
                console.log('✅ [FIREBASE-TABLE] Estatísticas atualizadas via hook');
            } catch (error) {
                console.warn('⚠️ Fallback para carregamento original:', error);
                await originalLoadStats();
            }
        };
    }
}

// Executar integração quando o sistema carregar
setTimeout(integrateWithExistingSystems, 3000);

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

console.log('✅ [FIREBASE-TABLE] Sistema de tabela Firebase carregado');