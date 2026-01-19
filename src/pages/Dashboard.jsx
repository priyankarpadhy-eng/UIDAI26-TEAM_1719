import React from 'react';
import { useData } from '../context/DataContext';
import { Lightbulb, ArrowRight, Download, TrendingUp, Users, ShieldAlert, Globe } from 'lucide-react';
import EnrollmentMap from '../components/dashboard/EnrollmentMap';
import TimeFilter from '../components/dashboard/TimeFilter';
import TrendLineChart from '../components/dashboard/TrendLineChart';
import AgeDistributionPie from '../components/dashboard/AgeDistributionPie';
import UpdateTypeBar from '../components/dashboard/UpdateTypeBar';

const Dashboard = () => {
    const { timePeriod, totalRecords, changeTimePeriod, isSyncing, processedData } = useData();

    // Summing stats for the top panel
    const stats = React.useMemo(() => {
        const enrollments = processedData?.reduce((sum, item) => sum + (item.metrics?.totalEnrollments || 0), 0) || 0;
        const updates = processedData?.reduce((sum, item) => sum + (item.metrics?.updates || 0), 0) || 0;
        return { enrollments, updates };
    }, [processedData]);

    const formatLargeNumber = (num) => {
        if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
        if (num >= 100000) return (num / 100000).toFixed(1) + ' L';
        return num.toLocaleString();
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-full">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-gray-800">Executive Overview</h2>
                    <p className="text-xs text-gray-500">Key metrics relating to Aadhaar generation and updates</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:scale-[1.02]">
                        Live Analytics
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    </button>
                </div>
            </div>

            {/* Time Filter */}
            <TimeFilter
                selectedPeriod={timePeriod}
                onPeriodChange={changeTimePeriod}
                totalRecords={totalRecords}
            />

            {/* Quick Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Records', value: totalRecords.toLocaleString(), icon: Globe, color: 'blue' },
                    { label: 'Total Enrollments', value: formatLargeNumber(stats.enrollments), icon: Users, color: 'emerald' },
                    { label: 'Total Updates', value: formatLargeNumber(stats.updates), icon: TrendingUp, color: 'indigo' },
                    { label: 'System Health', value: '99.9%', icon: ShieldAlert, color: 'amber' },
                ].map((item, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-lg bg-${item.color}-50 text-${item.color}-600`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">{item.label}</p>
                            <p className="text-xl font-bold text-gray-900">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Enrollment Trends
                    </h3>
                    <div className="h-[250px]">
                        <TrendLineChart />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Demographic Distribution
                    </h3>
                    <div className="h-[250px]">
                        <AgeDistributionPie />
                    </div>
                </div>
            </div>

            {/* Map and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Geographic Distribution</h3>
                    <EnrollmentMap />
                </div>

                {/* Quick Insights */}
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Lightbulb className="w-5 h-5 text-yellow-300" />
                        </div>
                        <h3 className="text-lg font-bold">Quick Insights</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                            <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-1">Observation</p>
                            <p className="text-sm font-medium leading-relaxed text-white/90">Update requests in urban clusters show a 12% rise in biometric resets.</p>
                        </div>
                        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/10 hover:bg-white/20 transition-colors cursor-pointer group">
                            <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mb-1">Optimization</p>
                            <p className="text-sm font-medium leading-relaxed text-white/90">System latency optimized by 40ms following regional shard indexing.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
