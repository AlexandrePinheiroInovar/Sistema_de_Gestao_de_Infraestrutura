async function saveExcelDataToFirebase(collectionName, data, userId) {
    console.log('💾 [FIREBASE-TABLE] Salvando dados no Firebase...');
    
    try {
        // GARANTIR QUE FIREBASE ESTÁ PRONTO E USUÁRIO AUTENTICADO
        console.log('🔍 [FIREBASE-TABLE] Verificando estado do Firebase...');
        await firebaseManager.ensureReady();
        
        // Obter referências através do manager (garantindo conexão)
        const firestore = firebaseManager.getFirestore();
        const user = firebaseManager.getCurrentUser();
        
        // Verificação adicional de segurança do usuário
        if (!user || !user.uid) {
            throw new Error('Usuário não autenticado ou sem UID');
        }
        
        console.log('👤 [FIREBASE-TABLE] Usuário confirmado para salvamento:', user.uid);
        
        // Criar batch operation
        const batch = firestore.batch();
        const collection = firestore.collection(collectionName);
        let savedCount = 0;
        
        for (const row of data) {
            try {
                // Preparar dados - USAR firebase.firestore.FieldValue CORRETAMENTE
                const documentData = {
                    ...row,
                    userId: userId || user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: user.uid,
                    source: 'excel_upload'
                };
                
                // Verificar se tem dados válidos
                const hasData = Object.values(row).some(value => 
                    value !== null && value !== undefined && value !== ''
                );
                
                if (hasData) {
                    const docRef = collection.doc();
                    batch.set(docRef, documentData);
                    savedCount++;
                }
                
            } catch (error) {
                console.error('❌ [FIREBASE-TABLE] Erro na linha:', row, error);
            }
        }
        
        if (savedCount > 0) {
            console.log(`💾 [FIREBASE-TABLE] Salvando ${savedCount} registros no Firebase...`);
            await batch.commit();
            console.log(`✅ [FIREBASE-TABLE] ${savedCount} registros salvos com sucesso em ${collectionName}`);
        } else {
            console.warn('⚠️ [FIREBASE-TABLE] Nenhum registro válido para salvar');
        }
        
        return savedCount;
        
    } catch (error) {
        console.error('❌ [FIREBASE-TABLE] Erro detalhado ao salvar no Firebase:', error);
        console.error('❌ [FIREBASE-TABLE] Stack trace:', error.stack);
        
        // Mensagens de erro mais específicas
        if (error.message.includes('não está conectado')) {
            throw new Error('Firebase não inicializado corretamente. Aguarde alguns segundos e tente novamente.');
        } else if (error.message.includes('não autenticado')) {
            throw new Error('Usuário não está autenticado. Fazendo nova tentativa de login...');
        } else {
            throw error;
        }
    }
}