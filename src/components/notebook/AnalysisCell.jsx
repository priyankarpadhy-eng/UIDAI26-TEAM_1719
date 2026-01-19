import React, { useState, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    Play,
    Trash2,
    ChevronDown,
    ChevronUp,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3,
    MapPin,
    BarChart,
    GripVertical
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
    BarChart as RechartsBarChart,
    Bar
} from 'recharts';
import { supabase } from '../../supabaseClient';
import { ANALYSIS_MODULES, CHART_COLORS, getModuleList } from '../../config/analysisLibrary';

// Icon mapping for module types
const IconMap = {
    TrendingUp,
    PieChart: PieChartIcon,
    BarChart3,
    MapPin,
    BarChart
};

/**
 * AnalysisCell - A Jupyter-like cell for running pre-defined analytics
 * Uses forwardRef to expose chart ref for PDF export
 */
const AnalysisCell = forwardRef((
    {
        cellId,
        initialModule = null,
        initialStartDate = '',
        initialEndDate = '',
        onDelete,
        onUpdate
    },
    ref
) => {
    // Ref for the chart container (used for PDF export)
    const chartContainerRef = useRef(null);
    // Cell state
    const [selectedModuleId, setSelectedModuleId] = useState(initialModule);
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [isExpanded, setIsExpanded] = useState(true);

    // Execution state
    const [isLoading, setIsLoading] = useState(false);
    const [hasRun, setHasRun] = useState(false);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [executionTime, setExecutionTime] = useState(null);

    const selectedModule = selectedModuleId ? ANALYSIS_MODULES[selectedModuleId] : null;

    // Expose methods/data to parent via ref for PDF export
    useImperativeHandle(ref, () => ({
        // Get the chart container DOM element
        getChartElement: () => chartContainerRef.current,
        // Get cell metadata for PDF
        getCellData: () => ({
            id: cellId,
            moduleId: selectedModuleId,
            title: selectedModule?.title || 'Analysis Cell',
            description: selectedModule?.description || '',
            hasData: hasRun && !error && data && data.length > 0,
            rowCount: data?.length || 0,
            executionTime: executionTime,
        }),
        // Check if cell has renderable data
        hasRenderableData: () => hasRun && !error && data && data.length > 0,
    }), [cellId, selectedModuleId, selectedModule, hasRun, error, data, executionTime]);

    // Notify parent of state changes for persistence
    const notifyUpdate = useCallback((moduleId, start, end) => {
        if (onUpdate) {
            onUpdate(cellId, { moduleId, startDate: start, endDate: end });
        }
    }, [cellId, onUpdate]);

    // Handle module selection
    const handleModuleChange = (e) => {
        const moduleId = e.target.value;
        setSelectedModuleId(moduleId);
        setData(null);
        setError(null);
        setHasRun(false);
        notifyUpdate(moduleId, startDate, endDate);
    };

    // Handle date changes
    const handleStartDateChange = (e) => {
        const value = e.target.value;
        setStartDate(value);
        notifyUpdate(selectedModuleId, value, endDate);
    };

    const handleEndDateChange = (e) => {
        const value = e.target.value;
        setEndDate(value);
        notifyUpdate(selectedModuleId, startDate, value);
    };

    // Execute the analysis
    const runAnalysis = async () => {
        if (!selectedModule) return;

        setIsLoading(true);
        setError(null);
        const startTime = performance.now();

        try {
            // Build the Supabase query
            let query = supabase.from(selectedModule.sqlTable).select('*');

            // Apply date filters if the module supports it
            if (selectedModule.hasDateFilter && selectedModule.dateColumn) {
                if (startDate) {
                    query = query.gte(selectedModule.dateColumn, startDate);
                }
                if (endDate) {
                    query = query.lte(selectedModule.dateColumn, endDate);
                }
            }

            // Apply ordering
            if (selectedModule.orderBy) {
                query = query.order(selectedModule.orderBy, {
                    ascending: selectedModule.orderDirection === 'asc'
                });
            }

            // Apply limit
            if (selectedModule.limit) {
                query = query.limit(selectedModule.limit);
            }

            const { data: result, error: queryError } = await query;

            if (queryError) {
                throw new Error(queryError.message);
            }

            // Transform data if needed
            let processedData = result;
            if (selectedModule.transformData) {
                processedData = selectedModule.transformData(result);
            }

            setData(processedData);
            setHasRun(true);
            setExecutionTime(Math.round(performance.now() - startTime));

        } catch (err) {
            setError(err.message || 'An error occurred while fetching data');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // Render the appropriate chart based on module config
    const renderChart = () => {
        if (!data || data.length === 0) {
            return (
                <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-black/20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No data returned from query</p>
                    </div>
                </div>
            );
        }

        const module = selectedModule;

        switch (module.chartType) {
            case 'LineChart':
                return (
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                <XAxis
                                    dataKey={module.xAxis}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                                        backgroundColor: '#1f2937',
                                        color: '#f3f4f6'
                                    }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [value.toLocaleString(), 'Count']}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                {module.dataKeys.map((key, index) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        stroke={module.colors?.[index] || CHART_COLORS[index]}
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: module.colors?.[index] || CHART_COLORS[index], strokeWidth: 0 }}
                                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'PieChart':
                // Transform data for pie chart
                const pieData = module.pieLabels ? module.dataKeys.map((key, i) => ({
                    name: module.pieLabels[i],
                    value: data[0]?.[key] || 0,
                    color: module.colors[i]
                })).filter(d => d.value > 0) : data;

                const total = pieData.reduce((sum, item) => sum + item.value, 0);

                return (
                    <div className="h-[350px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color || module.colors?.[index] || CHART_COLORS[index]}
                                            strokeWidth={0}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value) => [value.toLocaleString(), 'Count']}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                                        backgroundColor: '#1f2937',
                                        color: '#f3f4f6'
                                    }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                />
                                <Legend verticalAlign="bottom" height={50} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center stat */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                            <span className="text-3xl font-bold text-gray-800 dark:text-gray-100">{total >= 1000000 ? `${(total / 1000000).toFixed(1)}M` : total.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full mt-1">Total</span>
                        </div>
                    </div>
                );

            case 'BarChart':
                return (
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                <XAxis
                                    dataKey={module.xAxis}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                                        backgroundColor: '#1f2937',
                                        color: '#f3f4f6'
                                    }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [value.toLocaleString(), 'Count']}
                                />
                                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                {module.dataKeys.map((key, index) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        name={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        fill={module.colors?.[index] || CHART_COLORS[index]}
                                        radius={[4, 4, 0, 0]}
                                    />
                                ))}
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                );

            case 'BarChartHorizontal':
                return (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                <XAxis
                                    type="number"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
                                />
                                <YAxis
                                    type="category"
                                    dataKey={module.xAxis}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    width={90}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.5)',
                                        backgroundColor: '#1f2937',
                                        color: '#f3f4f6'
                                    }}
                                    itemStyle={{ color: '#f3f4f6' }}
                                    formatter={(value) => [value.toLocaleString(), 'Count']}
                                />
                                {module.dataKeys.map((key, index) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        fill={module.colors?.[index] || CHART_COLORS[index]}
                                        radius={[0, 4, 4, 0]}
                                    />
                                ))}
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </div>
                );

            default:
                return <div className="text-gray-500 dark:text-gray-400">Chart type not supported</div>;
        }
    };

    // Get the icon component for selected module
    const ModuleIcon = selectedModule ? IconMap[selectedModule.icon] : null;

    return (
        <div className="bg-white dark:bg-[#1f2937] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:shadow-lg group">
            {/* Cell Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-[#111827] dark:to-[#0f172a] border-b border-gray-100 dark:border-gray-700/50">
                {/* Drag Handle */}
                <div className="text-gray-300 dark:text-gray-600 cursor-grab hover:text-gray-400 dark:hover:text-gray-500 transition-colors">
                    <GripVertical className="w-5 h-5" />
                </div>

                {/* Cell Number Badge */}
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
                    {cellId}
                </div>

                {/* Module Selector */}
                <div className="flex-1">
                    <select
                        value={selectedModuleId || ''}
                        onChange={handleModuleChange}
                        className="w-full max-w-md px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#374151] border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-500"
                    >
                        <option value="">— Select Analysis Module —</option>
                        {getModuleList().map(module => (
                            <option key={module.id} value={module.id}>
                                {module.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Indicator */}
                {hasRun && !error && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Success</span>
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Error</span>
                    </div>
                )}

                {/* Actions */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                    onClick={() => onDelete(cellId)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Cell"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="animate-fade-in">
                    {/* Module Description & Controls */}
                    {selectedModule && (
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 border-b border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-start gap-4">
                                {/* Module Icon */}
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                    {ModuleIcon && <ModuleIcon className="w-6 h-6" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{selectedModule.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{selectedModule.description}</p>

                                    {/* Date Filters */}
                                    {selectedModule.hasDateFilter && (
                                        <div className="flex flex-wrap items-center gap-3 mt-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">From</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={handleStartDateChange}
                                                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#374151] text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">To</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={handleEndDateChange}
                                                    className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#374151] text-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Run Button */}
                                <button
                                    onClick={runAnalysis}
                                    disabled={isLoading || !selectedModule}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Running...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            <span>Run Analysis</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Output Area */}
                    <div className="p-6">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
                                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">Querying Supabase...</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Fetching from {selectedModule?.sqlTable}</p>
                            </div>
                        )}

                        {/* Error State */}
                        {!isLoading && error && (
                            <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-red-800 dark:text-red-400">Query Failed</h4>
                                        <p className="text-sm text-red-600 dark:text-red-300 mt-1">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success State - Chart Output */}
                        {!isLoading && !error && hasRun && (
                            <div>
                                {/* Execution Stats */}
                                <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Executed in <strong className="text-gray-700 dark:text-gray-300">{executionTime}ms</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                        <span>Rows returned: <strong className="text-gray-700 dark:text-gray-300">{data?.length || 0}</strong></span>
                                    </div>
                                </div>

                                {/* Chart Container - Referenced for PDF export */}
                                <div
                                    ref={chartContainerRef}
                                    data-chart-id={cellId}
                                    className="chart-export-container bg-white dark:bg-[#1f2937] p-4 rounded-lg"
                                >
                                    {renderChart()}
                                </div>
                            </div>
                        )}

                        {/* Empty State - No module selected */}
                        {!selectedModule && !isLoading && (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-black/20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
                                <p className="text-sm font-medium">Select an analysis module to get started</p>
                                <p className="text-xs mt-1">Choose from pre-built analytics above</p>
                            </div>
                        )}

                        {/* Ready State - Module selected but not run */}
                        {selectedModule && !isLoading && !hasRun && !error && (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/30">
                                <Play className="w-10 h-10 mb-3 text-emerald-400" />
                                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Ready to run</p>
                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Click "Run Analysis" to fetch data</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default AnalysisCell;
