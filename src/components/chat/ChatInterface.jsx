/**
 * ChatInterface.jsx - Generative UI Chat with Real Database Integration
 * Uses Llama 3.1 via Groq for intelligent query generation
 * Fetches REAL data from Supabase based on AI-parsed user intent
 */

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
    BarChart, Bar, AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    MessageCircle, Send, Bot, User, Loader2, Sparkles,
    BarChart3, TrendingUp, X, Minimize2, Maximize2, Database,
    AlertCircle, CheckCircle2
} from 'lucide-react';

// Import "Interceptor Pattern" Utilities
import { generateDbQuery } from '../../utils/ai-interceptor';
import { executeQuery } from '../../utils/db-executor';
import { generateFinalAnswer, getStandardAIResponse } from '../../utils/ai-reporter';

/**
 * Transform raw database records into chart-ready format
 * @param {Array} records - Raw database records
 * @param {string} filterLabel - Label for the filter (e.g., pincode value)
 * @param {string} ageFilter - Age group filter
 */
const transformDataForChart = (records, filterLabel, ageFilter = null) => {
    if (!records || records.length === 0) return [];

    // Helper to sum appropriate age columns
    const calculateAgeValue = (record) => {
        switch (ageFilter) {
            case '0_5':
                return record.age_0_5 || 0;
            case '5_18':
                return record.age_5_18 || 0;
            case '18_plus':
                return record.age_18_plus || 0;
            case 'above_5':
                // Age > 5 means age_5_18 + age_18_plus
                return (record.age_5_18 || 0) + (record.age_18_plus || 0);
            case 'below_18':
                // Age < 18 means age_0_5 + age_5_18
                return (record.age_0_5 || 0) + (record.age_5_18 || 0);
            case 'all':
            default:
                // Total of all age groups
                return (record.age_0_5 || 0) + (record.age_5_18 || 0) + (record.age_18_plus || 0);
        }
    };

    // Group by record_date if available, otherwise create summary
    const dateGroups = {};

    records.forEach(record => {
        const dateKey = record.record_date || 'Total';
        if (!dateGroups[dateKey]) {
            dateGroups[dateKey] = {
                name: dateKey,
                enrollments: 0,
                age_0_5: 0,
                age_5_18: 0,
                age_18_plus: 0,
                filteredValue: 0,
                total: 0
            };
        }
        dateGroups[dateKey].age_0_5 += record.age_0_5 || 0;
        dateGroups[dateKey].age_5_18 += record.age_5_18 || 0;
        dateGroups[dateKey].age_18_plus += record.age_18_plus || 0;
        dateGroups[dateKey].filteredValue += calculateAgeValue(record);
        dateGroups[dateKey].enrollments += (record.age_0_5 || 0) + (record.age_5_18 || 0) + (record.age_18_plus || 0);
        dateGroups[dateKey].total = dateGroups[dateKey].enrollments;
    });

    // Convert to array and sort by date
    const chartData = Object.values(dateGroups);
    chartData.sort((a, b) => a.name.localeCompare(b.name));

    // If only one data point and no specific ageFilter, create age breakdown
    if (chartData.length === 1 && (!ageFilter || ageFilter === 'all')) {
        const record = chartData[0];
        return [
            { name: 'Age 0-5', value: record.age_0_5, fill: '#22c55e' },
            { name: 'Age 5-18', value: record.age_5_18, fill: '#16a34a' },
            { name: 'Age 18+', value: record.age_18_plus, fill: '#15803d' }
        ];
    }

    // Format dates for display - use filteredValue if ageFilter is set
    return chartData.map(item => ({
        ...item,
        name: item.name === 'Total' ? 'Total' : formatDate(item.name),
        value: ageFilter && ageFilter !== 'all' ? item.filteredValue : item.enrollments
    }));
};

/**
 * Format date string for display
 */
const formatDate = (dateStr) => {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
        return dateStr;
    }
};

/**
 * GenerativeChart Component - Renders charts with REAL data
 */
const GenerativeChart = ({ config, data, isLoading, error }) => {
    const { chartType = 'bar', chartTitle, filterValue } = config;

    const chartColors = {
        primary: '#9333ea',
        secondary: '#a855f7',
        grid: '#e5e7eb'
    };

    if (isLoading) {
        return (
            <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-sm mt-2">
                <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    <span className="text-sm text-gray-600">Fetching data from database...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm mt-2">
                <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Error: {error}</span>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        // Generate appropriate message based on query type
        const queryDescription = config.queryType === 'advanced' && config.advancedFilter
            ? `enrollment ${config.advancedFilter.operator === 'gt' ? '>' : config.advancedFilter.operator === 'lt' ? '<' : '='} ${config.advancedFilter.value}`
            : filterValue ? `"${filterValue}"` : 'your criteria';

        return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mt-2">
                <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">No records found matching {queryDescription}</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                    {config.queryType === 'advanced'
                        ? 'Try lowering the threshold or check if data has been uploaded.'
                        : 'Try a different pincode or check if data has been uploaded.'}
                </p>
            </div>
        );
    }

    const renderChart = () => {
        const commonProps = {
            data,
            margin: { top: 10, right: 10, left: -10, bottom: 0 }
        };

        switch (chartType) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={chartColors.primary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                );
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={chartColors.primary}
                            strokeWidth={2}
                            dot={{ fill: chartColors.primary, strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: chartColors.secondary }}
                        />
                    </LineChart>
                );
            case 'bar':
            default:
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => [value.toLocaleString(), 'Count']}
                        />
                        <Bar
                            dataKey="value"
                            fill={chartColors.primary}
                            radius={[4, 4, 0, 0]}
                            animationDuration={800}
                        />
                    </BarChart>
                );
        }
    };

    // Calculate total
    const totalCount = data.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
        <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm mt-2">
            {/* Chart Header */}
            <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Database className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 flex-1">{chartTitle}</h4>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Live Data
                </span>
            </div>

            {/* Stats Summary */}
            <div className="flex gap-4 mb-3 text-xs">
                <div className="bg-purple-50 px-3 py-1.5 rounded-lg">
                    <span className="text-gray-500">Total: </span>
                    <span className="font-bold text-purple-700">{totalCount.toLocaleString()}</span>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg">
                    <span className="text-gray-500">Records: </span>
                    <span className="font-bold text-gray-700">{data.length}</span>
                </div>
            </div>

            {/* Chart Container */}
            <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>

            {/* Chart Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Supabase Real-Time Data
                </span>
                <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
        </div>
    );
};

/**
 * Message Bubble Component with Database Query Support
 */
const MessageBubble = ({ message, isBot }) => {
    const [displayContent, setDisplayContent] = useState({ type: 'text', content: '' });
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [queryConfig, setQueryConfig] = useState(null);

    useEffect(() => {
        const processMessage = async () => {
            if (!isBot || !message.content) {
                setDisplayContent({ type: 'text', content: message.content });
                return;
            }

            try {
                const content = message.content.trim();

                // Check if it's a JSON response
                if (content.startsWith('{') && content.includes('"intent"')) {
                    const parsed = JSON.parse(content);

                    if (parsed.intent === 'query_db') {
                        // AI wants us to query the database OR has provided data
                        setQueryConfig(parsed);

                        // If data is already provided by the Executor (Interceptor Pattern), use it directly
                        if (parsed.data) {
                            setDisplayContent({
                                type: 'chart',
                                content: parsed.message || (parsed.queryType === 'advanced' ? 'Analysis complete.' : 'Data loaded.')
                            });
                            setChartData(parsed.data);
                            setIsLoading(false);
                            return;
                        }

                        // Fallback: Fetch if data is missing (Backward Compatibility)
                        setDisplayContent({
                            type: 'chart',
                            content: parsed.queryType === 'advanced'
                                ? `Searching for matching records...`
                                : `Fetching ${parsed.filterColumn}: ${parsed.filterValue}...`
                        });
                        setIsLoading(true);
                        setError(null);

                        try {
                            let data = [];
                            let dbError = null;
                            // ... (Old fetching logic remains as fallback but likely won't be reached with new Interceptor)


                            if (parsed.queryType === 'advanced' && parsed.advancedFilter) {
                                // Advanced query: Fetch all data and filter client-side
                                const result = await supabase
                                    .from(parsed.table || 'enrollments')
                                    .select('pincode,state,district,age_0_5,age_5_18,age_18_plus,record_date')
                                    .limit(1000);

                                dbError = result.error;

                                if (!dbError && result.data) {
                                    // Calculate total enrollment and filter
                                    const threshold = parsed.advancedFilter.value || 0;
                                    const operator = parsed.advancedFilter.operator || 'gt';

                                    // Group by pincode and sum enrollments
                                    const pincodeMap = {};
                                    result.data.forEach(row => {
                                        const total = (row.age_0_5 || 0) + (row.age_5_18 || 0) + (row.age_18_plus || 0);
                                        if (!pincodeMap[row.pincode]) {
                                            pincodeMap[row.pincode] = {
                                                pincode: row.pincode,
                                                state: row.state,
                                                district: row.district,
                                                age_0_5: 0,
                                                age_5_18: 0,
                                                age_18_plus: 0,
                                                total: 0
                                            };
                                        }
                                        pincodeMap[row.pincode].age_0_5 += row.age_0_5 || 0;
                                        pincodeMap[row.pincode].age_5_18 += row.age_5_18 || 0;
                                        pincodeMap[row.pincode].age_18_plus += row.age_18_plus || 0;
                                        pincodeMap[row.pincode].total += total;
                                    });

                                    // Filter based on operator
                                    const filtered = Object.values(pincodeMap).filter(item => {
                                        switch (operator) {
                                            case 'gt': return item.total > threshold;
                                            case 'gte': return item.total >= threshold;
                                            case 'lt': return item.total < threshold;
                                            case 'lte': return item.total <= threshold;
                                            case 'eq': return item.total === threshold;
                                            default: return item.total > threshold;
                                        }
                                    });

                                    // Sort by total descending and limit
                                    data = filtered
                                        .sort((a, b) => b.total - a.total)
                                        .slice(0, parsed.limit || 20);
                                }
                            } else {
                                // Simple query: Use equality filter
                                const selectCols = 'pincode,record_date,state,district,age_0_5,age_5_18,age_18_plus';
                                const result = await supabase
                                    .from(parsed.table || 'enrollments')
                                    .select(selectCols)
                                    .eq(parsed.filterColumn, parsed.filterValue)
                                    .limit(100);

                                data = result.data || [];
                                dbError = result.error;
                            }

                            if (dbError) {
                                throw new Error(dbError.message);
                            }

                            // Transform data for chart
                            const transformedData = parsed.queryType === 'advanced'
                                ? data.map(item => ({
                                    name: item.pincode,
                                    value: item.total,
                                    ...item
                                }))
                                : transformDataForChart(
                                    data,
                                    parsed.filterValue,
                                    parsed.ageFilter || null
                                );
                            setChartData(transformedData);
                            setIsLoading(false);

                        } catch (dbErr) {
                            console.error('Database query error:', dbErr);
                            setError(dbErr.message);
                            setIsLoading(false);
                        }

                    } else if (parsed.intent === 'text') {
                        setDisplayContent({ type: 'text', content: parsed.message || content });
                    } else {
                        setDisplayContent({ type: 'text', content: content });
                    }
                } else {
                    setDisplayContent({ type: 'text', content: content });
                }
            } catch (e) {
                // Not JSON, display as text
                setDisplayContent({ type: 'text', content: message.content });
            }
        };

        processMessage();
    }, [message.content, isBot]);

    return (
        <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isBot
                ? 'bg-gradient-to-br from-purple-500 to-violet-600 text-white'
                : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                }`}>
                {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Message Content */}
            <div className={`max-w-[85%] ${isBot ? '' : 'text-right'}`}>
                {displayContent.type === 'text' && displayContent.content && (
                    <div className={`inline-block px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isBot
                        ? 'bg-gray-100 text-gray-800 rounded-tl-none'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                        }`}>
                        {displayContent.content}
                    </div>
                )}

                {/* Render Chart with Real Data */}
                {queryConfig && (
                    <GenerativeChart
                        config={queryConfig}
                        data={chartData}
                        isLoading={isLoading}
                        error={error}
                    />
                )}

                {/* Timestamp */}
                <p className={`text-[10px] text-gray-400 mt-1 ${isBot ? '' : 'text-right'}`}>
                    {new Date(message.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
        </div>
    );
};

/**
 * Main ChatInterface Component with Database Context Awareness
 */
const ChatInterface = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [dbContext, setDbContext] = useState(null); // Database context for AI
    const [messages, setMessages] = useState([
        {
            id: 1,
            content: JSON.stringify({
                intent: "text",
                message: "Hello! I'm your UIDAI SAMARTH Database Assistant. I'm loading database context to help you better..."
            }),
            isBot: true,
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    /**
     * Fetch database context for AI training
     * This gives the AI knowledge of what data actually exists
     */
    useEffect(() => {
        const fetchDatabaseContext = async () => {
            try {
                // 1. Get ACTUAL total record count
                const { count: totalRecordCount, error: countError } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true });

                if (countError) {
                    console.error('Count error:', countError);
                }

                // 2. Get ALL unique pincodes (just the pincode column)
                const { data: allPincodeData, error: pincodeError } = await supabase
                    .from('enrollments')
                    .select('pincode');

                if (pincodeError) {
                    console.error('Pincode fetch error:', pincodeError);
                }

                // Extract unique pincodes
                const uniquePincodeSet = new Set(allPincodeData?.map(r => r.pincode) || []);
                const allUniquePincodes = Array.from(uniquePincodeSet);

                // 3. Get sample data for statistics (top records)
                const { data: sampleData, error: sampleError } = await supabase
                    .from('enrollments')
                    .select('pincode, state, district, age_0_5, age_5_18, age_18_plus')
                    .limit(1000);

                if (sampleError || !allUniquePincodes.length) {
                    setDbContext({
                        hasData: false,
                        message: "No data in database yet"
                    });
                    return;
                }

                // Calculate statistics from sample
                const pincodeStats = {};
                const stateStats = {};
                let sampleEnrollments = 0;

                (sampleData || []).forEach(row => {
                    const enrollment = (row.age_0_5 || 0) + (row.age_5_18 || 0) + (row.age_18_plus || 0);
                    sampleEnrollments += enrollment;

                    // Aggregate by pincode
                    if (!pincodeStats[row.pincode]) {
                        pincodeStats[row.pincode] = { pincode: row.pincode, state: row.state, district: row.district, total: 0 };
                    }
                    pincodeStats[row.pincode].total += enrollment;

                    // Aggregate by state
                    if (!stateStats[row.state]) {
                        stateStats[row.state] = { state: row.state, total: 0, pincodeCount: 0 };
                    }
                    stateStats[row.state].total += enrollment;
                });

                // Get top pincodes by enrollment (from sample)
                const topPincodes = Object.values(pincodeStats)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 10);

                // Get states
                const states = Object.values(stateStats).sort((a, b) => b.total - a.total);

                // Estimate total enrollments based on sample average
                const avgEnrollmentPerRecord = sampleEnrollments / (sampleData?.length || 1);
                const estimatedTotalEnrollments = Math.round(avgEnrollmentPerRecord * (totalRecordCount || sampleData?.length || 0));

                const context = {
                    hasData: true,
                    totalRecords: totalRecordCount || sampleData?.length || 0,
                    totalEnrollments: estimatedTotalEnrollments,
                    uniquePincodes: allUniquePincodes.length,
                    samplePincodes: allUniquePincodes.slice(0, 20),
                    topPincodes: topPincodes.map(p => `${p.pincode} (${p.total} enrollments, ${p.district}, ${p.state})`),
                    states: states.map(s => s.state),
                    pincodeEnrollmentRange: {
                        min: Math.min(...Object.values(pincodeStats).map(p => p.total)),
                        max: Math.max(...Object.values(pincodeStats).map(p => p.total))
                    }
                };

                setDbContext(context);

                // Update welcome message with ACTUAL context
                setMessages([{
                    id: 1,
                    content: JSON.stringify({
                        intent: "text",
                        message: `Hello! I'm your UIDAI SAMARTH Database Assistant. I have access to **${context.uniquePincodes.toLocaleString()} unique pincodes** with approximately **${context.totalEnrollments.toLocaleString()} total enrollments** across ${context.totalRecords.toLocaleString()} records. Try asking:\n• "Show data for ${context.samplePincodes[0]}"\n• "How many pincodes are in the database?"\n• "What is the total enrollment?"`
                    }),
                    isBot: true,
                    timestamp: new Date()
                }]);

            } catch (err) {
                console.error('Failed to fetch DB context:', err);
                setDbContext({ hasData: false, message: "Error loading context" });
            }
        };

        fetchDatabaseContext();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    /**
     * Send message to AI using the Interceptor Pattern
     * Flow: User -> Interceptor (JSON) -> Executor (DB) -> Reporter (Text) -> UI
     */
    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            content: inputValue.trim(),
            isBot: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // 1. INTERCEPT: Ask AI to translate Question -> DB Query
            const queryConfig = await generateDbQuery(userMessage.content);
            console.log('Interceptor Config:', queryConfig);

            let realData = null;
            let finalResponse = "";
            let isChart = false;
            let chartData = [];
            let chartTitle = "Data Analysis";

            if (queryConfig.intent === 'query') {
                // 2. EXECUTE: It's a data question, run the query
                realData = await executeQuery(queryConfig);
                console.log('Executor Data:', realData);

                // 3. REPORT: Generate answer based on Real Data
                finalResponse = await generateFinalAnswer(userMessage.content, realData);

                // 4. CHART: Trigger chart if data exists
                if (realData && realData.length > 0) {
                    isChart = true;
                    // Determine chart title
                    if (queryConfig.filters && queryConfig.filters.pincode) {
                        chartTitle = `Enrollment Data: Pincode ${queryConfig.filters.pincode}`;
                    } else if (queryConfig.filters && queryConfig.filters.state) {
                        chartTitle = `Enrollment Data: ${queryConfig.filters.state}`;
                    }

                    // Transform data for visualization
                    chartData = transformDataForChart(realData, 'Data', null);
                }
            } else {
                // It's just chat ("Hello"), so answer normally
                finalResponse = await getStandardAIResponse(userMessage.content);
            }

            // Construct valid JSON response for the UI to render
            const uiResponse = {
                intent: isChart ? "query_db" : "text",
                message: finalResponse,
                ...(isChart && {
                    chartType: "bar",
                    chartTitle: chartTitle,
                    data: chartData // Passing explicitly
                })
            };

            const botMessage = {
                id: Date.now() + 1,
                content: JSON.stringify(uiResponse),
                isBot: true,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error('AI Chat Error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                content: JSON.stringify({
                    intent: "text",
                    message: "Sorry, I encountered an error processing your request."
                }),
                isBot: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Quick action buttons
    const quickActions = [
        { label: 'Check 751024', icon: BarChart3 },
        { label: 'Show 560001', icon: TrendingUp },
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group"
            >
                <MessageCircle className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-purple-700 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    AI
                </span>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ${isMinimized ? 'w-72 h-14' : 'w-96 h-[580px]'
            }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-violet-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Database className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">SAMARTH DB Assistant</h3>
                        <p className="text-[10px] text-purple-200">Live Database • Llama 3.1</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages Area with SAMARTH AI Background */}
                    <div
                        className="h-[430px] overflow-y-auto p-4 space-y-4 relative"
                        style={{
                            backgroundColor: '#faf9fc',
                            backgroundImage: 'url(/samarth-ai-bg.png)',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'center center',
                            backgroundSize: '70%',
                        }}
                    >
                        {/* Semi-transparent overlay for better readability */}
                        <div className="absolute inset-0 bg-white/80 pointer-events-none" />

                        {/* Messages Container */}
                        <div className="relative z-10 space-y-4">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} isBot={msg.isBot} />
                            ))}

                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none">
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                                            <span className="text-sm text-gray-500">Generating query...</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 2 && (
                        <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setInputValue(action.label);
                                        setTimeout(() => sendMessage(), 100);
                                    }}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full hover:bg-purple-100 transition-colors"
                                >
                                    <action.icon className="w-3 h-3" />
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about pincodes, districts..."
                                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="p-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ChatInterface;
