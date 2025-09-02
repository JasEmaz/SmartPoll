'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  className?: string;
  disabled?: boolean;
}

export function Tooltip({ children, content, className, disabled = false }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm",
            "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
            "before:content-[''] before:absolute before:top-full before:left-1/2 before:transform before:-translate-x-1/2",
            "before:border-4 before:border-transparent before:border-t-gray-900",
            "whitespace-nowrap",
            className
          )}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
