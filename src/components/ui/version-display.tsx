'use client';

/**
 * Componente para exibir informações de versão da aplicação
 * Pode ser usado no footer, sidebar ou modal de about
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Info, 
  GitBranch, 
  Calendar, 
  Globe,
  Tag
} from 'lucide-react';
import { useVersion } from '@/hooks/useVersion';

interface VersionDisplayProps {
  variant?: 'badge' | 'button' | 'text';
  showDetails?: boolean;
  className?: string;
}

export function VersionDisplay({ 
  variant = 'badge', 
  showDetails = true,
  className = '' 
}: VersionDisplayProps) {
  const version = useVersion();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEnvironmentColor = () => {
    switch (version.environment) {
      case 'production': return 'bg-green-500';
      case 'preview': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const renderSimple = () => {
    if (variant === 'text') {
      return (
        <span className={`text-sm text-muted-foreground ${className}`}>
          v{version.version}
        </span>
      );
    }

    if (variant === 'badge') {
      return (
        <Badge variant="secondary" className={className}>
          v{version.version}
        </Badge>
      );
    }

    return (
      <Button variant="ghost" size="sm" className={className}>
        v{version.version}
      </Button>
    );
  };

  if (!showDetails) {
    return renderSimple();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {renderSimple()}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <h4 className="font-semibold">Informações da Versão</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Versão:</span>
              <Badge variant="outline">v{version.version}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ambiente:</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getEnvironmentColor()}`} />
                <span className="text-sm capitalize">{version.environment}</span>
              </div>
            </div>

            {version.gitTag && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Tag:
                </span>
                <Badge variant="outline">{version.gitTag}</Badge>
              </div>
            )}

            {version.gitCommit && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Commit:
                </span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {version.gitCommit}
                </code>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Build:
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(version.buildDate)}
              </span>
            </div>

            {version.vercelUrl && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Deploy:
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-32">
                  {version.vercelUrl}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Sistema de Escalas Ministeriais
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
