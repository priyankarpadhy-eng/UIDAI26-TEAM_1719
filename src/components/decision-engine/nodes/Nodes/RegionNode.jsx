import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { MapPin, Filter } from 'lucide-react';

const RegionNode = ({ data, isConnectable }) => {
    // data.region contains { state, district, pincode }
    // data.onChange used to update filter

    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative flex flex-col bg-[#0a0f1c]/90 backdrop-blur-xl border border-indigo-500/30 rounded-xl p-0 min-w-[220px] shadow-2xl overflow-hidden">
                <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-black" />

                {/* Header */}
                <div className="bg-white/5 p-3 border-b border-white/5 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">Geo Filter</span>
                </div>

                {/* Body */}
                <div className="p-3 space-y-3">
                    {/* State Selector */}
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 font-mono uppercase">State</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded text-xs text-indigo-300 p-1.5 focus:border-indigo-500 outline-none font-mono"
                            value={data.region?.state || ''}
                            onChange={(e) => data.onChange({ ...data.region, state: e.target.value })}
                        >
                            <option value="">All States</option>
                            {/* Populate dynamically if available in data.uniqueStates */}
                            {data.uniqueStates?.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* District Selector */}
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 font-mono uppercase">District</label>
                        <select
                            className="w-full bg-black/40 border border-white/10 rounded text-xs text-indigo-300 p-1.5 focus:border-indigo-500 outline-none font-mono"
                            value={data.region?.district || ''}
                            onChange={(e) => data.onChange({ ...data.region, district: e.target.value })}
                            disabled={!data.region?.state}
                        >
                            <option value="">All Districts</option>
                            {data.uniqueDistricts?.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* Pincode Input */}
                    <div className="space-y-1">
                        <label className="text-[9px] text-gray-500 font-mono uppercase">Pincode (Exact)</label>
                        <input
                            type="text"
                            className="w-full bg-black/40 border border-white/10 rounded text-xs text-indigo-300 p-1.5 focus:border-indigo-500 outline-none font-mono placeholder:text-gray-700"
                            placeholder="e.g. 110001"
                            value={data.region?.pincode || ''}
                            onChange={(e) => data.onChange({ ...data.region, pincode: e.target.value })}
                        />
                    </div>
                </div>

                <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-black" />
            </div>
        </div>
    );
};

export default memo(RegionNode);
