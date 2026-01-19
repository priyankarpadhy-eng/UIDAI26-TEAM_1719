import React, { useMemo, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Database, MapPin, BarChart3, Table, Columns3, Globe, GitBranch,
    Trash2, Plus, FileUp, Calculator, Download, LayoutGrid, List, Bot
} from 'lucide-react';

// Custom Nodes
import DatabaseNode from './nodes/DatabaseNode';
import RegionNode from './nodes/RegionNode';
import GraphNode from './nodes/GraphNode';
import TableNode from './nodes/TableNode';
import ColumnNode from './nodes/ColumnNode';
import FileNode from './nodes/FileNode';
import APINode from './nodes/APINode';
import FilterLogicNode from './nodes/FilterLogicNode';
import MathNode from './nodes/MathNode';
import DownloadNode from './nodes/DownloadNode';
import AnalysisNode from './nodes/AnalysisNode';
import samarthLogo from '../../assets/samarth-ai-logo.png';

// Visualizers
import { ResultView } from './ResultView';

// Logic Hook
import { useNodeEngine } from './hooks/useNodeEngine';
import { CanvasProvider, useCanvas } from './context/CanvasContext.jsx';

// Initial empty state
const initialNodes = [];
const initialEdges = [];

const nodeCategories = [
    {
        title: 'Data Sources',
        items: [
            { type: 'database', label: 'Database', icon: Database, color: 'amber' },
            { type: 'file', label: 'File Upload', icon: FileUp, color: 'indigo' },
            { type: 'api', label: 'API', icon: Globe, color: 'purple' },
        ]
    },
    {
        title: 'Filters & Logic',
        items: [
            { type: 'region', label: 'Region', icon: MapPin, color: 'cyan' },
            { type: 'logic', label: 'Logic', icon: GitBranch, color: 'purple' },
            { type: 'column', label: 'Columns', icon: Columns3, color: 'pink' },
            { type: 'math', label: 'Math', icon: Calculator, color: 'indigo' },
        ]
    },
    {
        title: 'Visualizers & Export',
        items: [
            { type: 'graph', label: 'Graph', icon: BarChart3, color: 'blue' },
            { type: 'table', label: 'Table', icon: Table, color: 'green' },
            { type: 'analysis', label: 'AI Analyst', icon: Bot, color: 'purple' },
            { type: 'download', label: 'Export', icon: Download, color: 'emerald' },
        ]
    },
];

const DecisionCanvasContent = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setNodes,
        setEdges,
        clearCanvas,
        addNode
    } = useNodeEngine();

    // View State
    const [activeView, setActiveView] = useState('editor'); // 'editor' | 'results'

    // Initialize with demo data if needed
    React.useEffect(() => {
        if (nodes.length === 0) {
            setNodes(initialNodes);
            setEdges(initialEdges);
        }
    }, []);

    // WASD Keyboard Navigation
    const { getViewport, setViewport, getNodes, setNodes: setNodesRF } = useReactFlow();

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (activeView !== 'editor') return;
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            const nodes = getNodes();
            const selectedNodes = nodes.filter(n => n.selected);

            if (selectedNodes.length > 0) {
                const step = 20;
                setNodesRF(nds => nds.map(node => {
                    if (!node.selected) return node;
                    let pos = { ...node.position };
                    switch (e.key.toLowerCase()) {
                        case 'w': pos.y -= step; break;
                        case 's': pos.y += step; break;
                        case 'a': pos.x -= step; break;
                        case 'd': pos.x += step; break;
                    }
                    return { ...node, position: pos };
                }));
            } else {
                const { x, y, zoom } = getViewport();
                const step = 50;
                switch (e.key.toLowerCase()) {
                    case 'w': setViewport({ x, y: y - step, zoom }); break;
                    case 's': setViewport({ x, y: y + step, zoom }); break;
                    case 'a': setViewport({ x: x - step, y, zoom }); break;
                    case 'd': setViewport({ x: x + step, y, zoom }); break;
                    default: break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [getViewport, setViewport, getNodes, setNodesRF, activeView]);

    const nodeTypes = useMemo(() => ({
        database: DatabaseNode,
        file: FileNode,
        region: RegionNode,
        graph: GraphNode,
        table: TableNode,
        column: ColumnNode,
        api: APINode,
        logic: FilterLogicNode,
        math: MathNode,
        download: DownloadNode,
        analysis: AnalysisNode
    }), []);

    const colorMap = {
        amber: '#f59e0b',
        purple: '#a855f7',
        cyan: '#06b6d4',
        pink: '#ec4899',
        blue: '#3b82f6',
        green: '#10b981',
    };

    const [contextMenu, setContextMenu] = React.useState(null);
    const [isShiftPressed, setIsShiftPressed] = React.useState(false);
    const { isCanvasLocked, setIsCanvasLocked } = useCanvas();

    React.useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Shift') setIsShiftPressed(true); };
        const handleKeyUp = (e) => { if (e.key === 'Shift') setIsShiftPressed(false); };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const onPaneContextMenu = (event) => {
        event.preventDefault();
        setContextMenu({ x: event.clientX, y: event.clientY });
    };

    const handleStickCanvas = () => {
        setIsCanvasLocked(!isCanvasLocked);
        setContextMenu(null);
    };

    const closeContextMenu = () => setContextMenu(null);

    return (
        <div className="w-full h-[calc(100vh-64px)] bg-slate-50 flex flex-col">

            {/* Top Navigation Bar */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-3">
                    <img src={samarthLogo} alt="S.A.M.A.R.T.H. AI" className="h-8 w-auto" />
                    <div className="h-4 w-px bg-slate-300 mx-1"></div>
                    <span className="text-xs font-mono text-slate-500 tracking-wider">FLOW EDITOR</span>
                </div>

                {/* View Switcher */}
                <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
                    <button
                        onClick={() => setActiveView('editor')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        ${activeView === 'editor' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Nodes
                    </button>
                    <button
                        onClick={() => setActiveView('results')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                        ${activeView === 'results' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                        <List className="w-4 h-4" />
                        Result
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={clearCanvas}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden">

                {/* EDITOR VIEW */}
                <div className={`w-full h-full relative ${activeView === 'editor' ? 'block' : 'hidden'}`}>
                    <div
                        className="w-full h-full"
                        onClick={closeContextMenu}
                    >
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            nodeTypes={nodeTypes}
                            fitView
                            className="bg-slate-50"
                            defaultEdgeOptions={{
                                animated: true,
                                style: { stroke: '#3b82f6', strokeWidth: 2 }
                            }}
                            panOnDrag={!isCanvasLocked}
                            zoomOnScroll={isShiftPressed && !isCanvasLocked}
                            panOnScroll={false}
                            zoomOnPinch={!isCanvasLocked}
                            zoomOnDoubleClick={!isCanvasLocked}
                            preventScrolling={!isCanvasLocked}
                            onPaneContextMenu={onPaneContextMenu}
                        >
                            <Background color="#cbd5e1" gap={24} size={1} />
                            <Controls showInteractive={!isCanvasLocked} className="bg-white border-slate-200 fill-slate-600 rounded-lg shadow-sm" />
                            <MiniMap
                                nodeColor={(n) => colorMap[n.data?.color] || '#64748b'}
                                maskColor="rgba(241, 245, 249, 0.85)"
                                className="bg-white border border-slate-200 rounded-lg shadow-sm"
                            />

                            {isCanvasLocked && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500 text-red-600 px-3 py-1 rounded-full text-xs font-bold uppercase backdrop-blur-md flex items-center gap-2 z-50">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                    Canvas Locked
                                </div>
                            )}
                        </ReactFlow>

                        {/* Context Menu */}
                        {contextMenu && (
                            <div
                                className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl p-1 min-w-[150px]"
                                style={{ top: contextMenu.y, left: contextMenu.x }}
                            >
                                <button
                                    onClick={handleStickCanvas}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center gap-2"
                                >
                                    {isCanvasLocked ? "🔓 Unstick Canvas" : "🔒 Stick Canvas"}
                                </button>
                            </div>
                        )}

                        {/* Node Palette (Sidebar) */}
                        <div className="absolute top-4 left-4 w-48 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                    <Plus className="w-3 h-3" /> Add Nodes
                                </h2>
                            </div>
                            <div className="p-2 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                                {nodeCategories.map((category) => (
                                    <div key={category.title}>
                                        <p className="text-[9px] text-slate-400 uppercase font-semibold px-1 mb-1">
                                            {category.title}
                                        </p>
                                        <div className="space-y-1">
                                            {category.items.map((item) => (
                                                <button
                                                    key={item.type}
                                                    onClick={() => addNode(item.type)}
                                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all
                                                    bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200
                                                    text-slate-600 hover:text-blue-600 group`}
                                                >
                                                    <item.icon className={`w-3.5 h-3.5 text-${item.color}-500 group-hover:text-${item.color}-600`} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* RESULT VIEW */}
                {activeView === 'results' && (
                    <div className="absolute inset-0 z-40 bg-slate-50">
                        <ResultView nodes={nodes} edges={edges} />
                    </div>
                )}

            </div>
        </div>
    );
};

export default function DecisionCanvas() {
    return (
        <ReactFlowProvider>
            <CanvasProvider>
                <DecisionCanvasContent />
            </CanvasProvider>
        </ReactFlowProvider>
    );
}
