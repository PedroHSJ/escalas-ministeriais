#!/usr/bin/env node

/**
 * Script para fazer release automatizado
 * Executa o processo completo: gerar notes + versionar + push
 */

const fs = require("fs");
const { execSync } = require("child_process");
const {
  generateReleaseNotes,
  getNextVersion,
} = require("./generate-release-notes");
const https = require("https");

// Função para obter commits desde a última tag
function getCommitsSinceLastTag() {
  try {
    const lastTag = execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
    }).trim();
    const commits = execSync(`git log ${lastTag}..HEAD --oneline --no-merges`, {
      encoding: "utf8",
    }).trim();
    return commits ? commits.split("\n") : [];
  } catch (error) {
    // Se não há tags, pega todos os commits
    const commits = execSync("git log --oneline --no-merges", {
      encoding: "utf8",
    }).trim();
    return commits ? commits.split("\n") : [];
  }
}

// Função para categorizar commits
function categorizeCommits(commits) {
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    technical: [],
    breaking: [],
  };

  commits.forEach((commit) => {
    const message = commit.toLowerCase();

    if (message.includes("feat:") || message.includes("feature:")) {
      categories.features.push(commit);
    } else if (message.includes("fix:") || message.includes("bug:")) {
      categories.fixes.push(commit);
    } else if (
      message.includes("improve:") ||
      message.includes("perf:") ||
      message.includes("style:")
    ) {
      categories.improvements.push(commit);
    } else if (
      message.includes("refactor:") ||
      message.includes("chore:") ||
      message.includes("deps:")
    ) {
      categories.technical.push(commit);
    } else if (message.includes("breaking:") || message.includes("!:")) {
      categories.breaking.push(commit);
    } else {
      // Categorizar por palavras-chave
      if (
        message.includes("add") ||
        message.includes("implement") ||
        message.includes("create")
      ) {
        categories.features.push(commit);
      } else if (
        message.includes("fix") ||
        message.includes("correct") ||
        message.includes("resolve")
      ) {
        categories.fixes.push(commit);
      } else {
        categories.improvements.push(commit);
      }
    }
  });

  return categories;
}

// Função para gerar o corpo da release
function generateReleaseBody(version, type, commits) {
  const date = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const typeLabels = {
    major: "Major (Breaking Changes)",
    minor: "Minor (Novas Funcionalidades)",
    patch: "Patch (Correções e Melhorias)",
  };

  const categories = categorizeCommits(commits);

  let body = `**Data de Lançamento**: ${date}  
**Versão**: ${version}  
**Tipo**: ${typeLabels[type]}

---

`;

  // Breaking Changes (para major)
  if (type === "major" && categories.breaking.length > 0) {
    body += `## ⚠️ **Breaking Changes**

`;
    categories.breaking.forEach((commit) => {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^breaking:\s*/i, "");
      body += `- ${message}\n`;
    });
    body += "\n";
  }

  // Novas Funcionalidades
  if (categories.features.length > 0) {
    body += `## ✨ **Novas Funcionalidades**

`;
    categories.features.forEach((commit) => {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(feat|feature):\s*/i, "");
      body += `- ${message}\n`;
    });
    body += "\n";
  }

  // Correções de Bugs
  if (categories.fixes.length > 0) {
    body += `## 🐛 **Correções de Bugs**

`;
    categories.fixes.forEach((commit) => {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(fix|bug):\s*/i, "");
      body += `- ${message}\n`;
    });
    body += "\n";
  }

  // Melhorias
  if (categories.improvements.length > 0) {
    body += `## ⚡ **Melhorias**

`;
    categories.improvements.forEach((commit) => {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(improve|perf|style):\s*/i, "");
      body += `- ${message}\n`;
    });
    body += "\n";
  }

  // Alterações Técnicas
  if (categories.technical.length > 0) {
    body += `## 🔧 **Alterações Técnicas**

`;
    categories.technical.forEach((commit) => {
      const message = commit
        .replace(/^[a-f0-9]+\s/, "")
        .replace(/^(refactor|chore|deps):\s*/i, "");
      body += `- ${message}\n`;
    });
    body += "\n";
  }

  body += `---

**Sistema de Escalas Ministeriais v${version}**  

*Esta versão foi testada e está pronta para produção.*`;

  return body;
}

// Função para verificar se GitHub CLI está disponível
function isGitHubCliAvailable() {
  try {
    execSync("gh --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    return false;
  }
}

// Função para criar release usando GitHub CLI
function createReleaseWithCli(version, title, body, isPrerelease = false) {
  const tagName = `v${version}`;

  // Escapar caracteres especiais no body para o shell
  const escapedBody = body.replace(/"/g, '\\"').replace(/`/g, "\\`");

  const command = `gh release create "${tagName}" --title "${title}" --notes "${escapedBody}" ${
    isPrerelease ? "--prerelease" : ""
  }`;

  try {
    execSync(command, { stdio: "inherit" });
    return true;
  } catch (error) {
    console.error("Erro ao criar release com GitHub CLI:", error.message);
    return false;
  }
}

// Função para criar release usando API do GitHub
function createReleaseWithApi(version, title, body, isPrerelease = false) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(
      "❌ Token do GitHub não encontrado. Defina a variável GITHUB_TOKEN ou use o GitHub CLI."
    );
    return false;
  }

  const tagName = `v${version}`;
  const repoOwner = "PedroHSJ";
  const repoName = "escalas-ministeriais";

  const data = JSON.stringify({
    tag_name: tagName,
    target_commitish: "master",
    name: title,
    body: body,
    draft: false,
    prerelease: isPrerelease,
  });

  const options = {
    hostname: "api.github.com",
    port: 443,
    path: `/repos/${repoOwner}/${repoName}/releases`,
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "escalas-ministeriais-release-script",
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const release = JSON.parse(responseBody);
          console.log(`✅ Release criada com sucesso: ${release.html_url}`);
          resolve(true);
        } else {
          console.error(`❌ Erro na API do GitHub: ${res.statusCode}`);
          console.error(responseBody);
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Erro na requisição:", error.message);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || "patch";

  if (!["patch", "minor", "major"].includes(versionType)) {
    console.error("❌ Tipo de versão inválido. Use: patch, minor ou major");
    process.exit(1);
  }

  async function executeRelease() {
    try {
      console.log("🚀 Iniciando processo de release no GitHub...\n");

      // 1. Verificar se há mudanças não commitadas
      try {
        const status = execSync("git status --porcelain", { encoding: "utf8" });
        if (status.trim()) {
          console.error(
            "❌ Há mudanças não commitadas. Commit ou stash antes de fazer release."
          );
          process.exit(1);
        }
      } catch (error) {
        console.error("❌ Erro ao verificar status do git:", error.message);
        process.exit(1);
      }

      // 2. Ler versão atual
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      const currentVersion = packageJson.version;
      const nextVersion = getNextVersion(currentVersion, versionType);

      console.log(`📦 Versão atual: ${currentVersion}`);
      console.log(`🎯 Nova versão: ${nextVersion}`);

      // 3. Obter commits
      const commits = getCommitsSinceLastTag();
      console.log(
        `📝 Encontrados ${commits.length} commits desde a última tag`
      );

      if (commits.length === 0) {
        console.log(
          "⚠️  Nenhum commit novo encontrado. Continuando mesmo assim..."
        );
      }

      // 4. Atualizar versão no package.json
      console.log(`🏷️  Atualizando versão para ${nextVersion}...`);
      execSync(`npm version ${versionType} --no-git-tag-version`, {
        stdio: "pipe",
      });

      // 5. Commit da nova versão
      execSync("git add package.json package-lock.json", { stdio: "pipe" });
      execSync(`git commit -m "chore: bump version to ${nextVersion}"`, {
        stdio: "pipe",
      });

      // 6. Criar tag
      execSync(`git tag v${nextVersion}`, { stdio: "pipe" });

      // 7. Push dos commits e tags
      console.log("📤 Fazendo push dos commits e tags...");
      execSync("git push origin master", { stdio: "inherit" });
      execSync("git push origin --tags", { stdio: "inherit" });

      // 8. Gerar conteúdo da release
      const title = `${
        versionType === "major" ? "🚀" : versionType === "minor" ? "✨" : "🔧"
      } Release v${nextVersion}`;
      const body = generateReleaseBody(nextVersion, versionType, commits);

      // 9. Criar release no GitHub
      console.log("📋 Criando release no GitHub...");

      let success = false;

      if (isGitHubCliAvailable()) {
        console.log("🔧 Usando GitHub CLI...");
        success = createReleaseWithCli(
          nextVersion,
          title,
          body,
          versionType === "major"
        );
      } else {
        console.log("🌐 Usando API do GitHub...");
        success = await createReleaseWithApi(
          nextVersion,
          title,
          body,
          versionType === "major"
        );
      }

      if (success) {
        console.log("\n✅ Release criada com sucesso!");
        console.log(`🎉 Versão ${nextVersion} foi publicada no GitHub`);
        console.log("🚀 O deploy automático no Vercel deve começar em breve");

        console.log("\n📋 Links úteis:");
        console.log(
          `� GitHub Release: https://github.com/PedroHSJ/escalas-ministeriais/releases/tag/v${nextVersion}`
        );
        console.log(
          "� Todas as Releases: https://github.com/PedroHSJ/escalas-ministeriais/releases"
        );
        console.log("🌐 Vercel Dashboard: https://vercel.com/dashboard");
      } else {
        console.error("❌ Falha ao criar release no GitHub");
        console.log("\n💡 Dicas para resolver:");
        console.log("1. Instale o GitHub CLI: winget install --id GitHub.cli");
        console.log("2. Autentique: gh auth login");
        console.log("3. Ou configure GITHUB_TOKEN nas variáveis de ambiente");
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Erro durante o release:", error.message);
      process.exit(1);
    }
  }

  // Executar função async
  executeRelease().catch((error) => {
    console.error("❌ Erro não tratado:", error);
    process.exit(1);
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
