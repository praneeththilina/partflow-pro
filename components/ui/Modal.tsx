import React from 'react';

interface ModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success';
}

export const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    type = 'info'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-rose-50',
            text: 'text-rose-600',
            button: 'bg-rose-600 hover:bg-rose-700',
            icon: (
                <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            )
        },
        info: {
            bg: 'bg-indigo-50',
            text: 'text-indigo-600',
            button: 'bg-indigo-600 hover:bg-indigo-700',
            icon: (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )
        },
        success: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            button: 'bg-emerald-600 hover:bg-emerald-700',
            icon: (
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            )
        }
    };

    const theme = colors[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className={`p-6 flex flex-col items-center text-center ${theme.bg}`}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        {theme.icon}
                    </div>
                    <h3 className={`text-xl font-black ${theme.text}`}>{title}</h3>
                </div>
                <div className="p-6">
                    <p className="text-slate-600 font-medium text-center mb-6 text-sm leading-relaxed">{message}</p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onCancel} 
                            className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={onConfirm} 
                            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 ${theme.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
