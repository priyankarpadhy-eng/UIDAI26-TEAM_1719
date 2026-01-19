import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const UpdateTypeBar = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">No update data available</div>;
    }

    return (
        <div className="bg-white dark:bg-[#1f2937] p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Update Type Analysis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Biometric vs Demographic updates by Top States</p>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" strokeOpacity={0.2} />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="state"
                            type="category"
                            width={80}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                        />
                        <Tooltip
                            cursor={{ fill: '#374151', opacity: 0.1 }}
                            contentStyle={{
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                backgroundColor: '#1f2937',
                                color: '#f3f4f6'
                            }}
                            itemStyle={{ color: '#f3f4f6' }}
                        />
                        <Legend />
                        <Bar
                            dataKey="bio_updates_only"
                            name="Biometric"
                            stackId="a"
                            fill="#3B82F6"
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                        />
                        <Bar
                            dataKey="demo_updates_only"
                            name="Demographic"
                            stackId="a"
                            fill="#F97316"
                            radius={[0, 4, 4, 0]}
                            barSize={32}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default UpdateTypeBar;
