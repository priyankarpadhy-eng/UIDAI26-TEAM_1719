import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '../../../supabaseClient';
import { BarChart3, RefreshCw, X } from 'lucide-react';

export const SpecificGraphNode = ({ data, isConnectable }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isHovered, setIsHovered] = useState(false);

    // 1. Listen for the "Target Location" from the connected node
    const targetLocation = data.targetLabel; // e.g., "Odisha"

    useEffect(() => {
        if (!targetLocation) return;

        // ------------------------------------------------------------------
        // DATA FETCHING & PROCESSING
        // ------------------------------------------------------------------
        // This function fetches enrollment data for the specific state 
        // connected to this node. It aggregates age-wise data by date.
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. QUERY SUPABASE
                // Fetch the last 50 records for the target state, ordered by date.
                // We select age columns to analyze demographics.
                const { data: dbData, error } = await supabase
                    .from('enrollments')
                    .select('record_date, age_0_5, age_5_18, age_18_plus')
                    .eq('state', targetLocation)
                    .order('record_date', { ascending: true })
                    .limit(50);

                if (error) throw error;

                if (!dbData || dbData.length === 0) {
                    setChartData([]);
                    return;
                }

                // 2. DATA TRANSFORMATION
                // The raw data might have multiple entries per date (e.g., from different districts).
                // We aggregate (sum) the total enrollments (all ages) for each unique date.
                const grouped = {};
                dbData.forEach(item => {
                    const d = item.record_date || 'Unknown';
                    // Initialize if date doesn't exist in map
                    if (!grouped[d]) grouped[d] = 0;
                    // Sum all age groups
                    grouped[d] += (item.age_0_5 + item.age_5_18 + item.age_18_plus);
                });

                // Convert the grouped map into an array format suitable for the Chart library
                const processed = Object.keys(grouped).map(date => ({
                    date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    count: grouped[date]
                }));

                setChartData(processed);

            } catch (err) {
                console.error("Graph Fetch Error:", err);
                setError("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [targetLocation]);

    return (
        <div
            className="p-0 border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-[#1f2937] rounded-xl w-[320px] h-[240px] shadow-lg overflow-hidden flex flex-col relative transition-all hover:shadow-xl hover:shadow-blue-100 dark:hover:shadow-blue-900/20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Delete Button */}
            {isHovered && data.onDelete && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        data.onDelete();
                    }}
                    className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full p-1 shadow-md transition-all transform hover:scale-110"
                    title="Delete node"
                >
                    <X className="w-3 h-3" />
                </button>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/10 p-2 border-b border-blue-200 dark:border-blue-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 font-mono">
                        {targetLocation ? targetLocation.toUpperCase() : "NO SIGNAL"}
                    </span>
                </div>
                {loading && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
            </div>

            <div className="flex-1 w-full bg-gradient-to-b from-white to-blue-50/30 dark:from-[#0b1120] dark:to-blue-900/5 relative">
                {!targetLocation ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
                        <span className="text-xs">Waiting for connection...</span>
                        <span className="text-[10px] mt-1">Connect a State Source Node</span>
                    </div>
                ) : loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-blue-500 text-xs">
                        Fetching Analytics...
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs">
                        {error}
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
                        No Data Found
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" strokeOpacity={0.2} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6366f1' }} interval={1} />
                            <YAxis tick={{ fontSize: 10, fill: '#6366f1' }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    borderColor: '#3b82f6',
                                    fontSize: '12px',
                                    color: '#1e3a8a',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                itemStyle={{ color: '#3b82f6' }}
                                cursor={{ fill: '#eff6ff', opacity: 0.2 }}
                                wrapperClassName="dark:!bg-gray-800 dark:!border-gray-600 dark:!text-gray-100"
                            />
                            <Bar dataKey="count" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} animationDuration={1000} />
                            <defs>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="#60a5fa" />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white dark:!border-gray-800 !shadow-md"
            />
        </div>
    );
};

export default SpecificGraphNode;
