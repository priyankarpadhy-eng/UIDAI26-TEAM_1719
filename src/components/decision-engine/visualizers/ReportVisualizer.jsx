import React, { useState, useCallback, useEffect } from 'react';
import {
    Bot, FileText, Loader2, RefreshCw, AlertTriangle,
    TrendingUp, Activity, ArrowRight, ShieldAlert,
    CheckCircle2, Sparkles, Brain, Users, ChevronDown,
    ChevronUp, Zap, Target, AlertCircle, Clock, Download
} from 'lucide-react';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, RadarChart, Radar,
    PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell
} from 'recharts';
import { DataStore } from '../../../services/DataStore';
import { AnalysisStore } from '../../../services/AnalysisStore';
import { runMultiAgentAnalysis, AI_AGENTS } from '../../../services/multiAIEngine';

export const ReportVisualizer = ({ nodeId, nodes, edges }) => {
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [agentStatuses, setAgentStatuses] = useState({});
    const [prompt, setPrompt] = useState('');
    const [expandedAgents, setExpandedAgents] = useState({});
    const [isExporting, setIsExporting] = useState(false);

    // Load persisted analysis on mount
    useEffect(() => {
        if (nodeId && AnalysisStore.has(nodeId)) {
            const storedResult = AnalysisStore.get(nodeId);
            if (storedResult) {
                console.log('[ReportVisualizer] Loaded persisted analysis for', nodeId);
                setAnalysisResult(storedResult);
            }
        }
    }, [nodeId]);

    // Dynamically find connected inputs
    const connectedInputs = React.useMemo(() => {
        if (!nodeId || !edges || !nodes) return [];

        const sourceEdges = edges.filter(e => e.target === nodeId);

        return sourceEdges.map(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            return {
                id: sourceNode?.id,
                type: sourceNode?.type,
                label: sourceNode?.data?.label || sourceNode?.type || 'Unknown Source',
                datasetId: sourceNode?.data?.datasetId || sourceNode?.data?.processedDatasetId
            };
        }).filter(item => item.id);
    }, [nodeId, nodes, edges]);

    const handleAgentStart = useCallback((agentId) => {
        setAgentStatuses(prev => ({
            ...prev,
            [agentId]: 'analyzing'
        }));
    }, []);

    const handleAgentComplete = useCallback((result) => {
        setAgentStatuses(prev => ({
            ...prev,
            [result.agentId]: result.success ? 'complete' : 'error'
        }));
    }, []);

    const runAnalysis = async () => {
        if (connectedInputs.length === 0) return;

        setIsLoading(true);
        setAgentStatuses({});
        setAnalysisResult(null);

        try {
            const result = await runMultiAgentAnalysis(
                connectedInputs,
                prompt || 'Analyze this data and provide comprehensive insights.',
                handleAgentStart,
                handleAgentComplete
            );

            setAnalysisResult(result);

            // Persist the result
            if (nodeId && result.success) {
                AnalysisStore.set(nodeId, result);

                // Also store in DataStore so Graph nodes can access it
                DataStore.set(result, `analysis_${nodeId}`);
            }
        } catch (error) {
            console.error('Analysis failed:', error);
            setAnalysisResult({
                success: false,
                error: error.message
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Native PDF Export Function
    const exportToPDF = async () => {
        if (!analysisResult?.success) return;

        setIsExporting(true);

        try {
            const { individual_analyses, consensus } = analysisResult;

            // Create PDF content as HTML
            const pdfContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>S.A.M.A.R.T.H. Analysis Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                        h1 { color: #6366f1; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
                        h2 { color: #3b82f6; margin-top: 30px; }
                        h3 { color: #64748b; }
                        .score-box { display: inline-block; padding: 20px 40px; border-radius: 10px; text-align: center; margin: 10px; }
                        .score-high { background: #dcfce7; color: #166534; }
                        .score-medium { background: #fef9c3; color: #854d0e; }
                        .score-low { background: #fee2e2; color: #991b1b; }
                        .agent-section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 15px 0; }
                        .agent-header { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
                        .finding { background: #f8fafc; padding: 10px; border-left: 4px solid #3b82f6; margin: 8px 0; }
                        .risk { background: #fef2f2; padding: 10px; border-left: 4px solid #ef4444; margin: 8px 0; }
                        .action { background: #f0fdf4; padding: 10px; border-left: 4px solid #22c55e; margin: 8px 0; }
                        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                        th { background: #f1f5f9; }
                    </style>
                </head>
                <body>
                    <h1>🧠 S.A.M.A.R.T.H. Multi-AI Analysis Report</h1>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Data Sources:</strong> ${analysisResult.dataSourceCount} | <strong>Records Analyzed:</strong> ${analysisResult.totalRecords?.toLocaleString()}</p>
                    
                    <h2>📊 Consensus Overview</h2>
                    <div class="score-box ${consensus?.overallScore >= 70 ? 'score-high' : consensus?.overallScore >= 40 ? 'score-medium' : 'score-low'}">
                        <div style="font-size: 48px; font-weight: bold;">${consensus?.overallScore || 0}</div>
                        <div>Overall Health Score</div>
                    </div>
                    <div class="score-box score-medium">
                        <div style="font-size: 48px; font-weight: bold;">${consensus?.agreement || 0}%</div>
                        <div>Agent Agreement</div>
                    </div>
                    
                    <p><strong>Summary:</strong> ${consensus?.summary || 'N/A'}</p>
                    
                    ${individual_analyses?.map(agent => `
                        <div class="agent-section">
                            <div class="agent-header">${agent.emoji} ${agent.agentName} (${agent.model})</div>
                            <p>${agent.analysis?.summary || agent.analysis?.data_type_detected || 'Analysis completed'}</p>
                            
                            ${agent.agentId === 'data_analyst' && agent.analysis?.patterns ? `
                                <h3>Key Patterns</h3>
                                ${agent.analysis.patterns.slice(0, 3).map(p => `
                                    <div class="finding">
                                        <strong>${p.finding}</strong><br>
                                        <small>Evidence: ${p.evidence} | Significance: ${p.significance}</small>
                                    </div>
                                `).join('')}
                            ` : ''}
                            
                            ${agent.agentId === 'risk_analyst' && agent.analysis?.critical_risks ? `
                                <h3>Critical Risks</h3>
                                ${agent.analysis.critical_risks.slice(0, 3).map(r => `
                                    <div class="risk">
                                        <strong>${r.title}</strong> (${r.severity})<br>
                                        <small>${r.description || r.affected_area}</small>
                                    </div>
                                `).join('')}
                            ` : ''}
                            
                            ${agent.agentId === 'policy_advisor' && agent.analysis?.immediate_actions ? `
                                <h3>Recommended Actions</h3>
                                ${agent.analysis.immediate_actions.slice(0, 3).map(a => `
                                    <div class="action">
                                        <strong>${a.action}</strong><br>
                                        <small>Target: ${a.target} | Impact: ${a.expected_impact}</small>
                                    </div>
                                `).join('')}
                            ` : ''}
                        </div>
                    `).join('') || ''}
                    
                    <div class="footer">
                        <p>This report was generated by S.A.M.A.R.T.H. (Smart Analysis, Monitoring & Reporting Technology Hub)</p>
                        <p>Multi-AI Consensus Engine • Powered by Llama 3.3/3.1 via Groq</p>
                    </div>
                </body>
                </html>
            `;

            // Create blob and trigger download
            const blob = new Blob([pdfContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // Open in new window for printing as PDF
            const printWindow = window.open(url, '_blank');
            printWindow.onload = () => {
                printWindow.print();
            };

        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };


    const toggleAgentExpand = (agentId) => {
        setExpandedAgents(prev => ({
            ...prev,
            [agentId]: !prev[agentId]
        }));
    };

    // =========================================================================
    // INITIAL STATE - Waiting for analysis
    // =========================================================================
    if (!analysisResult && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 p-8 text-center">
                {/* Logo & Title */}
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30 transform hover:scale-105 transition-transform">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                        <Users className="w-3 h-3 text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-1">Multi-AI Consensus Engine</h3>
                <p className="text-sm text-slate-500 mb-6">S.A.M.A.R.T.H. Intelligence Platform</p>

                {/* AI Agents Preview */}
                <div className="flex gap-3 mb-8">
                    {AI_AGENTS.map(agent => (
                        <div
                            key={agent.id}
                            className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow min-w-[140px]"
                        >
                            <span className="text-3xl mb-2">{agent.emoji}</span>
                            <span className="text-xs font-bold text-slate-700">{agent.name}</span>
                            <span className="text-[10px] text-slate-400 mt-1">{agent.description}</span>
                            <span className={`text-[9px] mt-2 px-2 py-0.5 rounded-full font-bold uppercase ${agent.model?.includes('70B')
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-orange-100 text-orange-700'
                                }`}>
                                {agent.model || agent.provider}
                            </span>
                        </div>
                    ))}
                </div>


                {/* Connected Sources */}
                <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-lg">
                    {connectedInputs.length > 0 ? (
                        connectedInputs.map((input, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                                <span className={`w-2.5 h-2.5 rounded-full ${input.type === 'table' ? 'bg-emerald-500' : input.type === 'graph' ? 'bg-blue-500' : 'bg-amber-500'}`}></span>
                                {input.label}
                                {input.datasetId && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-200 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Connect data sources to the AI node
                        </div>
                    )}
                </div>

                {/* Prompt Input */}
                <div className="w-full max-w-xl bg-white p-3 rounded-2xl border border-slate-200 shadow-lg focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all mb-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe what you want to analyze (e.g., 'Compare enrollment coverage across states and identify gaps')..."
                        className="w-full h-24 p-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none bg-transparent"
                    />
                    <div className="flex justify-between items-center px-3 pb-1 pt-2 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-2">
                            <Zap className="w-3 h-3 text-amber-500" />
                            Powered by Llama 3
                        </span>
                        <button
                            onClick={runAnalysis}
                            disabled={connectedInputs.length === 0}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                        >
                            <Sparkles className="w-4 h-4" />
                            Run Multi-AI Analysis
                        </button>
                    </div>
                </div>

                <p className="text-xs text-slate-400 max-w-md">
                    3 AI agents will analyze your data from different perspectives and reach consensus on findings and recommendations.
                </p>
            </div>
        );
    }

    // =========================================================================
    // LOADING STATE - Agents are thinking (BRIGHT THEME)
    // =========================================================================
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-50 via-white to-indigo-50">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                    <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-purple-500" />
                </div>

                <h3 className="text-2xl font-bold text-slate-800 mb-2">Multi-Agent Analysis in Progress</h3>
                <p className="text-sm text-slate-500 mb-8">Each AI is analyzing from their perspective...</p>

                {/* Agent Status Cards */}
                <div className="flex gap-4">
                    {AI_AGENTS.map(agent => {
                        const status = agentStatuses[agent.id];
                        return (
                            <div
                                key={agent.id}
                                className={`flex flex-col items-center p-4 rounded-xl border min-w-[140px] transition-all shadow-sm ${status === 'complete'
                                        ? 'bg-emerald-50 border-emerald-200'
                                        : status === 'analyzing'
                                            ? 'bg-purple-50 border-purple-200 animate-pulse'
                                            : 'bg-white border-slate-200'
                                    }`}
                            >
                                <span className="text-3xl mb-2">{agent.emoji}</span>
                                <span className="text-xs font-bold text-slate-700">{agent.name}</span>
                                <span className={`text-[10px] mt-2 font-mono font-bold ${status === 'complete' ? 'text-emerald-600' :
                                        status === 'analyzing' ? 'text-purple-600' : 'text-slate-400'
                                    }`}>
                                    {status === 'complete' ? '✓ COMPLETE' :
                                        status === 'analyzing' ? '● THINKING...' : '○ WAITING'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // =========================================================================
    // ERROR STATE
    // =========================================================================
    if (!analysisResult.success) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-red-50 p-8">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-red-700 mb-2">Analysis Failed</h3>
                <p className="text-sm text-red-600 mb-6">{analysisResult.error}</p>
                <button
                    onClick={runAnalysis}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Analysis
                </button>
            </div>
        );
    }

    // =========================================================================
    // RESULTS DASHBOARD
    // =========================================================================
    const { consensus, individual_analyses, confidence, dataSourceCount, totalRecords } = analysisResult;

    // Prepare data for charts
    const consensusRadarData = [
        { subject: 'Data Quality', value: consensus?.scores?.dataQuality || 0, fullMark: 100 },
        { subject: 'Risk Level', value: 100 - (consensus?.scores?.riskLevel || 0), fullMark: 100 },
        { subject: 'Priority', value: consensus?.scores?.actionPriority || 0, fullMark: 100 },
        { subject: 'Agreement', value: consensus?.agreement || 0, fullMark: 100 },
        { subject: 'Confidence', value: confidence || 0, fullMark: 100 }
    ];

    const scoreColor = consensus?.overallScore >= 70 ? '#10b981' : consensus?.overallScore >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-purple-500/30">
                        <Brain className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Multi-Agent Intelligence Report</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(analysisResult.timestamp).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span className="text-[10px] text-slate-500">{dataSourceCount} sources • {totalRecords?.toLocaleString()} records</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportToPDF}
                        disabled={isExporting}
                        className="text-sm flex items-center gap-2 text-slate-600 hover:text-green-600 font-medium px-4 py-2 hover:bg-green-50 rounded-lg transition-colors border border-slate-200 hover:border-green-200"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF
                    </button>
                    <button
                        onClick={runAnalysis}
                        className="text-sm flex items-center gap-2 text-slate-600 hover:text-purple-600 font-medium px-4 py-2 hover:bg-purple-50 rounded-lg transition-colors border border-slate-200 hover:border-purple-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Re-analyze
                    </button>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Consensus Overview Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Overall Score Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-500" />
                                Overall Health Score
                            </h3>
                            <span className="text-xs text-slate-400 font-mono">{individual_analyses.filter(a => a.success).length}/3 agents</span>
                        </div>
                        <div className="flex items-center justify-center">
                            <div className="relative w-32 h-32">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="64" cy="64" r="56"
                                        stroke={scoreColor}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(consensus?.overallScore / 100) * 352} 352`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-black" style={{ color: scoreColor }}>{consensus?.overallScore}</span>
                                    <span className="text-[10px] text-slate-400 uppercase">/ 100</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-sm text-slate-600 mt-4">{consensus?.summary}</p>
                    </div>

                    {/* Consensus Radar */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-cyan-500" />
                            Analysis Dimensions
                        </h3>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={consensusRadarData}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                    <Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} strokeWidth={2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Key Metrics
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Data Quality</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${consensus?.scores?.dataQuality || 0}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{consensus?.scores?.dataQuality || 0}%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Risk Level</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${consensus?.scores?.riskLevel || 0}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{consensus?.scores?.riskLevel || 0}%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600">Action Priority</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${consensus?.scores?.actionPriority || 0}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">{consensus?.scores?.actionPriority || 0}%</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                <span className="text-sm text-slate-600 font-medium">Agent Agreement</span>
                                <span className="text-lg font-black text-purple-600">{consensus?.agreement || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Individual Agent Analyses */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-500" />
                        Individual Agent Analyses
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {individual_analyses.map((result) => {
                            const agent = AI_AGENTS.find(a => a.id === result.agentId);
                            const isExpanded = expandedAgents[result.agentId];

                            return (
                                <div
                                    key={result.agentId}
                                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                                >
                                    {/* Agent Header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleAgentExpand(result.agentId)}
                                        style={{ borderLeft: `4px solid ${agent?.color || '#8b5cf6'}` }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{agent?.emoji}</span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-800">{agent?.name}</h4>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${result.model?.includes('70B')
                                                        ? 'bg-purple-100 text-purple-700'
                                                        : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {result.model || result.provider}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">{agent?.description}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {result.success ? (
                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {result.responseTime}ms
                                                </span>
                                            ) : (
                                                <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">
                                                    Failed
                                                </span>
                                            )}
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </div>

                                    {/* Agent Analysis Details (Expanded) */}
                                    {isExpanded && result.success && result.analysis && (
                                        <div className="p-4 pt-0 border-t border-slate-100">
                                            {/* Summary */}
                                            {result.analysis.summary && (
                                                <div className="bg-slate-50 p-4 rounded-xl mb-4">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{result.analysis.summary}</p>
                                                </div>
                                            )}

                                            {/* Agent-specific content */}
                                            {result.agentId === 'data_analyst' && (
                                                <div className="space-y-4">
                                                    {result.analysis.patterns && result.analysis.patterns.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Patterns Found</h5>
                                                            <div className="space-y-2">
                                                                {result.analysis.patterns.map((p, i) => (
                                                                    <div key={i} className="flex items-start gap-2 text-sm">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${p.significance === 'high' ? 'bg-red-100 text-red-700' :
                                                                            p.significance === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                                'bg-slate-100 text-slate-600'
                                                                            }`}>{p.significance}</span>
                                                                        <span className="text-slate-700">{p.finding}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {result.agentId === 'risk_analyst' && (
                                                <div className="space-y-4">
                                                    {result.analysis.critical_risks && result.analysis.critical_risks.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Critical Risks</h5>
                                                            <div className="space-y-2">
                                                                {result.analysis.critical_risks.map((risk, i) => (
                                                                    <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <AlertTriangle className="w-4 h-4 text-red-500" />
                                                                            <span className="font-semibold text-red-800">{risk.title}</span>
                                                                            <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold uppercase ${risk.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                                                                risk.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                                                                                    'bg-amber-200 text-amber-800'
                                                                                }`}>{risk.severity}</span>
                                                                        </div>
                                                                        <p className="text-sm text-red-700">{risk.description}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {result.agentId === 'policy_advisor' && (
                                                <div className="space-y-4">
                                                    {result.analysis.immediate_actions && result.analysis.immediate_actions.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Immediate Actions</h5>
                                                            <div className="space-y-2">
                                                                {result.analysis.immediate_actions.map((action, i) => (
                                                                    <div key={i} className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <ArrowRight className="w-4 h-4 text-emerald-500" />
                                                                            <span className="font-semibold text-emerald-800">{action.action}</span>
                                                                        </div>
                                                                        <p className="text-sm text-emerald-700">Target: {action.target}</p>
                                                                        <p className="text-xs text-emerald-600 mt-1">Impact: {action.expected_impact}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Raw JSON for debugging (collapsed) */}
                                            <details className="mt-4">
                                                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">View Raw Response</summary>
                                                <pre className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg text-[10px] overflow-auto max-h-40">
                                                    {JSON.stringify(result.analysis, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Prioritized Actions (from consensus) */}
                {consensus?.prioritizedActions && consensus.prioritizedActions.length > 0 && (
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 shadow-xl text-white">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Consensus Actions
                        </h3>
                        <div className="grid gap-3">
                            {consensus.prioritizedActions.map((action, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:bg-slate-700/50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-100">{action.action}</p>
                                        <p className="text-sm text-slate-400 mt-1">Target: {action.target}</p>
                                        <p className="text-xs text-emerald-400 mt-1">Expected Impact: {action.impact}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-slate-500" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ReportVisualizer;
