import React from 'react';
import PincodeMap from '../components/map/PincodeMap';

const GeoAnalysis = () => {
    // Using a specific height calculation ensures the Leaflet map has a definite container size
    // 100vh - 64px (App Header) roughly. 
    // We strive for full height within the main area.
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] w-full">
            {/* Minimal Header */}
            <div className="flex-none px-4 py-2 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-10 relative h-12">
                <div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Geospatial Analysis</h2>
                </div>
                <div className="flex gap-2">
                    <span className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded border border-green-100 hidden sm:inline-block font-medium">Live Data</span>
                </div>
            </div>
            {/* Full Screen Map Container */}
            <div className="flex-1 p-0 bg-gray-50 relative overflow-hidden h-full w-full">
                <PincodeMap />
            </div>
        </div>
    );
};

export default GeoAnalysis;
