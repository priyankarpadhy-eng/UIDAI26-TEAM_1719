import React from 'react';
import { Keyboard, MousePointer2, Zap, ShieldAlert, LayoutDashboard, BrainCircuit, Activity, Maximize2, X, BookOpen, Database } from 'lucide-react';

const SettingsPage = () => {
    const shortcuts = [
        { key: 'Alt + M', description: 'Go to Mission Control', icon: ShieldAlert },
        { key: 'Alt + D', description: 'Go to Dashboard', icon: LayoutDashboard },
        { key: 'Alt + E', description: 'Go to Decision Engine', icon: BrainCircuit },
        { key: 'Alt + N', description: 'Go to Notebook', icon: BookOpen },
        { key: 'Alt + U', description: 'Go to Data Sources (Upload)', icon: Database },
        { key: 'Alt + S', description: 'Go to System Settings', icon: Keyboard },
        { key: 'Alt + R', description: 'Toggle Risk Panel (MC)', icon: Activity },
        { key: 'Alt + L', description: 'Launch Synthesis Agent (MC)', icon: BrainCircuit },
        { key: 'Alt + F', description: 'Full-screen Risk Stream (MC)', icon: Maximize2 },
        { key: 'Esc', description: 'Close Active Modals/Panels', icon: X },
    ];

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 bg-gray-50 min-h-full">
            <div className="flex items-center gap-4 border-b border-gray-200 pb-6">
                <div className="p-3 bg-gray-900 rounded-xl">
                    <Keyboard className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
                    <p className="text-gray-500 font-medium">Configure and view system-level preferences</p>
                </div>
            </div>

            <section className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Global Keyboard Shortcuts
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shortcuts.map((s, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-blue-600 transition-colors">
                                    <s.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{s.description}</span>
                            </div>
                            <kbd className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded text-[10px] font-black font-mono text-gray-600 shadow-sm">
                                {s.key}
                            </kbd>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                <div className="relative z-10 space-y-4">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <MousePointer2 className="w-6 h-6" />
                        Quick Navigation
                    </h2>
                    <p className="text-blue-100 text-sm max-w-lg leading-relaxed">
                        SAMARTH Mission Control is designed for high-efficiency operations. Using these hotkeys significantly reduces the time required to switch between massive data visualizations and policy logic.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">Active Core</span>
                            <span className="text-lg font-black tracking-tighter uppercase">Operational HUD v4.2</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default SettingsPage;
