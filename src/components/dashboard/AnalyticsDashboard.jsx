import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { RefreshCw, BarChart2 } from 'lucide-react';

import TrendLineChart from './TrendLineChart';
import AgeDistributionPie from './AgeDistributionPie';
import UpdateTypeBar from './UpdateTypeBar';
import DistrictPerformanceTable from './DistrictPerformanceTable';

const AnalyticsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [trendsData, setTrendsData] = useState([]);
    const [stateStats, setStateStats] = useState([]);
    const [ageDist, setAgeDist] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [lastRefresh, setLastRefresh] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const [
                { data: trends },
                { data: states },
                { data: ages },
                { data: leaders }
            ] = await Promise.all([
                supabase.from('analytics_monthly_trends').select('*').order('sort_date'),
                supabase.from('analytics_state_stats').select('*').order('total_updates', { ascending: false }),
                supabase.from('analytics_age_dist').select('*').single(),
                supabase.from('analytics_district_leaderboard').select('*').order('total_activity', { ascending: false })
            ]);

            setTrendsData(trends || []);
            setStateStats(states || []);
            setAgeDist(ages || {});
            setLeaderboard(leaders || []);
            setLastRefresh(new Date());

        } catch (error) {
            console.error('Analytics Fetch Error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Comprehensive Analytics
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Deep dive into demographic shifts and operational metrics</p>
                </div>

                <button
                    onClick={fetchAnalytics}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Refreshing...' : 'Refresh Analytics'}
                </button>
            </div>

            {/* Row 1: The Pulse (Time Series) */}
            <div className="h-96 w-full">
                <TrendLineChart data={trendsData} />
            </div>

            {/* Row 2: Composition Analysis (Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="h-[380px]">
                    <AgeDistributionPie data={ageDist} />
                </div>
                <div className="h-[380px]">
                    <UpdateTypeBar data={stateStats} />
                </div>
            </div>

            {/* Row 3: Leaderboard */}
            <div className="w-full">
                <DistrictPerformanceTable data={leaderboard} />
            </div>

            {/* Footer Metadata */}
            {lastRefresh && (
                <p className="text-right text-xs text-gray-400 dark:text-gray-500">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
