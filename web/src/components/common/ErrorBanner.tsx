import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { parseApiError } from '../../services/api';

interface ErrorBannerProps {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  title = 'Failed to load data',
  onRetry,
}) => {
  if (!error) return null;

  const message = typeof error === 'string' ? error : parseApiError(error);

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose-800">{title}</p>
          <p className="text-xs sm:text-sm text-rose-700 mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
