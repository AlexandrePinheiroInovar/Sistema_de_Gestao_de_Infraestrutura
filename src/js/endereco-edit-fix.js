// ============= CORREÇÃO E MELHORIA DAS FUNÇÕES DE EDIÇÃO =============
console.log('🔧 [ENDERECO-EDIT-FIX] Sistema de correção de edição carregado');

// ============= VARIÁVEIS GLOBAIS =============
let isEditMode = false;
let currentEditId = null;
let originalEditEndereco = null;

// ============= FUNÇÃO MELHORADA DE EDIÇÃO =============
async function editEnderecoMelhorado(id) {
    console.log('✏️ [EDIT-FIX] Iniciando edição melhorada para ID:', id);

    try {
        // Limpar estado anterior
        resetEditState();

        // Verificar Firebase
        if (!window.firestore) {
            console.warn('⚠️ [EDIT-FIX] Firebase não disponível, tentando aguardar...');
            await waitForFirebase();
        }

        // Buscar dados do endereço
        console.log('📡 [EDIT-FIX] Buscando dados do Firestore...');
        const doc = await window.firestore.collection('enderecos').doc(id).get();

        if (!doc.exists) {
            throw new Error('Endereço não encontrado no banco de dados');
        }

        const data = doc.data();
        console.log('📊 [EDIT-FIX] Dados encontrados:', data);

        // Configurar modo de edição
        isEditMode = true;
        currentEditId = id;

        // Usar abordagem híbrida mais confiável
        await abrirModalParaEdicao(data);

    } catch (error) {
        console.error('❌ [EDIT-FIX] Erro na edição:', error);
        alert('Erro ao abrir edição: ' + error.message);
        resetEditState();
    }
}

// ============= FUNÇÃO PARA RESETAR ESTADO =============
function resetEditState() {
    isEditMode = false;
    currentEditId = null;

    // Fechar modal se estiver aberto
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

// ============= FUNÇÃO HÍBRIDA PARA ABRIR MODAL =============
async function abrirModalParaEdicao(data) {
    console.log('🎯 [EDIT-FIX] Abrindo modal para edição...');

    // NOVA ESTRATÉGIA: Destruir e recriar o modal se necessário
    const tentativaCount = window.modalTentativas || 0;
    window.modalTentativas = tentativaCount + 1;

    console.log(`🔢 [EDIT-FIX] Tentativa #${window.modalTentativas} de abrir modal`);

    if (window.modalTentativas > 1) {
        // Se já tentou antes, usar método de força total
        console.log('💥 [EDIT-FIX] Segunda tentativa - Modo DESTRUIR E RECRIAR');
        await destruirERecriarModal();
    }

    // Primeiro, resetar completamente o modal
    await resetarModalCompleto();

    // Método 1: Tentar usando função existente
    if (typeof window.novoEnderecoLimpo === 'function' && window.modalTentativas === 1) {
        console.log('🔄 [EDIT-FIX] Tentando com função existente...');

        try {
            window.novoEnderecoLimpo();

            // Aguardar modal aparecer
            await new Promise(resolve => setTimeout(resolve, 500));

            const modal = document.getElementById('crudModal');
            if (modal && modal.style.display === 'block') {
                console.log('✅ [EDIT-FIX] Modal aberto via função existente');
                await finalizarAbertura(data);
                return;
            }
        } catch (error) {
            console.warn('⚠️ [EDIT-FIX] Função existente falhou:', error);
        }
    }

    // Método 2: Forçar abertura direta
    console.log('🔄 [EDIT-FIX] Forçando abertura direta...');
    await forcarAberturaModal(data);
}

// ============= DESTRUIR E RECRIAR MODAL =============
async function destruirERecriarModal() {
    console.log('💥 [EDIT-FIX] DESTRUINDO e RECRIANDO modal completamente...');

    const modal = document.getElementById('crudModal');
    if (!modal) return;

    // Fazer backup do HTML do modal
    const modalHTML = modal.outerHTML;

    // DESTRUIR o modal atual
    modal.remove();

    // Aguardar um momento
    await new Promise(resolve => setTimeout(resolve, 100));

    // RECRIAR o modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Aplicar estilo para forçar visibilidade
    const novoModal = document.getElementById('crudModal');
    if (novoModal) {
        novoModal.style.cssText = `
            display: none !important;
            position: fixed !important;
            z-index: 999999 !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
        `;

        console.log('✅ [EDIT-FIX] Modal recriado com sucesso');
    }
}

// ============= RESET COMPLETO DO MODAL =============
async function resetarModalCompleto() {
    console.log('🔄 [EDIT-FIX] Resetando modal completamente...');

    const modal = document.getElementById('crudModal');
    if (!modal) return;

    // FORÇAR fechamento total
    modal.style.cssText = 'display: none !important; opacity: 0 !important; visibility: hidden !important;';
    modal.classList.remove('show', 'fade', 'in', 'modal');
    modal.removeAttribute('aria-hidden');
    modal.removeAttribute('aria-modal');
    modal.removeAttribute('role');

    // Limpar backdrop Bootstrap agressivamente
    const backdrops = document.querySelectorAll('.modal-backdrop, .fade, .show');
    backdrops.forEach(backdrop => {
        if (backdrop.classList.contains('modal-backdrop')) {
            backdrop.remove();
        }
    });

    // Reset completo do body
    document.body.classList.remove('modal-open');
    document.body.style.cssText = '';
    document.body.removeAttribute('style');

    // Aguardar mais tempo para garantir
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('✅ [EDIT-FIX] Modal resetado completamente');
}

// ============= FORÇAR ABERTURA DO MODAL =============
async function forcarAberturaModal(data) {
    const modal = document.getElementById('crudModal');
    if (!modal) {
        throw new Error('Modal não encontrado');
    }

    console.log('💪 [EDIT-FIX] Forçando abertura do modal - Método Direto');

    // Limpar formulário
    const form = document.getElementById('enderecoForm');
    if (form) {
        form.reset();
    }

    // FORÇA BRUTA: configurar modal com CSS inline prioritário
    modal.style.cssText = `
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
        z-index: 9999 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0.5) !important;
    `;

    // Adicionar classes necessárias
    modal.classList.add('show', 'in', 'modal');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.removeAttribute('aria-hidden');

    // Configurar body
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    // Garantir que o modal está visível e funcional
    const modalDialog = modal.querySelector('.modal-dialog');
    if (modalDialog) {
        modalDialog.style.cssText = `
            position: relative !important;
            margin: 30px auto !important;
            z-index: 10000 !important;
            max-width: 90% !important;
        `;
    }

    console.log('✅ [EDIT-FIX] Modal FORÇADO a aparecer com CSS inline');

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 200));

    await finalizarAbertura(data);
}

// ============= FINALIZAR ABERTURA DO MODAL =============
async function finalizarAbertura(data) {
    console.log('🎯 [EDIT-FIX] Finalizando abertura...');

    // Garantir que o modal está realmente visível
    verificarModalVisivel();

    // Alterar título
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = '✏️ Editar Endereço';
    }

    // Aguardar estabilizar
    await new Promise(resolve => setTimeout(resolve, 300));

    // Aguardar selects carregarem
    await aguardarSelectsCarregados();

    // FORÇA reload dos selects usando sistema novo-endereco-limpo
    await forcarReloadSelects();

    // Preencher dados
    await preencherFormularioEdicao(data);

    console.log('✅ [EDIT-FIX] Modal finalizado com sucesso');
}

// ============= VERIFICAR SE MODAL ESTÁ VISÍVEL =============
function verificarModalVisivel() {
    const modal = document.getElementById('crudModal');
    if (!modal) return;

    const isVisible = window.getComputedStyle(modal).display !== 'none' &&
                     window.getComputedStyle(modal).visibility !== 'hidden' &&
                     window.getComputedStyle(modal).opacity !== '0';

    if (!isVisible) {
        console.warn('⚠️ [EDIT-FIX] Modal não está visível, aplicando força bruta...');

        // FORÇA MÁXIMA - usar CSS mais específico
        modal.style.cssText = `
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 99999 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0,0,0,0.8) !important;
        `;

        // Forçar o conteúdo do modal a aparecer
        const modalContent = modal.querySelector('.modal-content, .modal-dialog');
        if (modalContent) {
            modalContent.style.cssText = `
                position: relative !important;
                top: 50px !important;
                margin: 0 auto !important;
                background: white !important;
                border-radius: 8px !important;
                padding: 20px !important;
                max-width: 90% !important;
                z-index: 100000 !important;
            `;
        }

        console.log('💪 [EDIT-FIX] Força bruta aplicada ao modal');
    } else {
        console.log('✅ [EDIT-FIX] Modal está visível');
    }
}

// ============= FUNÇÃO PARA AGUARDAR SELECTS CARREGADOS =============
async function aguardarSelectsCarregados() {
    console.log('⏳ [EDIT-FIX] Aguardando selects serem carregados...');

    const selectsImportantes = ['projeto', 'subProjeto', 'cidade', 'equipe', 'supervisor', 'tipoAcao'];
    let tentativas = 0;
    const maxTentativas = 20;

    while (tentativas < maxTentativas) {
        let todosCarregados = true;

        for (const selectId of selectsImportantes) {
            const select = document.getElementById(selectId);
            if (!select || select.options.length <= 1) {
                todosCarregados = false;
                break;
            }
        }

        if (todosCarregados) {
            console.log('✅ [EDIT-FIX] Selects carregados com sucesso');
            return;
        }

        tentativas++;
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.warn('⚠️ [EDIT-FIX] Alguns selects podem não estar carregados');
}

// ============= FORÇAR RELOAD DOS SELECTS =============
async function forcarReloadSelects() {
    console.log('🔄 [EDIT-FIX] Forçando reload dos selects...');

    try {
        // Usar o sistema novo-endereco-limpo se disponível
        if (window.NovoEndereco && window.NovoEndereco.carregarSeletores) {
            console.log('🔄 [EDIT-FIX] Usando NovoEndereco.carregarSeletores...');
            await window.NovoEndereco.carregarSeletores();
        } else if (window.novoEnderecoLimpo) {
            // Tentar simular o carregamento através da função principal
            console.log('🔄 [EDIT-FIX] Simulando carregamento via novoEnderecoLimpo...');

            // Recarregar selects manualmente
            await recarregarSelectsManualmente();
        } else {
            console.warn('⚠️ [EDIT-FIX] Sistema NovoEndereco não disponível');
            await recarregarSelectsManualmente();
        }

        console.log('✅ [EDIT-FIX] Reload dos selects concluído');
    } catch (error) {
        console.error('❌ [EDIT-FIX] Erro no reload dos selects:', error);
        await recarregarSelectsManualmente();
    }
}

// ============= RECARREGAR SELECTS MANUALMENTE =============
async function recarregarSelectsManualmente() {
    console.log('📋 [EDIT-FIX] Recarregando selects manualmente...');

    const collections = {
        projeto: 'nova_gestao_projetos',
        subProjeto: 'nova_gestao_subprojetos',
        tipoAcao: 'nova_gestao_tipos_acao',
        cidade: 'nova_gestao_cidades',
        equipe: 'nova_gestao_equipes',
        supervisor: 'nova_gestao_supervisores'
    };

    for (const [selectorId, collectionName] of Object.entries(collections)) {
        try {
            const select = document.getElementById(selectorId);
            if (!select) continue;

            console.log(`📋 [EDIT-FIX] Recarregando ${selectorId}...`);

            // Salvar valor atual
            const valorAtual = select.value;

            // Limpar opções existentes
            select.innerHTML = '<option value="">Selecione...</option>';

            // Buscar dados do Firebase
            if (window.firestore) {
                const snapshot = await window.firestore.collection(collectionName).get();

                let itemsCarregados = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = data.nome || data.name || doc.id;
                    option.textContent = data.nome || data.name || doc.id;
                    select.appendChild(option);
                    itemsCarregados++;
                });

                // Restaurar valor se ainda existir
                if (valorAtual && select.querySelector(`option[value="${valorAtual}"]`)) {
                    select.value = valorAtual;
                }

                console.log(`✅ [EDIT-FIX] ${selectorId}: ${itemsCarregados} itens recarregados`);
            }
        } catch (error) {
            console.error(`❌ [EDIT-FIX] Erro ao recarregar ${selectorId}:`, error);
        }
    }
}

// ============= FUNÇÃO ESPECIALIZADA PARA PREENCHER SELECTS =============
async function preencherSelect(selectElement, valor, nomeSelect) {
    if (!valor) {
        selectElement.value = '';
        return;
    }

    console.log(`🔽 [EDIT-FIX] Preenchendo select ${nomeSelect} com valor: ${valor}`);

    // Primeiro, tentar encontrar opção existente
    let opcaoEncontrada = Array.from(selectElement.options).find(opt => {
        return opt.value === valor ||
               opt.textContent.trim() === valor ||
               opt.value.toLowerCase() === valor.toLowerCase() ||
               opt.textContent.trim().toLowerCase() === valor.toLowerCase();
    });

    if (opcaoEncontrada) {
        selectElement.value = opcaoEncontrada.value;
        console.log(`✅ [EDIT-FIX] Opção encontrada para ${nomeSelect}: ${opcaoEncontrada.textContent}`);

        // Disparar evento change
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));

        return;
    }

    // Se não encontrou, aguardar um pouco e tentar novamente (selects podem estar carregando)
    await new Promise(resolve => setTimeout(resolve, 300));

    opcaoEncontrada = Array.from(selectElement.options).find(opt => {
        return opt.value === valor ||
               opt.textContent.trim() === valor ||
               opt.value.toLowerCase() === valor.toLowerCase() ||
               opt.textContent.trim().toLowerCase() === valor.toLowerCase();
    });

    if (opcaoEncontrada) {
        selectElement.value = opcaoEncontrada.value;
        console.log(`✅ [EDIT-FIX] Opção encontrada (segunda tentativa) para ${nomeSelect}: ${opcaoEncontrada.textContent}`);

        // Disparar evento change
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));

        return;
    }

    // Se ainda não encontrou, adicionar opção temporariamente
    console.log(`⚠️ [EDIT-FIX] Criando opção temporária para ${nomeSelect}: ${valor}`);

    const novaOpcao = document.createElement('option');
    novaOpcao.value = valor;
    novaOpcao.textContent = valor;
    novaOpcao.setAttribute('data-temp', 'true'); // Marcar como temporária

    selectElement.appendChild(novaOpcao);
    selectElement.value = valor;

    // Disparar evento change
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));

    console.log(`✅ [EDIT-FIX] Opção temporária criada para ${nomeSelect}: ${valor}`);
}

// ============= FUNÇÃO PARA REMOVER CAMPOS OBRIGATÓRIOS =============
function removerCamposObrigatorios() {
    console.log('🔓 [EDIT-FIX] Removendo obrigatoriedade dos campos...');

    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.warn('⚠️ [EDIT-FIX] Formulário não encontrado');
        return;
    }

    // Primeiro, corrigir problemas de labels
    corrigirLabelsProblematicos();

    // Buscar todos os campos com atributo required
    const camposObrigatorios = form.querySelectorAll('[required]');
    let camposProcessados = 0;

    camposObrigatorios.forEach((campo, index) => {
        try {
            // Remover atributo required
            campo.removeAttribute('required');
            campo.removeAttribute('aria-required');
            campo.removeAttribute('data-required');

            // Remover classes visuais de obrigatório
            campo.classList.remove('required', 'is-required', 'campo-obrigatorio');

            camposProcessados++;
            console.log(`🔓 [EDIT-FIX] Campo ${campo.id || campo.name || index} não é mais obrigatório`);
        } catch (error) {
            console.warn(`⚠️ [EDIT-FIX] Erro ao processar campo ${index}:`, error);
        }
    });

    // REMOVER ASTERISCOS VERMELHOS DE FORMA AGRESSIVA
    removerAsteriscosVisuais();

    // Desabilitar validação do formulário
    form.setAttribute('novalidate', 'true');
    form.removeAttribute('data-needs-validation');

    console.log(`✅ [EDIT-FIX] ${camposProcessados} campos agora são opcionais`);
}

// ============= CORRIGIR LABELS PROBLEMÁTICOS =============
function corrigirLabelsProblematicos() {
    console.log('🏷️ [EDIT-FIX] Corrigindo labels problemáticos...');

    const form = document.getElementById('enderecoForm');
    if (!form) return;

    const labels = form.querySelectorAll('label');
    let labelsCorrigidos = 0;

    labels.forEach((label, index) => {
        try {
            const forAttribute = label.getAttribute('for');

            // Se o for attribute é "FORM_ELEMENT" ou inválido
            if (forAttribute === 'FORM_ELEMENT' || !forAttribute || forAttribute.trim() === '') {
                // Tentar encontrar o campo relacionado
                const proximoCampo = label.nextElementSibling;

                if (proximoCampo && (proximoCampo.tagName === 'INPUT' || proximoCampo.tagName === 'SELECT' || proximoCampo.tagName === 'TEXTAREA')) {
                    // Se o campo tem ID, usar ele
                    if (proximoCampo.id) {
                        label.setAttribute('for', proximoCampo.id);
                        labelsCorrigidos++;
                        console.log(`🏷️ [EDIT-FIX] Label ${index} corrigido para campo: ${proximoCampo.id}`);
                    } else {
                        // Se não tem ID, criar um
                        const novoId = `campo_${index}_${Date.now()}`;
                        proximoCampo.id = novoId;
                        label.setAttribute('for', novoId);
                        labelsCorrigidos++;
                        console.log(`🏷️ [EDIT-FIX] Label ${index} corrigido com novo ID: ${novoId}`);
                    }
                } else {
                    // Se não conseguir relacionar, remover o for attribute
                    label.removeAttribute('for');
                    labelsCorrigidos++;
                    console.log(`🏷️ [EDIT-FIX] Label ${index} - atributo 'for' removido`);
                }
            } else {
                // Verificar se o campo referenciado existe
                const campoReferenciado = document.getElementById(forAttribute);
                if (!campoReferenciado) {
                    label.removeAttribute('for');
                    labelsCorrigidos++;
                    console.log(`🏷️ [EDIT-FIX] Label ${index} - referência inválida removida: ${forAttribute}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ [EDIT-FIX] Erro ao corrigir label ${index}:`, error);
        }
    });

    console.log(`✅ [EDIT-FIX] ${labelsCorrigidos} labels corrigidos`);
}

// ============= FUNÇÃO PARA REMOVER ASTERISCOS VISUAIS =============
function removerAsteriscosVisuais() {
    console.log('🎨 [EDIT-FIX] Removendo asteriscos vermelhos visuais...');

    const form = document.getElementById('enderecoForm');
    if (!form) return;

    // Buscar TODOS os labels dentro do formulário
    const labels = form.querySelectorAll('label');
    let labelsProcessados = 0;

    labels.forEach((label, index) => {
        try {
            // Remover asterisco do conteúdo texto
            if (label.textContent.includes('*')) {
                label.innerHTML = label.innerHTML.replace(/\s*\*\s*/g, '').replace(/\*/g, '');
            }

            // Remover classes de obrigatório do label
            label.classList.remove('required', 'is-required', 'campo-obrigatorio');

            // Remover estilo inline que pode estar fazendo o asterisco vermelho
            label.style.color = '';

            labelsProcessados++;
            console.log(`🎨 [EDIT-FIX] Label ${index + 1} limpo de asteriscos`);
        } catch (error) {
            console.warn(`⚠️ [EDIT-FIX] Erro ao processar label ${index}:`, error);
        }
    });

    // TAMBÉM buscar spans ou elementos que podem conter asteriscos
    const asteriscos = form.querySelectorAll('span:contains("*"), .required-marker, .asterisk');
    asteriscos.forEach(el => {
        if (el.textContent.trim() === '*' || el.textContent.includes('*')) {
            el.remove();
        }
    });

    // Remover estilos CSS que fazem asteriscos vermelhos
    const style = document.createElement('style');
    style.textContent = `
        #enderecoForm label::after,
        #enderecoForm .required::after,
        #enderecoForm [required]::after {
            content: '' !important;
            color: transparent !important;
            display: none !important;
        }
        #enderecoForm .required,
        #enderecoForm [data-required="true"] {
            color: inherit !important;
        }
    `;
    document.head.appendChild(style);

    console.log(`✅ [EDIT-FIX] ${labelsProcessados} labels processados e CSS de asteriscos removido`);
}

// ============= FUNÇÃO DE PRÉ-PREENCHIMENTO =============
async function preencherFormularioEdicao(data) {
    console.log('📝 [EDIT-FIX] Preenchendo formulário com dados:', data);

    // Aguardar modal estar visível
    await new Promise(resolve => setTimeout(resolve, 300));

    // Remover obrigatoriedade de TODOS os campos
    removerCamposObrigatorios();

    // Mapeamento dos campos
    const campos = {
        'projeto': data.projeto || '',
        'subProjeto': data.subProjeto || '',
        'tipoAcao': data.tipoAcao || '',
        'contrato': data.contrato || '',
        'condominio': data.condominio || '',
        'endereco': data.endereco || '',
        'cidade': data.cidade || '',
        'pep': data.pep || '',
        'codImovelGed': data.codImovelGed || '',
        'nodeGerencial': data.nodeGerencial || '',
        'areaTecnica': data.areaTecnica || '',
        'andar': data.andar || '',
        'hp': data.hp || '',
        'cdo': data.cdo || '',
        'porta': data.porta || '',
        'equipe': data.equipe || '',
        'supervisor': data.supervisor || '',
        'status': data.status || '',
        'cabo': data.cabo || '',
        'fo': data.fo || '',
        'celula': data.celula || '',
        'observacoes': data.observacoes || '',

        // Campos adicionais
        'dataRecebimento': formatDateForInput(data.dataRecebimento),
        'dataInicio': formatDateForInput(data.dataInicio),
        'dataFinal': formatDateForInput(data.dataFinal),
        'rdo': data.rdo || '',
        'book': data.book || '',
        'colaboradorBook': data.colaboradorBook || '',
        'dataBook': formatDateForInput(data.dataBook),
        'dias': data.dias || '',
        'projetoStatus': data.projetoStatus || '',
        'situacao': data.situacao || '',
        'justificativa': data.justificativa || '',
        'solucao': data.solucao || '',
        'menorMaior30': data.menorMaior30 || ''
    };

    // Preencher cada campo com tratamento especial para selects
    let camposPreenchidos = 0;

    for (const [campo, valor] of Object.entries(campos)) {
        const elemento = document.getElementById(campo);
        if (!elemento) continue;

        try {
            if (elemento.tagName === 'SELECT') {
                await preencherSelect(elemento, valor, campo);
                if (elemento.value === valor) {
                    camposPreenchidos++;
                    console.log(`✅ [EDIT-FIX] Select ${campo} preenchido com: ${valor}`);
                }
            } else {
                elemento.value = valor || '';
                if (valor) {
                    camposPreenchidos++;
                    console.log(`✅ [EDIT-FIX] Campo ${campo} preenchido com: ${valor}`);
                }
            }
        } catch (error) {
            console.warn(`⚠️ [EDIT-FIX] Erro ao preencher campo ${campo}:`, error);
        }
    }

    console.log(`✅ [EDIT-FIX] ${camposPreenchidos} campos preenchidos com sucesso`);

    // Triggar eventos de change para selects dependentes
    ['projeto', 'subProjeto', 'cidade'].forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

// ============= FUNÇÃO PARA FORMATAR DATAS =============
function formatDateForInput(dateValue) {
    if (!dateValue) return '';

    try {
        let date;
        if (dateValue.toDate) {
            date = dateValue.toDate(); // Firestore Timestamp
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            return '';
        }

        if (isNaN(date.getTime())) {
            return '';
        }

        // Formato YYYY-MM-DD para input date
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.warn('⚠️ [EDIT-FIX] Erro ao formatar data:', error);
        return '';
    }
}

// ============= FUNÇÃO PARA AGUARDAR FIREBASE =============
async function waitForFirebase() {
    console.log('⏳ [EDIT-FIX] Aguardando Firebase...');

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        if (window.firestore && typeof window.firestore.collection === 'function') {
            console.log('✅ [EDIT-FIX] Firebase disponível');
            return true;
        }

        attempts++;
        console.log(`⏳ [EDIT-FIX] Tentativa ${attempts}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Firebase não ficou disponível após 10 segundos');
}

// ============= SOBRESCREVER FUNÇÃO ORIGINAL =============
function substituirFuncaoOriginal() {
    console.log('🔄 [EDIT-FIX] Substituindo função original de edição...');

    // Backup da função original
    if (window.editEndereco && typeof window.editEndereco === 'function') {
        originalEditEndereco = window.editEndereco;
        console.log('💾 [EDIT-FIX] Backup da função original criado');
    }

    // Substituir por versão melhorada
    window.editEndereco = editEnderecoMelhorado;
    console.log('✅ [EDIT-FIX] Função de edição substituída');

    // Melhorar botões existentes na tabela
    melhorarBotoesEdicaoExistentes();
}

// ============= MELHORAR BOTÕES EXISTENTES =============
function melhorarBotoesEdicaoExistentes() {
    console.log('🔧 [EDIT-FIX] Melhorando botões de edição existentes...');

    // Usar delegação de eventos na tabela principal de endereços
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody && !tbody.hasAttribute('data-edit-delegated')) {
        tbody.addEventListener('click', function(e) {
            const botao = e.target.closest('button[onclick*="editEndereco"], .btn-edit, button[onclick*="editFirestoreRecord"]');

            if (botao) {
                e.preventDefault();
                e.stopPropagation();

                // Extrair ID
                let id = null;
                const onclickOriginal = botao.getAttribute('onclick');

                if (onclickOriginal) {
                    const match = onclickOriginal.match(/['"](.*?)['"]/) || onclickOriginal.match(/\(([^)]+)\)/);
                    if (match) {
                        id = match[1].replace(/['"]/g, '');
                    }
                }

                if (id) {
                    console.log(`🖱️ [EDIT-FIX] Clique delegado no botão editar ID: ${id}`);
                    editEnderecoMelhorado(id);
                } else {
                    console.warn('⚠️ [EDIT-FIX] ID não encontrado no botão');
                }
            }
        });

        tbody.setAttribute('data-edit-delegated', 'true');
        console.log('✅ [EDIT-FIX] Delegação de eventos configurada na tabela principal');
    }

    // NOVO: Também melhorar tabelas das abas de gestão de projetos
    melhorarBotoesGestaoProj();

    // Também melhorar botões individuais como backup
    const botoesEdicao = document.querySelectorAll('button[onclick*="editEndereco"], .btn-edit, button[onclick*="editFirestoreRecord"]');

    botoesEdicao.forEach((botao, index) => {
        try {
            // Pular se já foi processado
            if (botao.hasAttribute('data-edit-processed')) {
                return;
            }

            // Extrair ID do onclick original
            let id = null;
            const onclickOriginal = botao.getAttribute('onclick');

            if (onclickOriginal) {
                const match = onclickOriginal.match(/['"](.*?)['"]/) || onclickOriginal.match(/\(([^)]+)\)/);
                if (match) {
                    id = match[1].replace(/['"]/g, '');
                }
            }

            if (id) {
                // Marcar como processado
                botao.setAttribute('data-edit-processed', 'true');
                botao.setAttribute('data-endereco-id', id);

                // Melhorar visual se necessário
                if (!botao.innerHTML.includes('fa-') && !botao.innerHTML.includes('✏️')) {
                    botao.innerHTML = '<i class="fas fa-edit"></i> Editar';
                    botao.title = 'Editar registro';
                }

                console.log(`✅ [EDIT-FIX] Botão ${index + 1} marcado como processado (ID: ${id})`);
            }
        } catch (error) {
            console.warn(`⚠️ [EDIT-FIX] Erro ao processar botão ${index + 1}:`, error);
        }
    });
}

// ============= MELHORAR BOTÕES DE GESTÃO DE PROJETOS =============
function melhorarBotoesGestaoProj() {
    console.log('🏗️ [EDIT-FIX] Melhorando botões das abas de gestão de projetos...');

    // IDs das tabelas de gestão de projetos
    const tabelasGestao = [
        'projetosTableBody',
        'subprojetosTableBody',
        'tiposAcaoTableBody',
        'supervisoresTableBody',
        'equipesTableBody',
        'cidadesTableBody'
    ];

    tabelasGestao.forEach(tableId => {
        const tbody = document.getElementById(tableId);
        if (!tbody) return;

        // Verificar se já foi configurado
        if (tbody.hasAttribute('data-gestao-delegated')) return;

        tbody.addEventListener('click', function(e) {
            // Botões de editar das tabelas de gestão
            const botaoEditar = e.target.closest('button[onclick*="editarItem"]');

            if (botaoEditar) {
                console.log('🏗️ [EDIT-FIX] Clique detectado em botão editar da gestão de projetos');
                // Os botões de gestão funcionam diferente, deixar funcionamento original
                return;
            }

            // Detectar se é um clique em linha da tabela (para futura implementação)
            const linha = e.target.closest('tr[data-id]');
            if (linha && linha.getAttribute('data-id')) {
                // Futuro: implementar edição rápida clicando na linha
                console.log('🏗️ [EDIT-FIX] Clique em linha da gestão detectado');
            }
        });

        tbody.setAttribute('data-gestao-delegated', 'true');
        console.log(`✅ [EDIT-FIX] Delegação configurada para tabela: ${tableId}`);
    });
}

// ============= OBSERVADOR DE MUDANÇAS NA TABELA =============
function configurarObservadorTabela() {
    const tbody = document.getElementById('enderecoTableBody');
    if (tbody) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Nova linha adicionada, melhorar botões
                    setTimeout(() => {
                        melhorarBotoesEdicaoExistentes();
                    }, 100);
                }
            });
        });

        observer.observe(tbody, {
            childList: true,
            subtree: true
        });

        console.log('👁️ [EDIT-FIX] Observador de tabela configurado');
    }
}

// ============= INTERCEPTAR SALVAMENTO =============
function interceptarSalvamento() {
    const form = document.getElementById('enderecoForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            if (isEditMode && currentEditId) {
                console.log('💾 [EDIT-FIX] Salvando edição do ID:', currentEditId);

                // O sistema existente já deve lidar com o salvamento
                // Apenas garantir que os flags estão corretos

                form.addEventListener('submit', function() {
                    // Reset após salvamento
                    setTimeout(() => {
                        isEditMode = false;
                        currentEditId = null;
                        // RESETAR contador de tentativas quando salvar
                        window.modalTentativas = 0;
                    }, 1000);
                }, { once: true });
            }
        });
    }
}

// ============= RESETAR CONTADOR QUANDO FECHAR MODAL =============
function adicionarListenerFechamento() {
    // Detectar quando modal é fechado para resetar contador
    const modal = document.getElementById('crudModal');
    if (modal) {
        // Observer para detectar mudanças de display
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const isHidden = modal.style.display === 'none' ||
                                   window.getComputedStyle(modal).display === 'none';

                    if (isHidden && window.modalTentativas > 0) {
                        console.log('🔄 [EDIT-FIX] Modal fechado - resetando contador de tentativas');
                        window.modalTentativas = 0;
                    }
                }
            });
        });

        observer.observe(modal, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // Também detectar cliques no backdrop ou botão fechar
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('btn-close') || e.target.classList.contains('close')) {
                setTimeout(() => {
                    window.modalTentativas = 0;
                    console.log('🔄 [EDIT-FIX] Modal fechado via clique - contador resetado');
                }, 100);
            }
        });
    }
}

// ============= INICIALIZAÇÃO =============
function inicializarCorrecoesEdicao() {
    console.log('🚀 [EDIT-FIX] Inicializando correções de edição...');

    try {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(inicializarCorrecoesEdicao, 1000);
            });
            return;
        }

        // Substituir função
        substituirFuncaoOriginal();

        // Configurar observador
        configurarObservadorTabela();

        // Interceptar salvamento
        interceptarSalvamento();

        // Adicionar listener de fechamento
        adicionarListenerFechamento();

        console.log('✅ [EDIT-FIX] Sistema de correções inicializado com sucesso');

    } catch (error) {
        console.error('❌ [EDIT-FIX] Erro na inicialização:', error);
    }
}

// ============= FUNÇÃO DE EMERGÊNCIA =============
function forcarModalEmergencia(enderecoId) {
    console.log('🆘 [EDIT-FIX] MODO EMERGÊNCIA ATIVADO para ID:', enderecoId);

    const modal = document.getElementById('crudModal');
    if (!modal) {
        alert('Modal não encontrado! Verifique a página.');
        return;
    }

    // FORÇA ABSOLUTA - criar estilo inline direto no head
    const emergencyStyle = document.createElement('style');
    emergencyStyle.id = 'emergency-modal-style';
    emergencyStyle.innerHTML = `
        #crudModal {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 999999 !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0,0,0,0.8) !important;
            overflow-y: auto !important;
        }
        #crudModal .modal-dialog,
        #crudModal .modal-content {
            position: relative !important;
            top: 50px !important;
            margin: 0 auto !important;
            background: white !important;
            border-radius: 8px !important;
            padding: 20px !important;
            max-width: 90% !important;
            z-index: 1000000 !important;
            box-shadow: 0 0 20px rgba(0,0,0,0.5) !important;
        }
    `;

    // Remover estilo anterior se existir
    const oldStyle = document.getElementById('emergency-modal-style');
    if (oldStyle) oldStyle.remove();

    document.head.appendChild(emergencyStyle);

    // Aplicar CSS inline também
    modal.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 999999 !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0,0,0,0.8) !important;
    `;

    // Configurar título
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = '✏️ Editar Endereço (Modo Emergência)';
    }

    // Carregar dados se fornecido o ID
    if (enderecoId) {
        setTimeout(async () => {
            try {
                const doc = await window.firestore.collection('enderecos').doc(enderecoId).get();
                if (doc.exists) {
                    await preencherFormularioEdicao(doc.data());
                }
            } catch (error) {
                console.error('Erro no modo emergência:', error);
            }
        }, 500);
    }

    console.log('🆘 [EDIT-FIX] Modo emergência aplicado - Modal deve estar visível agora!');
}

// ============= AUTO-INICIALIZAÇÃO =============
// Inicializar assim que carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(inicializarCorrecoesEdicao, 2000); // Aguardar outros sistemas
    });
} else {
    setTimeout(inicializarCorrecoesEdicao, 2000);
}

// Exportar funções globalmente
window.editEnderecoMelhorado = editEnderecoMelhorado;
window.preencherFormularioEdicao = preencherFormularioEdicao;
window.forcarModalEmergencia = forcarModalEmergencia; // Função de emergência global

console.log('✨ [EDIT-FIX] Sistema de correção de edição carregado e pronto');
console.log('🆘 [EDIT-FIX] Em caso de problemas, use: forcarModalEmergencia("ID_DO_ENDERECO")');

// ============= FUNÇÃO DE DEBUG GLOBAL =============
window.debugModal = function() {
    const modal = document.getElementById('crudModal');
    console.log('🔍 [DEBUG] Informações do modal:');
    console.log('  - Modal encontrado:', !!modal);
    console.log('  - Display:', modal ? window.getComputedStyle(modal).display : 'N/A');
    console.log('  - Visibility:', modal ? window.getComputedStyle(modal).visibility : 'N/A');
    console.log('  - Opacity:', modal ? window.getComputedStyle(modal).opacity : 'N/A');
    console.log('  - Z-index:', modal ? window.getComputedStyle(modal).zIndex : 'N/A');
    console.log('  - Tentativas:', window.modalTentativas || 0);
    console.log('  - Classes:', modal ? Array.from(modal.classList) : 'N/A');

    if (modal) {
        console.log('  - Style inline:', modal.style.cssText);
        const form = document.getElementById('enderecoForm');
        console.log('  - Formulário encontrado:', !!form);

        if (form) {
            const labels = form.querySelectorAll('label');
            const problematicLabels = Array.from(labels).filter(l =>
                l.getAttribute('for') === 'FORM_ELEMENT' ||
                !l.getAttribute('for') ||
                !document.getElementById(l.getAttribute('for'))
            );
            console.log('  - Labels problemáticos:', problematicLabels.length);
        }
    }
};

console.log('🔍 [EDIT-FIX] Função de debug disponível: debugModal()');