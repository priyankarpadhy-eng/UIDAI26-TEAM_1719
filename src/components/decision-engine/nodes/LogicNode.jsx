import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Brain, ArrowRight } from 'lucide-react';
import BaseNode from './BaseNode';

const LogicNode = ({ id, data, isConnectable }) => {
    // Default config
    const [config, setConfig] = useState(data.config || { metric: 'total', operator: 'lt', threshold: 500 });
    const [signal, setSignal] = useState(data.signal || false);

    // Update internal state when props change (from engine)
    useEffect(() => {
        if (data.signal !== undefined) setSignal(data.signal);
    }, [data.signal]);

    const handleChange = (key, value) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        if (data.onChange) {
            data.onChange({ config: newConfig });
        }
    };

    return (
        <BaseNode
            id={id}
            title="Logic Processor"
            icon={Brain}
            color="purple"
            isConnectable={isConnectable}
            handles={['left', 'right']}
            className={`${signal ? 'ring-2 ring-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : ''}`}
        >
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold font-mono">IF</span>
                    <select
                        value={config.metric}
                        onChange={(e) => handleChange('metric', e.target.value)}
                        className="bg-white border border-slate-200 rounded text-xs text-slate-700 px-2 py-1.5 outline-none w-full shadow-sm"
                    >
                        <option value="total">Total Value</option>
                        <option value="age_0_5">Age 0-5</option>
                        <option value="age_18_plus">Age 18+</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={config.operator}
                        onChange={(e) => handleChange('operator', e.target.value)}
                        className="bg-white border border-slate-200 rounded text-xs text-slate-700 px-2 py-1.5 outline-none w-16 text-center shadow-sm font-bold"
                    >
                        <option value="gt">&gt;</option>
                        <option value="lt">&lt;</option>
                        <option value="eq">=</option>
                    </select>

                    <input
                        type="number"
                        value={config.threshold}
                        onChange={(e) => handleChange('threshold', Number(e.target.value))}
                        className="bg-white border border-slate-200 rounded text-xs text-slate-700 px-2 py-1.5 outline-none w-full shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold font-mono">THEN</span>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold transition-all w-full justify-center ${signal
                        ? 'bg-purple-500 text-white border-purple-600 shadow-md animate-pulse'
                        : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                        <span>EMIT SIGNAL</span>
                        <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </BaseNode>
    );
};

export default memo(LogicNode);
