// ============= SISTEMA DE PERMISSÕES PARA SUPERVISORES =============
console.log('👥 [SUPERVISOR-PERMISSIONS] Inicializando sistema de permissões de supervisor...');

// ============= CONFIGURAÇÃO DE SUPERVISORES AUTORIZADOS =============
const AUTHORIZED_SUPERVISORS = {
    // UIDs autorizados como supervisores
    'uncffP1B7HcgPYtC9Z7goxvfkbm1': {
        role: 'SUPERVISOR',
        permissions: {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canUpload: true,
            canExport: true,
            canManageEnderecos: true,
            canManageProjects: true
        },
        grantedDate: new Date().toISOString(),
        grantedBy: 'SYSTEM_ADMIN'
    },
    'MihB6XV6vzOTh9PJOotFgzJynjc2': {
        role: 'SUPERVISOR',
        permissions: {
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canUpload: true,
            canExport: true,
            canManageEnderecos: true,
            canManageProjects: true
        },
        grantedDate: new Date().toISOString(),
        grantedBy: 'SYSTEM_ADMIN'
    }
};

// ============= FUNÇÕES PRINCIPAIS =============

/**
 * Verifica se o usuário é um supervisor autorizado
 * @param {string} uid - UID do Firebase Auth
 * @returns {boolean}
 */
function isAuthorizedSupervisor(uid) {
    return uid && AUTHORIZED_SUPERVISORS.hasOwnProperty(uid);
}

/**
 * Obtém as permissões do supervisor
 * @param {string} uid - UID do Firebase Auth
 * @returns {Object|null}
 */
function getSupervisorPermissions(uid) {
    if (!isAuthorizedSupervisor(uid)) {
        return null;
    }
    return AUTHORIZED_SUPERVISORS[uid];
}

/**
 * Aplica permissões de supervisor na interface
 * @param {string} uid - UID do usuário atual
 */
function applySupervisorPermissions(uid) {
    console.log('👥 [SUPERVISOR-PERMISSIONS] Verificando permissões para UID:', uid);

    if (!isAuthorizedSupervisor(uid)) {
        console.log('👥 [SUPERVISOR-PERMISSIONS] Usuário não é supervisor autorizado');
        return false;
    }

    const supervisorData = getSupervisorPermissions(uid);
    console.log('✅ [SUPERVISOR-PERMISSIONS] Aplicando permissões de supervisor:', supervisorData.role);

    // Mostrar elementos de supervisor
    showSupervisorElements();

    // Salvar role no localStorage para persistência
    localStorage.setItem('userRole', 'SUPERVISOR');
    localStorage.setItem('supervisorUID', uid);

    // Atualizar interface
    updateUserInterface(supervisorData);

    return true;
}

/**
 * Mostra elementos da interface para supervisores
 */
function showSupervisorElements() {
    // Elementos que devem estar visíveis para supervisores
    const supervisorElements = [
        '.btn-upload-excel',
        '.btn-novo-endereco',
        '.btn-edit',
        '.supervisor-only',
        '[data-role="supervisor"]'
    ];

    supervisorElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.style.display = '';
            element.removeAttribute('disabled');
        });
    });

    // Mostrar seções de gestão
    const managementSections = document.querySelectorAll('.management-section');
    managementSections.forEach(section => {
        section.style.display = 'block';
    });

    // Garantir que o menu de gestão de projetos esteja visível para supervisores
    const gestaoProjectsMenuItem = document.querySelector('a[onclick*="gestao-projetos"]')?.parentElement;
    if (gestaoProjectsMenuItem) {
        gestaoProjectsMenuItem.style.display = 'block';
    }

    // Forçar chamar setupUserPermissions para atualizar a interface
    setTimeout(() => {
        if (typeof setupUserPermissions === 'function') {
            setupUserPermissions();
        }
    }, 100);
}

/**
 * Atualiza a interface com informações do supervisor
 * @param {Object} supervisorData - Dados do supervisor
 */
function updateUserInterface(supervisorData) {
    // Adicionar badge de supervisor se existir elemento
    const userRoleBadge = document.getElementById('userRoleBadge');
    if (userRoleBadge) {
        userRoleBadge.textContent = 'SUPERVISOR';
        userRoleBadge.className = 'badge badge-warning';
        userRoleBadge.style.display = 'inline-block';
    }

    // Adicionar classe CSS para estilos específicos
    document.body.classList.add('supervisor-mode');

    // Mostrar notificação de permissões concedidas
    showSupervisorWelcome();
}

/**
 * Mostra mensagem de boas-vindas para supervisor
 */
function showSupervisorWelcome() {
    // Criar notificação se não existir
    if (!document.getElementById('supervisorWelcome')) {
        const notification = document.createElement('div');
        notification.id = 'supervisorWelcome';
        notification.className = 'alert alert-success supervisor-welcome';
        notification.innerHTML = `
            <i class="fas fa-user-shield"></i>
            <strong>Bem-vindo, Supervisor!</strong>
            Você tem permissões avançadas no sistema.
            <button type="button" class="close" onclick="this.parentElement.remove()">
                <span>&times;</span>
            </button>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;

        document.body.appendChild(notification);

        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

/**
 * Integração com Firebase Auth
 */
function initializeSupervisorSystem() {
    console.log('👥 [SUPERVISOR-PERMISSIONS] Inicializando integração com Firebase...');

    // Aguardar Firebase estar disponível
    function waitForFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            setTimeout(waitForFirebase, 500);
            return;
        }

        // Observar mudanças de autenticação
        firebase.auth().onAuthStateChanged((user) => {
            if (user && user.uid) {
                console.log('👥 [SUPERVISOR-PERMISSIONS] Verificando usuário:', user.uid);

                // Aplicar permissões se for supervisor
                const isSupervisor = applySupervisorPermissions(user.uid);

                if (isSupervisor) {
                    // Salvar dados do supervisor no Firestore (opcional)
                    saveSupervisorToFirestore(user.uid, user.email);
                }
            } else {
                // Remover permissões de supervisor
                removeSupervisorPermissions();
            }
        });
    }

    waitForFirebase();
}

/**
 * Salva dados do supervisor no Firestore
 * @param {string} uid - UID do supervisor
 * @param {string} email - Email do supervisor
 */
async function saveSupervisorToFirestore(uid, email) {
    try {
        const supervisorData = getSupervisorPermissions(uid);
        if (!supervisorData) return;

        const userDoc = {
            uid: uid,
            email: email,
            role: 'SUPERVISOR',
            permissions: supervisorData.permissions,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await firebase.firestore().collection('users').doc(uid).set(userDoc, { merge: true });
        console.log('✅ [SUPERVISOR-PERMISSIONS] Dados salvos no Firestore para UID:', uid);

    } catch (error) {
        console.error('❌ [SUPERVISOR-PERMISSIONS] Erro ao salvar no Firestore:', error);
    }
}

/**
 * Remove permissões de supervisor
 */
function removeSupervisorPermissions() {
    console.log('👥 [SUPERVISOR-PERMISSIONS] Removendo permissões de supervisor...');

    // Remover do localStorage
    localStorage.removeItem('userRole');
    localStorage.removeItem('supervisorUID');

    // Remover classe CSS
    document.body.classList.remove('supervisor-mode');

    // Ocultar elementos de supervisor
    const supervisorElements = document.querySelectorAll('.supervisor-only, [data-role="supervisor"]');
    supervisorElements.forEach(element => {
        element.style.display = 'none';
    });
}

// ============= EXPORTAÇÃO GLOBAL =============
window.SupervisorPermissions = {
    isAuthorizedSupervisor,
    getSupervisorPermissions,
    applySupervisorPermissions,
    initializeSupervisorSystem,
    AUTHORIZED_SUPERVISORS
};

// ============= AUTO-INICIALIZAÇÃO =============
document.addEventListener('DOMContentLoaded', function() {
    console.log('👥 [SUPERVISOR-PERMISSIONS] DOM carregado, inicializando sistema...');
    setTimeout(initializeSupervisorSystem, 1000);
});

// ============= INTEGRAÇÃO COM USER-DROPDOWN-SYSTEM =============
// Forçar re-verificação quando user-dropdown atualizar
window.addEventListener('userDataUpdated', function() {
    console.log('👥 [SUPERVISOR-PERMISSIONS] Dados do usuário atualizados, re-verificando permissões...');
    setTimeout(() => {
        if (typeof setupUserPermissions === 'function') {
            setupUserPermissions();
        }
    }, 500);
});

console.log('✅ [SUPERVISOR-PERMISSIONS] Sistema de permissões carregado com', Object.keys(AUTHORIZED_SUPERVISORS).length, 'supervisores autorizados');