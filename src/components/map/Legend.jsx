import React from 'react';
import { Layers } from 'lucide-react';

const Legend = () => {
    return (
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-gray-200 text-xs font-sans max-w-[180px]">
            <div className="flex items-center gap-1.5 mb-1.5 border-b border-gray-100 pb-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold text-gray-700">Map Coloring</span>
            </div>
            <p className="text-gray-600 leading-relaxed mb-1">
                Regions are distinctively colored by their <span className="font-semibold text-blue-700">State/Circle</span>.
            </p>
            <div className="mt-2 flex items-center gap-2 bg-blue-50 p-1.5 rounded border border-blue-100">
                <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-blue-600 font-medium">Click for details</span>
            </div>
        </div>
    );
};

export default Legend;
