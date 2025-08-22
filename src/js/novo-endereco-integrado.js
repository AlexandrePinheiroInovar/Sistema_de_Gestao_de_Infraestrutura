// ============= NOVO SISTEMA DE ENDEREÇOS INTEGRADO =============
console.log('🏠 [NOVO-ENDERECO] Inicializando sistema de cadastro integrado v2.0...');

// ============= CONFIGURAÇÕES =============
const ENDERECO_CONFIG = {
    collections: {
        enderecos: 'enderecos_mdu', // Usar apenas uma coleção para tudo
        enderecos_origem: 'enderecos', // Coleção com dados antigos (migrar para enderecos_mdu)
        projetos: 'nova_gestao_projetos',
        subprojetos: 'nova_gestao_subprojetos',
        tiposAcao: 'nova_gestao_tipos_acao',
        supervisores: 'nova_gestao_supervisores',
        equipes: 'nova_gestao_equipes',
        cidades: 'nova_gestao_cidades'
    }
};

let sistemaCarregado = false;
let dadosGestao = {};
let paginaAtual = 1;
let itensPorPagina = 100;
let totalPaginas = 1;
let todosOsDados = [];

// ============= INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 [NOVO-ENDERECO] DOM carregado, aguardando Firebase...');
    setTimeout(inicializarNovoSistema, 2000);
});

async function inicializarNovoSistema() {
    try {
        if (!window.firebase || !firebase.firestore) {
            console.warn('⚠️ [NOVO-ENDERECO] Firebase não disponível, reagendando...');
            setTimeout(inicializarNovoSistema, 1000);
            return;
        }

        console.log('🔥 [NOVO-ENDERECO] Firebase disponível, carregando dados...');
        
        // Primeiro, migrar dados antigos se necessário
        await migrarDadosAntigos();
        
        await carregarDadosDaGestao();
        configurarFormularioEndereco();
        await carregarTabelaEnderecos();
        
        sistemaCarregado = true;
        console.log('✅ [NOVO-ENDERECO] Sistema integrado inicializado!');
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro na inicialização:', error);
    }
}

// ============= MIGRAÇÃO DE DADOS ANTIGOS =============
async function migrarDadosAntigos() {
    try {
        const db = firebase.firestore();
        
        // Verificar se já existem dados na coleção de destino
        const destinoSnapshot = await db.collection(ENDERECO_CONFIG.collections.enderecos).limit(1).get();
        
        if (!destinoSnapshot.empty) {
            console.log('✅ [NOVO-ENDERECO] Dados já existem na coleção unificada, pulando migração');
            return;
        }
        
        console.log('🔄 [NOVO-ENDERECO] Iniciando migração de dados antigos...');
        
        // Buscar dados da coleção antiga
        const origemSnapshot = await db.collection(ENDERECO_CONFIG.collections.enderecos_origem).get();
        
        if (origemSnapshot.empty) {
            console.log('ℹ️ [NOVO-ENDERECO] Nenhum dado antigo para migrar');
            return;
        }
        
        const batch = db.batch();
        let contador = 0;
        
        origemSnapshot.forEach(doc => {
            const dadosAntigos = doc.data();
            
            // Mapear dados antigos para novo formato
            const dadosNovos = {
                // Campos básicos com mapeamento
                projeto: dadosAntigos.projeto || dadosAntigos.Projeto || '',
                subProjeto: dadosAntigos.subProjeto || dadosAntigos['Sub Projeto'] || '',
                tipoAcao: dadosAntigos.tipoAcao || dadosAntigos['Tipo de Ação'] || '',
                contrato: dadosAntigos.contrato || dadosAntigos.CONTRATO || '',
                condominio: dadosAntigos.condominio || dadosAntigos.Condominio || '',
                endereco: dadosAntigos.endereco || dadosAntigos.ENDEREÇO || '',
                cidade: dadosAntigos.cidade || dadosAntigos.Cidade || '',
                pep: dadosAntigos.pep || dadosAntigos.PEP || '',
                codImovelGed: dadosAntigos.codImovelGed || dadosAntigos['COD IMOVEL GED'] || '',
                nodeGerencial: dadosAntigos.nodeGerencial || dadosAntigos['NODE GERENCIAL'] || '',
                areaTecnica: dadosAntigos.areaTecnica || dadosAntigos['Área Técnica'] || '',
                hp: dadosAntigos.hp || dadosAntigos.HP || '',
                andar: dadosAntigos.andar || dadosAntigos.ANDAR || '',
                dataRecebimento: dadosAntigos.dataRecebimento || dadosAntigos['DATA RECEBIMENTO'] || '',
                dataInicio: dadosAntigos.dataInicio || dadosAntigos['DATA INICIO'] || '',
                dataFinal: dadosAntigos.dataFinal || dadosAntigos['DATA FINAL'] || '',
                equipe: dadosAntigos.equipe || dadosAntigos.EQUIPE || '',
                supervisor: dadosAntigos.supervisor || dadosAntigos.Supervisor || '',
                status: dadosAntigos.status || dadosAntigos.Status || '',
                rdo: dadosAntigos.rdo || dadosAntigos.RDO || '',
                book: dadosAntigos.book || dadosAntigos.BOOK || '',
                projetoStatus: dadosAntigos.projetoStatus || dadosAntigos.PROJETO || '',
                justificativa: dadosAntigos.justificativa || dadosAntigos.JUSTIFICATIVA || '',
                observacao: dadosAntigos.observacao || dadosAntigos.Observação || '',
                
                // Metadados
                dataInclusao: dadosAntigos.dataInclusao || dadosAntigos.timestamp || new Date().toISOString(),
                usuario: dadosAntigos.usuario || 'migração_sistema',
                fonte: 'migração_planilha',
                documentoOriginal: doc.id
            };
            
            // Adicionar ao batch
            const novaRef = db.collection(ENDERECO_CONFIG.collections.enderecos).doc();
            batch.set(novaRef, dadosNovos);
            contador++;
        });
        
        // Executar migração
        await batch.commit();
        console.log(`✅ [NOVO-ENDERECO] Migração concluída: ${contador} registros movidos para ${ENDERECO_CONFIG.collections.enderecos}`);
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro na migração:', error);
        // Continuar mesmo se a migração falhar
    }
}

// ============= CARREGAMENTO DOS DADOS DE GESTÃO =============
async function carregarDadosDaGestao() {
    console.log('📊 [NOVO-ENDERECO] Carregando dados das tabelas de gestão...');
    
    try {
        const db = firebase.firestore();
        
        // Carregar dados em paralelo
        const [projetos, subprojetos, tiposAcao, supervisores, equipes, cidades] = await Promise.all([
            db.collection(ENDERECO_CONFIG.collections.projetos).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_CONFIG.collections.subprojetos).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_CONFIG.collections.tiposAcao).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_CONFIG.collections.supervisores).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_CONFIG.collections.equipes).where('status', '==', 'ATIVO').get(),
            db.collection(ENDERECO_CONFIG.collections.cidades).where('status', '==', 'ATIVO').get()
        ]);

        // Processar snapshots
        dadosGestao = {
            projetos: processarSnapshot(projetos),
            subprojetos: processarSnapshot(subprojetos),
            tiposAcao: processarSnapshot(tiposAcao),
            supervisores: processarSnapshot(supervisores),
            equipes: processarSnapshot(equipes),
            cidades: processarSnapshot(cidades)
        };

        console.log('✅ [NOVO-ENDERECO] Dados carregados:', {
            projetos: dadosGestao.projetos.length,
            subprojetos: dadosGestao.subprojetos.length,
            tiposAcao: dadosGestao.tiposAcao.length,
            supervisores: dadosGestao.supervisores.length,
            equipes: dadosGestao.equipes.length,
            cidades: dadosGestao.cidades.length
        });
        
        // Atualizar dropdowns
        await atualizarDropdownsModal();
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro ao carregar dados de gestão:', error);
    }
}

function processarSnapshot(snapshot) {
    const dados = [];
    snapshot.forEach(doc => {
        dados.push({
            id: doc.id,
            nome: doc.data().nome || '',
            ...doc.data()
        });
    });
    return dados.sort((a, b) => a.nome.localeCompare(b.nome));
}

// ============= ATUALIZAÇÃO DOS DROPDOWNS =============
async function atualizarDropdownsModal() {
    console.log('🔄 [NOVO-ENDERECO] Atualizando dropdowns do modal...');
    
    const dropdownMappings = [
        { id: 'projeto', dados: dadosGestao.projetos },
        { id: 'subProjeto', dados: dadosGestao.subprojetos },
        { id: 'tipoAcao', dados: dadosGestao.tiposAcao },
        { id: 'supervisor', dados: dadosGestao.supervisores },
        { id: 'equipe', dados: dadosGestao.equipes },
        { id: 'cidade', dados: dadosGestao.cidades }
    ];
    
    dropdownMappings.forEach(({ id, dados }) => {
        const select = document.getElementById(id);
        if (select) {
            // Manter primeira opção
            const defaultOption = select.querySelector('option[value=""]');
            select.innerHTML = '';
            
            if (defaultOption) {
                select.appendChild(defaultOption);
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Selecione...';
                select.appendChild(option);
            }
            
            // Adicionar dados
            dados.forEach(item => {
                const option = document.createElement('option');
                option.value = item.nome;
                option.textContent = item.nome;
                select.appendChild(option);
            });
            
            console.log(`✅ Dropdown ${id} atualizado com ${dados.length} opções`);
        }
    });
}

// ============= CONFIGURAÇÃO DO FORMULÁRIO =============
function configurarFormularioEndereco() {
    console.log('⚙️ [NOVO-ENDERECO] Configurando formulário...');
    
    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.warn('⚠️ [NOVO-ENDERECO] Formulário não encontrado');
        return;
    }
    
    // Remover listeners antigos
    const cloneForm = form.cloneNode(true);
    form.parentNode.replaceChild(cloneForm, form);
    
    // Adicionar novo listener
    document.getElementById('enderecoForm').addEventListener('submit', processarNovoEndereco);
    
    console.log('✅ [NOVO-ENDERECO] Formulário configurado');
}

// ============= PROCESSAMENTO DO NOVO ENDEREÇO =============
async function processarNovoEndereco(event) {
    event.preventDefault();
    
    console.log('💾 [NOVO-ENDERECO] Processando novo endereço...');
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    
    try {
        // Desabilitar botão
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
        
        // Coletar dados
        const dadosFormulario = coletarDadosFormulario(event.target);
        
        // Validar
        validarDadosEndereco(dadosFormulario);
        
        // Salvar no Firestore
        const docId = await salvarEnderecoFirestore(dadosFormulario);
        
        // Adicionar à tabela
        await adicionarEnderecoNaTabela(dadosFormulario, docId);
        
        // Limpar e fechar
        event.target.reset();
        fecharModalEndereco();
        
        // Atualizar estatísticas
        await atualizarEstatisticasEnderecos();
        
        mostrarMensagem('✅ Endereço cadastrado com sucesso!', 'success');
        console.log('✅ [NOVO-ENDERECO] Endereço salvo:', docId);
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro ao salvar:', error);
        mostrarMensagem(`❌ Erro: ${error.message}`, 'error');
    } finally {
        // Reabilitar botão
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function coletarDadosFormulario(form) {
    const formData = new FormData(form);
    const dados = {};
    
    // Mapear campos
    const campos = [
        'projeto', 'subProjeto', 'tipoAcao', 'contrato', 'condominio', 
        'endereco', 'cidade', 'pep', 'codImovelGed', 'nodeGerencial', 
        'areaTecnica', 'hp', 'andar', 'dataRecebimento', 'dataInicio', 
        'dataFinal', 'equipe', 'supervisor', 'status', 'rdo', 'book', 
        'projetoStatus', 'justificativa', 'observacao'
    ];
    
    campos.forEach(campo => {
        const valor = formData.get(campo);
        if (valor !== null) {
            dados[campo] = valor.trim();
        }
    });
    
    // Metadados
    dados.dataInclusao = new Date().toISOString();
    dados.usuario = getCurrentUserEmail() || 'sistema';
    dados.fonte = 'cadastro_manual';
    
    return dados;
}

function validarDadosEndereco(dados) {
    const obrigatorios = [
        'projeto', 'subProjeto', 'tipoAcao', 'condominio', 
        'endereco', 'cidade', 'hp', 'equipe', 'supervisor', 'status'
    ];
    
    for (const campo of obrigatorios) {
        if (!dados[campo] || dados[campo] === '') {
            throw new Error(`Campo ${campo} é obrigatório`);
        }
    }
    
    // Validar HP
    const hp = parseInt(dados.hp);
    if (isNaN(hp) || hp <= 0) {
        throw new Error('HP deve ser um número maior que zero');
    }
    dados.hp = hp;
}

async function salvarEnderecoFirestore(dados) {
    const db = firebase.firestore();
    
    const docRef = await db.collection(ENDERECO_CONFIG.collections.enderecos).add({
        ...dados,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    return docRef.id;
}

// ============= ATUALIZAÇÃO DA TABELA =============
async function adicionarEnderecoNaTabela(dados, docId) {
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) return;
    
    // Remover estado vazio
    const emptyState = tbody.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Criar nova linha
    const novaLinha = document.createElement('tr');
    novaLinha.innerHTML = `
        <td>${dados.projeto}</td>
        <td>${dados.subProjeto}</td>
        <td>${dados.tipoAcao}</td>
        <td>${dados.contrato}</td>
        <td>${dados.condominio}</td>
        <td>${dados.endereco}</td>
        <td>${dados.cidade}</td>
        <td>${dados.pep}</td>
        <td>${dados.codImovelGed}</td>
        <td>${dados.nodeGerencial}</td>
        <td>${dados.areaTecnica}</td>
        <td>${dados.hp}</td>
        <td>${dados.andar}</td>
        <td>${formatarData(dados.dataRecebimento)}</td>
        <td>${formatarData(dados.dataInicio)}</td>
        <td>${formatarData(dados.dataFinal)}</td>
        <td>${dados.equipe}</td>
        <td>${dados.supervisor}</td>
        <td><span class="status-badge ${dados.status.toLowerCase()}">${dados.status}</span></td>
        <td>${dados.rdo}</td>
        <td>${dados.book}</td>
        <td>${dados.projetoStatus}</td>
        <td>${dados.justificativa}</td>
        <td>${dados.observacao}</td>
        <td>${dados.observacao}</td>
        <td>
            <button class="btn-edit" onclick="editarEndereco('${docId}')" title="Editar">✏️</button>
            <button class="btn-delete" onclick="excluirEndereco('${docId}')" title="Excluir">🗑️</button>
        </td>
    `;
    
    // Adicionar no topo
    tbody.insertBefore(novaLinha, tbody.firstChild);
}

async function carregarTabelaEnderecos() {
    console.log('📋 [NOVO-ENDERECO] Carregando tabela de endereços...');
    
    try {
        const db = firebase.firestore();
        
        // Carregar TODOS os dados da coleção unificada (enderecos_mdu) - sem limit para paginação
        const snapshot = await db.collection(ENDERECO_CONFIG.collections.enderecos)
            .orderBy('dataInclusao', 'desc')
            .get();
        
        const tbody = document.getElementById('enderecoTableBody');
        if (!tbody) {
            console.warn('⚠️ [NOVO-ENDERECO] Elemento enderecoTableBody não encontrado');
            return;
        }
        
        if (snapshot.empty) {
            tbody.innerHTML = `
                <tr class="empty-state">
                    <td colspan="26">
                        <div class="empty-state-content">
                            <div class="empty-icon">📊</div>
                            <h3>Tabela Vazia</h3>
                            <p>Clique em "Novo Endereço" para adicionar registros</p>
                        </div>
                    </td>
                </tr>
            `;
            await criarControlsPaginacao(0);
            return;
        }
        
        // Armazenar todos os dados para paginação
        todosOsDados = [];
        snapshot.forEach(doc => {
            const dados = doc.data();
            todosOsDados.push({ id: doc.id, ...dados });
        });
        
        console.log(`📊 [NOVO-ENDERECO] Total de ${todosOsDados.length} registros carregados`);
        
        // Calcular paginação
        totalPaginas = Math.ceil(todosOsDados.length / itensPorPagina);
        
        // Exibir primeira página
        exibirPagina(1);
        
        // Criar controles de paginação
        await criarControlsPaginacao(todosOsDados.length);
        
        // Atualizar estatísticas após carregar
        await atualizarEstatisticasEnderecos();
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro ao carregar tabela:', error);
        
        // Em caso de erro, tentar usar sistema antigo se disponível
        if (window.FirestoreIntegration && typeof window.FirestoreIntegration.loadEnderecos === 'function') {
            console.log('🔄 [NOVO-ENDERECO] Tentando usar sistema FirestoreIntegration...');
            try {
                const enderecos = await window.FirestoreIntegration.loadEnderecos();
                const tbody = document.getElementById('enderecoTableBody');
                if (tbody && enderecos.length > 0) {
                    // Usar formato do sistema antigo
                    tbody.innerHTML = enderecos.map(endereco => `
                        <tr>
                            <td>${endereco.projeto || ''}</td>
                            <td>${endereco.subProjeto || ''}</td>
                            <td>${endereco.tipoAcao || ''}</td>
                            <td>${endereco.contrato || ''}</td>
                            <td>${endereco.condominio || ''}</td>
                            <td>${endereco.endereco || ''}</td>
                            <td>${endereco.cidade || ''}</td>
                            <td>${endereco.pep || ''}</td>
                            <td>${endereco.codImovelGed || ''}</td>
                            <td>${endereco.nodeGerencial || ''}</td>
                            <td>${endereco.areaTecnica || ''}</td>
                            <td>${endereco.hp || ''}</td>
                            <td>${endereco.andar || ''}</td>
                            <td>${endereco.dataRecebimento || ''}</td>
                            <td>${endereco.dataInicio || ''}</td>
                            <td>${endereco.dataFinal || ''}</td>
                            <td>${endereco.equipe || ''}</td>
                            <td>${endereco.supervisor || ''}</td>
                            <td><span class="status-badge ${endereco.status?.toLowerCase()}">${endereco.status || ''}</span></td>
                            <td>${endereco.rdo || ''}</td>
                            <td>${endereco.book || ''}</td>
                            <td>${endereco.projetoStatus || ''}</td>
                            <td>${endereco.situacao || ''}</td>
                            <td>${endereco.justificativa || ''}</td>
                            <td>${endereco.observacao || ''}</td>
                            <td>
                                <button class="btn-edit" onclick="editarEndereco('${endereco.id}')" title="Editar">✏️</button>
                                <button class="btn-delete" onclick="excluirEndereco('${endereco.id}')" title="Excluir">🗑️</button>
                            </td>
                        </tr>
                    `).join('');
                    console.log('✅ [NOVO-ENDERECO] Fallback carregado com sucesso');
                }
            } catch (fallbackError) {
                console.error('❌ [NOVO-ENDERECO] Fallback também falhou:', fallbackError);
            }
        }
    }
}

// ============= ESTATÍSTICAS =============
async function atualizarEstatisticasEnderecos() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection(ENDERECO_CONFIG.collections.enderecos).get();
        
        const total = snapshot.size;
        let produtivos = 0;
        const enderecosUnicos = new Set();
        const equipesUnicas = new Set();
        
        snapshot.forEach(doc => {
            const dados = doc.data();
            if (dados.status === 'PRODUTIVA') produtivos++;
            if (dados.endereco) enderecosUnicos.add(dados.endereco);
            if (dados.equipe) equipesUnicas.add(dados.equipe);
        });
        
        const produtividade = total > 0 ? Math.round((produtivos / total) * 100) : 0;
        
        // Atualizar elementos
        const stats = [
            { id: 'statTotalRegistros', valor: total },
            { id: 'statEnderecosDistintos', valor: enderecosUnicos.size },
            { id: 'statEquipesDistintas', valor: equipesUnicas.size },
            { id: 'statProdutividade', valor: `${produtividade}%` }
        ];
        
        stats.forEach(({ id, valor }) => {
            const el = document.getElementById(id);
            if (el) el.textContent = valor;
        });
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro ao atualizar estatísticas:', error);
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
        return new Date(dataString).toLocaleDateString('pt-BR');
    } catch {
        return dataString;
    }
}

function mostrarMensagem(mensagem, tipo = 'info') {
    if (window.showCustomNotification) {
        const titulo = tipo === 'error' ? '❌ Erro' : tipo === 'success' ? '✅ Sucesso' : 'ℹ️ Info';
        window.showCustomNotification(titulo, mensagem, tipo);
    } else {
        alert(mensagem);
    }
}

function fecharModalEndereco() {
    const modal = document.getElementById('crudModal');
    if (modal) modal.style.display = 'none';
}

// ============= FUNÇÕES GLOBAIS =============
window.editarEndereco = function(id) {
    console.log('✏️ [NOVO-ENDERECO] Editando:', id);
    mostrarMensagem('Funcionalidade de edição será implementada', 'info');
};

window.excluirEndereco = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) return;
    
    try {
        const db = firebase.firestore();
        await db.collection(ENDERECO_CONFIG.collections.enderecos).doc(id).delete();
        await carregarTabelaEnderecos();
        await atualizarEstatisticasEnderecos();
        mostrarMensagem('✅ Endereço excluído!', 'success');
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO] Erro ao excluir:', error);
        mostrarMensagem('❌ Erro ao excluir', 'error');
    }
};

// ============= SUBSTITUIR FUNÇÃO PRINCIPAL =============
window.abrirNovoEndereco = function() {
    if (!sistemaCarregado) {
        mostrarMensagem('⏳ Sistema carregando, aguarde...', 'info');
        return;
    }
    
    console.log('🏠 [NOVO-ENDERECO] Abrindo modal...');
    
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Garantir que dropdowns estão atualizados
        if (Object.keys(dadosGestao).length === 0) {
            carregarDadosDaGestao();
        }
    }
};

// ============= FUNÇÃO DE DEBUG =============
window.debugNovoEndereco = function() {
    console.log('🔍 [DEBUG] Sistema carregado:', sistemaCarregado);
    console.log('🔍 [DEBUG] Dados gestão:', dadosGestao);
    console.log('🔍 [DEBUG] Firebase:', !!(window.firebase && firebase.firestore));
    return { sistemaCarregado, dadosGestao };
};

// ============= FUNÇÕES DE PAGINAÇÃO =============
function exibirPagina(numeroPagina) {
    paginaAtual = numeroPagina;
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const dadosPagina = todosOsDados.slice(inicio, fim);
    
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) return;
    
    const linhas = dadosPagina.map(registro => {
        // Mapear campos do Firestore para exibição (compatibilidade com dados antigos)
        const projeto = registro.projeto || registro.Projeto || '';
        const subProjeto = registro.subProjeto || registro['Sub Projeto'] || '';
        const tipoAcao = registro.tipoAcao || registro['Tipo de Ação'] || '';
        const condominio = registro.condominio || registro.Condominio || '';
        const endereco = registro.endereco || registro.ENDEREÇO || '';
        const cidade = registro.cidade || registro.Cidade || '';
        const equipe = registro.equipe || registro.EQUIPE || '';
        const supervisor = registro.supervisor || registro.Supervisor || '';
        const status = registro.status || registro.Status || '';
        
        return `
            <tr>
                <td>${projeto}</td>
                <td>${subProjeto}</td>
                <td>${tipoAcao}</td>
                <td>${registro.contrato || registro.CONTRATO || ''}</td>
                <td>${condominio}</td>
                <td>${endereco}</td>
                <td>${cidade}</td>
                <td>${registro.pep || registro.PEP || ''}</td>
                <td>${registro.codImovelGed || registro['COD IMOVEL GED'] || ''}</td>
                <td>${registro.nodeGerencial || registro['NODE GERENCIAL'] || ''}</td>
                <td>${registro.areaTecnica || registro['Área Técnica'] || ''}</td>
                <td>${registro.hp || registro.HP || ''}</td>
                <td>${registro.andar || registro.ANDAR || ''}</td>
                <td>${formatarData(registro.dataRecebimento || registro['DATA RECEBIMENTO'])}</td>
                <td>${formatarData(registro.dataInicio || registro['DATA INICIO'])}</td>
                <td>${formatarData(registro.dataFinal || registro['DATA FINAL'])}</td>
                <td>${equipe}</td>
                <td>${supervisor}</td>
                <td><span class="status-badge ${status.toLowerCase()}">${status}</span></td>
                <td>${registro.rdo || registro.RDO || ''}</td>
                <td>${registro.book || registro.BOOK || ''}</td>
                <td>${registro.projetoStatus || registro.PROJETO || ''}</td>
                <td>${registro.justificativa || registro.JUSTIFICATIVA || ''}</td>
                <td>${registro.observacao || registro.Observação || ''}</td>
                <td>${registro.observacao || registro.Observação || ''}</td>
                <td>
                    <button class="btn-edit" onclick="editarEndereco('${registro.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="excluirEndereco('${registro.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = linhas.join('');
    
    // Atualizar controles de paginação
    atualizarControlsPaginacao();
    
    console.log(`📄 [NOVO-ENDERECO] Página ${paginaAtual}/${totalPaginas} (${dadosPagina.length} registros)`);
}

async function criarControlsPaginacao(totalRegistros) {
    // Procurar ou criar container de paginação
    let paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'paginationControls';
        paginationContainer.className = 'pagination-controls';
        
        // Inserir após a tabela
        const tableContainer = document.getElementById('enderecoTableContainer');
        if (tableContainer) {
            tableContainer.appendChild(paginationContainer);
        }
    }
    
    if (totalRegistros === 0) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    paginationContainer.innerHTML = `
        <div class="pagination-info">
            <span>Total: <strong>${totalRegistros.toLocaleString()}</strong> registros | 
            Exibindo <strong>${itensPorPagina}</strong> por página</span>
        </div>
        <div class="pagination-buttons">
            <button onclick="irParaPagina(1)" ${paginaAtual === 1 ? 'disabled' : ''}>
                ⏪ Primeira
            </button>
            <button onclick="irParaPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>
                ◀️ Anterior
            </button>
            <span class="pagination-current">
                Página <strong>${paginaAtual}</strong> de <strong>${totalPaginas}</strong>
            </span>
            <button onclick="irParaPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>
                Próxima ▶️
            </button>
            <button onclick="irParaPagina(${totalPaginas})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>
                Última ⏩
            </button>
        </div>
        <div class="pagination-options">
            <label for="itensPorPaginaSelect">Itens por página:</label>
            <select id="itensPorPaginaSelect" onchange="alterarItensPorPagina(this.value)">
                <option value="50" ${itensPorPagina === 50 ? 'selected' : ''}>50</option>
                <option value="100" ${itensPorPagina === 100 ? 'selected' : ''}>100</option>
                <option value="200" ${itensPorPagina === 200 ? 'selected' : ''}>200</option>
                <option value="500" ${itensPorPagina === 500 ? 'selected' : ''}>500</option>
            </select>
        </div>
    `;
}

function atualizarControlsPaginacao() {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    // Atualizar apenas os botões
    const buttons = paginationContainer.querySelector('.pagination-buttons');
    
    if (buttons) {
        buttons.innerHTML = `
            <button onclick="irParaPagina(1)" ${paginaAtual === 1 ? 'disabled' : ''}>
                ⏪ Primeira
            </button>
            <button onclick="irParaPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>
                ◀️ Anterior
            </button>
            <span class="pagination-current">
                Página <strong>${paginaAtual}</strong> de <strong>${totalPaginas}</strong>
            </span>
            <button onclick="irParaPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>
                Próxima ▶️
            </button>
            <button onclick="irParaPagina(${totalPaginas})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>
                Última ⏩
            </button>
        `;
    }
}

// Funções globais para controles de paginação
window.irParaPagina = function(numeroPagina) {
    if (numeroPagina < 1 || numeroPagina > totalPaginas) return;
    exibirPagina(numeroPagina);
};

window.alterarItensPorPagina = function(novoValor) {
    itensPorPagina = parseInt(novoValor);
    totalPaginas = Math.ceil(todosOsDados.length / itensPorPagina);
    
    // Se a página atual não existir mais, ir para a última página válida
    if (paginaAtual > totalPaginas) {
        paginaAtual = totalPaginas;
    }
    
    exibirPagina(paginaAtual);
    criarControlsPaginacao(todosOsDados.length);
};

console.log('✅ [NOVO-ENDERECO] Sistema novo inicializado!');