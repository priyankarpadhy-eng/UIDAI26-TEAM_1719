import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

const TrendLineChart = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">No trend data available</div>;
    }

    return (
        <div className="bg-white dark:bg-[#1f2937] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Monthly Activity Trends (The Pulse)</h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.2} />
                        <XAxis
                            dataKey="month"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                backgroundColor: '#1f2937',
                                color: '#f3f4f6'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line
                            type="monotone"
                            dataKey="new_enrollments"
                            name="New Enrollments"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="bio_updates"
                            name="Biometric Updates"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="demo_updates"
                            name="Demographic Updates"
                            stroke="#F97316"
                            strokeWidth={3}
                            dot={{ r: 4, fill: '#F97316', strokeWidth: 0 }}
                            activeDot={{ r: 6 }}
                        />

                        {/* Reference Lines - Policy Deadlines */}
                        <ReferenceLine x="Mar 25" stroke="#ef4444" strokeDasharray="3 3" label={{ value: "PAN-Link", position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine x="Jun 25" stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Free Update", position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine x="Sep 25" stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Deadline", position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default TrendLineChart;
