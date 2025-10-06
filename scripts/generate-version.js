#!/usr/bin/env node

/**
 * Script para gerar informações de versão durante o build
 * Executa automaticamente no processo de build do Vercel
 */

const fs = require('fs');
const path = require('path');

function generateVersionInfo() {
  try {
    // Lê o package.json
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    // Detecta se é versão beta
    const version = packageJson.version;
    const isBeta = version.includes('beta') || version.includes('b') || 
                   process.env.VERCEL_ENV === 'preview' || 
                   process.env.NODE_ENV === 'development';
    
    // Obtém informações do ambiente
    const versionInfo = {
      version: packageJson.version,
      isBeta,
      betaStage: isBeta ? (version.includes('beta') ? 'beta' : 'development') : null,
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      // Informações do Git/Vercel (disponíveis durante o build)
      gitTag: process.env.VERCEL_GIT_COMMIT_REF || null,
      gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || null,
      gitCommitShort: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || null,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
      
      // Informações do Vercel
      vercelUrl: process.env.VERCEL_URL || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      vercelRegion: process.env.VERCEL_REGION || null,
      
      // Informações adicionais
      nodeVersion: process.version,
      buildTime: Date.now()
    };

    // Salva no public para ser acessível via HTTP
    const publicPath = path.join(process.cwd(), 'public', 'version.json');
    fs.writeFileSync(publicPath, JSON.stringify(versionInfo, null, 2));

    // Também salva uma versão para uso interno (opcional)
    const srcPath = path.join(process.cwd(), 'src', 'version.json');
    fs.writeFileSync(srcPath, JSON.stringify(versionInfo, null, 2));

    console.log('✅ Informações de versão geradas:');
    console.log(`   Versão: ${versionInfo.version}${isBeta ? ' (BETA)' : ''}`);
    console.log(`   Tag: ${versionInfo.gitTag || 'N/A'}`);
    console.log(`   Commit: ${versionInfo.gitCommitShort || 'N/A'}`);
    console.log(`   Ambiente: ${versionInfo.environment}`);
    console.log(`   Build: ${versionInfo.buildDate}`);
    if (isBeta) {
      console.log(`   🚧 Versão Beta Detectada: ${versionInfo.betaStage}`);
    }

  } catch (error) {
    console.error('❌ Erro ao gerar informações de versão:', error.message);
    
    // Cria um arquivo básico mesmo em caso de erro
    const fallbackInfo = {
      version: '0.0.0',
      isBeta: true,
      betaStage: 'development',
      buildDate: new Date().toISOString(),
      environment: 'unknown',
      error: error.message
    };
    
    const publicPath = path.join(process.cwd(), 'public', 'version.json');
    fs.writeFileSync(publicPath, JSON.stringify(fallbackInfo, null, 2));
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  generateVersionInfo();
}

module.exports = generateVersionInfo;
