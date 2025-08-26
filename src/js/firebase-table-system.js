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
    console.log('🔍 [FIREBASE-TABLE] Atualizando TODOS os filtros do dashboard...');
    
    try {
        await firebaseManager.ensureReady();
        const firestore = firebaseManager.getFirestore();
        const snapshot = await firestore.collection('enderecos').get();
        
        const allData = [];
        snapshot.forEach(doc => {
            allData.push(doc.data());
        });
        
        // Extrair valores únicos para TODOS os filtros
        const filterData = {
            projetos: getUniqueValues(allData, 'projeto'),
            subProjetos: getUniqueValues(allData, 'subProjeto'),
            cidades: getUniqueValues(allData, 'cidade'),
            equipes: getUniqueValues(allData, 'equipe'),
            supervisores: getUniqueValues(allData, 'supervisor'),
            status: getUniqueValues(allData, 'status'),
            condominios: getUniqueValues(allData, 'condominio'),
            tiposAcao: getUniqueValues(allData, 'tipoAcao')
        };
        
        // ===== ATUALIZAR FILTROS DA SEÇÃO INFRAESTRUTURA =====
        populateFilterSelect('infraFilterProjeto', filterData.projetos);
        populateFilterSelect('infraFilterSubProjeto', filterData.subProjetos);
        populateFilterSelect('infraFilterEquipe', filterData.equipes);
        populateFilterSelect('infraFilterStatus', filterData.status);
        populateFilterSelect('infraFilterCidade', filterData.cidades);
        populateFilterSelect('infraFilterSupervisor', filterData.supervisores);
        populateFilterSelect('infraFilterTipoAcao', filterData.tiposAcao);
        
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
        return filterData;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao atualizar filtros:', error);
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
        
        console.log('✅ [FIREBASE-TABLE] Filtros aplicados:', filters);
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro ao aplicar filtros:', error);
    }
}

function getSelectValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    
    const values = [];
    for (const option of select.selectedOptions) {
        if (option.value) {
            values.push(option.value);
        }
    }
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
    // Atualizar apenas cards que devem mudar com filtros
    updateStatCard('infraStatTotalRegistros', stats.totalRegistros);
    updateStatCard('infraStatEnderecosDistintos', stats.enderecosDistintos);
    updateStatCard('infraStatEquipesDistintas', stats.equipesDistintas);
    updateStatCard('infraStatProdutividade', `${stats.produtividade}%`);
    
    // Atualizar ranking
    updateEquipeStatusRanking(stats.topEquipes, stats.statusCounts);
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

// ============= ATUALIZAÇÃO COMPLETA DE GRÁFICOS DO DASHBOARD =============
// FUNÇÃO DESABILITADA - Os gráficos agora são gerenciados por dashboard-integration.js
async function updateDashboardCharts() {
    console.log('📈 [FIREBASE-TABLE] === INICIANDO ATUALIZAÇÃO DOS GRÁFICOS ===');
    console.log('📈 [FIREBASE-TABLE] Atualizando TODOS os gráficos do dashboard com layout azul...');
    
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
                console.log('✅ [FIREBASE-TABLE] Estatísticas atualizadas via hook');
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
                console.log('✅ [FIREBASE-TABLE] Estatísticas atualizadas via hook');
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
                await updateDashboardFilters();
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
                await updateDashboardFilters();
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