// Script para forçar inicialização dos dropdowns após populateInfraFilters
console.log('🎯 Inicializador de dropdowns carregado...');

// Interceptar a função populateInfraFilters original
let originalPopulateInfraFilters = null;

// Função para inicializar dropdowns após filtros serem populados
function initializeDropdownsAfterFilters() {
    console.log('🎯 Inicializando dropdowns após populateInfraFilters...');

    // Debug: Verificar se os elementos existem
    const selectElement = document.getElementById('infraFilterProjeto');
    if (selectElement) {
        console.log(
            '📊 Select infraFilterProjeto encontrado com',
            selectElement.options.length,
            'opções'
        );
    } else {
        console.warn('⚠️ Select infraFilterProjeto não encontrado');
        return;
    }

    // Aguardar um momento para garantir que o DOM foi atualizado
    setTimeout(() => {
        if (typeof window.initializeCheckboxDropdownsWhenReady === 'function') {
            console.log('✅ Chamando initializeCheckboxDropdownsWhenReady...');
            window.initializeCheckboxDropdownsWhenReady();
        } else if (typeof initializeCheckboxDropdowns === 'function') {
            console.log('✅ Chamando initializeCheckboxDropdowns diretamente...');
            initializeCheckboxDropdowns();
        } else {
            console.warn('⚠️ Nenhuma função de inicialização encontrada');
        }
    }, 500);
}

// Aguardar até que populateInfraFilters esteja definida
function waitForPopulateInfraFilters() {
    if (typeof window.populateInfraFilters === 'function') {
        console.log('✅ Função populateInfraFilters encontrada, criando interceptador...');

        // Salvar referência da função original
        originalPopulateInfraFilters = window.populateInfraFilters;

        // Substituir por versão interceptada
        window.populateInfraFilters = function (...args) {
            console.log('🔄 Interceptando populateInfraFilters...');

            // Chamar função original
            const result = originalPopulateInfraFilters.apply(this, args);

            // Inicializar dropdowns após filtros serem populados
            initializeDropdownsAfterFilters();

            return result;
        };

        console.log('🎯 Interceptador de populateInfraFilters configurado');
    } else {
        console.log('⏳ populateInfraFilters ainda não definida, tentando novamente...');
        // Tentar novamente em 100ms
        setTimeout(waitForPopulateInfraFilters, 100);
    }
}

// Iniciar processo de espera
waitForPopulateInfraFilters();

// Backup: inicialização quando usuário clica em Dashboard
document.addEventListener('click', function (e) {
    const target = e.target.closest('a');
    if (
        target &&
        (target.textContent.includes('Dashboard') ||
            (target.onclick && target.onclick.toString().includes('infraestrutura')))
    ) {
        console.log('🎯 Click em Dashboard detectado, aguardando inicialização...');
        setTimeout(() => {
            initializeDropdownsAfterFilters();
        }, 1500);
    }
});
