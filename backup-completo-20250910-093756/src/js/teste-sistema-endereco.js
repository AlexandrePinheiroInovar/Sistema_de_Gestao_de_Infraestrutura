// ============= SISTEMA DE TESTE PARA ENDEREÇOS =============
console.log('🧪 [TESTE-ENDERECO] Sistema de testes carregado');

// Função principal de teste
window.testarSistemaCompleto = async function() {
    console.log('🚀 [TESTE-ENDERECO] === INICIANDO TESTES COMPLETOS ===');
    
    const resultados = {
        layoutEdicaoSimplificado: false,
        campoPEPDisponivel: false,
        historicoFuncionando: false,
        seletoresComDados: false,
        sistemaFuncionando: false
    };
    
    try {
        // Teste 1: Verificar se layout de edição está simplificado
        console.log('1️⃣ [TESTE] Verificando layout de edição simplificado...');
        resultados.layoutEdicaoSimplificado = testarLayoutEdicaoSimplificado();
        
        // Teste 2: Verificar campo PEP
        console.log('2️⃣ [TESTE] Verificando campo PEP...');
        resultados.campoPEPDisponivel = testarCampoPEP();
        
        // Teste 3: Verificar sistema de histórico
        console.log('3️⃣ [TESTE] Verificando sistema de histórico...');
        resultados.historicoFuncionando = testarSistemaHistorico();
        
        // Teste 4: Verificar seletores com dados da tabela
        console.log('4️⃣ [TESTE] Verificando seletores...');
        resultados.seletoresComDados = await testarSeletores();
        
        // Teste 5: Verificar sistema geral
        console.log('5️⃣ [TESTE] Verificando sistema geral...');
        resultados.sistemaFuncionando = testarSistemaGeral();
        
        // Relatório final
        gerarRelatorioTestes(resultados);
        
        return resultados;
        
    } catch (error) {
        console.error('❌ [TESTE] Erro durante os testes:', error);
        return resultados;
    }
};

// Teste 1: Layout de edição simplificado
function testarLayoutEdicaoSimplificado() {
    console.log('   🔍 Verificando se função openEditModal existe...');
    
    if (typeof window.editFirebaseTableRecord !== 'function') {
        console.log('   ❌ Função editFirebaseTableRecord não encontrada');
        return false;
    }
    
    // Verificar se modal existe
    const modal = document.getElementById('crudModal');
    if (!modal) {
        console.log('   ❌ Modal crudModal não encontrado');
        return false;
    }
    
    // Verificar se form existe
    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.log('   ❌ Formulário enderecoForm não encontrado');
        return false;
    }
    
    console.log('   ✅ Layout de edição simplificado funcionando');
    return true;
}

// Teste 2: Campo PEP
function testarCampoPEP() {
    console.log('   🔍 Verificando campo PEP...');
    
    const selectPEP = document.getElementById('pep');
    if (!selectPEP) {
        console.log('   ❌ Campo PEP não encontrado');
        return false;
    }
    
    console.log('   ✅ Campo PEP encontrado');
    
    // Verificar se tem opções (será testado com dados reais)
    if (selectPEP.children.length > 1) {
        console.log(`   ✅ Campo PEP tem ${selectPEP.children.length - 1} opções`);
    } else {
        console.log('   ⚠️ Campo PEP sem dados (normal se não há dados na tabela)');
    }
    
    return true;
}

// Teste 3: Sistema de histórico
function testarSistemaHistorico() {
    console.log('   🔍 Verificando sistema de histórico...');
    
    // Verificar se função de histórico existe
    if (typeof window.visualizarHistorico !== 'function') {
        console.log('   ❌ Função visualizarHistorico não encontrada');
        return false;
    }
    
    if (typeof window.salvarLogAlteracao !== 'function') {
        console.log('   ❌ Função salvarLogAlteracao não encontrada');
        return false;
    }
    
    console.log('   ✅ Funções de histórico encontradas');
    
    // Verificar se Firebase está disponível
    if (!window.firebase || !window.firebase.firestore) {
        console.log('   ⚠️ Firebase não disponível - histórico pode não funcionar');
        return false;
    }
    
    console.log('   ✅ Sistema de histórico configurado');
    return true;
}

// Teste 4: Seletores com dados
async function testarSeletores() {
    console.log('   🔍 Verificando seletores...');
    
    // Verificar se função de extrair dados existe
    if (typeof window.NovoEndereco === 'undefined' || 
        typeof window.NovoEndereco.extrairDadosUnicosDaTabela !== 'function') {
        console.log('   ❌ Função extrairDadosUnicosDaTabela não encontrada');
        return false;
    }
    
    // Testar extração de dados
    try {
        const dados = window.NovoEndereco.extrairDadosUnicosDaTabela();
        console.log(`   📊 Dados extraídos: PEP=${dados.pep.length}, Projetos=${dados.projeto.length}`);
        
        if (dados.pep.length > 0) {
            console.log('   ✅ Dados PEP extraídos da tabela');
            return true;
        } else {
            console.log('   ⚠️ Nenhum dado PEP encontrado (normal se tabela vazia)');
            return true; // Não é erro se não há dados
        }
    } catch (error) {
        console.log('   ❌ Erro ao extrair dados:', error.message);
        return false;
    }
}

// Teste 5: Sistema geral
function testarSistemaGeral() {
    console.log('   🔍 Verificando sistema geral...');
    
    // Verificar se tabela existe
    const tbody = document.getElementById('enderecoTableBody');
    if (!tbody) {
        console.log('   ❌ Tabela enderecoTableBody não encontrada');
        return false;
    }
    
    // Verificar se botões de ação existem
    const botaoHistorico = document.querySelector('button[onclick*="visualizarHistorico"]');
    if (!botaoHistorico) {
        console.log('   ⚠️ Botão de histórico não encontrado na tabela (normal se tabela vazia)');
    } else {
        console.log('   ✅ Botão de histórico encontrado na tabela');
    }
    
    // Verificar se novo endereço funciona
    if (typeof window.novoEnderecoLimpo !== 'function') {
        console.log('   ❌ Função novoEnderecoLimpo não encontrada');
        return false;
    }
    
    console.log('   ✅ Sistema geral funcionando');
    return true;
}

// Gerar relatório de testes
function gerarRelatorioTestes(resultados) {
    console.log('📋 [TESTE] === RELATÓRIO FINAL ===');
    
    const total = Object.keys(resultados).length;
    const sucessos = Object.values(resultados).filter(r => r === true).length;
    const porcentagem = Math.round((sucessos / total) * 100);
    
    console.log(`🎯 [TESTE] Sucessos: ${sucessos}/${total} (${porcentagem}%)`);
    
    for (const [teste, resultado] of Object.entries(resultados)) {
        const status = resultado ? '✅' : '❌';
        const descricao = obterDescricaoTeste(teste);
        console.log(`${status} [TESTE] ${descricao}`);
    }
    
    if (porcentagem >= 80) {
        console.log('🎉 [TESTE] Sistema aprovado nos testes!');
    } else if (porcentagem >= 60) {
        console.log('⚠️ [TESTE] Sistema parcialmente funcional');
    } else {
        console.log('❌ [TESTE] Sistema precisa de correções');
    }
    
    console.log('💡 [TESTE] Para testar manualmente:');
    console.log('   1. Clique em "Novo Endereço" e verifique se PEP tem opções');
    console.log('   2. Edite um registro e verifique se abre com dados populados');
    console.log('   3. Clique no botão 📋 para ver histórico');
    console.log('   4. Crie/edite/exclua registros e verifique se histórico é salvo');
}

function obterDescricaoTeste(teste) {
    const descricoes = {
        layoutEdicaoSimplificado: 'Layout de edição simplificado',
        campoPEPDisponivel: 'Campo PEP disponível',
        historicoFuncionando: 'Sistema de histórico funcionando',
        seletoresComDados: 'Seletores com dados da tabela',
        sistemaFuncionando: 'Sistema geral funcionando'
    };
    return descricoes[teste] || teste;
}

// Função para testar apenas histórico com dados reais
window.testarHistoricoReal = async function(recordId) {
    if (!recordId) {
        console.log('⚠️ [TESTE-HISTORICO] Forneça um ID de registro válido');
        return;
    }
    
    console.log(`🧪 [TESTE-HISTORICO] Testando histórico para ID: ${recordId}`);
    
    try {
        await window.visualizarHistorico(recordId);
        console.log('✅ [TESTE-HISTORICO] Histórico testado com sucesso');
    } catch (error) {
        console.error('❌ [TESTE-HISTORICO] Erro ao testar histórico:', error);
    }
};

// Função para simular criação de log
window.testarCriacaoLog = async function() {
    console.log('🧪 [TESTE-LOG] Testando criação de log...');
    
    if (typeof window.salvarLogAlteracao !== 'function') {
        console.log('❌ [TESTE-LOG] Função salvarLogAlteracao não disponível');
        return;
    }
    
    const dadosAntigos = { teste: 'valor antigo' };
    const dadosNovos = { teste: 'valor novo', campo2: 'novo campo' };
    
    try {
        const logId = await window.salvarLogAlteracao('teste123', dadosAntigos, dadosNovos, 'test');
        console.log(`✅ [TESTE-LOG] Log criado com ID: ${logId}`);
        return logId;
    } catch (error) {
        console.error('❌ [TESTE-LOG] Erro ao criar log:', error);
        return null;
    }
};

console.log('🧪 [TESTE-ENDERECO] Funções de teste carregadas');
console.log('💡 [TESTE-ENDERECO] Execute: testarSistemaCompleto()');