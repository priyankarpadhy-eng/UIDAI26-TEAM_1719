import React from 'react';
import {
    AlertTriangle,
    ShieldAlert,
    Info,
    Lock,
    Eye,
    ChevronRight,
    Search
} from 'lucide-react';

const RiskAlertList = ({ alerts, isExpanded, onAlertClick }) => {
    return (
        <>
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    onClick={() => onAlertClick && onAlertClick(alert)}
                    className={`relative p-4 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer group pointer-events-auto h-fit ${alert.type === 'CRITICAL'
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                        : alert.type === 'WARNING'
                            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                            : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
                        } ${isExpanded ? 'p-6 flex flex-col justify-between min-h-[160px]' : ''}`}
                >
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 blur-xl opacity-0 group-hover:opacity-20 transition-opacity rounded-xl ${alert.type === 'CRITICAL' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>

                    <div className="relative flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${alert.type === 'CRITICAL' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.2)]' :
                            alert.type === 'WARNING' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500' :
                                'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-500'
                            }`}>
                            {alert.type === 'CRITICAL' ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Info className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">{alert.region}</span>
                                <span className="text-[9px] text-gray-500 dark:text-gray-600 font-mono bg-white dark:bg-black/20 px-1.5 py-0.5 rounded border border-gray-100 dark:border-transparent">{alert.time}</span>
                            </div>
                            <h3 className={`font-black text-gray-900 dark:text-white tracking-tight truncate ${isExpanded ? 'text-lg' : 'text-sm'}`}>
                                {alert.metric} Spike
                            </h3>

                            {isExpanded && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-mono leading-relaxed opacity-80">
                                    Strategic signature detected anomalous activity matching defined risk pattern SIG-{alert.id}. Immediate verification required at {alert.region} node.
                                </p>
                            )}

                            <div className="flex items-center justify-between mt-3">
                                <span className={`font-black tracking-tighter ${alert.type === 'CRITICAL' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'} ${isExpanded ? 'text-3xl' : 'text-xl'}`}>
                                    {alert.value}
                                </span>
                                <button className="p-2 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-400 transition-colors border border-gray-100 dark:border-white/5 group-hover:text-gray-900 dark:group-hover:text-white shadow-sm">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Animated side detail */}
                    <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl ${alert.type === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                        }`}></div>
                </div>
            ))}

            {!isExpanded && (
                <div className="h-24 rounded-xl border border-dashed border-gray-300 dark:border-white/5 flex items-center justify-center bg-gray-50/50 dark:bg-white/[0.01]">
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 font-mono uppercase tracking-widest opacity-50 underline decoration-dotted">Buffer.Stream.Listening</p>
                </div>
            )}
        </>
    );
};

export default RiskAlertList;
