// ============= NOVO SISTEMA DE UPLOAD EXCEL SIMPLIFICADO =============
console.log('📊 [NOVO-UPLOAD] Inicializando sistema de upload Excel...');

// ============= COLUNAS EXATAS DA TABELA =============
const COLUNAS_TABELA = [
    'Projeto', 'Sub Projeto', 'Tipo de Ação', 'CONTRATO', 'Condominio',
    'ENDEREÇO', 'Cidade', 'PEP', 'COD IMOVEL GED', 'NODE GERENCIAL',
    'Área Técnica', 'HP', 'ANDAR', 'DATA RECEBIMENTO', 'DATA INICIO',
    'DATA FINAL', 'EQUIPE', 'Supervisor', 'Status', 'RDO', 'BOOK',
    'PROJETO', 'JUSTIFICATIVA', 'Observação', 'Observação'
];

// ============= VARIÁVEIS GLOBAIS =============
let dadosTabela = [];
let contadorRegistros = 0;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [NOVO-UPLOAD] Configurando sistema...');
    
    // Aguardar bibliotecas carregarem
    setTimeout(() => {
        configurarNovoUpload();
        tentarCarregarDados();
    }, 1000);
});

function configurarNovoUpload() {
    const input = document.getElementById('novoExcelUpload');
    if (input) {
        input.addEventListener('change', processarArquivoExcel);
        console.log('✅ [NOVO-UPLOAD] Listener configurado');
    } else {
        console.warn('⚠️ [NOVO-UPLOAD] Input não encontrado');
    }
}

// ============= PROCESSAMENTO DO ARQUIVO =============
async function processarArquivoExcel(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    
    console.log('📂 [NOVO-UPLOAD] Processando:', arquivo.name);
    
    try {
        // Verificar se XLSX está disponível
        if (typeof XLSX === 'undefined') {
            alert('❌ Biblioteca XLSX não carregada. Recarregue a página e tente novamente.');
            return;
        }
        
        // Ler arquivo
        const dados = await lerExcel(arquivo);
        
        // Processar dados
        const processados = processarDados(dados);
        
        // Confirmar upload
        if (confirm(`📊 Encontrados ${processados.length} registros.\n\nDeseja fazer o upload?`)) {
            await salvarDados(processados);
            await exibirNaTabela(processados);
            alert(`✅ Upload concluído! ${processados.length} registros importados.`);
        }
        
    } catch (error) {
        console.error('❌ [NOVO-UPLOAD] Erro:', error);
        alert(`❌ Erro no upload: ${error.message}`);
    } finally {
        event.target.value = ''; // Limpar input
    }
}

function lerExcel(arquivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const planilha = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(planilha, { header: 1 });
                
                if (json.length < 2) {
                    throw new Error('Planilha vazia ou sem dados');
                }
                
                resolve(json);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsArrayBuffer(arquivo);
    });
}

function processarDados(jsonData) {
    console.log('🔄 [NOVO-UPLOAD] Processando dados...');
    
    const headers = jsonData[0];
    const linhas = jsonData.slice(1);
    
    // Validar colunas
    if (headers.length !== COLUNAS_TABELA.length) {
        throw new Error(`Esperado ${COLUNAS_TABELA.length} colunas, encontrado ${headers.length}`);
    }
    
    // Processar cada linha
    const processados = linhas
        .filter(linha => linha && linha.length > 0) // Filtrar linhas vazias
        .map((linha, index) => {
            const registro = {};
            
            COLUNAS_TABELA.forEach((coluna, i) => {
                let valor = linha[i] || '';
                
                // Tratar valores especiais
                if (typeof valor === 'string') {
                    valor = valor.trim();
                }
                
                // Tratar HP como número
                if (coluna === 'HP' && valor !== '') {
                    valor = parseInt(valor) || 0;
                }
                
                // Tratar datas
                if (coluna.includes('DATA') && valor !== '') {
                    valor = formatarData(valor);
                }
                
                // Para segunda coluna "Observação"
                if (coluna === 'Observação' && i === 24) {
                    registro['Observacao2'] = valor;
                } else {
                    registro[coluna] = valor;
                }
            });
            
            // Adicionar metadados
            registro._linha = index + 2; // +2 porque começa na linha 2 do Excel
            registro._timestamp = new Date().toISOString();
            
            return registro;
        });
    
    console.log('✅ [NOVO-UPLOAD] Processados:', processados.length, 'registros');
    return processados;
}

function formatarData(valor) {
    if (!valor) return '';
    
    try {
        // Se já está no formato dd/mm/yyyy
        if (typeof valor === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valor)) {
            return valor;
        }
        
        // Converter para data
        const data = new Date(valor);
        if (!isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR');
        }
    } catch (error) {
        console.warn('⚠️ [NOVO-UPLOAD] Erro ao formatar data:', valor);
    }
    
    return valor;
}

// ============= SALVAR NO FIRESTORE =============
async function salvarDados(dados) {
    console.log('💾 [NOVO-UPLOAD] Salvando no Firestore...');
    
    if (!window.firebase || !firebase.firestore) {
        throw new Error('Firebase não disponível');
    }
    
    const db = firebase.firestore();
    const batch = db.batch();
    
    // Criar collection "enderecos_mdu"
    dados.forEach(registro => {
        const docRef = db.collection('enderecos_mdu').doc();
        const dadosParaSalvar = {
            ...registro,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'novo_upload_excel'
        };
        batch.set(docRef, dadosParaSalvar);
    });
    
    await batch.commit();
    console.log('✅ [NOVO-UPLOAD] Dados salvos no Firestore');
}

// ============= EXIBIR NA TABELA =============
async function exibirNaTabela(dados) {
    console.log('📊 [NOVO-UPLOAD] Exibindo na tabela...');
    
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        throw new Error('Tabela não encontrada');
    }
    
    // Limpar tabela
    tbody.innerHTML = '';
    
    // Armazenar dados globalmente
    dadosTabela = dados;
    contadorRegistros = dados.length;
    
    // Adicionar linhas
    dados.forEach((registro, index) => {
        const tr = criarLinhaTabela(registro, index);
        tbody.appendChild(tr);
    });
    
    // Atualizar contadores
    atualizarContadores();
    
    console.log('✅ [NOVO-UPLOAD] Tabela atualizada');
}

function criarLinhaTabela(dados, index) {
    const tr = document.createElement('tr');
    
    // Adicionar células para cada coluna
    COLUNAS_TABELA.forEach((coluna, i) => {
        const td = document.createElement('td');
        
        let valor = '';
        if (coluna === 'Observação' && i === 24) {
            valor = dados['Observacao2'] || '';
        } else {
            valor = dados[coluna] || '';
        }
        
        td.textContent = valor;
        tr.appendChild(td);
    });
    
    // Coluna de ações
    const tdAcoes = document.createElement('td');
    tdAcoes.innerHTML = `
        <button onclick="editarRegistro(${index})" class="btn-edit" title="Editar">
            ✏️
        </button>
        <button onclick="excluirRegistro(${index})" class="btn-delete" title="Excluir">
            🗑️
        </button>
    `;
    tr.appendChild(tdAcoes);
    
    return tr;
}

function atualizarContadores() {
    // Atualizar cards de estatísticas
    const totalElement = document.getElementById('statTotalRegistros');
    if (totalElement) {
        totalElement.textContent = contadorRegistros;
    }
    
    // Calcular endereços únicos
    if (dadosTabela.length > 0) {
        const enderecosUnicos = new Set(dadosTabela.map(item => item['ENDEREÇO'] || '').filter(e => e.trim()));
        const enderecoElement = document.getElementById('statEnderecosDistintos');
        if (enderecoElement) {
            enderecoElement.textContent = enderecosUnicos.size;
        }
        
        // Calcular equipes únicas
        const equipesUnicas = new Set(dadosTabela.map(item => item['EQUIPE'] || '').filter(e => e.trim()));
        const equipeElement = document.getElementById('statEquipesDistintas');
        if (equipeElement) {
            equipeElement.textContent = equipesUnicas.size;
        }
        
        // Calcular produtividade
        const produtivos = dadosTabela.filter(item => (item['Status'] || '').toUpperCase() === 'PRODUTIVA').length;
        const produtividade = contadorRegistros > 0 ? Math.round((produtivos / contadorRegistros) * 100) : 0;
        const prodElement = document.getElementById('statProdutividade');
        if (prodElement) {
            prodElement.textContent = `${produtividade}%`;
        }
    }
}

// ============= CARREGAR DADOS EXISTENTES =============
async function tentarCarregarDados() {
    try {
        if (window.firebase && firebase.firestore) {
            const snapshot = await firebase.firestore()
                .collection('enderecos_mdu')
                .orderBy('uploadedAt', 'desc')
                .limit(100)
                .get();
            
            if (!snapshot.empty) {
                const dados = [];
                snapshot.forEach(doc => {
                    dados.push({ ...doc.data(), _id: doc.id });
                });
                
                await exibirNaTabela(dados);
                console.log('✅ [NOVO-UPLOAD] Dados existentes carregados');
            }
        }
    } catch (error) {
        console.log('ℹ️ [NOVO-UPLOAD] Sem dados existentes ou erro:', error.message);
    }
}

// ============= FUNÇÃO DE RECARREGAMENTO =============
function recarregarDados() {
    console.log('🔄 [NOVO-UPLOAD] Recarregando...');
    tentarCarregarDados();
}

// ============= AÇÕES DOS BOTÕES =============
window.editarRegistro = function(index) {
    alert('⚠️ Função de edição será implementada em breve');
};

window.excluirRegistro = function(index) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        dadosTabela.splice(index, 1);
        contadorRegistros--;
        exibirNaTabela(dadosTabela);
        alert('✅ Registro excluído');
    }
};

// ============= SUBSTITUIR FUNÇÃO ANTIGA =============
window.reloadCompleteInterface = recarregarDados;

// ============= EXPORTAÇÃO GLOBAL =============
window.dadosTabela = dadosTabela;
window.recarregarDados = recarregarDados;

console.log('✅ [NOVO-UPLOAD] Sistema carregado e pronto!');