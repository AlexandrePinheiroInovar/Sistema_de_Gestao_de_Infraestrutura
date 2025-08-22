// ============= SISTEMA DE GESTÃO NOVO E SIMPLES =============
console.log('🚀 [GESTAO-NOVA] Iniciando sistema de gestão novo...');

// ============= CONFIGURAÇÕES =============
const GESTAO_NOVA_CONFIG = {
    projetos: { column: 'Projeto', collection: 'nova_gestao_projetos' },
    subprojetos: { column: 'Sub Projeto', collection: 'nova_gestao_subprojetos' },
    'tipos-acao': { column: 'Tipo de Ação', collection: 'nova_gestao_tipos_acao' },
    supervisores: { column: 'Supervisor', collection: 'nova_gestao_supervisores' },
    equipes: { column: 'EQUIPE', collection: 'nova_gestao_equipes' },
    cidades: { column: 'Cidade', collection: 'nova_gestao_cidades' }
};

// ============= VARIÁVEIS =============
let dadosExtraidos = [];
let sistemaIniciado = false;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [GESTAO-NOVA] DOM carregado, aguardando Firebase...');
    setTimeout(iniciarSistema, 2000);
});

function iniciarSistema() {
    if (!window.firebase || !firebase.firestore) {
        console.warn('⚠️ [GESTAO-NOVA] Firebase não disponível, tentando novamente...');
        setTimeout(iniciarSistema, 1000);
        return;
    }
    
    console.log('✅ [GESTAO-NOVA] Firebase disponível, iniciando...');
    sistemaIniciado = true;
    
    // Substituir função principal
    window.showGestaoTab = mostrarNovaAba;
    
    console.log('✅ [GESTAO-NOVA] Sistema iniciado e função substituída!');
}

// ============= EXTRAÇÃO DE DADOS =============
function extrairDadosTabela() {
    console.log('📊 [GESTAO-NOVA] Extraindo dados da tabela...');
    
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [GESTAO-NOVA] Tabela não encontrada');
        return [];
    }
    
    const linhas = tbody.querySelectorAll('tr:not(.empty-state)');
    console.log(`📊 [GESTAO-NOVA] Encontradas ${linhas.length} linhas`);
    
    const dados = [];
    linhas.forEach(linha => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 25) {
            dados.push({
                'Projeto': colunas[0]?.textContent?.trim() || '',
                'Sub Projeto': colunas[1]?.textContent?.trim() || '',
                'Tipo de Ação': colunas[2]?.textContent?.trim() || '',
                'Supervisor': colunas[17]?.textContent?.trim() || '',
                'EQUIPE': colunas[16]?.textContent?.trim() || '',
                'Cidade': colunas[6]?.textContent?.trim() || ''
            });
        }
    });
    
    dadosExtraidos = dados;
    console.log(`✅ [GESTAO-NOVA] ${dados.length} registros extraídos`);
    return dados;
}

// ============= FUNÇÃO PRINCIPAL =============
function mostrarNovaAba(tabId) {
    console.log(`📑 [GESTAO-NOVA] === MOSTRANDO ABA ${tabId.toUpperCase()} ===`);
    
    if (!sistemaIniciado) {
        console.warn('⚠️ [GESTAO-NOVA] Sistema não iniciado, aguardando...');
        setTimeout(() => mostrarNovaAba(tabId), 1000);
        return;
    }
    
    // Atualizar interface das abas
    document.querySelectorAll('.gestao-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.gestao-tab-btn').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById(`gestao-${tabId}-tab`);
    if (targetTab) targetTab.classList.add('active');
    
    const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
    if (activeButton) activeButton.classList.add('active');
    
    // Carregar dados
    carregarDadosAba(tabId);
}

async function carregarDadosAba(tabId) {
    console.log(`🔄 [GESTAO-NOVA] === CARREGANDO ${tabId.toUpperCase()} ===`);
    
    const config = GESTAO_NOVA_CONFIG[tabId];
    if (!config) {
        console.error(`❌ [GESTAO-NOVA] Configuração não encontrada para ${tabId}`);
        console.log(`🔍 [GESTAO-NOVA] Configurações disponíveis:`, Object.keys(GESTAO_NOVA_CONFIG));
        return;
    }
    
    console.log(`🔍 [GESTAO-NOVA] Config para ${tabId}:`, config);
    
    // Extrair dados atuais
    const dadosTabela = extrairDadosTabela();
    console.log(`📊 [GESTAO-NOVA] Dados da tabela extraídos: ${dadosTabela.length}`);
    
    // Debug específico para tipos de ação
    if (tabId === 'tipos-acao') {
        console.log(`🔍 [GESTAO-NOVA] DEBUG TIPOS DE AÇÃO - Coluna: "${config.column}"`);
        console.log(`🔍 [GESTAO-NOVA] Primeiros 5 registros da coluna:`, 
            dadosTabela.slice(0, 5).map(item => item[config.column]));
    }
    
    const valoresUnicos = [...new Set(
        dadosTabela.map(item => item[config.column])
            .filter(valor => valor && valor.trim() !== '')
    )].sort();
    
    console.log(`📋 [GESTAO-NOVA] Valores únicos de "${config.column}": ${valoresUnicos.length}`, valoresUnicos);
    
    // Carregar dados do Firestore
    let dadosFirestore = [];
    try {
        const snapshot = await firebase.firestore().collection(config.collection).get();
        snapshot.forEach(doc => {
            dadosFirestore.push({ 
                id: doc.id, 
                ...doc.data(),
                source: 'firestore'
            });
        });
        console.log(`🔥 [GESTAO-NOVA] ${dadosFirestore.length} dados do Firestore`);
    } catch (error) {
        console.log(`ℹ️ [GESTAO-NOVA] Sem dados Firestore para ${tabId}:`, error.message);
    }
    
    // Combinar dados
    const todosDados = [];
    
    // Adicionar dados do Firestore
    dadosFirestore.forEach(item => {
        const count = dadosTabela.filter(d => 
            d[config.column] && d[config.column].toLowerCase() === item.nome.toLowerCase()
        ).length;
        
        todosDados.push({
            id: item.id,
            nome: item.nome,
            descricao: item.descricao || '',
            status: item.status || 'ATIVO',
            source: 'firestore',
            count: count
        });
    });
    
    // Adicionar valores da tabela que não estão no Firestore
    valoresUnicos.forEach(valor => {
        const existeFirestore = dadosFirestore.some(item => 
            item.nome && item.nome.toLowerCase() === valor.toLowerCase()
        );
        
        if (!existeFirestore) {
            const count = dadosTabela.filter(d => 
                d[config.column] && d[config.column].toLowerCase() === valor.toLowerCase()
            ).length;
            
            todosDados.push({
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                nome: valor,
                descricao: 'Extraído da tabela de endereços',
                status: 'ATIVO',
                source: 'tabela',
                count: count
            });
        }
    });
    
    // Renderizar
    renderizarTabela(tabId, todosDados);
}

function renderizarTabela(tabId, dados) {
    console.log(`🎨 [GESTAO-NOVA] Renderizando ${tabId} com ${dados.length} dados`);
    
    // Mapear IDs corretos das tabelas (baseado no HTML real)
    const tableBodyIds = {
        'projetos': 'projetosTableBody',
        'subprojetos': 'subprojetosTableBody', 
        'tipos-acao': 'tiposAcaoTableBody',  // ID correto do HTML
        'supervisores': 'supervisoresTableBody',
        'equipes': 'equipesTableBody',
        'cidades': 'cidadesTableBody'
    };
    
    const tbodyId = tableBodyIds[tabId];
    console.log(`🎨 [GESTAO-NOVA] Procurando tbody: ${tbodyId}`);
    
    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        console.error(`❌ [GESTAO-NOVA] Tbody não encontrado: ${tbodyId}`);
        console.log(`🔍 [GESTAO-NOVA] Elementos disponíveis:`, Object.keys(document.querySelectorAll('[id*="TableBody"]')).map(i => document.querySelectorAll('[id*="TableBody"]')[i].id));
        return;
    }
    
    if (dados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum dado encontrado</td></tr>';
        return;
    }
    
    tbody.innerHTML = dados.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div style="font-weight:600;">${item.nome}</div>
                <div style="font-size:10px;color:${item.source === 'firestore' ? '#4f46e5' : '#059669'};">
                    ${item.source === 'firestore' ? '💾 Firestore' : '📊 Tabela'}
                </div>
            </td>
            <td>${item.descricao}</td>
            <td><span style="background:#f3f4f6;padding:2px 8px;border-radius:12px;font-size:11px;">${item.count} usos</span></td>
            <td><span style="background:${item.status === 'ATIVO' ? '#10b981' : '#6b7280'};color:white;padding:4px 8px;border-radius:12px;font-size:11px;">${item.status}</span></td>
            <td>
                <button onclick="editarItem('${tabId}', '${item.id}')" style="background:#f59e0b;color:white;border:none;padding:6px 8px;border-radius:6px;margin-right:5px;cursor:pointer;">✏️</button>
                ${item.source === 'firestore' ? 
                    `<button onclick="excluirItem('${tabId}', '${item.id}')" style="background:#ef4444;color:white;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;">🗑️</button>` :
                    `<button onclick="salvarItem('${tabId}', '${item.nome}')" style="background:#059669;color:white;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;">💾</button>`
                }
            </td>
        </tr>
    `).join('');
    
    console.log(`✅ [GESTAO-NOVA] Tabela ${tabId} renderizada`);
}

// ============= FUNÇÕES CRUD =============
async function adicionarItem(tabId) {
    const config = GESTAO_NOVA_CONFIG[tabId];
    const nome = prompt(`Adicionar novo item em ${tabId}:\n\nNome:`);
    if (!nome || !nome.trim()) return;
    
    const descricao = prompt(`Descrição para "${nome}":`);
    
    try {
        await firebase.firestore().collection(config.collection).add({
            nome: nome.trim(),
            descricao: (descricao || '').trim(),
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('✅ Item adicionado com sucesso!');
        carregarDadosAba(tabId);
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function salvarItem(tabId, nome) {
    const config = GESTAO_NOVA_CONFIG[tabId];
    const descricao = prompt(`Salvar "${nome}" no Firestore:\n\nDescrição:`);
    
    try {
        await firebase.firestore().collection(config.collection).add({
            nome: nome.trim(),
            descricao: (descricao || '').trim(),
            status: 'ATIVO',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('✅ Item salvo no Firestore!');
        carregarDadosAba(tabId);
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function editarItem(tabId, itemId) {
    if (itemId.startsWith('temp_')) {
        alert('⚠️ Salve este item no Firestore primeiro');
        return;
    }
    
    const config = GESTAO_NOVA_CONFIG[tabId];
    
    try {
        const doc = await firebase.firestore().collection(config.collection).doc(itemId).get();
        if (!doc.exists) {
            alert('❌ Item não encontrado');
            return;
        }
        
        const data = doc.data();
        const novoNome = prompt('Editar nome:', data.nome);
        if (!novoNome) return;
        
        const novaDescricao = prompt('Editar descrição:', data.descricao);
        
        await firebase.firestore().collection(config.collection).doc(itemId).update({
            nome: novoNome.trim(),
            descricao: (novaDescricao || '').trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('✅ Item atualizado!');
        carregarDadosAba(tabId);
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function excluirItem(tabId, itemId) {
    if (!confirm('Excluir este item?')) return;
    
    const config = GESTAO_NOVA_CONFIG[tabId];
    
    try {
        await firebase.firestore().collection(config.collection).doc(itemId).delete();
        alert('✅ Item excluído!');
        carregarDadosAba(tabId);
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

// ============= EXPORTAR FUNÇÕES =============
window.mostrarNovaAba = mostrarNovaAba;
window.adicionarItem = adicionarItem;
window.salvarItem = salvarItem;
window.editarItem = editarItem;
window.excluirItem = excluirItem;

// ============= DEBUG =============
window.debugGestaoNova = function() {
    console.log('🔍 [DEBUG] Sistema iniciado:', sistemaIniciado);
    console.log('🔍 [DEBUG] Firebase:', !!(window.firebase && firebase.firestore));
    
    const dados = extrairDadosTabela();
    console.log('🔍 [DEBUG] Dados extraídos:', dados.length);
    
    if (dados.length > 0) {
        console.log('🔍 [DEBUG] Amostra:', {
            Projeto: dados[0].Projeto,
            SubProjeto: dados[0]['Sub Projeto'],
            TipoAcao: dados[0]['Tipo de Ação'],
            Supervisor: dados[0].Supervisor,
            Equipe: dados[0].EQUIPE,
            Cidade: dados[0].Cidade
        });
        
        // Debug específico para tipos de ação
        const tiposUnicos = [...new Set(dados.map(d => d['Tipo de Ação']).filter(t => t && t.trim()))];
        console.log('🔍 [DEBUG] Tipos de Ação únicos:', tiposUnicos);
    }
    
    return { sistemaIniciado, dados: dados.length };
};

window.debugTiposAcao = function() {
    console.log('🔍 [DEBUG-TIPOS] === DEBUG ESPECÍFICO TIPOS DE AÇÃO ===');
    
    const dados = extrairDadosTabela();
    const tiposAcao = dados.map(d => d['Tipo de Ação']).filter(t => t && t.trim());
    const tiposUnicos = [...new Set(tiposAcao)];
    
    console.log('🔍 [DEBUG-TIPOS] Total dados extraídos:', dados.length);
    console.log('🔍 [DEBUG-TIPOS] Tipos de ação encontrados:', tiposAcao.length);
    console.log('🔍 [DEBUG-TIPOS] Tipos únicos:', tiposUnicos);
    console.log('🔍 [DEBUG-TIPOS] Primeiro tipo:', tiposAcao[0]);
    
    // Verificar tbody
    const tbody = document.getElementById('tiposAcaoTableBody');
    console.log('🔍 [DEBUG-TIPOS] Tbody existe:', !!tbody);
    
    if (tbody) {
        console.log('🔍 [DEBUG-TIPOS] HTML atual do tbody:', tbody.innerHTML.slice(0, 200));
    }
    
    // Tentar carregar manualmente
    console.log('🔍 [DEBUG-TIPOS] Tentando carregar manualmente...');
    carregarDadosAba('tipos-acao');
    
    return { dados: dados.length, tipos: tiposUnicos };
};

console.log('✅ [GESTAO-NOVA] Sistema carregado! Use debugGestaoNova() para testar');