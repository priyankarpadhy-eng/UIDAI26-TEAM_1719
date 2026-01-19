import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { stateData, formatIndianNumber } from '../../data/mockData';

const EnrollmentMap = () => {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-[400px] z-0 overflow-hidden relative">
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md border border-white/50">
                <h3 className="text-sm font-bold text-gray-800">Live Enrollment Centers</h3>
                <p className="text-[10px] text-gray-500">Active centers across major hubs</p>
            </div>

            <MapContainer
                center={[22.5937, 82.9629]}
                zoom={4}
                scrollWheelZoom={false}
                className="h-full w-full rounded-lg z-0"
                zoomControl={false}
                minZoom={4}
                maxZoom={12}
                maxBounds={[
                    [5.0, 65.0],   // Southwest corner (South of India + buffer)
                    [38.0, 100.0]  // Northeast corner (North of India + buffer)
                ]}
                maxBoundsViscosity={0.8}
            >
                {/* Satellite Base Layer - ESRI World Imagery */}
                <TileLayer
                    attribution='Tiles &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />

                {/* Labels Overlay */}
                <TileLayer
                    attribution='Labels &copy; CARTO'
                    url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                />

                {stateData.map((location, index) => (
                    <CircleMarker
                        key={index}
                        center={[location.lat, location.lng]}
                        pathOptions={{
                            fillColor: location.rejection_rate > 2 ? '#f05252' : '#10b981',
                            color: 'white',
                            weight: 2,
                            fillOpacity: 0.85
                        }}
                        radius={Math.sqrt(location.enrollment_count) / 1500} // Dynamic sizing
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1} className="custom-tooltip">
                            <div className="p-2">
                                <p className="font-bold text-sm text-gray-800">{location.state}</p>
                                <p className="text-xs text-gray-600">Enrollments: {formatIndianNumber(location.enrollment_count)}</p>
                                <p className="text-xs text-gray-500">Rejection Rate: {location.rejection_rate}%</p>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                ))}
            </MapContainer>
        </div>
    );
};

export default EnrollmentMap;
