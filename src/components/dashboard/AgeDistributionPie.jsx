import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const AgeDistributionPie = ({ data }) => {
    if (!data) {
        return <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">No age data available</div>;
    }

    // Transform single object { age_0_5: 100, ... } into array for Recharts
    const chartData = [
        { name: '0-5 Years', value: data.age_0_5 || 0, color: '#14B8A6' }, // Teal
        { name: '5-18 Years', value: data.age_5_18 || 0, color: '#6366F1' }, // Indigo
        { name: '18+ Years', value: data.age_18_plus || 0, color: '#64748B' }, // Slate
    ].filter(d => d.value > 0);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const childrenCount = (data.age_0_5 || 0) + (data.age_5_18 || 0);
    const childrenPercentage = total > 0 ? Math.round((childrenCount / total) * 100) : 0;

    return (
        <div className="bg-white dark:bg-[#1f2937] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Age Demographics</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Breakdown by population age groups</p>

            <div className="w-full h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => value.toLocaleString()}
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                backgroundColor: '#1f2937',
                                color: '#f3f4f6'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{childrenPercentage}%</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Children (0-18)</span>
                </div>
            </div>
        </div>
    );
};

export default AgeDistributionPie;
