import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { LayoutList, Settings2 } from 'lucide-react';

const ColumnNode = ({ data, isConnectable }) => {
    // data.columns = ['Age Based', 'Update Type', 'Biometric Score']
    // data.selected = []

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative flex flex-col bg-[#0a0f1c]/90 backdrop-blur-xl border border-violet-500/30 rounded-xl p-0 min-w-[200px] shadow-2xl overflow-hidden">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-black" />

                {/* Header */}
                <div className="bg-white/5 p-3 border-b border-white/5 flex items-center gap-2">
                    <LayoutList className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Metrics</span>
                </div>

                {/* Body */}
                <div className="p-3 space-y-2">
                    {Object.keys(data.mapping || {}).map((colName) => (
                        <label key={colName} className="flex items-center gap-3 cursor-pointer group/item">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${data.selected?.includes(colName)
                                    ? 'bg-violet-600 border-violet-500'
                                    : 'bg-black/40 border-white/10 group-hover/item:border-violet-500/50'
                                }`}>
                                {data.selected?.includes(colName) && <div className="w-2 h-2 bg-white rounded-[1px]" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={data.selected?.includes(colName) || false}
                                onChange={(e) => {
                                    const newSelected = e.target.checked
                                        ? [...(data.selected || []), colName]
                                        : (data.selected || []).filter(c => c !== colName);
                                    data.onChange(newSelected);
                                }}
                            />
                            <span className={`text-[10px] font-mono transition-colors ${data.selected?.includes(colName) ? 'text-violet-300' : 'text-gray-500'
                                }`}>{colName}</span>
                        </label>
                    ))}
                </div>

                <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-black" />
            </div>
        </div>
    );
};

export default memo(ColumnNode);
