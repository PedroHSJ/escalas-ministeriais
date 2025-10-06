'use client';

import { AlertTriangle, Beaker, TestTube } from 'lucide-react';
import { useVersion } from '@/hooks/useVersion';
import { cn } from '@/lib/utils';

interface BetaIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'banner' | 'pill';
  showTooltip?: boolean;
}

export function BetaIndicator({ 
  className, 
  size = 'sm',
  variant = 'badge',
  showTooltip = true 
}: BetaIndicatorProps) {
  const { isBeta, betaStage, version } = useVersion();

  if (!isBeta) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses = {
    badge: 'rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-medium',
    banner: 'rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium',
    pill: 'rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-sm'
  };

  const icon = betaStage === 'development' ? (
    <TestTube className="w-3 h-3" />
  ) : (
    <Beaker className="w-3 h-3" />
  );

  const betaText = betaStage === 'development' ? 'DEV' : 'BETA';

  return (
    <div className="relative group">
      <div 
        className={cn(
          'inline-flex items-center gap-1.5',
          sizeClasses[size],
          variantClasses[variant],
          'transition-all duration-200 hover:scale-105',
          className
        )}
      >
        {icon}
        <span>{betaText}</span>
      </div>
      
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <div>
              <div className="font-medium">Versão {betaText}</div>
              <div className="text-gray-300">v{version}</div>
              <div className="text-gray-400 text-xs mt-1">
                {betaStage === 'development' 
                  ? 'Ambiente de desenvolvimento' 
                  : 'Versão beta - use com cautela'}
              </div>
            </div>
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Componente de banner para avisos mais prominentes
export function BetaBanner({ className }: { className?: string }) {
  const { isBeta, betaStage, version } = useVersion();

  if (!isBeta || betaStage !== 'beta') return null;

  return (
    <div className={cn(
      'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4',
      className
    )}>
      <div className="flex items-start gap-3">
        <Beaker className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-amber-900">Versão Beta</h3>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium">
              v{version}
            </span>
          </div>
          <p className="text-sm text-amber-800">
            Esta é uma versão de teste que pode conter bugs ou funcionalidades instáveis. 
            Use apenas para testes e validação.
          </p>
        </div>
      </div>
    </div>
  );
}
