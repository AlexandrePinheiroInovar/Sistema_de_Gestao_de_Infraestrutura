// ============= SISTEMA DE UPLOAD EXCEL PARA TABELA DE ENDEREÇOS =============
console.log('📊 [ENDERECO-EXCEL] Inicializando sistema de upload Excel para endereços...');

// ============= ORDEM EXATA DAS 25 COLUNAS =============
const COLUNAS_ENDERECO_EXATAS = [
    'Projeto', // 1
    'Sub Projeto', // 2
    'Tipo de Ação', // 3
    'CONTRATO', // 4
    'Condominio', // 5
    'ENDEREÇO', // 6
    'Cidade', // 7
    'PEP', // 8
    'COD IMOVEL GED', // 9
    'NODE GERENCIAL', // 10
    'Área Técnica', // 11
    'HP', // 12
    'ANDAR', // 13
    'DATA RECEBIMENTO', // 14
    'DATA INICIO', // 15
    'DATA FINAL', // 16
    'EQUIPE', // 17
    'Supervisor', // 18
    'Status', // 19
    'RDO', // 20
    'BOOK', // 21
    'PROJETO', // 22
    'JUSTIFICATIVA', // 23
    'Observação', // 24
    'Observação' // 25 (segunda coluna observação)
];

// ============= VARIÁVEIS GLOBAIS =============
let dadosEndereco = [];
let totalRegistros = 0;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 [ENDERECO-EXCEL] DOM carregado, configurando listeners...');

    // Aguardar XLSX carregar se necessário
    function inicializar() {
        if (typeof XLSX === 'undefined') {
            console.warn('⚠️ [ENDERECO-EXCEL] Aguardando biblioteca XLSX carregar...');
            setTimeout(inicializar, 500);
            return;
        }

        console.log('✅ [ENDERECO-EXCEL] XLSX carregado, iniciando sistema...');
        configurarUploadExcel();
        carregarDadosExistentes();
    }

    inicializar();
});

function configurarUploadExcel() {
    // Tentar ambos os IDs possíveis
    let fileInput = document.getElementById('novoExcelUpload') || document.getElementById('excelUpload');
    
    if (fileInput) {
        console.log('✅ [ENDERECO-EXCEL] Input encontrado:', fileInput.id);
        // Limpar listeners anteriores
        fileInput.replaceWith(fileInput.cloneNode(true));
        const newInput = document.getElementById(fileInput.id);

        // Adicionar novo listener
        newInput.addEventListener('change', processarUploadExcel);
        console.log('✅ [ENDERECO-EXCEL] Listener configurado no input file:', fileInput.id);
    } else {
        console.warn('⚠️ [ENDERECO-EXCEL] Input file não encontrado (tentou: #novoExcelUpload, #excelUpload)');
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
        const confirmar = confirm(
            `📊 UPLOAD DE EXCEL DETECTADO\n\n` +
                `📁 Arquivo: ${arquivo.name}\n` +
                `📋 Linhas: ${dadosMapeados.length}\n` +
                `📋 Colunas: ${COLUNAS_ENDERECO_EXATAS.length} (estrutura correta)\n\n` +
                `✅ Confirma o upload?`
        );

        if (!confirmar) {
            mostrarNotificacao('ℹ️ Cancelado', 'Upload cancelado pelo usuário', 'info');
            return;
        }

        // Processar e salvar dados
        await salvarDadosNaTabela(dadosMapeados);

        // Garantir que dados aparecem na tabela
        console.log('🔍 [ENDERECO-EXCEL] Forçando atualização da tabela...');
        await exibirDadosNaTabela(dadosMapeados);

        mostrarNotificacao(
            '🎉 Sucesso!',
            `${dadosMapeados.length} registros importados com sucesso!`,
            'success'
        );
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

        reader.onload = function (e) {
            try {
                // Verificar se XLSX está disponível
                if (typeof XLSX === 'undefined') {
                    throw new Error(
                        'Biblioteca XLSX não carregada. Aguarde alguns segundos e tente novamente.'
                    );
                }

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
                console.log('🔥 [EXCEL-DEBUG] Total de linhas no Excel (incluindo cabeçalho):', jsonData.length);
                console.log('🔥 [EXCEL-DEBUG] Headers encontrados no Excel:', headers);
                console.log('🔥 [EXCEL-DEBUG] Total de colunas:', headers.length);
                console.log('🔥 [EXCEL-DEBUG] Primeira linha de dados:', jsonData[1]);
                
                const processedData = jsonData
                    .slice(1)
                    .filter((row, index) => {
                        // Filtro mais permissivo - aceitar linhas que tenham pelo menos 1 campo não vazio
                        const hasValidData = row && Array.isArray(row) && row.some(cell => 
                            cell !== undefined && cell !== null && String(cell).trim() !== ''
                        );
                        
                        if (!hasValidData && index < 10) {
                            console.log(`⚠️ [ENDERECO-EXCEL] Linha ${index + 2} filtrada:`, row);
                        }
                        
                        return hasValidData;
                    }) // Filtrar linhas válidas
                    .map(row => {
                        const rowObj = {};
                        headers.forEach((header, index) => {
                            // Garantir que row[index] existe e tratar valores undefined/null
                            const value =
                                row && row[index] !== undefined && row[index] !== null
                                    ? row[index]
                                    : '';
                            rowObj[header] = String(value).trim();
                        });
                        return rowObj;
                    });

                console.log('✅ [ENDERECO-EXCEL] Processamento concluído:', {
                    totalLinhas: jsonData.length - 1,
                    linhasValidas: processedData.length,
                    colunas: headers.length
                });

                resolve({
                    headers: headers,
                    data: processedData,
                    totalRows: processedData.length,
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
    console.log('🔍 [ENDERECO-EXCEL] Validando estrutura:', {
        headersEncontrados: headers,
        headersEsperados: COLUNAS_ENDERECO_EXATAS.slice(0, 10),
        totalEncontrados: headers.length,
        totalEsperados: COLUNAS_ENDERECO_EXATAS.length
    });

    // VALIDAÇÃO MAIS FLEXÍVEL - aceitar planilhas com estrutura similar
    
    // Verificar se existe pelo menos a coluna ENDEREÇO
    const temEndereco = headers.some(header => 
        header && (header.includes('ENDEREÇO') || header.includes('ENDERECO'))
    );

    if (!temEndereco) {
        return {
            valido: false,
            erro: 'Coluna ENDEREÇO não encontrada'
        };
    }

    // Só alertar sobre diferenças, mas não bloquear
    for (let i = 0; i < Math.min(headers.length, COLUNAS_ENDERECO_EXATAS.length); i++) {
        const esperada = COLUNAS_ENDERECO_EXATAS[i];
        const encontrada = headers[i];

        if (esperada !== encontrada) {
            console.warn(`⚠️ [ENDERECO-EXCEL] Coluna ${i + 1} diferente: Esperada "${esperada}", Encontrada "${encontrada}"`);
        }
    }

    console.log('✅ [ENDERECO-EXCEL] Estrutura válida!');
    return { valido: true };
}

// ============= MAPEAMENTO DE DADOS =============
function mapearDadosParaEstrutura(dadosExcel) {
    console.log('🔄 [ENDERECO-EXCEL] Mapeando dados para estrutura...', {
        totalRegistros: dadosExcel.data.length,
        totalColunas: dadosExcel.headers.length,
        primeirasLinhas: dadosExcel.data.slice(0, 3)
    });

    const dadosMapeados = dadosExcel.data.map((linha, index) => {
        const linhaMapeada = {};

        // DEBUG: mostrar estrutura da linha para os primeiros registros
        if (index < 3) {
            console.log(`🔍 [DEBUG] Linha ${index + 1}:`, {
                keysDisponíveis: Object.keys(linha),
                valores: linha,
                colunasEsperadas: COLUNAS_ENDERECO_EXATAS.slice(0, 5)
            });
        }

        // COPIAR TUDO BRUTALMENTE - SEM QUALQUER FILTRO
        console.log(`🔥 [DEBUG-BRUTAL] Linha ${index + 1} - Headers disponíveis:`, dadosExcel.headers);
        console.log(`🔥 [DEBUG-BRUTAL] Linha ${index + 1} - Dados da linha:`, linha);
        
        // Copiar CADA campo individualmente
        for (const headerReal of dadosExcel.headers) {
            const valor = linha[headerReal];
            linhaMapeada[headerReal] = valor;
            
            // Log de CADA campo para primeira linha
            if (index === 0) {
                console.log(`🔥 [COPIANDO] "${headerReal}" = "${valor}"`);
            }
        }
        
        // Também copiar TUDO que existe no objeto linha (caso existam campos extras)
        for (const chave in linha) {
            if (linha.hasOwnProperty(chave)) {
                linhaMapeada[chave] = linha[chave];
                if (index === 0) {
                    console.log(`🔥 [EXTRA] "${chave}" = "${linha[chave]}"`);
                }
            }
        }

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

    // Processar TODOS os registros sem limite
    const dadosParaExibir = dados; // TODOS os registros sem limite

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

    // DEBUG para primeira linha
    if (index === 0) {
        console.log('🔍 [CRIAR-LINHA] Dados disponíveis:', {
            keys: Object.keys(dados),
            primeiros5Valores: Object.fromEntries(Object.entries(dados).slice(0, 5))
        });
    }

    // Buscar por todas as chaves disponíveis nos dados
    const keys = Object.keys(dados).filter(key => !key.startsWith('_')); // Excluir metadados
    
    // Criar células para TODAS as chaves encontradas
    keys.forEach((key, indiceColuna) => {
        const td = document.createElement('td');
        
        let valor = dados[key] || '';
        
        // Formatação básica do valor
        if (typeof valor === 'object') {
            valor = JSON.stringify(valor);
        } else if (valor === null || valor === undefined) {
            valor = '';
        } else {
            valor = String(valor);
        }

        td.textContent = valor;
        td.setAttribute('data-column', indiceColuna + 1);
        td.title = `${key}: ${valor}`; // Tooltip com nome da coluna
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
    if (!valor) {
        return '';
    }

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
        const enderecosUnicos = new Set(
            dadosEndereco.map(item => item['ENDEREÇO'] || '').filter(e => e.trim() !== '')
        );
        const statEnderecosDistintos = document.getElementById('statEnderecosDistintos');
        if (statEnderecosDistintos) {
            statEnderecosDistintos.textContent = enderecosUnicos.size;
        }

        // Equipes únicas
        const equipesUnicas = new Set(
            dadosEndereco.map(item => item['EQUIPE'] || '').filter(e => e.trim() !== '')
        );
        const statEquipesDistintas = document.getElementById('statEquipesDistintas');
        if (statEquipesDistintas) {
            statEquipesDistintas.textContent = equipesUnicas.size;
        }

        // Produtividade
        const produtivos = dadosEndereco.filter(
            item => (item['Status'] || '').toUpperCase() === 'PRODUTIVA'
        ).length;
        const produtividade =
            totalRegistros > 0 ? Math.round((produtivos / totalRegistros) * 100) : 0;
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
            const userId = firebase.auth().currentUser?.uid || 'anonymous';

            // Salvar em lotes
            const BATCH_SIZE = 25;
            let salvosCount = 0;

            for (let i = 0; i < dados.length; i += BATCH_SIZE) {
                // Criar novo batch para cada lote
                const batch = firebase.firestore().batch();
                const lote = dados.slice(i, i + BATCH_SIZE);

                lote.forEach(registro => {
                    // LOG COMPLETO DOS DADOS ORIGINAIS PARA DEBUG
                    if (salvosCount === 0) {
                        console.log('🔥 [EXCEL-UPLOAD] Registro original completo:', {
                            keys: Object.keys(registro),
                            valores: registro,
                            totalCampos: Object.keys(registro).length
                        });
                    }

                    // CRIAR DOCUMENTO COM NOMES EXATOS DAS COLUNAS DO EXCEL
                    const docData = {};
                    
                    // Primeiro, garantir que TODAS as colunas esperadas existam (mesmo vazias)
                    const colunasEsperadas = [
                        'Projeto', 'Sub Projeto', 'Tipo de Ação', 'CONTRATO', 'Condominio',
                        'ENDEREÇO', 'Cidade', 'PEP', 'COD IMOVEL GED', 'NODE GERENCIAL',
                        'Área Técnica', 'HP', 'ANDAR', 'DATA RECEBIMENTO', 'DATA INICIO',
                        'DATA FINAL', 'Dias', 'EQUIPE', 'SUPERVISOR', 'STATUS', 'RDO',
                        'BOOK', 'COLABORADOR/BOOK', 'DATA BOOK', 'PROJETO', 
                        'COLABORADOR/PROJETO', 'DATA/PROJETO', 'JUSTIFICATIVA', 
                        'Observação', 'SOLUÇÃO', '< OU > QUE 30'
                    ];
                    
                    // Inicializar todas as colunas
                    colunasEsperadas.forEach(coluna => {
                        docData[coluna] = '';
                    });
                    
                    // Agora copiar os dados EXATOS da planilha, sobrescrevendo as vazias
                    Object.keys(registro).forEach(chaveExcel => {
                        let valor = registro[chaveExcel];
                        
                        // Limpar valores null/undefined
                        if (valor === null || valor === undefined) {
                            valor = '';
                        } else {
                            valor = String(valor).trim();
                        }
                        
                        // Salvar com o nome EXATO da coluna do Excel
                        docData[chaveExcel] = valor;
                        
                        // Debug para primeira linha
                        if (salvosCount === 0) {
                            console.log(`🔥 [MAPEAMENTO] "${chaveExcel}" = "${valor}"`);
                        }
                    });
                    
                    // Metadados
                    docData.createdAt = timestamp;
                    docData.updatedAt = timestamp;
                    docData.createdBy = userId;
                    docData.source = 'excel_upload';

                    // Log final COMPLETO para primeira linha
                    if (salvosCount === 0) {
                        console.log('🎯 [FIRESTORE-FINAL] DOCUMENTO COMPLETO QUE SERÁ SALVO:', {
                            totalCampos: Object.keys(docData).length,
                            camposComDados: Object.keys(docData).filter(k => docData[k] !== '' && !k.startsWith('created') && !k.startsWith('updated')).length,
                            todosOsCampos: Object.keys(docData).filter(k => !k.startsWith('created') && !k.startsWith('updated')),
                            exemploCompleto: Object.fromEntries(
                                Object.entries(docData).filter(([k, v]) => !k.startsWith('created') && !k.startsWith('updated'))
                            )
                        });
                    }

                    const docRef = firebase.firestore().collection('enderecos').doc();
                    batch.set(docRef, docData);
                    salvosCount++;
                });

                // Commit do batch atual
                await batch.commit();
                console.log(
                    `✅ [ENDERECO-EXCEL] Lote ${Math.floor(i / BATCH_SIZE) + 1} salvo no Firebase (${lote.length} registros)`
                );

                // Pausa entre lotes para evitar throttling
                if (i + BATCH_SIZE < dados.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            console.log(`🎉 [ENDERECO-EXCEL] ${salvosCount} registros salvos no Firebase com estrutura completa`);
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
            const snapshot = await firebase
                .firestore()
                .collection('enderecos')
                .orderBy('createdAt', 'desc')
                .get(); // REMOVIDO LIMITE - carregar todos os registros

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
    console.log('📊 [ENDERECO-EXCEL] Exibindo dados na tabela...', dados.length, 'registros');

    // Limpar tabela atual
    limparTabela();

    // Criar linhas na tabela
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.error('❌ [ENDERECO-EXCEL] Corpo da tabela não encontrado!');
        throw new Error('Corpo da tabela não encontrado');
    }

    if (!dados || dados.length === 0) {
        console.warn('⚠️ [ENDERECO-EXCEL] Nenhum dado para exibir');
        verificarEstadoTabela();
        return;
    }

    // Processar TODOS os registros sem limite
    const dadosParaExibir = dados; // TODOS os registros sem limite

    dadosParaExibir.forEach((linha, index) => {
        try {
            const tr = criarLinhaTabela(linha, index);
            tbody.appendChild(tr);
        } catch (error) {
            console.error('❌ [ENDERECO-EXCEL] Erro ao criar linha:', error, linha);
        }
    });

    console.log(
        '✅ [ENDERECO-EXCEL] Dados exibidos na tabela:',
        dadosParaExibir.length,
        'linhas adicionadas'
    );
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
window.editarRegistro = function (index) {
    console.log('✏️ [ENDERECO-EXCEL] Editando registro:', index);
    // Implementar edição
    alert('Função de edição será implementada em breve');
};

window.excluirRegistro = function (index) {
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
window.reloadCompleteInterface = function () {
    console.log('🔄 [ENDERECO-EXCEL] Recarregando interface completa...');
    recarregarTabela();
};

// ============= DEBUGGING =============
window.debugEnderecoSystem = function () {
    console.log('🔍 [DEBUG] Estado do sistema:');
    console.log('- XLSX disponível:', typeof XLSX !== 'undefined');
    console.log('- Firebase disponível:', typeof firebase !== 'undefined');
    console.log('- Tabela existe:', !!document.getElementById('enderecoTableBody'));
    console.log('- Dados carregados:', dadosEndereco.length);
    console.log('- Total registros:', totalRegistros);
    console.log('- Input file existe:', !!(document.getElementById('novoExcelUpload') || document.getElementById('excelUpload')));
};

console.log('✅ [ENDERECO-EXCEL] Sistema de upload Excel para endereços carregado');
console.log(
    `📋 [ENDERECO-EXCEL] Configurado para ${COLUNAS_ENDERECO_EXATAS.length} colunas exatas`
);
