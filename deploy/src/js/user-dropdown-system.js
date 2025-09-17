// ============= SISTEMA DE DROPDOWN DO USUÁRIO - VERSÃO COMPLETA =============
console.log('👤 [USER-DROPDOWN] Inicializando sistema completo...');

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

        // Inicializar display imediatamente
        this.initializeDisplay();

        // Aguardar e carregar dados do Firebase
        this.loadUserData();

        // Observar mudanças de autenticação
        this.observeAuthChanges();

        console.log('✅ [USER-DROPDOWN] Sistema configurado com sucesso');
    }

    setupEventListeners() {
        console.log('👂 [USER-DROPDOWN] Configurando event listeners...');

        // Clique no trigger para abrir/fechar
        this.trigger.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // Clique fora para fechar
        document.addEventListener('click', e => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });

        // Escape para fechar
        document.addEventListener('keydown', e => {
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

    initializeDisplay() {
        console.log('🎨 [USER-DROPDOWN] Inicializando display...');

        // Mostrar dados básicos imediatamente - SEMPRE carregando pois só usuários logados acessam
        const userDisplayNameEl = document.getElementById('userDisplayName');
        const userDisplayRoleEl = document.getElementById('userDisplayRole');
        const userAvatarEl = document.getElementById('userAvatar');
        const dropdownUserNameEl = document.getElementById('dropdownUserName');
        const dropdownUserEmailEl = document.getElementById('dropdownUserEmail');
        const dropdownUserAvatarEl = document.getElementById('dropdownUserAvatar');

        // Valores de carregamento - não mostrar visitante pois só usuários logados acessam
        const initialName = 'Carregando...';
        const initialRole = 'Carregando...';
        const initialEmail = 'carregando@sistema.com';
        const initialAvatar =
            'https://ui-avatars.com/api/?name=Carregando&background=64748b&color=fff&size=';

        if (userDisplayNameEl) {
            userDisplayNameEl.textContent = initialName;
        }
        if (userDisplayRoleEl) {
            userDisplayRoleEl.textContent = initialRole;
        }
        if (userAvatarEl) {
            userAvatarEl.src = initialAvatar + '40';
        }
        if (dropdownUserNameEl) {
            dropdownUserNameEl.textContent = initialName;
        }
        if (dropdownUserEmailEl) {
            dropdownUserEmailEl.textContent = initialEmail;
        }
        if (dropdownUserAvatarEl) {
            dropdownUserAvatarEl.src = initialAvatar + '50';
        }

        console.log('✅ [USER-DROPDOWN] Display inicializado');
    }

    observeAuthChanges() {
        console.log('👀 [USER-DROPDOWN] Configurando observador de autenticação...');

        // Tentar observar mudanças no Firebase Auth
        const setupAuthObserver = () => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(user => {
                    console.log(
                        '🔄 [USER-DROPDOWN] Mudança de autenticação detectada:',
                        user ? user.email : 'logout'
                    );
                    if (user) {
                        this.currentUser = user;
                        this.updateUserDisplay();
                    } else {
                        console.log('👋 [USER-DROPDOWN] Usuário fez logout');
                        this.showLoadingState();
                    }
                });
                console.log('✅ [USER-DROPDOWN] Observador de autenticação configurado');
            } else {
                // Tentar novamente em 1 segundo
                setTimeout(setupAuthObserver, 1000);
            }
        };

        setupAuthObserver();
    }

    async loadUserData() {
        console.log('👤 [USER-DROPDOWN] Carregando dados do usuário...');

        // Método mais passivo - apenas uma tentativa inicial
        try {
            // Tentar getCurrentUser se disponível
            if (typeof window.getCurrentUser === 'function') {
                this.currentUser = window.getCurrentUser();

                if (this.currentUser) {
                    console.log('👤 [USER-DROPDOWN] Usuário encontrado:', this.currentUser.email);
                    await this.updateUserDisplay();
                    return;
                }
            }

            // Tentar Firebase direto se disponível
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const user = firebase.auth().currentUser;
                if (user) {
                    console.log('👤 [USER-DROPDOWN] Usuário encontrado via Firebase:', user.email);
                    this.currentUser = user;
                    await this.updateUserDisplay();
                    return;
                }
            }

            console.log(
                '⏳ [USER-DROPDOWN] Dados do usuário não disponíveis no momento, observador cuidará das atualizações'
            );
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro ao carregar dados do usuário:', error);
        }
    }

    async updateUserDisplay() {
        console.log('🔄 [USER-DROPDOWN] Atualizando display do usuário...');

        try {
            // Primeiro buscar dados do Firestore
            let userData = null;
            let displayName = this.currentUser.displayName || 'Usuário';
            let email = this.currentUser.email || 'user@email.com';
            let role = 'USER';

            // Buscar dados completos do usuário no Firestore
            if (window.firestore && this.currentUser) {
                try {
                    console.log('🔍 [USER-DROPDOWN] Buscando dados do usuário no Firestore...');
                    const userDoc = await window.firestore
                        .collection('users')
                        .doc(this.currentUser.uid)
                        .get();

                    if (userDoc.exists) {
                        userData = userDoc.data();
                        console.log('✅ [USER-DROPDOWN] Dados encontrados:', userData);

                        // Usar dados do Firestore se disponíveis
                        displayName = userData.name || userData.displayName || displayName;
                        email = userData.email || email;
                        role = userData.role || 'USER';
                    } else {
                        console.log('⚠️ [USER-DROPDOWN] Documento do usuário não encontrado');
                    }

                    // Verificar se é supervisor autorizado (sistema de permissões)
                    if (window.SupervisorPermissions && window.SupervisorPermissions.isAuthorizedSupervisor) {
                        if (window.SupervisorPermissions.isAuthorizedSupervisor(this.currentUser.uid)) {
                            role = 'SUPERVISOR';
                            console.log('👨‍💼 [USER-DROPDOWN] Usuário identificado como SUPERVISOR via sistema de permissões');
                        }
                    }
                } catch (firestoreError) {
                    console.warn('⚠️ [USER-DROPDOWN] Erro ao acessar Firestore:', firestoreError);
                }
            }

            // Verificar sistema de supervisor mesmo sem Firestore
            if (window.SupervisorPermissions && window.SupervisorPermissions.isAuthorizedSupervisor) {
                if (window.SupervisorPermissions.isAuthorizedSupervisor(this.currentUser.uid)) {
                    role = 'SUPERVISOR';
                    console.log('👨‍💼 [USER-DROPDOWN] Usuário identificado como SUPERVISOR via sistema de permissões (fallback)');
                }
            }

            // Melhorar o nome para display
            if (displayName === 'Usuário' && email) {
                displayName = email
                    .split('@')[0]
                    .replace(/[._]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }

            // Gerar avatar baseado no nome
            const avatarName = displayName
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2);
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=64748b&color=fff&size=`;

            // Atualizar elementos principais
            const userDisplayNameEl = document.getElementById('userDisplayName');
            const userDisplayRoleEl = document.getElementById('userDisplayRole');
            const userAvatarEl = document.getElementById('userAvatar');

            if (userDisplayNameEl) {
                userDisplayNameEl.textContent = displayName;
            }
            if (userDisplayRoleEl) {
                userDisplayRoleEl.textContent = this.formatRole(role);

                // Disparar evento para sistema de permissões
                window.dispatchEvent(new CustomEvent('userDataUpdated', {
                    detail: { role, uid: this.currentUser?.uid }
                }));
            }
            if (userAvatarEl) {
                userAvatarEl.src = avatarUrl + '40';
            }

            // Atualizar elementos do dropdown
            const dropdownUserNameEl = document.getElementById('dropdownUserName');
            const dropdownUserEmailEl = document.getElementById('dropdownUserEmail');
            const dropdownUserAvatarEl = document.getElementById('dropdownUserAvatar');

            if (dropdownUserNameEl) {
                dropdownUserNameEl.textContent = displayName;
            }
            if (dropdownUserEmailEl) {
                dropdownUserEmailEl.textContent = email;
            }
            if (dropdownUserAvatarEl) {
                dropdownUserAvatarEl.src = avatarUrl + '50';
            }

            console.log(`✅ [USER-DROPDOWN] Display atualizado: ${displayName} (${role})`);
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro ao atualizar display:', error);
            // Em caso de erro, manter "Carregando..." pois só usuários autenticados acessam
            this.showNotification('Erro ao carregar dados do usuário', 'error');
        }
    }

    formatRole(role) {
        const roleMap = {
            ADMIN: 'Administrador',
            SUPERVISOR: 'Supervisor',
            USER: 'Usuário',
            MANAGER: 'Gerente',
            ANALYST: 'Analista',
            TECHNICIAN: 'Técnico'
        };

        return roleMap[role.toUpperCase()] || role;
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

        // Abrir modal de perfil
        this.showProfileModal();
    }

    showProfileModal() {
        // Criar modal dinamicamente
        const modalHtml = `
        <div id="profileModal" class="profile-modal-overlay">
            <div class="profile-modal">
                <div class="profile-modal-header">
                    <h3><i class="fas fa-user"></i> Perfil do Usuário</h3>
                    <button class="profile-close-btn" onclick="userDropdownSystem.closeProfile()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="profile-modal-content">
                    <div class="profile-section">
                        <h4><i class="fas fa-key"></i> Alterar Senha</h4>
                        <form id="changePasswordForm" class="profile-form">
                            <div class="profile-form-group">
                                <label for="profileCurrentPassword">Senha Atual</label>
                                <div class="profile-password-input">
                                    <input type="password" id="profileCurrentPassword" required>
                                    <button type="button" class="password-toggle" onclick="userDropdownSystem.togglePasswordVisibility('profileCurrentPassword')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="profile-form-group">
                                <label for="profileNewPassword">Nova Senha</label>
                                <div class="profile-password-input">
                                    <input type="password" id="profileNewPassword" required minlength="6">
                                    <button type="button" class="password-toggle" onclick="userDropdownSystem.togglePasswordVisibility('profileNewPassword')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <small class="password-requirements">Mínimo 6 caracteres</small>
                            </div>
                            <div class="profile-form-group">
                                <label for="profileConfirmPassword">Confirmar Nova Senha</label>
                                <div class="profile-password-input">
                                    <input type="password" id="profileConfirmPassword" required>
                                    <button type="button" class="password-toggle" onclick="userDropdownSystem.togglePasswordVisibility('profileConfirmPassword')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="profile-form-actions">
                                <button type="button" class="btn-secondary" onclick="userDropdownSystem.closeProfile()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-save"></i> Alterar Senha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
        .profile-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .profile-modal {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
        }
        
        .profile-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            background: linear-gradient(135deg, #334155 0%, #64748b 100%);
            color: white;
        }
        
        .profile-modal-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        
        .profile-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .profile-close-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }
        
        .profile-modal-content {
            padding: 24px;
        }
        
        .profile-section h4 {
            margin: 0 0 20px 0;
            color: #334155;
            font-size: 16px;
            font-weight: 600;
        }
        
        .profile-form-group {
            margin-bottom: 20px;
        }
        
        .profile-form-group label {
            display: block;
            margin-bottom: 6px;
            font-weight: 500;
            color: #374151;
        }
        
        .profile-password-input {
            position: relative;
        }
        
        .profile-password-input input {
            width: 100%;
            padding: 12px 45px 12px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.2s;
        }
        
        .profile-password-input input:focus {
            outline: none;
            border-color: #6366f1;
        }
        
        .password-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
        }
        
        .password-requirements {
            color: #6b7280;
            font-size: 12px;
            margin-top: 4px;
        }
        
        .profile-form-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 30px;
        }
        
        .btn-secondary, .btn-primary {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #374151;
        }
        
        .btn-secondary:hover {
            background: #e5e7eb;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: white;
        }
        
        .btn-primary:hover {
            background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%);
        }
        </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Configurar formulário
        const form = document.getElementById('changePasswordForm');
        form.addEventListener('submit', e => {
            e.preventDefault();
            this.changePassword();
        });
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            button.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            button.className = 'fas fa-eye';
        }
    }

    closeProfile() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            console.log('🔒 [PROFILE] Fechando modal de perfil');
            modal.remove();
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('profileCurrentPassword').value;
        const newPassword = document.getElementById('profileNewPassword').value;
        const confirmPassword = document.getElementById('profileConfirmPassword').value;

        // Debug para verificar captura dos campos
        console.log('🔍 [DEBUG] Campos capturados:');
        console.log('- Senha atual:', currentPassword ? '***preenchido***' : 'VAZIO');
        console.log('- Nova senha:', newPassword ? '***preenchido***' : 'VAZIO');
        console.log('- Confirmar senha:', confirmPassword ? '***preenchido***' : 'VAZIO');

        // Validações
        if (!currentPassword || !newPassword || !confirmPassword) {
            console.log('❌ [DEBUG] Validação falhou - campos vazios');
            this.showNotification('Todos os campos são obrigatórios', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('Nova senha e confirmação não coincidem', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showNotification('Nova senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }

        try {
            console.log('🔐 [PASSWORD] Iniciando alteração de senha...');

            if (!firebase || !firebase.auth) {
                throw new Error('Firebase não disponível');
            }

            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('Usuário não autenticado');
            }

            // Re-autenticar usuário com senha atual
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );

            this.showNotification('Verificando senha atual...', 'info');
            await user.reauthenticateWithCredential(credential);
            console.log('✅ [PASSWORD] Re-autenticação realizada');

            // Alterar senha
            this.showNotification('Alterando senha...', 'info');
            await user.updatePassword(newPassword);
            console.log('✅ [PASSWORD] Senha alterada com sucesso');

            // Fechar modal
            this.closeProfile();

            this.showNotification('Senha alterada com sucesso!', 'success');
        } catch (error) {
            console.error('❌ [PASSWORD] Erro ao alterar senha:', error);

            if (error.code === 'auth/wrong-password') {
                this.showNotification('Senha atual incorreta', 'error');
            } else if (error.code === 'auth/weak-password') {
                this.showNotification('Nova senha muito fraca', 'error');
            } else {
                this.showNotification('Erro ao alterar senha: ' + error.message, 'error');
            }
        }
    }

    toggleColorblind() {
        console.log('🎨 [USER-DROPDOWN] Alternando modo daltônico...');
        this.colorblindMode = !this.colorblindMode;

        const body = document.body;
        const colorblindText = document.getElementById('colorblindText');

        if (this.colorblindMode) {
            body.classList.add('colorblind-mode');
            if (colorblindText) {
                colorblindText.textContent = 'Modo Normal';
            }
            localStorage.setItem('colorblindMode', 'true');
            this.showNotification('Modo daltônico ativado', 'success');
        } else {
            body.classList.remove('colorblind-mode');
            if (colorblindText) {
                colorblindText.textContent = 'Modo Daltônico';
            }
            localStorage.setItem('colorblindMode', 'false');
            this.showNotification('Modo normal ativado', 'success');
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

        const confirmed = await this.showConfirmDialog(
            'Confirmação',
            'Deseja realmente sair do sistema?',
            'question'
        );

        if (confirmed) {
            this.performLogout();
        }
    }

    async performLogout() {
        console.log('🔐 [USER-DROPDOWN] Executando logout...');

        try {
            if (typeof window.signOut === 'function') {
                const result = await window.signOut();

                if (result.success) {
                    console.log('✅ [USER-DROPDOWN] Logout realizado com sucesso');
                    this.showNotification('Logout realizado com sucesso', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    console.error('❌ [USER-DROPDOWN] Erro no logout:', result.error);
                    window.location.href = 'index.html';
                }
            } else {
                console.warn('⚠️ [USER-DROPDOWN] Função signOut não disponível, redirecionando...');
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('❌ [USER-DROPDOWN] Erro crítico no logout:', error);
            window.location.href = 'index.html';
        }
    }

    showNotification(message, type = 'info') {
        // Usar sistema de notificação existente se disponível
        if (typeof window.showCustomNotification === 'function') {
            window.showCustomNotification('Notification', message, type);
        } else {
            // Fallback simples
            const colors = {
                success: '#10b981',
                error: '#ef4444',
                info: '#3b82f6',
                warning: '#f59e0b'
            };

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10001;
                font-size: 14px;
                max-width: 300px;
            `;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    async showConfirmDialog(title, message, type = 'question') {
        return new Promise(resolve => {
            const dialogHtml = `
            <div id="confirmDialog" class="confirm-dialog-overlay">
                <div class="confirm-dialog">
                    <div class="confirm-dialog-header">
                        <h4>${title}</h4>
                    </div>
                    <div class="confirm-dialog-content">
                        <p>${message}</p>
                    </div>
                    <div class="confirm-dialog-actions">
                        <button class="btn-secondary" onclick="document.getElementById('confirmDialog').remove(); window.confirmDialogResolve(false);">
                            Cancelar
                        </button>
                        <button class="btn-primary" onclick="document.getElementById('confirmDialog').remove(); window.confirmDialogResolve(true);">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
            .confirm-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .confirm-dialog {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                width: 90%;
                max-width: 400px;
            }
            
            .confirm-dialog-header {
                padding: 20px 24px 0;
            }
            
            .confirm-dialog-header h4 {
                margin: 0;
                color: #1f2937;
                font-size: 18px;
                font-weight: 600;
            }
            
            .confirm-dialog-content {
                padding: 16px 24px 20px;
            }
            
            .confirm-dialog-content p {
                margin: 0;
                color: #6b7280;
                line-height: 1.5;
            }
            
            .confirm-dialog-actions {
                display: flex;
                gap: 12px;
                padding: 0 24px 24px;
                justify-content: flex-end;
            }
            </style>
            `;

            document.body.insertAdjacentHTML('beforeend', dialogHtml);

            // Resolver promise globalmente
            window.confirmDialogResolve = resolve;
        });
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

console.log('✅ [USER-DROPDOWN] Sistema completo carregado');
