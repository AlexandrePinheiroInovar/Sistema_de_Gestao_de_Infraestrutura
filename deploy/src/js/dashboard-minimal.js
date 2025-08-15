// ============= DASHBOARD MINIMAL - APENAS FUNÇÕES ESSENCIAIS =============
console.log('📊 [DASHBOARD-MINIMAL] Inicializando funções mínimas...');

// ============= SISTEMA DE PERMISSÕES POR ROLE =============
const USER_ROLES = {
    USER: 'USER',           // Usuário comum - só Início e Dashboard
    SUPERVISOR: 'SUPERVISOR', // Supervisor - Início, Dashboard, Cadastro de Endereços
    GESTOR: 'GESTOR',       // Gestor - tudo exceto algumas funções admin
    ADMIN: 'ADMIN'          // Admin - acesso total
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
        if (!link) return;
        
        const onclick = link.getAttribute('onclick');
        if (!onclick) return;
        
        // Extrair nome da seção do onclick
        const sectionMatch = onclick.match(/showSection\('([^']+)'/);
        if (!sectionMatch) return;
        
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
window.setUserRoleForTesting = function(role) {
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
window.listAllUsers = async function() {
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
window.updateUserRoleByUID = async function(uid, newRole) {
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
window.updateUserRoleByEmail = async function(userEmail, newRole) {
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
window.getUserData = async function(uid) {
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
window.createFirstAdmin = async function(email) {
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

// Função para popular filtros da infraestrutura - versão minimalista
window.populateInfraFilters = function() {
    console.log('📋 [FILTERS] Populando filtros da infraestrutura...');
    
    // Implementação mínima para evitar erros nos dropdowns
    const filters = [
        'infraFilterProjeto',
        'infraFilterSubProjeto', 
        'infraFilterEquipe',
        'infraFilterStatus',
        'infraFilterCidade',
        'infraFilterSupervisor',
        'infraFilterTipoAcao'
    ];
    
    filters.forEach(filterId => {
        const select = document.getElementById(filterId);
        if (select) {
            // Limpar opções existentes
            select.innerHTML = '<option value="">Todos</option>';
            console.log(`✅ [FILTERS] ${filterId} inicializado`);
        }
    });
    
    return Promise.resolve();
};

// Função para aplicar filtros da infraestrutura - versão minimalista  
window.applyInfraFilters = function() {
    console.log('🔍 [FILTERS] Aplicando filtros...');
    // Implementação mínima - apenas log
};

// Função para limpar filtros da infraestrutura
window.clearInfraFilters = function() {
    console.log('🧹 [FILTERS] Limpando filtros...');
    
    const filters = [
        'infraFilterProjeto',
        'infraFilterSubProjeto', 
        'infraFilterEquipe',
        'infraFilterStatus',
        'infraFilterCidade',
        'infraFilterSupervisor',
        'infraFilterTipoAcao'
    ];
    
    filters.forEach(filterId => {
        const select = document.getElementById(filterId);
        if (select) {
            select.selectedIndex = 0;
        }
    });
};

// Função para alternar seções
window.showSection = function(sectionId, event) {
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
    
    // Atualizar título
    const titleElement = document.getElementById('section-title');
    if (titleElement) {
        const titles = {
            'inicio': 'Início',
            'infraestrutura': 'Dashboard - Infraestrutura', 
            'enderecos': 'Cadastro de Endereços',
            'gestao-projetos': 'Gestão de Projetos'
        };
        titleElement.textContent = titles[sectionId] || 'Dashboard';
    }
};

// ============= DROPDOWN DO USUÁRIO =============

// Função para alternar dropdown do usuário
window.toggleNewDropdown = function() {
    console.log('👤 [DROPDOWN] Alternando dropdown do usuário...');
    const dropdownContainer = document.getElementById('newUserDropdown');
    const dropdown = document.getElementById('dropdownMenu');
    const arrow = document.getElementById('dropdownArrow');
    
    if (dropdownContainer && dropdown) {
        // Usar a classe 'active' conforme o CSS
        const isActive = dropdownContainer.classList.contains('active');
        
        if (isActive) {
            dropdownContainer.classList.remove('active');
            dropdown.style.display = 'none';
            dropdown.style.visibility = 'hidden';
            dropdown.style.opacity = '0';
        } else {
            dropdownContainer.classList.add('active');
            dropdown.style.display = 'block';
            dropdown.style.visibility = 'visible';
            dropdown.style.opacity = '1';
        }
        
        if (arrow) {
            arrow.style.transform = isActive ? '' : 'rotate(180deg)';
        }
        
        console.log('👤 [DROPDOWN] Estado alterado:', isActive ? 'fechado' : 'aberto');
    } else {
        console.error('❌ [DROPDOWN] Elementos do dropdown não encontrados');
        console.log('Elementos encontrados:', {
            dropdownContainer: !!dropdownContainer,
            dropdown: !!dropdown
        });
    }
};

// Função para abrir perfil do usuário
window.openUserProfile = function() {
    console.log('👤 [PROFILE] Abrindo perfil do usuário...');
    const profileScreen = document.getElementById('userProfileScreen');
    if (profileScreen) {
        profileScreen.style.display = 'block';
    }
    
    // Fechar dropdown
    const dropdown = document.getElementById('dropdownMenu');
    if (dropdown) {
        dropdown.style.display = 'none';
    }
};

// Função para fechar tela de perfil
window.closeUserProfileScreen = function() {
    console.log('👤 [PROFILE] Fechando perfil do usuário...');
    const profileScreen = document.getElementById('userProfileScreen');
    if (profileScreen) {
        profileScreen.style.display = 'none';
    }
};

// Função para alternar modo daltônico
window.toggleColorblindMode = function() {
    console.log('🎨 [ACCESSIBILITY] Alternando modo daltônico...');
    const body = document.body;
    const toggleText = document.getElementById('colorblindToggleText');
    
    if (body.classList.contains('colorblind-mode')) {
        body.classList.remove('colorblind-mode');
        if (toggleText) toggleText.textContent = 'Modo Daltônico';
        localStorage.setItem('colorblindMode', 'false');
    } else {
        body.classList.add('colorblind-mode');
        if (toggleText) toggleText.textContent = 'Modo Normal';
        localStorage.setItem('colorblindMode', 'true');
    }
};

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

// Funções placeholder para evitar erros
window.abrirNovoEndereco = function() {
    console.log('📝 [MODAL] Novo endereço (função placeholder)');
};

window.openUploadModal = function() {
    console.log('📁 [MODAL] Upload modal (função placeholder)');
};

window.filterTable = function() {
    console.log('🔍 [TABLE] Filtrar tabela (função placeholder)');
};

// ============= FUNÇÕES DO PERFIL DE USUÁRIO =============

// Função para alternar visibilidade da senha
window.togglePasswordVisibility = function(fieldId) {
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
window.changePassword = async function() {
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
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ [DASHBOARD-MINIMAL] Funções mínimas carregadas');
    
    // Popular filtros automaticamente
    if (typeof window.populateInfraFilters === 'function') {
        window.populateInfraFilters();
    }
    
    // Mostrar seção inicial
    window.showSection('inicio');
    
    // Tentar atualizar informações do usuário após um delay
    setTimeout(() => {
        console.log('🔄 [INIT] Tentando atualizar informações do usuário...');
        updateUserInfo();
    }, 2000);
});

// Inicializar permissões quando Firebase estiver pronto
document.addEventListener('firebaseIsolatedReady', async function() {
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
window.addEventListener('authStateChanged', async function() {
    console.log('🔒 [PERMISSIONS] Estado de auth mudou, atualizando sistema...');
    
    setTimeout(async () => {
        updateUserInfo();
        const role = await getUserRole();
        applyRolePermissions(role);
    }, 500);
});

// Fechar dropdown quando clicar fora
document.addEventListener('click', function(event) {
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
            if (arrow) arrow.style.transform = '';
        }
    }
});

// ============= FUNÇÕES DE CONVENIÊNCIA PARA GESTÃO =============

// Função para mostrar todas as funções de administração disponíveis
window.showAdminCommands = function() {
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
window.getMyUID = function() {
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
window.getMyRole = function() {
    console.log(`🔒 Seu role atual: ${currentUserRole}`);
    const permissions = ROLE_PERMISSIONS[currentUserRole];
    console.log('✅ Seções acessíveis:', permissions.sections);
    console.log('⚡ Ações permitidas:', permissions.actions);
    return currentUserRole;
};

// Função para forçar atualização das informações do usuário
window.forceUpdateUserInfo = function() {
    console.log('🔄 [FORCE-UPDATE] Forçando atualização das informações do usuário...');
    updateUserInfo();
    getUserRole().then(role => {
        applyRolePermissions(role);
        console.log('✅ [FORCE-UPDATE] Informações atualizadas com sucesso');
    });
};

console.log('✅ [DASHBOARD-MINIMAL] Sistema mínimo carregado');
console.log('💡 [ADMIN] Digite showAdminCommands() no console para ver comandos de gestão');
console.log('🔄 [DEBUG] Para atualizar dados do usuário: forceUpdateUserInfo()');

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