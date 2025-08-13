// ===== NOVO SISTEMA DE DROPDOWN DO USUÁRIO - FEITO DO ZERO =====
console.log('🎯 Carregando novo sistema de dropdown...');

// Variáveis globais
let dropdownOpen = false;

// Função principal para toggle do dropdown
function toggleNewDropdown() {
    console.log('🖱️ Toggle dropdown - Estado atual:', dropdownOpen);
    
    const dropdown = document.getElementById('newUserDropdown');
    const arrow = document.getElementById('dropdownArrow');
    
    if (!dropdown) {
        console.error('❌ Elemento dropdown não encontrado');
        return;
    }
    
    if (dropdownOpen) {
        // Fechar dropdown
        dropdown.classList.remove('active');
        dropdownOpen = false;
        console.log('📂 Dropdown fechado');
    } else {
        // Abrir dropdown
        dropdown.classList.add('active');
        dropdownOpen = true;
        console.log('📂 Dropdown aberto');
    }
}

// Função para abrir perfil do usuário - NOVA TELA COMPLETA
function openUserProfile() {
    console.log('👤 Abrindo tela completa de perfil...');
    toggleNewDropdown(); // Fechar dropdown
    
    // Mostrar a tela de perfil
    const profileScreen = document.getElementById('userProfileScreen');
    if (profileScreen) {
        profileScreen.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll da página principal
        
        // Não precisa carregar dados extras, apenas focar na senha
    }
}

// Função para abrir configurações
function openSettings() {
    console.log('⚙️ Abrindo configurações...');
    toggleNewDropdown(); // Fechar dropdown
    
    alert('⚙️ Configurações em desenvolvimento');
}

// Função para confirmar logout
function confirmLogout() {
    console.log('🚪 Solicitando logout...');
    toggleNewDropdown(); // Fechar dropdown
    
    // Usar o sistema de notificações personalizado
    if (typeof showConfirm === 'function') {
        showConfirm(
            '🚪 Confirmar Logout',
            'Tem certeza que deseja sair do sistema? Seus dados serão preservados.',
            function() {
                // Confirmação - fazer logout
                console.log('👋 Logout confirmado');
                
                // Preservar dados importantes do usuário
                const gestaoData = localStorage.getItem('gestaoData');
                const enderecosData = localStorage.getItem('enderecosData');
                const dynamicTableData = localStorage.getItem('dynamicTableData');
                const colorblindMode = localStorage.getItem('colorblindMode');
                const userPassword = localStorage.getItem('userPassword');
                
                // Limpar dados de sessão (mas preservar dados do usuário)
                localStorage.clear();
                sessionStorage.clear();
                
                // Restaurar dados importantes
                if (gestaoData) {
                    localStorage.setItem('gestaoData', gestaoData);
                    console.log('💾 Dados de gestão preservados');
                }
                if (enderecosData) {
                    localStorage.setItem('enderecosData', enderecosData);
                    console.log('💾 Dados de endereços preservados');
                }
                if (dynamicTableData) {
                    localStorage.setItem('dynamicTableData', dynamicTableData);
                    console.log('💾 Dados dinâmicos preservados');
                }
                if (colorblindMode) {
                    localStorage.setItem('colorblindMode', colorblindMode);
                    console.log('💾 Configuração de acessibilidade preservada');
                }
                if (userPassword) {
                    localStorage.setItem('userPassword', userPassword);
                    console.log('💾 Senha do usuário preservada');
                }
                
                // Mostrar mensagem de sucesso antes de redirecionar
                if (typeof showSuccess === 'function') {
                    showSuccess('👋 Logout Realizado', 'Você saiu do sistema com sucesso. Seus dados foram preservados.');
                }
                
                // Redirecionar após um pequeno delay para mostrar a mensagem
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            },
            function() {
                // Cancelamento
                console.log('❌ Logout cancelado');
            }
        );
    } else {
        // Fallback para o confirm padrão se a função personalizada não estiver disponível
        if (confirm('🚪 Tem certeza que deseja sair do sistema?')) {
            console.log('👋 Logout confirmado');
            
            // Preservar dados importantes do usuário
            const gestaoData = localStorage.getItem('gestaoData');
            const enderecosData = localStorage.getItem('enderecosData');
            const dynamicTableData = localStorage.getItem('dynamicTableData');
            const colorblindMode = localStorage.getItem('colorblindMode');
            const userPassword = localStorage.getItem('userPassword');
            
            // Limpar dados de sessão (mas preservar dados do usuário)
            localStorage.clear();
            sessionStorage.clear();
            
            // Restaurar dados importantes
            if (gestaoData) {
                localStorage.setItem('gestaoData', gestaoData);
                console.log('💾 Dados de gestão preservados');
            }
            if (enderecosData) {
                localStorage.setItem('enderecosData', enderecosData);
                console.log('💾 Dados de endereços preservados');
            }
            if (dynamicTableData) {
                localStorage.setItem('dynamicTableData', dynamicTableData);
                console.log('💾 Dados dinâmicos preservados');
            }
            if (colorblindMode) {
                localStorage.setItem('colorblindMode', colorblindMode);
                console.log('💾 Configuração de acessibilidade preservada');
            }
            if (userPassword) {
                localStorage.setItem('userPassword', userPassword);
                console.log('💾 Senha do usuário preservada');
            }
            
            // Redirecionar
            window.location.href = 'index.html';
        } else {
            console.log('❌ Logout cancelado');
        }
    }
}

// Fechar dropdown ao clicar fora
function handleClickOutside(event) {
    const dropdown = document.getElementById('newUserDropdown');
    
    if (dropdown && dropdownOpen && !dropdown.contains(event.target)) {
        toggleNewDropdown();
    }
}

// Inicializar quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM carregado - Inicializando dropdown...');
    
    // Adicionar event listener para clique fora
    document.addEventListener('click', handleClickOutside);
    
    // Tornar funções globais
    window.toggleNewDropdown = toggleNewDropdown;
    window.openUserProfile = openUserProfile;
    window.confirmLogout = confirmLogout;
    
    // Carregar configurações de acessibilidade
    loadColorblindSettings();
    
    console.log('✅ Novo sistema de dropdown inicializado!');
});

// ===== FUNÇÕES DA NOVA TELA DE PERFIL =====

// Fechar tela de perfil
function closeUserProfileScreen() {
    console.log('🔙 Fechando tela de perfil...');
    const profileScreen = document.getElementById('userProfileScreen');
    if (profileScreen) {
        profileScreen.style.display = 'none';
        document.body.style.overflow = 'auto'; // Restaurar scroll
    }
}

// ===== FUNÇÕES PARA TROCA DE SENHA =====

// Alterar senha
function changePassword() {
    console.log('🔐 Alterando senha...');
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('❌ Todos os campos de senha são obrigatórios!');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('❌ Nova senha deve ter pelo menos 6 caracteres!');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('❌ Nova senha e confirmação não coincidem!');
        return;
    }
    
    // Simular verificação de senha atual
    const savedPassword = localStorage.getItem('userPassword') || 'admin123';
    if (currentPassword !== savedPassword) {
        alert('❌ Senha atual incorreta!');
        return;
    }
    
    // Salvar nova senha
    localStorage.setItem('userPassword', newPassword);
    
    // Limpar campos
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    console.log('✅ Senha alterada!');
    showSuccessMessage('Senha alterada com sucesso!');
}

// Toggle de visibilidade da senha
function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        field.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ===== FUNCIONALIDADE DE ACESSIBILIDADE PARA DALTÔNICOS =====

// Toggle do modo daltônico
function toggleColorblindMode() {
    console.log('🎨 Alternando modo daltônico...');
    toggleNewDropdown(); // Fechar dropdown
    
    const body = document.body;
    const isColorblindMode = body.classList.contains('colorblind-mode');
    const toggleText = document.getElementById('colorblindToggleText');
    
    if (isColorblindMode) {
        // Desativar modo daltônico
        body.classList.remove('colorblind-mode');
        localStorage.setItem('colorblindMode', 'false');
        
        if (toggleText) {
            toggleText.textContent = 'Modo Daltônico';
        }
        
        showSuccessMessage('Modo normal ativado');
        console.log('👁️ Modo normal ativado');
    } else {
        // Ativar modo daltônico
        body.classList.add('colorblind-mode');
        localStorage.setItem('colorblindMode', 'true');
        
        if (toggleText) {
            toggleText.textContent = 'Modo Normal';
        }
        
        showSuccessMessage('Modo daltônico ativado');
        console.log('🎨 Modo daltônico ativado');
    }
}

// Carregar configuração de acessibilidade ao inicializar
function loadColorblindSettings() {
    const isColorblindMode = localStorage.getItem('colorblindMode') === 'true';
    const toggleText = document.getElementById('colorblindToggleText');
    
    if (isColorblindMode) {
        document.body.classList.add('colorblind-mode');
        if (toggleText) {
            toggleText.textContent = 'Modo Normal';
        }
        console.log('🎨 Modo daltônico carregado do localStorage');
    }
}

// Mostrar mensagem de sucesso
function showSuccessMessage(message) {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10001;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Função removida - não necessária na versão simplificada de troca de senha

// Exportar funções para uso global
window.toggleNewDropdown = toggleNewDropdown;
window.openUserProfile = openUserProfile;
window.openSettings = openSettings;
window.confirmLogout = confirmLogout;
window.closeUserProfileScreen = closeUserProfileScreen;
window.changePassword = changePassword;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleColorblindMode = toggleColorblindMode;