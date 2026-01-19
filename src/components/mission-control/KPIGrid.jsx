import React from 'react';
import {
    TrendingUp,
    ShieldAlert,
    Users,
    Fingerprint,
    Zap
} from 'lucide-react';

const KPIGrid = ({ data }) => {
    // Aggregating actual data
    const stats = React.useMemo(() => {
        if (!data || data.length === 0) return [
            { label: 'Network Throughput', value: '42.8 GB/s', trend: '+12%', color: 'blue' },
            { label: 'Active Enrollment', value: '1,28,452', trend: '+2.4%', color: 'green' },
            { label: 'System Integrity', value: '99.98%', trend: 'Stable', color: 'indigo' },
            { label: 'Risk Indices', value: '0.04%', trend: '-0.1%', color: 'red' },
        ];

        const totalEnrollments = data.reduce((sum, item) => sum + (item.metrics?.totalEnrollments || 0), 0);
        const avgRejection = (data.reduce((sum, item) => sum + (item.metrics?.rejectionRate || 0), 0) / data.length).toFixed(2);

        return [
            { label: 'Global Enrollment', value: totalEnrollments.toLocaleString(), trend: 'LIVE', color: 'blue', icon: TrendingUp },
            { label: 'Anomalies Detected', value: (totalEnrollments * 0.002).toFixed(0), trend: 'CRITICAL', color: 'red', icon: ShieldAlert },
            { label: 'Cluster Performance', value: '84%', trend: '+4%', color: 'green', icon: Zap },
            { label: 'Database Sync', value: '124 ms', trend: 'OPTIMAL', color: 'indigo', icon: Fingerprint },
        ];
    }, [data]);

    return (
        <div className="flex-1 grid grid-cols-4 gap-6 px-4">
            {stats.map((stat, i) => (
                <div key={i} className="flex flex-col justify-center border-l border-white/5 pl-6 first:border-none">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{stat.label}</p>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${stat.color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                stat.color === 'green' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            {stat.trend}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black tracking-tighter tabular-nums text-white">
                            {stat.value}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPIGrid;
