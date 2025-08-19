// ============= SISTEMA DE UPLOAD EXCEL DINÂMICO =============
console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Inicializando sistema de upload Excel dinâmico...');

// ============= CONFIGURAÇÕES =============
let currentUploadedData = null;
let dynamicTableColumns = [];
let isTableDynamic = false;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    setupDynamicExcelUpload();
    // Carregar dados existentes do Firestore ao carregar a página
    loadExistingDataOnPageLoad();
});

function setupDynamicExcelUpload() {
    console.log('🔧 [DYNAMIC-EXCEL-UPLOAD] Configurando upload dinâmico...');
    
    const fileInput = document.getElementById('excelUpload');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleExcelFileSelection);
        console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Sistema configurado');
    } else {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Input file não encontrado');
    }
}

async function loadExistingDataOnPageLoad() {
    console.log('🚀 [DYNAMIC-EXCEL-UPLOAD] Carregando dados existentes do Firestore...');
    
    try {
        // Aguardar o sistema principal carregar primeiro
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Verificar se estamos na página correta (seção de endereços)
        const enderecosSection = document.getElementById('enderecos');
        if (!enderecosSection) {
            console.log('📍 [DYNAMIC-EXCEL-UPLOAD] Não estamos na seção de endereços, pulando carregamento');
            return;
        }
        
        // Verificar se o sistema principal já carregou dados
        const tbody = document.getElementById('enderecosTableBody');
        if (tbody && tbody.children.length > 0) {
            console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Sistema principal já carregou dados, não interferindo');
            return;
        }
        
        // Se não há dados, tentar carregar com nosso sistema
        console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Sistema principal não carregou dados, carregando...');
        await reloadTableFromFirestore();
        
    } catch (error) {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao carregar dados na inicialização:', error);
        
        // Tentar novamente após mais tempo só se não houver dados
        setTimeout(async () => {
            try {
                const tbody = document.getElementById('enderecosTableBody');
                if (!tbody || tbody.children.length === 0) {
                    console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Tentativa de carregamento tardio...');
                    await reloadTableFromFirestore();
                }
            } catch (retryError) {
                console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro na tentativa tardia:', retryError);
            }
        }, 8000);
    }
}

// ============= HANDLERS =============
async function handleExcelFileSelection(event) {
    const file = event.target.files[0];
    
    if (!file) {
        console.log('🚫 [DYNAMIC-EXCEL-UPLOAD] Nenhum arquivo selecionado');
        return;
    }
    
    try {
        console.log('📂 [DYNAMIC-EXCEL-UPLOAD] Arquivo selecionado:', file.name);
        
        // Validar tipo de arquivo
        if (!isValidExcelFile(file)) {
            showNotification('❌ Erro', 'Por favor, selecione apenas arquivos Excel (.xlsx ou .xls)', 'error');
            return;
        }
        
        showNotification('📊 Processando...', 'Lendo arquivo Excel, aguarde...', 'info');
        
        // Ler dados do Excel
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            throw new Error('Arquivo Excel está vazio ou não contém dados válidos');
        }
        
        console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Dados lidos:', data.length, 'linhas');
        
        // Armazenar dados
        currentUploadedData = data;
        
        // Adaptar tabela dinamicamente às colunas do Excel
        await adaptTableToExcelColumns(data);
        
        // Salvar dados no Firestore
        await saveDataToFirestore(data);
        
        // Recarregar tabela com dados do Firestore
        await reloadTableFromFirestore();
        
        // Mostrar sucesso
        showNotification('✅ Sucesso!', `Upload concluído! ${data.length} registros importados e tabela atualizada.`, 'success');
        
    } catch (error) {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro detalhado:', error);
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Stack:', error.stack);
        
        let errorMsg = 'Erro desconhecido';
        if (error && error.message) {
            errorMsg = error.message;
        } else if (typeof error === 'string') {
            errorMsg = error;
        }
        
        console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Mensagem do erro:', errorMsg);
        showNotification('❌ Erro', 'Erro no upload: ' + errorMsg, 'error');
    } finally {
        // Limpar input file
        event.target.value = '';
    }
}

// ============= VALIDAÇÃO =============
function isValidExcelFile(file) {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
}

// ============= LEITURA DE ARQUIVO EXCEL =============
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Pegar a primeira planilha
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Planilha lida:', jsonData.length, 'linhas');
                resolve(jsonData);
                
            } catch (error) {
                console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao ler Excel:', error);
                reject(new Error('Não foi possível ler o arquivo Excel'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// ============= ADAPTAÇÃO DINÂMICA DA TABELA =============
async function adaptTableToExcelColumns(data) {
    console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Adaptando tabela às colunas do Excel...');
    
    if (!data || data.length === 0) {
        console.error('❌ Nenhum dado para processar');
        return;
    }
    
    // Extrair colunas do Excel
    const excelColumns = Object.keys(data[0]);
    console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Colunas encontradas:', excelColumns);
    
    // Atualizar cabeçalho da tabela
    updateTableHeader(excelColumns);
    
    // Atualizar corpo da tabela
    updateTableBody(data, excelColumns);
    
    // Marcar tabela como dinâmica
    isTableDynamic = true;
    dynamicTableColumns = excelColumns;
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Tabela atualizada dinamicamente');
}

function updateTableHeader(columns) {
    const table = document.getElementById('enderecosTable');
    const thead = table.querySelector('thead tr');
    
    if (!thead) {
        console.error('❌ Cabeçalho da tabela não encontrado');
        return;
    }
    
    // Limpar cabeçalho atual
    thead.innerHTML = '';
    
    // Adicionar colunas do Excel + coluna de ações
    columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        thead.appendChild(th);
    });
    
    // Adicionar coluna de ações
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Ações';
    actionsHeader.style.width = '120px';
    thead.appendChild(actionsHeader);
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Cabeçalho da tabela atualizado');
}

function updateTableBody(data, columns) {
    const tbody = document.getElementById('enderecosTableBody');
    
    if (!tbody) {
        console.error('❌ Corpo da tabela não encontrado');
        return;
    }
    
    // Limpar corpo atual
    tbody.innerHTML = '';
    
    // Adicionar dados do Excel
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        
        // Adicionar células para cada coluna
        columns.forEach(column => {
            const td = document.createElement('td');
            const value = row[column];
            
            // Formatação especial para diferentes tipos de dados
            if (value !== null && value !== undefined) {
                if (typeof value === 'number') {
                    td.textContent = value.toString();
                } else if (typeof value === 'string') {
                    td.textContent = value;
                } else {
                    td.textContent = value.toString();
                }
            } else {
                td.textContent = '';
            }
            
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações
        const actionsTd = document.createElement('td');
        actionsTd.innerHTML = `
            <button class="btn-edit-small" onclick="editDynamicRecord(${index})" title="Editar">
                ✏️
            </button>
            <button class="btn-delete-small" onclick="deleteDynamicRecord(${index})" title="Excluir">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Corpo da tabela atualizado com', data.length, 'registros');
}

// ============= SALVAMENTO NO FIRESTORE =============
async function saveDataToFirestore(data) {
    console.log('💾 [DYNAMIC-EXCEL-UPLOAD] Salvando dados no Firestore...');
    
    // Verificar se Firebase está disponível
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase não está carregado');
    }
    
    if (!firebase.firestore) {
        throw new Error('Firestore não está disponível');
    }
    
    // Aguardar o Firebase estar pronto
    await waitForFirebase();
    
    // Obter usuário atual - REQUER USUÁRIO JÁ AUTENTICADO
    let user = getCurrentUser();
    if (!user) {
        throw new Error('Usuário precisa estar logado para usar o sistema. Por favor, faça login primeiro.');
    }
    
    // Verificar se não é usuário anônimo
    if (user.isAnonymous) {
        throw new Error('Sistema requer usuário cadastrado. Login anônimo não é permitido.');
    }
    
    console.log('👤 [DYNAMIC-EXCEL-UPLOAD] Usuário autenticado:', user.uid);
    
    const batch = firebase.firestore().batch();
    const collection = firebase.firestore().collection('enderecos');
    let savedCount = 0;
    
    for (const row of data) {
        try {
            // Preparar dados preservando estrutura original do Excel
            const documentData = {
                // Preservar todos os campos do Excel
                ...row,
                
                // Adicionar metadados
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
                source: 'excel_dinamico',
                originalColumns: Object.keys(row)
            };
            
            // Salvar apenas se tiver pelo menos uma coluna com dados
            const hasData = Object.values(row).some(value => 
                value !== null && value !== undefined && value !== ''
            );
            
            if (hasData) {
                const docRef = collection.doc();
                batch.set(docRef, documentData);
                savedCount++;
            }
            
        } catch (error) {
            console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro na linha:', row, error);
        }
    }
    
    // Executar batch
    if (savedCount > 0) {
        await batch.commit();
        console.log(`✅ [DYNAMIC-EXCEL-UPLOAD] ${savedCount} registros salvos no Firestore`);
    }
    
    return savedCount;
}

// ============= FUNÇÕES DE MANIPULAÇÃO DE REGISTROS =============
window.editDynamicRecord = function(index) {
    console.log('✏️ [DYNAMIC-EXCEL-UPLOAD] Editando registro:', index);
    
    if (!currentUploadedData || !currentUploadedData[index]) {
        console.error('❌ Registro não encontrado');
        return;
    }
    
    const record = currentUploadedData[index];
    
    // Criar modal dinâmico para edição
    createDynamicEditModal(record, index);
};

window.deleteDynamicRecord = async function(index) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) {
        return;
    }
    
    try {
        console.log('🗑️ [DYNAMIC-EXCEL-UPLOAD] Excluindo registro:', index);
        
        // Remover da lista local
        if (currentUploadedData && currentUploadedData[index]) {
            currentUploadedData.splice(index, 1);
            
            // Atualizar tabela
            updateTableBody(currentUploadedData, dynamicTableColumns);
            
            showNotification('✅ Sucesso!', 'Registro excluído com sucesso!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Erro ao excluir registro:', error);
        showNotification('❌ Erro', 'Erro ao excluir registro: ' + error.message, 'error');
    }
};

function createDynamicEditModal(record, index) {
    // Criar modal dinâmico baseado nas colunas do registro
    const modalHTML = `
        <div id="dynamicEditModal" class="modal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✏️ Editar Registro</h3>
                    <span class="close" onclick="closeDynamicEditModal()">&times;</span>
                </div>
                <form id="dynamicEditForm" class="modal-form">
                    <div class="form-grid">
                        ${Object.keys(record).map(column => `
                            <div class="form-group">
                                <label for="edit_${column}">${column}</label>
                                <input type="text" 
                                       id="edit_${column}" 
                                       name="${column}" 
                                       value="${record[column] || ''}"
                                       placeholder="${column}">
                            </div>
                        `).join('')}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" onclick="closeDynamicEditModal()">
                            Cancelar
                        </button>
                        <button type="button" class="btn-primary" onclick="saveDynamicEdit(${index})">
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Adicionar modal ao DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeDynamicEditModal = function() {
    const modal = document.getElementById('dynamicEditModal');
    if (modal) {
        modal.remove();
    }
};

window.saveDynamicEdit = function(index) {
    try {
        const form = document.getElementById('dynamicEditForm');
        const formData = new FormData(form);
        
        // Atualizar dados
        const updatedRecord = {};
        for (let [key, value] of formData.entries()) {
            updatedRecord[key] = value;
        }
        
        // Atualizar na lista local
        currentUploadedData[index] = updatedRecord;
        
        // Atualizar tabela
        updateTableBody(currentUploadedData, dynamicTableColumns);
        
        // Fechar modal
        closeDynamicEditModal();
        
        showNotification('✅ Sucesso!', 'Registro atualizado com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao salvar edição:', error);
        showNotification('❌ Erro', 'Erro ao salvar: ' + error.message, 'error');
    }
};

// ============= RECARREGAR TABELA DO FIRESTORE =============
async function reloadTableFromFirestore() {
    console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Recarregando tabela do Firestore...');
    
    try {
        // Aguardar Firebase estar pronto
        await waitForFirebase();
        
        // Carregar dados diretamente do Firestore
        const enderecos = await loadDirectFromFirestore();
        
        if (enderecos && enderecos.length > 0) {
            // Atualizar tabela com dados do Firestore
            updateTableWithFirestoreData(enderecos);
            console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Tabela recarregada com', enderecos.length, 'registros do Firestore');
        } else {
            console.warn('⚠️ [DYNAMIC-EXCEL-UPLOAD] Nenhum dado encontrado no Firestore');
        }
        
        // Tentar também a função existente do sistema como fallback
        if (window.loadEnderecosTable && typeof window.loadEnderecosTable === 'function') {
            await window.loadEnderecosTable();
            console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Também chamou loadEnderecosTable');
        }
        
    } catch (error) {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao recarregar tabela:', error);
        
        // Tentar fallback
        try {
            if (window.FirestoreIntegration && typeof window.FirestoreIntegration.loadEnderecos === 'function') {
                const enderecos = await window.FirestoreIntegration.loadEnderecos();
                updateTableWithFirestoreData(enderecos);
                console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Fallback: recarregado com FirestoreIntegration');
            }
        } catch (fallbackError) {
            console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro no fallback:', fallbackError);
        }
    }
}

async function loadDirectFromFirestore() {
    console.log('📥 [DYNAMIC-EXCEL-UPLOAD] Carregando dados diretamente do Firestore...');
    
    try {
        const snapshot = await firebase.firestore().collection('enderecos').get();
        const enderecos = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            enderecos.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Carregados', enderecos.length, 'registros do Firestore');
        return enderecos;
        
    } catch (error) {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao carregar do Firestore:', error);
        throw error;
    }
}

function updateTableWithFirestoreData(enderecos) {
    console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Atualizando tabela com dados do Firestore...', enderecos.length, 'registros');
    
    const tbody = document.getElementById('enderecosTableBody');
    const table = document.getElementById('enderecosTable');
    
    if (!tbody || !table || !enderecos || enderecos.length === 0) {
        console.warn('⚠️ [DYNAMIC-EXCEL-UPLOAD] Elementos da tabela não encontrados ou sem dados');
        return;
    }
    
    // Determinar colunas baseadas no primeiro registro (filtrar campos internos)
    const firstRecord = enderecos[0];
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'source', 'originalColumns'];
    const columns = Object.keys(firstRecord).filter(key => 
        !excludeFields.includes(key) && 
        firstRecord[key] !== undefined &&
        firstRecord[key] !== null &&
        firstRecord[key] !== ''
    );
    
    console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Colunas detectadas:', columns);
    
    // Atualizar cabeçalho da tabela
    const thead = table.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = '';
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            th.style.padding = '12px 8px';
            th.style.textAlign = 'left';
            thead.appendChild(th);
        });
        
        // Adicionar coluna de ações
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Ações';
        actionsHeader.style.width = '120px';
        actionsHeader.style.textAlign = 'center';
        thead.appendChild(actionsHeader);
    }
    
    // Atualizar corpo da tabela
    tbody.innerHTML = '';
    
    enderecos.forEach((endereco, index) => {
        const tr = document.createElement('tr');
        
        // Adicionar células para cada coluna
        columns.forEach(column => {
            const td = document.createElement('td');
            const value = endereco[column];
            
            // Formatar valores baseado no tipo
            if (value !== undefined && value !== null) {
                if (typeof value === 'object' && value.seconds) {
                    // Campo de timestamp do Firestore
                    const date = new Date(value.seconds * 1000);
                    td.textContent = date.toLocaleDateString('pt-BR');
                } else if (typeof value === 'number') {
                    td.textContent = value.toString();
                } else {
                    td.textContent = value.toString();
                }
            } else {
                td.textContent = '';
            }
            
            td.style.padding = '8px';
            td.style.borderBottom = '1px solid #e0e0e0';
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações
        const actionsTd = document.createElement('td');
        actionsTd.style.textAlign = 'center';
        actionsTd.style.padding = '8px';
        actionsTd.innerHTML = `
            <button class="btn-edit-small" onclick="editFirestoreRecord('${endereco.id}')" title="Editar" 
                    style="margin-right: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                ✏️
            </button>
            <button class="btn-delete-small" onclick="deleteFirestoreRecord('${endereco.id}')" title="Excluir"
                    style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    // Armazenar dados e colunas para uso futuro
    currentUploadedData = enderecos;
    dynamicTableColumns = columns;
    isTableDynamic = true;
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Tabela atualizada com', enderecos.length, 'registros do Firestore');
}

// Funções para manipular registros do Firestore
window.editFirestoreRecord = function(id) {
    console.log('✏️ [DYNAMIC-EXCEL-UPLOAD] Editando registro Firestore:', id);
    // Usar a função existente do sistema
    if (window.editEndereco && typeof window.editEndereco === 'function') {
        window.editEndereco(id);
    }
};

window.deleteFirestoreRecord = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) {
        return;
    }
    
    try {
        // Usar a função existente do sistema
        if (window.deleteEndereco && typeof window.deleteEndereco === 'function') {
            await window.deleteEndereco(id);
        } else if (window.FirestoreIntegration && typeof window.FirestoreIntegration.deleteEndereco === 'function') {
            await window.FirestoreIntegration.deleteEndereco(id);
            await reloadTableFromFirestore();
            showNotification('✅ Sucesso!', 'Registro excluído com sucesso!', 'success');
        }
    } catch (error) {
        console.error('❌ Erro ao excluir registro:', error);
        showNotification('❌ Erro', 'Erro ao excluir registro: ' + error.message, 'error');
    }
};

// ============= FUNÇÕES UTILITÁRIAS =============
async function waitForFirebase() {
    console.log('⏳ [DYNAMIC-EXCEL-UPLOAD] Aguardando Firebase estar pronto...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        if (typeof firebase !== 'undefined' && firebase.firestore && firebase.auth) {
            console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Firebase está pronto');
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
    }
    
    throw new Error('Firebase não inicializou em tempo hábil');
}

function getCurrentUser() {
    // Priorizar FirebaseAuthIsolated se disponível
    if (window.FirebaseAuthIsolated && typeof window.FirebaseAuthIsolated.getCurrentUser === 'function') {
        const user = window.FirebaseAuthIsolated.getCurrentUser();
        if (user) {
            console.log('👤 [DYNAMIC-EXCEL-UPLOAD] Usuário obtido via FirebaseAuthIsolated:', user.uid);
            return user;
        }
    }
    
    // Fallback para Firebase padrão
    if (firebase && firebase.auth && firebase.auth().currentUser) {
        const user = firebase.auth().currentUser;
        console.log('👤 [DYNAMIC-EXCEL-UPLOAD] Usuário obtido via Firebase padrão:', user.uid);
        return user;
    }
    
    console.log('❌ [DYNAMIC-EXCEL-UPLOAD] Nenhum usuário autenticado encontrado');
    return null;
}

function showNotification(title, message, type) {
    if (window.showCustomNotification && typeof window.showCustomNotification === 'function') {
        window.showCustomNotification(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}

// ============= EXPOSIÇÃO GLOBAL =============
window.adaptTableToExcelColumns = adaptTableToExcelColumns;
window.currentUploadedData = currentUploadedData;
window.dynamicTableColumns = dynamicTableColumns;

console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Sistema dinâmico de upload Excel carregado');