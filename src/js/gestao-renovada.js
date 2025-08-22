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
    // Aguardar Firebase carregar completamente
    setTimeout(initGestaoRenovada, 3000);
    
    // Observar mudanças de seção para recarregar dados
    observarMudancasSecao();
});

function observarMudancasSecao() {
    // Interceptar a função showSection para detectar quando a gestão é aberta
    const originalShowSection = window.showSection;
    if (originalShowSection) {
        window.showSection = function(sectionName, event) {
            console.log(`🔄 [GESTAO-RENOVADA] Seção alterada para: ${sectionName}`);
            
            // Chamar função original
            originalShowSection(sectionName, event);
            
            // Se for gestão de projetos, recarregar dados
            if (sectionName === 'gestao-projetos') {
                console.log('📂 [GESTAO-RENOVADA] Seção de gestão detectada, aguardando para recarregar...');
                setTimeout(() => {
                    if (window.firebase && firebase.firestore) {
                        console.log('🔄 [GESTAO-RENOVADA] Recarregando aba ativa...');
                        // Detectar aba ativa
                        const abaAtiva = document.querySelector('.gestao-tab-btn.active');
                        if (abaAtiva) {
                            const onclick = abaAtiva.getAttribute('onclick');
                            const tabId = onclick.match(/showGestaoTab\('([^']+)'\)/)?.[1];
                            if (tabId) {
                                carregarAbaGestao(tabId);
                            }
                        } else {
                            // Se nenhuma aba ativa, carregar projetos
                            carregarAbaGestao('projetos');
                        }
                    }
                }, 1000);
            }
        };
    }
}

function initGestaoRenovada() {
    console.log('🚀 [GESTAO-RENOVADA] Iniciando...');
    
    // Aguardar Firebase estar disponível
    if (!window.firebase || !firebase.firestore) {
        console.warn('⚠️ [GESTAO-RENOVADA] Firebase não disponível, tentando novamente...');
        setTimeout(initGestaoRenovada, 2000);
        return;
    }
    
    console.log('✅ [GESTAO-RENOVADA] Firebase disponível, prosseguindo...');
    
    // Extrair dados da tabela de endereços
    extrairDadosEnderecos();
    
    // Aguardar um pouco antes de carregar a primeira aba
    setTimeout(() => {
        console.log('📋 [GESTAO-RENOVADA] Carregando aba inicial...');
        carregarAbaGestao('projetos');
    }, 1000);
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
    
    // Verificar se Firebase ainda está disponível
    if (!window.firebase || !firebase.firestore) {
        console.error(`❌ [GESTAO-RENOVADA] Firebase não disponível ao carregar aba ${tabId}`);
        return;
    }
    
    // Atualizar dados primeiro
    extrairDadosEnderecos();
    
    const config = GESTAO_CONFIG.tables[tabId];
    if (!config) {
        console.error(`❌ [GESTAO-RENOVADA] Configuração não encontrada para: ${tabId}`);
        return;
    }
    
    console.log(`🔍 [GESTAO-RENOVADA] Configuração para ${tabId}:`, config);
    
    // Extrair valores únicos da coluna correspondente
    const valoresUnicos = extrairValoresUnicos(config.column);
    console.log(`📋 [GESTAO-RENOVADA] Valores únicos extraídos:`, valoresUnicos);
    
    // Carregar dados salvos do Firestore (se houver)
    carregarDadosFirestore(tabId).then(dadosFirestore => {
        console.log(`🔥 [GESTAO-RENOVADA] Dados do Firestore:`, dadosFirestore);
        
        // Combinar dados únicos da tabela com dados do Firestore
        const dadosCombinados = combinarDados(valoresUnicos, dadosFirestore, config.column);
        console.log(`🔀 [GESTAO-RENOVADA] Dados combinados:`, dadosCombinados);
        
        // Renderizar tabela
        renderizarTabelaGestao(tabId, dadosCombinados, config);
    }).catch(error => {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao carregar dados:`, error);
        // Tentar renderizar só com dados da tabela
        const dadosCombinados = combinarDados(valoresUnicos, [], config.column);
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
            .get(); // Remover orderBy se der erro
        
        const dados = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            dados.push({ 
                id: doc.id, 
                nome: data.nome || '',
                descricao: data.descricao || '',
                status: data.status || 'ATIVO',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                source: 'firestore'
            });
        });
        
        // Ordenar por nome
        dados.sort((a, b) => a.nome.localeCompare(b.nome));
        
        console.log(`✅ [GESTAO-RENOVADA] ${dados.length} registros carregados do Firestore:`, dados);
        return dados;
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao carregar do Firestore:`, error);
        // Tentar sem orderBy
        try {
            const config = GESTAO_CONFIG.tables[tabId];
            const snapshot = await firebase.firestore()
                .collection(config.collection)
                .get();
            
            const dados = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                dados.push({ 
                    id: doc.id, 
                    nome: data.nome || '',
                    descricao: data.descricao || '',
                    status: data.status || 'ATIVO',
                    createdAt: data.createdAt,
                    source: 'firestore'
                });
            });
            
            console.log(`✅ [GESTAO-RENOVADA] ${dados.length} registros carregados (sem ordenação)`);
            return dados;
        } catch (error2) {
            console.error(`❌ [GESTAO-RENOVADA] Erro definitivo:`, error2);
            return [];
        }
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
    
    // Criar e mostrar popup moderno
    await mostrarPopupGestao(config.title.slice(0, -1), '', '', async (nome, descricao) => {
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
            
            mostrarNotificacao(`✅ ${config.title.slice(0, -1)} adicionado com sucesso!`, 'success');
            
            // Recarregar aba
            carregarAbaGestao(tabId);
            
        } catch (error) {
            console.error(`❌ [GESTAO-RENOVADA] Erro ao adicionar:`, error);
            mostrarNotificacao(`❌ Erro ao adicionar: ${error.message}`, 'error');
        }
    });
}

async function salvarItemTabela(tabId, nome) {
    console.log(`💾 [GESTAO-RENOVADA] Salvando item da tabela: ${nome}`);
    
    const config = GESTAO_CONFIG.tables[tabId];
    
    // Usar popup para pedir descrição
    await mostrarPopupGestao(`Salvar "${nome}"`, nome, 'Extraído da tabela de endereços', async (nomeEditado, descricao) => {
        try {
            if (!window.firebase || !firebase.firestore) {
                throw new Error('Firebase não disponível');
            }
            
            const novoItem = {
                nome: nomeEditado.trim(),
                descricao: descricao.trim(),
                status: 'ATIVO',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                source: 'from_table'
            };
            
            await firebase.firestore()
                .collection(config.collection)
                .add(novoItem);
            
            mostrarNotificacao(`✅ "${nomeEditado}" salvo no Firestore!`, 'success');
            
            // Recarregar aba
            carregarAbaGestao(tabId);
            
        } catch (error) {
            console.error(`❌ [GESTAO-RENOVADA] Erro ao salvar:`, error);
            mostrarNotificacao(`❌ Erro ao salvar: ${error.message}`, 'error');
        }
    });
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
            mostrarNotificacao('❌ Item não encontrado', 'error');
            return;
        }
        
        const dados = doc.data();
        
        // Usar popup para editar
        await mostrarPopupGestao(`Editar ${config.title.slice(0, -1)}`, dados.nome || '', dados.descricao || '', async (novoNome, novaDescricao) => {
            try {
                await firebase.firestore()
                    .collection(config.collection)
                    .doc(itemId)
                    .update({
                        nome: novoNome.trim(),
                        descricao: novaDescricao.trim(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                mostrarNotificacao('✅ Item atualizado com sucesso!', 'success');
                
                // Recarregar aba
                carregarAbaGestao(tabId);
                
            } catch (error) {
                console.error(`❌ [GESTAO-RENOVADA] Erro ao editar:`, error);
                mostrarNotificacao(`❌ Erro ao editar: ${error.message}`, 'error');
            }
        });
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao buscar item:`, error);
        mostrarNotificacao(`❌ Erro ao buscar item: ${error.message}`, 'error');
    }
}

async function excluirItemGestao(tabId, itemId) {
    console.log(`🗑️ [GESTAO-RENOVADA] Excluindo item: ${itemId}`);
    
    if (!confirm('Tem certeza que deseja excluir este item?\n\nEsta ação não pode ser desfeita.')) {
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
        
        mostrarNotificacao('✅ Item excluído com sucesso!', 'success');
        
        // Recarregar aba
        carregarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-RENOVADA] Erro ao excluir:`, error);
        mostrarNotificacao(`❌ Erro ao excluir: ${error.message}`, 'error');
    }
}

// ============= SUBSTITUIR FUNÇÕES ANTIGAS =============
// Substituir a função de mostrar aba
window.showGestaoTab = function(tabId) {
    console.log(`📑 [GESTAO-RENOVADA] Mostrando aba: ${tabId}`);
    
    // Verificar se Firebase está disponível
    if (!window.firebase || !firebase.firestore) {
        console.warn(`⚠️ [GESTAO-RENOVADA] Firebase não disponível, tentando carregar...`);
        // Tentar novamente em 2 segundos
        setTimeout(() => {
            window.showGestaoTab(tabId);
        }, 2000);
        return;
    }
    
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
    console.log(`🔄 [GESTAO-RENOVADA] Carregando dados para aba: ${tabId}`);
    carregarAbaGestao(tabId);
};

// ============= POPUP MODERNO SIMPLIFICADO =============
function mostrarPopupGestao(tipo, nomeAtual = '', descricaoAtual = '', callback) {
    return new Promise((resolve) => {
        // Usar prompt melhorado para agora
        const nome = prompt(`${tipo}:\n\nNome:`, nomeAtual);
        if (!nome || nome.trim() === '') {
            resolve();
            return;
        }
        
        const descricao = prompt(`Descrição para "${nome}":`, descricaoAtual);
        
        // Executar callback
        callback(nome.trim(), (descricao || '').trim()).then(() => {
            resolve();
        }).catch(error => {
            console.error('Erro:', error);
            resolve();
        });
    });
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    // Remover notificações existentes
    const existente = document.querySelector('.gestao-notification');
    if (existente) existente.remove();
    
    // Criar notificação
    const notification = document.createElement('div');
    notification.className = `gestao-notification gestao-notification-${tipo}`;
    
    const icone = tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️';
    
    notification.innerHTML = `
        <div class="gestao-notification-content">
            <span class="gestao-notification-icon">${icone}</span>
            <span class="gestao-notification-message">${mensagem}</span>
        </div>
    `;
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============= FUNÇÕES GLOBAIS =============
window.adicionarNovoItem = adicionarNovoItem;
window.salvarItemTabela = salvarItemTabela;
window.editarItemGestao = editarItemGestao;
window.excluirItemGestao = excluirItemGestao;
window.carregarAbaGestao = carregarAbaGestao;
window.mostrarPopupGestao = mostrarPopupGestao;
window.mostrarNotificacao = mostrarNotificacao;

console.log('✅ [GESTAO-RENOVADA] Sistema carregado e pronto!');