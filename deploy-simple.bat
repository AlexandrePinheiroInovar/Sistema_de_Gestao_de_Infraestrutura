@echo off
echo 🚀 Deploy Firebase - Sistema MDU
echo ================================

echo 1. Verificando Firebase CLI...
firebase --version
if errorlevel 1 (
    echo ❌ Firebase CLI não encontrado. Instalando...
    npm install -g firebase-tools
)

echo.
echo 2. Fazendo login no Firebase...
firebase login

echo.
echo 3. Selecionando projeto...
firebase use gestao-de-infraestrutura-4ee4a

echo.
echo 4. Fazendo deploy...
firebase deploy --only hosting

echo.
echo ✅ Deploy concluído!
echo 🌐 Acesse: https://gestao-de-infraestrutura-4ee4a.firebaseapp.com
pause