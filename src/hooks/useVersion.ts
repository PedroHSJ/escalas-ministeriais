'use client';

/**
 * Hook para obter informações de versão da aplicação
 * Funciona tanto em desenvolvimento quanto em produção
 */

import { useEffect, useState } from 'react';

interface VersionInfo {
  version: string;
  isBeta?: boolean;
  betaStage?: string;
  buildDate: string;
  environment: 'development' | 'production' | 'preview';
  gitTag?: string;
  gitCommit?: string;
  vercelUrl?: string;
}

export function useVersion(): VersionInfo {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    version: '0.0.0',
    isBeta: true, // Assumir beta por padrão em dev
    betaStage: 'development',
    buildDate: new Date().toISOString(),
    environment: 'development'
  });

  useEffect(() => {
    const loadVersionInfo = async () => {
      try {
        // Primeiro, tenta carregar do arquivo de build (se existir)
        const response = await fetch('/version.json');
        if (response.ok) {
          const buildInfo = await response.json();
          setVersionInfo(buildInfo);
          return;
        }
      } catch (error) {
        console.debug('Build version info not available');
      }

      // Fallback: usa informações básicas do ambiente
      const environment = typeof window !== 'undefined' 
        ? 'development' // No cliente, assumimos development se não há version.json
        : 'development';

      // Informações básicas quando version.json não está disponível
      setVersionInfo({
        version: '1.0.0-beta.1', // Versão hardcoded como fallback
        isBeta: true,
        betaStage: 'development',
        buildDate: new Date().toISOString(),
        environment,
        gitTag: undefined,
        gitCommit: undefined,
        vercelUrl: undefined
      });
    };

    loadVersionInfo();
  }, []);

  return versionInfo;
}
