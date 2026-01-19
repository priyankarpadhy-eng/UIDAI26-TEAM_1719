import React, { memo, useMemo, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, NodeResizer } from 'reactflow';
import { BarChart3, X, Sparkles, TrendingUp, PieChart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { GraphVisualizer } from '../visualizers/GraphVisualizer';
import { DataStore } from '../../../services/DataStore';

const GraphNode = ({ id, data, isConnectable, selected }) => {
    const { setNodes, setEdges } = useReactFlow();
    const [aiSuggestion, setAiSuggestion] = useState(null);

    const handleDelete = () => {
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
        setNodes((nds) => nds.filter((n) => n.id !== id));
    };

    const handleConfigChange = (newConfig) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...newConfig
                    }
                };
            }
            return node;
        }));
    };

    // AI-powered chart type suggestion based on data analysis
    const datasetId = data.datasetId || data.inputDatasetId;

    // ------------------------------------------------------------------
    // 1. AI / HEURISTIC ANALYSIS
    // ------------------------------------------------------------------
    // Takes the connected dataset and automatically determines the best visualization type.
    // It scans column types (Numeric vs Categorical) and data patterns (Time-series).
    useEffect(() => {
        if (!datasetId) {
            setAiSuggestion(null);
            return;
        }

        const dataset = DataStore.get(datasetId);
        if (!dataset || dataset.length === 0) return;

        // Step A: Classify Columns
        const columns = Object.keys(dataset[0]);
        const numericColumns = columns.filter(col =>
            typeof dataset[0][col] === 'number' || !isNaN(Number(dataset[0][col]))
        );
        const categoricalColumns = columns.filter(col =>
            typeof dataset[0][col] === 'string' && isNaN(Number(dataset[0][col]))
        );

        // Step B: Apply Rules (Heuristics)
        let suggestion = {
            chartType: 'bar',
            reason: 'Best for comparing categories',
            confidence: 80
        };

        // Rule 1: Time Series Detection
        // If data contains date/time columns + numeric data -> Suggest Line Chart
        const hasTimeSeries = columns.some(c => /date|month|year|time|quarter/i.test(c));
        if (hasTimeSeries && numericColumns.length > 0) {
            suggestion = {
                chartType: 'line',
                reason: 'Trend data detected - line chart recommended',
                confidence: 90
            };
        }
        // Rule 2: Part-to-Whole Detection
        // If only 1 category and 1 number, and few rows -> Suggest Pie Chart
        else if (categoricalColumns.length === 1 && numericColumns.length === 1 && dataset.length <= 8) {
            suggestion = {
                chartType: 'pie',
                reason: 'Low cardinality - pie chart shows proportions well',
                confidence: 75
            };
        }
        // Rule 3: Comparison Detection
        // Default to Bar chart for comparing multiple metrics
        else if (numericColumns.length >= 2) {
            suggestion = {
                chartType: 'bar',
                reason: 'Multiple metrics - bar chart ideal for comparison',
                confidence: 85
            };
        }

        setAiSuggestion(suggestion);
    }, [datasetId]);

    // Calculate data quality score
    // ------------------------------------------------------------------
    // 2. DATA QUALITY CHECKER
    // ------------------------------------------------------------------
    // Scans every cell in the dataset to calculate a 'Quality Score'.
    // Score = (Filled Cells / Total Cells) * 100
    const dataQuality = useMemo(() => {
        if (!datasetId) return null;
        const dataset = DataStore.get(datasetId);
        if (!dataset || dataset.length === 0) return null;

        let totalCells = 0;
        let emptyCells = 0;

        // Iterate through all rows and columns
        dataset.forEach(row => {
            Object.values(row).forEach(val => {
                totalCells++;
                // Check for null, undefined, empty string, or explicit 'N/A'
                if (val === null || val === undefined || val === '' || val === 'N/A') {
                    emptyCells++;
                }
            });
        });

        const score = Math.round(((totalCells - emptyCells) / totalCells) * 100);
        return {
            score,
            records: dataset.length,
            status: score >= 90 ? 'excellent' : score >= 70 ? 'good' : 'needs_attention'
        };
    }, [datasetId]);

    const hasData = !!datasetId;

    return (
        <div className={`bg-white border-2 rounded-2xl shadow-xl w-full h-full min-w-[380px] min-h-[340px] flex flex-col relative transition-all ${hasData ? 'border-blue-400 shadow-blue-100' : 'border-slate-200 hover:border-blue-300'
            }`}>
            <NodeResizer
                minWidth={380}
                minHeight={340}
                isVisible={selected}
                lineStyle={{ border: '2px solid #3b82f6' }}
                color="#3b82f6"
            />

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-3 flex items-center justify-between border-b border-blue-100 flex-shrink-0 rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${hasData ? 'bg-blue-500 shadow-blue-200' : 'bg-slate-200'
                        }`}>
                        <BarChart3 className={`w-5 h-5 ${hasData ? 'text-white' : 'text-slate-400'}`} />
                        {hasData && <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-slate-700">Graph</span>
                        {dataQuality && (
                            <span className="text-[10px] text-slate-500 block">
                                {dataQuality.records.toLocaleString()} records
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Data Quality Indicator */}
                    {dataQuality && (
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${dataQuality.status === 'excellent' ? 'bg-emerald-100 text-emerald-600' :
                            dataQuality.status === 'good' ? 'bg-amber-100 text-amber-600' :
                                'bg-red-100 text-red-600'
                            }`}>
                            {dataQuality.status === 'excellent' ? <CheckCircle2 className="w-3 h-3" /> :
                                <AlertCircle className="w-3 h-3" />}
                            {dataQuality.score}%
                        </div>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* AI Suggestion Banner */}
            {aiSuggestion && data.chartType !== aiSuggestion.chartType && (
                <div
                    className="bg-gradient-to-r from-purple-50 to-violet-50 px-4 py-2 flex items-center gap-2 border-b border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => handleConfigChange({ chartType: aiSuggestion.chartType })}
                >
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-xs text-purple-700">
                        <span className="font-bold">AI Tip:</span> Try{' '}
                        {aiSuggestion.chartType === 'line' ? <TrendingUp className="w-3.5 h-3.5 inline" /> :
                            aiSuggestion.chartType === 'pie' ? <PieChart className="w-3.5 h-3.5 inline" /> :
                                <BarChart3 className="w-3.5 h-3.5 inline" />}
                        {' '}<span className="font-medium">{aiSuggestion.chartType}</span> chart
                    </span>
                    <span className="text-[10px] text-purple-400 ml-auto">{aiSuggestion.confidence}%</span>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 w-full overflow-hidden bg-slate-50 min-h-0 rounded-b-xl">
                {hasData ? (
                    <GraphVisualizer
                        datasetId={datasetId}
                        inputData={data.inputData}
                        config={{
                            xKey: data.xKey,
                            yKey: data.yKey,
                            chartType: data.chartType
                        }}
                        onConfigChange={handleConfigChange}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-b from-slate-50 to-white p-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                            <BarChart3 className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">Waiting for data...</p>
                        <p className="text-xs text-slate-400 mt-1">Connect a data source to visualize</p>
                    </div>
                )}
            </div>

            {/* Input Handle (Left) - LARGE */}
            <Handle
                type="target"
                position={Position.Left}
                isConnectable={isConnectable}
                className="!w-5 !h-5 !bg-blue-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                style={{ left: '-10px' }}
            />

            {/* Output Handle (Right) - LARGE */}
            <Handle
                type="source"
                position={Position.Right}
                isConnectable={isConnectable}
                className="!w-5 !h-5 !bg-blue-500 !border-4 !border-white !shadow-lg hover:!scale-125 transition-transform"
                style={{ right: '-10px' }}
            />
        </div>
    );
};

export default memo(GraphNode);
