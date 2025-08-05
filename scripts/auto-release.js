#!/usr/bin/env node

/**
 * Script para fazer release automatizado
 * Executa o processo completo: gerar notes + versionar + push
 */

const fs = require('fs');
const { execSync } = require('child_process');
const { generateReleaseNotes, getNextVersion } = require('./generate-release-notes');

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch';

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Tipo de versão inválido. Use: patch, minor ou major');
    process.exit(1);
  }

  try {
    console.log('🚀 Iniciando processo de release...\n');

    // 1. Verificar se há mudanças não commitadas
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        console.error('❌ Há mudanças não commitadas. Commit ou stash antes de fazer release.');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status do git:', error.message);
      process.exit(1);
    }

    // 2. Ler versão atual
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;
    const nextVersion = getNextVersion(currentVersion, versionType);

    console.log(`📦 Versão atual: ${currentVersion}`);
    console.log(`🎯 Nova versão: ${nextVersion}\n`);

    // 3. Verificar se release notes já existem
    const releaseNotesFile = `RELEASE_NOTES_v${nextVersion}.md`;
    
    if (!fs.existsSync(releaseNotesFile)) {
      console.log('📝 Gerando release notes automaticamente...');
      
      // Executar script de geração
      execSync(`node scripts/generate-release-notes.js ${versionType}`, { stdio: 'inherit' });
      
      console.log(`\n⚠️  Release notes geradas em: ${releaseNotesFile}`);
      console.log('📝 Por favor, edite o arquivo e preencha as descrições detalhadas.');
      console.log('🔄 Execute novamente este script quando terminar.\n');
      return;
    }

    // 4. Confirmar que release notes foram editadas
    const releaseContent = fs.readFileSync(releaseNotesFile, 'utf8');
    if (releaseContent.includes('[Descrever') || releaseContent.includes('[Adicionar')) {
      console.log('⚠️  Parece que as release notes ainda não foram totalmente editadas.');
      console.log('📝 Complete as descrições antes de continuar.\n');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        readline.question('Continuar mesmo assim? (y/N): ', (answer) => {
          readline.close();
          if (answer.toLowerCase() !== 'y') {
            console.log('❌ Release cancelada.');
            process.exit(0);
          }
          continueRelease();
          resolve();
        });
      });
    }

    continueRelease();

    function continueRelease() {
      // 5. Executar npm version
      console.log(`🏷️  Executando npm version ${versionType}...`);
      execSync(`npm version ${versionType}`, { stdio: 'inherit' });

      // 6. Fazer push com tags
      console.log('📤 Fazendo push com tags...');
      execSync('git push origin master --follow-tags', { stdio: 'inherit' });

      // 7. Sucesso
      console.log('\n✅ Release concluída com sucesso!');
      console.log(`🎉 Versão ${nextVersion} foi publicada`);
      console.log('🚀 O deploy automático no Vercel deve começar em breve');
      
      // 8. Mostrar links úteis
      console.log('\n📋 Links úteis:');
      console.log(`📝 Release Notes: ${releaseNotesFile}`);
      console.log('🔗 GitHub Releases: https://github.com/PedroHSJ/escalas-ministeriais/releases');
      console.log('🌐 Vercel Dashboard: https://vercel.com/dashboard');
    }

  } catch (error) {
    console.error('❌ Erro durante o release:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
