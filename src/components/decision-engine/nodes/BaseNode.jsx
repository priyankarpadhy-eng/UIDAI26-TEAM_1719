import React, { memo, useRef } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from 'reactflow';
import { X, GripVertical } from 'lucide-react';
import { useCanvas } from '../context/CanvasContext.jsx';

const BaseNode = ({
    id,
    title,
    icon: Icon,
    color = 'blue',
    children,
    className = '',
    selected,
    handles = [], // ['left', 'right', 'top', 'bottom']
    isConnectable = true
}) => {
    const { isCanvasLocked } = useCanvas();
    const { setNodes, setEdges } = useReactFlow();
    const nodeRef = useRef(null);

    // Bright Theme Color Map
    const colorMap = {
        blue: {
            header: 'bg-gradient-to-r from-blue-600 to-blue-500',
            border: 'border-blue-200',
            ring: 'ring-blue-400',
            handle: 'bg-blue-500',
            icon: 'text-white'
        },
        green: {
            header: 'bg-gradient-to-r from-emerald-600 to-emerald-500',
            border: 'border-emerald-200',
            ring: 'ring-emerald-400',
            handle: 'bg-emerald-500',
            icon: 'text-white'
        },
        purple: {
            header: 'bg-gradient-to-r from-purple-600 to-purple-500',
            border: 'border-purple-200',
            ring: 'ring-purple-400',
            handle: 'bg-purple-500',
            icon: 'text-white'
        },
        amber: {
            header: 'bg-gradient-to-r from-amber-500 to-orange-500',
            border: 'border-amber-200',
            ring: 'ring-amber-400',
            handle: 'bg-amber-500',
            icon: 'text-white'
        },
        red: {
            header: 'bg-gradient-to-r from-red-600 to-red-500',
            border: 'border-red-200',
            ring: 'ring-red-400',
            handle: 'bg-red-500',
            icon: 'text-white'
        },
        cyan: {
            header: 'bg-gradient-to-r from-cyan-600 to-cyan-500',
            border: 'border-cyan-200',
            ring: 'ring-cyan-400',
            handle: 'bg-cyan-500',
            icon: 'text-white'
        },
        pink: {
            header: 'bg-gradient-to-r from-pink-600 to-pink-500',
            border: 'border-pink-200',
            ring: 'ring-pink-400',
            handle: 'bg-pink-500',
            icon: 'text-white'
        },
        indigo: {
            header: 'bg-gradient-to-r from-indigo-600 to-indigo-500',
            border: 'border-indigo-200',
            ring: 'ring-indigo-400',
            handle: 'bg-indigo-500',
            icon: 'text-white'
        },
    };

    const styles = colorMap[color] || colorMap.blue;

    const handleDelete = (e) => {
        e.stopPropagation();
        setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
        setNodes((nds) => nds.filter((node) => node.id !== id));
    };

    // Scroll to Resize Logic
    const handleWheel = (e) => {
        if (!isCanvasLocked || !selected) return;
        e.stopPropagation();
        e.preventDefault();
        const delta = e.deltaY * -0.5;

        setNodes((nodes) => nodes.map(node => {
            if (node.id === id) {
                const currentWidth = parseInt(node.style?.width || 300);
                const newWidth = Math.max(250, currentWidth + delta);
                return {
                    ...node,
                    style: { ...node.style, width: newWidth }
                };
            }
            return node;
        }));
    };

    return (
        <div
            ref={nodeRef}
            onWheel={handleWheel}
            className={`
                bg-white border-2 ${styles.border} rounded-xl shadow-xl 
                ${selected ? `ring-2 ring-offset-2 ring-offset-white ${styles.ring}` : ''}
                min-w-[300px] transition-all duration-200 relative group
                ${className}
            `}
            style={{ height: '100%' }}
        >
            <NodeResizer
                isVisible={selected}
                minWidth={300}
                minHeight={150}
                color="#94a3b8"
                handleStyle={{ width: 12, height: 12, borderRadius: 3 }}
                lineStyle={{ border: `1px solid #cbd5e1` }}
            />

            {/* Header */}
            <div className={`${styles.header} px-4 py-3 flex items-center justify-between rounded-t-[10px]`}>
                <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-5 h-5 ${styles.icon}`} />}
                    <span className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-sm">{title}</span>
                </div>
                <button
                    onClick={handleDelete}
                    className="p-1.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 h-full flex flex-col bg-white rounded-b-xl">
                {children}
            </div>

            {/* Configurable Handles */}
            {handles.includes('left') && (
                <Handle
                    type="target"
                    position={Position.Left}
                    isConnectable={isConnectable}
                    className={`w-3.5 h-3.5 border-2 border-white transition-all -ml-2 shadow-md ${styles.handle}`}
                />
            )}
            {handles.includes('right') && (
                <Handle
                    type="source"
                    position={Position.Right}
                    isConnectable={isConnectable}
                    className={`w-3.5 h-3.5 border-2 border-white transition-all -mr-2 shadow-md ${styles.handle}`}
                />
            )}
            {handles.includes('top') && (
                <Handle
                    type="target"
                    position={Position.Top}
                    isConnectable={isConnectable}
                    className={`w-3.5 h-3.5 border-2 border-white transition-all -mt-2 shadow-md ${styles.handle}`}
                />
            )}
            {handles.includes('bottom') && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    isConnectable={isConnectable}
                    className={`w-3.5 h-3.5 border-2 border-white transition-all -mb-2 shadow-md ${styles.handle}`}
                />
            )}
        </div>
    );
};

export default memo(BaseNode);
