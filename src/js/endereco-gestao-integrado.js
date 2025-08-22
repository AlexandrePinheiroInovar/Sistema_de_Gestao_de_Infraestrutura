// ============= SISTEMA INTEGRADO DE ENDEREÇOS E GESTÃO =============
console.log('🏠 [ENDERECO-GESTAO] Inicializando sistema integrado v1.0...');

// ============= CONFIGURAÇÕES E VARIÁVEIS =============
const ENDERECO_GESTAO_CONFIG = {
    collections: {
        enderecos: 'enderecos_cadastrados',
        projetos: 'nova_gestao_projetos',
        subprojetos: 'nova_gestao_subprojetos',
        tiposAcao: 'nova_gestao_tipos_acao',
        supervisores: 'nova_gestao_supervisores',
        equipes: 'nova_gestao_equipes',
        cidades: 'nova_gestao_cidades'
    },
    mapeamentoColunas: [
        'Projeto', 'Sub Projeto', 'Tipo de Ação', 'CONTRATO', 'Condominio', 'ENDEREÇO', 'Cidade', 
        'PEP', 'COD IMOVEL GED', 'NODE GERENCIAL', 'Área Técnica', 'HP', 'ANDAR', 
        'DATA RECEBIMENTO', 'DATA INICIO', 'DATA FINAL', 'EQUIPE', 'Supervisor', 'Status', 
        'RDO', 'BOOK', 'PROJETO', 'JUSTIFICATIVA', 'Observação', 'Observação'
    ]
};

let sistemaCarregado = false;
let dadosGestao = {
    projetos: [],
    subprojetos: [],
    tiposAcao: [],
    supervisores: [],
    equipes: [],
    cidades: []
};

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 [ENDERECO-GESTAO] DOM carregado, inicializando...');
    setTimeout(inicializarSistema, 3000); // Aguardar Firebase e outros sistemas
});

async function inicializarSistema() {
    try {
        if (!window.firebase || !firebase.firestore) {
            console.warn('⚠️ [ENDERECO-GESTAO] Firebase não disponível, tentando novamente...');
            setTimeout(inicializarSistema, 1000);
            return;
        }
        
        console.log('🏠 [ENDERECO-GESTAO] Firebase disponível, carregando dados...');
        
        // Carregar dados da gestão
        await carregarDadosGestao();
        
        // Configurar modal e formulário
        configurarModalEndereco();
        
        // Carregar tabela inicial
        await carregarTabelaEnderecos();
        
        sistemaCarregado = true;
        console.log('✅ [ENDERECO-GESTAO] Sistema integrado inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro na inicialização:', error);
    }
}

// ============= CARREGAMENTO DE DADOS DE GESTÃO =============
async function carregarDadosGestao() {
    console.log('🔄 [ENDERECO-GESTAO] Carregando dados de gestão...');
    
    try {
        const db = firebase.firestore();
        
        // Carregar todos os dados em paralelo
        const [
            projetosSnap,
            subprojetosSnap,
            tiposAcaoSnap,
            supervisoresSnap,
            equipesSnap,
            cidadesSnap
        ] = await Promise.all([
            db.collection(ENDERECO_GESTAO_CONFIG.collections.projetos).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_GESTAO_CONFIG.collections.subprojetos).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_GESTAO_CONFIG.collections.tiposAcao).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_GESTAO_CONFIG.collections.supervisores).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_GESTAO_CONFIG.collections.equipes).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_GESTAO_CONFIG.collections.cidades).where('status', '==', 'ATIVO').get()
        ]);
        
        // Processar dados
        dadosGestao.projetos = processarSnapshot(projetosSnap);
        dadosGestao.subprojetos = processarSnapshot(subprojetosSnap);
        dadosGestao.tiposAcao = processarSnapshot(tiposAcaoSnap);
        dadosGestao.supervisores = processarSnapshot(supervisoresSnap);
        dadosGestao.equipes = processarSnapshot(equipesSnap);
        dadosGestao.cidades = processarSnapshot(cidadesSnap);
        
        console.log('✅ [ENDERECO-GESTAO] Dados de gestão carregados:', {
            projetos: dadosGestao.projetos.length,
            subprojetos: dadosGestao.subprojetos.length,
            tiposAcao: dadosGestao.tiposAcao.length,
            supervisores: dadosGestao.supervisores.length,
            equipes: dadosGestao.equipes.length,
            cidades: dadosGestao.cidades.length
        });
        
        // Atualizar dropdowns
        atualizarDropdowns();
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao carregar dados de gestão:', error);
        throw error;
    }
}

function processarSnapshot(snapshot) {
    const dados = [];
    snapshot.forEach(doc => {
        dados.push({
            id: doc.id,
            ...doc.data()
        });
    });
    return dados.sort((a, b) => a.nome.localeCompare(b.nome));
}

// ============= CONFIGURAÇÃO DO MODAL =============
function configurarModalEndereco() {
    console.log('⚙️ [ENDERECO-GESTAO] Configurando modal de endereço...');
    
    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.warn('⚠️ [ENDERECO-GESTAO] Formulário enderecoForm não encontrado');
        return;
    }
    
    // Remover listeners existentes
    form.removeEventListener('submit', handleSubmitEndereco);
    
    // Adicionar novo listener
    form.addEventListener('submit', handleSubmitEndereco);
    
    console.log('✅ [ENDERECO-GESTAO] Modal configurado');
}

function atualizarDropdowns() {
    console.log('🔄 [ENDERECO-GESTAO] Atualizando dropdowns...');
    
    const dropdowns = [
        { id: 'projeto', dados: dadosGestao.projetos },
        { id: 'subProjeto', dados: dadosGestao.subprojetos },
        { id: 'tipoAcao', dados: dadosGestao.tiposAcao },
        { id: 'supervisor', dados: dadosGestao.supervisores },
        { id: 'equipe', dados: dadosGestao.equipes },
        { id: 'cidade', dados: dadosGestao.cidades }
    ];
    
    dropdowns.forEach(dropdown => {
        const select = document.getElementById(dropdown.id);
        if (select) {
            // Manter opção padrão
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            
            if (defaultOption) {
                select.appendChild(defaultOption);
            } else {
                select.innerHTML = `<option value="">Selecione...</option>`;
            }
            
            // Adicionar opções dos dados de gestão
            dropdown.dados.forEach(item => {
                const option = document.createElement('option');
                option.value = item.nome;
                option.textContent = item.nome;
                option.dataset.id = item.id;
                select.appendChild(option);
            });
            
            console.log(`✅ Dropdown ${dropdown.id} atualizado com ${dropdown.dados.length} opções`);
        } else {
            console.warn(`⚠️ Dropdown ${dropdown.id} não encontrado`);
        }
    });
    
    console.log('✅ [ENDERECO-GESTAO] Todos os dropdowns atualizados');
}

// ============= HANDLER DO FORMULÁRIO =============
async function handleSubmitEndereco(event) {
    event.preventDefault();
    
    console.log('💾 [ENDERECO-GESTAO] Processando novo endereço...');
    
    try {
        // Desabilitar botão de submit
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        // Coletar dados do formulário
        const dadosEndereco = coletarDadosFormulario(event.target);
        
        console.log('📋 [ENDERECO-GESTAO] Dados coletados:', dadosEndereco);
        
        // Validar dados obrigatórios
        validarDadosObrigatorios(dadosEndereco);
        
        // Salvar no Firestore
        const novoId = await salvarEnderecoFirestore(dadosEndereco);
        
        // Atualizar tabela visual
        await adicionarLinhaTabela(dadosEndereco, novoId);
        
        // Fechar modal e limpar formulário
        fecharModal();
        event.target.reset();
        
        // Mostrar sucesso
        mostrarMensagem('✅ Endereço cadastrado com sucesso!', 'success');
        
        console.log('✅ [ENDERECO-GESTAO] Endereço salvo com ID:', novoId);
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao salvar endereço:', error);
        mostrarMensagem(`❌ Erro: ${error.message}`, 'error');
    } finally {
        // Reabilitar botão
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Salvar';
    }
}

function coletarDadosFormulario(form) {
    const formData = new FormData(form);
    const dados = {};
    
    // Mapear campos do formulário para estrutura de dados
    const mapeamento = {
        projeto: 'Projeto',
        subProjeto: 'Sub Projeto', 
        tipoAcao: 'Tipo de Ação',
        contrato: 'CONTRATO',
        condominio: 'Condominio',
        endereco: 'ENDEREÇO',
        cidade: 'Cidade',
        pep: 'PEP',
        codImovelGed: 'COD IMOVEL GED',
        nodeGerencial: 'NODE GERENCIAL',
        areaTecnica: 'Área Técnica',
        hp: 'HP',
        andar: 'ANDAR',
        dataRecebimento: 'DATA RECEBIMENTO',
        dataInicio: 'DATA INICIO',
        dataFinal: 'DATA FINAL',
        equipe: 'EQUIPE',
        supervisor: 'Supervisor',
        status: 'Status',
        rdo: 'RDO',
        book: 'BOOK',
        projetoStatus: 'PROJETO',
        justificativa: 'JUSTIFICATIVA',
        observacao: 'Observação'
    };
    
    for (const [formField, dbField] of Object.entries(mapeamento)) {
        const valor = formData.get(formField);
        if (valor !== null) {
            dados[dbField] = valor.trim();
        }
    }
    
    // Adicionar metadados
    dados.dataInclusao = new Date().toISOString();
    dados.fonte = 'cadastro_manual';
    dados.usuario = getCurrentUserEmail() || 'sistema';
    
    return dados;
}

function validarDadosObrigatorios(dados) {
    const camposObrigatorios = [
        { campo: 'Projeto', nome: 'Projeto' },
        { campo: 'Sub Projeto', nome: 'Sub Projeto' },
        { campo: 'Tipo de Ação', nome: 'Tipo de Ação' },
        { campo: 'Condominio', nome: 'Condomínio' },
        { campo: 'ENDEREÇO', nome: 'Endereço' },
        { campo: 'Cidade', nome: 'Cidade' },
        { campo: 'HP', nome: 'HP' },
        { campo: 'EQUIPE', nome: 'Equipe' },
        { campo: 'Supervisor', nome: 'Supervisor' },
        { campo: 'Status', nome: 'Status' }
    ];
    
    for (const campo of camposObrigatorios) {
        if (!dados[campo.campo] || dados[campo.campo].trim() === '') {
            throw new Error(`Campo ${campo.nome} é obrigatório`);
        }
    }
    
    // Validar HP
    const hp = parseInt(dados.HP);
    if (isNaN(hp) || hp <= 0) {
        throw new Error('HP deve ser um número maior que zero');
    }
    dados.HP = hp;
}

async function salvarEnderecoFirestore(dados) {
    console.log('💾 [ENDERECO-GESTAO] Salvando no Firestore...');
    
    const db = firebase.firestore();
    
    try {
        const docRef = await db.collection(ENDERECO_GESTAO_CONFIG.collections.enderecos).add({
            ...dados,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ [ENDERECO-GESTAO] Documento salvo com ID:', docRef.id);
        return docRef.id;
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao salvar no Firestore:', error);
        throw new Error('Erro ao salvar no banco de dados: ' + error.message);
    }
}

async function adicionarLinhaTabela(dados, id) {
    console.log('📊 [ENDERECO-GESTAO] Adicionando linha à tabela...');
    
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.warn('⚠️ [ENDERECO-GESTAO] Tabela enderecoTableBody não encontrada');
        return;
    }
    
    // Remover linha de estado vazio se existir
    const emptyRow = tbody.querySelector('.empty-state');
    if (emptyRow) {
        emptyRow.remove();
    }
    
    // Criar nova linha
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
        <td>${dados.Projeto || ''}</td>
        <td>${dados['Sub Projeto'] || ''}</td>
        <td>${dados['Tipo de Ação'] || ''}</td>
        <td>${dados.CONTRATO || ''}</td>
        <td>${dados.Condominio || ''}</td>
        <td>${dados.ENDEREÇO || ''}</td>
        <td>${dados.Cidade || ''}</td>
        <td>${dados.PEP || ''}</td>
        <td>${dados['COD IMOVEL GED'] || ''}</td>
        <td>${dados['NODE GERENCIAL'] || ''}</td>
        <td>${dados['Área Técnica'] || ''}</td>
        <td>${dados.HP || ''}</td>
        <td>${dados.ANDAR || ''}</td>
        <td>${formatarData(dados['DATA RECEBIMENTO']) || ''}</td>
        <td>${formatarData(dados['DATA INICIO']) || ''}</td>
        <td>${formatarData(dados['DATA FINAL']) || ''}</td>
        <td>${dados.EQUIPE || ''}</td>
        <td>${dados.Supervisor || ''}</td>
        <td><span class="status-badge ${(dados.Status || '').toLowerCase()}">${dados.Status || ''}</span></td>
        <td>${dados.RDO || ''}</td>
        <td>${dados.BOOK || ''}</td>
        <td>${dados.PROJETO || ''}</td>
        <td>${dados.JUSTIFICATIVA || ''}</td>
        <td>${dados.Observação || ''}</td>
        <td>${dados.Observação || ''}</td>
        <td>
            <button class="btn-edit" onclick="editarEndereco('${id}')" title="Editar">✏️</button>
            <button class="btn-delete" onclick="excluirEndereco('${id}')" title="Excluir">🗑️</button>
        </td>
    `;
    
    // Adicionar no topo da tabela
    tbody.insertBefore(novaLinha, tbody.firstChild);
    
    // Atualizar estatísticas
    atualizarEstatisticas();
    
    console.log('✅ [ENDERECO-GESTAO] Linha adicionada à tabela');
}

// ============= CARREGAMENTO DA TABELA =============
async function carregarTabelaEnderecos() {
    console.log('🔄 [ENDERECO-GESTAO] Carregando tabela de endereços...');
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection(ENDERECO_GESTAO_CONFIG.collections.enderecos)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        
        const tbody = document.getElementById('enderecoTableBody');
        if (!tbody) {
            console.warn('⚠️ [ENDERECO-GESTAO] Tabela enderecoTableBody não encontrada');
            return;
        }
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="26">
                        <div class="empty-state-content">
                            <div class="empty-icon">📊</div>
                            <h3>Tabela Vazia</h3>
                            <p>Clique em "Novo Endereço" para adicionar o primeiro registro</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const linhas = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            linhas.push(`
                <tr>
                    <td>${dados.Projeto || ''}</td>
                    <td>${dados['Sub Projeto'] || ''}</td>
                    <td>${dados['Tipo de Ação'] || ''}</td>
                    <td>${dados.CONTRATO || ''}</td>
                    <td>${dados.Condominio || ''}</td>
                    <td>${dados.ENDEREÇO || ''}</td>
                    <td>${dados.Cidade || ''}</td>
                    <td>${dados.PEP || ''}</td>
                    <td>${dados['COD IMOVEL GED'] || ''}</td>
                    <td>${dados['NODE GERENCIAL'] || ''}</td>
                    <td>${dados['Área Técnica'] || ''}</td>
                    <td>${dados.HP || ''}</td>
                    <td>${dados.ANDAR || ''}</td>
                    <td>${formatarData(dados['DATA RECEBIMENTO']) || ''}</td>
                    <td>${formatarData(dados['DATA INICIO']) || ''}</td>
                    <td>${formatarData(dados['DATA FINAL']) || ''}</td>
                    <td>${dados.EQUIPE || ''}</td>
                    <td>${dados.Supervisor || ''}</td>
                    <td><span class="status-badge ${(dados.Status || '').toLowerCase()}">${dados.Status || ''}</span></td>
                    <td>${dados.RDO || ''}</td>
                    <td>${dados.BOOK || ''}</td>
                    <td>${dados.PROJETO || ''}</td>
                    <td>${dados.JUSTIFICATIVA || ''}</td>
                    <td>${dados.Observação || ''}</td>
                    <td>${dados.Observação || ''}</td>
                    <td>
                        <button class="btn-edit" onclick="editarEndereco('${doc.id}')" title="Editar">✏️</button>
                        <button class="btn-delete" onclick="excluirEndereco('${doc.id}')" title="Excluir">🗑️</button>
                    </td>
                </tr>
            `);
        });
        
        tbody.innerHTML = linhas.join('');
        
        // Atualizar estatísticas
        atualizarEstatisticas();
        
        console.log(`✅ [ENDERECO-GESTAO] Tabela carregada com ${snapshot.size} registros`);
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao carregar tabela:', error);
    }
}

// ============= FUNÇÕES AUXILIARES =============
function getCurrentUserEmail() {
    if (window.auth && window.auth.currentUser) {
        return window.auth.currentUser.email;
    }
    return null;
}

function formatarData(dataString) {
    if (!dataString) return '';
    
    try {
        const data = new Date(dataString);
        return data.toLocaleDateString('pt-BR');
    } catch (error) {
        return dataString;
    }
}

function mostrarMensagem(mensagem, tipo = 'info') {
    if (window.showCustomNotification && typeof window.showCustomNotification === 'function') {
        const titulo = tipo === 'error' ? '❌ Erro' : tipo === 'success' ? '✅ Sucesso' : 'ℹ️ Info';
        window.showCustomNotification(titulo, mensagem, tipo);
    } else {
        alert(mensagem);
    }
}

function fecharModal() {
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function atualizarEstatisticas() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection(ENDERECO_GESTAO_CONFIG.collections.enderecos).get();
        
        const total = snapshot.size;
        let produtivos = 0;
        const enderecosUnicos = new Set();
        const equipesUnicas = new Set();
        
        snapshot.forEach(doc => {
            const dados = doc.data();
            if (dados.Status === 'PRODUTIVA') produtivos++;
            if (dados.ENDEREÇO) enderecosUnicos.add(dados.ENDEREÇO);
            if (dados.EQUIPE) equipesUnicas.add(dados.EQUIPE);
        });
        
        const produtividade = total > 0 ? Math.round((produtivos / total) * 100) : 0;
        
        // Atualizar cards de estatística
        const stats = [
            { id: 'statTotalRegistros', valor: total },
            { id: 'statEnderecosDistintos', valor: enderecosUnicos.size },
            { id: 'statEquipesDistintas', valor: equipesUnicas.size },
            { id: 'statProdutividade', valor: `${produtividade}%` }
        ];
        
        stats.forEach(stat => {
            const elemento = document.getElementById(stat.id);
            if (elemento) {
                elemento.textContent = stat.valor;
            }
        });
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao atualizar estatísticas:', error);
    }
}

// ============= FUNÇÕES GLOBAIS PARA EDIÇÃO E EXCLUSÃO =============
window.editarEndereco = function(id) {
    console.log('✏️ [ENDERECO-GESTAO] Editando endereço:', id);
    // TODO: Implementar edição
    mostrarMensagem('Funcionalidade de edição será implementada em breve', 'info');
};

window.excluirEndereco = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        await db.collection(ENDERECO_GESTAO_CONFIG.collections.enderecos).doc(id).delete();
        
        // Recarregar tabela
        await carregarTabelaEnderecos();
        
        mostrarMensagem('✅ Endereço excluído com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao excluir:', error);
        mostrarMensagem('❌ Erro ao excluir endereço', 'error');
    }
};

// ============= FUNÇÕES GLOBAIS PARA RECARREGAMENTO =============
window.recarregarDadosGestao = async function() {
    try {
        mostrarMensagem('🔄 Recarregando dados...', 'info');
        await carregarDadosGestao();
        await carregarTabelaEnderecos();
        mostrarMensagem('✅ Dados recarregados!', 'success');
    } catch (error) {
        console.error('❌ [ENDERECO-GESTAO] Erro ao recarregar:', error);
        mostrarMensagem('❌ Erro ao recarregar dados', 'error');
    }
};

// ============= SUBSTITUIR FUNÇÃO GLOBAL =============
window.abrirNovoEndereco = function() {
    if (!sistemaCarregado) {
        mostrarMensagem('⏳ Sistema ainda carregando, aguarde...', 'info');
        return;
    }
    
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Garantir que os dropdowns estão atualizados
        if (dadosGestao.projetos.length === 0) {
            console.log('🔄 [ENDERECO-GESTAO] Recarregando dados de gestão...');
            carregarDadosGestao();
        }
    }
};

console.log('✅ [ENDERECO-GESTAO] Sistema integrado carregado e pronto para uso!');