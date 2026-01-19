import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart2 } from 'lucide-react';

const GraphNode = ({ data, isConnectable }) => {
    // data.chartData = [{ name, value }]

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative flex flex-col bg-[#0a0f1c]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-0 min-w-[320px] shadow-2xl overflow-hidden">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-black" />

                {/* Header */}
                <div className="bg-white/5 p-3 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Live Visualization</span>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono">
                        {data.chartData?.length || 0} RECORDS
                    </span>
                </div>

                {/* Chart Body */}
                <div className="p-4 h-[200px] w-full bg-[#05080f]">
                    {data.chartData && data.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chartData}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: '#64748b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={30}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px' }}
                                    itemStyle={{ color: '#e2e8f0', fontSize: '11px' }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                />
                                <Bar dataKey="value" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-[10px] text-gray-600 font-mono">
                            WAITING_FOR_DATA_STREAM...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(GraphNode);
