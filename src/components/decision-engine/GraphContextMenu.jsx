import React, { useEffect, useRef } from 'react';
import { Trash2, RotateCcw, Copy, X } from 'lucide-react';

const GraphContextMenu = ({ x, y, onClose, onAction }) => {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!x && x !== 0) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-[50] bg-white/95 dark:bg-[#0f172a]/95 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-lg shadow-2xl backdrop-blur-md w-56 overflow-hidden animate-in fade-in zoom-in-95 duration-100 transition-colors"
            style={{ top: y, left: x }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="bg-gray-50 dark:bg-white/5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-b border-gray-200 dark:border-white/10">
                Canvas Options
            </div>

            <div className="p-1">
                <button
                    onClick={() => { onAction('RESET'); onClose(); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-3 text-xs transition-colors rounded-sm"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Default Graph</span>
                </button>

                <button
                    onClick={() => { onAction('CLEAR_ALL'); onClose(); }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-3 text-xs transition-colors rounded-sm"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Nodes</span>
                </button>
            </div>

            <div className="border-t border-gray-200 dark:border-white/10 p-1">
                <button
                    onClick={() => onClose()}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 text-xs transition-colors rounded-sm"
                >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Menu</span>
                </button>
            </div>
        </div>
    );
};

export default GraphContextMenu;
