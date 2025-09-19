/* ============= GERENCIADOR DINÂMICO DE Z-INDEX PARA DROPDOWNS ============= */
/* Sistema que garante que dropdowns sempre fiquem por cima de outros elementos */

class DropdownZIndexManager {
    constructor() {
        this.activeDropdowns = new Set();
        this.baseZIndex = 99999;
        this.currentZIndex = this.baseZIndex;
        this.init();
    }

    init() {
        console.log('🎯 [Z-INDEX-MANAGER] Iniciando sistema de gerenciamento de dropdowns');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Monitorar todos os selects múltiplos
        this.monitorMultipleSelects();
        
        // Monitorar checkbox dropdowns
        this.monitorCheckboxDropdowns();
        
        // Monitorar cliques globais para fechar dropdowns
        this.setupGlobalClickHandler();
        
        // Monitorar resize da janela
        this.setupResizeHandler();
        
        console.log('✅ [Z-INDEX-MANAGER] Event listeners configurados');
    }

    monitorMultipleSelects() {
        const multipleSelects = document.querySelectorAll('select[multiple]');
        
        multipleSelects.forEach(select => {
            // Focus event
            select.addEventListener('focus', (e) => {
                this.handleDropdownOpen(e.target, 'select-multiple');
            });

            // Blur event
            select.addEventListener('blur', (e) => {
                // Pequeno delay para permitir cliques em opções
                setTimeout(() => {
                    this.handleDropdownClose(e.target, 'select-multiple');
                }, 100);
            });

            // Click event
            select.addEventListener('click', (e) => {
                this.handleDropdownOpen(e.target, 'select-multiple');
            });
        });

        console.log(`📋 [Z-INDEX-MANAGER] Monitorando ${multipleSelects.length} selects múltiplos`);
    }

    monitorCheckboxDropdowns() {
        const checkboxDropdowns = document.querySelectorAll('.checkbox-dropdown');
        
        checkboxDropdowns.forEach(dropdown => {
            const button = dropdown.querySelector('.checkbox-dropdown-button');
            const content = dropdown.querySelector('.checkbox-dropdown-content');
            
            if (button) {
                button.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    if (dropdown.classList.contains('open')) {
                        this.handleDropdownClose(dropdown, 'checkbox-dropdown');
                    } else {
                        this.handleDropdownOpen(dropdown, 'checkbox-dropdown');
                    }
                });
            }
        });

        console.log(`☑️ [Z-INDEX-MANAGER] Monitorando ${checkboxDropdowns.length} checkbox dropdowns`);
    }

    handleDropdownOpen(element, type) {
        console.log(`🔽 [Z-INDEX-MANAGER] Abrindo dropdown tipo: ${type}`);
        
        // Incrementar z-index para garantir que este dropdown fique por cima
        this.currentZIndex++;
        
        // Aplicar z-index e posicionamento
        this.applyHighZIndex(element, type);
        
        // Adicionar à lista de ativos
        this.activeDropdowns.add({element, type, zIndex: this.currentZIndex});
        
        // Fechar outros dropdowns se necessário
        this.closeOtherDropdowns(element);
    }

    handleDropdownClose(element, type) {
        console.log(`🔼 [Z-INDEX-MANAGER] Fechando dropdown tipo: ${type}`);
        
        // Remover estilos especiais
        this.removeHighZIndex(element, type);
        
        // Remover da lista de ativos
        this.activeDropdowns.forEach(item => {
            if (item.element === element) {
                this.activeDropdowns.delete(item);
            }
        });
    }

    applyHighZIndex(element, type) {
        switch(type) {
            case 'select-multiple':
                element.style.setProperty('position', 'absolute', 'important');
                element.style.setProperty('z-index', this.currentZIndex.toString(), 'important');
                element.style.setProperty('top', '0', 'important');
                element.style.setProperty('left', '0', 'important');
                element.style.setProperty('right', '0', 'important');
                element.style.setProperty('width', '100%', 'important');
                element.style.setProperty('box-shadow', '0 25px 75px rgba(0, 0, 0, 0.4)', 'important');
                element.style.setProperty('border', '3px solid #3b82f6', 'important');
                element.style.setProperty('border-radius', '8px', 'important');
                break;
                
            case 'checkbox-dropdown':
                element.style.setProperty('z-index', this.currentZIndex.toString(), 'important');
                element.classList.add('open');
                
                const content = element.querySelector('.checkbox-dropdown-content');
                if (content) {
                    content.style.setProperty('z-index', (this.currentZIndex + 1).toString(), 'important');
                    content.style.setProperty('position', 'absolute', 'important');
                    content.style.setProperty('display', 'block', 'important');
                    content.style.setProperty('visibility', 'visible', 'important');
                    content.style.setProperty('opacity', '1', 'important');
                }
                break;
        }
    }

    removeHighZIndex(element, type) {
        switch(type) {
            case 'select-multiple':
                element.style.removeProperty('position');
                element.style.removeProperty('z-index');
                element.style.removeProperty('top');
                element.style.removeProperty('left');
                element.style.removeProperty('right');
                element.style.removeProperty('width');
                element.style.removeProperty('box-shadow');
                element.style.removeProperty('border');
                element.style.removeProperty('border-radius');
                break;
                
            case 'checkbox-dropdown':
                element.style.removeProperty('z-index');
                element.classList.remove('open');
                
                const content = element.querySelector('.checkbox-dropdown-content');
                if (content) {
                    content.style.removeProperty('z-index');
                    content.style.removeProperty('position');
                    content.style.removeProperty('display');
                    content.style.removeProperty('visibility');
                    content.style.removeProperty('opacity');
                }
                break;
        }
    }

    closeOtherDropdowns(currentElement) {
        this.activeDropdowns.forEach(item => {
            if (item.element !== currentElement) {
                this.handleDropdownClose(item.element, item.type);
            }
        });
    }

    setupGlobalClickHandler() {
        document.addEventListener('click', (e) => {
            // Verificar se o clique foi fora de qualquer dropdown ativo
            let clickedInsideDropdown = false;
            
            this.activeDropdowns.forEach(item => {
                if (item.element.contains(e.target) || item.element === e.target) {
                    clickedInsideDropdown = true;
                }
            });
            
            // Se clicou fora, fechar todos os dropdowns
            if (!clickedInsideDropdown) {
                this.closeAllDropdowns();
            }
        });
    }

    setupResizeHandler() {
        window.addEventListener('resize', () => {
            // Reposicionar dropdowns ativos se necessário
            this.repositionActiveDropdowns();
        });
    }

    closeAllDropdowns() {
        this.activeDropdowns.forEach(item => {
            this.handleDropdownClose(item.element, item.type);
        });
        this.activeDropdowns.clear();
    }

    repositionActiveDropdowns() {
        // Reposicionar dropdowns em caso de resize
        this.activeDropdowns.forEach(item => {
            if (item.type === 'select-multiple') {
                // Reposicionar se necessário
                this.applyHighZIndex(item.element, item.type);
            }
        });
    }

    // Método público para debugging
    getActiveDropdowns() {
        return Array.from(this.activeDropdowns);
    }

    // Método público para forçar fechamento
    forceCloseAll() {
        console.log('🚫 [Z-INDEX-MANAGER] Forçando fechamento de todos os dropdowns');
        this.closeAllDropdowns();
    }
}

// Inicializar automaticamente
const dropdownZIndexManager = new DropdownZIndexManager();

// Expor globalmente para debugging
window.dropdownZIndexManager = dropdownZIndexManager;

// Expor métodos úteis
window.closeAllDropdowns = () => dropdownZIndexManager.forceCloseAll();
window.getActiveDropdowns = () => dropdownZIndexManager.getActiveDropdowns();

console.log('🎯 [Z-INDEX-MANAGER] Sistema inicializado e pronto!');