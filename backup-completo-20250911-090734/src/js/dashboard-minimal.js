// ============= DASHBOARD MINIMAL - APENAS FUNÇÕES ESSENCIAIS =============
console.log('📊 [DASHBOARD-MINIMAL] Inicializando funções mínimas...');

// ============= SISTEMA DE PERMISSÕES POR ROLE =============
const USER_ROLES = {
    USER: 'USER', // Usuário comum - só Início e Dashboard
    SUPERVISOR: 'SUPERVISOR', // Supervisor - Início, Dashboard, Cadastro de Endereços
    GESTOR: 'GESTOR', // Gestor - tudo exceto algumas funções admin
    ADMIN: 'ADMIN' // Admin - acesso total
};

// Configuração de permissões por role
const ROLE_PERMISSIONS = {
    [USER_ROLES.USER]: {
        sections: ['inicio', 'infraestrutura'],
        actions: ['view']
    },
    [USER_ROLES.SUPERVISOR]: {
        sections: ['inicio', 'infraestrutura', 'enderecos'],
        actions: ['view', 'edit']
    },
    [USER_ROLES.GESTOR]: {
        sections: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
        actions: ['view', 'edit', 'create']
    },
    [USER_ROLES.ADMIN]: {
        sections: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
        actions: ['view', 'edit', 'create', 'delete', 'admin']
    }
};

let currentUserRole = USER_ROLES.USER; // Default

// Função para obter role do usuário do Firestore
async function getUserRole() {
    try {
        const user = window.getCurrentUser();
        if (!user) {
            console.log('🔒 [PERMISSIONS] Usuário não autenticado');
            return USER_ROLES.USER;
        }

        console.log('🔍 [PERMISSIONS] Buscando role do usuário no Firestore...');

        if (window.firestore) {
            const userDoc = await window.firestore.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData.role || USER_ROLES.USER;
                console.log(`✅ [PERMISSIONS] Role encontrado: ${role}`);
                return role;
            }
        }

        console.log('⚠️ [PERMISSIONS] Role não encontrado, usando USER como padrão');
        return USER_ROLES.USER;
    } catch (error) {
        console.error('❌ [PERMISSIONS] Erro ao buscar role:', error);
        return USER_ROLES.USER;
    }
}

// Função para aplicar permissões no menu
function applyRolePermissions(role) {
    console.log(`🔧 [PERMISSIONS] Aplicando permissões para role: ${role}`);

    currentUserRole = role;
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[USER_ROLES.USER];

    // Atualizar display do role no header
    const roleElement = document.getElementById('userRoleSimple');
    if (roleElement) {
        roleElement.textContent = role;
    }

    const dropdownRoleElement = document.getElementById('userRoleSimple');
    if (dropdownRoleElement) {
        dropdownRoleElement.textContent = role;
    }

    // Controlar visibilidade dos itens do menu
    const menuItems = document.querySelectorAll('.sidebar-menu li');

    menuItems.forEach(li => {
        const link = li.querySelector('a');
        if (!link) {
            return;
        }

        const onclick = link.getAttribute('onclick');
        if (!onclick) {
            return;
        }

        // Extrair nome da seção do onclick
        const sectionMatch = onclick.match(/showSection\('([^']+)'/);
        if (!sectionMatch) {
            return;
        }

        const sectionName = sectionMatch[1];

        // Verificar se o usuário tem permissão para esta seção
        if (permissions.sections.includes(sectionName)) {
            li.style.display = '';
            console.log(`✅ [PERMISSIONS] Seção '${sectionName}' liberada`);
        } else {
            li.style.display = 'none';
            console.log(`🚫 [PERMISSIONS] Seção '${sectionName}' bloqueada`);
        }
    });
}

// Função para verificar se usuário tem permissão para uma ação
function hasPermission(action) {
    const permissions = ROLE_PERMISSIONS[currentUserRole] || ROLE_PERMISSIONS[USER_ROLES.USER];
    return permissions.actions.includes(action);
}

// Função para teste - alterar role temporariamente (apenas para testes)
window.setUserRoleForTesting = function (role) {
    console.log(`🧪 [TEST] Alterando role para: ${role}`);
    if (USER_ROLES[role]) {
        applyRolePermissions(role);
        return true;
    } else {
        console.error('❌ [TEST] Role inválido:', role);
        return false;
    }
};

// ============= SISTEMA DE GESTÃO DE PERMISSÕES POR UID =============

// Função para listar todos os usuários (para admins)
window.listAllUsers = async function () {
    try {
        if (!hasPermission('admin')) {
            console.error('❌ [PERMISSIONS] Sem permissão para listar usuários');
            return [];
        }

        console.log('📋 [ADMIN] Listando todos os usuários...');

        if (window.firestore) {
            const usersRef = window.firestore.collection('users');
            const snapshot = await usersRef.get();

            const users = [];
            snapshot.forEach(doc => {
                const userData = doc.data();
                users.push({
                    uid: userData.uid,
                    email: userData.email,
                    displayName: userData.displayName,
                    role: userData.role || 'USER',
                    createdAt: userData.createdAt
                });
            });

            console.log(`✅ [ADMIN] ${users.length} usuários encontrados`);
            console.table(users);
            return users;
        }

        return [];
    } catch (error) {
        console.error('❌ [ADMIN] Erro ao listar usuários:', error);
        return [];
    }
};

// Função para atualizar role do usuário por UID (método principal)
window.updateUserRoleByUID = async function (uid, newRole) {
    try {
        if (!hasPermission('admin')) {
            console.error('❌ [PERMISSIONS] Sem permissão para alterar roles');
            return false;
        }

        if (!USER_ROLES[newRole]) {
            console.error('❌ [ADMIN] Role inválido:', newRole);
            console.log('✅ [ADMIN] Roles válidos:', Object.keys(USER_ROLES));
            return false;
        }

        console.log(`🔧 [ADMIN] Atualizando role do UID ${uid} para ${newRole}`);

        if (window.firestore) {
            const userDoc = window.firestore.collection('users').doc(uid);
            const docSnapshot = await userDoc.get();

            if (docSnapshot.exists) {
                await userDoc.update({
                    role: newRole,
                    roleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    roleUpdatedBy: window.getCurrentUser()?.uid || 'system'
                });

                const userData = docSnapshot.data();
                console.log(`✅ [ADMIN] Role de ${userData.email} atualizado para ${newRole}`);
                return true;
            } else {
                console.error('❌ [ADMIN] Usuário não encontrado com UID:', uid);
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('❌ [ADMIN] Erro ao atualizar role:', error);
        return false;
    }
};

// Função para atualizar role do usuário por email (método alternativo)
window.updateUserRoleByEmail = async function (userEmail, newRole) {
    try {
        if (!hasPermission('admin')) {
            console.error('❌ [PERMISSIONS] Sem permissão para alterar roles');
            return false;
        }

        console.log(`🔧 [ADMIN] Buscando usuário por email: ${userEmail}`);

        if (window.firestore) {
            // Buscar usuário por email
            const usersRef = window.firestore.collection('users');
            const query = await usersRef.where('email', '==', userEmail).get();

            if (!query.empty) {
                const userDoc = query.docs[0];
                const uid = userDoc.id;
                return await window.updateUserRoleByUID(uid, newRole);
            } else {
                console.error('❌ [ADMIN] Usuário não encontrado com email:', userEmail);
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('❌ [ADMIN] Erro ao buscar usuário por email:', error);
        return false;
    }
};

// Função para obter dados de um usuário específico
window.getUserData = async function (uid) {
    try {
        if (!hasPermission('admin')) {
            console.error('❌ [PERMISSIONS] Sem permissão para visualizar dados de usuários');
            return null;
        }

        console.log(`🔍 [ADMIN] Buscando dados do usuário: ${uid}`);

        if (window.firestore) {
            const userDoc = await window.firestore.collection('users').doc(uid).get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log('✅ [ADMIN] Dados encontrados:', userData);
                return userData;
            } else {
                console.error('❌ [ADMIN] Usuário não encontrado');
                return null;
            }
        }

        return null;
    } catch (error) {
        console.error('❌ [ADMIN] Erro ao buscar dados do usuário:', error);
        return null;
    }
};

// Função para criar/promover primeiro admin (usar apenas uma vez)
window.createFirstAdmin = async function (email) {
    try {
        console.log(`🛡️ [SETUP] Promovendo primeiro admin: ${email}`);

        if (window.firestore) {
            const usersRef = window.firestore.collection('users');
            const query = await usersRef.where('email', '==', email).get();

            if (!query.empty) {
                const userDoc = query.docs[0];
                await userDoc.ref.update({
                    role: 'ADMIN',
                    roleUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    roleUpdatedBy: 'SYSTEM_SETUP'
                });

                console.log('✅ [SETUP] Primeiro admin criado com sucesso!');
                console.log('🔄 [SETUP] Recarregue a página para aplicar permissões');
                return true;
            } else {
                console.error('❌ [SETUP] Usuário não encontrado. Faça login primeiro.');
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error('❌ [SETUP] Erro ao criar primeiro admin:', error);
        return false;
    }
};

// Função para popular filtros da infraestrutura - delegada para firebase-table-system.js
window.populateInfraFilters = function () {
    console.log('📋 [FILTERS] Delegando população de filtros para firebase-table-system.js...');

    // Chamar a função do sistema Firebase se disponível
    if (
        window.FirebaseTableSystem &&
        typeof window.FirebaseTableSystem.updateFilters === 'function'
    ) {
        return window.FirebaseTableSystem.updateFilters();
    } else {
        console.warn('⚠️ [FILTERS] Sistema Firebase não disponível, criando filtros vazios');

        // Fallback: criar filtros vazios
        const filters = [
            'infraFilterProjeto',
            'infraFilterSubProjeto',
            'infraFilterEquipe',
            'infraFilterStatus',
            'infraFilterCidade',
            'infraFilterSupervisor',
            'infraFilterTipoAcao',
            'infraFilterCondominio'
        ];

        filters.forEach(filterId => {
            const select = document.getElementById(filterId);
            if (select) {
                select.innerHTML = '<option value="">Todos</option>';
                console.log(`✅ [FILTERS] ${filterId} inicializado (vazio)`);
            }
        });

        return Promise.resolve();
    }
};

// FUNÇÃO REMOVIDA - Conflitava com dashboard-integration.js
// A função applyInfraFilters está implementada no dashboard-integration.js

// FUNÇÃO REMOVIDA - Conflitava com dashboard-integration.js
// A função clearInfraFilters está implementada no dashboard-integration.js

// Função para alternar seções
window.showSection = function (sectionId, event) {
    if (event) {
        event.preventDefault();
    }

    console.log(`📄 [SECTION] Mostrando seção: ${sectionId}`);

    // Ocultar todas as seções
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });

    // Mostrar seção selecionada
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Atualizar menu ativo
    const menuItems = document.querySelectorAll('.sidebar-menu a');
    menuItems.forEach(item => {
        item.classList.remove('active');
    });

    if (event && event.target) {
        event.target.closest('a').classList.add('active');
    }

    // Ações específicas por seção
    if (sectionId === 'enderecos') {
        // Carregar endereços automaticamente ao abrir a seção
        setTimeout(() => {
            console.log('🔄 [SECTION] Auto-carregando endereços...');
            if (typeof window.loadEnderecos === 'function') {
                loadEnderecos();
            }
        }, 500);
    }

    // Atualizar título
    const titleElement = document.getElementById('section-title');
    if (titleElement) {
        const titles = {
            inicio: 'Início',
            infraestrutura: 'Dashboard - Infraestrutura',
            enderecos: 'Cadastro de Endereços',
            'gestao-projetos': 'Gestão de Projetos'
        };
        titleElement.textContent = titles[sectionId] || 'Dashboard';
    }
};

// ============= DROPDOWN DO USUÁRIO =============

// Função para alternar dropdown do usuário
// window.toggleNewDropdown - DESABILITADO - SUBSTITUÍDO POR user-dropdown-system.js
/*
window.toggleNewDropdown = function() {
    console.log('👤 [DROPDOWN] Alternando dropdown do usuário...');
    // FUNÇÃO DESABILITADA - USANDO NOVO SISTEMA DE DROPDOWN
};
*/

// window.openUserProfile - DESABILITADO - SUBSTITUÍDO POR user-dropdown-system.js
/*
window.openUserProfile = function() {
    console.log('👤 [PROFILE] Abrindo perfil do usuário...');
    // FUNÇÃO DESABILITADA - USANDO NOVO SISTEMA DE DROPDOWN
};
*/

// Função para fechar tela de perfil
window.closeUserProfileScreen = function () {
    console.log('👤 [PROFILE] Fechando perfil do usuário...');
    const profileScreen = document.getElementById('userProfileScreen');
    if (profileScreen) {
        profileScreen.style.display = 'none';
    }
};

// Função para alternar modo daltônico
// window.toggleColorblindMode - DESABILITADO - SUBSTITUÍDO POR user-dropdown-system.js
/*
window.toggleColorblindMode = function() {
    console.log('🎨 [ACCESSIBILITY] Alternando modo daltônico...');
    // FUNÇÃO DESABILITADA - USANDO NOVO SISTEMA DE DROPDOWN
};
*/

// Função para atualizar informações do usuário no dropdown
function updateUserInfo() {
    const user = window.getCurrentUser();
    if (!user) {
        console.log('⚠️ [USER-INFO] Usuário não logado, não é possível atualizar informações');
        return;
    }

    console.log('👤 [USER-INFO] Atualizando informações do usuário...', user);

    // Atualizar nome
    const userNameElements = document.querySelectorAll('#userNameSimple, #dropdownUserName');
    const displayName = user.displayName || user.email.split('@')[0];
    console.log('👤 [USER-INFO] Nome para exibir:', displayName);

    userNameElements.forEach(el => {
        if (el) {
            el.textContent = displayName;
            console.log('✅ [USER-INFO] Nome atualizado no elemento:', el.id);
        }
    });

    // Atualizar email
    const emailElement = document.getElementById('dropdownUserEmail');
    if (emailElement) {
        emailElement.textContent = user.email;
        console.log('✅ [USER-INFO] Email atualizado:', user.email);
    }

    // Atualizar role no dropdown
    const roleElement = document.getElementById('userRoleSimple');
    if (roleElement) {
        roleElement.textContent = currentUserRole;
        console.log('✅ [USER-INFO] Role atualizado:', currentUserRole);
    }

    // Atualizar avatares
    const avatarElements = document.querySelectorAll('#userAvatarSimple, #userAvatarLarge');
    const initials = (user.displayName || user.email).charAt(0).toUpperCase();
    const avatarUrl40 = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=40`;
    const avatarUrl60 = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=60`;

    avatarElements.forEach(img => {
        if (img) {
            // Usar tamanho apropriado baseado no ID
            img.src = img.id.includes('Large') ? avatarUrl60 : avatarUrl40;
            console.log('✅ [USER-INFO] Avatar atualizado:', img.id);
        }
    });
}

// ============= SISTEMA CRUD DE ENDEREÇOS =============

// Variáveis de controle
let isEditMode = false;
let currentEditId = null;

// FUNÇÃO ANTIGA REMOVIDA - Agora usando novo-endereco-limpo.js

// Função para fechar modal
window.closeModal = function () {
    console.log('❌ [MODAL] Fechando modal...');
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        isEditMode = false;
        currentEditId = null;
        console.log('✅ [MODAL] Modal fechado');
    }
};

// Função alternativa para fechar modal (compatibilidade)
window.fecharModal = window.closeModal;

// Função para salvar endereço
window.saveEndereco = async function (formData) {
    try {
        console.log('💾 [ENDERECO] Iniciando salvamento...', formData);

        // Verificar se Firebase está disponível
        if (!window.firestore) {
            console.error('❌ [ENDERECO] Firestore não está disponível!');
            throw new Error('Sistema não conectado ao Firebase. Tente recarregar a página.');
        }

        if (!firebase || !firebase.firestore) {
            console.error('❌ [ENDERECO] Firebase não está disponível!');
            throw new Error('Firebase não carregado. Tente recarregar a página.');
        }

        const user = window.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado. Faça login novamente.');
        }

        console.log('✅ [ENDERECO] Verificações passou - Firebase OK, User OK');

        // Preparar dados para salvar
        const enderecoData = {
            ...formData,
            createdBy: user.uid,
            createdByEmail: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: formData.status || 'ATIVO'
        };

        console.log('📊 [ENDERECO] Dados preparados:', enderecoData);

        let docRef;
        if (isEditMode && currentEditId) {
            // Atualizar existente
            console.log('✏️ [ENDERECO] Atualizando endereço existente:', currentEditId);
            docRef = window.firestore.collection('enderecos').doc(currentEditId);
            await docRef.update({
                ...formData,
                updatedBy: user.uid,
                updatedByEmail: user.email,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ [ENDERECO] Endereço atualizado com sucesso');
        } else {
            // Criar novo
            console.log('➕ [ENDERECO] Criando novo endereço...');
            docRef = await window.firestore.collection('enderecos').add(enderecoData);
            console.log('✅ [ENDERECO] Novo endereço criado:', docRef.id);
        }

        // Fechar modal e recarregar tabela
        console.log('🔄 [ENDERECO] Fechando modal e recarregando...');
        closeModal();

        // Aguardar um pouco antes de recarregar
        setTimeout(() => {
            loadEnderecos();
        }, 500);

        // Mostrar notificação de sucesso
        const message = `Endereço ${isEditMode ? 'atualizado' : 'criado'} com sucesso!`;
        console.log('✅ [ENDERECO] ' + message);

        if (typeof window.showCustomNotification === 'function') {
            window.showCustomNotification('✅ Sucesso', message, 'success');
        } else {
            alert(message);
        }

        return true;
    } catch (error) {
        console.error('❌ [ENDERECO] Erro ao salvar:', error);

        const errorMsg = `Erro ao salvar endereço: ${error.message}`;

        if (typeof window.showCustomNotification === 'function') {
            window.showCustomNotification('❌ Erro', errorMsg, 'error');
        } else {
            alert(errorMsg);
        }

        return false;
    }
};

// Função para carregar endereços na tabela
window.loadEnderecos = async function () {
    try {
        console.log('🔄 [ENDERECO] Iniciando carregamento de endereços...');

        // Verificar se Firebase está disponível
        if (!window.firestore) {
            console.error('❌ [ENDERECO] Firestore não disponível para carregamento');
            throw new Error('Firebase Firestore não está conectado');
        }

        const tableBody = document.getElementById('enderecosTableBody');
        if (!tableBody) {
            console.warn('⚠️ [ENDERECO] Tabela de endereços não encontrada no DOM');
            return;
        }

        console.log('📊 [ENDERECO] Elementos OK, buscando dados...');

        // Limpar tabela e mostrar loading
        tableBody.innerHTML =
            '<tr><td colspan="25" style="text-align: center;">🔄 Carregando endereços...</td></tr>';

        // Buscar endereços no Firestore
        const snapshot = await window.firestore
            .collection('enderecos')
            .orderBy('createdAt', 'desc')
            .get();

        console.log('📦 [ENDERECO] Snapshot obtido:', snapshot.size, 'documentos');

        // Limpar tabela novamente
        tableBody.innerHTML = '';

        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="25" style="text-align: center; padding: 20px;">
                        📝 Nenhum endereço cadastrado ainda.<br>
                        <small>Clique em "Novo" para adicionar o primeiro endereço.</small>
                    </td>
                </tr>
            `;
            console.log('ℹ️ [ENDERECO] Nenhum endereço encontrado');
            return;
        }

        // Adicionar cada endereço à tabela
        let count = 0;
        snapshot.forEach(doc => {
            try {
                const data = doc.data();
                const row = createEnderecoTableRow(doc.id, data);
                tableBody.appendChild(row);
                count++;
            } catch (rowError) {
                console.error('❌ [ENDERECO] Erro ao criar linha para:', doc.id, rowError);
            }
        });

        console.log(`✅ [ENDERECO] ${count}/${snapshot.size} endereços carregados na tabela`);
    } catch (error) {
        console.error('❌ [ENDERECO] Erro ao carregar endereços:', error);

        const tableBody = document.getElementById('enderecosTableBody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="25" style="text-align: center; color: #f44336; padding: 20px;">
                        ❌ Erro ao carregar endereços: ${error.message}<br>
                        <small>Verifique sua conexão e tente recarregar a página.</small>
                    </td>
                </tr>
            `;
        }
    }
};

// Função para criar linha da tabela
function createEnderecoTableRow(id, data) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${id.substring(0, 8)}...</td>
        <td>${data.projeto || '-'}</td>
        <td>${data.subProjeto || '-'}</td>
        <td>${data.tipoAcao || '-'}</td>
        <td>${data.condominio || '-'}</td>
        <td>${data.endereco || '-'}</td>
        <td>${data.cidade || '-'}</td>
        <td>${data.pep || '-'}</td>
        <td>${data.codImovelGed || '-'}</td>
        <td>${data.nodeGerencial || '-'}</td>
        <td>${data.areaTecnica || '-'}</td>
        <td>${data.hp || '-'}</td>
        <td>${data.andar || '-'}</td>
        <td>${formatDate(data.dataRecebimento)}</td>
        <td>${formatDate(data.dataInicio)}</td>
        <td>${formatDate(data.dataFinal)}</td>
        <td>${data.equipe || '-'}</td>
        <td>${data.supervisor || '-'}</td>
        <td><span class="status-badge ${data.status?.toLowerCase()}">${data.status || 'ATIVO'}</span></td>
        <td>${data.rdo || '-'}</td>
        <td>${data.book || '-'}</td>
        <td>${data.projetoStatus || '-'}</td>
        <td>${data.situacao || '-'}</td>
        <td>${data.justificativa || '-'}</td>
        <td>
            <button class="btn-edit" onclick="editEndereco('${id}')">✏️</button>
            <button class="btn-delete" onclick="deleteEndereco('${id}')">🗑️</button>
        </td>
    `;
    return row;
}

// Função para formatar data
function formatDate(dateValue) {
    if (!dateValue) {
        return '-';
    }

    try {
        let date;
        if (dateValue.toDate) {
            date = dateValue.toDate(); // Firestore Timestamp
        } else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        } else {
            date = dateValue;
        }

        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return dateValue.toString();
    }
}

// Função para editar endereço
window.editEndereco = async function (id) {
    try {
        console.log(`✏️ [ENDERECO] Editando endereço: ${id}`);

        const doc = await window.firestore.collection('enderecos').doc(id).get();
        if (!doc.exists) {
            throw new Error('Endereço não encontrado');
        }

        const data = doc.data();
        isEditMode = true;
        currentEditId = id;

        // Abrir modal e preencher campos
        const modal = document.getElementById('crudModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('enderecoForm');

        if (modal && modalTitle && form) {
            modalTitle.textContent = 'Editar Endereço';

            // Preencher campos
            Object.keys(data).forEach(key => {
                const field = document.getElementById(key);
                if (field) {
                    if (field.type === 'date' && data[key]?.toDate) {
                        field.value = data[key].toDate().toISOString().split('T')[0];
                    } else {
                        field.value = data[key] || '';
                    }
                }
            });

            loadFormDropdowns();
            modal.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ [ENDERECO] Erro ao editar:', error);
    }
};

// Função para deletar endereço
window.deleteEndereco = async function (id) {
    if (!confirm('Tem certeza que deseja excluir este endereço?')) {
        return;
    }

    try {
        console.log(`🗑️ [ENDERECO] Deletando endereço: ${id}`);

        await window.firestore.collection('enderecos').doc(id).delete();

        console.log('✅ [ENDERECO] Endereço deletado com sucesso');
        loadEnderecos();

        if (typeof window.showCustomNotification === 'function') {
            window.showCustomNotification(
                '✅ Sucesso',
                'Endereço excluído com sucesso!',
                'success'
            );
        }
    } catch (error) {
        console.error('❌ [ENDERECO] Erro ao deletar:', error);

        if (typeof window.showCustomNotification === 'function') {
            window.showCustomNotification('❌ Erro', `Erro ao excluir: ${error.message}`, 'error');
        }
    }
};

// Função para filtrar tabela
window.filterTable = function () {
    console.log('🔍 [TABLE] Filtrando tabela...');

    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('enderecosTableBody');

    if (!searchInput || !tableBody) {
        return;
    }

    const filter = searchInput.value.toLowerCase();
    const rows = tableBody.getElementsByTagName('tr');

    for (const row of rows) {
        const text = row.textContent || row.innerText;
        row.style.display = text.toLowerCase().includes(filter) ? '' : 'none';
    }
};

// Função para upload modal - VERSÃO NOVA - DESABILITADA PARA USAR SISTEMA DINÂMICO
// window.openUploadModal = function() {
//     console.log('📁 [MODAL-V2] Abrindo modal de upload VERSÃO NOVA...');
//
//     try {
//         // Verificar se já existe um modal de upload e removê-lo
//         const existingModal = document.getElementById('uploadModal');
//         if (existingModal) {
//             existingModal.remove();
//             console.log('🗑️ [MODAL-V2] Modal antigo removido');
//         }
//
//         // Criar modal de upload dinamicamente
//         const uploadModal = createUploadModal();
//         document.body.appendChild(uploadModal);
//         uploadModal.style.display = 'block';
//
//         console.log('✅ [MODAL-V2] Modal de upload criado e exibido');
//     } catch (error) {
//         console.error('❌ [MODAL-V2] Erro ao abrir modal:', error);
//         alert('Erro ao abrir modal de upload: ' + error.message);
//     }
// };

// Função para criar modal de upload - DESABILITADA
// function createUploadModal() {
//     const modalHTML = `
//         <div id="uploadModal" class="modal" style="display: none;">
//             <div class="modal-content" style="max-width: 600px;">
//                 <div class="modal-header">
//                     <h3>📁 Upload de Arquivo</h3>
//                     <span class="close" onclick="closeUploadModal()">&times;</span>
//                 </div>
//                 <div class="modal-body">
//                     <div style="margin-bottom: 20px;">
//                         <label>Selecione o arquivo (Excel/CSV):</label>
//                         <input type="file" id="uploadFile" accept=".xlsx,.xls,.csv" style="width: 100%; padding: 10px; margin: 10px 0;">
//                     </div>
//                     <div style="margin-bottom: 20px;">
//                         <label>Tipo de dados:</label>
//                         <select id="uploadType" style="width: 100%; padding: 10px; margin: 10px 0;">
//                             <option value="enderecos">Endereços</option>
//                             <option value="gestao">Gestão de Projetos</option>
//                         </select>
//                     </div>
//                     <div id="uploadProgress" style="display: none;">
//                         <div style="background: #f0f0f0; border-radius: 10px; overflow: hidden; margin: 10px 0;">
//                             <div id="uploadProgressBar" style="height: 20px; background: #4CAF50; width: 0%; transition: width 0.3s;"></div>
//                         </div>
//                         <p id="uploadStatus">Preparando upload...</p>
//                     </div>
//                     <div id="uploadResults" style="display: none; margin-top: 20px;">
//                         <h4>Resultados:</h4>
//                         <div id="uploadResultsContent"></div>
//                     </div>
//                 </div>
//                 <div class="modal-footer">
//                     <button type="button" class="btn-cancel" onclick="closeUploadModal()">
//                         <i class="fas fa-times"></i> Cancelar
//                     </button>
//                     <button type="button" class="btn-save" onclick="processUpload()">
//                         <i class="fas fa-upload"></i> Fazer Upload
//                     </button>
//                 </div>
//             </div>
//         </div>
//     `;
//
//     const div = document.createElement('div');
//     div.innerHTML = modalHTML;
//     return div.firstElementChild;
// }

// Função para fechar modal de upload - DESABILITADA
// window.closeUploadModal = function() {
//     const modal = document.getElementById('uploadModal');
//     if (modal) {
//         modal.style.display = 'none';
//         modal.remove();
//     }
// };

// Função desabilitada - usar dashboard-handlers.js
window.processUploadOLD = async function () {
    const fileInput = document.getElementById('uploadFile');
    const uploadType = document.getElementById('uploadType').value;
    const progressDiv = document.getElementById('uploadProgress');
    const resultsDiv = document.getElementById('uploadResults');
    const progressBar = document.getElementById('uploadProgressBar');
    const statusText = document.getElementById('uploadStatus');

    if (!fileInput.files.length) {
        alert('Por favor, selecione um arquivo');
        return;
    }

    const file = fileInput.files[0];
    console.log('📁 [UPLOAD] Processando arquivo:', file.name);

    // Mostrar progresso
    progressDiv.style.display = 'block';
    statusText.textContent = 'Lendo arquivo...';
    progressBar.style.width = '20%';

    try {
        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 1000));

        statusText.textContent = 'Validando dados...';
        progressBar.style.width = '50%';

        await new Promise(resolve => setTimeout(resolve, 1000));

        statusText.textContent = 'Salvando no Firebase...';
        progressBar.style.width = '80%';

        // Upload foi removido - usar sistema principal de upload
        console.log('⚠️ [UPLOAD] Esta função foi desabilitada. Use o sistema principal de upload.');

        statusText.textContent = 'Upload concluído!';
        progressBar.style.width = '100%';

        // Mostrar resultados
        resultsDiv.style.display = 'block';
        document.getElementById('uploadResultsContent').innerHTML = `
            <div style="color: #4CAF50;">
                ✅ Arquivo "${file.name}" processado com sucesso!<br>
                📊 Tipo: ${uploadType}<br>
                💾 Dados salvos no Firestore
            </div>
        `;

        console.log('✅ [UPLOAD] Upload concluído com sucesso');

        // Recarregar dados se estiver na seção correspondente
        if (uploadType === 'enderecos') {
            setTimeout(() => {
                if (typeof window.loadEnderecos === 'function') {
                    loadEnderecos();
                }
            }, 2000);
        }
    } catch (error) {
        console.error('❌ [UPLOAD] Erro no upload:', error);
        statusText.textContent = 'Erro no upload: ' + error.message;
        progressBar.style.backgroundColor = '#f44336';
    }
};

// Função removida - usar sistema principal de upload

// ============= FUNÇÕES DO PERFIL DE USUÁRIO =============

// Função para alternar visibilidade da senha
window.togglePasswordVisibility = function (fieldId) {
    const field = document.getElementById(fieldId);
    const button = field?.parentElement?.querySelector('.toggle-password');

    if (field && button) {
        if (field.type === 'password') {
            field.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            field.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
};

// Função para alterar senha
window.changePassword = async function () {
    console.log('🔑 [PASSWORD] Iniciando alteração de senha...');

    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;

    // Validações
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('Todos os campos são obrigatórios');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('As senhas não coincidem');
        return;
    }

    if (newPassword.length < 6) {
        alert('A nova senha deve ter pelo menos 6 caracteres');
        return;
    }

    try {
        const user = window.getCurrentUser();
        if (!user) {
            alert('Usuário não autenticado');
            return;
        }

        // Reautenticar usuário com senha atual
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);

        // Alterar senha
        await user.updatePassword(newPassword);

        console.log('✅ [PASSWORD] Senha alterada com sucesso');
        alert('Senha alterada com sucesso!');

        // Limpar campos
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        // Fechar modal
        window.closeUserProfileScreen();
    } catch (error) {
        console.error('❌ [PASSWORD] Erro ao alterar senha:', error);

        let errorMessage = 'Erro ao alterar senha';
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Senha atual incorreta';
                break;
            case 'auth/weak-password':
                errorMessage = 'Nova senha muito fraca';
                break;
            case 'auth/requires-recent-login':
                errorMessage = 'Faça login novamente e tente alterar a senha';
                break;
            default:
                errorMessage = error.message;
        }

        alert(errorMessage);
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    console.log('✅ [DASHBOARD-MINIMAL] Funções mínimas carregadas');

    // Popular filtros automaticamente
    if (typeof window.populateInfraFilters === 'function') {
        window.populateInfraFilters();
    }

    // Mostrar seção inicial
    window.showSection('inicio');

    // Configurar handler do formulário de endereços
    setupEnderecoFormHandler();

    // Tentar atualizar informações do usuário após um delay
    setTimeout(() => {
        console.log('🔄 [INIT] Tentando atualizar informações do usuário...');
        updateUserInfo();
    }, 2000);
});

// Função para configurar handler do formulário de endereços
function setupEnderecoFormHandler() {
    console.log('🔧 [SETUP] Configurando handler do formulário...');

    // Aguardar um pouco para o DOM estar totalmente carregado
    setTimeout(() => {
        const form = document.getElementById('enderecoForm');
        console.log('🔍 [SETUP] Procurando formulário enderecoForm:', !!form);

        if (form) {
            // Remover listeners antigos se existirem
            form.removeEventListener('submit', handleFormSubmit);
            form.addEventListener('submit', handleFormSubmit);

            console.log('✅ [FORM] Handler do formulário configurado');

            // Debug: listar campos do formulário
            const inputs = form.querySelectorAll('input, select, textarea');
            console.log(`📋 [FORM] Formulário encontrado com ${inputs.length} campos`);
        } else {
            console.warn('⚠️ [FORM] Formulário de endereços não encontrado. Tentando novamente...');

            // Tentar novamente após mais tempo
            setTimeout(() => {
                setupEnderecoFormHandler();
            }, 1000);
        }
    }, 500);
}

// Handler separado para o formulário
async function handleFormSubmit(e) {
    e.preventDefault();

    console.log('📝 [FORM] Formulário submetido!');

    try {
        const form = e.target;

        // Coletar dados do formulário manualmente
        const data = {};
        const formElements = form.querySelectorAll('input, select, textarea');

        console.log(`📊 [FORM] Coletando dados de ${formElements.length} elementos...`);

        formElements.forEach(element => {
            if (element.name || element.id) {
                const key = element.name || element.id;
                const value = element.value;

                if (value && value.trim() !== '') {
                    data[key] = value.trim();
                }
            }
        });

        console.log('📝 [FORM] Dados coletados:', data);

        // Validação básica
        if (!data.projeto && !data.condominio) {
            alert('Por favor, preencha pelo menos o Projeto ou Condomínio');
            return;
        }

        if (!data.endereco) {
            alert('Campo Endereço é obrigatório');
            return;
        }

        console.log('✅ [FORM] Validação passou, salvando...');

        // Salvar endereço
        const success = await saveEndereco(data);

        if (success) {
            console.log('✅ [FORM] Endereço salvo com sucesso!');
        }
    } catch (error) {
        console.error('❌ [FORM] Erro no handler:', error);
        alert('Erro ao processar formulário: ' + error.message);
    }
}

// Inicializar permissões quando Firebase estiver pronto
document.addEventListener('firebaseIsolatedReady', async function () {
    console.log('🔒 [PERMISSIONS] Firebase pronto, inicializando sistema...');

    // Aguardar um pouco para garantir que o usuário está autenticado
    setTimeout(async () => {
        updateUserInfo();
        const role = await getUserRole();
        applyRolePermissions(role);

        // Restaurar modo daltônico se salvo
        const colorblindMode = localStorage.getItem('colorblindMode');
        if (colorblindMode === 'true') {
            toggleColorblindMode();
        }
    }, 1000);
});

// Listener para quando usuário fizer login (backup)
window.addEventListener('authStateChanged', async function () {
    console.log('🔒 [PERMISSIONS] Estado de auth mudou, atualizando sistema...');

    setTimeout(async () => {
        updateUserInfo();
        const role = await getUserRole();
        applyRolePermissions(role);
    }, 500);
});

// Fechar dropdown quando clicar fora
document.addEventListener('click', function (event) {
    const dropdownContainer = document.getElementById('newUserDropdown');
    const userProfileBtn = document.getElementById('userProfileBtn');

    if (dropdownContainer && userProfileBtn) {
        if (!dropdownContainer.contains(event.target)) {
            dropdownContainer.classList.remove('active');
            const dropdown = document.getElementById('dropdownMenu');
            if (dropdown) {
                dropdown.style.display = 'none';
                dropdown.style.visibility = 'hidden';
                dropdown.style.opacity = '0';
            }
            const arrow = document.getElementById('dropdownArrow');
            if (arrow) {
                arrow.style.transform = '';
            }
        }
    }
});

// ============= FUNÇÕES DE CONVENIÊNCIA PARA GESTÃO =============

// Função para mostrar todas as funções de administração disponíveis
window.showAdminCommands = function () {
    console.log('\n🛠️ ========== COMANDOS DE ADMINISTRAÇÃO ==========');
    console.log('📋 Listar usuários:');
    console.log('   listAllUsers()');
    console.log('');
    console.log('🔧 Alterar role por UID:');
    console.log('   updateUserRoleByUID("UID_AQUI", "ROLE")');
    console.log('');
    console.log('📧 Alterar role por email:');
    console.log('   updateUserRoleByEmail("email@exemplo.com", "ROLE")');
    console.log('');
    console.log('🔍 Ver dados de usuário:');
    console.log('   getUserData("UID_AQUI")');
    console.log('');
    console.log('🛡️ Criar primeiro admin:');
    console.log('   createFirstAdmin("seu_email@exemplo.com")');
    console.log('');
    console.log('🧪 Testar roles localmente:');
    console.log('   setUserRoleForTesting("ROLE")');
    console.log('');
    console.log('📌 Roles disponíveis: USER, SUPERVISOR, GESTOR, ADMIN');
    console.log('================================================\n');
};

// Função para obter o UID do usuário atual (útil para gestão)
window.getMyUID = function () {
    const user = window.getCurrentUser();
    if (user) {
        console.log(`🆔 Seu UID: ${user.uid}`);
        console.log(`📧 Seu email: ${user.email}`);
        return user.uid;
    } else {
        console.log('❌ Usuário não autenticado');
        return null;
    }
};

// Função para verificar meu role atual
window.getMyRole = function () {
    console.log(`🔒 Seu role atual: ${currentUserRole}`);
    const permissions = ROLE_PERMISSIONS[currentUserRole];
    console.log('✅ Seções acessíveis:', permissions.sections);
    console.log('⚡ Ações permitidas:', permissions.actions);
    return currentUserRole;
};

// Função para forçar atualização das informações do usuário
window.forceUpdateUserInfo = function () {
    console.log('🔄 [FORCE-UPDATE] Forçando atualização das informações do usuário...');
    updateUserInfo();
    getUserRole().then(role => {
        applyRolePermissions(role);
        console.log('✅ [FORCE-UPDATE] Informações atualizadas com sucesso');
    });
};

// Função específica para promover usuário específico
window.promoteSpecificUser = async function (uid = 'HB1zk2ya1xar3f8va1GuAN7PSJ12') {
    try {
        console.log(`🛡️ [PROMOTE] Promovendo usuário ${uid} para ADMIN...`);

        const userDoc = window.firestore.collection('users').doc(uid);
        const userData = await userDoc.get();

        if (!userData.exists) {
            console.error(`❌ [PROMOTE] Usuário ${uid} não encontrado`);
            return false;
        }

        const currentUser = window.getCurrentUser();
        const data = userData.data();

        await userDoc.update({
            role: 'ADMIN',
            promotedAt: firebase.firestore.FieldValue.serverTimestamp(),
            promotedBy: currentUser?.uid || 'SYSTEM',
            promotedByEmail: currentUser?.email || 'system@admin'
        });

        console.log(`✅ [PROMOTE] ${data.email} (${uid}) promovido para ADMIN com sucesso!`);
        return true;
    } catch (error) {
        console.error(`❌ [PROMOTE] Erro:`, error);
        return false;
    }
};

// Função para testar elementos do modal
window.testEnderecoModal = function () {
    console.log('🧪 [TEST] Testando elementos do modal...');

    const elements = {
        modal: document.getElementById('crudModal'),
        modalTitle: document.getElementById('modalTitle'),
        form: document.getElementById('enderecoForm'),
        closeBtn: document.querySelector('#crudModal .close'),
        submitBtn: document.querySelector('#enderecoForm button[type="submit"]')
    };

    console.log('🔍 [TEST] Elementos encontrados:', elements);

    // Testar abertura do modal
    if (elements.modal) {
        console.log('✅ [TEST] Abrindo modal de teste...');
        elements.modal.style.display = 'block';

        setTimeout(() => {
            console.log('❌ [TEST] Fechando modal de teste...');
            elements.modal.style.display = 'none';
        }, 2000);
    }

    // Listar todos os campos do formulário
    if (elements.form) {
        const fields = elements.form.querySelectorAll('input, select, textarea');
        console.log(`📋 [TEST] Formulário tem ${fields.length} campos:`);
        fields.forEach((field, index) => {
            console.log(
                `  ${index + 1}. ${field.tagName} - ID: "${field.id}" - Name: "${field.name}"`
            );
        });
    }

    return elements;
};

// Função para limpar cache e recarregar sistema
window.clearCacheAndReload = function () {
    console.log('🧹 [CACHE] Limpando cache...');

    // Limpar localStorage relacionado ao sistema
    Object.keys(localStorage).forEach(key => {
        if (key.includes('firebase') || key.includes('user') || key.includes('endereco')) {
            localStorage.removeItem(key);
        }
    });

    // Limpar sessionStorage
    sessionStorage.clear();

    // Recarregar página forçando busca no servidor
    window.location.reload(true);
};

// Função para verificar status das funções
window.checkSystemStatus = function () {
    console.log('🔍 [STATUS] Verificando status detalhado do sistema...');

    const functions = {
        abrirNovoEndereco: typeof window.abrirNovoEndereco,
        openUploadModal: typeof window.openUploadModal,
        loadEnderecos: typeof window.loadEnderecos,
        saveEndereco: typeof window.saveEndereco,
        getCurrentUser: typeof window.getCurrentUser,
        firestore: typeof window.firestore,
        firebase: typeof firebase,
        FirebaseAuthIsolated: typeof window.FirebaseAuthIsolated
    };

    console.log('📊 [STATUS] Funções disponíveis:', functions);

    // Testar Firebase detalhadamente
    if (window.firestore) {
        console.log('✅ [STATUS] Firebase Firestore conectado via window.firestore');

        // Testar uma operação simples
        try {
            const testCollection = window.firestore.collection('_test');
            console.log('✅ [STATUS] Firestore collection test OK');
        } catch (e) {
            console.log('⚠️ [STATUS] Firestore collection test ERROR:', e.message);
        }
    } else {
        console.log('❌ [STATUS] Firebase Firestore NÃO conectado');
    }

    if (typeof firebase !== 'undefined' && firebase.firestore) {
        console.log('✅ [STATUS] Firebase global disponível');
        console.log('📋 [STATUS] Firebase apps:', firebase.apps.length);
    } else {
        console.log('❌ [STATUS] Firebase global NÃO disponível');
    }

    // Testar usuário
    try {
        const user = window.getCurrentUser();
        if (user) {
            console.log('✅ [STATUS] Usuário logado:', user.email);
        } else {
            console.log('⚠️ [STATUS] Nenhum usuário logado');
        }
    } catch (e) {
        console.log('❌ [STATUS] Erro ao verificar usuário:', e.message);
    }

    // Verificar elementos do DOM
    const domElements = {
        crudModal: !!document.getElementById('crudModal'),
        enderecoForm: !!document.getElementById('enderecoForm'),
        enderecosTableBody: !!document.getElementById('enderecosTableBody')
    };

    console.log('🏗️ [STATUS] Elementos DOM:', domElements);

    return { functions, domElements };
};

console.log('✅ [DASHBOARD-MINIMAL] Sistema mínimo carregado - VERSÃO 2.0');
console.log('💡 [ADMIN] Digite showAdminCommands() no console para ver comandos de gestão');
console.log('🔄 [DEBUG] Para atualizar dados do usuário: forceUpdateUserInfo()');
console.log('🛡️ [ADMIN] Para promover usuário específico: promoteSpecificUser("UID")');
console.log('🧪 [TEST] Para testar modal: testEnderecoModal()');
console.log('🔍 [STATUS] Para verificar sistema: checkSystemStatus()');
console.log('🧹 [CACHE] Para limpar cache: clearCacheAndReload()');

// Auto-promover yan@test.com.br para ADMIN se ainda não for
setTimeout(async () => {
    const user = window.getCurrentUser();
    if (user && user.email === 'yan@test.com.br') {
        console.log('🛡️ [AUTO-SETUP] Detectado usuário yan@test.com.br, verificando role...');
        try {
            const role = await getUserRole();
            if (role !== 'ADMIN') {
                console.log('🛡️ [AUTO-SETUP] Promovendo yan@test.com.br para ADMIN...');
                await updateUserRoleByUID(user.uid, 'ADMIN');
                console.log('✅ [AUTO-SETUP] yan@test.com.br agora é ADMIN');
                forceUpdateUserInfo();
            } else {
                console.log('✅ [AUTO-SETUP] yan@test.com.br já é ADMIN');
            }
        } catch (error) {
            console.error('❌ [AUTO-SETUP] Erro ao verificar/promover usuário:', error);
        }
    }
}, 3000);
