// ============= SISTEMA PADRÃO DE TEMPLATE EXCEL =============
console.log('📋 [EXCEL-TEMPLATE] Inicializando sistema de template padrão...');

// ============= COLUNAS PADRÃO EXATAS - ORDEM FIXA =============
const STANDARD_COLUMNS = [
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

// ============= MAPEAMENTO DE VALIDAÇÃO =============
const COLUMN_VALIDATION = {
    'Projeto': { required: true, type: 'text', maxLength: 50 },
    'Sub Projeto': { required: false, type: 'text', maxLength: 50 },
    'Tipo de Ação': { required: true, type: 'select', options: ['Vistoria', 'Construção', 'Ativação', 'Manutenção'] },
    'CONTRATO': { required: false, type: 'text', maxLength: 30 },
    'Condominio': { required: false, type: 'text', maxLength: 100 },
    'ENDEREÇO': { required: true, type: 'text', maxLength: 200 },
    'Cidade': { required: true, type: 'text', maxLength: 50 },
    'PEP': { required: false, type: 'text', maxLength: 20 },
    'COD IMOVEL GED': { required: false, type: 'text', maxLength: 30 },
    'NODE GERENCIAL': { required: false, type: 'text', maxLength: 30 },
    'Área Técnica': { required: false, type: 'text', maxLength: 50 },
    'HP': { required: false, type: 'number', min: 0, max: 999 },
    'ANDAR': { required: false, type: 'text', maxLength: 10 },
    'DATA RECEBIMENTO': { required: false, type: 'date', format: 'dd/mm/yyyy' },
    'DATA INICIO': { required: false, type: 'date', format: 'dd/mm/yyyy' },
    'DATA FINAL': { required: false, type: 'date', format: 'dd/mm/yyyy' },
    'EQUIPE': { required: true, type: 'text', maxLength: 50 },
    'Supervisor': { required: true, type: 'text', maxLength: 50 },
    'Status': { required: true, type: 'select', options: ['Pendente', 'Em Andamento', 'Concluído', 'Cancelado'] },
    'RDO': { required: false, type: 'text', maxLength: 20 },
    'BOOK': { required: false, type: 'text', maxLength: 20 },
    'PROJETO': { required: false, type: 'text', maxLength: 50 },
    'JUSTIFICATIVA': { required: false, type: 'text', maxLength: 500 },
    'Observação': { required: false, type: 'text', maxLength: 500 }
};

// ============= FUNÇÕES DE TEMPLATE =============
function generateStandardTemplate() {
    console.log('📄 [EXCEL-TEMPLATE] Gerando template padrão...');
    
    try {
        // Criar dados de exemplo preservando ordem exata
        const templateData = [];
        
        // Linha de exemplo com todas as colunas na ordem correta
        const exemploLinha = {};
        STANDARD_COLUMNS.forEach((coluna, index) => {
            switch(coluna) {
                case 'Projeto': 
                    exemploLinha[coluna] = 'CLARO FIBRA';
                    break;
                case 'Sub Projeto': 
                    exemploLinha[coluna] = 'Expansão Residencial';
                    break;
                case 'Tipo de Ação': 
                    exemploLinha[coluna] = 'Vistoria';
                    break;
                case 'CONTRATO': 
                    exemploLinha[coluna] = 'CT-2024-001';
                    break;
                case 'Condominio': 
                    exemploLinha[coluna] = 'Edifício Sol Nascente';
                    break;
                case 'ENDEREÇO': 
                    exemploLinha[coluna] = 'Rua das Flores, 123 - Centro';
                    break;
                case 'Cidade': 
                    exemploLinha[coluna] = 'São Paulo';
                    break;
                case 'PEP': 
                    exemploLinha[coluna] = 'PEP001';
                    break;
                case 'COD IMOVEL GED': 
                    exemploLinha[coluna] = 'GED123456';
                    break;
                case 'NODE GERENCIAL': 
                    exemploLinha[coluna] = 'NODE-SP-01';
                    break;
                case 'Área Técnica': 
                    exemploLinha[coluna] = 'Infraestrutura';
                    break;
                case 'HP': 
                    exemploLinha[coluna] = '50';
                    break;
                case 'ANDAR': 
                    exemploLinha[coluna] = '5º';
                    break;
                case 'DATA RECEBIMENTO': 
                    exemploLinha[coluna] = '01/08/2024';
                    break;
                case 'DATA INICIO': 
                    exemploLinha[coluna] = '05/08/2024';
                    break;
                case 'DATA FINAL': 
                    exemploLinha[coluna] = '10/08/2024';
                    break;
                case 'EQUIPE': 
                    exemploLinha[coluna] = 'Alpha Team';
                    break;
                case 'Supervisor': 
                    exemploLinha[coluna] = 'João Silva';
                    break;
                case 'Status': 
                    exemploLinha[coluna] = 'Em Andamento';
                    break;
                case 'RDO': 
                    exemploLinha[coluna] = 'RDO001';
                    break;
                case 'BOOK': 
                    exemploLinha[coluna] = 'BOOK001';
                    break;
                case 'PROJETO': 
                    exemploLinha[coluna] = 'PROJETO PRINCIPAL';
                    break;
                case 'JUSTIFICATIVA': 
                    exemploLinha[coluna] = 'Vistoria para instalação de nova infraestrutura';
                    break;
                case 'Observação': 
                    if (index === STANDARD_COLUMNS.lastIndexOf('Observação')) {
                        exemploLinha[coluna + '_2'] = 'Cliente disponível manhãs';
                    } else {
                        exemploLinha[coluna] = 'Primeiro acesso realizado';
                    }
                    break;
                default:
                    exemploLinha[coluna] = '';
            }
        });
        
        templateData.push(exemploLinha);

        // Criar workbook
        const workbook = XLSX.utils.book_new();
        
        // Criar worksheet
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Configurar larguras das colunas otimizadas
        const columnWidths = STANDARD_COLUMNS.map(column => {
            switch(column) {
                case 'ENDEREÇO': return { wch: 40 };
                case 'Condominio': return { wch: 35 };
                case 'JUSTIFICATIVA': return { wch: 50 };
                case 'Observação': return { wch: 30 };
                case 'Projeto': return { wch: 25 };
                case 'Sub Projeto': return { wch: 25 };
                case 'EQUIPE': return { wch: 20 };
                case 'Supervisor': return { wch: 20 };
                case 'Cidade': return { wch: 18 };
                case 'Tipo de Ação': return { wch: 15 };
                case 'DATA RECEBIMENTO':
                case 'DATA INICIO':
                case 'DATA FINAL': return { wch: 15 };
                case 'COD IMOVEL GED':
                case 'NODE GERENCIAL': return { wch: 15 };
                case 'Área Técnica': return { wch: 15 };
                case 'CONTRATO': return { wch: 12 };
                case 'Status': return { wch: 12 };
                case 'PEP': return { wch: 10 };
                case 'ANDAR':
                case 'HP': return { wch: 8 };
                default: return { wch: 12 };
            }
        });
        
        worksheet['!cols'] = columnWidths;
        
        // Adicionar comentários nas células do cabeçalho
        addHeaderComments(worksheet);
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cadastro Padrão');
        
        // Gerar e baixar arquivo
        const fileName = `Template_Sala_Tecnica_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        console.log('✅ [EXCEL-TEMPLATE] Template gerado:', fileName);
        
        showTemplateNotification('✅ Template Gerado!', 
            `Template padrão criado com ${STANDARD_COLUMNS.length} colunas.\nArquivo: ${fileName}`, 
            'success'
        );
        
        return true;
        
    } catch (error) {
        console.error('❌ [EXCEL-TEMPLATE] Erro ao gerar template:', error);
        showTemplateNotification('❌ Erro', 
            `Erro ao gerar template: ${error.message}`, 
            'error'
        );
        return false;
    }
}

function addHeaderComments(worksheet) {
    // Adicionar comentários informativos nas células importantes
    const comments = {
        'A1': 'Nome do projeto principal (obrigatório)',
        'B1': 'Sub divisão do projeto (opcional)',
        'C1': 'Tipo da ação a ser executada (obrigatório)',
        'F1': 'Endereço completo do local (obrigatório)',
        'G1': 'Cidade onde será executado (obrigatório)',
        'Q1': 'Nome da equipe responsável (obrigatório)',
        'R1': 'Nome do supervisor (obrigatório)',
        'S1': 'Status atual do trabalho (obrigatório)'
    };
    
    Object.entries(comments).forEach(([cell, comment]) => {
        if (!worksheet[cell]) worksheet[cell] = { v: '', t: 's' };
        if (!worksheet[cell].c) worksheet[cell].c = [];
        worksheet[cell].c.push({
            a: 'Sistema',
            t: comment
        });
    });
}

// ============= VALIDAÇÃO DE UPLOAD =============
function validateUploadAgainstStandard(excelData, headers) {
    console.log('🔍 [EXCEL-TEMPLATE] Validando upload contra padrão...');
    
    const validationResults = {
        isValid: true,
        warnings: [],
        errors: [],
        mappingSuggestions: {}
    };
    
    // 1. Verificar se todas as colunas essenciais estão presentes
    const essentialColumns = STANDARD_COLUMNS.filter(col => 
        COLUMN_VALIDATION[col]?.required === true
    );
    
    essentialColumns.forEach(essentialCol => {
        const found = headers.find(header => 
            header.toLowerCase().trim() === essentialCol.toLowerCase().trim()
        );
        
        if (!found) {
            // Procurar possível correspondência
            const possibleMatch = findSimilarColumn(essentialCol, headers);
            if (possibleMatch) {
                validationResults.mappingSuggestions[essentialCol] = possibleMatch;
                validationResults.warnings.push(
                    `Coluna '${essentialCol}' não encontrada. Sugestão: usar '${possibleMatch}'`
                );
            } else {
                validationResults.errors.push(
                    `Coluna obrigatória '${essentialCol}' não encontrada`
                );
                validationResults.isValid = false;
            }
        }
    });
    
    // 2. Verificar colunas extras não padronizadas
    const extraColumns = headers.filter(header => 
        !STANDARD_COLUMNS.some(standardCol => 
            standardCol.toLowerCase().trim() === header.toLowerCase().trim()
        )
    );
    
    if (extraColumns.length > 0) {
        validationResults.warnings.push(
            `Colunas não padronizadas encontradas: ${extraColumns.join(', ')}`
        );
    }
    
    // 3. Validar tipos de dados das primeiras linhas
    if (excelData && excelData.length > 0) {
        validateDataTypes(excelData.slice(0, 5), validationResults);
    }
    
    console.log('📊 [EXCEL-TEMPLATE] Validação concluída:', validationResults);
    
    return validationResults;
}

function findSimilarColumn(targetColumn, availableColumns) {
    const target = targetColumn.toLowerCase();
    
    // Mapeamentos de similaridade
    const similarities = {
        'projeto': ['project', 'proj', 'projetos'],
        'sub projeto': ['subprojeto', 'sub-projeto', 'subproject'],
        'tipo de ação': ['tipo', 'acao', 'ação', 'action', 'tipo_acao'],
        'endereço': ['endereco', 'address', 'logradouro'],
        'cidade': ['city', 'municipio', 'município'],
        'equipe': ['team', 'grupo', 'equipa'],
        'supervisor': ['responsavel', 'responsável', 'lider', 'líder']
    };
    
    for (const column of availableColumns) {
        const columnLower = column.toLowerCase();
        
        // Correspondência exata
        if (columnLower === target) return column;
        
        // Correspondência por similaridade
        const targetSimilars = similarities[target];
        if (targetSimilars && targetSimilars.some(sim => columnLower.includes(sim))) {
            return column;
        }
    }
    
    return null;
}

function validateDataTypes(sampleData, validationResults) {
    sampleData.forEach((row, rowIndex) => {
        Object.entries(row).forEach(([column, value]) => {
            const validation = COLUMN_VALIDATION[column];
            if (!validation || !value) return;
            
            const lineRef = `Linha ${rowIndex + 2}`;
            
            switch (validation.type) {
                case 'date':
                    if (value && !isValidDate(value)) {
                        validationResults.warnings.push(
                            `${lineRef}, coluna '${column}': Formato de data inválido '${value}'. Use dd/mm/yyyy`
                        );
                    }
                    break;
                    
                case 'number':
                    if (value && isNaN(Number(value))) {
                        validationResults.warnings.push(
                            `${lineRef}, coluna '${column}': Valor numérico inválido '${value}'`
                        );
                    }
                    break;
                    
                case 'select':
                    if (value && validation.options && !validation.options.includes(value)) {
                        validationResults.warnings.push(
                            `${lineRef}, coluna '${column}': Valor '${value}' não está entre as opções válidas: ${validation.options.join(', ')}`
                        );
                    }
                    break;
            }
            
            // Verificar comprimento máximo
            if (validation.maxLength && String(value).length > validation.maxLength) {
                validationResults.warnings.push(
                    `${lineRef}, coluna '${column}': Texto muito longo (${String(value).length}/${validation.maxLength} caracteres)`
                );
            }
        });
    });
}

function isValidDate(dateString) {
    if (typeof dateString !== 'string') return false;
    
    const brazilianDatePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    return brazilianDatePattern.test(dateString);
}

// ============= INTERFACE =============
function showValidationResults(validationResults) {
    let message = '📋 VALIDAÇÃO DO UPLOAD\n\n';
    
    if (validationResults.isValid) {
        message += '✅ Upload está em conformidade com o padrão!\n\n';
    } else {
        message += '❌ Upload possui problemas que precisam ser corrigidos!\n\n';
    }
    
    if (validationResults.errors.length > 0) {
        message += '🚨 ERROS:\n';
        validationResults.errors.forEach(error => {
            message += `• ${error}\n`;
        });
        message += '\n';
    }
    
    if (validationResults.warnings.length > 0) {
        message += '⚠️ AVISOS:\n';
        validationResults.warnings.slice(0, 5).forEach(warning => {
            message += `• ${warning}\n`;
        });
        if (validationResults.warnings.length > 5) {
            message += `... e mais ${validationResults.warnings.length - 5} avisos\n`;
        }
        message += '\n';
    }
    
    if (Object.keys(validationResults.mappingSuggestions).length > 0) {
        message += '💡 SUGESTÕES DE MAPEAMENTO:\n';
        Object.entries(validationResults.mappingSuggestions).forEach(([standard, suggested]) => {
            message += `• '${standard}' → '${suggested}'\n`;
        });
    }
    
    showTemplateNotification(
        validationResults.isValid ? '✅ Validação OK' : '⚠️ Validação',
        message,
        validationResults.isValid ? 'success' : 'warning'
    );
    
    return validationResults.isValid || confirm(
        message + '\n\nDeseja continuar mesmo com os problemas identificados?'
    );
}

// ============= BOTÃO DE TEMPLATE =============
function addTemplateButton() {
    console.log('🔘 [EXCEL-TEMPLATE] Adicionando botão de template...');
    
    const uploadSection = document.querySelector('.upload-section, .file-upload-section');
    if (!uploadSection) {
        console.warn('⚠️ [EXCEL-TEMPLATE] Seção de upload não encontrada');
        return;
    }
    
    // Verificar se botão já existe
    if (document.getElementById('downloadTemplateBtn')) {
        console.log('✅ [EXCEL-TEMPLATE] Botão já existe');
        return;
    }
    
    const templateButton = document.createElement('button');
    templateButton.id = 'downloadTemplateBtn';
    templateButton.className = 'btn btn-outline-primary';
    templateButton.style.cssText = `
        margin-left: 10px;
        padding: 8px 16px;
        border: 2px solid #007bff;
        background: white;
        color: #007bff;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
    `;
    
    templateButton.innerHTML = `
        <span style="margin-right: 5px;">📋</span>
        Baixar Template Padrão
    `;
    
    templateButton.addEventListener('mouseenter', () => {
        templateButton.style.backgroundColor = '#007bff';
        templateButton.style.color = 'white';
    });
    
    templateButton.addEventListener('mouseleave', () => {
        templateButton.style.backgroundColor = 'white';
        templateButton.style.color = '#007bff';
    });
    
    templateButton.addEventListener('click', () => {
        console.log('🖱️ [EXCEL-TEMPLATE] Botão clicado');
        generateStandardTemplate();
    });
    
    // Adicionar após o botão de upload
    const uploadButton = uploadSection.querySelector('button, .btn-upload, input[type="file"]');
    if (uploadButton) {
        uploadButton.parentNode.insertBefore(templateButton, uploadButton.nextSibling);
    } else {
        uploadSection.appendChild(templateButton);
    }
    
    console.log('✅ [EXCEL-TEMPLATE] Botão de template adicionado');
}

// ============= UTILITÁRIAS =============
function showTemplateNotification(title, message, type) {
    if (window.showCustomNotification) {
        window.showCustomNotification(title, message, type);
    } else if (window.showNotification) {
        window.showNotification(title, message, type);
    } else {
        alert(`${title}:\n\n${message}`);
    }
}

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addTemplateButton();
    }, 2000);
});

// ============= INTEGRAÇÃO COM SISTEMA EXISTENTE =============
// Substituir função de validação no sistema principal
if (window.handleCompleteExcelUpload) {
    const originalHandler = window.handleCompleteExcelUpload;
    
    window.handleCompleteExcelUpload = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Ler arquivo primeiro para validação
            const result = await readCompleteExcelFile(file);
            
            // Validar contra padrão
            const validation = validateUploadAgainstStandard(result.data, result.headers);
            
            // Mostrar resultados da validação
            const proceed = showValidationResults(validation);
            
            if (proceed) {
                // Chamar handler original se validação passou ou usuário aceitou
                return originalHandler.call(this, event);
            } else {
                event.target.value = '';
                return;
            }
            
        } catch (error) {
            console.error('❌ [EXCEL-TEMPLATE] Erro na validação:', error);
            showTemplateNotification('❌ Erro', `Erro na validação: ${error.message}`, 'error');
            event.target.value = '';
        }
    };
}

// ============= EXPORTAÇÃO =============
window.STANDARD_COLUMNS = STANDARD_COLUMNS;
window.COLUMN_VALIDATION = COLUMN_VALIDATION;
window.generateStandardTemplate = generateStandardTemplate;
window.validateUploadAgainstStandard = validateUploadAgainstStandard;

console.log('✅ [EXCEL-TEMPLATE] Sistema de template padrão carregado');
console.log(`📋 [EXCEL-TEMPLATE] ${STANDARD_COLUMNS.length} colunas padrão definidas`);