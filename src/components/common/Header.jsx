import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import {
    LayoutDashboard, Map, BarChart3, Database, FileText, Settings,
    HelpCircle, X, Cpu, ShieldAlert, BookOpen
} from 'lucide-react';

const Header = () => {
    const { isSyncing, isProcessing, dbConnected, scanMode, scanProgress, stopGlobalSync } = useData();

    const navItems = [
        { name: 'Mission Control', icon: ShieldAlert, path: '/' },
        { name: 'Analysis', icon: Cpu, path: '/decision-engine' },
        { name: 'Demographics', icon: BarChart3, path: '/demographics' },
        { name: 'Data', icon: Database, path: '/sources' },
        { name: 'Notebook', icon: BookOpen, path: '/notebook' },
        { name: 'Reports', icon: FileText, path: '/reports' },
    ];

    return (
        <header className="bg-white border-b border-gray-200 h-16 flex-shrink-0 flex items-center justify-between px-4 z-40 shadow-sm">
            {/* Left: Logo */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <img src="/uidai-samarth-logo.png" alt="UIDAI SAMARTH" className="h-8 w-auto" />
                    <div className="hidden md:block">
                        <p className="text-sm font-bold text-gray-800 leading-tight">UIDAI SAMARTH</p>
                        <p className="text-[10px] text-gray-500">Team 1719</p>
                    </div>
                </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide mx-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`
                        }
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Right: System & User */}
            <div className="flex items-center gap-3">
                {/* Status Indicator */}
                {scanMode ? (
                    <div className="flex items-center gap-2 px-2 py-1 bg-purple-100 rounded text-[10px] text-purple-700 border border-purple-200">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        <span className="hidden sm:inline"> Analyzing {scanProgress?.step}/{scanProgress?.total}</span>
                        <button onClick={stopGlobalSync} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                ) : (
                    <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] border ${dbConnected
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <span className="hidden sm:inline">{dbConnected ? 'DB Connected' : 'Local Mode'}</span>
                    </div>
                )}

                {/* Settings */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors ${isActive ? 'bg-gray-100 text-blue-600' : ''}`}
                >
                    <Settings className="w-5 h-5" />
                </NavLink>

                {/* Help */}
                <NavLink
                    to="/help"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <HelpCircle className="w-5 h-5" />
                </NavLink>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                {/* User Avatar (Static for now) */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-help" title="Team 1719">
                    17
                </div>
            </div>
        </header>
    );
};

export default Header;
