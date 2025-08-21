// ============= SISTEMA DE UPLOAD EXCEL PARA TABELA DE ENDEREÇOS =============
console.log('📊 [ENDERECO-EXCEL] Inicializando sistema de upload Excel para endereços...');

// ============= ORDEM EXATA DAS 25 COLUNAS =============
const COLUNAS_ENDERECO_EXATAS = [
    'Projeto',           // 1
    'Sub Projeto',       // 2
    'Tipo de Ação',      // 3
    'CONTRATO',          // 4
    'Condominio',        // 5
    'ENDEREÇO',          // 6
    'Cidade',            // 7
    'PEP',               // 8
    'COD IMOVEL GED',    // 9
    'NODE GERENCIAL',    // 10
    'Área Técnica',      // 11
    'HP',                // 12
    'ANDAR',             // 13
    'DATA RECEBIMENTO',  // 14
    'DATA INICIO',       // 15
    'DATA FINAL',        // 16
    'EQUIPE',            // 17
    'Supervisor',        // 18
    'Status',            // 19
    'RDO',               // 20
    'BOOK',              // 21
    'PROJETO',           // 22
    'JUSTIFICATIVA',     // 23
    'Observação',        // 24
    'Observação'         // 25 (segunda coluna observação)
];

// ============= VARIÁVEIS GLOBAIS =============
let dadosEndereco = [];
let totalRegistros = 0;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [ENDERECO-EXCEL] DOM carregado, configurando listeners...');
    configurarUploadExcel();
    carregarDadosExistentes();
});

function configurarUploadExcel() {
    const fileInput = document.getElementById('excelUpload');
    
    if (fileInput) {
        // Limpar listeners anteriores
        fileInput.replaceWith(fileInput.cloneNode(true));
        const newInput = document.getElementById('excelUpload');
        
        // Adicionar novo listener
        newInput.addEventListener('change', processarUploadExcel);
        console.log('✅ [ENDERECO-EXCEL] Listener configurado no input file');
    } else {
        console.warn('⚠️ [ENDERECO-EXCEL] Input file #excelUpload não encontrado');
    }
}

// ============= PROCESSAMENTO DO UPLOAD =============
async function processarUploadExcel(event) {
    const arquivo = event.target.files[0];
    
    if (!arquivo) {
        console.log('🚫 [ENDERECO-EXCEL] Nenhum arquivo selecionado');
        return;
    }
    
    console.log('📂 [ENDERECO-EXCEL] Processando arquivo:', arquivo.name);
    
    // Validar extensão
    if (!validarArquivoExcel(arquivo)) {
        mostrarNotificacao('❌ Erro', 'Selecione apenas arquivos Excel (.xlsx ou .xls)', 'error');
        return;
    }
    
    try {
        mostrarNotificacao('📊 Processando...', 'Lendo arquivo Excel...', 'info');
        
        // Ler arquivo Excel
        const dadosExcel = await lerArquivoExcel(arquivo);
        
        if (!dadosExcel || !dadosExcel.data || dadosExcel.data.length === 0) {
            throw new Error('Arquivo Excel vazio ou inválido');
        }
        
        console.log('✅ [ENDERECO-EXCEL] Arquivo lido:', {
            linhas: dadosExcel.data.length,
            colunas: dadosExcel.headers.length,
            headers: dadosExcel.headers
        });
        
        // Validar estrutura das colunas
        const validacao = validarEstruturaColunas(dadosExcel.headers);
        if (!validacao.valido) {
            throw new Error(`Estrutura de colunas inválida: ${validacao.erro}`);
        }
        
        // Mapear dados para estrutura exata
        const dadosMapeados = mapearDadosParaEstrutura(dadosExcel);
        
        // Confirmar com usuário
        const confirmar = confirm(`📊 UPLOAD DE EXCEL DETECTADO\n\n` +
            `📁 Arquivo: ${arquivo.name}\n` +
            `📋 Linhas: ${dadosMapeados.length}\n` +
            `📋 Colunas: ${COLUNAS_ENDERECO_EXATAS.length} (estrutura correta)\n\n` +
            `✅ Confirma o upload?`);
        
        if (!confirmar) {
            mostrarNotificacao('ℹ️ Cancelado', 'Upload cancelado pelo usuário', 'info');
            return;
        }
        
        // Processar e salvar dados
        await salvarDadosNaTabela(dadosMapeados);
        
        mostrarNotificacao('🎉 Sucesso!', `${dadosMapeados.length} registros importados com sucesso!`, 'success');
        
    } catch (error) {
        console.error('❌ [ENDERECO-EXCEL] Erro no upload:', error);
        mostrarNotificacao('❌ Erro', `Erro no upload: ${error.message}`, 'error');
    } finally {
        // Limpar input
        event.target.value = '';
    }
}

// ============= LEITURA DO ARQUIVO EXCEL =============
function lerArquivoExcel(arquivo) {
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
                
                // Converter para JSON preservando estrutura
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    dateNF: 'dd/mm/yyyy'
                });
                
                if (jsonData.length < 2) {
                    throw new Error('Planilha deve ter pelo menos cabeçalho e uma linha de dados');
                }
                
                // Separar headers e dados
                const headers = jsonData[0];
                const data = jsonData.slice(1).map(row => {
                    const rowObj = {};
                    headers.forEach((header, index) => {
                        rowObj[header] = row[index] || '';
                    });
                    return rowObj;
                });
                
                resolve({
                    headers: headers,
                    data: data,
                    totalRows: data.length,
                    totalColumns: headers.length
                });
                
            } catch (error) {
                console.error('❌ [ENDERECO-EXCEL] Erro ao ler Excel:', error);
                reject(new Error(`Erro ao processar Excel: ${error.message}`));
            }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(arquivo);
    });
}

// ============= VALIDAÇÃO DA ESTRUTURA =============
function validarEstruturaColunas(headers) {
    console.log('🔍 [ENDERECO-EXCEL] Validando estrutura:', headers);
    
    // Verificar quantidade de colunas
    if (headers.length !== COLUNAS_ENDERECO_EXATAS.length) {
        return {
            valido: false,
            erro: `Número incorreto de colunas. Esperado: ${COLUNAS_ENDERECO_EXATAS.length}, Encontrado: ${headers.length}`
        };
    }
    
    // Verificar ordem e nomes exatos
    for (let i = 0; i < COLUNAS_ENDERECO_EXATAS.length; i++) {
        const esperada = COLUNAS_ENDERECO_EXATAS[i];
        const encontrada = headers[i];
        
        if (esperada !== encontrada) {
            return {
                valido: false,
                erro: `Coluna ${i + 1} incorreta. Esperada: "${esperada}", Encontrada: "${encontrada}"`
            };
        }
    }
    
    console.log('✅ [ENDERECO-EXCEL] Estrutura válida!');
    return { valido: true };
}

// ============= MAPEAMENTO DE DADOS =============
function mapearDadosParaEstrutura(dadosExcel) {
    console.log('🔄 [ENDERECO-EXCEL] Mapeando dados para estrutura...');
    
    const dadosMapeados = dadosExcel.data.map((linha, index) => {
        const linhaMapeada = {};
        
        // Mapear cada coluna na ordem exata
        COLUNAS_ENDERECO_EXATAS.forEach((nomeColuna, indiceColuna) => {
            let valor = linha[nomeColuna] || '';
            
            // Tratar valores especiais
            if (typeof valor === 'string') {
                valor = valor.trim();
            }
            
            // Tratar coluna HP (deve ser número)
            if (nomeColuna === 'HP' && valor !== '') {
                valor = parseInt(valor) || 0;
            }
            
            // Tratar datas
            if (nomeColuna.includes('DATA') && valor !== '') {
                valor = formatarData(valor);
            }
            
            // Para a segunda coluna "Observação", usar chave diferente
            if (nomeColuna === 'Observação' && indiceColuna === 24) {
                linhaMapeada['Observação_2'] = valor;
            } else {
                linhaMapeada[nomeColuna] = valor;
            }
        });
        
        // Adicionar metadados
        linhaMapeada._rowIndex = index + 1;
        linhaMapeada._uploadTimestamp = new Date().toISOString();
        
        return linhaMapeada;
    });
    
    console.log('✅ [ENDERECO-EXCEL] Dados mapeados:', dadosMapeados.length);
    return dadosMapeados;
}

// ============= SALVAR NA TABELA =============
async function salvarDadosNaTabela(dados) {
    console.log('💾 [ENDERECO-EXCEL] Salvando dados na tabela...');
    
    // Armazenar dados globalmente
    dadosEndereco = dados;
    totalRegistros = dados.length;
    
    // Limpar tabela atual
    limparTabela();
    
    // Criar linhas na tabela
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        throw new Error('Corpo da tabela não encontrado');
    }
    
    // Adicionar cada linha (limitado para performance)
    const dadosParaExibir = dados.slice(0, 100); // Primeiros 100 registros
    
    dadosParaExibir.forEach((linha, index) => {
        const tr = criarLinhaTabela(linha, index);
        tbody.appendChild(tr);
    });
    
    // Atualizar estatísticas
    atualizarEstatisticas();
    
    // Salvar no Firebase (se disponível)
    await salvarNoFirebase(dados);
    
    console.log('✅ [ENDERECO-EXCEL] Dados salvos na tabela');
}

// ============= CRIAÇÃO DE LINHA DA TABELA =============
function criarLinhaTabela(dados, index) {
    const tr = document.createElement('tr');
    
    // Adicionar células para cada coluna
    COLUNAS_ENDERECO_EXATAS.forEach((nomeColuna, indiceColuna) => {
        const td = document.createElement('td');
        
        let valor = '';
        if (nomeColuna === 'Observação' && indiceColuna === 24) {
            valor = dados['Observação_2'] || '';
        } else {
            valor = dados[nomeColuna] || '';
        }
        
        td.textContent = valor;
        td.setAttribute('data-column', indiceColuna + 1);
        tr.appendChild(td);
    });
    
    // Adicionar coluna de ações
    const tdAcoes = document.createElement('td');
    tdAcoes.innerHTML = `
        <button class="action-btn btn-edit" onclick="editarRegistro(${index})" title="Editar">
            ✏️
        </button>
        <button class="action-btn btn-delete" onclick="excluirRegistro(${index})" title="Excluir">
            🗑️
        </button>
    `;
    tr.appendChild(tdAcoes);
    
    return tr;
}

// ============= FUNÇÕES AUXILIARES =============
function validarArquivoExcel(arquivo) {
    const extensoesValidas = ['.xlsx', '.xls'];
    const nomeArquivo = arquivo.name.toLowerCase();
    return extensoesValidas.some(ext => nomeArquivo.endsWith(ext));
}

function formatarData(valor) {
    if (!valor) return '';
    
    try {
        // Se já está no formato dd/mm/yyyy, retornar
        if (typeof valor === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) {
            return valor;
        }
        
        // Tentar converter para data
        const data = new Date(valor);
        if (!isNaN(data.getTime())) {
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
    } catch (error) {
        console.warn('⚠️ [ENDERECO-EXCEL] Erro ao formatar data:', valor);
    }
    
    return valor;
}

function limparTabela() {
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody) {
        tbody.innerHTML = '';
    }
}

function atualizarEstatisticas() {
    // Atualizar contadores da nova tabela
    const recordCount = document.getElementById('enderecoRecordCount');
    const lastUpdate = document.getElementById('enderecoLastUpdate');
    
    if (recordCount) {
        recordCount.textContent = `${totalRegistros} registros`;
    }
    
    if (lastUpdate) {
        const agora = new Date().toLocaleString('pt-BR');
        lastUpdate.textContent = `Atualizado em: ${agora}`;
    }
    
    // Atualizar cards de estatísticas da seção de endereços
    const statTotalRegistros = document.getElementById('statTotalRegistros');
    if (statTotalRegistros) {
        statTotalRegistros.textContent = totalRegistros;
    }
    
    // Calcular estatísticas adicionais
    if (dadosEndereco.length > 0) {
        // Endereços únicos
        const enderecosUnicos = new Set(dadosEndereco.map(item => item['ENDEREÇO'] || '').filter(e => e.trim() !== ''));
        const statEnderecosDistintos = document.getElementById('statEnderecosDistintos');
        if (statEnderecosDistintos) {
            statEnderecosDistintos.textContent = enderecosUnicos.size;
        }
        
        // Equipes únicas
        const equipesUnicas = new Set(dadosEndereco.map(item => item['EQUIPE'] || '').filter(e => e.trim() !== ''));
        const statEquipesDistintas = document.getElementById('statEquipesDistintas');
        if (statEquipesDistintas) {
            statEquipesDistintas.textContent = equipesUnicas.size;
        }
        
        // Produtividade
        const produtivos = dadosEndereco.filter(item => (item['Status'] || '').toUpperCase() === 'PRODUTIVA').length;
        const produtividade = totalRegistros > 0 ? Math.round((produtivos / totalRegistros) * 100) : 0;
        const statProdutividade = document.getElementById('statProdutividade');
        if (statProdutividade) {
            statProdutividade.textContent = `${produtividade}%`;
        }
    }
}

async function salvarNoFirebase(dados) {
    try {
        if (window.firebase && window.firebase.firestore) {
            console.log('💾 [ENDERECO-EXCEL] Salvando no Firebase...');
            
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            // Salvar em lotes
            const BATCH_SIZE = 25;
            let salvosCount = 0;
            
            for (let i = 0; i < dados.length; i += BATCH_SIZE) {
                // Criar novo batch para cada lote
                const batch = firebase.firestore().batch();
                const lote = dados.slice(i, i + BATCH_SIZE);
                
                lote.forEach(registro => {
                    const docData = {
                        ...registro,
                        createdAt: timestamp,
                        source: 'endereco_excel_upload',
                        columnCount: COLUNAS_ENDERECO_EXATAS.length
                    };
                    
                    const docRef = firebase.firestore().collection('enderecos').doc();
                    batch.set(docRef, docData);
                    salvosCount++;
                });
                
                // Commit do batch atual
                await batch.commit();
                console.log(`✅ [ENDERECO-EXCEL] Lote ${Math.floor(i/BATCH_SIZE) + 1} salvo no Firebase (${lote.length} registros)`);
                
                // Pausa entre lotes para evitar throttling
                if (i + BATCH_SIZE < dados.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            console.log(`🎉 [ENDERECO-EXCEL] ${salvosCount} registros salvos no Firebase`);
        }
    } catch (error) {
        console.error('❌ [ENDERECO-EXCEL] Erro ao salvar no Firebase:', error);
        throw error; // Re-throw para que o caller possa tratar
    }
}

// ============= CARREGAMENTO DE DADOS EXISTENTES =============
async function carregarDadosExistentes() {
    console.log('📥 [ENDERECO-EXCEL] Carregando dados existentes do Firestore...');
    
    try {
        if (window.firebase && window.firebase.firestore) {
            const snapshot = await firebase.firestore().collection('enderecos')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();
            
            if (!snapshot.empty) {
                const dadosCarregados = [];
                
                snapshot.forEach(doc => {
                    const dados = doc.data();
                    dados._id = doc.id; // Adicionar ID do documento
                    dadosCarregados.push(dados);
                });
                
                console.log('✅ [ENDERECO-EXCEL] Dados carregados:', dadosCarregados.length);
                
                // Armazenar dados globalmente
                dadosEndereco = dadosCarregados;
                totalRegistros = dadosCarregados.length;
                
                // Atualizar tabela
                await exibirDadosNaTabela(dadosCarregados);
                
                // Atualizar estatísticas
                atualizarEstatisticas();
            } else {
                console.log('ℹ️ [ENDERECO-EXCEL] Nenhum dado encontrado no Firestore');
                verificarEstadoTabela();
            }
        } else {
            console.warn('⚠️ [ENDERECO-EXCEL] Firebase não disponível, aguardando...');
            // Tentar novamente em 2 segundos
            setTimeout(carregarDadosExistentes, 2000);
        }
    } catch (error) {
        console.error('❌ [ENDERECO-EXCEL] Erro ao carregar dados:', error);
        verificarEstadoTabela();
    }
}

async function exibirDadosNaTabela(dados) {
    console.log('📊 [ENDERECO-EXCEL] Exibindo dados na tabela...');
    
    // Limpar tabela atual
    limparTabela();
    
    // Criar linhas na tabela
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        throw new Error('Corpo da tabela não encontrado');
    }
    
    // Adicionar cada linha (limitado para performance)
    const dadosParaExibir = dados.slice(0, 100); // Primeiros 100 registros
    
    dadosParaExibir.forEach((linha, index) => {
        const tr = criarLinhaTabela(linha, index);
        tbody.appendChild(tr);
    });
    
    console.log('✅ [ENDERECO-EXCEL] Dados exibidos na tabela');
}

// ============= FUNÇÃO DE RECARREGAMENTO =============
async function recarregarTabela() {
    console.log('🔄 [ENDERECO-EXCEL] Recarregando tabela...');
    
    try {
        mostrarNotificacao('🔄 Atualizando...', 'Carregando dados mais recentes...', 'info');
        await carregarDadosExistentes();
        mostrarNotificacao('✅ Atualizado!', 'Tabela atualizada com sucesso', 'success');
    } catch (error) {
        console.error('❌ [ENDERECO-EXCEL] Erro ao recarregar:', error);
        mostrarNotificacao('❌ Erro', `Erro ao atualizar: ${error.message}`, 'error');
    }
}

function verificarEstadoTabela() {
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody && tbody.children.length === 0) {
        // Mostrar estado vazio
        tbody.innerHTML = `
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

// ============= FUNÇÕES DE AÇÃO =============
window.editarRegistro = function(index) {
    console.log('✏️ [ENDERECO-EXCEL] Editando registro:', index);
    // Implementar edição
    alert('Função de edição será implementada em breve');
};

window.excluirRegistro = function(index) {
    console.log('🗑️ [ENDERECO-EXCEL] Excluindo registro:', index);
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        // Remover do array
        dadosEndereco.splice(index, 1);
        totalRegistros--;
        
        // Recriar tabela
        salvarDadosNaTabela(dadosEndereco);
        
        mostrarNotificacao('✅ Sucesso', 'Registro excluído com sucesso', 'success');
    }
};

// ============= FUNÇÃO DE NOTIFICAÇÃO =============
function mostrarNotificacao(titulo, mensagem, tipo) {
    if (window.showCustomNotification) {
        window.showCustomNotification(titulo, mensagem, tipo);
    } else {
        alert(`${titulo}: ${mensagem}`);
    }
}

// ============= EXPORTAÇÃO GLOBAL =============
window.COLUNAS_ENDERECO_EXATAS = COLUNAS_ENDERECO_EXATAS;
window.dadosEndereco = dadosEndereco;
window.processarUploadExcel = processarUploadExcel;
window.recarregarTabela = recarregarTabela;
window.carregarDadosExistentes = carregarDadosExistentes;

// ============= FUNÇÃO GLOBAL DE RECARREGAMENTO =============
window.reloadCompleteInterface = function() {
    console.log('🔄 [ENDERECO-EXCEL] Recarregando interface completa...');
    recarregarTabela();
};

console.log('✅ [ENDERECO-EXCEL] Sistema de upload Excel para endereços carregado');
console.log(`📋 [ENDERECO-EXCEL] Configurado para ${COLUNAS_ENDERECO_EXATAS.length} colunas exatas`);