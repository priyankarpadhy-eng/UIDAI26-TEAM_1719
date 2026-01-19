import React, { useState, useEffect, useMemo } from 'react';
import { Table, BarChart3, FileSpreadsheet, AlertCircle, Bot } from 'lucide-react';
import { TableVisualizer } from './visualizers/TableVisualizer';
import { GraphVisualizer } from './visualizers/GraphVisualizer';
import { ReportVisualizer } from './visualizers/ReportVisualizer';
import { useReactFlow } from 'reactflow';

export const ResultView = ({ nodes, edges }) => {
    const { setNodes } = useReactFlow();

    // Filter relevant nodes
    const resultNodes = useMemo(() => {
        // For analysis nodes, we accept them even if they don't have direct data in 'data',
        // because we will calculate inputs from edges.
        return nodes.filter(n =>
            (n.type === 'table' && (n.data.datasetId || n.data.inputData)) ||
            (n.type === 'graph' && (n.data.datasetId || n.data.inputData)) ||
            (n.type === 'analysis')
        );
    }, [nodes]);

    const [activeTabId, setActiveTabId] = useState(null);

    // Auto-select first tab
    useEffect(() => {
        if (resultNodes.length > 0 && (!activeTabId || !resultNodes.find(n => n.id === activeTabId))) {
            setActiveTabId(resultNodes[0].id);
        }
    }, [resultNodes, activeTabId]);

    const activeNode = resultNodes.find(n => n.id === activeTabId);

    const handleGraphConfigChange = (nodeId, newConfig) => {
        setNodes(nds => nds.map(node => {
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: { ...node.data, ...newConfig }
                };
            }
            return node;
        }));
    };

    if (resultNodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 text-slate-500">
                <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center border border-slate-200">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">No Results Ready</h2>
                    <p className="text-slate-500 mb-6">
                        Connect a <strong>Table</strong>, <strong>Graph</strong>, or <strong>Analysis</strong> node to a data source to see results here.
                    </p>
                    <div className="flex gap-4 text-sm font-medium flex-wrap justify-center">
                        <span className="flex items-center gap-2 text-slate-600 px-3 py-2 bg-slate-100 rounded-lg">
                            <Table className="w-4 h-4 text-emerald-500" /> Table
                        </span>
                        <span className="flex items-center gap-2 text-slate-600 px-3 py-2 bg-slate-100 rounded-lg">
                            <BarChart3 className="w-4 h-4 text-blue-500" /> Graph
                        </span>
                        <span className="flex items-center gap-2 text-slate-600 px-3 py-2 bg-slate-100 rounded-lg">
                            <Bot className="w-4 h-4 text-purple-500" /> Analysis
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    const getIcon = (type) => {
        switch (type) {
            case 'graph': return BarChart3;
            case 'analysis': return Bot;
            default: return Table;
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'graph': return 'text-blue-500';
            case 'analysis': return 'text-purple-500';
            default: return 'text-emerald-500';
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50">
            {/* Tabs Header */}
            <div className="flex items-center gap-1 px-4 pt-4 bg-white border-b border-slate-200 overflow-x-auto">
                {resultNodes.map(node => {
                    const isActive = node.id === activeTabId;
                    const Icon = getIcon(node.type);
                    const colorClass = getColor(node.type);
                    const label = node.data.label || `${node.type.charAt(0).toUpperCase() + node.type.slice(1)}`;

                    return (
                        <button
                            key={node.id}
                            onClick={() => setActiveTabId(node.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all border-b-2
                                ${isActive ? 'bg-slate-50 border-blue-500 text-slate-900 shadow-sm' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? colorClass : 'text-slate-400'}`} />
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 overflow-hidden bg-slate-100/50">
                {activeNode && (
                    <div className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative animate-in fade-in duration-300">
                        {activeNode.type === 'table' ? (
                            <TableVisualizer
                                datasetId={activeNode.data.datasetId}
                                inputData={activeNode.data.inputData}
                            />
                        ) : activeNode.type === 'graph' ? (
                            <GraphVisualizer
                                datasetId={activeNode.data.datasetId}
                                inputData={activeNode.data.inputData}
                                config={{
                                    chartType: activeNode.data.chartType,
                                    xKey: activeNode.data.xKey,
                                    yKey: activeNode.data.yKey
                                }}
                                onConfigChange={(newConfig) => handleGraphConfigChange(activeNode.id, newConfig)}
                            />
                        ) : (
                            <ReportVisualizer
                                nodeId={activeNode.id}
                                nodes={nodes}
                                edges={edges}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
