// ============= SISTEMA DE GESTÃO TOTALMENTE NOVO - VERSÃO 2.0 =============
console.log('🚀 [GESTAO-V2] Inicializando sistema de gestão v2.0...');

// ============= CONFIGURAÇÃO DAS TABELAS =============
const GESTAO_CONFIG = {
    projetos: {
        nome: 'Projetos',
        coluna: 'Projeto', // Coluna na coleção enderecos
        colecao: 'gestao_projetos', // Coleção específica no Firestore
        displayName: 'Projeto',
        tbody: 'projetosTableBody'
    },
    subprojetos: {
        nome: 'Sub Projetos',
        coluna: 'Sub Projeto',
        colecao: 'gestao_subprojetos',
        displayName: 'Sub Projeto',
        tbody: 'subprojetosTableBody'
    },
    'tipos-acao': {
        nome: 'Tipos de Ação',
        coluna: 'Tipo de Ação',
        colecao: 'gestao_tipos_acao',
        displayName: 'Tipo de Ação',
        tbody: 'tiposAcaoTableBody'
    },
    supervisores: {
        nome: 'Supervisores',
        coluna: 'Supervisor',
        colecao: 'gestao_supervisores',
        displayName: 'Supervisor',
        tbody: 'supervisoresTableBody'
    },
    equipes: {
        nome: 'Equipes',
        coluna: 'EQUIPE',
        colecao: 'gestao_equipes',
        displayName: 'Equipe',
        tbody: 'equipesTableBody'
    },
    cidades: {
        nome: 'Cidades',
        coluna: 'Cidade',
        colecao: 'gestao_cidades',
        displayName: 'Cidade',
        tbody: 'cidadesTableBody'
    }
};

// ============= VARIÁVEIS GLOBAIS =============
let sistemaIniciado = false;
let firebaseConectado = false;
let dadosEnderecos = [];

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [GESTAO-V2] DOM carregado, aguardando Firebase...');
    aguardarFirebaseEIniciar();
});

async function aguardarFirebaseEIniciar() {
    let tentativas = 0;
    const maxTentativas = 20;
    
    const verificarFirebase = async () => {
        if (window.firebase && firebase.firestore && firebase.auth) {
            console.log('✅ [GESTAO-V2] Firebase disponível, iniciando sistema...');
            await iniciarSistema();
            return;
        }
        
        tentativas++;
        if (tentativas < maxTentativas) {
            console.log(`⏳ [GESTAO-V2] Aguardando Firebase... (${tentativas}/${maxTentativas})`);
            setTimeout(verificarFirebase, 1000);
        } else {
            console.error('❌ [GESTAO-V2] Firebase não carregou após 20 tentativas');
        }
    };
    
    setTimeout(verificarFirebase, 2000);
}

async function iniciarSistema() {
    try {
        sistemaIniciado = true;
        firebaseConectado = true;
        
        // Substituir função global
        window.showGestaoTab = mostrarAbaGestao;
        
        console.log('✅ [GESTAO-V2] Sistema iniciado com sucesso!');
        console.log('🎯 [GESTAO-V2] Função showGestaoTab substituída');
        
    } catch (error) {
        console.error('❌ [GESTAO-V2] Erro na inicialização:', error);
    }
}

// ============= FUNÇÃO PRINCIPAL - MOSTRAR ABA =============
async function mostrarAbaGestao(tabId) {
    console.log(`🎯 [GESTAO-V2] === ABRINDO ABA: ${tabId.toUpperCase()} ===`);
    
    if (!sistemaIniciado) {
        console.warn('⚠️ [GESTAO-V2] Sistema não iniciado ainda');
        return;
    }
    
    const config = GESTAO_CONFIG[tabId];
    if (!config) {
        console.error(`❌ [GESTAO-V2] Configuração não encontrada para: ${tabId}`);
        return;
    }
    
    // Esconder todas as abas
    document.querySelectorAll('.gestao-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remover classe active dos botões
    document.querySelectorAll('.gestao-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar aba selecionada
    const targetTab = document.getElementById(`gestao-${tabId}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    // Ativar botão
    const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Carregar dados
    await carregarDadosAba(tabId, config);
}

// ============= CARREGAR DADOS DA ABA =============
async function carregarDadosAba(tabId, config) {
    console.log(`🔄 [GESTAO-V2] Carregando dados para: ${tabId}`);
    
    try {
        // PASSO 1: Carregar dados da coleção 'enderecos'
        console.log('📊 [GESTAO-V2] Carregando dados da coleção enderecos...');
        const enderecosSnapshot = await firebase.firestore().collection('enderecos').get();
        
        const valoresUnicos = new Map();
        const contagemUsos = new Map();
        
        enderecosSnapshot.forEach(doc => {
            const data = doc.data();
            const valor = data[config.coluna];
            
            if (valor && valor.trim()) {
                const valorLimpo = valor.trim();
                
                // Contar usos
                contagemUsos.set(valorLimpo, (contagemUsos.get(valorLimpo) || 0) + 1);
                
                // Guardar valor único
                if (!valoresUnicos.has(valorLimpo)) {
                    valoresUnicos.set(valorLimpo, {
                        nome: valorLimpo,
                        usos: 0,
                        source: 'enderecos'
                    });
                }
            }
        });
        
        // Atualizar contagem de usos
        valoresUnicos.forEach((item, key) => {
            item.usos = contagemUsos.get(key) || 0;
        });
        
        console.log(`✅ [GESTAO-V2] Encontrados ${valoresUnicos.size} valores únicos em '${config.coluna}'`);
        
        // PASSO 2: Carregar dados salvos da coleção específica
        console.log(`🔥 [GESTAO-V2] Carregando dados salvos da coleção: ${config.colecao}`);
        const salvosSnapshot = await firebase.firestore().collection(config.colecao).get();
        
        const dadosSalvos = new Map();
        salvosSnapshot.forEach(doc => {
            const data = doc.data();
            dadosSalvos.set(data.nome, {
                id: doc.id,
                ...data,
                source: 'salvo'
            });
        });
        
        console.log(`✅ [GESTAO-V2] Encontrados ${dadosSalvos.size} dados salvos`);
        
        // PASSO 3: Combinar dados (salvos têm prioridade)
        const dadosFinais = [];
        
        // Adicionar dados salvos primeiro
        dadosSalvos.forEach(item => {
            const usosAtual = contagemUsos.get(item.nome) || 0;
            dadosFinais.push({
                ...item,
                usos: usosAtual
            });
        });
        
        // Adicionar valores únicos que não foram salvos
        valoresUnicos.forEach((item, key) => {
            if (!dadosSalvos.has(key)) {
                dadosFinais.push({
                    ...item,
                    id: null, // Não salvo ainda
                    status: 'ATIVO',
                    descricao: `${config.displayName} extraído automaticamente`
                });
            }
        });
        
        console.log(`✅ [GESTAO-V2] Total final: ${dadosFinais.length} itens para exibir`);
        
        // PASSO 4: Renderizar na tabela
        renderizarTabela(tabId, config, dadosFinais);
        
    } catch (error) {
        console.error(`❌ [GESTAO-V2] Erro ao carregar dados para ${tabId}:`, error);
    }
}

// ============= RENDERIZAR TABELA =============
function renderizarTabela(tabId, config, dados) {
    console.log(`🎨 [GESTAO-V2] Renderizando tabela: ${tabId}`);
    
    const tbody = document.getElementById(config.tbody);
    if (!tbody) {
        console.error(`❌ [GESTAO-V2] Tbody não encontrado: ${config.tbody}`);
        return;
    }
    
    if (!dados || dados.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6" style="text-align:center;padding:30px;color:#6b7280;">
                    <div style="font-size:16px;margin-bottom:10px;">📝</div>
                    <div>Nenhum ${config.nome.toLowerCase()} encontrado</div>
                    <div style="font-size:12px;margin-top:5px;">
                        <button onclick="adicionarNovoItem('${tabId}')" 
                                style="background:#10b981;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-top:10px;">
                            ➕ Adicionar Novo
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Ordenar por nome
    dados.sort((a, b) => a.nome.localeCompare(b.nome));
    
    const htmlRows = dados.map((item, index) => {
        const statusColor = item.status === 'ATIVO' ? '#10b981' : '#ef4444';
        const sourceIcon = item.source === 'salvo' ? '💾' : '📊';
        const sourceText = item.source === 'salvo' ? 'Salvo' : 'Extraído';
        
        return `
            <tr data-id="${item.id || ''}" style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px 8px;font-weight:600;">${index + 1}</td>
                <td style="padding:12px 8px;">
                    <div style="font-weight:600;color:#1f2937;">${item.nome}</div>
                    <div style="font-size:10px;color:#6b7280;margin-top:2px;">
                        ${sourceIcon} ${sourceText}
                    </div>
                </td>
                <td style="padding:12px 8px;color:#4b5563;max-width:200px;">${item.descricao || 'Sem descrição'}</td>
                <td style="padding:12px 8px;">
                    <span style="background:#f3f4f6;color:#374151;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:600;">
                        ${item.usos} usos
                    </span>
                </td>
                <td style="padding:12px 8px;">
                    <span style="background:${statusColor};color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:600;">
                        ${item.status}
                    </span>
                </td>
                <td style="padding:12px 8px;">
                    <div style="display:flex;gap:8px;">
                        <button onclick="editarItem('${tabId}', '${item.id}', '${item.nome}')" 
                                style="background:#3b82f6;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;">
                            ✏️ Editar
                        </button>
                        ${item.id ? `
                            <button onclick="excluirItem('${tabId}', '${item.id}', '${item.nome}')" 
                                    style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;">
                                🗑️ Excluir
                            </button>
                        ` : `
                            <button onclick="salvarItem('${tabId}', '${item.nome}')" 
                                    style="background:#10b981;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;">
                                💾 Salvar
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = htmlRows;
    
    console.log(`✅ [GESTAO-V2] Tabela renderizada com ${dados.length} itens`);
}

// ============= FUNÇÕES DE AÇÃO =============
window.salvarItem = async function(tabId, nome) {
    const config = GESTAO_CONFIG[tabId];
    if (!config) return;
    
    try {
        console.log(`💾 [GESTAO-V2] Salvando item: ${nome} em ${config.colecao}`);
        
        await firebase.firestore().collection(config.colecao).add({
            nome: nome,
            descricao: `${config.displayName} salvo permanentemente`,
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-V2] Item salvo com sucesso: ${nome}`);
        
        // Recarregar aba
        mostrarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-V2] Erro ao salvar item:`, error);
        alert(`❌ Erro ao salvar item: ${error.message}`);
    }
};

window.editarItem = async function(tabId, itemId, nome) {
    const novoNome = prompt(`Editar nome de "${nome}":`, nome);
    if (!novoNome || novoNome.trim() === nome) return;
    
    const config = GESTAO_CONFIG[tabId];
    if (!config || !itemId) return;
    
    try {
        console.log(`✏️ [GESTAO-V2] Editando item: ${itemId}`);
        
        await firebase.firestore().collection(config.colecao).doc(itemId).update({
            nome: novoNome.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-V2] Item editado com sucesso`);
        
        // Recarregar aba
        mostrarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-V2] Erro ao editar item:`, error);
        alert(`❌ Erro ao editar item: ${error.message}`);
    }
};

window.excluirItem = async function(tabId, itemId, nome) {
    if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    
    const config = GESTAO_CONFIG[tabId];
    if (!config || !itemId) return;
    
    try {
        console.log(`🗑️ [GESTAO-V2] Excluindo item: ${itemId}`);
        
        await firebase.firestore().collection(config.colecao).doc(itemId).delete();
        
        console.log(`✅ [GESTAO-V2] Item excluído com sucesso`);
        
        // Recarregar aba
        mostrarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-V2] Erro ao excluir item:`, error);
        alert(`❌ Erro ao excluir item: ${error.message}`);
    }
};

window.adicionarNovoItem = async function(tabId) {
    const config = GESTAO_CONFIG[tabId];
    if (!config) return;
    
    const nome = prompt(`Digite o nome do novo ${config.displayName.toLowerCase()}:`);
    if (!nome || !nome.trim()) return;
    
    try {
        console.log(`➕ [GESTAO-V2] Adicionando novo item: ${nome}`);
        
        await firebase.firestore().collection(config.colecao).add({
            nome: nome.trim(),
            descricao: `${config.displayName} adicionado manualmente`,
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-V2] Novo item adicionado com sucesso`);
        
        // Recarregar aba
        mostrarAbaGestao(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-V2] Erro ao adicionar item:`, error);
        alert(`❌ Erro ao adicionar item: ${error.message}`);
    }
};

// ============= FUNÇÕES DE DEBUG =============
window.debugGestaoV2 = function() {
    console.log('🔍 [DEBUG-GESTAO-V2] Estado do sistema:');
    console.log('   - Sistema iniciado:', sistemaIniciado);
    console.log('   - Firebase conectado:', firebaseConectado);
    console.log('   - Configurações:', Object.keys(GESTAO_CONFIG));
    
    return {
        sistemaIniciado,
        firebaseConectado,
        configuracoes: Object.keys(GESTAO_CONFIG)
    };
};

// ============= LOGS FINAIS =============
console.log('✅ [GESTAO-V2] Sistema carregado e pronto!');
console.log('📋 [GESTAO-V2] Configurações disponíveis:', Object.keys(GESTAO_CONFIG));
console.log('🎯 [GESTAO-V2] Para debug: debugGestaoV2()');