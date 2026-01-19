import React from 'react';
import { MapPin, Building, Hash, Navigation, Users, RefreshCw, UserX, CheckCircle, Maximize2 } from 'lucide-react';
import { formatNumber } from '../../utils/dataUtils';

const PincodePopup = ({ data, onClose, map }) => {
    if (!data) return null;

    // Debug: Log data to console to check source
    console.log('PincodePopup Data:', {
        pincode: data.Pincode,
        hasEnrollmentBreakdown: !!data.enrollmentAgeBreakdown,
        hasBiometricBreakdown: !!data.biometricAgeBreakdown,
        hasDemographicBreakdown: !!data.demographicAgeBreakdown,
        fullData: data
    });

    return (
        <div className="w-full h-full flex flex-col bg-white font-sans">

            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 text-white shrink-0 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>

                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-1.5 mb-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-200" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-100">PIN Code</span>
                    </div>
                    <div className="flex gap-2">
                        {map && (
                            <button
                                onClick={() => map.setZoom(12)}
                                className="text-white/80 hover:text-white transition-colors"
                                title="Zoom to Location"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors" title="Close Details">
                            <span className="text-lg leading-none">×</span>
                        </button>
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">{data.Pincode || "N/A"}</h2>

                <div className="space-y-1.5">
                    <div className="flex items-start gap-2 bg-white/10 p-1.5 rounded backdrop-blur-sm">
                        <Building className="w-3.5 h-3.5 text-blue-200 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-[9px] text-blue-200 uppercase">Office Name</p>
                            <p className="text-xs font-medium leading-tight truncate">{data.Office_Name || "N/A"}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                        <div className="bg-white/10 p-1.5 rounded backdrop-blur-sm min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <Hash className="w-3 h-3 text-blue-200" />
                                <p className="text-[9px] text-blue-200 uppercase">Division</p>
                            </div>
                            <p className="text-[10px] font-medium truncate">{data.Division ? data.Division.replace(' Division', '') : "N/A"}</p>
                        </div>
                        <div className="bg-white/10 p-1.5 rounded backdrop-blur-sm min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <Navigation className="w-3 h-3 text-blue-200" />
                                <p className="text-[9px] text-blue-200 uppercase">Circle</p>
                            </div>
                            <p className="text-[10px] font-medium truncate">{data.Circle ? data.Circle.replace(' Circle', '') : "N/A"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-amber-50 to-blue-50 p-3 custom-scrollbar">
                <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gradient-to-r from-amber-50 to-blue-50 z-10 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    <h3 className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">UIDAI Statistics</h3>
                </div>

                {data.total_enrollments !== undefined ? (
                    <div className="grid grid-cols-1 gap-3">
                        {/* Total Enrollments Card */}
                        <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-semibold">TOTAL ENROLLMENTS</span>
                                </div>
                                {data.uniqueDates > 0 && (
                                    <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                        {data.uniqueDates} date{data.uniqueDates > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-gray-800 mb-2">{formatNumber(data.total_enrollments)}</p>

                            {/* Age Breakdown for Enrollments */}
                            {data.enrollmentAgeBreakdown && (data.enrollmentAgeBreakdown.age_0_5 > 0 || data.enrollmentAgeBreakdown.age_5_18 > 0 || data.enrollmentAgeBreakdown.age_18_plus > 0) ? (
                                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-amber-100">
                                    <div className="bg-amber-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">0-5 Years</p>
                                        <p className="text-xs font-bold text-amber-600">{formatNumber(data.enrollmentAgeBreakdown.age_0_5)}</p>
                                    </div>
                                    <div className="bg-amber-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">5-18 Years</p>
                                        <p className="text-xs font-bold text-amber-600">{formatNumber(data.enrollmentAgeBreakdown.age_5_18)}</p>
                                    </div>
                                    <div className="bg-amber-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">18+ Years</p>
                                        <p className="text-xs font-bold text-amber-600">{formatNumber(data.enrollmentAgeBreakdown.age_18_plus)}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 pt-2 border-t border-amber-100">
                                    <p className="text-[9px] text-gray-400 text-center italic">Age breakdown not available</p>
                                </div>
                            )}
                        </div>

                        {/* Biometric Updates Card */}
                        <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-blue-600">
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold">BIOMETRIC UPDATES</span>
                            </div>
                            <p className="text-xl font-bold text-blue-600 mb-2">{formatNumber(data.biometric_updates || 0)}</p>

                            {/* Age Breakdown for Biometric */}
                            {data.biometricAgeBreakdown ? (
                                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-blue-100">
                                    <div className="bg-blue-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">0-5 Years</p>
                                        <p className="text-xs font-bold text-blue-600">{formatNumber(data.biometricAgeBreakdown.age_0_5)}</p>
                                    </div>
                                    <div className="bg-blue-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">5-18 Years</p>
                                        <p className="text-xs font-bold text-blue-600">{formatNumber(data.biometricAgeBreakdown.age_5_18)}</p>
                                    </div>
                                    <div className="bg-blue-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">18+ Years</p>
                                        <p className="text-xs font-bold text-blue-600">{formatNumber(data.biometricAgeBreakdown.age_18_plus)}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 pt-2 border-t border-blue-100">
                                    <p className="text-[9px] text-gray-400 text-center italic">Age breakdown not available</p>
                                </div>
                            )}
                        </div>

                        {/* Demographic Updates Card */}
                        <div className="bg-white p-2.5 rounded-lg border border-orange-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2 text-orange-600">
                                <Users className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-semibold">DEMOGRAPHIC UPDATES</span>
                            </div>
                            <p className="text-xl font-bold text-orange-600 mb-2">{formatNumber(data.demographic_updates || 0)}</p>

                            {/* Age Breakdown for Demographic */}
                            {data.demographicAgeBreakdown ? (
                                <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-orange-100">
                                    <div className="bg-orange-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">0-5 Years</p>
                                        <p className="text-xs font-bold text-orange-600">{formatNumber(data.demographicAgeBreakdown.age_0_5)}</p>
                                    </div>
                                    <div className="bg-orange-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">5-18 Years</p>
                                        <p className="text-xs font-bold text-orange-600">{formatNumber(data.demographicAgeBreakdown.age_5_18)}</p>
                                    </div>
                                    <div className="bg-orange-50 p-1.5 rounded text-center">
                                        <p className="text-[8px] text-gray-500 uppercase mb-0.5">18+ Years</p>
                                        <p className="text-xs font-bold text-orange-600">{formatNumber(data.demographicAgeBreakdown.age_18_plus)}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 pt-2 border-t border-orange-100">
                                    <p className="text-[9px] text-gray-400 text-center italic">Age breakdown not available</p>
                                </div>
                            )}
                        </div>

                        {/* Additional Stats (if rejections and centers data available) */}
                        {(data.rejections !== undefined || data.active_centers !== undefined) && (
                            <div className="grid grid-cols-2 gap-2">
                                {data.rejections !== undefined && (
                                    <div className="bg-white p-2 rounded-lg border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-1 text-red-600">
                                            <UserX className="w-3 h-3" />
                                            <span className="text-[10px] font-semibold">Rejections</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-base font-bold text-gray-800">{formatNumber(data.rejections)}</span>
                                            {data.rejection_rate && (
                                                <span className="text-[9px] text-red-500 font-medium">{data.rejection_rate}%</span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {data.active_centers !== undefined && (
                                    <div className="bg-white p-2 rounded-lg border border-green-100 shadow-sm">
                                        <div className="flex items-center gap-1.5 mb-1 text-green-600">
                                            <CheckCircle className="w-3 h-3" />
                                            <span className="text-[10px] font-semibold">Centers</span>
                                        </div>
                                        <p className="text-base font-bold text-gray-800">{data.active_centers}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white p-3 rounded-lg border border-gray-100 border-dashed text-center">
                        <p className="text-[10px] text-gray-400">No enrollment data available</p>
                    </div>
                )}
            </div>

            {/* Footer Decoration */}
            <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 via-amber-500 to-green-500 shrink-0"></div>
        </div>
    );
};

export default PincodePopup;
