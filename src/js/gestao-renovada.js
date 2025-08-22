// ============= SISTEMA DE GESTÃO RENOVADO =============
console.log('🔄 [GESTAO-RENOVADA] Inicializando sistema renovado...');

// ============= CONFIGURAÇÕES =============
const GESTAO_CONFIG = {
    tables: {
        projetos: {
            column: 'Projeto',
            collection: 'gestao_projetos',
            title: 'Projetos'
        },
        subprojetos: {
            column: 'Sub Projeto', 
            collection: 'gestao_subprojetos',
            title: 'Sub Projetos'
        },
        'tipos-acao': {
            column: 'Tipo de Ação',
            collection: 'gestao_tipos_acao', 
            title: 'Tipos de Ação'
        },
        supervisores: {
            column: 'Supervisor',
            collection: 'gestao_supervisores',
            title: 'Supervisores'
        },
        equipes: {
            column: 'EQUIPE',
            collection: 'gestao_equipes',
            title: 'Equipes'
        },
        cidades: {
            column: 'Cidade',
            collection: 'gestao_cidades',
            title: 'Cidades'
        }
    }
};

// ============= VARIÁVEIS GLOBAIS =============
let dadosEnderecos = [];
let editingItem = null;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [GESTAO-RENOVADA] Configurando sistema...');
    setTimeout(initGestaoRenovada, 1000);
});

function initGestaoRenovada() {
    console.log('🚀 [GESTAO-RENOVADA] Iniciando...');
    
    // Extrair dados da tabela de endereços
    extrairDadosEnderecos();
    
    // Carregar primeira aba (projetos)
    carregarAbaGestao('projetos');
}

// ============= EXTRAÇÃO DE DADOS DA TABELA =============
function extrairDadosEnderecos() {
    console.log('📊 [GESTAO-RENOVADA] Extraindo dados da tabela de endereços...');
    
    const tabela = document.getElementById('enderecoMainTable');
    if (!tabela) {
        console.warn('⚠️ [GESTAO-RENOVADA] Tabela de endereços não encontrada');
        return;
    }
    
    const tbody = tabela.querySelector('#enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [GESTAO-RENOVADA] Tbody da tabela não encontrado');
        return;
    }
    
    const linhas = tbody.querySelectorAll('tr:not(.empty-state)');
    dadosEnderecos = [];
    
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 25) {
            dadosEnderecos.push({
                'Projeto': colunas[0]?.textContent?.trim() || '',
                'Sub Projeto': colunas[1]?.textContent?.trim() || '',
                'Tipo de Ação': colunas[2]?.textContent?.trim() || '',
                'CONTRATO': colunas[3]?.textContent?.trim() || '',
                'Condominio': colunas[4]?.textContent?.trim() || '',
                'ENDEREÇO': colunas[5]?.textContent?.trim() || '',
                'Cidade': colunas[6]?.textContent?.trim() || '',
                'PEP': colunas[7]?.textContent?.trim() || '',
                'COD IMOVEL GED': colunas[8]?.textContent?.trim() || '',
                'NODE GERENCIAL': colunas[9]?.textContent?.trim() || '',
                'Área Técnica': colunas[10]?.textContent?.trim() || '',
                'HP': colunas[11]?.textContent?.trim() || '',
                'ANDAR': colunas[12]?.textContent?.trim() || '',
                'DATA RECEBIMENTO': colunas[13]?.textContent?.trim() || '',
                'DATA INICIO': colunas[14]?.textContent?.trim() || '',
                'DATA FINAL': colunas[15]?.textContent?.trim() || '',
                'EQUIPE': colunas[16]?.textContent?.trim() || '',
                'Supervisor': colunas[17]?.textContent?.trim() || '',
                'Status': colunas[18]?.textContent?.trim() || '',
                'RDO': colunas[19]?.textContent?.trim() || '',
                'BOOK': colunas[20]?.textContent?.trim() || '',
                'PROJETO': colunas[21]?.textContent?.trim() || '',
                'JUSTIFICATIVA': colunas[22]?.textContent?.trim() || '',
                'Observação': colunas[23]?.textContent?.trim() || '',
                'Observação2': colunas[24]?.textContent?.trim() || ''
            });
        }
    });
    
    console.log(`✅ [GESTAO-RENOVADA] ${dadosEnderecos.length} registros extraídos`);
}

// ============= FUNÇÕES DE GESTÃO DE ABAS =============
function carregarAbaGestao(tabId) {
    console.log(`📑 [GESTAO-RENOVADA] Carregando aba: ${tabId}`);
    
    // Atualizar dados primeiro
    extrairDadosEnderecos();
    
    const config = GESTAO_CONFIG.tables[tabId];
    if (!config) {
        console.error(`❌ [GESTAO-RENOVADA] Configuração não encontrada para: ${tabId}`);
        return;
    }
    
    // Extrair valores únicos da coluna correspondente
    const valoresUnicos = extrairValoresUnicos(config.column);
    
    // Carregar dados salvos do Firestore (se houver)
    carregarDadosFirestore(tabId).then(dadosFirestore => {
        // Combinar dados únicos da tabela com dados do Firestore
        const dadosCombinados = combinarDados(valoresUnicos, dadosFirestore, config.column);
        
        // Renderizar tabela
        renderizarTabelaGestao(tabId, dadosCombinados, config);
    });
}

function extrairValoresUnicos(coluna) {
    console.log(`📋 [GESTAO-RENOVADA] Extraindo valores únicos de: ${coluna}`);
    
    const valores = dadosEnderecos
        .map(item => item[coluna])
        .filter(valor => valor && valor.trim() !== '')
        .filter((valor, index, array) => array.indexOf(valor) === index) // Remove duplicados
        .sort();
    
    console.log(`🔍 [GESTAO-RENOVADA] ${valores.length} valores únicos encontrados:`, valores);
    return valores;
}

async function carregarDadosFirestore(tabId) {
    console.log(`🔥 [GESTAO-RENOVADA] Carregando dados do Firestore para: ${tabId}`);
    
    try {
        if (!window.firebase || !firebase.firestore) {
            console.warn('⚠️ [GESTAO-RENOVADA] Firebase não disponível');
            return [];
        }
        
        const config = GESTAO_CONFIG.tables[tabId];
        const snapshot = await firebase.firestore()
            .collection(config.collection)
            .orderBy('createdAt', 'desc')
            .get();
        
        const dados = [];
        snapshot.forEach(doc => {
            dados.push({ 
                id: doc.id, 
                ...doc.data(),
                source: 'firestore'
            });
        });
        
        console.log(`✅ [GESTAO-RENOVADA] ${dados.length} registros carregados do Firestore`);
        return dados;
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao carregar do Firestore:`, error);
        return [];
    }
}

function combinarDados(valoresUnicos, dadosFirestore, coluna) {
    console.log(`🔀 [GESTAO-RENOVADA] Combinando dados...`);
    
    const dadosCombinados = [];
    
    // Adicionar dados do Firestore primeiro
    dadosFirestore.forEach(item => {
        dadosCombinados.push({
            id: item.id,
            nome: item.nome || '',
            descricao: item.descricao || '',
            status: item.status || 'ATIVO',
            createdAt: item.createdAt,
            source: 'firestore',
            count: contarOcorrencias(item.nome, coluna)
        });
    });
    
    // Adicionar valores únicos da tabela que não existem no Firestore
    valoresUnicos.forEach(valor => {
        const existeNoFirestore = dadosFirestore.some(item => 
            item.nome && item.nome.toLowerCase() === valor.toLowerCase()
        );
        
        if (!existeNoFirestore) {
            dadosCombinados.push({
                id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                nome: valor,
                descricao: `Extraído da tabela de endereços`,
                status: 'ATIVO',
                createdAt: new Date(),
                source: 'tabela',
                count: contarOcorrencias(valor, coluna)
            });
        }
    });
    
    // Ordenar por nome
    dadosCombinados.sort((a, b) => a.nome.localeCompare(b.nome));
    
    console.log(`✅ [GESTAO-RENOVADA] ${dadosCombinados.length} registros combinados`);
    return dadosCombinados;
}

function contarOcorrencias(valor, coluna) {
    return dadosEnderecos.filter(item => 
        item[coluna] && item[coluna].toLowerCase() === valor.toLowerCase()
    ).length;
}

// ============= RENDERIZAÇÃO DE TABELAS =============
function renderizarTabelaGestao(tabId, dados, config) {
    console.log(`🎨 [GESTAO-RENOVADA] Renderizando tabela: ${tabId}`);
    
    const tbody = document.getElementById(`${tabId}TableBody`);
    if (!tbody) {
        console.error(`❌ [GESTAO-RENOVADA] Tbody não encontrado: ${tabId}TableBody`);
        return;
    }
    
    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6" style="text-align: center; padding: 20px; color: #6b7280;">
                    <div style="font-size: 18px; margin-bottom: 10px;">📋</div>
                    <div>Nenhum registro encontrado</div>
                    <div style="font-size: 12px; margin-top: 5px;">
                        Adicione novos registros ou carregue dados na tabela de endereços
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = dados.map((item, index) => `
        <tr data-id="${item.id}" class="${item.source}">
            <td>${index + 1}</td>
            <td>
                <div class="item-name">${item.nome}</div>
                <div class="item-source ${item.source}">${item.source === 'firestore' ? '💾 Firestore' : '📊 Tabela'}</div>
            </td>
            <td>${item.descricao}</td>
            <td><span class="usage-count">${item.count} usos</span></td>
            <td><span class="status-badge ${item.status?.toLowerCase()}">${item.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editarItemGestao('${tabId}', '${item.id}')" title="Editar">
                        ✏️
                    </button>
                    ${item.source === 'firestore' ? `
                        <button class="btn-delete" onclick="excluirItemGestao('${tabId}', '${item.id}')" title="Excluir">
                            🗑️
                        </button>
                    ` : `
                        <button class="btn-save" onclick="salvarItemTabela('${tabId}', '${item.nome}')" title="Salvar no Firestore">
                            💾
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
    
    console.log(`✅ [GESTAO-RENOVADA] Tabela ${tabId} renderizada com ${dados.length} registros`);
}

// ============= FUNÇÕES DE CRUD =============
async function adicionarNovoItem(tabId) {
    console.log(`➕ [GESTAO-RENOVADA] Adicionando novo item em: ${tabId}`);
    
    const config = GESTAO_CONFIG.tables[tabId];
    const nome = prompt(`Novo ${config.title.slice(0, -1)}:`);
    
    if (!nome || nome.trim() === '') {
        alert('❌ Nome é obrigatório');
        return;
    }
    
    const descricao = prompt('Descrição (opcional):') || '';
    
    try {
        if (!window.firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        const novoItem = {
            nome: nome.trim(),
            descricao: descricao.trim(),
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'manual'
        };
        
        await firebase.firestore()
            .collection(config.collection)
            .add(novoItem);
        
        alert(`✅ ${config.title.slice(0, -1)} adicionado com sucesso!`);
        
        // Recarregar aba
        carregarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao adicionar:`, error);
        alert(`❌ Erro ao adicionar: ${error.message}`);
    }
}

async function salvarItemTabela(tabId, nome) {
    console.log(`💾 [GESTAO-RENOVADA] Salvando item da tabela: ${nome}`);
    
    const config = GESTAO_CONFIG.tables[tabId];
    const descricao = prompt(`Descrição para "${nome}":`) || `Extraído da tabela de endereços`;
    
    try {
        if (!window.firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        const novoItem = {
            nome: nome.trim(),
            descricao: descricao.trim(),
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            source: 'from_table'
        };
        
        await firebase.firestore()
            .collection(config.collection)
            .add(novoItem);
        
        alert(`✅ "${nome}" salvo no Firestore!`);
        
        // Recarregar aba
        carregarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao salvar:`, error);
        alert(`❌ Erro ao salvar: ${error.message}`);
    }
}

async function editarItemGestao(tabId, itemId) {
    console.log(`✏️ [GESTAO-RENOVADA] Editando item: ${itemId}`);
    
    const config = GESTAO_CONFIG.tables[tabId];
    
    try {
        if (!window.firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        const doc = await firebase.firestore()
            .collection(config.collection)
            .doc(itemId)
            .get();
        
        if (!doc.exists) {
            alert('❌ Item não encontrado');
            return;
        }
        
        const dados = doc.data();
        const novoNome = prompt(`Editar nome:`, dados.nome);
        
        if (!novoNome || novoNome.trim() === '') {
            return;
        }
        
        const novaDescricao = prompt(`Editar descrição:`, dados.descricao || '');
        const novoStatus = prompt(`Status (ATIVO/INATIVO):`, dados.status || 'ATIVO');
        
        await firebase.firestore()
            .collection(config.collection)
            .doc(itemId)
            .update({
                nome: novoNome.trim(),
                descricao: novaDescricao?.trim() || '',
                status: novoStatus?.toUpperCase() || 'ATIVO',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        alert('✅ Item atualizado com sucesso!');
        
        // Recarregar aba
        carregarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao editar:`, error);
        alert(`❌ Erro ao editar: ${error.message}`);
    }
}

async function excluirItemGestao(tabId, itemId) {
    console.log(`🗑️ [GESTAO-RENOVADA] Excluindo item: ${itemId}`);
    
    if (!confirm('Tem certeza que deseja excluir este item?')) {
        return;
    }
    
    const config = GESTAO_CONFIG.tables[tabId];
    
    try {
        if (!window.firebase || !firebase.firestore) {
            throw new Error('Firebase não disponível');
        }
        
        await firebase.firestore()
            .collection(config.collection)
            .doc(itemId)
            .delete();
        
        alert('✅ Item excluído com sucesso!');
        
        // Recarregar aba
        carregarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao excluir:`, error);
        alert(`❌ Erro ao excluir: ${error.message}`);
    }
}

// ============= SUBSTITUIR FUNÇÕES ANTIGAS =============
// Substituir a função de mostrar aba
window.showGestaoTab = function(tabId) {
    console.log(`📑 [GESTAO-RENOVADA] Mostrando aba: ${tabId}`);
    
    // Esconder todas as abas
    const tabs = document.querySelectorAll('.gestao-tab-content');
    tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    const targetTab = document.getElementById(`gestao-${tabId}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Atualizar botões das abas
    const tabButtons = document.querySelectorAll('.gestao-tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Carregar dados da aba renovada
    carregarAbaGestao(tabId);
};

// ============= FUNÇÕES GLOBAIS =============
window.adicionarNovoItem = adicionarNovoItem;
window.salvarItemTabela = salvarItemTabela;
window.editarItemGestao = editarItemGestao;
window.excluirItemGestao = excluirItemGestao;
window.carregarAbaGestao = carregarAbaGestao;

console.log('✅ [GESTAO-RENOVADA] Sistema carregado e pronto!');