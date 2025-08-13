const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const XLSX = require('xlsx');

admin.initializeApp();

const app = express();

// Middleware
app.use(cors({origin: true}));
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// Referência ao Firestore
const db = admin.firestore();

// Função para ler dados do Firestore
async function readData() {
    try {
        const doc = await db.collection('sistema').doc('data').get();
        if (doc.exists) {
            return doc.data();
        }
        return {enderecos: [], gestao: {projetos: [], subprojetos: [], supervisores: [], equipes: [], cidades: []}};
    } catch (error) {
        logger.error('Erro ao ler dados:', error);
        return {enderecos: [], gestao: {projetos: [], subprojetos: [], supervisores: [], equipes: [], cidades: []}};
    }
}

// Função para salvar dados no Firestore
async function saveData(data) {
    try {
        await db.collection('sistema').doc('data').set(data);
        return true;
    } catch (error) {
        logger.error('Erro ao salvar dados:', error);
        return false;
    }
}

// API - Obter todos os endereços
app.get('/enderecos', async (req, res) => {
    const data = await readData();
    res.json(data.enderecos || []);
});

// API - Salvar endereço
app.post('/enderecos', async (req, res) => {
    const data = await readData();
    const novoEndereco = {
        id: Date.now().toString(),
        ...req.body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    data.enderecos = data.enderecos || [];
    data.enderecos.push(novoEndereco);
    
    if (await saveData(data)) {
        res.json({success: true, endereco: novoEndereco});
    } else {
        res.status(500).json({success: false, error: 'Erro ao salvar dados'});
    }
});

// API - Atualizar endereço
app.put('/enderecos/:id', async (req, res) => {
    const data = await readData();
    const enderecoId = req.params.id;
    
    data.enderecos = data.enderecos || [];
    const index = data.enderecos.findIndex(e => e.id === enderecoId);
    
    if (index !== -1) {
        data.enderecos[index] = {
            ...data.enderecos[index],
            ...req.body,
            updated_at: new Date().toISOString()
        };
        
        if (await saveData(data)) {
            res.json({success: true, endereco: data.enderecos[index]});
        } else {
            res.status(500).json({success: false, error: 'Erro ao atualizar dados'});
        }
    } else {
        res.status(404).json({success: false, error: 'Endereço não encontrado'});
    }
});

// API - Deletar endereço
app.delete('/enderecos/:id', async (req, res) => {
    const data = await readData();
    const enderecoId = req.params.id;
    
    data.enderecos = data.enderecos || [];
    const index = data.enderecos.findIndex(e => e.id === enderecoId);
    
    if (index !== -1) {
        data.enderecos.splice(index, 1);
        
        if (await saveData(data)) {
            res.json({success: true});
        } else {
            res.status(500).json({success: false, error: 'Erro ao deletar dados'});
        }
    } else {
        res.status(404).json({success: false, error: 'Endereço não encontrado'});
    }
});

// API - Obter dados de gestão
app.get('/gestao', async (req, res) => {
    const data = await readData();
    res.json(data.gestao || {projetos: [], subprojetos: [], supervisores: [], equipes: [], cidades: []});
});

// API - Salvar dados de gestão
app.post('/gestao', async (req, res) => {
    const data = await readData();
    data.gestao = req.body;
    
    if (await saveData(data)) {
        res.json({success: true});
    } else {
        res.status(500).json({success: false, error: 'Erro ao salvar dados de gestão'});
    }
});

// API - Upload de dados CSV
app.post('/upload', async (req, res) => {
    const {data: csvData, mapping} = req.body;
    
    try {
        const data = await readData();
        data.enderecos = data.enderecos || [];
        
        // Processar dados CSV com mapping
        csvData.forEach((row, index) => {
            if (index === 0) return; // Pular cabeçalho
            
            const endereco = {
                id: Date.now().toString() + '_' + index,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Aplicar mapping
            Object.keys(mapping).forEach(field => {
                const csvColumn = mapping[field];
                if (csvColumn && row[csvColumn] !== undefined) {
                    endereco[field] = row[csvColumn];
                }
            });
            
            data.enderecos.push(endereco);
        });
        
        if (await saveData(data)) {
            res.json({success: true, imported: csvData.length - 1});
        } else {
            res.status(500).json({success: false, error: 'Erro ao salvar dados importados'});
        }
    } catch (error) {
        logger.error('Erro no upload:', error);
        res.status(500).json({success: false, error: 'Erro ao processar upload'});
    }
});

// API - Estatísticas dashboard
app.get('/stats', async (req, res) => {
    const data = await readData();
    const enderecos = data.enderecos || [];
    
    const stats = {
        total: enderecos.length,
        porStatus: {},
        porCidade: {},
        porProjeto: {},
        recentes: enderecos.slice(-10).reverse()
    };
    
    enderecos.forEach(endereco => {
        // Status
        const status = endereco.status || 'Não definido';
        stats.porStatus[status] = (stats.porStatus[status] || 0) + 1;
        
        // Cidade
        const cidade = endereco.cidade || 'Não definida';
        stats.porCidade[cidade] = (stats.porCidade[cidade] || 0) + 1;
        
        // Projeto
        const projeto = endereco.projeto || 'Não definido';
        stats.porProjeto[projeto] = (stats.porProjeto[projeto] || 0) + 1;
    });
    
    res.json(stats);
});

// API - Download da planilha padrão
app.get('/download-template', (req, res) => {
    try {
        // Dados de exemplo para a planilha padrão - COLUNAS COMPLETAS
        const templateData = [
            {
                'ID': '',
                'Projeto': '',
                'Sub Projeto': '',
                'Tipo de Ação': '',
                'Condomínio': '',
                'Endereço': '',
                'Cidade': '',
                'PEP': '',
                'COD IMOVEL GED': '',
                'NODE GERENCIAL': '',
                'Área Técnica': '',
                'HP': '',
                'ANDAR': '',
                'Data Recebimento': '',
                'Data Início': '',
                'Data Final': '',
                'Equipe': '',
                'Supervisor': '',
                'Status': '',
                'RDO': '',
                'BOOK': '',
                'PROJETO': '',
                'Situação': '',
                'Justificativa': ''
            }
        ];

        // Criar workbook
        const workbook = XLSX.utils.book_new();
        
        // Criar worksheet
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        
        // Configurar largura das colunas - TODAS AS COLUNAS
        const columnWidths = [
            {wch: 8},   // ID
            {wch: 20},  // Projeto
            {wch: 20},  // Sub Projeto
            {wch: 15},  // Tipo de Ação
            {wch: 20},  // Condomínio
            {wch: 35},  // Endereço
            {wch: 15},  // Cidade
            {wch: 12},  // PEP
            {wch: 15},  // COD IMOVEL GED
            {wch: 15},  // NODE GERENCIAL
            {wch: 15},  // Área Técnica
            {wch: 8},   // HP
            {wch: 8},   // ANDAR
            {wch: 15},  // Data Recebimento
            {wch: 15},  // Data Início
            {wch: 15},  // Data Final
            {wch: 25},  // Equipe
            {wch: 15},  // Supervisor
            {wch: 12},  // Status
            {wch: 10},  // RDO
            {wch: 10},  // BOOK
            {wch: 20},  // PROJETO
            {wch: 12},  // Situação
            {wch: 30}   // Justificativa
        ];
        
        worksheet['!cols'] = columnWidths;
        
        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cadastro de Endereços');
        
        // Gerar buffer do arquivo
        const buffer = XLSX.write(workbook, {type: 'buffer', bookType: 'xlsx'});
        
        // Configurar headers para download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="template_cadastro_enderecos.xlsx"');
        res.setHeader('Content-Length', buffer.length);
        
        // Enviar arquivo
        res.send(buffer);
        
        logger.info('✅ Planilha padrão gerada e enviada com sucesso');
        
    } catch (error) {
        logger.error('❌ Erro ao gerar planilha padrão:', error);
        res.status(500).json({success: false, error: 'Erro ao gerar planilha padrão'});
    }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    logger.error('Erro no servidor:', err);
    res.status(500).json({error: 'Erro interno do servidor'});
});

exports.api = onRequest(app);