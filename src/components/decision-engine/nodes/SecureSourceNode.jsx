import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Database, Lock, X } from 'lucide-react';

const SecureSourceNode = ({ data }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="bg-white border-2 border-amber-400 shadow-lg rounded-xl w-64 overflow-hidden relative transition-all hover:shadow-xl hover:shadow-amber-100"
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

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-100 to-amber-50 p-2 flex items-center justify-between border-b border-amber-200">
                <div className="flex items-center gap-2">
                    <div className="bg-amber-200/50 p-1.5 rounded-md">
                        <Lock className="w-3 h-3 text-amber-600" />
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Secure Source</span>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>

            {/* Content */}
            <div className="p-3 bg-white">
                <div className="flex items-center gap-3 mb-3">
                    <Database className="w-8 h-8 text-amber-500" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">UIDAI Database</h3>
                        <p className="text-[10px] text-gray-500">Encrypted • Read-Only</p>
                    </div>
                </div>

                <div className="bg-amber-50 rounded-lg border border-amber-200 p-2">
                    <label className="text-[9px] text-amber-600 uppercase font-semibold block mb-1">Selected Table</label>
                    <select
                        className="w-full bg-white text-xs text-gray-800 border border-amber-200 rounded-lg px-2 py-1.5 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-colors cursor-pointer"
                        defaultValue="enrollments"
                    >
                        <option value="enrollments">enrollments (Master)</option>
                        <option value="biometrics">tbl_biometric_updates</option>
                    </select>
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Right}
                className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-md"
            />
        </div>
    );
};

export default memo(SecureSourceNode);
