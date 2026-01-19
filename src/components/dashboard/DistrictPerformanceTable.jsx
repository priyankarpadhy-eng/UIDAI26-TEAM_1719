import React from 'react';
import { Trophy, TrendingUp, Minus } from 'lucide-react';

const DistrictPerformanceTable = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-gray-400 dark:text-gray-500">No district performance data available</div>;
    }

    const getStatusBadge = (activity) => {
        if (activity > 5000) return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">High Impact</span>;
        if (activity > 1000) return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Medium</span>;
        return <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">Starting</span>;
    };

    return (
        <div className="bg-white dark:bg-[#1f2937] rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#111827] flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Top Performing Districts
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Based on total enrollments & updates</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white dark:bg-[#1f2937] text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold border-b border-gray-100 dark:border-gray-700">
                            <th className="px-6 py-3 w-16">Rank</th>
                            <th className="px-6 py-3">District</th>
                            <th className="px-6 py-3">State</th>
                            <th className="px-6 py-3 text-right">Total Activity</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {data.map((row, index) => (
                            <tr key={`${row.district}-${row.state}`} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                <td className="px-6 py-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${index === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500' :
                                            index === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                                                index === 2 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-500' : 'text-gray-500 dark:text-gray-400'}
                                    `}>
                                        {index + 1}
                                    </div>
                                </td>
                                <td className="px-6 py-3 font-medium text-gray-800 dark:text-gray-200">{row.district}</td>
                                <td className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{row.state}</td>
                                <td className="px-6 py-3 text-right font-mono font-medium text-gray-700 dark:text-gray-300">
                                    {row.total_activity.toLocaleString()}
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {getStatusBadge(row.total_activity)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DistrictPerformanceTable;
