import React, { useEffect, useRef } from 'react';
import { Network, FileText, Zap, Copy, ShieldAlert } from 'lucide-react';

export const ContextMenu = ({ x, y, pincode, onClose, onAction }) => {
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        // Close on escape key
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!x && x !== 0) return null;

    // Prevent menu from going off-screen (basic bounds check)
    const style = {
        top: y,
        left: x,
    };

    // Adjust if too close to right edge
    if (x > window.innerWidth - 300) {
        style.left = x - 260;
    }
    // Adjust if too close to bottom edge
    if (y > window.innerHeight - 300) {
        style.top = y - 250;
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-black/90 border border-blue-500/30 text-white rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={style}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="bg-blue-900/20 px-4 py-3 text-[10px] font-mono tracking-widest text-blue-300 border-b border-white/10 flex items-center justify-between">
                <span>SECTOR: <span className="text-white font-bold">{pincode}</span></span>
                <ShieldAlert className="w-3 h-3 text-blue-400" />
            </div>

            <div className="flex flex-col p-1">
                <button
                    onClick={() => { onAction('NODES'); onClose(); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-500/10 hover:border-l-2 hover:border-blue-400 flex items-center gap-3 text-xs transition-all group rounded-r-md border-l-2 border-transparent"
                >
                    <Network className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                    <span>Focus Intelligence Grid</span>
                </button>

                <button
                    onClick={() => { onAction('AI_BRIEF'); onClose(); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-purple-500/10 hover:border-l-2 hover:border-purple-400 flex items-center gap-3 text-xs transition-all group rounded-r-md border-l-2 border-transparent"
                >
                    <Zap className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
                    <span>Request AI Briefing</span>
                </button>

                <button
                    onClick={() => { onAction('PDF'); onClose(); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-rose-500/10 hover:border-l-2 hover:border-rose-400 flex items-center gap-3 text-xs transition-all group rounded-r-md border-l-2 border-transparent"
                >
                    <FileText className="w-4 h-4 text-rose-400 group-hover:text-rose-300" />
                    <span className="text-gray-200 group-hover:text-white">Authorize Deployment</span>
                </button>

                <div className="h-px bg-white/10 my-1 mx-2"></div>

                <button
                    onClick={() => { onAction('COPY'); onClose(); }}
                    className="w-full text-left px-3 py-2.5 hover:bg-white/5 flex items-center gap-3 text-xs transition-colors text-gray-400 hover:text-white"
                >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Sector ID</span>
                </button>
            </div>
        </div>
    );
};
