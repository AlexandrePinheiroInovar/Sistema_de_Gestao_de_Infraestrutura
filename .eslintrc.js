module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'prettier'
    ],
    plugins: [
        'prettier'
    ],
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
    },
    globals: {
        // Firebase
        firebase: 'readonly',
        Chart: 'readonly',
        
        // Libraries
        XLSX: 'readonly',
        Papa: 'readonly',
        
        // Custom globals
        FirebaseTableSystem: 'readonly',
        FirebaseAuthIsolated: 'readonly',
        dashboardChartsV5: 'readonly'
    },
    rules: {
        // Error prevention
        'no-unused-vars': ['error', { 
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_'
        }],
        'no-console': 'off', // Permitir console.log em desenvolvimento
        'no-debugger': 'error',
        'no-alert': 'warn',
        
        // Code quality
        'prefer-const': 'error',
        'no-var': 'error',
        'arrow-spacing': 'error',
        'comma-dangle': ['error', 'never'],
        'semicolon': 'off',
        
        // Best practices
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'brace-style': ['error', '1tbs'],
        'indent': ['error', 4, { 
            SwitchCase: 1 
        }],
        'quotes': ['error', 'single', { 
            allowTemplateLiterals: true 
        }],
        
        // Firebase specific
        'no-undef': 'error',
        
        // Prettier integration
        'prettier/prettier': ['error', {
            singleQuote: true,
            tabWidth: 4,
            trailingComma: 'none',
            printWidth: 100,
            semi: true
        }]
    },
    overrides: [
        {
            files: ['src/js/*.js'],
            rules: {
                'no-unused-vars': 'warn' // Mais permissivo para arquivos do projeto
            }
        },
        {
            files: ['server.js'],
            env: {
                node: true,
                browser: false
            }
        }
    ]
};