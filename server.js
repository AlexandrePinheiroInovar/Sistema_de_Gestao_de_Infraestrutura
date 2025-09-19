const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

// Configurações
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Headers de segurança para desenvolvimento
app.use((req, res, next) => {
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
});

// Cache busting para desenvolvimento
app.use((req, res, next) => {
    if (ENV === 'development') {
        res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.header('Pragma', 'no-cache');
        res.header('Expires', '0');
    }
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro.html'));
});

// API de desenvolvimento
app.get('/api/dev/status', (req, res) => {
    res.json({
        status: 'running',
        environment: ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('./package.json').version
    });
});

// API para recarregar cache (útil durante desenvolvimento)
app.post('/api/dev/reload', (req, res) => {
    res.json({
        message: 'Cache cleared',
        timestamp: new Date().toISOString()
    });
});

// API para listar arquivos JS (debug)
app.get('/api/dev/files', (req, res) => {
    const jsFiles = fs.readdirSync('./src/js/').filter(file => file.endsWith('.js'));
    const cssFiles = fs.readdirSync('./src/css/').filter(file => file.endsWith('.css'));
    
    res.json({
        javascript: jsFiles,
        css: cssFiles,
        total: jsFiles.length + cssFiles.length
    });
});

// Endpoint para verificar Firebase config (sem expor chaves)
app.get('/api/dev/firebase-config', (req, res) => {
    try {
        const configPath = './src/js/firebase-complete.js';
        const content = fs.readFileSync(configPath, 'utf8');
        
        const hasApiKey = content.includes('apiKey:');
        const hasAuthDomain = content.includes('authDomain:');
        const hasProjectId = content.includes('projectId:');
        
        res.json({
            configured: hasApiKey && hasAuthDomain && hasProjectId,
            components: {
                apiKey: hasApiKey,
                authDomain: hasAuthDomain,
                projectId: hasProjectId
            }
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error reading Firebase config',
            message: error.message
        });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: ENV === 'development' ? err.message : 'Algo deu errado'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Página não encontrada',
        path: req.url
    });
});

// Inicializar servidor
const server = app.listen(PORT, () => {
    console.log('🚀 ================================');
    console.log('🔥 SERVIDOR DE DESENVOLVIMENTO');
    console.log('🚀 ================================');
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🌍 Ambiente: ${ENV}`);
    console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
    console.log('🚀 ================================');
    console.log('');
    console.log('📋 URLs Disponíveis:');
    console.log(`   🏠 Home: http://localhost:${PORT}/`);
    console.log(`   📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`   📝 Cadastro: http://localhost:${PORT}/cadastro`);
    console.log('');
    console.log('🛠️ APIs de Desenvolvimento:');
    console.log(`   📊 Status: http://localhost:${PORT}/api/dev/status`);
    console.log(`   📁 Arquivos: http://localhost:${PORT}/api/dev/files`);
    console.log(`   🔥 Firebase: http://localhost:${PORT}/api/dev/firebase-config`);
    console.log('');
    console.log('💡 Dicas:');
    console.log('   • Ctrl+C para parar o servidor');
    console.log('   • Arquivos são recarregados automaticamente');
    console.log('   • Console do navegador mostra logs detalhados');
    console.log('🚀 ================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Recebido SIGTERM, fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 Recebido SIGINT (Ctrl+C), fechando servidor...');
    server.close(() => {
        console.log('✅ Servidor fechado');
        process.exit(0);
    });
});