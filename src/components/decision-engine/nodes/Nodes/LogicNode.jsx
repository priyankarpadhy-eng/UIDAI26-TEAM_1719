import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { BrainCircuit } from 'lucide-react';

const LogicNode = ({ data, isConnectable }) => {
    // data.config = { metric, operator, threshold }

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative flex flex-col bg-[#0a0f1c]/90 backdrop-blur-xl border border-amber-500/30 rounded-xl p-0 min-w-[240px] shadow-2xl overflow-hidden">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-black" />

                {/* Header */}
                <div className="bg-white/5 p-3 border-b border-white/5 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Logic Gate</span>
                </div>

                {/* Body */}
                <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-mono w-8">IF</span>
                        <select
                            className="bg-black/40 border border-white/10 rounded text-xs text-amber-300 p-1.5 focus:border-amber-500 outline-none w-full font-mono"
                            value={data.config?.metric || 'total'}
                            onChange={(e) => data.onChange({ ...data.config, metric: e.target.value })}
                        >
                            <option value="total">Total Enrollments</option>
                            <option value="age_0_5">Age 0-5</option>
                            <option value="age_18_plus">Adults</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-mono w-8">IS</span>
                        <select
                            className="bg-black/40 border border-white/10 rounded text-xs text-amber-300 p-1.5 focus:border-amber-500 outline-none w-20 font-mono"
                            value={data.config?.operator || 'gt'}
                            onChange={(e) => data.onChange({ ...data.config, operator: e.target.value })}
                        >
                            <option value="gt">&gt;</option>
                            <option value="lt">&lt;</option>
                            <option value="eq">=</option>
                        </select>
                        <input
                            type="number"
                            className="bg-black/40 border border-white/10 rounded text-xs text-amber-300 p-1.5 focus:border-amber-500 outline-none w-full font-mono"
                            value={data.config?.threshold || 0}
                            onChange={(e) => data.onChange({ ...data.config, threshold: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Footer Status */}
                <div className={`px-3 py-2 text-[9px] font-mono border-t border-white/5 flex justify-between ${data.signal ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'
                    }`}>
                    <span>OUTPUT SIGNAL:</span>
                    <span className="font-bold">{data.signal ? 'TRUE (ALERT)' : 'FALSE (NOMINAL)'}</span>
                </div>

                <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-black" />
            </div>
        </div>
    );
};

export default memo(LogicNode);
