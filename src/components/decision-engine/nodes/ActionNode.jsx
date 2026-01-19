import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertTriangle, FileDown, ShieldAlert } from 'lucide-react';

const ActionNode = ({ data, isConnectable }) => {
    // Receive signal from Engine via data prop
    const isActive = data.signal === true;

    return (
        <div className={`transition-all duration-500 border-2 rounded-xl overflow-hidden min-w-[220px] shadow-2xl ${isActive ? 'bg-red-50 dark:bg-red-950/90 border-red-500 shadow-red-200 dark:shadow-red-900/50 scale-105' : 'bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700'}`}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className={`!w-4 !h-4 ${isActive ? '!bg-red-500' : '!bg-gray-400 dark:!bg-gray-600'}`} />

            {/* Header */}
            <div className={`p-3 flex items-center justify-between ${isActive ? 'bg-red-500 dark:bg-red-600' : 'bg-gray-100 dark:bg-gray-800'}`}>
                <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span className={`text-xs font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>Mission Action</span>
                </div>
                {isActive && <span className="animate-pulse w-2 h-2 rounded-full bg-white"></span>}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-full ${isActive ? 'bg-red-100 dark:bg-red-500/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                    <AlertTriangle className={`w-8 h-8 ${isActive ? 'text-red-500' : 'text-gray-400 dark:text-gray-600'}`} />
                </div>

                <div className="space-y-1">
                    <h3 className={`text-sm font-bold ${isActive ? 'text-red-700 dark:text-white' : 'text-gray-500'}`}>
                        {isActive ? 'CRITICAL ALERT' : 'System Standby'}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        {isActive ? 'Threshold Breached - Action Required' : 'Waiting for trigger signal...'}
                    </p>
                </div>

                {/* Action Button - Only visible when Active */}
                <button
                    disabled={!isActive}
                    onClick={() => data.onAction && data.onAction()}
                    className={`mt-2 flex items-center justify-center gap-2 w-full py-2 rounded font-bold text-xs uppercase tracking-wide transition-all
                        ${isActive
                            ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg cursor-pointer transform hover:scale-105 active:scale-95'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                        }`}
                >
                    <FileDown className="w-3.5 h-3.5" />
                    Download Order
                </button>
            </div>
        </div>
    );
};

export default memo(ActionNode);
