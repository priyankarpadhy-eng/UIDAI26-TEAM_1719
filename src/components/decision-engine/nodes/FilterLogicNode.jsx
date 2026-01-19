import React, { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { GitBranch, X } from 'lucide-react';

const FilterLogicNode = ({ id, data, isConnectable }) => {
    const [metric, setMetric] = useState('saturation');
    const [operator, setOperator] = useState('lt');
    const [value, setValue] = useState('50');
    const { setNodes, setEdges } = useReactFlow();

    // ------------------------------------------------------------------
    // LOGIC CONFIGURATION
    // ------------------------------------------------------------------
    // When the user changes any dropdown (Metric, Operator, Value),
    // we must update the 'data' object of this node.
    // ReactFlow stores this 'data' object and makes it accessible to:
    // 1. The Decision Engine (when running the whole flow)
    // 2. Connected downstream nodes (via edges)
    const handleUpdate = () => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    // Update the node's internal state with new filter configuration
                    return { ...node, data: { ...node.data, filterConfig: { metric, operator, value: parseFloat(value) } } };
                }
                return node;
            })
        );
    };

    const handleDelete = () => {
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodes((nds) => nds.filter((n) => n.id !== id));
    };

    return (
        <div className="bg-slate-900 border-2 border-purple-500 rounded-lg shadow-lg min-w-[220px] relative">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/40 to-slate-900 px-3 py-2 flex items-center justify-between border-b border-purple-500/30">
                <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Logic</span>
                </div>
                <button onClick={handleDelete} className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
                <div>
                    <label className="text-[9px] text-slate-500 uppercase block mb-1">Metric</label>
                    <select
                        value={metric}
                        onChange={(e) => { setMetric(e.target.value); handleUpdate(); }}
                        className="w-full bg-slate-800 text-xs text-purple-300 border border-slate-700 rounded px-2 py-1 outline-none focus:border-purple-500"
                    >
                        <option value="saturation">Saturation %</option>
                        <option value="enrollment_gap">Enrollment Gap</option>
                        <option value="age_0_5">Age 0-5</option>
                        <option value="age_5_18">Age 5-18</option>
                        <option value="age_18_plus">Age 18+</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={operator}
                        onChange={(e) => { setOperator(e.target.value); handleUpdate(); }}
                        className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded px-2 py-1 w-14 outline-none focus:border-purple-500"
                    >
                        <option value="gt">{'>'}</option>
                        <option value="lt">{'<'}</option>
                        <option value="eq">{'='}</option>
                        <option value="gte">{'≥'}</option>
                        <option value="lte">{'≤'}</option>
                    </select>
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => { setValue(e.target.value); handleUpdate(); }}
                        className="flex-1 bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded px-2 py-1 outline-none focus:border-purple-500"
                    />
                </div>

                <div className="pt-2 border-t border-slate-700">
                    <p className="text-[10px] font-mono text-purple-300">
                        IF {metric} {operator === 'gt' ? '>' : operator === 'lt' ? '<' : operator === 'eq' ? '=' : operator === 'gte' ? '≥' : '≤'} {value}
                    </p>
                </div>
            </div>

            {/* Handles at root level */}
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                style={{ background: '#a855f7', width: 12, height: 12, border: '2px solid #0f172a' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                style={{ background: '#a855f7', width: 12, height: 12, border: '2px solid #0f172a' }}
            />
        </div>
    );
};

export default memo(FilterLogicNode);
