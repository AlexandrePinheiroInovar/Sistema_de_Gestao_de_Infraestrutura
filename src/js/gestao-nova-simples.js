// ============= SISTEMA DE GESTÃO NOVO E SIMPLES =============
console.log('🚀 [GESTAO-NOVA] Iniciando sistema de gestão novo...');

// ============= CONFIGURAÇÕES COMPLETAS DAS COLEÇÕES =============
const GESTAO_NOVA_CONFIG = {
    projetos: {
        column: 'Projeto',
        collection: 'nova_gestao_projetos',
        displayName: 'Projetos',
        description: 'Gerenciamento de projetos de telecomunicações'
    },
    subprojetos: {
        column: 'Sub Projeto',
        collection: 'nova_gestao_subprojetos',
        displayName: 'Sub Projetos',
        description: 'Sub divisões dos projetos principais'
    },
    'tipos-acao': {
        column: 'Tipo de Ação',
        collection: 'nova_gestao_tipos_acao',
        displayName: 'Tipos de Ação',
        description: 'Tipos de ações executadas em campo'
    },
    supervisores: {
        column: 'Supervisor',
        collection: 'nova_gestao_supervisores',
        displayName: 'Supervisores',
        description: 'Supervisores responsáveis pelas equipes'
    },
    equipes: {
        column: 'EQUIPE',
        collection: 'nova_gestao_equipes',
        displayName: 'Equipes',
        description: 'Equipes de campo para execução dos serviços'
    },
    cidades: {
        column: 'Cidade',
        collection: 'nova_gestao_cidades',
        displayName: 'Cidades',
        description: 'Cidades onde os serviços são executados'
    }
};

// ============= VARIÁVEIS =============
let dadosExtraidos = [];
let sistemaIniciado = false;

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function () {
    console.log('🔧 [GESTAO-NOVA] DOM carregado, aguardando Firebase...');
    setTimeout(iniciarSistema, 2000);
});

async function iniciarSistema() {
    if (!window.firebase || !firebase.firestore) {
        console.warn('⚠️ [GESTAO-NOVA] Firebase não disponível, tentando novamente...');
        setTimeout(iniciarSistema, 1000);
        return;
    }

    console.log('✅ [GESTAO-NOVA] Firebase disponível, iniciando...');
    sistemaIniciado = true;

    // Substituir função principal
    window.showGestaoTab = mostrarNovaAba;

    // Verificar e criar coleções se necessário
    await verificarColecoes();

    console.log('✅ [GESTAO-NOVA] Sistema iniciado e função substituída!');

    // TESTE DE DEBUG - verificar se dados estão disponíveis
    setTimeout(() => {
        console.log('🔍 [DEBUG-GESTAO] === TESTE DE FONTES DE DADOS ===');
        console.log('🔍 [DEBUG-GESTAO] window.FirebaseTableSystem:', !!window.FirebaseTableSystem);
        if (window.FirebaseTableSystem) {
            console.log(
                '🔍 [DEBUG-GESTAO] FirebaseTableSystem.getData:',
                typeof window.FirebaseTableSystem.getData
            );
            const dados = window.FirebaseTableSystem.getData();
            console.log(
                '🔍 [DEBUG-GESTAO] Dados do FirebaseTableSystem:',
                dados?.length || 'undefined'
            );
        }
        console.log(
            '🔍 [DEBUG-GESTAO] window.currentFirebaseData:',
            window.currentFirebaseData?.length || 'undefined'
        );
        console.log(
            '🔍 [DEBUG-GESTAO] window.firebaseTableData:',
            window.firebaseTableData?.length || 'undefined'
        );
        console.log('🔍 [DEBUG-GESTAO] ================================');
    }, 5000);
}

// ============= VERIFICAR E CRIAR COLEÇÕES =============
async function verificarColecoes() {
    console.log('🔍 [COLEÇÕES] Verificando todas as coleções do Firebase...');

    for (const [_tabId, config] of Object.entries(GESTAO_NOVA_CONFIG)) {
        try {
            console.log(`🔍 [COLEÇÕES] Verificando coleção: ${config.collection}`);

            // Tentar acessar a coleção - Firebase criará automaticamente quando necessário
            const snapshot = await firebase
                .firestore()
                .collection(config.collection)
                .limit(1)
                .get();

            console.log(`✅ [COLEÇÕES] ${config.collection}: ${snapshot.size} documentos`);
        } catch (error) {
            console.error(`❌ [COLEÇÕES] Erro ao verificar ${config.collection}:`, error);
        }
    }

    console.log(
        '🎯 [COLEÇÕES] Verificação completa - Firebase criará coleções conforme necessário'
    );
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
                Projeto: colunas[0]?.textContent?.trim() || '',
                'Sub Projeto': colunas[1]?.textContent?.trim() || '',
                'Tipo de Ação': colunas[2]?.textContent?.trim() || '',
                Supervisor: colunas[17]?.textContent?.trim() || '',
                EQUIPE: colunas[16]?.textContent?.trim() || '',
                Cidade: colunas[6]?.textContent?.trim() || ''
            });
        }
    });

    dadosExtraidos = dados;
    console.log(`✅ [GESTAO-NOVA] ${dados.length} registros extraídos`);
    return dados;
}

// ============= EXTRAÇÃO DE DADOS DA TABELA ORIGINAL (REVERTED) =============
function extrairTodosOsDadosCompletos() {
    console.log('📊 [GESTAO-NOVA] SISTEMA REVERTIDO: Extraindo dados diretamente da tabela DOM...');

    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [GESTAO-NOVA] Tabela enderecoTableBody não encontrada');
        return [];
    }

    const linhas = tbody.querySelectorAll('tr:not(.empty-state)');
    console.log(`📊 [GESTAO-NOVA] Encontradas ${linhas.length} linhas na tabela`);

    const dados = [];
    linhas.forEach((linha, index) => {
        const colunas = linha.querySelectorAll('td');
        if (colunas.length >= 25) {
            const registro = {
                Projeto: colunas[0]?.textContent?.trim() || '',
                'Sub Projeto': colunas[1]?.textContent?.trim() || '',
                'Tipo de Ação': colunas[2]?.textContent?.trim() || '',
                Supervisor: colunas[17]?.textContent?.trim() || '',
                EQUIPE: colunas[16]?.textContent?.trim() || '',
                Cidade: colunas[6]?.textContent?.trim() || ''
            };

            dados.push(registro);

            // Debug dos primeiros 3 registros
            if (index < 3) {
                console.log(`🔍 [GESTAO-NOVA] Registro ${index + 1}:`, registro);
            }
        }
    });

    console.log(`✅ [GESTAO-NOVA] ${dados.length} registros extraídos da tabela DOM`);
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
    if (targetTab) {
        targetTab.classList.add('active');
    }

    const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

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

    // Extrair dados da tabela DOM (sistema original)
    const dadosTabela = extrairTodosOsDadosCompletos();
    console.log(`📊 [GESTAO-NOVA] Dados extraídos da tabela DOM: ${dadosTabela.length}`);

    // Debug específico para tipos de ação
    if (tabId === 'tipos-acao') {
        console.log(`🔍 [GESTAO-NOVA] DEBUG TIPOS DE AÇÃO - Coluna: "${config.column}"`);
        console.log(
            `🔍 [GESTAO-NOVA] Primeiros 5 registros da coluna:`,
            dadosTabela.slice(0, 5).map(item => item[config.column])
        );
    }

    // Debug detalhado dos dados recebidos
    console.log(`🔍 [GESTAO-NOVA] Processando dados para coluna "${config.column}"`);
    console.log(`🔍 [GESTAO-NOVA] Total de dados recebidos: ${dadosTabela.length}`);
    if (dadosTabela.length > 0) {
        console.log(`🔍 [GESTAO-NOVA] Exemplo do primeiro registro:`, dadosTabela[0]);
        console.log(
            `🔍 [GESTAO-NOVA] Valor da coluna "${config.column}" no primeiro:`,
            dadosTabela[0][config.column]
        );
    }

    const valoresUnicos = [
        ...new Set(
            dadosTabela
                .map(item => item[config.column])
                .filter(valor => valor && valor.trim() !== '')
        )
    ].sort();

    console.log(
        `📋 [GESTAO-NOVA] Valores únicos de "${config.column}": ${valoresUnicos.length}`,
        valoresUnicos.slice(0, 5)
    );

    // Carregar dados do Firestore
    const dadosFirestore = [];
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
        const count = dadosTabela.filter(
            d => d[config.column] && d[config.column].toLowerCase() === item.nome.toLowerCase()
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

    // Adicionar valores da tabela que não estão no Firestore E SALVAR AUTOMATICAMENTE
    const itensParaSalvar = [];
    valoresUnicos.forEach(valor => {
        const existeFirestore = dadosFirestore.some(
            item => item.nome && item.nome.toLowerCase() === valor.toLowerCase()
        );

        if (!existeFirestore) {
            const count = dadosTabela.filter(
                d => d[config.column] && d[config.column].toLowerCase() === valor.toLowerCase()
            ).length;

            const novoItem = {
                id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                nome: valor,
                descricao: 'Extraído automaticamente da tabela de endereços',
                status: 'ATIVO',
                source: 'tabela',
                count: count
            };

            todosDados.push(novoItem);
            itensParaSalvar.push(novoItem);
        }
    });

    // SALVAMENTO AUTOMÁTICO dos itens extraídos (MELHORADO)
    if (itensParaSalvar.length > 0) {
        console.log(
            `💾 [GESTAO-NOVA] Salvando automaticamente ${itensParaSalvar.length} itens na coleção ${config.collection}...`
        );
        await salvarItensAutomaticamente(config, itensParaSalvar, tabId);
    } else {
        console.log(`ℹ️ [GESTAO-NOVA] Nenhum item novo para salvar automaticamente`);
    }

    // Renderizar
    renderizarTabela(tabId, todosDados);
}

function renderizarTabela(tabId, dados) {
    console.log(`🎨 [GESTAO-NOVA] Renderizando ${tabId} com ${dados.length} dados`);

    // Mapear IDs corretos das tabelas (baseado no HTML real)
    const tableBodyIds = {
        projetos: 'projetosTableBody',
        subprojetos: 'subprojetosTableBody',
        'tipos-acao': 'tiposAcaoTableBody', // ID correto do HTML
        supervisores: 'supervisoresTableBody',
        equipes: 'equipesTableBody',
        cidades: 'cidadesTableBody'
    };

    const tbodyId = tableBodyIds[tabId];
    console.log(`🎨 [GESTAO-NOVA] Tab ID: ${tabId}`);
    console.log(`🎨 [GESTAO-NOVA] Procurando tbody: ${tbodyId}`);
    console.log(`🎨 [GESTAO-NOVA] Mapeamento completo:`, tableBodyIds);

    // Verificar todos os elementos com TableBody no ID
    const allTableBodies = document.querySelectorAll('[id*="TableBody"]');
    console.log(
        `🔍 [GESTAO-NOVA] Elementos TableBody encontrados:`,
        Array.from(allTableBodies).map(el => el.id)
    );

    const tbody = document.getElementById(tbodyId);
    if (!tbody) {
        console.error(`❌ [GESTAO-NOVA] Tbody não encontrado: ${tbodyId}`);

        // Tentar encontrar por nome similar
        const similares = Array.from(allTableBodies).filter(el =>
            el.id.toLowerCase().includes(tabId.toLowerCase())
        );
        if (similares.length > 0) {
            console.log(
                `🔍 [GESTAO-NOVA] Elementos similares encontrados:`,
                similares.map(el => el.id)
            );
        }

        return;
    }

    if (dados.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="6" style="text-align:center;padding:20px;">Nenhum dado encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = dados
        .map(
            (item, index) => `
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
                ${
                    item.source === 'firestore'
                        ? `<button onclick="editarItem('${tabId}', '${item.id}')" style="background:#f59e0b;color:white;border:none;padding:6px 8px;border-radius:6px;margin-right:5px;cursor:pointer;" title="Editar">✏️</button>
                           <button onclick="excluirItem('${tabId}', '${item.id}')" style="background:#ef4444;color:white;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;" title="Excluir">🗑️</button>`
                        : `<span style="background:#10b981;color:white;padding:6px 8px;border-radius:6px;font-size:11px;" title="Salvamento automático ativo">✅ AUTO-SALVO</span>`
                }
            </td>
        </tr>
    `
        )
        .join('');

    console.log(`✅ [GESTAO-NOVA] Tabela ${tabId} renderizada`);
}

// ============= FUNÇÕES CRUD =============
async function adicionarItem(tabId) {
    const config = GESTAO_NOVA_CONFIG[tabId];
    const nome = prompt(`Adicionar novo item em ${tabId}:\n\nNome:`);
    if (!nome || !nome.trim()) {
        return;
    }

    const descricao = prompt(`Descrição para "${nome}":`);

    try {
        await firebase
            .firestore()
            .collection(config.collection)
            .add({
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
        await firebase
            .firestore()
            .collection(config.collection)
            .add({
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

// ============= SALVAMENTO AUTOMÁTICO MELHORADO =============
async function salvarItensAutomaticamente(config, itensParaSalvar, tabId) {
    console.log(`🔄 [AUTO-SAVE] === INICIANDO SALVAMENTO AUTOMÁTICO ===`);
    console.log(`📊 [AUTO-SAVE] Coleção: ${config.collection}`);
    console.log(`📊 [AUTO-SAVE] Itens para salvar: ${itensParaSalvar.length}`);

    let sucessos = 0;
    let erros = 0;
    let duplicatas = 0;

    for (const item of itensParaSalvar) {
        try {
            console.log(`🔍 [AUTO-SAVE] Processando "${item.nome}"...`);

            // Verificar se o item já existe no Firestore (evitar duplicatas)
            const existingQuery = await firebase
                .firestore()
                .collection(config.collection)
                .where('nome', '==', item.nome.trim())
                .limit(1)
                .get();

            if (existingQuery.empty) {
                // Criar documento no Firestore
                const docData = {
                    nome: item.nome.trim(),
                    descricao: 'Extraído automaticamente da tabela de endereços',
                    status: 'ATIVO',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    autoSaved: true,
                    source: 'auto-extract',
                    tabId: tabId,
                    originalCount: item.count
                };
                
                const docRef = await firebase.firestore().collection(config.collection).add(docData);

                // Salvar log de criação
                if (typeof window.salvarLogAlteracao === 'function') {
                    await window.salvarLogAlteracao(docRef.id, {}, docData, 'create', `Auto-gerado da tabela de endereços`);
                }

                sucessos++;
                console.log(
                    `✅ [AUTO-SAVE] "${item.nome}" → ${config.collection} (ID: ${docRef.id})`
                );
            } else {
                duplicatas++;
                console.log(
                    `🔄 [AUTO-SAVE] "${item.nome}" já existe na coleção ${config.collection}`
                );
            }
        } catch (error) {
            erros++;
            console.error(
                `❌ [AUTO-SAVE] Erro ao salvar "${item.nome}" na ${config.collection}:`,
                error
            );
        }
    }

    // Relatório final
    console.log(`🎯 [AUTO-SAVE] === RELATÓRIO FINAL ===`);
    console.log(`✅ Sucessos: ${sucessos}`);
    console.log(`🔄 Duplicatas evitadas: ${duplicatas}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📊 Total processado: ${sucessos + duplicatas + erros}`);

    if (sucessos > 0) {
        console.log(
            `🎉 [AUTO-SAVE] Coleção ${config.collection} atualizada com ${sucessos} novos itens!`
        );
    }

    // Aguardar e recarregar apenas se houve mudanças
    if (sucessos > 0) {
        setTimeout(() => {
            console.log(`🔄 [AUTO-SAVE] Recarregando aba ${tabId} para mostrar itens salvos...`);
            carregarDadosAba(tabId);
        }, 1500);
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
        if (!novoNome) {
            return;
        }

        const novaDescricao = prompt('Editar descrição:', data.descricao);

        const dadosNovos = {
            nome: novoNome.trim(),
            descricao: (novaDescricao || '').trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase
            .firestore()
            .collection(config.collection)
            .doc(itemId)
            .update(dadosNovos);

        // Salvar log de edição
        if (typeof window.salvarLogAlteracao === 'function') {
            await window.salvarLogAlteracao(itemId, data, {...data, ...dadosNovos}, 'edit', `Editado no módulo ${config.title}`);
        }

        alert('✅ Item atualizado!');
        carregarDadosAba(tabId);
    } catch (error) {
        alert('❌ Erro: ' + error.message);
    }
}

async function excluirItem(tabId, itemId) {
    if (!confirm('Excluir este item?')) {
        return;
    }

    const config = GESTAO_NOVA_CONFIG[tabId];

    try {
        // Buscar dados antes de excluir para o histórico
        const docSnapshot = await firebase.firestore().collection(config.collection).doc(itemId).get();
        const dadosAntigos = docSnapshot.exists ? docSnapshot.data() : {};
        
        await firebase.firestore().collection(config.collection).doc(itemId).delete();
        
        // Salvar log de exclusão
        if (typeof window.salvarLogAlteracao === 'function') {
            await window.salvarLogAlteracao(itemId, dadosAntigos, {}, 'delete', `Excluído do módulo ${config.title}`);
        }
        
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
window.debugGestaoNova = function () {
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
        const tiposUnicos = [
            ...new Set(dados.map(d => d['Tipo de Ação']).filter(t => t && t.trim()))
        ];
        console.log('🔍 [DEBUG] Tipos de Ação únicos:', tiposUnicos);
    }

    return { sistemaIniciado, dados: dados.length };
};

window.debugTiposAcao = function () {
    console.log('🔍 [DEBUG-TIPOS] === DEBUG ESPECÍFICO TIPOS DE AÇÃO ===');

    // Verificar DOM primeiro
    console.log('🔍 [DEBUG-TIPOS] DOM Ready State:', document.readyState);
    console.log('🔍 [DEBUG-TIPOS] Sistema iniciado:', sistemaIniciado);

    // Verificar todos os elementos TableBody
    const allTableBodies = document.querySelectorAll('[id*="TableBody"]');
    console.log(
        '🔍 [DEBUG-TIPOS] Todos os TableBodies:',
        Array.from(allTableBodies).map(el => el.id)
    );

    // Verificar especificamente o elemento que procuramos
    const tbody = document.getElementById('tiposAcaoTableBody');
    console.log('🔍 [DEBUG-TIPOS] Tbody tiposAcaoTableBody existe:', !!tbody);

    if (tbody) {
        console.log('🔍 [DEBUG-TIPOS] Tbody parent:', tbody.parentElement?.tagName);
        console.log('🔍 [DEBUG-TIPOS] Tbody className:', tbody.className);
        console.log('🔍 [DEBUG-TIPOS] HTML atual do tbody:', tbody.innerHTML.slice(0, 200));
    }

    // Verificar dados da tabela
    const dados = extrairDadosTabela();
    const tiposAcao = dados.map(d => d['Tipo de Ação']).filter(t => t && t.trim());
    const tiposUnicos = [...new Set(tiposAcao)];

    console.log('🔍 [DEBUG-TIPOS] Total dados extraídos:', dados.length);
    console.log('🔍 [DEBUG-TIPOS] Tipos de ação encontrados:', tiposAcao.length);
    console.log('🔍 [DEBUG-TIPOS] Tipos únicos:', tiposUnicos);
    console.log('🔍 [DEBUG-TIPOS] Primeiro tipo:', tiposAcao[0]);

    // Tentar carregar manualmente
    console.log('🔍 [DEBUG-TIPOS] Tentando carregar manualmente...');
    carregarDadosAba('tipos-acao');

    return {
        domReady: document.readyState,
        sistemaIniciado,
        tbodyExists: !!tbody,
        dados: dados.length,
        tipos: tiposUnicos,
        allTableBodies: Array.from(allTableBodies).map(el => el.id)
    };
};

// ============= FUNÇÃO DE DEBUG COMPLETA =============
window.testarDadosGestaoCompleto = function () {
    console.log('🧪 [TESTE-GESTAO] === TESTE COMPLETO DE DADOS ===');

    console.log('1️⃣ Verificando FirebaseTableSystem...');
    if (window.FirebaseTableSystem && window.FirebaseTableSystem.getData) {
        const dados = window.FirebaseTableSystem.getData();
        console.log('✅ FirebaseTableSystem.getData():', dados?.length || 'vazio');
        if (dados && dados.length > 0) {
            console.log('📄 Primeiro registro:', dados[0]);
            console.log('📄 Campos disponíveis:', Object.keys(dados[0]));
        }
    } else {
        console.log('❌ FirebaseTableSystem não disponível');
    }

    console.log('2️⃣ Verificando window.currentFirebaseData...');
    if (window.currentFirebaseData) {
        console.log('✅ currentFirebaseData:', window.currentFirebaseData.length);
        if (window.currentFirebaseData.length > 0) {
            console.log('📄 Primeiro registro:', window.currentFirebaseData[0]);
        }
    } else {
        console.log('❌ currentFirebaseData não disponível');
    }

    console.log('3️⃣ Testando função de extração...');
    const dadosExtraidos = extrairTodosOsDadosCompletos();
    console.log('📊 Dados extraídos:', dadosExtraidos.length);
    if (dadosExtraidos.length > 0) {
        console.log('📄 Exemplo de dados extraídos:', dadosExtraidos[0]);
    }

    console.log('4️⃣ Testando carregar dados da aba projetos...');
    try {
        carregarDadosAba('projetos');
    } catch (error) {
        console.error('❌ Erro ao carregar dados da aba:', error);
    }

    console.log('🧪 [TESTE-GESTAO] === FIM DO TESTE ===');
    console.log(
        '💡 Para testar: Vá para Cadastro de Endereços primeiro, depois volte e execute este teste'
    );
};

// ============= TESTE COMPLETO DO SISTEMA ATUALIZADO =============
window.testarSistemaCompleto = async function () {
    console.log('🚀 [TESTE-COMPLETO] === TESTE COMPLETO DO SISTEMA ATUALIZADO ===');

    console.log('1️⃣ Verificando estado do sistema...');
    console.log('   ✓ Sistema iniciado:', sistemaIniciado);
    console.log('   ✓ Firebase disponível:', !!(window.firebase && firebase.firestore));

    console.log('2️⃣ Testando extração de dados da tabela DOM...');
    const dadosExtraidos = extrairTodosOsDadosCompletos();
    console.log(`   ✓ Dados extraídos: ${dadosExtraidos.length} registros`);

    if (dadosExtraidos.length > 0) {
        console.log('   ✓ Exemplo de dados:', dadosExtraidos[0]);

        // Teste específico para cada configuração
        for (const [_tabId, config] of Object.entries(GESTAO_NOVA_CONFIG)) {
            const valoresUnicos = [
                ...new Set(
                    dadosExtraidos
                        .map(item => item[config.column])
                        .filter(valor => valor && valor.trim() !== '')
                )
            ];
            console.log(`   ✓ ${config.displayName}: ${valoresUnicos.length} valores únicos`);
        }
    } else {
        console.warn('   ⚠️ Nenhum dado extraído - vá para Cadastro de Endereços primeiro');
        return { status: 'error', message: 'Nenhum dado na tabela' };
    }

    console.log('3️⃣ Testando coleções do Firebase...');
    try {
        await verificarColecoes();
        console.log('   ✅ Verificação de coleções concluída');
    } catch (error) {
        console.error('   ❌ Erro na verificação de coleções:', error);
    }

    console.log('4️⃣ Testando carregamento de uma aba (projetos)...');
    try {
        await carregarDadosAba('projetos');
        console.log('   ✅ Aba projetos carregada com sucesso');
    } catch (error) {
        console.error('   ❌ Erro ao carregar aba projetos:', error);
    }

    console.log('🎯 [TESTE-COMPLETO] Sistema pronto para uso!');
    console.log('💡 Para usar: Acesse qualquer aba do módulo de Gestão');

    return {
        status: 'success',
        dadosExtraidos: dadosExtraidos.length,
        sistemaIniciado,
        firebaseDisponivel: !!(window.firebase && firebase.firestore)
    };
};

console.log('✅ [GESTAO-NOVA] Sistema carregado e atualizado!');
console.log('🧪 TESTE PRINCIPAL: testarSistemaCompleto()');
console.log('🧪 Teste de dados: testarDadosGestaoCompleto()');
console.log('🧪 Debug simples: debugGestaoNova()');
console.log('💡 IMPORTANTE: Vá primeiro para "Cadastro de Endereços", depois teste as funções');
