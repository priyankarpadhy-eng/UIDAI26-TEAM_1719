import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { DataStore } from '../../../services/DataStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const GraphVisualizer = ({ datasetId, inputData: propInputData, config = {}, onConfigChange }) => {
    // Local state initialized from config, but we prefer driven by props if onConfigChange is used
    const [localChartType, setLocalChartType] = useState('bar');
    const [localXKey, setLocalXKey] = useState('');
    const [localYKey, setLocalYKey] = useState('');

    const chartType = config.chartType || localChartType;
    const xKey = config.xKey || localXKey;
    const yKey = config.yKey || localYKey;

    const setChartType = (val) => {
        setLocalChartType(val);
        onConfigChange?.({ ...config, chartType: val });
    };
    const setXKey = (val) => {
        setLocalXKey(val);
        onConfigChange?.({ ...config, xKey: val });
    };
    const setYKey = (val) => {
        setLocalYKey(val);
        onConfigChange?.({ ...config, yKey: val });
    };

    const [dataset, setDataset] = useState([]);

    // Fetch Data
    useEffect(() => {
        if (datasetId) {
            const d = DataStore.get(datasetId);
            setDataset(d || []);
        } else if (propInputData) {
            setDataset(propInputData);
        } else {
            setDataset([]);
        }
    }, [datasetId, propInputData]);

    const columns = useMemo(() => dataset.length > 0 ? Object.keys(dataset[0]) : [], [dataset]);

    // Auto-select likely keys if unset
    useEffect(() => {
        if (columns.length > 0) {
            let newConfig = {};
            if (!xKey) {
                const likelyName = columns.find(c => /name|state|district|month|date/i.test(c)) || columns[0];
                newConfig.xKey = likelyName;
                setLocalXKey(likelyName);
            }
            if (!yKey) {
                const likelyValue = columns.find(c => /count|total|value|amount|sum/i.test(c)) ||
                    columns.find(c => typeof dataset[0][c] === 'number') || columns[1] || columns[0];
                newConfig.yKey = likelyValue;
                setLocalYKey(likelyValue);
            }
            if (Object.keys(newConfig).length > 0 && onConfigChange) {
                onConfigChange({ ...config, ...newConfig });
            }
        }
    }, [columns]); // Dependency on "columns" only to init once per data change

    const chartData = useMemo(() => {
        if (!xKey || !yKey) return [];
        return dataset.slice(0, 50).map(item => ({
            name: item[xKey],
            value: Number(item[yKey]) || 0
        }));
    }, [dataset, xKey, yKey]);

    const hasData = chartData.length > 0;

    return (
        <div className="flex flex-col w-full h-full bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Config Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-1 min-w-[150px]">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">X Axis (Category)</label>
                    <select
                        value={xKey}
                        onChange={(e) => setXKey(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg text-xs p-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1 min-w-[150px]">
                    <label className="text-[10px] text-slate-500 uppercase font-bold">Y Axis (Value)</label>
                    <select
                        value={yKey}
                        onChange={(e) => setYKey(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg text-xs p-2 text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
                    >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200 ml-auto">
                    <button
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-all font-medium ${chartType === 'bar' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <BarChart3 className="w-4 h-4" /> Bar
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-all font-medium ${chartType === 'line' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" /> Line
                    </button>
                    <button
                        onClick={() => setChartType('pie')}
                        className={`px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-all font-medium ${chartType === 'pie' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <PieIcon className="w-4 h-4" /> Pie
                    </button>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full bg-white p-4 relative min-h-[300px]">
                {!hasData ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-sm font-medium text-slate-500">Waiting for data...</p>
                        <p className="text-xs text-slate-400 mt-1">Configure axes above</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        ) : chartType === 'line' ? (
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} height={60} angle={-20} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155' }} />
                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                            </LineChart>
                        ) : (
                            <PieChart>
                                <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} fill="#8884d8" paddingAngle={4} dataKey="value" label>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};
