import React, { useState } from 'react';
import FileUploader from '../components/data/FileUploader';
import SmartETLUploader from '../components/data/SmartETLUploader';
import InterpreterDashboard from '../components/analysis/InterpreterDashboard';
import AnalyticsDashboard from '../components/dashboard/AnalyticsDashboard';
import { Database, FileSpreadsheet, Server, UploadCloud, Code, Zap, Upload } from 'lucide-react';

const DataSources = () => {
    // State to manage the transition from Upload -> Analysis
    const [analysisMode, setAnalysisMode] = useState(false);
    const [autoQuery, setAutoQuery] = useState('');
    const [uploaderMode, setUploaderMode] = useState('smart'); // 'smart' or 'classic'

    const handleAnalyzeTrigger = (query) => {
        setAutoQuery(query);
        setAnalysisMode(true);
        // Smooth scroll to analysis section
        setTimeout(() => {
            const element = document.getElementById('analysis-section');
            if (element) element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto scroll-smooth">

            {/* Page Header */}
            <div className="px-8 py-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Sources & Analysis</h1>
                        <p className="text-gray-500 mt-1">
                            Upload your data, let AI map the columns, then visualize it.
                        </p>
                    </div>

                    {/* Uploader Mode Toggle */}
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setUploaderMode('smart')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${uploaderMode === 'smart'
                                ? 'bg-white text-purple-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Zap className="w-4 h-4" />
                            AI Smart
                        </button>
                        <button
                            onClick={() => setUploaderMode('classic')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${uploaderMode === 'classic'
                                ? 'bg-white text-gray-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Upload className="w-4 h-4" />
                            Classic
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-8 max-w-7xl mx-auto w-full text-gray-900">

                {/* Section 1: Data Upload */}
                {uploaderMode === 'smart' ? (
                    <SmartETLUploader />
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 transition-all duration-500">
                        <FileUploader onAnalyze={handleAnalyzeTrigger} />
                    </div>
                )}

                {/* Section 1.5: Permanent Analytics Dashboard */}
                <div className="mt-8">
                    <AnalyticsDashboard />
                </div>

                {/* Section 2: AI Analysis (Revealed on Trigger) */}
                {analysisMode && (
                    <div id="analysis-section" className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-px bg-gray-300 flex-1"></div>
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">AI Analysis Engine Active</span>
                            <div className="h-px bg-gray-300 flex-1"></div>
                        </div>

                        <div className="bg-white rounded-2xl border border-purple-200 shadow-xl overflow-hidden h-[600px] ring-4 ring-purple-50">
                            {/* We mount the dashboard with the auto-query */}
                            <InterpreterDashboard initialQuery={autoQuery} autoRun={true} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataSources;
