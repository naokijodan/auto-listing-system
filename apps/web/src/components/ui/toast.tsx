'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, Undo2, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'undo';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

// Simple toast store
type Listener = () => void;
const listeners = new Set<Listener>();
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function addToast(toast: Omit<Toast, 'id'>) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  toasts = [...toasts, { ...toast, id }];
  notifyListeners();

  // Auto dismiss
  const duration = toast.duration ?? (toast.type === 'undo' ? 10000 : 5000);
  setTimeout(() => {
    removeToast(id);
  }, duration);

  return id;
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notifyListeners();
}

function useToasts() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return toasts;
}

// Toast container component
export function ToastContainer() {
  const currentToasts = useToasts();

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {currentToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

// Individual toast item
function ToastItem({ toast }: { toast: Toast }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => removeToast(toast.id), 200);
  }, [toast.id]);

  const handleUndo = useCallback(() => {
    if (toast.onUndo) {
      toast.onUndo();
      handleClose();
    }
  }, [toast.onUndo, handleClose]);

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-900 dark:text-emerald-100',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
      iconColor: 'text-red-500',
      textColor: 'text-red-900 dark:text-red-100',
    },
    info: {
      icon: Info,
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-900 dark:text-blue-100',
    },
    undo: {
      icon: Undo2,
      bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-900 dark:text-amber-100',
    },
  };

  const style = config[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-200',
        style.bg,
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', style.iconColor)} />
      <span className={cn('text-sm font-medium', style.textColor)}>
        {toast.message}
      </span>

      {toast.type === 'undo' && toast.onUndo && (
        <button
          onClick={handleUndo}
          className="ml-2 rounded-md bg-amber-500 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
        >
          {toast.undoLabel || '元に戻す'}
        </button>
      )}

      <button
        onClick={handleClose}
        className={cn(
          'ml-auto flex-shrink-0 rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5',
          style.textColor
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
