import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { LayoutDashboard, Map, BarChart3, Database, FileText, Settings, HelpCircle, X, ChevronLeft, ChevronRight, Code, BookOpen, Cpu, ShieldAlert } from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
    // Internal state for desktop collapse (minimized mode)
    const [isCollapsed, setIsCollapsed] = useState(false);
    const { isSyncing, isProcessing, dbConnected, scanMode, scanProgress, stopGlobalSync, totalRecords, processedData } = useData();

    // Calculate stats from processed data
    const uniquePincodes = processedData?.length || 0;
    const totalEnrollments = processedData?.reduce((sum, item) =>
        sum + (item.metrics?.totalEnrollments || 0), 0) || 0;

    // Helper to format large numbers (1.3M, 500K, etc.)
    const formatLargeNumber = (num) => {
        if (!num || num === 0) return '0';
        if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
        if (num >= 100000) return (num / 100000).toFixed(1) + ' L';
        if (num >= 1000) return (num / 1000).toFixed(1) + ' K';
        return num.toLocaleString();
    };

    const navItems = [
        { name: 'Pincode Map', icon: Map, path: '/' },
        { name: 'Report Generator', icon: FileText, path: '/reports' },
        { name: 'Analysis Interface', icon: Cpu, path: '/decision-engine' },
        { name: 'Demographics', icon: BarChart3, path: '/demographics' },
        { name: 'Data Sources', icon: Database, path: '/sources' },
        { name: 'Notebook', icon: BookOpen, path: '/notebook' },
    ];

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    // Dynamic width class
    const widthClass = isCollapsed ? 'w-20' : 'w-64';

    return (
        <aside
            className={`${widthClass} bg-white border-r border-gray-200 h-full flex-shrink-0 flex flex-col fixed inset-y-0 left-0 z-40 transform transition-all duration-300 md:static md:translate-x-0 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                }`}
        >
            {/* Collapse Toggle (Desktop only) */}
            <button
                onClick={toggleCollapse}
                className="hidden md:flex absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-500 hover:text-blue-600 z-50 transition-colors"
            >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Mobile Close Button */}
            <div className="flex justify-between items-center p-4 md:hidden">
                <div className="flex items-center gap-2">
                    <img src="/uidai-samarth-logo.png" alt="UIDAI SAMARTH" className="h-8 w-auto" />
                </div>
                <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>


            <div className="p-3 space-y-1 overflow-y-auto flex-1 scrollbar-hide">
                {!isCollapsed && <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">Main Menu</p>}

                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => window.innerWidth < 768 && onClose()}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${isActive
                                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } ${isCollapsed ? 'justify-center' : ''}`
                        }
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed ? (
                            <span>{item.name}</span>
                        ) : (
                            // Tooltip-like popup on collapsed hover
                            <span className="absolute left-full ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {item.name}
                            </span>
                        )}
                    </NavLink>
                ))}

                <div className="pt-6 border-t border-gray-100 mt-4">
                    {!isCollapsed && <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">System</p>}

                    <NavLink to="/settings" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 group relative ${isCollapsed ? 'justify-center' : ''}`}>
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed ? <span>Settings</span> : (
                            <span className="absolute left-full ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Settings</span>
                        )}
                    </NavLink>
                    <NavLink to="/help" className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 group relative ${isCollapsed ? 'justify-center' : ''}`}>
                        <HelpCircle className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed ? <span>Help & Support</span> : (
                            <span className="absolute left-full ml-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">Help</span>
                        )}
                    </NavLink>
                </div>
            </div>

            <div className="p-3 border-t border-gray-200 mt-auto">
                {!isCollapsed ? (
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-4 text-white shadow-lg relative overflow-hidden">

                        {/* Connection Status Badge */}
                        {dbConnected && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/20 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-bold border border-green-400/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                <div className="text-white/90">DB ON</div>
                            </div>
                        )}

                        <p className="text-sm font-semibold mb-1 text-white">UIDAI SAMARTH</p>
                        <p className="text-xs opacity-90 font-medium text-white/80">Team ID: UIDAI_1719</p>
                        <p className="text-[10px] opacity-80 mb-3 text-white/70">UIDAI Hackathon 2026</p>

                        {/* Activity Indicator (Upload/Analysis/Sync) */}
                        {scanMode && scanProgress ? (
                            <div className="space-y-2 mt-2">
                                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-white/90 h-full rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${(scanProgress.step / scanProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex items-center justify-between text-[10px] opacity-90 font-medium text-white/90">
                                    <span className="animate-pulse">Analyzing...</span>
                                    <span>{scanProgress.step} / {scanProgress.total}</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] opacity-80 mt-1 text-white/80">
                                    <span className="truncate font-mono max-w-[50%]">Pin: {scanProgress.activePincode}</span>
                                    <span className="font-semibold text-white/90">{scanProgress.eta || 'Calculating...'}</span>
                                </div>
                                {/* STOP BUTTON */}
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        stopGlobalSync();
                                    }}
                                    className="w-full mt-2 text-[10px] bg-red-500/20 hover:bg-red-500/40 text-white border border-red-400/30 rounded px-2 py-1 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <div className="w-1.5 h-1.5 bg-red-400 rounded-sm"></div>
                                    Stop Sync
                                </button>
                            </div>
                        ) : isSyncing || isProcessing ? (
                            <div className="space-y-2 mt-2">
                                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-white/90 h-full rounded-full animate-progress-indeterminate w-full origin-left"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 border border-white/50 border-t-white rounded-full animate-spin"></span>
                                    <span className="text-[10px] opacity-90 text-white/90">
                                        {isProcessing ? "Processing Data..." : "Syncing to cloud..."}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            // Idle State - Show Database Stats
                            <div className="space-y-2 mt-2">
                                <div className="w-full bg-white/20 h-1 rounded-full overflow-hidden">
                                    <div className="bg-green-400/80 w-full h-full rounded-full"></div>
                                </div>
                                <p className="text-[10px] opacity-80 text-white/80">System Status: {dbConnected ? "Connected" : "Local Mode"}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-2 items-center">
                        {dbConnected && <div className="w-2 h-2 rounded-full bg-green-500" title="Database Connected"></div>}
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
                            1719
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
