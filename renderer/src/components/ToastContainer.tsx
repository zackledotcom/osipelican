import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center p-4 rounded-lg shadow-lg backdrop-blur-sm border border-white/10
            ${
              toast.type === 'success'
                ? 'bg-green-500/20 text-green-100'
                : toast.type === 'error'
                ? 'bg-red-500/20 text-red-100'
                : toast.type === 'warning'
                ? 'bg-yellow-500/20 text-yellow-100'
                : 'bg-blue-500/20 text-blue-100'
            }
            animate-in slide-in-from-right duration-200`}
        >
          <div className="flex-grow">
            <p className="font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="ml-4 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}; 