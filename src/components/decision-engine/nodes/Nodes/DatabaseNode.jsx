import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Database, Wifi } from 'lucide-react';

const DatabaseNode = ({ data, isConnectable }) => {
    return (
        <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative flex flex-col items-center bg-[#0a0f1c]/90 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 min-w-[180px] shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3 w-full border-b border-white/5 pb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Database className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-200 tracking-widest uppercase">Supplied Data</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-mono">LIVE_STREAM</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="w-full text-[10px] text-gray-500 font-mono space-y-1">
                    <div className="flex justify-between">
                        <span>SOURCE:</span>
                        <span className="text-gray-300">UIDAL_DB_MAIN</span>
                    </div>
                    <div className="flex justify-between">
                        <span>LATENCY:</span>
                        <span className="text-emerald-400">12ms</span>
                    </div>
                </div>

                {/* Handle */}
                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                    className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-black"
                />
            </div>
        </div>
    );
};

export default memo(DatabaseNode);
