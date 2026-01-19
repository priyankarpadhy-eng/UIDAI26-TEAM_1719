import React from 'react';
import { Calendar, Clock, TrendingUp } from 'lucide-react';

const TIME_PERIODS = [
    { id: 'day', label: 'Last 24h', shortLabel: '1D', days: 1 },
    { id: 'week', label: 'Last 7 Days', shortLabel: '7D', days: 7 },
    { id: 'month', label: 'Last 30 Days', shortLabel: '1M', days: 30 },
    { id: '3months', label: 'Last 3 Months', shortLabel: '3M', days: 90 },
    { id: '6months', label: 'Last 6 Months', shortLabel: '6M', days: 180 },
    { id: 'year', label: 'Last Year', shortLabel: '1Y', days: 365 },
    { id: 'all', label: 'All Time', shortLabel: 'ALL', days: null },
];

const TimeFilter = ({ selectedPeriod, onPeriodChange, totalRecords = 0 }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span className="font-semibold text-gray-800">Time Period</span>
                </div>
                {totalRecords > 0 && (
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {totalRecords.toLocaleString()} records
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {TIME_PERIODS.map((period) => {
                    const isSelected = selectedPeriod === period.id;
                    return (
                        <button
                            key={period.id}
                            onClick={() => onPeriodChange(period.id)}
                            className={`
                                px-3 py-2 rounded-lg text-sm font-medium transition-all
                                ${isSelected
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }
                            `}
                            title={period.label}
                        >
                            <span className="hidden sm:inline">{period.label}</span>
                            <span className="sm:hidden">{period.shortLabel}</span>
                        </button>
                    );
                })}
            </div>

            {/* Date Range Display */}
            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>
                        {selectedPeriod === 'all' ? (
                            'Showing all historical data'
                        ) : (
                            <>
                                From <strong className="text-gray-700">{getStartDate(selectedPeriod)}</strong> to <strong className="text-gray-700">Today</strong>
                            </>
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Helper function to get start date based on period
function getStartDate(periodId) {
    const period = TIME_PERIODS.find(p => p.id === periodId);
    if (!period || !period.days) return 'Beginning';

    const date = new Date();
    date.setDate(date.getDate() - period.days);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Export helper for calculating date range
export function getDateRange(periodId) {
    const period = TIME_PERIODS.find(p => p.id === periodId);
    if (!period || !period.days) {
        return { startDate: null, endDate: null };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period.days);

    return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

export { TIME_PERIODS };
export default TimeFilter;
