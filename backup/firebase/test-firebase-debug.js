// ============= TESTE DE DEBUG FIREBASE =============
console.log('🔍 [DEBUG] Iniciando teste de Firebase...');

// Função para testar autenticação
function testAuth() {
    console.log('👤 [DEBUG] Testando autenticação...');
    
    // Verificar se Firebase está carregado
    if (typeof firebase === 'undefined') {
        console.error('❌ [DEBUG] Firebase não está carregado!');
        return false;
    }
    
    // Verificar se está inicializado
    console.log('🔥 [DEBUG] Firebase apps:', firebase.apps.length);
    
    // Verificar usuário atual
    const user = firebase.auth().currentUser;
    console.log('👤 [DEBUG] Usuário atual:', user);
    
    if (user) {
        console.log('✅ [DEBUG] Usuário autenticado:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
        });
        return user;
    } else {
        console.warn('⚠️ [DEBUG] Nenhum usuário autenticado');
        return null;
    }
}

// Função para testar Firestore
async function testFirestore() {
    console.log('💾 [DEBUG] Testando Firestore...');
    
    try {
        // Teste de leitura simples
        const testDoc = await firebase.firestore().collection('enderecos').limit(1).get();
        console.log('✅ [DEBUG] Leitura Firestore funcionando. Docs encontrados:', testDoc.size);
        
        // Teste de escrita
        const testData = {
            teste: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: 'debug_test'
        };
        
        const writeResult = await firebase.firestore().collection('debug_test').add(testData);
        console.log('✅ [DEBUG] Escrita Firestore funcionando. Doc ID:', writeResult.id);
        
        // Limpar teste
        await writeResult.delete();
        console.log('✅ [DEBUG] Limpeza do teste concluída');
        
        return true;
        
    } catch (error) {
        console.error('❌ [DEBUG] Erro no Firestore:', error);
        console.error('❌ [DEBUG] Código do erro:', error.code);
        console.error('❌ [DEBUG] Mensagem do erro:', error.message);
        return false;
    }
}

// Função principal de debug
async function runDebugTest() {
    console.log('🚀 [DEBUG] Executando teste completo...');
    
    // Aguardar Firebase estar pronto
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Testar auth
    const user = testAuth();
    
    // Testar Firestore
    const firestoreOK = await testFirestore();
    
    // Resumo
    console.log('📊 [DEBUG] RESUMO DOS TESTES:');
    console.log('- Firebase carregado:', typeof firebase !== 'undefined');
    console.log('- Usuário autenticado:', !!user);
    console.log('- Firestore funcionando:', firestoreOK);
    
    return {
        firebase: typeof firebase !== 'undefined',
        authenticated: !!user,
        firestore: firestoreOK
    };
}

// Auto-executar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runDebugTest);
} else {
    runDebugTest();
}

// Expor função globalmente para teste manual
window.runDebugTest = runDebugTest;