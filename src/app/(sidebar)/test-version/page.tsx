'use client';

import { VersionDisplay } from '@/components/ui/version-display';
import { useVersion } from '@/hooks/useVersion';

export default function VersionTestPage() {
  const version = useVersion();

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Sistema de Versão - Teste</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diferentes variações do componente */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Componentes de Versão</h2>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Badge com detalhes:</p>
            <VersionDisplay variant="badge" showDetails={true} />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Texto simples:</p>
            <VersionDisplay variant="text" showDetails={false} />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Botão com detalhes:</p>
            <VersionDisplay variant="button" showDetails={true} />
          </div>
        </div>

        {/* Informações brutas */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Dados da Versão</h2>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm overflow-auto">
              {JSON.stringify(version, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Exemplo de footer */}
      <div className="mt-16 pt-8 border-t">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Sistema de Escalas Ministeriais
          </p>
          <VersionDisplay variant="text" showDetails={true} />
        </div>
      </div>

      {/* Informações sobre o deploy */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">ℹ️ Como funciona</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• <strong>Desenvolvimento:</strong> Usa dados do package.json</li>
          <li>• <strong>Produção:</strong> Usa dados do Vercel + Git tag</li>
          <li>• <strong>Build:</strong> Script gera version.json automaticamente</li>
          <li>• <strong>Deploy:</strong> Tag v1.0.0 será exibida como versão</li>
        </ul>
      </div>
    </div>
  );
}
