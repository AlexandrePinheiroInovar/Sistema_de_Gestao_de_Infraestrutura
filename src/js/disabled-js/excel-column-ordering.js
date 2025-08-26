// ============= SISTEMA DE ORDENAÇÃO FORÇADA DE COLUNAS EXCEL =============
console.log('📋 [EXCEL-ORDERING] Inicializando sistema de ordenação de colunas...');

// ============= ORDEM EXATA DAS COLUNAS =============
const ORDEM_COLUNAS_FIXA = [
    'Projeto',
    'Sub Projeto',
    'Tipo de Ação',
    'CONTRATO',
    'Condominio',
    'ENDEREÇO',
    'Cidade',
    'PEP',
    'COD IMOVEL GED',
    'NODE GERENCIAL',
    'Área Técnica',
    'HP',
    'ANDAR',
    'DATA RECEBIMENTO',
    'DATA INICIO',
    'DATA FINAL',
    'EQUIPE',
    'Supervisor',
    'Status',
    'RDO',
    'BOOK',
    'PROJETO',
    'JUSTIFICATIVA',
    'Observação',
    'Observação'
];

// ============= FUNÇÃO PARA REORDENAR DADOS DO EXCEL =============
function reorderExcelData(excelData, originalHeaders) {
    console.log('📋 [EXCEL-ORDERING] Reordenando dados conforme padrão...');
    console.log('Original headers:', originalHeaders);
    
    // Criar mapeamento de colunas originais para padrão
    const columnMapping = {};
    
    // Mapear colunas encontradas
    originalHeaders.forEach(originalHeader => {
        const trimmedHeader = originalHeader.trim();
        
        // Procurar correspondência exata primeiro
        const exactMatch = ORDEM_COLUNAS_FIXA.find(standardCol => 
            standardCol === trimmedHeader
        );
        
        if (exactMatch) {
            columnMapping[trimmedHeader] = exactMatch;
        } else {
            // Procurar correspondência similar (case-insensitive)
            const similarMatch = ORDEM_COLUNAS_FIXA.find(standardCol => 
                standardCol.toLowerCase() === trimmedHeader.toLowerCase()
            );
            
            if (similarMatch) {
                columnMapping[trimmedHeader] = similarMatch;
            }
        }
    });
    
    console.log('📋 [EXCEL-ORDERING] Mapeamento criado:', columnMapping);
    
    // Reordenar os dados
    const reorderedData = excelData.map(row => {
        const newRow = {};
        
        // Adicionar colunas na ordem padrão
        ORDEM_COLUNAS_FIXA.forEach((standardColumn, index) => {
            // Procurar o valor correspondente na linha original
            let value = '';
            
            // Verificar se há mapeamento direto
            const mappedColumn = Object.keys(columnMapping).find(key => 
                columnMapping[key] === standardColumn
            );
            
            if (mappedColumn && row[mappedColumn] !== undefined) {
                value = row[mappedColumn];
            } else {
                // Procurar pela coluna padrão diretamente
                if (row[standardColumn] !== undefined) {
                    value = row[standardColumn];
                }
            }
            
            // Tratar colunas duplicadas (Observação)
            if (standardColumn === 'Observação') {
                const observationCount = ORDEM_COLUNAS_FIXA.slice(0, index + 1)
                    .filter(col => col === 'Observação').length;
                
                if (observationCount === 1) {
                    newRow['Observação'] = value || '';
                } else if (observationCount === 2) {
                    newRow['Observação_2'] = value || '';
                }
            } else {
                newRow[standardColumn] = value || '';
            }
        });
        
        return newRow;
    });
    
    // Retornar headers na ordem correta
    const orderedHeaders = [...ORDEM_COLUNAS_FIXA];
    // Substituir a segunda ocorrência de 'Observação' por 'Observação_2'
    const secondObservationIndex = orderedHeaders.lastIndexOf('Observação');
    if (secondObservationIndex !== -1) {
        orderedHeaders[secondObservationIndex] = 'Observação_2';
    }
    
    console.log('📋 [EXCEL-ORDERING] Dados reordenados. Nova ordem de headers:', orderedHeaders);
    console.log('📋 [EXCEL-ORDERING] Total de linhas processadas:', reorderedData.length);
    
    return {
        data: reorderedData,
        headers: orderedHeaders,
        totalColumns: orderedHeaders.length,
        originalHeaders: originalHeaders,
        columnMapping: columnMapping
    };
}

// ============= FUNÇÃO PARA VALIDAR SE TODAS AS COLUNAS ESTÃO PRESENTES =============
function validateAllColumns(headers) {
    console.log('📋 [EXCEL-ORDERING] Validando presença de todas as colunas...');
    
    const missing = [];
    const found = [];
    
    ORDEM_COLUNAS_FIXA.forEach(requiredCol => {
        const isPresent = headers.some(header => 
            header.trim().toLowerCase() === requiredCol.toLowerCase()
        );
        
        if (isPresent) {
            found.push(requiredCol);
        } else {
            missing.push(requiredCol);
        }
    });
    
    const validation = {
        isComplete: missing.length === 0,
        found: found,
        missing: missing,
        totalRequired: ORDEM_COLUNAS_FIXA.length,
        totalFound: found.length
    };
    
    console.log('📋 [EXCEL-ORDERING] Validação:', validation);
    
    return validation;
}

// ============= FUNÇÃO PARA CRIAR TABELA COM ORDEM FIXA =============
function createOrderedTable(data, containerId) {
    console.log('📋 [EXCEL-ORDERING] Criando tabela com ordem fixa...');
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('❌ Container não encontrado:', containerId);
        return;
    }
    
    // Limpar container
    container.innerHTML = '';
    
    // Criar tabela
    const table = document.createElement('table');
    table.className = 'firebase-table ordered-table';
    table.id = 'orderedTable';
    
    // Criar cabeçalho
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Adicionar colunas na ordem exata
    ORDEM_COLUNAS_FIXA.forEach((column, index) => {
        const th = document.createElement('th');
        
        // Tratar nome da coluna para display
        let displayName = column;
        if (column === 'Observação' && index === ORDEM_COLUNAS_FIXA.lastIndexOf('Observação')) {
            displayName = 'Observação (2)';
        }
        
        th.textContent = displayName;
        th.style.cssText = `
            padding: 12px 8px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            font-weight: bold;
            text-align: left;
            white-space: nowrap;
            min-width: 120px;
            position: sticky;
            top: 0;
        `;
        th.setAttribute('data-column', column);
        th.setAttribute('data-order', index);
        headerRow.appendChild(th);
    });
    
    // Adicionar coluna de ações
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Ações';
    actionsHeader.style.cssText = `
        padding: 12px 8px;
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        font-weight: bold;
        text-align: center;
        width: 120px;
        position: sticky;
        top: 0;
    `;
    headerRow.appendChild(actionsHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Criar corpo da tabela
    const tbody = document.createElement('tbody');
    tbody.id = 'orderedTableBody';
    
    // Adicionar dados (limitados para performance)
    const displayData = data.slice(0, 100);
    
    displayData.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e0e0e0';
        
        // Adicionar colunas na ordem exata
        ORDEM_COLUNAS_FIXA.forEach((column, colIndex) => {
            const td = document.createElement('td');
            
            // Determinar valor da célula
            let value = '';
            if (column === 'Observação' && colIndex === ORDEM_COLUNAS_FIXA.lastIndexOf('Observação')) {
                value = row['Observação_2'] || '';
            } else {
                value = row[column] || '';
            }
            
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
            td.setAttribute('data-column', column);
            td.setAttribute('data-order', colIndex);
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
            <button onclick="editOrderedRecord(${rowIndex})" title="Editar" style="margin-right: 5px; padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                ✏️
            </button>
            <button onclick="deleteOrderedRecord(${rowIndex})" title="Excluir" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
                🗑️
            </button>
        `;
        tr.appendChild(actionsTd);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
    
    // Adicionar informações
    const info = document.createElement('div');
    info.style.cssText = 'margin: 10px 0; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 14px;';
    info.innerHTML = `
        📋 <strong>Tabela Ordenada:</strong><br>
        • ${data.length} linhas de dados<br>
        • ${ORDEM_COLUNAS_FIXA.length} colunas na ordem padrão<br>
        • Ordem fixa: ${ORDEM_COLUNAS_FIXA.slice(0, 5).join(', ')}...<br>
        • Exibindo primeiras 100 linhas
    `;
    
    container.insertBefore(info, table);
    
    console.log('✅ [EXCEL-ORDERING] Tabela ordenada criada com sucesso');
}

// ============= FUNÇÕES DE MANIPULAÇÃO =============
window.editOrderedRecord = function(index) {
    console.log('✏️ [EXCEL-ORDERING] Editando registro ordenado:', index);
    // Implementar edição
};

window.deleteOrderedRecord = function(index) {
    console.log('🗑️ [EXCEL-ORDERING] Excluindo registro ordenado:', index);
    // Implementar exclusão
};

// ============= EXPORTAÇÃO =============
window.reorderExcelData = reorderExcelData;
window.validateAllColumns = validateAllColumns;
window.createOrderedTable = createOrderedTable;
window.ORDEM_COLUNAS_FIXA = ORDEM_COLUNAS_FIXA;

console.log('✅ [EXCEL-ORDERING] Sistema de ordenação carregado');
console.log(`📋 [EXCEL-ORDERING] ${ORDEM_COLUNAS_FIXA.length} colunas na ordem padrão definidas`);