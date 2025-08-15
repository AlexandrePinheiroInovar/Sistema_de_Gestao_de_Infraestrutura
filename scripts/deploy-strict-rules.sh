#!/bin/bash

# Script para restaurar regras restritivas

echo "🔒 Restaurando regras restritivas..."

# Restaurar regras originais
if [ -f "firestore.rules.backup" ]; then
    cp firestore.rules.backup firestore.rules
    rm firestore.rules.backup
else
    echo "❌ Backup não encontrado!"
    exit 1
fi

# Deploy das regras
firebase deploy --only firestore:rules

echo "✅ Regras restritivas restauradas!"