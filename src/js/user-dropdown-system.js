// ============= SISTEMA DE DROPDOWN DO USUÁRIO - NOVO =============
console.log('👤 [USER-DROPDOWN] Inicializando sistema de dropdown do usuário...');

class UserDropdownSystem {
    constructor() {
        this.container = null;
        this.trigger = null;
        this.menu = null;
        this.isOpen = false;
        this.currentUser = null;
        this.colorblindMode = false;
        
        this.init();
    }
    
    init() {
        console.log('🔧 [USER-DROPDOWN] Inicializando componentes...');
        
        // Aguardar o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupElements());
        } else {
            this.setupElements();
        }
        
        // Inicializar modo daltônico do localStorage
        this.initColorblindMode();
    }
    
    setupElements() {
        console.log('🔧 [USER-DROPDOWN] Configurando elementos do DOM...');
        
        this.container = document.getElementById('userDropdownContainer');
        this.trigger = document.getElementById('userDropdownTrigger');
        this.menu = document.getElementById('userDropdownMenu');
        
        if (!this.container || !this.trigger || !this.menu) {
            console.error('❌ [USER-DROPDOWN] Elementos não encontrados no DOM');
            return;
        }
        
        this.setupEventListeners();
        this.loadUserData();
        
        console.log('✅ [USER-DROPDOWN] Sistema configurado com sucesso');
    }
    
    setupEventListeners() {
        console.log('👂 [USER-DROPDOWN] Configurando event listeners...');
        
        // Clique no trigger para abrir/fechar
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });
        
        // Clique fora para fechar
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
        
        // Escape para fechar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
        
        // Event listeners dos botões
        const profileBtn = document.getElementById('profileOption');
        const colorblindBtn = document.getElementById('colorblindOption');
        const logoutBtn = document.getElementById('logoutOption');
        
        if (profileBtn) {
            profileBtn.addEventListener('click', () => this.openProfile());
        }
        
        if (colorblindBtn) {
            colorblindBtn.addEventListener('click', () => this.toggleColorblind());
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.confirmLogout());
        }
    }
    
    async loadUserData() {
        console.log('👤 [USER-DROPDOWN] Carregando dados do usuário...');
        
        try {
            // Aguardar o Firebase estar disponível
            let attempts = 0;
            while (!window.getCurrentUser && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof window.getCurrentUser === 'function') {
                this.currentUser = window.getCurrentUser();
                
                if (this.currentUser) {
                    await this.updateUserDisplay();
                } else {
                    console.log('⚠️ [USER-DROPDOWN] Usuário não autenticado');
                    this.setDefaultUserDisplay();
                }
            } else {
                console.log('⚠️ [USER-DROPDOWN] Firebase não disponível, usando dados padrão');
                this.setDefaultUserDisplay();
            }
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro ao carregar dados do usuário:', error);
            this.setDefaultUserDisplay();
        }
    }
    
    async updateUserDisplay() {
        console.log('🔄 [USER-DROPDOWN] Atualizando display do usuário...');
        
        try {
            const displayName = this.currentUser.displayName || 'Usuário';
            const email = this.currentUser.email || 'user@email.com';
            
            // Gerar avatar baseado no nome
            const avatarName = displayName.split(' ').map(n => n[0]).join('');
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=667eea&color=fff&size=`;
            
            // Atualizar elementos principais
            document.getElementById('userDisplayName').textContent = displayName;
            document.getElementById('userAvatar').src = avatarUrl + '40';
            
            // Atualizar elementos do dropdown
            document.getElementById('dropdownUserName').textContent = displayName;
            document.getElementById('dropdownUserEmail').textContent = email;
            document.getElementById('dropdownUserAvatar').src = avatarUrl + '50';
            
            // Buscar role do usuário
            await this.updateUserRole();
            
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro ao atualizar display:', error);
        }
    }
    
    async updateUserRole() {
        try {
            if (window.firestore && this.currentUser) {
                const userDoc = await window.firestore.collection('users').doc(this.currentUser.uid).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const role = userData.role || 'USER';
                    
                    document.getElementById('userDisplayRole').textContent = role;
                    console.log(`✅ [USER-DROPDOWN] Role atualizado: ${role}`);
                } else {
                    document.getElementById('userDisplayRole').textContent = 'USER';
                    console.log('⚠️ [USER-DROPDOWN] Documento do usuário não encontrado, usando USER');
                }
            }
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro ao buscar role:', error);
            document.getElementById('userDisplayRole').textContent = 'USER';
        }
    }
    
    setDefaultUserDisplay() {
        console.log('🔧 [USER-DROPDOWN] Configurando display padrão...');
        
        document.getElementById('userDisplayName').textContent = 'Usuário';
        document.getElementById('userDisplayRole').textContent = 'USER';
        document.getElementById('dropdownUserName').textContent = 'Usuário';
        document.getElementById('dropdownUserEmail').textContent = 'user@email.com';
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        console.log('📖 [USER-DROPDOWN] Abrindo dropdown...');
        this.isOpen = true;
        this.container.classList.add('open');
        
        // Focar no primeiro item para acessibilidade
        setTimeout(() => {
            const firstOption = this.menu.querySelector('.dropdown-option');
            if (firstOption) {
                firstOption.focus();
            }
        }, 100);
    }
    
    close() {
        console.log('📕 [USER-DROPDOWN] Fechando dropdown...');
        this.isOpen = false;
        this.container.classList.remove('open');
    }
    
    openProfile() {
        console.log('👤 [USER-DROPDOWN] Abrindo perfil do usuário...');
        this.close();
        
        // Procurar pela tela de perfil existente
        const profileScreen = document.getElementById('userProfileScreen');
        if (profileScreen) {
            profileScreen.style.display = 'block';
            console.log('✅ [USER-DROPDOWN] Tela de perfil aberta');
        } else {
            console.warn('⚠️ [USER-DROPDOWN] Tela de perfil não encontrada');
            // Fallback: mostrar alert
            alert('Funcionalidade de perfil em desenvolvimento');
        }
    }
    
    toggleColorblind() {
        console.log('🎨 [USER-DROPDOWN] Alternando modo daltônico...');
        this.colorblindMode = !this.colorblindMode;
        
        const body = document.body;
        const colorblindText = document.getElementById('colorblindText');
        
        if (this.colorblindMode) {
            body.classList.add('colorblind-mode');
            if (colorblindText) colorblindText.textContent = 'Modo Normal';
            localStorage.setItem('colorblindMode', 'true');
            console.log('✅ [USER-DROPDOWN] Modo daltônico ativado');
        } else {
            body.classList.remove('colorblind-mode');
            if (colorblindText) colorblindText.textContent = 'Modo Daltônico';
            localStorage.setItem('colorblindMode', 'false');
            console.log('✅ [USER-DROPDOWN] Modo normal ativado');
        }
        
        this.close();
    }
    
    initColorblindMode() {
        const savedMode = localStorage.getItem('colorblindMode') === 'true';
        if (savedMode) {
            console.log('🎨 [USER-DROPDOWN] Restaurando modo daltônico do localStorage');
            this.colorblindMode = true;
            document.body.classList.add('colorblind-mode');
            
            // Aguardar o DOM estar pronto para atualizar o texto
            const updateText = () => {
                const colorblindText = document.getElementById('colorblindText');
                if (colorblindText) {
                    colorblindText.textContent = 'Modo Normal';
                }
            };
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', updateText);
            } else {
                updateText();
            }
        }
    }
    
    async confirmLogout() {
        console.log('🚪 [USER-DROPDOWN] Solicitação de logout...');
        this.close();
        
        // Usar o sistema de notificação personalizado se disponível
        if (typeof window.showCustomNotification === 'function') {
            const confirmed = await window.showCustomNotification(
                'Confirmação',
                'Deseja realmente sair do sistema?',
                'question',
                true
            );
            
            if (confirmed) {
                this.performLogout();
            }
        } else {
            // Fallback para confirm nativo
            if (confirm('Deseja realmente sair do sistema?')) {
                this.performLogout();
            }
        }
    }
    
    async performLogout() {
        console.log('🔐 [USER-DROPDOWN] Executando logout...');
        
        try {
            if (typeof window.signOut === 'function') {
                const result = await window.signOut();
                
                if (result.success) {
                    console.log('✅ [USER-DROPDOWN] Logout realizado com sucesso');
                    window.location.href = 'index.html';
                } else {
                    console.error('❌ [USER-DROPDOWN] Erro no logout:', result.error);
                    // Mesmo com erro, redirecionar
                    window.location.href = 'index.html';
                }
            } else {
                console.warn('⚠️ [USER-DROPDOWN] Função signOut não disponível, redirecionando...');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro crítico no logout:', error);
            // Forçar redirecionamento mesmo com erro
            window.location.href = 'index.html';
        }
    }
}

// Inicializar o sistema
let userDropdownSystem;

// Aguardar o DOM e inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userDropdownSystem = new UserDropdownSystem();
    });
} else {
    userDropdownSystem = new UserDropdownSystem();
}

// Exportar para uso global
window.UserDropdownSystem = UserDropdownSystem;
window.userDropdownSystem = userDropdownSystem;

console.log('✅ [USER-DROPDOWN] Sistema de dropdown do usuário carregado');