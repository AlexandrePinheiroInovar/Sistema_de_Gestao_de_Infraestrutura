// ============= SISTEMA COMPLETO DE LEITURA EXCEL - TODAS AS COLUNAS =============
console.log('📊 [EXCEL-READER-COMPLETE] Inicializando leitor completo de Excel...');

// ============= CONFIGURAÇÕES =============
let completeExcelData = [];
let exactColumnOrder = [];
let isCompleteSystem = false;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        setupCompleteExcelReader();
        // Tentar carregar dados existentes do Firebase
        loadExistingDataOnStartup();
    }, 3000);
});

function setupCompleteExcelReader() {
    console.log('🔧 [EXCEL-READER-COMPLETE] Configurando leitor completo...');
    
    const fileInput = document.getElementById('excelUpload');
    
    if (fileInput) {
        // Limpar todos os listeners anteriores
        const newInput = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newInput, fileInput);
        
        // Adicionar novo listener
        newInput.addEventListener('change', handleCompleteExcelUpload);
        console.log('✅ [EXCEL-READER-COMPLETE] Sistema completo configurado');
    }
}

// ============= HANDLER PRINCIPAL =============
async function handleCompleteExcelUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        console.log('🚫 [EXCEL-READER-COMPLETE] Nenhum arquivo selecionado');
        return;
    }
    
    try {
        console.log('📂 [EXCEL-READER-COMPLETE] Processando arquivo:', file.name);
        
        // Validar arquivo Excel
        if (!isValidExcelFile(file)) {
            showNotification('❌ Erro', 'Selecione apenas arquivos Excel (.xlsx ou .xls)', 'error');
            return;
        }
        
        showNotification('📊 Processando...', 'Lendo TODAS as colunas do Excel...', 'info');
        
        // Ler arquivo Excel com método completo
        const result = await readCompleteExcelFile(file);
        
        if (!result || !result.data || result.data.length === 0) {
            throw new Error('Arquivo Excel vazio ou inválido');
        }
        
        console.log('✅ [EXCEL-READER-COMPLETE] Leitura completa concluída:');
        console.log(`   - ${result.data.length} linhas`);
        console.log(`   - ${result.headers.length} colunas`);
        console.log(`   - Colunas: ${result.headers.join(', ')}`);
        
        // Armazenar dados
        completeExcelData = result.data;
        exactColumnOrder = result.headers;
        isCompleteSystem = true;
        
        // Confirmar upload com usuário
        const proceed = await confirmUpload(result);
        if (!proceed) {
            showNotification('ℹ️ Cancelado', 'Upload cancelado pelo usuário', 'info');
            return;
        }
        
        // Reordenar dados conforme padrão antes do processamento
        let finalResult = result;
        if (window.reorderExcelData) {
            console.log('📋 [EXCEL-READER-COMPLETE] Aplicando ordenação padrão...');
            finalResult = window.reorderExcelData(result.data, result.headers);
            finalResult.totalRows = result.totalRows;
            finalResult.originalRange = result.originalRange;
            
            showNotification('🔄 Reordenação', `Dados reordenados conforme padrão. ${finalResult.totalColumns} colunas organizadas.`, 'info');
        }
        
        // Processar upload completo
        await processCompleteUpload(finalResult);
        
    } catch (error) {
        console.error('❌ [EXCEL-READER-COMPLETE] Erro:', error);
        showNotification('❌ Erro', `Erro no upload: ${error.message}`, 'error');
    } finally {
        event.target.value = '';
    }
}

// ============= LEITURA COMPLETA DO EXCEL =============
function readCompleteExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { 
                    type: 'array', 
                    cellDates: true,
                    cellNF: false,
                    cellText: false,
                    raw: false
                });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                if (!worksheet['!ref']) {
                    throw new Error('Planilha está vazia');
                }
                
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                console.log('📋 [EXCEL-READER-COMPLETE] Range detectado:', range);
                
                // ETAPA 1: Extrair TODOS os cabeçalhos (primeira linha)
                const headers = [];
                const headerRow = range.s.r;
                
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
                    const cell = worksheet[cellAddress];
                    
                    let headerName = '';
                    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
                        headerName = String(cell.v).trim();
                    } else {
                        // Criar nome genérico para colunas vazias
                        headerName = `Coluna${col + 1}`;
                    }
                    
                    // Evitar nomes duplicados
                    let finalHeaderName = headerName;
                    let counter = 1;
                    while (headers.includes(finalHeaderName)) {
                        finalHeaderName = `${headerName}_${counter}`;
                        counter++;
                    }
                    
                    headers.push(finalHeaderName);
                }
                
                console.log('📊 [EXCEL-READER-COMPLETE] TODAS as colunas extraídas:', headers);
                
                // ETAPA 2: Processar TODAS as linhas de dados
                const jsonData = [];
                
                for (let row = headerRow + 1; row <= range.e.r; row++) {
                    const rowData = {};
                    let hasValidData = false;
                    
                    // Processar TODAS as colunas para esta linha
                    for (let col = range.s.c; col <= range.e.c; col++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                        const cell = worksheet[cellAddress];
                        const headerName = headers[col - range.s.c];
                        
                        let cellValue = '';
                        
                        if (cell && cell.v !== undefined && cell.v !== null) {
                            hasValidData = true;
                            cellValue = cell.v;
                            
                            // Processar diferentes tipos de dados
                            if (cell.t === 'n' && isExcelDate(cellValue)) {
                                // Data serial do Excel
                                const jsDate = excelDateToJSDate(cellValue);
                                cellValue = formatDateBrazilian(jsDate);
                            } else if (cell.t === 'd' || cellValue instanceof Date) {
                                // Objeto Date
                                cellValue = formatDateBrazilian(cellValue);
                            } else if (typeof cellValue === 'string') {
                                cellValue = cellValue.trim();
                                // Verificar se é uma data em string
                                if (looksLikeDate(cellValue)) {
                                    cellValue = standardizeDateFormat(cellValue);
                                }
                            } else if (typeof cellValue === 'number') {
                                cellValue = cellValue.toString();
                            } else {
                                cellValue = String(cellValue);
                            }
                        }
                        
                        // SEMPRE incluir a coluna, mesmo se vazia
                        rowData[headerName] = cellValue;
                    }
                    
                    // Incluir linha apenas se tiver pelo menos um dado
                    if (hasValidData) {
                        jsonData.push(rowData);
                    }
                }
                
                const result = {
                    data: jsonData,
                    headers: headers,
                    totalRows: jsonData.length,
                    totalColumns: headers.length,
                    originalRange: range
                };
                
                console.log('🎉 [EXCEL-READER-COMPLETE] Processamento 100% completo!');
                console.log(`   📊 ${result.totalRows} linhas × ${result.totalColumns} colunas`);
                
                resolve(result);
                
            } catch (error) {
                console.error('❌ [EXCEL-READER-COMPLETE] Erro na leitura:', error);
                reject(new Error(`Erro ao ler Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(file);
    });
}

// ============= FUNÇÕES DE DATA =============
function isExcelDate(value) {
    return typeof value === 'number' && value > 0 && value < 100000;
}

function excelDateToJSDate(serial) {
    const excelEpoch = new Date(1900, 0, 1);
    const jsDate = new Date(excelEpoch.getTime() + (serial - 1) * 24 * 60 * 60 * 1000);
    
    if (serial > 59) {
        jsDate.setTime(jsDate.getTime() - 24 * 60 * 60 * 1000);
    }
    
    return jsDate;
}

function formatDateBrazilian(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

function looksLikeDate(value) {
    if (typeof value !== 'string') return false;
    
    // Padrões de data comuns
    const datePatterns = [
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,     // dd/mm/yyyy
        /^\d{1,2}-\d{1,2}-\d{4}$/,      // dd-mm-yyyy
        /^\d{4}-\d{1,2}-\d{1,2}$/,      // yyyy-mm-dd
        /^\d{1,2}\/\d{1,2}\/\d{2}$/     // dd/mm/yy
    ];
    
    return datePatterns.some(pattern => pattern.test(value));
}

function standardizeDateFormat(dateString) {
    if (!looksLikeDate(dateString)) return dateString;
    
    try {
        // Tentar interpretar diferentes formatos
        let date;
        
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                
                // Ajustar ano de 2 dígitos
                const fullYear = year < 50 ? 2000 + year : (year < 100 ? 1900 + year : year);
                
                date = new Date(fullYear, month - 1, day);
            }
        } else if (dateString.includes('-')) {
            date = new Date(dateString);
        }
        
        if (date && !isNaN(date.getTime())) {
            return formatDateBrazilian(date);
        }
        
    } catch (error) {
        console.warn('⚠️ [EXCEL-READER-COMPLETE] Erro ao padronizar data:', dateString);
    }
    
    return dateString;
}

// ============= CONFIRMAÇÃO DE UPLOAD =============
async function confirmUpload(result) {
    const message = `📊 ARQUIVO EXCEL ANALISADO\n\n` +
        `📁 Linhas de dados: ${result.totalRows}\n` +
        `📋 Colunas encontradas: ${result.totalColumns}\n\n` +
        `🔍 Primeiras colunas:\n${result.headers.slice(0, 8).join(', ')}` +
        (result.headers.length > 8 ? `\n... e mais ${result.headers.length - 8} colunas` : '') +
        `\n\n✅ Deseja fazer o upload destes dados?`;
    
    return confirm(message);
}

// ============= PROCESSAMENTO COMPLETO =============
async function processCompleteUpload(result) {
    try {
        showNotification('🔄 Processando...', 'Salvando dados e atualizando sistema...', 'info');
        
        // 1. Substituir tabela existente  
        await replaceExistingTable(result);
        
        // 2. Integrar com gestão de projetos
        await integrateWithProjectManagement(result);
        
        // 3. Salvar no Firestore
        await saveCompleteDataToFirestore(result);
        
        // 4. Recarregar interface
        await reloadCompleteInterface();
        
        showNotification('🎉 Sucesso!', `Upload completo! ${result.totalRows} registros processados com ${result.totalColumns} colunas.`, 'success');
        
    } catch (error) {
        console.error('❌ [EXCEL-READER-COMPLETE] Erro no processamento:', error);
        throw error;
    }
}

// ============= SUBSTITUIR TABELA EXISTENTE =============
async function replaceExistingTable(result) {
    console.log('🔄 [EXCEL-READER-COMPLETE] Substituindo tabela existente...');
    
    // Encontrar e remover tabela antiga
    const oldFirebaseTable = document.getElementById('firebaseTable');
    const oldEnderecosTable = document.getElementById('enderecosTable');
    
    if (oldFirebaseTable) {
        oldFirebaseTable.remove();
        console.log('🗑️ Tabela Firebase antiga removida');
    }
    
    if (oldEnderecosTable) {
        oldEnderecosTable.remove(); 
        console.log('🗑️ Tabela endereços antiga removida');
    }
    
    // Criar nova tabela com ID único
    await recreateMainTable(result);
}

// ============= RECRIAR TABELA PRINCIPAL =============
async function recreateMainTable(result) {
    console.log('🏗️ [EXCEL-READER-COMPLETE] Recriando tabela principal...');
    
    // Usar a nova estrutura de tabela de endereços
    let tableContainer = document.querySelector('#enderecoTableWrapper');
    
    if (!tableContainer) {
        console.error('❌ Container da nova tabela não encontrado! ID: enderecoTableWrapper');
        return;
    }
    
    // Limpar container
    tableContainer.innerHTML = '';
    
    // Criar nova tabela usando a estrutura da tabela de endereços
    const table = document.createElement('table');
    table.className = 'endereco-table';
    table.id = 'enderecoMainTable';
    
    // Criar cabeçalho
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Usar ordem fixa das colunas se disponível
    const headersToUse = window.ORDEM_COLUNAS_FIXA || result.headers;
    const finalHeaders = [...headersToUse];
    
    // Tratar duplicata de Observação
    const observationIndices = [];
    finalHeaders.forEach((header, index) => {
        if (header === 'Observação') {
            observationIndices.push(index);
        }
    });
    
    if (observationIndices.length > 1) {
        finalHeaders[observationIndices[observationIndices.length - 1]] = 'Observação_2';
    }
    
    // Adicionar TODAS as colunas na ordem exata
    finalHeaders.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;
        th.style.cssText = `
            padding: 12px 8px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            font-weight: bold;
            text-align: left;
            white-space: nowrap;
            min-width: 120px;
        `;
        th.setAttribute('data-column-index', index);
        headerRow.appendChild(th);
    });
    
    // Coluna de ações
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Ações';
    actionsHeader.style.cssText = `
        padding: 12px 8px;
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        font-weight: bold;
        text-align: center;
        width: 120px;
    `;
    headerRow.appendChild(actionsHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Criar corpo da tabela
    const tbody = document.createElement('tbody');
    tbody.id = 'enderecoTableBody';
    
    // Adicionar dados (limitados para performance)
    const displayData = result.data.slice(0, 50); // Mostrar apenas 50 primeiros
    
    displayData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e0e0e0';
        
        // Adicionar TODAS as colunas na ordem exata
        finalHeaders.forEach((header, colIndex) => {
            const td = document.createElement('td');
            const value = row[header];
            
            if (value !== null && value !== undefined && value !== '') {
                td.textContent = String(value);
                td.style.color = '#333';
            } else {
                td.textContent = '';
                td.style.color = '#999';
                td.style.fontStyle = 'italic';
            }
            
            td.style.cssText += `
                padding: 8px;
                border: 1px solid #f0f0f0;
                vertical-align: top;
                word-wrap: break-word;
                max-width: 200px;
            `;
            td.setAttribute('data-column', header);
            tr.appendChild(td);
        });
        
        // Coluna de ações
        const actionsTd = document.createElement('td');
        actionsTd.style.cssText = `
            padding: 8px;
            text-align: center;
            white-space: nowrap;
            border: 1px solid #f0f0f0;
        `;
        actionsTd.innerHTML = `
            <button onclick="editCompleteRecord(${rowIndex})" title="Editar" style="margin-right: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                ✏️
            </button>
            <button onclick="deleteCompleteRecord(${rowIndex})" title="Excluir" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    
    // Adicionar tabela ao container
    tableContainer.appendChild(table);
    
    // Adicionar informações da tabela
    const info = document.createElement('div');
    info.style.cssText = 'margin: 10px 0; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 14px;';
    info.innerHTML = `
        📊 <strong>Tabela Completa Criada:</strong><br>
        • ${result.totalRows} linhas de dados<br>
        • ${result.totalColumns} colunas preservadas<br>
        • Ordem exata do Excel mantida<br>
        • Formato de datas: dd/mm/yyyy<br>
        • Sistema integrado com Gestão de Projetos<br>
        • Exibindo primeiras 50 linhas (performance otimizada)
    `;
    
    tableContainer.parentNode.insertBefore(info, tableContainer);
    
    console.log('✅ [EXCEL-READER-COMPLETE] Tabela principal recriada com sucesso');
}

// ============= INTEGRAÇÃO COM GESTÃO DE PROJETOS =============
async function integrateWithProjectManagement(result) {
    console.log('🔗 [EXCEL-READER-COMPLETE] Integrando com gestão de projetos...');
    
    if (!window.FirestoreIntegration) {
        console.warn('⚠️ [EXCEL-READER-COMPLETE] FirestoreIntegration não disponível');
        return;
    }
    
    try {
        // Extrair dados únicos para cada categoria
        const uniqueData = extractUniqueProjectData(result);
        
        // Atualizar cada tabela de gestão
        await updateProjectTables(uniqueData);
        
        console.log('✅ [EXCEL-READER-COMPLETE] Integração com gestão concluída');
        
    } catch (error) {
        console.error('❌ [EXCEL-READER-COMPLETE] Erro na integração:', error);
    }
}

function extractUniqueProjectData(result) {
    const uniqueData = {
        projetos: new Set(),
        subProjetos: new Set(),
        tiposAcao: new Set(),
        supervisores: new Set(),
        equipes: new Set(),
        cidades: new Set()
    };
    
    // Mapear colunas EXATAS conforme padrão definido pelo usuário
    const columnMappings = {
        projetos: ['Projeto', 'PROJETO'],
        subProjetos: ['Sub Projeto'],
        tiposAcao: ['Tipo de Ação'],
        supervisores: ['Supervisor'],
        equipes: ['EQUIPE'],
        cidades: ['Cidade']
    };
    
    // Encontrar as colunas correspondentes
    const foundColumns = {};
    Object.keys(columnMappings).forEach(category => {
        const possibleNames = columnMappings[category];
        for (const header of result.headers) {
            const headerLower = header.toLowerCase();
            if (possibleNames.some(name => headerLower.includes(name))) {
                foundColumns[category] = header;
                break;
            }
        }
    });
    
    console.log('🔍 [EXCEL-READER-COMPLETE] Colunas mapeadas:', foundColumns);
    
    // Extrair valores únicos
    result.data.forEach(row => {
        Object.keys(foundColumns).forEach(category => {
            const columnName = foundColumns[category];
            const value = row[columnName];
            
            if (value && typeof value === 'string' && value.trim() !== '') {
                uniqueData[category].add(value.trim());
            }
        });
    });
    
    // Converter Sets para Arrays
    Object.keys(uniqueData).forEach(key => {
        uniqueData[key] = Array.from(uniqueData[key]);
    });
    
    console.log('📊 [EXCEL-READER-COMPLETE] Dados únicos extraídos:', {
        projetos: uniqueData.projetos.length,
        subProjetos: uniqueData.subProjetos.length,
        tiposAcao: uniqueData.tiposAcao.length,
        supervisores: uniqueData.supervisores.length,
        equipes: uniqueData.equipes.length,
        cidades: uniqueData.cidades.length
    });
    
    return uniqueData;
}

// ============= SALVAMENTO NO FIRESTORE =============
async function saveCompleteDataToFirestore(result) {
    console.log('💾 [EXCEL-READER-COMPLETE] Salvando no Firestore...');
    
    if (!window.getCurrentUser || !window.getCurrentUser()) {
        throw new Error('Usuário não autenticado');
    }
    
    const user = window.getCurrentUser();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    
    // Salvar em lotes para não estourar a quota
    const BATCH_SIZE = 25;
    let savedCount = 0;
    
    for (let i = 0; i < result.data.length; i += BATCH_SIZE) {
        const batch = firebase.firestore().batch();
        const chunk = result.data.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(row => {
            const docData = {
                ...row,
                createdAt: timestamp,
                createdBy: user.uid,
                source: 'excel_complete_reader',
                originalHeaders: result.headers,
                columnCount: result.totalColumns
            };
            
            const docRef = firebase.firestore().collection('enderecos').doc();
            batch.set(docRef, docData);
            savedCount++;
        });
        
        await batch.commit();
        console.log(`✅ [EXCEL-READER-COMPLETE] Lote ${Math.floor(i/BATCH_SIZE) + 1} salvo (${chunk.length} registros)`);
        
        // Pausa para não sobrecarregar
        if (i + BATCH_SIZE < result.data.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    console.log(`🎉 [EXCEL-READER-COMPLETE] ${savedCount} registros salvos no Firestore`);
}

// ============= FUNÇÕES AUXILIARES =============
function isValidExcelFile(file) {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
}

async function updateProjectTables(uniqueData) {
    console.log('🔄 [EXCEL-READER-COMPLETE] Atualizando tabelas de gestão...');
    
    try {
        if (!window.FirestoreIntegration) {
            console.warn('⚠️ FirestoreIntegration não disponível');
            return;
        }
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const user = window.getCurrentUser();
        
        if (!user) {
            console.warn('⚠️ Usuário não autenticado para atualizar gestão');
            return;
        }
        
        // 1. PROJETOS
        console.log('📋 Atualizando projetos...');
        for (const projeto of uniqueData.projetos) {
            try {
                await window.FirestoreIntegration.saveUniqueIfNotExists('projetos', {
                    nome: projeto,
                    cliente: 'Extraído do Excel',
                    descricao: `Projeto extraído automaticamente do upload de Excel`,
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', projeto);
            } catch (error) {
                console.error('❌ Erro ao salvar projeto:', projeto, error);
            }
        }
        
        // 2. SUB PROJETOS
        console.log('📋 Atualizando sub projetos...');
        for (const subProjeto of uniqueData.subProjetos) {
            try {
                await window.FirestoreIntegration.saveUniqueIfNotExists('subprojetos', {
                    nome: subProjeto,
                    projetoPrincipal: 'Auto-vinculado',
                    descricao: `Sub projeto extraído do Excel`,
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', subProjeto);
            } catch (error) {
                console.error('❌ Erro ao salvar sub projeto:', subProjeto, error);
            }
        }
        
        // 3. TIPOS DE AÇÃO
        console.log('📋 Atualizando tipos de ação...');
        for (const tipo of uniqueData.tiposAcao) {
            try {
                const categoria = determineActionCategory(tipo);
                await window.FirestoreIntegration.saveUniqueIfNotExists('tiposacao', {
                    nome: tipo,
                    categoria: categoria,
                    descricao: `Tipo de ação extraído do Excel`,
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', tipo);
            } catch (error) {
                console.error('❌ Erro ao salvar tipo de ação:', tipo, error);
            }
        }
        
        // 4. SUPERVISORES
        console.log('📋 Atualizando supervisores...');
        for (const supervisor of uniqueData.supervisores) {
            try {
                const emailGenerated = `${supervisor.toLowerCase().replace(/\s+/g, '.')}@empresa.com`;
                await window.FirestoreIntegration.saveUniqueIfNotExists('supervisores', {
                    nome: supervisor,
                    email: emailGenerated,
                    telefone: '',
                    area: 'Supervisão Geral',
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', supervisor);
            } catch (error) {
                console.error('❌ Erro ao salvar supervisor:', supervisor, error);
            }
        }
        
        // 5. EQUIPES
        console.log('📋 Atualizando equipes...');
        for (const equipe of uniqueData.equipes) {
            try {
                await window.FirestoreIntegration.saveUniqueIfNotExists('equipes', {
                    nome: equipe,
                    lider: 'A definir',
                    membros: 'Extraído automaticamente do Excel',
                    especialidade: 'Geral',
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', equipe);
            } catch (error) {
                console.error('❌ Erro ao salvar equipe:', equipe, error);
            }
        }
        
        // 6. CIDADES
        console.log('📋 Atualizando cidades...');
        for (const cidade of uniqueData.cidades) {
            try {
                await window.FirestoreIntegration.saveUniqueIfNotExists('cidades', {
                    nome: cidade,
                    estado: 'A definir',
                    regiao: 'Extraído do Excel',
                    status: 'ATIVO',
                    createdAt: timestamp,
                    createdBy: user.uid,
                    source: 'excel_upload'
                }, 'nome', cidade);
            } catch (error) {
                console.error('❌ Erro ao salvar cidade:', cidade, error);
            }
        }
        
        console.log('✅ Tabelas de gestão atualizadas com sucesso!');
        
        // Recarregar as tabelas de gestão se existirem
        await reloadManagementTables();
        
    } catch (error) {
        console.error('❌ Erro geral ao atualizar tabelas de gestão:', error);
    }
}

function determineActionCategory(tipoAcao) {
    const tipo = tipoAcao.toLowerCase();
    
    if (tipo.includes('vistoria')) return 'VISTORIA';
    if (tipo.includes('construção') || tipo.includes('construcao')) return 'CONSTRUÇÃO';
    if (tipo.includes('ativação') || tipo.includes('ativacao')) return 'ATIVAÇÃO';
    if (tipo.includes('manutenção') || tipo.includes('manutencao')) return 'MANUTENÇÃO';
    if (tipo.includes('administrativo')) return 'ADMINISTRATIVO';
    
    return 'OUTROS';
}

async function reloadManagementTables() {
    console.log('🔄 [EXCEL-READER-COMPLETE] Recarregando tabelas de gestão...');
    
    try {
        // Recarregar dropdowns se a função existir
        if (window.loadSelectOptions && typeof window.loadSelectOptions === 'function') {
            await window.loadSelectOptions();
            console.log('✅ Dropdowns recarregados');
        }
        
        // Recarregar tabelas de gestão se as funções existirem
        const reloadFunctions = [
            'loadProjetosTable',
            'loadSubProjetosTable', 
            'loadTiposAcaoTable',
            'loadSupervisoresTable',
            'loadEquipesTable',
            'loadCidadesTable'
        ];
        
        for (const funcName of reloadFunctions) {
            if (window[funcName] && typeof window[funcName] === 'function') {
                try {
                    await window[funcName]();
                    console.log(`✅ ${funcName} executada`);
                } catch (error) {
                    console.warn(`⚠️ Erro ao executar ${funcName}:`, error);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao recarregar tabelas de gestão:', error);
    }
}

async function reloadCompleteInterface() {
    console.log('🔄 [EXCEL-READER-COMPLETE] Recarregando interface...');
    // Recarregar componentes necessários
}

// ============= MANIPULAÇÃO DE REGISTROS =============
window.editCompleteRecord = function(index) {
    console.log('✏️ [EXCEL-READER-COMPLETE] Editando registro:', index);
    // Implementar edição
};

window.deleteCompleteRecord = function(index) {
    console.log('🗑️ [EXCEL-READER-COMPLETE] Excluindo registro:', index);
    // Implementar exclusão
};

// ============= NOTIFICAÇÕES =============
function showNotification(title, message, type) {
    if (window.showCustomNotification) {
        window.showCustomNotification(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}

// ============= LIMPEZA COMPLETA DO FIREBASE =============
window.clearAllFirebaseData = async function() {
    const confirmed = confirm(`🗑️ LIMPEZA COMPLETA DOS DADOS\n\n⚠️ ATENÇÃO: Esta ação vai remover TODOS os dados das seguintes coleções:\n\n• enderecos (tabela principal)\n• projetos\n• subprojetos  \n• tiposacao\n• supervisores\n• equipes\n• cidades\n\nEsta ação NÃO PODE ser desfeita!\n\nDeseja continuar?`);
    
    if (!confirmed) {
        showNotification('ℹ️ Cancelado', 'Limpeza cancelada pelo usuário', 'info');
        return;
    }
    
    // Segunda confirmação para segurança
    const doubleConfirmed = confirm(`🚨 CONFIRMAÇÃO FINAL\n\nTem CERTEZA ABSOLUTA que deseja apagar TODOS os dados?\n\nEsta é sua última chance para cancelar!`);
    
    if (!doubleConfirmed) {
        showNotification('ℹ️ Cancelado', 'Limpeza cancelada pelo usuário', 'info');
        return;
    }
    
    try {
        showNotification('🗑️ Limpando...', 'Removendo todos os dados do Firebase...', 'info');
        
        if (!firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        const user = window.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }
        
        console.log('🗑️ [FIREBASE-CLEANUP] Iniciando limpeza completa...');
        
        // Coleções para limpar
        const collections = [
            'enderecos',
            'projetos', 
            'subprojetos',
            'tiposacao',
            'supervisores',
            'equipes',
            'cidades'
        ];
        
        let totalDeleted = 0;
        
        // Limpar cada coleção
        for (const collectionName of collections) {
            console.log(`🗑️ Limpando coleção: ${collectionName}...`);
            
            try {
                const snapshot = await firebase.firestore()
                    .collection(collectionName)
                    .limit(500) // Limitar para não sobrecarregar
                    .get();
                
                if (!snapshot.empty) {
                    const batch = firebase.firestore().batch();
                    let batchCount = 0;
                    
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                        batchCount++;
                    });
                    
                    if (batchCount > 0) {
                        await batch.commit();
                        totalDeleted += batchCount;
                        console.log(`✅ ${collectionName}: ${batchCount} documentos removidos`);
                    }
                    
                    // Se há mais documentos, continuar limpeza
                    if (snapshot.docs.length === 500) {
                        console.log(`🔄 ${collectionName}: Continuando limpeza...`);
                        // Recursivamente limpar o resto (simplified approach)
                        const remainingSnapshot = await firebase.firestore()
                            .collection(collectionName)
                            .limit(500)
                            .get();
                        
                        if (!remainingSnapshot.empty) {
                            const remainingBatch = firebase.firestore().batch();
                            remainingSnapshot.docs.forEach(doc => {
                                remainingBatch.delete(doc.ref);
                            });
                            await remainingBatch.commit();
                            totalDeleted += remainingSnapshot.docs.length;
                        }
                    }
                } else {
                    console.log(`✅ ${collectionName}: Já está vazia`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao limpar ${collectionName}:`, error);
            }
        }
        
        // Limpar tabela da interface
        const tableBody = document.getElementById('enderecoTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-state"><td colspan="26"><div class="empty-state-content"><div class="empty-icon">📊</div><h3>Tabela Limpa</h3><p>Todos os dados foram removidos</p></div></td></tr>';
        }
        
        // Limpar dados em memória
        completeExcelData = [];
        exactColumnOrder = [];
        
        showNotification('✅ Limpeza Concluída!', `Todos os dados foram removidos com sucesso!\n\nTotal: ${totalDeleted} documentos excluídos`, 'success');
        
        console.log(`🎉 [FIREBASE-CLEANUP] Limpeza concluída! ${totalDeleted} documentos removidos`);
        
    } catch (error) {
        console.error('❌ [FIREBASE-CLEANUP] Erro na limpeza:', error);
        showNotification('❌ Erro', `Erro na limpeza: ${error.message}`, 'error');
    }
};

// ============= LIMPEZA APENAS DA TABELA PRINCIPAL =============
window.clearMainTableOnly = async function() {
    const confirmed = confirm(`🗑️ LIMPEZA DA TABELA PRINCIPAL\n\nEsta ação vai remover apenas os dados da tabela de endereços.\n\nAs tabelas de gestão (projetos, equipes, etc.) serão preservadas.\n\nDeseja continuar?`);
    
    if (!confirmed) return;
    
    try {
        showNotification('🗑️ Limpando...', 'Removendo dados da tabela principal...', 'info');
        
        const snapshot = await firebase.firestore()
            .collection('enderecos')
            .limit(500)
            .get();
        
        if (!snapshot.empty) {
            const batch = firebase.firestore().batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Limpar interface
            const tableBody = document.getElementById('enderecoTableBody');
            if (tableBody) {
                tableBody.innerHTML = '<tr class="empty-state"><td colspan="26"><div class="empty-state-content"><div class="empty-icon">📊</div><h3>Tabela Limpa</h3><p>Faça um novo upload</p></div></td></tr>';
            }
            
            showNotification('✅ Sucesso!', `${snapshot.docs.length} registros da tabela principal removidos`, 'success');
        } else {
            showNotification('ℹ️ Info', 'Tabela já está vazia', 'info');
        }
        
    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
        showNotification('❌ Erro', `Erro: ${error.message}`, 'error');
    }
};

// ============= FUNÇÕES PARA COMPATIBILIDADE COM DASHBOARD =============
window.filterDynamicTable = function() {
    const searchInput = document.getElementById('dynamicSearchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const table = document.getElementById('enderecoMainTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        // Pular linha de estado vazio
        if (row.classList.contains('empty-state')) return;
        
        const cells = row.querySelectorAll('td');
        let found = false;
        
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(searchTerm)) {
                found = true;
            }
        });
        
        row.style.display = found ? '' : 'none';
    });
    
    console.log(`🔍 [EXCEL-READER-COMPLETE] Filtro aplicado: "${searchTerm}"`);
};

window.reloadCompleteInterface = async function() {
    console.log('🔄 [EXCEL-READER-COMPLETE] Recarregando interface...');
    
    try {
        // Se há dados carregados, recriar a tabela
        if (completeExcelData.length > 0) {
            const result = {
                data: completeExcelData,
                headers: exactColumnOrder,
                totalRows: completeExcelData.length,
                totalColumns: exactColumnOrder.length
            };
            
            await recreateMainTable(result);
            showNotification('✅ Sucesso', 'Interface recarregada com sucesso!', 'success');
        } else {
            // Tentar recarregar dados do Firestore
            if (window.firebase && window.firebase.firestore) {
                const snapshot = await window.firebase.firestore()
                    .collection('enderecos')
                    .limit(100)
                    .get();
                
                if (!snapshot.empty) {
                    const data = snapshot.docs.map(doc => doc.data());
                    completeExcelData = data;
                    
                    // Usar ordem padrão se disponível
                    exactColumnOrder = window.ORDEM_COLUNAS_FIXA || Object.keys(data[0] || {});
                    
                    const result = {
                        data: data,
                        headers: exactColumnOrder,
                        totalRows: data.length,
                        totalColumns: exactColumnOrder.length
                    };
                    
                    await recreateMainTable(result);
                    showNotification('✅ Carregado', `${data.length} registros carregados do Firebase`, 'success');
                } else {
                    showNotification('ℹ️ Info', 'Nenhum dado encontrado no Firebase', 'info');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao recarregar:', error);
        showNotification('❌ Erro', `Erro ao recarregar: ${error.message}`, 'error');
    }
};

// ============= CARREGAMENTO INICIAL DE DADOS =============
async function loadExistingDataOnStartup() {
    console.log('🔄 [EXCEL-READER-COMPLETE] Tentando carregar dados existentes...');
    
    try {
        // Verificar se Firebase está disponível
        if (window.firebase && window.firebase.firestore) {
            const snapshot = await window.firebase.firestore()
                .collection('enderecos')
                .limit(50)
                .get();
            
            if (!snapshot.empty) {
                const data = snapshot.docs.map(doc => doc.data());
                
                // Usar ordem padrão das colunas
                const orderedHeaders = window.ORDEM_COLUNAS_FIXA || [
                    'Projeto', 'Sub Projeto', 'Tipo de Ação', 'CONTRATO', 'Condominio',
                    'ENDEREÇO', 'Cidade', 'PEP', 'COD IMOVEL GED', 'NODE GERENCIAL',
                    'Área Técnica', 'HP', 'ANDAR', 'DATA RECEBIMENTO', 'DATA INICIO',
                    'DATA FINAL', 'EQUIPE', 'Supervisor', 'Status', 'RDO', 'BOOK',
                    'PROJETO', 'JUSTIFICATIVA', 'Observação', 'Observação'
                ];
                
                // Reordenar dados se necessário
                let processedData = data;
                if (window.reorderExcelData) {
                    const currentHeaders = Object.keys(data[0] || {});
                    const reordered = window.reorderExcelData(data, currentHeaders);
                    processedData = reordered.data;
                }
                
                // Armazenar dados globalmente
                completeExcelData = processedData;
                exactColumnOrder = orderedHeaders;
                
                const result = {
                    data: processedData,
                    headers: orderedHeaders,
                    totalRows: processedData.length,
                    totalColumns: orderedHeaders.length
                };
                
                // Criar tabela
                await recreateMainTable(result);
                
                console.log(`✅ [EXCEL-READER-COMPLETE] ${processedData.length} registros carregados na inicialização`);
            } else {
                console.log('ℹ️ [EXCEL-READER-COMPLETE] Nenhum dado encontrado no Firebase');
                showEmptyTable();
            }
        } else {
            console.warn('⚠️ [EXCEL-READER-COMPLETE] Firebase não disponível na inicialização');
            showEmptyTable();
        }
    } catch (error) {
        console.error('❌ [EXCEL-READER-COMPLETE] Erro ao carregar dados iniciais:', error);
        showEmptyTable();
    }
}

function showEmptyTable() {
    console.log('📋 [EXCEL-READER-COMPLETE] Exibindo tabela vazia');
    
    const tableBody = document.getElementById('enderecoTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="26">
                    <div class="empty-state-content">
                        <div class="empty-icon">📊</div>
                        <h3>Tabela Vazia</h3>
                        <p>Faça upload de uma planilha Excel para preencher a tabela</p>
                        <p><small>As colunas devem estar na ordem exata especificada</small></p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ============= EXPOSIÇÃO GLOBAL =============
window.completeExcelData = completeExcelData;
window.exactColumnOrder = exactColumnOrder;
window.recreateMainTable = recreateMainTable;

// ============= FUNÇÃO DE COMPATIBILIDADE PARA EVITAR ERROS =============
// Algumas partes do código podem tentar chamar esta função
window.handleExcelFileSelection = function(event) {
    console.log('⚠️ [EXCEL-READER-COMPLETE] handleExcelFileSelection chamada - redirecionando para handleCompleteExcelUpload');
    handleCompleteExcelUpload(event);
};

console.log('✅ [EXCEL-READER-COMPLETE] Sistema completo carregado com funções de limpeza e compatibilidade');