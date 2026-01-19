import React, { memo, useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { Calculator, FunctionSquare, ArrowRight } from 'lucide-react';
import { DataStore } from '../../../services/DataStore';
import BaseNode from './BaseNode';

const MathNode = ({ id, data, isConnectable }) => {
    const { setNodes } = useReactFlow();
    const [dataset, setDataset] = useState([]);
    const [config, setConfig] = useState({
        col1: '',
        operation: 'add',
        col2: '',
        resultName: 'New_Column'
    });
    const [loading, setLoading] = useState(false);

    const inputDatasetId = data.datasetId || data.inputDatasetId;
    const isConnected = !!inputDatasetId;

    // Fetch data reference
    useEffect(() => {
        if (inputDatasetId) {
            const d = DataStore.get(inputDatasetId);
            setDataset(d || []);
        } else {
            setDataset([]);
        }
    }, [inputDatasetId]);

    const columns = dataset.length > 0 ? Object.keys(dataset[0]) : [];

    const calculate = () => {
        if (!config.col1 || !config.col2 || !config.resultName) return;
        setLoading(true);

        setTimeout(() => {
            const newData = dataset.map(row => {
                const val1 = Number(row[config.col1]) || 0;
                // Allow col2 to be a number input or a column
                const val2 = columns.includes(config.col2) ? (Number(row[config.col2]) || 0) : (Number(config.col2) || 0);

                let result = 0;
                switch (config.operation) {
                    case 'add': result = val1 + val2; break;
                    case 'sub': result = val1 - val2; break;
                    case 'mul': result = val1 * val2; break;
                    case 'div': result = val2 !== 0 ? val1 / val2 : 0; break;
                    case 'pct': result = val2 !== 0 ? (val1 / val2) * 100 : 0; break;
                }

                return { ...row, [config.resultName]: parseFloat(result.toFixed(2)) };
            });

            // Store new dataset
            const newId = DataStore.set(newData);

            // Propagate
            setNodes((nds) => nds.map((n) => {
                if (n.id === id) {
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            processedDatasetId: newId,
                            datasetId: newId // Propagate as main ID
                        }
                    };
                }
                return n;
            }));
            setLoading(false);
        }, 100);
    };

    return (
        <BaseNode
            id={id}
            title="Math Operation"
            icon={Calculator}
            color="indigo"
            isConnectable={isConnectable}
            handles={['left', 'right']}
        >
            <div className="space-y-3">
                {!isConnected ? (
                    <div className="text-center text-xs text-slate-400 py-4 bg-slate-50 rounded border border-dashed border-slate-200">
                        Connect a data source
                    </div>
                ) : (
                    <>
                        {/* Config Form */}
                        <div className="space-y-2">
                            {/* Column 1 */}
                            <select
                                className="w-full bg-white border border-slate-200 rounded text-xs p-2 text-slate-700 outline-none focus:border-indigo-400 shadow-sm"
                                value={config.col1}
                                onChange={e => setConfig({ ...config, col1: e.target.value })}
                            >
                                <option value="">Select Column 1</option>
                                {columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {/* Operation */}
                            <div className="flex gap-2">
                                <select
                                    className="w-1/3 bg-white border border-slate-200 rounded text-xs p-2 text-slate-700 font-bold text-center outline-none focus:border-indigo-400 shadow-sm"
                                    value={config.operation}
                                    onChange={e => setConfig({ ...config, operation: e.target.value })}
                                >
                                    <option value="add">+</option>
                                    <option value="sub">-</option>
                                    <option value="mul">×</option>
                                    <option value="div">÷</option>
                                    <option value="pct">%</option>
                                </select>

                                {/* Column 2 or Value */}
                                <input
                                    className="w-2/3 bg-white border border-slate-200 rounded text-xs p-2 text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-400 shadow-sm"
                                    placeholder="Col 2 or Number"
                                    value={config.col2}
                                    onChange={e => setConfig({ ...config, col2: e.target.value })}
                                    list={`cols-${id}`}
                                />
                                <datalist id={`cols-${id}`}>
                                    {columns.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>

                            {/* Result Name */}
                            <div className="flex items-center gap-2 pt-1">
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <input
                                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 text-indigo-600 font-mono font-bold placeholder:text-slate-400 outline-none focus:border-indigo-400 shadow-sm"
                                    placeholder="New Column Name"
                                    value={config.resultName}
                                    onChange={e => setConfig({ ...config, resultName: e.target.value })}
                                />
                            </div>

                            {/* Execute Button */}
                            <button
                                onClick={calculate}
                                disabled={loading || !config.col1 || !config.col2}
                                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-md"
                            >
                                {loading ? <span className="animate-spin">⟳</span> : <FunctionSquare className="w-3 h-3" />}
                                Calculate Column
                            </button>
                        </div>
                    </>
                )}
            </div>
        </BaseNode>
    );
};

export default memo(MathNode);
