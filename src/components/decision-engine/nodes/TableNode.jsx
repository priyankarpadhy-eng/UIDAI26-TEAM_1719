import React, { memo } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from 'reactflow';
import { Table, X } from 'lucide-react';
import { TableVisualizer } from '../visualizers/TableVisualizer';

const TableNode = ({ id, data, isConnectable, selected }) => {
    const { setNodes, setEdges, getNode } = useReactFlow();

    // Prevent massive expansion when data is connected
    React.useEffect(() => {
        const hasData = !!(data.datasetId || data.inputDatasetId || (data.inputData && data.inputData.length > 0));

        if (hasData) {
            const node = getNode(id);
            // If the node doesn't have an explicit height set (meaning user hasn't resized it),
            // set a default fixed size to prevent it from expanding to show all rows.
            if (node && !node.style?.height && !node.height) {
                setNodes((nds) => nds.map((n) => {
                    if (n.id === id) {
                        return {
                            ...n,
                            style: {
                                ...n.style,
                                width: n.style?.width || 600,
                                height: 400,
                            },
                        };
                    }
                    return n;
                }));
            }
        }
    }, [data.datasetId, data.inputDatasetId, data.inputData, id, getNode, setNodes]);

    const handleDelete = () => {
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodes((nds) => nds.filter((n) => n.id !== id));
    };

    return (
        <div className="w-full h-full relative min-w-[300px] min-h-[200px]">
            <NodeResizer
                color="#10b981"
                isVisible={selected}
                minWidth={300}
                minHeight={200}
                lineStyle={{ border: '2px solid #10b981' }}
            />

            <div className="bg-white border-2 border-emerald-300 rounded-2xl shadow-lg w-full h-full flex flex-col relative overflow-hidden hover:border-emerald-400 transition-colors hover:shadow-emerald-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 flex items-center justify-between border-b border-emerald-100 flex-shrink-0 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-200">
                            <Table className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-slate-700">Table View</span>
                            {data.connectionType && (
                                <span className={`text-[10px] block mt-0.5 font-medium ${data.connectionType.includes('Direct') ? 'text-blue-500' : 'text-purple-500'
                                    }`}>
                                    {data.connectionType}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden relative bg-slate-50">
                    <TableVisualizer
                        datasetId={data.datasetId || data.inputDatasetId}
                        inputData={data.inputData}
                    />
                </div>

                {/* Input Handle (Left) - LARGE */}
                <Handle
                    type="target"
                    position={Position.Left}
                    isConnectable={isConnectable}
                    className="!w-5 !h-5 !bg-emerald-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                    style={{ top: '50%', left: '-10px' }}
                />

                {/* Output Handle (Right) - LARGE */}
                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                    className="!w-5 !h-5 !bg-emerald-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                    style={{ top: '50%', right: '-10px' }}
                />
            </div>
        </div>
    );
};

export default memo(TableNode);
