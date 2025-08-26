// ============= SISTEMA DE PERMISSÕES =============
console.log('🔐 [PERMISSIONS] Inicializando sistema de permissões...');

// ============= NÍVEIS DE ACESSO =============
const USER_ROLES = {
    USER: 'USER',           // Usuário comum - apenas visualização
    SUPERVISOR: 'SUPERVISOR', // Supervisor - CRUD exceto delete
    MANAGER: 'MANAGER',     // Gerente - igual supervisor 
    ADMIN: 'ADMIN'          // Admin - acesso total
};

// ============= PERMISSÕES POR PAPEL =============
const PERMISSIONS = {
    [USER_ROLES.USER]: {
        canView: ['inicio', 'infraestrutura'], // Apenas Dashboard e Início
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canUpload: false,
        canExport: false,
        canCleanData: false,
        canAccessModules: ['inicio', 'infraestrutura']
    },
    [USER_ROLES.SUPERVISOR]: {
        canView: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
        canCreate: true,
        canEdit: true,
        canDelete: false, // Não pode deletar
        canUpload: true,
        canExport: true,
        canCleanData: false, // Não pode limpar dados
        canAccessModules: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos']
    },
    [USER_ROLES.MANAGER]: {
        canView: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
        canCreate: true,
        canEdit: true,
        canDelete: false, // Não pode deletar
        canUpload: true,
        canExport: true,
        canCleanData: false, // Não pode limpar dados
        canAccessModules: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos']
    },
    [USER_ROLES.ADMIN]: {
        canView: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canUpload: true,
        canExport: true,
        canCleanData: true, // Apenas admin pode limpar dados
        canAccessModules: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos']
    }
};

// ============= ESTADO GLOBAL =============
let currentUser = null;
let currentUserRole = USER_ROLES.USER; // Default

// ============= FUNÇÕES DE VERIFICAÇÃO =============
function getCurrentUserRole() {
    return currentUserRole;
}

function setCurrentUser(user) {
    currentUser = user;
    currentUserRole = user?.role || USER_ROLES.USER;
    console.log(`🔐 [PERMISSIONS] Usuário definido:`, currentUserRole);
    
    // Aplicar permissões imediatamente
    applyPermissions();
}

function canUserPerform(action) {
    const permissions = PERMISSIONS[currentUserRole];
    return permissions ? permissions[action] : false;
}

function canUserAccessModule(module) {
    const permissions = PERMISSIONS[currentUserRole];
    return permissions ? permissions.canAccessModules.includes(module) : false;
}

// ============= APLICAÇÃO DE PERMISSÕES =============
function applyPermissions() {
    console.log('🔐 [PERMISSIONS] Aplicando permissões para:', currentUserRole);
    
    // Ocultar módulos baseado no papel
    hideModulesBasedOnRole();
    
    // Ocultar botões baseado no papel
    hideButtonsBasedOnRole();
    
    // Mostrar controles de admin se necessário
    showAdminControlsIfNeeded();
}

function hideModulesBasedOnRole() {
    const allModules = ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'];
    const permissions = PERMISSIONS[currentUserRole];
    
    if (!permissions) return;
    
    allModules.forEach(module => {
        const menuItem = document.querySelector(`a[onclick*="showSection('${module}'"]`);
        if (menuItem) {
            const listItem = menuItem.closest('li');
            if (listItem) {
                if (permissions.canAccessModules.includes(module)) {
                    listItem.style.display = 'block';
                } else {
                    listItem.style.display = 'none';
                }
            }
        }
    });
}

function hideButtonsBasedOnRole() {
    const permissions = PERMISSIONS[currentUserRole];
    if (!permissions) return;
    
    // Botões de upload
    const uploadButtons = document.querySelectorAll('.btn-upload-excel, .btn-upload, [onclick*="upload"]');
    uploadButtons.forEach(btn => {
        btn.style.display = permissions.canUpload ? 'block' : 'none';
    });
    
    // Botões de criação
    const createButtons = document.querySelectorAll('.btn-primary[onclick*="Novo"], .btn-primary[onclick*="criar"]');
    createButtons.forEach(btn => {
        btn.style.display = permissions.canCreate ? 'block' : 'none';
    });
    
    // Botões de edição
    const editButtons = document.querySelectorAll('.btn-edit, [onclick*="editar"]');
    editButtons.forEach(btn => {
        btn.style.display = permissions.canEdit ? 'inline-block' : 'none';
    });
    
    // Botões de exclusão
    const deleteButtons = document.querySelectorAll('.btn-delete, [onclick*="excluir"]');
    deleteButtons.forEach(btn => {
        btn.style.display = permissions.canDelete ? 'inline-block' : 'none';
    });
}

function showAdminControlsIfNeeded() {
    const adminControls = document.getElementById('adminControls');
    if (adminControls) {
        adminControls.style.display = canUserPerform('canCleanData') ? 'block' : 'none';
    }
}

// ============= INTEGRAÇÃO COM FIREBASE AUTH =============
function initializePermissionsSystem() {
    console.log('🔐 [PERMISSIONS] Inicializando integração com Firebase Auth...');
    
    // Aguardar Firebase Auth carregar
    function waitForAuth() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            setTimeout(waitForAuth, 500);
            return;
        }
        
        // Observar mudanças de autenticação
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Buscar dados do usuário no Firestore
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        setCurrentUser({
                            uid: user.uid,
                            email: user.email,
                            role: userData.role || USER_ROLES.USER,
                            displayName: userData.displayName || user.displayName
                        });
                    } else {
                        // Usuário sem dados no Firestore - usar como USER
                        setCurrentUser({
                            uid: user.uid,
                            email: user.email,
                            role: USER_ROLES.USER,
                            displayName: user.displayName
                        });
                    }
                } catch (error) {
                    console.error('❌ [PERMISSIONS] Erro ao buscar dados do usuário:', error);
                    setCurrentUser({
                        uid: user.uid,
                        email: user.email,
                        role: USER_ROLES.USER,
                        displayName: user.displayName
                    });
                }
            } else {
                setCurrentUser(null);
                currentUserRole = USER_ROLES.USER;
            }
        });
    }
    
    waitForAuth();
}

// ============= EXPORTAÇÃO =============
window.USER_ROLES = USER_ROLES;
window.PERMISSIONS = PERMISSIONS;
window.getCurrentUserRole = getCurrentUserRole;
window.setCurrentUser = setCurrentUser;
window.canUserPerform = canUserPerform;
window.canUserAccessModule = canUserAccessModule;
window.applyPermissions = applyPermissions;
window.initializePermissionsSystem = initializePermissionsSystem;

// ============= INICIALIZAÇÃO AUTOMÁTICA =============
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar outros sistemas carregarem
    setTimeout(initializePermissionsSystem, 1000);
});

console.log('✅ [PERMISSIONS] Sistema de permissões carregado');