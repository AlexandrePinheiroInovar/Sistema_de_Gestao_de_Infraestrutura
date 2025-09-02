// ============= SISTEMA DE UPLOAD SIMPLES E DIRETO =============
console.log('📁 [UPLOAD-SIMPLE] Inicializando sistema de upload simplificado...');

// ============= CONFIGURAÇÕES =============
let currentFileData = null;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    setupSimpleUpload();
});

function setupSimpleUpload() {
    console.log('🔧 [UPLOAD-SIMPLE] Configurando upload simples...');
    
    const uploadArea = document.getElementById('uploadAreaSimple');
    const fileInput = document.getElementById('fileInputSimple');
    
    if (uploadArea && fileInput) {
        // Clique na área para abrir seletor
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Drag & Drop
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleFileDrop);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        
        // Seleção de arquivo
        fileInput.addEventListener('change', handleFileChange);
        
        console.log('✅ [UPLOAD-SIMPLE] Upload configurado');
    }
}

// ============= HANDLERS DE DRAG & DROP =============
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processSelectedFile(files[0]);
    }
}

function handleFileChange(event) {
    const file = event.target.files[0];
    if (file) {
        processSelectedFile(file);
    }
}

// ============= PROCESSAMENTO DE ARQUIVO =============
async function processSelectedFile(file) {
    console.log('📊 [UPLOAD-SIMPLE] Processando arquivo:', file.name);
    
    // Validar tipo de arquivo
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showUploadError('❌ Por favor, selecione apenas arquivos Excel (.xlsx ou .xls)');
        return;
    }
    
    // Mostrar status de processamento
    showUploadStatus('📊 Lendo arquivo Excel...');
    
    try {
        // Ler dados do Excel
        const data = await readExcelFile(file);
        
        if (!data || data.length === 0) {
            throw new Error('Arquivo Excel está vazio ou não pôde ser lido');
        }
        
        console.log('📋 [UPLOAD-SIMPLE] Dados lidos:', data.length, 'linhas');
        currentFileData = data;
        
        // Processar e salvar dados
        showUploadStatus('💾 Salvando dados no sistema...');
        await saveDataToFirestore(data);
        
        // Atualizar tabela
        showUploadStatus('🔄 Atualizando tabela...');
        await updateEnderecosTable();
        
        // Mostrar sucesso
        showUploadSuccess(`✅ Upload concluído! ${data.length} registros importados.`);
        
    } catch (error) {
        console.error('❌ [UPLOAD-SIMPLE] Erro:', error);
        showUploadError('❌ Erro: ' + error.message);
    }
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
                
                console.log('📊 [UPLOAD-SIMPLE] Planilha lida:', jsonData.length, 'linhas');
                resolve(jsonData);
                
            } catch (error) {
                console.error('❌ [UPLOAD-SIMPLE] Erro ao ler Excel:', error);
                reject(new Error('Não foi possível ler o arquivo Excel'));
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// ============= SALVAMENTO NO FIRESTORE =============
async function saveDataToFirestore(data) {
    console.log('💾 [UPLOAD-SIMPLE] Salvando no Firestore...');
    
    // Verificar se Firebase está disponível
    if (!window.FirestoreIntegration) {
        throw new Error('Sistema de banco de dados não está disponível');
    }
    
    // Obter usuário atual
    const user = getCurrentUser();
    if (!user) {
        throw new Error('Usuário não autenticado');
    }
    
    const batch = firebase.firestore().batch();
    const collection = firebase.firestore().collection('enderecos');
    let savedCount = 0;
    
    for (const row of data) {
        try {
            // Preparar dados do endereço
            const enderecoData = {
                // Mapear campos automaticamente das colunas do Excel
                projeto: row['Projeto'] || row['PROJETO'] || row['projeto'] || '',
                subProjeto: row['Sub Projeto'] || row['SUB PROJETO'] || row['subprojeto'] || '',
                tipoAcao: row['Tipo Ação'] || row['TIPO ACAO'] || row['tipoacao'] || row['Tipo de Ação'] || '',
                condominio: row['Condomínio'] || row['CONDOMINIO'] || row['condominio'] || '',
                endereco: row['Endereço'] || row['ENDERECO'] || row['endereco'] || '',
                cidade: row['Cidade'] || row['CIDADE'] || row['cidade'] || '',
                pep: row['PEP'] || row['pep'] || '',
                codImovelGed: row['COD IMOVEL GED'] || row['codImovelGed'] || '',
                nodeGerencial: row['NODE GERENCIAL'] || row['nodeGerencial'] || '',
                areaTecnica: row['Área Técnica'] || row['AREA TECNICA'] || row['areaTecnica'] || '',
                hp: parseInt(row['HP'] || row['hp'] || '0') || 0,
                andar: row['ANDAR'] || row['andar'] || '',
                dataRecebimento: row['Data Recebimento'] || row['DATA RECEBIMENTO'] || row['dataRecebimento'] || '',
                dataInicio: row['Data Início'] || row['DATA INICIO'] || row['dataInicio'] || '',
                dataFinal: row['Data Final'] || row['DATA FINAL'] || row['dataFinal'] || '',
                equipe: row['Equipe'] || row['EQUIPE'] || row['equipe'] || '',
                supervisor: row['Supervisor'] || row['SUPERVISOR'] || row['supervisor'] || '',
                status: row['Status'] || row['STATUS'] || row['status'] || 'ATIVO',
                rdo: row['RDO'] || row['rdo'] || '',
                book: row['BOOK'] || row['book'] || '',
                projetoStatus: row['PROJETO'] || row['projetoStatus'] || '',
                situacao: row['Situação'] || row['SITUACAO'] || row['situacao'] || '',
                justificativa: row['Justificativa'] || row['JUSTIFICATIVA'] || row['justificativa'] || '',
                
                // Metadados
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
                source: 'upload_excel'
            };
            
            // Apenas salvar se tiver pelo menos um endereço
            if (enderecoData.endereco || enderecoData.condominio) {
                const docRef = collection.doc();
                batch.set(docRef, enderecoData);
                savedCount++;
            }
            
        } catch (error) {
            console.error('❌ [UPLOAD-SIMPLE] Erro na linha:', row, error);
        }
    }
    
    // Executar batch
    if (savedCount > 0) {
        await batch.commit();
        console.log(`✅ [UPLOAD-SIMPLE] ${savedCount} registros salvos`);
    }
    
    return savedCount;
}

// ============= ATUALIZAÇÃO DA TABELA =============
async function updateEnderecosTable() {
    console.log('🔄 [UPLOAD-SIMPLE] Atualizando tabela...');
    
    try {
        // Usar a função existente para carregar endereços
        if (window.loadEnderecosTable && typeof window.loadEnderecosTable === 'function') {
            await window.loadEnderecosTable();
        } else if (window.FirestoreIntegration && typeof window.FirestoreIntegration.loadEnderecos === 'function') {
            const enderecos = await window.FirestoreIntegration.loadEnderecos();
            updateTableHTML(enderecos);
        }
        
        console.log('✅ [UPLOAD-SIMPLE] Tabela atualizada');
    } catch (error) {
        console.error('❌ [UPLOAD-SIMPLE] Erro ao atualizar tabela:', error);
    }
}

function updateTableHTML(enderecos) {
    const tbody = document.getElementById('enderecosTableBody');
    if (!tbody || !enderecos) return;
    
    tbody.innerHTML = enderecos.map(endereco => `
        <tr>
            <td>${endereco.id || ''}</td>
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
}

// ============= FUNÇÕES DE STATUS =============
function showUploadStatus(message) {
    const statusDiv = document.getElementById('uploadStatus');
    const statusText = document.getElementById('statusText');
    const resultsDiv = document.getElementById('uploadResults');
    
    if (statusDiv && statusText) {
        statusText.textContent = message;
        statusDiv.style.display = 'block';
        resultsDiv.style.display = 'none';
        
        // Animação da barra de progresso
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = '50%';
        }
    }
}

function showUploadSuccess(message) {
    const statusDiv = document.getElementById('uploadStatus');
    const resultsDiv = document.getElementById('uploadResults');
    const resultsContent = document.getElementById('resultsContent');
    
    if (statusDiv && resultsDiv && resultsContent) {
        statusDiv.style.display = 'none';
        resultsContent.innerHTML = `<div class="success-message">${message}</div>`;
        resultsDiv.style.display = 'block';
        
        // Fechar modal após 3 segundos
        setTimeout(() => {
            closeUploadModal();
        }, 3000);
    }
}

function showUploadError(message) {
    const statusDiv = document.getElementById('uploadStatus');
    const resultsDiv = document.getElementById('uploadResults');
    const resultsContent = document.getElementById('resultsContent');
    
    if (statusDiv && resultsDiv && resultsContent) {
        statusDiv.style.display = 'none';
        resultsContent.innerHTML = `<div class="error-message">${message}</div>`;
        resultsDiv.style.display = 'block';
    }
}

// ============= FUNÇÕES UTILITÁRIAS =============
function getCurrentUser() {
    if (window.FirebaseAuthIsolated && typeof window.FirebaseAuthIsolated.getCurrentUser === 'function') {
        return window.FirebaseAuthIsolated.getCurrentUser();
    }
    if (firebase && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser;
    }
    return null;
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Reset do estado
        const statusDiv = document.getElementById('uploadStatus');
        const resultsDiv = document.getElementById('uploadResults');
        const fileInput = document.getElementById('fileInputSimple');
        
        if (statusDiv) statusDiv.style.display = 'none';
        if (resultsDiv) resultsDiv.style.display = 'none';
        if (fileInput) fileInput.value = '';
        
        currentFileData = null;
    }
}

// ============= TORNAR FUNÇÕES GLOBAIS =============
window.closeUploadModal = closeUploadModal;

console.log('✅ [UPLOAD-SIMPLE] Sistema de upload simples carregado');