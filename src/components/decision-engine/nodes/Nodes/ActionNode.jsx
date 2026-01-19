import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Siren, FileOutput } from 'lucide-react';

const ActionNode = ({ data, isConnectable }) => {
    // data.onAction = function to trigger PDF

    return (
        <div className="relative group">
            <div className={`absolute -inset-0.5 rounded-xl blur opacity-30 transition duration-1000 ${data.signal ? 'bg-gradient-to-r from-red-600 to-rose-600 opacity-80 animate-pulse' : 'bg-gradient-to-r from-gray-600 to-gray-700'
                }`}></div>

            <div className="relative flex flex-col bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-xl p-0 min-w-[200px] shadow-2xl overflow-hidden">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-black" />

                {/* Header */}
                <div className={`p-3 border-b border-white/5 flex items-center gap-2 ${data.signal ? 'bg-red-500/10' : 'bg-white/5'
                    }`}>
                    <Siren className={`w-4 h-4 ${data.signal ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${data.signal ? 'text-red-400' : 'text-gray-400'}`}>
                        Directive System
                    </span>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col items-center gap-3">
                    <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                        Generates a formal compliance directive if logic conditions are met.
                    </p>

                    <button
                        onClick={data.onAction}
                        className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${data.signal
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/30 cursor-pointer active:scale-95'
                                : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
                            }`}
                    // disabled={!data.signal} // Let it be clickable for demo if user wants, but visually disabled
                    >
                        <FileOutput className="w-3 h-3" />
                        Generate Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(ActionNode);
