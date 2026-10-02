import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete' }: ConfirmModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-sm w-full shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 mb-4 text-pink-500">
          <AlertTriangle size={24} />
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6 font-mono leading-relaxed">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded font-mono text-sm transition-colors cursor-pointer"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded font-mono text-sm font-bold shadow-[0_0_10px_rgba(236,72,153,0.3)] transition-all cursor-pointer"
          >
            {confirmText.toUpperCase()}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
