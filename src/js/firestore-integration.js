// ============= INTEGRAÇÃO FIREBASE FIRESTORE - SISTEMA COMPLETO =============
console.log('🔥 [FIRESTORE-INTEGRATION] Inicializando sistema de integração Firebase v1.0...');

// ============= NAMESPACE PARA INTEGRAÇÃO FIRESTORE =============
window.FirestoreIntegration = (function () {
    'use strict';

    // ============= CONFIGURAÇÕES =============
    let firestore = null;
    let auth = null;
    let isInitialized = false;

    // ============= FUNÇÕES UTILITÁRIAS =============
    function log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = '🔥 [FIRESTORE-INTEGRATION]';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    function showMessage(message, type = 'info') {
        if (typeof window.showCustomNotification === 'function') {
            const title =
                type === 'error' ? '❌ Erro' : type === 'success' ? '✅ Sucesso' : 'ℹ️ Info';
            window.showCustomNotification(title, message, type);
        } else {
            alert(message);
        }
    }

    function getCurrentUser() {
        if (
            window.FirebaseAuthIsolated &&
            typeof window.FirebaseAuthIsolated.getCurrentUser === 'function'
        ) {
            return window.FirebaseAuthIsolated.getCurrentUser();
        }
        return null;
    }

    // ============= INICIALIZAÇÃO =============
    function init() {
        if (isInitialized) {
            log('Sistema já inicializado');
            return true;
        }

        try {
            // Aguardar Firebase estar disponível
            if (typeof firebase === 'undefined') {
                log('Firebase não está disponível ainda');
                return false;
            }

            firestore = firebase.firestore();
            auth = firebase.auth();

            if (!firestore) {
                throw new Error('Firestore não inicializado');
            }

            isInitialized = true;
            log('✅ Sistema de integração inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar integração Firestore:', error);
            return false;
        }
    }

    // ============= FUNÇÕES DE VALIDAÇÃO =============
    function validateRequiredFields(data, requiredFields) {
        const missing = [];

        requiredFields.forEach(field => {
            if (!data[field] || data[field].toString().trim() === '') {
                missing.push(field);
            }
        });

        return missing;
    }

    // ============= UPLOAD DE PLANILHAS =============
    async function processSpreadsheetData(data, mapping) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log('📊 Iniciando processamento de planilha...');

        // ETAPA 1: Extrair dados únicos para gestão de projetos
        log('🔄 Extraindo dados únicos para gestão de projetos...');
        await extractManagementData(data, mapping, user);

        // ETAPA 2: Processar endereços
        log('🏠 Processando endereços...');
        const batch = firestore.batch();
        const results = {
            success: 0,
            errors: 0,
            errorDetails: []
        };

        const requiredFields = [
            'projeto',
            'subProjeto',
            'tipoAcao',
            'condominio',
            'endereco',
            'cidade',
            'hp',
            'equipe',
            'supervisor',
            'status'
        ];

        for (let i = 0; i < data.length; i++) {
            try {
                const row = data[i];

                // Mapear dados da planilha para o formato do sistema
                const enderecoData = {};

                Object.keys(mapping).forEach(systemField => {
                    const excelColumn = mapping[systemField];
                    if (excelColumn && row[excelColumn] !== undefined && row[excelColumn] !== '') {
                        enderecoData[systemField] = row[excelColumn].toString().trim();
                    }
                });

                // Validar campos obrigatórios
                const missingFields = validateRequiredFields(enderecoData, requiredFields);
                if (missingFields.length > 0) {
                    results.errors++;
                    results.errorDetails.push({
                        row: i + 1,
                        error: `Campos obrigatórios faltando: ${missingFields.join(', ')}`
                    });
                    continue;
                }

                // Adicionar metadados
                enderecoData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                enderecoData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                enderecoData.createdBy = user.uid;
                enderecoData.source = 'upload_planilha';

                // Converter HP para número
                if (enderecoData.hp) {
                    enderecoData.hp = parseInt(enderecoData.hp) || 0;
                }

                // Gerar ID único para o documento
                const docRef = firestore.collection('enderecos').doc();
                batch.set(docRef, enderecoData);

                results.success++;
            } catch (error) {
                results.errors++;
                results.errorDetails.push({
                    row: i + 1,
                    error: error.message
                });
                log(`❌ Erro na linha ${i + 1}: ${error.message}`);
            }
        }

        // Executar batch de endereços
        if (results.success > 0) {
            await batch.commit();
            log(`✅ Endereços salvos: ${results.success} registros`);
        }

        return results;
    }

    // ============= EXTRAÇÃO AUTOMÁTICA PARA GESTÃO =============
    async function extractManagementData(data, mapping, user) {
        try {
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const metadata = {
                createdAt: timestamp,
                updatedAt: timestamp,
                createdBy: user.uid,
                source: 'upload_planilha'
            };

            // Extrair dados únicos de cada categoria
            const uniqueProjects = extractUniqueValues(data, mapping, 'projeto');
            const uniqueSubProjects = extractUniqueValues(data, mapping, 'subProjeto');
            const uniqueTiposAcao = extractUniqueValues(data, mapping, 'tipoAcao');
            const uniqueSupervisors = extractUniqueValues(data, mapping, 'supervisor');
            const uniqueEquipes = extractUniqueValues(data, mapping, 'equipe');
            const uniqueCidades = extractUniqueValues(data, mapping, 'cidade');

            // Salvar projetos
            for (const projeto of uniqueProjects) {
                await saveUniqueIfNotExists(
                    'projetos',
                    {
                        nome: projeto,
                        cliente: 'Auto-extraído',
                        descricao: `Projeto extraído automaticamente do upload de planilha`,
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    projeto
                );
            }

            // Salvar sub projetos
            for (const subProjeto of uniqueSubProjects) {
                await saveUniqueIfNotExists(
                    'subprojetos',
                    {
                        nome: subProjeto,
                        projetoPrincipal: 'Auto-vinculado',
                        descricao: `Sub projeto extraído automaticamente`,
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    subProjeto
                );
            }

            // Salvar tipos de ação
            for (const tipo of uniqueTiposAcao) {
                const categoria = getCategoriaFromTipo(tipo);
                await saveUniqueIfNotExists(
                    'tiposacao',
                    {
                        nome: tipo,
                        categoria: categoria,
                        descricao: `Tipo de ação extraído automaticamente`,
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    tipo
                );
            }

            // Salvar supervisores
            for (const supervisor of uniqueSupervisors) {
                await saveUniqueIfNotExists(
                    'supervisores',
                    {
                        nome: supervisor,
                        email: `${supervisor.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
                        telefone: '',
                        area: 'Supervisão',
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    supervisor
                );
            }

            // Salvar equipes
            for (const equipe of uniqueEquipes) {
                await saveUniqueIfNotExists(
                    'equipes',
                    {
                        nome: equipe,
                        lider: 'A definir',
                        membros: 'Auto-extraído da planilha',
                        especialidade: 'Geral',
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    equipe
                );
            }

            // Salvar cidades
            for (const cidade of uniqueCidades) {
                await saveUniqueIfNotExists(
                    'cidades',
                    {
                        nome: cidade,
                        estado: 'A definir',
                        regiao: 'Auto-extraído',
                        status: 'ATIVO',
                        ...metadata
                    },
                    'nome',
                    cidade
                );
            }

            log(
                `✅ Dados de gestão extraídos: ${uniqueProjects.length} projetos, ${uniqueSubProjects.length} sub-projetos, ${uniqueTiposAcao.length} tipos, ${uniqueSupervisors.length} supervisores, ${uniqueEquipes.length} equipes, ${uniqueCidades.length} cidades`
            );
        } catch (error) {
            console.error('❌ Erro ao extrair dados de gestão:', error);
        }
    }

    // Extrair valores únicos de uma coluna específica
    function extractUniqueValues(data, mapping, fieldKey) {
        const columnName = mapping[fieldKey];
        if (!columnName) {
            return [];
        }

        const uniqueValues = new Set();

        data.forEach(row => {
            const value = row[columnName];
            if (value && typeof value === 'string' && value.trim() !== '') {
                uniqueValues.add(value.trim());
            }
        });

        return Array.from(uniqueValues);
    }

    // Salvar apenas se não existir
    async function saveUniqueIfNotExists(collection, data, fieldToCheck, valueToCheck) {
        try {
            const existing = await firestore
                .collection(collection)
                .where(fieldToCheck, '==', valueToCheck)
                .limit(1)
                .get();

            if (existing.empty) {
                await firestore.collection(collection).add(data);
                log(`➕ Adicionado ${collection}: ${valueToCheck}`);
            } else {
                log(`⏭️ ${collection} já existe: ${valueToCheck}`);
            }
        } catch (error) {
            console.error(`❌ Erro ao salvar ${collection}:`, error);
        }
    }

    // Determinar categoria do tipo de ação
    function getCategoriaFromTipo(tipo) {
        const tipoLower = tipo.toLowerCase();

        if (tipoLower.includes('vistoria')) {
            return 'VISTORIA';
        }
        if (tipoLower.includes('construção') || tipoLower.includes('construcao')) {
            return 'CONSTRUÇÃO';
        }
        if (tipoLower.includes('ativação') || tipoLower.includes('ativacao')) {
            return 'ATIVAÇÃO';
        }
        if (tipoLower.includes('manutenção') || tipoLower.includes('manutencao')) {
            return 'MANUTENÇÃO';
        }

        return 'OUTROS';
    }

    // ============= CRUD DE ENDEREÇOS =============
    async function saveEndereco(enderecoData, documentId = null) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log('💾 Salvando endereço...');

        // Validar campos obrigatórios
        const requiredFields = [
            'projeto',
            'subProjeto',
            'tipoAcao',
            'condominio',
            'endereco',
            'cidade',
            'hp',
            'equipe',
            'supervisor',
            'status'
        ];
        const missingFields = validateRequiredFields(enderecoData, requiredFields);

        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        }

        // Preparar dados
        const saveData = {
            ...enderecoData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
        };

        // Converter HP para número
        if (saveData.hp) {
            saveData.hp = parseInt(saveData.hp) || 0;
        }

        // Se não tem ID, é criação
        if (!documentId) {
            saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            saveData.createdBy = user.uid;

            const docRef = await firestore.collection('enderecos').add(saveData);
            log(`✅ Endereço criado com ID: ${docRef.id}`);
            return docRef.id;
        } else {
            // Atualização
            await firestore.collection('enderecos').doc(documentId).update(saveData);
            log(`✅ Endereço atualizado: ${documentId}`);
            return documentId;
        }
    }

    async function loadEnderecos(filters = {}) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        log('📋 Carregando endereços...');

        let query = firestore.collection('enderecos');

        // Aplicar filtros
        Object.keys(filters).forEach(field => {
            if (filters[field] && filters[field] !== '') {
                if (Array.isArray(filters[field])) {
                    if (filters[field].length > 0) {
                        query = query.where(field, 'in', filters[field]);
                    }
                } else {
                    query = query.where(field, '==', filters[field]);
                }
            }
        });

        // Ordenar por data de criação
        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        const enderecos = [];

        snapshot.forEach(doc => {
            enderecos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        log(`✅ ${enderecos.length} endereços carregados`);
        return enderecos;
    }

    async function deleteEndereco(documentId) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log(`🗑️ Deletando endereço: ${documentId}`);

        await firestore.collection('enderecos').doc(documentId).delete();
        log(`✅ Endereço deletado: ${documentId}`);
    }

    // ============= GESTÃO DE PROJETOS =============
    async function saveProjeto(projetoData, documentId = null) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log('💾 Salvando projeto...');

        // Validar campos obrigatórios
        const requiredFields = ['nome', 'cliente', 'status'];
        const missingFields = validateRequiredFields(projetoData, requiredFields);

        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        }

        // Preparar dados
        const saveData = {
            ...projetoData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
        };

        // Se não tem ID, é criação
        if (!documentId) {
            saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            saveData.createdBy = user.uid;

            const docRef = await firestore.collection('projetos').add(saveData);
            log(`✅ Projeto criado com ID: ${docRef.id}`);
            return docRef.id;
        } else {
            // Atualização
            await firestore.collection('projetos').doc(documentId).update(saveData);
            log(`✅ Projeto atualizado: ${documentId}`);
            return documentId;
        }
    }

    async function loadProjetos(activeOnly = false) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        log('📋 Carregando projetos...');

        let query = firestore.collection('projetos');

        if (activeOnly) {
            query = query.where('status', '==', 'ATIVO');
        }

        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        const projetos = [];

        snapshot.forEach(doc => {
            projetos.push({
                id: doc.id,
                ...doc.data()
            });
        });

        log(`✅ ${projetos.length} projetos carregados`);
        return projetos;
    }

    // Funções similares para Sub Projetos, Tipos de Ação, etc.
    async function saveSubProjeto(data, documentId = null) {
        return await saveGenericDocument(
            'subprojetos',
            data,
            ['nome', 'projetoPrincipal', 'status'],
            documentId
        );
    }

    async function saveTipoAcao(data, documentId = null) {
        return await saveGenericDocument(
            'tiposacao',
            data,
            ['nome', 'categoria', 'status'],
            documentId
        );
    }

    async function saveSupervisor(data, documentId = null) {
        return await saveGenericDocument(
            'supervisores',
            data,
            ['nome', 'email', 'area', 'status'],
            documentId
        );
    }

    async function saveEquipe(data, documentId = null) {
        return await saveGenericDocument(
            'equipes',
            data,
            ['nome', 'lider', 'especialidade', 'status'],
            documentId
        );
    }

    async function saveCidade(data, documentId = null) {
        return await saveGenericDocument('cidades', data, ['nome', 'estado', 'status'], documentId);
    }

    // Função genérica para salvar documentos
    async function saveGenericDocument(collection, data, requiredFields, documentId = null) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log(`💾 Salvando documento na coleção: ${collection}`);

        // Validar campos obrigatórios
        const missingFields = validateRequiredFields(data, requiredFields);

        if (missingFields.length > 0) {
            throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
        }

        // Preparar dados
        const saveData = {
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: user.uid
        };

        // Se não tem ID, é criação
        if (!documentId) {
            saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            saveData.createdBy = user.uid;

            const docRef = await firestore.collection(collection).add(saveData);
            log(`✅ Documento criado com ID: ${docRef.id}`);
            return docRef.id;
        } else {
            // Atualização
            await firestore.collection(collection).doc(documentId).update(saveData);
            log(`✅ Documento atualizado: ${documentId}`);
            return documentId;
        }
    }

    // Função genérica para carregar documentos
    async function loadGenericDocuments(collection, activeOnly = false) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        log(`📋 Carregando documentos da coleção: ${collection}`);

        let query = firestore.collection(collection);

        if (activeOnly) {
            query = query.where('status', '==', 'ATIVO');
        }

        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        const documents = [];

        snapshot.forEach(doc => {
            documents.push({
                id: doc.id,
                ...doc.data()
            });
        });

        log(`✅ ${documents.length} documentos carregados de ${collection}`);
        return documents;
    }

    // ============= FUNÇÕES DE LISTAGEM =============
    async function loadSubProjetos(activeOnly = false) {
        return await loadGenericDocuments('subprojetos', activeOnly);
    }

    async function loadTiposAcao(activeOnly = false) {
        return await loadGenericDocuments('tiposacao', activeOnly);
    }

    async function loadSupervisores(activeOnly = false) {
        return await loadGenericDocuments('supervisores', activeOnly);
    }

    async function loadEquipes(activeOnly = false) {
        return await loadGenericDocuments('equipes', activeOnly);
    }

    async function loadCidades(activeOnly = false) {
        return await loadGenericDocuments('cidades', activeOnly);
    }

    // ============= FUNÇÕES DE EXCLUSÃO =============
    async function deleteProjeto(documentId) {
        return await deleteGenericDocument('projetos', documentId);
    }

    async function deleteSubProjeto(documentId) {
        return await deleteGenericDocument('subprojetos', documentId);
    }

    async function deleteTipoAcao(documentId) {
        return await deleteGenericDocument('tiposacao', documentId);
    }

    async function deleteSupervisor(documentId) {
        return await deleteGenericDocument('supervisores', documentId);
    }

    async function deleteEquipe(documentId) {
        return await deleteGenericDocument('equipes', documentId);
    }

    async function deleteCidade(documentId) {
        return await deleteGenericDocument('cidades', documentId);
    }

    // Função genérica para deletar documentos
    async function deleteGenericDocument(collection, documentId) {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        if (!documentId) {
            throw new Error('ID do documento é obrigatório');
        }

        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        log(`🗑️ Excluindo documento ${documentId} da coleção ${collection}...`);

        try {
            await firestore.collection(collection).doc(documentId).delete();
            log(`✅ Documento ${documentId} excluído com sucesso da coleção ${collection}`);
            return true;
        } catch (error) {
            log(
                `❌ Erro ao excluir documento ${documentId} da coleção ${collection}: ${error.message}`,
                'error'
            );
            throw new Error(`Erro ao excluir documento: ${error.message}`);
        }
    }

    // ============= ESTATÍSTICAS E DASHBOARDS =============
    async function getStatistics() {
        if (!init()) {
            throw new Error('Sistema não inicializado');
        }

        log('📊 Calculando estatísticas...');

        const enderecos = await loadEnderecos();

        const stats = {
            totalRegistros: enderecos.length,
            enderecosDistintos: new Set(enderecos.map(e => e.endereco)).size,
            equipesDistintas: new Set(enderecos.map(e => e.equipe)).size,
            produtivos: enderecos.filter(e => e.status === 'PRODUTIVA').length,
            improdutivos: enderecos.filter(e => e.status === 'IMPRODUTIVA').length
        };

        stats.produtividade =
            stats.totalRegistros > 0
                ? Math.round((stats.produtivos / stats.totalRegistros) * 100)
                : 0;

        return stats;
    }

    // ============= API PÚBLICA =============
    return {
        // Inicialização
        init,

        // Upload de Planilhas
        processSpreadsheetData,

        // CRUD Endereços
        saveEndereco,
        loadEnderecos,
        deleteEndereco,

        // Gestão de Projetos
        saveProjeto,
        loadProjetos,
        deleteProjeto,
        saveSubProjeto,
        loadSubProjetos,
        deleteSubProjeto,
        saveTipoAcao,
        loadTiposAcao,
        deleteTipoAcao,
        saveSupervisor,
        loadSupervisores,
        deleteSupervisor,
        saveEquipe,
        loadEquipes,
        deleteEquipe,
        saveCidade,
        loadCidades,
        deleteCidade,

        // Estatísticas
        getStatistics,

        // Funções genéricas
        saveGenericDocument,
        loadGenericDocuments,

        // Utilitárias
        showMessage,
        log,

        // Funções especiais para Excel
        saveUniqueIfNotExists
    };
})();

// ============= AUTO-INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function () {
    // Aguardar um pouco para Firebase estar disponível
    setTimeout(() => {
        window.FirestoreIntegration.init();
    }, 1000);
});

console.log('✅ [FIRESTORE-INTEGRATION] Módulo carregado com sucesso');
