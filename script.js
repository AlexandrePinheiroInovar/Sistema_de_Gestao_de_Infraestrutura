// Sistema MDU - Versão Completa com Todas as Funcionalidades
console.log('🔧 Carregando script completo...');

// ========== SISTEMA DE NOTIFICAÇÕES PERSONALIZADO ==========
function showNotification(title, message, type = 'success', showCancel = false, onConfirm = null, onCancel = null) {
    const notification = document.getElementById('customNotification');
    const icon = document.getElementById('notificationIcon');
    const titleEl = document.getElementById('notificationTitle');
    const messageEl = document.getElementById('notificationMessage');
    const confirmBtn = document.getElementById('notificationConfirm');
    const cancelBtn = document.getElementById('notificationCancel');
    
    // Verificar se os elementos existem (pode não existir em páginas como login/cadastro)
    if (!notification || !icon || !titleEl || !messageEl || !confirmBtn || !cancelBtn) {
        // Fallback para páginas sem sistema de notificação
        const typeIcons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            confirm: '❓'
        };
        const iconText = typeIcons[type] || '✅';
        alert(`${iconText} ${title}\n\n${message}`);
        if (onConfirm) onConfirm();
        return;
    }
    
    // Configurar ícones e cores baseado no tipo
    const config = {
        success: { icon: '✅', class: 'success' },
        error: { icon: '❌', class: 'error' },
        warning: { icon: '⚠️', class: 'warning' },
        info: { icon: 'ℹ️', class: 'info' },
        confirm: { icon: '❓', class: 'warning' }
    };
    
    const currentConfig = config[type] || config.success;
    
    // Aplicar configurações
    icon.textContent = currentConfig.icon;
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Remover classes anteriores e adicionar nova
    notification.className = 'custom-notification ' + currentConfig.class;
    
    // Configurar botões
    if (showCancel) {
        cancelBtn.style.display = 'inline-block';
        confirmBtn.textContent = 'Confirmar';
    } else {
        cancelBtn.style.display = 'none';
        confirmBtn.textContent = 'OK';
    }
    
    // Configurar event listeners
    confirmBtn.onclick = () => {
        hideNotification();
        if (onConfirm) onConfirm();
    };
    
    cancelBtn.onclick = () => {
        hideNotification();
        if (onCancel) onCancel();
    };
    
    // Mostrar notificação
    notification.style.display = 'flex';
    
    // Auto-hide para notificações simples (não de confirmação)
    if (!showCancel && type !== 'confirm') {
        setTimeout(() => {
            hideNotification();
        }, 3000);
    }
}

function hideNotification() {
    const notification = document.getElementById('customNotification');
    notification.style.display = 'none';
}

// Funções de conveniência
function showSuccess(title, message) {
    showNotification(title, message, 'success');
}

function showError(title, message) {
    showNotification(title, message, 'error');
}

function showWarning(title, message) {
    showNotification(title, message, 'warning');
}

function showInfo(title, message) {
    showNotification(title, message, 'info');
}

function showConfirm(title, message, onConfirm, onCancel) {
    showNotification(title, message, 'confirm', true, onConfirm, onCancel);
}

// Variáveis globais
let mduData = [];
let csvData = null;
let filteredData = [];
const allCharts = {};
let originalData = [];
let enderecosData = [];
let tableCreatedFromUpload = false; // Flag para controlar se tabela foi criada por upload
let currentEditId = null;
let uploadedData = null;
let fileHeaders = [];
let activeSection = null;
let sectionChangeTimeout = null;

// ========== SISTEMA FIREBASE APENAS ==========
// REMOVIDO: Sistema local de usuários
// Agora todos os usuários vêm do Firebase Auth + Firestore
// ROLES: normal (início/dashboard), gestor (tudo exceto gestão), admin (tudo)

// ========== FUNÇÕES AUXILIARES FIRESTORE ==========

// Salvar dados no Firestore
async function salvarDadosFirestore(documentId, data) {
    if (!window.db || !window.currentUser) {
        console.warn('⚠️ Firebase não disponível - dados não salvos');
        return false;
    }

    try {
        const docRef = window.db.collection('sistema').doc(documentId);
        await docRef.set({
            data: data,
            lastUpdate: new Date(),
            updatedBy: window.currentUser.uid
        });
        console.log(`✅ Dados ${documentId} salvos no Firestore`);
        return true;
    } catch (error) {
        console.error(`❌ Erro ao salvar ${documentId}:`, error);
        return false;
    }
}

// Carregar dados do Firestore
async function carregarDadosFirestore(documentId) {
    if (!window.db) {
        console.warn('⚠️ Firebase não disponível');
        return null;
    }

    try {
        const docRef = window.db.collection('sistema').doc(documentId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const docData = doc.data();
            console.log(`✅ Dados ${documentId} carregados do Firestore`);
            return docData.data;
        } else {
            console.log(`📝 Documento ${documentId} não existe no Firestore`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Erro ao carregar ${documentId}:`, error);
        return null;
    }
}

// Limpar todos os dados locais e do navegador
function limparTodosOsDados() {
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpar variáveis locais
    gestaoData = { projetos: [], subprojetos: [], tiposAcao: [], supervisores: [], equipes: [], cidades: [] };
    enderecosData = [];
    dynamicTableData = { headers: [], data: [], metadata: { lastUpload: null, totalRecords: 0, source: null, tableStructure: 'dynamic' } };
    
    console.log('🧹 Todos os dados locais foram limpos - sistema zerado para usar apenas Firebase');
}

// ========== SISTEMA DE TABELA DINÂMICA ==========
let dynamicTableData = {
    headers: [],
    data: [],
    metadata: {
        lastUpload: null,
        totalRecords: 0,
        source: null, // 'upload' | 'manual'
        tableStructure: 'dynamic' // 'dynamic' | 'fixed'
    }
};

// Configurações da tabela dinâmica
let dynamicTableConfig = {
    itemsPerPage: 20,
    currentPage: 1,
    sortColumn: null,
    sortDirection: 'asc',
    filters: {},
    searchTerm: ''
};

let gestaoData = {
    projetos: [],
    subprojetos: [],
    tiposAcao: [],
    supervisores: [],
    equipes: [],
    cidades: []
};

// ==================== SISTEMA DE PERSISTÊNCIA - GESTÃO DE PROJETOS ====================

// Função principal para salvar todos os dados de gestão
async function salvarDadosGestao() {
    try {
        await salvarDadosFirestore('gestaoData', gestaoData);
        console.log('✅ Dados de gestão salvos com sucesso:', {
            projetos: gestaoData.projetos?.length || 0,
            subprojetos: gestaoData.subprojetos?.length || 0,
            supervisores: gestaoData.supervisores?.length || 0,
            equipes: gestaoData.equipes?.length || 0,
            cidades: gestaoData.cidades?.length || 0
        });
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados de gestão:', error);
        return false;
    }
}

// Carregar dados de gestão do localStorage
async function carregarDadosGestao() {
    try {
        const savedData = await carregarDadosFirestore('gestaoData');
        if (savedData) {
            gestaoData = savedData || { projetos: [], subprojetos: [], tiposAcao: [], supervisores: [], equipes: [], cidades: [] };
            console.log('✅ Dados de gestão carregados:', {
                projetos: gestaoData.projetos?.length || 0,
                subprojetos: gestaoData.subprojetos?.length || 0,
                supervisores: gestaoData.supervisores?.length || 0,
                equipes: gestaoData.equipes?.length || 0,
                cidades: gestaoData.cidades?.length || 0
            });
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados de gestão:', error);
        // Inicializar com estrutura padrão
        gestaoData = {
            projetos: [],
            subprojetos: [],
            tiposAcao: [],
            supervisores: [],
            equipes: [],
            cidades: []
        };
    }
}

// Salvar projeto específico
function salvarProjeto(projeto) {
    try {
        if (!projeto || !projeto.nome) {
            console.error('❌ Dados do projeto inválidos');
            return false;
        }

        if (!gestaoData.projetos) {
            gestaoData.projetos = [];
        }

        const index = gestaoData.projetos.findIndex(p => p.id === projeto.id);
        if (index !== -1) {
            // Atualizar projeto existente
            gestaoData.projetos[index] = { ...projeto, updated_at: new Date().toISOString() };
            console.log('✅ Projeto atualizado:', projeto.nome);
        } else {
            // Adicionar novo projeto
            projeto.created_at = new Date().toISOString();
            projeto.updated_at = new Date().toISOString();
            gestaoData.projetos.push(projeto);
            console.log('✅ Novo projeto adicionado:', projeto.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar projeto:', error);
        return false;
    }
}

// Salvar subprojeto específico
function salvarSubProjeto(subprojeto) {
    try {
        if (!subprojeto || !subprojeto.nome) {
            console.error('❌ Dados do subprojeto inválidos');
            return false;
        }

        if (!gestaoData.subprojetos) {
            gestaoData.subprojetos = [];
        }

        const index = gestaoData.subprojetos.findIndex(sp => sp.id === subprojeto.id);
        if (index !== -1) {
            // Atualizar subprojeto existente
            gestaoData.subprojetos[index] = { ...subprojeto, updated_at: new Date().toISOString() };
            console.log('✅ Subprojeto atualizado:', subprojeto.nome);
        } else {
            // Adicionar novo subprojeto
            subprojeto.created_at = new Date().toISOString();
            subprojeto.updated_at = new Date().toISOString();
            gestaoData.subprojetos.push(subprojeto);
            console.log('✅ Novo subprojeto adicionado:', subprojeto.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar subprojeto:', error);
        return false;
    }
}

// Salvar supervisor específico
function salvarSupervisor(supervisor) {
    try {
        if (!supervisor || !supervisor.nome) {
            console.error('❌ Dados do supervisor inválidos');
            return false;
        }

        if (!gestaoData.supervisores) {
            gestaoData.supervisores = [];
        }

        const index = gestaoData.supervisores.findIndex(s => s.id === supervisor.id);
        if (index !== -1) {
            // Atualizar supervisor existente
            gestaoData.supervisores[index] = { ...supervisor, updated_at: new Date().toISOString() };
            console.log('✅ Supervisor atualizado:', supervisor.nome);
        } else {
            // Adicionar novo supervisor
            supervisor.created_at = new Date().toISOString();
            supervisor.updated_at = new Date().toISOString();
            gestaoData.supervisores.push(supervisor);
            console.log('✅ Novo supervisor adicionado:', supervisor.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar supervisor:', error);
        return false;
    }
}

// Salvar equipe específica
function salvarEquipe(equipe) {
    try {
        if (!equipe || !equipe.nome) {
            console.error('❌ Dados da equipe inválidos');
            return false;
        }

        if (!gestaoData.equipes) {
            gestaoData.equipes = [];
        }

        const index = gestaoData.equipes.findIndex(e => e.id === equipe.id);
        if (index !== -1) {
            // Atualizar equipe existente
            gestaoData.equipes[index] = { ...equipe, updated_at: new Date().toISOString() };
            console.log('✅ Equipe atualizada:', equipe.nome);
        } else {
            // Adicionar nova equipe
            equipe.created_at = new Date().toISOString();
            equipe.updated_at = new Date().toISOString();
            gestaoData.equipes.push(equipe);
            console.log('✅ Nova equipe adicionada:', equipe.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar equipe:', error);
        return false;
    }
}

// Salvar cidade específica
function salvarCidade(cidade) {
    try {
        if (!cidade || !cidade.nome) {
            console.error('❌ Dados da cidade inválidos');
            return false;
        }

        if (!gestaoData.cidades) {
            gestaoData.cidades = [];
        }

        const index = gestaoData.cidades.findIndex(c => c.id === cidade.id);
        if (index !== -1) {
            // Atualizar cidade existente
            gestaoData.cidades[index] = { ...cidade, updated_at: new Date().toISOString() };
            console.log('✅ Cidade atualizada:', cidade.nome);
        } else {
            // Adicionar nova cidade
            cidade.created_at = new Date().toISOString();
            cidade.updated_at = new Date().toISOString();
            gestaoData.cidades.push(cidade);
            console.log('✅ Nova cidade adicionada:', cidade.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar cidade:', error);
        return false;
    }
}

// Excluir item específico
function excluirItemGestao(tipo, id) {
    try {
        if (!tipo || !id) {
            console.error('❌ Tipo ou ID inválido para exclusão');
            return false;
        }

        let array = gestaoData[tipo];
        if (!array) {
            console.error(`❌ Tipo ${tipo} não encontrado`);
            return false;
        }

        const index = array.findIndex(item => item.id == id);
        if (index === -1) {
            console.error(`❌ Item com ID ${id} não encontrado em ${tipo}`);
            return false;
        }

        const itemNome = array[index].nome;
        array.splice(index, 1);
        
        console.log(`✅ Item excluído de ${tipo}:`, itemNome);
        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao excluir item:', error);
        return false;
    }
}

// Função principal para salvar todos os dados de gestão
async function salvarDadosGestao() {
    try {
        await salvarDadosFirestore('gestaoData', gestaoData);
        console.log('✅ Dados de gestão salvos com sucesso:', {
            projetos: gestaoData.projetos?.length || 0,
            subprojetos: gestaoData.subprojetos?.length || 0,
            supervisores: gestaoData.supervisores?.length || 0,
            equipes: gestaoData.equipes?.length || 0,
            cidades: gestaoData.cidades?.length || 0
        });
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar dados de gestão:', error);
        return false;
    }
}

// Carregar dados de gestão do localStorage
async function carregarDadosGestao() {
    try {
        const savedData = await carregarDadosFirestore('gestaoData');
        if (savedData) {
            gestaoData = savedData || { projetos: [], subprojetos: [], tiposAcao: [], supervisores: [], equipes: [], cidades: [] };
            console.log('✅ Dados de gestão carregados:', {
                projetos: gestaoData.projetos?.length || 0,
                subprojetos: gestaoData.subprojetos?.length || 0,
                supervisores: gestaoData.supervisores?.length || 0,
                equipes: gestaoData.equipes?.length || 0,
                cidades: gestaoData.cidades?.length || 0
            });
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados de gestão:', error);
        // Inicializar com estrutura padrão
        gestaoData = {
            projetos: [],
            subprojetos: [],
            tiposAcao: [],
            supervisores: [],
            equipes: [],
            cidades: []
        };
    }
}

// Salvar projeto específico
function salvarProjeto(projeto) {
    try {
        if (!projeto || !projeto.nome) {
            console.error('❌ Dados do projeto inválidos');
            return false;
        }

        if (!gestaoData.projetos) {
            gestaoData.projetos = [];
        }

        const index = gestaoData.projetos.findIndex(p => p.id === projeto.id);
        if (index !== -1) {
            // Atualizar projeto existente
            gestaoData.projetos[index] = { ...projeto, updated_at: new Date().toISOString() };
            console.log('✅ Projeto atualizado:', projeto.nome);
        } else {
            // Adicionar novo projeto
            projeto.created_at = new Date().toISOString();
            projeto.updated_at = new Date().toISOString();
            gestaoData.projetos.push(projeto);
            console.log('✅ Novo projeto adicionado:', projeto.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar projeto:', error);
        return false;
    }
}

// Salvar subprojeto específico
function salvarSubProjeto(subprojeto) {
    try {
        if (!subprojeto || !subprojeto.nome) {
            console.error('❌ Dados do subprojeto inválidos');
            return false;
        }

        if (!gestaoData.subprojetos) {
            gestaoData.subprojetos = [];
        }

        const index = gestaoData.subprojetos.findIndex(sp => sp.id === subprojeto.id);
        if (index !== -1) {
            // Atualizar subprojeto existente
            gestaoData.subprojetos[index] = { ...subprojeto, updated_at: new Date().toISOString() };
            console.log('✅ Subprojeto atualizado:', subprojeto.nome);
        } else {
            // Adicionar novo subprojeto
            subprojeto.created_at = new Date().toISOString();
            subprojeto.updated_at = new Date().toISOString();
            gestaoData.subprojetos.push(subprojeto);
            console.log('✅ Novo subprojeto adicionado:', subprojeto.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar subprojeto:', error);
        return false;
    }
}

// Salvar supervisor específico
function salvarSupervisor(supervisor) {
    try {
        if (!supervisor || !supervisor.nome) {
            console.error('❌ Dados do supervisor inválidos');
            return false;
        }

        if (!gestaoData.supervisores) {
            gestaoData.supervisores = [];
        }

        const index = gestaoData.supervisores.findIndex(s => s.id === supervisor.id);
        if (index !== -1) {
            // Atualizar supervisor existente
            gestaoData.supervisores[index] = { ...supervisor, updated_at: new Date().toISOString() };
            console.log('✅ Supervisor atualizado:', supervisor.nome);
        } else {
            // Adicionar novo supervisor
            supervisor.created_at = new Date().toISOString();
            supervisor.updated_at = new Date().toISOString();
            gestaoData.supervisores.push(supervisor);
            console.log('✅ Novo supervisor adicionado:', supervisor.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar supervisor:', error);
        return false;
    }
}

// Salvar equipe específica
function salvarEquipe(equipe) {
    try {
        if (!equipe || !equipe.nome) {
            console.error('❌ Dados da equipe inválidos');
            return false;
        }

        if (!gestaoData.equipes) {
            gestaoData.equipes = [];
        }

        const index = gestaoData.equipes.findIndex(e => e.id === equipe.id);
        if (index !== -1) {
            // Atualizar equipe existente
            gestaoData.equipes[index] = { ...equipe, updated_at: new Date().toISOString() };
            console.log('✅ Equipe atualizada:', equipe.nome);
        } else {
            // Adicionar nova equipe
            equipe.created_at = new Date().toISOString();
            equipe.updated_at = new Date().toISOString();
            gestaoData.equipes.push(equipe);
            console.log('✅ Nova equipe adicionada:', equipe.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar equipe:', error);
        return false;
    }
}

// Salvar cidade específica
function salvarCidade(cidade) {
    try {
        if (!cidade || !cidade.nome) {
            console.error('❌ Dados da cidade inválidos');
            return false;
        }

        if (!gestaoData.cidades) {
            gestaoData.cidades = [];
        }

        const index = gestaoData.cidades.findIndex(c => c.id === cidade.id);
        if (index !== -1) {
            // Atualizar cidade existente
            gestaoData.cidades[index] = { ...cidade, updated_at: new Date().toISOString() };
            console.log('✅ Cidade atualizada:', cidade.nome);
        } else {
            // Adicionar nova cidade
            cidade.created_at = new Date().toISOString();
            cidade.updated_at = new Date().toISOString();
            gestaoData.cidades.push(cidade);
            console.log('✅ Nova cidade adicionada:', cidade.nome);
        }

        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao salvar cidade:', error);
        return false;
    }
}

// Excluir item específico
function excluirItemGestao(tipo, id) {
    try {
        if (!tipo || !id) {
            console.error('❌ Tipo ou ID inválido para exclusão');
            return false;
        }

        let array = gestaoData[tipo];
        if (!array) {
            console.error(`❌ Tipo ${tipo} não encontrado`);
            return false;
        }

        const index = array.findIndex(item => item.id == id);
        if (index === -1) {
            console.error(`❌ Item com ID ${id} não encontrado em ${tipo}`);
            return false;
        }

        const itemNome = array[index].nome;
        array.splice(index, 1);
        
        console.log(`✅ Item excluído de ${tipo}:`, itemNome);
        return salvarDadosGestao();
    } catch (error) {
        console.error('❌ Erro ao excluir item:', error);
        return false;
    }
}

// Variáveis de paginação
let currentPage = 1;
let itemsPerPage = 100;
let totalPages = 1;

// Configuração global do Chart.js
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#000000';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    Chart.defaults.plugins.tooltip.titleColor = '#fff';
    Chart.defaults.plugins.tooltip.bodyColor = '#fff';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 12;
    
    // Registrar plugin de datalabels se disponível
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
        console.log('✅ Plugin ChartDataLabels registrado');
    } else {
        console.warn('⚠️ Plugin ChartDataLabels não encontrado');
    }
}

// Polyfill para requestIdleCallback (para navegadores mais antigos)
if (!window.requestIdleCallback) {
    window.requestIdleCallback = function(callback, options) {
        const timeout = options && options.timeout ? options.timeout : 50;
        const start = Date.now();
        
        return setTimeout(function() {
            callback({
                didTimeout: false,
                timeRemaining: function() {
                    return Math.max(0, timeout - (Date.now() - start));
                }
            });
        }, 1);
    };
}

// Dados baseados exclusivamente no módulo Cadastro de Endereços

// Configurar event listeners globais imediatamente

// ÚNICO event listener DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado...');
    
    // Verificar se estamos na página de login
    if (document.getElementById('loginForm')) {
        console.log('📝 Inicializando página de login...');
        initializeLogin();
    } 
    // Verificar se estamos na página de cadastro
    else if (document.getElementById('registerForm')) {
        console.log('📝 Inicializando página de cadastro...');
        initializeRegister();
    } else {
        console.log('📊 Inicializando dashboard...');
        
        // Carregar dados de gestão do localStorage
        carregarDadosGestao();
        
        // Verificar autenticação e aplicar controle de acesso
        if (typeof applyAccessControl === 'function') {
            applyAccessControl();
        }
        
        // Configurar event listeners globais primeiro
        setupGlobalEventListeners();
        
        // Inicializar dashboard
        initializeDashboard();
        
        // Inicializar analytics quando necessário (se implementado)
        setTimeout(() => {
            if (document.getElementById('analytics')) {
                console.log('📊 Analytics detectado, mas não implementado ainda');
            }
        }, 1000);
    }
});

// Configurar event listeners globais
function setupGlobalEventListeners() {
    console.log('🔗 Configurando event listeners globais');
    
    // Capturar erros globais
    window.addEventListener('error', function(e) {
        console.error('❌ Erro JavaScript:', e.message, 'em', e.filename, 'linha', e.lineno);
    });
    
    // Fazer TODAS as funções globais disponíveis
    window.showSection = showSection;
    window.logout = logout;
    window.togglePassword = togglePassword;
    window.exportData = exportData;
    window.changePage = changePage;
    window.correctMappedData = correctMappedData;
    window.applyDataCorrection = applyDataCorrection;
    window.createTableFromScratch = createTableFromScratch;
    window.backupCurrentData = backupCurrentData;
    window.revertToBackup = revertToBackup;
    window.clearEnderecosTable = clearEnderecosTable;
    window.debugUploadData = debugUploadData;
    window.downloadTemplate = downloadTemplate;
    
    // Funções de notificação
    window.showNotification = showNotification;
    window.hideNotification = hideNotification;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;
    window.showConfirm = showConfirm;
    
    // Funções CRUD
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.deleteEndereco = deleteEndereco;

    // Funções de gráficos (removidas - não mais necessárias)
    
    // window.testChartJS = testChartJS;
    // window.forceCreateProjetosChart = forceCreateProjetosChart;
    window.applyInfraFilters = applyInfraFilters;
    window.clearInfraFilters = clearInfraFilters;
    window.updateInfraChartsWithData = updateInfraChartsWithData;
    window.updateInfraTablesWithData = updateInfraTablesWithData;
    window.updateTipoAcaoTable = updateTipoAcaoTable;
    window.updateStatusTable = updateStatusTable;
    window.calculateTempoMedioExecucao = calculateTempoMedioExecucao;
    
    // Função de teste para debug
    window.testLoadProjectsTable = loadProjectsTable;
    
    // Função para limpar dados duplicados
window.limparDadosDuplicadosGestao = limparDadosDuplicadosGestao;

// Função para corrigir classificação incorreta dos dados
window.corrigirClassificacaoDados = function() {
    const btn = document.querySelector('.btn-corrigir-minimal');
    if (!btn) return;
    
    // Adicionar estado de loading
    btn.classList.add('loading');
    btn.disabled = true;
    
    console.log('🔧 Corrigindo classificação incorreta dos dados...');
    
    // Analisar e corrigir dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        console.log('📊 Analisando dados de endereços...');
        enderecosData.forEach(endereco => {
            // Verificar se projeto é na verdade um subprojeto
            if (endereco.projeto && detectValueType(endereco.projeto) === 'subprojeto') {
                console.log(`🔄 Movendo "${endereco.projeto}" de projeto para subprojeto`);
                endereco.subProjeto = endereco.projeto;
                endereco.projeto = 'Projeto Padrão';
            }
            
            // Verificar se subprojeto é na verdade um projeto
            if (endereco.subProjeto && detectValueType(endereco.subProjeto) === 'projeto') {
                console.log(`🔄 Movendo "${endereco.subProjeto}" de subprojeto para projeto`);
                endereco.projeto = endereco.subProjeto;
                endereco.subProjeto = '';
            }
        });
    }
    
    // Analisar e corrigir dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        console.log('📊 Analisando dados dinâmicos...');
        dynamicTableData.data.forEach(row => {
            Object.keys(row).forEach(field => {
                const value = row[field]?.toString().trim();
                if (!value) return;
                
                const fieldType = detectFieldType(field);
                const valueType = detectValueType(value);
                
                // Se o campo não corresponde ao valor, corrigir
                if (fieldType !== valueType) {
                    console.log(`🔄 Corrigindo campo "${field}" com valor "${value}"`);
                    
                    // Se o valor é um projeto mas está em campo de subprojeto
                    if (fieldType === 'subprojeto' && valueType === 'projeto') {
                        // Criar novo campo de projeto se não existir
                        const projetoField = Object.keys(row).find(f => detectFieldType(f) === 'projeto');
                        if (!projetoField) {
                            row['projeto'] = value;
                            row[field] = ''; // Limpar campo incorreto
                        }
                    }
                    
                    // Se o valor é um subprojeto mas está em campo de projeto
                    if (fieldType === 'projeto' && valueType === 'subprojeto') {
                        // Criar novo campo de subprojeto se não existir
                        const subProjetoField = Object.keys(row).find(f => detectFieldType(f) === 'subprojeto');
                        if (!subProjetoField) {
                            row['subProjeto'] = value;
                            row[field] = ''; // Limpar campo incorreto
                        }
                    }
                }
            });
        });
    }
    
    // Salvar dados corrigidos
    localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
    localStorage.setItem('dynamicTableData', JSON.stringify(dynamicTableData));
    
    // Atualizar gráfico de projetos automaticamente
    setTimeout(() => {
        if (typeof updateProjetosChart === 'function') updateProjetosChart();
        if (typeof updateSubProjetosChart === 'function') updateSubProjetosChart();
    }, 100);
    
    console.log('✅ Classificação de dados corrigida!');
    
    // Remover estado de loading
    btn.classList.remove('loading');
    btn.disabled = false;
    
    // Mostrar sucesso
    showSuccess('Dados Corrigidos', 'A classificação incorreta dos dados foi corrigida automaticamente.');
    
    // Recarregar tabelas
    loadGestaoTables();
};

// Função para atualizar o gráfico de projetos automaticamente
function updateProjetosChart() {
    // Verificar se estamos na seção de infraestrutura
    const infraSection = document.getElementById('infraestrutura');
    if (!infraSection || !infraSection.classList.contains('active')) {
        return; // Não atualizar se não estiver na seção ativa
    }
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('projetosChart');
    if (!ctx) {
        return; // Canvas não existe
    }
    
    console.log('🔄 Atualizando gráfico de projetos automaticamente...');
    createProjetosCombinedChart();
    createSubProjetosCombinedChart();
    createCidadesCombinedChart();
    createHpProjetosBarChart();
    createRecebimentosBarChart();
    createSupervisorStatusBarChart();
}


    
    // Função para limpar todos os dados e reiniciar
    window.limparTodosDados = function() {
        console.log('🧹 Limpando todos os dados do sistema...');
        
        // Limpar localStorage
        localStorage.clear();
        
        // Limpar variáveis globais
        enderecosData = [];
        dynamicTableData = {
            headers: [],
            data: [],
            metadata: {
                lastUpload: null,
                totalRecords: 0,
                source: null,
                tableStructure: 'dynamic'
            }
        };
        gestaoData = {
            projetos: [],
            subprojetos: [],
            tiposAcao: [],
            supervisores: [],
            equipes: [],
            cidades: []
        };
        
        // Recarregar página
        window.location.reload();
    };
    
    // Função de teste para verificar dados
    window.testData = function() {
        console.log('🧪 Testando dados do sistema...');
        console.log('📊 enderecosData:', enderecosData);
        console.log('📋 gestaoData:', gestaoData);
        console.log('🔍 Elementos HTML:');
        console.log('- enderecosTableBody:', document.getElementById('enderecosTableBody'));
        console.log('- projetosTableBody:', document.getElementById('projetosTableBody'));
        console.log('- projetosChart:', document.getElementById('projetosChart'));
        
        // Testar renderização
        console.log('🔄 Testando renderização...');
        renderEnderecosTable();
        loadGestaoTables();
    };
    
    // Função de teste para verificar modal após upload
    window.testModalAfterUpload = function() {
        console.log('🧪 Testando modal após upload...');
        
        // Verificar estado atual
        console.log('📊 Estado atual:', {
            enderecosData: enderecosData.length,
            secaoAtiva: document.querySelector('.section.active')?.id,
            modalExiste: !!document.getElementById('crudModal')
        });
        
        // Tentar abrir o modal
        console.log('🔄 Tentando abrir modal...');
        abrirNovoEndereco();
        
        // Verificar após 1 segundo
        setTimeout(() => {
            const modal = document.getElementById('crudModal');
            console.log('📋 Resultado do teste:', {
                modalExiste: !!modal,
                modalVisivel: modal ? modal.style.display !== 'none' : false,
                secaoAtiva: document.querySelector('.section.active')?.id
            });
        }, 1000);
    };
    
    // Função de diagnóstico do modal
    window.diagnoseModal = function() {
        console.log('🔍 Diagnóstico completo do modal...');
        
        // Verificar seção ativa
        const secaoAtiva = document.querySelector('.section.active');
        console.log('📋 Seção ativa:', secaoAtiva?.id || 'Nenhuma');
        
        // Verificar modal
        const modal = document.getElementById('crudModal');
        console.log('📋 Modal:', {
            existe: !!modal,
            visivel: modal ? modal.style.display !== 'none' : false,
            display: modal ? modal.style.display : 'N/A',
            innerHTML: modal ? modal.innerHTML.substring(0, 200) + '...' : 'N/A'
        });
        
        // Verificar elementos internos
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('enderecoForm');
        const submitBtn = document.getElementById('submitBtn');
        
        console.log('📋 Elementos internos:', {
            modalTitle: {
                existe: !!modalTitle,
                texto: modalTitle ? modalTitle.textContent : 'N/A'
            },
            form: {
                existe: !!form,
                id: form ? form.id : 'N/A',
                action: form ? form.action : 'N/A'
            },
            submitBtn: {
                existe: !!submitBtn,
                texto: submitBtn ? submitBtn.textContent : 'N/A',
                type: submitBtn ? submitBtn.type : 'N/A'
            }
        });
        
        // Verificar se todos os elementos estão no DOM
        const todosElementos = document.querySelectorAll('#crudModal, #modalTitle, #enderecoForm, #submitBtn');
        console.log('📋 Elementos no DOM:', todosElementos.length, 'de 4 encontrados');
        
        // Verificar formulários dentro do modal
        if (modal) {
            const formsInModal = modal.querySelectorAll('form');
            console.log('📋 Formulários dentro do modal:', formsInModal.length);
            formsInModal.forEach((f, index) => {
                console.log(`  Formulário ${index + 1}:`, {
                    id: f.id,
                    className: f.className,
                    action: f.action
                });
            });
        }
        
        return {
            modal: !!modal,
            modalTitle: !!modalTitle,
            form: !!form,
            submitBtn: !!submitBtn,
            todosExistem: modal && modalTitle && form && submitBtn
        };
    };
    
    // Função de emergência para forçar abertura do modal
    window.forceOpenModal = function() {
        console.log('🚨 Função de emergência: Forçando abertura do modal...');
        
        // Verificar se estamos na seção correta
        const enderecosSection = document.getElementById('enderecos');
        if (!enderecosSection || enderecosSection.style.display === 'none') {
            console.log('🔄 Ativando seção de endereços...');
            showSection('enderecos');
        }
        
        // Aguardar e tentar abrir diretamente
        setTimeout(() => {
            const modal = document.getElementById('crudModal');
            if (modal) {
                console.log('✅ Modal encontrado, abrindo diretamente...');
                modal.style.display = 'block';
                
                // Configurar formulário
                const form = document.getElementById('enderecoForm');
                const modalTitle = document.getElementById('modalTitle');
                const submitBtn = document.getElementById('submitBtn');
                
                if (form && modalTitle && submitBtn) {
                    modalTitle.textContent = 'Novo Endereço';
                    submitBtn.textContent = 'Salvar';
                    form.reset();
                    currentEditId = null;
                    
                    // Configurar submit
                    form.onsubmit = function(e) {
                        e.preventDefault();
                        handleFormSubmit();
                    };
                    
                    console.log('✅ Modal configurado e aberto com sucesso!');
                } else {
                    console.error('❌ Elementos do formulário não encontrados');
                }
            } else {
                console.error('❌ Modal não encontrado mesmo após ativação da seção');
            }
        }, 500);
    };
    
    // Função para recriar o modal se necessário
    window.recreateModal = function() {
        console.log('🔨 Recriando modal...');
        
        // Verificar se o modal existe
        const modal = document.getElementById('crudModal');
        if (!modal) {
            console.error('❌ Modal não encontrado para recriação');
            return false;
        }
        
        // Garantir que estamos usando o sistema de endereços, não o dinâmico
        const dynamicForm = modal.querySelector('#dynamicForm');
        if (dynamicForm) {
            console.log('🔄 Formulário dinâmico detectado, removendo...');
            dynamicForm.remove();
            return false; // Forçar recriação completa
        }
        
        // Verificar se o formulário existe
        const form = document.getElementById('enderecoForm');
        if (!form) {
            console.log('🔄 Formulário não encontrado, recriando...');
            
            // Procurar por qualquer formulário dentro do modal
            const existingForm = modal.querySelector('form');
            if (existingForm) {
                console.log('✅ Formulário encontrado, renomeando...');
                existingForm.id = 'enderecoForm';
                existingForm.className = 'modal-form';
                
                // Verificar se o botão submit existe
                const submitBtn = modal.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.id) {
                    submitBtn.id = 'submitBtn';
                    console.log('✅ Botão submit configurado');
                }
                
                return true;
            } else {
                console.error('❌ Nenhum formulário encontrado no modal');
                return false;
            }
        }
        
        return true;
    };
    
    // Função para verificar e reparar o modal
window.repairModal = function() {
    console.log('🔧 Verificando e reparando modal...');
    
    // Verificar se o modal existe
    const modal = document.getElementById('crudModal');
    if (!modal) {
        console.error('❌ Modal não encontrado no DOM');
        return false;
    }
    
    // Verificar elementos internos
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('enderecoForm');
    const submitBtn = document.getElementById('submitBtn');
    
    console.log('🔍 Status dos elementos:', {
        modal: !!modal,
        modalTitle: !!modalTitle,
        form: !!form,
        submitBtn: !!submitBtn
    });
    
    // Se o formulário não existe, tentar recriar
    if (!form) {
        console.log('🔄 Formulário não encontrado, tentando recriar...');
        
        // Verificar se há conteúdo no modal
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            // Procurar por qualquer formulário dentro do modal
            const existingForm = modalContent.querySelector('form');
            if (existingForm) {
                console.log('✅ Formulário encontrado com ID diferente:', existingForm.id);
                // Renomear o formulário se necessário
                if (existingForm.id !== 'enderecoForm') {
                    existingForm.id = 'enderecoForm';
                    console.log('✅ Formulário renomeado para enderecoForm');
                }
            } else {
                console.error('❌ Nenhum formulário encontrado dentro do modal');
                return false;
            }
        }
    }
    
    // Garantir que estamos usando o sistema de endereços, não o dinâmico
    const dynamicForm = modal.querySelector('#dynamicForm');
    if (dynamicForm) {
        console.log('🔄 Formulário dinâmico detectado, removendo...');
        dynamicForm.remove();
        return false; // Forçar recriação do modal
    }
    
    // Verificar novamente após tentativa de reparo
    const formAfterRepair = document.getElementById('enderecoForm');
    const modalTitleAfterRepair = document.getElementById('modalTitle');
    const submitBtnAfterRepair = document.getElementById('submitBtn');
    
    if (modal && modalTitleAfterRepair && formAfterRepair && submitBtnAfterRepair) {
        console.log('✅ Todos os elementos encontrados após reparo, abrindo modal...');
        modal.style.display = 'block';
        
        // Popular dropdowns com dados da gestão
        console.log('🔄 Populando dropdowns do formulário...');
        populateFormSelects();
        
        // Configurar formulário
        modalTitleAfterRepair.textContent = 'Novo Endereço';
        submitBtnAfterRepair.textContent = 'Salvar';
        formAfterRepair.reset();
        currentEditId = null;
        
        // Configurar submit
        formAfterRepair.onsubmit = function(e) {
            e.preventDefault();
            handleFormSubmit();
        };
        
        console.log('✅ Modal reparado e aberto com sucesso!');
        return true;
    } else {
        console.error('❌ Elementos ainda faltando após reparo');
        return false;
    }
};
    // Funções Upload
    window.openUploadModal = openUploadModal;
    window.closeUploadModal = closeUploadModal;
    window.resetUploadModal = resetUploadModal;
    window.handleFileSelect = handleFileSelect;
    window.processUpload = processUpload;
    window.testUploadWithSampleData = testUploadWithSampleData;
    window.processWebUrl = processWebUrl;
    window.updateMappingStatus = updateMappingStatus;
    window.clearAllData = clearAllData;
    
    // Função para reorganizar dados da gestão (temporária)
    window.reorganizarGestaoData = reorganizarGestaoData;
    
    // Função para testar formulário dinâmico
    window.testarFormularioDinamico = function() {
        console.log('🧪 Testando formulário dinâmico...');
        
        // Forçar reorganização dos dados
        reorganizarGestaoData();
        
        // Aguardar um pouco e abrir o formulário
        setTimeout(() => {
            abrirNovoEndereco();
        }, 500);
    };
    
    // Função para debug completo
    window.debugFormularioDinamico = function() {
        console.log('🔍 Debug completo do formulário dinâmico...');
        
        console.log('1. Dados da gestão:');
        console.log('  - gestaoData:', gestaoData);
        console.log('  - Projetos:', gestaoData.projetos);
        console.log('  - Sub Projetos:', gestaoData.subprojetos);
        console.log('  - Supervisores:', gestaoData.supervisores);
        console.log('  - Equipes:', gestaoData.equipes);
        console.log('  - Cidades:', gestaoData.cidades);
        
        console.log('2. Headers da tabela dinâmica:');
        console.log('  - dynamicTableData.headers:', dynamicTableData.headers);
        
        console.log('3. Testando criação do formulário...');
        criarFormularioDinamico();
    };
    
    // Função para forçar correção dos dados e teste
    window.forcarCorrecaoFormulario = function() {
        console.log('🔧 Forçando correção do formulário dinâmico...');
        
        // 1. Reorganizar dados da gestão
        reorganizarGestaoData();
        
        // 2. Aguardar e verificar dados
        setTimeout(() => {
            console.log('✅ Dados reorganizados:');
            console.log('  - Projetos:', gestaoData.projetos.map(p => p.nome));
            console.log('  - Sub Projetos:', gestaoData.subprojetos.map(sp => sp.nome));
            console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : 'Nenhum');
            console.log('  - Supervisores:', gestaoData.supervisores.map(s => s.nome));
            console.log('  - Equipes:', gestaoData.equipes.map(e => e.nome));
            console.log('  - Cidades:', gestaoData.cidades.map(c => c.nome));
            
            // 3. Abrir formulário
            abrirNovoEndereco();
        }, 200);
    };
    
    // Função para limpar e recriar dados
    window.limparERecriarDados = function() {
        console.log('🧹 Limpando e recriando dados da gestão...');
        
        // 1. Limpar localStorage
        localStorage.removeItem('gestaoData');
        
        // 2. Recarregar página
        location.reload();
    };
    
    // Função para forçar criação de tipos de ação
    window.forcarTiposAcao = async function() {
        console.log('🔧 Forçando criação de tipos de ação...');
        
        // 1. Verificar dados atuais
        console.log('📊 Dados atuais de tiposAcao:', gestaoData.tiposAcao);
        
        // 2. Forçar criação de tipos de ação
        gestaoData.tiposAcao = [
            { id: 1, nome: 'ATIVAÇÃO', categoria: 'ATIVAÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 2, nome: 'CONSTRUÇÃO', categoria: 'CONSTRUÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 3, nome: 'VISTORIA', categoria: 'VISTORIA', status: 'ATIVO', created_at: new Date().toISOString() }
        ];
        
        // 3. Salvar no localStorage
        await salvarDadosFirestore('gestaoData', gestaoData);
        
        // 4. Verificar se foi salvo
        console.log('✅ Tipos de ação criados:', gestaoData.tiposAcao.map(ta => ta.nome));
        
        // 5. Abrir formulário para testar
        setTimeout(() => {
            abrirNovoEndereco();
        }, 100);
    };
    
    // Função para verificar e corrigir todos os dados
    window.verificarECorrigirDados = function() {
        console.log('🔍 Verificando e corrigindo todos os dados...');
        
        // 1. Verificar estrutura atual
        console.log('📊 Estrutura atual:');
        console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.length : 0);
        console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.length : 0);
        console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
        console.log('  - Supervisores:', gestaoData.supervisores ? gestaoData.supervisores.length : 0);
        console.log('  - Equipes:', gestaoData.equipes ? gestaoData.equipes.length : 0);
        console.log('  - Cidades:', gestaoData.cidades ? gestaoData.cidades.length : 0);
        
        // 2. Forçar reorganização completa
        reorganizarGestaoData();
        
        // 3. Verificar após correção
        setTimeout(() => {
            console.log('✅ Estrutura após correção:');
            console.log('  - Projetos:', gestaoData.projetos.map(p => p.nome));
            console.log('  - Sub Projetos:', gestaoData.subprojetos.map(sp => sp.nome));
            console.log('  - Tipos de Ação:', gestaoData.tiposAcao.map(ta => ta.nome));
            console.log('  - Supervisores:', gestaoData.supervisores.map(s => s.nome));
            console.log('  - Equipes:', gestaoData.equipes.map(e => e.nome));
            console.log('  - Cidades:', gestaoData.cidades.map(c => c.nome));
            
            // 4. Abrir formulário
            abrirNovoEndereco();
        }, 200);
    };
    
    // Função para sincronizar dados da gestão com formulário dinâmico
    window.sincronizarGestaoComFormulario = async function() {
        console.log('🔄 Sincronizando dados da gestão com formulário dinâmico...');
        
        // 1. Recarregar tabelas da gestão para atualizar dados
        loadGestaoTables();
        
        // 2. Aguardar carregamento e verificar dados
        setTimeout(async () => {
            console.log('📊 Dados da gestão após recarregamento:');
            console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : 'Nenhum');
            console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : 'Nenhum');
            console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : 'Nenhum');
            console.log('  - Supervisores:', gestaoData.supervisores ? gestaoData.supervisores.map(s => s.nome) : 'Nenhum');
            console.log('  - Equipes:', gestaoData.equipes ? gestaoData.equipes.map(e => e.nome) : 'Nenhum');
            console.log('  - Cidades:', gestaoData.cidades ? gestaoData.cidades.map(c => c.nome) : 'Nenhum');
            
            // 3. Salvar dados atualizados
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 4. Abrir formulário dinâmico
            abrirNovoEndereco();
        }, 500);
    };
    
    // Função para atualizar tipos de ação especificamente
    window.atualizarTiposAcao = async function() {
        console.log('🔧 Atualizando tipos de ação...');
        
        // 1. Verificar dados atuais
        console.log('📊 Tipos de ação atuais:', gestaoData.tiposAcao);
        
        // 2. Recarregar tabela de tipos de ação
        loadActionTypesTable();
        
        // 3. Aguardar e verificar se foram atualizados
        setTimeout(async () => {
            console.log('✅ Tipos de ação após atualização:', gestaoData.tiposAcao);
            
            // 4. Salvar no localStorage
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 5. Abrir formulário para testar
            abrirNovoEndereco();
        }, 300);
    };
    
    // Função para forçar carregamento dos tipos de ação da gestão
    window.carregarTiposAcaoDaGestao = function() {
        console.log('🔄 Carregando tipos de ação da gestão...');
        
        // 1. Recarregar tabela de tipos de ação
        loadActionTypesTable();
        
        // 2. Aguardar carregamento
        setTimeout(async () => {
            // 3. Verificar dados carregados
            console.log('📊 Tipos de ação carregados:');
            console.log('  - Dados completos:', gestaoData.tiposAcao);
            console.log('  - Nomes extraídos:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            console.log('  - Quantidade:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
            
            // 4. Forçar criação de tipos de ação se não existirem
            if (!gestaoData.tiposAcao || gestaoData.tiposAcao.length === 0) {
                console.log('🔧 Criando tipos de ação padrão...');
                gestaoData.tiposAcao = [
                    { id: 1, nome: 'Instalação', categoria: 'Dinâmico', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 2, nome: 'Manutenção', categoria: 'Dinâmico', status: 'ATIVO', created_at: new Date().toISOString() }
                ];
            }
            
            // 5. Salvar no localStorage
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 6. Verificar dados finais
            console.log('✅ Dados finais dos tipos de ação:', gestaoData.tiposAcao);
            console.log('✅ Nomes finais:', gestaoData.tiposAcao.map(ta => ta.nome));
            
            // 7. Abrir formulário para testar
            abrirNovoEndereco();
        }, 500);
    };
    
    // Função para verificar e corrigir dropdown específico
    window.verificarDropdownTiposAcao = function() {
        console.log('🔍 Verificando dropdown de tipos de ação...');
        
        // 1. Verificar se o formulário está aberto
        const modal = document.getElementById('crudModal');
        if (!modal || modal.style.display !== 'block') {
            console.log('❌ Modal não está aberto, abrindo...');
            abrirNovoEndereco();
            setTimeout(() => verificarDropdownTiposAcao(), 1000);
            return;
        }
        
        // 2. Procurar o dropdown de tipos de ação
        const dropdown = document.getElementById('tipodeao');
        if (!dropdown) {
            console.log('❌ Dropdown tipodeao não encontrado');
            return;
        }
        
        console.log('✅ Dropdown encontrado:', dropdown);
        console.log('  - Tag:', dropdown.tagName);
        console.log('  - Opções atuais:', dropdown.options.length);
        
        // 3. Verificar dados da gestão
        console.log('📊 Dados da gestão:');
        console.log('  - gestaoData.tiposAcao:', gestaoData.tiposAcao);
        console.log('  - Nomes:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
        
        // 4. Forçar atualização do dropdown
        if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
            const opcoes = gestaoData.tiposAcao.map(ta => ta.nome).filter(nome => nome && nome.trim() !== '');
            console.log('🔄 Atualizando dropdown com opções:', opcoes);
            
            // Limpar opções existentes (exceto a primeira)
            const placeholder = dropdown.options[0];
            dropdown.innerHTML = '';
            dropdown.appendChild(placeholder);
            
            // Adicionar novas opções
            opcoes.forEach(opcao => {
                const option = document.createElement('option');
                option.value = opcao;
                option.textContent = opcao;
                dropdown.appendChild(option);
            });
            
            console.log('✅ Dropdown atualizado com', opcoes.length, 'opções');
        } else {
            console.log('❌ Nenhum tipo de ação encontrado na gestão');
        }
    };
    
    // Função para forçar inserção dos tipos de ação
    window.forcarTiposAcao = function() {
        console.log('🔧 Forçando inserção dos tipos de ação...');
        
        // 1. Recarregar dados da gestão primeiro
        console.log('🔄 Recarregando dados da gestão...');
        loadGestaoTables();
        
        // 2. Aguardar carregamento e verificar dados
        setTimeout(async () => {
            console.log('📊 Dados da gestão carregados:');
            console.log('  - Tipos de ação:', gestaoData.tiposAcao);
            console.log('  - Quantidade:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
            console.log('  - Nomes:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            
            // 3. Salvar dados atualizados
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 4. Abrir formulário
            abrirNovoEndereco();
            
            // 5. Aguardar e forçar atualização do dropdown
            setTimeout(() => {
                const dropdown = document.getElementById('tipodeao');
                if (dropdown) {
                    console.log('🎯 Forçando atualização do dropdown tipodeao...');
                    console.log('  - Opções atuais:', dropdown.options.length);
                    
                    // Limpar dropdown
                    dropdown.innerHTML = '<option value="">Selecione tipo de ação...</option>';
                    
                    if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
                        gestaoData.tiposAcao.forEach(tipo => {
                            const option = document.createElement('option');
                            option.value = tipo.nome;
                            option.textContent = tipo.nome;
                            dropdown.appendChild(option);
                        });
                        
                        console.log('✅ Dropdown atualizado com opções:', gestaoData.tiposAcao.map(ta => ta.nome));
                    } else {
                        console.log('❌ Nenhum tipo de ação encontrado na gestão');
                    }
                } else {
                    console.log('❌ Dropdown não encontrado');
                }
            }, 1000);
        }, 500);
    };
    
    // Função para sincronizar dados da nova planilha
    window.sincronizarNovaPlanilha = function() {
        console.log('🔄 Sincronizando dados da nova planilha...');
        
        // 1. Verificar dados da tabela dinâmica
        console.log('📊 Dados da tabela dinâmica:');
        console.log('  - Headers:', dynamicTableData.headers);
        console.log('  - Quantidade de registros:', dynamicTableData.data.length);
        
        // 2. Recarregar tabelas da gestão para pegar novos dados
        loadGestaoTables();
        
        // 3. Aguardar e verificar dados atualizados
        setTimeout(async () => {
            console.log('📊 Dados da gestão após sincronização:');
            console.log('  - Tipos de ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            console.log('  - Quantidade:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
            
            // 4. Salvar dados atualizados
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 5. Abrir formulário para testar
            abrirNovoEndereco();
        }, 1000);
    };
    
    // Função para carregar dados da gestão de projetos
    window.carregarDadosGestaoProjetos = function() {
        console.log('🔄 Carregando dados da gestão de projetos...');
        
        // 1. Verificar dados atuais da gestão
        console.log('📊 Dados atuais da gestão:');
        console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : []);
        console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : []);
        console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
        
        // 2. Recarregar tabelas da gestão
        loadGestaoTables();
        
        // 3. Aguardar carregamento
        setTimeout(async () => {
            console.log('✅ Dados da gestão carregados:');
            console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : []);
            console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : []);
            console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            
            // 4. Salvar dados atualizados
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // 5. Abrir formulário dinâmico
            abrirNovoEndereco();
        }, 500);
    };
    
    // Função para recriar dropdown de tipos de ação
    window.recriarDropdownTiposAcao = function() {
        console.log('🔧 Recriando dropdown de tipos de ação...');
        
        // 1. Recarregar dados da tabela "Tipos de Ação"
        loadActionTypesTable();
        
        // 2. Aguardar carregamento
        setTimeout(async () => {
            console.log('📊 Dados da tabela "Tipos de Ação":');
            console.log('  - Dados completos:', gestaoData.tiposAcao);
            console.log('  - Nomes da coluna "nome":', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            
            // 3. Filtrar nomes únicos
            if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
                const nomesUnicos = [...new Set(gestaoData.tiposAcao.map(ta => ta.nome).filter(nome => nome && nome.trim() !== ''))];
                console.log('✅ Nomes únicos filtrados:', nomesUnicos);
                
                // 4. Salvar dados atualizados
                await salvarDadosFirestore('gestaoData', gestaoData);
                
                // 5. Abrir formulário para testar
                abrirNovoEndereco();
            } else {
                console.log('❌ Nenhum dado encontrado na tabela "Tipos de Ação"');
            }
        }, 500);
    };
    
    // Função para sincronizar tipos de ação da planilha dinâmica com a gestão
    window.sincronizarTiposAcaoDaPlanilha = async function() {
        console.log('🔄 Sincronizando tipos de ação da planilha dinâmica...');
        
        // 1. Verificar se há dados na planilha dinâmica
        if (!dynamicTableData.data || dynamicTableData.data.length === 0) {
            console.log('❌ Nenhum dado encontrado na planilha dinâmica');
            return;
        }
        
        // 2. Encontrar a coluna "TIPO DE AÇÃO" na planilha
        const headers = dynamicTableData.headers || [];
        const tipoAcaoIndex = headers.findIndex(header => 
            header.toUpperCase().includes('TIPO DE AÇÃO') || 
            header.toUpperCase().includes('TIPO DE AÇAO')
        );
        
        if (tipoAcaoIndex === -1) {
            console.log('❌ Coluna "TIPO DE AÇÃO" não encontrada na planilha dinâmica');
            return;
        }
        
        // 3. Extrair tipos de ação únicos da planilha
        const tiposAcaoPlanilha = new Set();
        dynamicTableData.data.forEach(row => {
            const tipoAcao = row[tipoAcaoIndex];
            if (tipoAcao && tipoAcao.trim() !== '') {
                tiposAcaoPlanilha.add(tipoAcao.trim());
            }
        });
        
        console.log('📊 Tipos de ação encontrados na planilha:', Array.from(tiposAcaoPlanilha));
        
        // 4. Verificar tipos de ação existentes na gestão
        const tiposExistentes = gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : [];
        console.log('📊 Tipos de ação existentes na gestão:', tiposExistentes);
        
        // 5. Adicionar novos tipos de ação à gestão
        let novosAdicionados = 0;
        tiposAcaoPlanilha.forEach(tipo => {
            if (!tiposExistentes.includes(tipo)) {
                const novoTipo = {
                    id: Date.now() + Math.random(),
                    nome: tipo,
                    descricao: `Tipo de ação extraído da planilha dinâmica: ${tipo}`,
                    categoria: 'Dinâmico',
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                };
                
                if (!gestaoData.tiposAcao) {
                    gestaoData.tiposAcao = [];
                }
                
                gestaoData.tiposAcao.push(novoTipo);
                novosAdicionados++;
                console.log(`✅ Adicionado novo tipo de ação: ${tipo}`);
            }
        });
        
        // 6. Salvar dados atualizados
        await salvarDadosFirestore('gestaoData', gestaoData);
        
        // 7. Recarregar tabela da gestão
        loadActionTypesTable();
        
        console.log(`🎉 Sincronização concluída! ${novosAdicionados} novos tipos de ação adicionados.`);
        console.log('📊 Total de tipos de ação na gestão:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
        
        // 8. Abrir formulário para testar
        setTimeout(() => {
            abrirNovoEndereco();
        }, 500);
    };
    
    // Função para forçar sincronização manual
    window.forcarSincronizacaoTiposAcao = function() {
        console.log('🔧 Forçando sincronização de tipos de ação...');
        
        // 1. Verificar dados da planilha dinâmica
        console.log('📊 Dados da planilha dinâmica:');
        console.log('  - Headers:', dynamicTableData.headers);
        console.log('  - Quantidade de registros:', dynamicTableData.data.length);
        
        if (dynamicTableData.data.length > 0) {
            console.log('  - Primeira linha:', dynamicTableData.data[0]);
        }
        
        // 2. Executar sincronização
        if (typeof window.sincronizarTiposAcaoDaPlanilha === 'function') {
            window.sincronizarTiposAcaoDaPlanilha();
        } else {
            console.log('❌ Função de sincronização não encontrada');
        }
    };
    
    // Função para verificar e corrigir dropdown de tipos de ação
    window.verificarDropdownTiposAcaoFinal = function() {
        console.log('🔍 Verificação final do dropdown de tipos de ação...');
        
        // 1. Recarregar dados da gestão
        loadGestaoTables();
        
        // 2. Aguardar carregamento
        setTimeout(() => {
            console.log('📊 Dados da gestão após recarregamento:');
            console.log('  - Tipos de ação na gestão:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
            console.log('  - Nomes dos tipos:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
            
            // 3. Abrir formulário dinâmico
            abrirNovoEndereco();
            
            // 4. Aguardar e verificar dropdown
            setTimeout(() => {
                const modal = document.getElementById('crudModal');
                if (!modal || modal.style.display !== 'block') {
                    console.log('❌ Modal não está aberto');
                    return;
                }
                
                // Encontrar dropdown de tipos de ação
                const headers = dynamicTableData.headers || [];
                const tipoAcaoHeader = headers.find(header => 
                    header.toUpperCase().includes('TIPO DE AÇÃO') || 
                    header.toUpperCase().includes('TIPO DE AÇAO')
                );
                
                if (tipoAcaoHeader) {
                    const campoId = tipoAcaoHeader.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                    const dropdown = document.getElementById(campoId);
                    
                    if (dropdown) {
                        console.log('✅ Dropdown encontrado:', dropdown);
                        console.log('  - Opções atuais:', dropdown.options.length);
                        
                        // Limpar e recriar opções
                        dropdown.innerHTML = '<option value="">Selecione tipo de ação...</option>';
                        
                        if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
                            gestaoData.tiposAcao.forEach(tipo => {
                                const option = document.createElement('option');
                                option.value = tipo.nome;
                                option.textContent = tipo.nome;
                                dropdown.appendChild(option);
                            });
                            
                            console.log('✅ Dropdown atualizado com opções:', gestaoData.tiposAcao.map(ta => ta.nome));
                        } else {
                            console.log('❌ Nenhum tipo de ação encontrado na gestão');
                        }
                    } else {
                        console.log('❌ Dropdown não encontrado com ID:', campoId);
                    }
                } else {
                    console.log('❌ Header de tipo de ação não encontrado');
                }
            }, 1000);
        }, 500);
    };
    // Função para resolver tudo de uma vez
    window.resolverTiposAcaoCompleto = function() {
        console.log('🚀 Resolvendo tipos de ação completo...');
        
        // 1. Verificar dados da planilha dinâmica
        console.log('📊 Verificando dados da planilha:');
        console.log('  - Headers:', dynamicTableData.headers);
        console.log('  - Quantidade de registros:', dynamicTableData.data.length);
        
        // 2. Sincronizar tipos de ação da planilha com a gestão
        if (typeof window.sincronizarTiposAcaoDaPlanilha === 'function') {
            console.log('🔄 Sincronizando tipos de ação...');
            window.sincronizarTiposAcaoDaPlanilha();
        }
        
        // 3. Aguardar sincronização e verificar dropdown
        setTimeout(() => {
            console.log('🔍 Verificando dropdown...');
            if (typeof window.verificarDropdownTiposAcaoFinal === 'function') {
                window.verificarDropdownTiposAcaoFinal();
            }
        }, 2000);
    };
    
    // Função para corrigir problema do tipo de ação
    window.corrigirProblemaTipoAcao = async function() {
        console.log('🔧 Corrigindo problema do "TIPO DE AÇÃO"...');
        
        // 1. Verificar se a coluna existe na planilha
        const headers = dynamicTableData.headers || [];
        console.log('📊 Headers da planilha:', headers);
        
        const tipoAcaoHeader = headers.find(header => 
            header.toUpperCase().includes('TIPO DE AÇÃO') || 
            header.toUpperCase().includes('TIPO DE AÇAO')
        );
        
        if (tipoAcaoHeader) {
            console.log('✅ Header encontrado:', tipoAcaoHeader);
            
            // 2. Encontrar índice da coluna
            const tipoAcaoIndex = headers.indexOf(tipoAcaoHeader);
            console.log('📊 Índice da coluna:', tipoAcaoIndex);
            
            // 3. Extrair valores únicos da coluna
            const tiposAcaoPlanilha = new Set();
            dynamicTableData.data.forEach(row => {
                const tipoAcao = row[tipoAcaoHeader];
                if (tipoAcao && tipoAcao.toString().trim() !== '') {
                    tiposAcaoPlanilha.add(tipoAcao.toString().trim());
                }
            });
            
            console.log('📊 Tipos de ação encontrados na planilha:', Array.from(tiposAcaoPlanilha));
            
            // 4. Verificar se já existem na gestão
            const tiposExistentes = gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : [];
            console.log('📊 Tipos existentes na gestão:', tiposExistentes);
            
            // 5. Adicionar novos tipos à gestão
            let novosAdicionados = 0;
            tiposAcaoPlanilha.forEach(tipo => {
                if (!tiposExistentes.includes(tipo)) {
                    const novoTipo = {
                        id: Date.now() + Math.random(),
                        nome: tipo,
                        descricao: `Tipo de ação extraído da planilha dinâmica: ${tipo}`,
                        categoria: 'Dinâmico',
                        status: 'ATIVO',
                        created_at: new Date().toISOString()
                    };
                    
                    if (!gestaoData.tiposAcao) {
                        gestaoData.tiposAcao = [];
                    }
                    
                    gestaoData.tiposAcao.push(novoTipo);
                    novosAdicionados++;
                    console.log(`✅ Adicionado novo tipo de ação: ${tipo}`);
                }
            });
            
            // 6. Salvar e recarregar
            await salvarDadosFirestore('gestaoData', gestaoData);
            loadActionTypesTable();
            
            console.log(`🎉 Correção concluída! ${novosAdicionados} novos tipos de ação adicionados.`);
            
            // 7. Abrir formulário para testar
            setTimeout(() => {
                abrirNovoEndereco();
            }, 500);
            
        } else {
            console.log('❌ Header "TIPO DE AÇÃO" não encontrado na planilha');
            console.log('📊 Headers disponíveis:', headers);
        }
    };

    
    // Funções Gestão
    window.openGestaoModal = openGestaoModal;
    window.closeGestaoModal = closeGestaoModal;
    window.showGestaoTab = showGestaoTab;
    window.saveProject = saveProject;
    window.saveSubProject = saveSubProject;
    window.saveActionType = saveActionType;
    window.saveSupervisor = saveSupervisor;
    window.saveTeam = saveTeam;
    window.saveCity = saveCity;
    
    // Funções de Edição e Exclusão - Gestão
    window.editProject = editProject;
    window.deleteProject = deleteProject;
    window.editSubProject = editSubProject;
    window.deleteSubProject = deleteSubProject;
    window.editActionType = editActionType;
    window.deleteActionType = deleteActionType;
    window.editSupervisor = editSupervisor;
    window.deleteSupervisor = deleteSupervisor;
    window.editTeam = editTeam;
    window.deleteTeam = deleteTeam;
    window.editCity = editCity;
    window.deleteCity = deleteCity;
    
    // Funções de Filtro
    window.filterTable = filterTable;
    window.filterByStatus = filterByStatus;
    
    // Outras funções
    window.showExportMenu = showExportMenu;
    
    // Funções do Módulo Analítico (removidas - não implementadas)
    // window.createAnalyticalCharts = createAnalyticalCharts;
    // window.forceUpdateAnalyticalCharts = forceUpdateAnalyticalCharts;
    
    // Funções do Painel Analítico (removidas - não implementadas)
    // window.showAnalyticsTab = showAnalyticsTab;
    // window.updateAnalytics = updateAnalytics;
    // window.clearAnalyticsFilters = clearAnalyticsFilters;
    // window.exportAnalyticsReport = exportAnalyticsReport;
    // window.refreshAnalytics = refreshAnalytics;
    // window.configureAnalytics = configureAnalytics;
}

// Inicializar funcionalidade de login
function initializeLogin() {
    console.log('🔐 Configurando sistema de login...');
    
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const remember = document.getElementById('remember').checked;
        
        console.log('🔑 Tentativa de login:', username);
        
        // Tentar login com Firebase primeiro (se disponível)
        if (typeof window.loginWithEmailPassword === 'function') {
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Desabilitar botão durante o login
                submitBtn.disabled = true;
                submitBtn.textContent = 'Entrando...';
                
                // Fazer login com Firebase
                const result = await window.loginWithEmailPassword(username, password);
                
                if (result.success) {
                    console.log('✅ Login Firebase realizado com sucesso');
                    // O redirecionamento será feito automaticamente pelo onAuthStateChanged
                    return;
                } else {
                    console.log('❌ Erro no login Firebase:', result.error);
                    showError('Erro no login', result.error);
                }
                
            } catch (error) {
                console.error('❌ Erro inesperado no login Firebase:', error);
                showError('Erro no login', 'Erro interno. Tente novamente.');
            } finally {
                // Reabilitar botão
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            
            return; // Sair aqui para usar apenas Firebase
        }
        
        // Sistema de login local (fallback se Firebase não estiver disponível)
        console.log('⚠️ Firebase não disponível, usando sistema local');
        
        // Carregar usuários do localStorage
        loadUsersFromStorage();
        
        // Buscar usuário por username ou email
        let user = null;
        const searchKey = username.toLowerCase();
        
        console.log('🔍 Procurando usuário:', searchKey);
        console.log('🗂️ Usuários disponíveis:', Object.keys(usersData));
        
        // Procurar por ID/username primeiro
        if (usersData[searchKey]) {
            user = usersData[searchKey];
            console.log('✅ Usuário encontrado por ID:', user.name);
        } else {
            // Procurar por email
            for (const userId in usersData) {
                if (usersData[userId].email === searchKey) {
                    user = usersData[userId];
                    console.log('✅ Usuário encontrado por email:', user.name);
                    break;
                }
            }
        }
        
        if (!user) {
            console.log('❌ Usuário não encontrado');
        }
        
        // Validação de login com verificação de usuário e senha
        if (user && password === user.password) {
            // Salvar dados de sessão se "lembrar de mim" estiver marcado
            if (remember) {
                localStorage.setItem('mdu_user', username);
            }
            
            // Salvar sessão atual com informações do usuário
            sessionStorage.setItem('mdu_logged_in', 'true');
            sessionStorage.setItem('mdu_user', username);
            sessionStorage.setItem('mdu_user_role', user.role);
            sessionStorage.setItem('mdu_user_name', user.name);
            
            console.log('✅ Login realizado com sucesso:', user.name, '- Nível:', user.role);
            
            // Redirecionar para dashboard
            window.location.href = 'dashboard.html';
        } else {
            alert('❌ Usuário ou senha incorretos!\n\nVerifique suas credenciais e tente novamente.');
        }
    });
    
    // Verificar se há usuário salvo para preencher o campo
    const savedUser = localStorage.getItem('mdu_user');
    if (savedUser) {
        document.getElementById('username').value = savedUser;
        document.getElementById('remember').checked = true;
    }

    // Esqueci a senha
    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }
}

// ========== SISTEMA DE CADASTRO DE USUÁRIOS ==========

// Inicializar funcionalidade de cadastro
function initializeRegister() {
    console.log('🔐 Configurando sistema de cadastro...');
    
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    // Carregar usuários do localStorage se existirem
    loadUsersFromStorage();
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        console.log('📝 Tentativa de cadastro:', email);
        
        // Validações
        if (!validateRegisterForm(firstName, lastName, email, password, confirmPassword, agreeTerms)) {
            return;
        }
        
        // Debug: verificar se Firebase está disponível
        console.log('🔍 Debug cadastro completo:', {
            registerWithEmailPassword: typeof registerWithEmailPassword,
            window_registerWithEmailPassword: typeof window.registerWithEmailPassword,
            firebase_available: typeof firebase !== 'undefined',
            auth_available: typeof window.auth,
            db_available: typeof window.db,
            firebase_config: typeof firebaseConfig
        });
        
        // Tentar registro com Firebase primeiro (se disponível)
        if (typeof window.registerWithEmailPassword === 'function') {
            console.log('✅ Função window.registerWithEmailPassword encontrada, iniciando cadastro Firebase...');
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                // Desabilitar botão durante o registro
                submitBtn.disabled = true;
                submitBtn.textContent = 'Criando conta...';
                
                // Fazer registro com Firebase
                const displayName = `${firstName} ${lastName}`;
                const result = await window.registerWithEmailPassword(email, password, displayName);
                
                if (result.success) {
                    console.log('✅ Cadastro Firebase realizado com sucesso');
                    showSuccess('Cadastro Realizado!', 
                        `Bem-vindo(a) ${firstName}! Seu cadastro foi realizado com sucesso.\n\nVocê será redirecionado automaticamente.`);
                    
                    // O redirecionamento será feito automaticamente pelo onAuthStateChanged
                    return;
                } else {
                    console.log('❌ Erro no cadastro Firebase:', result.error);
                    showError('Erro no Cadastro', result.error);
                }
                
            } catch (error) {
                console.error('❌ Erro inesperado no cadastro Firebase:', error);
                showError('Erro no Cadastro', 'Erro interno. Tente novamente.');
            } finally {
                // Reabilitar botão
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            
            return; // Sair aqui para usar apenas Firebase
        }
        
        // Sistema de cadastro local (fallback se Firebase não estiver disponível)
        console.log('⚠️ Firebase não disponível, usando sistema local');
        
        // Verificar se email já existe
        if (checkEmailExists(email)) {
            showError('Erro no Cadastro', 'Este e-mail já está cadastrado no sistema!');
            return;
        }
        
        // Criar novo usuário
        const newUser = createNewUser(firstName, lastName, email, password);
        
        // Salvar usuário
        if (saveNewUser(newUser)) {
            showSuccess('Cadastro Realizado!', 
                `Bem-vindo(a) ${firstName}! Seu cadastro foi realizado com sucesso.\n\nVocê pode fazer login agora com suas credenciais.`);
            
            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showError('Erro no Cadastro', 'Erro interno. Tente novamente mais tarde.');
        }
    });
    
    // Validação de senha em tempo real
    setupPasswordValidation();
}

// Validar formulário de cadastro
function validateRegisterForm(firstName, lastName, email, password, confirmPassword, agreeTerms) {
    // Verificar campos obrigatórios
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showError('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios.');
        return false;
    }
    
    // Verificar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Email Inválido', 'Por favor, digite um endereço de email válido.');
        return false;
    }
    
    // Verificar força da senha
    if (password.length < 6) {
        showError('Senha Fraca', 'A senha deve ter pelo menos 6 caracteres.');
        return false;
    }
    
    // Verificar se senhas coincidem
    if (password !== confirmPassword) {
        showError('Senhas Diferentes', 'As senhas digitadas não coincidem.');
        return false;
    }
    
    // Verificar termos de uso
    if (!agreeTerms) {
        showError('Termos de Uso', 'Você deve concordar com os termos de uso para continuar.');
        return false;
    }
    
    return true;
}

// ========== SISTEMA OBSOLETO REMOVIDO ==========
// REMOVIDAS: Funções de usuários locais (checkEmailExists, createNewUser, saveNewUser, loadUsersFromStorage)
// Agora tudo é gerenciado pelo Firebase Auth + Firestore

// Configurar validação de senha em tempo real
function setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    if (!passwordInput || !confirmPasswordInput) return;
    
    confirmPasswordInput.addEventListener('input', function() {
        const password = passwordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '';
        }
    });
}

// Função para fazer logout
async function logout() {
    console.log('🚪 Fazendo logout...');
    
    // Tentar logout com Firebase primeiro (se disponível)
    if (typeof logout === 'function' && window.firebase && window.firebase.auth) {
        try {
            const result = await window.logout();
            if (result && result.success) {
                console.log('✅ Logout Firebase realizado com sucesso');
                return; // O redirecionamento será feito pelo onAuthStateChanged
            }
        } catch (error) {
            console.error('❌ Erro no logout Firebase:', error);
        }
    }
    
    // Fallback para logout local
    console.log('⚠️ Fazendo logout local');
    sessionStorage.removeItem('mdu_logged_in');
    sessionStorage.removeItem('mdu_user');
    sessionStorage.removeItem('mdu_user_role');
    sessionStorage.removeItem('mdu_user_name');
    window.location.href = 'index.html';
}

// ====== SISTEMA DE PERMISSÕES ======

// Função para verificar se usuário está logado
function checkAuthentication() {
    const isLoggedIn = sessionStorage.getItem('mdu_logged_in');
    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Função para obter informações do usuário logado
function getCurrentUser() {
    return {
        username: sessionStorage.getItem('mdu_user'),
        role: sessionStorage.getItem('mdu_user_role'),
        name: sessionStorage.getItem('mdu_user_name')
    };
}

// Função para verificar permissões
function hasPermission(action) {
    const user = getCurrentUser();
    if (!user.role) return false;
    
    const permissions = {
        'admin': ['view', 'create', 'edit', 'delete', 'upload', 'export', 'manage'],
        'manager': ['view', 'create', 'edit', 'delete', 'upload', 'export'],
        'gestor': ['view', 'create', 'edit', 'delete', 'upload', 'export'], // Compatibilidade
        'user': ['view'],
        'usuario': ['view'] // Compatibilidade
    };
    
    return permissions[user.role] && permissions[user.role].includes(action);
}

// ========== SISTEMA DE CONTROLE DE ACESSO VISUAL ==========

// Aplicar controle de acesso baseado no role do usuário
function applyAccessControl() {
    const user = getCurrentUser();
    
    if (!user || !user.role) {
        console.log('⚠️ Usuário não autenticado, redirecionando...');
        window.location.href = 'index.html';
        return;
    }
    
    console.log('🔐 Aplicando controle de acesso para:', user.role);
    
    // Definir quais seções cada role pode acessar
    const accessControl = {
        'admin': {
            sections: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
            hideElements: []
        },
        'manager': {
            sections: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
            hideElements: []
        },
        'gestor': {
            sections: ['inicio', 'infraestrutura', 'enderecos', 'gestao-projetos'],
            hideElements: []
        },
        'user': {
            sections: ['inicio', 'infraestrutura'],
            hideElements: ['.btn-upload', '.btn-primary[onclick*="openGestaoModal"]', 'button[onclick*="abrirNovoEndereco"]']
        },
        'usuario': {
            sections: ['inicio', 'infraestrutura'],
            hideElements: ['.btn-upload', '.btn-primary[onclick*="openGestaoModal"]', 'button[onclick*="abrirNovoEndereco"]']
        }
    };
    
    const userAccess = accessControl[user.role];
    if (!userAccess) {
        console.error('❌ Role não reconhecido:', user.role);
        return;
    }
    
    // Controlar visibilidade dos itens do menu
    controlMenuVisibility(userAccess.sections);
    
    // Esconder elementos específicos
    hideRestrictedElements(userAccess.hideElements);
    
    // Atualizar informações do usuário na interface
    updateUserInterface(user);
    
    console.log('✅ Controle de acesso aplicado com sucesso');
}

// Controlar visibilidade dos itens do menu lateral
function controlMenuVisibility(allowedSections) {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    
    menuItems.forEach(item => {
        const link = item.querySelector('a');
        if (!link) return;
        
        const onclick = link.getAttribute('onclick');
        if (!onclick) return;
        
        // Extrair nome da seção do onclick
        const sectionMatch = onclick.match(/showSection\('([^']+)'/);
        if (!sectionMatch) return;
        
        const sectionName = sectionMatch[1];
        
        if (allowedSections.includes(sectionName)) {
            // Mostrar item permitido
            item.style.display = '';
            item.classList.remove('hidden-by-permission');
        } else {
            // Esconder item não permitido
            item.style.display = 'none';
            item.classList.add('hidden-by-permission');
        }
    });
}

// Esconder elementos específicos baseado em permissões
function hideRestrictedElements(elementsToHide) {
    elementsToHide.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.style.display = 'none';
            element.classList.add('hidden-by-permission');
        });
    });
}

// Atualizar interface do usuário (nome, role, avatar)
function updateUserInterface(user) {
    // Atualizar nome do usuário
    const userNameElements = document.querySelectorAll('#userNameSimple, #dropdownUserName');
    userNameElements.forEach(element => {
        if (element) element.textContent = user.name || 'Usuário';
    });
    
    // Atualizar role do usuário
    const userRoleElements = document.querySelectorAll('#userRoleSimple');
    userRoleElements.forEach(element => {
        if (element) {
            element.textContent = getRoleDisplayName(user.role);
            element.className = `user-role-simple ${user.role.toLowerCase()}`;
        }
    });
    
    // Atualizar email (se disponível)
    const userEmailElements = document.querySelectorAll('#dropdownUserEmail');
    userEmailElements.forEach(element => {
        if (element) {
            // Tentar obter email do usuário atual
            const currentUserData = findCurrentUserData(user.username);
            element.textContent = currentUserData?.email || 'usuario@inovar.com';
        }
    });
    
    // Atualizar avatars com iniciais
    updateUserAvatars(user.name || 'Usuario');
}

// Obter nome de exibição da role
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'ADMIN',
        'manager': 'GESTOR', 
        'gestor': 'GESTOR',
        'user': 'USER',
        'usuario': 'USER'
    };
    return roleNames[role] || role.toUpperCase();
}

// Encontrar dados completos do usuário atual
function findCurrentUserData(username) {
    loadUsersFromStorage();
    
    // Procurar por username/email
    for (const userId in usersData) {
        const userData = usersData[userId];
        if (userData.id === username || userData.email === username.toLowerCase()) {
            return userData;
        }
    }
    return null;
}

// Atualizar avatars com iniciais do nome
function updateUserAvatars(fullName) {
    const initials = fullName.split(' ').map(name => name.charAt(0)).join('').substring(0, 2).toUpperCase();
    
    const avatarElements = document.querySelectorAll('#userAvatarSimple, #userAvatarLarge');
    avatarElements.forEach(img => {
        if (img) {
            img.src = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=${img.id === 'userAvatarLarge' ? '60' : '40'}`;
        }
    });
}

// Função para aplicar restrições baseadas no papel do usuário
function applyPermissions() {
    const user = getCurrentUser();
    console.log('🔒 Aplicando permissões para:', user.name, '- Papel:', user.role);
    
    // Atualizar informações do usuário na interface
    updateUserInterface(user);
    
    // Aplicar restrições baseadas no papel
    if (user.role === 'usuario') {
        // Usuário: apenas visualização
        hideElementsForUser();
        disableInteractions();
    } else if (user.role === 'gestor') {
        // Gestor: pode tudo exceto algumas funções administrativas
        hideAdminOnlyFeatures();
    }
    // Admin: acesso total (nenhuma restrição)
}

// Função para atualizar a interface com informações do usuário
function updateUserInterface(user) {
    // Atualizar nome do usuário
    const userNameElements = ['userNameSimple', 'dropdownUserName'];
    userNameElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = user.name || 'Usuário';
    });
    
    // Atualizar papel do usuário
    const userRoleElement = document.getElementById('userRoleSimple');
    if (userRoleElement) {
        const roleLabels = {
            'admin': 'ADMIN',
            'gestor': 'GESTOR', 
            'usuario': 'USUÁRIO'
        };
        userRoleElement.textContent = roleLabels[user.role] || 'USER';
        
        // Adicionar classe CSS para styling do papel
        userRoleElement.className = `user-role-simple role-${user.role}`;
    }
}

// Função para ocultar elementos para usuários com permissão apenas de visualização
function hideElementsForUser() {
    console.log('👁️ Aplicando restrições de usuário (somente visualização)');
    
    // Seletores de elementos que devem ser ocultados para usuários
    const restrictedSelectors = [
        // Botões de ação
        '.btn-save', '.btn-create', '.btn-edit', '.btn-delete',
        '.btn-upload', '.btn-export', '.btn-clear',
        
        // Formulários de criação/edição
        '#createForm', '#editForm', '.crud-form',
        
        // Botões específicos
        'button[onclick*="create"]', 'button[onclick*="edit"]', 
        'button[onclick*="delete"]', 'button[onclick*="upload"]',
        'button[onclick*="clear"]', 'button[onclick*="import"]',
        
        // Seções de configuração
        '.admin-section', '.management-section',
        
        // Upload de arquivos
        '.upload-section', '#fileUploadSection',
        
        // Botões de ação em tabelas
        '.action-buttons', '.table-actions'
    ];
    
    // Ocultar módulos específicos para usuários (Cadastro de Endereços e Gestão de Projetos)
    const restrictedModules = [
        'a[onclick*="showSection(\'enderecos\'"]', // Link do menu Cadastro de Endereços
        'a[onclick*="showSection(\'gestao-projetos\'"]' // Link do menu Gestão de Projetos  
    ];
    
    restrictedModules.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Ocultar o item de menu completamente
            const menuItem = element.closest('li');
            if (menuItem) {
                menuItem.classList.add('hidden-by-permission');
                menuItem.style.display = 'none';
            }
        });
    });
    
    // Ocultar as próprias seções de conteúdo para usuários
    const restrictedSections = ['#enderecos', '#gestao-projetos'];
    restrictedSections.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.classList.add('hidden-by-permission');
            section.style.display = 'none';
        }
    });
    
    restrictedSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('hidden-by-permission');
            element.style.display = 'none';
        });
    });
    
    // Desabilitar inputs de forma geral (mantendo os de filtro)
    const inputs = document.querySelectorAll('input:not([type="search"]):not(.filter-input), textarea, select:not(.filter-select)');
    inputs.forEach(input => {
        if (!input.classList.contains('search-input') && !input.classList.contains('filter-input')) {
            input.disabled = true;
            input.style.opacity = '0.6';
        }
    });
}

// Função para desabilitar interações para usuários
function disableInteractions() {
    // Interceptar clicks em elementos que requerem permissão de edição
    document.addEventListener('click', function(event) {
        const user = getCurrentUser();
        if (user.role !== 'usuario') return; // Só aplicar para usuários
        
        // Verificar se o elemento clicado é um botão de ação
        const target = event.target;
        const isActionButton = target.matches('button') || target.closest('button');
        
        if (isActionButton) {
            const buttonText = target.textContent || target.closest('button')?.textContent || '';
            const restrictedActions = ['criar', 'editar', 'excluir', 'salvar', 'upload', 'importar', 'limpar'];
            
            const isRestricted = restrictedActions.some(action => 
                buttonText.toLowerCase().includes(action)
            );
            
            if (isRestricted) {
                event.preventDefault();
                event.stopPropagation();
                showPermissionDenied();
                return false;
            }
        }
    }, true);
}

// Função para ocultar recursos exclusivos de admin
function hideAdminOnlyFeatures() {
    console.log('🔧 Ocultando recursos exclusivos de administrador');
    
    const adminOnlySelectors = [
        '.admin-only',
        '.system-config',
        '.user-management'
    ];
    
    adminOnlySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.classList.add('hidden-by-permission');
        });
    });
}

// Função para mostrar mensagem de acesso negado
function showPermissionDenied() {
    const user = getCurrentUser();
    const message = `❌ Acesso Negado\n\nSeu nível de acesso (${user.role.toUpperCase()}) não permite esta ação.\n\nContate um administrador para obter mais permissões.`;
    alert(message);
}

// ====== Esqueci minha senha (Local) ======
function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'block';
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'none';
}

// Handler de redefinição de senha
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('forgotPasswordForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const newPass = document.getElementById('fpNewPassword').value;
            const confirm = document.getElementById('fpConfirmPassword').value;
            if (!newPass || newPass.length < 6) {
                alert('A nova senha deve ter pelo menos 6 caracteres.');
                return;
            }
            if (newPass !== confirm) {
                alert('Confirmação diferente da nova senha.');
                return;
            }
            // Persistimos a senha localmente (mesmo mecanismo usado no perfil)
            localStorage.setItem('userPassword', newPass);
            closeForgotPasswordModal();
            alert('Senha redefinida com sucesso! Use a nova senha no próximo login.');
        });

        // UX: medidor de força e validação ao digitar
        const newInput = document.getElementById('fpNewPassword');
        const confirmInput = document.getElementById('fpConfirmPassword');
        const bar = document.getElementById('fpStrengthBar');
        const strengthText = document.getElementById('fpStrengthText');
        const mismatch = document.getElementById('fpError');
        const calcStrength = (v) => {
            let score = 0;
            if (!v) return 0;
            if (v.length >= 6) score += 25;
            if (/[A-Z]/.test(v)) score += 25;
            if (/[0-9]/.test(v)) score += 25;
            if (/[^A-Za-z0-9]/.test(v)) score += 25;
            return score;
        };
        const updateStrength = () => {
            const v = newInput.value || '';
            const score = calcStrength(v);
            if (bar) bar.style.width = score + '%';
            if (strengthText) {
                const label = score < 25 ? 'Muito fraca' : score < 50 ? 'Fraca' : score < 75 ? 'Média' : 'Forte';
                strengthText.textContent = 'Força: ' + label;
            }
        };
        const checkMatch = () => {
            if (!mismatch) return;
            const a = newInput.value || '';
            const b = confirmInput.value || '';
            mismatch.style.display = a && b && a !== b ? 'block' : 'none';
        };
        if (newInput) newInput.addEventListener('input', () => { updateStrength(); checkMatch(); });
        if (confirmInput) confirmInput.addEventListener('input', checkMatch);
    }
});

// Expor no escopo global caso necessário
window.openForgotPasswordModal = openForgotPasswordModal;
window.closeForgotPasswordModal = closeForgotPasswordModal;

// Função para alternar visibilidade da senha
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}
// Inicializar dashboard
function initializeDashboard() {
    console.log('📊 Inicializando dashboard...');
    
    try {
        // Carregar dados persistentes primeiro
        const savedData = localStorage.getItem('enderecosData');
        if (savedData) {
            enderecosData = JSON.parse(savedData);
            console.log('✅ Dados carregados do localStorage:', enderecosData.length, 'registros');
        } else {
            enderecosData = [];
            console.log('📋 Nenhum dado encontrado no localStorage, iniciando vazio');
        }
        
        // Renderizar tabela imediatamente (otimizada)
        renderEnderecosTable();
        
        console.log('📋 Dados carregados:', enderecosData.length, 'registros');
        
        // Inicializar componentes essenciais primeiro
        initializeCRUD();
        initializeGestaoData();
        
        // Garantir seção inicial ativa
        showSection('inicio');
        
        // Aplicar sistema de permissões baseado no usuário logado
        applyPermissions();
        
        // Inicializar atualização de data/hora
        initializeDateTimeUpdate();
        
        // Carregar componentes não críticos de forma assíncrona
        requestIdleCallback(() => {
            initializeUploadModal();
            populateFilters();
            updateStats();
            updateEnderecoStats();
            updateInfraStats();
            populateInfraFilters();
            populateFormSelects();
        });
        
        // Carregar gráficos apenas quando necessário (lazy loading)
        requestIdleCallback(() => {
            console.log('🚀 Criando gráficos em background...');
        }, { timeout: 2000 });
        
        // Renderizar gráfico combinado de projetos
        // createProjetosCombinedChart();
        
        console.log('✅ Dashboard inicializado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro na inicialização do dashboard:', error);
    }
}

// Cache para seções ativas
// Função principal de navegação (otimizada)
function showSection(sectionId, event) {
    // Evitar mudanças desnecessárias
    if (activeSection === sectionId) return;
    
    // Debounce para evitar múltiplas mudanças rápidas
    if (sectionChangeTimeout) {
        clearTimeout(sectionChangeTimeout);
    }
    
    sectionChangeTimeout = setTimeout(() => {
        performSectionChange(sectionId, event);
    }, 50);
}

function performSectionChange(sectionId, event) {
    console.log('🔄 Navegando para seção:', sectionId);
    
    try {
        if (event) {
            event.preventDefault();
        }

        // Esconder todas as seções (otimizado)
        const sections = document.querySelectorAll('.section');
        for (let i = 0; i < sections.length; i++) {
            sections[i].style.display = 'none';
            sections[i].classList.remove('active');
        }

        // Remover ativo de todos os links (otimizado)
        const links = document.querySelectorAll('.sidebar-menu a');
        for (let i = 0; i < links.length; i++) {
            links[i].classList.remove('active');
        }

        // Mostrar a seção selecionada
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            targetSection.classList.add('active');
            activeSection = sectionId;
            
            // Ativar link correspondente
            const activeLink = document.querySelector(`a[onclick*="${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Atualizar título
            const titleMap = {
                'inicio': 'Início',
                'infraestrutura': 'Dashboard',
                'enderecos': 'Cadastro de Endereços',
                'gestao-projetos': 'Gestão de Projetos'
            };
            
            const titleElement = document.getElementById('section-title');
            if (titleElement && titleMap[sectionId]) {
                titleElement.textContent = titleMap[sectionId];
            }
            
            // Carregar conteúdo da seção imediatamente
            loadSectionContent(sectionId);
            
            console.log('✅ Seção ativada:', sectionId);
        } else {
            console.error('❌ Seção não encontrada:', sectionId);
        }
        
    } catch (error) {
        console.error('❌ Erro ao mostrar seção:', error);
    }
}

function loadSectionContent(sectionId) {
    console.log(`📂 Carregando conteúdo da seção: ${sectionId}`);
    
    switch (sectionId) {
        case 'inicio':
            // Página inicial - atualizar todos os cards
            setTimeout(() => {
                console.log('🔄 Atualizando cards na página inicial...');
                updateDynamicStatsCards();
                updateInfraStats();
            }, 100);
            break;
        case 'infraestrutura':
            updateStats();
            updateInfraStats();
            populateInfraFilters();
            // Forçar atualização dos cards de infraestrutura
            setTimeout(() => {
                console.log('🔄 Forçando atualização dos cards de infraestrutura...');
                updateInfraStats();
            }, 200);
            // Renderizar gráfico combinado de projetos
            createProjetosCombinedChart();
        createSubProjetosCombinedChart();
        createCidadesCombinedChart();
        createHpProjetosBarChart();
        createRecebimentosBarChart();
        createSupervisorStatusBarChart();
        renderEquipeRanking();
        renderEquipeStatusRanking();
            break;
        case 'enderecos':
            renderEnderecosTable();
            updateStats();
            updateEnderecoStats();
            updateInfraStats();
            // Forçar atualização dos cards de endereços
            setTimeout(() => {
                console.log('🔄 Forçando atualização dos cards de endereços...');
                updateDynamicStatsCards();
            }, 200);
            
            // Garantir que o modal está inicializado
            setTimeout(() => {
                console.log('🔧 Verificando inicialização do modal...');
                const modal = document.getElementById('crudModal');
                if (modal) {
                    console.log('✅ Modal encontrado na seção endereços');
                } else {
                    console.error('❌ Modal não encontrado na seção endereços');
                }
            }, 300);
            break;
        case 'gestao-projetos':
            initializeGestaoData();
            loadGestaoTables();
            break;
    }
}

// Função de logout secundária (para compatibilidade)
async function logoutSecondary() {
    console.log('👋 Fazendo logout secundário...');
    
    // Usar função principal de logout
    await logout();
}

// Toggle de senha
function togglePassword(id) {
    console.log('👁️ Toggle password para:', id);
    try {
        const input = document.getElementById(id);
        if (input) {
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            
            // Trocar ícone se existir
            const button = input.parentNode.querySelector('.password-toggle i');
            if (button) {
                button.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
        }
    } catch (error) {
        console.error('❌ Erro no toggle password:', error);
    }
}

// ==================== FUNÇÕES CRUD ====================

// Abrir modal CRUD
function openModal(mode = 'create', id = null) {
    console.log('🔍 Abrindo modal CRUD:', mode, id);
    const modal = document.getElementById('crudModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('enderecoForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Debug detalhado dos elementos
    console.log('🔍 Status dos elementos do modal:', {
        modal: modal ? '✅ Encontrado' : '❌ Não encontrado',
        modalTitle: modalTitle ? '✅ Encontrado' : '❌ Não encontrado',
        form: form ? '✅ Encontrado' : '❌ Não encontrado',
        submitBtn: submitBtn ? '✅ Encontrado' : '❌ Não encontrado',
        secaoAtiva: document.querySelector('.section.active')?.id || 'Nenhuma',
        modalVisible: modal ? modal.style.display : 'N/A'
    });
    
    if (!modal || !modalTitle || !form) {
        console.error('❌ Elementos do modal não encontrados');
        console.error('🔍 Verificando se estamos na seção correta...');
        
        // Verificar se estamos na seção de endereços
        const enderecosSection = document.getElementById('enderecos');
        if (enderecosSection && enderecosSection.style.display === 'none') {
            console.error('❌ Seção de endereços não está visível!');
            console.log('🔄 Tentando ativar seção de endereços...');
            showSection('enderecos');
            // Tentar novamente após ativar a seção
            setTimeout(() => openModal(mode, id), 300);
            return;
        }
        
        return;
    }
    
    // Mostrar modal
    modal.style.display = 'block';
    
    // Popular dropdowns com dados da gestão
    console.log('🔄 Populando dropdowns do formulário...');
    populateFormSelects();
    
    // Configurar modal baseado no modo
    if (mode === 'create') {
        modalTitle.textContent = 'Novo Endereço';
        submitBtn.textContent = 'Salvar';
        form.reset();
        currentEditId = null;
    } else if (mode === 'edit' && id) {
        modalTitle.textContent = 'Editar Endereço';
        submitBtn.textContent = 'Atualizar';
        currentEditId = id;
        
        // Preencher formulário com dados existentes
        const endereco = enderecosData.find(e => e.id == id);
        if (endereco) {
            fillFormWithData(endereco);
        }
    }
    
    // Configurar submit do formulário
    form.onsubmit = function(e) {
        e.preventDefault();
        console.log('📝 Formulário submetido, processando...');
        handleFormSubmit();
    };
    
    // Teste: Verificar se todos os campos estão presentes
    console.log('🔍 Verificando campos do formulário...');
    const camposTeste = ['projeto', 'subProjeto', 'tipoAcao', 'condominio', 'endereco', 'cidade', 'equipe', 'supervisor', 'status', 'hp'];
    camposTeste.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            console.log(`  ✅ Campo ${campo} encontrado`);
        } else {
            console.error(`  ❌ Campo ${campo} NÃO encontrado`);
        }
    });
    
    // Popular dropdowns antes de mostrar o modal
    populateFormSelects();
    
    modal.style.display = 'block';
}

// Fechar modal CRUD
function closeModal() {
    const modal = document.getElementById('crudModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentEditId = null;
}

// Preencher formulário com dados
function fillFormWithData(endereco) {
    const formFields = {
        'projeto': endereco.projeto,
        'subProjeto': endereco.subProjeto,
        'tipoAcao': endereco.tipoAcao,
        'condominio': endereco.condominio,
        'endereco': endereco.endereco,
        'cidade': endereco.cidade,
        'equipe': endereco.equipe,
        'supervisor': endereco.supervisor,
        'status': endereco.status,
        'hp': endereco.hp
    };
    
    Object.keys(formFields).forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && formFields[fieldId]) {
            field.value = formFields[fieldId];
        }
    });
}

// Manipular envio do formulário
function handleFormSubmit() {
    console.log('💾 Processando formulário...');
    
    const form = document.getElementById('enderecoForm');
    if (!form) {
        console.error('❌ Formulário não encontrado');
        return;
    }
    
    // Capturar dados manualmente para garantir que todos os campos sejam pegos
    const data = {};
    
    // Campos de texto e select
    const campos = [
        'projeto', 'subProjeto', 'tipoAcao', 'contrato', 'condominio', 'endereco', 
        'cidade', 'andar', 'pep', 'codImovelGed', 'nodeGerencial', 'areaTecnica', 
        'hp', 'dataRecebimento', 'dataInicio', 'dataFinal', 'equipe', 'supervisor', 
        'status', 'rdo', 'book', 'projetoStatus', 'situacao', 'justificativa', 'observacao'
    ];
    
    console.log('📋 Capturando dados do formulário manualmente...');
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            data[campo] = elemento.value || '';
            console.log(`  ${campo}: "${data[campo]}"`);
        } else {
            data[campo] = '';
            console.warn(`⚠️ Campo ${campo} não encontrado no formulário`);
        }
    });
    
    // Verificar se há dados essenciais
    const camposObrigatorios = ['projeto', 'subProjeto', 'tipoAcao', 'condominio', 'endereco', 'cidade', 'equipe', 'supervisor', 'status', 'hp'];
    const camposFaltando = camposObrigatorios.filter(campo => !data[campo] || data[campo].trim() === '');
    
    if (camposFaltando.length > 0) {
        console.warn('⚠️ Campos obrigatórios faltando:', camposFaltando);
    }
    
    console.log('📊 Dados capturados:', data);
    
    if (currentEditId) {
        updateEndereco(currentEditId, data);
    } else {
        createEndereco(data);
    }
    
    closeModal();
}
// Criar novo endereço
function createEndereco(data) {
    console.log('🔄 Criando novo endereço...');
    console.log('📋 Dados recebidos:', data);
    
    // Verificar se há dados válidos
    const dadosValidos = Object.values(data).some(valor => valor && valor.trim() !== '');
    if (!dadosValidos) {
        console.error('❌ Nenhum dado válido recebido');
        showError('Erro', 'Nenhum dado foi preenchido no formulário');
        return;
    }
    
    // Determinar se estamos usando tabela dinâmica
    const usingDynamicTable = dynamicTableData.data.length > 0;
    console.log('📊 Usando tabela dinâmica:', usingDynamicTable);
    
    // Gerar novo ID (considerar tanto endereços quanto dados dinâmicos)
    const allIds = [
        ...enderecosData.map(e => e.id),
        ...dynamicTableData.data.map(row => row.id)
    ];
    const newId = Math.max(...allIds, 0) + 1;
    console.log('🆔 Novo ID gerado:', newId);
    
    // Criar endereço com estrutura completa
    const newEndereco = {
        id: newId,
        ged: data.codImovelGed || '',
        nodeGerencial: data.nodeGerencial || '',
        areaTecnica: data.areaTecnica || '',
        hp: data.hp || '',
        andar: data.andar || '',
        dataRecebimento: data.dataRecebimento || '',
        dataInicio: data.dataInicio || '',
        dataFinal: data.dataFinal || '',
        equipe: data.equipe || '',
        supervisor: data.supervisor || '',
        status: data.status || '',
        rdo: data.rdo || '',
        book: data.book || '',
        projeto: data.projeto || '',
        subProjeto: data.subProjeto || '',
        tipoAcao: data.tipoAcao || '',
        condominio: data.condominio || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        pep: data.pep || '',
        projetoStatus: data.projetoStatus || '',
        situacao: data.situacao || '',
        justificativa: data.justificativa || '',
        observacao: data.observacao || '',
        contrato: data.contrato || '',
        created_at: new Date().toISOString()
    };
    
    console.log('🏗️ Endereço criado com dados:', newEndereco);
    
    // Verificar se há dados válidos no endereço
    const camposComDados = Object.entries(newEndereco).filter(([key, value]) => 
        key !== 'id' && key !== 'created_at' && value && value.toString().trim() !== ''
    );
    console.log('📊 Campos com dados:', camposComDados.length, 'de', Object.keys(newEndereco).length - 2);
    
    // Adicionar ao array de endereços
    enderecosData.push(newEndereco);
    console.log('✅ Endereço adicionado ao array:', newEndereco);
    
    // Persistir dados no localStorage
    savePersistedData();
    
    // SEMPRE adicionar à tabela dinâmica (se ela existir ou criar se não existir)
    console.log('🔄 Preparando para adicionar à tabela dinâmica...');
    
    // Se a tabela dinâmica não existe, criar estrutura básica
    if (dynamicTableData.data.length === 0) {
        console.log('⚠️ Tabela dinâmica não existe, criando estrutura...');
        const headers = [
            'ID', 'PROJETO', 'SUB PROJETO', 'TIPO DE AÇÃO', 'CONDOMÍNIO', 'ENDEREÇO', 
            'CIDADE', 'PEP', 'COD IMOVEL GED', 'NODE GERENCIAL', 'ÁREA TÉCNICA', 
            'HP', 'ANDAR', 'DATA RECEBIMENTO', 'DATA INÍCIO', 'DATA FINAL', 
            'EQUIPE', 'SUPERVISOR', 'STATUS', 'RDO', 'BOOK', 'SITUAÇÃO', 'JUSTIFICATIVA'
        ];
        dynamicTableData.headers = headers;
        dynamicTableData.data = [];
    }
    
    // Converter endereço para formato da tabela dinâmica
    const dynamicRow = {
        id: newEndereco.id,
        PROJETO: newEndereco.projeto || '',
        'SUB PROJETO': newEndereco.subProjeto || '',
        'TIPO DE AÇÃO': newEndereco.tipoAcao || '',
        CONDOMÍNIO: newEndereco.condominio || '',
        ENDEREÇO: newEndereco.endereco || '',
        CIDADE: newEndereco.cidade || '',
        PEP: newEndereco.pep || '',
        'COD IMOVEL GED': newEndereco.ged || '',
        'NODE GERENCIAL': newEndereco.nodeGerencial || '',
        'ÁREA TÉCNICA': newEndereco.areaTecnica || '',
        HP: newEndereco.hp || '',
        ANDAR: newEndereco.andar || '',
        'DATA RECEBIMENTO': newEndereco.dataRecebimento || '',
        'DATA INÍCIO': newEndereco.dataInicio || '',
        'DATA FINAL': newEndereco.dataFinal || '',
        EQUIPE: newEndereco.equipe || '',
        SUPERVISOR: newEndereco.supervisor || '',
        STATUS: newEndereco.status || '',
        RDO: newEndereco.rdo || '',
        BOOK: newEndereco.book || '',
        PROJETO: newEndereco.projetoStatus || '',
        SITUAÇÃO: newEndereco.situacao || '',
        JUSTIFICATIVA: newEndereco.justificativa || ''
    };
    
    console.log('🔄 Linha dinâmica criada:', dynamicRow);
    
    // Adicionar à tabela dinâmica
    dynamicTableData.data.push(dynamicRow);
    saveDynamicData();
    
    console.log('✅ Endereço adicionado à tabela dinâmica:', dynamicRow);
    
    // Atualizar todas as estatísticas e componentes
    renderEnderecosTable();
    updateStats();
    updateEnderecoStats();
    updateDynamicStatsCards();
    updateInfraStats();
    populateInfraFilters();
    persistCardData();
    
    console.log('✅ Endereço criado com sucesso:', newEndereco);
    
    // Forçar renderização da tabela dinâmica
    console.log('🔄 Forçando renderização da tabela dinâmica...');
    renderDynamicTable();
    
    // Verificar se o endereço foi adicionado corretamente
    console.log('📊 Status final após criação:', {
        enderecosData: enderecosData.length,
        dynamicTableData: dynamicTableData.data.length,
        ultimoEndereco: enderecosData[enderecosData.length - 1],
        ultimoDinamico: dynamicTableData.data[dynamicTableData.data.length - 1]
    });
    
    // Mostrar mensagem de sucesso
    showSuccess('Endereço Criado', 'Novo endereço adicionado com sucesso à tabela dinâmica!');
    
    // Debug: Verificar se a tabela dinâmica foi atualizada
    setTimeout(() => {
        console.log('🔍 Verificação final da tabela dinâmica:');
        console.log('  - Total de registros:', dynamicTableData.data.length);
        console.log('  - Último registro:', dynamicTableData.data[dynamicTableData.data.length - 1]);
        console.log('  - Headers disponíveis:', dynamicTableData.headers);
        
        // Verificar se a tabela está sendo exibida
        const tableContainer = document.getElementById('enderecosTable');
        if (tableContainer) {
            console.log('  - Container da tabela encontrado');
            console.log('  - Conteúdo da tabela:', tableContainer.innerHTML.substring(0, 200) + '...');
        } else {
            console.error('  - Container da tabela não encontrado');
        }
        
        // Verificar se os dados estão sendo exibidos corretamente
        const ultimoRegistro = dynamicTableData.data[dynamicTableData.data.length - 1];
        if (ultimoRegistro) {
            console.log('🔍 Análise do último registro:');
            Object.entries(ultimoRegistro).forEach(([key, value]) => {
                if (value && value.toString().trim() !== '') {
                    console.log(`  ✅ ${key}: "${value}"`);
                } else {
                    console.log(`  ❌ ${key}: vazio`);
                }
            });
        }
    }, 1000);
}

// Função para processar formulário dinâmico
function handleFormSubmitDinamico() {
    console.log('💾 Processando formulário dinâmico...');
    
    const form = document.getElementById('enderecoFormDinamico');
    if (!form) {
        console.error('❌ Formulário dinâmico não encontrado');
        return;
    }
    
    // Capturar dados do formulário dinâmico
    const data = {};
    const headers = dynamicTableData.headers || [];
    
    console.log('📋 Capturando dados do formulário dinâmico...');
    headers.forEach(header => {
        if (header === 'ID') return; // Pular campo ID
        
        const campoId = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const elemento = document.getElementById(campoId);
        
        if (elemento) {
            data[header] = elemento.value || '';
            console.log(`  ${header}: "${data[header]}"`);
        } else {
            data[header] = '';
            console.warn(`⚠️ Campo ${header} (${campoId}) não encontrado no formulário`);
        }
    });
    
    console.log('📊 Dados capturados do formulário dinâmico:', data);
    
    // Criar novo registro para a tabela dinâmica
    criarNovoRegistroDinamico(data);
    
    closeModal();
}

// Função para criar novo registro na tabela dinâmica
function criarNovoRegistroDinamico(data) {
    console.log('🔄 Criando novo registro dinâmico...');
    
    // Gerar novo ID
    const allIds = dynamicTableData.data.map(row => row.id);
    const newId = Math.max(...allIds, 0) + 1;
    console.log('🆔 Novo ID gerado:', newId);
    
    // Criar registro com estrutura exata da tabela dinâmica
    const novoRegistro = {
        id: newId
    };
    
    // Adicionar todos os campos da tabela dinâmica
    const headers = dynamicTableData.headers || [];
    headers.forEach(header => {
        if (header !== 'ID') {
            novoRegistro[header] = data[header] || '';
        }
    });
    
    console.log('🏗️ Registro criado:', novoRegistro);
    
    // Adicionar à tabela dinâmica
    dynamicTableData.data.push(novoRegistro);
    saveDynamicData();
    
    console.log('✅ Registro adicionado à tabela dinâmica');
    
    // Atualizar interface
    renderDynamicTable();
    updateDynamicStatsCards();
    updateInfraStats();
    populateInfraFilters();
    
    // Mostrar mensagem de sucesso
    showSuccess('Registro Criado', 'Novo registro adicionado com sucesso à tabela dinâmica!');
    
    console.log('📊 Status final:', {
        totalRegistros: dynamicTableData.data.length,
        ultimoRegistro: novoRegistro
    });
}

// Atualizar endereço
function updateEndereco(id, data) {
    const index = enderecosData.findIndex(e => e.id == id);
    if (index !== -1) {
        enderecosData[index] = {
            ...enderecosData[index],
            ...data,
            hp: parseInt(data.hp) || 0
        };
        
        // Persistir dados no localStorage
        savePersistedData();
        
        // Atualizar na tabela dinâmica se ela existir
        if (dynamicTableData.data.length > 0) {
            console.log('🔄 Atualizando endereço na tabela dinâmica...');
            
            const dynamicIndex = dynamicTableData.data.findIndex(row => row.id == id);
            if (dynamicIndex !== -1) {
                // Converter endereço para formato da tabela dinâmica
                const dynamicRow = {
                    id: enderecosData[index].id,
                    PROJETO: enderecosData[index].projeto || '',
                    'SUB PROJETO': enderecosData[index].subProjeto || '',
                    'TIPO DE AÇÃO': enderecosData[index].tipoAcao || '',
                    CONDOMÍNIO: enderecosData[index].condominio || '',
                    ENDEREÇO: enderecosData[index].endereco || '',
                    CIDADE: enderecosData[index].cidade || '',
                    PEP: enderecosData[index].pep || '',
                    'COD IMOVEL GED': enderecosData[index].ged || '',
                    'NODE GERENCIAL': enderecosData[index].nodeGerencial || '',
                    'ÁREA TÉCNICA': enderecosData[index].areaTecnica || '',
                    HP: enderecosData[index].hp || '',
                    ANDAR: enderecosData[index].andar || '',
                    'DATA RECEBIMENTO': enderecosData[index].dataRecebimento || '',
                    'DATA INÍCIO': enderecosData[index].dataInicio || '',
                    'DATA FINAL': enderecosData[index].dataFinal || '',
                    EQUIPE: enderecosData[index].equipe || '',
                    SUPERVISOR: enderecosData[index].supervisor || '',
                    STATUS: enderecosData[index].status || '',
                    RDO: enderecosData[index].rdo || '',
                    BOOK: enderecosData[index].book || '',
                    PROJETO: enderecosData[index].projeto || '',
                    SITUAÇÃO: enderecosData[index].status || '',
                    JUSTIFICATIVA: ''
                };
                
                dynamicTableData.data[dynamicIndex] = dynamicRow;
                saveDynamicData();
                
                // Re-renderizar tabela dinâmica
                renderDynamicTable();
                console.log('✅ Endereço atualizado na tabela dinâmica');
            }
        }
        
        renderEnderecosTable();
        updateStats();
        updateEnderecoStats();
        updateDynamicStatsCards(); // Atualizar cards de Cadastro de Endereços
        updateInfraStats();
        populateInfraFilters();
        
        // Persistir dados dos cards
        persistCardData();
        
        console.log('✅ Endereço atualizado:', enderecosData[index]);
    }
}

// Deletar endereço
function deleteEndereco(id) {
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar este endereço?',
        () => {
            const index = enderecosData.findIndex(e => e.id == id);
            if (index !== -1) {
                enderecosData.splice(index, 1);
                
                // Remover da tabela dinâmica se ela existir
                if (dynamicTableData.data.length > 0) {
                    console.log('🔄 Removendo endereço da tabela dinâmica...');
                    
                    const dynamicIndex = dynamicTableData.data.findIndex(row => row.id == id);
                    if (dynamicIndex !== -1) {
                        dynamicTableData.data.splice(dynamicIndex, 1);
                        saveDynamicData();
                        
                        // Re-renderizar tabela dinâmica
                        renderDynamicTable();
                        console.log('✅ Endereço removido da tabela dinâmica');
                    }
                }
                
                // Persistir dados no localStorage
                savePersistedData();
                
                renderEnderecosTable();
                updateStats();
                updateEnderecoStats();
                updateDynamicStatsCards(); // Atualizar cards de Cadastro de Endereços
                updateInfraStats();
                populateInfraFilters();
                
                // Persistir dados dos cards
                persistCardData();
                
                console.log('✅ Endereço deletado');
                showSuccess('Endereço Deletado!', 'Endereço removido com sucesso!');
            }
        },
        () => {
            console.log('❌ Exclusão cancelada pelo usuário');
        }
    );
}
// Renderizar tabela de endereços
function renderEnderecosTable() {
    const tableBody = document.getElementById('enderecosTableBody');
    if (!tableBody) return;
    
    if (enderecosData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="25" style="text-align: center;">Nenhum endereço encontrado</td></tr>';
        return;
    }
    
    // Otimização: Usar DocumentFragment para melhor performance
    const fragment = document.createDocumentFragment();
    
    // Limitar renderização inicial para melhor performance
    // Calcular paginação
    totalPages = Math.ceil(enderecosData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToRender = enderecosData.slice(startIndex, endIndex);
    
    itemsToRender.forEach(endereco => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${endereco.id}</td>
            <td>${endereco.projeto || ''}</td>
            <td>${endereco.subProjeto || ''}</td>
            <td>${endereco.tipoAcao || ''}</td>
            <td>${endereco.condominio || ''}</td>
            <td>${endereco.endereco || ''}</td>
            <td>${endereco.cidade || ''}</td>
            <td>${endereco.pep || ''}</td>
            <td>${endereco.codImovelGed || ''}</td>
            <td>${endereco.nodeGerencial || ''}</td>
            <td>${endereco.areaTecnica || ''}</td>
            <td>${endereco.hp || 0}</td>
            <td>${endereco.andar || ''}</td>
            <td>${endereco.dataRecebimento || ''}</td>
            <td>${endereco.dataInicio || ''}</td>
            <td>${endereco.dataFinal || ''}</td>
            <td>${endereco.equipe || ''}</td>
            <td>${endereco.supervisor || ''}</td>
            <td><span class="status-badge ${endereco.status?.toLowerCase()}">${endereco.status || ''}</span></td>
            <td>${endereco.rdo || ''}</td>
            <td>${endereco.book || ''}</td>
            <td>${endereco.projetoStatus || ''}</td>
            <td>${endereco.situacao || ''}</td>
            <td>${endereco.justificativa || ''}</td>
            <td>
                <button class="btn-action btn-edit" onclick="openModal('edit', ${endereco.id})" title="Editar">✏️</button>
                <button class="btn-action btn-delete" onclick="deleteEndereco(${endereco.id})" title="Deletar">🗑️</button>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
    
    // Se há mais dados, adicionar indicador
    // Mostrar informações de paginação
    const paginationRow = document.createElement('tr');
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, enderecosData.length);
    
    paginationRow.innerHTML = `
        <td colspan="25" style="text-align: center; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; max-width: 600px; margin: 0 auto;">
                <div style="color: #666; font-size: 14px;">
                    Mostrando ${startItem} a ${endItem} de ${enderecosData.length} registros
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button onclick="changePage(${currentPage - 1})" 
                            class="pagination-button"
                            ${currentPage <= 1 ? 'disabled' : ''}>
                        ← Anterior
                    </button>
                    <span class="pagination-info">
                        Página ${currentPage} de ${totalPages}
                    </span>
                    <button onclick="changePage(${currentPage + 1})" 
                            class="pagination-button"
                            ${currentPage >= totalPages ? 'disabled' : ''}>
                        Próxima →
                    </button>
                </div>
            </div>
        </td>
    `;
    tableBody.appendChild(paginationRow);
}

// Função para mudar de página
function changePage(newPage) {
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderEnderecosTable();
        
        // Scroll para o topo da tabela
        const tableContainer = document.querySelector('.crud-table-container');
        if (tableContainer) {
            tableContainer.scrollTop = 0;
        }
    }
}

// Função para resetar para a primeira página
function resetToFirstPage() {
    currentPage = 1;
}

// Função para corrigir dados mapeados incorretamente
function correctMappedData(data) {
    console.log('🔧 Iniciando correção de dados mapeados incorretamente...');
    
    const correctedData = data.map((row, index) => {
        const correctedRow = { ...row };
        let corrections = [];
        
        // Correção 1: Se Jessica está no status, mover para supervisor
        if (row.status && row.status.toString().toUpperCase().includes('JESSICA')) {
            console.log(`🔧 Linha ${index + 1}: Jessica está no status, movendo para supervisor`);
            correctedRow.supervisor = row.status;
            correctedRow.status = '';
            corrections.push('Jessica: status → supervisor');
        }
        
        // Correção 2: Se nomes estão no supervisor mas deveriam estar na equipe
        if (row.supervisor && !row.supervisor.toString().toUpperCase().includes('JESSICA')) {
            const supervisorName = row.supervisor.toString().toUpperCase();
            if (supervisorName.includes('ALISSON') || supervisorName.includes('LAZARO') || 
                supervisorName.includes('JOSE') || supervisorName.includes('MARCOS') || 
                supervisorName.includes('CARLOS') || supervisorName.includes('ANTONIO') ||
                supervisorName.includes('SANTOS')) {
                
                console.log(`🔧 Linha ${index + 1}: ${row.supervisor} está no supervisor, movendo para equipe`);
                correctedRow.equipe = row.supervisor;
                correctedRow.supervisor = '';
                corrections.push(`${row.supervisor}: supervisor → equipe`);
            }
        }
        
        // Correção 3: Se equipe está vazia mas supervisor tem nomes
        if ((!row.equipe || row.equipe === '') && row.supervisor && 
            !row.supervisor.toString().toUpperCase().includes('JESSICA')) {
            
            const supervisorName = row.supervisor.toString().toUpperCase();
            if (supervisorName.includes('ALISSON') || supervisorName.includes('LAZARO') || 
                supervisorName.includes('JOSE') || supervisorName.includes('MARCOS') || 
                supervisorName.includes('CARLOS') || supervisorName.includes('ANTONIO') ||
                supervisorName.includes('SANTOS')) {
                
                console.log(`🔧 Linha ${index + 1}: Equipe vazia, movendo ${row.supervisor} do supervisor para equipe`);
                correctedRow.equipe = row.supervisor;
                correctedRow.supervisor = '';
                corrections.push(`${row.supervisor}: supervisor → equipe (equipe estava vazia)`);
            }
        }
        
        // Correção 4: Se status está vazio mas deveria ter PRODUTIVA/IMPRODUTIVA
        if ((!row.status || row.status === '') && row.supervisor && 
            row.supervisor.toString().toUpperCase().includes('JESSICA')) {
            
            // Procurar por PRODUTIVA/IMPRODUTIVA em outras colunas
            for (const [key, value] of Object.entries(row)) {
                if (value && value.toString().toUpperCase().includes('PRODUTIVA')) {
                    console.log(`🔧 Linha ${index + 1}: Status vazio, movendo ${value} para status`);
                    correctedRow.status = value;
                    correctedRow[key] = '';
                    corrections.push(`${value}: ${key} → status`);
                    break;
                } else if (value && value.toString().toUpperCase().includes('IMPRODUTIVA')) {
                    console.log(`🔧 Linha ${index + 1}: Status vazio, movendo ${value} para status`);
                    correctedRow.status = value;
                    correctedRow[key] = '';
                    corrections.push(`${value}: ${key} → status`);
                    break;
                }
            }
        }
        
        // Correção 5: Se Jessica não está no supervisor mas deveria estar
        if (row.equipe && row.equipe.toString().toUpperCase().includes('JESSICA')) {
            console.log(`🔧 Linha ${index + 1}: Jessica está na equipe, movendo para supervisor`);
            correctedRow.supervisor = row.equipe;
            correctedRow.equipe = '';
            corrections.push('Jessica: equipe → supervisor');
        }
        
        if (corrections.length > 0) {
            console.log(`✅ Linha ${index + 1} corrigida: ${corrections.join(', ')}`);
        }
        
        return correctedRow;
    });
    
    console.log(`✅ Correção concluída. ${correctedData.length} linhas processadas.`);
    return correctedData;
}
// Função para criar tabela completamente nova do zero
function createTableFromScratch(uploadedData) {
    console.log('🆕 Iniciando criação de tabela do zero...');
    console.log('📊 Dados originais:', uploadedData);
    
    const newTableData = uploadedData.map((row, index) => {
        console.log(`🆕 Processando linha ${index + 1}:`, row);
        
        // Extrair todos os valores da linha
        const allValues = Object.values(row).filter(val => val && val.toString().trim() !== '');
        const allValuesUpper = allValues.map(val => val.toString().toUpperCase());
        
        console.log(`📊 Linha ${index + 1} - Todos os valores:`, allValues);
        
        // Criar nova linha com estrutura padrão
        const newRow = {
            id: index + 1,
            ged: '',
            nodeGerencial: '',
            areaTecnica: '',
            hp: '',
            andar: '',
            dataRecebimento: '',
            dataInicio: '',
            dataFinal: '',
            equipe: '',
            supervisor: '',
            status: '',
            rdo: '',
            book: '',
            projeto: '',
            subProjeto: '',
            tipoAcao: '',
            condominio: '',
            endereco: '',
            cidade: '',
            pep: '',
            created_at: new Date().toISOString()
        };
        
        // LÓGICA MELHORADA DE IDENTIFICAÇÃO
        
        // 1. PRIORIDADE MÁXIMA: Identificar SUPERVISOR (Jessica) - DEVE SER PRIMEIRO
        const jessicaValue = allValues.find(val => 
            val.toString().toUpperCase().includes('JESSICA')
        );
        if (jessicaValue) {
            newRow.supervisor = jessicaValue;
            console.log(`🎯 Linha ${index + 1}: SUPERVISOR (Jessica) identificado: ${jessicaValue}`);
        }
        
        // 2. PRIORIDADE ALTA: Identificar STATUS (PRODUTIVA/IMPRODUTIVA)
        const statusValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return valUpper.includes('PRODUTIVA') || valUpper.includes('IMPRODUTIVA');
        });
        if (statusValue) {
            newRow.status = statusValue;
            console.log(`🎯 Linha ${index + 1}: STATUS identificado: ${statusValue}`);
        }
        
        // 3. PRIORIDADE ALTA: Identificar EQUIPE (nomes específicos)
        const equipeNames = ['ALISSON', 'LAZARO', 'JOSE', 'MARCOS', 'CARLOS', 'ANTONIO', 'SANTOS', 'ANDRÉ', 'ANDRÉS'];
        const equipeValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return equipeNames.some(name => valUpper.includes(name)) &&
                   !valUpper.includes('JESSICA') &&
                   !valUpper.includes('PRODUTIVA') &&
                   !valUpper.includes('IMPRODUTIVA');
        });
        if (equipeValue) {
            newRow.equipe = equipeValue;
            console.log(`🎯 Linha ${index + 1}: EQUIPE identificada: ${equipeValue}`);
        }
        
        // 4. Identificar HP (números entre 1-999)
        const hpValue = allValues.find(val => {
            const numVal = parseInt(val);
            return !isNaN(numVal) && numVal > 0 && numVal < 1000 && val.toString().length <= 3;
        });
        if (hpValue) {
            newRow.hp = hpValue;
            console.log(`🎯 Linha ${index + 1}: HP identificado: ${hpValue}`);
        }
        
        // 5. Identificar datas (formato específico)
        const dateValues = allValues.filter(val => {
            const str = val.toString();
            // Verificar se é uma data válida
            return (str.includes('/') && str.length >= 8) || 
                   (str.includes('-') && str.length >= 8) || 
                   (str.includes('2024') || str.includes('2025'));
        });
        if (dateValues.length >= 1) {
            newRow.dataRecebimento = dateValues[0];
            console.log(`🎯 Linha ${index + 1}: Data Recebimento: ${dateValues[0]}`);
        }
        if (dateValues.length >= 2) {
            newRow.dataInicio = dateValues[1];
            console.log(`🎯 Linha ${index + 1}: Data Início: ${dateValues[1]}`);
        }
        if (dateValues.length >= 3) {
            newRow.dataFinal = dateValues[2];
            console.log(`🎯 Linha ${index + 1}: Data Final: ${dateValues[2]}`);
        }
        
        // 6. Identificar endereços (padrões específicos)
        const addressValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return (valUpper.includes('RUA') || 
                    valUpper.includes('AV') || 
                    valUpper.includes('AVENIDA') || 
                    valUpper.includes('R.') ||
                    valUpper.includes('Nº') || 
                    valUpper.includes('NUMERO') ||
                    valUpper.includes('QUADRA') ||
                    valUpper.includes('LOTE')) &&
                   valUpper.length > 10; // Endereços são longos
        });
        if (addressValue) {
            newRow.endereco = addressValue;
            console.log(`🎯 Linha ${index + 1}: ENDEREÇO identificado: ${addressValue}`);
        }
        
        // 7. Identificar cidades (nomes específicos)
        const cityNames = ['SALVADOR', 'LAURO', 'FREITAS', 'BAHIA', 'BA', 'BRASIL', 'SÃO PAULO', 'RIO DE JANEIRO'];
        const cityValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return cityNames.some(city => valUpper.includes(city));
        });
        if (cityValue) {
            newRow.cidade = cityValue;
            console.log(`🎯 Linha ${index + 1}: CIDADE identificada: ${cityValue}`);
        }
        
        // 8. Identificar projetos (palavras-chave específicas)
        const projectKeywords = ['PROJETO', 'MDU', 'PROJ', 'CLIENTE', 'CONTRATO', 'OBRA'];
        const projectValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return projectKeywords.some(keyword => valUpper.includes(keyword));
        });
        if (projectValue) {
            newRow.projeto = projectValue;
            console.log(`🎯 Linha ${index + 1}: PROJETO identificado: ${projectValue}`);
        }
        
        // 9. Identificar condomínios (palavras-chave específicas)
        const condoKeywords = ['CONDOMINIO', 'PREDIO', 'EDIFICIO', 'RESIDENCIAL', 'APARTAMENTO', 'BLOCO'];
        const condoValue = allValues.find(val => {
            const valUpper = val.toString().toUpperCase();
            return condoKeywords.some(keyword => valUpper.includes(keyword));
        });
        if (condoValue) {
            newRow.condominio = condoValue;
            console.log(`🎯 Linha ${index + 1}: CONDOMÍNIO identificado: ${condoValue}`);
        }
        
        // 10. Identificar códigos GED (padrão específico)
        const gedValue = allValues.find(val => {
            const str = val.toString();
            // Códigos GED geralmente têm letras e números, tamanho médio
            return /[A-Z]/.test(str) && /\d/.test(str) && str.length >= 5 && str.length <= 15;
        });
        if (gedValue) {
            newRow.ged = gedValue;
            console.log(`🎯 Linha ${index + 1}: GED identificado: ${gedValue}`);
        }
        
        // VALIDAÇÃO FINAL - Verificar se os dados principais foram identificados
        console.log(`✅ Linha ${index + 1} criada:`, {
            equipe: newRow.equipe,
            supervisor: newRow.supervisor,
            status: newRow.status,
            hp: newRow.hp,
            projeto: newRow.projeto,
            endereco: newRow.endereco,
            cidade: newRow.cidade
        });
        
        // ALERTA se dados importantes não foram identificados
        if (!newRow.supervisor && !newRow.equipe && !newRow.status) {
            console.warn(`⚠️ Linha ${index + 1}: Dados principais não identificados!`);
            console.warn(`⚠️ Valores disponíveis:`, allValues);
        }
        
        return newRow;
    });
    
    console.log(`✅ Tabela criada do zero. ${newTableData.length} linhas processadas.`);
    tableCreatedFromUpload = true; // Marcar que tabela foi criada por upload
    return newTableData;
}

// Função para reverter para o estado anterior (backup)
let backupData = null;

function backupCurrentData() {
    backupData = JSON.parse(JSON.stringify(enderecosData));
    console.log('💾 Backup dos dados atuais criado');
}

function revertToBackup() {
    if (backupData) {
        enderecosData = JSON.parse(JSON.stringify(backupData));
        savePersistedData();
        renderEnderecosTable();
        updateStats();
        updateEnderecoStats();
        updateInfraStats();
        showSuccess('Dados Revertidos!', 'Tabela voltou ao estado anterior!');
        console.log('🔄 Dados revertidos para o backup');
    } else {
        showError('Erro!', 'Nenhum backup disponível para reverter');
        console.log('❌ Nenhum backup disponível');
    }
}

// Função para limpar a tabela de endereços
function clearEnderecosTable() {
    showConfirm(
        'Limpar Tabela',
        'Tem certeza que deseja limpar toda a tabela de endereços? Esta ação não pode ser desfeita.',
        () => {
            // Limpar dados de endereços
            enderecosData = [];
            tableCreatedFromUpload = false; // Resetar flag
            localStorage.removeItem('enderecosData');
            localStorage.removeItem('tableCreatedFromUpload');
            
            // Limpar dados dinâmicos também
            dynamicTableData = {
                headers: [],
                data: [],
                metadata: {
                    lastUpload: null,
                    totalRecords: 0,
                    source: null,
                    tableStructure: 'dynamic'
                }
            };
            
            dynamicTableConfig = {
                itemsPerPage: 20,
                currentPage: 1,
                sortColumn: null,
                sortDirection: 'asc',
                filters: {},
                searchTerm: ''
            };
            
            localStorage.removeItem('dynamicTableData');
            localStorage.removeItem('dynamicTableConfig');
            
            // Atualizar interfaces
            renderEnderecosTable();
            renderDynamicTable();
            
            // Atualizar estatísticas
            updateStats();
            updateEnderecoStats();
            updateInfraStats();
            updateDynamicStatsCards();
            
            // Atualizar filtros
            populateInfraFilters();
            
            // Limpar campo de busca
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            
            // Resetar paginação
            resetDynamicPagination();
            
            showSuccess('Tabela Limpa!', 'Tabela de endereços foi limpa com sucesso!');
            console.log('🗑️ Tabela de endereços limpa');
        },
        () => {
            console.log('❌ Limpeza da tabela cancelada pelo usuário');
        }
    );
}

// Função para debugar dados do upload
function debugUploadData() {
    if (!uploadedData || uploadedData.length === 0) {
        console.log('❌ Nenhum dado de upload disponível para debug');
        return;
    }
    
    console.log('🔍 === DEBUG DOS DADOS DE UPLOAD ===');
    console.log('📊 Total de linhas:', uploadedData.length);
    console.log('📋 Headers:', Object.keys(uploadedData[0]));
    
    // Analisar as primeiras 5 linhas
    uploadedData.slice(0, 5).forEach((row, index) => {
        console.log(`\n📝 Linha ${index + 1}:`);
        console.log('Dados brutos:', row);
        
        const allValues = Object.values(row).filter(val => val && val.toString().trim() !== '');
        console.log('Valores filtrados:', allValues);
        
        // Identificar padrões
        allValues.forEach((value, valIndex) => {
            const valUpper = value.toString().toUpperCase();
            console.log(`  Valor ${valIndex + 1}: "${value}"`);
            
            if (valUpper.includes('JESSICA')) {
                console.log(`    → SUPERVISOR detectado: ${value}`);
            }
            if (valUpper.includes('ALISSON') || valUpper.includes('LAZARO') || valUpper.includes('JOSE') || valUpper.includes('MARCOS')) {
                console.log(`    → EQUIPE detectado: ${value}`);
            }
            if (valUpper.includes('PRODUTIVA') || valUpper.includes('IMPRODUTIVA')) {
                console.log(`    → STATUS detectado: ${value}`);
            }
            if (!isNaN(parseInt(value)) && parseInt(value) > 0 && parseInt(value) < 1000) {
                console.log(`    → HP detectado: ${value}`);
            }
        });
    });
    
    console.log('\n🔍 === FIM DO DEBUG ===');
}
// Função para download da planilha padrão
function downloadTemplate() {
    console.log('📥 Iniciando download da planilha padrão...');
    
    // Mostrar loading
    const button = event.target.closest('.btn-template-download');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando...';
    button.disabled = true;
    
    // Fazer requisição para download
    fetch(`${API_BASE_URL}/download-template`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao baixar planilha');
            }
            return response.blob();
        })
        .then(blob => {
            // Criar link para download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'template_cadastro_enderecos.xlsx';
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Limpar
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            // Restaurar botão
            button.innerHTML = originalText;
            button.disabled = false;
            
            // Mostrar sucesso
            showSuccess('Download Concluído!', 'Planilha padrão baixada com sucesso!');
            console.log('✅ Planilha padrão baixada com sucesso');
        })
        .catch(error => {
            console.error('❌ Erro ao baixar planilha:', error);
            
            // Restaurar botão
            button.innerHTML = originalText;
            button.disabled = false;
            
            // Mostrar erro
            showError('Erro no Download!', 'Não foi possível baixar a planilha padrão. Tente novamente.');
        });
}

// Função para aplicar correção manualmente (pode ser chamada pelo usuário)
function applyDataCorrection() {
    console.log('🔧 Aplicando correção manual dos dados...');
    enderecosData = correctMappedData(enderecosData);
    savePersistedData();
    renderEnderecosTable();
    updateStats();
    updateEnderecoStats();
    updateInfraStats();
    
    // Atualizar gráficos
    setTimeout(() => {
        if (typeof updateProjetosChart === 'function') updateProjetosChart();
        if (typeof updateSubProjetosChart === 'function') updateSubProjetosChart();
        if (typeof updateCidadesChart === 'function') updateCidadesChart();
        if (typeof updateHpProjetosChart === 'function') updateHpProjetosChart();
        if (typeof updateSupervisorStatusChart === 'function') updateSupervisorStatusChart();
        if (typeof renderEquipeRanking === 'function') renderEquipeRanking();
    }, 100);
    renderEquipeStatusRanking();
    
    showSuccess('Dados Corrigidos!', 'Os dados foram corrigidos automaticamente!');
}

// ==================== FUNÇÕES UPLOAD ====================

// Abrir modal de upload
function openUploadModal() {
    console.log('📁 Abrindo modal de upload');
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'flex';
        resetUploadModal();
        
        // Garantir que a inicialização do upload via web seja feita
        setTimeout(() => {
            console.log('🔄 Reinicializando upload via web...');
            initializeWebUpload();
        }, 100);
    } else {
        console.error('❌ Modal de upload não encontrado');
    }
}

// Fechar modal de upload
function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
        modal.style.display = 'none';
        resetUploadModal();
    }
}

// Resetar modal de upload
function resetUploadModal() {
    uploadedData = null;
    fileHeaders = [];
    
    const preview = document.getElementById('uploadPreview');
    const mapping = document.getElementById('uploadMapping');
    const processBtn = document.getElementById('processBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (preview) preview.style.display = 'none';
    if (mapping) mapping.style.display = 'none';
    if (processBtn) processBtn.style.display = 'none';
    if (fileInput) fileInput.value = '';
    
    // Resetar área de upload
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('dragover', 'has-file');
        const uploadText = uploadArea.querySelector('.upload-title');
        if (uploadText) {
            uploadText.textContent = 'Arraste e solte arquivos aqui';
        }
    }
}

// Processar arquivo baixado via URL (sem validação de extensão)
function handleFileSelectFromUrl(file) {
    console.log('🌐 Processando arquivo baixado via URL:', file.name);
    
    if (!file) {
        alert('Nenhum arquivo baixado');
        return;
    }
    
    // Mostrar nome do arquivo
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.classList.add('has-file');
        const uploadText = uploadArea.querySelector('.upload-title');
        if (uploadText) {
            uploadText.textContent = `Arquivo baixado: ${file.name}`;
        }
    }
    
    // Usar sistema dinâmico para upload via web também
    processDynamicUpload(file).then(({ headers, data }) => {
        console.log('✅ Upload via web processado com sucesso');
        showSuccess('Upload Concluído', `${data.length} registros importados com ${headers.length} colunas`);
        closeUploadModal();
    }).catch(error => {
        console.error('❌ Erro no upload via web:', error);
        showError('Erro no Upload', 'Falha ao processar arquivo: ' + error.message);
    });
}

// Processar arquivo selecionado
function handleFileSelect(file) {
    console.log('📄 Processando arquivo:', file.name);
    
    if (!file) {
        alert('Nenhum arquivo selecionado');
        return;
    }
    
    // Verificar tipo de arquivo
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(fileExtension)) {
        alert('Tipo de arquivo não suportado. Use Excel (.xlsx, .xls) ou CSV (.csv)');
        return;
    }
    
    // Mostrar nome do arquivo
    const uploadArea = document.getElementById('fileUploadArea');
    if (uploadArea) {
        uploadArea.classList.add('has-file');
        const uploadText = uploadArea.querySelector('.upload-title');
        if (uploadText) {
            uploadText.textContent = `Arquivo selecionado: ${file.name}`;
        }
    }
    
    // Usar sistema dinâmico para todos os uploads
    processDynamicUpload(file).then(({ headers, data }) => {
        console.log('✅ Upload processado com sucesso');
        showSuccess('Upload Concluído', `${data.length} registros importados com ${headers.length} colunas`);
        closeUploadModal();
    }).catch(error => {
        console.error('❌ Erro no upload:', error);
        showError('Erro no Upload', 'Falha ao processar arquivo: ' + error.message);
    });
}

// Processar arquivo CSV
function processCSVFile(file) {
    console.log('📊 Processando arquivo CSV...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const parsedData = parseCSVData(csvText);
            
            if (parsedData && parsedData.length > 0) {
                uploadedData = parsedData;
                fileHeaders = Object.keys(parsedData[0]);
                showPreview(parsedData);
                showMapping();
            } else {
                alert('Erro: Arquivo CSV vazio ou formato inválido');
            }
        } catch (error) {
            console.error('❌ Erro ao processar CSV:', error);
            alert('Erro ao processar arquivo CSV: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Processar arquivo Excel
function processExcelFile(file) {
    console.log('📈 Processando arquivo Excel...');
    
    // Verificar se XLSX library está disponível
    if (typeof XLSX === 'undefined') {
        alert('Biblioteca XLSX não carregada. Funcionalidade Excel indisponível.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Pegar a primeira planilha
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData && jsonData.length > 0) {
                uploadedData = jsonData;
                fileHeaders = Object.keys(jsonData[0]);
                showPreview(jsonData);
                showMapping();
            } else {
                alert('Erro: Planilha vazia ou formato inválido');
            }
        } catch (error) {
            console.error('❌ Erro ao processar Excel:', error);
            alert('Erro ao processar arquivo Excel: ' + error.message);
        }
    };
    
    reader.readAsArrayBuffer(file);
}

// Parse simples de CSV
function parseCSVData(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        data.push(row);
    }
    
    return data;
}
// Mostrar prévia dos dados
function showPreview(data) {
    console.log('👁️ Mostrando prévia dos dados...');
    
    const preview = document.getElementById('uploadPreview');
    const previewTableHead = document.getElementById('previewTableHead');
    const previewTableBody = document.getElementById('previewTableBody');
    
    if (!preview || !previewTableHead || !previewTableBody) {
        console.error('❌ Elementos de prévia não encontrados');
        return;
    }
    
    // Mostrar apenas os primeiros 5 registros para prévia
    const previewData = data.slice(0, 5);
    const headers = Object.keys(data[0]);
    
    // Criar cabeçalhos
    previewTableHead.innerHTML = `
        <tr>
            ${headers.map(header => `<th>${header}</th>`).join('')}
        </tr>
    `;
    
    // Criar linhas de dados
    previewTableBody.innerHTML = previewData.map(row => `
        <tr>
            ${headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
        </tr>
    `).join('');
    
    preview.style.display = 'block';
}
// Mostrar mapeamento de colunas
function showMapping() {
    console.log('🔗 Mostrando mapeamento de colunas...');
    
    const mapping = document.getElementById('uploadMapping');
    const processBtn = document.getElementById('processBtn');
    
    if (!mapping) {
        console.error('❌ Elemento de mapeamento não encontrado');
        return;
    }
    
    // Mapeamento mais inteligente com múltiplas variações
    const mappingSelects = {
        'mapProjeto': {
            label: '🏢 Projeto',
            field: 'projeto',
            variations: ['projeto', 'project', 'proj', 'cliente', 'nome do projeto', 'PROJETO', 'PROJECT', 'PROJ', 'CLIENTE', 'NOME DO PROJETO', 'Projeto', 'Project', 'Proj', 'Cliente', 'Nome do Projeto']
        },
        'mapSubProjeto': {
            label: '📂 Sub Projeto', 
            field: 'subProjeto',
            variations: ['subprojeto', 'sub projeto', 'sub_projeto', 'subproject', 'sub-projeto', 'SUBPROJETO', 'SUB PROJETO', 'SUB_PROJETO', 'SUBPROJECT', 'SUB-PROJETO', 'Subprojeto', 'Sub Projeto', 'Sub_Projeto', 'Subproject', 'Sub-Projeto']
        },
        'mapTipoAcao': {
            label: '⚡ Tipo de Ação',
            field: 'tipoAcao', 
            variations: ['tipo', 'acao', 'ação', 'action', 'tipo_acao', 'tipoacao', 'tipo de ação', 'TIPO', 'ACAO', 'AÇÃO', 'ACTION', 'TIPO_ACAO', 'TIPOACAO', 'TIPO DE AÇÃO', 'Tipo', 'Acao', 'Ação', 'Action', 'Tipo_Acao', 'Tipoacao', 'Tipo de Ação']
        },
        'mapCondominio': {
            label: '🏠 Condomínio',
            field: 'condominio',
            variations: ['condominio', 'condomínio', 'predio', 'edifício', 'edificio', 'prédio', 'CONDOMINIO', 'CONDOMÍNIO', 'PREDIO', 'EDIFÍCIO', 'EDIFICIO', 'PRÉDIO', 'Condominio', 'Condomínio', 'Predio', 'Edifício', 'Edificio', 'Prédio']
        },
        'mapEndereco': {
            label: '📍 Endereço',
            field: 'endereco',
            variations: ['endereco', 'endereço', 'address', 'rua', 'logradouro', 'local', 'ENDERECO', 'ENDEREÇO', 'ADDRESS', 'RUA', 'LOGRADOURO', 'LOCAL', 'Endereco', 'Endereço', 'Address', 'Rua', 'Logradouro', 'Local']
        },
        'mapCidade': {
            label: '🏙️ Cidade',
            field: 'cidade',
            variations: ['cidade', 'city', 'municipio', 'município', 'localidade', 'CIDADE', 'CITY', 'MUNICIPIO', 'MUNICÍPIO', 'LOCALIDADE', 'Cidade', 'City', 'Municipio', 'Município', 'Localidade']
        },
        'mapPEP': {
            label: '📋 PEP',
            field: 'pep',
            variations: ['pep', 'codigo', 'código', 'cod', 'identificador']
        },
        'mapCodImovelGed': {
            label: '🏠 COD IMOVEL GED',
            field: 'codImovelGed',
            variations: ['cod imovel ged', 'codimovelged', 'imovel ged', 'ged', 'código imóvel']
        },
        'mapNodeGerencial': {
            label: '🌐 NODE GERENCIAL',
            field: 'nodeGerencial',
            variations: ['node gerencial', 'nodegerencial', 'node', 'gerencial', 'NODE GERENCIAL', 'NODE', 'GERENCIAL', 'Node Gerencial', 'Node', 'Gerencial']
        },
        'mapAreaTecnica': {
            label: '🔧 Área Técnica',
            field: 'areaTecnica',
            variations: ['area tecnica', 'área técnica', 'areatecnica', 'área', 'tecnica', 'ÁREA TÉCNICA', 'ÁREA', 'TÉCNICA', 'Area Tecnica', 'Area', 'Tecnica']
        },
        'mapHP': {
            label: '🔢 HP (Quantidade)',
            field: 'hp',
            variations: ['hp', 'quantidade', 'qtd', 'qte', 'homes', 'unidades', 'total', 'HP', 'Quantidade', 'Qtd', 'Qte', 'Homes', 'Unidades', 'Total']
        },
        'mapAndar': {
            label: '🏢 ANDAR',
            field: 'andar',
            variations: ['andar', 'piso', 'floor', 'nivel', 'nível', 'ANDAR', 'PISO', 'FLOOR', 'NIVEL', 'NÍVEL', 'Andar', 'Piso', 'Floor', 'Nivel', 'Nível']
        },
        'mapDataRecebimento': {
            label: '📅 Data Recebimento',
            field: 'dataRecebimento',
            variations: ['data recebimento', 'datarecebimento', 'recebimento', 'data de recebimento', 'DATA RECEBIMENTO', 'Data Recebimento']
        },
        'mapDataInicio': {
            label: '📅 Data Início',
            field: 'dataInicio',
            variations: ['data inicio', 'datainicio', 'inicio', 'data de início', 'início', 'DATA INÍCIO', 'Data Início']
        },
        'mapDataFinal': {
            label: '📅 Data Final',
            field: 'dataFinal',
            variations: ['data final', 'datafinal', 'final', 'data de finalização', 'finalização', 'DATA FINAL', 'Data Final']
        },
        'mapEquipe': {
            label: '👥 Equipe',
            field: 'equipe',
            variations: ['equipe', 'team', 'grupo', 'squad', 'time', 'membro', 'funcionario', 'funcionário', 'colaborador', 'técnico', 'EQUIPE', 'TEAM', 'GRUPO', 'SQUAD', 'TIME', 'MEMBRO', 'FUNCIONARIO', 'FUNCIONÁRIO', 'COLABORADOR', 'TÉCNICO', 'Equipe', 'Team', 'Grupo', 'Squad', 'Time', 'Membro', 'Funcionario', 'Funcionário', 'Colaborador', 'Técnico']
        },
        'mapSupervisor': {
            label: '👨‍💼 Supervisor',
            field: 'supervisor',
            variations: ['supervisor', 'gerente', 'lider', 'líder', 'responsavel', 'responsável', 'coordenador', 'chefe', 'supervisão', 'gestor', 'SUPERVISOR', 'GERENTE', 'LIDER', 'LÍDER', 'RESPONSAVEL', 'RESPONSÁVEL', 'COORDENADOR', 'CHEFE', 'SUPERVISÃO', 'GESTOR', 'Supervisor', 'Gerente', 'Lider', 'Líder', 'Responsavel', 'Responsável', 'Coordenador', 'Chefe', 'Supervisão', 'Gestor']
        },
        'mapStatus': {
            label: '📊 Status',
            field: 'status',
            variations: ['status', 'situacao', 'situação', 'estado', 'produtiva', 'improdutiva', 'condição', 'STATUS', 'SITUACAO', 'SITUAÇÃO', 'ESTADO', 'PRODUTIVA', 'IMPRODUTIVA', 'CONDIÇÃO', 'Status', 'Situacao', 'Situação', 'Estado', 'Produtiva', 'Improdutiva', 'Condição']
        },
        'mapRDO': {
            label: '📄 RDO',
            field: 'rdo',
            variations: ['rdo', 'relatorio', 'relatório', 'documento', 'RDO', 'RELATORIO', 'RELATÓRIO', 'DOCUMENTO', 'Rdo', 'Relatorio', 'Relatório', 'Documento']
        },
        'mapBook': {
            label: '📚 BOOK',
            field: 'book',
            variations: ['book', 'livro', 'manual', 'documentação', 'BOOK', 'LIVRO', 'MANUAL', 'DOCUMENTAÇÃO', 'Book', 'Livro', 'Manual', 'Documentação']
        },
        'mapProjetoStatus': {
            label: '📊 PROJETO',
            field: 'projetoStatus',
            variations: ['projeto status', 'projetostatus', 'status projeto', 'estado projeto', 'PROJETO', 'PROJETO STATUS', 'PROJETOSTATUS', 'STATUS PROJETO', 'ESTADO PROJETO', 'Projeto', 'Projeto Status', 'Projetostatus', 'Status Projeto', 'Estado Projeto']
        },
        'mapSituacao': {
            label: '📋 Situação',
            field: 'situacao',
            variations: ['situacao', 'situação', 'condicao', 'condição', 'estado atual', 'SITUAÇÃO', 'SITUACAO', 'CONDIÇÃO', 'CONDICAO', 'ESTADO ATUAL', 'Situação', 'Situacao', 'Condição', 'Condicao', 'Estado Atual']
        },
        'mapJustificativa': {
            label: '💬 Justificativa',
            field: 'justificativa',
            variations: ['justificativa', 'justificacao', 'justificação', 'motivo', 'observação', 'JUSTIFICATIVA', 'JUSTIFICACAO', 'JUSTIFICAÇÃO', 'MOTIVO', 'OBSERVAÇÃO', 'Justificativa', 'Justificacao', 'Justificação', 'Motivo', 'Observação']
        }
    };
    
    // Atualizar cabeçalho com contador
    const mappingHeader = mapping.querySelector('h4');
    if (mappingHeader) {
        mappingHeader.innerHTML = `🔗 Mapeamento de Colunas <small style="font-weight: normal; color: #6b7280;">(${Object.keys(mappingSelects).length} campos • arraste para ver todos)</small>`;
    }
    
    // Criar HTML do mapeamento dinamicamente
    const mappingGrid = mapping.querySelector('.mapping-grid');
    if (mappingGrid) {
        mappingGrid.innerHTML = Object.entries(mappingSelects).map(([selectId, config]) => {
            const options = ['<option value="">❌ Não mapear</option>']
                .concat(fileHeaders.map(header => `<option value="${header}">${header}</option>`));
            
            return `
                <div class="mapping-item" id="${selectId}_container">
                    <label for="${selectId}">${config.label}</label>
                    <select id="${selectId}" class="mapping-select" onchange="updateMappingStatus('${selectId}')">
                        ${options.join('')}
                    </select>
                    <small class="mapping-hint">${config.field}</small>
                </div>
            `;
        }).join('');
        
        // Auto-mapear com algoritmo melhorado
        Object.entries(mappingSelects).forEach(([selectId, config]) => {
            const select = document.getElementById(selectId);
            if (select) {
                // Buscar correspondência mais inteligente
                const matchingHeader = findBestMatch(fileHeaders, config.variations);
                if (matchingHeader) {
                    select.value = matchingHeader;
                    updateMappingStatus(selectId);
                    console.log(`✅ Auto-mapeado: ${config.label} → ${matchingHeader}`);
                }
            }
        });
        
        // Mapeamento inteligente baseado no conteúdo dos dados
        if (uploadedData && uploadedData.length > 0) {
            console.log('🔍 Analisando conteúdo dos dados para mapeamento inteligente...');
            
            // Analisar cada coluna
            const columnAnalysis = {};
            
            fileHeaders.forEach((header) => {
                const values = uploadedData.slice(0, 20).map(row => row[header]).filter(val => val && val.toString().trim() !== '');
                const uniqueValues = [...new Set(values)];
                const isRepeated = uniqueValues.length <= 3 && values.length > 5;
                
                // Análise mais detalhada dos valores
                const hasJessica = uniqueValues.some(val => val.toString().toUpperCase().includes('JESSICA'));
                const hasProdutiva = uniqueValues.some(val => 
                    val.toString().toUpperCase().includes('PRODUTIVA') || 
                    val.toString().toUpperCase().includes('IMPRODUTIVA')
                );
                const hasNames = uniqueValues.some(val => {
                    const valStr = val.toString().toUpperCase();
                    return valStr.includes('JOSE') || valStr.includes('MARCOS') || 
                           valStr.includes('CARLOS') || valStr.includes('LAZARO') ||
                           valStr.includes('ANTONIO') || valStr.includes('ALISSON') ||
                           valStr.includes('SANTOS');
                });
                
                // Contar frequência de cada valor
                const valueFrequency = {};
                values.forEach(val => {
                    const key = val.toString().toUpperCase();
                    valueFrequency[key] = (valueFrequency[key] || 0) + 1;
                });
                
                // Verificar se Jessica é o valor mais frequente
                const jessicaFrequency = valueFrequency['JESSICA'] || 0;
                const isJessicaDominant = jessicaFrequency > values.length * 0.3; // Jessica aparece em mais de 30% das linhas
                
                columnAnalysis[header] = {
                    values: values,
                    uniqueCount: uniqueValues.length,
                    isRepeated: isRepeated,
                    commonValues: uniqueValues,
                    hasJessica: hasJessica,
                    hasProdutiva: hasProdutiva,
                    hasNames: hasNames,
                    valueFrequency: valueFrequency,
                    isJessicaDominant: isJessicaDominant,
                    jessicaFrequency: jessicaFrequency,
                    totalValues: values.length
                };
                
                console.log(`📊 Coluna "${header}": ${uniqueValues.length} valores únicos, repetido: ${isRepeated}, Jessica: ${hasJessica} (${jessicaFrequency}/${values.length}), Produtiva: ${hasProdutiva}, Nomes: ${hasNames}`);
            });
            
            // Mapeamento inteligente baseado em regras específicas
            let supervisorMapped = false;
            let statusMapped = false;
            let equipeMapped = false;
            
            console.log('🔍 Iniciando mapeamento inteligente...');
            
            // 1. Primeiro, identificar coluna de STATUS (contém PRODUTIVA/IMPRODUTIVA)
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.hasProdutiva && !statusMapped) {
                    const statusSelect = document.getElementById('mapStatus');
                    if (statusSelect) {
                        statusSelect.value = header;
                        updateMappingStatus('mapStatus');
                        statusMapped = true;
                        console.log(`🎯 Mapeamento inteligente: Status → ${header} (contém PRODUTIVA/IMPRODUTIVA)`);
                    }
                }
            });
            
            // 2. Identificar coluna de SUPERVISOR (Jessica dominante)
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.isJessicaDominant && !supervisorMapped) {
                    const supervisorSelect = document.getElementById('mapSupervisor');
                    if (supervisorSelect) {
                        supervisorSelect.value = header;
                        updateMappingStatus('mapSupervisor');
                        supervisorMapped = true;
                        console.log(`🎯 Mapeamento inteligente: Supervisor → ${header} (Jessica dominante: ${analysis.jessicaFrequency}/${analysis.totalValues})`);
                    }
                }
            });
            
            // 3. Identificar coluna de EQUIPE (contém nomes variados, não repetidos)
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.hasNames && analysis.uniqueCount > 3 && !analysis.isRepeated && !equipeMapped) {
                    const equipeSelect = document.getElementById('mapEquipe');
                    if (equipeSelect) {
                        equipeSelect.value = header;
                        updateMappingStatus('mapEquipe');
                        equipeMapped = true;
                        console.log(`🎯 Mapeamento inteligente: Equipe → ${header} (contém nomes variados: ${analysis.uniqueCount} únicos)`);
                    }
                }
            });
            
            // 4. Se ainda não mapeou, usar lógica de fallback
            if (!supervisorMapped) {
                Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                    if (analysis.isRepeated && analysis.uniqueCount <= 2 && !supervisorMapped) {
                        const supervisorSelect = document.getElementById('mapSupervisor');
                        if (supervisorSelect && !supervisorSelect.value) {
                            supervisorSelect.value = header;
                            updateMappingStatus('mapSupervisor');
                            supervisorMapped = true;
                            console.log(`🎯 Mapeamento fallback: Supervisor → ${header} (coluna repetida)`);
                        }
                    }
                });
            }
            
            if (!equipeMapped) {
                Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                    if (analysis.uniqueCount > 5 && !equipeMapped) {
                        const equipeSelect = document.getElementById('mapEquipe');
                        if (equipeSelect && !equipeSelect.value) {
                            equipeSelect.value = header;
                            updateMappingStatus('mapEquipe');
                            equipeMapped = true;
                            console.log(`🎯 Mapeamento fallback: Equipe → ${header} (muitos valores únicos)`);
                        }
                    }
                });
            }
            
            // 5. Correção específica para casos conhecidos
            console.log('🔧 Aplicando correções específicas...');
            
            // Correção 1: Se Jessica está no status, mover para supervisor
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.hasJessica && !analysis.hasProdutiva) {
                    console.log(`🔍 Analisando coluna "${header}" para correção Jessica`);
                    
                    const statusSelect = document.getElementById('mapStatus');
                    const supervisorSelect = document.getElementById('mapSupervisor');
                    
                    // Se Jessica está mapeada como status, isso está errado
                    if (statusSelect && statusSelect.value === header) {
                        statusSelect.value = '';
                        updateMappingStatus('mapStatus');
                        console.log(`❌ Removendo mapeamento incorreto: Status → ${header} (contém Jessica)`);
                        
                        // Mapear Jessica como supervisor
                        if (supervisorSelect && !supervisorSelect.value) {
                            supervisorSelect.value = header;
                            updateMappingStatus('mapSupervisor');
                            console.log(`✅ Correção aplicada: Supervisor → ${header} (Jessica)`);
                        }
                    }
                }
            });
            
            // Correção 2: Se ALISSON/LAZARO/JOSE estão no supervisor, mover para equipe
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.hasNames && !analysis.isJessicaDominant) {
                    console.log(`🔍 Analisando coluna "${header}" para correção nomes`);
                    
                    const supervisorSelect = document.getElementById('mapSupervisor');
                    const equipeSelect = document.getElementById('mapEquipe');
                    
                    // Se nomes estão mapeados como supervisor, isso está errado
                    if (supervisorSelect && supervisorSelect.value === header) {
                        supervisorSelect.value = '';
                        updateMappingStatus('mapSupervisor');
                        console.log(`❌ Removendo mapeamento incorreto: Supervisor → ${header} (contém nomes: ${analysis.commonValues.join(', ')})`);
                        
                        // Mapear nomes como equipe
                        if (equipeSelect && !equipeSelect.value) {
                            equipeSelect.value = header;
                            updateMappingStatus('mapEquipe');
                            console.log(`✅ Correção aplicada: Equipe → ${header} (nomes: ${analysis.commonValues.join(', ')})`);
                        }
                    }
                }
            });
            
            // Correção 3: Se uma coluna tem PRODUTIVA/IMPRODUTIVA mas não está mapeada como status
            Object.entries(columnAnalysis).forEach(([header, analysis]) => {
                if (analysis.hasProdutiva && !statusMapped) {
                    const statusSelect = document.getElementById('mapStatus');
                    if (statusSelect && !statusSelect.value) {
                        statusSelect.value = header;
                        updateMappingStatus('mapStatus');
                        console.log(`✅ Correção aplicada: Status → ${header} (contém PRODUTIVA/IMPRODUTIVA)`);
                    }
                }
            });
        }
        
        // Atualizar contador inicial
        updateMappingCounter();
    }
    
    mapping.style.display = 'block';
    if (processBtn) processBtn.style.display = 'inline-block';
}

// Encontrar melhor correspondência para mapeamento automático
function findBestMatch(headers, variations) {
    console.log('🔍 Procurando correspondência para:', variations);
    console.log('📋 Headers disponíveis:', headers);
    
    // Normalizar headers para comparação
    const normalizedHeaders = headers.map(header => ({
        original: header,
        normalized: header.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
    }));
    
    // Busca exata primeiro (case-insensitive)
    for (const variation of variations) {
        const normalizedVariation = variation.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        
        const exactMatch = normalizedHeaders.find(header => 
            header.normalized === normalizedVariation
        );
        if (exactMatch) {
            console.log(`✅ Correspondência exata encontrada: ${variation} → ${exactMatch.original}`);
            return exactMatch.original;
        }
    }
    
    // Busca por conteúdo (mais específica)
    for (const variation of variations) {
        const variationLower = variation.toLowerCase().trim();
        
        const containsMatch = normalizedHeaders.find(header => {
            const headerLower = header.original.toLowerCase().trim();
            
            // Verificar se o header contém a variação ou vice-versa
            return headerLower.includes(variationLower) || variationLower.includes(headerLower);
        });
        if (containsMatch) {
            console.log(`✅ Correspondência por conteúdo encontrada: ${variation} → ${containsMatch.original}`);
            return containsMatch.original;
        }
    }
    
    // Busca por palavras-chave específicas com prioridade
    const keywordMap = {
        'equipe': ['equipe', 'team', 'grupo', 'squad', 'time', 'membro', 'colaborador', 'técnico'],
        'supervisor': ['supervisor', 'gerente', 'lider', 'líder', 'responsavel', 'responsável', 'coordenador', 'chefe', 'gestor'],
        'status': ['status', 'situacao', 'situação', 'estado', 'produtiva', 'improdutiva', 'condição'],
        'projeto': ['projeto', 'project', 'proj', 'cliente', 'nome do projeto'],
        'endereco': ['endereco', 'endereço', 'address', 'rua', 'logradouro', 'local']
    };
    
    // Verificar se alguma variação tem palavras-chave específicas
    for (const variation of variations) {
        const variationLower = variation.toLowerCase();
        
        for (const [key, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(keyword => variationLower.includes(keyword))) {
                const keywordMatch = normalizedHeaders.find(header => 
                    keywords.some(keyword => header.original.toLowerCase().includes(keyword))
                );
                if (keywordMatch) {
                    console.log(`✅ Correspondência por palavra-chave encontrada: ${variation} → ${keywordMatch.original}`);
                    return keywordMatch.original;
                }
            }
        }
    }
    
    // Busca por similaridade (último recurso)
    for (const variation of variations) {
        const variationLower = variation.toLowerCase().trim();
        
        const similarityMatch = normalizedHeaders.find(header => {
            const headerLower = header.original.toLowerCase().trim();
            
            // Verificar similaridade (pelo menos 60% de caracteres em comum)
            const commonChars = [...new Set(headerLower)].filter(char => variationLower.includes(char)).length;
            const totalChars = Math.max(headerLower.length, variationLower.length);
            const similarity = commonChars / totalChars;
            
            return similarity >= 0.6;
        });
        if (similarityMatch) {
            console.log(`✅ Correspondência por similaridade encontrada: ${variation} → ${similarityMatch.original}`);
            return similarityMatch.original;
        }
    }
    
    console.log(`❌ Nenhuma correspondência encontrada para: ${variations}`);
    return null;
}

// Atualizar status visual do mapeamento
function updateMappingStatus(selectId) {
    const select = document.getElementById(selectId);
    const container = document.getElementById(selectId + '_container');
    
    if (select && container) {
        if (select.value) {
            container.classList.add('mapped');
        } else {
            container.classList.remove('mapped');
        }
    }
    
    // Atualizar contador de campos mapeados
    updateMappingCounter();
}

// Atualizar contador de campos mapeados
function updateMappingCounter() {
    const mappingHeader = document.querySelector('#uploadMapping h4');
    if (mappingHeader) {
        const totalFields = document.querySelectorAll('.mapping-item').length;
        const mappedFields = document.querySelectorAll('.mapping-item.mapped').length;
        const percentage = totalFields ? Math.round((mappedFields / totalFields) * 100) : 0;
        
        mappingHeader.innerHTML = `🔗 Mapeamento de Colunas <small style="font-weight: normal; color: #6b7280;">(${mappedFields}/${totalFields} mapeados • ${percentage}% • arraste para ver todos)</small>`;
    }
}
// Processar upload final
function processUpload() {
    console.log('⚡ Processando upload final...');
    
    if (!uploadedData || uploadedData.length === 0) {
        alert('Nenhum dado para processar');
        return;
    }
    
    // Obter mapeamento das colunas
    const mapping = {
        projeto: document.getElementById('mapProjeto')?.value || '',
        subProjeto: document.getElementById('mapSubProjeto')?.value || '',
        tipoAcao: document.getElementById('mapTipoAcao')?.value || '',
        condominio: document.getElementById('mapCondominio')?.value || '',
        endereco: document.getElementById('mapEndereco')?.value || '',
        cidade: document.getElementById('mapCidade')?.value || '',
        equipe: document.getElementById('mapEquipe')?.value || '',
        supervisor: document.getElementById('mapSupervisor')?.value || '',
        status: document.getElementById('mapStatus')?.value || '',
        hp: document.getElementById('mapHP')?.value || ''
    };
    
    // Verificar se pelo menos alguns campos foram mapeados
    const mappedFields = Object.values(mapping).filter(v => v !== '').length;
    if (mappedFields === 0) {
        alert('Por favor, mapeie pelo menos uma coluna antes de processar.');
        return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    try {
        // Processar cada linha dos dados
        uploadedData.forEach((row, index) => {
            try {
                // Gerar ID único baseado em timestamp + índice
                const timestamp = Date.now();
                const newId = timestamp + index;
                
                const newEndereco = {
                    id: newId,
                    projeto: mapping.projeto ? row[mapping.projeto] : '',
                    subProjeto: mapping.subProjeto ? row[mapping.subProjeto] : '',
                    tipoAcao: mapping.tipoAcao ? row[mapping.tipoAcao] : '',
                    condominio: mapping.condominio ? row[mapping.condominio] : '',
                    endereco: mapping.endereco ? row[mapping.endereco] : '',
                    cidade: mapping.cidade ? row[mapping.cidade] : '',
                    equipe: mapping.equipe ? row[mapping.equipe] : '',
                    supervisor: mapping.supervisor ? row[mapping.supervisor] : '',
                    status: mapping.status ? row[mapping.status] : '',
                    hp: parseInt(mapping.hp ? row[mapping.hp] : (row['HP'] || row['hp'] || row['quantidade'] || row['qtd'] || 0)) || 0,
                    dataRecebimento: row['Data Recebimento'] || row['dataRecebimento'] || '',
                    pep: row['PEP'] || row['pep'] || '',
                    codImovelGed: row['COD IMOVEL GED'] || row['codImovelGed'] || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                enderecosData.push(newEndereco);
                processedCount++;
                
            } catch (error) {
                console.error('❌ Erro ao processar linha:', row, error);
                errorCount++;
            }
        });
        
        // CRIAR TABELA COMPLETAMENTE NOVA DO ZERO
        console.log('🆕 Criando tabela completamente nova do zero...');
        enderecosData = createTableFromScratch(uploadedData);
        
        // ATUALIZAR TABELAS DE GESTÃO COM DADOS DA PLANILHA
        console.log('🔄 Atualizando tabelas de gestão com dados da planilha...');
        updateGestaoTablesFromUpload(uploadedData, mapping);
        
        // SALVAR DADOS IMEDIATAMENTE
        console.log('💾 Salvando dados no localStorage...');
        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
        
        // Verificar se salvou corretamente
        const savedData = localStorage.getItem('enderecosData');
        const parsedData = savedData ? JSON.parse(savedData) : [];
        
        console.log('📋 Verificação de salvamento:', {
            dadosProcessados: processedCount,
            dadosSalvos: parsedData.length,
            dadosAtuais: enderecosData.length,
            sucesso: enderecosData.length === parsedData.length
        });
        
        // Atualizar interface
        renderEnderecosTable();
        updateStats();
        updateEnderecoStats();
        updateInfraStats();
        populateInfraFilters();
        
        // Fechar modal e mostrar resultado
        closeUploadModal();
        
        const message = `Upload concluído!\n\n` +
                       `✅ ${formatNumber(processedCount)} registros importados com sucesso\n` +
                       (errorCount > 0 ? `❌ ${formatNumber(errorCount)} registros com erro\n` : '') +
                       `📊 Estatísticas atualizadas\n` +
                       `🗂️ Tabelas de gestão atualizadas\n` +
                       `💾 Dados salvos permanentemente\n\n` +
                       `📋 Total de registros: ${enderecosData.length}`;
        
        alert(message);
        
        console.log(`✅ Upload concluído: ${formatNumber(processedCount)} sucessos, ${formatNumber(errorCount)} erros`);
        
    } catch (error) {
        console.error('❌ Erro no processamento do upload:', error);
        alert('Erro ao processar upload: ' + error.message);
    }
}
// Função para atualizar tabelas de gestão com dados da planilha uploadada
function updateGestaoTablesFromUpload(uploadedData, mapping) {
    console.log('🔄 Atualizando tabelas de gestão com dados da planilha...');
    
    try {
        // Extrair dados únicos da planilha
        const extractedData = {
            projetos: new Set(),
            subProjetos: new Set(),
            tiposAcao: new Set(),
            supervisores: new Set(),
            equipes: new Set(),
            cidades: new Set()
        };
        
        // Processar cada linha da planilha
        uploadedData.forEach((row, index) => {
            // Extrair projetos
            if (mapping.projeto && row[mapping.projeto]) {
                extractedData.projetos.add(row[mapping.projeto].toString().trim());
            }
            
            // Extrair sub projetos
            if (mapping.subProjeto && row[mapping.subProjeto]) {
                extractedData.subProjetos.add(row[mapping.subProjeto].toString().trim());
            }
            
            // Extrair tipos de ação
            if (mapping.tipoAcao && row[mapping.tipoAcao]) {
                extractedData.tiposAcao.add(row[mapping.tipoAcao].toString().trim());
            }
            
            // Extrair supervisores
            if (mapping.supervisor && row[mapping.supervisor]) {
                extractedData.supervisores.add(row[mapping.supervisor].toString().trim());
            }
            
            // Extrair equipes
            if (mapping.equipe && row[mapping.equipe]) {
                extractedData.equipes.add(row[mapping.equipe].toString().trim());
            }
            
            // Extrair cidades
            if (mapping.cidade && row[mapping.cidade]) {
                extractedData.cidades.add(row[mapping.cidade].toString().trim());
            }
        });
        
        console.log('📊 Dados extraídos da planilha:', {
            projetos: extractedData.projetos.size,
            subProjetos: extractedData.subProjetos.size,
            tiposAcao: extractedData.tiposAcao.size,
            supervisores: extractedData.supervisores.size,
            equipes: extractedData.equipes.size,
            cidades: extractedData.cidades.size
        });
        
        // Atualizar dados de gestão
        updateGestaoDataFromExtracted(extractedData);
        
        // Recarregar tabelas de gestão
        loadGestaoTables();
        
        console.log('✅ Tabelas de gestão atualizadas com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar tabelas de gestão:', error);
    }
}
// Função para atualizar dados de gestão com dados extraídos
function updateGestaoDataFromExtracted(extractedData) {
    console.log('🔄 Atualizando dados de gestão...');
    
    // Garantir que gestaoData existe
    if (!gestaoData) {
        gestaoData = {
            projetos: [],
            subprojetos: [],
            supervisores: [],
            equipes: [],
            cidades: [],
            tiposAcao: []
        };
    }
    
    // Atualizar projetos
    extractedData.projetos.forEach(projetoNome => {
        const projetoExistente = gestaoData.projetos.find(p => p.nome === projetoNome);
        if (!projetoExistente) {
            gestaoData.projetos.push({
                id: Date.now() + Math.random(),
                nome: projetoNome,
                cliente: 'Cliente Padrão',
                descricao: `Projeto extraído da planilha: ${projetoNome}`,
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Atualizar sub projetos
    extractedData.subProjetos.forEach(subProjetoNome => {
        const subProjetoExistente = gestaoData.subprojetos.find(sp => sp.nome === subProjetoNome);
        if (!subProjetoExistente) {
            gestaoData.subprojetos.push({
                id: Date.now() + Math.random(),
                nome: subProjetoNome,
                projetoPrincipal: 'Projeto Padrão',
                descricao: `Sub projeto extraído da planilha: ${subProjetoNome}`,
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Atualizar tipos de ação
    extractedData.tiposAcao.forEach(tipoAcaoNome => {
        const tipoAcaoExistente = gestaoData.tiposAcao.find(ta => ta.nome === tipoAcaoNome);
        if (!tipoAcaoExistente) {
            gestaoData.tiposAcao.push({
                id: Date.now() + Math.random(),
                nome: tipoAcaoNome,
                descricao: `Tipo de ação extraído da planilha: ${tipoAcaoNome}`,
                categoria: 'Padrão',
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Atualizar supervisores
    extractedData.supervisores.forEach(supervisorNome => {
        const supervisorExistente = gestaoData.supervisores.find(s => s.nome === supervisorNome);
        if (!supervisorExistente) {
            gestaoData.supervisores.push({
                id: Date.now() + Math.random(),
                nome: supervisorNome,
                email: `${supervisorNome.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
                telefone: '(11) 99999-9999',
                area: 'Área Padrão',
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Atualizar equipes
    extractedData.equipes.forEach(equipeNome => {
        const equipeExistente = gestaoData.equipes.find(e => e.nome === equipeNome);
        if (!equipeExistente) {
            gestaoData.equipes.push({
                id: Date.now() + Math.random(),
                nome: equipeNome,
                supervisor: 'Supervisor Padrão',
                membros: [equipeNome],
                area: 'Área Padrão',
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Atualizar cidades
    extractedData.cidades.forEach(cidadeNome => {
        const cidadeExistente = gestaoData.cidades.find(c => c.nome === cidadeNome);
        if (!cidadeExistente) {
            gestaoData.cidades.push({
                id: Date.now() + Math.random(),
                nome: cidadeNome,
                estado: 'Estado Padrão',
                regiao: 'Região Padrão',
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'upload'
            });
        }
    });
    
    // Salvar dados de gestão atualizados
    salvarDadosGestao();
    
    console.log('✅ Dados de gestão atualizados:', {
        projetos: gestaoData.projetos.length,
        subprojetos: gestaoData.subprojetos.length,
        tiposAcao: gestaoData.tiposAcao.length,
        supervisores: gestaoData.supervisores.length,
        equipes: gestaoData.equipes.length,
        cidades: gestaoData.cidades.length
    });
}

// Testar com dados de exemplo
function testUploadWithSampleData() {
    console.log('🧪 Testando upload com dados de exemplo');
    
    const sampleData = [
        {
            projeto: 'PROJETO TESTE UPLOAD',
            subProjeto: 'SUB TESTE UPLOAD',
            tipoAcao: 'VISTORIA',
            condominio: 'CONDOMINIO TESTE UPLOAD',
            endereco: 'RUA TESTE UPLOAD, 123',
            cidade: 'SALVADOR',
            equipe: 'EQUIPE TESTE UPLOAD',
            supervisor: 'SUPERVISOR TESTE',
            status: 'PRODUTIVA',
            hp: 7
        },
        {
            projeto: 'PROJETO TESTE UPLOAD 2',
            subProjeto: 'SUB TESTE UPLOAD 2',
            tipoAcao: 'CONSTRUÇÃO',
            condominio: 'CONDOMINIO TESTE UPLOAD 2',
            endereco: 'AV TESTE UPLOAD, 456',
            cidade: 'LAURO DE FREITAS',
            equipe: 'EQUIPE TESTE UPLOAD 2',
            supervisor: 'SUPERVISOR TESTE 2',
            status: 'IMPRODUTIVA',
            hp: 12
        }
    ];
    
    // Adicionar dados de exemplo
    sampleData.forEach(data => {
        const newId = Math.max(...enderecosData.map(e => e.id), 0) + 1;
        enderecosData.push({ id: newId, ...data });
    });
    
    renderEnderecosTable();
    updateStats();
            updateEnderecoStats();
        updateInfraStats();
        populateFilters();
        populateInfraFilters();
    
    closeUploadModal();
    alert(`Dados de exemplo adicionados com sucesso!\n\n✅ ${sampleData.length} registros importados\n📊 Gráficos atualizados`);
}

// ==================== FUNÇÕES GESTÃO ====================

// Abrir modal de gestão
function openGestaoModal(modalId) {
    console.log('🗂️ Abrindo modal de gestão:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Popular dropdowns específicos
        if (modalId === 'subprojetoModal') {
            populateSubProjetoDropdowns();
        }
    }
}

// Fechar modal de gestão
function closeGestaoModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        // Limpar formulário
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }
}

// Mostrar tab de gestão
function showGestaoTab(tabName) {
    console.log('📑 Mostrando tab:', tabName);
    
    // Esconder todas as tabs
    const tabs = document.querySelectorAll('.gestao-tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Remover ativo de todos os botões
    const buttons = document.querySelectorAll('.gestao-tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Mostrar tab selecionada
    const targetTab = document.getElementById(`gestao-${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Ativar botão correspondente
    const activeBtn = document.querySelector(`[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Carregar tabelas de gestão
function loadGestaoTables() {
    console.log('📊 Carregando tabelas de gestão...');
    
    try {
        // Carregar tabela de projetos
        loadProjectsTable();
        
        // Carregar tabela de sub projetos
        loadSubProjectsTable();
        
        // Carregar tabela de tipos de ação
        loadActionTypesTable();
        
        // Carregar tabela de supervisores
        loadSupervisorsTable();
        
        // Carregar tabela de equipes
        loadTeamsTable();
        
        // Carregar tabela de cidades
        loadCitiesTable();
        
        console.log('✅ Tabelas de gestão carregadas');
    } catch (error) {
        console.error('❌ Erro ao carregar tabelas:', error);
    }
}

// Carregar tabela de projetos
function loadProjectsTable() {
    console.log('🔄 Carregando tabela de projetos...');
    
    const tbody = document.getElementById('projetosTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Buscar todos os projetos disponíveis (sem duplicação)
    const projetosUnicos = new Map();
    
    // 1. Projetos dos dados de endereços (limitado a 100 para performance)
    if (enderecosData && enderecosData.length > 0) {
        const projetosEnderecos = new Set();
        enderecosData.slice(0, 100).forEach((endereco, index) => {
            if (endereco.projeto && endereco.projeto.trim() !== '') {
                const projetoNome = endereco.projeto.trim();
                projetosEnderecos.add(projetoNome);
            }
        });
        
        projetosEnderecos.forEach(projetoNome => {
            const totalEnderecos = enderecosData.filter(e => e.projeto && e.projeto.trim() === projetoNome).length;
            projetosUnicos.set(projetoNome, {
                id: `endereco_${Date.now()}_${projetoNome}`,
                nome: projetoNome,
                cliente: 'Cliente Padrão',
                descricao: `Projeto extraído dos dados de endereços (${totalEnderecos} registros)`,
                status: 'ATIVO',
                created_at: new Date().toISOString(),
                source: 'enderecos',
                totalEnderecos: totalEnderecos
            });
        });
    }
    
    // 2. Projetos dos dados dinâmicos (limitado a 100 para performance)
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        const projetosDinamicos = new Set();
        
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        console.log('🔍 Colunas detectadas para projetos:', columnNames);
        console.log('📋 Coluna PROJETO encontrada:', columnNames.PROJETO);
        
        if (columnNames.PROJETO) {
            console.log('🔄 Processando projetos da coluna:', columnNames.PROJETO);
            
            // Verificar se não está confundindo com SUB PROJETO
            if (columnNames['SUB PROJETO'] && columnNames.PROJETO === columnNames['SUB PROJETO']) {
                console.error('❌ ERRO: Coluna PROJETO e SUB PROJETO são a mesma!');
                return;
            }
            
            dynamicTableData.data.slice(0, 100).forEach((row, index) => {
                const value = row[columnNames.PROJETO]?.toString().trim();
                if (value && value !== '') {
                    // Verificar se não é um valor da coluna SUB PROJETO
                    const subProjetoValue = columnNames['SUB PROJETO'] ? row[columnNames['SUB PROJETO']]?.toString().trim() : '';
                    if (value !== subProjetoValue) {
                        projetosDinamicos.add(value);
                        console.log(`  📊 Projeto encontrado: "${value}" (não é sub projeto)`);
                    } else {
                        console.log(`  ⚠️ Ignorando valor que parece ser sub projeto: "${value}"`);
                    }
                }
            });
        } else {
            console.warn('⚠️ Coluna PROJETO não encontrada na tabela dinâmica');
        }
        
        console.log('📊 Total de projetos únicos encontrados:', projetosDinamicos.size);
        console.log('📋 Lista de projetos:', Array.from(projetosDinamicos));
        
        projetosDinamicos.forEach(projetoNome => {
            if (!projetosUnicos.has(projetoNome)) {
                const totalDinamicos = dynamicTableData.data.filter(row => {
                    return columnNames.PROJETO && row[columnNames.PROJETO] && row[columnNames.PROJETO].toString().trim() === projetoNome;
                }).length;
                
                projetosUnicos.set(projetoNome, {
                    id: `dynamic_${Date.now()}_${projetoNome}`,
                    nome: projetoNome,
                    cliente: 'Cliente Dinâmico',
                    descricao: `Projeto extraído dos dados dinâmicos (${totalDinamicos} registros)`,
                    status: 'ATIVO',
                    created_at: new Date().toISOString(),
                    source: 'dynamic',
                    totalEnderecos: totalDinamicos
                });
            }
        });
    }
    
    // 3. Projetos existentes no gestaoData (manuais) - prioridade máxima
    if (gestaoData.projetos && gestaoData.projetos.length > 0) {
        gestaoData.projetos.forEach(projeto => {
            // Projetos manuais sempre têm prioridade
            projetosUnicos.set(projeto.nome, {
                ...projeto,
                source: 'manual',
                totalEnderecos: projeto.totalEnderecos || 0
            });
        });
    }
    
    const projetosArray = Array.from(projetosUnicos.values());
    
    // FILTRO: Mostrar apenas projetos específicos
    const projetosPermitidos = ['MDU-TOA', 'NAP LOTADA', 'ON GOING', 'PROJETO F', 'SGD', 'SOLICITAÇÃO DE SAIR'];
    const projetosFiltrados = projetosArray.filter(projeto =>
        projetosPermitidos.includes(projeto.nome)
    );
    console.log('📊 Projetos encontrados:', projetosArray.length);
    
    // FILTRO: Mostrar apenas projetos específicos
    // Limitar a 50 projetos para evitar travamento
    const projetosLimitados = projetosFiltrados.slice(0, 50);
    
    if (projetosLimitados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum projeto encontrado</td></tr>';
        return;
    }
    
    if (projetosArray.length > 50) {
        console.log(`⚠️ Limitando exibição a 50 projetos de ${projetosArray.length} encontrados`);
    }
    
    projetosLimitados.forEach((projeto, index) => {
        const row = document.createElement('tr');
        
        // Determinar badge de origem
        let sourceBadge = '';
        if (projeto.source === 'manual') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        } else if (projeto.source === 'dynamic') {
            sourceBadge = '<span class="source-badge dynamic">📊 Dinâmico</span>';
        } else if (projeto.source === 'enderecos') {
            sourceBadge = '<span class="source-badge enderecos">📍 Endereços</span>';
        }
        
        row.innerHTML = `
            <td>${projeto.id}</td>
            <td>${projeto.nome} ${sourceBadge}</td>
            <td>${projeto.cliente || 'N/A'}</td>
            <td>${projeto.descricao || 'N/A'}</td>
            <td><span class="status-badge ${projeto.status?.toLowerCase() || 'ativo'}">${projeto.status || 'ATIVO'}</span></td>
            <td>${formatDate(projeto.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editProject('${projeto.id}', '${projeto.source}')">✏️</button>
                <button class="btn-delete" onclick="deleteProject('${projeto.id}', '${projeto.source}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de projetos carregada com sucesso');
}

// Função para limpar dados duplicados da gestão
async function limparDadosDuplicadosGestao() {
    console.log('🧹 Limpando dados duplicados da gestão...');
    
    if (gestaoData.projetos && gestaoData.projetos.length > 0) {
        const projetosUnicos = new Map();
        
        gestaoData.projetos.forEach(projeto => {
            if (projeto.nome && !projetosUnicos.has(projeto.nome)) {
                projetosUnicos.set(projeto.nome, projeto);
            }
        });
        
        gestaoData.projetos = Array.from(projetosUnicos.values());
        await salvarDadosFirestore('gestaoData', gestaoData);
        
        console.log(`✅ Dados limpos: ${gestaoData.projetos.length} projetos únicos`);
    }
    
    // Limpar também subprojetos, supervisores, etc.
    ['subprojetos', 'supervisores', 'equipes', 'cidades', 'tiposAcao'].forEach(tipo => {
        if (gestaoData[tipo] && gestaoData[tipo].length > 0) {
            const unicos = new Map();
            gestaoData[tipo].forEach(item => {
                const chave = item.nome || item.id;
                if (chave && !unicos.has(chave)) {
                    unicos.set(chave, item);
                }
            });
            gestaoData[tipo] = Array.from(unicos.values());
        }
    });
    
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    console.log('✅ Todos os dados da gestão foram limpos');
}

// Carregar tabela de sub projetos
function loadSubProjectsTable() {
    console.log('🔄 Carregando tabela de sub projetos...');
    
    const tbody = document.getElementById('subprojetosTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Obter todos os sub projetos disponíveis
    const subProjetosUnicos = new Map();
    
    // 1. Sub projetos dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach((endereco, index) => {
            if (endereco.subProjeto && endereco.subProjeto.trim() !== '') {
                const subProjetoNome = endereco.subProjeto.trim();
                
                if (!subProjetosUnicos.has(subProjetoNome)) {
                    subProjetosUnicos.set(subProjetoNome, {
                        id: Date.now() + index + Math.random(),
                        nome: subProjetoNome,
                        projetoPrincipal: endereco.projeto || 'Projeto Padrão',
                        descricao: `Sub projeto extraído dos dados de endereços`,
                        status: 'ATIVO',
                        created_at: new Date().toISOString(),
                        source: 'enderecos'
                    });
                }
            }
        });
    }
    
    // 2. Sub projetos dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        if (columnNames['SUB PROJETO']) {
            dynamicTableData.data.forEach((row, index) => {
                const value = row[columnNames['SUB PROJETO']]?.toString().trim();
                if (value && value !== '') {
                    if (!subProjetosUnicos.has(value)) {
                        // Encontrar projeto principal
                        let projetoPrincipal = 'Projeto Padrão';
                        if (columnNames.PROJETO && row[columnNames.PROJETO]) {
                            projetoPrincipal = row[columnNames.PROJETO].toString().trim();
                        }
                        
                        subProjetosUnicos.set(value, {
                            id: Date.now() + index + Math.random(),
                            nome: value,
                            projetoPrincipal: projetoPrincipal,
                            descricao: `Sub projeto extraído dos dados dinâmicos`,
                            status: 'ATIVO',
                            created_at: new Date().toISOString(),
                            source: 'dynamic'
                        });
                    }
                }
            });
        }
    }
    
    // 3. Sub projetos existentes na gestão
    if (gestaoData.subprojetos && gestaoData.subprojetos.length > 0) {
        gestaoData.subprojetos.forEach(subprojeto => {
            if (!subProjetosUnicos.has(subprojeto.nome)) {
                subProjetosUnicos.set(subprojeto.nome, {
                    ...subprojeto,
                    source: 'gestao'
                });
            }
        });
    }
    
    const subProjetosArray = Array.from(subProjetosUnicos.values());
    
    // FILTRO: Mostrar apenas sub-projetos específicos
    const subProjetosPermitidos = ['CLARO', 'INOVAR', 'NAP LOTADA', 'ON GOING', 'PROJETO F', 'SGD'];
    const subProjetosFiltrados = subProjetosArray.filter(subprojeto =>
        subProjetosPermitidos.includes(subprojeto.nome)
    );
    console.log('📊 Sub projetos encontrados:', subProjetosFiltrados.length);
    
    if (subProjetosFiltrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum sub projeto encontrado</td></tr>';
        return;
    }
    
    subProjetosFiltrados.forEach((subprojeto, index) => {
        const row = document.createElement('tr');
        const sourceBadge = subprojeto.source === 'upload' ? 
            '<span class="source-badge upload">📤 Upload</span>' : 
            '<span class="source-badge manual">✏️ Manual</span>';
        
        row.innerHTML = `
            <td>${subprojeto.id}</td>
            <td>${subprojeto.nome} ${sourceBadge}</td>
            <td>${subprojeto.projetoPrincipal || 'N/A'}</td>
            <td>${subprojeto.descricao || 'N/A'}</td>
            <td><span class="status-badge ${subprojeto.status?.toLowerCase() || 'ativo'}">${subprojeto.status || 'ATIVO'}</span></td>
            <td>${formatDate(subprojeto.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editSubProject(${subprojeto.id})">✏️</button>
                <button class="btn-delete" onclick="deleteSubProject(${subprojeto.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de sub projetos carregada');
}
// Carregar tabela de tipos de ação
async function loadActionTypesTable() {
    console.log('🔄 Carregando tabela de tipos de ação...');
    
    const tbody = document.getElementById('tiposAcaoTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Obter todos os tipos de ação disponíveis
    const tiposAcaoUnicos = new Map();
    
    // 1. Tipos de ação dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach((endereco, index) => {
            if (endereco.tipoAcao && endereco.tipoAcao.trim() !== '') {
                const tipoAcaoNome = endereco.tipoAcao.trim();
                
                if (!tiposAcaoUnicos.has(tipoAcaoNome)) {
                    tiposAcaoUnicos.set(tipoAcaoNome, {
                        id: Date.now() + index + Math.random(),
                        nome: tipoAcaoNome,
                        descricao: `Tipo de ação extraído dos dados de endereços`,
                        categoria: 'Padrão',
                        status: 'ATIVO',
                        created_at: new Date().toISOString(),
                        source: 'enderecos'
                    });
                }
            }
        });
    }
    
    // 2. Tipos de ação dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        console.log('🔄 Processando dados dinâmicos para tipos de ação...');
        
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        const tiposAcaoPlanilha = new Set();
        if (columnNames['TIPO DE AÇÃO']) {
            dynamicTableData.data.forEach(row => {
                const value = row[columnNames['TIPO DE AÇÃO']]?.toString().trim();
                if (value && value !== '') {
                    tiposAcaoPlanilha.add(value);
                }
            });
        }
        
        console.log('📊 Tipos de ação da planilha:', Array.from(tiposAcaoPlanilha));
        
        // Adicionar à lista de tipos únicos
        tiposAcaoPlanilha.forEach((tipoAcaoNome, index) => {
            if (!tiposAcaoUnicos.has(tipoAcaoNome)) {
                tiposAcaoUnicos.set(tipoAcaoNome, {
                    id: Date.now() + index + Math.random(),
                    nome: tipoAcaoNome,
                    descricao: `Tipo de ação extraído da planilha dinâmica: ${tipoAcaoNome}`,
                    categoria: 'Dinâmico',
                    status: 'ATIVO',
                    created_at: new Date().toISOString(),
                    source: 'dynamic'
                });
            }
        });
    }
    
    // 3. Tipos de ação existentes na gestão
    if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
        gestaoData.tiposAcao.forEach(tipo => {
            if (!tiposAcaoUnicos.has(tipo.nome)) {
                tiposAcaoUnicos.set(tipo.nome, {
                    ...tipo,
                    source: 'gestao'
                });
            }
        });
    }
    
    const tiposAcaoArray = Array.from(tiposAcaoUnicos.values());
    console.log('📊 Tipos de ação encontrados:', tiposAcaoArray.length);
    
    // Atualizar gestaoData com os tipos de ação encontrados
    if (tiposAcaoArray.length > 0) {
        gestaoData.tiposAcao = tiposAcaoArray;
        await salvarDadosFirestore('gestaoData', gestaoData);
        console.log('✅ gestaoData.tiposAcao atualizado com', tiposAcaoArray.length, 'tipos de ação');
    }
    
    if (tiposAcaoArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum tipo de ação encontrado</td></tr>';
        return;
    }
    
    tiposAcaoArray.forEach((tipo, index) => {
        const row = document.createElement('tr');
        const sourceBadge = tipo.source === 'upload' ? 
            '<span class="source-badge upload">📤 Upload</span>' : 
            tipo.source === 'dynamic' ? 
            '<span class="source-badge dynamic">🔄 Dinâmico</span>' : 
            '<span class="source-badge manual">✏️ Manual</span>';
        
        row.innerHTML = `
            <td>${tipo.id}</td>
            <td>${tipo.nome} ${sourceBadge}</td>
            <td>${tipo.descricao || 'N/A'}</td>
            <td>${tipo.categoria || 'N/A'}</td>
            <td><span class="status-badge ${tipo.status?.toLowerCase() || 'ativo'}">${tipo.status || 'ATIVO'}</span></td>
            <td>${formatDate(tipo.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editActionType('${tipo.id}', '${tipo.source}')">✏️</button>
                <button class="btn-delete" onclick="deleteActionType('${tipo.id}', '${tipo.source}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de tipos de ação carregada');
}

// Carregar tabela de supervisores
function loadSupervisorsTable() {
    console.log('🔄 Carregando tabela de supervisores...');
    
    const tbody = document.getElementById('supervisoresTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Obter todos os supervisores disponíveis
    const supervisoresUnicos = new Map();
    
    // 1. Supervisores dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach((endereco, index) => {
            if (endereco.supervisor && endereco.supervisor.trim() !== '') {
                const supervisorNome = endereco.supervisor.trim();
                
                if (!supervisoresUnicos.has(supervisorNome)) {
                    supervisoresUnicos.set(supervisorNome, {
                        id: Date.now() + index + Math.random(),
                        nome: supervisorNome,
                        email: `${supervisorNome.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
                        telefone: '(11) 99999-9999',
                        area: 'Área Padrão',
                        status: 'ATIVO',
                        created_at: new Date().toISOString(),
                        source: 'enderecos'
                    });
                }
            }
        });
    }
    
    // 2. Supervisores dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        if (columnNames.SUPERVISOR) {
            dynamicTableData.data.forEach((row, index) => {
                const value = row[columnNames.SUPERVISOR]?.toString().trim();
                if (value && value !== '') {
                    if (!supervisoresUnicos.has(value)) {
                        supervisoresUnicos.set(value, {
                            id: Date.now() + index + Math.random(),
                            nome: value,
                            email: `${value.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
                            telefone: '(11) 99999-9999',
                            area: 'Área Dinâmica',
                            status: 'ATIVO',
                            created_at: new Date().toISOString(),
                            source: 'dynamic'
                        });
                    }
                }
            });
        }
    }
    
    // 3. Supervisores existentes na gestão
    if (gestaoData.supervisores && gestaoData.supervisores.length > 0) {
        gestaoData.supervisores.forEach(supervisor => {
            if (!supervisoresUnicos.has(supervisor.nome)) {
                supervisoresUnicos.set(supervisor.nome, {
                    ...supervisor,
                    source: 'gestao'
                });
            }
        });
    }
    
    const supervisoresArray = Array.from(supervisoresUnicos.values());
    console.log('📊 Supervisores encontrados:', supervisoresArray.length);
    
    if (supervisoresArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum supervisor encontrado</td></tr>';
        return;
    }
    
    supervisoresArray.forEach((supervisor, index) => {
        const row = document.createElement('tr');
        
        // Determinar badge de origem
        let sourceBadge = '';
        if (supervisor.source === 'manual') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        } else if (supervisor.source === 'dynamic') {
            sourceBadge = '<span class="source-badge dynamic">📊 Dinâmico</span>';
        } else if (supervisor.source === 'enderecos') {
            sourceBadge = '<span class="source-badge enderecos">📍 Endereços</span>';
        } else if (supervisor.source === 'gestao') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        }
        
        row.innerHTML = `
            <td>${supervisor.id}</td>
            <td>${supervisor.nome} ${sourceBadge}</td>
            <td>${supervisor.email || 'N/A'}</td>
            <td>${supervisor.telefone || 'N/A'}</td>
            <td>${supervisor.area || 'N/A'}</td>
            <td><span class="status-badge ${supervisor.status?.toLowerCase() || 'ativo'}">${supervisor.status || 'ATIVO'}</span></td>
            <td>${formatDate(supervisor.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editSupervisor('${supervisor.id}', '${supervisor.source}')">✏️</button>
                <button class="btn-delete" onclick="deleteSupervisor('${supervisor.id}', '${supervisor.source}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de supervisores carregada');
}
// Carregar tabela de equipes
function loadTeamsTable() {
    console.log('🔄 Carregando tabela de equipes...');
    
    const tbody = document.getElementById('equipesTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Obter todas as equipes disponíveis
    const equipesUnicas = new Map();
    
    // 1. Equipes dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach((endereco, index) => {
            if (endereco.equipe && endereco.equipe.trim() !== '') {
                const equipeNome = endereco.equipe.trim();
                
                if (!equipesUnicas.has(equipeNome)) {
                    equipesUnicas.set(equipeNome, {
                        id: Date.now() + index + Math.random(),
                        nome: equipeNome,
                        lider: endereco.supervisor || 'Líder Padrão',
                        membros: 5,
                        especialidade: 'Especialidade Padrão',
                        status: 'ATIVO',
                        created_at: new Date().toISOString(),
                        source: 'enderecos'
                    });
                }
            }
        });
    }
    
    // 2. Equipes dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        if (columnNames.EQUIPE) {
            dynamicTableData.data.forEach((row, index) => {
                const value = row[columnNames.EQUIPE]?.toString().trim();
                if (value && value !== '') {
                    if (!equipesUnicas.has(value)) {
                        // Encontrar supervisor/líder
                        let lider = 'Líder Dinâmico';
                        if (columnNames.SUPERVISOR && row[columnNames.SUPERVISOR]) {
                            lider = row[columnNames.SUPERVISOR].toString().trim();
                        }
                        
                        equipesUnicas.set(value, {
                            id: Date.now() + index + Math.random(),
                            nome: value,
                            lider: lider,
                            membros: 5,
                            especialidade: 'Especialidade Dinâmica',
                            status: 'ATIVO',
                            created_at: new Date().toISOString(),
                            source: 'dynamic'
                        });
                    }
                }
            });
        }
    }
    
    // 3. Equipes existentes na gestão
    if (gestaoData.equipes && gestaoData.equipes.length > 0) {
        gestaoData.equipes.forEach(equipe => {
            if (!equipesUnicas.has(equipe.nome)) {
                equipesUnicas.set(equipe.nome, {
                    ...equipe,
                    source: 'gestao'
                });
            }
        });
    }
    
    const equipesArray = Array.from(equipesUnicas.values());
    console.log('📊 Equipes encontradas:', equipesArray.length);
    
    if (equipesArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhuma equipe encontrada</td></tr>';
        return;
    }
    
    equipesArray.forEach((equipe, index) => {
        const row = document.createElement('tr');
        
        // Determinar badge de origem
        let sourceBadge = '';
        if (equipe.source === 'manual') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        } else if (equipe.source === 'dynamic') {
            sourceBadge = '<span class="source-badge dynamic">📊 Dinâmico</span>';
        } else if (equipe.source === 'enderecos') {
            sourceBadge = '<span class="source-badge enderecos">📍 Endereços</span>';
        } else if (equipe.source === 'gestao') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        }
        
        row.innerHTML = `
            <td>${equipe.id}</td>
            <td>${equipe.nome} ${sourceBadge}</td>
            <td>${equipe.lider || 'N/A'}</td>
            <td>${equipe.membros || 'N/A'}</td>
            <td>${equipe.especialidade || 'N/A'}</td>
            <td><span class="status-badge ${equipe.status?.toLowerCase() || 'ativo'}">${equipe.status || 'ATIVO'}</span></td>
            <td>${formatDate(equipe.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editTeam('${equipe.id}', '${equipe.source}')">✏️</button>
                <button class="btn-delete" onclick="deleteTeam('${equipe.id}', '${equipe.source}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de equipes carregada');
}
// Carregar tabela de cidades
function loadCitiesTable() {
    console.log('🔄 Carregando tabela de cidades...');
    
    const tbody = document.getElementById('cidadesTableBody');
    if (!tbody) {
        console.error('❌ tbody não encontrado');
        return;
    }
    
    tbody.innerHTML = '';
    
    // Obter todas as cidades disponíveis
    const cidadesUnicas = new Map();
    
    // 1. Cidades dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach((endereco, index) => {
            if (endereco.cidade && endereco.cidade.trim() !== '') {
                const cidadeNome = endereco.cidade.trim();
                
                if (!cidadesUnicas.has(cidadeNome)) {
                    cidadesUnicas.set(cidadeNome, {
                        id: Date.now() + index + Math.random(),
                        nome: cidadeNome,
                        estado: 'BA',
                        regiao: 'Nordeste',
                        status: 'ATIVO',
                        created_at: new Date().toISOString(),
                        source: 'enderecos'
                    });
                }
            }
        });
    }
    
    // 2. Cidades dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        if (columnNames.CIDADE) {
            dynamicTableData.data.forEach((row, index) => {
                const value = row[columnNames.CIDADE]?.toString().trim();
                if (value && value !== '') {
                    if (!cidadesUnicas.has(value)) {
                        cidadesUnicas.set(value, {
                            id: Date.now() + index + Math.random(),
                            nome: value,
                            estado: 'BA',
                            regiao: 'Nordeste',
                            status: 'ATIVO',
                            created_at: new Date().toISOString(),
                            source: 'dynamic'
                        });
                    }
                }
            });
        }
    }
    
    // 3. Cidades existentes na gestão
    if (gestaoData.cidades && gestaoData.cidades.length > 0) {
        gestaoData.cidades.forEach(cidade => {
            if (!cidadesUnicas.has(cidade.nome)) {
                cidadesUnicas.set(cidade.nome, {
                    ...cidade,
                    source: 'gestao'
                });
            }
        });
    }
    
    const cidadesArray = Array.from(cidadesUnicas.values());
    console.log('📊 Cidades encontradas:', cidadesArray.length);
    
    if (cidadesArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhuma cidade encontrada</td></tr>';
        return;
    }
    
    cidadesArray.forEach((cidade, index) => {
        const row = document.createElement('tr');
        
        // Determinar badge de origem
        let sourceBadge = '';
        if (cidade.source === 'manual') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        } else if (cidade.source === 'dynamic') {
            sourceBadge = '<span class="source-badge dynamic">📊 Dinâmico</span>';
        } else if (cidade.source === 'enderecos') {
            sourceBadge = '<span class="source-badge enderecos">📍 Endereços</span>';
        } else if (cidade.source === 'gestao') {
            sourceBadge = '<span class="source-badge manual">✏️ Manual</span>';
        }
        
        row.innerHTML = `
            <td>${cidade.id}</td>
            <td>${cidade.nome} ${sourceBadge}</td>
            <td>${cidade.estado || 'N/A'}</td>
            <td>${cidade.regiao || 'N/A'}</td>
            <td><span class="status-badge ${cidade.status?.toLowerCase() || 'ativo'}">${cidade.status || 'ATIVO'}</span></td>
            <td>${formatDate(cidade.created_at)}</td>
            <td>
                <button class="btn-edit" onclick="editCity('${cidade.id}', '${cidade.source}')">✏️</button>
                <button class="btn-delete" onclick="deleteCity('${cidade.id}', '${cidade.source}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    console.log('✅ Tabela de cidades carregada');
}

// Função auxiliar para formatar data
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// ==================== FUNÇÕES GRÁFICOS ====================

// Processar dados para gráficos
function processDataForCharts() {
    console.log('📊 Processando dados para gráficos...');
    
    if (enderecosData.length === 0) {
        console.log('⚠️ Nenhum dado disponível para gráficos');
        csvData = {
            projetos: [],
            subProjetos: [],
            cidades: [],
            hpProjetos: [],
            supervisores: []
        };
        return;
    }
    
    // Usar as funções específicas para cada tipo de cálculo
    const projetos = calculateProjetosData();
    const subProjetos = calculateSubProjetosData();
    const cidades = calculateCidadesData();
    
    // Processar HP por projeto
    const hpProjetos = {};
    enderecosData.forEach(item => {
        if (item.tipoAcao === 'ATIVAÇÃO') {
            const projeto = item.projeto || 'Não definido';
            hpProjetos[projeto] = (hpProjetos[projeto] || 0) + (parseInt(item.hp) || 0);
        }
    });
    
    const hpProjetosArray = Object.entries(hpProjetos).map(([projeto, hp]) => ({
        projeto,
        hp
    }));
    
    // Processar supervisores
    const supervisoresData = {};
    enderecosData.forEach(item => {
        if (item.tipoAcao === 'VISTORIA' || item.tipoAcao === 'MDU-TOA') {
            const supervisor = item.supervisor || 'Não definido';
            if (!supervisoresData[supervisor]) {
                supervisoresData[supervisor] = { nome: supervisor, produtiva: 0, improdutiva: 0 };
            }
            
            if (item.status === 'PRODUTIVA') {
                supervisoresData[supervisor].produtiva++;
            } else if (item.status === 'IMPRODUTIVA') {
                supervisoresData[supervisor].improdutiva++;
            }
        }
    });
    
    csvData = {
        projetos,
        subProjetos,
        cidades,
        hpProjetos: hpProjetosArray,
        supervisores: Object.values(supervisoresData)
    };
    
    console.log('✅ Dados processados para gráficos');
    
    // Recriar todos os gráficos com os novos dados
    createAllCharts();
    
    // Atualizar tabelas de dados calculados
    updateAllCalculatedTables();
}

// Função para criar todos os gráficos (placeholder)
function createAllCharts() {
    console.log('📊 Criando gráficos...');
    // Esta função foi removida anteriormente, mantendo apenas como placeholder
}
// Gráfico de projetos
function createQuantidadeProjetosBarChart() {
    const ctx = document.getElementById('quantidadeProjetosBarChart');
    if (!ctx || !csvData.projetos || csvData.projetos.length === 0) return;

    if (allCharts.quantidadeProjetos) {
        allCharts.quantidadeProjetos.destroy();
    }

    const labels = csvData.projetos.map(p => p.nome);
    const data = csvData.projetos.map(p => p.quantidade);
    const percentuais = csvData.projetos.map(p => parseFloat(p.percentual));

    allCharts.quantidadeProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentual (%)',
                data: percentuais,
                type: 'line',
                borderColor: '#FF6B8A',
                backgroundColor: 'rgba(255, 107, 138, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FF6B8A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y1',
                order: 0
            }, {
                label: 'Quantidade de Projetos',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 60,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Gráfico de sub projetos
function createQuantidadeSubProjetosBarChart() {
    const ctx = document.getElementById('quantidadeSubProjetosBarChart');
    if (!ctx || !csvData.subProjetos || csvData.subProjetos.length === 0) return;

    if (allCharts.quantidadeSubProjetos) {
        allCharts.quantidadeSubProjetos.destroy();
    }

    const labels = csvData.subProjetos.map(p => p.nome);
    const data = csvData.subProjetos.map(p => p.quantidade);
    const percentuais = csvData.subProjetos.map(p => parseFloat(p.percentual));

    allCharts.quantidadeSubProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentual (%)',
                data: percentuais,
                type: 'line',
                borderColor: '#FF6B8A',
                backgroundColor: 'rgba(255, 107, 138, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FF6B8A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y1',
                order: 0
            }, {
                label: 'Quantidade de Sub Projetos',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 60,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Gráfico de cidades
function createQuantidadeCidadesBarChart() {
    const ctx = document.getElementById('quantidadeCidadesBarChart');
    if (!ctx || !csvData.cidades || csvData.cidades.length === 0) return;

    if (allCharts.quantidadeCidades) {
        allCharts.quantidadeCidades.destroy();
    }

    const labels = csvData.cidades.map(p => p.nome);
    const data = csvData.cidades.map(p => p.quantidade);
    const percentuais = csvData.cidades.map(p => parseFloat(p.percentual));

    allCharts.quantidadeCidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentual (%)',
                data: percentuais,
                type: 'line',
                borderColor: '#FF6B8A',
                backgroundColor: 'rgba(255, 107, 138, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FF6B8A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y1',
                order: 0
            }, {
                label: 'Quantidade de Cidades',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 60,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}
// Gráfico HP por projeto
function createHpAtivadosPorProjetoBarChart() {
    const ctx = document.getElementById('hpAtivadosPorProjetoBarChart');
    if (!ctx || !csvData.hpProjetos || csvData.hpProjetos.length === 0) return;

    if (allCharts.hpAtivadosPorProjeto) {
        allCharts.hpAtivadosPorProjeto.destroy();
    }

    const labels = csvData.hpProjetos.map(p => p.projeto);
    const data = csvData.hpProjetos.map(p => p.hp);
    
    // Calcular percentuais
    const totalHP = data.reduce((sum, hp) => sum + hp, 0);
    const percentuais = data.map(hp => totalHP > 0 ? ((hp / totalHP) * 100) : 0);

    allCharts.hpAtivadosPorProjeto = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentual (%)',
                data: percentuais,
                type: 'line',
                borderColor: '#FF6B8A',
                backgroundColor: 'rgba(255, 107, 138, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FF6B8A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y1',
                order: 0
            }, {
                label: 'HP Ativados',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 60,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}
// Gráfico de supervisores
function createEnderecosPorSupervisorBarChart() {
    const ctx = document.getElementById('enderecosPorSupervisorBarChart');
    if (!ctx || !csvData.supervisores || csvData.supervisores.length === 0) return;

    if (allCharts.enderecosPorSupervisor) {
        allCharts.enderecosPorSupervisor.destroy();
    }

    const labels = csvData.supervisores.map(s => s.nome);
    const produtiva = csvData.supervisores.map(s => s.produtiva);
    const improdutiva = csvData.supervisores.map(s => s.improdutiva);
    
    // Calcular percentuais de produtividade
    const percentuais = labels.map((_, index) => {
        const total = produtiva[index] + improdutiva[index];
        return total > 0 ? ((produtiva[index] / total) * 100) : 0;
    });

    allCharts.enderecosPorSupervisor = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Percentual Produtividade (%)',
                data: percentuais,
                type: 'line',
                borderColor: '#FF6B8A',
                backgroundColor: 'rgba(255, 107, 138, 0.2)',
                borderWidth: 3,
                pointBackgroundColor: '#FF6B8A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                yAxisID: 'y1',
                order: 0
            }, {
                label: 'Produtiva',
                data: produtiva,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 2
            }, {
                label: 'Improdutiva',
                data: improdutiva,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                order: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 60,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toFixed(1)}%`;
                            } else {
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#000000',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// ==================== FUNÇÕES FILTROS ====================



// Filtro de busca na tabela
function filterTable() {
    const searchTerm = document.getElementById('searchInput')?.value || '';
    
    // Usar busca dinâmica se há dados dinâmicos
    if (dynamicTableData.data.length > 0) {
        searchDynamicTable(searchTerm);
        // Atualizar integração após busca
        setTimeout(() => integrateDynamicData(), 100);
    } else {
        // Busca na tabela fixa
        const rows = document.querySelectorAll('#enderecosTableBody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }
}

// Filtrar por status
function filterByStatus(status) {
    console.log('🔍 Filtrando por status:', status);
    
    const rows = document.querySelectorAll('#enderecosTableBody tr');
    
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
        } else {
            const statusCell = row.querySelector('.status-badge');
            const cellText = statusCell ? statusCell.textContent : '';
            row.style.display = cellText.includes(status) ? '' : 'none';
        }
    });
}

// ==================== FUNÇÕES AUXILIARES ====================

// Função de exportação
function exportData() {
    console.log('📁 Exportando dados...');
    try {
        if (!enderecosData || enderecosData.length === 0) {
            alert('Nenhum dado disponível para exportar');
            return;
        }

        // Criar CSV
        const headers = Object.keys(enderecosData[0]);
        const csvContent = [
            headers.join(','),
            ...enderecosData.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `enderecos_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        console.log('✅ Dados exportados');
    } catch (error) {
        console.error('❌ Erro na exportação:', error);
        alert('Erro ao exportar dados');
    }
}

// Mostrar menu de exportação
function showExportMenu() {
    alert('Menu de exportação em desenvolvimento');
}




// Inicializar CRUD
function initializeCRUD() {
    console.log('📋 Inicializando CRUD...');
    try {
        // Carregar dados dinâmicos primeiro
        loadDynamicData();
        
        // Sempre carregar dados dinâmicos se disponível
        if (dynamicTableData.data.length > 0) {
            console.log('🔄 Usando tabela dinâmica');
            renderDynamicTable();
            // Integrar dados dinâmicos existentes
            integrateDynamicData();
        } else {
            console.log('📊 Usando tabela fixa');
            renderEnderecosTable();
        }
        
        // SEMPRE atualizar cards, independente do tipo de dados
        console.log('🔄 Atualizando cards na inicialização...');
        updateDynamicStatsCards();
        updateInfraStats();
        
        // Forçar atualização após um delay para garantir sincronização
        setTimeout(() => {
            console.log('🔄 Forçando atualização dos cards após delay...');
            updateDynamicStatsCards();
            updateInfraStats();
        }, 1000);
        
        // Configurar persistência automática dos cards
        setupCardPersistence();
        
        // Sincronizar endereços com tabela dinâmica se necessário
        if (enderecosData.length > 0 && dynamicTableData.data.length === 0) {
            console.log('🔄 Sincronizando endereços existentes com tabela dinâmica...');
            syncEnderecosWithDynamicTable();
        }
        
        console.log('✅ CRUD inicializado');
    } catch (error) {
        console.error('❌ Erro no CRUD:', error);
    }
}

// Inicializar dados de gestão
async function initializeGestaoData() {
    console.log('🗂️ Inicializando dados de gestão...');
    try {
        // Carregar dados existentes do localStorage ou usar padrão
        const savedGestaoData = localStorage.getItem('gestaoData');
        if (savedGestaoData) {
            gestaoData = JSON.parse(savedGestaoData);
            console.log('📋 Dados de gestão carregados do localStorage');
            console.log('📋 gestaoData.projetos:', gestaoData.projetos);
            
            // Verificar e corrigir estrutura dos dados
            corrigirEstruturaGestaoData();
        } else {
            gestaoData = {
                projetos: [
                    { id: 1, nome: 'PROJETO F', cliente: 'Cliente A', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 2, nome: 'MDU-TOA', cliente: 'Cliente B', status: 'ATIVO', created_at: new Date().toISOString() }
                ],
                subprojetos: [
                    { id: 1, nome: 'SUBPROJETO A', projetoPrincipal: 'PROJETO F', status: 'ATIVO', created_at: new Date().toISOString() }
                ],
                tiposAcao: [
                    { id: 1, nome: 'ATIVAÇÃO', categoria: 'ATIVAÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 2, nome: 'CONSTRUÇÃO', categoria: 'CONSTRUÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 3, nome: 'VISTORIA', categoria: 'VISTORIA', status: 'ATIVO', created_at: new Date().toISOString() }
                ],
                supervisores: [
                    { id: 1, nome: 'JESSICA', area: 'Vistoria', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 2, nome: 'ROBERTO', area: 'Construção', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 3, nome: 'VALNEI', area: 'Ativação', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 4, nome: 'CARLOS', area: 'Vistoria', status: 'ATIVO', created_at: new Date().toISOString() }
                ],
                equipes: [
                    { id: 1, nome: 'Equipe Alpha', lider: 'JESSICA', especialidade: 'Vistoria', status: 'ATIVO', created_at: new Date().toISOString() }
                ],
                cidades: [
                    { id: 1, nome: 'São Paulo', estado: 'SP', regiao: 'Sudeste', status: 'ATIVO', created_at: new Date().toISOString() },
                    { id: 2, nome: 'Rio de Janeiro', estado: 'RJ', regiao: 'Sudeste', status: 'ATIVO', created_at: new Date().toISOString() }
                ]
            };
            // Salvar dados iniciais
            await salvarDadosFirestore('gestaoData', gestaoData);
        }
        
        // Limpar dados duplicados na inicialização
        limparDadosDuplicadosGestao();
        
        // Configurar event listeners dos formulários
        setupGestaoFormListeners();
        
        console.log('✅ Dados de gestão inicializados');
    } catch (error) {
        console.error('❌ Erro nos dados de gestão:', error);
    }
}

// Função para corrigir e organizar dados da gestão
function corrigirEstruturaGestaoData() {
    console.log('🔧 Corrigindo estrutura dos dados de gestão...');
    
    // Verificar se os dados estão organizados corretamente
    const dadosCorrigidos = {
        projetos: [],
        subprojetos: [],
        tiposAcao: [],
        supervisores: [],
        equipes: [],
        cidades: []
    };
    
    // Separar projetos de sub projetos
    if (gestaoData.projetos) {
        gestaoData.projetos.forEach(item => {
            if (item.nome && item.nome.toLowerCase().includes('sub')) {
                // É um sub projeto
                dadosCorrigidos.subprojetos.push({
                    id: item.id,
                    nome: item.nome,
                    projetoPrincipal: 'Projeto MDU', // Projeto principal padrão
                    status: item.status || 'ATIVO',
                    created_at: item.created_at || new Date().toISOString()
                });
            } else {
                // É um projeto principal
                dadosCorrigidos.projetos.push({
                    id: item.id,
                    nome: item.nome,
                    cliente: item.cliente || 'Cliente Dinâmico',
                    status: item.status || 'ATIVO',
                    created_at: item.created_at || new Date().toISOString()
                });
            }
        });
    }
    
    // Copiar outros dados (evitar duplicação)
    if (gestaoData.subprojetos) {
        // Usar apenas os dados originais, não concatenar
        dadosCorrigidos.subprojetos = gestaoData.subprojetos;
    }
    if (gestaoData.tiposAcao) {
        dadosCorrigidos.tiposAcao = gestaoData.tiposAcao;
    } else {
        // Garantir que há tipos de ação padrão
        dadosCorrigidos.tiposAcao = [
            { id: 1, nome: 'ATIVAÇÃO', categoria: 'ATIVAÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 2, nome: 'CONSTRUÇÃO', categoria: 'CONSTRUÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 3, nome: 'VISTORIA', categoria: 'VISTORIA', status: 'ATIVO', created_at: new Date().toISOString() }
        ];
    }
    if (gestaoData.supervisores) {
        dadosCorrigidos.supervisores = gestaoData.supervisores;
    }
    if (gestaoData.equipes) {
        dadosCorrigidos.equipes = gestaoData.equipes;
    }
    if (gestaoData.cidades) {
        dadosCorrigidos.cidades = gestaoData.cidades;
    }
    
    // Garantir que há pelo menos um projeto principal
    if (dadosCorrigidos.projetos.length === 0) {
        dadosCorrigidos.projetos.push({
            id: Date.now(),
            nome: 'Projeto MDU',
            cliente: 'Cliente Dinâmico',
            status: 'ATIVO',
            created_at: new Date().toISOString()
        });
    }
    
    // Atualizar gestaoData
    gestaoData = dadosCorrigidos;
    
    // Salvar dados corrigidos
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    console.log('✅ Estrutura corrigida:');
    console.log('  - Projetos:', gestaoData.projetos.map(p => p.nome));
    console.log('  - Sub Projetos:', gestaoData.subprojetos.map(sp => sp.nome));
    console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : 'Nenhum');
    console.log('  - Supervisores:', gestaoData.supervisores.map(s => s.nome));
    console.log('  - Equipes:', gestaoData.equipes.map(e => e.nome));
    console.log('  - Cidades:', gestaoData.cidades.map(c => c.nome));
}

// Função para reorganizar completamente os dados da gestão
function reorganizarGestaoData() {
    console.log('🔄 Reorganizando dados da gestão...');
    
    // Criar estrutura limpa e organizada
    gestaoData = {
        projetos: [
            { 
                id: Date.now(), 
                nome: 'Projeto MDU', 
                cliente: 'Cliente Dinâmico', 
                status: 'ATIVO', 
                created_at: new Date().toISOString() 
            }
        ],
        subprojetos: [
            { 
                id: Date.now() + 1, 
                nome: 'Sub Projeto 1', 
                projetoPrincipal: 'Projeto MDU', 
                status: 'ATIVO', 
                created_at: new Date().toISOString() 
            },
            { 
                id: Date.now() + 2, 
                nome: 'Sub Projeto 2', 
                projetoPrincipal: 'Projeto MDU', 
                status: 'ATIVO', 
                created_at: new Date().toISOString() 
            },
            { 
                id: Date.now() + 3, 
                nome: 'Sub Projeto 3', 
                projetoPrincipal: 'Projeto MDU', 
                status: 'ATIVO', 
                created_at: new Date().toISOString() 
            }
        ],
        tiposAcao: [
            { id: 1, nome: 'ATIVAÇÃO', categoria: 'ATIVAÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 2, nome: 'CONSTRUÇÃO', categoria: 'CONSTRUÇÃO', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 3, nome: 'VISTORIA', categoria: 'VISTORIA', status: 'ATIVO', created_at: new Date().toISOString() }
        ],
        supervisores: [
            { id: 1, nome: 'JESSICA', area: 'Vistoria', status: 'ATIVO', created_at: new Date().toISOString() }
        ],
        equipes: [
            { id: 1, nome: 'CARLOS ANTONIO', lider: 'JESSICA', especialidade: 'Vistoria', status: 'ATIVO', created_at: new Date().toISOString() }
        ],
        cidades: [
            { id: 1, nome: 'SALVADOR', estado: 'BA', regiao: 'Nordeste', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 2, nome: 'LAURO DE FREITAS', estado: 'BA', regiao: 'Nordeste', status: 'ATIVO', created_at: new Date().toISOString() },
            { id: 3, nome: 'CAMAÇARI', estado: 'BA', regiao: 'Nordeste', status: 'ATIVO', created_at: new Date().toISOString() }
        ]
    };
    
    // Salvar dados reorganizados
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    console.log('✅ Dados reorganizados:');
    console.log('  - Projetos:', gestaoData.projetos.map(p => p.nome));
    console.log('  - Sub Projetos:', gestaoData.subprojetos.map(sp => sp.nome));
    console.log('  - Supervisores:', gestaoData.supervisores.map(s => s.nome));
    console.log('  - Equipes:', gestaoData.equipes.map(e => e.nome));
    console.log('  - Cidades:', gestaoData.cidades.map(c => c.nome));
    
    // Recarregar tabelas da gestão
    loadGestaoTables();
}

// Configurar event listeners dos formulários de gestão
function setupGestaoFormListeners() {
    console.log('🔗 Configurando listeners dos formulários de gestão...');
    
    // Formulário de Projetos
    const projetoForm = document.getElementById('projetoForm');
    if (projetoForm) {
        projetoForm.onsubmit = function(e) {
            e.preventDefault();
            saveProject();
        };
    }
    
    // Formulário de Sub Projetos
    const subprojetoForm = document.getElementById('subprojetoForm');
    if (subprojetoForm) {
        subprojetoForm.onsubmit = function(e) {
            e.preventDefault();
            saveSubProject();
        };
    }
    
    // Formulário de Tipos de Ação
    const tipoAcaoForm = document.getElementById('tipoAcaoForm');
    if (tipoAcaoForm) {
        tipoAcaoForm.onsubmit = function(e) {
            e.preventDefault();
            saveActionType();
        };
    }
    
    // Formulário de Supervisores
    const supervisorForm = document.getElementById('supervisorForm');
    if (supervisorForm) {
        supervisorForm.onsubmit = function(e) {
            e.preventDefault();
            saveSupervisor();
        };
    }
    
    // Formulário de Equipes
    const equipeForm = document.getElementById('equipeForm');
    if (equipeForm) {
        equipeForm.onsubmit = function(e) {
            e.preventDefault();
            saveTeam();
        };
    }
    
    // Formulário de Cidades
    const cidadeForm = document.getElementById('cidadeForm');
    if (cidadeForm) {
        cidadeForm.onsubmit = function(e) {
            e.preventDefault();
            saveCity();
        };
    }
}
// Salvar projeto
async function saveProject() {
    console.log('💾 Salvando projeto...');
    
    const form = document.getElementById('projetoForm');
    if (!form) {
        console.error('❌ Formulário de projeto não encontrado');
        showError('Erro', 'Formulário de projeto não encontrado');
        return;
    }
    
    const formData = new FormData(form);
    const modal = document.getElementById('projetoModal');
    
    if (!modal) {
        console.error('❌ Modal de projeto não encontrado');
        showError('Erro', 'Modal de projeto não encontrado');
        return;
    }
    
    const editId = modal.getAttribute('data-edit-id');
    const editSource = modal.getAttribute('data-edit-source');
    
    let projeto;
    
    if (editId) {
        // Modo de edição
        console.log('✏️ Editando projeto existente:', editId, '(Origem:', editSource, ')');
        
        if (editSource === 'manual') {
            const index = gestaoData.projetos.findIndex(p => p.id == editId);
            if (index !== -1) {
                projeto = {
                    ...gestaoData.projetos[index],
                    nome: formData.get('nome'),
                    cliente: formData.get('cliente'),
                    descricao: formData.get('descricao'),
                    status: formData.get('status'),
                    updated_at: new Date().toISOString()
                };
                gestaoData.projetos[index] = projeto;
                await salvarDadosFirestore('gestaoData', gestaoData);
            } else {
                showError('Erro', 'Projeto não encontrado para edição');
                return;
            }
        } else if (editSource === 'dynamic') {
            // Converter projeto dinâmico para manual (adicionar à gestão)
            projeto = {
                id: Date.now(),
                nome: formData.get('nome'),
                cliente: formData.get('cliente'),
                descricao: formData.get('descricao'),
                status: formData.get('status'),
                created_at: new Date().toISOString(),
                source: 'manual'
            };
            gestaoData.projetos.push(projeto);
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // Remover da tabela dinâmica se existir
            const dynamicIndex = dynamicTableData.data.findIndex(p => p.id == editId);
            if (dynamicIndex !== -1) {
                dynamicTableData.data.splice(dynamicIndex, 1);
                saveDynamicData();
            }
        } else if (editSource === 'enderecos') {
            // Converter projeto de endereços para manual (adicionar à gestão)
            projeto = {
                id: Date.now(),
                nome: formData.get('nome'),
                cliente: formData.get('cliente'),
                descricao: formData.get('descricao'),
                status: formData.get('status'),
                created_at: new Date().toISOString(),
                source: 'manual'
            };
            // Usar novo sistema de salvamento
            salvarProjeto(projeto);
        }
    } else {
        // Modo de criação
        projeto = {
            id: Date.now(),
            nome: formData.get('nome'),
            cliente: formData.get('cliente'),
            descricao: formData.get('descricao'),
            status: formData.get('status'),
            created_at: new Date().toISOString(),
            source: 'manual'
        };
        // Usar novo sistema de salvamento
        salvarProjeto(projeto);
    }
    
    console.log('💾 Dados salvos no localStorage:', gestaoData);
    console.log('📊 Projetos no gestaoData:', gestaoData.projetos);
    
    // Limpar modo de edição e fechar modal
    modal.removeAttribute('data-edit-id');
    modal.removeAttribute('data-edit-source');
    closeGestaoModal('projetoModal');
    loadGestaoTables();
    
    // Atualizar dropdowns de Sub Projetos se o modal estiver aberto
    const subprojetoModal = document.getElementById('subprojetoModal');
    if (subprojetoModal && subprojetoModal.style.display === 'block') {
        populateSubProjetoDropdowns();
    }
    
    console.log('✅ Projeto salvo:', projeto.nome);
    showSuccess('Projeto Salvo!', editId ? 'Projeto atualizado com sucesso!' : 'Projeto salvo com sucesso!');
    
    // Atualizar os selects dos formulários para incluir o novo projeto
    populateFormSelects();
}

// Salvar sub projeto
function saveSubProject() {
    console.log('💾 Salvando sub projeto...');
    
    const form = document.getElementById('subprojetoForm');
    const formData = new FormData(form);
    
    const subprojeto = {
        id: Date.now(),
        nome: formData.get('nome'),
        projetoPrincipal: formData.get('projetoPrincipal'),
        descricao: formData.get('descricao'),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };
    
    // Usar novo sistema de salvamento
    salvarSubProjeto(subprojeto);
    
    closeGestaoModal('subprojetoModal');
    loadGestaoTables();
    
    console.log('✅ Sub projeto salvo:', subprojeto.nome);
    showSuccess('Sub Projeto Salvo!', 'Sub projeto salvo com sucesso!');
    
    // Atualizar os selects dos formulários para incluir o novo sub projeto
    populateFormSelects();
}

// Salvar tipo de ação
async function saveActionType() {
    console.log('💾 Salvando tipo de ação...');
    
    const form = document.getElementById('tipoAcaoForm');
    const formData = new FormData(form);
    
    const tipoAcao = {
        id: Date.now(),
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        categoria: formData.get('categoria'),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };
    
    gestaoData.tiposAcao.push(tipoAcao);
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    closeGestaoModal('tipoAcaoModal');
    loadGestaoTables();
    
    console.log('✅ Tipo de ação salvo:', tipoAcao.nome);
    showSuccess('Tipo de Ação Salvo!', 'Tipo de ação salvo com sucesso!');
    
    // Atualizar os selects dos formulários para incluir o novo tipo de ação
    populateFormSelects();
}

// Salvar supervisor
async function saveSupervisor() {
    console.log('💾 Salvando supervisor...');
    
    const form = document.getElementById('supervisorForm');
    const formData = new FormData(form);
    
    const modal = document.getElementById('supervisorModal');
    const editId = modal.getAttribute('data-edit-id');
    const editSource = modal.getAttribute('data-edit-source');
    
    let supervisor;
    
    if (editId) {
        // Modo de edição
        console.log('✏️ Editando supervisor existente:', editId, '(Origem:', editSource, ')');
        
        if (editSource === 'manual' || editSource === 'gestao') {
            const index = gestaoData.supervisores.findIndex(s => s.id == editId);
            if (index !== -1) {
                supervisor = {
                    ...gestaoData.supervisores[index],
                    nome: formData.get('nome'),
                    email: formData.get('email'),
                    telefone: formData.get('telefone'),
                    area: formData.get('area'),
                    status: formData.get('status'),
                    updated_at: new Date().toISOString()
                };
                gestaoData.supervisores[index] = supervisor;
                await salvarDadosFirestore('gestaoData', gestaoData);
            } else {
                showError('Erro', 'Supervisor não encontrado para edição');
                return;
            }
        } else if (editSource === 'dynamic') {
            // Converter supervisor dinâmico para manual (adicionar à gestão)
            supervisor = {
                id: Date.now(),
                nome: formData.get('nome'),
                email: formData.get('email'),
                telefone: formData.get('telefone'),
                area: formData.get('area'),
                status: formData.get('status'),
                created_at: new Date().toISOString(),
                source: 'manual'
            };
            gestaoData.supervisores.push(supervisor);
            await salvarDadosFirestore('gestaoData', gestaoData);
            
            // Remover da tabela dinâmica se existir
            const supervisorNome = editId.split('_')[2];
            const filteredData = dynamicTableData.data.filter(row => {
                const supervisorFields = ['supervisor', 'Supervisor', 'SUPERVISOR', 'super', 'Super', 'SUPER'];
                return !supervisorFields.some(field => row[field] && row[field].toString().trim() === supervisorNome);
            });
            dynamicTableData.data = filteredData;
            saveDynamicData();
        } else if (editSource === 'enderecos') {
            // Converter supervisor de endereços para manual (adicionar à gestão)
            supervisor = {
                id: Date.now(),
                nome: formData.get('nome'),
                email: formData.get('email'),
                telefone: formData.get('telefone'),
                area: formData.get('area'),
                status: formData.get('status'),
                created_at: new Date().toISOString(),
                source: 'manual'
            };
            gestaoData.supervisores.push(supervisor);
            await salvarDadosFirestore('gestaoData', gestaoData);
        }
    } else {
        // Modo de criação
        supervisor = {
            id: Date.now(),
            nome: formData.get('nome'),
            email: formData.get('email'),
            telefone: formData.get('telefone'),
            area: formData.get('area'),
            status: formData.get('status'),
            created_at: new Date().toISOString(),
            source: 'manual'
        };
        gestaoData.supervisores.push(supervisor);
        await salvarDadosFirestore('gestaoData', gestaoData);
    }
    
    // Limpar modo de edição e fechar modal
    modal.removeAttribute('data-edit-id');
    modal.removeAttribute('data-edit-source');
    closeGestaoModal('supervisorModal');
    loadGestaoTables();
    
    console.log('✅ Supervisor salvo:', supervisor.nome);
    showSuccess('Supervisor Salvo!', 'Supervisor salvo com sucesso!');
    
    // Atualizar os selects dos formulários para incluir o novo supervisor
    populateFormSelects();
}

// Salvar equipe
async function saveTeam() {
    console.log('💾 Salvando equipe...');
    
    const form = document.getElementById('equipeForm');
    const formData = new FormData(form);
    
    const equipe = {
        id: Date.now(),
        nome: formData.get('nome'),
        lider: formData.get('lider'),
        membros: formData.get('membros'),
        especialidade: formData.get('especialidade'),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };
    
    gestaoData.equipes.push(equipe);
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    closeGestaoModal('equipeModal');
    loadGestaoTables();
    
    console.log('✅ Equipe salva:', equipe.nome);
    showSuccess('Equipe Salva!', 'Equipe salva com sucesso!');
    
    // Atualizar os selects dos formulários para incluir a nova equipe
    populateFormSelects();
}

// Salvar cidade
async function saveCity() {
    console.log('💾 Salvando cidade...');
    
    const form = document.getElementById('cidadeForm');
    const formData = new FormData(form);
    
    const cidade = {
        id: Date.now(),
        nome: formData.get('nome'),
        estado: formData.get('estado'),
        regiao: formData.get('regiao'),
        status: formData.get('status'),
        created_at: new Date().toISOString()
    };
    
    gestaoData.cidades.push(cidade);
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    closeGestaoModal('cidadeModal');
    loadGestaoTables();
    
    console.log('✅ Cidade salva:', cidade.nome);
    showSuccess('Cidade Salva!', 'Cidade salva com sucesso!');
    
    // Atualizar os selects dos formulários para incluir a nova cidade
    populateFormSelects();
}

// ==================== FUNÇÕES DE EDIÇÃO E EXCLUSÃO - GESTÃO DE PROJETOS ====================

// Funções de Projetos
function editProject(id, source) {
    console.log('✏️ Editando projeto:', id, '(Origem:', source, ')');
    try {
        let projeto = null;
        
        if (source === 'manual') {
            projeto = gestaoData.projetos.find(p => p.id == id);
        } else if (source === 'dynamic') {
            // Para projetos dinâmicos, buscar o primeiro registro com esse projeto
            const projetoNome = id.split('_')[2]; // Extrair nome do projeto do ID
            projeto = dynamicTableData.data.find(row => {
                const projetoFields = ['projeto', 'Projeto', 'PROJETO', 'project', 'Project'];
                return projetoFields.some(field => row[field] && row[field].toString().trim() === projetoNome);
            });
            if (projeto) {
                projeto.nome = projetoNome;
            }
        } else if (source === 'enderecos') {
            // Para projetos de endereços, buscar o primeiro endereço com esse projeto
            const projetoNome = id.split('_')[2]; // Extrair nome do projeto do ID
            projeto = enderecosData.find(endereco => 
                endereco.projeto && endereco.projeto.trim() === projetoNome
            );
            if (projeto) {
                projeto.nome = projetoNome;
            }
        }
        
        if (projeto) {
            // Preencher formulário com dados do projeto
            document.getElementById('projetoNome').value = projeto.nome || '';
            document.getElementById('projetoCliente').value = projeto.cliente || '';
            document.getElementById('projetoDescricao').value = projeto.descricao || '';
            document.getElementById('projetoStatus').value = projeto.status || 'ATIVO';
            
            // Abrir modal de edição
            openGestaoModal('projetoModal');
            
            // Marcar como modo de edição
            document.getElementById('projetoModal').setAttribute('data-edit-id', id);
            document.getElementById('projetoModal').setAttribute('data-edit-source', source);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Projeto não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao editar projeto:', error);
        showError('Erro', 'Erro ao editar projeto: ' + error.message);
    }
}

async function deleteProject(id, source) {
    console.log('🗑️ Deletando projeto:', id, '(Origem:', source, ')');
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar este projeto? Esta ação não pode ser desfeita.',
        () => {
            try {
                if (source === 'manual') {
                    // Usar novo sistema de exclusão
                    if (excluirItemGestao('projetos', id)) {
                        loadProjectsTable();
                        
                        // Atualizar dropdowns de Sub Projetos se o modal estiver aberto
                        const subprojetoModal = document.getElementById('subprojetoModal');
                        if (subprojetoModal && subprojetoModal.style.display === 'block') {
                            populateSubProjetoDropdowns();
                        }
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Projeto deletado');
                        showSuccess('Projeto Deletado!', 'Projeto removido com sucesso!');
                    } else {
                        showError('Erro', 'Projeto não encontrado');
                    }
                } else if (source === 'dynamic') {
                    // Para projetos dinâmicos, remover todas as linhas com esse projeto
                    const projetoNome = id.split('_')[2]; // Extrair nome do projeto do ID
                    const filteredData = dynamicTableData.data.filter(row => {
                        const projetoFields = ['projeto', 'Projeto', 'PROJETO', 'project', 'Project'];
                        return !projetoFields.some(field => row[field] && row[field].toString().trim() === projetoNome);
                    });
                    
                    dynamicTableData.data = filteredData;
                    saveDynamicData();
                    loadProjectsTable();
                    
                    // Atualizar dropdowns de endereços
                    populateFormSelects();
                    
                    console.log('✅ Projeto dinâmico deletado');
                    showSuccess('Projeto Deletado!', 'Projeto removido com sucesso!');
                } else if (source === 'enderecos') {
                    // Para projetos de endereços, remover todos os endereços com esse projeto
                    const projetoNome = id.split('_')[2]; // Extrair nome do projeto do ID
                    const filteredData = enderecosData.filter(endereco => 
                        endereco.projeto && endereco.projeto.trim() !== projetoNome
                    );
                    
                    enderecosData = filteredData;
                    localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
                    loadProjectsTable();
                    
                    // Atualizar dropdowns de endereços
                    populateFormSelects();
                    
                    console.log('✅ Projeto de endereços deletado');
                    showSuccess('Projeto Deletado!', 'Projeto removido com sucesso!');
                }
            } catch (error) {
                console.error('❌ Erro ao deletar projeto:', error);
                showError('Erro', 'Erro ao deletar projeto: ' + error.message);
            }
        }
    );
}

// Funções de Sub-Projetos
function editSubProject(id) {
    console.log('✏️ Editando sub-projeto:', id);
    try {
        // Garantir que gestaoData.subprojetos existe
        if (!gestaoData.subprojetos) {
            gestaoData.subprojetos = [];
        }
        
        const subprojeto = gestaoData.subprojetos.find(sp => sp.id == id);
        if (subprojeto) {
            document.getElementById('subProjectName').value = subprojeto.nome;
            document.getElementById('subProjectDescription').value = subprojeto.descricao || '';
            document.getElementById('subProjectStatus').value = subprojeto.status || 'ativo';
            
            openGestaoModal('subProjectModal');
            document.getElementById('subProjectModal').setAttribute('data-edit-id', id);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Sub-projeto não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao editar sub-projeto:', error);
        showError('Erro', 'Erro ao editar sub-projeto: ' + error.message);
    }
}

async function deleteSubProject(id) {
    console.log('🗑️ Deletando sub-projeto:', id);
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar este sub-projeto? Esta ação não pode ser desfeita.',
        () => {
            try {
                // Garantir que gestaoData.subprojetos existe
                if (!gestaoData.subprojetos) {
                    gestaoData.subprojetos = [];
                }
                
                // Usar novo sistema de exclusão
                if (excluirItemGestao('subprojetos', id)) {
                    loadSubProjectsTable();
                    
                    // Atualizar dropdowns de endereços
                    populateFormSelects();
                    
                    console.log('✅ Sub-projeto deletado');
                    showSuccess('Sub-Projeto Deletado!', 'Sub-projeto removido com sucesso!');
                } else {
                    showError('Erro', 'Sub-projeto não encontrado');
                }
            } catch (error) {
                console.error('❌ Erro ao deletar sub-projeto:', error);
                showError('Erro', 'Erro ao deletar sub-projeto: ' + error.message);
            }
        }
    );
}

// Funções de Tipos de Ação
function editActionType(id, source) {
    console.log('✏️ Editando tipo de ação:', id, '(Origem:', source, ')');
    try {
        // Garantir que gestaoData.tiposAcao existe
        if (!gestaoData.tiposAcao) {
            gestaoData.tiposAcao = [];
        }
        
        let tipo = null;
        
        if (source === 'manual' || source === 'gestao') {
            tipo = gestaoData.tiposAcao.find(t => t.id == id);
        } else if (source === 'dynamic') {
            // Para tipos de ação dinâmicos, buscar o primeiro registro com esse tipo
            const tipoNome = extractNameFromId(id, source);
            if (tipoNome) {
                tipo = dynamicTableData.data.find(row => {
                    const tipoFields = ['tipo', 'Tipo', 'TIPO', 'acao', 'Acao', 'ACAO', 'action', 'Action', 'ACTION'];
                    return tipoFields.some(field => row[field] && row[field].toString().trim() === tipoNome);
                });
                if (tipo) {
                    tipo.nome = tipoNome;
                }
            }
        } else if (source === 'enderecos') {
            // Para tipos de ação de endereços, buscar o primeiro endereço com esse tipo
            const tipoNome = extractNameFromId(id, source);
            if (tipoNome) {
                tipo = enderecosData.find(endereco => 
                    endereco.tipo && endereco.tipo.trim() === tipoNome
                );
                if (tipo) {
                    tipo.nome = tipoNome;
                }
            }
        }
        
        if (tipo) {
            document.getElementById('actionTypeName').value = tipo.nome || '';
            document.getElementById('actionTypeDescription').value = tipo.descricao || '';
            document.getElementById('actionTypeStatus').value = tipo.status || 'ativo';
            
            openGestaoModal('actionTypeModal');
            document.getElementById('actionTypeModal').setAttribute('data-edit-id', id);
            document.getElementById('actionTypeModal').setAttribute('data-edit-source', source);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Tipo de ação não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao editar tipo de ação:', error);
        showError('Erro', 'Erro ao editar tipo de ação: ' + error.message);
    }
}
async function deleteActionType(id, source) {
    console.log('🗑️ Deletando tipo de ação:', id, '(Origem:', source, ')');
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar este tipo de ação? Esta ação não pode ser desfeita.',
        async () => {
            try {
                if (source === 'manual' || source === 'gestao') {
                    // Garantir que gestaoData.tiposAcao existe
                    if (!gestaoData.tiposAcao) {
                        gestaoData.tiposAcao = [];
                    }
                    
                    const index = gestaoData.tiposAcao.findIndex(t => t.id == id);
                    if (index !== -1) {
                        gestaoData.tiposAcao.splice(index, 1);
                        await salvarDadosFirestore('gestaoData', gestaoData);
                        loadActionTypesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Tipo de ação deletado');
                        showSuccess('Tipo de Ação Deletado!', 'Tipo de ação removido com sucesso!');
                    } else {
                        showError('Erro', 'Tipo de ação não encontrado');
                    }
                } else if (source === 'dynamic') {
                    // Para tipos de ação dinâmicos, remover todas as linhas com esse tipo
                    const tipoNome = extractNameFromId(id, source);
                    if (tipoNome) {
                        const filteredData = dynamicTableData.data.filter(row => {
                            const tipoFields = ['tipo', 'Tipo', 'TIPO', 'acao', 'Acao', 'ACAO', 'action', 'Action', 'ACTION'];
                            return !tipoFields.some(field => row[field] && row[field].toString().trim() === tipoNome);
                        });
                        
                        dynamicTableData.data = filteredData;
                        saveDynamicData();
                        loadActionTypesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Tipo de ação dinâmico deletado');
                        showSuccess('Tipo de Ação Deletado!', 'Tipo de ação removido com sucesso!');
                    } else {
                        showError('Erro', 'Nome do tipo de ação não encontrado no ID');
                    }
                } else if (source === 'enderecos') {
                    // Para tipos de ação de endereços, remover todos os endereços com esse tipo
                    const tipoNome = extractNameFromId(id, source);
                    if (tipoNome) {
                        const filteredData = enderecosData.filter(endereco => 
                            endereco.tipo && endereco.tipo.trim() !== tipoNome
                        );
                        
                        enderecosData = filteredData;
                        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
                        loadActionTypesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Tipo de ação de endereços deletado');
                        showSuccess('Tipo de Ação Deletado!', 'Tipo de ação removido com sucesso!');
                    } else {
                        showError('Erro', 'Nome do tipo de ação não encontrado no ID');
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao deletar tipo de ação:', error);
                showError('Erro', 'Erro ao deletar tipo de ação: ' + error.message);
            }
        }
    );
}
// Função auxiliar para extrair nome do ID
function extractNameFromId(id, source) {
    if (source === 'manual' || source === 'gestao') {
        return null; // Para itens manuais, não precisamos extrair nome
    }
    
    // Para itens dinâmicos e endereços, o ID tem formato: source_timestamp_nome
    const parts = id.split('_');
    if (parts.length >= 3) {
        // Juntar todas as partes após o timestamp para reconstruir o nome completo
        return parts.slice(2).join('_');
    }
    return null;
}

// Funções de Supervisores
function editSupervisor(id, source) {
    console.log('✏️ Editando supervisor:', id, '(Origem:', source, ')');
    try {
        let supervisor = null;
        
        if (source === 'manual' || source === 'gestao') {
            supervisor = gestaoData.supervisores.find(s => s.id == id);
        } else if (source === 'dynamic') {
            // Para supervisores dinâmicos, buscar o primeiro registro com esse supervisor
            const supervisorNome = extractNameFromId(id, source);
            if (supervisorNome) {
                supervisor = dynamicTableData.data.find(row => {
                    const supervisorFields = ['supervisor', 'Supervisor', 'SUPERVISOR', 'super', 'Super', 'SUPER'];
                    return supervisorFields.some(field => row[field] && row[field].toString().trim() === supervisorNome);
                });
                if (supervisor) {
                    supervisor.nome = supervisorNome;
                }
            }
        } else if (source === 'enderecos') {
            // Para supervisores de endereços, buscar o primeiro endereço com esse supervisor
            const supervisorNome = extractNameFromId(id, source);
            if (supervisorNome) {
                supervisor = enderecosData.find(endereco => 
                    endereco.supervisor && endereco.supervisor.trim() === supervisorNome
                );
                if (supervisor) {
                    supervisor.nome = supervisorNome;
                }
            }
        }
        
        if (supervisor) {
            document.getElementById('supervisorName').value = supervisor.nome || '';
            document.getElementById('supervisorEmail').value = supervisor.email || '';
            document.getElementById('supervisorPhone').value = supervisor.telefone || '';
            document.getElementById('supervisorStatus').value = supervisor.status || 'ativo';
            
            openGestaoModal('supervisorModal');
            document.getElementById('supervisorModal').setAttribute('data-edit-id', id);
            document.getElementById('supervisorModal').setAttribute('data-edit-source', source);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Supervisor não encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao editar supervisor:', error);
        showError('Erro', 'Erro ao editar supervisor: ' + error.message);
    }
}

async function deleteSupervisor(id, source) {
    console.log('🗑️ Deletando supervisor:', id, '(Origem:', source, ')');
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar este supervisor? Esta ação não pode ser desfeita.',
        async () => {
            try {
                if (source === 'manual' || source === 'gestao') {
                    const index = gestaoData.supervisores.findIndex(s => s.id == id);
                    if (index !== -1) {
                        gestaoData.supervisores.splice(index, 1);
                        await salvarDadosFirestore('gestaoData', gestaoData);
                        loadSupervisorsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Supervisor deletado');
                        showSuccess('Supervisor Deletado!', 'Supervisor removido com sucesso!');
                    } else {
                        showError('Erro', 'Supervisor não encontrado');
                    }
                } else if (source === 'dynamic') {
                    // Para supervisores dinâmicos, remover todas as linhas com esse supervisor
                    const supervisorNome = extractNameFromId(id, source);
                    if (supervisorNome) {
                        const filteredData = dynamicTableData.data.filter(row => {
                            const supervisorFields = ['supervisor', 'Supervisor', 'SUPERVISOR', 'super', 'Super', 'SUPER'];
                            return !supervisorFields.some(field => row[field] && row[field].toString().trim() === supervisorNome);
                        });
                        
                        dynamicTableData.data = filteredData;
                        saveDynamicData();
                        loadSupervisorsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Supervisor dinâmico deletado');
                        showSuccess('Supervisor Deletado!', 'Supervisor removido com sucesso!');
                    } else {
                        showError('Erro', 'Nome do supervisor não encontrado no ID');
                    }
                } else if (source === 'enderecos') {
                    // Para supervisores de endereços, remover todos os endereços com esse supervisor
                    const supervisorNome = extractNameFromId(id, source);
                    if (supervisorNome) {
                        const filteredData = enderecosData.filter(endereco => 
                            endereco.supervisor && endereco.supervisor.trim() !== supervisorNome
                        );
                        
                        enderecosData = filteredData;
                        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
                        loadSupervisorsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Supervisor de endereços deletado');
                        showSuccess('Supervisor Deletado!', 'Supervisor removido com sucesso!');
                    } else {
                        showError('Erro', 'Nome do supervisor não encontrado no ID');
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao deletar supervisor:', error);
                showError('Erro', 'Erro ao deletar supervisor: ' + error.message);
            }
        }
    );
}
// Funções de Equipes
function editTeam(id, source) {
    console.log('✏️ Editando equipe:', id, '(Origem:', source, ')');
    try {
        let equipe = null;
        
        if (source === 'manual' || source === 'gestao') {
            equipe = gestaoData.equipes.find(e => e.id == id);
        } else if (source === 'dynamic') {
            // Para equipes dinâmicas, buscar o primeiro registro com essa equipe
            const equipeNome = extractNameFromId(id, source);
            if (equipeNome) {
                equipe = dynamicTableData.data.find(row => {
                    const equipeFields = ['equipe', 'Equipe', 'EQUIPE', 'team', 'Team', 'TEAM'];
                    return equipeFields.some(field => row[field] && row[field].toString().trim() === equipeNome);
                });
                if (equipe) {
                    equipe.nome = equipeNome;
                }
            }
        } else if (source === 'enderecos') {
            // Para equipes de endereços, buscar o primeiro endereço com essa equipe
            const equipeNome = extractNameFromId(id, source);
            if (equipeNome) {
                equipe = enderecosData.find(endereco => 
                    endereco.equipe && endereco.equipe.trim() === equipeNome
                );
                if (equipe) {
                    equipe.nome = equipeNome;
                }
            }
        }
        
        if (equipe) {
            document.getElementById('teamName').value = equipe.nome || '';
            document.getElementById('teamDescription').value = equipe.descricao || '';
            document.getElementById('teamStatus').value = equipe.status || 'ativo';
            
            openGestaoModal('teamModal');
            document.getElementById('teamModal').setAttribute('data-edit-id', id);
            document.getElementById('teamModal').setAttribute('data-edit-source', source);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Equipe não encontrada');
        }
    } catch (error) {
        console.error('❌ Erro ao editar equipe:', error);
        showError('Erro', 'Erro ao editar equipe: ' + error.message);
    }
}

async function deleteTeam(id, source) {
    console.log('🗑️ Deletando equipe:', id, '(Origem:', source, ')');
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar esta equipe? Esta ação não pode ser desfeita.',
        async () => {
            try {
                if (source === 'manual' || source === 'gestao') {
                    const index = gestaoData.equipes.findIndex(e => e.id == id);
                    if (index !== -1) {
                        gestaoData.equipes.splice(index, 1);
                        await salvarDadosFirestore('gestaoData', gestaoData);
                        loadTeamsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Equipe deletada');
                        showSuccess('Equipe Deletada!', 'Equipe removida com sucesso!');
                    } else {
                        showError('Erro', 'Equipe não encontrada');
                    }
                } else if (source === 'dynamic') {
                    // Para equipes dinâmicas, remover todas as linhas com essa equipe
                    const equipeNome = extractNameFromId(id, source);
                    if (equipeNome) {
                        const filteredData = dynamicTableData.data.filter(row => {
                            const equipeFields = ['equipe', 'Equipe', 'EQUIPE', 'team', 'Team', 'TEAM'];
                            return !equipeFields.some(field => row[field] && row[field].toString().trim() === equipeNome);
                        });
                        
                        dynamicTableData.data = filteredData;
                        saveDynamicData();
                        loadTeamsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Equipe dinâmica deletada');
                        showSuccess('Equipe Deletada!', 'Equipe removida com sucesso!');
                    } else {
                        showError('Erro', 'Nome da equipe não encontrado no ID');
                    }
                } else if (source === 'enderecos') {
                    // Para equipes de endereços, remover todos os endereços com essa equipe
                    const equipeNome = extractNameFromId(id, source);
                    if (equipeNome) {
                        const filteredData = enderecosData.filter(endereco => 
                            endereco.equipe && endereco.equipe.trim() !== equipeNome
                        );
                        
                        enderecosData = filteredData;
                        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
                        loadTeamsTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Equipe de endereços deletada');
                        showSuccess('Equipe Deletada!', 'Equipe removida com sucesso!');
                    } else {
                        showError('Erro', 'Nome da equipe não encontrado no ID');
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao deletar equipe:', error);
                showError('Erro', 'Erro ao deletar equipe: ' + error.message);
            }
        }
    );
}

// Funções de Cidades
function editCity(id, source) {
    console.log('✏️ Editando cidade:', id, '(Origem:', source, ')');
    try {
        let cidade = null;
        
        if (source === 'manual' || source === 'gestao') {
            cidade = gestaoData.cidades.find(c => c.id == id);
        } else if (source === 'dynamic') {
            // Para cidades dinâmicas, buscar o primeiro registro com essa cidade
            const cidadeNome = extractNameFromId(id, source);
            if (cidadeNome) {
                cidade = dynamicTableData.data.find(row => {
                    const cidadeFields = ['cidade', 'Cidade', 'CIDADE', 'city', 'City', 'CITY'];
                    return cidadeFields.some(field => row[field] && row[field].toString().trim() === cidadeNome);
                });
                if (cidade) {
                    cidade.nome = cidadeNome;
                }
            }
        } else if (source === 'enderecos') {
            // Para cidades de endereços, buscar o primeiro endereço com essa cidade
            const cidadeNome = extractNameFromId(id, source);
            if (cidadeNome) {
                cidade = enderecosData.find(endereco => 
                    endereco.cidade && endereco.cidade.trim() === cidadeNome
                );
                if (cidade) {
                    cidade.nome = cidadeNome;
                }
            }
        }
        
        if (cidade) {
            document.getElementById('cityName').value = cidade.nome || '';
            document.getElementById('cityState').value = cidade.estado || '';
            document.getElementById('cityStatus').value = cidade.status || 'ativo';
            
            openGestaoModal('cidadeModal');
            document.getElementById('cidadeModal').setAttribute('data-edit-id', id);
            document.getElementById('cidadeModal').setAttribute('data-edit-source', source);
            
            console.log('✅ Formulário preenchido para edição');
        } else {
            showError('Erro', 'Cidade não encontrada');
        }
    } catch (error) {
        console.error('❌ Erro ao editar cidade:', error);
        showError('Erro', 'Erro ao editar cidade: ' + error.message);
    }
}

async function deleteCity(id, source) {
    console.log('🗑️ Deletando cidade:', id, '(Origem:', source, ')');
    showConfirm(
        'Confirmar Exclusão',
        'Tem certeza que deseja deletar esta cidade? Esta ação não pode ser desfeita.',
        async () => {
            try {
                if (source === 'manual' || source === 'gestao') {
                    const index = gestaoData.cidades.findIndex(c => c.id == id);
                    if (index !== -1) {
                        gestaoData.cidades.splice(index, 1);
                        await salvarDadosFirestore('gestaoData', gestaoData);
                        loadCitiesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Cidade deletada');
                        showSuccess('Cidade Deletada!', 'Cidade removida com sucesso!');
                    } else {
                        showError('Erro', 'Cidade não encontrada');
                    }
                } else if (source === 'dynamic') {
                    // Para cidades dinâmicas, remover todas as linhas com essa cidade
                    const cidadeNome = extractNameFromId(id, source);
                    if (cidadeNome) {
                        const filteredData = dynamicTableData.data.filter(row => {
                            const cidadeFields = ['cidade', 'Cidade', 'CIDADE', 'city', 'City', 'CITY'];
                            return !cidadeFields.some(field => row[field] && row[field].toString().trim() === cidadeNome);
                        });
                        
                        dynamicTableData.data = filteredData;
                        saveDynamicData();
                        loadCitiesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Cidade dinâmica deletada');
                        showSuccess('Cidade Deletada!', 'Cidade removida com sucesso!');
                    } else {
                        showError('Erro', 'Nome da cidade não encontrado no ID');
                    }
                } else if (source === 'enderecos') {
                    // Para cidades de endereços, remover todos os endereços com essa cidade
                    const cidadeNome = extractNameFromId(id, source);
                    if (cidadeNome) {
                        const filteredData = enderecosData.filter(endereco => 
                            endereco.cidade && endereco.cidade.trim() !== cidadeNome
                        );
                        
                        enderecosData = filteredData;
                        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
                        loadCitiesTable();
                        
                        // Atualizar dropdowns de endereços
                        populateFormSelects();
                        
                        console.log('✅ Cidade de endereços deletada');
                        showSuccess('Cidade Deletada!', 'Cidade removida com sucesso!');
                    } else {
                        showError('Erro', 'Nome da cidade não encontrado no ID');
                    }
                }
            } catch (error) {
                console.error('❌ Erro ao deletar cidade:', error);
                showError('Erro', 'Erro ao deletar cidade: ' + error.message);
            }
        }
    );
}

// Inicializar modal de upload
function initializeUploadModal() {
    console.log('📁 Inicializando modal de upload...');
    try {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (uploadArea && fileInput) {
            // Click para selecionar arquivo
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            // Mudança de arquivo
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    handleFileSelect(file);
                }
            });
            
            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFileSelect(files[0]);
                }
            });
            
            console.log('✅ Modal de upload inicializado com drag & drop');
        } else {
            console.error('❌ Elementos de upload não encontrados');
        }
        
        // Inicializar upload via URL
        initializeWebUpload();
        
    } catch (error) {
        console.error('❌ Erro ao inicializar upload:', error);
    }
}

// Popular filtros
function populateFilters() {
    console.log('🔽 Populando filtros...');
    try {
        // Popular datalist com dados únicos dos endereços
        const projetos = [...new Set(enderecosData.map(item => item.projeto).filter(Boolean))];
        const supervisores = [...new Set(enderecosData.map(item => item.supervisor).filter(Boolean))].sort();
        const equipes = [...new Set(enderecosData.map(item => item.equipe).filter(Boolean))];
        const subprojetos = [...new Set(enderecosData.map(item => item.subProjeto).filter(Boolean))];
        // Usar equipes como técnicos para o filtro
        const tecnicos = [...new Set(enderecosData.map(item => item.equipe).filter(Boolean))];
        
        // Extrair dados reais das colunas
        const tiposAcao = [...new Set(enderecosData.map(item => item.tipoAcao).filter(Boolean))].sort();
        const statusOptions = [...new Set(enderecosData.map(item => item.status).filter(Boolean))];
        
        // Popular datalists se existirem
        const populateDatalist = (id, options) => {
            const datalist = document.getElementById(id);
            if (datalist) {
                datalist.innerHTML = options.map(option => `<option value="${option}">`).join('');
            }
        };
        
        populateDatalist('projetos-list', projetos);
        populateDatalist('supervisores-list', supervisores);
        populateDatalist('equipes-list', equipes);
        populateDatalist('subprojetos-list', subprojetos);
        populateDatalist('tipos-acao-list', tiposAcao);
        populateDatalist('status-list', statusOptions);
        populateDatalist('tecnicos-list', tecnicos);
        
        console.log('✅ Filtros populados com dados dos endereços');
    } catch (error) {
        console.error('❌ Erro nos filtros:', error);
    }
}

// Formatar números com separador de milhares
function formatNumber(number) {
    if (typeof number !== 'number') {
        number = parseInt(number) || 0;
    }
    return number.toLocaleString('pt-BR');
}

// Atualizar estatísticas
// Cache para estatísticas
let statsCache = null;
let lastStatsUpdate = 0;
const STATS_CACHE_DURATION = 5000; // 5 segundos

function updateStats() {
    const now = Date.now();
    
    // Usar cache se ainda for válido
    if (statsCache && (now - lastStatsUpdate) < STATS_CACHE_DURATION) {
        applyCachedStats(statsCache);
        return;
    }
    
    console.log('📊 Atualizando estatísticas...');
    try {
        // Calcular estatísticas uma vez
        const totalAcoesValue = enderecosData.length;
        const totalHPValue = enderecosData.reduce((sum, item) => sum + (parseInt(item.hp) || 0), 0);
        
        // Calcular top vistoriador (otimizado)
        const vistoriadoresCount = {};
        let produtivas = 0;
        const equipesSet = new Set();
        
        for (let i = 0; i < enderecosData.length; i++) {
            const item = enderecosData[i];
            
            if (item.supervisor) {
                vistoriadoresCount[item.supervisor] = (vistoriadoresCount[item.supervisor] || 0) + 1;
            }
            
            if (item.status === 'PRODUTIVA') {
                produtivas++;
            }
            
            if (item.equipe) {
                equipesSet.add(item.equipe);
            }
        }
        
        const topVist = Object.entries(vistoriadoresCount).sort((a, b) => b[1] - a[1])[0];
        const taxa = totalAcoesValue ? ((produtivas / totalAcoesValue) * 100).toFixed(1) : 0;
        const equipesDistintas = equipesSet.size;
        
        // Salvar no cache
        statsCache = {
            totalAcoes: totalAcoesValue,
            totalHP: totalHPValue,
            topVistoriador: topVist,
            taxaProdutividade: taxa,
            equipesDistintas: equipesDistintas
        };
        lastStatsUpdate = now;
        
        // Aplicar estatísticas
        applyCachedStats(statsCache);
        
        console.log('✅ Estatísticas atualizadas e cacheadas');
    } catch (error) {
        console.error('❌ Erro nas estatísticas:', error);
    }
}

function applyCachedStats(cache) {
    const totalAcoes = document.getElementById('totalAcoes');
    const totalHP = document.getElementById('totalHP');
    const topVistoriador = document.getElementById('topVistoriador');
    const taxaProdutividade = document.getElementById('taxaProdutividade');
    const totalEquipesDistintas = document.getElementById('totalEquipesDistintas');
    
    if (totalAcoes) totalAcoes.textContent = formatNumber(cache.totalAcoes);
    if (totalHP) totalHP.textContent = formatNumber(cache.totalHP);
    if (topVistoriador && cache.topVistoriador) {
        topVistoriador.textContent = `${cache.topVistoriador[0]} (${formatNumber(cache.topVistoriador[1])})`;
    }
    if (taxaProdutividade) taxaProdutividade.textContent = `${cache.taxaProdutividade}%`;
    if (totalEquipesDistintas) totalEquipesDistintas.textContent = formatNumber(cache.equipesDistintas);
}
// Inicializar upload via URL web
function initializeWebUpload() {
    console.log('🌐 Inicializando upload via URL web...');
    try {
        const uploadTypeRadios = document.querySelectorAll('input[name="uploadType"]');
        const webUrlInput = document.getElementById('webUrlInput');
        const webUrlField = document.getElementById('webUrl');
        const fileUploadArea = document.getElementById('fileUploadArea');
        
        console.log('📋 Elementos encontrados:', {
            uploadTypeRadios: uploadTypeRadios.length,
            webUrlInput: !!webUrlInput,
            webUrlField: !!webUrlField,
            fileUploadArea: !!fileUploadArea
        });
        
        if (uploadTypeRadios.length > 0) {
            uploadTypeRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const selectedType = e.target.value;
                    console.log('🔄 Tipo de upload selecionado:', selectedType);
                    
                    if (selectedType === 'web') {
                        // Mostrar campo de URL
                        if (webUrlInput) {
                            webUrlInput.style.display = 'block';
                            console.log('✅ Campo de URL exibido');
                        }
                        if (fileUploadArea) fileUploadArea.style.display = 'none';
                    } else {
                        // Mostrar área de upload de arquivo
                        if (webUrlInput) webUrlInput.style.display = 'none';
                        if (fileUploadArea) fileUploadArea.style.display = 'block';
                    }
                });
            });
        }
        
        // Adicionar event listener para o campo de URL
        if (webUrlField) {
            webUrlField.addEventListener('blur', () => {
                const url = webUrlField.value.trim();
                if (url) {
                    console.log('🔗 URL detectada no blur:', url);
                    handleWebUrlUpload(url);
                }
            });
            
            // Também adicionar evento de Enter
            webUrlField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = webUrlField.value.trim();
                    if (url) {
                        console.log('🔗 URL detectada no Enter:', url);
                        handleWebUrlUpload(url);
                    }
                }
            });
        }
        
        console.log('✅ Upload via URL web inicializado');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar upload via URL:', error);
    }
}

// Converter URL do Google Sheets para formato CSV baixável
function convertGoogleSheetsUrl(url) {
    console.log('🔄 Convertendo URL do Google Sheets:', url);
    
    // Verificar se é uma URL do Google Sheets
    if (url.includes('docs.google.com/spreadsheets')) {
        // Extrair o ID da planilha
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
            const spreadsheetId = match[1];
            
            // Extrair GID se presente na URL
            let gid = '0'; // GID padrão
            const gidMatch = url.match(/[#&]gid=([0-9]+)/);
            if (gidMatch) {
                gid = gidMatch[1];
            }
            
            // Converter para URL de export CSV
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
            console.log('✅ URL convertida para:', csvUrl);
            return csvUrl;
        }
    }
    
    return url; // Retornar URL original se não for Google Sheets
}

// Função global para processar URL via botão
function processWebUrl() {
    console.log('🔗 Processando URL via botão...');
    const webUrlField = document.getElementById('webUrl');
    if (webUrlField) {
        const url = webUrlField.value.trim();
        if (url) {
            console.log('✅ URL encontrada:', url);
            handleWebUrlUpload(url);
        } else {
            console.log('❌ URL vazia');
            alert('Por favor, insira uma URL válida.');
        }
    } else {
        console.error('❌ Campo webUrl não encontrado');
        alert('Erro: Campo de URL não encontrado.');
    }
}

// Processar upload via URL web
function handleWebUrlUpload(url) {
    console.log('🌐 Processando URL:', url);
    
    // Validar URL
    try {
        new URL(url);
    } catch (error) {
        alert('URL inválida. Por favor, insira uma URL válida.');
        return;
    }
    
    // Converter URL do Google Sheets se necessário
    url = convertGoogleSheetsUrl(url);
    
    // Verificar se é um tipo de arquivo suportado ou Google Sheets
    const supportedExtensions = ['.csv', '.xlsx', '.xls'];
    const isFileSupported = supportedExtensions.some(ext => url.toLowerCase().includes(ext));
    const isGoogleSheets = url.includes('docs.google.com/spreadsheets');
    
    if (!isFileSupported && !isGoogleSheets) {
        alert('URL deve apontar para um arquivo CSV (.csv), Excel (.xlsx, .xls) ou Google Sheets');
        return;
    }
    
    // Mostrar loading
    const webUrlInput = document.getElementById('webUrlInput');
    if (webUrlInput) {
        const loadingMsg = document.createElement('div');
        loadingMsg.id = 'urlLoadingMsg';
        loadingMsg.className = 'loading-message';
        loadingMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baixando arquivo...';
        webUrlInput.appendChild(loadingMsg);
    }
    
    // Tentar fazer download do arquivo usando modo no-cors para Google Sheets
    const fetchOptions = {
        method: 'GET',
        mode: isGoogleSheets ? 'cors' : 'cors',
        headers: {
            'Accept': 'text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
    };
    
    fetch(url, fetchOptions)
        .then(response => {
            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            
            // Para Google Sheets, tentar como texto primeiro
            if (isGoogleSheets) {
                return response.text();
            } else {
                return response.blob();
            }
        })
        .then(data => {
            let file;
            const fileName = url.includes('docs.google.com') ? 'google-sheets.csv' : url.split('/').pop().split('?')[0] || 'planilha.csv';
            
            if (typeof data === 'string') {
                // É texto CSV do Google Sheets
                const blob = new Blob([data], { type: 'text/csv' });
                file = new File([blob], fileName, { type: 'text/csv' });
                console.log('✅ Arquivo CSV criado:', fileName, 'Size:', blob.size);
            } else {
                // É um blob de arquivo
                file = new File([data], fileName, { type: data.type || 'text/csv' });
                console.log('✅ Arquivo blob criado:', fileName, 'Size:', data.size);
            }
            
            // Processar como arquivo normal
            handleFileSelectFromUrl(file);
            
            // Remover loading
            const loadingMsg = document.getElementById('urlLoadingMsg');
            if (loadingMsg) {
                loadingMsg.remove();
            }
            
            console.log('✅ Arquivo baixado e processado via URL');
        })
        .catch(error => {
            console.error('❌ Erro ao baixar arquivo via URL:', error);
            
            // Remover loading
            const loadingMsg = document.getElementById('urlLoadingMsg');
            if (loadingMsg) {
                loadingMsg.remove();
            }
            
            // Tentar método alternativo para Google Sheets
            if (url.includes('docs.google.com/spreadsheets')) {
                console.log('🔄 Tentando método alternativo para Google Sheets...');
                const alternativeUrl = url.replace('/edit', '/export?format=csv');
                
                fetch(alternativeUrl, { method: 'GET', mode: 'cors' })
                    .then(response => response.text())
                    .then(csvData => {
                        const blob = new Blob([csvData], { type: 'text/csv' });
                        const file = new File([blob], 'google-sheets.csv', { type: 'text/csv' });
                        handleFileSelectFromUrl(file);
                    })
                    .catch(altError => {
                        console.error('❌ Método alternativo também falhou:', altError);
                        alert('Erro ao baixar Google Sheets: ' + error.message + '\n\nDica: Certifique-se de que o Google Sheets está configurado para "Qualquer pessoa com o link pode visualizar"');
                    });
            } else {
                // Mostrar erro mais específico para outros tipos de arquivo
                let errorMsg = 'Erro ao baixar arquivo da URL.';
                
                if (error.message.includes('CORS')) {
                    errorMsg = 'Erro CORS: O servidor não permite acesso direto ao arquivo. Tente baixar o arquivo manualmente.';
                } else if (error.message.includes('404')) {
                    errorMsg = 'Arquivo não encontrado (404). Verifique se a URL está correta.';
                } else if (error.message.includes('403')) {
                    errorMsg = 'Acesso negado (403). O arquivo pode estar protegido.';
                }
                
                alert(errorMsg);
            }
        });
}

// Função específica para calcular dados de projetos (quantidade e percentual)
function calculateProjetosData() {
    console.log('📊 Calculando dados de projetos...');
    
    if (enderecosData.length === 0) {
        console.log('⚠️ Nenhum dado disponível para cálculo');
        return [];
    }
    
    // Agrupar por projeto
    const projetosCount = {};
    enderecosData.forEach(item => {
        const projeto = item.projeto || 'Não definido';
        projetosCount[projeto] = (projetosCount[projeto] || 0) + 1;
    });
    
    // Calcular total geral
    const totalProjetos = Object.values(projetosCount).reduce((a, b) => a + b, 0);
    
    // Criar array com quantidade e percentual para cada projeto
    const projetosData = Object.entries(projetosCount).map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: totalProjetos > 0 ? ((quantidade / totalProjetos) * 100).toFixed(1) : 0
    }));
    
    // Ordenar por quantidade (decrescente)
    projetosData.sort((a, b) => b.quantidade - a.quantidade);
    
    console.log('✅ Dados de projetos calculados:', projetosData);
    return projetosData;
}

// Função específica para calcular dados de sub projetos
function calculateSubProjetosData() {
    console.log('📊 Calculando dados de sub projetos...');
    
    if (enderecosData.length === 0) {
        console.log('⚠️ Nenhum dado disponível para cálculo');
        return [];
    }
    
    // Agrupar por sub projeto
    const subProjetosCount = {};
    enderecosData.forEach(item => {
        const subProjeto = item.subProjeto || 'Não definido';
        subProjetosCount[subProjeto] = (subProjetosCount[subProjeto] || 0) + 1;
    });
    
    // Calcular total geral
    const totalSubProjetos = Object.values(subProjetosCount).reduce((a, b) => a + b, 0);
    
    // Criar array com quantidade e percentual para cada sub projeto
    const subProjetosData = Object.entries(subProjetosCount).map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: totalSubProjetos > 0 ? ((quantidade / totalSubProjetos) * 100).toFixed(1) : 0
    }));
    
    // Ordenar por quantidade (decrescente)
    subProjetosData.sort((a, b) => b.quantidade - a.quantidade);
    
    console.log('✅ Dados de sub projetos calculados:', subProjetosData);
    return subProjetosData;
}

// Função específica para calcular dados de cidades
function calculateCidadesData() {
    console.log('📊 Calculando dados de cidades...');
    
    if (enderecosData.length === 0) {
        console.log('⚠️ Nenhum dado disponível para cálculo');
        return [];
    }
    
    // Agrupar por cidade
    const cidadesCount = {};
    enderecosData.forEach(item => {
        const cidade = item.cidade || 'Não definido';
        cidadesCount[cidade] = (cidadesCount[cidade] || 0) + 1;
    });
    
    // Calcular total geral
    const totalCidades = Object.values(cidadesCount).reduce((a, b) => a + b, 0);
    
    // Criar array com quantidade e percentual para cada cidade
    const cidadesData = Object.entries(cidadesCount).map(([nome, quantidade]) => ({
        nome,
        quantidade,
        percentual: totalCidades > 0 ? ((quantidade / totalCidades) * 100).toFixed(1) : 0
    }));
    
    // Ordenar por quantidade (decrescente)
    cidadesData.sort((a, b) => b.quantidade - a.quantidade);
    
    console.log('✅ Dados de cidades calculados:', cidadesData);
    return cidadesData;
}
// Função para exibir dados calculados em tabela
function displayCalculatedData(data, title, containerId) {
    console.log(`📋 Exibindo dados calculados: ${title}`);
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Container não encontrado: ${containerId}`);
        return;
    }
    
    if (data.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <p>Nenhum dado disponível para ${title}</p>
            </div>
        `;
        return;
    }
    
    // Calcular totais
    const totalQuantidade = data.reduce((sum, item) => sum + item.quantidade, 0);
    const totalPercentual = data.reduce((sum, item) => sum + parseFloat(item.percentual), 0);
    
    const tableHTML = `
        <div class="calculated-data-table">
            <h4>${title}</h4>
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Quantidade</th>
                        <th>Percentual (%)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => `
                        <tr>
                            <td>${item.nome}</td>
                            <td>${formatNumber(item.quantidade)}</td>
                            <td>${item.percentual}%</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td><strong>Total</strong></td>
                        <td><strong>${formatNumber(totalQuantidade)}</strong></td>
                        <td><strong>${totalPercentual.toFixed(1)}%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
    console.log(`✅ Dados exibidos para ${title}`);
}

// Função para atualizar todas as tabelas de dados calculados
function updateAllCalculatedTables() {
    console.log('📊 Atualizando todas as tabelas de dados calculados...');
    
    // Calcular dados
    const projetosData = calculateProjetosData();
    const subProjetosData = calculateSubProjetosData();
    const cidadesData = calculateCidadesData();
    
    // Exibir em tabelas (se os containers existirem)
    displayCalculatedData(projetosData, 'Projetos - Quantidade e Percentual', 'projetos-table-container');
    displayCalculatedData(subProjetosData, 'Sub Projetos - Quantidade e Percentual', 'subprojetos-table-container');
    displayCalculatedData(cidadesData, 'Cidades - Quantidade e Percentual', 'cidades-table-container');
    
    console.log('✅ Todas as tabelas atualizadas');
}

// ==================== FUNÇÕES DE PERSISTÊNCIA ====================

// Carregar dados persistidos do localStorage
function loadPersistedData() {
    try {
        if (!localStorage) {
            enderecosData = [];
            tableCreatedFromUpload = false;
            return;
        }
        
        const savedData = localStorage.getItem('enderecosData');
        const savedFlag = localStorage.getItem('tableCreatedFromUpload');
        
        if (savedData) {
            enderecosData = JSON.parse(savedData);
            tableCreatedFromUpload = savedFlag === 'true';
            console.log(`✅ ${enderecosData.length} endereços carregados`);
            console.log(`📊 Tabela criada por upload: ${tableCreatedFromUpload}`);
        } else {
            enderecosData = [];
            tableCreatedFromUpload = false;
            console.log('📋 Nenhum dado encontrado, iniciando vazio');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        enderecosData = [];
        tableCreatedFromUpload = false;
    }
}

// Salvar dados no localStorage
function savePersistedData() {
    try {
        if (!localStorage) {
            throw new Error('localStorage não está disponível');
        }
        
        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
        localStorage.setItem('tableCreatedFromUpload', tableCreatedFromUpload.toString());
        console.log('✅ Dados salvos:', enderecosData.length, 'registros');
        console.log('📊 Flag de upload salva:', tableCreatedFromUpload);
        
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
    }
}
// Função para limpar todos os dados
function clearAllData() {
    console.log('🧹 Limpando todos os dados...');
    
    showConfirm(
        'Limpar Todos os Dados',
        'Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.',
        () => {
        try {
            // Limpar localStorage
            localStorage.removeItem('enderecosData');
            localStorage.removeItem('uploadedData');
            localStorage.removeItem('dynamicTableData');
            localStorage.removeItem('dynamicTableConfig');
            localStorage.removeItem('gestaoData');
            
            // Limpar variáveis globais
            enderecosData = [];
            uploadedData = null;
            
            // Limpar dados dinâmicos
            dynamicTableData = {
                headers: [],
                data: [],
                metadata: {
                    lastUpload: null,
                    totalRecords: 0,
                    source: null,
                    tableStructure: 'dynamic'
                }
            };
            
            dynamicTableConfig = {
                itemsPerPage: 20,
                currentPage: 1,
                sortColumn: null,
                sortDirection: 'asc',
                filters: {},
                searchTerm: ''
            };
            
            // Limpar dados de gestão
            gestaoData = {
                projetos: [],
                subprojetos: [],
                tiposAcao: [],
                supervisores: [],
                equipes: [],
                cidades: []
            };
            
            // Atualizar interface - tabela fixa
            renderEnderecosTable();
            
            // Atualizar interface - tabela dinâmica
            renderDynamicTable();
            
            // Atualizar estatísticas
            updateStats();
            updateEnderecoStats();
            updateInfraStats();
            updateDynamicStatsCards();
            
            // Atualizar tabelas de gestão
            loadGestaoTables();
            
            // Limpar filtros
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            
            // Resetar paginação
            resetDynamicPagination();
            
            console.log('✅ Todos os dados foram limpos com sucesso');
            showSuccess('Dados Limpos!', 'Todos os dados foram limpos com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao limpar dados:', error);
            showError('Erro ao Limpar Dados', 'Erro ao limpar dados: ' + error.message);
        }
    });
}

// Função robusta para abrir novo endereço
function abrirNovoEndereco() {
    console.log('🔍 Tentando abrir novo endereço...');
    
    // Primeiro, garantir que estamos na seção correta
    showSection('enderecos');
    
    // Verificar se há dados da tabela dinâmica
    if (dynamicTableData.data.length > 0) {
        console.log('📊 Tabela dinâmica encontrada, criando formulário dinâmico...');
        criarFormularioDinamico();
    } else {
        console.log('⚠️ Tabela dinâmica não encontrada, usando formulário padrão...');
        abrirFormularioPadrao();
    }
}

// Função para criar formulário dinâmico baseado nas colunas da planilha
function criarFormularioDinamico() {
    console.log('🏗️ Criando formulário dinâmico...');
    
    const modal = document.getElementById('crudModal');
    if (!modal) {
        console.error('❌ Modal não encontrado');
        return;
    }
    
    // Garantir que os dados da gestão estão carregados
    if (!gestaoData.projetos || gestaoData.projetos.length === 0) {
        console.log('🔄 Dados da gestão não encontrados, carregando...');
        initializeGestaoData();
    }
    
    // Verificar se há dados corretos
    console.log('🔍 Verificando dados antes de criar formulário:');
    console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.length : 0);
    console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.length : 0);
    console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
    console.log('  - Supervisores:', gestaoData.supervisores ? gestaoData.supervisores.length : 0);
    console.log('  - Equipes:', gestaoData.equipes ? gestaoData.equipes.length : 0);
    console.log('  - Cidades:', gestaoData.cidades ? gestaoData.cidades.length : 0);
    
    // Recarregar dados da gestão de projetos (mesmo conceito de projeto e sub projeto)
    console.log('🔄 Carregando dados da gestão de projetos...');
    loadGestaoTables();
    
    // Aguardar carregamento dos dados da gestão
    setTimeout(async () => {
        console.log('✅ Dados da gestão carregados:');
        console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : []);
        console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : []);
        console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
        
        // Salvar dados atualizados
        await salvarDadosFirestore('gestaoData', gestaoData);
        
        // Continuar com a criação do formulário
        criarFormularioDinamicoAuxiliar();
    }, 300);
    
    // A criação do formulário agora acontece após carregar os dados da gestão
}
function criarFormularioDinamicoAuxiliar() {
    console.log('🏗️ Criando formulário dinâmico (auxiliar)...');
    
    const modal = document.getElementById('crudModal');
    if (!modal) {
        console.error('❌ Modal não encontrado');
        return;
    }
    
    // Pegar as colunas da tabela dinâmica
    const headers = dynamicTableData.headers || [];
    console.log('📋 Headers da tabela dinâmica:', headers);
    
    // Gerar campos do formulário baseado nas colunas
    const camposFormulario = headers.map(header => {
        const campoId = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        
        // Determinar o tipo de campo baseado no header
        let tipoCampo = 'text';
        let opcoes = [];
        
        console.log(`🔍 Analisando campo: "${header}"`);
        
        // Forçar criação de dropdowns para campos específicos
        if (header.toUpperCase().includes('PROJETO') && !header.toUpperCase().includes('SUB')) {
            tipoCampo = 'select';
            // FILTRO: Mostrar apenas projetos específicos
            const projetosPermitidos = ['MDU-TOA', 'NAP LOTADA', 'ON GOING', 'PROJETO F', 'SGD', 'SOLICITAÇÃO DE SAIR'];
            const todosProjetos = gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : [];
            opcoes = todosProjetos.filter(projeto => projetosPermitidos.includes(projeto));
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('SUB PROJETO')) {
            tipoCampo = 'select';
            // FILTRO: Mostrar apenas sub-projetos específicos
            const subProjetosPermitidos = ['CLARO', 'INOVAR', 'NAP LOTADA', 'ON GOING', 'PROJETO F', 'SGD'];
            const todosSubProjetos = gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : [];
            opcoes = todosSubProjetos.filter(subprojeto => subProjetosPermitidos.includes(subprojeto));
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('TIPO DE AÇÃO') || header.toUpperCase().includes('TIPO DE AÇAO')) {
            tipoCampo = 'select';
            // CORREÇÃO: Garantir que os dados da gestão estão carregados
            opcoes = [];
            
            // Forçar recarregamento dos dados da gestão
            if (!gestaoData.tiposAcao || gestaoData.tiposAcao.length === 0) {
                console.log('🔄 Dados da gestão não encontrados, recarregando...');
                loadGestaoTables();
            }
            
            // Verificar se há dados na gestão
            if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
                // Filtrar pela coluna "nome" e remover duplicatas
                const nomesUnicos = [...new Set(gestaoData.tiposAcao.map(ta => ta.nome).filter(nome => nome && nome.trim() !== ''))];
                opcoes = nomesUnicos;
                console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
                console.log(`  → Dados da tabela "Tipos de Ação":`, gestaoData.tiposAcao);
                console.log(`  → Nomes únicos da coluna "nome":`, nomesUnicos);
            } else {
                console.log(`  → Tipo: ${tipoCampo}, Nenhum dado encontrado na tabela "Tipos de Ação"`);
                console.log(`  → Tentando recarregar dados da gestão...`);
                // Tentar recarregar uma vez mais
                loadGestaoTables();
            }
        } else if (header.toUpperCase().includes('CIDADE')) {
            tipoCampo = 'select';
            opcoes = gestaoData.cidades ? gestaoData.cidades.map(c => c.nome) : [];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('SUPERVISOR')) {
            tipoCampo = 'select';
            opcoes = gestaoData.supervisores ? gestaoData.supervisores.map(s => s.nome) : [];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('EQUIPE')) {
            tipoCampo = 'select';
            opcoes = gestaoData.equipes ? gestaoData.equipes.map(e => e.nome) : [];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('STATUS')) {
            tipoCampo = 'select';
            opcoes = ['PRODUTIVA', 'IMPRODUTIVA'];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('RDO')) {
            tipoCampo = 'select';
            opcoes = ['SIM', 'NÃO'];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('BOOK')) {
            tipoCampo = 'select';
            opcoes = ['SIM', 'NÃO', 'KIT ENVIADO'];
            console.log(`  → Tipo: ${tipoCampo}, Opções: ${opcoes.length} (${opcoes.join(', ')})`);
        } else if (header.toUpperCase().includes('DATA')) {
            tipoCampo = 'date';
            console.log(`  → Tipo: ${tipoCampo}`);
        } else if (header.toUpperCase().includes('HP')) {
            tipoCampo = 'number';
            console.log(`  → Tipo: ${tipoCampo}`);
        } else if (header.toUpperCase().includes('JUSTIFICATIVA')) {
            tipoCampo = 'textarea';
            console.log(`  → Tipo: ${tipoCampo}`);
        } else {
            console.log(`  → Tipo: ${tipoCampo} (padrão)`);
        }
        
        return {
            header: header,
            id: campoId,
            tipo: tipoCampo,
            opcoes: opcoes,
            obrigatorio: header.includes('*') || ['PROJETO', 'SUB PROJETO', 'TIPO DE AÇÃO', 'CONDOMÍNIO', 'ENDEREÇO', 'CIDADE', 'EQUIPE', 'SUPERVISOR', 'STATUS', 'HP'].some(campo => header.includes(campo))
        };
    });
    
    console.log('📝 Campos do formulário:', camposFormulario);
    
    // Criar HTML do formulário
    const camposHTML = camposFormulario.map(campo => {
        if (campo.header === 'ID') return ''; // Pular campo ID
        
        let inputHTML = '';
        const required = campo.obrigatorio ? 'required' : '';
        
        switch (campo.tipo) {
            case 'select':
                let opcoesHTML = '';
                if (campo.opcoes && campo.opcoes.length > 0) {
                    opcoesHTML = campo.opcoes.map(opcao => 
                        `<option value="${opcao}">${opcao}</option>`
                    ).join('');
                } else {
                    opcoesHTML = '<option value="">Nenhuma opção disponível</option>';
                }
                
                inputHTML = `
                    <select id="${campo.id}" name="${campo.id}" ${required}>
                        <option value="">Selecione ${campo.header.toLowerCase()}...</option>
                        ${opcoesHTML}
                    </select>
                `;
                console.log(`📝 Dropdown ${campo.header} criado com ${campo.opcoes.length} opções`);
                break;
            case 'textarea':
                inputHTML = `
                    <textarea id="${campo.id}" name="${campo.id}" placeholder="${campo.header}" ${required}></textarea>
                `;
                break;
            case 'date':
                inputHTML = `
                    <input type="date" id="${campo.id}" name="${campo.id}" ${required}>
                `;
                break;
            case 'number':
                inputHTML = `
                    <input type="number" id="${campo.id}" name="${campo.id}" placeholder="${campo.header}" ${required} min="1">
                `;
                break;
            default:
                inputHTML = `
                    <input type="text" id="${campo.id}" name="${campo.id}" placeholder="${campo.header}" ${required}>
                `;
        }
        
        return `
            <div class="form-group">
                <label for="${campo.id}">${campo.header} ${campo.obrigatorio ? '*' : ''}</label>
                ${inputHTML}
            </div>
        `;
    }).join('');
    
    // Criar modal com formulário dinâmico
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Novo Endereço - Formulário Dinâmico</h3>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <form id="enderecoFormDinamico" class="modal-form">
                <div class="form-grid">
                    <div class="form-column">
                        ${camposHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary" id="submitBtn">Salvar</button>
                </div>
            </form>
        </div>
    `;
    
    // Configurar submit do formulário dinâmico
    const form = document.getElementById('enderecoFormDinamico');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            handleFormSubmitDinamico();
        };
    }
    
    // Mostrar modal
    modal.style.display = 'block';
    console.log('✅ Formulário dinâmico criado e exibido');
    
    // Verificar se os dados da gestão estão carregados
    console.log('🔍 Verificando dados da gestão:');
    console.log('  - Projetos:', gestaoData.projetos ? gestaoData.projetos.length : 0);
    console.log('  - Sub Projetos:', gestaoData.subprojetos ? gestaoData.subprojetos.length : 0);
    console.log('  - Tipos de Ação:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
    console.log('  - Cidades:', gestaoData.cidades ? gestaoData.cidades.length : 0);
    console.log('  - Supervisores:', gestaoData.supervisores ? gestaoData.supervisores.length : 0);
    console.log('  - Equipes:', gestaoData.equipes ? gestaoData.equipes.length : 0);
    
    // Log detalhado dos dados
    console.log('📊 Dados completos da gestão:', gestaoData);
    
    // Se não há dados da gestão, tentar carregar
    if (!gestaoData.projetos || gestaoData.projetos.length === 0) {
        console.log('🔄 Dados da gestão não encontrados, tentando carregar...');
        initializeGestaoData();
        
        // Aguardar um pouco e atualizar os dropdowns
        setTimeout(() => {
            atualizarDropdownsDinamicos();
        }, 1000);
    } else {
        // Se já há dados, atualizar dropdowns imediatamente
        atualizarDropdownsDinamicos();
    }
    
    // Verificação adicional após um tempo
    setTimeout(() => {
        console.log('🔍 Verificação final dos dropdowns:');
        const headers = dynamicTableData.headers || [];
        headers.forEach(header => {
            if (header === 'ID') return;
            const campoId = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            const elemento = document.getElementById(campoId);
            if (elemento) {
                console.log(`  - ${header} (${campoId}): ${elemento.tagName} com ${elemento.options ? elemento.options.length : 'N/A'} opções`);
            } else {
                console.log(`  - ${header} (${campoId}): Elemento não encontrado`);
            }
        });
    }, 2000);
}

// Função para atualizar dropdowns do formulário dinâmico
function atualizarDropdownsDinamicos() {
    console.log('🔄 Atualizando dropdowns do formulário dinâmico...');
    
    const headers = dynamicTableData.headers || [];
    
    headers.forEach(header => {
        if (header === 'ID') return;
        
        const campoId = header.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const select = document.getElementById(campoId);
        
        if (select && select.tagName === 'SELECT') {
            let opcoes = [];
            
            // Determinar opções baseado no header
            if (header.includes('PROJETO') && !header.includes('SUB')) {
                opcoes = gestaoData.projetos ? gestaoData.projetos.map(p => p.nome) : [];
            } else if (header.includes('SUB PROJETO')) {
                opcoes = gestaoData.subprojetos ? gestaoData.subprojetos.map(sp => sp.nome) : [];
            } else if (header.includes('TIPO DE AÇÃO') || header.includes('TIPO DE AÇAO')) {
                // CORREÇÃO: Garantir que os dados da gestão estão carregados
                opcoes = [];
                
                // Forçar recarregamento dos dados da gestão
                if (!gestaoData.tiposAcao || gestaoData.tiposAcao.length === 0) {
                    console.log('🔄 Dados da gestão não encontrados, recarregando...');
                    loadGestaoTables();
                }
                
                // Verificar se há dados na gestão
                if (gestaoData.tiposAcao && gestaoData.tiposAcao.length > 0) {
                    // Filtrar pela coluna "nome" e remover duplicatas
                    const nomesUnicos = [...new Set(gestaoData.tiposAcao.map(ta => ta.nome).filter(nome => nome && nome.trim() !== ''))];
                    opcoes = nomesUnicos;
                    console.log(`🔄 Atualizando dropdown TIPO DE AÇÃO com ${opcoes.length} opções:`, opcoes);
                    console.log(`  → Nomes únicos da tabela "Tipos de Ação":`, nomesUnicos);
                } else {
                    console.log(`🔄 Dropdown TIPO DE AÇÃO: Nenhum dado encontrado na tabela "Tipos de Ação"`);
                    console.log(`  → Tentando recarregar dados da gestão...`);
                    // Tentar recarregar uma vez mais
                    loadGestaoTables();
                }
            } else if (header.includes('CIDADE')) {
                opcoes = gestaoData.cidades ? gestaoData.cidades.map(c => c.nome) : [];
            } else if (header.includes('SUPERVISOR')) {
                opcoes = gestaoData.supervisores ? gestaoData.supervisores.map(s => s.nome) : [];
            } else if (header.includes('EQUIPE')) {
                opcoes = gestaoData.equipes ? gestaoData.equipes.map(e => e.nome) : [];
            }
            
            if (opcoes.length > 0) {
                // Manter a primeira opção (placeholder)
                const placeholder = select.options[0];
                select.innerHTML = '';
                select.appendChild(placeholder);
                
                // Adicionar novas opções
                opcoes.forEach(opcao => {
                    const option = document.createElement('option');
                    option.value = opcao;
                    option.textContent = opcao;
                    select.appendChild(option);
                });
                
                console.log(`✅ Dropdown ${header} atualizado com ${opcoes.length} opções`);
            }
        }
    });
}
// Função para abrir formulário padrão (fallback)
function abrirFormularioPadrao() {
    console.log('🔄 Abrindo formulário padrão...');
    
    const modal = document.getElementById('crudModal');
    if (modal) {
        // Verificar se o modal tem o formulário de endereços
        const enderecoForm = modal.querySelector('#enderecoForm');
        if (!enderecoForm) {
            console.log('🔄 Modal não tem formulário de endereços, restaurando...');
            // Restaurar o HTML original do modal
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modalTitle">Novo Endereço</h3>
                        <span class="close" onclick="closeModal()">&times;</span>
                    </div>
                    <form id="enderecoForm" class="modal-form">
                        <div class="form-grid">
                            <!-- Coluna 1: Informações Básicas e Localização -->
                            <div class="form-column">
                                <!-- Informações Básicas -->
                                <div class="form-section">
                                    <h4>📋 Informações Básicas</h4>
                                    
                                    <div class="form-group">
                                        <label for="projeto">Projeto *</label>
                                        <select id="projeto" name="projeto" required>
                                            <option value="">Selecione o projeto...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="subProjeto">Sub Projeto *</label>
                                        <select id="subProjeto" name="subProjeto" required>
                                            <option value="">Selecione o sub projeto...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="tipoAcao">Tipo de Ação *</label>
                                        <select id="tipoAcao" name="tipoAcao" required>
                                            <option value="">Selecione o tipo de ação...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="contrato">Contrato</label>
                                        <input type="text" id="contrato" name="contrato" placeholder="Número do contrato">
                                    </div>
                                </div>

                                <!-- Localização -->
                                <div class="form-section">
                                    <h4>📍 Localização</h4>
                                    
                                    <div class="form-group">
                                        <label for="condominio">Condomínio *</label>
                                        <input type="text" id="condominio" name="condominio" required placeholder="Nome do condomínio">
                                    </div>

                                    <div class="form-group">
                                        <label for="endereco">Endereço *</label>
                                        <input type="text" id="endereco" name="endereco" required placeholder="Endereço completo">
                                    </div>

                                    <div class="form-group">
                                        <label for="cidade">Cidade *</label>
                                        <select id="cidade" name="cidade" required>
                                            <option value="">Selecione a cidade...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="andar">Andar</label>
                                        <input type="text" id="andar" name="andar" placeholder="Número do andar">
                                    </div>
                                </div>

                                <!-- Dados Técnicos -->
                                <div class="form-section">
                                    <h4>⚙️ Dados Técnicos</h4>
                                    
                                    <div class="form-group">
                                        <label for="pep">PEP</label>
                                        <select id="pep" name="pep">
                                            <option value="">Selecione o PEP...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="codImovelGed">COD IMOVEL GED</label>
                                        <input type="text" id="codImovelGed" name="codImovelGed" placeholder="Código GED">
                                    </div>

                                    <div class="form-group">
                                        <label for="nodeGerencial">NODE GERENCIAL</label>
                                        <input type="text" id="nodeGerencial" name="nodeGerencial" placeholder="Ex: PIT50">
                                    </div>

                                    <div class="form-group">
                                        <label for="areaTecnica">Área Técnica</label>
                                        <input type="text" id="areaTecnica" name="areaTecnica" placeholder="Ex: PTBAA">
                                    </div>

                                    <div class="form-group">
                                        <label for="hp">HP *</label>
                                        <input type="number" id="hp" name="hp" required placeholder="Quantidade HP" min="1">
                                    </div>
                                </div>
                            </div>

                            <!-- Coluna 2: Equipe, Status e Outros -->
                            <div class="form-column">
                                <!-- Equipe e Status -->
                                <div class="form-section">
                                    <h4>👥 Equipe e Status</h4>
                                    
                                    <div class="form-group">
                                        <label for="equipe">Equipe *</label>
                                        <select id="equipe" name="equipe" required>
                                            <option value="">Selecione a equipe...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="supervisor">Supervisor *</label>
                                        <select id="supervisor" name="supervisor" required>
                                            <option value="">Selecione o supervisor...</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="status">Status *</label>
                                        <select id="status" name="status" required>
                                            <option value="">Selecione o status...</option>
                                            <option value="PRODUTIVA">PRODUTIVA</option>
                                            <option value="IMPRODUTIVA">IMPRODUTIVA</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Cronograma -->
                                <div class="form-section">
                                    <h4>📅 Cronograma</h4>
                                    
                                    <div class="form-group">
                                        <label for="dataRecebimento">Data Recebimento</label>
                                        <input type="date" id="dataRecebimento" name="dataRecebimento">
                                    </div>

                                    <div class="form-group">
                                        <label for="dataInicio">Data Início</label>
                                        <input type="date" id="dataInicio" name="dataInicio">
                                    </div>

                                    <div class="form-group">
                                        <label for="dataFinal">Data Final</label>
                                        <input type="date" id="dataFinal" name="dataFinal">
                                    </div>
                                </div>

                                <!-- Informações Adicionais -->
                                <div class="form-section">
                                    <h4>📝 Informações Adicionais</h4>
                                    
                                    <div class="form-group">
                                        <label for="rdo">RDO</label>
                                        <select id="rdo" name="rdo">
                                            <option value="">Selecione...</option>
                                            <option value="SIM">SIM</option>
                                            <option value="NÃO">NÃO</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="book">BOOK</label>
                                        <select id="book" name="book">
                                            <option value="">Selecione...</option>
                                            <option value="SIM">SIM</option>
                                            <option value="NÃO">NÃO</option>
                                            <option value="KIT ENVIADO">KIT ENVIADO</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="projetoStatus">Status do Projeto</label>
                                        <select id="projetoStatus" name="projetoStatus">
                                            <option value="">Selecione...</option>
                                            <option value="CONCLUIDO">CONCLUIDO</option>
                                            <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                                            <option value="PARADO">PARADO</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label for="situacao">Situação</label>
                                        <input type="text" id="situacao" name="situacao" placeholder="Situação atual">
                                    </div>

                                    <div class="form-group">
                                        <label for="justificativa">Justificativa</label>
                                        <textarea id="justificativa" name="justificativa" placeholder="Justificativa se necessário"></textarea>
                                    </div>

                                    <div class="form-group">
                                        <label for="observacao">Observação</label>
                                        <textarea id="observacao" name="observacao" placeholder="Observações gerais"></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="btn-primary" id="submitBtn">Salvar</button>
                        </div>
                    </form>
                </div>
            `;
        }
    }
    
    // Aguardar um pouco para garantir que a seção foi carregada
    setTimeout(() => {
        // Tentar recriar o modal primeiro
        if (window.recreateModal && window.recreateModal()) {
            console.log('✅ Modal recriado com sucesso');
        }
        
        // Tentar usar a função de reparo
        if (window.repairModal && window.repairModal()) {
            console.log('✅ Modal aberto com sucesso via repairModal');
            return;
        }
        
        // Se não funcionar, tentar a abordagem original
        console.log('🔄 Tentando abordagem original...');
        openModal('create');
    }, 300);
}

// ==================== FUNÇÕES DE ESTATÍSTICAS DOS ENDEREÇOS ====================

// Formatar números com separador de milhares
function formatNumber(number) {
    if (typeof number !== 'number') {
        number = parseInt(number) || 0;
    }
    return number.toLocaleString('pt-BR');
}

// Atualizar estatísticas dos endereços
function updateEnderecoStats() {
    console.log('📊 Atualizando estatísticas dos endereços...');
    console.log('📋 Dados disponíveis:', enderecosData.length, 'registros');
    try {
        const stats = calculateEnderecoStats();
        console.log('📈 Estatísticas calculadas:', stats);
        
        // Atualizar cards
        const total = stats.totalEnderecos;
        const enderecosDistintos = new Set(enderecosData.map(e => e.endereco).filter(Boolean)).size;
        const equipesDistintas = stats.equipesUnicas;
        const produtivas = enderecosData.filter(e => (e.status || '').toLowerCase() === 'produtiva').length;
        const produtividade = total > 0 ? ((produtivas / total) * 100).toFixed(1) : '0';

        console.log('🎯 Valores para os cards:', {
            total,
            enderecosDistintos,
            equipesDistintas,
            produtivas,
            produtividade
        });

        // Verificar se os elementos existem
        const totalElement = document.getElementById('statTotalRegistros');
        const enderecosElement = document.getElementById('statEnderecosDistintos');
        const equipesElement = document.getElementById('statEquipesDistintas');
        const produtividadeElement = document.getElementById('statProdutividade');

        console.log('🔍 Elementos encontrados:', {
            totalElement: !!totalElement,
            enderecosElement: !!enderecosElement,
            equipesElement: !!equipesElement,
            produtividadeElement: !!produtividadeElement
        });

        if (totalElement) {
            totalElement.textContent = total;
            console.log('✅ Total atualizado:', total);
        }
        if (enderecosElement) {
            enderecosElement.textContent = enderecosDistintos;
            console.log('✅ Endereços distintos atualizados:', enderecosDistintos);
        }
        if (equipesElement) {
            equipesElement.textContent = equipesDistintas;
            console.log('✅ Equipes distintas atualizadas:', equipesDistintas);
        }
        if (produtividadeElement) {
            produtividadeElement.textContent = produtividade + '%';
            console.log('✅ Produtividade atualizada:', produtividade + '%');
        }

        console.log('✅ Estatísticas dos endereços atualizadas');
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas dos endereços:', error);
    }
}

// Calcular estatísticas dos endereços
function calculateEnderecoStats() {
    const stats = {
        totalEnderecos: enderecosData.length,
        projetosUnicos: new Set(enderecosData.map(e => e.projeto).filter(Boolean)).size,
        cidadesUnicas: new Set(enderecosData.map(e => e.cidade).filter(Boolean)).size,
        equipesUnicas: new Set(enderecosData.map(e => e.equipe).filter(Boolean)).size,
        enderecosProdutivos: enderecosData.filter(e => e.status === 'PRODUTIVA').length,
        enderecosImprodutivos: enderecosData.filter(e => e.status === 'IMPRODUTIVA').length,
        tiposAcaoUnicos: new Set(enderecosData.map(e => e.tipoAcao).filter(Boolean)).size,
        totalHP: enderecosData.reduce((sum, e) => sum + (parseInt(e.hp) || 0), 0)
    };
    
    return stats;
}
// ==================== FUNÇÕES DE POPULATION DE SELECTS ====================

// Popular selects do formulário dinamicamente
function populateFormSelects() {
    console.log('🔽 Populando selects do formulário...');
    console.log('📊 gestaoData disponível:', gestaoData);
    
    // Verificar se é formulário dinâmico ou padrão
    const formDinamico = document.getElementById('enderecoFormDinamico');
    if (formDinamico) {
        console.log('🔄 Formulário dinâmico detectado, atualizando dropdowns...');
        atualizarDropdownsDinamicos();
        return;
    }
    
    try {
        // Obter valores únicos dos dados existentes de endereços
        const projetosEnderecos = [...new Set(enderecosData.map(item => item.projeto).filter(Boolean))];
        const subProjetosEnderecos = [...new Set(enderecosData.map(item => item.subProjeto).filter(Boolean))];
        const tiposAcaoEnderecos = [...new Set(enderecosData.map(item => item.tipoAcao).filter(Boolean))];
        const cidadesEnderecos = [...new Set(enderecosData.map(item => item.cidade).filter(Boolean))];
        const supervisoresEnderecos = [...new Set(enderecosData.map(item => item.supervisor).filter(Boolean))];
        const equipesEnderecos = [...new Set(enderecosData.map(item => item.equipe).filter(Boolean))];
        const peps = [...new Set(enderecosData.map(item => item.pep).filter(Boolean))];
        
        // Obter dados da Gestão de Projetos
        const projetosGestao = gestaoData.projetos.map(projeto => projeto.nome);
        const subProjetosGestao = gestaoData.subprojetos.map(subprojeto => subprojeto.nome);
        const tiposAcaoGestao = gestaoData.tiposAcao.map(tipo => tipo.nome);
        const supervisoresGestao = gestaoData.supervisores.map(supervisor => supervisor.nome);
        const equipesGestao = gestaoData.equipes.map(equipe => equipe.nome);
        const cidadesGestao = gestaoData.cidades.map(cidade => cidade.nome);
        
        console.log('📋 Dados da gestão:', {
            projetos: projetosGestao,
            subProjetos: subProjetosGestao,
            tiposAcao: tiposAcaoGestao,
            supervisores: supervisoresGestao,
            equipes: equipesGestao,
            cidades: cidadesGestao
        });
        
        // Combinar dados de endereços com dados da gestão
        const todosProjetos = [...new Set([...projetosEnderecos, ...projetosGestao])];
        const todosSubProjetos = [...new Set([...subProjetosEnderecos, ...subProjetosGestao])];
        const todosTiposAcao = [...new Set([...tiposAcaoEnderecos, ...tiposAcaoGestao])];
        const todosSupervisores = [...new Set([...supervisoresEnderecos, ...supervisoresGestao])];
        const todasEquipes = [...new Set([...equipesEnderecos, ...equipesGestao])];
        const todasCidades = [...new Set([...cidadesEnderecos, ...cidadesGestao])];
        
        // Adicionar valores padrão se não existirem
        const defaultTiposAcao = ['VISTORIA', 'CONSTRUÇÃO', 'ATIVAÇÃO', 'BOOK', 'PROJETO', 'MANUTENÇÃO'];
        const defaultCidades = ['SALVADOR', 'LAURO DE FREITAS', 'CAMAÇARI', 'SIMÕES FILHO', 'FEIRA DE SANTANA'];
        const defaultEquipes = ['EQUIPE 1', 'EQUIPE 2', 'EQUIPE 3', 'EQUIPE 4', 'EQUIPE 5'];
        const defaultPeps = ['MDU LEGADO', 'MDU NOVO'];
        
        // Combinar valores existentes com padrões
        const allTiposAcao = [...new Set([...todosTiposAcao, ...defaultTiposAcao])];
        const allCidades = [...new Set([...todasCidades, ...defaultCidades])];
        const allEquipes = [...new Set([...todasEquipes, ...defaultEquipes])];
        const allPeps = [...new Set([...peps, ...defaultPeps])];
        
        // Popular selects
        populateSelect('projeto', todosProjetos, 'Selecione o projeto');
        populateSelect('subProjeto', todosSubProjetos, 'Selecione o sub projeto');
        populateSelect('tipoAcao', allTiposAcao, 'Selecione o tipo de ação');
        populateSelect('cidade', allCidades, 'Selecione a cidade');
        populateSelect('supervisor', todosSupervisores, 'Selecione o supervisor');
        populateSelect('equipe', allEquipes, 'Selecione a equipe');
        populateSelect('pep', allPeps, 'Selecione o PEP');
        
        console.log('✅ Selects do formulário populados com dados combinados');
        console.log('📊 Dados encontrados:', {
            projetosEnderecos: projetosEnderecos.length,
            projetosGestao: projetosGestao.length,
            todosProjetos: todosProjetos.length,
            subProjetosEnderecos: subProjetosEnderecos.length,
            subProjetosGestao: subProjetosGestao.length,
            todosSubProjetos: todosSubProjetos.length,
            tiposAcaoEnderecos: tiposAcaoEnderecos.length,
            tiposAcaoGestao: tiposAcaoGestao.length,
            todosTiposAcao: todosTiposAcao.length,
            supervisoresEnderecos: supervisoresEnderecos.length,
            supervisoresGestao: supervisoresGestao.length,
            todosSupervisores: todosSupervisores.length,
            equipesEnderecos: equipesEnderecos.length,
            equipesGestao: equipesGestao.length,
            todasEquipes: todasEquipes.length,
            cidadesEnderecos: cidadesEnderecos.length,
            cidadesGestao: cidadesGestao.length,
            todasCidades: todasCidades.length,
            peps: peps.length
        });
    } catch (error) {
        console.error('❌ Erro ao popular selects:', error);
    }
}

// Função auxiliar para popular um select
function populateSelect(selectId, options, defaultText = '') {
    const select = document.getElementById(selectId);
    if (select && options.length > 0) {
        // Adicionar opção padrão se fornecida
        const defaultOption = defaultText ? `<option value="">${defaultText}</option>` : '';
        
        select.innerHTML = defaultOption + options.map(option => 
            `<option value="${option}">${option}</option>`
        ).join('');
    }
}

// Atualizar funções existentes para incluir persistência e estatísticas
// Modificar updateEndereco
const originalUpdateEndereco = updateEndereco;
function updateEndereco(id, data) {
    const index = enderecosData.findIndex(e => e.id == id);
    if (index !== -1) {
        enderecosData[index] = {
            ...enderecosData[index],
            ...data,
            hp: parseInt(data.hp) || 0
        };
        
        // Persistir dados
        savePersistedData();
        
        renderEnderecosTable();
        processDataForCharts();
        createAllCharts();
        updateStats();
        updateEnderecoStats();
        updateInfraStats();
        
        console.log('✅ Endereço atualizado:', enderecosData[index]);
    }
}

// Modificar deleteEndereco
const originalDeleteEndereco = deleteEndereco;
function deleteEndereco(id) {
    if (confirm('Tem certeza que deseja deletar este endereço?')) {
        const index = enderecosData.findIndex(e => e.id == id);
        if (index !== -1) {
            enderecosData.splice(index, 1);
            
            // Persistir dados
            savePersistedData();
            
            renderEnderecosTable();
            processDataForCharts();
            createAllCharts();
            updateStats();
            updateEnderecoStats();
            updateInfraStats();
            console.log('✅ Endereço deletado');
        }
    }
}

// Modificar processUpload para incluir persistência
const originalProcessUpload = processUpload;
function processUpload() {
    console.log('⚡ Processando upload final...');
    
    if (!uploadedData || uploadedData.length === 0) {
        alert('Nenhum dado para processar');
        return;
    }
    
    // Obter mapeamento das colunas
    const mapping = {
        projeto: document.getElementById('mapProjeto')?.value || '',
        subProjeto: document.getElementById('mapSubProjeto')?.value || '',
        tipoAcao: document.getElementById('mapTipoAcao')?.value || '',
        condominio: document.getElementById('mapCondominio')?.value || '',
        endereco: document.getElementById('mapEndereco')?.value || '',
        cidade: document.getElementById('mapCidade')?.value || '',
        equipe: document.getElementById('mapEquipe')?.value || '',
        supervisor: document.getElementById('mapSupervisor')?.value || '',
        status: document.getElementById('mapStatus')?.value || '',
        hp: document.getElementById('mapHP')?.value || ''
    };
    
    // Verificar se pelo menos alguns campos foram mapeados
    const mappedFields = Object.values(mapping).filter(v => v !== '').length;
    if (mappedFields === 0) {
        alert('Por favor, mapeie pelo menos uma coluna antes de processar.');
        return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    try {
        // Processar cada linha dos dados
        uploadedData.forEach(row => {
            try {
                const newId = Math.max(...enderecosData.map(e => e.id), 0) + 1;
                
                const newEndereco = {
                    id: newId,
                    projeto: mapping.projeto ? row[mapping.projeto] : '',
                    subProjeto: mapping.subProjeto ? row[mapping.subProjeto] : '',
                    tipoAcao: mapping.tipoAcao ? row[mapping.tipoAcao] : '',
                    condominio: mapping.condominio ? row[mapping.condominio] : '',
                    endereco: mapping.endereco ? row[mapping.endereco] : '',
                    cidade: mapping.cidade ? row[mapping.cidade] : '',
                    equipe: mapping.equipe ? row[mapping.equipe] : '',
                    supervisor: mapping.supervisor ? row[mapping.supervisor] : '',
                    status: mapping.status ? row[mapping.status] : '',
                    hp: parseInt(mapping.hp ? row[mapping.hp] : (row['HP'] || row['hp'] || row['quantidade'] || row['qtd'] || 0)) || 0,
                    // Outros campos podem ser adicionados aqui
                    dataRecebimento: row['Data Recebimento'] || row['dataRecebimento'] || '',
                    pep: row['PEP'] || row['pep'] || '',
                    codImovelGed: row['COD IMOVEL GED'] || row['codImovelGed'] || ''
                };
                
                enderecosData.push(newEndereco);
                processedCount++;
                
            } catch (error) {
                console.error('❌ Erro ao processar linha:', row, error);
                errorCount++;
            }
        });
        
        // Salvar no localStorage imediatamente
        localStorage.setItem('enderecosData', JSON.stringify(enderecosData));
        console.log('💾 Dados salvos no localStorage:', enderecosData.length, 'registros');
        
        // Atualizar interface
        renderEnderecosTable();
        updateStats();
        updateEnderecoStats();
        updateInfraStats();
        populateInfraFilters();
        
        // Fechar modal e mostrar resultado
        closeUploadModal();
        
        const message = `✅ ${formatNumber(processedCount)} registros importados com sucesso\n` +
                       (errorCount > 0 ? `❌ ${formatNumber(errorCount)} registros com erro\n` : '') +
                       `📊 Estatísticas atualizadas\n` +
                       `💾 Dados salvos permanentemente`;
        
        showSuccess('Upload Concluído!', message);
        
        console.log(`✅ Upload concluído: ${formatNumber(processedCount)} sucessos, ${formatNumber(errorCount)} erros`);
        
    } catch (error) {
        console.error('❌ Erro no processamento do upload:', error);
        showError('Erro no Upload', 'Erro ao processar upload: ' + error.message);
    }
}

// Função para atualizar data e hora no card de métricas diárias
function initializeDateTimeUpdate() {
    console.log('🕐 Inicializando atualização de data/hora');
    
    function updateDateTime() {
        const now = new Date();
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        
        const formattedDateTime = now.toLocaleDateString('pt-BR', options);
        const lastUpdateElement = document.getElementById('lastUpdate');
        
        if (lastUpdateElement) {
            lastUpdateElement.textContent = `Atualizado em ${formattedDateTime}`;
        }
    }
    
    // Atualizar imediatamente
    updateDateTime();
    
    // Atualizar a cada segundo
    setInterval(updateDateTime, 1000);
}

// Função para calcular estatísticas da infraestrutura
function calculateInfraStats() {
    console.log('📊 Calculando estatísticas da infraestrutura...');
    
    try {
        // Combinar dados de endereços com dados dinâmicos
        let totalRegistros = enderecosData.length;
        let enderecosDistintos = new Set(enderecosData.map(e => e.endereco).filter(Boolean));
        let equipesDistintas = new Set(enderecosData.map(e => e.equipe).filter(Boolean));
        let registrosProdutivos = enderecosData.filter(e => (e.status || '').toLowerCase() === 'produtiva').length;
        
        // Adicionar dados da tabela dinâmica se disponível
        if (dynamicTableData.data.length > 0) {
            console.log('🔄 Incluindo dados dinâmicos nas estatísticas de infraestrutura...');
            
            totalRegistros += dynamicTableData.data.length;
            
            // Processar dados dinâmicos para endereços
            dynamicTableData.data.forEach(row => {
                Object.keys(row).forEach(field => {
                    const fieldLower = field.toLowerCase();
                    const value = row[field]?.toString().trim();
                    
                    if (!value || value === '') return;
                    
                    // Detectar endereços
                    if (fieldLower.includes('endereco') || fieldLower.includes('address') || fieldLower.includes('node')) {
                        enderecosDistintos.add(value);
                    }
                    
                    // Detectar equipes
                    if (fieldLower.includes('equipe') || fieldLower.includes('team')) {
                        equipesDistintas.add(value);
                    }
                    
                    // Detectar status produtivo
                    if (fieldLower.includes('status')) {
                        const statusValue = value.toLowerCase();
                        if (statusValue.includes('produtiv') || statusValue.includes('concluido') || 
                            statusValue.includes('finalizado') || statusValue.includes('s') || 
                            statusValue.includes('ativo') || statusValue.includes('concluido')) {
                            registrosProdutivos++;
                        }
                    }
                });
            });
        }
        
        const produtividade = totalRegistros > 0 ? ((registrosProdutivos / totalRegistros) * 100).toFixed(1) : 0;

        const stats = {
            totalRegistros,
            enderecosDistintos: enderecosDistintos.size,
            equipesDistintas: equipesDistintas.size,
            produtividade: parseFloat(produtividade)
        };
        
        console.log('📊 Estatísticas de infraestrutura calculadas:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas da infraestrutura:', error);
        return {
            totalRegistros: 0,
            enderecosDistintos: 0,
            equipesDistintas: 0,
            produtividade: 0
        };
    }
}

// Função para atualizar os cards de estatísticas da infraestrutura
function updateInfraStats() {
    console.log('📊 Atualizando estatísticas da infraestrutura...');
    
    try {
        // Usar a função atualizada que inclui o cálculo do tempo médio
        updateInfraStatsWithData([], dynamicTableData.data || []);
        
        console.log('✅ Cards de estatísticas da infraestrutura atualizados.');
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas da infraestrutura:', error);
    }

    // Atualizar data/hora de última atualização
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR') + ', ' + now.toLocaleTimeString('pt-BR');
    const el = document.getElementById('infraLastUpdateTime');
    if (el) {
        el.textContent = `Atualizado em ${formatted}`;
    }
}

// Função para popular os filtros da infraestrutura
// Função auxiliar para detectar tipo de campo
function detectFieldType(fieldName) {
    const fieldLower = fieldName.toLowerCase();
    
    // Detectar projetos (excluindo subprojetos)
    if ((fieldLower.includes('projeto') || fieldLower.includes('project')) && 
        !fieldLower.includes('sub') && !fieldLower.includes('subprojeto')) {
        return 'projeto';
    }
    
    // Detectar sub projetos
    if ((fieldLower.includes('sub') && fieldLower.includes('projeto')) || 
        fieldLower.includes('subprojeto') || fieldLower.includes('subproject')) {
        return 'subprojeto';
    }
    
    // Detectar equipes
    if (fieldLower.includes('equipe') || fieldLower.includes('team')) {
        return 'equipe';
    }
    
    // Detectar cidades
    if (fieldLower.includes('cidade') || fieldLower.includes('city')) {
        return 'cidade';
    }
    
    // Detectar supervisores
    if (fieldLower.includes('supervisor')) {
        return 'supervisor';
    }
    
    // Detectar tipos de ação
    if (fieldLower.includes('tipo') || fieldLower.includes('acao') || fieldLower.includes('action')) {
        return 'tipoacao';
    }
    
    return null;
}

// Função para detectar o tipo de um valor (não do campo)
function detectValueType(value) {
    if (!value) return null;
    
    const valueStr = value.toString().toLowerCase();
    
    // Padrões comuns de projetos vs subprojetos
    const projetoPatterns = [
        /^projeto\s+/i,
        /^project\s+/i,
        /^mdu-/i,
        /^nap\s/i,
        /^on\s+going/i,
        /^solicitacao\s+de\s+sar/i
    ];
    
    const subProjetoPatterns = [
        /^sub\s*projeto/i,
        /^subproject/i,
        /^sub\s+/i,
        /^ramal/i,
        /^extensao/i,
        /^bloco/i,
        /^setor/i
    ];
    
    // Verificar se é um projeto
    for (const pattern of projetoPatterns) {
        if (pattern.test(valueStr)) {
            return 'projeto';
        }
    }
    
    // Verificar se é um subprojeto
    for (const pattern of subProjetoPatterns) {
        if (pattern.test(valueStr)) {
            return 'subprojeto';
        }
    }
    
    // Se contém "projeto" mas não "sub", provavelmente é um projeto
    if (valueStr.includes('projeto') && !valueStr.includes('sub')) {
        return 'projeto';
    }
    
    // Se contém "sub" e "projeto", é um subprojeto
    if (valueStr.includes('sub') && valueStr.includes('projeto')) {
        return 'subprojeto';
    }
    
    return null;
}

function populateInfraFilters() {
    console.log('🔍 Populando filtros da infraestrutura...');
    
    try {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        // Extrair dados exatos da tabela dinâmica (Cadastro de Endereços)
        const projetosDinamicos = new Set();
        const subProjetosDinamicos = new Set();
        const equipesDinamicos = new Set();
        const cidadesDinamicos = new Set();
        const supervisoresDinamicos = new Set();
        const tiposAcaoDinamicos = new Set();
        const statusDinamicos = new Set();
        const datasRecebimentoDinamicos = new Set();
        
        if (dynamicTableData.data.length > 0) {
            console.log('🔄 Processando dados da tabela dinâmica para filtros...');
            console.log('📋 Headers disponíveis:', dynamicTableData.headers);
            console.log('🔍 Colunas encontradas:', columnNames);
            
            dynamicTableData.data.forEach(row => {
                // Filtrar PROJETO
                if (columnNames.PROJETO && row[columnNames.PROJETO] && row[columnNames.PROJETO].toString().trim() !== '') {
                    projetosDinamicos.add(row[columnNames.PROJETO].toString().trim());
                }
                
                // Filtrar SUB PROJETO
                if (columnNames['SUB PROJETO'] && row[columnNames['SUB PROJETO']] && row[columnNames['SUB PROJETO']].toString().trim() !== '') {
                    subProjetosDinamicos.add(row[columnNames['SUB PROJETO']].toString().trim());
                }
                
                // Filtrar EQUIPE
                if (columnNames.EQUIPE && row[columnNames.EQUIPE] && row[columnNames.EQUIPE].toString().trim() !== '') {
                    equipesDinamicos.add(row[columnNames.EQUIPE].toString().trim());
                }
                
                // Filtrar STATUS
                if (columnNames.STATUS && row[columnNames.STATUS] && row[columnNames.STATUS].toString().trim() !== '') {
                    statusDinamicos.add(row[columnNames.STATUS].toString().trim());
                }
                
                // Filtrar CIDADE
                if (columnNames.CIDADE && row[columnNames.CIDADE] && row[columnNames.CIDADE].toString().trim() !== '') {
                    cidadesDinamicos.add(row[columnNames.CIDADE].toString().trim());
                }
                
                // Filtrar SUPERVISOR
                if (columnNames.SUPERVISOR && row[columnNames.SUPERVISOR] && row[columnNames.SUPERVISOR].toString().trim() !== '') {
                    supervisoresDinamicos.add(row[columnNames.SUPERVISOR].toString().trim());
                }
                
                // Filtrar TIPO DE AÇÃO
                if (columnNames['TIPO DE AÇÃO'] && row[columnNames['TIPO DE AÇÃO']] && row[columnNames['TIPO DE AÇÃO']].toString().trim() !== '') {
                    tiposAcaoDinamicos.add(row[columnNames['TIPO DE AÇÃO']].toString().trim());
                }
                
                // Filtrar DATA RECEBIMENTO
                if (columnNames['DATA RECEBIMENTO'] && row[columnNames['DATA RECEBIMENTO']] && row[columnNames['DATA RECEBIMENTO']].toString().trim() !== '') {
                    datasRecebimentoDinamicos.add(row[columnNames['DATA RECEBIMENTO']].toString().trim());
                }
            });
        }
        
        console.log('📊 Dados extraídos da tabela dinâmica:', {
            projetos: projetosDinamicos.size,
            subProjetos: subProjetosDinamicos.size,
            equipes: equipesDinamicos.size,
            cidades: cidadesDinamicos.size,
            supervisores: supervisoresDinamicos.size,
            tiposAcao: tiposAcaoDinamicos.size,
            status: statusDinamicos.size,
            datasRecebimento: datasRecebimentoDinamicos.size
        });
        
        // Usar apenas dados da tabela dinâmica
        const todosProjetos = [...projetosDinamicos].sort();
        const todosSubProjetos = [...subProjetosDinamicos].sort();
        const todasEquipes = [...equipesDinamicos].sort();
        const todasCidades = [...cidadesDinamicos].sort();
        const todosSupervisores = [...supervisoresDinamicos].sort();
        const todosTiposAcao = [...tiposAcaoDinamicos].sort();
        const todosStatus = [...statusDinamicos].sort();
        const todasDatasRecebimento = [...datasRecebimentoDinamicos].sort();
        
        console.log('📊 Dados para filtros de infraestrutura:', {
            projetos: todosProjetos.length,
            subProjetos: todosSubProjetos.length,
            equipes: todasEquipes.length,
            cidades: todasCidades.length,
            supervisores: todosSupervisores.length,
            tiposAcao: todosTiposAcao.length
        });
        
        // Popular selects
        populateSelect('infraFilterProjeto', todosProjetos, 'Todos os Projetos');
        populateSelect('infraFilterSubProjeto', todosSubProjetos, 'Todos os Sub-Projetos');
        populateSelect('infraFilterEquipe', todasEquipes, 'Todas as Equipes');
        populateSelect('infraFilterCidade', todasCidades, 'Todas as Cidades');
        populateSelect('infraFilterSupervisor', todosSupervisores, 'Todos os Supervisores');
        populateSelect('infraFilterTipoAcao', todosTiposAcao, 'Todos os Tipos');
        
        // Popular filtro de Status com dados dinâmicos
        populateSelect('infraFilterStatus', todosStatus, 'Todos os Status');
        
        // Configurar filtro de Período de Recebimento (inputs de data)
        // Os inputs de data são preenchidos pelo usuário, não populados automaticamente
        
        console.log('✅ Filtros da infraestrutura populados com dados da tabela dinâmica');
        
        // Inicializar dropdowns com checkboxes após popular os filtros
        setTimeout(() => {
            if (typeof window.initializeCheckboxDropdownsWhenReady === 'function') {
                window.initializeCheckboxDropdownsWhenReady();
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Erro ao popular filtros da infraestrutura:', error);
    }
}
// Função para aplicar filtros da infraestrutura
function applyInfraFilters() {
    console.log('🔍 Aplicando filtros da infraestrutura...');
    
    try {
        // Obter valores dos filtros (agora com suporte a múltipla seleção)
        const projetoElement = document.getElementById('infraFilterProjeto');
        const subProjetoElement = document.getElementById('infraFilterSubProjeto');
        const equipeElement = document.getElementById('infraFilterEquipe');
        const statusElement = document.getElementById('infraFilterStatus');
        const cidadeElement = document.getElementById('infraFilterCidade');
        const supervisorElement = document.getElementById('infraFilterSupervisor');
        const tipoAcaoElement = document.getElementById('infraFilterTipoAcao');
        
        // Função helper para obter valores selecionados (múltipla seleção)
        const getSelectedValues = (selectElement) => {
            if (!selectElement) return [];
            const selected = Array.from(selectElement.selectedOptions).map(option => option.value);
            return selected.filter(value => value !== ''); // Remover valores vazios
        };
        
        const projetos = getSelectedValues(projetoElement);
        const subProjetos = getSelectedValues(subProjetoElement);
        const equipes = getSelectedValues(equipeElement);
        const statuses = getSelectedValues(statusElement);
        const cidades = getSelectedValues(cidadeElement);
        const supervisores = getSelectedValues(supervisorElement);
        const tiposAcao = getSelectedValues(tipoAcaoElement);
        
        const dataInicio = document.getElementById('infraFilterDataInicio').value;
        const dataFim = document.getElementById('infraFilterDataFim').value;
        
        console.log('🔍 Filtros aplicados (múltipla seleção):', { 
            projetos, subProjetos, equipes, statuses, cidades, supervisores, tiposAcao, dataInicio, dataFim 
        });
        
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        // Filtrar dados da tabela dinâmica pelos campos exatos
        let filteredDinamicos = dynamicTableData.data.filter(row => {
            // Filtros básicos com suporte a múltipla seleção
            const filtroBasico = (projetos.length === 0 || (columnNames.PROJETO && projetos.includes(row[columnNames.PROJETO]))) &&
                   (subProjetos.length === 0 || (columnNames['SUB PROJETO'] && subProjetos.includes(row[columnNames['SUB PROJETO']]))) &&
                   (equipes.length === 0 || (columnNames.EQUIPE && equipes.includes(row[columnNames.EQUIPE]))) &&
                   (statuses.length === 0 || (columnNames.STATUS && statuses.includes(row[columnNames.STATUS]))) &&
                   (cidades.length === 0 || (columnNames.CIDADE && cidades.includes(row[columnNames.CIDADE]))) &&
                   (supervisores.length === 0 || (columnNames.SUPERVISOR && supervisores.includes(row[columnNames.SUPERVISOR]))) &&
                   (tiposAcao.length === 0 || (columnNames['TIPO DE AÇÃO'] && tiposAcao.includes(row[columnNames['TIPO DE AÇÃO']])));
            
            // Filtro de período
            let filtroPeriodo = true;
            if (dataInicio || dataFim) {
                const dataRecebimento = columnNames['DATA RECEBIMENTO'] && row[columnNames['DATA RECEBIMENTO']] ? 
                    row[columnNames['DATA RECEBIMENTO']].toString().trim() : '';
                
                if (dataRecebimento) {
                    try {
                        // Converter data de recebimento para objeto Date
                        let dataRecebimentoObj = null;
                        
                        // Formato DD/MM/YYYY
                        if (dataRecebimento.includes('/')) {
                            const [dia, mes, ano] = dataRecebimento.split('/');
                            dataRecebimentoObj = new Date(ano, mes - 1, dia);
                        }
                        // Formato YYYY-MM-DD
                        else if (dataRecebimento.includes('-')) {
                            dataRecebimentoObj = new Date(dataRecebimento);
                        }
                        // Outros formatos
                        else {
                            dataRecebimentoObj = new Date(dataRecebimento);
                        }
                        
                        if (!isNaN(dataRecebimentoObj.getTime())) {
                            const dataRecebimentoISO = dataRecebimentoObj.toISOString().split('T')[0];
                            
                            // Aplicar filtros de data
                            if (dataInicio && dataRecebimentoISO < dataInicio) {
                                filtroPeriodo = false;
                            }
                            if (dataFim && dataRecebimentoISO > dataFim) {
                                filtroPeriodo = false;
                            }
                        } else {
                            filtroPeriodo = false; // Data inválida
                        }
                    } catch (error) {
                        filtroPeriodo = false; // Erro ao processar data
                    }
                } else {
                    filtroPeriodo = false; // Sem data de recebimento
                }
            }
            
            return filtroBasico && filtroPeriodo;
        });
        
        // Usar apenas dados da tabela dinâmica filtrados
        const totalFiltered = filteredDinamicos.length;
        
        console.log(`📊 Dados filtrados: ${filteredDinamicos.length} registros (tabela dinâmica)`);
        console.log('🔍 Filtros aplicados:', { projeto, subProjeto, equipe, status, cidade, supervisor, tipoAcao, dataInicio, dataFim });
        
        // Atualizar estatísticas com dados filtrados (apenas tabela dinâmica)
        updateInfraStatsWithData([], filteredDinamicos);
        
        // Atualizar gráficos com dados filtrados
        updateInfraChartsWithData(filteredDinamicos);
        
        console.log(`✅ Filtros aplicados: ${totalFiltered} registros encontrados`);
    } catch (error) {
        console.error('❌ Erro ao aplicar filtros da infraestrutura:', error);
    }
}

// Função para limpar filtros da infraestrutura
function clearInfraFilters() {
    console.log('🔄 Limpando filtros da infraestrutura...');
    
    try {
        // Função helper para limpar selects múltiplos
        const clearSelectMultiple = (elementId) => {
            const element = document.getElementById(elementId);
            if (element) {
                // Desmarcar todas as opções selecionadas
                Array.from(element.options).forEach(option => option.selected = false);
            }
        };
        
        // Limpar todos os selects múltiplos
        clearSelectMultiple('infraFilterProjeto');
        clearSelectMultiple('infraFilterSubProjeto');
        clearSelectMultiple('infraFilterEquipe');
        clearSelectMultiple('infraFilterStatus');
        clearSelectMultiple('infraFilterCidade');
        clearSelectMultiple('infraFilterSupervisor');
        clearSelectMultiple('infraFilterTipoAcao');
        
        // Limpar campos de data
        document.getElementById('infraFilterDataInicio').value = '';
        document.getElementById('infraFilterDataFim').value = '';
        
        // Atualizar estatísticas com todos os dados (apenas tabela dinâmica)
        updateInfraStatsWithData([], dynamicTableData.data);
        
        // Atualizar gráficos com todos os dados
        updateInfraChartsWithData(dynamicTableData.data);
        
        console.log('✅ Filtros da infraestrutura limpos');
    } catch (error) {
        console.error('❌ Erro ao limpar filtros da infraestrutura:', error);
    }
}

// Função para atualizar estatísticas com dados específicos
function updateInfraStatsWithData(enderecosData, dinamicosData = []) {
    console.log('📊 Atualizando estatísticas da infraestrutura com dados filtrados...');
    
    try {
        // Processar dados de endereços (vazio agora, pois usamos apenas tabela dinâmica)
        const totalEnderecos = 0;
        const enderecosDistintosEnderecos = new Set();
        const equipesDistintasEnderecos = new Set();
        const registrosProdutivosEnderecos = 0;
        
        // Processar dados dinâmicos
        const totalDinamicos = dinamicosData.length;
        const enderecosDistintosDinamicos = new Set();
        const equipesDistintasDinamicos = new Set();
        let registrosProdutivosDinamicos = 0;
        
        if (totalDinamicos > 0) {
            console.log('🔄 Processando dados dinâmicos para estatísticas filtradas...');
            
            // Obter nomes exatos das colunas da tabela dinâmica
            const columnNames = getDynamicTableColumnNames();
            
            dinamicosData.forEach(row => {
                // Usar campos exatos da tabela dinâmica
                if (columnNames.ENDEREÇO && row[columnNames.ENDEREÇO] && row[columnNames.ENDEREÇO].toString().trim() !== '') {
                    enderecosDistintosDinamicos.add(row[columnNames.ENDEREÇO].toString().trim());
                }
                
                if (columnNames.EQUIPE && row[columnNames.EQUIPE] && row[columnNames.EQUIPE].toString().trim() !== '') {
                    equipesDistintasDinamicos.add(row[columnNames.EQUIPE].toString().trim());
                }
                
                // Detectar status produtivo
                if (columnNames.STATUS && row[columnNames.STATUS]) {
                    const statusValue = row[columnNames.STATUS].toString().toLowerCase();
                    if (statusValue.includes('produtiv') || statusValue.includes('concluido') || 
                        statusValue.includes('finalizado') || statusValue.includes('s') || 
                        statusValue.includes('ativo') || statusValue.includes('concluido')) {
                        registrosProdutivosDinamicos++;
                    }
                }
            });
        }
        
        // Usar apenas estatísticas da tabela dinâmica
        const totalRegistros = totalDinamicos;
        const enderecosDistintos = enderecosDistintosDinamicos.size;
        const equipesDistintas = equipesDistintasDinamicos.size;
        const registrosProdutivos = registrosProdutivosDinamicos;
        const produtividade = totalRegistros > 0 ? ((registrosProdutivos / totalRegistros) * 100).toFixed(1) : 0;
        
        // Atualizar cards
        const totalElement = document.getElementById('infraStatTotalRegistros');
        const enderecosElement = document.getElementById('infraStatEnderecosDistintos');
        const equipesElement = document.getElementById('infraStatEquipesDistintas');
        const produtividadeElement = document.getElementById('infraStatProdutividade');
        
        if (totalElement) totalElement.textContent = totalRegistros;
        if (enderecosElement) enderecosElement.textContent = enderecosDistintos;
        if (equipesElement) equipesElement.textContent = equipesDistintas;
        if (produtividadeElement) produtividadeElement.textContent = `${produtividade}%`;
        
        // Calcular e atualizar tempos médios com dados filtrados
        calculateTempoMedioExecucao(dinamicosData);
        calculateTempoMedioSalaTecnica(dinamicosData);
        calculateTempoMedioTecnicos(dinamicosData);
        
        console.log('✅ Estatísticas da infraestrutura atualizadas com dados filtrados:', {
            totalRegistros,
            enderecosDistintos,
            equipesDistintas,
            produtividade: `${produtividade}%`,
            detalhes: {
                dinamicos: `${totalDinamicos} registros da tabela dinâmica`,
                produtivos: `${registrosProdutivosDinamicos} registros produtivos`
            }
        });
    } catch (error) {
        console.error('❌ Erro ao atualizar estatísticas da infraestrutura:', error);
    }

    // Atualizar data/hora de última atualização
    const now = new Date();
    const formatted = now.toLocaleDateString('pt-BR') + ', ' + now.toLocaleTimeString('pt-BR');
    const el = document.getElementById('infraLastUpdateTime');
    if (el) {
        el.textContent = `Atualizado em ${formatted}`;
    }
}

// Função para atualizar gráficos da infraestrutura com dados filtrados
function updateInfraChartsWithData(filteredData) {
    console.log('📊 Atualizando gráficos da infraestrutura com dados filtrados...');
    
    try {
        // Verificar se estamos na seção de infraestrutura
        const infraSection = document.getElementById('infraestrutura');
        if (!infraSection || !infraSection.classList.contains('active')) {
            console.log('⚠️ Seção de infraestrutura não está ativa, pulando atualização de gráficos');
            return;
        }
        
        // Atualizar dados globais temporariamente para os gráficos
        const originalData = [...dynamicTableData.data];
        dynamicTableData.data = filteredData;
        
        // Recriar todos os gráficos com dados filtrados
        console.log('🔄 Recriando gráficos com dados filtrados...');
        
        // Gráfico de Projetos
        if (document.getElementById('projetosChart')) {
            createProjetosCombinedChart();
        }
        
        // Gráfico de Sub-Projetos
        if (document.getElementById('subProjetosChart')) {
            createSubProjetosCombinedChart();
        }
        
        // Gráfico de Cidades
        if (document.getElementById('cidadesChart')) {
            createCidadesCombinedChart();
        }
        
        // Gráfico de HP por Projetos
        if (document.getElementById('hpProjetosChart')) {
            createHpProjetosBarChart();
        }
        
        // Gráfico de Recebimentos por Mês
        if (document.getElementById('recebimentosChart')) {
            createRecebimentosBarChart();
        }
        
        // Gráfico de Supervisor por Status
        if (document.getElementById('supervisorStatusChart')) {
            createSupervisorStatusBarChart();
        }
        
        // Atualizar tabelas com dados filtrados
        updateInfraTablesWithData(filteredData);
        
        // Restaurar dados originais
        dynamicTableData.data = originalData;
        
        console.log('✅ Gráficos e tabelas da infraestrutura atualizados com dados filtrados');
    } catch (error) {
        console.error('❌ Erro ao atualizar gráficos da infraestrutura:', error);
    }
}

// Função para atualizar tabelas da infraestrutura com dados filtrados
function updateInfraTablesWithData(filteredData) {
    console.log('📋 Atualizando tabelas da infraestrutura com dados filtrados...');
    
    try {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        // Atualizar tabela de ranking de supervisores
        updateSupervisorRankingTable(filteredData, columnNames);
        
        // Atualizar tabela de ranking de equipes
        updateTeamRankingTable(filteredData, columnNames);
        
        // Atualizar tabela de ranking de projetos
        updateProjectRankingTable(filteredData, columnNames);
        
        // Atualizar tabela "Por Tipo de Ação"
        updateTipoAcaoTable(filteredData, columnNames);
        
        // Atualizar tabela "Por Status"
        updateStatusTable(filteredData, columnNames);
        
        console.log('✅ Tabelas da infraestrutura atualizadas com dados filtrados');
    } catch (error) {
        console.error('❌ Erro ao atualizar tabelas da infraestrutura:', error);
    }
}

// Função para atualizar tabela de ranking de supervisores
function updateSupervisorRankingTable(filteredData, columnNames) {
    const tableContainer = document.querySelector('#infraestrutura .ranking-table-container');
    if (!tableContainer) return;
    
    // Agrupar dados por supervisor
    const supervisorStats = {};
    
    filteredData.forEach(row => {
        const supervisor = columnNames.SUPERVISOR && row[columnNames.SUPERVISOR] ? 
            row[columnNames.SUPERVISOR].toString().trim() : 'Não definido';
        
        if (!supervisorStats[supervisor]) {
            supervisorStats[supervisor] = {
                total: 0,
                produtiva: 0,
                improdutiva: 0
            };
        }
        
        supervisorStats[supervisor].total++;
        
        // Verificar status
        const status = columnNames.STATUS && row[columnNames.STATUS] ? 
            row[columnNames.STATUS].toString().toLowerCase() : '';
        
        if (status.includes('produtiv') || status.includes('concluido') || 
            status.includes('finalizado') || status.includes('s') || 
            status.includes('ativo')) {
            supervisorStats[supervisor].produtiva++;
        } else {
            supervisorStats[supervisor].improdutiva++;
        }
    });
    
    // Calcular produtividade e ordenar
    const rankingData = Object.entries(supervisorStats)
        .map(([supervisor, stats]) => ({
            supervisor,
            total: stats.total,
            produtiva: stats.produtiva,
            improdutiva: stats.improdutiva,
            produtividade: stats.total > 0 ? ((stats.produtiva / stats.total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => parseFloat(b.produtividade) - parseFloat(a.produtividade));
    
    // Atualizar tabela
    updateRankingTableHTML(tableContainer, rankingData, 'supervisor');
}

// Função para atualizar tabela de ranking de equipes
function updateTeamRankingTable(filteredData, columnNames) {
    const tableContainer = document.querySelector('#infraestrutura .team-ranking-table-container');
    if (!tableContainer) return;
    
    // Agrupar dados por equipe
    const teamStats = {};
    
    filteredData.forEach(row => {
        const equipe = columnNames.EQUIPE && row[columnNames.EQUIPE] ? 
            row[columnNames.EQUIPE].toString().trim() : 'Não definido';
        
        if (!teamStats[equipe]) {
            teamStats[equipe] = {
                total: 0,
                produtiva: 0,
                improdutiva: 0
            };
        }
        
        teamStats[equipe].total++;
        
        // Verificar status
        const status = columnNames.STATUS && row[columnNames.STATUS] ? 
            row[columnNames.STATUS].toString().toLowerCase() : '';
        
        if (status.includes('produtiv') || status.includes('concluido') || 
            status.includes('finalizado') || status.includes('s') || 
            status.includes('ativo')) {
            teamStats[equipe].produtiva++;
        } else {
            teamStats[equipe].improdutiva++;
        }
    });
    
    // Calcular produtividade e ordenar
    const rankingData = Object.entries(teamStats)
        .map(([equipe, stats]) => ({
            name: equipe,
            total: stats.total,
            produtiva: stats.produtiva,
            improdutiva: stats.improdutiva,
            produtividade: stats.total > 0 ? ((stats.produtiva / stats.total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => parseFloat(b.produtividade) - parseFloat(a.produtividade));
    
    // Atualizar tabela
    updateRankingTableHTML(tableContainer, rankingData, 'team');
}

// Função para atualizar tabela de ranking de projetos
function updateProjectRankingTable(filteredData, columnNames) {
    const tableContainer = document.querySelector('#infraestrutura .project-ranking-table-container');
    if (!tableContainer) return;
    
    // Agrupar dados por projeto
    const projectStats = {};
    
    filteredData.forEach(row => {
        const projeto = columnNames.PROJETO && row[columnNames.PROJETO] ? 
            row[columnNames.PROJETO].toString().trim() : 'Não definido';
        
        if (!projectStats[projeto]) {
            projectStats[projeto] = {
                total: 0,
                produtiva: 0,
                improdutiva: 0
            };
        }
        
        projectStats[projeto].total++;
        
        // Verificar status
        const status = columnNames.STATUS && row[columnNames.STATUS] ? 
            row[columnNames.STATUS].toString().toLowerCase() : '';
        
        if (status.includes('produtiv') || status.includes('concluido') || 
            status.includes('finalizado') || status.includes('s') || 
            status.includes('ativo')) {
            projectStats[projeto].produtiva++;
        } else {
            projectStats[projeto].improdutiva++;
        }
    });
    
    // Calcular produtividade e ordenar
    const rankingData = Object.entries(projectStats)
        .map(([projeto, stats]) => ({
            name: projeto,
            total: stats.total,
            produtiva: stats.produtiva,
            improdutiva: stats.improdutiva,
            produtividade: stats.total > 0 ? ((stats.produtiva / stats.total) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => parseFloat(b.produtividade) - parseFloat(a.produtividade));
    
    // Atualizar tabela
    updateRankingTableHTML(tableContainer, rankingData, 'project');
}

// Função genérica para atualizar HTML da tabela de ranking
function updateRankingTableHTML(container, rankingData, type) {
    if (!container || rankingData.length === 0) return;
    
    const tableBody = container.querySelector('tbody');
    if (!tableBody) return;
    
    // Limpar tabela
    tableBody.innerHTML = '';
    
    // Adicionar linhas de ranking
    rankingData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        // Adicionar classes para top 3
        if (index === 0) row.classList.add('gold');
        else if (index === 1) row.classList.add('silver');
        else if (index === 2) row.classList.add('bronze');
        
        const name = type === 'supervisor' ? item.supervisor : item.name;
        
        row.innerHTML = `
            <td class="position">
                <span class="position-number">${index + 1}</span>
            </td>
            <td class="name">${name}</td>
            <td class="count produtiva">${item.produtiva}</td>
            <td class="count improdutiva">${item.improdutiva}</td>
            <td class="count total">${item.total}</td>
            <td class="produtividade">
                <span class="produtividade-badge ${getProdutividadeClass(item.produtividade)}">
                    ${item.produtividade}%
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Adicionar linha de total
    const totalRow = document.createElement('tr');
    totalRow.classList.add('total-row');
    
    const totals = rankingData.reduce((acc, item) => ({
        produtiva: acc.produtiva + item.produtiva,
        improdutiva: acc.improdutiva + item.improdutiva,
        total: acc.total + item.total
    }), { produtiva: 0, improdutiva: 0, total: 0 });
    
    const totalProdutividade = totals.total > 0 ? ((totals.produtiva / totals.total) * 100).toFixed(1) : 0;
    
    totalRow.innerHTML = `
        <td class="position">
            <span class="position-number">TOTAL</span>
        </td>
        <td class="name">-</td>
        <td class="count produtiva">${totals.produtiva}</td>
        <td class="count improdutiva">${totals.improdutiva}</td>
        <td class="count total">${totals.total}</td>
        <td class="produtividade">
            <span class="produtividade-badge ${getProdutividadeClass(totalProdutividade)}">
                ${totalProdutividade}%
            </span>
        </td>
    `;
    
    tableBody.appendChild(totalRow);
}

// Função para determinar classe de produtividade
function getProdutividadeClass(produtividade) {
    const value = parseFloat(produtividade);
    if (value >= 90) return 'excelente';
    if (value >= 75) return 'boa';
    if (value >= 50) return 'regular';
    return 'baixa';
}

// Função para calcular tempo médio de execução (DATA RECEBIMENTO → DATA FINAL)
function calculateTempoMedioExecucao(dadosFiltrados = null) {
    console.log('⏱️ Calculando tempo médio de execução...');
    
    try {
        let totalDias = 0;
        let registrosValidos = 0;
        
        // Usar dados filtrados se fornecidos, senão usar todos os dados
        const dadosParaProcessar = dadosFiltrados || (dynamicTableData && dynamicTableData.data);
        
        if (dadosParaProcessar && Array.isArray(dadosParaProcessar)) {
            console.log('📊 Dados para processamento:', dadosParaProcessar.length, 'registros', dadosFiltrados ? '(filtrados)' : '(todos)');
            
            // Obter nomes exatos das colunas
            const columnNames = getDynamicTableColumnNames();
            const dataRecebimentoCol = columnNames['DATA RECEBIMENTO'];
            const dataFinalCol = columnNames['DATA FINAL'];
            
            console.log('🔍 Colunas encontradas:', {
                'DATA RECEBIMENTO': dataRecebimentoCol,
                'DATA FINAL': dataFinalCol,
                'Todas as colunas': columnNames
            });
            
            if (dataRecebimentoCol && dataFinalCol) {
                console.log('✅ Colunas encontradas, processando dados...');
                let registrosProcessados = 0;
                
                dadosParaProcessar.forEach((row, index) => {
                    const dataRecebimento = row[dataRecebimentoCol];
                    const dataFinal = row[dataFinalCol];
                    
                    if (dataRecebimento && dataFinal && 
                        dataRecebimento.toString().trim() !== '' && 
                        dataFinal.toString().trim() !== '') {
                        
                        registrosProcessados++;
                        if (registrosProcessados <= 5) { // Log apenas os primeiros 5 registros
                            console.log(`📅 Registro ${index + 1}:`, {
                                'DATA RECEBIMENTO': dataRecebimento,
                                'DATA FINAL': dataFinal
                            });
                        }
                        
                        try {
                            // Tentar diferentes formatos de data
                            let dataRecebimentoObj = null;
                            let dataFinalObj = null;
                            
                            // Formato DD/MM/YYYY
                            if (dataRecebimento.toString().includes('/')) {
                                const [dia, mes, ano] = dataRecebimento.toString().split('/');
                                dataRecebimentoObj = new Date(ano, mes - 1, dia);
                            }
                            // Formato YYYY-MM-DD
                            else if (dataRecebimento.toString().includes('-')) {
                                dataRecebimentoObj = new Date(dataRecebimento);
                            }
                            // Outros formatos
                            else {
                                dataRecebimentoObj = new Date(dataRecebimento);
                            }
                            
                            // Formato DD/MM/YYYY
                            if (dataFinal.toString().includes('/')) {
                                const [dia, mes, ano] = dataFinal.toString().split('/');
                                dataFinalObj = new Date(ano, mes - 1, dia);
                            }
                            // Formato YYYY-MM-DD
                            else if (dataFinal.toString().includes('-')) {
                                dataFinalObj = new Date(dataFinal);
                            }
                            // Outros formatos
                            else {
                                dataFinalObj = new Date(dataFinal);
                            }
                            
                            // Verificar se as datas são válidas
                            if (!isNaN(dataRecebimentoObj.getTime()) && !isNaN(dataFinalObj.getTime())) {
                                // Calcular diferença em dias
                                const diffTime = Math.abs(dataFinalObj - dataRecebimentoObj);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (registrosProcessados <= 5) {
                                    console.log(`📊 Cálculo registro ${index + 1}:`, {
                                        'Data Recebimento': dataRecebimentoObj.toLocaleDateString(),
                                        'Data Final': dataFinalObj.toLocaleDateString(),
                                        'Diferença em dias': diffDays
                                    });
                                }
                                
                                // Ignorar valores negativos ou muito altos (provavelmente erros)
                                if (diffDays >= 0 && diffDays <= 365) {
                                    totalDias += diffDays;
                                    registrosValidos++;
                                } else {
                                    if (registrosProcessados <= 5) {
                                        console.log(`⚠️ Registro ${index + 1} ignorado: diferença de ${diffDays} dias (fora do intervalo válido)`);
                                    }
                                }
                            } else {
                                if (registrosProcessados <= 5) {
                                    console.log(`⚠️ Registro ${index + 1} ignorado: datas inválidas`);
                                }
                            }
                        } catch (error) {
                            console.warn('⚠️ Erro ao processar datas:', error);
                        }
                    }
                });
            } else {
                console.warn('⚠️ Colunas de data não encontradas:', {
                    'DATA RECEBIMENTO': dataRecebimentoCol,
                    'DATA FINAL': dataFinalCol
                });
                console.log('📋 Headers disponíveis:', dynamicTableData.headers);
            }
        } else {
            console.warn('⚠️ Nenhum dado na tabela dinâmica');
        }
        
        console.log('📊 Resumo do processamento:', {
            'Total de registros': dadosParaProcessar?.length || 0,
            'Registros válidos': registrosValidos,
            'Total de dias': totalDias,
            'Tipo': dadosFiltrados ? 'Filtrados' : 'Todos'
        });
        
        // Calcular média
        const tempoMedio = registrosValidos > 0 ? Math.round(totalDias / registrosValidos) : 0;
        
        // Atualizar o card
        const tempoMedioElement = document.getElementById('infraStatTempoMedio');
        if (tempoMedioElement) {
            tempoMedioElement.textContent = tempoMedio.toString();
        }
        
        console.log(`✅ Tempo médio calculado: ${tempoMedio} dias (${registrosValidos} registros válidos)`);
        
        return {
            tempoMedio: tempoMedio,
            registrosValidos: registrosValidos,
            totalDias: totalDias
        };
    } catch (error) {
        console.error('❌ Erro ao calcular tempo médio de execução:', error);
        return {
            tempoMedio: 0,
            registrosValidos: 0,
            totalDias: 0
        };
    }
}

// Utilitário: parsing robusto de datas (string DD/MM/YYYY, YYYY-MM-DD, com hora, e números Excel)
function parseDateCell(raw) {
    if (raw === undefined || raw === null) return null;
    
    // Validação adicional para valores que não podem ser convertidos para string
    let val;
    try {
        val = raw.toString().trim();
    } catch (error) {
        return null;
    }
    
    if (val === '' || val === 'undefined' || val === 'null') return null;
    // Tentar número (Excel serial)
    const num = Number(val);
    if (!Number.isNaN(num) && Number.isFinite(num) && num > 20000 && num < 60000) {
        const excelEpoch = Date.UTC(1899, 11, 30); // 1899-12-30
        return new Date(excelEpoch + num * 86400000);
    }
    // Remover hora se houver
    const datePart = val.split('T')[0].split(' ')[0];
    // DD/MM/YYYY ou D/M/YY
    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d && m && y) {
                const year = y.length === 2 ? (parseInt(y, 10) + 2000) : parseInt(y, 10);
                const dt = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
                return isNaN(dt.getTime()) ? null : dt;
            }
        }
        return null;
    }
    // YYYY-MM-DD
    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            if (y && m && d) {
                const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
                return isNaN(dt.getTime()) ? null : dt;
            }
        }
        return null;
    }
    // Fallback
    const dt = new Date(val);
    return isNaN(dt.getTime()) ? null : dt;
}

// Novo: Tempo médio Sala Técnica (DATA RECEBIMENTO → DATA INÍCIO)
function calculateTempoMedioSalaTecnica(dadosFiltrados = null) {
    try {
        let totalDias = 0;
        let registrosValidos = 0;
        const dadosParaProcessar = dadosFiltrados || (dynamicTableData && dynamicTableData.data);
        if (dadosParaProcessar && Array.isArray(dadosParaProcessar)) {
            const columnNames = getDynamicTableColumnNames();
            const dataRecebimentoCol = columnNames['DATA RECEBIMENTO'];
            // Reconhece variações comuns de cabeçalho para Data Início
            const dataInicioCol = columnNames['DATA INÍCIO'] || columnNames['DATA INICIO'] ||
                                  columnNames['Data Início'] || columnNames['Data Inicio'] ||
                                  columnNames['data início'] || columnNames['data inicio'];
            if (dataRecebimentoCol && dataInicioCol) {
                dadosParaProcessar.forEach(row => {
                    const dataRecebimento = row[dataRecebimentoCol];
                    const dataInicio = row[dataInicioCol];
                    if (dataRecebimento && dataInicio && dataRecebimento.toString().trim() !== '' && dataInicio.toString().trim() !== '') {
                        let dr = null, di = null;
                        // Parse Recebimento
                        if (dataRecebimento.toString().includes('/')) {
                            const [d,m,a] = dataRecebimento.toString().split('/');
                            dr = new Date(a, m-1, d);
                        } else if (dataRecebimento.toString().includes('-')) {
                            dr = new Date(dataRecebimento);
                        } else {
                            dr = new Date(dataRecebimento);
                        }
                        // Parse Início
                        if (dataInicio.toString().includes('/')) {
                            const [d,m,a] = dataInicio.toString().split('/');
                            di = new Date(a, m-1, d);
                        } else if (dataInicio.toString().includes('-')) {
                            di = new Date(dataInicio);
                        } else {
                            di = new Date(dataInicio);
                        }
                        if (!isNaN(dr.getTime()) && !isNaN(di.getTime())) {
                            let diffDays = Math.ceil(Math.abs(di - dr) / (1000*60*60*24));
                            if (diffDays === 0) diffDays = 1; // mesma data conta como 1 dia
                            if (diffDays >= 1 && diffDays <= 365) { totalDias += diffDays; registrosValidos++; }
                        }
                    }
                });
            }
        }
        const tempoMedio = registrosValidos > 0 ? Math.round(totalDias / registrosValidos) : 0;
        const el = document.getElementById('infraStatTempoSalaTecnica');
        if (el) el.textContent = tempoMedio.toString();
        return { tempoMedio, registrosValidos, totalDias };
    } catch (e) {
        console.error('Erro ao calcular tempo médio Sala Técnica:', e);
        const el = document.getElementById('infraStatTempoSalaTecnica');
        if (el) el.textContent = '0';
        return { tempoMedio: 0, registrosValidos: 0, totalDias: 0 };
    }
}

// Novo: Tempo médio Técnicos (DATA INÍCIO → DATA FINAL)
function calculateTempoMedioTecnicos(dadosFiltrados = null) {
    try {
        let totalDias = 0;
        let registrosValidos = 0;
        const dadosParaProcessar = dadosFiltrados || (dynamicTableData && dynamicTableData.data);
        if (dadosParaProcessar && Array.isArray(dadosParaProcessar)) {
            const columnNames = getDynamicTableColumnNames();
            const dataFinalCol = columnNames['DATA FINAL'];
            let dataInicioCol = columnNames['DATA INÍCIO'] || columnNames['DATA INICIO'];
            if (!dataInicioCol && dynamicTableData && Array.isArray(dynamicTableData.headers)) {
                const norm = s => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                dataInicioCol = dynamicTableData.headers.find(h => {
                    const n = norm(h);
                    return n.includes('inicio') && n.includes('data');
                });
            }
            if (dataInicioCol && dataFinalCol) {
                dadosParaProcessar.forEach(row => {
                    const di = parseDateCell(row[dataInicioCol]);
                    const df = parseDateCell(row[dataFinalCol]);
                    if (di && df) {
                        let diffDays = Math.ceil(Math.abs(df - di) / 86400000);
                        // Regra: mesma data conta como 1 dia
                        if (diffDays === 0) diffDays = 1;
                        if (diffDays >= 1 && diffDays <= 365) { totalDias += diffDays; registrosValidos++; }
                    }
                });
            }
        }
        const tempoMedio = registrosValidos > 0 ? Math.round(totalDias / registrosValidos) : 0;
        const el = document.getElementById('infraStatTempoTecnicos');
        if (el) el.textContent = tempoMedio.toString();
        return { tempoMedio, registrosValidos, totalDias };
    } catch (e) {
        console.error('Erro ao calcular tempo médio Técnicos:', e);
        const el = document.getElementById('infraStatTempoTecnicos');
        if (el) el.textContent = '0';
        return { tempoMedio: 0, registrosValidos: 0, totalDias: 0 };
    }
}

// Função para atualizar tabela "Por Status" com dados filtrados
function updateStatusTable(filteredData, columnNames) {
    console.log('📊 Atualizando tabela "Por Status" com dados filtrados...');
    
    try {
        const tableBody = document.getElementById('equipeStatusRankingTableBody');
        if (!tableBody) {
            console.warn('⚠️ Tabela "Por Status" não encontrada');
            return;
        }
        
        // Agrupar dados por equipe e status
        const equipeStatusData = {};
        let totalProdutiva = 0;
        let totalImprodutiva = 0;
        let totalGeral = 0;
        
        filteredData.forEach(row => {
            const equipe = columnNames.EQUIPE && row[columnNames.EQUIPE] ? 
                row[columnNames.EQUIPE].toString().trim() : 'Não definido';
            const status = columnNames.STATUS && row[columnNames.STATUS] ? 
                row[columnNames.STATUS].toString().trim() : '';
            
            if (equipe && equipe !== '' && status && status !== '') {
                if (!equipeStatusData[equipe]) {
                    equipeStatusData[equipe] = {
                        PRODUTIVA: 0,
                        IMPRODUTIVA: 0,
                        total: 0
                    };
                }
                
                // Normalizar status
                const statusNormalizado = status.toUpperCase();
                
                if (statusNormalizado === 'PRODUTIVA') {
                    equipeStatusData[equipe].PRODUTIVA++;
                    totalProdutiva++;
                } else if (statusNormalizado === 'IMPRODUTIVA') {
                    equipeStatusData[equipe].IMPRODUTIVA++;
                    totalImprodutiva++;
                }
                
                equipeStatusData[equipe].total++;
                totalGeral++;
            }
        });
        
        // Calcular percentual de produtividade e ordenar
        const equipesOrdenadas = Object.entries(equipeStatusData)
            .map(([equipe, dados]) => {
                const percentual = dados.total > 0 ? (dados.PRODUTIVA / dados.total) * 100 : 0;
                return {
                    equipe,
                    ...dados,
                    percentual: percentual.toFixed(1)
                };
            })
            .sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual))
            .map((equipe, index) => ({
                ranking: index + 1,
                ...equipe
            }));
        
        // Limpar tabela
        tableBody.innerHTML = '';
        
        // Adicionar linhas das equipes
        equipesOrdenadas.forEach((equipe, index) => {
            const row = document.createElement('tr');
            
            // Adicionar classe para as 3 primeiras posições
            if (index === 0) row.classList.add('gold');
            else if (index === 1) row.classList.add('silver');
            else if (index === 2) row.classList.add('bronze');
            
            const produtividadeClass = getProdutividadeClass(equipe.percentual);
            
            row.innerHTML = `
                <td>${equipe.ranking}</td>
                <td>${equipe.equipe}</td>
                <td class="produtiva">${equipe.PRODUTIVA.toLocaleString()}</td>
                <td class="improdutiva">${equipe.IMPRODUTIVA.toLocaleString()}</td>
                <td class="total"><strong>${equipe.total.toLocaleString()}</strong></td>
                <td>
                    <span class="produtividade-badge ${produtividadeClass}">
                        ${equipe.percentual}%
                    </span>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Atualizar totais
        const totalProdutivaEl = document.getElementById('totalProdutiva');
        const totalImprodutivaEl = document.getElementById('totalImprodutiva');
        const totalStatusGeralEl = document.getElementById('totalStatusGeral');
        const totalProdutividadeEl = document.getElementById('totalProdutividade');
        
        if (totalProdutivaEl) totalProdutivaEl.textContent = totalProdutiva.toLocaleString();
        if (totalImprodutivaEl) totalImprodutivaEl.textContent = totalImprodutiva.toLocaleString();
        if (totalStatusGeralEl) totalStatusGeralEl.textContent = totalGeral.toLocaleString();
        if (totalProdutividadeEl) {
            const percentualTotal = totalGeral > 0 ? ((totalProdutiva / totalGeral) * 100).toFixed(1) : 0;
            totalProdutividadeEl.textContent = percentualTotal + '%';
        }
        
        console.log('✅ Tabela "Por Status" atualizada com dados filtrados');
    } catch (error) {
        console.error('❌ Erro ao atualizar tabela "Por Status":', error);
    }
}

// Função para atualizar tabela "Por Tipo de Ação" com dados filtrados
function updateTipoAcaoTable(filteredData, columnNames) {
    console.log('📊 Atualizando tabela "Por Tipo de Ação" com dados filtrados...');
    
    try {
        const tableBody = document.getElementById('equipeRankingTableBody');
        if (!tableBody) {
            console.warn('⚠️ Tabela "Por Tipo de Ação" não encontrada');
            return;
        }
        
        // Agrupar dados por equipe e tipo de ação
        const equipeData = {};
        let totalAtivacao = 0;
        let totalConstrucao = 0;
        let totalVistoria = 0;
        let totalGeral = 0;
        
        filteredData.forEach(row => {
            const equipe = columnNames.EQUIPE && row[columnNames.EQUIPE] ? 
                row[columnNames.EQUIPE].toString().trim() : 'Não definido';
            const tipoAcao = columnNames['TIPO DE AÇÃO'] && row[columnNames['TIPO DE AÇÃO']] ? 
                row[columnNames['TIPO DE AÇÃO']].toString().trim() : '';
            
            if (equipe && equipe !== '' && tipoAcao && tipoAcao !== '') {
                if (!equipeData[equipe]) {
                    equipeData[equipe] = {
                        ATIVACAO: 0,
                        CONSTRUCAO: 0,
                        VISTORIA: 0,
                        total: 0
                    };
                }
                
                // Normalizar tipo de ação
                const tipoAcaoNormalizado = tipoAcao.toUpperCase();
                
                if (tipoAcaoNormalizado === 'ATIVAÇÃO' || tipoAcaoNormalizado === 'ATIVACAO') {
                    equipeData[equipe].ATIVACAO++;
                    totalAtivacao++;
                } else if (tipoAcaoNormalizado === 'CONSTRUÇÃO' || tipoAcaoNormalizado === 'CONSTRUCAO') {
                    equipeData[equipe].CONSTRUCAO++;
                    totalConstrucao++;
                } else if (tipoAcaoNormalizado === 'VISTORIA') {
                    equipeData[equipe].VISTORIA++;
                    totalVistoria++;
                }
                
                equipeData[equipe].total++;
                totalGeral++;
            }
        });
        
        // Ordenar equipes por total (ranking)
        const equipesOrdenadas = Object.entries(equipeData)
            .sort(([,a], [,b]) => b.total - a.total)
            .map(([equipe, dados], index) => ({
                ranking: index + 1,
                equipe,
                ...dados
            }));
        
        // Limpar tabela
        tableBody.innerHTML = '';
        
        // Adicionar linhas das equipes
        equipesOrdenadas.forEach((equipe, index) => {
            const row = document.createElement('tr');
            
            // Adicionar classe para as 3 primeiras posições
            if (index === 0) row.classList.add('gold');
            else if (index === 1) row.classList.add('silver');
            else if (index === 2) row.classList.add('bronze');
            
            row.innerHTML = `
                <td>${equipe.ranking}</td>
                <td>${equipe.equipe}</td>
                <td>${equipe.ATIVACAO.toLocaleString()}</td>
                <td>${equipe.CONSTRUCAO.toLocaleString()}</td>
                <td>${equipe.VISTORIA.toLocaleString()}</td>
                <td><strong>${equipe.total.toLocaleString()}</strong></td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Atualizar totais
        const totalAtivacaoEl = document.getElementById('totalAtivacao');
        const totalConstrucaoEl = document.getElementById('totalConstrucao');
        const totalVistoriaEl = document.getElementById('totalVistoria');
        const totalGeralEl = document.getElementById('totalGeral');
        
        if (totalAtivacaoEl) totalAtivacaoEl.textContent = totalAtivacao.toLocaleString();
        if (totalConstrucaoEl) totalConstrucaoEl.textContent = totalConstrucao.toLocaleString();
        if (totalVistoriaEl) totalVistoriaEl.textContent = totalVistoria.toLocaleString();
        if (totalGeralEl) totalGeralEl.textContent = totalGeral.toLocaleString();
        
        console.log('✅ Tabela "Por Tipo de Ação" atualizada com dados filtrados');
    } catch (error) {
        console.error('❌ Erro ao atualizar tabela "Por Tipo de Ação":', error);
    }
}

// ========== FUNÇÕES DO SISTEMA DINÂMICO ==========

// Processar upload e gerar tabela dinâmica
function processDynamicUpload(file) {
    console.log('🔄 Processando upload para tabela dinâmica...');
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const fileContent = e.target.result;
                let data = [];
                let headers = [];
                
                // Detectar tipo de arquivo e processar
                if (file.name.toLowerCase().endsWith('.csv')) {
                    console.log('📄 Processando arquivo CSV...');
                    
                    // Melhorar parsing de CSV para lidar com vírgulas dentro de aspas
                    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
                    
                    if (lines.length === 0) {
                        throw new Error('Arquivo CSV vazio');
                    }
                    
                    // Usar regex para dividir por vírgulas, mas respeitar aspas
                    const parseCSVLine = (line) => {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        
                        result.push(current.trim());
                        return result;
                    };
                    
                    headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
                    console.log('📋 Headers detectados:', headers);
                    
                    data = lines.slice(1).map((line, index) => {
                        const values = parseCSVLine(line);
                        const row = { id: index + 1 };
                        
                        headers.forEach((header, i) => {
                            row[header] = (values[i] || '').replace(/"/g, '').trim();
                        });
                        
                        return row;
                    }).filter(row => {
                        // Filtrar linhas vazias
                        const hasData = Object.values(row).some(val => val !== '' && val !== undefined);
                        if (!hasData) {
                            console.log('⚠️ Linha vazia removida:', row);
                        }
                        return hasData;
                    });
                    
                } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                    console.log('📊 Processando arquivo Excel...');
                    
                    // Para Excel, usar a função existente e adaptar
                    const workbook = XLSX.read(fileContent, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length === 0) {
                        throw new Error('Arquivo Excel vazio');
                    }
                    
                    headers = jsonData[0].map(h => (h || '').toString().trim());
                    console.log('📋 Headers detectados:', headers);
                    
                    data = jsonData.slice(1).map((row, index) => {
                        const newRow = { id: index + 1 };
                        headers.forEach((header, i) => {
                            newRow[header] = (row[i] || '').toString().trim();
                        });
                        return newRow;
                    }).filter(row => {
                        // Filtrar linhas vazias
                        const hasData = Object.values(row).some(val => val !== '' && val !== undefined);
                        if (!hasData) {
                            console.log('⚠️ Linha vazia removida:', row);
                        }
                        return hasData;
                    });
                }
                
                // Normalizar headers para evitar duplicatas
                const normalizedHeaders = normalizeHeaders(headers);
                
                // Verificar se os dados estão sendo mapeados corretamente
                console.log('🔍 Verificando mapeamento de dados...');
                if (data.length > 0) {
                    console.log('📊 Primeira linha de dados:', data[0]);
                    console.log('📋 Headers originais:', headers);
                    console.log('📋 Headers normalizados:', normalizedHeaders);
                    
                    // Verificar se há discrepância entre headers e dados
                    const firstRowKeys = Object.keys(data[0]).filter(key => key !== 'id');
                    if (firstRowKeys.length !== headers.length) {
                        console.warn('⚠️ Discrepância entre headers e dados:', {
                            headersCount: headers.length,
                            dataKeysCount: firstRowKeys.length,
                            headers: headers,
                            dataKeys: firstRowKeys
                        });
                    }
                }
                
                // Atualizar dados dinâmicos
                dynamicTableData.headers = normalizedHeaders;
                dynamicTableData.data = data;
                dynamicTableData.metadata = {
                    lastUpload: new Date().toISOString(),
                    totalRecords: data.length,
                    source: 'upload',
                    tableStructure: 'dynamic'
                };
                
                // Resetar configurações
                dynamicTableConfig.currentPage = 1;
                dynamicTableConfig.filters = {};
                dynamicTableConfig.searchTerm = '';
                
                console.log('✅ Upload processado:', {
                    headers: headers.length,
                    data: data.length,
                    headers: headers
                });
                
                // Renderizar tabela dinâmica
                renderDynamicTable();
                saveDynamicData();
                
                // Integrar com o sistema existente
                integrateDynamicData();
                
                // Sincronizar tipos de ação da planilha com a gestão
                setTimeout(() => {
                    console.log('🔄 Sincronizando tipos de ação após upload...');
                    if (typeof window.forcarSincronizacaoTiposAcaoGestao === 'function') {
                        window.forcarSincronizacaoTiposAcaoGestao();
                    }
                }, 1000);
                
                // Debug: Mostrar dados brutos para verificação
                console.log('🔍 DEBUG - Dados completos processados:');
                console.log('Headers:', headers);
                console.log('Primeira linha de dados:', data[0]);
                console.log('Segunda linha de dados:', data[1]);
                
                // Verificar se há problemas de mapeamento
                if (data.length > 0) {
                    const firstRow = data[0];
                    const rowKeys = Object.keys(firstRow).filter(key => key !== 'id');
                    
                    console.log('🔍 Verificação de mapeamento:');
                    console.log('Headers encontrados:', headers);
                    console.log('Chaves da primeira linha:', rowKeys);
                    
                    // Verificar se todos os headers têm dados correspondentes
                    headers.forEach((header, index) => {
                        const value = firstRow[header];
                        console.log(`Header "${header}" (índice ${index}): "${value}"`);
                    });
                }
                
                // Forçar atualização dos cards após um pequeno delay
                setTimeout(() => {
                    console.log('🔄 Forçando atualização dos cards...');
                    updateDynamicStatsCards();
                }, 500);
                
                resolve({ headers, data });
                
            } catch (error) {
                console.error('❌ Erro no processamento:', error);
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Erro ao ler arquivo'));
        };
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    });
}

// Renderizar tabela dinâmica
function renderDynamicTable() {
    console.log('📊 Renderizando tabela dinâmica...');
    
    const tableContainer = document.getElementById('enderecosTable');
    if (!tableContainer) {
        console.error('❌ Container da tabela não encontrado');
        return;
    }
    
    if (dynamicTableData.data.length === 0) {
        tableContainer.innerHTML = `
            <div class="empty-state">
                <h3>📁 Nenhum dado encontrado</h3>
                <p>Faça upload de um arquivo para começar</p>
                <button onclick="openUploadModal()" class="btn-primary">📤 Fazer Upload</button>
            </div>
        `;
        return;
    }
    
    // Aplicar filtros e busca
    let filteredData = applyDynamicFilters(dynamicTableData.data);
    
    // Aplicar paginação
    const totalPages = Math.ceil(filteredData.length / dynamicTableConfig.itemsPerPage);
    
    // Garantir que a página atual seja válida
    if (dynamicTableConfig.currentPage > totalPages && totalPages > 0) {
        dynamicTableConfig.currentPage = totalPages;
    }
    if (dynamicTableConfig.currentPage < 1) {
        dynamicTableConfig.currentPage = 1;
    }
    
    const startIndex = (dynamicTableConfig.currentPage - 1) * dynamicTableConfig.itemsPerPage;
    const endIndex = startIndex + dynamicTableConfig.itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    console.log('📊 Paginação:', {
        totalData: dynamicTableData.data.length,
        filteredData: filteredData.length,
        totalPages: totalPages,
        currentPage: dynamicTableConfig.currentPage,
        startIndex: startIndex,
        endIndex: endIndex,
        paginatedData: paginatedData.length
    });
    
    // Gerar cabeçalhos
    const displayHeaders = getDisplayHeaders();
    const headersHtml = displayHeaders.map(header => 
        `<th onclick="sortDynamicTable('${header}')" class="sortable-header">
            ${header}
            ${dynamicTableConfig.sortColumn === header ? 
                (dynamicTableConfig.sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
        </th>`
    ).join('');
    
    // Gerar linhas
    const rowsHtml = paginatedData.map((row, rowIndex) => {
        const displayHeaders = getDisplayHeaders();
        
        // Log para debug da primeira linha
        if (rowIndex === 0) {
            console.log('🔍 Debug primeira linha:', {
                row: row,
                displayHeaders: displayHeaders,
                rowKeys: Object.keys(row)
            });
        }
        
        const cellsHtml = displayHeaders.map(header => {
            const value = row[header] || '';
            
            // Log para debug se o valor estiver vazio mas deveria ter dados
            if (rowIndex === 0 && value === '' && row[Object.keys(row).find(key => key !== 'id')]) {
                console.warn('⚠️ Valor vazio para header:', header, 'Row data:', row);
            }
            
            return `<td>${value}</td>`;
        }).join('');
        
        return `
            <tr>
                <td>${row.id}</td>
                ${cellsHtml}
                <td class="actions-cell">
                    <button class="btn-action btn-edit" onclick="editDynamicRow(${row.id})" title="Editar">✏️</button>
                    <button class="btn-action btn-delete" onclick="deleteDynamicRow(${row.id})" title="Deletar">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Gerar paginação
    const paginationHtml = generateDynamicPagination(totalPages);
    
    // Montar tabela completa
    tableContainer.innerHTML = `
        <table class="crud-table">
            <thead>
                <tr>
                    <th>ID</th>
                    ${headersHtml}
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody id="dynamicTableBody">
                ${rowsHtml}
            </tbody>
        </table>
        ${paginationHtml}
        <div class="table-controls">
            <div class="table-info">
                Mostrando ${startIndex + 1} a ${Math.min(endIndex, filteredData.length)} de ${filteredData.length} registros
            </div>
            <div class="table-actions">
                <select onchange="setDynamicItemsPerPage(parseInt(this.value))" class="items-per-page-select">
                    <option value="10" ${dynamicTableConfig.itemsPerPage === 10 ? 'selected' : ''}>10 por página</option>
                    <option value="20" ${dynamicTableConfig.itemsPerPage === 20 ? 'selected' : ''}>20 por página</option>
                    <option value="50" ${dynamicTableConfig.itemsPerPage === 50 ? 'selected' : ''}>50 por página</option>
                    <option value="100" ${dynamicTableConfig.itemsPerPage === 100 ? 'selected' : ''}>100 por página</option>
                </select>
                <button onclick="resetDynamicPagination()" class="btn-secondary btn-sm">
                    🔄 Resetar
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ Tabela dinâmica renderizada');
}
// Aplicar filtros dinâmicos
function applyDynamicFilters(data) {
    let filtered = [...data];
    
    // Aplicar busca geral
    if (dynamicTableConfig.searchTerm) {
        const searchTerm = dynamicTableConfig.searchTerm.toLowerCase();
        filtered = filtered.filter(row => 
            Object.values(row).some(value => 
                value.toString().toLowerCase().includes(searchTerm)
            )
        );
    }
    
    // Aplicar filtros específicos
    Object.keys(dynamicTableConfig.filters).forEach(column => {
        const filterValue = dynamicTableConfig.filters[column];
        if (filterValue) {
            filtered = filtered.filter(row => 
                row[column] && row[column].toString().toLowerCase().includes(filterValue.toLowerCase())
            );
        }
    });
    
    // Aplicar ordenação
    if (dynamicTableConfig.sortColumn) {
        filtered.sort((a, b) => {
            const aVal = a[dynamicTableConfig.sortColumn] || '';
            const bVal = b[dynamicTableConfig.sortColumn] || '';
            
            if (dynamicTableConfig.sortDirection === 'asc') {
                return aVal.toString().localeCompare(bVal.toString());
            } else {
                return bVal.toString().localeCompare(aVal.toString());
            }
        });
    }
    
    // Atualizar integração com dados filtrados
    if (filtered.length !== data.length) {
        setTimeout(() => integrateDynamicData(), 100);
    }
    
    return filtered;
}
// Gerar paginação dinâmica
function generateDynamicPagination(totalPages) {
    if (totalPages <= 1) return '';
    
    const currentPage = dynamicTableConfig.currentPage;
    const pages = [];
    
    console.log('📄 Gerando paginação:', { currentPage, totalPages });
    
    // Mostrar no máximo 5 páginas
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Ajustar se estamos no início
    if (currentPage <= 3) {
        endPage = Math.min(totalPages, 5);
    }
    
    // Ajustar se estamos no final
    if (currentPage >= totalPages - 2) {
        startPage = Math.max(1, totalPages - 4);
    }
    
    // Adicionar primeira página se não estiver visível
    if (startPage > 1) {
        pages.push(`<button type="button" onclick="changeDynamicPage(1)" class="pagination-button">1</button>`);
        if (startPage > 2) {
            pages.push(`<span class="pagination-ellipsis">...</span>`);
        }
    }
    
    // Páginas principais
    for (let i = startPage; i <= endPage; i++) {
        if (i === currentPage) {
            pages.push(`<button type="button" class="pagination-button active">${i}</button>`);
        } else {
            pages.push(`<button type="button" onclick="changeDynamicPage(${i})" class="pagination-button">${i}</button>`);
        }
    }
    
    // Adicionar última página se não estiver visível
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pages.push(`<span class="pagination-ellipsis">...</span>`);
        }
        pages.push(`<button type="button" onclick="changeDynamicPage(${totalPages})" class="pagination-button">${totalPages}</button>`);
    }
    
    const paginationHtml = `
        <div class="pagination">
            <button type="button" onclick="changeDynamicPage(${currentPage - 1})" 
                    class="pagination-button" 
                    ${currentPage <= 1 ? 'disabled' : ''}>
                ← Anterior
            </button>
            ${pages.join('')}
            <button type="button" onclick="changeDynamicPage(${currentPage + 1})" 
                    class="pagination-button" 
                    ${currentPage >= totalPages ? 'disabled' : ''}>
                Próxima →
            </button>
        </div>
    `;
    
    console.log('📄 HTML da paginação gerado:', paginationHtml);
    return paginationHtml;
}
// Mudar página dinâmica
function changeDynamicPage(newPage) {
    console.log('🔄 Mudando para página:', newPage);
    
    try {
        // Verificações básicas
        if (!dynamicTableData || !dynamicTableData.data || !Array.isArray(dynamicTableData.data)) {
            console.error('❌ Dados da tabela não estão disponíveis');
            alert('Erro: Dados da tabela não estão disponíveis');
            return;
        }
        
        if (!dynamicTableConfig) {
            console.error('❌ Configuração da tabela não está disponível');
            alert('Erro: Configuração da tabela não está disponível');
            return;
        }
        
        // Aplicar filtros para obter dados filtrados
        let filteredData = [];
        
        try {
            if (typeof applyDynamicFilters === 'function') {
                filteredData = applyDynamicFilters(dynamicTableData.data);
            } else {
                // Se a função não existe, usar dados originais
                filteredData = dynamicTableData.data;
            }
        } catch (filterError) {
            console.warn('⚠️ Erro ao aplicar filtros, usando dados originais:', filterError);
            filteredData = dynamicTableData.data;
        }
        
        if (!Array.isArray(filteredData)) {
            console.error('❌ Dados filtrados não são válidos');
            alert('Erro: Dados filtrados não são válidos');
            return;
        }
        
        const totalPages = Math.ceil(filteredData.length / dynamicTableConfig.itemsPerPage);
        
        console.log('📊 Total de páginas:', totalPages, 'Dados filtrados:', filteredData.length);
        
        if (newPage >= 1 && newPage <= totalPages) {
            dynamicTableConfig.currentPage = newPage;
            console.log('✅ Página alterada para:', newPage);
            
            // Salvar configuração
            try {
                if (typeof saveDynamicData === 'function') {
                    saveDynamicData();
                } else {
                    localStorage.setItem('dynamicTableConfig', JSON.stringify(dynamicTableConfig));
                }
            } catch (saveError) {
                console.warn('⚠️ Erro ao salvar configuração:', saveError);
            }
            
            // Re-renderizar tabela
            try {
                if (typeof renderDynamicTable === 'function') {
                    renderDynamicTable();
                } else {
                    console.error('❌ Função renderDynamicTable não está definida');
                    alert('Erro: Função de renderização não está disponível');
                    return;
                }
            } catch (renderError) {
                console.error('❌ Erro ao renderizar tabela:', renderError);
                alert('Erro ao renderizar tabela: ' + renderError.message);
                return;
            }
            
            // Scroll para o topo da tabela
            try {
                const tableContainer = document.querySelector('.crud-table-container');
                if (tableContainer) {
                    tableContainer.scrollTop = 0;
                }
            } catch (scrollError) {
                console.warn('⚠️ Erro ao fazer scroll:', scrollError);
            }
            
            // Mostrar notificação de sucesso
            try {
                if (typeof showSuccess === 'function') {
                    showSuccess('Página alterada!', `Página ${newPage} de ${totalPages} carregada`);
                } else {
                    console.log('✅ Página alterada com sucesso!');
                }
            } catch (notificationError) {
                console.warn('⚠️ Erro ao mostrar notificação:', notificationError);
            }
            
        } else {
            console.warn('⚠️ Página inválida:', newPage, 'Total de páginas:', totalPages);
            try {
                if (typeof showError === 'function') {
                    showError('Página inválida', `A página ${newPage} não existe. Total de páginas: ${totalPages}`);
                } else {
                    alert(`Página inválida: ${newPage}. Total de páginas: ${totalPages}`);
                }
            } catch (errorNotificationError) {
                console.warn('⚠️ Erro ao mostrar notificação de erro:', errorNotificationError);
            }
        }
    } catch (error) {
        console.error('❌ Erro ao mudar página:', error);
        console.error('❌ Stack trace:', error.stack);
        
        try {
            if (typeof showError === 'function') {
                showError('Erro na paginação', `Ocorreu um erro ao mudar de página: ${error.message}`);
            } else {
                alert(`Erro na paginação: ${error.message}`);
            }
        } catch (finalError) {
            console.error('❌ Erro crítico ao mostrar erro:', finalError);
            alert('Erro crítico na paginação. Verifique o console para mais detalhes.');
        }
    }
}

// Ordenar tabela dinâmica
function sortDynamicTable(column) {
    if (dynamicTableConfig.sortColumn === column) {
        dynamicTableConfig.sortDirection = dynamicTableConfig.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        dynamicTableConfig.sortColumn = column;
        dynamicTableConfig.sortDirection = 'asc';
    }
    
    renderDynamicTable();
}

// Buscar na tabela dinâmica
function searchDynamicTable(searchTerm) {
    console.log('🔍 Buscando:', searchTerm);
    dynamicTableConfig.searchTerm = searchTerm;
    dynamicTableConfig.currentPage = 1; // Resetar para primeira página
    renderDynamicTable();
}

// Resetar paginação
function resetDynamicPagination() {
    dynamicTableConfig.currentPage = 1;
    dynamicTableConfig.searchTerm = '';
    dynamicTableConfig.filters = {};
    dynamicTableConfig.sortColumn = null;
    dynamicTableConfig.sortDirection = 'asc';
    saveDynamicData();
    renderDynamicTable();
}

// Configurar itens por página
function setDynamicItemsPerPage(itemsPerPage) {
    dynamicTableConfig.itemsPerPage = itemsPerPage;
    dynamicTableConfig.currentPage = 1; // Resetar para primeira página
    saveDynamicData();
    renderDynamicTable();
}

// Gerar formulário dinâmico
function generateDynamicForm() {
    console.log('📝 Gerando formulário dinâmico...');
    
    const formContainer = document.getElementById('crudModal');
    if (!formContainer) return;
    
    const displayHeaders = getDisplayHeaders();
    const formFields = displayHeaders.map(header => `
        <div class="form-group">
            <label for="dynamic_${header}">${header}</label>
            <input type="text" id="dynamic_${header}" name="${header}" 
                   placeholder="${header}" class="form-control">
        </div>
    `).join('');
    
    const formHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Novo Registro</h3>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <form id="dynamicForm" class="modal-form">
                <div class="form-grid">
                    ${formFields}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary" id="submitBtn">Salvar</button>
                </div>
            </form>
        </div>
    `;
    
    formContainer.innerHTML = formHtml;
    
    // Configurar submit do formulário
    const form = document.getElementById('dynamicForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            handleDynamicFormSubmit();
        };
    }
    
    console.log('✅ Formulário dinâmico gerado');
}

// Manipular submit do formulário dinâmico
function handleDynamicFormSubmit() {
    const form = document.getElementById('dynamicForm');
    const formData = new FormData(form);
    const data = {};
    
    // Converter FormData para objeto
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    if (currentEditId) {
        updateDynamicRow(currentEditId, data);
    } else {
        addDynamicRow(data);
    }
    
    closeModal();
}

// Adicionar nova linha dinâmica
function addDynamicRow(data) {
    const newId = Math.max(...dynamicTableData.data.map(row => row.id), 0) + 1;
    const newRow = {
        id: newId,
        ...data
    };
    
    dynamicTableData.data.push(newRow);
    dynamicTableData.metadata.totalRecords = dynamicTableData.data.length;
    
    saveDynamicData();
    renderDynamicTable();
    
    // Atualizar integração
    integrateDynamicData();
    
    console.log('✅ Nova linha adicionada:', newRow);
    showSuccess('Registro Adicionado', 'Novo registro criado com sucesso');
}

// Editar linha dinâmica
function editDynamicRow(id) {
    const row = dynamicTableData.data.find(r => r.id == id);
    if (!row) return;
    
    currentEditId = id;
    
    // Preencher formulário
    const displayHeaders = getDisplayHeaders();
    displayHeaders.forEach(header => {
        const input = document.getElementById(`dynamic_${header}`);
        if (input) {
            input.value = row[header] || '';
        }
    });
    
    // Atualizar título do modal
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Registro';
    }
    
    openModal();
}

// Atualizar linha dinâmica
function updateDynamicRow(id, data) {
    const index = dynamicTableData.data.findIndex(r => r.id == id);
    if (index === -1) return;
    
    dynamicTableData.data[index] = {
        ...dynamicTableData.data[index],
        ...data
    };
    
    saveDynamicData();
    renderDynamicTable();
    
    // Atualizar integração
    integrateDynamicData();
    
    console.log('✅ Linha atualizada:', dynamicTableData.data[index]);
    showSuccess('Registro Atualizado', 'Registro modificado com sucesso');
}

// Deletar linha dinâmica
function deleteDynamicRow(id) {
    showConfirm(
        'Deletar Registro?',
        'Tem certeza que deseja deletar este registro?',
        () => {
            const index = dynamicTableData.data.findIndex(r => r.id == id);
            if (index !== -1) {
                dynamicTableData.data.splice(index, 1);
                dynamicTableData.metadata.totalRecords = dynamicTableData.data.length;
                
                saveDynamicData();
                renderDynamicTable();
                
                // Atualizar integração
                integrateDynamicData();
                
                console.log('✅ Linha deletada');
                showSuccess('Registro Deletado', 'Registro removido com sucesso');
            }
        },
        null
    );
}

// Salvar dados dinâmicos
function saveDynamicData() {
    localStorage.setItem('dynamicTableData', JSON.stringify(dynamicTableData));
    localStorage.setItem('dynamicTableConfig', JSON.stringify(dynamicTableConfig));
    console.log('💾 Dados dinâmicos salvos');
    
    // Atualizar gráficos automaticamente (usando setTimeout para garantir que as funções estejam carregadas)
    setTimeout(() => {
        if (typeof updateProjetosChart === 'function') updateProjetosChart();
        if (typeof updateSubProjetosChart === 'function') updateSubProjetosChart();
        if (typeof updateCidadesChart === 'function') updateCidadesChart();
        if (typeof updateHpProjetosChart === 'function') updateHpProjetosChart();
        if (typeof updateSupervisorStatusChart === 'function') updateSupervisorStatusChart();
        if (typeof renderEquipeRanking === 'function') renderEquipeRanking();
        if (typeof renderEquipeStatusRanking === 'function') renderEquipeStatusRanking();
    }, 100);
}

// Carregar dados dinâmicos
function loadDynamicData() {
    const savedData = localStorage.getItem('dynamicTableData');
    const savedConfig = localStorage.getItem('dynamicTableConfig');
    
    if (savedData) {
        dynamicTableData = JSON.parse(savedData);
        console.log('📂 Dados dinâmicos carregados:', dynamicTableData.metadata);
    }
    
    if (savedConfig) {
        dynamicTableConfig = JSON.parse(savedConfig);
    }
}

// Função para normalizar headers e evitar duplicatas
function normalizeHeaders(headers) {
    const normalized = [];
    const seen = new Set();
    
    headers.forEach(header => {
        const normalizedHeader = header.trim();
        const lowerHeader = normalizedHeader.toLowerCase();
        
        // Se é ID, usar apenas uma vez
        if (lowerHeader === 'id' && !seen.has('id')) {
            normalized.push(normalizedHeader);
            seen.add('id');
        } else if (lowerHeader !== 'id') {
            // Para outros headers, evitar duplicatas case-insensitive
            if (!seen.has(lowerHeader)) {
                normalized.push(normalizedHeader);
                seen.add(lowerHeader);
            }
        }
    });
    
    return normalized;
}

// Função para obter headers sem ID (para exibição)
function getDisplayHeaders() {
    return dynamicTableData.headers.filter(header => 
        header.toLowerCase() !== 'id'
    );
}

// ========== INTEGRAÇÃO COM SISTEMA EXISTENTE ==========

// Calcular estatísticas dos dados dinâmicos
function calculateDynamicStats() {
    console.log('📊 Calculando estatísticas dinâmicas...');
    
    // Combinar dados de endereços com dados dinâmicos
    let totalRegistros = enderecosData.length;
    let enderecosDistintos = new Set(enderecosData.map(e => e.endereco).filter(Boolean));
    let equipesDistintas = new Set(enderecosData.map(e => e.equipe).filter(Boolean));
    let projetos = new Set(enderecosData.map(e => e.projeto).filter(Boolean));
    let supervisores = new Set(enderecosData.map(e => e.supervisor).filter(Boolean));
    let cidades = new Set(enderecosData.map(e => e.cidade).filter(Boolean));
    let tiposAcao = new Set(enderecosData.map(e => e.tipoAcao).filter(Boolean));
    let statusProdutivo = new Set();
    
    // Contar registros produtivos dos endereços
    enderecosData.forEach(endereco => {
        if ((endereco.status || '').toLowerCase() === 'produtiva') {
            statusProdutivo.add(endereco.id);
        }
    });
    
    // Adicionar dados da tabela dinâmica se disponível
    if (dynamicTableData.data.length > 0) {
        console.log('🔄 Incluindo dados dinâmicos nas estatísticas...');
        
        const data = dynamicTableData.data;
        totalRegistros += data.length;
        
        console.log('📋 Headers disponíveis:', dynamicTableData.headers);
    
        // Mapear todos os campos disponíveis para encontrar correspondências
        const availableFields = dynamicTableData.headers;
        
        data.forEach((row, index) => {
            if (index === 0) {
                console.log('🔍 Primeira linha para análise:', row);
                console.log('🔍 Chaves disponíveis na primeira linha:', Object.keys(row));
            }
            
            // Verificar todos os campos disponíveis para encontrar correspondências
            Object.keys(row).forEach(field => {
                const fieldLower = field.toLowerCase();
                const value = row[field]?.toString().trim();
                
                if (!value || value === '') return;
                
                // Detectar endereços
                if (fieldLower.includes('endereco') || fieldLower.includes('address') || fieldLower.includes('node')) {
                    enderecosDistintos.add(value);
                    if (index === 0) console.log(`📍 Endereço encontrado em "${field}":`, value);
                }
                
                // Detectar equipes
                if (fieldLower.includes('equipe') || fieldLower.includes('team')) {
                    equipesDistintas.add(value);
                    if (index === 0) console.log(`👥 Equipe encontrada em "${field}":`, value);
                }
                
                // Detectar projetos
                if (fieldLower.includes('projeto') || fieldLower.includes('project')) {
                    projetos.add(value);
                    if (index === 0) console.log(`📋 Projeto encontrado em "${field}":`, value);
                }
                
                // Detectar supervisores
                if (fieldLower.includes('supervisor')) {
                    supervisores.add(value);
                    if (index === 0) console.log(`👨‍💼 Supervisor encontrado em "${field}":`, value);
                }
                
                // Detectar cidades
                if (fieldLower.includes('cidade') || fieldLower.includes('city')) {
                    cidades.add(value);
                    if (index === 0) console.log(`🏙️ Cidade encontrada em "${field}":`, value);
                }
                
                // Detectar tipos de ação
                if (fieldLower.includes('tipo') || fieldLower.includes('acao') || fieldLower.includes('action')) {
                    tiposAcao.add(value);
                    if (index === 0) console.log(`⚡ Tipo de ação encontrado em "${field}":`, value);
                }
                
                // Detectar status produtivo
                if (fieldLower.includes('status')) {
                    const statusValue = value.toLowerCase();
                    if (statusValue.includes('produtiv') || statusValue.includes('concluido') || 
                        statusValue.includes('finalizado') || statusValue.includes('s') || 
                        statusValue.includes('ativo') || statusValue.includes('concluido')) {
                        statusProdutivo.add(row.id || index);
                        if (index === 0) console.log(`✅ Status produtivo encontrado em "${field}":`, value);
                    }
                }
            });
        });
    }
    
    const produtividade = totalRegistros > 0 ? Math.round((statusProdutivo.size / totalRegistros) * 100) : 0;
    
    const stats = {
        totalRegistros,
        enderecosDistintos: enderecosDistintos.size,
        equipesDistintas: equipesDistintas.size,
        produtividade,
        projetos: Array.from(projetos),
        supervisores: Array.from(supervisores),
        cidades: Array.from(cidades),
        tiposAcao: Array.from(tiposAcao),
        enderecos: Array.from(enderecosDistintos),
        equipes: Array.from(equipesDistintas)
    };
    
    console.log('📊 Estatísticas calculadas:', stats);
    return stats;
}

// Atualizar cards de estatísticas com dados dinâmicos
function updateDynamicStatsCards() {
    console.log('🎯 Atualizando cards de estatísticas...');
    const stats = calculateDynamicStats();
    
    // Buscar elementos dos cards com diferentes seletores
    const totalElement = document.getElementById('statTotalRegistros') || 
                        document.getElementById('statTotal') || 
                        document.querySelector('.endereco-stat-card.blue .stat-value');
    
    const enderecosElement = document.getElementById('statEnderecosDistintos') || 
                            document.getElementById('statEnderecos') || 
                            document.querySelector('.endereco-stat-card.green .stat-value');
    
    const equipesElement = document.getElementById('statEquipesDistintas') || 
                          document.getElementById('statEquipes') || 
                          document.querySelector('.endereco-stat-card.orange .stat-value');
    
    const produtividadeElement = document.getElementById('statProdutividade') || 
                                document.querySelector('.endereco-stat-card.purple .stat-value');
    
    // Log dos elementos encontrados
    console.log('🔍 Elementos dos cards encontrados:', {
        total: !!totalElement,
        enderecos: !!enderecosElement,
        equipes: !!equipesElement,
        produtividade: !!produtividadeElement
    });
    
    // Atualizar valores
    if (totalElement) {
        totalElement.textContent = stats.totalRegistros;
        console.log('✅ Total atualizado:', stats.totalRegistros);
    } else {
        console.warn('⚠️ Elemento total não encontrado');
    }
    
    if (enderecosElement) {
        enderecosElement.textContent = stats.enderecosDistintos;
        console.log('✅ Endereços atualizados:', stats.enderecosDistintos);
    } else {
        console.warn('⚠️ Elemento endereços não encontrado');
    }
    
    if (equipesElement) {
        equipesElement.textContent = stats.equipesDistintas;
        console.log('✅ Equipes atualizadas:', stats.equipesDistintas);
    } else {
        console.warn('⚠️ Elemento equipes não encontrado');
    }
    
    if (produtividadeElement) {
        produtividadeElement.textContent = stats.produtividade + '%';
        console.log('✅ Produtividade atualizada:', stats.produtividade + '%');
    } else {
        console.warn('⚠️ Elemento produtividade não encontrado');
    }
    
    console.log('📊 Cards atualizados com dados dinâmicos:', stats);
}

// Atualizar filtros com dados dinâmicos
function updateDynamicFilters() {
    const stats = calculateDynamicStats();
    
    // Atualizar filtros de projeto
    const projetoFilter = document.getElementById('filterProjeto');
    if (projetoFilter && stats.projetos.length > 0) {
        projetoFilter.innerHTML = '<option value="">Todos os Projetos</option>' +
            stats.projetos.map(projeto => 
                `<option value="${projeto}">${projeto}</option>`
            ).join('');
    }
    
    // Atualizar filtros de supervisor
    const supervisorFilter = document.getElementById('filterSupervisor');
    if (supervisorFilter && stats.supervisores.length > 0) {
        supervisorFilter.innerHTML = '<option value="">Todos os Supervisores</option>' +
            stats.supervisores.map(supervisor => 
                `<option value="${supervisor}">${supervisor}</option>`
            ).join('');
    }
    
    // Atualizar filtros de cidade
    const cidadeFilter = document.getElementById('filterCidade');
    if (cidadeFilter && stats.cidades.length > 0) {
        cidadeFilter.innerHTML = '<option value="">Todas as Cidades</option>' +
            stats.cidades.map(cidade => 
                `<option value="${cidade}">${cidade}</option>`
            ).join('');
    }
    
    // Atualizar filtros de equipe
    const equipeFilter = document.getElementById('filterEquipe');
    if (equipeFilter && stats.equipes.length > 0) {
        equipeFilter.innerHTML = '<option value="">Todas as Equipes</option>' +
            stats.equipes.map(equipe => 
                `<option value="${equipe}">${equipe}</option>`
            ).join('');
    }
    
    // Atualizar filtros de tipo de ação
    const tipoAcaoFilter = document.getElementById('filterTipoAcao');
    if (tipoAcaoFilter && stats.tiposAcao.length > 0) {
        tipoAcaoFilter.innerHTML = '<option value="">Todos os Tipos</option>' +
            stats.tiposAcao.map(tipo => 
                `<option value="${tipo}">${tipo}</option>`
            ).join('');
    }
    
    console.log('🔍 Filtros atualizados com dados dinâmicos');
}

// Atualizar gráficos com dados dinâmicos
function updateDynamicCharts() {
    const stats = calculateDynamicStats();
    
    // Atualizar gráfico de projetos
    if (stats.projetos.length > 0) {
        const projetosData = stats.projetos.map(projeto => {
            const count = dynamicTableData.data.filter(row => {
                const projetoFields = ['projeto', 'Projeto', 'PROJETO', 'project', 'Project'];
                return projetoFields.some(field => row[field] === projeto);
            }).length;
            return { nome: projeto, quantidade: count };
        });
        
        // Atualizar gráfico se existir
        updateProjetosChartWithData(projetosData);
    }
    
    // Atualizar gráfico de supervisores
    if (stats.supervisores.length > 0) {
        const supervisoresData = stats.supervisores.map(supervisor => {
            const count = dynamicTableData.data.filter(row => {
                const supervisorFields = ['supervisor', 'Supervisor', 'SUPERVISOR'];
                return supervisorFields.some(field => row[field] === supervisor);
            }).length;
            return { nome: supervisor, quantidade: count };
        });
        
        // Atualizar gráfico se existir
        updateSupervisoresChartWithData(supervisoresData);
    }
    
    console.log('📈 Gráficos atualizados com dados dinâmicos');
}
// Atualizar gráfico de projetos (versão com dados)
function updateProjetosChartWithData(projetosData) {
    const ctx = document.getElementById('quantidadeProjetosBarChart');
    if (!ctx) return;
    
    const labels = projetosData.map(p => p.nome);
    const data = projetosData.map(p => p.quantidade);
    const total = data.reduce((sum, val) => sum + val, 0);
    const percentages = data.map(val => total > 0 ? Math.round((val / total) * 100) : 0);
    
    // Destruir gráfico existente se houver
    if (allCharts.quantidadeProjetos) {
        allCharts.quantidadeProjetos.destroy();
    }
    
    // Criar novo gráfico
    allCharts.quantidadeProjetos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Quantidade',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false
                }
            }
        }
    });
}

// Atualizar gráfico de supervisores (versão com dados)
function updateSupervisoresChartWithData(supervisoresData) {
    const ctx = document.getElementById('enderecosPorSupervisorBarChart');
    if (!ctx) return;
    
    const labels = supervisoresData.map(s => s.nome);
    const data = supervisoresData.map(s => s.quantidade);
    
    // Destruir gráfico existente se houver
    if (allCharts.enderecosPorSupervisor) {
        allCharts.enderecosPorSupervisor.destroy();
    }
    
    // Criar novo gráfico
    allCharts.enderecosPorSupervisor = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Endereços por Supervisor',
                data: data,
                backgroundColor: 'rgba(30, 64, 175, 0.8)',
                borderColor: '#1E40AF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: false
                }
            }
        }
    });
}

// Atualizar gráfico de sub projetos (versão sem parâmetros)
function updateSubProjetosChart() {
    console.log('🔄 Atualizando gráfico de sub projetos...');
    createSubProjetosCombinedChart();
}

// Atualizar gráfico de sub projetos (versão com dados)
function updateSubProjetosChartWithData(subProjetosData) {
    console.log('🔄 Atualizando gráfico de sub projetos...');
    
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('subProjetosChart');
    if (!ctx) return;

    // Se não foram passados dados, calcular
    if (!subProjetosData) {
        subProjetosData = calculateSubProjetosData();
    }

    if (!subProjetosData || subProjetosData.length === 0) {
        console.log('⚠️ Nenhum dado de sub projetos disponível');
        return;
    }

    const labels = subProjetosData.map(p => p.nome);
    const data = subProjetosData.map(p => p.quantidade);
    const percentages = subProjetosData.map(p => parseFloat(p.percentual));

    // Remover gráfico anterior
    if (window.subProjetosChart && typeof window.subProjetosChart.destroy === 'function') {
        window.subProjetosChart.destroy();
    }

    window.subProjetosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Registros',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    yAxisID: 'y',
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'Percentual (%)',
                    data: percentages,
                    type: 'line',
                    borderColor: '#FF6B8A',
                    backgroundColor: 'rgba(255, 107, 138, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#FF6B8A',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1',
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 12,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toLocaleString()}`;
                            } else {
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Sub Projetos',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade de Registros',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de sub projetos atualizado com sucesso');
}

// Atualizar gráfico de cidades (versão sem parâmetros)
function updateCidadesChart() {
    console.log('🔄 Atualizando gráfico de cidades...');
    createCidadesCombinedChart();
}

// Atualizar gráfico de cidades (versão com dados)
function updateCidadesChartWithData(cidadesData) {
    console.log('🔄 Atualizando gráfico de cidades...');
    
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('cidadesChart');
    if (!ctx) return;

    // Se não foram passados dados, calcular
    if (!cidadesData) {
        cidadesData = calculateCidadesData();
    }

    if (!cidadesData || cidadesData.length === 0) {
        console.log('⚠️ Nenhum dado de cidades disponível');
        return;
    }

    const labels = cidadesData.map(p => p.nome);
    const data = cidadesData.map(p => p.quantidade);
    const percentages = cidadesData.map(p => parseFloat(p.percentual));

    // Remover gráfico anterior
    if (window.cidadesChart && typeof window.cidadesChart.destroy === 'function') {
        window.cidadesChart.destroy();
    }

    window.cidadesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Registros',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    yAxisID: 'y',
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'Percentual (%)',
                    data: percentages,
                    type: 'line',
                    borderColor: '#FF6B8A',
                    backgroundColor: 'rgba(255, 107, 138, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#FF6B8A',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1',
                    order: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toLocaleString()}`;
                            } else {
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Cidades',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade de Registros',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de cidades atualizado com sucesso');
}

// Atualizar gráfico de HP por projeto
function updateHpProjetosChart() {
    console.log('🔄 Atualizando gráfico de HP por projeto...');
    
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('hpProjetosChart');
    if (!ctx) return;

    // Filtrar e agrupar HP por projeto
    const projetosHp = {};
    let totalHp = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let projetoCol = null;
        let hpCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            projetoCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'PROJETO'
            );
            hpCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'HP'
            );
        }

        if (projetoCol && hpCol) {
            dynamicTableData.data.forEach(row => {
                const projeto = row[projetoCol]?.toString().trim();
                const hpValue = row[hpCol];
                
                if (projeto && projeto !== '' && hpValue !== undefined && hpValue !== null) {
                    // Converter HP para número
                    const hp = parseFloat(hpValue) || 0;
                    if (hp > 0) {
                        projetosHp[projeto] = (projetosHp[projeto] || 0) + hp;
                        totalHp += hp;
                    }
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalHp === 0 || Object.keys(projetosHp).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de HP por projeto...');
        projetosHp['PROJETO F'] = 2747;
        projetosHp['MDU-TOA'] = 1296;
        projetosHp['NAP LOTADA'] = 354;
        projetosHp['ON GOING'] = 212;
        totalHp = Object.values(projetosHp).reduce((sum, hp) => sum + hp, 0);
    }

    const labels = Object.keys(projetosHp);
    const data = labels.map(label => projetosHp[label]);

    // Remover gráfico anterior
    if (window.hpProjetosChart && typeof window.hpProjetosChart.destroy === 'function') {
        window.hpProjetosChart.destroy();
    }

    window.hpProjetosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Soma de HP',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `HP: ${value.toLocaleString()}`;
                        },
                        footer: function(tooltipItems) {
                            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `Total: ${total.toLocaleString()} HP`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Projetos',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Soma de HP',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de HP por projeto atualizado com sucesso');
    console.log('📊 Total de HP:', totalHp.toLocaleString());
}

// Atualizar gráfico de supervisores por status
function updateSupervisorStatusChart() {
    console.log('🔄 Atualizando gráfico de supervisores por status...');
    
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('supervisorStatusChart');
    if (!ctx) return;

    // Filtrar e agrupar dados por supervisor e status
    const supervisorData = {};
    let totalGeral = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let supervisorCol = null;
        let statusCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            supervisorCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'SUPERVISOR'
            );
            statusCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'STATUS'
            );
        }

        if (supervisorCol && statusCol) {
            dynamicTableData.data.forEach(row => {
                const supervisor = row[supervisorCol]?.toString().trim();
                const status = row[statusCol]?.toString().trim();
                
                if (supervisor && supervisor !== '' && status && status !== '') {
                    // Normalizar status
                    const statusNormalizado = status.toUpperCase();
                    
                    if (!supervisorData[supervisor]) {
                        supervisorData[supervisor] = {
                            PRODUTIVA: 0,
                            IMPRODUTIVA: 0,
                            total: 0
                        };
                    }
                    
                    if (statusNormalizado === 'PRODUTIVA') {
                        supervisorData[supervisor].PRODUTIVA++;
                    } else if (statusNormalizado === 'IMPRODUTIVA') {
                        supervisorData[supervisor].IMPRODUTIVA++;
                    }
                    
                    supervisorData[supervisor].total++;
                    totalGeral++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalGeral === 0 || Object.keys(supervisorData).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de supervisores...');
        supervisorData['JESSICA'] = { PRODUTIVA: 75, IMPRODUTIVA: 31, total: 106 };
        supervisorData['ALAN'] = { PRODUTIVA: 32, IMPRODUTIVA: 0, total: 32 };
        supervisorData['VALNEI'] = { PRODUTIVA: 5, IMPRODUTIVA: 0, total: 5 };
        totalGeral = Object.values(supervisorData).reduce((sum, data) => sum + data.total, 0);
    }

    const labels = Object.keys(supervisorData);
    const produtivaData = labels.map(label => supervisorData[label].PRODUTIVA);
    const improdutivaData = labels.map(label => supervisorData[label].IMPRODUTIVA);

    // Remover gráfico anterior
    if (window.supervisorStatusChart && typeof window.supervisorStatusChart.destroy === 'function') {
        window.supervisorStatusChart.destroy();
    }

    window.supervisorStatusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'PRODUTIVA',
                    data: produtivaData,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                },
                {
                    label: 'IMPRODUTIVA',
                    data: improdutivaData,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderColor: '#DC2626',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value}`;
                        },
                        footer: function(tooltipItems) {
                            const supervisor = tooltipItems[0].label;
                            const total = supervisorData[supervisor]?.total || 0;
                            return `Total ${supervisor}: ${total}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Supervisores',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Quantidade de Endereços',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de supervisores por status atualizado com sucesso');
    console.log('📊 Total geral:', totalGeral);
    console.log('📊 Dados dos supervisores:', supervisorData);
}
// Atualizar tabela de gestão de projetos com dados dinâmicos
function updateGestaoWithDynamicData() {
    const stats = calculateDynamicStats();
    
    // Adicionar projetos dinâmicos à gestão
    if (stats.projetos.length > 0) {
        stats.projetos.forEach(projeto => {
            const existingProject = gestaoData.projetos.find(p => p.nome === projeto);
            if (!existingProject) {
                gestaoData.projetos.push({
                    id: Date.now() + Math.random(),
                    nome: projeto,
                    cliente: 'Cliente Dinâmico',
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                });
            }
        });
    }
    
    // Adicionar supervisores dinâmicos à gestão
    if (stats.supervisores.length > 0) {
        stats.supervisores.forEach(supervisor => {
            const existingSupervisor = gestaoData.supervisores.find(s => s.nome === supervisor);
            if (!existingSupervisor) {
                gestaoData.supervisores.push({
                    id: Date.now() + Math.random(),
                    nome: supervisor,
                    email: `${supervisor.toLowerCase().replace(/\s+/g, '.')}@empresa.com`,
                    telefone: '(11) 99999-9999',
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                });
            }
        });
    }
    
    // Adicionar sub projetos dinâmicos à gestão
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        const subProjetosEncontrados = new Set();
        
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        dynamicTableData.data.forEach(row => {
            if (columnNames['SUB PROJETO'] && row[columnNames['SUB PROJETO']] && row[columnNames['SUB PROJETO']].toString().trim() !== '') {
                const subProjetoNome = row[columnNames['SUB PROJETO']].toString().trim();
                
                if (!subProjetosEncontrados.has(subProjetoNome)) {
                    subProjetosEncontrados.add(subProjetoNome);
                    
                    // Encontrar projeto principal
                    let projetoPrincipal = 'Projeto Padrão';
                    if (columnNames.PROJETO && row[columnNames.PROJETO]) {
                        projetoPrincipal = row[columnNames.PROJETO].toString().trim();
                    }
                    
                    const existingSubProjeto = gestaoData.subprojetos.find(sp => sp.nome === subProjetoNome);
                    if (!existingSubProjeto) {
                        gestaoData.subprojetos.push({
                            id: Date.now() + Math.random(),
                            nome: subProjetoNome,
                            projetoPrincipal: projetoPrincipal,
                            descricao: 'Sub projeto extraído dos dados dinâmicos',
                            status: 'ATIVO',
                            created_at: new Date().toISOString()
                        });
                    }
                }
            }
        });
    }
    
    // Adicionar equipes dinâmicas à gestão
    if (stats.equipes.length > 0) {
        stats.equipes.forEach(equipe => {
            const existingTeam = gestaoData.equipes.find(e => e.nome === equipe);
            if (!existingTeam) {
                gestaoData.equipes.push({
                    id: Date.now() + Math.random(),
                    nome: equipe,
                    supervisor: 'Supervisor Dinâmico',
                    membros: 5,
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                });
            }
        });
    }
    
    // Adicionar cidades dinâmicas à gestão
    if (stats.cidades.length > 0) {
        stats.cidades.forEach(cidade => {
            const existingCity = gestaoData.cidades.find(c => c.nome === cidade);
            if (!existingCity) {
                gestaoData.cidades.push({
                    id: Date.now() + Math.random(),
                    nome: cidade,
                    estado: 'BA',
                    regiao: 'Nordeste',
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                });
            }
        });
    }
    
    // Salvar dados de gestão atualizados
    localStorage.setItem('gestaoData', JSON.stringify(gestaoData));
    
    // Re-renderizar tabelas de gestão
    loadGestaoTables();
    
    // Atualizar dropdowns de Sub Projetos se o modal estiver aberto
    const subprojetoModal = document.getElementById('subprojetoModal');
    if (subprojetoModal && subprojetoModal.style.display === 'block') {
        populateSubProjetoDropdowns();
    }
    
    console.log('🗂️ Gestão atualizada com dados dinâmicos');
}
// Popular dropdowns do formulário de Sub Projetos
function populateSubProjetoDropdowns() {
    console.log('🔽 Populando dropdowns de Sub Projetos...');
    
    // Obter todos os projetos disponíveis
    const projetosDisponiveis = new Set();
    
    // 1. Projetos da gestão existente
    if (gestaoData.projetos && gestaoData.projetos.length > 0) {
        gestaoData.projetos.forEach(projeto => {
            projetosDisponiveis.add(projeto.nome);
        });
    }
    
    // 2. Projetos dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach(endereco => {
            if (endereco.projeto && endereco.projeto.trim() !== '') {
                projetosDisponiveis.add(endereco.projeto.trim());
            }
        });
    }
    
    // 3. Projetos dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        // Obter nomes exatos das colunas da tabela dinâmica
        const columnNames = getDynamicTableColumnNames();
        
        dynamicTableData.data.forEach(row => {
            if (columnNames.PROJETO && row[columnNames.PROJETO] && row[columnNames.PROJETO].toString().trim() !== '') {
                projetosDisponiveis.add(row[columnNames.PROJETO].toString().trim());
            }
        });
    }
    
    // Converter para array e ordenar
    const projetosArray = Array.from(projetosDisponiveis).sort();
    
    // Popular dropdown de projeto principal
    const projetoSelect = document.getElementById('subprojetoProjeto');
    if (projetoSelect) {
        projetoSelect.innerHTML = '<option value="">Selecione o projeto principal...</option>';
        projetosArray.forEach(projeto => {
            const option = document.createElement('option');
            option.value = projeto;
            option.textContent = projeto;
            projetoSelect.appendChild(option);
        });
        
        console.log(`✅ Dropdown de projetos populado com ${projetosArray.length} opções`);
    } else {
        console.error('❌ Dropdown de projetos não encontrado');
    }
    
    // Também popular dropdown de sub projetos se existir
    const subProjetosDisponiveis = new Set();
    
    // 1. Sub projetos dos dados de endereços
    if (enderecosData && enderecosData.length > 0) {
        enderecosData.forEach(endereco => {
            if (endereco.subProjeto && endereco.subProjeto.trim() !== '') {
                subProjetosDisponiveis.add(endereco.subProjeto.trim());
            }
        });
    }
    
    // 2. Sub projetos dos dados dinâmicos
    if (dynamicTableData.data && dynamicTableData.data.length > 0) {
        dynamicTableData.data.forEach(row => {
            const subProjetoFields = ['subProjeto', 'subprojeto', 'Sub Projeto', 'SUB PROJETO', 'subproject', 'Subproject'];
            subProjetoFields.forEach(field => {
                if (row[field] && row[field].toString().trim() !== '') {
                    subProjetosDisponiveis.add(row[field].toString().trim());
                }
            });
        });
    }
    
    // 3. Sub projetos da gestão
    if (gestaoData.subprojetos && gestaoData.subprojetos.length > 0) {
        gestaoData.subprojetos.forEach(subprojeto => {
            subProjetosDisponiveis.add(subprojeto.nome);
        });
    }
    
    const subProjetosArray = Array.from(subProjetosDisponiveis).sort();
    console.log(`✅ Sub projetos disponíveis: ${subProjetosArray.length}`);
}

// Função principal para integrar tudo
function integrateDynamicData() {
    console.log('🔗 Integrando dados dinâmicos com o sistema...');
    
    // Atualizar cards de estatísticas
    updateDynamicStatsCards();
    
    // Atualizar cards de infraestrutura
    updateInfraStats();
    
    // Atualizar filtros
    updateDynamicFilters();
    
    // Atualizar filtros de infraestrutura
    populateInfraFilters();
    
    // Atualizar gráficos
    updateDynamicCharts();
    
    // Atualizar gestão de projetos
    updateGestaoWithDynamicData();
    
    // Atualizar dropdowns do formulário
    populateFormSelects();
    
    // Persistir dados dos cards
    persistCardData();
    
    console.log('✅ Integração concluída');
}

// Função de teste para atualizar cards manualmente
function testUpdateCards() {
    console.log('🧪 Testando atualização de cards...');
    updateDynamicStatsCards();
}

// Função para forçar atualização dos cards
function forceUpdateCards() {
    console.log('⚡ Forçando atualização dos cards...');
    
    // Verificar se há dados dinâmicos
    if (dynamicTableData.data.length === 0) {
        console.log('⚠️ Nenhum dado dinâmico disponível');
        return;
    }
    
    // Calcular estatísticas
    const stats = calculateDynamicStats();
    
    // Buscar todos os elementos possíveis dos cards
    const allStatElements = document.querySelectorAll('.stat-value, .endereco-stat-card .stat-value, [data-stat]');
    console.log('🔍 Elementos de estatísticas encontrados:', allStatElements.length);
    
    // Tentar atualizar cada elemento encontrado
    allStatElements.forEach((element, index) => {
        console.log(`Elemento ${index}:`, element.textContent, element.className);
    });
    
    // Atualizar cards específicos
    updateDynamicStatsCards();
}

// Função para testar população dos dropdowns
function testDropdowns() {
    console.log('🧪 Testando população dos dropdowns...');
    
    // Verificar dados da gestão
    console.log('📊 gestaoData:', gestaoData);
    console.log('📋 Projetos na gestão:', gestaoData.projetos?.length || 0);
    console.log('📋 Sub projetos na gestão:', gestaoData.subprojetos?.length || 0);
    console.log('📋 Tipos de ação na gestão:', gestaoData.tiposAcao?.length || 0);
    console.log('📋 Supervisores na gestão:', gestaoData.supervisores?.length || 0);
    console.log('📋 Equipes na gestão:', gestaoData.equipes?.length || 0);
    console.log('📋 Cidades na gestão:', gestaoData.cidades?.length || 0);
    
    // Popular dropdowns
    populateFormSelects();
    
    // Verificar se os elementos foram populados
    const selects = ['projeto', 'subProjeto', 'tipoAcao', 'cidade', 'supervisor', 'equipe'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            console.log(`📋 ${selectId}:`, select.options.length, 'opções');
            console.log(`   Opções:`, Array.from(select.options).map(opt => opt.text).slice(0, 5));
        } else {
            console.warn(`⚠️ Select ${selectId} não encontrado`);
        }
    });
}

// Função para forçar atualização dos dropdowns
function forceUpdateDropdowns() {
    console.log('🔄 Forçando atualização dos dropdowns...');
    
    // Verificar se o modal está aberto
    const modal = document.getElementById('crudModal');
    if (modal && modal.style.display === 'block') {
        console.log('✅ Modal está aberto, atualizando dropdowns...');
        populateFormSelects();
    } else {
        console.log('⚠️ Modal não está aberto. Abra o modal primeiro.');
    }
}

// Função para verificar estado da tabela dinâmica e cards
function checkDynamicTableStatus() {
    console.log('🔍 Verificando estado da tabela dinâmica...');
    
    // Verificar se há dados dinâmicos
    console.log('📊 dynamicTableData:', dynamicTableData);
    console.log('📋 Headers:', dynamicTableData.headers);
    console.log('📊 Dados:', dynamicTableData.data.length, 'registros');
    
    if (dynamicTableData.data.length > 0) {
        console.log('🔍 Primeira linha de dados:', dynamicTableData.data[0]);
        console.log('🔍 Última linha de dados:', dynamicTableData.data[dynamicTableData.data.length - 1]);
    }
    
    // Calcular estatísticas
    const stats = calculateDynamicStats();
    console.log('📊 Estatísticas calculadas:', stats);
    
    // Verificar elementos dos cards
    const totalElement = document.getElementById('statTotalRegistros');
    const enderecosElement = document.getElementById('statEnderecosDistintos');
    const equipesElement = document.getElementById('statEquipesDistintas');
    const produtividadeElement = document.getElementById('statProdutividade');
    
    console.log('🎯 Elementos dos cards encontrados:', {
        total: !!totalElement,
        enderecos: !!enderecosElement,
        equipes: !!equipesElement,
        produtividade: !!produtividadeElement
    });
    
    if (totalElement) console.log('📊 Valor atual do total:', totalElement.textContent);
    if (enderecosElement) console.log('📊 Valor atual dos endereços:', enderecosElement.textContent);
    if (equipesElement) console.log('📊 Valor atual das equipes:', equipesElement.textContent);
    if (produtividadeElement) console.log('📊 Valor atual da produtividade:', produtividadeElement.textContent);
    
    // Forçar atualização
    console.log('🔄 Forçando atualização dos cards...');
    updateDynamicStatsCards();
}

// Função para forçar atualização completa
function forceUpdateAll() {
    console.log('⚡ Forçando atualização completa...');
    
    // Verificar dados dinâmicos
    checkDynamicTableStatus();
    
    // Integrar dados
    integrateDynamicData();
    
    // Forçar atualização dos cards novamente
    setTimeout(() => {
        updateDynamicStatsCards();
        updateInfraStats();
        console.log('✅ Atualização completa concluída');
    }, 1000);
}

// Função para testar cards de infraestrutura
function testInfraCards() {
    console.log('🧪 Testando cards de infraestrutura...');
    
    // Verificar dados disponíveis
    console.log('📊 Dados de endereços:', enderecosData.length, 'registros');
    console.log('📊 Dados dinâmicos:', dynamicTableData.data.length, 'registros');
    
    // Calcular estatísticas
    const stats = calculateInfraStats();
    console.log('📊 Estatísticas de infraestrutura:', stats);
    
    // Verificar elementos dos cards
    const totalElement = document.getElementById('infraStatTotalRegistros');
    const enderecosElement = document.getElementById('infraStatEnderecosDistintos');
    const equipesElement = document.getElementById('infraStatEquipesDistintas');
    const produtividadeElement = document.getElementById('infraStatProdutividade');
    
    console.log('🔍 Elementos dos cards de infraestrutura:', {
        total: !!totalElement,
        enderecos: !!enderecosElement,
        equipes: !!equipesElement,
        produtividade: !!produtividadeElement
    });
    
    if (totalElement) console.log('📊 Valor atual do total:', totalElement.textContent);
    if (enderecosElement) console.log('📊 Valor atual dos endereços:', enderecosElement.textContent);
    if (equipesElement) console.log('📊 Valor atual das equipes:', equipesElement.textContent);
    if (produtividadeElement) console.log('📊 Valor atual da produtividade:', produtividadeElement.textContent);
    
    // Forçar atualização
    updateInfraStats();
}

// Função para forçar atualização dos cards de infraestrutura
function forceUpdateInfraCards() {
    console.log('⚡ Forçando atualização dos cards de infraestrutura...');
    
    // Verificar se há dados
    if (enderecosData.length === 0 && dynamicTableData.data.length === 0) {
        console.log('⚠️ Nenhum dado disponível');
        return;
    }
    
    // Calcular e atualizar
    const stats = calculateInfraStats();
    console.log('📊 Estatísticas calculadas:', stats);
    
    // Atualizar cards
    updateInfraStats();
    
    // Forçar atualização após delay
    setTimeout(() => {
        updateInfraStats();
        console.log('✅ Cards de infraestrutura atualizados');
    }, 500);
}

// Função para testar filtros de infraestrutura
function testInfraFilters() {
    console.log('🧪 Testando filtros de infraestrutura...');
    
    // Verificar dados disponíveis
    console.log('📊 Dados de endereços:', enderecosData.length, 'registros');
    console.log('📊 Dados dinâmicos:', dynamicTableData.data.length, 'registros');
    console.log('📊 Dados da gestão:', {
        projetos: gestaoData.projetos?.length || 0,
        subProjetos: gestaoData.subprojetos?.length || 0,
        tiposAcao: gestaoData.tiposAcao?.length || 0,
        supervisores: gestaoData.supervisores?.length || 0,
        equipes: gestaoData.equipes?.length || 0,
        cidades: gestaoData.cidades?.length || 0
    });
    
    // Popular filtros
    populateInfraFilters();
    
    // Verificar se os elementos foram populados
    const filters = ['infraFilterProjeto', 'infraFilterSubProjeto', 'infraFilterEquipe', 'infraFilterCidade', 'infraFilterSupervisor', 'infraFilterTipoAcao'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            console.log(`📋 ${filterId}:`, filter.options.length, 'opções');
            console.log(`   Opções:`, Array.from(filter.options).map(opt => opt.text).slice(0, 5));
        } else {
            console.warn(`⚠️ Filtro ${filterId} não encontrado`);
        }
    });
}

// Função para forçar atualização dos filtros de infraestrutura
function forceUpdateInfraFilters() {
    console.log('🔄 Forçando atualização dos filtros de infraestrutura...');
    
    // Verificar se a seção está visível
    const infraSection = document.getElementById('infraestrutura');
    if (infraSection && infraSection.style.display !== 'none') {
        console.log('✅ Seção de infraestrutura está visível, atualizando filtros...');
        populateInfraFilters();
    } else {
        console.log('⚠️ Seção de infraestrutura não está visível. Navegue para a seção primeiro.');
    }
}

// Função para diagnosticar problemas com os cards de Cadastro de Endereços
function diagnoseEnderecosCards() {
    console.log('🔍 Diagnosticando cards de Cadastro de Endereços...');
    
    // Verificar dados disponíveis
    console.log('📊 Dados disponíveis:', {
        enderecosData: enderecosData.length,
        dynamicTableData: dynamicTableData.data.length,
        gestaoData: {
            projetos: gestaoData.projetos?.length || 0,
            subprojetos: gestaoData.subprojetos?.length || 0
        }
    });
    
    // Verificar elementos dos cards
    const cardElements = {
        total: document.getElementById('statTotalRegistros'),
        enderecos: document.getElementById('statEnderecosDistintos'),
        equipes: document.getElementById('statEquipesDistintas'),
        produtividade: document.getElementById('statProdutividade')
    };
    
    console.log('🔍 Elementos dos cards encontrados:', {
        total: !!cardElements.total,
        enderecos: !!cardElements.enderecos,
        equipes: !!cardElements.equipes,
        produtividade: !!cardElements.produtividade
    });
    
    // Verificar valores atuais
    Object.entries(cardElements).forEach(([key, element]) => {
        if (element) {
            console.log(`📊 Valor atual do ${key}:`, element.textContent);
        } else {
            console.warn(`⚠️ Elemento ${key} não encontrado`);
        }
    });
    
    // Calcular estatísticas
    const stats = calculateDynamicStats();
    console.log('📊 Estatísticas calculadas:', stats);
    
    // Tentar atualizar cards
    console.log('🔄 Tentando atualizar cards...');
    updateDynamicStatsCards();
    
    // Verificar valores após atualização
    setTimeout(() => {
        console.log('📊 Valores após atualização:');
        Object.entries(cardElements).forEach(([key, element]) => {
            if (element) {
                console.log(`   ${key}:`, element.textContent);
            }
        });
    }, 100);
}
// Função para forçar atualização dos cards de Cadastro de Endereços
function forceUpdateEnderecosCards() {
    console.log('⚡ Forçando atualização dos cards de Cadastro de Endereços...');
    
    // Verificar se há dados
    if (enderecosData.length === 0 && dynamicTableData.data.length === 0) {
        console.log('⚠️ Nenhum dado disponível');
        return;
    }
    
    // Calcular estatísticas
    const stats = calculateDynamicStats();
    console.log('📊 Estatísticas calculadas:', stats);
    
    // Atualizar cards diretamente
    const totalElement = document.getElementById('statTotalRegistros');
    const enderecosElement = document.getElementById('statEnderecosDistintos');
    const equipesElement = document.getElementById('statEquipesDistintas');
    const produtividadeElement = document.getElementById('statProdutividade');
    
    if (totalElement) {
        totalElement.textContent = stats.totalRegistros;
        console.log('✅ Total atualizado:', stats.totalRegistros);
    }
    
    if (enderecosElement) {
        enderecosElement.textContent = stats.enderecosDistintos;
        console.log('✅ Endereços atualizados:', stats.enderecosDistintos);
    }
    
    if (equipesElement) {
        equipesElement.textContent = stats.equipesDistintas;
        console.log('✅ Equipes atualizadas:', stats.equipesDistintas);
    }
    
    if (produtividadeElement) {
        produtividadeElement.textContent = stats.produtividade + '%';
        console.log('✅ Produtividade atualizada:', stats.produtividade + '%');
    }
    
    // Forçar atualização após delay
    setTimeout(() => {
        updateDynamicStatsCards();
        console.log('✅ Cards de Cadastro de Endereços atualizados');
    }, 500);
}

// Função para persistir dados dos cards no localStorage
function persistCardData() {
    console.log('💾 Persistindo dados dos cards...');
    
    try {
        const cardData = {
            timestamp: Date.now(),
            enderecosData: enderecosData,
            dynamicTableData: dynamicTableData,
            gestaoData: gestaoData
        };
        
        localStorage.setItem('cardData', JSON.stringify(cardData));
        console.log('✅ Dados dos cards persistidos');
    } catch (error) {
        console.error('❌ Erro ao persistir dados dos cards:', error);
    }
}

// Função para carregar dados dos cards do localStorage
function loadCardData() {
    console.log('📂 Carregando dados dos cards...');
    
    try {
        const savedData = localStorage.getItem('cardData');
        if (savedData) {
            const cardData = JSON.parse(savedData);
            
            // Verificar se os dados não são muito antigos (24 horas)
            const isRecent = (Date.now() - cardData.timestamp) < (24 * 60 * 60 * 1000);
            
            if (isRecent) {
                console.log('✅ Dados dos cards carregados do localStorage');
                return cardData;
            } else {
                console.log('⚠️ Dados dos cards muito antigos, removendo...');
                localStorage.removeItem('cardData');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados dos cards:', error);
    }
    
    return null;
}

// Função para restaurar cards automaticamente
function restoreCards() {
    console.log('🔄 Restaurando cards automaticamente...');
    
    // Carregar dados salvos
    const savedData = loadCardData();
    
    if (savedData) {
        // Restaurar dados se necessário
        if (savedData.enderecosData && enderecosData.length === 0) {
            enderecosData = savedData.enderecosData;
        }
        
        if (savedData.dynamicTableData && dynamicTableData.data.length === 0) {
            dynamicTableData = savedData.dynamicTableData;
        }
        
        if (savedData.gestaoData && Object.keys(gestaoData).length === 0) {
            gestaoData = savedData.gestaoData;
        }
    }
    
    // Atualizar cards
    updateDynamicStatsCards();
    updateInfraStats();
    
    console.log('✅ Cards restaurados');
}

// Função para configurar persistência automática
function setupCardPersistence() {
    console.log('🔧 Configurando persistência automática dos cards...');
    
    // Salvar dados antes de sair da página
    window.addEventListener('beforeunload', () => {
        persistCardData();
    });
    
    // Salvar dados quando a página fica oculta
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            persistCardData();
        }
    });
    
    // Restaurar cards quando a página carrega
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            restoreCards();
        }, 500);
    });
    
    console.log('✅ Persistência automática configurada');
}

// Função para testar persistência dos cards
function testCardPersistence() {
    console.log('🧪 Testando persistência dos cards...');
    
    // Verificar dados atuais
    console.log('📊 Dados atuais:', {
        enderecosData: enderecosData.length,
        dynamicTableData: dynamicTableData.data.length,
        gestaoData: Object.keys(gestaoData).length
    });
    
    // Salvar dados
    persistCardData();
    
    // Simular carregamento
    const savedData = loadCardData();
    if (savedData) {
        console.log('✅ Dados salvos e carregados com sucesso');
        console.log('📊 Dados salvos:', {
            enderecosData: savedData.enderecosData.length,
            dynamicTableData: savedData.dynamicTableData.data.length,
            gestaoData: Object.keys(savedData.gestaoData).length,
            timestamp: new Date(savedData.timestamp).toLocaleString()
        });
    } else {
        console.warn('⚠️ Falha ao salvar/carregar dados');
    }
    
    // Testar restauração
    restoreCards();
    console.log('✅ Teste de persistência concluído');
}

// Função para limpar dados persistidos
function clearPersistedCardData() {
    console.log('🗑️ Limpando dados persistidos dos cards...');
    
    try {
        localStorage.removeItem('cardData');
        console.log('✅ Dados persistidos removidos');
    } catch (error) {
        console.error('❌ Erro ao limpar dados persistidos:', error);
    }
}

// Função para testar soma de endereços
function testEnderecosSum() {
    console.log('🧪 Testando soma de endereços...');
    
    // Verificar dados atuais
    console.log('📊 Dados atuais:', {
        enderecosData: enderecosData.length,
        dynamicTableData: dynamicTableData.data.length,
        total: enderecosData.length + dynamicTableData.data.length
    });
    
    // Mostrar detalhes dos endereços
    if (enderecosData.length > 0) {
        console.log('📋 Endereços cadastrados:', enderecosData.map(e => ({
            id: e.id,
            endereco: e.endereco,
            equipe: e.equipe,
            status: e.status
        })));
    }
    
    // Mostrar detalhes dos dados dinâmicos
    if (dynamicTableData.data.length > 0) {
        console.log('📊 Dados dinâmicos:', dynamicTableData.data.slice(0, 3).map(row => ({
            id: row.id,
            endereco: Object.values(row).find(val => val && val.toString().includes('endereco')) || 'N/A',
            equipe: Object.values(row).find(val => val && val.toString().includes('equipe')) || 'N/A'
        })));
    }
    
    // Calcular estatísticas
    const stats = calculateDynamicStats();
    console.log('📊 Estatísticas calculadas:', stats);
    
    // Verificar valores dos cards
    const totalElement = document.getElementById('statTotalRegistros');
    const enderecosElement = document.getElementById('statEnderecosDistintos');
    const equipesElement = document.getElementById('statEquipesDistintas');
    const produtividadeElement = document.getElementById('statProdutividade');
    
    console.log('📊 Valores atuais dos cards:', {
        total: totalElement?.textContent || 'N/A',
        enderecos: enderecosElement?.textContent || 'N/A',
        equipes: equipesElement?.textContent || 'N/A',
        produtividade: produtividadeElement?.textContent || 'N/A'
    });
    
    // Forçar atualização
    updateDynamicStatsCards();
    
    console.log('✅ Teste de soma concluído');
}

// Gráfico combinado de Projetos (barras = quantidade, linha = %)
function createProjetosCombinedChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('projetosChart');
    if (!ctx) return;

    // Filtrar e agrupar projetos SOMENTE da coluna "PROJETO" (case-insensitive)
    const projetosCount = {};
    let total = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir o nome exato da coluna 'PROJETO' (case-insensitive)
        let projetoCol = null;
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            projetoCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'PROJETO'
            );
        }

        if (projetoCol) {
            dynamicTableData.data.forEach(row => {
                const value = row[projetoCol]?.toString().trim();
                if (value && value !== '') {
                    projetosCount[value] = (projetosCount[value] || 0) + 1;
                    total++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (total === 0 || Object.keys(projetosCount).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração...');
        projetosCount['PROJETO F'] = 462;
        projetosCount['MDU-TOA'] = 309;
        projetosCount['NAP LOTADA'] = 29;
        projetosCount['ON GOING'] = 20;
        projetosCount['SOLICITAÇÃO DE SAR'] = 3;
        total = Object.values(projetosCount).reduce((sum, qtd) => sum + qtd, 0);
    }

    const labels = Object.keys(projetosCount);
    const data = labels.map(label => projetosCount[label]);
    const percentages = data.map(qtd => total > 0 ? ((qtd / total) * 100).toFixed(2) : 0);

    // Remover gráfico anterior
    if (window.projetosChart && typeof window.projetosChart.destroy === 'function') {
        window.projetosChart.destroy();
    }

    window.projetosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Registros',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    yAxisID: 'y',
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 1,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                {
                    label: 'Percentual (%)',
                    data: percentages,
                    type: 'line',
                    borderColor: '#FF6B8A',
                    backgroundColor: 'rgba(255, 107, 138, 0.2)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#FF6B8A',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointStyle: 'circle',
                    order: 0,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        color: '#000000',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: 4,
                        padding: 3,
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: function(value) {
                            return value + '%';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40
                }
            },
            plugins: {
                datalabels: {
                    display: true,
                    color: '#000000',
                    anchor: 'end',
                    align: 'top',
                    offset: 15,
                    font: {
                        weight: 'bold',
                        size: 12
                    }
                },
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return `Projeto: ${context[0].label}`;
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Quantidade: ${context.parsed.y.toLocaleString()}`;
                            } else {
                                return `Percentual: ${context.parsed.y}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Projetos',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#000000'
                    },
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        font: {
                            size: 14,
                            weight: '600'
                        },
                        color: '#000000'
                    },
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#000000',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(255, 99, 132, 0.1)'
                    },
                },
            }
        }
    });
}

// Gráfico combinado de Sub Projetos (barras = quantidade, linha = %)
function createSubProjetosCombinedChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('subProjetosChart');
    if (!ctx) return;

    // Filtrar e agrupar sub projetos SOMENTE da coluna "SUB PROJETO" (case-insensitive)
    const subProjetosCount = {};
    let total = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir o nome exato da coluna 'SUB PROJETO' (case-insensitive)
        let subProjetoCol = null;
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            subProjetoCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'SUB PROJETO'
            );
        }

        if (subProjetoCol) {
            dynamicTableData.data.forEach(row => {
                const value = row[subProjetoCol]?.toString().trim();
                if (value && value !== '') {
                    subProjetosCount[value] = (subProjetosCount[value] || 0) + 1;
                    total++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (total === 0 || Object.keys(subProjetosCount).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de sub projetos...');
        subProjetosCount['PROJETO F'] = 465;
        subProjetosCount['INOVAR'] = 248;
        subProjetosCount['CLARO'] = 61;
        subProjetosCount['SGD'] = 49;
        total = Object.values(subProjetosCount).reduce((sum, qtd) => sum + qtd, 0);
    }

    const labels = Object.keys(subProjetosCount);
    const data = labels.map(label => subProjetosCount[label]);
    const percentages = data.map(qtd => total > 0 ? ((qtd / total) * 100).toFixed(2) : 0);

    // Remover gráfico anterior
    if (window.subProjetosChart && typeof window.subProjetosChart.destroy === 'function') {
        window.subProjetosChart.destroy();
    }

    window.subProjetosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Registros',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    yAxisID: 'y',
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 1,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                {
                    label: 'Percentual (%)',
                    data: percentages,
                    type: 'line',
                    borderColor: '#FF6B8A',
                    backgroundColor: 'rgba(255, 107, 138, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#FF6B8A',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1',
                    order: 0,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        color: '#000000',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: 4,
                        padding: 3,
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: function(value) {
                            return value + '%';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 40, bottom: 22 } },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toLocaleString()}`;
                            } else {
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Sub Projetos',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade de Registros',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de sub projetos criado com sucesso');
}

// Gráfico combinado de Cidades (barras = quantidade, linha = %)
function createCidadesCombinedChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('cidadesChart');
    if (!ctx) return;

    // Filtrar e agrupar cidades SOMENTE da coluna "CIDADE" (case-insensitive)
    const cidadesCount = {};
    let total = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir o nome exato da coluna 'CIDADE' (case-insensitive)
        let cidadeCol = null;
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            cidadeCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'CIDADE'
            );
        }

        if (cidadeCol) {
            dynamicTableData.data.forEach(row => {
                const value = row[cidadeCol]?.toString().trim();
                if (value && value !== '') {
                    cidadesCount[value] = (cidadesCount[value] || 0) + 1;
                    total++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (total === 0 || Object.keys(cidadesCount).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de cidades...');
        cidadesCount['SALVADOR'] = 792;
        cidadesCount['LAURO DE FREITAS'] = 30;
        cidadesCount['CAMAÇARI'] = 1;
        total = Object.values(cidadesCount).reduce((sum, qtd) => sum + qtd, 0);
    }

    const labels = Object.keys(cidadesCount);
    const data = labels.map(label => cidadesCount[label]);
    const percentages = data.map(qtd => total > 0 ? ((qtd / total) * 100).toFixed(2) : 0);

    // Remover gráfico anterior
    if (window.cidadesChart && typeof window.cidadesChart.destroy === 'function') {
        window.cidadesChart.destroy();
    }

    window.cidadesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Quantidade de Registros',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    yAxisID: 'y',
                    borderRadius: 4,
                    borderSkipped: false,
                    order: 1,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value) {
                            return value.toLocaleString();
                        }
                    }
                },
                {
                    label: 'Percentual (%)',
                    data: percentages,
                    type: 'line',
                    borderColor: '#FF6B8A',
                    backgroundColor: 'rgba(255, 107, 138, 0.2)',
                    borderWidth: 3,
                    pointBackgroundColor: '#FF6B8A',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1',
                    order: 0,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 4,
                        color: '#000000',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        borderRadius: 4,
                        padding: 3,
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: function(value) {
                            return value + '%';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (context.datasetIndex === 0) {
                                return `${label}: ${value.toLocaleString()}`;
                            } else {
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Cidades',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        padding: 14,
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Quantidade de Registros',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Percentual (%)',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de cidades criado com sucesso');
}

// Gráfico de barras de HP por Projeto
function createHpProjetosBarChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('hpProjetosChart');
    if (!ctx) return;

    // Filtrar e agrupar HP por projeto
    const projetosHp = {};
    let totalHp = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let projetoCol = null;
        let hpCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            projetoCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'PROJETO'
            );
            hpCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'HP'
            );
        }

        if (projetoCol && hpCol) {
            dynamicTableData.data.forEach(row => {
                const projeto = row[projetoCol]?.toString().trim();
                const hpValue = row[hpCol];
                
                if (projeto && projeto !== '' && hpValue !== undefined && hpValue !== null) {
                    // Converter HP para número
                    const hp = parseFloat(hpValue) || 0;
                    if (hp > 0) {
                        projetosHp[projeto] = (projetosHp[projeto] || 0) + hp;
                        totalHp += hp;
                    }
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalHp === 0 || Object.keys(projetosHp).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de HP por projeto...');
        projetosHp['PROJETO F'] = 2747;
        projetosHp['MDU-TOA'] = 1296;
        projetosHp['NAP LOTADA'] = 354;
        projetosHp['ON GOING'] = 212;
        totalHp = Object.values(projetosHp).reduce((sum, hp) => sum + hp, 0);
    }

    const labels = Object.keys(projetosHp);
    const data = labels.map(label => projetosHp[label]);

    // Remover gráfico anterior
    if (window.hpProjetosChart && typeof window.hpProjetosChart.destroy === 'function') {
        window.hpProjetosChart.destroy();
    }

    window.hpProjetosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Soma de HP',
                    data: data,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value) {
                            return value.toLocaleString();
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            return `HP: ${value.toLocaleString()}`;
                        },
                        footer: function(tooltipItems) {
                            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                            return `Total: ${total.toLocaleString()} HP`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Projetos',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Soma de HP',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de HP por projeto criado com sucesso');
    console.log('📊 Total de HP:', totalHp.toLocaleString());
}

// Gráfico de barras de Recebimentos por Mês
function createRecebimentosBarChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('recebimentosChart');
    if (!ctx) return;

    // Filtrar e agrupar recebimentos e conclusões por mês
    const recebimentosMes = {};
    const conclusoesMes = {};
    let totalRecebimentos = 0;
    let totalConclusoes = 0;

    // Função para parsear datas
    function parseDate(dataStr) {
        if (!dataStr) return null;
        const str = dataStr.toString().trim();
        
        // Tentar parsear diferentes formatos
        if (str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    return new Date(year, month - 1, day);
                }
            }
        } else if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    // Formato YYYY-MM-DD
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const day = parseInt(parts[2]);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        return new Date(year, month - 1, day);
                    }
                } else {
                    // Formato DD-MM-YYYY
                    const day = parseInt(parts[0]);
                    const month = parseInt(parts[1]);
                    const year = parseInt(parts[2]);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        return new Date(year, month - 1, day);
                    }
                }
            }
        }
        return null;
    }

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let dataRecebimentoCol = null;
        let dataFinalCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            dataRecebimentoCol = Object.keys(firstRow).find(
                field => {
                    const fieldUpper = field.trim().toUpperCase();
                    return fieldUpper.includes('DATA') && fieldUpper.includes('RECEBIMENTO');
                }
            );
            dataFinalCol = Object.keys(firstRow).find(
                field => {
                    const fieldUpper = field.trim().toUpperCase();
                    return fieldUpper.includes('DATA') && fieldUpper.includes('FINAL');
                }
            );
        }

        if (dataRecebimentoCol || dataFinalCol) {
            dynamicTableData.data.forEach(row => {
                // Processar DATA RECEBIMENTO
                if (dataRecebimentoCol) {
                    const dataRecebimento = row[dataRecebimentoCol];
                    if (dataRecebimento && dataRecebimento !== '') {
                        const dataObj = parseDate(dataRecebimento);
                        if (dataObj && !isNaN(dataObj.getTime())) {
                            const mesAno = `${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`;
                            recebimentosMes[mesAno] = (recebimentosMes[mesAno] || 0) + 1;
                            totalRecebimentos++;
                        }
                    }
                }
                
                // Processar DATA FINAL
                if (dataFinalCol) {
                    const dataFinal = row[dataFinalCol];
                    if (dataFinal && dataFinal !== '') {
                        const dataObj = parseDate(dataFinal);
                        if (dataObj && !isNaN(dataObj.getTime())) {
                            const mesAno = `${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`;
                            conclusoesMes[mesAno] = (conclusoesMes[mesAno] || 0) + 1;
                            totalConclusoes++;
                        }
                    }
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalRecebimentos === 0 && totalConclusoes === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de recebimentos e conclusões por mês...');
        recebimentosMes['01/2024'] = 45;
        recebimentosMes['02/2024'] = 52;
        recebimentosMes['03/2024'] = 38;
        recebimentosMes['04/2024'] = 61;
        recebimentosMes['05/2024'] = 47;
        recebimentosMes['06/2024'] = 55;
        
        conclusoesMes['01/2024'] = 42;
        conclusoesMes['02/2024'] = 48;
        conclusoesMes['03/2024'] = 35;
        conclusoesMes['04/2024'] = 58;
        conclusoesMes['05/2024'] = 44;
        conclusoesMes['06/2024'] = 51;
        
        totalRecebimentos = Object.values(recebimentosMes).reduce((sum, count) => sum + count, 0);
        totalConclusoes = Object.values(conclusoesMes).reduce((sum, count) => sum + count, 0);
    }

    // Determinar o ano para mostrar todos os meses
    let anoAtual = new Date().getFullYear();
    
    // Se houver dados, usar o ano mais recente dos dados (considerando ambos recebimentos e conclusões)
    const todosAnos = [...Object.keys(recebimentosMes), ...Object.keys(conclusoesMes)];
    if (todosAnos.length > 0) {
        const anos = todosAnos.map(mesAno => {
            const [mes, ano] = mesAno.split('/').map(Number);
            return ano;
        });
        anoAtual = Math.max(...anos);
    }

    // Criar array com todos os 12 meses do ano, mas filtrar os que têm valor 0
    const todosMeses = [];
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let mes = 1; mes <= 12; mes++) {
        const mesFormatado = mes.toString().padStart(2, '0');
        const chave = `${mesFormatado}/${anoAtual}`;
        const recebimentos = recebimentosMes[chave] || 0;
        const conclusoes = conclusoesMes[chave] || 0;
        
        // Só adicionar meses que têm atividades (recebimentos > 0 OU conclusões > 0)
        if (recebimentos > 0 || conclusoes > 0) {
            todosMeses.push({
                chave: chave,
                label: `${nomesMeses[mes - 1]}/${anoAtual}`,
                recebimentos: recebimentos,
                conclusoes: conclusoes
            });
        }
    }

    const labels = todosMeses.map(item => item.label);
    const dataRecebimentos = todosMeses.map(item => item.recebimentos);
    const dataConclusoes = todosMeses.map(item => item.conclusoes);

    // Remover gráfico anterior
    if (window.recebimentosChart && typeof window.recebimentosChart.destroy === 'function') {
        window.recebimentosChart.destroy();
    }

    window.recebimentosChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Recebimentos',
                    data: dataRecebimentos,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 15,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function(value) {
                            return value > 0 ? value.toLocaleString() : '';
                        }
                    }
                },
                {
                    label: 'Concluídos',
                    data: dataConclusoes,
                    backgroundColor: 'rgba(34, 197, 94, 0.8)',
                    borderColor: '#22C55E',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 15,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 10
                        },
                        formatter: function(value) {
                            return value > 0 ? value.toLocaleString() : '';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 50,
                    bottom: 20,
                    left: 10,
                    right: 10
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const datasetLabel = context.dataset.label;
                            return `${datasetLabel}: ${value.toLocaleString()}`;
                        },
                        footer: function(tooltipItems) {
                            let totalRecebimentos = 0;
                            let totalConclusoes = 0;
                            
                            tooltipItems.forEach(item => {
                                if (item.dataset.label === 'Recebimentos') {
                                    totalRecebimentos += item.parsed.y;
                                } else if (item.dataset.label === 'Concluídos') {
                                    totalConclusoes += item.parsed.y;
                                }
                            });
                            
                            const resultado = [];
                            if (totalRecebimentos > 0) {
                                resultado.push(`Total Recebimentos: ${totalRecebimentos.toLocaleString()}`);
                            }
                            if (totalConclusoes > 0) {
                                resultado.push(`Total Concluídos: ${totalConclusoes.toLocaleString()}`);
                            }
                            if (totalRecebimentos > 0 && totalConclusoes > 0) {
                                const percentual = ((totalConclusoes / totalRecebimentos) * 100).toFixed(1);
                                resultado.push(`Taxa de Conclusão: ${percentual}%`);
                            }
                            
                            return resultado;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mês/Ano',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Quantidade',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        beginAtZero: true,
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)',
                        drawOnChartArea: true,
                        drawBorder: false
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de recebimentos e conclusões por mês criado com sucesso');
    console.log('📊 Total de recebimentos:', totalRecebimentos.toLocaleString());
    console.log('✅ Total de conclusões:', totalConclusoes.toLocaleString());
}

// Gráfico de barras agrupadas de Endereços por Supervisor e Status
function createSupervisorStatusBarChart() {
    if (typeof Chart === 'undefined') return;
    const ctx = document.getElementById('supervisorStatusChart');
    if (!ctx) return;

    // Filtrar e agrupar dados por supervisor e status
    const supervisorData = {};
    let totalGeral = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let supervisorCol = null;
        let statusCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            supervisorCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'SUPERVISOR'
            );
            statusCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'STATUS'
            );
        }

        if (supervisorCol && statusCol) {
            dynamicTableData.data.forEach(row => {
                const supervisor = row[supervisorCol]?.toString().trim();
                const status = row[statusCol]?.toString().trim();
                
                if (supervisor && supervisor !== '' && status && status !== '') {
                    // Normalizar status
                    const statusNormalizado = status.toUpperCase();
                    
                    if (!supervisorData[supervisor]) {
                        supervisorData[supervisor] = {
                            PRODUTIVA: 0,
                            IMPRODUTIVA: 0,
                            total: 0
                        };
                    }
                    
                    if (statusNormalizado === 'PRODUTIVA') {
                        supervisorData[supervisor].PRODUTIVA++;
                    } else if (statusNormalizado === 'IMPRODUTIVA') {
                        supervisorData[supervisor].IMPRODUTIVA++;
                    }
                    
                    supervisorData[supervisor].total++;
                    totalGeral++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalGeral === 0 || Object.keys(supervisorData).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração de supervisores...');
        supervisorData['JESSICA'] = { PRODUTIVA: 75, IMPRODUTIVA: 31, total: 106 };
        supervisorData['ALAN'] = { PRODUTIVA: 32, IMPRODUTIVA: 0, total: 32 };
        supervisorData['VALNEI'] = { PRODUTIVA: 5, IMPRODUTIVA: 0, total: 5 };
        totalGeral = Object.values(supervisorData).reduce((sum, data) => sum + data.total, 0);
    }

    const labels = Object.keys(supervisorData);
    const produtivaData = labels.map(label => supervisorData[label].PRODUTIVA);
    const improdutivaData = labels.map(label => supervisorData[label].IMPRODUTIVA);

    // Remover gráfico anterior
    if (window.supervisorStatusChart && typeof window.supervisorStatusChart.destroy === 'function') {
        window.supervisorStatusChart.destroy();
    }

    window.supervisorStatusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'PRODUTIVA',
                    data: produtivaData,
                    backgroundColor: 'rgba(30, 64, 175, 0.8)',
                    borderColor: '#1E40AF',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: function(value) {
                            return value > 0 ? value.toString() : '';
                        }
                    }
                },
                {
                    label: 'IMPRODUTIVA',
                    data: improdutivaData,
                    backgroundColor: 'rgba(220, 38, 38, 0.8)',
                    borderColor: '#DC2626',
                    borderWidth: 2,
                    borderRadius: 4,
                    borderSkipped: false,
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: 25,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: function(value) {
                            return value > 0 ? value.toString() : '';
                        }
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 40
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#1E40AF',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${label}: ${value}`;
                        },
                        footer: function(tooltipItems) {
                            const supervisor = tooltipItems[0].label;
                            const total = supervisorData[supervisor]?.total || 0;
                            return `Total ${supervisor}: ${total}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Supervisores',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Quantidade de Endereços',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        color: '#000000'
                    },
                    ticks: {
                        color: '#000000',
                        callback: function(value) {
                            return value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    console.log('✅ Gráfico de supervisores por status criado com sucesso');
    console.log('📊 Total geral:', totalGeral);
    console.log('📊 Dados dos supervisores:', supervisorData);
}

// Função para testar o gráfico de sub projetos
window.testSubProjetosChart = function() {
    console.log('🧪 Testando gráfico de sub projetos...');
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('subProjetosChart');
    if (!ctx) {
        console.error('❌ Canvas subProjetosChart não encontrado');
        return;
    }
    
    console.log('✅ Canvas encontrado, criando gráfico...');
    createSubProjetosCombinedChart();
};

// Função para testar o gráfico de cidades
window.testCidadesChart = function() {
    console.log('🧪 Testando gráfico de cidades...');
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('cidadesChart');
    if (!ctx) {
        console.error('❌ Canvas cidadesChart não encontrado');
        return;
    }
    
    console.log('✅ Canvas encontrado, criando gráfico...');
    createCidadesCombinedChart();
};

// Função para testar o gráfico de HP por projeto
window.testHpProjetosChart = function() {
    console.log('🧪 Testando gráfico de HP por projeto...');
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('hpProjetosChart');
    if (!ctx) {
        console.error('❌ Canvas hpProjetosChart não encontrado');
        return;
    }
    
    console.log('✅ Canvas encontrado, criando gráfico...');
    createHpProjetosBarChart();
};

// Função para testar o gráfico de supervisores por status
window.testRecebimentosChart = function() {
    console.log('🧪 Testando gráfico de recebimentos por mês...');
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('recebimentosChart');
    if (!ctx) {
        console.error('❌ Canvas recebimentosChart não encontrado');
        return;
    }
    
    console.log('✅ Canvas encontrado, criando gráfico...');
    createRecebimentosBarChart();
};

// Função para testar o gráfico de supervisores por status
window.testSupervisorStatusChart = function() {
    console.log('🧪 Testando gráfico de supervisores por status...');
    
    // Verificar se o canvas existe
    const ctx = document.getElementById('supervisorStatusChart');
    if (!ctx) {
        console.error('❌ Canvas supervisorStatusChart não encontrado');
        return;
    }
    
    console.log('✅ Canvas encontrado, criando gráfico...');
    createSupervisorStatusBarChart();
    console.log('🎨 Cores aplicadas: PRODUTIVA (azul), IMPRODUTIVA (vermelho)');
};

// ========== TABELA DE RANKING DAS EQUIPES ==========

// Gerar ranking das equipes por tipo de ação
function generateEquipeRanking() {
    console.log('🏆 Gerando ranking das equipes...');
    
    const equipeData = {};
    let totalAtivacao = 0;
    let totalConstrucao = 0;
    let totalVistoria = 0;
    let totalGeral = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let equipeCol = null;
        let tipoAcaoCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            equipeCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'EQUIPE'
            );
            tipoAcaoCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'TIPO DE AÇÃO' || 
                         field.trim().toUpperCase() === 'TIPO DE AÇAO'
            );
        }

        if (equipeCol && tipoAcaoCol) {
            dynamicTableData.data.forEach(row => {
                const equipe = row[equipeCol]?.toString().trim();
                const tipoAcao = row[tipoAcaoCol]?.toString().trim();
                
                if (equipe && equipe !== '' && tipoAcao && tipoAcao !== '') {
                    // Normalizar tipo de ação
                    const tipoAcaoNormalizado = tipoAcao.toUpperCase();
                    
                    if (!equipeData[equipe]) {
                        equipeData[equipe] = {
                            ATIVACAO: 0,
                            CONSTRUCAO: 0,
                            VISTORIA: 0,
                            total: 0
                        };
                    }
                    
                    if (tipoAcaoNormalizado === 'ATIVAÇÃO' || tipoAcaoNormalizado === 'ATIVACAO') {
                        equipeData[equipe].ATIVACAO++;
                        totalAtivacao++;
                    } else if (tipoAcaoNormalizado === 'CONSTRUÇÃO' || tipoAcaoNormalizado === 'CONSTRUCAO') {
                        equipeData[equipe].CONSTRUCAO++;
                        totalConstrucao++;
                    } else if (tipoAcaoNormalizado === 'VISTORIA') {
                        equipeData[equipe].VISTORIA++;
                        totalVistoria++;
                    }
                    
                    equipeData[equipe].total++;
                    totalGeral++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalGeral === 0 || Object.keys(equipeData).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração do ranking...');
        equipeData['CARLOS RODRIGO'] = { ATIVACAO: 0, CONSTRUCAO: 1, VISTORIA: 158, total: 159 };
        equipeData['GABRIEL MENDES'] = { ATIVACAO: 0, CONSTRUCAO: 1, VISTORIA: 150, total: 151 };
        equipeData['LAZARO ANTONIO'] = { ATIVACAO: 0, CONSTRUCAO: 0, VISTORIA: 100, total: 100 };
        equipeData['PAULO IVO'] = { ATIVACAO: 0, CONSTRUCAO: 14, VISTORIA: 16, total: 30 };
        equipeData['N ALFA'] = { ATIVACAO: 3, CONSTRUCAO: 16, VISTORIA: 15, total: 34 };
        equipeData['DENILSON MOREIRA'] = { ATIVACAO: 22, CONSTRUCAO: 16, VISTORIA: 11, total: 49 };
        equipeData['JOSE VITOR'] = { ATIVACAO: 2, CONSTRUCAO: 18, VISTORIA: 6, total: 26 };
        equipeData['ASDS TELECOM'] = { ATIVACAO: 0, CONSTRUCAO: 6, VISTORIA: 5, total: 11 };
        equipeData['ELTON BISPO'] = { ATIVACAO: 0, CONSTRUCAO: 11, VISTORIA: 4, total: 15 };
        equipeData['MANOEL ROBERTO'] = { ATIVACAO: 6, CONSTRUCAO: 9, VISTORIA: 4, total: 19 };
        equipeData['IAN SAMPAIO'] = { ATIVACAO: 11, CONSTRUCAO: 11, VISTORIA: 3, total: 25 };
        equipeData['EDIVAL SANTIAGO'] = { ATIVACAO: 16, CONSTRUCAO: 10, VISTORIA: 3, total: 29 };
        equipeData['ALISSON SILAS'] = { ATIVACAO: 1, CONSTRUCAO: 15, VISTORIA: 3, total: 19 };
        equipeData['WILLIAMS MORAES'] = { ATIVACAO: 6, CONSTRUCAO: 7, VISTORIA: 3, total: 16 };
        equipeData['LUIS RICARDO'] = { ATIVACAO: 20, CONSTRUCAO: 7, VISTORIA: 2, total: 29 };
        equipeData['RONALDO NEVES'] = { ATIVACAO: 11, CONSTRUCAO: 11, VISTORIA: 2, total: 24 };
        equipeData['VENANCIO GOMES'] = { ATIVACAO: 0, CONSTRUCAO: 2, VISTORIA: 2, total: 4 };
        equipeData['TIAGO DOS SANTOS'] = { ATIVACAO: 10, CONSTRUCAO: 11, VISTORIA: 2, total: 23 };
        equipeData['RAFAEL SOUZA'] = { ATIVACAO: 3, CONSTRUCAO: 3, VISTORIA: 1, total: 7 };
        equipeData['JOSE MARCOS'] = { ATIVACAO: 0, CONSTRUCAO: 0, VISTORIA: 1, total: 1 };
        equipeData['DIEGO GUEDES'] = { ATIVACAO: 8, CONSTRUCAO: 9, VISTORIA: 1, total: 18 };
        equipeData['HELDER MACHADO'] = { ATIVACAO: 0, CONSTRUCAO: 7, VISTORIA: 1, total: 8 };
        equipeData['ELIOMAR MAIA'] = { ATIVACAO: 10, CONSTRUCAO: 10, VISTORIA: 1, total: 21 };
        equipeData['ROBERIO ALMEIDA'] = { ATIVACAO: 0, CONSTRUCAO: 3, VISTORIA: 0, total: 3 };
        equipeData['WALTER BISPO'] = { ATIVACAO: 1, CONSTRUCAO: 1, VISTORIA: 0, total: 2 };
        
        totalAtivacao = 130;
        totalConstrucao = 199;
        totalVistoria = 494;
        totalGeral = 823;
    }

    // Ordenar equipes por total (ranking)
    const equipesOrdenadas = Object.entries(equipeData)
        .sort(([,a], [,b]) => b.total - a.total)
        .map(([equipe, dados], index) => ({
            ranking: index + 1,
            equipe,
            ...dados
        }));

    return {
        equipes: equipesOrdenadas,
        totais: {
            ativacao: totalAtivacao,
            construcao: totalConstrucao,
            vistoria: totalVistoria,
            geral: totalGeral
        }
    };
}

// Renderizar tabela de ranking das equipes
function renderEquipeRanking() {
    console.log('📊 Renderizando tabela de ranking das equipes...');
    
    const rankingData = generateEquipeRanking();
    const tableBody = document.getElementById('equipeRankingTableBody');
    
    if (!tableBody) {
        console.error('❌ Tabela de ranking não encontrada');
        return;
    }

    // Limpar tabela
    tableBody.innerHTML = '';

    // Adicionar linhas das equipes
    rankingData.equipes.forEach((equipe, index) => {
        const row = document.createElement('tr');
        
        // Adicionar classe para as 3 primeiras posições
        if (index === 0) row.classList.add('gold');
        else if (index === 1) row.classList.add('silver');
        else if (index === 2) row.classList.add('bronze');
        
        row.innerHTML = `
            <td>${equipe.ranking}</td>
            <td>${equipe.equipe}</td>
            <td>${equipe.ATIVACAO.toLocaleString()}</td>
            <td>${equipe.CONSTRUCAO.toLocaleString()}</td>
            <td>${equipe.VISTORIA.toLocaleString()}</td>
            <td><strong>${equipe.total.toLocaleString()}</strong></td>
        `;
        
        tableBody.appendChild(row);
    });

    // Atualizar totais
    document.getElementById('totalAtivacao').textContent = rankingData.totais.ativacao.toLocaleString();
    document.getElementById('totalConstrucao').textContent = rankingData.totais.construcao.toLocaleString();
    document.getElementById('totalVistoria').textContent = rankingData.totais.vistoria.toLocaleString();
    document.getElementById('totalGeral').textContent = rankingData.totais.geral.toLocaleString();

    console.log('✅ Tabela de ranking renderizada com sucesso');
    console.log('📊 Dados do ranking:', rankingData);
}

// Atualizar ranking das equipes
function refreshEquipeRanking() {
    console.log('🔄 Atualizando ranking das equipes...');
    renderEquipeRanking();
    showSuccess('Ranking Atualizado!', 'O ranking das equipes foi atualizado com sucesso!');
}

// Exportar ranking das equipes
function exportEquipeRanking() {
    console.log('📤 Exportando ranking das equipes...');
    
    const rankingData = generateEquipeRanking();
    
    // Criar CSV
    let csv = 'Ranking,Equipe,ATIVAÇÃO,CONSTRUÇÃO,VISTORIA,Total Geral\n';
    
    rankingData.equipes.forEach(equipe => {
        csv += `${equipe.ranking},"${equipe.equipe}",${equipe.ATIVACAO},${equipe.CONSTRUCAO},${equipe.VISTORIA},${equipe.total}\n`;
    });
    
    csv += `,"Total Geral",${rankingData.totais.ativacao},${rankingData.totais.construcao},${rankingData.totais.vistoria},${rankingData.totais.geral}\n`;
    
    // Download do arquivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ranking_equipes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Exportação Concluída!', 'O ranking foi exportado em formato CSV!');
}

// Função para testar o ranking das equipes
window.testEquipeRanking = function() {
    console.log('🧪 Testando ranking das equipes...');
    renderEquipeRanking();
    console.log('✅ Ranking das equipes testado com sucesso');
};

// Função para testar a tabela "Por Tipo de Ação"
window.testTipoAcaoTable = function() {
    console.log('🧪 Testando tabela "Por Tipo de Ação"...');
    
    // Verificar se a tabela existe
    const tableBody = document.getElementById('equipeRankingTableBody');
    if (!tableBody) {
        console.error('❌ Tabela "Por Tipo de Ação" não encontrada');
        return;
    }
    
    console.log('✅ Tabela encontrada, testando atualização...');
    
    // Testar com dados de exemplo
    const testData = [
        { 'EQUIPE': 'JESSICA', 'TIPO DE AÇÃO': 'ATIVAÇÃO' },
        { 'EQUIPE': 'JESSICA', 'TIPO DE AÇÃO': 'ATIVAÇÃO' },
        { 'EQUIPE': 'ASDS TELECOM', 'TIPO DE AÇÃO': 'CONSTRUÇÃO' },
        { 'EQUIPE': 'N ALFA', 'TIPO DE AÇÃO': 'VISTORIA' }
    ];
    
    const columnNames = {
        'EQUIPE': 'EQUIPE',
        'TIPO DE AÇÃO': 'TIPO DE AÇÃO'
    };
    
    updateTipoAcaoTable(testData, columnNames);
    console.log('✅ Teste da tabela "Por Tipo de Ação" concluído');
};

// Função para testar o filtro de Período de Recebimento
window.testDataRecebimentoFilter = function() {
    console.log('🧪 Testando filtro de Período de Recebimento...');
    
    // Verificar se os filtros existem
    const dataInicioElement = document.getElementById('infraFilterDataInicio');
    const dataFimElement = document.getElementById('infraFilterDataFim');
    
    if (!dataInicioElement || !dataFimElement) {
        console.error('❌ Filtros de Período de Recebimento não encontrados');
        return;
    }
    
    console.log('✅ Filtros encontrados, testando funcionalidade...');
    
    // Verificar se há dados na tabela dinâmica
    if (!dynamicTableData || !dynamicTableData.data || dynamicTableData.data.length === 0) {
        console.warn('⚠️ Nenhum dado na tabela dinâmica para testar');
        return;
    }
    
    // Simular preenchimento de datas
    const hoje = new Date();
    const umaSemanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    dataInicioElement.value = umaSemanaAtras.toISOString().split('T')[0];
    dataFimElement.value = hoje.toISOString().split('T')[0];
    
    console.log('📅 Datas de teste definidas:', {
        'Data Início': dataInicioElement.value,
        'Data Fim': dataFimElement.value
    });
    
    // Aplicar filtros
    applyInfraFilters();
    
    console.log('✅ Teste do filtro de Período de Recebimento concluído');
};

// Função para demonstrar o filtro de período
window.demonstrarFiltroPeriodo = function() {
    console.log('🎯 Demonstrando filtro de Período de Recebimento...');
    
    // Verificar se os filtros existem
    const dataInicioElement = document.getElementById('infraFilterDataInicio');
    const dataFimElement = document.getElementById('infraFilterDataFim');
    
    if (!dataInicioElement || !dataFimElement) {
        console.error('❌ Filtros de Período de Recebimento não encontrados');
        return;
    }
    
    // Definir diferentes períodos para demonstração
    const periodos = [
        {
            nome: 'Última semana',
            inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            fim: new Date()
        },
        {
            nome: 'Último mês',
            inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            fim: new Date()
        },
        {
            nome: 'Últimos 3 meses',
            inicio: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            fim: new Date()
        }
    ];
    
    let periodoIndex = 0;
    
    function aplicarProximoPeriodo() {
        if (periodoIndex >= periodos.length) {
            // Limpar filtros
            dataInicioElement.value = '';
            dataFimElement.value = '';
            applyInfraFilters();
            console.log('✅ Demonstração concluída - filtros limpos');
            return;
        }
        
        const periodo = periodos[periodoIndex];
        
        dataInicioElement.value = periodo.inicio.toISOString().split('T')[0];
        dataFimElement.value = periodo.fim.toISOString().split('T')[0];
        
        console.log(`📅 Aplicando período: ${periodo.nome}`, {
            'Data Início': dataInicioElement.value,
            'Data Fim': dataFimElement.value
        });
        
        applyInfraFilters();
        
        periodoIndex++;
        
        // Aplicar próximo período após 3 segundos
        setTimeout(aplicarProximoPeriodo, 3000);
    }
    
    // Iniciar demonstração
    aplicarProximoPeriodo();
};

// Função para testar o card de Tempo Médio de Execução
window.testTempoMedioCard = function() {
    console.log('🧪 Testando card de Tempo Médio de Execução...');
    
    // Verificar se o card existe
    const cardElement = document.getElementById('infraStatTempoMedio');
    if (!cardElement) {
        console.error('❌ Card de Tempo Médio não encontrado');
        return;
    }
    
    console.log('✅ Card encontrado, testando cálculo...');
    
    // Verificar se há dados na tabela dinâmica
    if (!dynamicTableData || !dynamicTableData.data || dynamicTableData.data.length === 0) {
        console.warn('⚠️ Nenhum dado na tabela dinâmica');
        console.log('📋 Status da tabela dinâmica:', {
            existe: !!dynamicTableData,
            temData: !!(dynamicTableData && dynamicTableData.data),
            quantidade: dynamicTableData?.data?.length || 0
        });
        return;
    }
    
    // Verificar headers
    console.log('📋 Headers da tabela dinâmica:', dynamicTableData.headers);
    
    // Testar cálculo
    const resultado = calculateTempoMedioExecucao(null);
    
    console.log('📊 Resultado do cálculo:', resultado);
    console.log('✅ Teste do card de Tempo Médio concluído');
};

// Função para forçar atualização do card com dados de exemplo
window.forceUpdateTempoMedio = function() {
    console.log('🔄 Forçando atualização do card de Tempo Médio...');
    
    // Verificar se o card existe
    const cardElement = document.getElementById('infraStatTempoMedio');
    if (!cardElement) {
        console.error('❌ Card de Tempo Médio não encontrado');
        return;
    }
    
    // Se não há dados, usar dados de exemplo
    if (!dynamicTableData || !dynamicTableData.data || dynamicTableData.data.length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração...');
        
        // Criar dados de exemplo
        const dadosExemplo = [
            {
                'DATA RECEBIMENTO': '01/01/2024',
                'DATA FINAL': '15/01/2024'
            },
            {
                'DATA RECEBIMENTO': '05/01/2024',
                'DATA FINAL': '20/01/2024'
            },
            {
                'DATA RECEBIMENTO': '10/01/2024',
                'DATA FINAL': '25/01/2024'
            }
        ];
        
        // Salvar dados originais
        const dadosOriginais = dynamicTableData;
        
        // Usar dados de exemplo
        dynamicTableData = {
            data: dadosExemplo,
            headers: ['DATA RECEBIMENTO', 'DATA FINAL']
        };
        
        // Calcular
        const resultado = calculateTempoMedioExecucao(dadosExemplo);
        
        // Restaurar dados originais
        dynamicTableData = dadosOriginais;
        
        console.log('📊 Resultado com dados de exemplo:', resultado);
        return;
    }
    
    // Se há dados, calcular normalmente
    const resultado = calculateTempoMedioExecucao(dynamicTableData.data);
    console.log('📊 Resultado com dados reais:', resultado);
};

// Função para forçar atualização imediata das estatísticas
window.forceUpdateStats = function() {
    console.log('🔄 Forçando atualização imediata das estatísticas...');
    
    // Verificar se estamos na seção de infraestrutura
    const infraSection = document.getElementById('infraestrutura');
    if (!infraSection) {
        console.error('❌ Seção de infraestrutura não encontrada');
        return;
    }
    
    // Forçar atualização das estatísticas
    updateInfraStats();
    
    console.log('✅ Atualização forçada concluída');
};

// Função para testar o card com filtros
window.testTempoMedioComFiltros = function() {
    console.log('🧪 Testando card de Tempo Médio com filtros...');
    
    // Verificar se o card existe
    const cardElement = document.getElementById('infraStatTempoMedio');
    if (!cardElement) {
        console.error('❌ Card de Tempo Médio não encontrado');
        return;
    }
    
    // Simular dados filtrados
    const dadosFiltrados = [
        {
            'DATA RECEBIMENTO': '01/01/2024',
            'DATA FINAL': '10/01/2024'
        },
        {
            'DATA RECEBIMENTO': '05/01/2024',
            'DATA FINAL': '15/01/2024'
        }
    ];
    
    console.log('📊 Testando com dados filtrados:', dadosFiltrados);
    
    // Calcular com dados filtrados
    const resultadoFiltrado = calculateTempoMedioExecucao(dadosFiltrados);
    console.log('📊 Resultado com dados filtrados:', resultadoFiltrado);
    
    // Calcular com todos os dados
    const resultadoTotal = calculateTempoMedioExecucao(null);
    console.log('📊 Resultado com todos os dados:', resultadoTotal);
    
    console.log('✅ Teste com filtros concluído');
};

// Função para demonstrar o card respondendo aos filtros
window.demonstrarFiltrosTempoMedio = function() {
    console.log('🎯 Demonstrando card de Tempo Médio respondendo aos filtros...');
    
    // Verificar se estamos na seção de infraestrutura
    const infraSection = document.getElementById('infraestrutura');
    if (!infraSection || !infraSection.classList.contains('active')) {
        console.error('❌ Seção de infraestrutura não está ativa. Navegue para Dashboard primeiro.');
        return;
    }
    
    // Verificar se há dados
    if (!dynamicTableData || !dynamicTableData.data || dynamicTableData.data.length === 0) {
        console.warn('⚠️ Nenhum dado disponível para demonstrar filtros');
        return;
    }
    
    console.log('📊 Dados disponíveis:', dynamicTableData.data.length, 'registros');
    
    // Simular aplicação de filtros
    console.log('🔍 Simulando filtros...');
    
    // Filtro 1: Primeiros 10 registros
    const filtro1 = dynamicTableData.data.slice(0, 10);
    console.log('📊 Filtro 1: Primeiros 10 registros');
    calculateTempoMedioExecucao(filtro1);
    
    // Aguardar 2 segundos
    setTimeout(() => {
        // Filtro 2: Últimos 10 registros
        const filtro2 = dynamicTableData.data.slice(-10);
        console.log('📊 Filtro 2: Últimos 10 registros');
        calculateTempoMedioExecucao(filtro2);
        
        // Aguardar 2 segundos
        setTimeout(() => {
            // Sem filtros: todos os dados
            console.log('📊 Sem filtros: todos os dados');
            calculateTempoMedioExecucao(null);
            
            console.log('✅ Demonstração concluída');
        }, 2000);
    }, 2000);
};

// Função para testar a tabela "Por Status"
window.testStatusTable = function() {
    console.log('🧪 Testando tabela "Por Status"...');
    
    // Verificar se a tabela existe
    const tableBody = document.getElementById('equipeStatusRankingTableBody');
    if (!tableBody) {
        console.error('❌ Tabela "Por Status" não encontrada');
        return;
    }
    
    console.log('✅ Tabela encontrada, testando atualização...');
    
    // Testar com dados de exemplo
    const testData = [
        { 'EQUIPE': 'JESSICA', 'STATUS': 'PRODUTIVA' },
        { 'EQUIPE': 'JESSICA', 'STATUS': 'PRODUTIVA' },
        { 'EQUIPE': 'ASDS TELECOM', 'STATUS': 'IMPRODUTIVA' },
        { 'EQUIPE': 'N ALFA', 'STATUS': 'PRODUTIVA' },
        { 'EQUIPE': 'N ALFA', 'STATUS': 'IMPRODUTIVA' }
    ];
    
    const columnNames = {
        'EQUIPE': 'EQUIPE',
        'STATUS': 'STATUS'
    };
    
    updateStatusTable(testData, columnNames);
    console.log('✅ Teste da tabela "Por Status" concluído');
};

// ========== TABELA DE RANKING DAS EQUIPES POR STATUS ==========

// Gerar ranking das equipes por status
function generateEquipeStatusRanking() {
    console.log('🏆 Gerando ranking das equipes por status...');
    
    const equipeStatusData = {};
    let totalProdutiva = 0;
    let totalImprodutiva = 0;
    let totalGeral = 0;

    if (dynamicTableData && Array.isArray(dynamicTableData.data)) {
        // Descobrir os nomes exatos das colunas (case-insensitive)
        let equipeCol = null;
        let statusCol = null;
        
        if (dynamicTableData.data.length > 0) {
            const firstRow = dynamicTableData.data[0];
            equipeCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'EQUIPE'
            );
            statusCol = Object.keys(firstRow).find(
                field => field.trim().toUpperCase() === 'STATUS'
            );
        }

        if (equipeCol && statusCol) {
            dynamicTableData.data.forEach(row => {
                const equipe = row[equipeCol]?.toString().trim();
                const status = row[statusCol]?.toString().trim();
                
                if (equipe && equipe !== '' && status && status !== '') {
                    // Normalizar status
                    const statusNormalizado = status.toUpperCase();
                    
                    if (!equipeStatusData[equipe]) {
                        equipeStatusData[equipe] = {
                            PRODUTIVA: 0,
                            IMPRODUTIVA: 0,
                            total: 0
                        };
                    }
                    
                    if (statusNormalizado === 'PRODUTIVA') {
                        equipeStatusData[equipe].PRODUTIVA++;
                        totalProdutiva++;
                    } else if (statusNormalizado === 'IMPRODUTIVA') {
                        equipeStatusData[equipe].IMPRODUTIVA++;
                        totalImprodutiva++;
                    }
                    
                    equipeStatusData[equipe].total++;
                    totalGeral++;
                }
            });
        }
    }

    // Se não há dados suficientes, usar dados de exemplo para demonstração
    if (totalGeral === 0 || Object.keys(equipeStatusData).length === 0) {
        console.log('📊 Usando dados de exemplo para demonstração do ranking por status...');
        equipeStatusData['EQUIPE A'] = { PRODUTIVA: 85, IMPRODUTIVA: 15, total: 100 };
        equipeStatusData['EQUIPE B'] = { PRODUTIVA: 92, IMPRODUTIVA: 8, total: 100 };
        equipeStatusData['EQUIPE C'] = { PRODUTIVA: 78, IMPRODUTIVA: 22, total: 100 };
        equipeStatusData['EQUIPE D'] = { PRODUTIVA: 95, IMPRODUTIVA: 5, total: 100 };
        equipeStatusData['EQUIPE E'] = { PRODUTIVA: 70, IMPRODUTIVA: 30, total: 100 };
        equipeStatusData['EQUIPE F'] = { PRODUTIVA: 88, IMPRODUTIVA: 12, total: 100 };
        equipeStatusData['EQUIPE G'] = { PRODUTIVA: 65, IMPRODUTIVA: 35, total: 100 };
        equipeStatusData['EQUIPE H'] = { PRODUTIVA: 82, IMPRODUTIVA: 18, total: 100 };
        equipeStatusData['EQUIPE I'] = { PRODUTIVA: 90, IMPRODUTIVA: 10, total: 100 };
        equipeStatusData['EQUIPE J'] = { PRODUTIVA: 75, IMPRODUTIVA: 25, total: 100 };
        
        totalProdutiva = 820;
        totalImprodutiva = 180;
        totalGeral = 1000;
    }

    // Calcular percentual de produtividade e ordenar
    const equipesOrdenadas = Object.entries(equipeStatusData)
        .map(([equipe, dados]) => {
            const percentual = dados.total > 0 ? (dados.PRODUTIVA / dados.total) * 100 : 0;
            return {
                equipe,
                ...dados,
                percentual: percentual.toFixed(1)
            };
        })
        .sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual))
        .map((equipe, index) => ({
            ranking: index + 1,
            ...equipe
        }));

    return {
        equipes: equipesOrdenadas,
        totais: {
            produtiva: totalProdutiva,
            improdutiva: totalImprodutiva,
            geral: totalGeral,
            percentual: totalGeral > 0 ? ((totalProdutiva / totalGeral) * 100).toFixed(1) : 0
        }
    };
}

// Função para determinar a classe do badge de produtividade
function getProdutividadeClass(percentual) {
    const percent = parseFloat(percentual);
    if (percent >= 90) return 'excelente';
    if (percent >= 80) return 'boa';
    if (percent >= 70) return 'regular';
    return 'baixa';
}

// Renderizar tabela de ranking das equipes por status
function renderEquipeStatusRanking() {
    console.log('📊 Renderizando tabela de ranking das equipes por status...');
    
    const rankingData = generateEquipeStatusRanking();
    const tableBody = document.getElementById('equipeStatusRankingTableBody');
    
    if (!tableBody) {
        console.error('❌ Tabela de ranking por status não encontrada');
        return;
    }

    // Limpar tabela
    tableBody.innerHTML = '';

    // Adicionar linhas das equipes
    rankingData.equipes.forEach((equipe, index) => {
        const row = document.createElement('tr');
        
        // Adicionar classe para as 3 primeiras posições
        if (index === 0) row.classList.add('gold');
        else if (index === 1) row.classList.add('silver');
        else if (index === 2) row.classList.add('bronze');
        
        const produtividadeClass = getProdutividadeClass(equipe.percentual);
        
        row.innerHTML = `
            <td>${equipe.ranking}</td>
            <td>${equipe.equipe}</td>
            <td class="produtiva">${equipe.PRODUTIVA.toLocaleString()}</td>
            <td class="improdutiva">${equipe.IMPRODUTIVA.toLocaleString()}</td>
            <td class="total"><strong>${equipe.total.toLocaleString()}</strong></td>
            <td>
                <span class="produtividade-badge ${produtividadeClass}">
                    ${equipe.percentual}%
                </span>
            </td>
        `;
        
        tableBody.appendChild(row);
    });

    // Atualizar totais
    document.getElementById('totalProdutiva').textContent = rankingData.totais.produtiva.toLocaleString();
    document.getElementById('totalImprodutiva').textContent = rankingData.totais.improdutiva.toLocaleString();
    document.getElementById('totalStatusGeral').textContent = rankingData.totais.geral.toLocaleString();
    document.getElementById('totalProdutividade').textContent = rankingData.totais.percentual + '%';

    console.log('✅ Tabela de ranking por status renderizada com sucesso');
    console.log('📊 Dados do ranking por status:', rankingData);
}

// Atualizar ranking das equipes por status
function refreshEquipeStatusRanking() {
    console.log('🔄 Atualizando ranking das equipes por status...');
    renderEquipeStatusRanking();
    showSuccess('Ranking Atualizado!', 'O ranking das equipes por status foi atualizado com sucesso!');
}

// Exportar ranking das equipes por status
function exportEquipeStatusRanking() {
    console.log('📤 Exportando ranking das equipes por status...');
    
    const rankingData = generateEquipeStatusRanking();
    
    // Criar CSV
    let csv = 'Ranking,Equipe,PRODUTIVA,IMPRODUTIVA,Total,Produtividade (%)\n';
    
    rankingData.equipes.forEach(equipe => {
        csv += `${equipe.ranking},"${equipe.equipe}",${equipe.PRODUTIVA},${equipe.IMPRODUTIVA},${equipe.total},${equipe.percentual}\n`;
    });
    
    csv += `,"Total Geral",${rankingData.totais.produtiva},${rankingData.totais.improdutiva},${rankingData.totais.geral},${rankingData.totais.percentual}\n`;
    
    // Download do arquivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ranking_equipes_status_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccess('Exportação Concluída!', 'O ranking por status foi exportado em formato CSV!');
}

// Função para testar o ranking das equipes por status
window.testEquipeStatusRanking = function() {
    console.log('🧪 Testando ranking das equipes por status...');
    renderEquipeStatusRanking();
    console.log('✅ Ranking das equipes por status testado com sucesso');
};

// ========== FIM DO SISTEMA DINÂMICO ==========
// Função para testar e resolver o problema do tipo de ação
window.testarEResolverTipoAcao = async function() {
    console.log('🧪 Testando e resolvendo problema do "TIPO DE AÇÃO"...');
    
    // 1. Verificar dados da planilha
    console.log('📊 Dados da planilha dinâmica:');
    console.log('  - Headers:', dynamicTableData.headers);
    console.log('  - Quantidade de registros:', dynamicTableData.data.length);
    
    if (dynamicTableData.data.length > 0) {
        console.log('  - Primeira linha:', dynamicTableData.data[0]);
    }
    
    // 2. Procurar especificamente por "TIPO DE AÇÃO"
    const headers = dynamicTableData.headers || [];
    const tipoAcaoExato = headers.find(header => header === 'TIPO DE AÇÃO');
    const tipoAcaoVariacoes = headers.filter(header => 
        header.toUpperCase().includes('TIPO DE AÇÃO') || 
        header.toUpperCase().includes('TIPO DE AÇAO')
    );
    
    console.log('🔍 Resultado da busca:');
    console.log('  - "TIPO DE AÇÃO" exato:', tipoAcaoExato);
    console.log('  - Variações encontradas:', tipoAcaoVariacoes);
    
    // 3. Se encontrou, extrair dados
    if (tipoAcaoExato || tipoAcaoVariacoes.length > 0) {
        const headerCorreto = tipoAcaoExato || tipoAcaoVariacoes[0];
        console.log('✅ Header encontrado:', headerCorreto);
        
        // Extrair valores únicos
        const tiposAcaoPlanilha = new Set();
        dynamicTableData.data.forEach(row => {
            const tipoAcao = row[headerCorreto];
            if (tipoAcao && tipoAcao.toString().trim() !== '') {
                tiposAcaoPlanilha.add(tipoAcao.toString().trim());
            }
        });
        
        console.log('📊 Tipos de ação encontrados:', Array.from(tiposAcaoPlanilha));
        
        // 4. Verificar gestão atual
        console.log('📊 Gestão atual:');
        console.log('  - Tipos de ação na gestão:', gestaoData.tiposAcao ? gestaoData.tiposAcao.length : 0);
        console.log('  - Nomes na gestão:', gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : []);
        
        // 5. Adicionar novos tipos
        let novosAdicionados = 0;
        tiposAcaoPlanilha.forEach(tipo => {
            const tiposExistentes = gestaoData.tiposAcao ? gestaoData.tiposAcao.map(ta => ta.nome) : [];
            if (!tiposExistentes.includes(tipo)) {
                const novoTipo = {
                    id: Date.now() + Math.random(),
                    nome: tipo,
                    descricao: `Tipo de ação extraído da planilha: ${tipo}`,
                    categoria: 'Dinâmico',
                    status: 'ATIVO',
                    created_at: new Date().toISOString()
                };
                
                if (!gestaoData.tiposAcao) {
                    gestaoData.tiposAcao = [];
                }
                
                gestaoData.tiposAcao.push(novoTipo);
                novosAdicionados++;
                console.log(`✅ Adicionado: ${tipo}`);
            }
        });
        
        // 6. Salvar e recarregar
        await salvarDadosFirestore('gestaoData', gestaoData);
        loadActionTypesTable();
        
        console.log(`🎉 Concluído! ${novosAdicionados} novos tipos adicionados.`);
        
        // 7. Testar formulário
        setTimeout(() => {
            abrirNovoEndereco();
        }, 500);
        
    } else {
        console.log('❌ Nenhuma variação de "TIPO DE AÇÃO" encontrada');
        console.log('📊 Headers disponíveis:', headers);
    }
    };
    
    // Função para forçar sincronização dos tipos de ação da tabela dinâmica
    window.forcarSincronizacaoTiposAcaoGestao = async function() {
        console.log('🔧 Forçando sincronização dos tipos de ação na gestão...');
        
        // 1. Verificar dados da tabela dinâmica
        console.log('📊 Dados da tabela dinâmica:');
        console.log('  - Headers:', dynamicTableData.headers);
        console.log('  - Quantidade de registros:', dynamicTableData.data.length);
        
        if (dynamicTableData.data.length === 0) {
            console.log('❌ Nenhum dado encontrado na tabela dinâmica');
            return;
        }
        
        // 2. Encontrar coluna "TIPO DE AÇÃO"
        const headers = dynamicTableData.headers || [];
        const tipoAcaoHeader = headers.find(header => 
            header.toUpperCase().includes('TIPO DE AÇÃO') || 
            header.toUpperCase().includes('TIPO DE AÇAO')
        );
        
        if (!tipoAcaoHeader) {
            console.log('❌ Coluna "TIPO DE AÇÃO" não encontrada');
            console.log('📊 Headers disponíveis:', headers);
            return;
        }
        
        console.log('✅ Coluna encontrada:', tipoAcaoHeader);
        
        // 3. Extrair tipos de ação únicos
        const tiposAcaoPlanilha = new Set();
        dynamicTableData.data.forEach(row => {
            const tipoAcao = row[tipoAcaoHeader];
            if (tipoAcao && tipoAcao.toString().trim() !== '') {
                tiposAcaoPlanilha.add(tipoAcao.toString().trim());
            }
        });
        
        console.log('📊 Tipos de ação encontrados na planilha:', Array.from(tiposAcaoPlanilha));
        
        // 4. Criar array de tipos de ação para gestão
        const tiposAcaoGestao = Array.from(tiposAcaoPlanilha).map((nome, index) => ({
            id: Date.now() + index + Math.random(),
            nome: nome,
            descricao: `Tipo de ação extraído da planilha dinâmica: ${nome}`,
            categoria: 'Dinâmico',
            status: 'ATIVO',
            created_at: new Date().toISOString(),
            source: 'dynamic'
        }));
        
        // 5. Atualizar gestaoData
        gestaoData.tiposAcao = tiposAcaoGestao;
        await salvarDadosFirestore('gestaoData', gestaoData);
        
        console.log('✅ gestaoData.tiposAcao atualizado:', tiposAcaoGestao);
        
        // 6. Recarregar tabela da gestão
        loadActionTypesTable();
        
        console.log('🎉 Sincronização concluída! Tabela da gestão atualizada.');
        
        // 7. Abrir formulário para testar
        setTimeout(() => {
            abrirNovoEndereco();
        }, 500);
    };
    
    console.log('✅ Script completo carregado com persistência e estatísticas');
    
    // Função para limpar cache e recarregar
    window.limparCacheERecarregar = function() {
        console.log('🧹 Limpando cache e recarregando página...');
        
        // Limpar localStorage se necessário
        // localStorage.clear();
        
        // Forçar recarregamento da página
        window.location.reload(true);
    };
    
    // Função para verificar sintaxe do JavaScript
    window.verificarSintaxe = function() {
        console.log('🔍 Verificando sintaxe do JavaScript...');
        
        try {
            // Testar se as funções principais estão definidas
            const funcoesTeste = [
                'showSection',
                'loadGestaoTables',
                'deleteActionType',
                'gestaoData',
                'dynamicTableData'
            ];
            
            funcoesTeste.forEach(funcao => {
                if (typeof window[funcao] === 'undefined') {
                    console.log(`❌ Função ${funcao} não está definida`);
                } else {
                    console.log(`✅ Função ${funcao} está definida`);
                }
            });
            
            // Testar se os dados estão carregados
            console.log('📊 Verificando dados:');
            console.log('  - gestaoData:', gestaoData ? 'Carregado' : 'Não carregado');
            console.log('  - dynamicTableData:', dynamicTableData ? 'Carregado' : 'Não carregado');
            
        } catch (error) {
            console.error('❌ Erro na verificação:', error);
        }
    };

// Função de teste para verificar paginação
function testPagination() {
    console.log('🧪 Testando paginação...');
    
    try {
        // Verificar configuração
        console.log('📋 Configuração atual:', dynamicTableConfig);
        
        // Verificar dados
        if (!dynamicTableData || !dynamicTableData.data) {
            console.error('❌ Dados não disponíveis');
            alert('Dados não disponíveis para teste');
            return;
        }
        
        console.log('📊 Dados disponíveis:', dynamicTableData.data.length);
        
        // Simular mudança de página
        const currentPage = dynamicTableConfig.currentPage || 1;
        const totalPages = Math.ceil(dynamicTableData.data.length / (dynamicTableConfig.itemsPerPage || 20));
        
        console.log('📄 Página atual:', currentPage, 'Total de páginas:', totalPages);
        
        // Testar mudança para próxima página
        if (currentPage < totalPages) {
            console.log('🔄 Testando mudança para página:', currentPage + 1);
            changeDynamicPage(currentPage + 1);
        } else {
            console.log('🔄 Testando mudança para página: 1');
            changeDynamicPage(1);
        }
        
        console.log('✅ Teste de paginação concluído');
    } catch (error) {
        console.error('❌ Erro no teste de paginação:', error);
        alert('Erro no teste de paginação: ' + error.message);
    }
}

// Função para debug da paginação
function debugPagination() {
    console.log('🔍 Debug da paginação...');
    
    // Verificar se a tabela existe
    const tableContainer = document.getElementById('enderecosTable');
    if (!tableContainer) {
        console.error('❌ Container da tabela não encontrado');
        return;
    }
    
    // Verificar se há botões de paginação
    const paginationButtons = tableContainer.querySelectorAll('.pagination-button');
    console.log('📄 Botões de paginação encontrados:', paginationButtons.length);
    
    // Verificar cada botão
    paginationButtons.forEach((button, index) => {
        console.log(`📄 Botão ${index + 1}:`, {
            text: button.textContent,
            onclick: button.getAttribute('onclick'),
            disabled: button.disabled,
            className: button.className
        });
    });
    
    // Verificar configuração
    console.log('📋 Configuração da tabela:', dynamicTableConfig);
    
    // Verificar dados
    console.log('📊 Dados da tabela:', {
        totalData: dynamicTableData.data.length,
        currentPage: dynamicTableConfig.currentPage,
        itemsPerPage: dynamicTableConfig.itemsPerPage
    });
}

// Função global para encontrar nomes exatos das colunas da tabela dinâmica
function getDynamicTableColumnNames() {
    if (!dynamicTableData || !dynamicTableData.headers) {
        console.warn('⚠️ Tabela dinâmica não disponível para detectar colunas');
        return {};
    }
    
    function findExactColumnName(headers, targetName) {
        const targetLower = targetName.toLowerCase();
        
        // Primeiro, tentar correspondência exata
        const exactMatch = headers.find(header => header.toLowerCase() === targetLower);
        if (exactMatch) {
            console.log(`✅ Correspondência exata encontrada para "${targetName}": "${exactMatch}"`);
            return exactMatch;
        }
        
        // Se não encontrar correspondência exata, tentar correspondência parcial
        const partialMatch = headers.find(header => header.toLowerCase().includes(targetLower));
        if (partialMatch) {
            console.log(`⚠️ Correspondência parcial encontrada para "${targetName}": "${partialMatch}"`);
            return partialMatch;
        }
        
        console.log(`❌ Nenhuma correspondência encontrada para "${targetName}"`);
        console.log(`📋 Headers disponíveis:`, headers);
        return null;
    }
    
    const columnNames = {
        PROJETO: findExactColumnName(dynamicTableData.headers, 'PROJETO'),
        'SUB PROJETO': findExactColumnName(dynamicTableData.headers, 'SUB PROJETO'),
        EQUIPE: findExactColumnName(dynamicTableData.headers, 'EQUIPE'),
        STATUS: findExactColumnName(dynamicTableData.headers, 'STATUS'),
        CIDADE: findExactColumnName(dynamicTableData.headers, 'CIDADE'),
        SUPERVISOR: findExactColumnName(dynamicTableData.headers, 'SUPERVISOR'),
        'TIPO DE AÇÃO': findExactColumnName(dynamicTableData.headers, 'TIPO DE AÇÃO'),
        'DATA INÍCIO': findExactColumnName(dynamicTableData.headers, 'DATA INÍCIO') || findExactColumnName(dynamicTableData.headers, 'DATA INICIO'),
        'DATA RECEBIMENTO': findExactColumnName(dynamicTableData.headers, 'DATA RECEBIMENTO'),
        'DATA FINAL': findExactColumnName(dynamicTableData.headers, 'DATA FINAL'),
        ENDEREÇO: findExactColumnName(dynamicTableData.headers, 'ENDEREÇO')
    };
    
    console.log('🔍 Nomes das colunas detectados:', columnNames);
    return columnNames;
}

// Função para verificar dependências da paginação
function checkPaginationDependencies() {
    console.log('🔍 Verificando dependências da paginação...');
    
    const dependencies = {
        dynamicTableData: !!dynamicTableData,
        dynamicTableConfig: !!dynamicTableConfig,
        applyDynamicFilters: typeof applyDynamicFilters === 'function',
        renderDynamicTable: typeof renderDynamicTable === 'function',
        saveDynamicData: typeof saveDynamicData === 'function',
        showSuccess: typeof showSuccess === 'function',
        showError: typeof showError === 'function'
    };
    
    console.log('📋 Status das dependências:', dependencies);
    
    const missing = Object.entries(dependencies)
        .filter(([name, available]) => !available)
        .map(([name]) => name);
    
    if (missing.length > 0) {
        console.error('❌ Dependências faltando:', missing);
        alert('Dependências faltando: ' + missing.join(', '));
    } else {
        console.log('✅ Todas as dependências estão disponíveis');
    }
    
    return dependencies;
}

// Expor funções de teste globalmente
window.testPagination = testPagination;
window.debugPagination = debugPagination;
window.checkPaginationDependencies = checkPaginationDependencies;
window.getDynamicTableColumnNames = getDynamicTableColumnNames;

// Inicialização já está sendo feita no DOMContentLoaded acima