import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { AlertOctagon, Zap, FileText, ChevronRight, X } from 'lucide-react';

const SOPActionNode = ({ data, isConnectable }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { title, urgency, actions, loading } = data.recommendation || {
        title: "Awaiting Trigger...",
        urgency: "low",
        actions: [],
        loading: true
    };

    const getUrgencyStyles = (u) => {
        if (!u) return { bg: 'blue-50', border: 'blue-400', text: 'blue-700', accent: 'blue-500' };
        switch (u.toLowerCase()) {
            case 'critical': return { bg: 'red-50', border: 'red-400', text: 'red-700', accent: 'red-500' };
            case 'high': return { bg: 'orange-50', border: 'orange-400', text: 'orange-700', accent: 'orange-500' };
            case 'medium': return { bg: 'amber-50', border: 'amber-400', text: 'amber-700', accent: 'amber-500' };
            default: return { bg: 'blue-50', border: 'blue-400', text: 'blue-700', accent: 'blue-500' };
        }
    };

    const styles = getUrgencyStyles(urgency || 'low');

    return (
        <div
            className={`bg-white border-2 border-rose-400 shadow-lg rounded-xl w-80 overflow-hidden relative transition-all hover:shadow-xl hover:shadow-rose-100`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Delete Button */}
            {isHovered && data.onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onDelete();
                    }}
                    className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition-all transform hover:scale-110"
                    title="Delete node"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className={`!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-md`}
            />

            {/* Header - Mission Style */}
            <div className={`bg-gradient-to-r from-rose-100 to-rose-50 p-3 border-b border-rose-200 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <AlertOctagon className={`w-4 h-4 text-rose-600`} />
                    <span className={`text-xs font-bold text-rose-700 uppercase tracking-widest`}>SOP Action Trigger</span>
                </div>
                <div className={`bg-${styles.bg} px-2 py-0.5 rounded-full text-[9px] font-bold text-${styles.text} uppercase border border-${styles.border}`}>
                    {urgency} Priority
                </div>
            </div>

            {/* AI Content */}
            <div className="p-4 bg-white min-h-[120px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-4 gap-2">
                        <Zap className={`w-6 h-6 text-rose-500 animate-bounce`} />
                        <span className={`text-xs text-rose-600 animate-pulse`}>Analyzing Flow Data...</span>
                        <span className="text-[10px] text-gray-400">Llama 3 Semantic Engine</span>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <h4 className="text-sm font-bold text-gray-800 mb-2 font-mono">{title}</h4>
                        <ul className="space-y-2 mb-4">
                            {actions.slice(0, 3).map((action, i) => (
                                <li key={i} className="flex gap-2 text-[11px] text-gray-600 leading-tight">
                                    <ChevronRight className={`w-3 h-3 text-rose-500 flex-shrink-0`} />
                                    {action}
                                </li>
                            ))}
                        </ul>

                        <button className={`w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg`}>
                            <FileText className="w-3 h-3" />
                            GENERATE OFFICIAL ORDER
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(SOPActionNode);
