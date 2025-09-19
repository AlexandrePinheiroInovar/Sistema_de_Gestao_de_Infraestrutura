// ============= SISTEMA DE GESTÃO DE PROJETOS - NOVA IMPLEMENTAÇÃO =============
console.log('🚀 [GESTAO-PROJETOS] Inicializando sistema de gestão de projetos...');

// ============= CONFIGURAÇÃO DAS TABELAS =============
const GESTAO_CONFIG = {
    projetos: {
        nome: 'Projetos',
        coluna: 'Projeto',
        colecao: 'nova_gestao_projetos',
        displayName: 'Projeto',
        tbody: 'projetosTableBody',
        icon: 'fas fa-building'
    },
    subprojetos: {
        nome: 'Sub Projetos',
        coluna: 'subProjeto',
        colecao: 'nova_gestao_subprojetos',
        displayName: 'Sub Projeto',
        tbody: 'subprojetosTableBody',
        icon: 'fas fa-sitemap'
    },
    'tipos-acao': {
        nome: 'Tipos de Ação',
        coluna: 'Tipo de Ação',
        colecao: 'nova_gestao_tipos_acao',
        displayName: 'Tipo de Ação',
        tbody: 'tiposAcaoTableBody',
        icon: 'fas fa-tasks'
    },
    supervisores: {
        nome: 'Supervisores',
        coluna: 'supervisor',
        colecao: 'nova_gestao_supervisores',
        displayName: 'Supervisor',
        tbody: 'supervisoresTableBody',
        icon: 'fas fa-user-tie'
    },
    equipes: {
        nome: 'Equipes',
        coluna: 'EQUIPE',
        colecao: 'nova_gestao_equipes',
        displayName: 'Equipe',
        tbody: 'equipesTableBody',
        icon: 'fas fa-users'
    },
    cidades: {
        nome: 'Cidades',
        coluna: 'Cidade',
        colecao: 'nova_gestao_cidades',
        displayName: 'Cidade',
        tbody: 'cidadesTableBody',
        icon: 'fas fa-map-marker-alt'
    }
};

// ============= VARIÁVEIS GLOBAIS =============
let sistemaIniciado = false;
let firebaseConectado = false;
let dadosCache = new Map();

// ============= SISTEMA PRINCIPAL =============
class GestaoProjetosSystem {
    constructor() {
        this.inicializado = false;
        this.cache = new Map();
    }

    async inicializar() {
        console.log('🔧 [GESTAO-PROJETOS] Aguardando Firebase...');
        
        // Aguardar Firebase estar disponível
        await this.aguardarFirebase();
        
        console.log('✅ [GESTAO-PROJETOS] Firebase conectado, iniciando sistema...');
        
        // Marcar como iniciado
        this.inicializado = true;
        sistemaIniciado = true;
        firebaseConectado = true;
        
        // Substituir função global
        window.showGestaoTab = this.mostrarAba.bind(this);
        
        console.log('🎯 [GESTAO-PROJETOS] Sistema iniciado com sucesso!');
    }

    async aguardarFirebase() {
        return new Promise((resolve, reject) => {
            let tentativas = 0;
            const maxTentativas = 30;
            
            const verificar = () => {
                if (window.firebase && firebase.firestore && firebase.auth) {
                    resolve();
                } else {
                    tentativas++;
                    if (tentativas >= maxTentativas) {
                        reject(new Error('Firebase não carregou em tempo hábil'));
                    } else {
                        setTimeout(verificar, 1000);
                    }
                }
            };
            
            verificar();
        });
    }

    async mostrarAba(tabId) {
        console.log(`🎯 [GESTAO-PROJETOS] Mostrando aba: ${tabId}`);
        
        if (!this.inicializado) {
            console.warn('⚠️ [GESTAO-PROJETOS] Sistema não iniciado ainda');
            return;
        }

        const config = GESTAO_CONFIG[tabId];
        if (!config) {
            console.error(`❌ [GESTAO-PROJETOS] Configuração não encontrada para: ${tabId}`);
            return;
        }

        // Gerenciar interface
        this.gerenciarInterface(tabId);
        
        // Carregar dados
        await this.carregarDadosAba(tabId, config);
    }

    gerenciarInterface(tabId) {
        // Esconder todas as abas
        document.querySelectorAll('.gestao-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remover classe active dos botões
        document.querySelectorAll('.gestao-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar aba selecionada
        const targetTab = document.getElementById(`gestao-${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // Ativar botão
        const activeButton = document.querySelector(`[onclick*="showGestaoTab('${tabId}'"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }

    async carregarDadosAba(tabId, config) {
        console.log(`🔄 [GESTAO-PROJETOS] Carregando dados para: ${tabId}`);
        
        try {
            // PASSO 1: Extrair dados únicos da coleção 'enderecos'
            console.log(`📊 [GESTAO-PROJETOS] Extraindo dados de: ${config.coluna}`);
            const dadosEnderecos = await this.extrairDadosEnderecos(config.coluna);
            
            // PASSO 2: Carregar dados salvos da coleção específica
            console.log(`🔥 [GESTAO-PROJETOS] Carregando coleção: ${config.colecao}`);
            const dadosSalvos = await this.carregarDadosSalvos(config.colecao);
            
            // PASSO 3: NOVO - Salvar automaticamente dados extraídos que não existem
            console.log(`💾 [GESTAO-PROJETOS] Salvando automaticamente dados novos...`);
            await this.salvarDadosAutomaticamente(dadosEnderecos, dadosSalvos, config.colecao);
            
            // PASSO 4: Recarregar dados salvos (agora com os novos)
            const dadosSalvosAtualizados = await this.carregarDadosSalvos(config.colecao);
            
            // PASSO 5: Combinar e preparar dados
            const dadosFinais = this.combinarDados(dadosEnderecos, dadosSalvosAtualizados);
            
            // PASSO 6: Renderizar tabela
            this.renderizarTabela(tabId, config, dadosFinais);
            
            console.log(`✅ [GESTAO-PROJETOS] Dados carregados para ${tabId}: ${dadosFinais.length} itens`);
            
        } catch (error) {
            console.error(`❌ [GESTAO-PROJETOS] Erro ao carregar dados para ${tabId}:`, error);
            this.mostrarErro(tabId, error.message);
        }
    }

    async extrairDadosEnderecos(coluna) {
        const snapshot = await firebase.firestore().collection('enderecos').get();
        const valoresUnicos = new Map();
        const contagemUsos = new Map();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const valor = data[coluna];
            
            if (valor && valor.trim()) {
                const valorLimpo = valor.trim();
                
                // Contar usos
                contagemUsos.set(valorLimpo, (contagemUsos.get(valorLimpo) || 0) + 1);
                
                // Guardar valor único
                if (!valoresUnicos.has(valorLimpo)) {
                    valoresUnicos.set(valorLimpo, {
                        nome: valorLimpo,
                        origem: 'extraido',
                        usos: 0
                    });
                }
            }
        });
        
        // Atualizar contagem
        valoresUnicos.forEach((item, key) => {
            item.usos = contagemUsos.get(key) || 0;
        });
        
        return Array.from(valoresUnicos.values());
    }

    async carregarDadosSalvos(colecao) {
        const snapshot = await firebase.firestore().collection(colecao).get();
        const dados = [];
        
        snapshot.forEach(doc => {
            dados.push({
                id: doc.id,
                ...doc.data(),
                origem: 'salvo'
            });
        });
        
        return dados;
    }

    async salvarDadosAutomaticamente(dadosExtriados, dadosSalvos, colecao) {
        console.log(`💾 [AUTO-SAVE] Iniciando salvamento automático para coleção: ${colecao}`);
        
        // Criar mapa dos dados já salvos
        const salvosMap = new Map();
        dadosSalvos.forEach(item => {
            salvosMap.set(item.nome, item);
        });
        
        // Identificar dados novos que precisam ser salvos
        const dadosParaSalvar = [];
        dadosExtriados.forEach(item => {
            if (!salvosMap.has(item.nome)) {
                dadosParaSalvar.push(item);
            }
        });
        
        if (dadosParaSalvar.length === 0) {
            console.log(`✅ [AUTO-SAVE] Nenhum dado novo para salvar em: ${colecao}`);
            return;
        }
        
        console.log(`📝 [AUTO-SAVE] Salvando ${dadosParaSalvar.length} itens novos em: ${colecao}`);
        
        // Salvar em lotes para melhor performance
        const loteSize = 10;
        const lotes = [];
        
        for (let i = 0; i < dadosParaSalvar.length; i += loteSize) {
            lotes.push(dadosParaSalvar.slice(i, i + loteSize));
        }
        
        try {
            for (let i = 0; i < lotes.length; i++) {
                const lote = lotes[i];
                const promises = lote.map(item => {
                    return firebase.firestore().collection(colecao).add({
                        nome: item.nome,
                        status: 'ATIVO',
                        origem: 'auto_extraido',
                        usos: item.usos || 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: 'sistema_automatico'
                    });
                });
                
                await Promise.all(promises);
                console.log(`✅ [AUTO-SAVE] Lote ${i + 1}/${lotes.length} salvo (${lote.length} itens)`);
            }
            
            console.log(`🎉 [AUTO-SAVE] Salvamento automático concluído! ${dadosParaSalvar.length} itens salvos em ${colecao}`);
            
        } catch (error) {
            console.error(`❌ [AUTO-SAVE] Erro no salvamento automático:`, error);
            throw error;
        }
    }

    combinarDados(dadosExtriados, dadosSalvos) {
        const resultado = [];
        const salvosMap = new Map();
        
        // Mapear dados salvos
        dadosSalvos.forEach(item => {
            salvosMap.set(item.nome, item);
            resultado.push(item);
        });
        
        // Adicionar extraídos que não estão salvos
        dadosExtriados.forEach(item => {
            if (!salvosMap.has(item.nome)) {
                resultado.push({
                    ...item,
                    id: null,
                    status: 'ATIVO',
                    createdAt: null
                });
            } else {
                // Atualizar usos dos itens salvos
                const itemSalvo = salvosMap.get(item.nome);
                itemSalvo.usos = item.usos;
            }
        });
        
        return resultado.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    renderizarTabela(tabId, config, dados) {
        const tbody = document.getElementById(config.tbody);
        if (!tbody) {
            console.error(`❌ [GESTAO-PROJETOS] Tbody não encontrado: ${config.tbody}`);
            return;
        }
        
        if (!dados || dados.length === 0) {
            tbody.innerHTML = this.htmlTabelaVazia(tabId, config);
            return;
        }
        
        const htmlRows = dados.map((item, index) => this.htmlLinhaTabela(item, index, tabId)).join('');
        tbody.innerHTML = htmlRows;
        
        console.log(`✅ [GESTAO-PROJETOS] Tabela renderizada: ${dados.length} itens`);
    }

    htmlTabelaVazia(tabId, config) {
        return `
            <tr class="empty-state">
                <td colspan="6" style="text-align:center;padding:30px;color:#6b7280;">
                    <div style="font-size:16px;margin-bottom:10px;">📝</div>
                    <div>Nenhum ${config.nome.toLowerCase()} encontrado</div>
                    <div style="font-size:12px;margin-top:15px;">
                        <button onclick="adicionarNovoItem('${tabId}')" 
                                style="background:#10b981;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">
                            ➕ Adicionar ${config.displayName}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    htmlLinhaTabela(item, index, tabId) {
        const statusColor = item.status === 'ATIVO' ? '#10b981' : '#ef4444';
        const origemIcon = this.getOrigemIcon(item.origem);
        const origemText = this.getOrigemText(item.origem);
        const acoesBotoes = item.id ? this.htmlBotoesEditar(tabId, item) : this.htmlBotaoSalvar(tabId, item);
        
        return `
            <tr data-id="${item.id || ''}" style="border-bottom:1px solid #e5e7eb;">
                <td style="padding:12px 8px;font-weight:600;">${index + 1}</td>
                <td style="padding:12px 8px;">
                    <div style="font-weight:600;color:#1f2937;">${item.nome}</div>
                </td>
                <td style="padding:12px 8px;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span>${origemIcon}</span>
                        <span style="font-size:11px;color:#6b7280;">${origemText}</span>
                    </div>
                </td>
                <td style="padding:12px 8px;">
                    <span style="background:#f3f4f6;color:#374151;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:600;">
                        ${item.usos || 0} usos
                    </span>
                </td>
                <td style="padding:12px 8px;">
                    <span style="background:${statusColor};color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:600;">
                        ${item.status || 'ATIVO'}
                    </span>
                </td>
                <td style="padding:12px 8px;">
                    ${acoesBotoes}
                </td>
            </tr>
        `;
    }

    getOrigemIcon(origem) {
        const iconMap = {
            'salvo': '💾',
            'auto_extraido': '🤖', 
            'manual': '✏️',
            'extraido': '📊'
        };
        return iconMap[origem] || '📊';
    }

    getOrigemText(origem) {
        const textMap = {
            'salvo': 'Salvo',
            'auto_extraido': 'Auto-salvo',
            'manual': 'Manual', 
            'extraido': 'Extraído'
        };
        return textMap[origem] || 'Extraído';
    }

    htmlBotoesEditar(tabId, item) {
        return `
            <div style="display:flex;gap:6px;">
                <button onclick="editarItem('${tabId}', '${item.id}', '${item.nome}')" 
                        style="background:#3b82f6;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
                    ✏️ Editar
                </button>
                <button onclick="excluirItem('${tabId}', '${item.id}', '${item.nome}')" 
                        style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;">
                    🗑️ Excluir
                </button>
            </div>
        `;
    }

    htmlBotaoSalvar(tabId, item) {
        return `
            <button onclick="salvarItem('${tabId}', '${item.nome}')" 
                    style="background:#10b981;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:11px;">
                💾 Salvar
            </button>
        `;
    }

    mostrarErro(tabId, mensagem) {
        const tbody = document.getElementById(GESTAO_CONFIG[tabId]?.tbody);
        if (tbody) {
            tbody.innerHTML = `
                <tr class="error-state">
                    <td colspan="6" style="text-align:center;padding:30px;color:#ef4444;">
                        <div style="font-size:16px;margin-bottom:10px;">❌</div>
                        <div>Erro ao carregar dados</div>
                        <div style="font-size:12px;margin-top:10px;color:#6b7280;">${mensagem}</div>
                    </td>
                </tr>
            `;
        }
    }
}

// ============= FUNÇÕES CRUD =============
window.salvarItem = async function(tabId, nome) {
    const config = GESTAO_CONFIG[tabId];
    if (!config) return;
    
    try {
        console.log(`💾 [GESTAO-PROJETOS] Salvando: ${nome} em ${config.colecao}`);
        
        await firebase.firestore().collection(config.colecao).add({
            nome: nome,
            status: 'ATIVO',
            origem: 'salvo',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-PROJETOS] Item salvo: ${nome}`);
        
        // Recarregar aba
        gestaoSystem.mostrarAba(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-PROJETOS] Erro ao salvar:`, error);
        alert(`❌ Erro ao salvar: ${error.message}`);
    }
};

window.editarItem = async function(tabId, itemId, nomeAtual) {
    const novoNome = prompt(`Editar nome de "${nomeAtual}":`, nomeAtual);
    if (!novoNome || novoNome.trim() === nomeAtual) return;
    
    const config = GESTAO_CONFIG[tabId];
    if (!config || !itemId) return;
    
    try {
        console.log(`✏️ [GESTAO-PROJETOS] Editando: ${itemId}`);
        
        await firebase.firestore().collection(config.colecao).doc(itemId).update({
            nome: novoNome.trim(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-PROJETOS] Item editado`);
        
        // Recarregar aba
        gestaoSystem.mostrarAba(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-PROJETOS] Erro ao editar:`, error);
        alert(`❌ Erro ao editar: ${error.message}`);
    }
};

window.excluirItem = async function(tabId, itemId, nome) {
    if (!confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;
    
    const config = GESTAO_CONFIG[tabId];
    if (!config || !itemId) return;
    
    try {
        console.log(`🗑️ [GESTAO-PROJETOS] Excluindo: ${itemId}`);
        
        await firebase.firestore().collection(config.colecao).doc(itemId).delete();
        
        console.log(`✅ [GESTAO-PROJETOS] Item excluído`);
        
        // Recarregar aba
        gestaoSystem.mostrarAba(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-PROJETOS] Erro ao excluir:`, error);
        alert(`❌ Erro ao excluir: ${error.message}`);
    }
};

window.adicionarNovoItem = async function(tabId) {
    const config = GESTAO_CONFIG[tabId];
    if (!config) return;
    
    const nome = prompt(`Digite o nome do novo ${config.displayName.toLowerCase()}:`);
    if (!nome || !nome.trim()) return;
    
    try {
        console.log(`➕ [GESTAO-PROJETOS] Adicionando: ${nome}`);
        
        await firebase.firestore().collection(config.colecao).add({
            nome: nome.trim(),
            status: 'ATIVO',
            origem: 'manual',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.uid || 'sistema'
        });
        
        console.log(`✅ [GESTAO-PROJETOS] Item adicionado`);
        
        // Recarregar aba
        gestaoSystem.mostrarAba(tabId);
        
    } catch (error) {
        console.error(`❌ [GESTAO-PROJETOS] Erro ao adicionar:`, error);
        alert(`❌ Erro ao adicionar: ${error.message}`);
    }
};

window.sincronizarDados = async function(tabId) {
    console.log(`🔄 [GESTAO-PROJETOS] Sincronizando dados para: ${tabId}`);
    
    if (!gestaoSystem.inicializado) {
        alert('⚠️ Sistema não inicializado ainda');
        return;
    }
    
    try {
        await gestaoSystem.mostrarAba(tabId);
        console.log(`✅ [GESTAO-PROJETOS] Dados sincronizados para: ${tabId}`);
    } catch (error) {
        console.error(`❌ [GESTAO-PROJETOS] Erro na sincronização:`, error);
        alert(`❌ Erro na sincronização: ${error.message}`);
    }
};

// ============= INICIALIZAÇÃO =============
const gestaoSystem = new GestaoProjetosSystem();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 [GESTAO-PROJETOS] DOM carregado, iniciando sistema...');
    
    // Aguardar um pouco para outros sistemas carregarem
    setTimeout(() => {
        gestaoSystem.inicializar().catch(error => {
            console.error('❌ [GESTAO-PROJETOS] Erro na inicialização:', error);
        });
    }, 3000);
});

// ============= FUNÇÕES DE DEBUG =============
window.debugGestaoSystem = function() {
    console.log('🔍 [DEBUG-GESTAO] Estado do sistema:');
    console.log('   - Sistema iniciado:', sistemaIniciado);
    console.log('   - Firebase conectado:', firebaseConectado);
    console.log('   - Configurações:', Object.keys(GESTAO_CONFIG));
    
    return {
        sistemaIniciado,
        firebaseConectado,
        configuracoes: Object.keys(GESTAO_CONFIG),
        sistema: gestaoSystem
    };
};

// Exportar sistema globalmente
window.GestaoProjetosSystem = gestaoSystem;

// ============= INTEGRAÇÃO COM SISTEMA DE FILTROS =============
function integrarComFiltros() {
    // Monitorar quando dados são alterados e forçar refresh dos filtros
    const originalSalvarItem = window.salvarItem;
    const originalEditarItem = window.editarItem;
    const originalExcluirItem = window.excluirItem;

    window.salvarItem = async function(...args) {
        const result = await originalSalvarItem(...args);
        setTimeout(() => {
            if (window.refreshFilters) {
                console.log('🔄 [GESTAO-PROJETOS] Refreshing filtros após salvar item');
                window.refreshFilters();
            }
        }, 1000);
        return result;
    };

    window.editarItem = async function(...args) {
        const result = await originalEditarItem(...args);
        setTimeout(() => {
            if (window.refreshFilters) {
                console.log('🔄 [GESTAO-PROJETOS] Refreshing filtros após editar item');
                window.refreshFilters();
            }
        }, 1000);
        return result;
    };

    window.excluirItem = async function(...args) {
        const result = await originalExcluirItem(...args);
        setTimeout(() => {
            if (window.refreshFilters) {
                console.log('🔄 [GESTAO-PROJETOS] Refreshing filtros após excluir item');
                window.refreshFilters();
            }
        }, 1000);
        return result;
    };

    console.log('🔗 [GESTAO-PROJETOS] Integração com sistema de filtros configurada');
}

// Integrar após carregamento
setTimeout(integrarComFiltros, 3000);

console.log('✅ [GESTAO-PROJETOS] Sistema carregado e pronto para inicialização!');
console.log('🎯 [GESTAO-PROJETOS] Para debug: debugGestaoSystem()');