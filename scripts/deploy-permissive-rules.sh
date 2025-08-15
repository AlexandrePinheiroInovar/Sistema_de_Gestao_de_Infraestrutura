#!/bin/bash

# Script para aplicar regras permissivas temporariamente

echo "🔓 Aplicando regras permissivas temporariamente..."

# Backup das regras atuais
cp firestore.rules firestore.rules.backup

# Usar regras permissivas
cp firestore-permissive.rules firestore.rules

# Deploy das regras
firebase deploy --only firestore:rules

echo "✅ Regras permissivas aplicadas!"
echo "⚠️  IMPORTANTE: Execute deploy-strict-rules.sh após criar os usuários!"