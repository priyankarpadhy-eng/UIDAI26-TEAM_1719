import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { loadMapData, getMergedPincodeData, createStatsLookup } from '../../utils/dataUtils';
import PincodePopup from './PincodePopup';
import { ContextMenu } from './ContextMenu';
import { useData } from '../../context/DataContext';
import L from 'leaflet';
import { Search, Map as MapIcon, X, ChevronRight, GripVertical, Database } from 'lucide-react';

// Component to handle bounds
const MapBounds = ({ data }) => {
    const map = useMap();
    useEffect(() => {
        if (data) {
            const geoJsonLayer = L.geoJSON(data);
            try {
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20], maxZoom: 12 });
                }
            } catch (e) {
                console.warn("Could not fit bounds", e);
            }
        }
    }, [data, map]);
    return null;
};

const PincodeMap = ({ externalData = null }) => {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [statsLookup, setStatsLookup] = useState({}); // Default Mock Data Lookup
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [searchText, setSearchText] = useState('');

    // Context Data (Live Analysis)
    const { processedData, isSyncing, lastAnalysisTime, scanProgress, fetchPincodeData } = useData();

    // Interaction States
    const [activePopup, setActivePopup] = useState(null);
    const [selectedFeature, setSelectedFeature] = useState(null);

    // Context Menu State (Moved to top level)
    const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0, pincode: null });

    const handleMenuAction = (action) => {
        if (!menuState.pincode) return;

        console.log(`Context Menu Action: ${action} on ${menuState.pincode}`);

        switch (action) {
            case 'NODES':
                // Focus Logic Engine
                // If there's a prop to open engine, use it, otherwise simple alert for now
                alert(`Initializing Logic Synthesis for Sector ${menuState.pincode}...`);
                break;
            case 'AI_BRIEF':
                alert(`Requesting Classified AI Briefing for ${menuState.pincode}...`);
                break;
            case 'PDF':
                alert(`Generating Authorized Deployment Order for ${menuState.pincode}...`);
                break;
            case 'COPY':
                navigator.clipboard.writeText(menuState.pincode);
                // Optional: Show a toast
                break;
            default:
                break;
        }
    };

    // Resizable Panel API
    const [panelWidth, setPanelWidth] = useState(320);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const sidebarRef = useRef(null);

    // Optimized Lookup for Live Data
    const liveDataLookup = useMemo(() => {
        const lookup = {};

        // Priority: External Data (AI Result) > Context Data (File Uploads)
        const sourceData = externalData || processedData;

        sourceData.forEach(item => {
            // Normalize structure: AI result might be simple { metrics: ... } or just raw value?
            // The AI Service returns { "751024": 500 }. We need to adapt it to the map's expected format.
            if (externalData) {
                // Adapter for AI simple dict format if necessary, 
                // OR assume InterpreterDashboard passes it in the correct [{ Pincode, metrics... }] format.
                // Let's assume InterpreterDashboard handles the formatting to match processedData structure.
                lookup[item.Pincode] = item.metrics;
            } else {
                lookup[item.Pincode] = item.metrics;
            }
        });
        return lookup;
    }, [processedData, externalData]);

    // Memoize the Active Pincode Feature for separate layer (Performance Optimization)
    const activePincodeFeature = useMemo(() => {
        if (!geoJsonData || !scanProgress?.activePincode) return null;
        return geoJsonData.features.find(f => f.properties.Pincode === scanProgress.activePincode);
    }, [geoJsonData, scanProgress?.activePincode]);

    // Resize Handlers
    const startResizing = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsDragging(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resize = useCallback((mouseMoveEvent) => {
        if (isDragging) {
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;
            if (newWidth > 250 && newWidth < 800) {
                setPanelWidth(newWidth);
            }
        }
    }, [isDragging]);

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);


    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                const { boundaryData, statsData } = await loadMapData();
                setGeoJsonData(boundaryData);
                setStatsLookup(createStatsLookup(statsData));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    // Update Leaflet size when panel changes
    useEffect(() => {
        if (mapInstance) {
            setTimeout(() => {
                mapInstance.invalidateSize();
            }, 100);
        }
    }, [panelWidth, isPanelCollapsed, mapInstance]);

    const selectPincodeFeature = async (feature, center) => {
        setSelectedFeature(feature);
        const pincode = feature.properties.Pincode;

        // First, try to get data from database (same as search)
        console.log(`Fetching data for pincode: ${pincode}`);
        const dbData = await fetchPincodeData(pincode);

        let mergedData;

        if (dbData) {
            // Database data found! Merge with GeoJSON properties for location info
            console.log('Using database data for pincode:', pincode);
            mergedData = {
                ...dbData,
                // Add GeoJSON properties (Office Name, Division, Circle)
                Office_Name: feature.properties.Office_Name || feature.properties.Officename || dbData.State,
                Division: feature.properties.Division || dbData.District,
                Circle: feature.properties.Circle || dbData.State
            };
        } else {
            // Fallback: Use mock data or live data lookup
            console.log('Database data not found, using fallback for pincode:', pincode);
            mergedData = getMergedPincodeData(feature.properties, statsLookup);
            const liveMetrics = liveDataLookup[pincode];

            if (liveMetrics) {
                mergedData = {
                    ...mergedData,
                    total_enrollments: liveMetrics.totalEnrollments,
                    updates: liveMetrics.updates, // Combined updates
                    biometric_updates: liveMetrics.biometricUpdates || 0,
                    demographic_updates: liveMetrics.demographicUpdates || 0,
                    rejections: liveMetrics.rejections,

                    // Pass age breakdowns to the popup
                    enrollmentAgeBreakdown: liveMetrics.enrollmentAgeBreakdown,
                    biometricAgeBreakdown: liveMetrics.biometricAgeBreakdown,
                    demographicAgeBreakdown: liveMetrics.demographicAgeBreakdown
                };
            }
        }

        setActivePopup({
            position: center,
            data: mergedData
        });
        setIsPanelCollapsed(false);
    };

    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!geoJsonData || !searchText.trim() || !mapInstance) return;

        const term = searchText.trim();

        // First, try to fetch data from database
        console.log(`Searching for pincode: ${term}`);
        const dbData = await fetchPincodeData(term);

        if (dbData) {
            console.log('Found pincode data in database:', dbData);

            // If the pincode also exists in the boundary map, merge with GeoJSON properties
            const feature = geoJsonData.features.find(f => f.properties.Pincode === term);

            let finalData = dbData;
            if (feature) {
                // Merge database data with GeoJSON properties for location info
                finalData = {
                    ...dbData,
                    Office_Name: feature.properties.Office_Name || feature.properties.Officename || dbData.State,
                    Division: feature.properties.Division || dbData.District,
                    Circle: feature.properties.Circle || dbData.State
                };

                const tempLayer = L.geoJSON(feature);
                const bounds = tempLayer.getBounds();
                mapInstance.flyToBounds(bounds, { padding: [200, 200], maxZoom: 12, duration: 1.5 });
                setSelectedFeature(feature);
            } else {
                console.log('Pincode data found in database but boundary not in map');
            }

            // Show data from database
            setActivePopup({
                position: null, // Will show in panel without map focus
                data: finalData
            });
            setIsPanelCollapsed(false);
        } else {
            // Fallback: Check if pincode exists in boundary map with mock data
            const feature = geoJsonData.features.find(f => f.properties.Pincode === term);
            if (feature) {
                const tempLayer = L.geoJSON(feature);
                const bounds = tempLayer.getBounds();
                const center = bounds.getCenter();

                mapInstance.flyToBounds(bounds, { padding: [200, 200], maxZoom: 12, duration: 1.5 });
                selectPincodeFeature(feature, center);
            } else {
                alert(`PIN Code ${term} not found in database or map boundaries.`);
            }
        }
    };

    const onEachFeatureReact = (feature, layer) => {
        const pincode = feature.properties.Pincode;
        const liveMetrics = liveDataLookup[pincode];

        // Default Style
        let fillColor = 'transparent';
        let fillOpacity = 0;
        let weight = 1;
        let color = 'transparent'; // Default transparent as requested

        // Dynamic Choropleth Logic (only if live data exists)
        if (liveMetrics) {
            fillOpacity = 0.6;
            const enrollments = liveMetrics.totalEnrollments;

            if (enrollments > 1000) fillColor = '#10B981'; // Green (High)
            else if (enrollments < 500) fillColor = '#EF4444'; // Red (Low)
            else fillColor = '#FBBF24'; // Amber (Medium)

            // Make live data borders slightly thicker
            color = '#374151'; // Slightly darker gray
        }

        layer.setStyle({
            fillColor: fillColor,
            weight: weight,
            color: color,
            fillOpacity: fillOpacity,
        });

        layer.on({
            mouseover: (e) => {
                // On hover: Always show Blue border
                // If data exists (active fill), keep that fill but ensure opacity
                // If no data (transparent fill), give a faint blue tint so user knows they are hovering a region
                const hoverFill = liveMetrics ? fillColor : '#3B82F6';
                const hoverOpacity = liveMetrics ? fillOpacity : 0.1; // Faint blue for empty regions

                e.target.setStyle({
                    weight: 2,
                    color: '#3B82F6',
                    fillColor: hoverFill,
                    fillOpacity: hoverOpacity
                });
                e.target.bringToFront();
            },
            mouseout: (e) => {
                // Reset to exact original state
                e.target.setStyle({
                    fillColor: fillColor,
                    weight: weight,
                    color: color,
                    fillOpacity: fillOpacity
                });
            },
            click: (e) => {
                selectPincodeFeature(feature, e.latlng);
                L.DomEvent.stopPropagation(e);
            }
        });
    };

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-gray-500">Loading PIN Code Boundaries...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-red-50 rounded-xl border border-red-200">
                <div className="text-center p-6">
                    <p className="text-red-500 font-bold mb-2">Error Loading Map</p>
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            </div>
        );
    }







    return (
        <div className="relative h-full w-full group flex bg-white font-sans overflow-hidden">
            {/* Render Context Menu */}
            {menuState.visible && (
                <ContextMenu
                    x={menuState.x}
                    y={menuState.y}
                    pincode={menuState.pincode}
                    onClose={() => setMenuState({ ...menuState, visible: false })}
                    onAction={handleMenuAction}
                />
            )}

            {/* 1. Map Area */}
            <div className="flex-1 relative h-full bg-[#f0f4f7] min-w-0 transition-all duration-75">
                <MapContainer
                    ref={setMapInstance}
                    center={[22.5937, 82.9629]}
                    zoom={5}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                    zoomControl={false}
                    preferCanvas={true}
                    minZoom={4}
                    maxZoom={18}
                    maxBounds={[
                        [5.0, 65.0],   // Southwest corner (South of India + buffer)
                        [38.0, 100.0]  // Northeast corner (North of India + buffer)
                    ]}
                    maxBoundsViscosity={0.8}
                    // Close menu on map interaction
                    whenReady={(map) => {
                        map.target.on('mousedown', () => setMenuState(prev => ({ ...prev, visible: false })));
                        map.target.on('dragstart', () => setMenuState(prev => ({ ...prev, visible: false })));
                        map.target.on('zoomstart', () => setMenuState(prev => ({ ...prev, visible: false })));
                    }}
                >
                    {/* Satellite Base Layer - ESRI World Imagery */}
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />

                    {/* Labels Overlay for roads and place names */}
                    <TileLayer
                        attribution='Labels &copy; <a href="https://carto.com/">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                    />



                    // ...

                    {/* Base Layer with Dynamic Coloring */}
                    {geoJsonData && (
                        <GeoJSON
                            key={lastAnalysisTime ? lastAnalysisTime.getTime() : 'initial'} // Force re-render on data update
                            data={geoJsonData}
                            onEachFeature={(feature, layer) => {
                                // Existing Logic
                                onEachFeatureReact(feature, layer);

                                // Context Menu Logic
                                layer.on({
                                    contextmenu: (e) => {
                                        L.DomEvent.stopPropagation(e);
                                        e.originalEvent.preventDefault();

                                        // Set menu state
                                        setMenuState({
                                            visible: true,
                                            x: e.originalEvent.clientX,
                                            y: e.originalEvent.clientY,
                                            pincode: feature.properties.Pincode
                                        });
                                    }
                                });
                            }}
                            style={() => ({ weight: 1, color: '#FFFFFF', fillOpacity: 0 })}
                        />
                    )}

                    {/* SCANNER HIGHLIGHT LAYER (Separate for performance) */}
                    {activePincodeFeature && (
                        <GeoJSON
                            key={`scan-${activePincodeFeature.properties.Pincode}`}
                            data={activePincodeFeature}
                            style={() => ({
                                weight: 4,
                                color: '#10B981', // Bright Green
                                fillColor: '#10B981',
                                fillOpacity: 0.4,
                                interactive: false
                            })}
                        />
                    )}

                    {/* Highlight Selected Boundary */}
                    {selectedFeature && (
                        <GeoJSON
                            key={selectedFeature.properties.Pincode}
                            data={selectedFeature}
                            style={() => ({
                                weight: 3,
                                color: '#F59E0B',
                                fillColor: 'transparent',
                                fillOpacity: 0,
                                interactive: false
                            })}
                        />
                    )}

                    {geoJsonData && !searchText && <MapBounds data={geoJsonData} />}

                </MapContainer>

                {/* Toggle Button for Panel */}
                {isPanelCollapsed && (
                    <button
                        onClick={() => setIsPanelCollapsed(false)}
                        className="absolute top-4 right-4 z-[400] bg-white text-blue-600 p-2 rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
                        title="Open Search Panel"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                )}

                {/* Status Badge */}
                <div className={`absolute top-4 left-4 z-[400] backdrop-blur px-3 py-1 rounded-full text-xs font-bold border shadow-sm flex items-center gap-2 transition-colors
              ${processedData.length > 0
                        ? "bg-green-500/90 text-white border-green-400"
                        : "bg-white/90 text-blue-700 border-blue-100"
                    }
          `}>
                    {isSyncing ? (
                        <>
                            <span className="w-2 h-2 rounded-full border border-white border-t-transparent animate-spin"></span>
                            Syncing...
                        </>
                    ) : processedData.length > 0 ? (
                        <>
                            <Database className="w-3 h-3" />
                            Live Data Active
                        </>
                    ) : (
                        <>
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Base Map Ready
                        </>
                    )}
                </div>
            </div>

            {/* 2. Resizable Right Panel */}
            <div
                ref={sidebarRef}
                className="h-full bg-white border-l border-gray-200 shadow-xl z-[500] flex flex-col shrink-0 relative"
                style={{ width: isPanelCollapsed ? 0 : panelWidth, transition: isDragging ? 'none' : 'width 0.3s ease' }}
            >
                {/* Resize Handle */}
                {!isPanelCollapsed && (
                    <div
                        onMouseDown={startResizing}
                        className="absolute left-0 top-0 bottom-0 w-1.5 hover:w-2 cursor-col-resize z-[50] flex items-center justify-center group/handle hover:bg-blue-400/20 -translate-x-1/2 transition-all"
                    >
                        <div className="h-8 w-1 rounded-full bg-gray-300 group-hover/handle:bg-blue-400 transition-colors"></div>
                    </div>
                )}

                {/* Collapse Button */}
                {!isPanelCollapsed && (
                    <button
                        onClick={() => setIsPanelCollapsed(true)}
                        className="absolute -left-3 top-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-400 hover:text-blue-600 z-[600]"
                        title="Collapse Panel"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                )}

                {/* Panel Content */}
                <div className="flex flex-col h-full w-full overflow-hidden whitespace-nowrap">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm z-20 shrink-0">
                        <h2 className="text-xs font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent mb-2 uppercase tracking-wider flex items-center gap-2">
                            <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                            Geo Explorer
                        </h2>

                        <form onSubmit={handleSearch} className="group relative flex items-center">
                            <input
                                type="text"
                                placeholder="Search PIN Code..."
                                className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-3 pr-8 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <button type="submit" className="absolute right-2 text-gray-400 hover:text-blue-600 transition-colors p-1">
                                <Search className="w-3.5 h-3.5" />
                            </button>
                            {(searchText || selectedFeature) && (
                                <button type="button" onClick={() => { setSearchText(''); setActivePopup(null); setSelectedFeature(null); }} className="absolute right-8 text-gray-300 hover:text-red-400 transition-colors p-1">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </form>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {activePopup ? (
                            <div className="h-full w-full overflow-hidden">
                                <PincodePopup
                                    data={activePopup.data}
                                    onClose={() => { setActivePopup(null); setSelectedFeature(null); }}
                                    map={mapInstance}
                                />
                            </div>
                        ) : (
                            <div className="h-full w-full overflow-y-auto p-4 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 mt-8">
                                    <MapIcon className="w-6 h-6 text-blue-400 opacity-80" />
                                </div>
                                <h3 className="text-gray-800 font-bold mb-1 text-sm">Interactive Map</h3>
                                <p className="text-[10px] text-gray-500 max-w-[200px]">
                                    Select a region or search to view detailed statistics.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resize Overlay */}
            {isDragging && <div className="fixed inset-0 z-[9999] cursor-col-resize"></div>}

        </div>
    );
};

export default PincodeMap;
