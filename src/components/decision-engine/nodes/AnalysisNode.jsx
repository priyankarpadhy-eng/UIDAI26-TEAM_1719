import React, { memo, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow, NodeResizer, useEdges } from 'reactflow';
import { Bot, Sparkles, X, Database, FileUp, Globe, BarChart3, Table, Loader2, CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { AI_AGENTS } from '../../../services/multiAIEngine';

const AnalysisNode = ({ id, data, isConnectable, selected }) => {
    const { setNodes, setEdges, getNodes } = useReactFlow();
    const edges = useEdges();
    const [isHovered, setIsHovered] = useState(false);

    // ------------------------------------------------------------------
    // 1. CONNECTIVITY ANALYZER
    // ------------------------------------------------------------------
    // This hook identifies all nodes connected to the INPUT (Target) of this node.
    // It creates a list of 'sources' that the AI will use for analysis.
    const connectedSources = useMemo(() => {
        // Find edges where this node is the target
        const sourceEdges = edges.filter(e => e.target === id);
        const nodes = getNodes();

        // Map edges to actual node objects and extract metadata
        return sourceEdges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            if (!sourceNode) return null;

            return {
                id: sourceNode.id,
                type: sourceNode.type,
                label: sourceNode.data?.label || sourceNode.type,
                // Check if the source node actually has data ready to be analyzed
                hasData: !!(sourceNode.data?.datasetId || sourceNode.data?.processedDatasetId)
            };
        }).filter(Boolean);
    }, [edges, id, getNodes]);

    const hasConnections = connectedSources.length > 0;
    const allConnectedHaveData = connectedSources.every(s => s.hasData);
    const isReady = hasConnections && allConnectedHaveData;

    const handleDelete = () => {
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodes((nds) => nds.filter((n) => n.id !== id));
    };

    // Source type to icon mapping
    const getSourceIcon = (type) => {
        switch (type) {
            case 'database': return Database;
            case 'file': return FileUp;
            case 'api': return Globe;
            case 'graph': return BarChart3;
            case 'table': return Table;
            default: return Database;
        }
    };

    const getSourceColor = (type) => {
        switch (type) {
            case 'database': return 'text-amber-600';
            case 'file': return 'text-indigo-600';
            case 'api': return 'text-purple-600';
            case 'graph': return 'text-blue-600';
            case 'table': return 'text-emerald-600';
            default: return 'text-slate-600';
        }
    };

    return (
        <div
            className={`bg-white border-2 rounded-2xl shadow-xl w-full h-full min-w-[320px] min-h-[260px] flex flex-col relative transition-all duration-300 ${isReady ? 'border-purple-500 shadow-purple-200' :
                hasConnections ? 'border-amber-400 shadow-amber-100' :
                    'border-slate-200 hover:border-purple-300'
                }`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Resizer */}
            <NodeResizer
                minWidth={320}
                minHeight={260}
                isVisible={selected}
                lineStyle={{ border: '2px solid #a855f7' }}
                color="#a855f7"
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-3 flex items-center justify-between border-b border-purple-100 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isReady ? 'bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-300' :
                        'bg-purple-100'
                        }`}>
                        <Bot className={`w-5 h-5 ${isReady ? 'text-white' : 'text-purple-500'}`} />
                        {isReady && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Multi-AI Analyst</h3>
                        <span className="text-[10px] text-purple-500 font-medium">S.A.M.A.R.T.H. v2</span>
                    </div>
                </div>
                <button
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* AI Agents Bar */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Agents:</span>
                {AI_AGENTS.map(agent => (
                    <div
                        key={agent.id}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${isReady ? 'animate-pulse' : ''
                            }`}
                        style={{
                            backgroundColor: agent.color + '15',
                            borderColor: agent.color + '40',
                            color: agent.color
                        }}
                        title={agent.description}
                    >
                        <span className="text-sm">{agent.emoji}</span>
                        <span>{agent.name.split(' ')[0]}</span>
                    </div>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col">
                {/* Connected Sources */}
                <div className="mb-4">
                    <span className="text-[10px] text-slate-400 uppercase font-bold mb-2 block">Connected Sources</span>
                    {connectedSources.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {connectedSources.map(source => {
                                const Icon = getSourceIcon(source.type);
                                return (
                                    <div
                                        key={source.id}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${source.hasData
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                            }`}
                                    >
                                        <Icon className={`w-3.5 h-3.5 ${getSourceColor(source.type)}`} />
                                        <span className="capitalize">{source.type}</span>
                                        {source.hasData ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-50 px-3 py-2 rounded-lg border border-dashed border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></span>
                            Drag a connection from a data source to this node
                        </div>
                    )}
                </div>

                {/* Status */}
                <div className="flex-1 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-50/50 to-white rounded-xl p-4">
                    {isReady ? (
                        <>
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mb-3 shadow-xl shadow-purple-200">
                                <Zap className="w-8 h-8 text-white" />
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mb-1">Ready for Analysis!</h4>
                            <p className="text-xs text-slate-500 max-w-[220px]">
                                <span className="text-purple-600 font-bold">{connectedSources.length}</span> source{connectedSources.length > 1 ? 's' : ''} connected.
                                Click <span className="font-semibold text-purple-600">Result</span> tab to run AI analysis.
                            </p>
                        </>
                    ) : hasConnections ? (
                        <>
                            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-3 border-2 border-amber-200">
                                <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                            </div>
                            <h4 className="text-base font-semibold text-amber-700">Loading Data...</h4>
                            <p className="text-xs text-slate-500 mt-1">Connected sources are preparing data</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 border-2 border-dashed border-slate-300">
                                <Bot className="w-8 h-8 text-slate-400" />
                            </div>
                            <h4 className="text-base font-semibold text-slate-600">Connect Data Sources</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                                Connect Tables, Files, or Database nodes to enable AI analysis
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gradient-to-r from-slate-50 to-purple-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between rounded-b-xl">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                        {isReady ? 'Consensus Engine Ready' : 'Awaiting Input'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-3.5 h-3.5 ${isReady ? 'text-purple-500' : 'text-slate-400'}`} />
                    <span className="text-[10px] text-slate-500 font-medium">3 AI Agents</span>
                </div>
            </div>

            {/* Input Handle (Left) - LARGE & VISIBLE */}
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!w-5 !h-5 !bg-purple-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                style={{ top: '50%', left: '-10px' }}
            />

            {/* Output Handle (Right) - For connecting to Graph nodes */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!w-5 !h-5 !bg-emerald-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                style={{ top: '50%', right: '-10px' }}
            />
        </div>
    );
};

export default memo(AnalysisNode);
