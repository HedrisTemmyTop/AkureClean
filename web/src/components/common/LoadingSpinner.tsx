import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center p-12 text-slate-500 ${className}`}>
    <Loader2 className="w-8 h-8 animate-spin text-brand-teal mb-3" />
    <span className="text-sm font-medium text-slate-600">{message}</span>
  </div>
);

export default LoadingSpinner;
