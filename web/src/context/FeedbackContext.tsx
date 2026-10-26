import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
}

export interface FeedbackModalOptions {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
}

interface FeedbackContextType {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  showSuccessModal: (title: string, message: string, onConfirm?: () => void, confirmLabel?: string) => void;
  showErrorModal: (title: string, message: string, onConfirm?: () => void) => void;
  showConfirmModal: (options: FeedbackModalOptions) => void;
  closeModal: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

// Global event listener so non-component code (like axios interceptors) can trigger alerts
type FeedbackListener = (item: Omit<ToastItem, 'id'>) => void;
let globalFeedbackListener: FeedbackListener | null = null;

export const emitGlobalFeedback = (type: FeedbackType, message: string, title?: string) => {
  if (globalFeedbackListener) {
    globalFeedbackListener({
      type,
      title:
        title ||
        (type === 'success'
          ? 'Success'
          : type === 'error'
          ? 'Operation Failed'
          : type === 'warning'
          ? 'Warning'
          : 'Notice'),
      message,
    });
  }
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [modal, setModal] = useState<FeedbackModalOptions | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: FeedbackType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const resolvedTitle =
        title ||
        (type === 'success'
          ? 'Success'
          : type === 'error'
          ? 'Error'
          : type === 'warning'
          ? 'Attention'
          : 'Information');

      setToasts((prev) => [...prev, { id, type, title: resolvedTitle, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  useEffect(() => {
    globalFeedbackListener = (item) => {
      addToast(item.type, item.message || '', item.title);
    };
    return () => {
      globalFeedbackListener = null;
    };
  }, [addToast]);

  const showSuccess = useCallback(
    (message: string, title = 'Success') => addToast('success', message, title),
    [addToast]
  );

  const showError = useCallback(
    (message: string, title = 'Error') => addToast('error', message, title),
    [addToast]
  );

  const showWarning = useCallback(
    (message: string, title = 'Warning') => addToast('warning', message, title),
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, title = 'Notice') => addToast('info', message, title),
    [addToast]
  );

  const showSuccessModal = useCallback(
    (title: string, message: string, onConfirm?: () => void, confirmLabel = 'Continue') => {
      setModal({
        type: 'success',
        title,
        message,
        confirmLabel,
        onConfirm,
      });
    },
    []
  );

  const showErrorModal = useCallback(
    (title: string, message: string, onConfirm?: () => void) => {
      setModal({
        type: 'error',
        title,
        message,
        confirmLabel: 'Dismiss',
        onConfirm,
      });
    },
    []
  );

  const showConfirmModal = useCallback((options: FeedbackModalOptions) => {
    setModal(options);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  return (
    <FeedbackContext.Provider
      value={{
        showSuccess,
        showError,
        showWarning,
        showInfo,
        showSuccessModal,
        showErrorModal,
        showConfirmModal,
        closeModal,
      }}
    >
      {children}

      {/* Floating Toast Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const containerStyle = isSuccess
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : isError
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : isWarning
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-sky-50 border-sky-300 text-sky-950';

          const icon = isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : isError ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : isWarning ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
          );

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all ${containerStyle}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs font-medium mt-0.5 leading-relaxed break-words opacity-90">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-black/5 text-current opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Centered Status / Feedback Modal */}
      {modal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 z-10 text-center space-y-4">
            <div
              className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
                modal.type === 'success'
                  ? 'bg-emerald-100 text-emerald-600'
                  : modal.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {modal.type === 'success' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : modal.type === 'error' ? (
                <AlertCircle className="w-8 h-8" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{modal.message}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              {modal.cancelLabel && (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {modal.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const cb = modal.onConfirm;
                  closeModal();
                  if (cb) cb();
                }}
                className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer ${
                  modal.type === 'success'
                    ? 'bg-brand-teal hover:bg-teal-700'
                    : modal.type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {modal.confirmLabel || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = (): FeedbackContextType => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return ctx;
};
