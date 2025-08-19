// ============= SISTEMA DE UPLOAD EXCEL DINÂMICO =============
console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Inicializando sistema de upload Excel dinâmico...');

// ============= CONFIGURAÇÕES =============
let currentUploadedData = null;
let dynamicTableColumns = [];
let isTableDynamic = false;

// ============= CONFIGURAÇÕES DE PAGINAÇÃO =============
let currentPage = 1;
let recordsPerPage = 25; // Reduzido para economizar cota
let totalRecords = 0;
let allFirestoreData = [];

// ============= CONFIGURAÇÕES DE QUOTA =============
const BATCH_SIZE = 100; // Máximo de registros por upload
const MAX_DAILY_UPLOADS = 500; // Limite diário seguro

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
        
        // Verificar se o arquivo é muito grande
        if (data.length > BATCH_SIZE) {
            const proceed = confirm(`⚠️ Arquivo grande detectado!\n\nSeu arquivo tem ${data.length} registros.\nPara economizar cota do Firebase, vamos processar apenas os primeiros ${BATCH_SIZE} registros.\n\nDeseja continuar?`);
            
            if (!proceed) {
                showNotification('ℹ️ Cancelado', 'Upload cancelado pelo usuário.', 'info');
                return;
            }
            
            // Limitar dados para economizar cota
            data.splice(BATCH_SIZE);
            showNotification('⚠️ Aviso', `Processando apenas ${BATCH_SIZE} registros para economizar cota do Firebase.`, 'warning');
        }
        
        // Armazenar dados
        currentUploadedData = data;
        
        // Adaptar tabela dinamicamente às colunas do Excel
        await adaptTableToExcelColumns(data);
        
        // Salvar dados no Firestore com controle de quota
        await saveDataToFirestoreOptimized(data);
        
        // Recarregar apenas primeira página para economizar cota
        await reloadTableFromFirestore(1);
        
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
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                
                // Pegar a primeira planilha
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                if (!worksheet['!ref']) {
                    throw new Error('Planilha está vazia');
                }
                
                // Obter o range da planilha
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Range da planilha:', range);
                
                // ETAPA 1: Extrair TODOS os cabeçalhos da primeira linha (linha 0)
                const headers = [];
                const headerRow = range.s.r; // Primeira linha
                
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
                    const cell = worksheet[cellAddress];
                    
                    let headerValue = '';
                    if (cell && cell.v !== undefined && cell.v !== null) {
                        headerValue = String(cell.v).trim();
                    } else {
                        // Para colunas sem cabeçalho, criar um nome genérico
                        headerValue = `Coluna_${col + 1}`;
                    }
                    
                    headers.push(headerValue);
                }
                
                console.log('📋 [DYNAMIC-EXCEL-UPLOAD] Cabeçalhos extraídos (TODOS):', headers);
                console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Total de colunas:', headers.length);
                
                // ETAPA 2: Processar TODAS as linhas de dados (começando da linha 1)
                const jsonData = [];
                
                for (let row = headerRow + 1; row <= range.e.r; row++) {
                    const rowData = {};
                    let hasAnyData = false;
                    
                    // Para cada cabeçalho, buscar o valor correspondente
                    headers.forEach((header, colIndex) => {
                        const col = range.s.c + colIndex; // Coluna atual
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                        const cell = worksheet[cellAddress];
                        
                        let cellValue = '';
                        
                        if (cell && cell.v !== undefined && cell.v !== null) {
                            cellValue = cell.v;
                            hasAnyData = true;
                            
                            // Converter datas seriais do Excel
                            if (cell.t === 'n' && isExcelDate(cellValue)) {
                                cellValue = excelDateToJSDate(cellValue);
                                cellValue = cellValue.toLocaleDateString('pt-BR');
                            } else if (cell.t === 'd' || cellValue instanceof Date) {
                                cellValue = cellValue.toLocaleDateString('pt-BR');
                            } else if (typeof cellValue === 'string') {
                                cellValue = cellValue.trim();
                            } else if (typeof cellValue === 'number') {
                                cellValue = cellValue.toString();
                            } else {
                                cellValue = String(cellValue);
                            }
                        }
                        
                        // SEMPRE adicionar a coluna, mesmo se vazia
                        rowData[header] = cellValue;
                    });
                    
                    // Só adicionar linhas que tenham pelo menos um dado
                    if (hasAnyData) {
                        jsonData.push(rowData);
                    }
                }
                
                // Armazenar ordem original dos cabeçalhos
                jsonData._originalHeaders = headers;
                jsonData._totalColumns = headers.length;
                
                console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Processamento completo:');
                console.log(`   - ${jsonData.length} linhas de dados`);
                console.log(`   - ${headers.length} colunas`);
                console.log(`   - Ordem preservada: ${headers.join(', ')}`);
                
                resolve(jsonData);
                
            } catch (error) {
                console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao ler Excel:', error);
                reject(new Error(`Não foi possível ler o arquivo Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Função para verificar se um número é uma data serial do Excel
function isExcelDate(value) {
    // Datas do Excel são números entre 1 (1900-01-01) e ~50000 (2036)
    return typeof value === 'number' && value > 0 && value < 100000;
}

// Função para converter data serial do Excel para Date JavaScript
function excelDateToJSDate(serial) {
    // Excel conta dias desde 1900-01-01, mas tem um bug que considera 1900 ano bissexto
    // JavaScript Date conta desde 1970-01-01
    const excelEpoch = new Date(1900, 0, 1); // 1900-01-01
    const jsDate = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
    
    // Corrigir o bug do Excel de 1900 (ano não era bissexto)
    if (serial > 59) {
        jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return jsDate;
}

// Função para verificar se uma string é uma data no formato brasileiro
function isDateString(value) {
    if (typeof value !== 'string') return false;
    
    // Verificar formato brasileiro dd/mm/yyyy ou dd/mm/yy
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    return dateRegex.test(value.trim());
}

// ============= ADAPTAÇÃO DINÂMICA DA TABELA =============
async function adaptTableToExcelColumns(data) {
    console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Adaptando tabela às colunas do Excel...');
    
    if (!data || data.length === 0) {
        console.error('❌ Nenhum dado para processar');
        return;
    }
    
    // Usar ordem original dos cabeçalhos se disponível, senão usar Object.keys
    const excelColumns = data._originalHeaders || Object.keys(data[0]);
    console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Colunas na ordem original do Excel:', excelColumns);
    
    // Armazenar ordem global para uso posterior
    if (data._originalHeaders) {
        window.lastExcelColumnOrder = data._originalHeaders;
        console.log('💾 [DYNAMIC-EXCEL-UPLOAD] Ordem das colunas armazenada globalmente:', window.lastExcelColumnOrder);
    }
    
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
    let thead = table.querySelector('thead');
    
    // Criar thead se não existir
    if (!thead) {
        thead = document.createElement('thead');
        table.insertBefore(thead, table.firstChild);
    }
    
    let headerRow = thead.querySelector('tr');
    if (!headerRow) {
        headerRow = document.createElement('tr');
        thead.appendChild(headerRow);
    }
    
    // Limpar cabeçalho atual
    headerRow.innerHTML = '';
    
    console.log('🏗️ [DYNAMIC-EXCEL-UPLOAD] Construindo cabeçalho com', columns.length, 'colunas:', columns);
    
    // Adicionar TODAS as colunas do Excel na ordem exata
    columns.forEach((column, index) => {
        const th = document.createElement('th');
        th.textContent = column;
        th.style.cssText = `
            padding: 12px 8px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
            font-weight: bold;
            text-align: left;
            min-width: 120px;
            white-space: nowrap;
        `;
        th.setAttribute('data-column-index', index);
        headerRow.appendChild(th);
    });
    
    // Adicionar coluna de ações
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Ações';
    actionsHeader.style.cssText = `
        width: 120px;
        padding: 12px 8px;
        background-color: #f8f9fa;
        border-bottom: 2px solid #dee2e6;
        font-weight: bold;
        text-align: center;
    `;
    headerRow.appendChild(actionsHeader);
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Cabeçalho reconstruído com todas as colunas');
}

function updateTableBody(data, columns) {
    const tbody = document.getElementById('enderecosTableBody');
    
    if (!tbody) {
        console.error('❌ Corpo da tabela não encontrado');
        return;
    }
    
    // Limpar corpo atual
    tbody.innerHTML = '';
    
    console.log('🏗️ [DYNAMIC-EXCEL-UPLOAD] Renderizando', data.length, 'linhas com', columns.length, 'colunas cada');
    
    // Adicionar dados do Excel
    data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e0e0e0';
        
        // Adicionar células para TODAS as colunas na ordem exata
        columns.forEach((column, colIndex) => {
            const td = document.createElement('td');
            const value = row[column];
            
            // Formatação baseada no tipo de dado
            if (value !== null && value !== undefined && value !== '') {
                if (typeof value === 'number') {
                    td.textContent = value.toString();
                } else if (typeof value === 'string') {
                    td.textContent = value;
                } else {
                    td.textContent = String(value);
                }
                td.style.color = '#333';
            } else {
                // Célula vazia - ainda renderizar
                td.textContent = '';
                td.style.color = '#999';
                td.style.fontStyle = 'italic';
            }
            
            td.style.cssText += `
                padding: 8px;
                border-right: 1px solid #f0f0f0;
                vertical-align: top;
                min-width: 100px;
            `;
            td.setAttribute('data-column', column);
            td.setAttribute('data-column-index', colIndex);
            
            tr.appendChild(td);
        });
        
        // Adicionar coluna de ações
        const actionsTd = document.createElement('td');
        actionsTd.style.cssText = `
            padding: 8px;
            text-align: center;
            white-space: nowrap;
        `;
        actionsTd.innerHTML = `
            <button class="btn-edit-small" onclick="editDynamicRecord(${rowIndex})" title="Editar"
                    style="margin-right: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                ✏️
            </button>
            <button class="btn-delete-small" onclick="deleteDynamicRecord(${rowIndex})" title="Excluir"
                    style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Tabela renderizada completamente');
    console.log(`   - ${data.length} linhas de dados`);
    console.log(`   - ${columns.length} colunas por linha`);
    console.log(`   - Ordem das colunas: ${columns.join(', ')}`);
}

// ============= SALVAMENTO NO FIRESTORE OTIMIZADO =============
async function saveDataToFirestoreOptimized(data) {
    console.log('💾 [DYNAMIC-EXCEL-UPLOAD] Salvamento otimizado - Processando', data.length, 'registros...');
    
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
    
    console.log('👤 [DYNAMIC-EXCEL-UPLOAD] Usuário autenticado:', user.uid);
    
    // Processar em lotes menores para economizar cota
    const MICRO_BATCH_SIZE = 25; // Lotes muito pequenos
    let totalSaved = 0;
    
    for (let i = 0; i < data.length; i += MICRO_BATCH_SIZE) {
        const batch = firebase.firestore().batch();
        const collection = firebase.firestore().collection('enderecos');
        const chunk = data.slice(i, i + MICRO_BATCH_SIZE);
        
        console.log(`📦 [DYNAMIC-EXCEL-UPLOAD] Processando lote ${Math.floor(i/MICRO_BATCH_SIZE) + 1} (${chunk.length} registros)...`);
        
        for (const row of chunk) {
            try {
                // Preparar dados de forma compacta
                const documentData = {
                    // Preservar todos os campos do Excel
                    ...row,
                    
                    // Metadados mínimos
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: user.uid,
                    source: 'excel_dinamico',
                    columnOrder: data._originalHeaders || Object.keys(row)
                };
                
                // Salvar apenas se tiver dados válidos
                const hasData = Object.values(row).some(value => 
                    value !== null && value !== undefined && value !== ''
                );
                
                if (hasData) {
                    const docRef = collection.doc();
                    batch.set(docRef, documentData);
                    totalSaved++;
                }
                
            } catch (error) {
                console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro na linha:', row, error);
            }
        }
        
        // Executar micro-batch
        if (chunk.length > 0) {
            await batch.commit();
            console.log(`✅ [DYNAMIC-EXCEL-UPLOAD] Lote ${Math.floor(i/MICRO_BATCH_SIZE) + 1} salvo (${chunk.length} registros)`);
            
            // Pequena pausa para não sobrecarregar o Firebase
            if (i + MICRO_BATCH_SIZE < data.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }
    
    console.log(`🎉 [DYNAMIC-EXCEL-UPLOAD] Upload otimizado concluído! ${totalSaved} registros salvos`);
    return totalSaved;
}

// ============= SALVAMENTO NO FIRESTORE (FUNÇÃO ORIGINAL MANTIDA) =============
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
    
    // Usuário válido encontrado
    
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
                originalColumns: data._originalHeaders || Object.keys(row),
                columnOrder: data._originalHeaders || Object.keys(row)
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

// ============= RECARREGAR TABELA DO FIRESTORE COM PAGINAÇÃO =============
async function reloadTableFromFirestore(page = 1) {
    console.log(`🔄 [DYNAMIC-EXCEL-UPLOAD] Recarregando página ${page} da tabela do Firestore...`);
    
    try {
        // Aguardar Firebase estar pronto
        await waitForFirebase();
        
        // Atualizar página atual
        currentPage = page;
        
        // Carregar dados paginados do Firestore
        const enderecos = await loadDirectFromFirestore(page);
        
        if (enderecos && enderecos.length > 0) {
            // Atualizar tabela com dados do Firestore
            updateTableWithFirestoreData(enderecos);
            
            // Atualizar controles de paginação
            updatePaginationControls();
            
            console.log(`✅ [DYNAMIC-EXCEL-UPLOAD] Página ${page} recarregada com ${enderecos.length} registros do Firestore`);
        } else {
            console.warn('⚠️ [DYNAMIC-EXCEL-UPLOAD] Nenhum dado encontrado no Firestore para esta página');
            
            // Se não há dados na página, mas é página > 1, voltar para página 1
            if (page > 1) {
                console.log('🔄 [DYNAMIC-EXCEL-UPLOAD] Voltando para página 1...');
                await reloadTableFromFirestore(1);
                return;
            }
        }
        
        // Tentar também a função existente do sistema como fallback apenas na primeira página
        if (page === 1 && window.loadEnderecosTable && typeof window.loadEnderecosTable === 'function') {
            // Não chama para evitar conflito, deixar comentado
            // await window.loadEnderecosTable();
            console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Sistema principal disponível (não chamado para evitar conflito)');
        }
        
    } catch (error) {
        console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro ao recarregar tabela:', error);
        
        // Tentar fallback apenas se for primeira página
        if (page === 1) {
            try {
                if (window.FirestoreIntegration && typeof window.FirestoreIntegration.loadEnderecos === 'function') {
                    const enderecos = await window.FirestoreIntegration.loadEnderecos();
                    // Paginar dados do fallback também
                    const paginatedData = paginateData(enderecos, page);
                    totalRecords = enderecos.length;
                    updateTableWithFirestoreData(paginatedData);
                    updatePaginationControls();
                    console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Fallback: recarregado com FirestoreIntegration');
                }
            } catch (fallbackError) {
                console.error('❌ [DYNAMIC-EXCEL-UPLOAD] Erro no fallback:', fallbackError);
            }
        }
    }
}

// ============= FUNÇÃO AUXILIAR PARA PAGINAR DADOS EM MEMÓRIA =============
function paginateData(data, page) {
    const startIndex = (page - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return data.slice(startIndex, endIndex);
}

async function loadDirectFromFirestore(page = 1, limit = recordsPerPage) {
    console.log(`📥 [DYNAMIC-EXCEL-UPLOAD] Carregando página ${page} do Firestore (${limit} registros)...`);
    
    try {
        // OTIMIZAÇÃO: Não contar todos os registros para economizar cota
        // Apenas estimar baseado na página atual
        if (page === 1) {
            totalRecords = limit * 10; // Estimativa inicial
            console.log(`📊 [DYNAMIC-EXCEL-UPLOAD] Estimativa inicial: ${totalRecords} registros`);
        }
        
        // Carregar dados paginados
        let query = firebase.firestore().collection('enderecos')
            .orderBy('createdAt', 'desc')
            .limit(limit);
        
        // Se não é a primeira página, usar offset
        if (page > 1) {
            const offset = (page - 1) * limit;
            query = query.offset(offset);
        }
        
        const snapshot = await query.get();
        const enderecos = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            enderecos.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`📋 [DYNAMIC-EXCEL-UPLOAD] Carregados ${enderecos.length} registros da página ${page}`);
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
    
    if (!tbody || !table) {
        console.warn('⚠️ [DYNAMIC-EXCEL-UPLOAD] Elementos da tabela não encontrados');
        return;
    }
    
    if (!enderecos || enderecos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 20px;">Nenhum registro encontrado nesta página</td></tr>';
        return;
    }
    
    // Determinar colunas usando ordem original do Excel se disponível
    const firstRecord = enderecos[0];
    const excludeFields = ['id', 'createdAt', 'updatedAt', 'createdBy', 'source', 'originalColumns', 'columnOrder'];
    
    let columns = [];
    
    // PRIORIDADE 1: Tentar usar ordem original das colunas do Excel armazenada
    const recordWithOrder = enderecos.find(record => record.columnOrder && Array.isArray(record.columnOrder));
    
    if (recordWithOrder && recordWithOrder.columnOrder && recordWithOrder.columnOrder.length > 0) {
        console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Usando ordem das colunas do registro Firestore:', recordWithOrder.columnOrder);
        columns = recordWithOrder.columnOrder.filter(col => !excludeFields.includes(col));
    } else if (window.lastExcelColumnOrder && Array.isArray(window.lastExcelColumnOrder) && window.lastExcelColumnOrder.length > 0) {
        console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Usando ordem das colunas do último upload:', window.lastExcelColumnOrder);
        columns = window.lastExcelColumnOrder.filter(col => !excludeFields.includes(col));
    } else if (dynamicTableColumns && dynamicTableColumns.length > 0) {
        console.log('📊 [DYNAMIC-EXCEL-UPLOAD] Usando ordem das colunas dinâmicas:', dynamicTableColumns);
        columns = dynamicTableColumns.filter(col => !excludeFields.includes(col));
    } else {
        // Fallback: usar TODAS as chaves do primeiro registro, excluindo apenas campos internos
        console.log('⚠️ [DYNAMIC-EXCEL-UPLOAD] Usando todas as chaves do registro (fallback)');
        const allKeys = Object.keys(firstRecord);
        columns = allKeys.filter(key => !excludeFields.includes(key));
        console.log('🔍 [DYNAMIC-EXCEL-UPLOAD] Chaves disponíveis:', allKeys);
        console.log('🔍 [DYNAMIC-EXCEL-UPLOAD] Colunas após filtro:', columns);
    }
    
    // Garantir que temos pelo menos algumas colunas
    if (columns.length === 0) {
        columns = Object.keys(firstRecord).filter(key => !excludeFields.includes(key));
    }
    
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
            if (value !== undefined && value !== null && value !== '') {
                if (typeof value === 'object' && value.seconds) {
                    // Campo de timestamp do Firestore
                    const date = new Date(value.seconds * 1000);
                    td.textContent = date.toLocaleDateString('pt-BR');
                } else if (typeof value === 'number' && isExcelDate(value)) {
                    // Número serial do Excel que é uma data
                    const jsDate = excelDateToJSDate(value);
                    td.textContent = jsDate.toLocaleDateString('pt-BR');
                } else if (typeof value === 'string' && isDateString(value)) {
                    // String que já é uma data formatada
                    td.textContent = value;
                } else if (typeof value === 'number') {
                    // Número comum
                    td.textContent = value.toString();
                } else {
                    td.textContent = value.toString();
                }
            } else {
                // Mostrar células vazias também
                td.textContent = '';
                td.style.color = '#999';
                td.style.fontStyle = 'italic';
            }
            
            td.style.padding = '8px';
            td.style.borderBottom = '1px solid #e0e0e0';
            td.style.minWidth = '100px'; // Garantir largura mínima
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

// ============= CONTROLES DE PAGINAÇÃO =============
function updatePaginationControls() {
    console.log(`📄 [DYNAMIC-EXCEL-UPLOAD] Atualizando controles de paginação - Página ${currentPage}, Total: ${totalRecords}`);
    
    // Procurar container de paginação existente ou criar
    let paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) {
        paginationContainer = createPaginationContainer();
    }
    
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    // HTML dos controles
    const startRecord = (currentPage - 1) * recordsPerPage + 1;
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);
    
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            Mostrando ${startRecord}-${endRecord} de ${totalRecords} registros
        </div>
        <div class="pagination-controls">
            <button onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>
                ⏮️ Primeira
            </button>
            <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                ⏪ Anterior
            </button>
            <span class="page-info">
                Página ${currentPage} de ${totalPages}
            </span>
            <button onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>
                Próxima ⏩
            </button>
            <button onclick="goToPage(${totalPages})" ${currentPage >= totalPages ? 'disabled' : ''}>
                Última ⏭️
            </button>
        </div>
        <div class="records-per-page">
            <label for="recordsPerPageSelect">Registros por página:</label>
            <select id="recordsPerPageSelect" onchange="changeRecordsPerPage(this.value)">
                <option value="25" ${recordsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${recordsPerPage === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${recordsPerPage === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${recordsPerPage === 200 ? 'selected' : ''}>200</option>
            </select>
        </div>
    `;
}

function createPaginationContainer() {
    const table = document.getElementById('enderecosTable');
    if (!table) return null;
    
    const container = document.createElement('div');
    container.id = 'paginationControls';
    container.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 20px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        flex-wrap: wrap;
        gap: 15px;
    `;
    
    // Inserir após a tabela
    table.parentNode.insertBefore(container, table.nextSibling);
    return container;
}

// ============= FUNÇÕES DE NAVEGAÇÃO =============
window.goToPage = async function(page) {
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    
    if (page < 1 || page > totalPages) {
        console.warn(`⚠️ [DYNAMIC-EXCEL-UPLOAD] Página inválida: ${page}`);
        return;
    }
    
    console.log(`📄 [DYNAMIC-EXCEL-UPLOAD] Navegando para página ${page}...`);
    await reloadTableFromFirestore(page);
};

window.changeRecordsPerPage = async function(newLimit) {
    recordsPerPage = parseInt(newLimit);
    currentPage = 1; // Voltar para primeira página
    
    console.log(`📄 [DYNAMIC-EXCEL-UPLOAD] Alterando para ${recordsPerPage} registros por página`);
    await reloadTableFromFirestore(1);
};

// ============= LIMPEZA DE DADOS ANTIGOS =============
window.confirmCleanupOldData = async function() {
    const confirmed = confirm(`⚠️ LIMPEZA DE DADOS\n\nEsta ação vai remover registros antigos para economizar cota do Firebase.\n\nDeseja continuar? Esta ação não pode ser desfeita.`);
    
    if (!confirmed) return;
    
    try {
        showNotification('🗑️ Limpando...', 'Removendo dados antigos, aguarde...', 'info');
        
        // Remover registros mais antigos (manter apenas os 100 mais recentes)
        const snapshot = await firebase.firestore()
            .collection('enderecos')
            .orderBy('createdAt', 'desc')
            .offset(100) // Pular os 100 mais recentes
            .limit(50) // Deletar no máximo 50 por vez
            .get();
        
        const batch = firebase.firestore().batch();
        let deleteCount = 0;
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            deleteCount++;
        });
        
        if (deleteCount > 0) {
            await batch.commit();
            showNotification('✅ Limpeza concluída!', `${deleteCount} registros antigos removidos.`, 'success');
        } else {
            showNotification('ℹ️ Nada para limpar', 'Não há registros antigos para remover.', 'info');
        }
        
        // Recarregar tabela
        await reloadTableFromFirestore(1);
        
    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
        showNotification('❌ Erro', 'Erro ao limpar dados: ' + error.message, 'error');
    }
};

// ============= MODO ECONÔMICO =============
window.toggleEconomicMode = function() {
    recordsPerPage = recordsPerPage === 25 ? 10 : 25;
    showNotification('🔋 Modo Econômico', `Registros por página: ${recordsPerPage}`, 'info');
    reloadTableFromFirestore(1);
};

// ============= EXPOSIÇÃO GLOBAL =============
window.adaptTableToExcelColumns = adaptTableToExcelColumns;
window.currentUploadedData = currentUploadedData;
window.dynamicTableColumns = dynamicTableColumns;
window.reloadTableFromFirestore = reloadTableFromFirestore;

console.log('✅ [DYNAMIC-EXCEL-UPLOAD] Sistema dinâmico de upload Excel carregado com otimizações de cota');