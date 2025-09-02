// ============= FUNCIONALIDADE NOVO ENDEREÇO - IMPLEMENTAÇÃO LIMPA =============
console.log('📍 [NOVO-ENDERECO-LIMPO] Sistema carregado');

// ============= CONFIGURAÇÃO GLOBAL =============
const NovoEndereco = {
    initialized: false,
    firebase: null,
    firestore: null,
    
    // Mapeamento das coleções de dados mestres
    collections: {
        projeto: 'nova_gestao_projetos',
        subProjeto: 'nova_gestao_subprojetos', 
        tipoAcao: 'nova_gestao_tipos_acao',
        cidade: 'nova_gestao_cidades',
        equipe: 'nova_gestao_equipes',
        supervisor: 'nova_gestao_supervisores'
    },
    
    // IDs dos elementos do formulário
    elements: {
        modal: 'crudModal',
        form: 'enderecoForm',
        modalTitle: 'modalTitle'
    }
};

// ============= INICIALIZAÇÃO DO SISTEMA =============
NovoEndereco.init = async function() {
    if (this.initialized) return;
    
    try {
        console.log('🔧 [NOVO-ENDERECO-LIMPO] Inicializando sistema...');
        
        // Aguardar Firebase estar disponível
        await this.waitForFirebase();
        
        this.initialized = true;
        console.log('✅ [NOVO-ENDERECO-LIMPO] Sistema inicializado');
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO-LIMPO] Erro na inicialização:', error);
        throw error;
    }
};

// ============= AGUARDAR FIREBASE =============
NovoEndereco.waitForFirebase = async function() {
    console.log('⏳ [NOVO-ENDERECO-LIMPO] Aguardando Firebase...');
    
    let attempts = 0;
    const maxAttempts = 60; // Aumentar tentativas
    
    while (attempts < maxAttempts) {
        // Verificar diferentes maneiras de Firebase estar disponível
        if ((window.firebase && window.firebase.firestore) || 
            (window.firebaseManager && window.firebaseManager.firestore)) {
            
            // Tentar usar firebaseManager primeiro
            if (window.firebaseManager && window.firebaseManager.firestore) {
                this.firebase = window.firebase;
                this.firestore = window.firebaseManager.firestore;
                console.log('✅ [NOVO-ENDERECO-LIMPO] Firebase conectado via firebaseManager');
                return;
            }
            
            // Fallback para firebase direto
            if (window.firebase && window.firebase.firestore) {
                this.firebase = window.firebase;
                this.firestore = window.firebase.firestore();
                console.log('✅ [NOVO-ENDERECO-LIMPO] Firebase conectado diretamente');
                return;
            }
        }
        
        console.log(`⏳ [NOVO-ENDERECO-LIMPO] Tentativa ${attempts + 1}/${maxAttempts}...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentar intervalo
        attempts++;
    }
    
    throw new Error('Firebase não conectou em tempo hábil');
};

// ============= FUNÇÃO PRINCIPAL - ABRIR MODAL =============
window.novoEnderecoLimpo = async function() {
    console.log('📍 [NOVO-ENDERECO-LIMPO] Abrindo modal de novo endereço...');
    
    try {
        // Tentar inicializar sem aguardar muito se falhar
        if (!NovoEndereco.initialized) {
            try {
                await Promise.race([
                    NovoEndereco.init(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na inicialização')), 10000))
                ]);
            } catch (initError) {
                console.warn('⚠️ [NOVO-ENDERECO-LIMPO] Falha na inicialização, tentando sem Firebase:', initError.message);
                // Continuar mesmo sem Firebase para pelo menos abrir o modal
            }
        }
        
        // Obter elementos do DOM
        const modal = document.getElementById(NovoEndereco.elements.modal);
        const form = document.getElementById(NovoEndereco.elements.form);
        const modalTitle = document.getElementById(NovoEndereco.elements.modalTitle);
        
        if (!modal || !form || !modalTitle) {
            throw new Error('Elementos do modal não encontrados');
        }
        
        // Configurar modal
        modalTitle.textContent = 'Novo Endereço';
        form.reset();
        
        // Carregar dados dos seletores
        console.log('📋 [NOVO-ENDERECO-LIMPO] Carregando seletores...');
        if (NovoEndereco.initialized && NovoEndereco.firestore) {
            await NovoEndereco.carregarSeletores();
        } else {
            console.warn('⚠️ [NOVO-ENDERECO-LIMPO] Firebase não disponível, carregando seletores manualmente...');
            NovoEndereco.carregarSeletoresFallback();
        }
        
        // Configurar event listener do formulário (apenas uma vez)
        NovoEndereco.configurarFormulario();
        
        // Mostrar modal
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.classList.add('show');
        
        console.log('✅ [NOVO-ENDERECO-LIMPO] Modal aberto');
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO-LIMPO] Erro ao abrir modal:', error);
        alert('Erro ao abrir formulário: ' + error.message);
    }
};

// ============= CARREGAR DADOS DOS SELETORES =============
NovoEndereco.carregarSeletores = async function() {
    console.log('📊 [NOVO-ENDERECO-LIMPO] Carregando dados dos seletores...');
    
    for (const [selectorId, collectionName] of Object.entries(this.collections)) {
        try {
            const select = document.getElementById(selectorId);
            if (!select) {
                console.warn(`⚠️ [NOVO-ENDERECO-LIMPO] Seletor ${selectorId} não encontrado`);
                continue;
            }
            
            // Limpar opções existentes
            select.innerHTML = '<option value="">Selecione...</option>';
            
            console.log(`🔍 [NOVO-ENDERECO-LIMPO] Carregando ${selectorId} da coleção ${collectionName}...`);
            
            // Buscar dados do Firebase
            const snapshot = await this.firestore.collection(collectionName).get();
            
            if (snapshot.empty) {
                console.warn(`⚠️ [NOVO-ENDERECO-LIMPO] Coleção ${collectionName} está vazia`);
                continue;
            }
            
            let itemsCarregados = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                const option = document.createElement('option');
                option.value = data.nome || data.name || doc.id;
                option.textContent = data.nome || data.name || doc.id;
                select.appendChild(option);
                itemsCarregados++;
            });
            
            console.log(`✅ [NOVO-ENDERECO-LIMPO] ${selectorId}: ${itemsCarregados} itens carregados`);
            
        } catch (error) {
            console.error(`❌ [NOVO-ENDERECO-LIMPO] Erro ao carregar ${selectorId}:`, error);
        }
    }
    
    // Adicionar opções fixas para o status
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
        statusSelect.innerHTML = `
            <option value="">Selecione o status...</option>
            <option value="PRODUTIVA">PRODUTIVA</option>
            <option value="IMPRODUTIVA">IMPRODUTIVA</option>
        `;
        console.log('✅ [NOVO-ENDERECO-LIMPO] Status: Opções fixas adicionadas');
    }
};

// ============= CARREGAR SELETORES SEM FIREBASE (FALLBACK) =============
NovoEndereco.carregarSeletoresFallback = function() {
    console.log('🔄 [NOVO-ENDERECO-LIMPO] Carregando seletores com dados estáticos...');
    
    // Dados estáticos básicos para funcionamento mínimo
    const dadosEstaticos = {
        projeto: ['CLARO', 'VIVO', 'TIM', 'OI'],
        subProjeto: ['MDU RESIDENCIAL', 'MDU COMERCIAL', 'FTTH', 'HFC'],
        tipoAcao: ['VISTORIA', 'CONSTRUÇÃO', 'ATIVAÇÃO', 'MANUTENÇÃO'],
        cidade: ['SALVADOR', 'LAURO DE FREITAS', 'CAMAÇARI', 'FEIRA DE SANTANA'],
        equipe: ['EQUIPE A', 'EQUIPE B', 'EQUIPE C', 'EQUIPE D'],
        supervisor: ['JOÃO SILVA', 'MARIA SANTOS', 'PEDRO OLIVEIRA']
    };
    
    // Popular cada seletor com dados estáticos
    for (const [selectorId, opcoes] of Object.entries(dadosEstaticos)) {
        const select = document.getElementById(selectorId);
        if (!select) continue;
        
        // Limpar opções existentes
        select.innerHTML = '<option value="">Selecione...</option>';
        
        // Adicionar opções estáticas
        opcoes.forEach(opcao => {
            const option = document.createElement('option');
            option.value = opcao;
            option.textContent = opcao;
            select.appendChild(option);
        });
        
        console.log(`✅ [NOVO-ENDERECO-LIMPO] ${selectorId}: ${opcoes.length} opções estáticas carregadas`);
    }
    
    // Adicionar status fixo
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
        statusSelect.innerHTML = `
            <option value="">Selecione o status...</option>
            <option value="PRODUTIVA">PRODUTIVA</option>
            <option value="IMPRODUTIVA">IMPRODUTIVA</option>
        `;
        console.log('✅ [NOVO-ENDERECO-LIMPO] Status: Opções fixas adicionadas (fallback)');
    }
    
    console.log('🔄 [NOVO-ENDERECO-LIMPO] Seletores carregados com dados estáticos');
};

// ============= CONFIGURAR EVENTO DO FORMULÁRIO =============
NovoEndereco.configurarFormulario = function() {
    const form = document.getElementById(this.elements.form);
    if (!form) return;
    
    // Remover listeners anteriores para evitar duplicação
    const novoForm = form.cloneNode(true);
    form.parentNode.replaceChild(novoForm, form);
    
    // Adicionar novo listener
    novoForm.addEventListener('submit', this.processarFormulario.bind(this));
    console.log('📝 [NOVO-ENDERECO-LIMPO] Event listener configurado');
};

// ============= PROCESSAR FORMULÁRIO =============
NovoEndereco.processarFormulario = async function(event) {
    event.preventDefault();
    console.log('💾 [NOVO-ENDERECO-LIMPO] Processando formulário...');
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        
        // Converter FormData para objeto
        const endereco = {};
        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                endereco[key] = value.trim();
            }
        }
        
        // Adicionar timestamp
        endereco.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        endereco.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
        endereco.id = Date.now().toString(); // ID único temporário
        
        console.log('📄 [NOVO-ENDERECO-LIMPO] Dados coletados:', Object.keys(endereco));
        
        // Validar dados obrigatórios
        const camposObrigatorios = ['projeto', 'subProjeto', 'tipoAcao', 'condominio', 'endereco', 'cidade', 'equipe', 'supervisor', 'status', 'hp'];
        const camposFaltando = camposObrigatorios.filter(campo => !endereco[campo]);
        
        if (camposFaltando.length > 0) {
            throw new Error(`Campos obrigatórios faltando: ${camposFaltando.join(', ')}`);
        }
        
        // Salvar no Firebase
        console.log('🔥 [NOVO-ENDERECO-LIMPO] Salvando no Firebase...');
        await this.firestore.collection('enderecos').add(endereco);
        
        // Fechar modal
        const modal = document.getElementById(this.elements.modal);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        
        // Recarregar tabela se existir função
        if (typeof loadFirebaseTableData === 'function') {
            console.log('🔄 [NOVO-ENDERECO-LIMPO] Recarregando tabela...');
            await loadFirebaseTableData();
        }
        
        // Mostrar sucesso
        if (typeof showNotification === 'function') {
            showNotification('✅ Sucesso!', 'Endereço adicionado com sucesso!', 'success');
        } else {
            alert('✅ Endereço adicionado com sucesso!');
        }
        
        console.log('✅ [NOVO-ENDERECO-LIMPO] Endereço salvo com sucesso');
        
    } catch (error) {
        console.error('❌ [NOVO-ENDERECO-LIMPO] Erro ao processar formulário:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('❌ Erro', 'Erro ao salvar endereço: ' + error.message, 'error');
        } else {
            alert('❌ Erro ao salvar endereço: ' + error.message);
        }
    }
};

// ============= INICIALIZAÇÃO AUTOMÁTICA =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 [NOVO-ENDERECO-LIMPO] DOM carregado, aguardando scripts...');
    
    // Tentar inicializar em background, mas não bloquear
    setTimeout(async () => {
        try {
            await Promise.race([
                NovoEndereco.init(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout na inicialização automática')), 5000))
            ]);
            console.log('✅ [NOVO-ENDERECO-LIMPO] Pré-inicializado com sucesso');
        } catch (error) {
            console.warn('⚠️ [NOVO-ENDERECO-LIMPO] Pré-inicialização falhou:', error.message);
            console.log('📍 [NOVO-ENDERECO-LIMPO] Sistema funcionará em modo fallback');
        }
    }, 3000);
});

// Função de teste simples para verificar se o sistema funciona
window.testarNovoEndereco = function() {
    console.log('🧪 [TESTE] Testando sistema novo endereço...');
    console.log('Firebase disponível:', !!window.firebase);
    console.log('FirebaseManager disponível:', !!window.firebaseManager);
    console.log('Sistema inicializado:', NovoEndereco.initialized);
    
    // Testar abertura do modal sem Firebase
    const modal = document.getElementById('crudModal');
    console.log('Modal encontrado:', !!modal);
    
    if (modal) {
        modal.style.display = 'block';
        console.log('✅ [TESTE] Modal aberto');
        setTimeout(() => {
            modal.style.display = 'none';
            console.log('✅ [TESTE] Modal fechado');
        }, 2000);
    }
};

console.log('📍 [NOVO-ENDERECO-LIMPO] Script carregado completamente');